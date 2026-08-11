// Per-process scratch sandbox for the test suite.
//
// Suites (and the tools/ modules they import) allocate scratch space with
// `mkdtempSync(join(tmpdir(), "<prefix>-"))` at ~200 call sites, and almost
// none of them remove the directory afterwards. macOS only sweeps the real
// $TMPDIR on reboot, so on a long-running box the debris never self-corrects:
// by 2026-08-01 it had reached 97k directories / 262 GB, ~95% of it from this
// suite (measured by attributing each leaked directory name back to the
// literal prefix that created it).
//
// `os.tmpdir()` re-reads $TMPDIR on every call, so pointing $TMPDIR at a
// sandbox captures every one of those allocations — no per-site edits, and new
// suites inherit the behaviour automatically.
//
// Child processes spawned by tests (the mGBA/python probes) inherit the
// redirected $TMPDIR too, so their scratch output lands inside the sandbox and
// is reclaimed with it.
//
// Removal is owned by `scratchSandboxGlobal.ts`'s teardown, which runs in the
// main process: vitest terminates workers rather than letting them exit, so the
// `process.on("exit")` handler below is best-effort only.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SANDBOX_KEY = "__pokebenchScratchSandbox";

// Vitest executes setup files once per test FILE; files sharing a worker share
// one process, so allocate at most one sandbox per process.
const globalScope = globalThis as Record<string, unknown>;

if (typeof globalScope[SANDBOX_KEY] !== "string") {
  // Read the run root before $TMPDIR is redirected. Falling back to a private
  // mkdtemp keeps the suite working if it is ever run without the global setup
  // (a bare `vitest` against a hand-written config, say).
  const runRoot = process.env.POKEBENCH_TEST_TMP_ROOT ?? tmpdir();
  const sandbox = mkdtempSync(join(runRoot, `worker-${process.pid}-`));

  globalScope[SANDBOX_KEY] = sandbox;
  process.env.TMPDIR = sandbox;

  process.on("exit", () => {
    try {
      rmSync(sandbox, { recursive: true, force: true });
    } catch {
      // The run-level teardown is the real guarantee; losing this race is fine.
    }
  });
}

export const scratchSandbox = globalScope[SANDBOX_KEY] as string;
