import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MPLAY_JUMP_TARGETS, expectedComponent } from "./factory-m4a-mplay-callback-v2.ts";
import { compiledSong, digestPosition, traceMPlayTrackReads, type RegionDigest } from "./factory-m4a-command-read-contract-v1.ts";

type SourcePosition = { role: string; offset: number };
export type CommandDispatch = {
  source: SourcePosition; encoded: number; command: number; runningStatusBefore: number;
  decode: "running-status" | "encoded"; route: "note" | "wait" | "jump-table"; jumpTableIndex: number | null;
};
type CommandRow = { sourceStateDigest: string; trackIndex: number; command: SourcePosition; commandCount: number; readCount: number; readSetDigest: string };
type CommandEvidence = { schema: string; oracleProfile: string; candidateReads: CommandRow[] };
type Track = { scalarBytes: number[]; commandRegion: RegionDigest; patternRegions: RegionDigest[] };
type V3 = { schema: string; case: string; oracleProfile: string; interrupts: Array<{ m4a: { state: { sourceSemanticState: { stateDigest: string; musicPlayers: Array<{ tracks: Track[] }> } } } }> };
type PriorRow = { sourceStateDigest: string; case: string; passCount: number; noteCallbackCount: number; knownComponentsSourceCycles: number; completeMPlaySourceCycles: number | null };
type NoteEvidence = { schema: string; oracleProfile: string; rows: PriorRow[] };
type ExecutionEvidence = { schema: string; oracleProfile: string; rows: Array<{ sourceStateDigest: string; selector: { passCount: number } }> };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const COMMAND_PATH = join(ROOT, "tests/fixtures/factory-m4a-command-read-contract-evidence-v1.json");
const EXECUTION_PATH = join(ROOT, "tests/fixtures/factory-m4a-mplay-execution-evidence-v1.json");
const CALLBACK_PATH = join(ROOT, "tests/fixtures/factory-m4a-mplay-callback-evidence-v2.json");
const NOTE_PATH = join(ROOT, "tests/fixtures/factory-m4a-note-census-evidence-v1.json");
const V3_ROOT = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-dispatch-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-dispatch-v1.md");
const ROM_BASE = 0x0800_0000;
const SONG_STARTS = [0x0895_8848, 0x0895_8984, 0x0895_8d12, 0x0895_90b7, 0x0895_912c, 0x0895_9754, 0x0895_9db6, 0x0895_a2e6, 0x0895_a56d, 0x0895_a6c8] as const;
const HASHES = {
  command: "a158fff7201f2650c5177c0c84bb3853bd1355bfb1b947129c15783c78799f28",
  execution: "81ed2b14a684cb781417a093744ddf5652ef967e9e8c6a117b3e98833af1d9b1",
  callback: "0348b09ff235317d0fa1b3dac76f1a8c16f83a1742ea4add925283c9937deaab",
  note: "a07f443c036dbe54d991f7b98e114903d0ab5ecb461a882560af359a22f74039",
} as const;
const V3_HASHES = {
  anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
  liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
  "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
} as const;
const THUMB_FETCH = 2, REFILL = 6, EWRAM_WORD_PREMIUM = 2, ROM_LITERAL_PREMIUM = 9, ROM_BYTE_PREMIUM = 7;

export type DispatchTiming = Readonly<{
  route: "encoded-wait" | "encoded-note" | "running-status-note" | "encoded-low-jump-table" | "encoded-high-jump-table" | "running-status-jump-table";
  target: string; sequentialThumbHalfwords: number; pipelineRefills: number; alignedEwramWordAccesses: number;
  romLiteralLoads: number; gamepakByteReads: number; cycles: number;
}>;

