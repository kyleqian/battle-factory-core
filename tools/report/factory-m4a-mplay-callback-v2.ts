import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type MplayCallbackPath = {
  id: string;
  table: "gMPlayJumpTable" | "gXcmdTable";
  index: number;
  target: string;
  source: string;
  transitiveTargets: readonly string[];
  reads: readonly string[];
  writes: readonly string[];
};

export const MPLAY_JUMP_TARGETS = [
  "ply_fine", "ply_goto", "ply_patt", "ply_pend", "ply_rept", "ply_fine",
  "ply_fine", "ply_fine", "ply_memacc", "ply_prio", "ply_tempo", "ply_keysh",
  "ply_voice", "ply_vol", "ply_pan", "ply_bend", "ply_bendr", "ply_lfos",
  "ply_lfodl", "ply_mod", "ply_modt", "ply_fine", "ply_fine", "ply_tune",
  "ply_fine", "ply_fine", "ply_fine", "ply_port", "ply_xcmd", "ply_endtie",
  "SampleFreqSet", "TrackStop", "FadeOutBody", "TrkVolPitSet", "RealClearChain",
  "SoundMainBTM",
] as const;

export const XCMD_TARGETS = [
  "ply_xxx", "ply_xwave", "ply_xtype", "ply_xxx", "ply_xatta", "ply_xdeca",
  "ply_xsust", "ply_xrele", "ply_xiecv", "ply_xiecl", "ply_xleng", "ply_xswee",
  "ply_xwait", "ply_xcmd_0D",
] as const;

type ReadAudit = {
  source: string;
  transitiveTargets: readonly string[];
  reads: readonly string[];
  writes: readonly string[];
};

const TRACK_CMD = "track.cmdPtr[selector-sized bytes]";
const TRACK_SCALAR = "track scalar fields named by the handler";
const CHANNEL_CHAIN = "track.chan -> channel status/track/previous/next fields";

