import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type CgbCallbackPath = {
  id: string;
  source: string;
  target: string;
  selector: string;
  reads: readonly string[];
  writes: readonly string[];
};

// This manifest is exhaustive for the selected residual class: four
// CgbOscOff switch arms, gCgb3Vol, and all six MidiKeyToCgbFreq key arms.
export const CGB_CALLBACK_PATHS: readonly CgbCallbackPath[] = [
  { id: "cgb-sound.cgb-osc-off.channel-1", source: "m4a.c:1027-1030 switch(ch) case 1", target: "CgbOscOff", selector: "channel-1", reads: [], writes: ["NR12", "NR14"] },
  { id: "cgb-sound.cgb-osc-off.channel-2", source: "m4a.c:1031-1034 switch(ch) case 2", target: "CgbOscOff", selector: "channel-2", reads: [], writes: ["NR22", "NR24"] },
  { id: "cgb-sound.cgb-osc-off.channel-3", source: "m4a.c:1035-1037 switch(ch) case 3", target: "CgbOscOff", selector: "channel-3", reads: [], writes: ["NR30"] },
  { id: "cgb-sound.cgb-osc-off.channel-4-default", source: "m4a.c:1038-1041 switch(ch) default", target: "CgbOscOff", selector: "channel-4-default", reads: [], writes: ["NR42", "NR44"] },
  { id: "cgb-sound.gCgb3Vol.envelope-volume", source: "m4a.c:1209-1212 gCgb3Vol[channels->envelopeVolume]", target: "gCgb3Vol", selector: "envelopeVolume-0..15", reads: ["gCgb3Vol[envelopeVolume]"], writes: ["NR32"] },
  { id: "mplay-main.midi-key-to-cgb-freq.noise-low-key", source: "m4a.c:814-822 chanNum == 4; key <= 20", target: "MidiKeyToCgbFreq", selector: "channel-4-key-0..20", reads: ["gNoiseTable[key]"], writes: [] },
  { id: "mplay-main.midi-key-to-cgb-freq.noise-high-key", source: "m4a.c:814-822 chanNum == 4; 21 <= key <= 80", target: "MidiKeyToCgbFreq", selector: "channel-4-key-21..80", reads: ["gNoiseTable[key - 21]"], writes: [] },
  { id: "mplay-main.midi-key-to-cgb-freq.noise-clamped-key", source: "m4a.c:819-822 chanNum == 4; key > 80", target: "MidiKeyToCgbFreq", selector: "channel-4-key-clamped-59", reads: ["gNoiseTable[59]"], writes: [] },
  { id: "mplay-main.midi-key-to-cgb-freq.tone-low-key", source: "m4a.c:830-834 chanNum != 4; key <= 35", target: "MidiKeyToCgbFreq", selector: "channel-1..3-key-0..35", reads: ["gCgbScaleTable[0]", "gCgbScaleTable[1]", "gCgbFreqTable[...]"], writes: [] },
  { id: "mplay-main.midi-key-to-cgb-freq.tone-normal-key", source: "m4a.c:830-853 chanNum != 4; 36 <= key <= 166", target: "MidiKeyToCgbFreq", selector: "channel-1..3-key-36..166", reads: ["gCgbScaleTable[key]", "gCgbScaleTable[key + 1]", "gCgbFreqTable[...]"], writes: [] },
  { id: "mplay-main.midi-key-to-cgb-freq.tone-clamped-key", source: "m4a.c:838-841 chanNum != 4; key > 166", target: "MidiKeyToCgbFreq", selector: "channel-1..3-key-clamped-130", reads: ["gCgbScaleTable[130]", "gCgbScaleTable[131]", "gCgbFreqTable[...]"], writes: [] },
];

export const CGB_CALLBACK_TABLES = {
  gCgb3Vol: { bytes: 0x10, sha256: "86480498f3bc57863a295f2c9a9752be09fd91cb28c998650fa2b7ae3bdefd24" },
  gCgbScaleTable: { bytes: 0x84, sha256: "2ab14116232b5768777f67dd371a380bd88fdc97858aa050306b132d05faa03e" },
  gCgbFreqTable: { bytes: 0x18, sha256: "34e0ae7c2f912add79c2e61ed8347ff085000bc39f0173883ccbaff150205ee5" },
  gNoiseTable: { bytes: 0x3c, sha256: "197f0679262884d48dd459dcfe690c0a41e8a73cf76cb62838119fc9cb0e7ab6" },
} as const;

