// Pins the worker-pool sizing contract in `vite.config.ts`.
//
// Only `run-subagent.sh` used to cap vitest, so supervisor and interactive
// sessions each ran 15 forks (~1 GB apiece plus a ~4.5 GB parent) and 4+
// concurrent sessions oversubscribed the box — measured at a signal-143 kill
// and 16-30 minute suites. The config now fair-shares by live peer count.
//
// The peer-counting half is environment-dependent and deliberately not asserted
// here; what is pinned is the explicit override, because `run-subagent.sh`
// depends on it to hold bounded workers at 4, and the floor, because a pool of
// zero would hang the suite.
import { describe, expect, it } from "vitest";
import { resolveMaxWorkers } from "../vite.config.ts";

describe("vitest worker budget", () => {
  it("honours an explicit POKEBENCH_VITEST_MAX_WORKERS", () => {
    const previous = process.env.POKEBENCH_VITEST_MAX_WORKERS;
    process.env.POKEBENCH_VITEST_MAX_WORKERS = "4";
    try {
      expect(resolveMaxWorkers()).toBe(4);
    } finally {
      if (previous === undefined) delete process.env.POKEBENCH_VITEST_MAX_WORKERS;
      else process.env.POKEBENCH_VITEST_MAX_WORKERS = previous;
    }
  });

  it("never resolves below a usable floor when sizing itself", () => {
    const previous = process.env.POKEBENCH_VITEST_MAX_WORKERS;
    delete process.env.POKEBENCH_VITEST_MAX_WORKERS;
    try {
      expect(resolveMaxWorkers()).toBeGreaterThanOrEqual(2);
    } finally {
      if (previous !== undefined) process.env.POKEBENCH_VITEST_MAX_WORKERS = previous;
    }
  });

  it("ignores a malformed override rather than producing an empty pool", () => {
    const previous = process.env.POKEBENCH_VITEST_MAX_WORKERS;
    process.env.POKEBENCH_VITEST_MAX_WORKERS = "not-a-number";
    try {
      expect(resolveMaxWorkers()).toBeGreaterThanOrEqual(2);
    } finally {
      if (previous === undefined) delete process.env.POKEBENCH_VITEST_MAX_WORKERS;
      else process.env.POKEBENCH_VITEST_MAX_WORKERS = previous;
    }
  });
});
