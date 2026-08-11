import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Issue #55 sixth-player MPlayMain source-composition audit.
 *
 * This report is deliberately an additive consumer of the frozen v3 source
 * graph.  It does not replay an oracle, fit a duration, or turn a measured
 * elapsed span into a production cost.  The selector, command-read contract,
 * and post-sixth-player mixer-entry receipts are all joined by their existing
 * address-free source-state digest.
 *
 * The zero-pass path is source-closed: MPlayMain jumps directly to the common
 * post-tempo loop and the frozen OFF receipt has the exact 864-cycle result for
 * all five rows.  One-pass rows receive an exact source-work census, but their
 * cycle result stays null until the post-command mutable Track.flags/chan state
 * needed by the `_081DD9C4` volume/pitch loop is captured.  This is an audit
 * barrier, not a duration approximation.
 */

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const EXPECTED_COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V3_ROOT = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const SELECTOR_ROOT = join(ROOT, "tests/fixtures/factory-m4a-player-selector-v1");
const ENTRY_ROOT = join(ROOT, "tests/fixtures/factory-m4a-soundmainram-entry-targets-v1");
const READ_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-command-read-contract-evidence-v1.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-mplay-execution-evidence-v1.json");

const FROZEN_HASHES = {
  sourceStateV3: {
    anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
    liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
    "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
  },
  selector: {
    anchor: "35fe3e32eb893ef7601cc74a15b1f7b5cdf74675f4c5e9397d71acc60343649d",
    liliana: "4dbb8aba89d6621513deddb94d7b627e19f4a20578090d8ac22a894a0827ef4c",
    "factory-varied": "1e77d4654401096f62f51d4fbe7fdd1e5760491b3cdbf09e252866c1de05cde7",
  },
  commandReadEvidence: "a158fff7201f2650c5177c0c84bb3853bd1355bfb1b947129c15783c78799f28",
  entryTargets: {
    anchor: "6b29d708051e0d4422d8f6527e7bd61ffb6bfa408957c017b89b7f2a3c409e1f",
    liliana: "780e332632da2fd024c032a831710c1b8b609d627132836612958546d87fdcf1",
    "factory-varied": "202f18b6d1877ecac55685e51e4f62ec650e2091cb26912ba362efff2c658ad9",
  },
} as const;

const SOURCE_REFERENCES = [
  {
    source: "reference/pokeemerald/src/m4a_1.s",
    lines: "1130-1466",
    anchors: ["MPlayMain:", "_081DD874:", "_081DD9C4:", "call_r3:"],
    role: "MPlayMain entry, tempo selector, track command loop, and volume/pitch loop",
  },
  {
    source: "reference/pokeemerald/src/m4a.c",
    lines: "692-810,1437-1646",
    anchors: ["void FadeOutBody", "void TrkVolPitSet", "void ply_memacc", "void ply_xcmd", "void ply_xxx"],
    role: "source callback bodies and mutable Track/Channel writes",
  },
  {
    source: "reference/pokeemerald/src/m4a_tables.c",
    lines: "6-40,291-307",
    anchors: ["void *const gMPlayJumpTableTemplate", "const XcmdFunc gXcmdTable"],
    role: "compiled dispatch target tables",
  },
  {
    source: "reference/pokeemerald/include/gba/m4a_internal.h",
    lines: "183-221,272-350",
    anchors: ["struct MusicPlayerInfo", "struct MusicPlayerTrack", "struct SoundChannel"],
    role: "field offsets and mutable state shape",
  },
  {
    source: "reference/pokeemerald/constants/m4a_constants.inc",
    lines: "54-257",
    anchors: ["o_MusicPlayerTrack_cmdPtr", "o_MusicPlayerTrack_chan", "o_SoundChannel_nextChannelPointer"],
    role: "compiled structure offsets used by the assembly path",
  },
] as const;

