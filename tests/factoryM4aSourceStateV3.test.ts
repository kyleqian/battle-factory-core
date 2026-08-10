import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAW_ROOT = "tests/fixtures/factory-m4a-source-state-v3";
const EVIDENCE_PATH = "tests/fixtures/factory-m4a-source-state-evidence-v3.json";
const REPRO_PATH = "tests/fixtures/factory-m4a-source-state-repro-v1.json";
const DOCUMENT_PATH = "docs/issue55-m4a-source-state-receipt-v3.md";
const RAW_HASHES = {
  anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
  liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
  "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
} as const;

type State = {
  sourceSemanticState: {
    revision: string;
    stateDigest: string;
    soundInfo: { scalarBytes: number[]; pcmBuffer: { requestedBytes: number; capturedBytes: number; complete: boolean } };
    musicPlayers: Array<{ scalarBytes: number[]; tracks: Array<{ scalarBytes: number[]; tailBytes: number[]; commandRegion: { requestedBytes: number; complete: boolean; sha256: string | null }; patternRegions: Array<{ requestedBytes: number; complete: boolean; sha256: string | null }> }> }>;
    directChannels: Array<{ scalarBytes: number[] }>;
    cgbChannels: Array<{ scalarBytes: number[]; waveWords: { complete: boolean }; currentWaveWords: { complete: boolean } }>;
    dispatchTables: { mplayJumpTargets: string[]; xcmdTargets: string[] };
    audioIo: { soundRegisters: number[] };
    coverage: { complete: boolean; residualDereferences: Array<Record<string, string>> };
  };
};

type Receipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  commandWindowBytes: number;
  patternWindowBytes: number;
  toneTableWindowBytes: number;
  interrupts: Array<{ m4a: { state: State; stages: Array<{ kind: string; cyclesSinceM4aEntry: number }> } }>;
};

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function walkKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => walkKeys(item, keys));
  else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      walkKeys(child, keys);
    }
  }
  return keys;
}

function range(value: { min: number; max: number; distinct: number }): object {
  return { min: value.min, max: value.max, distinct: value.distinct };
}

