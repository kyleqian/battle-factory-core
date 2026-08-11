import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

const RAW_ROOT = "tests/fixtures/factory-vblank-workload-v1";
const EVIDENCE_PATH = "tests/fixtures/factory-vblank-workload-evidence-v1.json";
const DOCUMENT_PATH = "docs/issue55-vblank-workload-receipt.md";
const RAW_HASHES = {
  anchor: "b37be9ecd9c264b02fd8ea1feed9afd75fcd85eea6dbc0ecb59979ff626dde9a",
  liliana: "ed31b192c00e4c49e25878a5cbddd79538368156fa62c3d7187e2d3c23ba5f9a",
  "factory-varied": "6506fe13e3f2f8a82a7a69a9499a1eb82983d52d66e86b58e534ad35548c4c48",
} as const;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function walkKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => walkKeys(item, keys));
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      walkKeys(child, keys);
    }
  }
  return keys;
}

describe("Factory VBlank workload source receipt", () => {
  it("pins two-run compact observations without absolute-time or construction identity fields", () => {
    for (const [name, expectedHash] of Object.entries(RAW_HASHES)) {
      const bytes = readFileSync(`${RAW_ROOT}/${name}.json`);
      const receipt = JSON.parse(bytes.toString("utf8")) as {
        schema: string;
        case: string;
        oracleProfile: string;
        interrupts: Array<{
          vblankEntryToReturnCycles: number;
          returnToResumeCycles: number;
          stages: Array<{ kind: string; cyclesSinceVBlankEntry: number; isr?: string }>;
        }>;
      };
      expect(sha256(bytes)).toBe(expectedHash);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
      expect(receipt.schema).toBe("factory-vblank-workload-probe/v1");
      expect(receipt.case).toBe(name);
      expect(receipt.oracleProfile).toBe("battle-scene-off");
      expect(receipt.interrupts.length).toBeGreaterThan(0);
      for (const observation of receipt.interrupts) {
        expect(observation.vblankEntryToReturnCycles).toBeGreaterThan(0);
        expect(observation.returnToResumeCycles).toBeGreaterThan(0);
        expect(observation.stages[0]).toEqual({ kind: "vblank-entry", cyclesSinceVBlankEntry: 0 });
        expect(observation.stages.at(-1)?.kind).toBe("vblank-return");
      }
      const keys = new Set(walkKeys(receipt));
      for (const forbidden of [
        "entryMasterCycles",
        "returnMasterCycles",
        "resumeMasterCycles",
        "sourceEpoch",
        "frame",
        "rngValue",
        "monIndex",
        "setIds",
        "trainerId",
      ]) {
        expect(keys.has(forbidden)).toBe(false);
      }
    }
  });

  it("regenerates the evidence and report byte-for-byte while pinning source classification", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "pokebench-vblank-workload-report-"));
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/report/factory-vblank-workload.ts", "--out-dir", outputDir],
      { encoding: "utf8" },
    );
    expect(readFileSync(join(outputDir, "factory-vblank-workload-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE_PATH));
    expect(readFileSync(join(outputDir, "issue55-vblank-workload-receipt.md"))).toEqual(readFileSync(DOCUMENT_PATH));

    const evidence = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8")) as {
      schema: string;
      oracleProfile: string;
      sourceReferences: Array<{ source: string; lines: string; anchors: string[] }>;
      sourceClassification: Record<string, string>;
      futureReducerInputContract: { status: string; expresslyExcluded: string[]; unresolved: string[] };
      cases: Array<{
        receipt: string;
        sourceEpochObservationCount: number;
        stateInventory: { audio: { capturedMusicPlayerStateDistinct: number; capturedSoundStateDistinct: number } };
        distributions: {
          entryToResume: { min: number; max: number; distinct: number };
          returnToResume: { histogram: Array<{ value: number; count: number }> };
          bodyMinusM4aSoundMain: { min: number; max: number; distinct: number };
          bodyStages: {
            m4aSoundMain: { min: number; max: number; distinct: number };
            vblankCallback: { min: number; max: number; distinct: number };
          };
        };
        classification: { allBodyVariationIsMeasuredInsideM4aSoundMain: boolean; sourceVisibleNonVBlankIsrEntries: string[] };
      }>;
    };
    expect(evidence.schema).toBe("factory-vblank-workload-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.sourceReferences.map(({ source, lines }) => `${source}:${lines}`)).toEqual([
      "reference/pokeemerald/src/main.c:340-372",
      "reference/pokeemerald/src/battle_factory_screen.c:1101-1106",
      "reference/pokeemerald/src/overworld.c:1784-1792",
      "reference/pokeemerald/src/gpu_regs.c:49-64",
      "reference/pokeemerald/src/dma3_manager.c:42-96",
      "reference/pokeemerald/src/m4a.c:102-105",
      "reference/pokeemerald/src/m4a_1.s:20-180",
      "reference/pokeemerald/include/gba/m4a_internal.h:185-349",
      "reference/pokeemerald/src/main.c:379-409",
    ]);
    expect(evidence.sourceClassification.audio).toContain("only measured VBlank-body stage");
    expect(evidence.sourceClassification.resume).toContain("additional 18 cycles");
    expect(evidence.futureReducerInputContract.status).toContain("not a proof");
    expect(evidence.futureReducerInputContract.expresslyExcluded.join(" ")).toContain("RNG cursor");
    expect(evidence.futureReducerInputContract.unresolved).toHaveLength(2);
    expect(evidence.cases.map((entry) => ({
      receipt: entry.receipt,
      observations: entry.sourceEpochObservationCount,
      entryToResume: (({ min, max, distinct }) => ({ min, max, distinct }))(entry.distributions.entryToResume),
      bodyMinusM4a: (({ min, max, distinct }) => ({ min, max, distinct }))(entry.distributions.bodyMinusM4aSoundMain),
      callback: (({ min, max, distinct }) => ({ min, max, distinct }))(entry.distributions.bodyStages.vblankCallback),
      m4a: (({ min, max, distinct }) => ({ min, max, distinct }))(entry.distributions.bodyStages.m4aSoundMain),
      resume: entry.distributions.returnToResume.histogram,
      audioStates: [
        entry.stateInventory.audio.capturedMusicPlayerStateDistinct,
        entry.stateInventory.audio.capturedSoundStateDistinct,
      ],
      onlyM4aVarying: entry.classification.allBodyVariationIsMeasuredInsideM4aSoundMain,
      nonVBlankIsrs: entry.classification.sourceVisibleNonVBlankIsrEntries,
    }))).toEqual([
      {
        receipt: "anchor",
        observations: 52,
        entryToResume: { min: 29_475, max: 57_638, distinct: 52 },
        bodyMinusM4a: { min: 5_514, max: 5_514, distinct: 1 },
        callback: { min: 4_749, max: 4_749, distinct: 1 },
        m4a: { min: 23_920, max: 52_083, distinct: 52 },
        resume: [{ value: 41, count: 52 }],
        audioStates: [52, 52],
        onlyM4aVarying: true,
        nonVBlankIsrs: [],
      },
      {
        receipt: "liliana",
        observations: 31,
        entryToResume: { min: 31_368, max: 54_553, distinct: 31 },
        bodyMinusM4a: { min: 6_595, max: 6_595, distinct: 1 },
        callback: { min: 5_876, max: 5_876, distinct: 1 },
        m4a: { min: 24_732, max: 47_917, distinct: 31 },
        resume: [{ value: 41, count: 31 }],
        audioStates: [31, 31],
        onlyM4aVarying: true,
        nonVBlankIsrs: [],
      },
      {
        receipt: "factory-varied",
        observations: 30,
        entryToResume: { min: 31_073, max: 48_364, distinct: 28 },
        bodyMinusM4a: { min: 6_641, max: 6_641, distinct: 1 },
        callback: { min: 5_876, max: 5_876, distinct: 1 },
        m4a: { min: 24_391, max: 41_682, distinct: 28 },
        resume: [{ value: 41, count: 29 }, { value: 59, count: 1 }],
        audioStates: [30, 30],
        onlyM4aVarying: true,
        nonVBlankIsrs: [],
      },
    ]);
  });
});