type Stage = { kind: string; cyclesSinceM4aEntry: number };
type Region = { requestedBytes: number; capturedBytes: number; complete: boolean; sha256: string | null };
type Track = {
  scalarBytes: number[];
  tailBytes: number[];
  channelChain: Array<string | null>;
  commandRegion: Region;
  patternRegions: Region[];
};
type SemanticState = {
  revision: string;
  stateDigest: string;
  musicPlayers: Array<{ scalarBytes: number[]; trackCount: number; tracks: Track[] }>;
};
type V3Observation = { m4a: { state: { sourceSemanticState: SemanticState }; stages: Stage[] } };
type V3Receipt = { schema: string; case: CaseName; oracleProfile: string; interrupts: V3Observation[] };
type SelectorObservation = { sourceStateDigest: string; playerScalar: { playerRole: string; scalarBytes: number[]; normalizedFields: string[] } };
type SelectorReceipt = { schema: string; case: CaseName; oracleProfile: string; observations: SelectorObservation[] };
type ReadRow = { sourceStateDigest: string; trackIndex: number; outcome: "wait" | "fine"; commandCount: number; readCount: number; uniqueReadCount: number; readSetDigest: string };
type ReadEvidence = { schema: string; oracleProfile: string; candidateReads: ReadRow[] };
type Target = {
  channelIndex: number;
  statusFlags: number;
  type: number;
  count: number;
  fw: number;
  frequency: number;
  targetProducingRoute: string;
  currentRelation: { route: string; inWaveData: boolean; offset: number | null; regionComplete: boolean };
  wave: { directWaveTargetDescriptor: { storageRole: string; waveSymbol: string; physicalPayloadBytes: number; requiredGuardBytes: number; availableGuardBytes: number } };
};
type EntryObservation = { sourceStateDigest: string; entryTargetStateDigest: string; soundMainRamEntryTargets: Target[] };
type EntryReceipt = { schema: string; case: CaseName; oracleProfile: string; observations: EntryObservation[] };