describe("Factory m4a source-state v3 receipt", () => {
  it("pins the twice-fresh Scene-OFF packets without identity fields", () => {
    for (const [name, expectedHash] of Object.entries(RAW_HASHES) as Array<[keyof typeof RAW_HASHES, string]>) {
      const bytes = readFileSync(`${RAW_ROOT}/${name}.json`);
      const receipt = JSON.parse(bytes.toString("utf8")) as Receipt;
      expect(sha256(bytes)).toBe(expectedHash);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
      expect(receipt.schema).toBe("factory-m4a-source-state-probe/v3");
      expect(receipt.case).toBe(name);
      expect(receipt.oracleProfile).toBe("battle-scene-off");
      expect(receipt.commandWindowBytes).toBe(256);
      expect(receipt.patternWindowBytes).toBe(128);
      expect(receipt.toneTableWindowBytes).toBe(3072);
      expect(receipt.interrupts.length).toBe(name === "anchor" ? 52 : name === "liliana" ? 31 : 30);

      for (const [index, observation] of receipt.interrupts.entries()) {
        const stages = observation.m4a.stages;
        expect(stages[0]).toEqual({ kind: "m4a-sound-main-call", cyclesSinceM4aEntry: 0 });
        expect(stages.at(-1)?.kind).toBe("m4a-sound-main-return");
        expect(stages.filter(({ kind }) => kind === "mplay-main-entry")).toHaveLength(6);
        expect(stages.filter(({ kind }) => kind === "cgb-sound-entry")).toHaveLength(1);
        expect(stages.filter(({ kind }) => kind === "sound-main-ram-channel-pass")).toHaveLength(5);

        const semantic = observation.m4a.state.sourceSemanticState;
        expect(semantic.revision).toBe("factory-m4a-source-state/v3");
        expect(semantic.soundInfo.scalarBytes).toHaveLength(0x50);
        expect(semantic.soundInfo.pcmBuffer).toMatchObject({ requestedBytes: 3168, complete: true });
        expect(semantic.musicPlayers).toHaveLength(6);
        expect(semantic.directChannels).toHaveLength(12);
        expect(semantic.cgbChannels).toHaveLength(4);
        expect(semantic.musicPlayers.every((player) => player.scalarBytes.length === 0x40)).toBe(true);
        expect(semantic.musicPlayers.every((player) => player.tracks.every((track) => track.scalarBytes.length === 0x20 && track.tailBytes.length === 0x30))).toBe(true);
        expect(semantic.directChannels.every((channel) => channel.scalarBytes.length === 0x40)).toBe(true);
        expect(semantic.cgbChannels.every((channel) => channel.scalarBytes.length === 0x40)).toBe(true);
        expect(semantic.dispatchTables.mplayJumpTargets).toHaveLength(36);
        expect(semantic.dispatchTables.xcmdTargets).toHaveLength(14);
        expect(semantic.audioIo.soundRegisters).toHaveLength(0x40);
        expect(semantic.coverage.complete).toBe(false);
        expect(semantic.coverage.residualDereferences).toHaveLength(4);
        expect(index).toBeLessThan(receipt.interrupts.length);
      }

      const keys = new Set(walkKeys(receipt));
      for (const forbidden of [
        "entryMasterCycles", "returnMasterCycles", "resumeMasterCycles", "masterCycles", "globalCycles", "cpuCycles", "cyclePhase",
        "sourceEpoch", "frame", "tick", "cursor", "rngValue", "monIndex", "setIds", "trainerId", "pointer", "address",
      ]) {
        expect(keys.has(forbidden)).toBe(false);
      }
    }
  });

  it("regenerates the report and pins equal-key fresh repeats plus residuals", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "pokebench-m4a-source-state-v3-report-"));
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/report/factory-m4a-source-state-v3.ts", "--out-dir", outputDir],
      { encoding: "utf8" },
    );
    expect(readFileSync(join(outputDir, "factory-m4a-source-state-evidence-v3.json"))).toEqual(readFileSync(EVIDENCE_PATH));
    expect(readFileSync(join(outputDir, "issue55-m4a-source-state-receipt-v3.md"))).toEqual(readFileSync(DOCUMENT_PATH));

    const evidence = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8")) as {
      schema: string;
      oracleProfile: string;
      sourceReferences: Array<{ source: string; lines: string }>;
      reproducibility: { freshRunsPerCase: number; cases: Array<{ case: string; firstFreshSha256: string; secondFreshSha256: string; byteIdentical: boolean }> };
      sourceStateEquivalenceAcrossFreshRuns: { observationsPerFreshRun: number; capturedStateKeys: number; repeatedEqualStateKeys: number; repeatedObservationCount: number; repeatedKeysWithDifferentM4aCost: number };
      residualDereferences: Array<Record<string, string>>;
      cases: Array<{ receipt: string; sourceEpochObservationCount: number; sourceStateKeysWithinFreshRun: { capturedStateKeys: number; repeatedCapturedStateKeys: number }; distributions: { m4aSoundMain: { min: number; max: number; distinct: number }; mplaySixth: { min: number; max: number; distinct: number }; cgbSound: { min: number; max: number; distinct: number }; soundMainRamChannelPasses: { min: number; max: number; distinct: number } } }>;
    };
    const repro = JSON.parse(readFileSync(REPRO_PATH, "utf8")) as { schema: string; cases: Array<{ case: string; firstFreshSha256: string; secondFreshSha256: string; byteIdentical: boolean }> };
    expect(evidence.schema).toBe("factory-m4a-source-state-evidence/v3");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.sourceReferences.map(({ source, lines }) => `${source}:${lines}`)).toEqual([
      "reference/pokeemerald/src/m4a.c:925-1231,1500-1534",
      "reference/pokeemerald/src/m4a_1.s:20-445,1130-1466",
      "reference/pokeemerald/include/gba/m4a_internal.h:39-221,272-350",
      "reference/pokeemerald/constants/m4a_constants.inc:54-257",
      "reference/pokeemerald/include/gba/io_reg.h:55-126,234-273",
      "reference/pokeemerald/pokeemerald.map:sound symbols",
      "reference/pokeemerald/pokeemerald.elf:defined symbols",
    ]);
    expect(repro.schema).toBe("factory-m4a-source-state-repro/v1");
    expect(repro.cases).toEqual(Object.entries(RAW_HASHES).map(([name, hash]) => ({
      case: name,
      firstFreshSha256: hash,
      secondFreshSha256: hash,
      byteIdentical: true,
    })));
    expect(evidence.reproducibility.freshRunsPerCase).toBe(2);
    expect(evidence.sourceStateEquivalenceAcrossFreshRuns).toMatchObject({
      observationsPerFreshRun: 113,
      capturedStateKeys: 113,
      repeatedEqualStateKeys: 113,
      repeatedObservationCount: 226,
      repeatedKeysWithDifferentM4aCost: 0,
    });
    expect(evidence.residualDereferences.map(({ stage }) => stage)).toEqual([
      "sixth-MPlayMain", "sixth-MPlayMain", "CgbSound", "SoundMainRAM-channel-passes",
    ]);
    expect(evidence.cases.map((entry) => ({
      receipt: entry.receipt,
      observations: entry.sourceEpochObservationCount,
      keys: entry.sourceStateKeysWithinFreshRun,
      m4a: range(entry.distributions.m4aSoundMain),
      sixth: range(entry.distributions.mplaySixth),
      cgb: range(entry.distributions.cgbSound),
      direct: range(entry.distributions.soundMainRamChannelPasses),
    }))).toEqual([
      {
        receipt: "anchor",
        observations: 52,
        keys: { capturedStateKeys: 52, repeatedCapturedStateKeys: 0 },
        m4a: { min: 23920, max: 52083, distinct: 52 },
        sixth: { min: 864, max: 10825, distinct: 40 },
        cgb: { min: 456, max: 1914, distinct: 37 },
        direct: { min: 14743, max: 37473, distinct: 51 },
      },
      {
        receipt: "liliana",
        observations: 31,
        keys: { capturedStateKeys: 31, repeatedCapturedStateKeys: 0 },
        m4a: { min: 24732, max: 47917, distinct: 31 },
        sixth: { min: 864, max: 10172, distinct: 29 },
        cgb: { min: 1078, max: 2328, distinct: 25 },
        direct: { min: 14635, max: 28602, distinct: 24 },
      },
      {
        receipt: "factory-varied",
        observations: 30,
        keys: { capturedStateKeys: 30, repeatedCapturedStateKeys: 0 },
        m4a: { min: 24391, max: 41682, distinct: 28 },
        sixth: { min: 864, max: 8846, distinct: 24 },
        cgb: { min: 760, max: 2428, distinct: 24 },
        direct: { min: 14629, max: 23754, distinct: 11 },
      },
    ]);
  });
});
