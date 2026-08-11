import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence } from "../tools/report/factory-m4a-post-command-v1.ts";

describe("Issue #55 sixth-player post-command state v1", () => {
  it("closes the post-command selector for all 108 one-pass rows without pricing the earlier work", () => {
    const evidence = makeEvidence() as {
      join: { rows: number; onePassRows: number; zeroPassRows: number; ambiguousRows: number; addressFree: boolean };
      coverage: { postCommandStateClosedRows: number; onePassPostCommandStateClosedRows: number; selectedWorkRows: number; exactCompleteSourceCostRows: number; nullCompleteSourceCostRows: number };
      rows: Array<{ passCount: number; trackFlags: number[]; selectedPostCommandWorkTracks: number[]; postCommandRoute: string; completeSourceCost: number | null }>;
      closure: { durationFit: boolean; serviceCost: null; constructionClock: null; remaining: string };
    };
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toEqual(expect.objectContaining({ postCommandStateClosedRows: 113, onePassPostCommandStateClosedRows: 108, selectedWorkRows: 0, exactCompleteSourceCostRows: 5, nullCompleteSourceCostRows: 108 }));
    expect(evidence.rows.every((row) => row.trackFlags.join(",") === "128,128,128,128,128,128,128,128,128,0")).toBe(true);
    expect(evidence.rows.every((row) => row.selectedPostCommandWorkTracks.length === 0 && row.postCommandRoute === "scan-only-no-TrkVolPitSet-no-channel-traversal")).toBe(true);
    expect(evidence.rows.filter((row) => row.passCount === 1).every((row) => row.completeSourceCost === null)).toBe(true);
    expect(evidence.closure.durationFit).toBe(false);
    expect(evidence.closure.serviceCost).toBeNull();
    expect(evidence.closure.constructionClock).toBeNull();
    expect(evidence.closure.remaining).toContain("tempo-pass track/command execution");
  }, 30_000);

  it("regenerates the compact evidence and receipt exactly", () => {
    const output = mkdtempSync(join(tmpdir(), "pokebench-m4a-post-command-v1-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-post-command-v1.ts", "--out-dir", output]);
    expect(readFileSync(join(output, "factory-m4a-post-command-evidence-v1.json"))).toEqual(readFileSync("tests/fixtures/factory-m4a-post-command-evidence-v1.json"));
    expect(readFileSync(join(output, "issue55-m4a-post-command-v1.md"))).toEqual(readFileSync("docs/issue55-m4a-post-command-v1.md"));
  }, 30_000);
});