// These are source-relative expressions, not a memory map.  They summarize
// every load/store in the target's source/ELF body and its indirect callback
// callees.  Keeping one audit per symbol lets duplicate table slots share the
// same source-general proof without copying a state graph into each packet.
const READ_AUDITS: Record<string, ReadAudit> = {
  ply_fine: { source: "m4a_1.s:ply_fine; m4a.c:RealClearChain", transitiveTargets: ["RealClearChain"], reads: ["track.chan", "channel.statusFlags", CHANNEL_CHAIN], writes: ["channel.statusFlags", "channel.track/previous/next", "track.flags"] },
  ply_goto: { source: "m4a_1.s:ply_goto", transitiveTargets: [], reads: ["track.cmdPtr[0..3]", "gMPlayJumpTableTemplate target validation"], writes: ["track.cmdPtr"] },
  ply_patt: { source: "m4a_1.s:ply_patt -> ply_goto", transitiveTargets: ["ply_goto"], reads: ["track.patternStackIndex", "track.cmdPtr", "track.cmdPtr[0..3]"], writes: ["track.patternStack[0..2]", "track.patternStackIndex", "track.cmdPtr"] },
  ply_pend: { source: "m4a_1.s:ply_pend", transitiveTargets: [], reads: ["track.patternStackIndex", "track.patternStack[0..2]"], writes: ["track.patternStackIndex", "track.cmdPtr"] },
  ply_rept: { source: "m4a_1.s:ply_rept -> ply_goto", transitiveTargets: ["ply_goto"], reads: ["track.cmdPtr[0]", "track.repeatCount", "track.cmdPtr[0..3]"], writes: ["track.repeatCount", "track.cmdPtr"] },
  ply_memacc: { source: "m4a.c:ply_memacc -> gMPlayJumpTable[1]", transitiveTargets: ["ply_goto"], reads: ["track.cmdPtr[0..2]", "mplayInfo.memAccArea[index]", "track.cmdPtr[0..3]"], writes: ["mplayInfo.memAccArea[index]", "track.cmdPtr"] },
  ply_prio: { source: "m4a_1.s:ply_prio", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.priority"] },
  ply_tempo: { source: "m4a_1.s:ply_tempo", transitiveTargets: [], reads: ["track.cmdPtr[0]", "mplayInfo.tempoD/tempoI/tempoU"], writes: ["mplayInfo.tempoD/tempoI/tempoU"] },
  ply_keysh: { source: "m4a_1.s:ply_keysh", transitiveTargets: [], reads: ["track.cmdPtr[0]", "track.flags"], writes: ["track.keyShift", "track.flags"] },
  ply_voice: { source: "m4a_1.s:ply_voice", transitiveTargets: [], reads: ["track.cmdPtr[0]", "mplayInfo.toneTable[index].type/wave/attack", "gMPlayJumpTableTemplate target validation"], writes: ["track.tone.type/wave/attack/decay/sustain/release"] },
  ply_vol: { source: "m4a_1.s:ply_vol", transitiveTargets: [], reads: ["track.cmdPtr[0]", "track.flags"], writes: ["track.vol", "track.flags"] },
  ply_pan: { source: "m4a_1.s:ply_pan", transitiveTargets: [], reads: ["track.cmdPtr[0]", "track.flags"], writes: ["track.pan", "track.flags"] },
  ply_bend: { source: "m4a_1.s:ply_bend", transitiveTargets: [], reads: ["track.cmdPtr[0]", "track.flags"], writes: ["track.bend", "track.flags"] },
  ply_bendr: { source: "m4a_1.s:ply_bendr", transitiveTargets: [], reads: ["track.cmdPtr[0]", "track.flags"], writes: ["track.bendRange", "track.flags"] },
  ply_lfos: { source: "m4a_1.s:ply_lfos -> clear_modM", transitiveTargets: ["clear_modM"], reads: ["track.cmdPtr[0]", "track.mod"], writes: ["track.lfoSpeed", "track.modM", "track.flags"] },
  ply_lfodl: { source: "m4a_1.s:ply_lfodl", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.lfoDelay"] },
  ply_mod: { source: "m4a_1.s:ply_mod -> clear_modM", transitiveTargets: ["clear_modM"], reads: ["track.cmdPtr[0]", "track.mod"], writes: ["track.modDepth", "track.modM", "track.flags"] },
  ply_modt: { source: "m4a_1.s:ply_modt", transitiveTargets: [], reads: ["track.cmdPtr[0]", "track.modM", "track.flags"], writes: ["track.modType", "track.flags"] },
  ply_tune: { source: "m4a_1.s:ply_tune", transitiveTargets: [], reads: ["track.cmdPtr[0]", "track.flags"], writes: ["track.tune", "track.flags"] },
  ply_port: { source: "m4a_1.s:ply_port", transitiveTargets: [], reads: ["track.cmdPtr[0]", "audio register selected by track command"], writes: ["audio register selected by track command"] },
  ply_endtie: { source: "m4a_1.s:ply_endtie", transitiveTargets: [], reads: ["track.cmdPtr[0]", "track.chan", "channel.flags/gateTime/key"], writes: ["track.key", "channel.statusFlags"] },
  SampleFreqSet: { source: "m4a.c:SampleFreqSet", transitiveTargets: ["m4aSoundVSyncOn"], reads: ["SOUND_INFO_PTR fields", "gPcmSamplesPerVBlankTable[freq-1]", "VCOUNT", "DMA control registers"], writes: ["SoundInfo frequency/pcm timing", "timer 0", "DMA/timer registers"] },
  TrackStop: { source: "m4a.c:TrackStop; gMPlayJumpTable[34]", transitiveTargets: ["RealClearChain"], reads: ["track.flags", CHANNEL_CHAIN, "SoundInfo.CgbOscOff target"], writes: ["channel.statusFlags/track", "track.chan"] },
  FadeOutBody: { source: "m4a.c:FadeOutBody -> TrackStop", transitiveTargets: ["TrackStop", "RealClearChain"], reads: ["mplayInfo.fadeOI/fadeOC/fadeOV/trackCount/tracks", "track.flags", CHANNEL_CHAIN], writes: ["mplayInfo.fadeOC/fadeOV/fadeOI/status", "track.volX/flags", "channel chain"] },
  TrkVolPitSet: { source: "m4a.c:TrkVolPitSet", transitiveTargets: [], reads: ["track.flags", "track.vol/volX/modT/modM/pan/panX/bend/bendRange/tune/keyShift/keyShiftX/pitX"], writes: ["track.volMR/volML/keyM/pitM/flags"] },
  RealClearChain: { source: "m4a.c:RealClearChain", transitiveTargets: [], reads: ["channel.track", "channel.previous", "channel.next"], writes: ["channel.track/previous/next", "track.chan"] },
  SoundMainBTM: { source: "m4a_1.s:SoundMainBTM", transitiveTargets: [], reads: ["SoundInfo and direct channel scalar state", "audio FIFO/register state"], writes: ["audio FIFO/register state"] },
  ply_xxx: { source: "m4a.c:ply_xxx -> gMPlayJumpTable[0]", transitiveTargets: ["ply_fine", "RealClearChain"], reads: ["gMPlayJumpTable[0] target", "track.chan", "channel chain"], writes: ["channel chain", "track.flags"] },
  ply_xwave: { source: "m4a.c:ply_xwave", transitiveTargets: [], reads: [TRACK_CMD.replace("selector-sized bytes", "0..3")], writes: ["track.tone.wav", "track.cmdPtr"] },
  ply_xtype: { source: "m4a.c:ply_xtype", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.tone.type", "track.cmdPtr"] },
  ply_xatta: { source: "m4a.c:ply_xatta", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.tone.attack", "track.cmdPtr"] },
  ply_xdeca: { source: "m4a.c:ply_xdeca", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.tone.decay", "track.cmdPtr"] },
  ply_xsust: { source: "m4a.c:ply_xsust", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.tone.sustain", "track.cmdPtr"] },
  ply_xrele: { source: "m4a.c:ply_xrele", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.tone.release", "track.cmdPtr"] },
  ply_xiecv: { source: "m4a.c:ply_xiecv", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.pseudoEchoVolume", "track.cmdPtr"] },
  ply_xiecl: { source: "m4a.c:ply_xiecl", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.pseudoEchoLength", "track.cmdPtr"] },
  ply_xleng: { source: "m4a.c:ply_xleng", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.tone.length", "track.cmdPtr"] },
  ply_xswee: { source: "m4a.c:ply_xswee", transitiveTargets: [], reads: ["track.cmdPtr[0]"], writes: ["track.tone.pan_sweep", "track.cmdPtr"] },
  ply_xwait: { source: "m4a.c:ply_xwait", transitiveTargets: [], reads: ["track.cmdPtr[0..1]", "track.timer"], writes: ["track.timer", "track.wait", "track.cmdPtr"] },
  ply_xcmd_0D: { source: "m4a.c:ply_xcmd_0D", transitiveTargets: [], reads: ["track.cmdPtr[0..3]"], writes: ["track.unk_3C", "track.cmdPtr"] },
  ply_xcmd: { source: "m4a.c:ply_xcmd -> gXcmdTable[n]", transitiveTargets: [...XCMD_TARGETS], reads: ["track.cmdPtr[0]", "gXcmdTable[n] target"], writes: ["track.cmdPtr"] },
};

function path(table: MplayCallbackPath["table"], index: number, target: string): MplayCallbackPath {
  const audit = READ_AUDITS[target];
  if (!audit) throw new Error("missing callback audit for " + target);
  return { id: `${table}[${index}]->${target}`, table, index, target, source: audit.source, transitiveTargets: audit.transitiveTargets, reads: audit.reads, writes: audit.writes };
}

export const MPLAY_CALLBACK_PATHS: readonly MplayCallbackPath[] = [
  ...MPLAY_JUMP_TARGETS.map((target, index) => path("gMPlayJumpTable", index, target)),
  ...XCMD_TARGETS.map((target, index) => path("gXcmdTable", index, target)),
];

export const MPLAY_CALLBACK_TABLES = {
  gMPlayJumpTableTemplate: { bytes: 0x90, sha256: "5b7ed978ec28ff48f43439dc8ca03166d48915f9e1bfbec26b23682f14f09c14" },
  gXcmdTable: { bytes: 0x38, sha256: "f3dd8203ce3a7fe85ae8c6df7e0125dfbc1028137e7188d06fc480760c5e5402" },
  gClockTable: { bytes: 0x31, sha256: "952d81c712713fc630d9d622d5f79eec8189f2a4cf05a78442857b635f0d23f8" },
} as const;

export const MPLAY_REMAINING_RESIDUALS = [
  {
    stage: "sixth-MPlayMain",
    source: "reference/pokeemerald/src/m4a_1.s:1130-1466",
    read: "Indirect command and pattern handlers can advance cmdPtr or a pattern-stack target beyond the captured 256/128-byte windows.",
    captured: "Every gMPlayJumpTable/gXcmdTable target reachable in the 113 boundary tables is source/ELF-audited, but arbitrary command bytes and handler control flow remain window-bounded.",
    remainder: "The unbounded command/pattern source window remains residual; this packet closes only callback transitive reads.",
  },
  {
    stage: "SoundMainRAM-channel-passes",
    source: "reference/pokeemerald/src/m4a_1.s:134-445",
    read: "The ARM mixer indexes PCM and WaveData sample bytes using mutable count/fw/current state.",
    captured: "All 12 SoundChannel structs, full readable WaveData sample regions, the complete PCM buffer, DMA roles, and VCOUNT remain in the joined v3 receipt.",
    remainder: "If a malformed/current sample target falls outside its captured WaveData, the target remains incomplete; no such target was observed.",
  },
] as const;

export const SOURCE_REFERENCES = [
  { source: "reference/pokeemerald/src/m4a.c", lines: "692-810,1437-1646", anchors: ["void FadeOutBody", "void TrkVolPitSet", "void ply_memacc", "void ply_xcmd", "void ply_xxx", "void ply_xcmd_0D"] },
  { source: "reference/pokeemerald/src/m4a_tables.c", lines: "6-40,291-307", anchors: ["void *const gMPlayJumpTableTemplate", "const XcmdFunc gXcmdTable", "ply_xcmd_0D"] },
  { source: "reference/pokeemerald/src/m4a_1.s", lines: "1130-1466", anchors: ["MPlayMain:", "call_r3:", "ply_fine", "ply_goto", "ply_endtie"] },
  { source: "reference/pokeemerald/include/gba/m4a_internal.h", lines: "183-221,272-350,387-390", anchors: ["struct MusicPlayerInfo", "struct MusicPlayerTrack", "extern MPlayFunc gMPlayJumpTable[]", "extern const XcmdFunc gXcmdTable[]"] },
  { source: "reference/pokeemerald/constants/m4a_constants.inc", lines: "54-257", anchors: ["o_MusicPlayerTrack_cmdPtr", "o_MusicPlayerTrack_chan", "o_SoundChannel_nextChannelPointer"] },
  { source: "reference/pokeemerald/pokeemerald.map", lines: "sound symbols", anchors: ["gMPlayJumpTableTemplate", "gXcmdTable", "gClockTable"] },
  { source: "reference/pokeemerald/pokeemerald.elf", lines: "defined symbols and sizes", anchors: ["MPlayMain", "ply_xcmd", "ply_xxx", "gMPlayJumpTableTemplate", "gXcmdTable"] },
] as const;

type Region = { requestedBytes: number; capturedBytes: number; complete: boolean; sha256: string | null };
type Component = {
  revision: string;
  dispatchTables: {
    gMPlayJumpTable: { slots: number; targets: string[] };
    gXcmdTable: { slots: number; targets: string[] };
  };
  fixedTables: Record<string, Region>;
  paths: MplayCallbackPath[];
  coverage: { complete: boolean; sourceGeneral: boolean; expectedPathIds: string[]; observedPathIds: string[]; expectedTargetIds: string[]; observedTargetIds: string[] };
};
type CompactPacket = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceStateReference: { packetSchema: string; digestKey: string };
  mplayCallback: { component: Component; componentDigest: string };
  residualDereferences: Array<Record<string, string>>;
  observations: Array<{ sourceStateDigest: string; m4aCost: number }>;
};
type V3Receipt = { schema: string; case: string; oracleProfile: string; interrupts: Array<{ m4a: { state: { sourceSemanticState: { stateDigest: string } }; stages: Array<{ kind: string; cyclesSinceM4aEntry: number }> } }> };
type Repro = { schema: string; oracleProfile: string; freshRunsPerCase: number; cases: Array<{ case: string; firstFreshSha256: string; secondFreshSha256: string; byteIdentical: boolean }> };

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const INPUT_DIR = join(ROOT, "tests/fixtures/factory-m4a-mplay-callback-v2");
const V3_INPUT_DIR = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const REPRO_PATH = join(ROOT, "tests/fixtures/factory-m4a-mplay-callback-repro-v2.json");
const EVIDENCE_PATH = join(ROOT, "tests/fixtures/factory-m4a-mplay-callback-evidence-v2.json");
const DOC_PATH = join(ROOT, "docs/issue55-m4a-mplay-callback-receipt-v2.md");
const CASES = ["anchor", "liliana", "factory-varied"] as const;
const EXPECTED_OBSERVATIONS: Record<(typeof CASES)[number], number> = { anchor: 52, liliana: 31, "factory-varied": 30 };

function fail(message: string): never { throw new Error("factory-m4a-mplay-callback-v2: " + message); }
function readJson<T>(file: string): T { return JSON.parse(readFileSync(file, "utf8")) as T; }
function sha256(value: Buffer | string): string { return createHash("sha256").update(value).digest("hex"); }
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value !== null && typeof value === "object") return "{" + Object.keys(value as Record<string, unknown>).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson((value as Record<string, unknown>)[key])).join(",") + "}";
  return JSON.stringify(value);
}
function walkKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => walkKeys(item, keys));
  else if (value !== null && typeof value === "object") for (const [key, child] of Object.entries(value)) { keys.push(key); walkKeys(child, keys); }
  return keys;
}
function sourceText(path: string): string { return readFileSync(join(ROOT, path), "utf8"); }

export function assertSourceAnchors(): void {
  for (const reference of SOURCE_REFERENCES) {
    if (reference.source.endsWith(".elf")) {
      const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, reference.source)], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      for (const anchor of reference.anchors) if (!symbols.includes(anchor)) fail(reference.source + " lacks " + JSON.stringify(anchor));
    } else {
      const text = sourceText(reference.source);
      for (const anchor of reference.anchors) if (!text.includes(anchor)) fail(reference.source + " lacks " + JSON.stringify(anchor));
    }
  }
  const nm = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const target of new Set([...MPLAY_JUMP_TARGETS, ...XCMD_TARGETS])) if (!new RegExp("\\b" + target + "\\b").test(nm)) fail("ELF lacks callback target " + target);
  for (const [table, expected] of Object.entries(MPLAY_CALLBACK_TABLES)) {
    const size = expected.bytes.toString(16).padStart(8, "0");
    if (!nm.split("\n").some((line) => line.includes(" " + size + " ") && line.endsWith(" " + table))) fail("ELF size for " + table + " is not pinned");
  }
}

export function expectedComponent(): Component {
  const paths = MPLAY_CALLBACK_PATHS.map((entry) => ({ ...entry, transitiveTargets: [...entry.transitiveTargets], reads: [...entry.reads], writes: [...entry.writes] }));
  const expectedPathIds = paths.map((entry) => entry.id);
  const expectedTargetIds = [...MPLAY_JUMP_TARGETS, ...XCMD_TARGETS].map((target, index) => `${index}:${target}`);
  return {
    revision: "factory-m4a-mplay-callback/v1",
    dispatchTables: { gMPlayJumpTable: { slots: MPLAY_JUMP_TARGETS.length, targets: [...MPLAY_JUMP_TARGETS] }, gXcmdTable: { slots: XCMD_TARGETS.length, targets: [...XCMD_TARGETS] } },
    fixedTables: Object.fromEntries(Object.entries(MPLAY_CALLBACK_TABLES).map(([name, table]) => [name, { requestedBytes: table.bytes, capturedBytes: table.bytes, complete: true, sha256: table.sha256 }])),
    paths,
    coverage: { complete: true, sourceGeneral: true, expectedPathIds, observedPathIds: expectedPathIds, expectedTargetIds, observedTargetIds: expectedTargetIds },
  };
}

export function validateComponent(component: Component, digest: string, label = "component"): void {
  const expected = expectedComponent();
  if (component.revision !== expected.revision) fail(label + " revision changed");
  if (sha256(canonicalJson(component)) !== digest) fail(label + " digest mismatch");
  if (canonicalJson(component.dispatchTables) !== canonicalJson(expected.dispatchTables)) fail(label + " dispatch table targets changed");
  if (canonicalJson(component.paths) !== canonicalJson(expected.paths)) fail(label + " callback path/read audit changed");
  if (canonicalJson(component.coverage) !== canonicalJson(expected.coverage)) fail(label + " callback/path coverage is incomplete");
  if (canonicalJson(component.fixedTables) !== canonicalJson(expected.fixedTables)) fail(label + " fixed table sizes/digests changed");
  for (const entry of component.paths) if (!entry.reads.length || !entry.source || !entry.target || !entry.table) fail(label + " has an un-audited callback path");
}

function m4aCost(observation: V3Receipt["interrupts"][number]): number {
  const call = observation.m4a.stages.filter((stage) => stage.kind === "m4a-sound-main-call");
  const returned = observation.m4a.stages.filter((stage) => stage.kind === "m4a-sound-main-return");
  if (call.length !== 1 || returned.length !== 1 || returned[0]!.cyclesSinceM4aEntry <= call[0]!.cyclesSinceM4aEntry) fail("malformed v3 m4a boundary");
  return returned[0]!.cyclesSinceM4aEntry - call[0]!.cyclesSinceM4aEntry;
}

function validateJoin(packet: CompactPacket): void {
  const v3 = readJson<V3Receipt>(join(V3_INPUT_DIR, packet.case + ".json"));
  if (v3.schema !== "factory-m4a-source-state-probe/v3" || v3.case !== packet.case || v3.oracleProfile !== "battle-scene-off") fail(packet.case + " cannot join v3");
  const rows = new Map<string, number>();
  for (const observation of v3.interrupts) {
    const digest = observation.m4a.state.sourceSemanticState.stateDigest;
    if (rows.has(digest)) fail(packet.case + " repeats a v3 state digest");
    rows.set(digest, m4aCost(observation));
  }
  if (rows.size !== packet.observations.length) fail(packet.case + " observation count does not join v3");
  for (const row of packet.observations) if (rows.get(row.sourceStateDigest) !== row.m4aCost) fail(packet.case + " exact stateDigest/cost join failed");
}

export function loadCompactPackets(): CompactPacket[] {
  const expected = expectedComponent();
  return CASES.map((name) => {
    const packet = readJson<CompactPacket>(join(INPUT_DIR, name + ".json"));
    if (packet.schema !== "factory-m4a-mplay-callback-probe/v2" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(name + " packet identity changed");
    if (packet.sourceStateReference.packetSchema !== "factory-m4a-source-state-probe/v3" || packet.sourceStateReference.digestKey !== "sourceSemanticState.stateDigest") fail(name + " is not an additive v3 join");
    if (packet.observations.length !== EXPECTED_OBSERVATIONS[name] || new Set(packet.observations.map((row) => row.sourceStateDigest)).size !== packet.observations.length) fail(name + " observation coverage changed");
    validateComponent(packet.mplayCallback.component, packet.mplayCallback.componentDigest, name);
    if (canonicalJson(packet.residualDereferences) !== canonicalJson(MPLAY_REMAINING_RESIDUALS)) fail(name + " residual count changed");
    for (const key of walkKeys(packet)) if (new Set(["frame", "tick", "cursor", "rngValue", "trainerId", "setIds", "monIndex", "pointer", "address", "absoluteCycle", "durationKey", "caseDuration"]).has(key)) fail(name + " contains forbidden identity key " + key);
    if (canonicalJson(packet.mplayCallback.component.coverage) !== canonicalJson(expected.coverage)) fail(name + " component coverage does not match source manifest");
    validateJoin(packet);
    return packet;
  });
}

export function loadReproducibility(packets: CompactPacket[]): Repro {
  const repro = readJson<Repro>(REPRO_PATH);
  if (repro.schema !== "factory-m4a-mplay-callback-repro/v2" || repro.oracleProfile !== "battle-scene-off" || repro.freshRunsPerCase !== 2 || repro.cases.length !== packets.length) fail("fresh-run contract is not Scene-OFF x2");
  for (const packet of packets) {
    const row = repro.cases.find((candidate) => candidate.case === packet.case);
    const digest = sha256(readFileSync(join(INPUT_DIR, packet.case + ".json")));
    if (!row || !row.byteIdentical || row.firstFreshSha256 !== row.secondFreshSha256 || row.firstFreshSha256 !== digest) fail(packet.case + " is not byte-identical twice-fresh evidence");
  }
  return repro;
}

function makeEvidence(packets: CompactPacket[], reproducibility: Repro): Record<string, unknown> {
  assertSourceAnchors();
  const digests = new Set(packets.map((packet) => packet.mplayCallback.componentDigest));
  if (digests.size !== 1) fail("callback component is not source-general");
  const cases = packets.map((packet) => {
    const costs = packet.observations.map((row) => row.m4aCost);
    return { case: packet.case, observations: packet.observations.length, costs: { min: Math.min(...costs), max: Math.max(...costs), distinct: new Set(costs).size }, capturedStateKeys: new Set(packet.observations.map((row) => row.sourceStateDigest)).size };
  });
  return {
    schema: "factory-m4a-mplay-callback-evidence/v2",
    oracleProfile: "battle-scene-off",
    selectedResidualClass: "sixth-MPlayMain-ply_xcmd-ply_xxx-callback-transitive-reads",
    sourceReferences: SOURCE_REFERENCES,
    sourceStateReference: { packetSchema: "factory-m4a-source-state-probe/v3", digestKey: "sourceSemanticState.stateDigest" },
    callbackComponent: { componentDigest: packets[0]!.mplayCallback.componentDigest, tableSlots: { gMPlayJumpTable: 36, gXcmdTable: 14 }, pathCount: MPLAY_CALLBACK_PATHS.length, sourceGeneral: true },
    reproducibility,
    cases,
    repeatedCompleteStateEquivalence: { freshObservationsPerRun: 113, equalStateEqualCostPairs: 113, differentCostForEqualState: 0, proof: "Two independent fresh Scene-OFF runs per case join all 52/31/30 address-free v3 state digests to identical exact m4a call costs; no cross-state duration reducer is claimed." },
    residualDereferences: MPLAY_REMAINING_RESIDUALS,
    verdict: "Evidence-only checkpoint: all 50 dispatch-table slots and their source/ELF callback transitive read paths are closed for the 113 boundary states; only the unbounded command/pattern window and SoundMainRAM sample-target classes remain.",
  };
}

function makeMarkdown(evidence: Record<string, unknown>): string {
  const cases = evidence.cases as Array<{ case: string; observations: number; costs: { min: number; max: number; distinct: number }; capturedStateKeys: number }>;
  const rows = cases.map((row) => `| ${row.case} | ${row.observations} | ${row.costs.min}-${row.costs.max} (${row.costs.distinct} distinct) | ${row.capturedStateKeys} |`);
  const residuals = evidence.residualDereferences as Array<{ stage: string; remainder: string }>;
  const digest = (evidence.callbackComponent as { componentDigest: string }).componentDigest;
  return [
    "# Issue #55 - sixth-MPlayMain callback/read compact receipt v2", "",
    "Generated by node --experimental-strip-types tools/report/factory-m4a-mplay-callback-v2.ts; do not hand-edit.", "",
    "Battle Scene OFF only. This compact additive packet joins the committed address-free factory-m4a-source-state-v3 receipts by stateDigest and exact m4a call cost. It does not serialize a second v3 state graph.", "",
    "The selected residual is source/ELF-complete: all 36 gMPlayJumpTable slots and all 14 gXcmdTable slots are enumerated, including ply_xcmd and ply_xxx transitive dispatch edges. Each target has a source-relative read/write audit and duplicate slots share the same source-general component.", "",
    `Callback component SHA-256: ${digest}.`, "", "| case | observations | exact m4a cost | v3 state digests |", "| --- | ---: | --- | ---: |", ...rows, "",
    "## Dispatch/path coverage", "", `gMPlayJumpTable: 36 slots; gXcmdTable: 14 slots; callback paths: ${MPLAY_CALLBACK_PATHS.length}; fresh joins: exact 52/31/30 with zero unequal costs.`, "",
    "## Fixed ROM tables", "", "| table | bytes | SHA-256 |", "| --- | ---: | --- |", ...Object.entries(MPLAY_CALLBACK_TABLES).map(([name, table]) => `| ${name} | ${table.bytes} | ${table.sha256} |`), "",
    "## Remaining residuals", "", ...residuals.map((residual) => `- ${residual.stage} - ${residual.remainder}`), "",
    "The callback packet is evidence only; it does not fit a duration reducer, wire the construction clock, or close the command-window or SoundMainRAM classes.", "",
  ].join("\n");
}

export function main(): void {
  const packets = loadCompactPackets();
  const reproducibility = loadReproducibility(packets);
  const evidence = makeEvidence(packets, reproducibility);
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(DOC_PATH, makeMarkdown(evidence));
  process.stdout.write(`wrote ${EVIDENCE_PATH}\nwrote ${DOC_PATH}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