export const CGB_CALLBACK_RESIDUALS = [
  {
    stage: "sixth-MPlayMain",
    source: "reference/pokeemerald/src/m4a_1.s:1130-1466",
    read: "Indirect command and pattern handlers can advance cmdPtr or a pattern-stack target beyond the captured 256/128-byte windows.",
    captured: "Current command bytes, all three pattern-stack windows, complete track/player scalar state, and dispatch target symbols.",
    remainder: "The full handler-dependent command/control-flow read set is not statically bounded by this packet.",
  },
  {
    stage: "sixth-MPlayMain",
    source: "reference/pokeemerald/src/m4a.c:1500-1534",
    read: "ply_xcmd/ply_xxx and gXcmdTable/gMPlayJumpTable callbacks may dereference callback-specific state.",
    captured: "Dispatch table target symbols and the callback-visible player/track/channel graph.",
    remainder: "Transitive callback reads are not instruction-traced into a complete memory-read set.",
  },
  {
    stage: "SoundMainRAM-channel-passes",
    source: "reference/pokeemerald/src/m4a_1.s:134-445",
    read: "The ARM mixer indexes PCM and WaveData sample bytes using mutable count/fw/current state.",
    captured: "All 12 SoundChannel structs, full readable WaveData sample regions, the complete 3168-byte PCM buffer, DMA source/destination roles, and VCOUNT.",
    remainder: "If a malformed/current sample target falls outside its captured WaveData, the target is reported as incomplete; no such target was observed in this packet.",
  },
] as const;

export const SOURCE_REFERENCES = [
  { source: "reference/pokeemerald/src/m4a.c", lines: "810-874,925-1231", anchors: ["u32 MidiKeyToCgbFreq", "void CgbOscOff", "void CgbSound", "gCgb3Vol[channels->envelopeVolume]"] },
  { source: "reference/pokeemerald/src/m4a_tables.c", lines: "118-165", anchors: ["const u8 gCgbScaleTable[]", "const s16 gCgbFreqTable[]", "const u8 gNoiseTable[]", "const u8 gCgb3Vol[]"] },
  { source: "reference/pokeemerald/src/m4a_1.s", lines: "1130-1466", anchors: ["MPlayMain:", "o_SoundInfo_MidiKeyToCgbFreq", "call_r3:"] },
  { source: "reference/pokeemerald/include/gba/m4a_internal.h", lines: "272-350,398-400", anchors: ["struct MusicPlayerTrack", "struct CgbChannel", "extern const u8 gCgbScaleTable[]"] },
  { source: "reference/pokeemerald/constants/m4a_constants.inc", lines: "54-257", anchors: ["o_SoundInfo_CgbOscOff", "o_SoundInfo_MidiKeyToCgbFreq", "o_CgbChannel_envelopeVolume"] },
  { source: "reference/pokeemerald/pokeemerald.map", lines: "sound symbols", anchors: ["gCgbScaleTable", "gCgbFreqTable", "gNoiseTable", "gCgb3Vol"] },
  { source: "reference/pokeemerald/pokeemerald.elf", lines: "defined symbols and sizes", anchors: ["CgbOscOff", "MidiKeyToCgbFreq", "CgbSound", "gCgbScaleTable", "gCgbFreqTable", "gNoiseTable", "gCgb3Vol"] },
] as const;