function fail(message: string): never { throw new Error(`factory-m4a-dispatch-v1: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function json<T>(path: string, hash: string): T {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(`${path} hash changed`);
  return JSON.parse(bytes.toString("utf8")) as T;
}
function sourceByte(position: SourcePosition): number {
  const match = /^battle-factory-bgm-track-([1-9])$/.exec(position.role);
  if (!match) fail("dispatch source is not a normalized Factory song role");
  const index = Number(match[1]) - 1;
  const length = SONG_STARTS[index + 1]! - SONG_STARTS[index]!;
  if (!Number.isInteger(position.offset) || position.offset < 0 || position.offset >= length) fail("dispatch source offset escapes its song role");
  return readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"))[SONG_STARTS[index]! - ROM_BASE + position.offset]!;
}

/** Price `_081DD8E0` command decode through the selected wait store or callback entry. */
export function reduceMPlayDispatchTiming(dispatch: CommandDispatch): DispatchTiming {
  for (const [label, value] of [["encoded", dispatch.encoded], ["command", dispatch.command], ["runningStatusBefore", dispatch.runningStatusBefore]] as const) {
    if (!Number.isInteger(value) || value < 0 || value > 0xff) fail(`${label} must be u8`);
  }
  if (sourceByte(dispatch.source) !== dispatch.encoded) fail("encoded command disagrees with the pinned song");
  if (dispatch.decode === "running-status") {
    if (dispatch.encoded >= 0x80 || dispatch.runningStatusBefore < 0xbd || dispatch.command !== dispatch.runningStatusBefore) fail("invalid running-status decode");
  } else if (dispatch.decode === "encoded") {
    if (dispatch.encoded < 0x80 || dispatch.command !== dispatch.encoded) fail("invalid encoded-command decode");
  } else fail("unknown decode route");

  let route: DispatchTiming["route"], target: string, halfwords: number, refills: number, words: number, literals = 0, bytes = 1;
  if (dispatch.command >= 0xcf) {
    if (dispatch.route !== "note" || dispatch.jumpTableIndex !== null) fail("note route metadata changed");
    route = dispatch.decode === "encoded" ? "encoded-note" : "running-status-note";
    target = "ply_note"; halfwords = dispatch.decode === "encoded" ? 20 : 17; refills = 3; words = dispatch.decode === "encoded" ? 3 : 2;
  } else if (dispatch.command >= 0x80 && dispatch.command <= 0xb0) {
    if (dispatch.decode !== "encoded" || dispatch.route !== "wait" || dispatch.jumpTableIndex !== null) fail("wait route metadata changed");
    route = "encoded-wait"; target = "gClockTable-wait-store"; halfwords = 17; refills = 4; words = 2; literals = 1; bytes = 2;
  } else {
    const index = dispatch.command - 0xb1;
    if (dispatch.route !== "jump-table" || dispatch.jumpTableIndex !== index || index < 0 || index >= 30) fail("jump-table route metadata changed");
    target = MPLAY_JUMP_TARGETS[index]!;
    if (dispatch.decode === "running-status") { route = "running-status-jump-table"; halfwords = 22; refills = 4; words = 3; }
    else if (dispatch.command < 0xbd) { route = "encoded-low-jump-table"; halfwords = 24; refills = 5; words = 4; }
    else { route = "encoded-high-jump-table"; halfwords = 25; refills = 4; words = 4; }
  }
  const cycles = halfwords * THUMB_FETCH + refills * REFILL + words * EWRAM_WORD_PREMIUM + literals * ROM_LITERAL_PREMIUM + bytes * ROM_BYTE_PREMIUM;
  return Object.freeze({ route, target, sequentialThumbHalfwords: halfwords, pipelineRefills: refills,
    alignedEwramWordAccesses: words, romLiteralLoads: literals, gamepakByteReads: bytes, cycles });
}

function compiledSource(): Record<string, unknown> {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of ["_081DD8E0:", "ldrb r1, [r5, o_MusicPlayerTrack_runningStatus]", "ldr r3, [r3, o_SoundInfo_MPlayJumpTable]", "call_r3:"]) if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  const dispatch = rom.subarray(0x082d_fb18 - ROM_BASE, 0x082d_fb70 - ROM_BASE);
  const trampoline = rom.subarray(0x082d_fcb4 - ROM_BASE, 0x082d_fcb6 - ROM_BASE);
  if (sha256(dispatch) !== "fed706a0e27f9805b3162f37c04e68783ac82ea6f01f817cec566d86ef3765e6" || sha256(trampoline) !== "477db9ac7ca5efc12e37f882656b8fe5a363ffeb99b2e565a953d10c3c91ab21") fail("compiled dispatcher bytes changed");
  const component = expectedComponent();
  if (component.dispatchTables.gMPlayJumpTable.slots !== 36 || component.fixedTables.gMPlayJumpTableTemplate.sha256 !== "5b7ed978ec28ff48f43439dc8ca03166d48915f9e1bfbec26b23682f14f09c14") fail("callback jump table changed");
  return { source: "reference/pokeemerald/src/m4a_1.s:1214-1295,1459-1460", compiledRegions: [
    { role: "MPlayMain decode/dispatch", start: "0x082dfb18", endExclusive: "0x082dfb70", bytes: dispatch.length, sha256: sha256(dispatch) },
    { role: "call_r3 trampoline", start: "0x082dfcb4", endExclusive: "0x082dfcb6", bytes: trampoline.length, sha256: sha256(trampoline) },
  ], timingClasses: { sequentialRomThumbHalfword: THUMB_FETCH, takenPipelineRefillPremium: REFILL, alignedEwramWordPremium: EWRAM_WORD_PREMIUM, romLiteralPremium: ROM_LITERAL_PREMIUM, gamepakBytePremium: ROM_BYTE_PREMIUM } };
}
function histogram(values: readonly (string | number)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) out[String(value)] = (out[String(value)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function replayCommandDispatches(committed: CommandEvidence): Map<string, CommandDispatch[]> {
  const { regions, bases, scanBase, scanBytes } = compiledSong();
  const resolvePointer = (encoded: number): SourcePosition | null => {
    for (const region of regions) {
      const base = bases.get(region.role)!;
      if (encoded >= base && encoded < base + region.bytes.length) return { role: region.role, offset: encoded - base };
    }
    return null;
  };
  const committedByKey = new Map(committed.candidateReads.map((row) => [`${row.sourceStateDigest}:${row.trackIndex}`, row]));
  const result = new Map<string, CommandDispatch[]>();
  let candidates = 0;
  for (const name of ["anchor", "liliana", "factory-varied"] as const) {
    const packet = json<V3>(join(V3_ROOT, `${name}.json`), V3_HASHES[name]);
    if (packet.schema !== "factory-m4a-source-state-probe/v3" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(`${name} v3 identity changed`);
    for (const observation of packet.interrupts) {
      const state = observation.m4a.state.sourceSemanticState;
      const player = state.musicPlayers.at(-1);
      if (!player || player.tracks.length !== 10) fail(`${name} sixth-player track shape changed`);
      for (let trackIndex = 0; trackIndex < player.tracks.length; trackIndex += 1) {
        const track = player.tracks[trackIndex]!;
        if ((track.scalarBytes[0]! & 0x80) === 0 || track.scalarBytes[1]! > 0) continue;
        candidates += 1;
        const command = digestPosition(track.commandRegion, 256, regions, bases, scanBase, scanBytes);
        if (!command) fail("command source no longer normalizes");
        const patternStack = track.patternRegions.map((entry) => digestPosition(entry, 128, regions, bases, scanBase, scanBytes));
        const traced = traceMPlayTrackReads({ flags: track.scalarBytes[0]!, wait: 0, patternLevel: track.scalarBytes[2]!, repeatCount: track.scalarBytes[3]!, runningStatus: track.scalarBytes[7]!, command, patternStack }, regions, resolvePointer);
        const prior = committedByKey.get(`${state.stateDigest}:${trackIndex}`);
        if (!prior || prior.command.role !== command.role || prior.command.offset !== command.offset || prior.commandCount !== traced.dispatches.length) fail("committed command-read join changed");
        if (!result.has(state.stateDigest)) result.set(state.stateDigest, []);
        result.get(state.stateDigest)!.push(...traced.dispatches);
      }
    }
  }
  if (candidates !== 100 || committedByKey.size !== 100) fail("command candidate coverage changed");
  return result;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = compiledSource();
  const command = json<CommandEvidence>(COMMAND_PATH, HASHES.command);
  const execution = json<ExecutionEvidence>(EXECUTION_PATH, HASHES.execution);
  const callback = json<any>(CALLBACK_PATH, HASHES.callback);
  const note = json<NoteEvidence>(NOTE_PATH, HASHES.note);
  if (command.schema !== "factory-m4a-command-read-contract-evidence/v1" || execution.schema !== "factory-m4a-mplay-execution-evidence/v1" || note.schema !== "factory-m4a-note-census-evidence/v1" || [command.oracleProfile, execution.oracleProfile, note.oracleProfile, callback.oracleProfile].some((profile) => profile !== "battle-scene-off")) fail("input identity/profile changed");
  if (callback.callbackComponent.tableSlots.gMPlayJumpTable !== 36 || callback.callbackComponent.tableSlots.gXcmdTable !== 14) fail("callback-family table coverage changed");
  const commandByDigest = replayCommandDispatches(command);
  const executionByDigest = new Map(execution.rows.map((row) => [row.sourceStateDigest, row.selector.passCount]));
  const rows: Array<Record<string, unknown>> = [], timings: DispatchTiming[] = [];
  for (const prior of note.rows) {
    if (executionByDigest.get(prior.sourceStateDigest) !== prior.passCount) fail("execution selector join changed");
    const dispatches = prior.passCount === 1 ? (commandByDigest.get(prior.sourceStateDigest) ?? []) : [];
    const rowTimings = dispatches.map(reduceMPlayDispatchTiming);
    if (rowTimings.filter((timing) => timing.target === "ply_note").length !== prior.noteCallbackCount) fail("note-census join changed");
    timings.push(...rowTimings);
    const cycles = rowTimings.reduce((sum, timing) => sum + timing.cycles, 0);
    rows.push({ sourceStateDigest: prior.sourceStateDigest, case: prior.case, passCount: prior.passCount,
      dispatchCount: rowTimings.length, dispatchRoutes: rowTimings.map((timing) => timing.route), dispatchSourceCycles: cycles,
      priorKnownComponentsSourceCycles: prior.passCount === 1 ? prior.knownComponentsSourceCycles : 0,
      knownComponentsSourceCycles: prior.passCount === 1 ? prior.knownComponentsSourceCycles + cycles : 0,
      completeNoteCallbacksSourceCycles: null, completeMPlaySourceCycles: prior.passCount === 0 ? 864 : null });
  }
  const onePass = rows.filter((row) => row.passCount === 1), zeroPass = rows.filter((row) => row.passCount === 0);
  const targets = histogram(timings.map((timing) => timing.target));
  const expectedTargets = { ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16, ply_pan: 13, ply_bend: 4, ply_note: 82, "gClockTable-wait-store": 99 };
  if (rows.length !== 113 || onePass.length !== 108 || zeroPass.length !== 5 || timings.length !== 218 || JSON.stringify(targets) !== JSON.stringify(Object.fromEntries(Object.entries(expectedTargets).sort(([a], [b]) => a.localeCompare(b))))) fail("exact dispatch census changed");
  const known = onePass.map((row) => row.knownComponentsSourceCycles as number);
  const executedTotals = timings.reduce((sum, timing) => ({
    sequentialThumbHalfwords: sum.sequentialThumbHalfwords + timing.sequentialThumbHalfwords,
    pipelineRefills: sum.pipelineRefills + timing.pipelineRefills,
    alignedEwramWordAccesses: sum.alignedEwramWordAccesses + timing.alignedEwramWordAccesses,
    romLiteralLoads: sum.romLiteralLoads + timing.romLiteralLoads,
    gamepakByteReads: sum.gamepakByteReads + timing.gamepakByteReads,
    cycles: sum.cycles + timing.cycles,
  }), { sequentialThumbHalfwords: 0, pipelineRefills: 0, alignedEwramWordAccesses: 0, romLiteralLoads: 0, gamepakByteReads: 0, cycles: 0 });
  return { schema: "factory-m4a-dispatch-evidence/v1", oracleProfile: "battle-scene-off", sourceAndElf,
    frozenInputs: HASHES, join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, commandCandidateRows: command.candidateReads.length, exactDispatchRows: onePass.filter((row) => (row.dispatchCount as number) > 0).length, ambiguousRows: 0, addressFree: true },
    coverage: { dispatches: timings.length, routeCounts: histogram(timings.map((timing) => timing.route)), targetCounts: targets,
      sourceCycleCounts: histogram(timings.map((timing) => timing.cycles)), executedTotals, dispatchSourceCycles: executedTotals.cycles,
      exactDispatchRowsWithinOnePass: 108, nullCompleteNoteRowsWithinOnePass: 108,
      knownComponentSourceCycleRange: { min: Math.min(...known), max: Math.max(...known), distinct: new Set(known).size },
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108 }, executedDispatches: note.rows.filter((row) => row.passCount === 1).flatMap((row) => commandByDigest.get(row.sourceStateDigest) ?? []), rows,
    closure: { closed: "Every executed command decode, running-status selection, wait-table store, and callback jump-table dispatch in all 108 one-pass rows is source-timed through its selected target entry.",
      boundary: "MPlayMain._081DD8E0 through gClockTable wait store or call_r3 target entry; callback bodies and post-callback loop glue are separate components.",
      remainingDiscriminator: "Every post-selection ply_note body, the unobserved keysplit note route, complete note callback cost, post-callback loop glue, later MPlay components, and every complete one-pass MPlay total remain null.",
      durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null },
    verdict: "The observed command decode/running-status/jump-table dispatcher is source-exact for 218/218 executed commands and 108/108 one-pass rows; complete MPlay remains 5 exact / 108 null." };
}

function markdown(evidence: any): string {
  const coverage = evidence.coverage;
  return ["# Issue #55 — sixth-MPlayMain command dispatcher v1", "", "Generated by `node --experimental-strip-types tools/report/factory-m4a-dispatch-v1.ts`; do not hand-edit.", "",
    "This hermetic Battle Scene OFF reducer joins the committed exact execution selector, address-free command reads, complete callback jump-table manifest, callback-family census, and note census by `sourceStateDigest`. It does not replay the oracle or use a runtime pointer, frame, tick, or observed duration.", "",
    `Across all **108/108** one-pass rows, **${coverage.dispatches}/218** executed commands are source-exact: **99** wait stores, **82** note dispatches, and **37** jump-table callbacks. The six decode routes are \`${JSON.stringify(coverage.routeCounts)}\`; their complete source costs are **63, 71, 81, 85, 89, or 93 cycles**, totaling **${coverage.dispatchSourceCycles}** cycles.`, "",
    `The reducer pins the 88-byte \`_081DD8E0.._081DD938\` compiled region, the \`call_r3\` trampoline, the 36-slot IWRAM jump-table template, normalized song offsets/bytes, running-status state, and selected target symbols. The executed total is **${coverage.executedTotals.sequentialThumbHalfwords}** WS0 Thumb halfwords, **${coverage.executedTotals.pipelineRefills}** taken refills, **${coverage.executedTotals.alignedEwramWordAccesses}** aligned EWRAM words, **${coverage.executedTotals.romLiteralLoads}** ROM literals, and **${coverage.executedTotals.gamepakByteReads}** GamePak bytes. Malformed source bytes, running status, route metadata, indices, and targets fail closed.`, "",
    `Joined known components now span **${coverage.knownComponentSourceCycleRange.min}–${coverage.knownComponentSourceCycleRange.max}** cycles (${coverage.knownComponentSourceCycleRange.distinct} totals). Complete MPlay remains **5 exact / 108 null**. Post-selection note bodies, keysplit, complete notes, post-callback loop glue, later components, and every complete one-pass total remain null; no construction-clock wiring lands.`, ""].join("\n");
}
function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (!args.length) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-dispatch-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-dispatch-v1.md") };
  fail("usage: factory-m4a-dispatch-v1.ts [--out-dir PATH]");
}
export function main(): void { const evidence = makeEvidence(); const out = outputs(); mkdirSync(dirname(out.json), { recursive: true }); writeFileSync(out.json, JSON.stringify(evidence, null, 2) + "\n"); writeFileSync(out.doc, markdown(evidence)); process.stdout.write(`wrote ${out.json}\nwrote ${out.doc}\n`); }
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
