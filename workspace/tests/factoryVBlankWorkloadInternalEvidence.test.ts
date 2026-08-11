import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAW_ROOT = "tests/fixtures/factory-vblank-workload-internal-v2";
const EVIDENCE_PATH = "tests/fixtures/factory-vblank-workload-internal-evidence-v2.json";
const REPRO_PATH = "tests/fixtures/factory-vblank-workload-internal-repro-v2.json";
const DOCUMENT_PATH = "docs/issue55-vblank-workload-internal-receipt.md";
const RAW_HASHES = {
  anchor: "2df81b1d722f61d6ba2c82b2741d88cf393f2e2fb325376284bd06dfbde538c0",
  liliana: "40033aac6cd07cf6a5a7dc467feba945a872c8216828da57ecf28af4704f7b3e",
  "factory-varied": "dd6633f25c2160843c414d66562086e285ba5dd8f469cb4bc88fa006c12c8326",
} as const;

type Stage = { kind: string; cyclesSinceVBlankEntry: number };
type RawReceipt = {
  schema: string;
  case: keyof typeof RAW_HASHES;
  oracleProfile: string;
  sourceFunction: string;
  m4aInputPrefixBytes: number;
  interrupts: Array<{
    m4a: {
      state: {
        soundInfo: { maxChans: number; mplayMainRoutine: string; cgbRoutine: string };
        musicPlayers: Array<{ tracks: Array<{ commandPrefix: number[]; tone: unknown }> }>;
        directChannels: Array<{ control: number[]; wave: unknown }>;
        cgbChannels: Array<{ control: number[]; wavePrefix: number[] }>;
      };
      stages: Stage[];
    };
    vblankEntryToReturnCycles: number;
    returnToResumeCycles: number;
    stages: Stage[];
  }>;
};

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

function range(value: { min: number; max: number; distinct: number }): object {
  const { min, max, distinct } = value;
  return { min, max, distinct };
}