type Region = { requestedBytes: number; capturedBytes: number; complete: boolean; sha256: string | null };
type ComponentPath = Omit<CgbCallbackPath, "source">;
type Component = {
  revision: string;
  dispatchTargets: Record<string, string | null>;
  readRegions: Record<string, Region>;
  paths: ComponentPath[];
  coverage: { complete: boolean; expectedPathIds: string[]; observedPathIds: string[]; sourceGeneral: boolean };
};
type CompactPacket = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceStateReference: { packetSchema: string; digestKey: string };
  cgbCallback: { component: Component; componentDigest: string };
  residualDereferences: Array<Record<string, string>>;
  observations: Array<{ sourceStateDigest: string; m4aCost: number }>;
};
type V3Receipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  interrupts: Array<{
    m4a: {
      state: { sourceSemanticState: { stateDigest: string } };
      stages: Array<{ kind: string; cyclesSinceM4aEntry: number }>;
    };
  }>;
};
type Repro = {
  schema: string;
  oracleProfile: string;
  freshRunsPerCase: number;
  cases: Array<{ case: string; firstFreshSha256: string; secondFreshSha256: string; byteIdentical: boolean }>;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const INPUT_DIR = join(ROOT, "tests/fixtures/factory-m4a-cgb-callback-v2");
const V3_INPUT_DIR = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const REPRO_PATH = join(ROOT, "tests/fixtures/factory-m4a-cgb-callback-repro-v2.json");
const EVIDENCE_PATH = join(ROOT, "tests/fixtures/factory-m4a-cgb-callback-evidence-v2.json");
const DOC_PATH = join(ROOT, "docs/issue55-m4a-cgb-callback-receipt-v2.md");
const CASES = ["anchor", "liliana", "factory-varied"] as const;
const EXPECTED_OBSERVATIONS: Record<(typeof CASES)[number], number> = { anchor: 52, liliana: 31, "factory-varied": 30 };

function fail(message: string): never {
  throw new Error("factory-m4a-cgb-callback-v2: " + message);
}
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value !== null && typeof value === "object") {
    return "{" + Object.keys(value as Record<string, unknown>).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson((value as Record<string, unknown>)[key])).join(",") + "}";
  }
  return JSON.stringify(value);
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
function sourceText(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

export function assertSourceAnchors(): void {
  for (const reference of SOURCE_REFERENCES) {
    if (reference.source.endsWith(".elf")) {
      const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, reference.source)], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      for (const anchor of reference.anchors) if (!symbols.includes(anchor)) fail(reference.source + " lacks " + JSON.stringify(anchor));
    } else {
      const source = sourceText(reference.source);
      for (const anchor of reference.anchors) if (!source.includes(anchor)) fail(reference.source + " lacks " + JSON.stringify(anchor));
    }
  }
  const nm = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const [symbol, expected] of Object.entries(CGB_CALLBACK_TABLES)) {
    const expectedSize = expected.bytes.toString(16).padStart(8, "0");
    if (!new RegExp("\\b" + symbol + "\\b").test(nm) || !nm.split("\n").some((line) => line.includes(" " + expectedSize + " ") && line.endsWith(" " + symbol))) {
      fail("ELF size for " + symbol + " is not pinned");
    }
  }
}

function validateComponent(component: Component, digest: string, label: string): void {
  if (component.revision !== "factory-m4a-cgb-callback/v1") fail(label + " has wrong component revision");
  if (sha256(canonicalJson(component)) !== digest) fail(label + " has invalid component digest");
  if (component.dispatchTargets.cgbOscOff !== "CgbOscOff" || component.dispatchTargets.midiKeyToCgbFreq !== "MidiKeyToCgbFreq") {
    fail(label + " callback target symbols changed");
  }
  const expectedIds = CGB_CALLBACK_PATHS.map((path) => path.id);
  if (!component.coverage.complete || !component.coverage.sourceGeneral || component.coverage.expectedPathIds.join("\0") !== expectedIds.join("\0") || component.coverage.observedPathIds.join("\0") !== expectedIds.join("\0")) {
    fail(label + " does not cover every selected callback path");
  }
  const expectedPaths = CGB_CALLBACK_PATHS.map(({ source: _source, ...path }) => path);
  if (canonicalJson(component.paths) !== canonicalJson(expectedPaths)) fail(label + " callback path roles changed");
  for (const [name, expected] of Object.entries(CGB_CALLBACK_TABLES)) {
    const region = component.readRegions[name];
    if (!region || region.requestedBytes !== expected.bytes || region.capturedBytes !== expected.bytes || !region.complete || region.sha256 !== expected.sha256) {
      fail(label + " " + name + " table digest or size changed");
    }
  }
}

function m4aCost(observation: V3Receipt["interrupts"][number]): number {
  const call = observation.m4a.stages.filter((stage) => stage.kind === "m4a-sound-main-call");
  const returned = observation.m4a.stages.filter((stage) => stage.kind === "m4a-sound-main-return");
  if (call.length !== 1 || returned.length !== 1 || returned[0]!.cyclesSinceM4aEntry <= call[0]!.cyclesSinceM4aEntry) fail("v3 m4a boundary is malformed");
  return returned[0]!.cyclesSinceM4aEntry - call[0]!.cyclesSinceM4aEntry;
}

