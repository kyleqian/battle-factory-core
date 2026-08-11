// Owns the scratch sandbox root for one `vitest` run.
//
// `tests/setup/scratchSandbox.ts` points each worker's $TMPDIR at a subdirectory
// of this root. Workers cannot be relied on to clean up after themselves —
// vitest terminates them rather than letting them exit normally, so their
// `process.on("exit")` handlers never run. This teardown executes in the main
// process once every worker is finished, so removing the root here is what
// actually reclaims the space.
//
// The root is keyed by the main process id, so concurrent supervisor lanes each
// running a full suite never delete one another's live scratch space.
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(tmpdir(), `pokebench-vitest-${process.pid}`);

export function setup(): void {
  mkdirSync(root, { recursive: true });
  // Workers are forked after global setup runs, so they inherit this.
  process.env.POKEBENCH_TEST_TMP_ROOT = root;
}

export function teardown(): void {
  try {
    rmSync(root, { recursive: true, force: true });
  } catch {
    // Never fail an otherwise-green run over cleanup; the sweeper in
    // `tools/sweep-scratch-dirs.ts` collects anything left behind.
  }
}
