// Pins the scratch sandbox from `tests/setup/scratchSandbox.ts`.
//
// The suite allocates scratch space at ~200 sites via
// `mkdtempSync(join(tmpdir(), ...))` and almost none of them clean up. The
// sandbox makes that harmless by redirecting $TMPDIR per worker process and
// removing the whole tree at the end of the run. If this regresses, the leak
// silently returns — 262 GB of it by 2026-08-01 — so assert the redirection
// rather than trusting the config to stay wired up.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("scratch sandbox", () => {
  it("redirects os.tmpdir() to a sandbox owned by this worker process", () => {
    expect(tmpdir()).toContain(`worker-${process.pid}-`);
  });

  it("keeps mkdtemp allocations inside the sandbox", () => {
    const directory = mkdtempSync(join(tmpdir(), "sandbox-probe-"));
    try {
      expect(directory.startsWith(tmpdir())).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