describe("Factory m4aSoundMain internal VBlank source receipt", () => {
  it("pins twice-fresh compact packets with source-owned stages and no timing or fixture identity", () => {
    const repro = JSON.parse(readFileSync(REPRO_PATH, "utf8")) as {
      schema: string;
      oracleProfile: string;
      cases: Array<{ case: keyof typeof RAW_HASHES; firstFreshSha256: string; secondFreshSha256: string; byteIdentical: boolean }>;
    };
    expect(repro.schema).toBe("factory-vblank-workload-internal-repro/v1");
    expect(repro.oracleProfile).toBe("battle-scene-off");
    expect(repro.cases.map(({ case: name }) => name)).toEqual(Object.keys(RAW_HASHES));

    for (const [name, expectedHash] of Object.entries(RAW_HASHES) as Array<[keyof typeof RAW_HASHES, string]>) {
      const bytes = readFileSync(`${RAW_ROOT}/${name}.json`);
      const receipt = JSON.parse(bytes.toString("utf8")) as RawReceipt;
      const proof = repro.cases.find((entry) => entry.case === name);
      expect(sha256(bytes)).toBe(expectedHash);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
      expect(proof).toEqual({
        case: name,
        firstFreshSha256: expectedHash,
        secondFreshSha256: expectedHash,
        byteIdentical: true,
      });
      expect(receipt.schema).toBe("factory-vblank-workload-internal-probe/v2");
      expect(receipt.case).toBe(name);
      expect(receipt.oracleProfile).toBe("battle-scene-off");
      expect(receipt.m4aInputPrefixBytes).toBe(8);
      expect(receipt.interrupts.length).toBe(name === "anchor" ? 52 : name === "liliana" ? 31 : 30);

      for (const observation of receipt.interrupts) {
        const kinds = observation.m4a.stages.map(({ kind }) => kind);
        expect(kinds[0]).toBe("m4a-sound-main-call");
        expect(kinds.at(-1)).toBe("m4a-sound-main-return");
        expect(kinds.filter((kind) => kind === "sound-main-entry")).toHaveLength(1);
        expect(kinds.filter((kind) => kind === "mplay-main-entry")).toHaveLength(6);
        expect(kinds.filter((kind) => kind === "cgb-sound-entry")).toHaveLength(1);
        expect(kinds.filter((kind) => kind === "sound-main-ram-channel-pass"))
          .toHaveLength(observation.m4a.state.soundInfo.maxChans);
        expect(kinds.filter((kind) => kind === "sound-main-ram-epilogue")).toHaveLength(1);
        expect(observation.m4a.state.soundInfo).toMatchObject({
          mplayMainRoutine: "MPlayMain",
          cgbRoutine: "CgbSound",
          maxChans: 5,
        });
        expect(observation.m4a.state.musicPlayers).toHaveLength(6);
        expect(observation.m4a.state.directChannels).toHaveLength(12);
        expect(observation.m4a.state.cgbChannels).toHaveLength(4);
        expect(observation.m4a.state.musicPlayers.some(({ tracks }) => tracks.some(({ commandPrefix, tone }) => commandPrefix.length <= 8 && tone !== undefined))).toBe(true);
        expect(observation.m4a.state.directChannels.every(({ control }) => control.length === 24)).toBe(true);
        expect(observation.m4a.state.cgbChannels.every(({ control, wavePrefix }) => control.length === 32 && wavePrefix.length <= 16)).toBe(true);
      }

      const keys = new Set(walkKeys(receipt));
      for (const forbidden of [
        "entryMasterCycles",
        "returnMasterCycles",
        "resumeMasterCycles",
        "masterCycles",
        "globalCycles",
        "cpuCycles",
        "cyclePhase",
        "sourceEpoch",
        "frame",
        "rngValue",
        "monIndex",
        "setIds",
        "trainerId",
        "pointer",
        "address",
      ]) {
        expect(keys.has(forbidden)).toBe(false);
      }
    }
  });

  it("regenerates the v2 evidence/report and pins the source-stage and equivalence verdict", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "pokebench-vblank-workload-internal-report-"));
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/report/factory-vblank-workload-internal.ts", "--out-dir", outputDir],
      { encoding: "utf8" },
    );
    expect(readFileSync(join(outputDir, "factory-vblank-workload-internal-evidence-v2.json"))).toEqual(readFileSync(EVIDENCE_PATH));
    expect(readFileSync(join(outputDir, "issue55-vblank-workload-internal-receipt.md"))).toEqual(readFileSync(DOCUMENT_PATH));

    const evidence = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8")) as {
      schema: string;
      oracleProfile: string;
      sourceReferences: Array<{ source: string; lines: string }>;
      reproducibility: { cases: Array<{ case: string; firstFreshSha256: string; secondFreshSha256: string; byteIdentical: boolean }> };
      sourceClassification: Record<string, string>;
      sourceStateEquivalenceAcrossWholeObservedSet: {
        observationCount: number;
        capturedStateKeys: number;
        repeatedCapturedStateKeys: number;
        repeatedObservationCount: number;
        repeatedKeysWithDifferentM4aCost: number;
      };
      cases: Array<{
        receipt: string;
        sourceEpochObservationCount: number;
        sourceStateEquivalence: { capturedStateKeys: number; repeatedCapturedStateKeys: number };
        distributions: {
          m4aSoundMain: { min: number; max: number; distinct: number };
          topLevel: Record<string, { min: number; max: number; distinct: number }>;
          mplayPlayerSpans: Array<{ min: number; max: number; distinct: number }>;
          directChannelSpans: Array<{ min: number; max: number; distinct: number }>;
          mplayCommandPassCount: { min: number; max: number; distinct: number };
          mplayVolumePitchPassCount: { min: number; max: number; distinct: number };
        };
        classification: { fixedTopLevelStages: string[]; variableTopLevelStages: string[]; noReducerClaim: boolean };
      }>;
    };
    expect(evidence.schema).toBe("factory-vblank-workload-internal-evidence/v2");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.sourceReferences.map(({ source, lines }) => `${source}:${lines}`)).toEqual([
      "reference/pokeemerald/src/m4a.c:102-105,925-1080",
      "reference/pokeemerald/src/m4a_1.s:20-455",
      "reference/pokeemerald/src/m4a_1.s:1130-1466",
      "reference/pokeemerald/include/gba/m4a_internal.h:39-180,286-358",
      "reference/pokeemerald/pokeemerald.map:22378-22418",
      "reference/pokeemerald/pokeemerald.elf:defined symbols",
    ]);
    expect(evidence.reproducibility.cases).toEqual(Object.entries(RAW_HASHES).map(([name, hash]) => ({
      case: name,
      firstFreshSha256: hash,
      secondFreshSha256: hash,
      byteIdentical: true,
    })));
    expect(evidence.sourceClassification.reducer).toContain("No reducer is licensed");
    expect(evidence.sourceStateEquivalenceAcrossWholeObservedSet).toMatchObject({
      observationCount: 113,
      capturedStateKeys: 113,
      repeatedCapturedStateKeys: 0,
      repeatedObservationCount: 0,
      repeatedKeysWithDifferentM4aCost: 0,
    });
    expect(evidence.cases.map((entry) => ({
      receipt: entry.receipt,
      observations: entry.sourceEpochObservationCount,
      stateKeys: (({ capturedStateKeys, repeatedCapturedStateKeys }) => ({ capturedStateKeys, repeatedCapturedStateKeys }))(entry.sourceStateEquivalence),
      m4a: range(entry.distributions.m4aSoundMain),
      mplay: range(entry.distributions.topLevel.mplayMainChain!),
      cgb: range(entry.distributions.topLevel.cgbSound!),
      direct: range(entry.distributions.topLevel.soundMainRamChannelPasses!),
      playerSpans: entry.distributions.mplayPlayerSpans.map(range),
      directSlots: entry.distributions.directChannelSpans.map(range),
      commandPasses: range(entry.distributions.mplayCommandPassCount),
      volumePitchPasses: range(entry.distributions.mplayVolumePitchPassCount),
      fixed: entry.classification.fixedTopLevelStages,
      variable: entry.classification.variableTopLevelStages,
      noReducerClaim: entry.classification.noReducerClaim,
    }))).toEqual([
      {
        receipt: "anchor",
        observations: 52,
        stateKeys: { capturedStateKeys: 52, repeatedCapturedStateKeys: 0 },
        m4a: { min: 23920, max: 52083, distinct: 52 },
        mplay: { min: 1139, max: 11100, distinct: 40 },
        cgb: { min: 456, max: 1914, distinct: 37 },
        direct: { min: 14743, max: 37473, distinct: 51 },
        playerSpans: [
          { min: 55, max: 55, distinct: 1 }, { min: 55, max: 55, distinct: 1 }, { min: 55, max: 55, distinct: 1 },
          { min: 55, max: 55, distinct: 1 }, { min: 55, max: 55, distinct: 1 }, { min: 864, max: 10825, distinct: 40 },
        ],
        directSlots: [
          { min: 30, max: 6755, distinct: 21 }, { min: 30, max: 6306, distinct: 15 }, { min: 30, max: 8732, distinct: 18 },
          { min: 30, max: 8400, distinct: 19 }, { min: 28, max: 8065, distinct: 15 },
        ],
        commandPasses: { min: 0, max: 1, distinct: 2 },
        volumePitchPasses: { min: 10, max: 10, distinct: 1 },
        fixed: ["wrapperToSoundMain", "soundMainSetup", "mplayToCgbCall", "soundMainRamTail"],
        variable: ["mplayMainChain", "cgbSound", "postCgbSetup", "soundMainRamBufferPreparation", "soundMainRamChannelPasses"],
        noReducerClaim: true,
      },
      {
        receipt: "liliana",
        observations: 31,
        stateKeys: { capturedStateKeys: 31, repeatedCapturedStateKeys: 0 },
        m4a: { min: 24732, max: 47917, distinct: 31 },
        mplay: { min: 1139, max: 10447, distinct: 29 },
        cgb: { min: 1078, max: 2328, distinct: 25 },
        direct: { min: 14635, max: 28602, distinct: 24 },
        playerSpans: [
          { min: 55, max: 55, distinct: 1 }, { min: 55, max: 55, distinct: 1 }, { min: 55, max: 55, distinct: 1 },
          { min: 55, max: 55, distinct: 1 }, { min: 55, max: 55, distinct: 1 }, { min: 864, max: 10172, distinct: 29 },
        ],
        directSlots: [
          { min: 30, max: 7904, distinct: 14 }, { min: 30, max: 4880, distinct: 7 }, { min: 30, max: 7904, distinct: 17 },
          { min: 30, max: 4898, distinct: 11 }, { min: 28, max: 4883, distinct: 8 },
        ],
        commandPasses: { min: 0, max: 1, distinct: 2 },
        volumePitchPasses: { min: 10, max: 10, distinct: 1 },
        fixed: ["wrapperToSoundMain", "soundMainSetup", "mplayToCgbCall", "soundMainRamTail"],
        variable: ["mplayMainChain", "cgbSound", "postCgbSetup", "soundMainRamBufferPreparation", "soundMainRamChannelPasses"],
        noReducerClaim: true,
      },
      {
        receipt: "factory-varied",
        observations: 30,
        stateKeys: { capturedStateKeys: 30, repeatedCapturedStateKeys: 0 },
        m4a: { min: 24391, max: 41682, distinct: 28 },
        mplay: { min: 1139, max: 9121, distinct: 24 },
        cgb: { min: 760, max: 2428, distinct: 24 },
        direct: { min: 14629, max: 23754, distinct: 11 },
        playerSpans: [
          { min: 55, max: 55, distinct: 1 }, { min: 55, max: 55, distinct: 1 }, { min: 55, max: 55, distinct: 1 },
          { min: 55, max: 55, distinct: 1 }, { min: 55, max: 55, distinct: 1 }, { min: 864, max: 8846, distinct: 24 },
        ],
        directSlots: [
          { min: 30, max: 4880, distinct: 6 }, { min: 30, max: 4880, distinct: 6 }, { min: 30, max: 4880, distinct: 7 },
          { min: 30, max: 4880, distinct: 6 }, { min: 28, max: 4896, distinct: 10 },
        ],
        commandPasses: { min: 0, max: 1, distinct: 2 },
        volumePitchPasses: { min: 10, max: 10, distinct: 1 },
        fixed: ["wrapperToSoundMain", "soundMainSetup", "mplayToCgbCall", "soundMainRamTail"],
        variable: ["mplayMainChain", "cgbSound", "postCgbSetup", "soundMainRamBufferPreparation", "soundMainRamChannelPasses"],
        noReducerClaim: true,
      },
    ]);
  });
});
