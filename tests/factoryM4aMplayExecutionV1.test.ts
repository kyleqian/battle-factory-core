import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence } from "../tools/report/factory-m4a-mplay-execution-v1.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-mplay-execution-evidence-v1.json";

describe("Issue #55 sixth-player MPlay source-composition audit v1", () => {
  it("joins all 113 frozen rows and keeps the exact source barrier explicit", () => {
    const evidence = makeEvidence() as {
      join: { rows: number; selectorRows: number; mixerEntryRows: number; boundedCommandRows: number; ambiguousRows: number; addressFree: boolean };
      coverage: { exactSourceCostRows: number; nullSourceCostRows: number; classes: Record<string, number> };
      closure: { durationFit: boolean; serviceCost: null; constructionClock: null; barrier: string };
      rows: Array<{ sourceCost: { exact: { sourceCycles: number } | null; class: string }; oracleReference: { observedSixthMPlayCycles: number } }>;
    };
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, selectorRows: 113, mixerEntryRows: 113, boundedCommandRows: 100, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({ exactSourceCostRows: 5, nullSourceCostRows: 108, classes: { "one-pass-post-command-state-barrier": 108, "zero-pass-common-post-tempo-path": 5 } });
    expect(evidence.rows.filter((row) => row.sourceCost.exact?.sourceCycles === 864)).toHaveLength(5);
    expect(evidence.rows.filter((row) => row.sourceCost.exact === null)).toHaveLength(108);
    expect(evidence.rows.filter((row) => row.sourceCost.exact?.sourceCycles === 864).every((row) => row.oracleReference.observedSixthMPlayCycles === 864)).toBe(true);
    expect(evidence.closure.durationFit).toBe(false);
    expect(evidence.closure.serviceCost).toBeNull();
    expect(evidence.closure.constructionClock).toBeNull();
    expect(evidence.closure.barrier).toContain("Track.flags and chan");
    expect(evidence.closure.barrier).toContain("null");
  }, 30_000);

  it("regenerates the additive evidence byte-for-byte", () => {
    const output = mkdtempSync(join(tmpdir(), "pokebench-m4a-mplay-execution-v1-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-mplay-execution-v1.ts", "--out-dir", output], { encoding: "utf8" });
    expect(readFileSync(join(output, "factory-m4a-mplay-execution-evidence-v1.json")).toString()).toBe(readFileSync(EVIDENCE, "utf8"));
  }, 30_000);
});
