import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { makeEvidence, traceMPlayTrackReads, type SourceRegion, type TrackReadState } from "../tools/report/factory-m4a-command-read-contract-v1.ts";

const base: TrackReadState = { flags: 0x80, wait: 0, patternLevel: 0, repeatCount: 0, runningStatus: 0xd0, command: { role: "track", offset: 0 }, patternStack: [null, null, null] };
const resolve = (encoded: number) => encoded < 64 ? { role: "track", offset: encoded } : null;
const region = (bytes: number[]): SourceRegion[] => [{ role: "track", symbol: "track", bytes: Uint8Array.from([...bytes, ...Array(64).fill(0xb1)]).subarray(0, 64) }];

describe("MPlayMain command read contract", () => {
  it("traces running-status note operands through a wait", () => {
    const result = traceMPlayTrackReads(base, region([60, 100, 0x81]), resolve);
    expect(result.outcome).toBe("wait");
    expect(result.reads.map((read) => read.offset)).toEqual([0, 0, 1, 2, 2]);
  });

  it("normalizes a bounded PATT/PEND return", () => {
    const bytes = [0xb3, 8, 0, 0, 0, 0x81, 0xb1, 0xb1, 0x80, 0xb4];
    const result = traceMPlayTrackReads(base, region(bytes), resolve);
    expect(result.outcome).toBe("wait");
    expect(result.commands).toEqual(["0xb3", "wait"]);
  });

  it("fails closed on recursive control and unavailable mutable reads", () => {
    expect(() => traceMPlayTrackReads(base, region([0xb2, 0, 0, 0, 0]), resolve)).toThrow(/recursive/);
    expect(() => traceMPlayTrackReads(base, region([0xb9]), resolve)).toThrow(/MEMACC/);
  });

  it("validates all committed v3 candidate states hermetically", () => {
    const evidence = makeEvidence();
    expect(evidence.coverage).toMatchObject({ observations: 113, candidateTracks: 100, tracedCandidates: 100, incompleteCandidates: 0 });
    expect(evidence.selectorBoundary).toMatchObject({ complete: false });
    expect(JSON.parse(readFileSync("tests/fixtures/factory-m4a-command-read-contract-evidence-v1.json", "utf8"))).toEqual(evidence);
  }, 30_000);
});