function fail(message: string): never {
  throw new Error(`factory-m4a-mplay-execution-v1: ${message}`);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function histogram(values: readonly string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function stage(observation: V3Observation, kind: string): number {
  const values = observation.m4a.stages.filter((candidate) => candidate.kind === kind).map((candidate) => candidate.cyclesSinceM4aEntry);
  if (values.length !== 1) fail(`${kind} expected once, got ${values.length}`);
  return values[0]!;
}

function observedSixthMPlayCycles(observation: V3Observation): number {
  const entries = observation.m4a.stages.filter((candidate) => candidate.kind === "mplay-main-entry").map((candidate) => candidate.cyclesSinceM4aEntry);
  if (entries.length !== 6) fail(`expected six MPlayMain entries, got ${entries.length}`);
  return stage(observation, "sound-main-after-mplay") - entries[5]!;
}

function assertSourceAnchors(): void {
  for (const reference of SOURCE_REFERENCES) {
    const text = readFileSync(join(ROOT, reference.source), "utf8");
    for (const anchor of reference.anchors) if (!text.includes(anchor)) fail(`${reference.source} lost ${anchor}`);
  }
}

function loadFrozenV3(name: CaseName): V3Receipt {
  const path = join(V3_ROOT, `${name}.json`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== FROZEN_HASHES.sourceStateV3[name]) fail(`${name} frozen v3 hash changed`);
  const receipt = JSON.parse(bytes.toString("utf8")) as V3Receipt;
  if (receipt.schema !== "factory-m4a-source-state-probe/v3" || receipt.case !== name || receipt.oracleProfile !== "battle-scene-off") fail(`${name} v3 identity changed`);
  if (receipt.interrupts.length !== EXPECTED_COUNTS[name]) fail(`${name} v3 count changed`);
  return receipt;
}

function loadSelector(name: CaseName): SelectorReceipt {
  const path = join(SELECTOR_ROOT, `${name}.json`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== FROZEN_HASHES.selector[name]) fail(`${name} selector hash changed`);
  const receipt = JSON.parse(bytes.toString("utf8")) as SelectorReceipt;
  if (receipt.schema !== "factory-m4a-player-selector-probe/v1" || receipt.case !== name || receipt.oracleProfile !== "battle-scene-off") fail(`${name} selector identity changed`);
  if (receipt.observations.length !== EXPECTED_COUNTS[name]) fail(`${name} selector count changed`);
  return receipt;
}

function loadEntryTargets(name: CaseName): EntryReceipt {
  const path = join(ENTRY_ROOT, `${name}.json`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== FROZEN_HASHES.entryTargets[name]) fail(`${name} mixer-entry target hash changed`);
  const receipt = JSON.parse(bytes.toString("utf8")) as EntryReceipt;
  if (receipt.schema !== "factory-m4a-soundmainram-entry-targets/v1" || receipt.case !== name || receipt.oracleProfile !== "battle-scene-off") fail(`${name} entry identity changed`);
  if (receipt.observations.length !== EXPECTED_COUNTS[name]) fail(`${name} entry count changed`);
  return receipt;
}

function loadReadEvidence(): ReadEvidence {
  const bytes = readFileSync(READ_EVIDENCE);
  if (sha256(bytes) !== FROZEN_HASHES.commandReadEvidence) fail("frozen command-read evidence hash changed");
  const evidence = JSON.parse(bytes.toString("utf8")) as ReadEvidence;
  if (evidence.schema !== "factory-m4a-command-read-contract-evidence/v1" || evidence.oracleProfile !== "battle-scene-off") fail("command-read evidence identity changed");
  return evidence;
}

function checkedU16(bytes: number[], offset: number, label: string): number {
  if (bytes.length < offset + 2) fail(`${label} is shorter than ${offset + 2} bytes`);
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function checkedMPlayState(state: SemanticState, label: string): { player: SemanticState["musicPlayers"][number]; tracks: Track[] } {
  if (state.revision !== "factory-m4a-source-state/v3") fail(`${label} source revision changed`);
  const player = state.musicPlayers.at(-1);
  if (!player || state.musicPlayers.length !== 6 || player.trackCount !== 10 || player.tracks.length !== 10) fail(`${label} sixth player shape changed`);
  return { player, tracks: player.tracks };
}

function commandRowsByDigest(readEvidence: ReadEvidence): Map<string, ReadRow[]> {
  const rows = new Map<string, ReadRow[]>();
  for (const row of readEvidence.candidateReads) {
    if (!rows.has(row.sourceStateDigest)) rows.set(row.sourceStateDigest, []);
    rows.get(row.sourceStateDigest)!.push(row);
  }
  return rows;
}

function targetRowsByDigest(receipts: readonly EntryReceipt[]): Map<string, EntryObservation> {
  const rows = new Map<string, EntryObservation>();
  for (const receipt of receipts) {
    for (const observation of receipt.observations) {
      if (rows.has(observation.sourceStateDigest)) fail(`duplicate mixer-entry join ${observation.sourceStateDigest}`);
      if (observation.soundMainRamEntryTargets.length !== 5) fail(`${receipt.case} entry target width changed`);
      rows.set(observation.sourceStateDigest, observation);
    }
  }
  return rows;
}

function sourceWork(
  state: SemanticState,
  selector: SelectorObservation,
  reads: readonly ReadRow[],
  entry: EntryObservation,
): Record<string, unknown> {
  const { player, tracks } = checkedMPlayState(state, selector.sourceStateDigest);
  if (selector.playerScalar.playerRole !== "music-player-5" || selector.playerScalar.normalizedFields.join(",") !== "memAccArea") fail(`${selector.sourceStateDigest} selector role changed`);
  if (selector.playerScalar.scalarBytes.length !== 12) fail(`${selector.sourceStateDigest} selector width changed`);

  const tempoI = checkedU16(selector.playerScalar.scalarBytes, 8, "tempoI");
  const tempoC = checkedU16(selector.playerScalar.scalarBytes, 10, "tempoC");
  const onePass = tempoC + tempoI >= 150;
  const activeTracks = tracks.filter((track) => (track.scalarBytes[0]! & 0x80) !== 0);
  const waitingTracks = activeTracks.filter((track) => track.scalarBytes[1]! > 0);
  const commandTracks = activeTracks.filter((track) => track.scalarBytes[1] === 0);
  const expectedReadTracks = tracks
    .map((track, index) => activeTracks.includes(track) && track.scalarBytes[1] === 0 ? index : null)
    .filter((index): index is number => index !== null);
  const actualReadTracks = reads.map((row) => row.trackIndex).sort((a, b) => a - b);
  if (canonical(expectedReadTracks) !== canonical(actualReadTracks)) fail(`${selector.sourceStateDigest} command-read candidate join changed`);
  if (reads.some((row) => row.outcome !== "wait" && row.outcome !== "fine")) fail(`${selector.sourceStateDigest} command-read outcome changed`);

  const targets = entry.soundMainRamEntryTargets;
  const routeCounts: Record<string, number> = {};
  const waveCounts: Record<string, number> = {};
  let activeTargets = 0;
  let completeTargets = 0;
  let replacementTargets = 0;
  for (const target of targets) {
    routeCounts[target.targetProducingRoute] = (routeCounts[target.targetProducingRoute] ?? 0) + 1;
    waveCounts[target.wave.directWaveTargetDescriptor.waveSymbol] = (waveCounts[target.wave.directWaveTargetDescriptor.waveSymbol] ?? 0) + 1;
    if ((target.statusFlags & 0x80) !== 0) activeTargets += 1;
    if (target.currentRelation.inWaveData && target.currentRelation.regionComplete && target.wave.directWaveTargetDescriptor.availableGuardBytes >= target.wave.directWaveTargetDescriptor.requiredGuardBytes) completeTargets += 1;
    if (target.targetProducingRoute !== "pre-mplay-persisted") replacementTargets += 1;
  }

  return {
    playerRole: "music-player-5",
    trackLoop: {
      source: "reference/pokeemerald/src/m4a_1.s:1173-1357 (MPlayMain track loop)",
      trackCount: player.trackCount,
      activeTrackCount: activeTracks.length,
      inactiveTrackCount: player.trackCount - activeTracks.length,
      waitPositiveTrackCount: waitingTracks.length,
      waitZeroTrackCount: commandTracks.length,
      channelChainElements: activeTracks.reduce((sum, track) => sum + track.channelChain.length, 0),
      startFlagCount: activeTracks.filter((track) => (track.scalarBytes[0]! & 0x40) !== 0).length,
    },
    commandPass: {
      receipt: "tests/fixtures/factory-m4a-command-read-contract-evidence-v1.json:candidateReads",
      selected: onePass,
      candidateTrackIndexes: actualReadTracks,
      commandCount: reads.reduce((sum, row) => sum + row.commandCount, 0),
      byteReadCount: reads.reduce((sum, row) => sum + row.readCount, 0),
      uniqueByteReadCount: reads.reduce((sum, row) => sum + row.uniqueReadCount, 0),
      outcomes: histogram(reads.map((row) => row.outcome)),
      bounded: true,
    },
    mixerEntry: {
      receipt: "tests/fixtures/factory-m4a-soundmainram-entry-targets-v1/{case}.json:soundMainRamEntryTargets",
      selectedChannelCount: targets.length,
      activeTargetCount: activeTargets,
      completeTargetCount: completeTargets,
      replacementTargetCount: replacementTargets,
      targetProducingRoutes: Object.fromEntries(Object.entries(routeCounts).sort(([a], [b]) => a.localeCompare(b))),
      waveSymbols: Object.fromEntries(Object.entries(waveCounts).sort(([a], [b]) => a.localeCompare(b))),
    },
  };
}

function reduceRow(
  observation: V3Observation,
  selector: SelectorObservation,
  reads: readonly ReadRow[],
  entry: EntryObservation,
): Record<string, unknown> {
  const state = observation.m4a.state.sourceSemanticState;
  const work = sourceWork(state, selector, reads, entry);
  const selectorBytes = selector.playerScalar.scalarBytes;
  const tempoI = checkedU16(selectorBytes, 8, "tempoI");
  const tempoC = checkedU16(selectorBytes, 10, "tempoC");
  const onePass = tempoC + tempoI >= 150;
  const observedMplayCycles = observedSixthMPlayCycles(observation);
  if (!onePass && observedMplayCycles !== 864) fail(`${selector.sourceStateDigest} zero-pass source result changed from 864`);
  return {
    sourceStateDigest: selector.sourceStateDigest,
    selector: { tempoC, tempoI, relation: onePass ? "tempoC-plus-tempoI-at-least-150" : "tempoC-plus-tempoI-below-150", passCount: onePass ? 1 : 0 },
    sourceWork: work,
    sourceCost: onePass
      ? {
        exact: null,
        class: "one-pass-post-command-state-barrier",
        unpriced: {
          construct: "MPlayMain post-command volume/pitch loop (TrkVolPitSet -> channel chain -> ChnVolSetAsm/MidiKeyToFreq)",
          source: "reference/pokeemerald/src/m4a_1.s:1417-1466; reference/pokeemerald/src/m4a.c:692-810",
          reason: "The frozen v3 state is the sixth-player entry state. Selector/read/entry receipts prove command reads and final mixer targets, but do not capture Track.flags and chan after command callbacks at _081DD9C4.",
          status: "null",
        },
      }
      : {
        exact: {
          class: "zero-pass-common-post-tempo-path",
          sourceCycles: 864,
          receipt: "tests/fixtures/factory-m4a-source-state-v3/{case}.json:m4a.stages[sixth-MPlayMain-entry..sound-main-after-mplay]",
        },
        class: "zero-pass-common-post-tempo-path",
        unpriced: null,
      },
    oracleReference: {
      observedSixthMPlayCycles: observedMplayCycles,
      receipt: "tests/fixtures/factory-m4a-source-state-v3/{case}.json:m4a.stages",
    },
  };
}

export function makeEvidence(): Record<string, unknown> {
  assertSourceAnchors();
  const readEvidence = loadReadEvidence();
  const readRows = commandRowsByDigest(readEvidence);
  const v3 = CASES.map(loadFrozenV3);
  const selectors = CASES.map(loadSelector);
  const entries = CASES.map(loadEntryTargets);
  const selectorsByDigest = new Map<string, SelectorObservation>();
  for (const receipt of selectors) for (const row of receipt.observations) {
    if (selectorsByDigest.has(row.sourceStateDigest)) fail(`duplicate selector join ${row.sourceStateDigest}`);
    selectorsByDigest.set(row.sourceStateDigest, row);
  }
  const targetsByDigest = targetRowsByDigest(entries);
  const rows: Record<string, unknown>[] = [];
  const classCounts: Record<string, number> = {};
  const perCase: Record<string, { observations: number; zeroPass: number; onePass: number; commandRows: number; exactRows: number }> = {};
  for (const receipt of v3) {
    const summary = { observations: receipt.interrupts.length, zeroPass: 0, onePass: 0, commandRows: 0, exactRows: 0 };
    for (const observation of receipt.interrupts) {
      const digest = observation.m4a.state.sourceSemanticState.stateDigest;
      const selector = selectorsByDigest.get(digest);
      const entry = targetsByDigest.get(digest);
      if (!selector || !entry) fail(`${receipt.case} row does not join selector and mixer-entry target receipts`);
      const rowReads = readRows.get(digest) ?? [];
      const row = reduceRow(observation, selector, rowReads, entry);
      const passCount = (row.selector as { passCount: number }).passCount;
      const sourceCost = row.sourceCost as { class: string; exact: unknown };
      summary[passCount === 0 ? "zeroPass" : "onePass"] += 1;
      summary.commandRows += rowReads.length > 0 ? 1 : 0;
      summary.exactRows += sourceCost.exact === null ? 0 : 1;
      classCounts[sourceCost.class] = (classCounts[sourceCost.class] ?? 0) + 1;
      rows.push(row);
    }
    perCase[receipt.case] = summary;
  }
  if (rows.length !== 113 || selectorsByDigest.size !== 113 || targetsByDigest.size !== 113) fail(`expected 113 unique source joins, got ${rows.length}/${selectorsByDigest.size}/${targetsByDigest.size}`);
  if (readEvidence.candidateReads.length !== 100) fail(`expected 100 bounded command-read candidates, got ${readEvidence.candidateReads.length}`);
  return {
    schema: "factory-m4a-mplay-execution-evidence/v1",
    oracleProfile: "battle-scene-off",
    sourceReferences: SOURCE_REFERENCES,
    frozenInputs: {
      sourceStateV3: FROZEN_HASHES.sourceStateV3,
      playerSelectorV1: FROZEN_HASHES.selector,
      commandReadContractV1: FROZEN_HASHES.commandReadEvidence,
      mixerEntryTargetsV1: FROZEN_HASHES.entryTargets,
    },
    join: {
      key: "sourceStateDigest",
      rows: 113,
      selectorRows: 113,
      mixerEntryRows: 113,
      boundedCommandRows: 100,
      ambiguousRows: 0,
      addressFree: true,
    },
    coverage: {
      byCase: perCase,
      classes: Object.fromEntries(Object.entries(classCounts).sort(([a], [b]) => a.localeCompare(b))),
      exactSourceCostRows: 5,
      nullSourceCostRows: 108,
    },
    rows,
    closure: {
      exact: "The five zero-pass rows are source-closed at 864 cycles; all 113 rows have exact selector, bounded command-read, track-loop, and actual mixer-entry target work classes.",
      barrier: "The smallest remaining priceable source construct is the post-command MPlayMain volume/pitch loop. Its source branch depends on mutable Track.flags and chan after callbacks; those post-call fields are not in the frozen entry-state or final-target packets, so one-pass sourceCycles remains null.",
      durationFit: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "Additive source-composition checkpoint: 113/113 address-free joins are exact; 5/5 zero-pass costs are source-closed at 864 cycles; 108 one-pass rows stop at the mechanically checked post-command Track.flags/chan barrier and claim no inferred cost.",
  };
}

function outputPath(): string {
  const args = process.argv.slice(2);
  if (args.length === 0) return OUTPUT;
  if (args.length === 2 && args[0] === "--out-dir") return join(resolve(args[1]!), "factory-m4a-mplay-execution-evidence-v1.json");
  fail("usage: factory-m4a-mplay-execution-v1.ts [--out-dir PATH]");
}

export function main(): void {
  const evidence = makeEvidence();
  const output = outputPath();
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`wrote ${output}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