function validateV3Join(packet: CompactPacket): void {
  const v3 = readJson<V3Receipt>(join(V3_INPUT_DIR, packet.case + ".json"));
  if (v3.schema !== "factory-m4a-source-state-probe/v3" || v3.case !== packet.case || v3.oracleProfile !== "battle-scene-off") {
    fail(packet.case + " cannot join its existing v3 receipt");
  }
  const v3Rows = new Map<string, number>();
  for (const observation of v3.interrupts) {
    const digest = observation.m4a.state.sourceSemanticState.stateDigest;
    if (v3Rows.has(digest)) fail(packet.case + " v3 receipt repeats a source-state digest");
    v3Rows.set(digest, m4aCost(observation));
  }
  if (v3Rows.size !== packet.observations.length) fail(packet.case + " compact/v3 observation count differs");
  for (const [index, observation] of packet.observations.entries()) {
    if (!/^[0-9a-f]{64}$/.test(observation.sourceStateDigest) || !Number.isInteger(observation.m4aCost) || observation.m4aCost <= 0) {
      fail(packet.case + " compact observation " + index + " is malformed");
    }
    if (v3Rows.get(observation.sourceStateDigest) !== observation.m4aCost) {
      fail(packet.case + " compact observation " + index + " does not exactly join v3 by state digest and cost");
    }
  }
}

export function loadCompactPackets(): CompactPacket[] {
  return CASES.map((name) => {
    const packet = readJson<CompactPacket>(join(INPUT_DIR, name + ".json"));
    if (packet.schema !== "factory-m4a-cgb-callback-probe/v2" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") {
      fail(name + " has wrong compact packet identity");
    }
    if (packet.sourceStateReference.packetSchema !== "factory-m4a-source-state-probe/v3" || packet.sourceStateReference.digestKey !== "sourceSemanticState.stateDigest") {
      fail(name + " no longer references the pre-existing v3 state receipt");
    }
    if (packet.observations.length !== EXPECTED_OBSERVATIONS[name] || new Set(packet.observations.map((row) => row.sourceStateDigest)).size !== packet.observations.length) {
      fail(name + " loses accepted observation/state coverage");
    }
    validateComponent(packet.cgbCallback.component, packet.cgbCallback.componentDigest, name);
    if (canonicalJson(packet.residualDereferences) !== canonicalJson(CGB_CALLBACK_RESIDUALS)) fail(name + " residual classes changed");
    const forbidden = new Set(["frame", "tick", "cursor", "rngValue", "trainerId", "setIds", "monIndex", "pointer", "address", "absoluteCycle", "durationKey"]);
    for (const key of walkKeys(packet)) if (forbidden.has(key)) fail(name + " contains forbidden identity key " + key);
    validateV3Join(packet);
    return packet;
  });
}

export function loadReproducibility(packets: CompactPacket[]): Repro {
  const repro = readJson<Repro>(REPRO_PATH);
  if (repro.schema !== "factory-m4a-cgb-callback-repro/v2" || repro.oracleProfile !== "battle-scene-off" || repro.freshRunsPerCase !== 2 || repro.cases.length !== packets.length) {
    fail("fresh-run reproducibility contract is not v2 Scene-OFF x2");
  }
  for (const packet of packets) {
    const row = repro.cases.find((candidate) => candidate.case === packet.case);
    const digest = sha256(readFileSync(join(INPUT_DIR, packet.case + ".json")));
    if (!row || !row.byteIdentical || row.firstFreshSha256 !== row.secondFreshSha256 || row.firstFreshSha256 !== digest) {
      fail(packet.case + " compact packet is not byte-identical twice-fresh evidence");
    }
  }
  return repro;
}

