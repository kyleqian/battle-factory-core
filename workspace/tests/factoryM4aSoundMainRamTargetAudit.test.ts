import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  POINTER_PRODUCERS,
  SAMPLE_READ_RULES,
  SOURCE_ANCHORS,
  assertSourceAnchors,
} from "../tools/report/factory-m4a-soundmainram-target-audit-v1.ts";

const FIXTURE_PATH = "tests/fixtures/factory-m4a-soundmainram-target-audit-v1.json";
const DOCUMENT_PATH = "docs/issue55-m4a-soundmainram-target-audit-v1.md";

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

describe("Factory SoundMainRAM sample-target audit v1", () => {
  it("pins the complete source branch and read-rule inventory", () => {
    expect(() => assertSourceAnchors()).not.toThrow();
    expect(SOURCE_ANCHORS.map(({ id }) => id)).toEqual([
      "wave-data-layout",
      "direct-channel-layout",
      "soundmain-stage-order",
      "soundmainram-normal-channel-loop",
      "soundmainram-special-and-decoder",
      "mplay-main-note-dispatch",
      "mplay-voice-and-note-producers",
      "mplay-note-channel-write",
      "mplay-start-tone-producer",
      "pokemon-cry-tone-producer",
      "mplay-xwave-command-producer",
      "sound-struct-offsets",
    ]);
    expect(POINTER_PRODUCERS.map(({ id }) => id)).toEqual([
      "mplay-start.song-header-tone",
      "pokemon-cry.set-tone",
      "mplay.ply-voice.tone-table-wave",
      "mplay.ply-xwave.command-u32",
      "mplay.ply-note.inline-tone-wave",
      "mplay.ply-note.keysplit-tone-wave",
      "mplay.ply-note.rhythm-tone-wave",
      "soundmainram.persisted-current",
      "soundmainram.normal-current-writeback",
      "soundmainram.start-current",
      "soundmainram.loop-rebase",
      "soundmainram.reverse-current",
      "soundmainram.compressed-block",
    ]);
    expect(SAMPLE_READ_RULES.map(({ id }) => id)).toEqual([
      "normal-fixed",
      "normal-linear",
      "special-reverse",
      "special-compressed",
    ]);
    expect(SAMPLE_READ_RULES.find(({ id }) => id === "normal-linear")?.requiredPayloadBytes).toContain("size + 1");
    expect(SAMPLE_READ_RULES.find(({ id }) => id === "special-compressed")?.requiredPayloadBytes).toContain("33 * ceil(size / 64)");
  });

  it("pins the pre-call target coverage and the actual-entry closure boundary", () => {
    const bytes = readFileSync(FIXTURE_PATH);
    const audit = JSON.parse(bytes.toString("utf8")) as {
      schema: string;
      oracleProfile: string;
      sourceStateReference: {
        packetSchema: string;
        snapshotBoundary: string;
        targetBoundaryRequiredForClosure: string;
        freshRunsPerCase: number;
        receiptSha256: Record<string, string>;
        observationCount: number;
      };
      sourceAnchors: Array<{ id: string; sha256: string }>;
      elfAnchors: Array<{ symbol: string; bytes: number; sha256: string }>;
      observedCoverage: Record<string, unknown>;
      targets: Array<{
        elfSymbol: string;
        payloadBytes: number;
        physicalPayloadBytes: number;
        trailingReadableBytes: number;
        observed: Record<string, unknown>;
      }>;
      closure: { closed: string; notClosed: string; exactMissingRuntimeField: string; nextAdmissibleStep: string };
    };

    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(audit, null, 2)}\n`);
    expect(audit.schema).toBe("factory-m4a-soundmainram-target-audit/v1");
    expect(audit.oracleProfile).toBe("battle-scene-off");
    expect(audit.sourceStateReference).toEqual({
      packetSchema: "factory-m4a-source-state-probe/v3",
      digestKey: "sourceSemanticState.stateDigest",
      snapshotBoundary: "m4a-sound-main-call (before the six MPlayMain invocations and SoundMainRAM entry)",
      targetBoundaryRequiredForClosure: "sound-main-ram-entry (after MPlayMain/CgbSound, before the first SoundMainRAM channel pass)",
      freshRunsPerCase: 2,
      receiptSha256: {
        anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
        liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
        "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
      },
      observationCount: 113,
    });
    expect(audit.sourceAnchors).toHaveLength(12);
    expect(audit.elfAnchors).toHaveLength(11);
    expect(audit.elfAnchors.map(({ symbol, bytes }) => [symbol, bytes])).toEqual([
      ["SoundMain", 132],
      ["SoundMainRAM", 956],
      ["SoundMainRAM_Unk1", 700],
      ["SoundMainRAM_Unk2", 140],
      ["MPlayMain", 616],
      ["MPlayStart", 228],
      ["SetPokemonCryTone", 208],
      ["ply_voice", 46],
      ["ply_note", 516],
      ["ply_xwave", 72],
      ["MidiKeyToFreq", 100],
    ]);
    expect(audit.observedCoverage).toMatchObject({
      maxChansValues: [5],
      pcmSamplesPerVBlankValues: [224],
      mplayMainTargetValues: ["MPlayMain"],
      cgbSoundTargetValues: ["CgbSound"],
      plynoteTargetValues: ["ply_note"],
      uniqueLogicalTargets: 5,
      selectedPreCallChannelSnapshots: 565,
      onPreCallChannelSnapshots: 432,
      offPreCallChannelSnapshots: 133,
      startPreCallChannelSnapshots: 0,
      fixedPreCallChannelSnapshots: 310,
      linearPreCallChannelSnapshots: 255,
      specialCmpOrRevPreCallChannelSnapshots: 0,
      compressedWavePreCallChannelSnapshots: 0,
      loopPreCallChannelSnapshots: 255,
      nonLoopPreCallChannelSnapshots: 310,
      completeSampleRegionPreCallChannelSnapshots: 565,
      currentInWavePreCallChannelSnapshots: 565,
      strictCurrentRangePreCallChannelSnapshots: 565,
      countMatchesRemainingPreCallChannelSnapshots: 565,
      completeCurrentRegionPreCallChannelSnapshots: 565,
      allPreCallLogicalTargetsHaveCompletePayload: true,
      allPreCallLogicalTargetsHaveStrictCurrentRange: true,
      allPreCallLogicalTargetsHaveCountRemainingInvariant: true,
      allPreCallLogicalTargetsMapToOnePinnedElfWave: true,
      actualSoundMainRamEntryTargetCoverage: false,
      runtimeTargetProvenanceComplete: false,
    });
    expect(audit.targets.map(({ elfSymbol, payloadBytes, physicalPayloadBytes, trailingReadableBytes, observed }) => ({
      elfSymbol,
      payloadBytes,
      physicalPayloadBytes,
      trailingReadableBytes,
      observed,
    }))).toEqual([
      {
        elfSymbol: "DirectSoundWaveData_sc88pro_flute",
        payloadBytes: 1874,
        physicalPayloadBytes: 1876,
        trailingReadableBytes: 2,
        observed: { preCallSelectedSlots: 48, preCallOnSlots: 48, preCallFixedSlots: 0, preCallLinearSlots: 48, preCallLoopSlots: 48, cases: { anchor: 48 } },
      },
      {
        elfSymbol: "DirectSoundWaveData_sc88pro_tambourine",
        payloadBytes: 2211,
        physicalPayloadBytes: 2212,
        trailingReadableBytes: 1,
        observed: { preCallSelectedSlots: 218, preCallOnSlots: 165, preCallFixedSlots: 218, preCallLinearSlots: 0, preCallLoopSlots: 0, cases: { "factory-varied": 120, liliana: 98 } },
      },
      {
        elfSymbol: "DirectSoundWaveData_sc88pro_synth_bass",
        payloadBytes: 3169,
        physicalPayloadBytes: 3172,
        trailingReadableBytes: 3,
        observed: { preCallSelectedSlots: 103, preCallOnSlots: 71, preCallFixedSlots: 0, preCallLinearSlots: 103, preCallLoopSlots: 103, cases: { anchor: 65, liliana: 38 } },
      },
      {
        elfSymbol: "DirectSoundWaveData_sc88pro_xylophone",
        payloadBytes: 2594,
        physicalPayloadBytes: 2596,
        trailingReadableBytes: 2,
        observed: { preCallSelectedSlots: 104, preCallOnSlots: 93, preCallFixedSlots: 0, preCallLinearSlots: 104, preCallLoopSlots: 104, cases: { anchor: 104 } },
      },
      {
        elfSymbol: "DirectSoundWaveData_drum_and_percussion_kick",
        payloadBytes: 3846,
        physicalPayloadBytes: 3848,
        trailingReadableBytes: 2,
        observed: { preCallSelectedSlots: 92, preCallOnSlots: 55, preCallFixedSlots: 92, preCallLinearSlots: 0, preCallLoopSlots: 0, cases: { anchor: 43, "factory-varied": 30, liliana: 19 } },
      },
    ]);
    expect(audit.closure.closed).toContain("pre-call");
    expect(audit.closure.notClosed).toContain("before six MPlayMain");
    expect(audit.closure.exactMissingRuntimeField).toContain("soundMainRamEntryTargets");
    expect(audit.closure.exactMissingRuntimeField).toContain("directWaveTargetDescriptor");
    expect(audit.closure.exactMissingRuntimeField).toContain("waveAlignmentMod4");
    expect(audit.closure.exactMissingRuntimeField).toContain("physicalPayloadBytes");
    expect(audit.closure.nextAdmissibleStep).toContain("address-free post-MPlay field");

    const keys = new Set(walkKeys(audit));
    for (const forbidden of ["frame", "tick", "duration", "masterCycles", "address", "pointer"]) {
      expect(keys.has(forbidden)).toBe(false);
    }
  });

  it("rebuilds the compact fixture and receipt from the pinned source, ELF, and v3 receipts", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "pokebench-m4a-soundmainram-target-audit-v1-"));
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/report/factory-m4a-soundmainram-target-audit-v1.ts", "--out-dir", outputDir],
      { encoding: "utf8" },
    );
    expect(readFileSync(join(outputDir, "factory-m4a-soundmainram-target-audit-v1.json"))).toEqual(readFileSync(FIXTURE_PATH));
    expect(readFileSync(join(outputDir, "issue55-m4a-soundmainram-target-audit-v1.md"))).toEqual(readFileSync(DOCUMENT_PATH));
  });
});
