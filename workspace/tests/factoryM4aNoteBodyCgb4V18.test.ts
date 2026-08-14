import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4TrackLoopContinuationTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v18.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v18.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v18.md";
const V17_EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v17.json";
const V17_DOC = "docs/issue55-m4a-note-body-cgb4-v17.md";
const V17_PACKET_HASHES = {
  anchor: "5dca04f71abce9fd90bbe8737eb656b2d28d1e22612e0ec66b75e11ec22fdd11",
  liliana: "68fb3aa3ffe2252711528a0d17d4697ea66a6c1a13246f8091e43d0b7c7ffe31",
  "factory-varied": "e5e3ce1a0795710e921161fe4046e81627afc822fd6562c3d15a1cd233aac808",
} as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 observed continuation body v18", () => {
  it("prices only the fixed continuation body through the branch refill", () => {
    const timing = reduceCgb4TrackLoopContinuationTiming();
    expect(timing).toEqual({
      route: "advance-track-and-reenter-loop",
      sequentialThumbHalfwords: 4,
      takenControlTransferRefills: 1,
      sourceCycles: 14,
      nextUnresolvedInstruction: "ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    });
    expect(5394 + 7 * timing.sourceCycles).toBe(5492);
  });

  it("joins only the frozen seven v17 continuation rows", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.sourceAndElf).toMatchObject({
      elf: { loopHead: "0x082dfab4", continuationStart: "0x082dfbd4", exit: "0x082dfbdc" },
      compiledRegions: [{
        role: "movs r0, MusicPlayerTrack_size; adds r5, r0; lsls r3, 1; b _081DD87C",
        start: "0x082dfbd4",
        endExclusive: "0x082dfbdc",
        bytes: 8,
        sha256: "86e616250404bcccacf8a51a7a2bbac36d5eb6a5dbb12cfdd075dba82993efd2",
      }],
      timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillCycles: 6 },
    });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      continuationRouteRows: 7,
      exitRouteRows: 0,
      postV17ContinuationSourceCyclesPerCallback: 14,
      postV17ContinuationSourceCycles: 98,
      acceptedContiguousPrefixThroughTrackLoopDecrementSourceCycles: 5394,
      contiguousPrefixThroughTrackLoopContinuationSourceCycles: 5492,
      sequentialThumbHalfwords: 28,
      takenControlTransferRefills: 7,
      unobservedV17ExitSuccessorSourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.frozenInputs).toMatchObject({
      acceptedV17EvidenceSha256: "e4ff5796f16be7304f7deb35daaf1a6aea753332d6ae450b08e7dfce5277d34a",
      acceptedV17DocSha256: "884ad63d4b51300ea76d316943c927b4e91fbc10f5e025017632f3df93c20649",
      acceptedV17PacketSha256: V17_PACKET_HASHES,
      v17RegeneratesByteForByte: true,
      v17EvidenceAndReportRetainedByteForByte: true,
      v17PacketsRetainedByteForByte: true,
    });
    for (const row of evidence.rows) {
      expect(row.trackLoopRoute).toBe("continue-to-next-track");
      expect(row.nextTrackLoopSuccessorInstruction).toBe("movs r0, MusicPlayerTrack_size");
      expect(row.postV17ContinuationSourceCycles).toBe(14);
      expect(row.nextTrackLoopBodyInstruction).toBe("ldrb r0, [r5, o_MusicPlayerTrack_flags]");
      expect(row.unobservedV17ExitSuccessorSourceCycles).toBeNull();
      expect(row.completeMPlaySourceCycles).toBeNull();
    }
  });

  it("keeps frozen v17 evidence, report, and packets byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v17-retain-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v17.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v17.json")).equals(readFileSync(V17_EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v17.md")).equals(readFileSync(V17_DOC))).toBe(true);
    for (const [name, hash] of Object.entries(V17_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v17", `${name}.json`))).toBe(hash);
    }
  });

  it("regenerates v18 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v18-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v18.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v18.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v18.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
