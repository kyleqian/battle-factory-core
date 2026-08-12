import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makePattEvidence } from "./factory-m4a-patt-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "036123ca07ba3ccdbeb4cb9c22209568880f95f62b69f9798f37ce5b1c413615",
  liliana: "b35b16c3daf3c4ec5e294459bebe35a4667171de5c47cac32df5dbc03f74d7aa",
  "factory-varied": "0aeae1bc6069d8cf8abb1b1d6aee79106a0355b497defb8276abdba33b862fa3",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-voice-v1");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-voice-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-voice-v1.md");
const ROM_BASE = 0x0800_0000;
const VOICE_START = 0x082d_f940;
const VOICE_END = 0x082d_f96e;
const CHK_START = 0x082d_f866;
const CHK_END = 0x082d_f87c;
const VOICEGROUP_START = 0x0869_8c54;
const VOICEGROUP_END = 0x0869_9254;
const THUMB_FETCH_CYCLES = 2;
const PIPELINE_REFILL_CYCLES = 6;
const EWRAM_WORD_PREMIUM_CYCLES = 2;
const ROM_BYTE_TOTAL_CYCLES = 9;
const ROM_WORD_TOTAL_CYCLES = 11;
const SONG_ROLE = /^battle-factory-bgm-track-[1-9]$/;
const SONG_ROLE_BYTES: Readonly<Record<string, number>> = Object.freeze({
  "battle-factory-bgm-track-1": 316, "battle-factory-bgm-track-2": 910,
  "battle-factory-bgm-track-3": 933, "battle-factory-bgm-track-4": 117,
  "battle-factory-bgm-track-5": 1576, "battle-factory-bgm-track-6": 1634,
  "battle-factory-bgm-track-7": 1328, "battle-factory-bgm-track-8": 647,
  "battle-factory-bgm-track-9": 347,
});

type SourcePointer = Readonly<{ role: string; offset: number }>;
export type VoiceCallback = Readonly<{
  trackIndex: number;
  commandPointer: SourcePointer;
  voiceIndex: number;
  toneTable: Readonly<{ role: string; offset: number; bytes: number }>;
  toneEntryOffset: number;
}>;
type Observation = { sourceStateDigest: string; callbackFamilies: string[] | null; voiceCallbacks: VoiceCallback[] | null };
type Packet = { schema: string; case: CaseName; oracleProfile: string; captureBoundary: string; observations: Observation[] };
type PriorRow = { sourceStateDigest: string; case: CaseName; passCount: number; knownComponentsSourceCycles: number; completeMPlaySourceCycles: number | null };

