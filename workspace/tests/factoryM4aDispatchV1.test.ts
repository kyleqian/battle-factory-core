import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayDispatchTiming, type CommandDispatch } from "../tools/report/factory-m4a-dispatch-v1.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-dispatch-evidence-v1.json";
const DOC = "docs/issue55-m4a-dispatch-v1.md";
const dispatchEvidence = JSON.parse(readFileSync(EVIDENCE, "utf8")) as { executedDispatches: CommandDispatch[] };
const dispatches = dispatchEvidence.executedDispatches;
const sample = (predicate: (dispatch: CommandDispatch) => boolean): CommandDispatch => {
  const value = dispatches.find(predicate);
  if (!value) throw new Error("missing committed dispatch sample");
  return value;
};

describe("Issue #55 sixth-player command dispatcher v1", () => {
  it("instruction-counts every observed decode route", () => {
    expect(reduceMPlayDispatchTiming(sample((row) => row.route === "wait"))).toMatchObject({ route: "encoded-wait", target: "gClockTable-wait-store", sequentialThumbHalfwords: 17, pipelineRefills: 4, alignedEwramWordAccesses: 2, romLiteralLoads: 1, gamepakByteReads: 2, cycles: 85 });
    expect(reduceMPlayDispatchTiming(sample((row) => row.route === "note" && row.decode === "encoded"))).toMatchObject({ route: "encoded-note", target: "ply_note", cycles: 71 });
    expect(reduceMPlayDispatchTiming(sample((row) => row.route === "note" && row.decode === "running-status"))).toMatchObject({ route: "running-status-note", target: "ply_note", cycles: 63 });
    expect(reduceMPlayDispatchTiming(sample((row) => row.route === "jump-table" && row.decode === "encoded" && row.command < 0xbd))).toMatchObject({ route: "encoded-low-jump-table", target: "ply_pend", cycles: 93 });
    expect(reduceMPlayDispatchTiming(sample((row) => row.route === "jump-table" && row.decode === "encoded" && row.command >= 0xbd))).toMatchObject({ route: "encoded-high-jump-table", cycles: 89 });
    expect(reduceMPlayDispatchTiming(sample((row) => row.route === "jump-table" && row.decode === "running-status"))).toMatchObject({ route: "running-status-jump-table", cycles: 81 });
  });

  it("fails closed on source, running-state, and normalized-target mutations", () => {
    const running = sample((row) => row.route === "note" && row.decode === "running-status");
    const jump = sample((row) => row.route === "jump-table");
    expect(() => reduceMPlayDispatchTiming({ ...running, source: { role: "runtime-pointer", offset: 0 } })).toThrow(/normalized Factory song/);
    expect(() => reduceMPlayDispatchTiming({ ...running, source: { ...running.source, offset: running.source.offset + 1 } })).toThrow(/pinned song/);
    expect(() => reduceMPlayDispatchTiming({ ...running, runningStatusBefore: 0xbc })).toThrow(/running-status/);
    expect(() => reduceMPlayDispatchTiming({ ...jump, jumpTableIndex: (jump.jumpTableIndex ?? 0) + 1 })).toThrow(/jump-table/);
    expect(() => reduceMPlayDispatchTiming({ ...jump, route: "note" })).toThrow(/jump-table/);
  });

  it("closes dispatcher contribution only and preserves every one-pass total null", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, commandCandidateRows: 100, exactDispatchRows: 40, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({ dispatches: 218,
      routeCounts: { "encoded-high-jump-table": 24, "encoded-low-jump-table": 2, "encoded-note": 34, "encoded-wait": 99, "running-status-jump-table": 11, "running-status-note": 48 },
      targetCounts: { "gClockTable-wait-store": 99, ply_bend: 4, ply_note: 82, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 },
      sourceCycleCounts: { "63": 48, "71": 34, "81": 11, "85": 99, "89": 24, "93": 2 }, dispatchSourceCycles: 17066,
      executedTotals: { sequentialThumbHalfwords: 4069, pipelineRefills: 792, alignedEwramWordAccesses: 533, romLiteralLoads: 99, gamepakByteReads: 317, cycles: 17066 },
      exactDispatchRowsWithinOnePass: 108, nullCompleteNoteRowsWithinOnePass: 108,
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108 });
    expect(evidence.rows.filter((row: any) => row.passCount === 1)).toHaveLength(108);
    expect(evidence.rows.filter((row: any) => row.passCount === 1).every((row: any) => row.completeNoteCallbacksSourceCycles === null && row.completeMPlaySourceCycles === null)).toBe(true);
    expect(evidence.closure).toMatchObject({ durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null });
  });

  it("regenerates evidence and documentation byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-dispatch-v1-"));
    execFileSync("node", ["--experimental-strip-types", "tools/report/factory-m4a-dispatch-v1.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-dispatch-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-dispatch-v1.md"))).toEqual(readFileSync(DOC));
  }, 30_000);
});
