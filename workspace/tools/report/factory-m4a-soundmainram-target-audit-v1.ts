import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type SourceAnchor = {
  id: string;
  source: string;
  startLine: number;
  endLine: number;
  anchors: readonly string[];
};

type ElfSymbol = { address: number; size: number; kind: string; name: string };

type Region = {
  requestedBytes: number;
  capturedBytes: number;
  complete: boolean;
  sha256: string | null;
};

type Wave = {
  header: { type: number; status: number; frequency: number; loopStart: number; size: number };
  sampleRegion: Region;
  currentOffset: number | null;
  currentRegion: Region | null;
};

type DirectChannel = {
  scalarBytes: number[];
  wave: Wave | null;
  currentInWave: boolean;
};

type V3Receipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  interrupts: Array<{
    m4a: {
      state: {
        sourceSemanticState: {
          revision: string;
          stateDigest: string;
          soundInfo: {
            scalarBytes: number[];
            routineTargets: { mplayMain: string | null; cgbSound: string | null; plynote: string | null };
          };
          directChannels: DirectChannel[];
        };
      };
      stages: Array<{ kind: string; cyclesSinceM4aEntry: number }>;
    };
  }>;
};

type Reproducibility = {
  schema: string;
  oracleProfile: string;
  freshRunsPerCase: number;
  cases: Array<{ case: string; firstFreshSha256: string; secondFreshSha256: string; byteIdentical: boolean }>;
};

