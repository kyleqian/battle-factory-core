import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";

const TRACE_DIRS = [
  "tools/compare/traces",
  "tools/compare/traces-groundtruth",
] as const;

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** Resolve a path first, then a unique filename from the two trace catalogs. */
export function resolveCompareTracePath(input: string, cwd = process.cwd()): string {
  const direct = resolve(cwd, input);
  if (isFile(direct)) return direct;

  const filename = extname(input) ? basename(input) : `${basename(input)}.json`;
  const matches = TRACE_DIRS
    .map((directory) => resolve(cwd, directory, filename))
    .filter(isFile);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) {
    throw new Error(
      `ambiguous trace ${JSON.stringify(input)}; use one of: ${matches.join(", ")}`,
    );
  }
  throw new Error(
    `trace not found: ${input} (also searched ${TRACE_DIRS.join(" and ")})`,
  );
}

/** Resolve derived-trace sources locally, with the trace catalogs as fallback. */
export function resolveSourceTracePath(
  sourceTrace: string,
  derivedTracePath: string,
  cwd = process.cwd(),
): string {
  const besideDerived = resolve(dirname(derivedTracePath), sourceTrace);
  if (isFile(besideDerived)) return besideDerived;
  return resolveCompareTracePath(sourceTrace, cwd);
}

/** Resolve a fixture path relative to the compare trace that names it. */
export function resolveCompareFixturePath(
  fixturePath: string,
  tracePath: string,
): string {
  const resolved = resolve(dirname(tracePath), fixturePath);
  if (!isFile(resolved)) {
    throw new Error(`compare fixture not found: ${fixturePath} (resolved to ${resolved})`);
  }
  return resolved;
}

const COMPARE_OUT_ROOT = join("tools", "compare", "out");
const COMPARE_RUN_DIR_PREFIX = "run-";
const COMPARE_RUN_DIRS_KEPT = 12;

/**
 * Default output home: a fresh per-run directory plus a `latest` symlink.
 * Concurrent compares used to race over a shared tools/compare/out/latest
 * and clobber each other's artifacts mid-read; each run now owns its
 * directory while `latest` still points at the newest run so the
 * read-right-after workflow keeps working. Run directories beyond the
 * newest COMPARE_RUN_DIRS_KEPT are pruned — they are tool-owned scratch
 * under the gitignored out/ root.
 */
export function prepareCompareRunOutputDirectory(
  cwd = process.cwd(),
  now = new Date(),
  processId = process.pid,
): string {
  const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:T]/g, "-");
  const name = `${COMPARE_RUN_DIR_PREFIX}${timestamp}-${processId}`;
  const outRoot = resolve(cwd, COMPARE_OUT_ROOT);
  const runDir = join(outRoot, name);
  mkdirSync(runDir, { recursive: true });

  try {
    const latest = join(outRoot, "latest");
    const existing = lstatSync(latest, { throwIfNoEntry: false });
    if (existing?.isSymbolicLink()) unlinkSync(latest);
    else if (existing) rmSync(latest, { recursive: true }); // pre-symlink legacy directory
    symlinkSync(name, latest);
  } catch {
    // Best-effort: a concurrent compare may win the symlink swap; this
    // run's own directory is still exclusively ours.
  }

  const stale = readdirSync(outRoot)
    .filter((entry) => entry.startsWith(COMPARE_RUN_DIR_PREFIX) && entry !== name)
    .sort()
    .reverse()
    .slice(COMPARE_RUN_DIRS_KEPT - 1);
  for (const entry of stale) {
    rmSync(join(outRoot, entry), { recursive: true, force: true });
  }
  return join(COMPARE_OUT_ROOT, name);
}

/** Remove only artifacts produced by this tool, preserving unrelated files. */
export function prepareCompareOutputDirectory(outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  const generated = /^(?:oracle|app|diff)-\d+\.png$/;
  for (const entry of readdirSync(outDir)) {
    if (entry === "manifest.json" || generated.test(entry)) {
      unlinkSync(join(outDir, entry));
    }
  }
}
