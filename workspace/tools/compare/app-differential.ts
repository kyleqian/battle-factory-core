// Clean-parent app-vs-app differential replay.
//
// Usage: npm run compare:differential -- <trace...> --base REF
//          [--capture-range START:END] [--keep] [--summary]
//
// The standard acceptance for a refactor slice that must not change any
// pixel: replay each trace's captureFrames against BOTH this working tree and
// a clean checkout of `--base`, then byte-compare the raw RGBA. Identical
// bytes prove the slice is presentation-neutral over those windows.
//
// This replaces the ad-hoc recipe every worker used to rebuild by hand (a
// scratch worktree, a one-off driver script, a hand-rolled compare loop),
// which routinely leaked orphaned worktrees into /tmp.
//
// `--harness-from-head` overlays this tree's tools/ harness (appTrace.ts and its
// tools/ import closure; never anything under src/) onto the base checkout, so
// a trace using appTrace stage ids newer than the base still renders there: the
// base ENGINE (src/), rendered by the HEAD harness. If the overlaid harness
// cannot link against the base src/, the run fails naming the missing export.
//
// What it does NOT do: touch the oracle. This is app-vs-app. Use
// `npm run compare` for app-vs-oracle correctness. A green differential means
// "I changed nothing visible", not "I am correct".
//
// The trace is resolved HERE and handed to the base checkout as a
// self-contained file, so both sides replay the identical script even when
// the trace is new in this tree. Capture lists are never thinned.

import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { renderAppTrace } from "./appTrace.ts";
import { withCaptureRange } from "./cli.ts";
import {
  loadToolsImportGraph,
  parseHarnessImportFailure,
  planHarnessOverlay,
} from "./harnessOverlay.ts";
import { resolveCompareTracePath } from "./paths.ts";
import { loadCompareTrace } from "./traceFile.ts";

const USAGE =
  "usage: npm run compare:differential -- <trace...> --base REF\n" +
  "         [--capture-range START:END] [--keep] [--summary] [--harness-from-head]\n" +
  "\n" +
  "  --base REF         commit to replay against (e.g. HEAD^, a slice parent)\n" +
  "  --capture-range    narrow every trace to START:END instead of its own list\n" +
  "  --keep             keep the base worktree for inspection instead of removing it\n" +
  "  --summary          print one line per trace instead of per-frame detail\n" +
  "  --harness-from-head  copy this tree's tools/compare/appTrace.ts and its tools/ import\n" +
  "                     closure (never src/) into the base worktree before replaying, so the\n" +
  "                     base engine renders traces whose appTrace stage ids are newer than\n" +
  "                     the base; fails naming the missing export if the harness cannot link";

interface Options {
  readonly tracePaths: readonly string[];
  readonly base: string;
  readonly captureRange?: readonly [start: number, end: number];
  readonly keep: boolean;
  readonly summary: boolean;
  readonly harnessFromHead: boolean;
}

function parseCaptureRange(value: string): readonly [number, number] {
  const match = /^(\d+):(\d+)$/.exec(value);
  if (!match) {
    throw new Error(`invalid capture range ${JSON.stringify(value)}; expected START:END`);
  }
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end < start) throw new Error(`invalid capture range ${value}; END must be >= START`);
  return [start, end];
}

function parseArgs(args: readonly string[]): Options {
  const tracePaths: string[] = [];
  let base: string | undefined;
  let captureRange: readonly [number, number] | undefined;
  let keep = false;
  let summary = false;
  let harnessFromHead = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--keep") { keep = true; continue; }
    if (argument === "--summary" || argument === "--quiet") { summary = true; continue; }
    if (argument === "--harness-from-head") { harnessFromHead = true; continue; }
    if (argument === "--base") {
      base = args[index + 1];
      if (!base) throw new Error("--base needs a git ref");
      index += 1;
      continue;
    }
    if (argument.startsWith("--base=")) { base = argument.slice("--base=".length); continue; }
    if (argument === "--capture-range") {
      const value = args[index + 1];
      if (!value) throw new Error("--capture-range needs START:END");
      captureRange = parseCaptureRange(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--capture-range=")) {
      captureRange = parseCaptureRange(argument.slice("--capture-range=".length));
      continue;
    }
    if (argument.startsWith("-")) throw new Error(`unknown option: ${argument}`);
    tracePaths.push(argument);
  }

  if (tracePaths.length === 0) throw new Error("at least one trace path is required");
  if (!base) throw new Error("--base REF is required");
  return {
    tracePaths,
    base,
    ...(captureRange ? { captureRange } : {}),
    keep,
    summary,
    harnessFromHead,
  };
}