type TargetAggregate = {
  key: string;
  header: Wave["header"];
  payloadSha256: string;
  preCallSelectedSlots: number;
  preCallOnSlots: number;
  preCallFixedSlots: number;
  preCallLinearSlots: number;
  preCallLoopSlots: number;
  cases: Record<string, number>;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const ELF_PATH = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
const V3_ROOT = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const V3_REPRO_PATH = join(ROOT, "tests/fixtures/factory-m4a-source-state-repro-v1.json");
const DEFAULT_FIXTURE_PATH = join(ROOT, "tests/fixtures/factory-m4a-soundmainram-target-audit-v1.json");
const DEFAULT_DOC_PATH = join(ROOT, "docs/issue55-m4a-soundmainram-target-audit-v1.md");
const CASES = ["anchor", "liliana", "factory-varied"] as const;
const EXPECTED_OBSERVATIONS: Record<(typeof CASES)[number], number> = {
  anchor: 52,
  liliana: 31,
  "factory-varied": 30,
};
const EXPECTED_RECEIPT_SHA256: Record<(typeof CASES)[number], string> = {
  anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
  liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
  "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
};

const SOUND_CHANNEL_STATUS_ACTIVE = 0xc7;
const SOUND_CHANNEL_STATUS_START = 0x80;
const SOUND_CHANNEL_STATUS_LOOP = 0x10;
const TONEDATA_TYPE_FIX = 0x08;
const TONEDATA_TYPE_REV = 0x10;
const TONEDATA_TYPE_CMP = 0x20;
const WAVE_DATA_FLAG_LOOP = 0xc0;
const WAVE_HEADER_BYTES = 0x10;
const SOUND_INFO_MAX_CHANS_OFFSET = 0x06;
const SOUND_INFO_PCM_SAMPLES_PER_VBLANK_OFFSET = 0x10;
const SOUND_CHANNEL_COUNT_OFFSET = 0x18;

export const SOURCE_ANCHORS: readonly SourceAnchor[] = [
  {
    id: "wave-data-layout",
    source: "reference/pokeemerald/include/gba/m4a_internal.h",
    startLine: 39,
    endLine: 47,
    anchors: ["struct WaveData", "u32 loopStart", "u32 size", "s8 data[1]"],
  },
  {
    id: "direct-channel-layout",
    source: "reference/pokeemerald/include/gba/m4a_internal.h",
    startLine: 130,
    endLine: 165,
    anchors: ["struct SoundChannel", "u32 count", "struct WaveData *wav", "s8 *currentPointer"],
  },
  {
    id: "soundmain-stage-order",
    source: "reference/pokeemerald/src/m4a_1.s",
    startLine: 20,
    endLine: 98,
    anchors: ["SoundMain:", "o_SoundInfo_MPlayMainHead", "o_SoundInfo_CgbSound", "lt_SoundMainRAM_Buffer"],
  },
  {
    id: "soundmainram-normal-channel-loop",
    source: "reference/pokeemerald/src/m4a_1.s",
    startLine: 153,
    endLine: 445,
    anchors: ["SoundMainRAM_ChanLoop:", "o_SoundChannel_wav", "o_WaveData_loopStart", "ldrsb r0, [r3], 0x1", "ldrsb r1, [r3, 0x1]!"],
  },
  {
    id: "soundmainram-special-and-decoder",
    source: "reference/pokeemerald/src/m4a_1.s",
    startLine: 469,
    endLine: 709,
    anchors: ["SoundMainRAM_Unk1:", "TONEDATA_TYPE_REV", "SoundMainRAM_Unk2:", "mov r1, 0x21", "and r0, r3, 0x3F"],
  },
  {
    id: "mplay-main-note-dispatch",
    source: "reference/pokeemerald/src/m4a_1.s",
    startLine: 1130,
    endLine: 1466,
    anchors: ["MPlayMain:", "o_SoundInfo_plynote", "bl call_r3", "call_r3:"],
  },
  {
    id: "mplay-voice-and-note-producers",
    source: "reference/pokeemerald/src/m4a_1.s",
    startLine: 945,
    endLine: 966,
    anchors: ["ply_voice:", "o_ToneData_wav", "chk_adr_r2"],
  },
  {
    id: "mplay-note-channel-write",
    source: "reference/pokeemerald/src/m4a_1.s",
    startLine: 1538,
    endLine: 1805,
    anchors: ["ply_note:", "o_MusicPlayerTrack_ToneData_wav", "o_SoundChannel_wav", "o_SoundChannel_count"],
  },
  {
    id: "mplay-start-tone-producer",
    source: "reference/pokeemerald/src/m4a.c",
    startLine: 611,
    endLine: 665,
    anchors: ["void MPlayStart", "mplayInfo->tone = songHeader->tone", "track->cmdPtr = songHeader->part[i]"],
  },
  {
    id: "pokemon-cry-tone-producer",
    source: "reference/pokeemerald/src/m4a.c",
    startLine: 1660,
    endLine: 1697,
    anchors: ["struct MusicPlayerInfo *SetPokemonCryTone", "gPokemonCrySongs[i].tone = tone", "MPlayStart(mplayInfo"],
  },
  {
    id: "mplay-xwave-command-producer",
    source: "reference/pokeemerald/src/m4a.c",
    startLine: 1536,
    endLine: 1559,
    anchors: ["READ_XCMD_BYTE", "void ply_xwave", "track->tone.wav", "track->cmdPtr += 4"],
  },
  {
    id: "sound-struct-offsets",
    source: "reference/pokeemerald/constants/m4a_constants.inc",
    startLine: 53,
    endLine: 138,
    anchors: ["o_WaveData_data", "o_SoundChannel_count", "o_SoundChannel_wav", "o_SoundChannel_currentPointer"],
  },
] as const;

const ELF_SYMBOLS = [
  "SoundMain",
  "SoundMainRAM",
  "SoundMainRAM_Unk1",
  "SoundMainRAM_Unk2",
  "MPlayMain",
  "MPlayStart",
  "SetPokemonCryTone",
  "ply_voice",
  "ply_note",
  "ply_xwave",
  "MidiKeyToFreq",
] as const;

// This is exhaustive for the direct-sound target provenance and target-shape
// branches that can feed the selected SoundMainRAM mixer pass. It deliberately
// distinguishes upstream producers from the mixer-local pointer arithmetic.
export const POINTER_PRODUCERS = [
  {
    id: "mplay-start.song-header-tone",
    source: "m4a.c:611-665",
    output: "MusicPlayerInfo.tone",
    expression: "SongHeader.tone copied when MPlayStart accepts the song",
    guard: "The song-header tone pointer is trusted; MPlayStart also installs command pointers that MPlayMain may consume before SoundMainRAM.",
  },
  {
    id: "pokemon-cry.set-tone",
    source: "m4a.c:1660-1697",
    output: "PokemonCry SongHeader.tone",
    expression: "SetPokemonCryTone(tone) assigns caller-provided tone into a mutable cry SongHeader",
    guard: "A cry ToneData source can therefore enter the same MPlayStart -> ply_voice -> ply_note chain.",
  },
  {
    id: "mplay.ply-voice.tone-table-wave",
    source: "m4a_1.s:945-966",
    output: "MusicPlayerTrack.ToneData.wav",
    expression: "MusicPlayerInfo.tone + 12 * voice selector -> ToneData.wav",
    guard: "chk_adr_r2 checks the ToneData record base, not the copied WaveData target or its length.",
  },
  {
    id: "mplay.ply-xwave.command-u32",
    source: "m4a.c:1536-1559",
    output: "MusicPlayerTrack.ToneData.wav",
    expression: "four cmdPtr bytes assembled into wav",
    guard: "No WaveData target/range validation follows the command-byte assembly.",
  },
  {
    id: "mplay.ply-note.inline-tone-wave",
    source: "m4a_1.s:1579-1625,1750-1754",
    output: "SoundChannel.wav",
    expression: "inline MusicPlayerTrack ToneData.wav",
    guard: "Selected inline tone is copied directly into the direct-sound channel.",
  },
  {
    id: "mplay.ply-note.keysplit-tone-wave",
    source: "m4a_1.s:1581-1607,1750-1754",
    output: "SoundChannel.wav",
    expression: "ToneData.wav + 12 * keysplit selector -> selected ToneData.wav",
    guard: "The keysplit record supplies the direct-sound WaveData word without a WaveData range check.",
  },
  {
    id: "mplay.ply-note.rhythm-tone-wave",
    source: "m4a_1.s:1581-1618,1750-1754",
    output: "SoundChannel.wav",
    expression: "ToneData.wav + 12 * MIDI-key selector -> selected ToneData.wav",
    guard: "The rhythm record supplies the direct-sound WaveData word without a WaveData range check.",
  },
  {
    id: "soundmainram.persisted-current",
    source: "m4a_1.s:291-295",
    output: "mixer sample cursor",
    expression: "SoundChannel.currentPointer",
    guard: "The non-START path consumes the persisted cursor directly.",
  },
  {
    id: "soundmainram.normal-current-writeback",
    source: "m4a_1.s:437-440",
    output: "SoundChannel.currentPointer",
    expression: "normal fixed/linear mixer cursor r3 written back after the pass",
    guard: "The next SoundMainRAM pass can consume this mutable cursor through the non-START path.",
  },
  {
    id: "soundmainram.start-current",
    source: "m4a_1.s:177-204",
    output: "SoundChannel.currentPointer",
    expression: "WaveData.data + SoundChannel.count; remaining = WaveData.size - SoundChannel.count",
    guard: "The mixer subtracts unsigned values without checking count < size.",
  },
  {
    id: "soundmainram.loop-rebase",
    source: "m4a_1.s:278-289,380-384",
    output: "mixer loop cursor",
    expression: "WaveData.data + WaveData.loopStart; loop remaining = WaveData.size - WaveData.loopStart",
    guard: "The loop flag gates this path, but the mixer does not check loopStart < size.",
  },
  {
    id: "soundmainram.reverse-current",
    source: "m4a_1.s:471-491",
    output: "SoundChannel.currentPointer",
    expression: "WaveData.data + WaveData.size - currentOffset",
    guard: "Reverse handling is selected by TONEDATA_TYPE_REV and trusts the incoming cursor relation.",
  },
  {
    id: "soundmainram.compressed-block",
    source: "m4a_1.s:670-707",
    output: "decoder sample cursor",
    expression: "WaveData.data + 33 * floor(decodedOffset / 64)",
    guard: "A nonzero WaveData.type selects 33 physical bytes per decoded 64-sample block; WaveData.size alone is not a physical compressed-byte length.",
  },
] as const;

export const SAMPLE_READ_RULES = [
  {
    id: "normal-fixed",
    source: "m4a_1.s:313-395",
    selector: "!(channel.type & (CMP | REV)) && (channel.type & FIX)",
    reads: "One signed sample byte per source advance from currentOffset; no interpolation lookahead.",
    legalRange: "Safety requires 0 <= currentOffset < size and 0 < count <= size - currentOffset; if looping, 0 <= loopStart < size. The retained v3 pre-call states use the stronger count == size - currentOffset invariant.",
    loopExtent: "Reads [currentOffset, size) then repeats [loopStart, size) until pcmSamplesPerVBlank output samples are mixed or the channel ends.",
    requiredPayloadBytes: "size",
  },
  {
    id: "normal-linear",
    source: "m4a_1.s:396-435",
    selector: "!(channel.type & (CMP | REV)) && !(channel.type & FIX)",
    reads: "Each interpolation state reads a signed pair at source offsets i and i + 1.",
    legalRange: "Safety requires 0 <= currentOffset < size and 0 < count <= size - currentOffset; if looping, 0 <= loopStart < size. The retained v3 pre-call states use the stronger count == size - currentOffset invariant.",
    loopExtent: "Uses the same current/loop ranges as normal-fixed, with a one-byte lookahead at the end of each selected range.",
    requiredPayloadBytes: "size + 1 readable bytes (declared payload plus one physical guard byte)",
  },
  {
    id: "special-reverse",
    source: "m4a_1.s:471-666",
    selector: "channel.type & REV",
    reads: "Reverses the cursor around WaveData.data + size; normal reverse reads decrementing adjacent samples, compressed reverse delegates to the decoder.",
    legalRange: "Normal reverse requires 0 < currentOffset <= size and a matching remaining-count invariant; compressed reverse additionally requires the decoded-offset rule.",
    loopExtent: "Loop rebasing still uses WaveData.loopStart; source has no bound check.",
    requiredPayloadBytes: "normal: size plus any interpolation guard; compressed: physical 33-byte blocks",
  },
  {
    id: "special-compressed",
    source: "m4a_1.s:501-614,670-707",
    selector: "(channel.type & (CMP | REV)) && WaveData.type != 0",
    reads: "SoundMainRAM_Unk2 reads bytes 0..32 of the selected 33-byte block and emits decoded sample offset & 63.",
    legalRange: "0 <= decodedOffset < size; physical payload bytes must cover 33 * ceil(size / 64) for arbitrary in-range decoded offsets.",
    loopExtent: "The loop counter is in decoded samples; a source-complete audit must retain both decoded size and physical encoded allocation length.",
    requiredPayloadBytes: "33 * ceil(size / 64)",
  },
] as const;

function fail(message: string): never {
  throw new Error(`factory-m4a-soundmainram-target-audit-v1: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function sourceSlice(anchor: SourceAnchor): string {
  const lines = readFileSync(join(ROOT, anchor.source), "utf8").split("\n");
  const slice = lines.slice(anchor.startLine - 1, anchor.endLine).join("\n");
  if (slice.length === 0) fail(`${anchor.id} source range is empty`);
  return `${slice}\n`;
}

function loadSymbols(): ElfSymbol[] {
  const output = execFileSync(
    "arm-none-eabi-nm",
    ["--defined-only", "-S", "-n", ELF_PATH],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  const symbols: ElfSymbol[] = [];
  for (const line of output.split("\n")) {
    const match = /^([0-9a-fA-F]+)(?:\s+([0-9a-fA-F]+))?\s+(\S)\s+(\S+)$/.exec(line);
    if (match) {
      symbols.push({
        address: Number.parseInt(match[1]!, 16),
        size: match[2] ? Number.parseInt(match[2], 16) : 0,
        kind: match[3]!,
        name: match[4]!,
      });
    }
  }
  if (symbols.length === 0) fail("arm-none-eabi-nm returned no sized symbols");
  return symbols;
}

function symbolByName(symbols: ElfSymbol[], name: string): ElfSymbol {
  const symbol = symbols.find((candidate) => candidate.name === name);
  if (!symbol) fail(`ELF lacks ${name}`);
  return symbol;
}

function romBytes(elf: Buffer, symbol: ElfSymbol): Buffer {
  if (symbol.address < 0x08000000 || symbol.size <= 0) fail(`${symbol.name} is not a nonempty ROM symbol`);
  const offset = 0x1000 + symbol.address - 0x08000000;
  if (offset < 0 || offset + symbol.size > elf.length) fail(`${symbol.name} lies outside the loaded ROM image`);
  return elf.subarray(offset, offset + symbol.size);
}

function romBytesAt(elf: Buffer, address: number, size: number): Buffer {
  if (address < 0x08000000 || size < 0) fail(`invalid ROM range ${address.toString(16)} / ${size}`);
  const offset = 0x1000 + address - 0x08000000;
  if (offset < 0 || offset + size > elf.length) fail(`ROM range ${address.toString(16)} / ${size} lies outside ELF`);
  return elf.subarray(offset, offset + size);
}

function u32(bytes: number[], offset: number): number {
  if (offset < 0 || offset + 4 > bytes.length) fail(`cannot read u32 at scalar offset ${offset}`);
  return (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)) >>> 0;
}

function u16(bytes: Buffer, offset: number): number {
  if (offset < 0 || offset + 2 > bytes.length) fail(`cannot read ELF u16 at ${offset}`);
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function u32Buffer(bytes: Buffer, offset: number): number {
  if (offset < 0 || offset + 4 > bytes.length) fail(`cannot read ELF u32 at ${offset}`);
  return (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)) >>> 0;
}

function waveKey(wave: Wave): string {
  return JSON.stringify([
    wave.header.type,
    wave.header.status,
    wave.header.frequency,
    wave.header.loopStart,
    wave.header.size,
    wave.sampleRegion.sha256,
  ]);
}

function validateSourceAnchors(symbols: ElfSymbol[]): void {
  for (const anchor of SOURCE_ANCHORS) {
    const slice = sourceSlice(anchor);
    for (const text of anchor.anchors) {
      if (!slice.includes(text)) fail(`${anchor.id} lacks source anchor ${JSON.stringify(text)}`);
    }
  }
  for (const name of ELF_SYMBOLS) {
    const symbol = symbolByName(symbols, name);
    if (symbol.size === 0) fail(`${name} lost its ELF size`);
  }
}

export function assertSourceAnchors(): void {
  validateSourceAnchors(loadSymbols());
}

function loadReceipts(): { receipts: V3Receipt[]; rawHashes: Record<string, string>; reproducibility: Reproducibility } {
  const receipts = CASES.map((name) => {
    const path = join(V3_ROOT, `${name}.json`);
    const bytes = readFileSync(path);
    const receipt = JSON.parse(bytes.toString("utf8")) as V3Receipt;
    if (receipt.schema !== "factory-m4a-source-state-probe/v3" || receipt.case !== name || receipt.oracleProfile !== "battle-scene-off") {
      fail(`${name} is not the committed Battle-Scene-OFF v3 receipt`);
    }
    if (receipt.interrupts.length !== EXPECTED_OBSERVATIONS[name]) fail(`${name} observation count changed`);
    const hash = sha256(bytes);
    if (hash !== EXPECTED_RECEIPT_SHA256[name]) fail(`${name} receipt hash changed`);
    return { receipt, hash };
  });
  const reproducibility = readJson<Reproducibility>(V3_REPRO_PATH);
  if (reproducibility.schema !== "factory-m4a-source-state-repro/v1" || reproducibility.oracleProfile !== "battle-scene-off" || reproducibility.freshRunsPerCase !== 2) {
    fail("v3 fresh-run reproducibility contract changed");
  }
  for (const entry of receipts) {
    const row = reproducibility.cases.find((candidate) => candidate.case === entry.receipt.case);
    if (!row || !row.byteIdentical || row.firstFreshSha256 !== row.secondFreshSha256 || row.firstFreshSha256 !== entry.hash) {
      fail(`${entry.receipt.case} is not a twice-fresh byte-identical v3 source state receipt`);
    }
  }
  return {
    receipts: receipts.map(({ receipt }) => receipt),
    rawHashes: Object.fromEntries(receipts.map(({ receipt, hash }) => [receipt.case, hash])),
    reproducibility,
  };
}

function staticWaveAsset(elf: Buffer, waveSymbols: ElfSymbol[], target: TargetAggregate): {
  elfSymbol: string;
  header: Wave["header"];
  payloadBytes: number;
  payloadSha256: string;
  physicalPayloadBytes: number;
  physicalPayloadSha256: string;
  trailingReadableBytes: number;
  trailingReadableSha256: string | null;
} {
  const candidates = waveSymbols.flatMap((symbol, index) => {
    const next = waveSymbols[index + 1];
    if (!next || next.address <= symbol.address + WAVE_HEADER_BYTES) return [];
    const header = romBytesAt(elf, symbol.address, WAVE_HEADER_BYTES);
    const actual = {
      type: u16(header, 0),
      status: u16(header, 2),
      frequency: u32Buffer(header, 4),
      loopStart: u32Buffer(header, 8),
      size: u32Buffer(header, 12),
    };
    if (actual.type !== target.header.type || actual.status !== target.header.status || actual.frequency !== target.header.frequency || actual.loopStart !== target.header.loopStart || actual.size !== target.header.size) {
      return [];
    }
    const physicalPayloadBytes = next.address - (symbol.address + WAVE_HEADER_BYTES);
    if (physicalPayloadBytes < actual.size) return [];
    const physicalPayload = romBytesAt(elf, symbol.address + WAVE_HEADER_BYTES, physicalPayloadBytes);
    const payload = romBytesAt(elf, symbol.address + WAVE_HEADER_BYTES, actual.size);
    if (sha256(payload) !== target.payloadSha256) return [];
    const trailing = romBytesAt(elf, symbol.address + WAVE_HEADER_BYTES + actual.size, physicalPayloadBytes - actual.size);
    return [{
      elfSymbol: symbol.name,
      header: actual,
      payloadBytes: actual.size,
      payloadSha256: sha256(payload),
      physicalPayloadBytes,
      physicalPayloadSha256: sha256(physicalPayload),
      trailingReadableBytes: trailing.length,
      trailingReadableSha256: trailing.length === 0 ? null : sha256(trailing),
    }];
  });
  if (candidates.length !== 1) fail(`logical target ${target.payloadSha256} matched ${candidates.length} ELF WaveData symbols`);
  return candidates[0]!;
}

function makeAudit(): Record<string, unknown> {
  const symbols = loadSymbols();
  validateSourceAnchors(symbols);
  const elf = readFileSync(ELF_PATH);
  const { receipts, rawHashes, reproducibility } = loadReceipts();
  const targetMap = new Map<string, TargetAggregate>();
  const sourceStateDigests: string[] = [];
  const maxChans = new Set<number>();
  const pcmSamplesPerVBlank = new Set<number>();
  const mplayMainTargets = new Set<string | null>();
  const cgbSoundTargets = new Set<string | null>();
  const plynoteTargets = new Set<string | null>();
  const coverage = {
    selectedPreCallChannelSnapshots: 0,
    onPreCallChannelSnapshots: 0,
    offPreCallChannelSnapshots: 0,
    startPreCallChannelSnapshots: 0,
    fixedPreCallChannelSnapshots: 0,
    linearPreCallChannelSnapshots: 0,
    specialCmpOrRevPreCallChannelSnapshots: 0,
    compressedWavePreCallChannelSnapshots: 0,
    loopPreCallChannelSnapshots: 0,
    nonLoopPreCallChannelSnapshots: 0,
    completeSampleRegionPreCallChannelSnapshots: 0,
    currentInWavePreCallChannelSnapshots: 0,
    strictCurrentRangePreCallChannelSnapshots: 0,
    countMatchesRemainingPreCallChannelSnapshots: 0,
    completeCurrentRegionPreCallChannelSnapshots: 0,
  };
  const caseRows: Array<Record<string, unknown>> = [];

  for (const receipt of receipts) {
    let casePasses = 0;
    let caseActive = 0;
    let caseInactive = 0;
    for (const [observationIndex, observation] of receipt.interrupts.entries()) {
      const semantic = observation.m4a.state.sourceSemanticState;
      if (semantic.revision !== "factory-m4a-source-state/v3" || !/^[0-9a-f]{64}$/.test(semantic.stateDigest)) {
        fail(`${receipt.case} observation ${observationIndex} has an invalid v3 semantic state`);
      }
      sourceStateDigests.push(semantic.stateDigest);
      const routineTargets = semantic.soundInfo.routineTargets;
      if (routineTargets.mplayMain !== "MPlayMain" || routineTargets.cgbSound !== "CgbSound" || routineTargets.plynote !== "ply_note") {
        fail(`${receipt.case} observation ${observationIndex} changed the source routine target that reaches the direct-sound mixer`);
      }
      mplayMainTargets.add(routineTargets.mplayMain);
      cgbSoundTargets.add(routineTargets.cgbSound);
      plynoteTargets.add(routineTargets.plynote);
      const stages = observation.m4a.stages;
      const passStages = stages.filter((stage) => stage.kind === "sound-main-ram-channel-pass");
      if (semantic.soundInfo.scalarBytes.length !== 0x50 || semantic.directChannels.length !== 12) {
        fail(`${receipt.case} observation ${observationIndex} changed SoundInfo/direct channel widths`);
      }
      const channelCount = semantic.soundInfo.scalarBytes[SOUND_INFO_MAX_CHANS_OFFSET];
      const pcmSamples = u32(semantic.soundInfo.scalarBytes, SOUND_INFO_PCM_SAMPLES_PER_VBLANK_OFFSET);
      if (channelCount !== 5 || pcmSamples !== 224 || passStages.length !== channelCount) {
        fail(`${receipt.case} observation ${observationIndex} is no longer the five-pass 224-sample direct-sound configuration`);
      }
      const finalMPlayIndex = stages.map((stage) => stage.kind).lastIndexOf("mplay-main-entry");
      const cgbEntryIndex = stages.findIndex((stage) => stage.kind === "cgb-sound-entry");
      const ramEntryIndex = stages.findIndex((stage) => stage.kind === "sound-main-ram-entry");
      const firstPassIndex = stages.findIndex((stage) => stage.kind === "sound-main-ram-channel-pass");
      if (stages.filter((stage) => stage.kind === "mplay-main-entry").length !== 6 || finalMPlayIndex < 0 || cgbEntryIndex < 0 || ramEntryIndex < 0 || firstPassIndex < 0 || !(finalMPlayIndex < cgbEntryIndex && cgbEntryIndex < ramEntryIndex && ramEntryIndex < firstPassIndex)) {
        fail(`${receipt.case} observation ${observationIndex} changed the call-boundary-before-MPlay-before-SoundMainRAM stage ordering`);
      }
      maxChans.add(channelCount);
      pcmSamplesPerVBlank.add(pcmSamples);

      for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
        const channel = semantic.directChannels[channelIndex]!;
        const wave = channel.wave;
        if (!wave || wave.sampleRegion.sha256 === null || !wave.sampleRegion.complete || wave.sampleRegion.capturedBytes !== wave.sampleRegion.requestedBytes || wave.sampleRegion.requestedBytes !== wave.header.size) {
          fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} lacks a complete WaveData sample region`);
        }
        if (!channel.currentInWave || wave.currentOffset === null || !wave.currentRegion || !wave.currentRegion.complete) {
          fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} lacks a complete current sample relation`);
        }
        const statusFlags = channel.scalarBytes[0];
        const channelType = channel.scalarBytes[1];
        if (statusFlags === undefined || channelType === undefined || channel.scalarBytes.length !== 0x40) {
          fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} scalar shape changed`);
        }
        const count = u32(channel.scalarBytes, SOUND_CHANNEL_COUNT_OFFSET);
        const currentOffset = wave.currentOffset;
        const waveFlags = wave.header.status >>> 8;
        const active = (statusFlags & SOUND_CHANNEL_STATUS_ACTIVE) !== 0;
        const looping = (waveFlags & WAVE_DATA_FLAG_LOOP) !== 0;
        if (wave.header.type !== 0) fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} entered compressed WaveData`);
        if ((channelType & (TONEDATA_TYPE_CMP | TONEDATA_TYPE_REV)) !== 0) fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} entered a CMP/REV mixer path`);
        if ((channelType & ~TONEDATA_TYPE_FIX) !== 0) fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} entered an unknown direct-sound type`);
        if ((statusFlags & SOUND_CHANNEL_STATUS_START) !== 0) fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} entered the START pointer-construction branch`);
        if (currentOffset < 0 || currentOffset >= wave.header.size || count === 0 || count !== wave.header.size - currentOffset) {
          fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} violates current/count WaveData bounds`);
        }
        if (looping && (wave.header.loopStart < 0 || wave.header.loopStart >= wave.header.size)) {
          fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} violates loopStart bounds`);
        }
        if (active && (((statusFlags & SOUND_CHANNEL_STATUS_LOOP) !== 0) !== looping)) {
          fail(`${receipt.case} observation ${observationIndex} channel ${channelIndex} has mismatched channel/WaveData loop flags`);
        }

        coverage.selectedPreCallChannelSnapshots += 1;
        coverage.completeSampleRegionPreCallChannelSnapshots += 1;
        coverage.currentInWavePreCallChannelSnapshots += 1;
        coverage.strictCurrentRangePreCallChannelSnapshots += 1;
        coverage.countMatchesRemainingPreCallChannelSnapshots += 1;
        coverage.completeCurrentRegionPreCallChannelSnapshots += 1;
        casePasses += 1;
        if (active) {
          coverage.onPreCallChannelSnapshots += 1;
          caseActive += 1;
        } else {
          coverage.offPreCallChannelSnapshots += 1;
          caseInactive += 1;
        }
        if (channelType & TONEDATA_TYPE_FIX) coverage.fixedPreCallChannelSnapshots += 1;
        else coverage.linearPreCallChannelSnapshots += 1;
        if (looping) coverage.loopPreCallChannelSnapshots += 1;
        else coverage.nonLoopPreCallChannelSnapshots += 1;

        const key = waveKey(wave);
        const target = targetMap.get(key) ?? {
          key,
          header: wave.header,
          payloadSha256: wave.sampleRegion.sha256,
          preCallSelectedSlots: 0,
          preCallOnSlots: 0,
          preCallFixedSlots: 0,
          preCallLinearSlots: 0,
          preCallLoopSlots: 0,
          cases: {},
        };
        target.preCallSelectedSlots += 1;
        if (active) target.preCallOnSlots += 1;
        if (channelType & TONEDATA_TYPE_FIX) target.preCallFixedSlots += 1;
        else target.preCallLinearSlots += 1;
        if (looping) target.preCallLoopSlots += 1;
        target.cases[receipt.case] = (target.cases[receipt.case] ?? 0) + 1;
        targetMap.set(key, target);
      }
    }
    caseRows.push({
      case: receipt.case,
      observations: receipt.interrupts.length,
      sourceStateDigestSetSha256: sha256(sourceStateDigests.slice(-receipt.interrupts.length).sort().join("\n")),
      preCallSelectedSlots: casePasses,
      preCallOnSlots: caseActive,
      preCallOffSlots: caseInactive,
    });
  }

  if (new Set(sourceStateDigests).size !== sourceStateDigests.length) fail("v3 source-state keys unexpectedly repeat within the selected receipts");
  if (coverage.selectedPreCallChannelSnapshots !== 565 || sourceStateDigests.length !== 113) fail("selected v3 receipt cardinality changed");
  if (coverage.specialCmpOrRevPreCallChannelSnapshots !== 0 || coverage.compressedWavePreCallChannelSnapshots !== 0 || coverage.startPreCallChannelSnapshots !== 0) fail("unobserved target classes were counted as observed");

  const waveSymbols = symbols.filter((symbol) => symbol.name.startsWith("DirectSoundWaveData_")).sort((left, right) => left.address - right.address);
  if (waveSymbols.length === 0) fail("ELF has no DirectSoundWaveData symbols");
  const targets = [...targetMap.values()]
    .sort((left, right) => left.payloadSha256.localeCompare(right.payloadSha256))
    .map((target) => {
      const asset = staticWaveAsset(elf, waveSymbols, target);
      if (target.preCallLinearSlots > 0 && asset.trailingReadableBytes < 1) {
        fail(`${asset.elfSymbol} lacks the one-byte physical interpolation guard required by its observed linear path`);
      }
      return {
        elfSymbol: asset.elfSymbol,
        header: asset.header,
        payloadBytes: asset.payloadBytes,
        payloadSha256: asset.payloadSha256,
        physicalPayloadBytes: asset.physicalPayloadBytes,
        physicalPayloadSha256: asset.physicalPayloadSha256,
        trailingReadableBytes: asset.trailingReadableBytes,
        trailingReadableSha256: asset.trailingReadableSha256,
        observed: {
          preCallSelectedSlots: target.preCallSelectedSlots,
          preCallOnSlots: target.preCallOnSlots,
          preCallFixedSlots: target.preCallFixedSlots,
          preCallLinearSlots: target.preCallLinearSlots,
          preCallLoopSlots: target.preCallLoopSlots,
          cases: Object.fromEntries(Object.entries(target.cases).sort(([left], [right]) => left.localeCompare(right))),
        },
      };
    });

  const sourceAnchors = SOURCE_ANCHORS.map((anchor) => ({
    id: anchor.id,
    source: anchor.source,
    lines: `${anchor.startLine}-${anchor.endLine}`,
    sha256: sha256(sourceSlice(anchor)),
    anchors: [...anchor.anchors],
  }));
  const elfAnchors = ELF_SYMBOLS.map((name) => {
    const symbol = symbolByName(symbols, name);
    return { symbol: name, bytes: symbol.size, sha256: sha256(romBytes(elf, symbol)) };
  });

  return {
    schema: "factory-m4a-soundmainram-target-audit/v1",
    oracleProfile: "battle-scene-off",
    sourceStateReference: {
      packetSchema: "factory-m4a-source-state-probe/v3",
      digestKey: "sourceSemanticState.stateDigest",
      snapshotBoundary: "m4a-sound-main-call (before the six MPlayMain invocations and SoundMainRAM entry)",
      targetBoundaryRequiredForClosure: "sound-main-ram-entry (after MPlayMain/CgbSound, before the first SoundMainRAM channel pass)",
      freshRunsPerCase: reproducibility.freshRunsPerCase,
      receiptSha256: rawHashes,
      observationCount: sourceStateDigests.length,
    },
    sourceAnchors,
    elfAnchors,
    pointerProducers: POINTER_PRODUCERS,
    sampleReadRules: SAMPLE_READ_RULES,
    observedCoverage: {
      cases: caseRows,
      maxChansValues: [...maxChans].sort((left, right) => left - right),
      pcmSamplesPerVBlankValues: [...pcmSamplesPerVBlank].sort((left, right) => left - right),
      mplayMainTargetValues: [...mplayMainTargets].sort(),
      cgbSoundTargetValues: [...cgbSoundTargets].sort(),
      plynoteTargetValues: [...plynoteTargets].sort(),
      uniqueLogicalTargets: targets.length,
      ...coverage,
      allPreCallLogicalTargetsHaveCompletePayload: coverage.completeSampleRegionPreCallChannelSnapshots === coverage.selectedPreCallChannelSnapshots,
      allPreCallLogicalTargetsHaveStrictCurrentRange: coverage.strictCurrentRangePreCallChannelSnapshots === coverage.selectedPreCallChannelSnapshots,
      allPreCallLogicalTargetsHaveCountRemainingInvariant: coverage.countMatchesRemainingPreCallChannelSnapshots === coverage.selectedPreCallChannelSnapshots,
      allPreCallLogicalTargetsMapToOnePinnedElfWave: targets.length === targetMap.size,
      actualSoundMainRamEntryTargetCoverage: false,
      runtimeTargetProvenanceComplete: false,
    },
    targets,
    closure: {
      closed: "The source branch inventory and the logical target/range proof for all 565 selected direct-channel snapshots at the v3 call boundary are complete. Every retained pre-call snapshot is normal WaveData.type=0 PCM, has a strict current/count relation, and content-matches exactly one pinned ELF WaveData payload; every pre-call linear target has a pinned one-byte ELF guard.",
      notClosed: "The original SoundMainRAM dereference class is not closed at actual mixer entry. v3 snapshots before six MPlayMain invocations, and ply_note can replace a selected SoundChannel.wav between that snapshot and SoundMainRAM. It also normalizes direct target pointers, so a content match cannot prove the physical storage domain or allocation span of the target actually dereferenced.",
      exactMissingRuntimeField: "soundMainRamEntryTargets: Array<{ channelIndex: u8, statusFlags: u8, type: u8, count: u32, currentRelation: { inWaveData: boolean, offset: u32 | null, regionComplete: boolean }, wave: null | { type: u16, status: u16, frequency: u32, loopStart: u32, size: u32, sampleRegion: { requestedBytes: u32, capturedBytes: u32, complete: boolean, sha256: sha256 | null }, directWaveTargetDescriptor: { storageRole: 'gamepak-ws0' | 'gamepak-ws1' | 'gamepak-ws2' | 'ewram' | 'iwram' | 'other-or-unreadable', waveAlignmentMod4: 0 | 1 | 2 | 3, physicalPayloadBytes: u32 | null } } }> captured at sound-main-ram-entry after MPlayMain/CgbSound and before channel 0. Closure accepts an aligned, readable legal storage role plus complete/current-in-range relations; compressed WaveData still requires physicalPayloadBytes because size is decoded sample count.",
      nextAdmissibleStep: "If timing closure remains necessary, add that address-free post-MPlay field to a new receipt revision and repeat this static audit. Do not infer a duration, service cost, or construction-clock operation from the pre-call content match.",
    },
    verdict: "Evidence-only bounded checkpoint. No oracle/probe was run, no duration reducer or production wiring is created, and no case/frame/tick lookup participates in the result.",
  };
}

