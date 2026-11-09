import { execSync } from "node:child_process";
import { availableParallelism } from "node:os";
import { defineConfig, configDefaults } from "vitest/config";
import { computeEngineBuild, ENGINE_BUILD_DEFINE } from "./tools/build/engineBuild.ts";

// How many OTHER vitest runs are live right now.
//
// Vitest names its main process `node (vitest)` and its forks `node (vitest N)`,
// so the parents are countable and the forks are not mistaken for them. Our own
// process is excluded by pid — whether or not it has been renamed yet by the
// time this config is evaluated.
function livePeerVitestRuns(): number {
  try {
    const listing = execSync("ps -eo pid=,command=", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    let peers = 0;
    for (const line of listing.split("\n")) {
      const match = /^\s*(\d+)\s+node \(vitest\)\s*$/.exec(line);
      if (match && Number(match[1]) !== process.pid) peers += 1;
    }
    return peers;
  } catch {
    // No `ps`, or it failed — fall back to assuming we are alone.
    return 0;
  }
}

// Fair-share the machine between concurrent suites.
//
// One uncapped full suite peaks at 15 forks (~1 GB each, plus a ~4.5 GB parent)
// and this repo routinely runs 4+ sessions at once, which oversubscribes a
// 16-core box badly enough to have caused a signal-143 kill and 16-30 minute
// suites. Sizing the pool by the number of live peers keeps a solo run at full
// speed while a contended one backs off automatically. Solo wall clock grows
// with the suite: 167s at ~500 files (2026-08-01), 248s at 677 files
// (2026-08-03). Multi-minute figures well above that (PROGRESS 900's 13-14
// min) are contention, not suite cost — see PAPERCUTS before budgeting.
//
// `POKEBENCH_VITEST_MAX_WORKERS` still wins when set — `run-subagent.sh`
// exports 4 for bounded workers, and it is the escape hatch for a run you know
// is alone.
export function resolveMaxWorkers(): number {
  const explicit = Number(process.env.POKEBENCH_VITEST_MAX_WORKERS);
  if (Number.isFinite(explicit) && explicit >= 1) return Math.floor(explicit);
  const budget = Math.max(1, availableParallelism() - 1);
  return Math.max(2, Math.floor(budget / (livePeerVitestRuns() + 1)));
}

// Stamp every served/built app with its commit so a played build's age is
// visible on screen and inside exported session traces (the play-preview
// worktree serves deliberately pinned checkouts; reports need attribution).
export function buildStamp(): string {
  try {
    const commit = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const date = execSync("git show -s --format=%cs HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const dirty =
      execSync("git status --porcelain", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() === ""
        ? ""
        : "+dirty";
    return `${commit}${dirty} ${date}`;
  } catch {
    return "unknown";
  }
}

// Cloudflare static assets (the website that bundles this package) cap each
// file at 25 MiB and the app used to be one 32 MB chunk, so the generated
// JSON is grouped into named chunks, each well under 20 MB. Shared by the app
// build and the library build (vite.lib.config.ts).
export function manualChunks(id: string): string | undefined {
  if (!id.endsWith(".json")) return undefined;
  const at = id.indexOf("/src/");
  if (at === -1) return undefined;
  const rel = id.slice(at + 5);
  if (rel.startsWith("assets/gen/")) {
    return /battle-opponent-front-sprites|battle-back-sprites|party-mon-icons/.test(rel) ? "assets-sprites" : "assets-gen";
  }
  if (rel.startsWith("animation/assets/")) return "animation-assets";
  if (rel.startsWith("data/gen/")) return rel.startsWith("data/gen/battle-script-") ? "data-battle-script" : "data-gen";
  return undefined;
}

// ENGINE_BUILD (tools/build/engineBuild.ts): a content hash of the headless
// graph's built output, computed once per build command and `define`d into the
// app, browser-lib and headless builds alike. The dev server and vitest do not
// build, so they report "dev".
export async function engineBuildDefine(command: string): Promise<Record<string, string>> {
  const value = command === "build" ? await computeEngineBuild({ root: ".", entry: "src/headless.ts", manualChunks }) : "dev";
  return { [ENGINE_BUILD_DEFINE]: JSON.stringify(value) };
}

export default defineConfig(async ({ command, mode }) => ({
  root: ".",
  // Vitest only (the app / lib builds keep vite's default JSON handling): emit each generated JSON module as
  // `export default JSON.parse("...")` instead of an object literal plus per-key named exports. The ~46 MB of generated
  // JSON under src/ is otherwise parsed, transformed and sourcemapped as JavaScript in the vitest parent and re-evaluated
  // in every fork; measured on one file: transform 49 s -> 9 s, collect 77 s -> 15 s, parent peak RSS 4.5 -> 0.6 GB
  // (docs/cln242-suite-speed.md). No test, tool or src module imports a JSON file by name (default imports only).
  json: mode === "test" ? { stringify: true } : undefined,
  define: {
    __POKEBENCH_BUILD_STAMP__: JSON.stringify(buildStamp()),
    ...(await engineBuildDefine(command)),
  },
  build: {
    outDir: "dist",
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    // Every suite lives in `tests/`. Pinning discovery there (rather than
    // vitest's default repo-wide glob) keeps nested checkouts invisible: the
    // parallel-worker lane checks a second copy of the repo out under
    // `.worktrees/`, and differential worktrees occasionally land elsewhere
    // under the run root — either one otherwise doubles every suite.
    include: ["tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/.worktrees/**"],
    // Redirects $TMPDIR to a per-process sandbox that is removed on exit, so
    // the suite's ~200 `mkdtempSync(join(tmpdir(), ...))` sites stop leaking
    // scratch directories that macOS only sweeps on reboot. See the file
    // header for the measurement behind this.
    setupFiles: ["tests/setup/scratchSandbox.ts", "tests/setup/monPicPixels.ts"],
    globalSetup: ["tests/setup/scratchSandboxGlobal.ts"],
    // See resolveMaxWorkers() above — solo runs stay full-width, concurrent
    // ones back off so 4 sessions cannot each claim the whole machine.
    minWorkers: 1,
    maxWorkers: resolveMaxWorkers(),
    // Reuse worker module caches across test files. The 2026-08-08 timing
    // audit measured the suite at 97.5% collect (module import) vs 2.5%
    // assertions — 811 isolated forks each re-imported the ~34 MB engine
    // graph. On the 30 heaviest files, isolate:false cut wall time 41%
    // (80s -> 47s, 1,259 tests green); it also lowers the per-fork heap
    // churn behind the concurrent-run collection-timeout class. Tests must
    // not rely on fresh module state per file; quarantine any offender via
    // a per-file `// @vitest-environment` override or poolMatchGlobs shard
    // rather than reverting this.
    isolate: false,
  },
}));
