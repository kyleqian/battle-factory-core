import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import { makeEvidence, reduceCgb4SecondTrackFlagsTiming } from "../tools/report/factory-m4a-note-body-cgb4-v29.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v29.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v29.md";
const DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
];
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

describeCgb4Evidence("Issue #55 CGB4 second-track flags v29", () => {
  it("prices exactly the EXIST decision and fails closed on widened input", () => {
    expect(reduceCgb4SecondTrackFlagsTiming({ secondTrackFlags: 0x80 })).toEqual({
      route: "MPT_FLG_EXIST-set-beq-not-taken", secondTrackFlags: 0x80,
      sequentialThumbHalfwords: 4, iwramByteLoads: 1, iwramDataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 0, takenControlTransferRefills: 0, sourceCycles: 8,
      stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    });
    expect(reduceCgb4SecondTrackFlagsTiming({ secondTrackFlags: 0 })).toMatchObject({
      route: "MPT_FLG_EXIST-clear-beq-taken", sourceCycles: 14,
      beqTakenControlTransferRefills: 1, stopsBeforeInstruction: "_081DDA62: first instruction",
    });
    for (const value of [undefined, {}, { secondTrackFlags: -1 }, { secondTrackFlags: 256 }, { secondTrackFlags: 0x80, trackIndex: 1 }, { firstTrackFlags: 0x80 }, { secondTrackFlags: 0x80, pointer: "forbidden" }]) {
      expect(reduceCgb4SecondTrackFlagsTiming(value)).toBeNull();
    }
  });

  it("pins exact-key packets, frozen v28, scalars, branch, cycles, and stop", () => {
    const evidence = makeEvidence();
    expect(evidence.frozenInputs).toMatchObject({
      acceptedV28EvidenceSha256: "d09f0d3e33bd562898632d0bb13830c09d0b859610edf158bd5d8bb598ebaf8b",
      acceptedV28DocSha256: "30e705f400f2e5da07f651f1e086c026748fa00d858b37f4a375c9c5c4625f2a",
      v28RegeneratesByteForByte: true, v29PacketRepeatIdentity: true,
    });
    expect(evidence.coverage).toMatchObject({
      secondTrackFlagsRows: 3, secondTrackFlagsValues: [128], existSetRows: 3, existClearRows: 0,
      postV28SecondTrackExistDecisionSourceCycles: 24,
      acceptedContiguousPrefixThroughFirstTrackContinuationSourceCycles: 5848,
      contiguousPrefixThroughSecondTrackExistDecisionSourceCycles: 5872,
      sequentialThumbHalfwords: 12, iwramByteLoads: 3, takenControlTransferRefills: 0,
      failClosedUnobservedExistClearSourceCycles: 14,
    });
    expect(evidence.rows).toEqual(DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest, secondTrackFlags: 128,
      secondTrackExistDecision: "MPT_FLG_EXIST-set-beq-not-taken",
      postV28SecondTrackExistDecisionSourceCycles: 8,
      contiguousPrefixThroughSecondTrackExistDecisionSourceCycles: 852,
      beqTakenControlTransferRefills: 0,
      stopsBeforeV29Instruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual(["beqTakenControlTransferRefills", "contiguousPrefixThroughSecondTrackExistDecisionSourceCycles", "postV28SecondTrackExistDecisionSourceCycles", "secondTrackExistDecision", "secondTrackFlags", "sourceStateDigest", "stopsBeforeV29Instruction"]);
    }
    expect(evidence.capture.packetObservationExactKeys).toEqual(["sourceStateDigest", "secondTrackFlags"]);
    expect(evidence.containment).toMatchObject({ trackPointer: null, runtimeAddress: null, trackCount: null, trackIndex: null, trackIdentity: null, iterationCount: null, channel: null, frame: null, duration: null, conditionFlags: null, widerState: null, nextTrackBody: null, constructionClock: null, unsupportedBarrierAdded: false });
  });

  it("retains v28 evidence/report and inherited packets byte-for-byte", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v28.json")).toBe("d09f0d3e33bd562898632d0bb13830c09d0b859610edf158bd5d8bb598ebaf8b");
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v28.md")).toBe("30e705f400f2e5da07f651f1e086c026748fa00d858b37f4a375c9c5c4625f2a");
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-v27/anchor.json")).toBe("af43b96726ecbab87348608a4da6c85bb798648e0e7a6d39a6d62aecd5f3f930");
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-v27/liliana.json")).toBe("9078aa6611250012a1654f05b6ea6f8f30190117f7db0f6d2713f1ab71447626");
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-v27/factory-varied.json")).toBe("6a5a1424b507c62bed61d7da753502965f0de47924425f52ba36152d7132be68");
  });

  it("regenerates evidence and report twice byte-for-byte", () => {
    const a = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v29-a-"));
    const b = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v29-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v29.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, a], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, b], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v29.json", "issue55-m4a-note-body-cgb4-v29.md"]) {
      expect(readFileSync(join(a, name)).equals(readFileSync(join(b, name)))).toBe(true);
    }
    expect(readFileSync(join(a, "factory-m4a-note-body-cgb4-evidence-v29.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(a, "issue55-m4a-note-body-cgb4-v29.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