export function buildAudit(): Record<string, unknown> {
  return makeAudit();
}

function markdown(audit: Record<string, unknown>): string {
  const coverage = audit.observedCoverage as Record<string, unknown>;
  const sourceStateReference = audit.sourceStateReference as Record<string, unknown>;
  const targets = audit.targets as Array<{
    elfSymbol: string;
    payloadBytes: number;
    physicalPayloadBytes: number;
    trailingReadableBytes: number;
    observed: {
      preCallSelectedSlots: number;
      preCallOnSlots: number;
      preCallFixedSlots: number;
      preCallLinearSlots: number;
      preCallLoopSlots: number;
    };
  }>;
  const closure = audit.closure as Record<string, string>;
  const sourceAnchors = audit.sourceAnchors as Array<{ id: string; source: string; lines: string; sha256: string }>;
  const elfAnchors = audit.elfAnchors as Array<{ symbol: string; bytes: number; sha256: string }>;
  return [
    "# Issue #55 — SoundMainRAM sample-target audit v1",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-soundmainram-target-audit-v1.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF only. This hermetic audit consumes the committed v3 source-state receipts plus pinned pret source/ELF; it does not run an oracle or probe.",
    "",
    "## Pre-call v3 coverage",
    "",
    `v3 snapshots at **${sourceStateReference.snapshotBoundary}**. The receipt subsequently records six MPlayMain stages, then SoundMainRAM entry and five channel-pass stages; it does not snapshot the mutable direct-channel targets at that latter boundary.`,
    "",
    `Every retained state pins the compiled routine targets MPlayMain=${JSON.stringify(coverage.mplayMainTargetValues)}, CgbSound=${JSON.stringify(coverage.cgbSoundTargetValues)}, and plynote=${JSON.stringify(coverage.plynoteTargetValues)}. The source inventory therefore follows the standard \`ply_note\` writer, while the command bytes it may consume remain outside this pre-call snapshot proof.`,
    "",
    `All **${coverage.selectedPreCallChannelSnapshots}** selected direct-channel snapshots (${coverage.onPreCallChannelSnapshots} ON, ${coverage.offPreCallChannelSnapshots} OFF) come from **${sourceStateReference.observationCount}** source-state observations. Every snapshot has maxChans=5 and 224 PCM samples per VBlank.`,
    "",
    `Every pre-call logical WaveData target has a complete payload digest, strict current offset, and count = size - currentOffset. The pre-call shapes are ${coverage.fixedPreCallChannelSnapshots} fixed and ${coverage.linearPreCallChannelSnapshots} linear; ${coverage.loopPreCallChannelSnapshots} use the loop branch. No pre-call START, CMP, REV, or compressed WaveData shape occurs.`,
    "",
    "| pinned ELF WaveData | payload bytes | physical bytes after header | tail bytes | pre-call slots | ON | fixed / linear | loop |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...targets.map((target) => `| ${target.elfSymbol} | ${target.payloadBytes} | ${target.physicalPayloadBytes} | ${target.trailingReadableBytes} | ${target.observed.preCallSelectedSlots} | ${target.observed.preCallOnSlots} | ${target.observed.preCallFixedSlots} / ${target.observed.preCallLinearSlots} | ${target.observed.preCallLoopSlots} |`),
    "",
    "For normal linear PCM, SoundMainRAM reads a current/next signed-byte pair. The mapped ELF assets all have at least one physical tail byte after their declared payload, so every pre-call linear target's lookahead is statically covered. Fixed PCM reads only declared payload bytes. Looping rebases from `currentOffset` to `loopStart`; the receipt proves both are in range for every pre-call logical target.",
    "",
    "## Pointer-producing branches",
    "",
    ...POINTER_PRODUCERS.map((entry) => `- \`${entry.id}\` (${entry.source}): ${entry.expression} ${entry.guard}`),
    "",
    "The source inventory includes the START, normal writeback, reverse, and compressed branches so a later receipt cannot accidentally reuse this pre-call normal-PCM conclusion for a different target shape. In particular, compressed `SoundMainRAM_Unk2` reads 33 physical bytes for each decoded 64-sample block; `WaveData.size` is not enough to bound that branch's physical target.",
    "",
    "## Sample read and range rules",
    "",
    ...SAMPLE_READ_RULES.flatMap((rule) => [
      `- \`${rule.id}\` (${rule.source}; ${rule.selector})`,
      `  - Reads: ${rule.reads}`,
      `  - Legal target relation: ${rule.legalRange}`,
      `  - Loop/read extent: ${rule.loopExtent}`,
      `  - Required physical payload: ${rule.requiredPayloadBytes}`,
    ]),
    "",
    "## Closure boundary",
    "",
    closure.closed,
    "",
    closure.notClosed,
    "",
    `**Exact missing runtime field:** ${closure.exactMissingRuntimeField}`,
    "",
    `Next admissible step: ${closure.nextAdmissibleStep}`,
    "",
    "## Drift anchors",
    "",
    "| source slice | SHA-256 |",
    "| --- | --- |",
    ...sourceAnchors.map((anchor) => `| ${anchor.source}:${anchor.lines} (${anchor.id}) | ${anchor.sha256} |`),
    "",
    "| ELF symbol | bytes | SHA-256 |",
    "| --- | ---: | --- |",
    ...elfAnchors.map((anchor) => `| ${anchor.symbol} | ${anchor.bytes} | ${anchor.sha256} |`),
    "",
  ].join("\n");
}

function outputPaths(): { fixturePath: string; docPath: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { fixturePath: DEFAULT_FIXTURE_PATH, docPath: DEFAULT_DOC_PATH };
  if (args.length === 2 && args[0] === "--out-dir") {
    const output = resolve(args[1]!);
    return {
      fixturePath: join(output, "factory-m4a-soundmainram-target-audit-v1.json"),
      docPath: join(output, "issue55-m4a-soundmainram-target-audit-v1.md"),
    };
  }
  fail("usage: factory-m4a-soundmainram-target-audit-v1.ts [--out-dir PATH]");
}

export function main(): void {
  const audit = buildAudit();
  const { fixturePath, docPath } = outputPaths();
  mkdirSync(dirname(fixturePath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(fixturePath, `${JSON.stringify(audit, null, 2)}\n`);
  writeFileSync(docPath, markdown(audit));
  process.stdout.write(`wrote ${fixturePath}\nwrote ${docPath}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