function git(args: readonly string[], cwd = process.cwd()): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/**
 * Path of a file inside this app tree, relative to the git repo root — e.g.
 * `"package.json"` when the repo root IS this app tree (the old layout), or
 * `"workspace/package.json"` since the 2026-08-11 promotion put this app
 * tree at `<repo root>/workspace/` alongside the top (planning) layer. Used
 * for `git show <sha>:<path>` reads against a commit, where there is no cwd
 * to resolve relative to.
 */
function workspaceGitPath(fileName: string): string {
  const workspaceRelative = relative(repoRoot, process.cwd());
  return workspaceRelative ? join(workspaceRelative, fileName) : fileName;
}

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

function dependencyManifest(packageJson: string): string {
  const parsed = JSON.parse(packageJson) as Record<string, unknown>;
  return JSON.stringify(
    Object.fromEntries(DEPENDENCY_FIELDS.map((field) => [field, parsed[field] ?? {}])),
  );
}

/**
 * The base worktree borrows this tree's node_modules by symlink, which is only
 * sound while the two commits install the same dependency tree. Compare the
 * dependency fields rather than the whole file — an unrelated npm-script or
 * version edit to package.json does not invalidate node_modules.
 */
function assertDependenciesUnchanged(baseSha: string): void {
  const base = dependencyManifest(git(["show", `${baseSha}:${workspaceGitPath("package.json")}`]));
  const head = dependencyManifest(readFileSync(join(process.cwd(), "package.json"), "utf8"));
  if (base !== head) {
    throw new Error(
      `package.json dependencies differ between the working tree and ` +
      `${baseSha.slice(0, 8)}; the node_modules symlink would be wrong. Run ` +
      "npm install in the base worktree by hand (--keep) instead of trusting " +
      "this differential.",
    );
  }
}

// Driver injected into the base worktree: it imports THAT checkout's engine
// and dumps raw RGBA per captured frame. Written fresh each run so the base
// commit needs no knowledge of this tool.
const BASE_DRIVER = `
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderAppTrace } from "./tools/compare/appTrace.ts";

const [tracePath, outDir] = process.argv.slice(2);
const trace = JSON.parse(readFileSync(tracePath, "utf8"));
mkdirSync(outDir, { recursive: true });
const captures = await renderAppTrace(trace);
for (const capture of captures) {
  writeFileSync(
    join(outDir, String(capture.frame).padStart(5, "0") + ".bin"),
    Buffer.from(capture.rgba),
  );
}
writeFileSync(
  join(outDir, "frames.json"),
  JSON.stringify(captures.map((capture) => capture.frame)),
);
`;

function firstDifferingByte(a: Uint8Array, b: Uint8Array): number {
  const shared = Math.min(a.length, b.length);
  for (let index = 0; index < shared; index += 1) {
    if (a[index] !== b[index]) return index;
  }
  return a.length === b.length ? -1 : shared;
}

/** Differing pixels, counting a pixel once even when several channels differ. */
function differingPixels(a: Uint8Array, b: Uint8Array): number {
  let pixels = 0;
  for (let offset = 0; offset + 3 < Math.min(a.length, b.length); offset += 4) {
    if (
      a[offset] !== b[offset] ||
      a[offset + 1] !== b[offset + 1] ||
      a[offset + 2] !== b[offset + 2] ||
      a[offset + 3] !== b[offset + 3]
    ) {
      pixels += 1;
    }
  }
  return pixels;
}

const HARNESS_ENTRY = "tools/compare/appTrace.ts";