export type VoiceTiming = Readonly<{
  route: "gamepak-tone-entry-fast-accept";
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  ewramWordAccesses: number;
  ewramWordAccessPremiumCycles: number;
  romCommandByteReads: number;
  romCommandBytePremiumCycles: number;
  romToneWordReads: number;
  romToneWordPremiumCycles: number;
  cycles: number;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-voice-v1: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireSourcePointer(value: SourcePointer, label: string): SourcePointer {
  if (!value || !SONG_ROLE.test(value.role) || !Number.isInteger(value.offset) || value.offset < 0) {
    fail(`${label} must be a normalized Battle Factory song offset`);
  }
  if (value.offset >= SONG_ROLE_BYTES[value.role]!) fail(`${label} exceeds its pinned source role`);
  return value;
}

/** Instruction-count the complete observed ply_voice route, including all three chk_adr_r2 calls. */
export function reduceMPlayVoiceTiming(entry: VoiceCallback): VoiceTiming {
  if (!Number.isInteger(entry.trackIndex) || entry.trackIndex < 0 || entry.trackIndex > 9) fail("trackIndex must be 0..9");
  const commandPointer = requireSourcePointer(entry.commandPointer, "commandPointer");
  if (!Number.isInteger(entry.voiceIndex) || entry.voiceIndex < 0 || entry.voiceIndex > 0x7f) fail("voiceIndex must select one of 128 ToneData rows");
  if (entry.toneTable.role !== "voicegroup_b_factory" || entry.toneTable.offset !== 0 || entry.toneTable.bytes !== 1536) {
    fail("toneTable must be the pinned address-free voicegroup_b_factory region");
  }
  if (!Number.isInteger(entry.toneEntryOffset) || entry.toneEntryOffset !== entry.voiceIndex * 12
    || entry.toneEntryOffset < 0 || entry.toneEntryOffset + 12 > entry.toneTable.bytes) {
    fail("toneEntryOffset must select the indexed 12-byte ToneData row");
  }
  if (commandPointer.offset + 1 > SONG_ROLE_BYTES[commandPointer.role]!) fail("command byte exceeds its pinned song role");

  // ply_voice is 23 halfwords. Each of the three GamePak ToneData addresses
  // takes chk_adr_r2's five-halfword high-address fast-accept route.
  const sequentialThumbHalfwords = 23 + 3 * 5;
  const pipelineRefills = 1 + 3 * 3; // final bx plus each BL/taken-bne/bx
  const ewramWordAccesses = 6; // cmdPtr load/store, player tone load, three track stores
  const ewramWordAccessPremiumCycles = ewramWordAccesses * EWRAM_WORD_PREMIUM_CYCLES;
  const romCommandByteReads = 1;
  const romCommandBytePremiumCycles = romCommandByteReads * (ROM_BYTE_TOTAL_CYCLES - THUMB_FETCH_CYCLES);
  const romToneWordReads = 3;
  const romToneWordPremiumCycles = romToneWordReads * (ROM_WORD_TOTAL_CYCLES - THUMB_FETCH_CYCLES);
  const cycles = sequentialThumbHalfwords * THUMB_FETCH_CYCLES
    + pipelineRefills * PIPELINE_REFILL_CYCLES
    + ewramWordAccessPremiumCycles + romCommandBytePremiumCycles + romToneWordPremiumCycles;
  return Object.freeze({
    route: "gamepak-tone-entry-fast-accept", sequentialThumbHalfwords, pipelineRefills,
    ewramWordAccesses, ewramWordAccessPremiumCycles, romCommandByteReads,
    romCommandBytePremiumCycles, romToneWordReads, romToneWordPremiumCycles, cycles,
  });
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const song = readFileSync(join(ROOT, "reference/pokeemerald/sound/songs/midi/mus_b_factory.s"), "utf8");
  for (const anchor of ["ply_voice:", "ldr r3, [r0, o_MusicPlayerInfo_tone]", "ldr r3, [r2, o_ToneData_type]", "ldr r3, [r2, o_ToneData_wav]", "ldr r3, [r2, o_ToneData_attack]"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  for (const anchor of [".equ\tmus_b_factory_grp, voicegroup_b_factory", ".word\tmus_b_factory_grp"]) if (!song.includes(anchor)) fail(`mus_b_factory.s lost ${anchor}`);
  const regions = [
    { role: "ply_voice callback", start: VOICE_START, end: VOICE_END, sha256: "044d0a4560fe47e556e3da12bf7ea87d0dc0188520653647c687b0c04391770e" },
    { role: "transitive chk_adr_r2", start: CHK_START, end: CHK_END, sha256: "dd3e100af89b39dcaacbb89ba15c4f6458c374e4a238d4117c84f918e773d4c1" },
    { role: "voicegroup_b_factory", start: VOICEGROUP_START, end: VOICEGROUP_END, sha256: "e399123576174c85eaace75eeb9584f45ec37d5d6cfc8b1a3fd6774a98241e13" },
  ];
  for (const region of regions) if (sha256(romSlice(region.start, region.end)) !== region.sha256) fail(`${region.role} ELF/ROM bytes changed`);
  return {
    source: [
      { path: "reference/pokeemerald/src/m4a_1.s", lines: "945-967", sha256: sha256(assembly) },
      { path: "reference/pokeemerald/sound/songs/midi/mus_b_factory.s", lines: "3,5935-5951", sha256: sha256(song) },
    ],
    compiledRegions: regions.map((region) => ({ ...region, bytes: region.end - region.start })),
    songRoleBytes: SONG_ROLE_BYTES,
    timingClasses: {
      sequentialRomThumbHalfword: THUMB_FETCH_CYCLES, takenPipelineRefillPremium: PIPELINE_REFILL_CYCLES,
      alignedEwramWordPremium: EWRAM_WORD_PREMIUM_CYCLES, gamepakByteReadTotal: ROM_BYTE_TOTAL_CYCLES,
      alignedGamepakWordReadTotal: ROM_WORD_TOTAL_CYCLES,
    },
  };
}

function loadPacket(name: CaseName): Packet {
  const bytes = readFileSync(join(PACKETS, `${name}.json`));
  if (sha256(bytes) !== PACKET_HASHES[name]) fail(`${name} packet hash changed`);
  const packet = JSON.parse(bytes.toString("utf8")) as Packet;
  if (packet.schema !== "factory-m4a-voice-probe/v1" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(`${name} packet identity changed`);
  if (packet.captureBoundary !== "sixth-MPlayMain-ply_voice-entry" || packet.observations.length !== COUNTS[name]) fail(`${name} boundary/count changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const prior = makePattEvidence() as { rows: PriorRow[] };
  const priorByDigest = new Map(prior.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, { rows: number; onePass: number; zeroPass: number; callbackRows: number; callbacks: number }> = {};
  const callbackTimings: VoiceTiming[] = [];
  const familyCounts: Record<string, number> = {};
  for (const packet of CASES.map(loadPacket)) {
    const summary = { rows: packet.observations.length, onePass: 0, zeroPass: 0, callbackRows: 0, callbacks: 0 };
    for (const observation of packet.observations) {
      const priorRow = priorByDigest.get(observation.sourceStateDigest);
      if (!priorRow || priorRow.case !== packet.case) fail(`${packet.case} row does not join PATT evidence`);
      if (priorRow.passCount === 0) {
        if (observation.callbackFamilies !== null || observation.voiceCallbacks !== null || priorRow.completeMPlaySourceCycles !== 864) fail(`${packet.case} zero-pass row reached ply_voice capture`);
        summary.zeroPass += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 0, voiceCallbackCount: 0, voiceSourceCycles: 0, knownComponentsSourceCycles: 0, completeMPlaySourceCycles: 864 });
        continue;
      }
      summary.onePass += 1;
      if (observation.callbackFamilies === null || observation.voiceCallbacks === null) fail(`${packet.case} one-pass row lacks ply_voice capture`);
      for (const family of observation.callbackFamilies) familyCounts[family] = (familyCounts[family] ?? 0) + 1;
      const timings = observation.voiceCallbacks.map(reduceMPlayVoiceTiming);
      callbackTimings.push(...timings);
      const voiceSourceCycles = timings.reduce((sum, timing) => sum + timing.cycles, 0);
      summary.callbacks += timings.length;
      if (timings.length > 0) summary.callbackRows += 1;
      rows.push({
        sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 1,
        voiceCallbackCount: timings.length, voiceRoutes: timings.map((timing) => timing.route), voiceSourceCycles,
        priorKnownComponentsSourceCycles: priorRow.knownComponentsSourceCycles,
        knownComponentsSourceCycles: priorRow.knownComponentsSourceCycles + voiceSourceCycles,
        completeMPlaySourceCycles: null,
      });
    }
    byCase[packet.case] = summary;
  }
  const onePass = rows.filter((row) => row.passCount === 1);
  const zeroPass = rows.filter((row) => row.passCount === 0);
  const callbackRows = onePass.filter((row) => (row.voiceCallbackCount as number) > 0);
  if (rows.length !== 113 || onePass.length !== 108 || zeroPass.length !== 5 || callbackRows.length !== 2 || callbackTimings.length !== 2) fail("coverage partition changed");
  if (callbackTimings.some((timing) => timing.route !== "gamepak-tone-entry-fast-accept" || timing.cycles !== 182)) fail("observed ply_voice route changed");
  const expectedFamilyCounts = { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 };
  if (JSON.stringify(Object.fromEntries(Object.entries(familyCounts).sort(([a], [b]) => a.localeCompare(b)))) !== JSON.stringify(expectedFamilyCounts)) fail("callback-family selection census changed");
  const familyCycles = onePass.map((row) => row.voiceSourceCycles as number);
  const knownCycles = onePass.map((row) => row.knownComponentsSourceCycles as number);
  return {
    schema: "factory-m4a-voice-evidence/v1", oracleProfile: "battle-scene-off", sourceAndElf,
    capture: { boundary: "ply_voice entry", exactCaller: "MPlayMain._081DD90C jump-table dispatch", runtimeCompiledPc: "0x082df942", state: "track index, normalized command source, voice index, and normalized tone-table/entry offsets", freshRunsPerCase: 2, repeatability: "byte-identical full packet" },
    frozenInputs: { packets: PACKET_HASHES, pattEvidence: "tests/fixtures/factory-m4a-patt-evidence-v1.json" },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: {
      byCase, rowsWithVoiceCallbacks: callbackRows.length, voiceCallbacks: callbackTimings.length,
      callbackFamilySelectionCensus: expectedFamilyCounts,
      callbackRouteCounts: { "gamepak-tone-entry-fast-accept": 2 },
      exactVoiceRowsWithinOnePass: onePass.length, nullVoiceRowsWithinOnePass: 0,
      exactVoiceSourceCycleRange: { min: Math.min(...familyCycles), max: Math.max(...familyCycles), distinct: new Set(familyCycles).size },
      knownComponentSourceCycleRange: { min: Math.min(...knownCycles), max: Math.max(...knownCycles), distinct: new Set(knownCycles).size },
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "Both ply_voice callbacks and zero-callback contribution for every other one-pass row are source-timed from exact normalized entry state.",
      remainingDiscriminator: "MPlayMain command decode/jump-table dispatch plus ply_vol, ply_pan, ply_bend, and note callback families remain unresolved.",
      durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null,
    },
    verdict: "The ply_voice callback family is source-exact for 2/2 callbacks and 108/108 one-pass rows; complete MPlay costs remain 5 exact / 108 null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as {
    byCase: Record<string, { onePass: number; zeroPass: number; callbackRows: number; callbacks: number }>;
    callbackFamilySelectionCensus: Record<string, number>;
    knownComponentSourceCycleRange: { min: number; max: number; distinct: number };
  };
  return [
    "# Issue #55 — sixth-MPlayMain `ply_voice` callback v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-voice-v1.ts`; do not hand-edit.", "",
    "Two fresh serial Battle Scene OFF captures per anchor, LILIANA, and legal-varied epoch were byte-identical. The exact compiled `ply_voice` entry retains only address-free track index, normalized command source, voice index, and normalized `voicegroup_b_factory` table/entry offsets.", "",
    `The pinned callback census remains \`${JSON.stringify(coverage.callbackFamilySelectionCensus)}\`. Anchor track 1 selects voice 87 (tone offset 1044), legal-varied track 4 selects voice 93 (tone offset 1116), and LILIANA selects none. Rows without \`ply_voice\` contribute zero, closing this family for **108/108** one-pass rows.`, "",
    "| case | one pass | zero pass | rows with `ply_voice` | callbacks |", "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => { const row = coverage.byCase[name]!; return `| ${name} | ${row.onePass} | ${row.zeroPass} | ${row.callbackRows} | ${row.callbacks} |`; }), "",
    "Both observations select the same complete route: the 46-byte `ply_voice` body plus three high-address fast-accept passes through the pinned 22-byte `chk_adr_r2` body. The instruction count is 38 WS0 Thumb halfwords, ten refills, six aligned EWRAM word premiums, one 9-cycle GamePak command byte, and three 11-cycle aligned GamePak tone words: **182 cycles per callback**. Any other tone table, malformed song offset, voice range, or tone-entry relation fails closed.", "",
    `Joined with channel gate, wait/LFO, \`ply_pend\`, and \`ply_patt\`, known per-pass components now total **${coverage.knownComponentSourceCycleRange.min}–${coverage.knownComponentSourceCycleRange.max}** cycles (${coverage.knownComponentSourceCycleRange.distinct} totals). Complete MPlay costs remain **5 exact / 108 null** because dispatch and every other live callback/note family remain unresolved. No observed duration, pointer identity, service cost, or clock wiring is used.`, "",
  ].join("\n");
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-voice-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-voice-v1.md") };
  fail("usage: factory-m4a-voice-v1.ts [--out-dir PATH]");
}

export function main(): void {
  const evidence = makeEvidence();
  const output = outputs();
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
  process.stdout.write(`wrote ${output.json}\nwrote ${output.doc}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