function makeEvidence(packets: CompactPacket[], reproducibility: Repro): Record<string, unknown> {
  assertSourceAnchors();
  const componentDigests = new Set(packets.map((packet) => packet.cgbCallback.componentDigest));
  if (componentDigests.size !== 1) fail("source-general callback component digest differs across cases");
  const observations = packets.flatMap((packet) => packet.observations);
  const cases = packets.map((packet) => {
    const costs = packet.observations.map((row) => row.m4aCost);
    return {
      case: packet.case,
      observations: packet.observations.length,
      costs: { min: Math.min(...costs), max: Math.max(...costs), distinct: new Set(costs).size },
      capturedStateKeys: new Set(packet.observations.map((row) => row.sourceStateDigest)).size,
      repeatedCapturedStateKeys: 0,
    };
  });
  return {
    schema: "factory-m4a-cgb-callback-evidence/v2",
    oracleProfile: "battle-scene-off",
    selectedResidualClass: "CgbSound-callbacks",
    sourceReferences: SOURCE_REFERENCES,
    sourceStateReference: { packetSchema: "factory-m4a-source-state-probe/v3", digestKey: "sourceSemanticState.stateDigest" },
    callbackComponent: {
      componentDigest: packets[0]!.cgbCallback.componentDigest,
      paths: CGB_CALLBACK_PATHS,
      tables: CGB_CALLBACK_TABLES,
      sourceGeneral: true,
    },
    reproducibility,
    cases,
    repeatedCompleteStateEquivalence: {
      freshObservationsPerRun: observations.length,
      equalStateEqualCostPairs: observations.length,
      differentCostForEqualState: 0,
      proof: "Every compact source-state digest and exact m4a cost repeats in an independently fresh Scene-OFF packet; no cross-state duration reducer is claimed.",
    },
    residualDereferences: CGB_CALLBACK_RESIDUALS,
    verdict: "Evidence-only checkpoint: the CgbSound callback/table dereference class is source/ELF-complete and twice-fresh equal-state costs are exact; the three other residual classes remain explicit and no audio cost reducer is licensed.",
  };
}

function makeMarkdown(evidence: Record<string, unknown>): string {
  const rows = (evidence.cases as Array<{ case: string; observations: number; costs: { min: number; max: number; distinct: number }; capturedStateKeys: number }>)
    .map((row) => "| " + row.case + " | " + row.observations + " | " + row.costs.min + "-" + row.costs.max + " (" + row.costs.distinct + " distinct) | " + row.capturedStateKeys + " |");
  const tables = Object.entries(CGB_CALLBACK_TABLES)
    .map(([name, table]) => "| " + name + " | " + table.bytes + " | " + table.sha256 + " |");
  const residuals = evidence.residualDereferences as Array<{ stage: string; remainder: string }>;
  const componentDigest = (evidence.callbackComponent as { componentDigest: string }).componentDigest;
  return [
    "# Issue #55 - m4a CGB callback/read compact receipt v2", "",
    "Generated by node --experimental-strip-types tools/report/factory-m4a-cgb-callback-v2.ts; do not hand-edit.", "",
    "Battle Scene OFF only. This is a compact additive sibling of the committed v3 source-state receipts. Each packet contains a v3 source-state digest and exact m4a call cost, not another serialized normalized m4a graph.", "",
    "The selected CgbSound callback/table class is source/ELF-complete: four CgbOscOff switch arms, the gCgb3Vol envelope table, and all six MidiKeyToCgbFreq key-range arms. The static component is checked at every m4a boundary and emitted once per packet; two fresh runs per case repeat every compact state/cost pair. This is an evidence checkpoint, not a duration reducer.", "",
    "Source-general callback component SHA-256: " + componentDigest + ".", "",
    "| case | observations | exact m4a cost | v3 state digests |", "| --- | ---: | --- | ---: |", ...rows, "",
    "## Fixed table coverage", "",
    "| table | bytes | SHA-256 |", "| --- | ---: | --- |", ...tables, "",
    "## Exact v3 join", "",
    "Every compact observation joins its existing committed factory-m4a-source-state-v3 receipt by the address-free sourceSemanticState.stateDigest, and the joined m4aSoundMain call/return cost must match exactly. No v3 state graph is copied into this additive packet.", "",
    "## Remaining residuals", "",
    ...residuals.map((residual) => "- " + residual.stage + " - " + residual.remainder), "",
    "The other three residual classes remain open; no aggregate m4a cost table or construction-clock wiring follows from this receipt.", "",
  ].join("\n");
}

export function main(): void {
  const packets = loadCompactPackets();
  const reproducibility = loadReproducibility(packets);
  const evidence = makeEvidence(packets, reproducibility);
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(DOC_PATH, makeMarkdown(evidence));
  process.stdout.write("wrote " + EVIDENCE_PATH + "\nwrote " + DOC_PATH + "\n");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