/** Copy this tree's harness closure over the base's and prove it links against the base src/. */
function overlayHarness(baseWorkspaceTree: string): void {
  const plan = planHarnessOverlay(HARNESS_ENTRY, loadToolsImportGraph(HARNESS_ENTRY, process.cwd()));
  for (const file of plan.files) {
    const target = join(baseWorkspaceTree, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(process.cwd(), file), target);
  }
  console.log(
    `app-differential: --harness-from-head overlaid ${plan.files.length} tools/ file(s) ` +
    `onto base ${baseSha.slice(0, 8)} (src/ untouched):`,
  );
  for (const file of plan.files) console.log(`  ${file}`);

  const probe = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types", "--no-warnings", "--input-type=module",
      "-e", `await import(${JSON.stringify(`./${HARNESS_ENTRY}`)});`,
    ],
    { cwd: baseWorkspaceTree, encoding: "utf8" },
  );
  if (probe.status !== 0) {
    const failure = parseHarnessImportFailure(probe.stderr ?? "");
    throw new Error(
      `the HEAD harness (${HARNESS_ENTRY}) does not import against the base src/ at ` +
      `${baseSha.slice(0, 8)}: ` +
      (failure ? failure.detail : "see the node error below") +
      `. Pick a newer --base, or drop --harness-from-head.\n${probe.stderr ?? ""}`,
    );
  }
}

let options: Options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(USAGE);
  process.exit(2);
}

const repoRoot = git(["rev-parse", "--show-toplevel"]);
let baseSha: string;
try {
  baseSha = git(["rev-parse", "--verify", `${options.base}^{commit}`]);
} catch {
  console.error(`app-differential: --base '${options.base}' does not name a commit`);
  process.exit(2);
}
const headSha = git(["rev-parse", "HEAD"]);
if (baseSha === headSha) {
  console.error(
    `app-differential: --base '${options.base}' resolves to HEAD (${headSha.slice(0, 8)}); ` +
    "a differential against itself proves nothing",
  );
  process.exit(2);
}

// Resolve every trace up front so a bad path fails before the worktree exists.
let traces: ReadonlyArray<{
  input: string;
  path: string;
  trace: ReturnType<typeof loadCompareTrace>;
  frames: readonly number[];
}>;
try {
  traces = options.tracePaths.map((input) => {
    const path = resolveCompareTracePath(input);
    const trace = withCaptureRange(loadCompareTrace(path), options.captureRange);
    const frames = trace.captureFrames ?? [];
    if (frames.length === 0) {
      throw new Error(
        `trace ${path} requests no captureFrames; nothing to compare. ` +
        "Pass --capture-range START:END to choose the frames to render and compare " +
        "(e.g. --capture-range 100:140).",
      );
    }
    return { input, path, trace, frames };
  });
  assertDependenciesUnchanged(baseSha);
} catch (error) {
  console.error(
    `app-differential: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(2);
}

const scratchRoot = mkdtempSync(join(tmpdir(), "app-differential-"));
const baseTree = join(scratchRoot, "base");
let worktreeAdded = false;
let failures = 0;
let overlayFailed = false;
let comparisons = 0;

try {
  console.log(
    `app-differential: HEAD ${headSha.slice(0, 8)} vs base ${baseSha.slice(0, 8)} ` +
    `(${traces.length} trace${traces.length === 1 ? "" : "s"})`,
  );
  git(["worktree", "add", "--detach", "--quiet", baseTree, baseSha], repoRoot);
  worktreeAdded = true;
  // The worktree mirrors the whole repo (both layers); this app tree's own
  // root sits at the same sub-path within it as `process.cwd()` does at HEAD.
  const baseWorkspaceTree = join(baseTree, relative(repoRoot, process.cwd()));
  symlinkSync(join(process.cwd(), "node_modules"), join(baseWorkspaceTree, "node_modules"));

  const driverPath = join(baseWorkspaceTree, "app-differential-driver.mts");
  writeFileSync(driverPath, BASE_DRIVER);

  if (options.harnessFromHead) {
    try {
      overlayHarness(baseWorkspaceTree);
    } catch (error) {
      console.error(
        `app-differential: ${error instanceof Error ? error.message : String(error)}`,
      );
      overlayFailed = true;
    }
  }

  for (const { input, trace, frames } of overlayFailed ? [] : traces) {
    const traceJsonPath = join(scratchRoot, "trace.json");
    const baseOutDir = join(scratchRoot, "base-frames");
    rmSync(baseOutDir, { recursive: true, force: true });
    writeFileSync(traceJsonPath, JSON.stringify(trace));

    try {
      execFileSync(
        process.execPath,
        ["--experimental-strip-types", "--no-warnings", driverPath, traceJsonPath, baseOutDir],
        { cwd: baseWorkspaceTree, stdio: ["ignore", "ignore", "inherit"] },
      );
    } catch {
      console.log(
        `${input}: BASE REPLAY FAILED — ${baseSha.slice(0, 8)} could not replay this ` +
        "trace (see stderr above). A trace whose app route did not exist at the base " +
        "commit cannot be differentially compared.",
      );
      failures += 1;
      continue;
    }

    const headCaptures = await renderAppTrace(trace);
    const baseFrames = JSON.parse(
      readFileSync(join(baseOutDir, "frames.json"), "utf8"),
    ) as number[];

    if (headCaptures.length !== baseFrames.length) {
      console.log(
        `${input}: CAPTURE COUNT MISMATCH — head ${headCaptures.length}, base ${baseFrames.length}`,
      );
      failures += 1;
      continue;
    }

    let matched = 0;
    const differing: string[] = [];
    for (const capture of headCaptures) {
      comparisons += 1;
      const basePath = join(baseOutDir, `${String(capture.frame).padStart(5, "0")}.bin`);
      if (!existsSync(basePath)) {
        differing.push(`frame ${capture.frame}: MISSING from base captures`);
        continue;
      }
      const baseRgba = readFileSync(basePath);
      const headRgba = Buffer.from(capture.rgba);
      const byte = firstDifferingByte(headRgba, baseRgba);
      if (byte === -1) {
        matched += 1;
        if (!options.summary) console.log(`frame ${capture.frame}: identical`);
        continue;
      }
      const pixels = differingPixels(headRgba, baseRgba);
      differing.push(
        `frame ${capture.frame}: DIFF ${pixels}px (first differing byte ${byte})`,
      );
    }

    for (const line of differing) console.log(line);
    const total = headCaptures.length;
    console.log(
      `${input}: ${matched}/${total} captures byte-identical` +
      (matched === total ? "" : `  <-- ${total - matched} DIFFER`),
    );
    if (matched !== total) failures += 1;
    if (frames.length !== total) {
      console.log(
        `  note: trace requested ${frames.length} captureFrames but the replay ` +
        `produced ${total} captures`,
      );
    }
  }
} finally {
  // Always clean up unless --keep was asked for explicitly. Leaking scratch
  // worktrees on the failure path is the exact friction this tool exists to
  // remove; re-run with --keep to inspect a failing base checkout.
  if (options.keep) {
    console.log(
      `app-differential: base worktree kept at ${baseTree} ` +
      "(remove with: git worktree remove --force <path>)",
    );
  } else {
    if (worktreeAdded) {
      try {
        git(["worktree", "remove", "--force", baseTree], repoRoot);
      } catch {
        console.error(
          `app-differential: could not remove worktree ${baseTree} — ` +
          "clean up with git worktree remove --force",
        );
      }
    }
    rmSync(scratchRoot, { recursive: true, force: true });
  }
}

if (overlayFailed) {
  console.log("app-differential: FAIL — harness overlay did not link against the base src/ (no replay run)");
  process.exit(2);
}
if (failures === 0) {
  console.log(
    `app-differential: PASS — ${comparisons} captures byte-identical across ` +
    `${traces.length} trace${traces.length === 1 ? "" : "s"}`,
  );
} else {
  console.log(
    `app-differential: FAIL — ${failures} of ${traces.length} traces differ from ` +
    `${baseSha.slice(0, 8)}`,
  );
}
process.exit(failures === 0 ? 0 : 1);
