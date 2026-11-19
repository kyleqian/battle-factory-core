// Noland's battle-room scenes, the engine side (docs/parity-mac/noland-room-scenes.md).
//
//   node --experimental-strip-types tools/integration/nolandSceneEngine.ts ROM.json OUT.json [--frames N] [--dump DIR] [--from F]
//
// ROM.json is a tools/audio/romNolandScene.py recording. The engine is staged at the same point: the open GO ON / RECORD / REST / RETIRE menu
// before the Factory Head (the round's six wins resolved, the save's record of the recording, the RNG cursor of the ROM's checkpoint), then
// ticked with the recording's presses, frame for frame. For every frame the engine's picture hash, RNG cursor, sounds and input gates (would a
// one-frame A / B press change the picture within K frames?) are compared with the ROM's.
import "../compare/harnessPlayerName.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { join } from "node:path";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import { createInitialState, render, tick, type EngineState } from "../../src/engine/core.ts";
import type { GbaButton } from "../../src/input.ts";
import type { FactoryRentalRecord } from "../../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { getLevel50InitialRentalFixedIv } from "../../src/engine/factoryRentalGeneration.ts";
import {
  advanceFactoryRoundPresentation,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  preGenerateFactoryRoundNextOpponent,
  type FactoryRoundBattleOrchestratorState,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { advanceRoundController, completeBattlePresentation, resolveRoundBattle } from "../../src/engine/roundController.ts";
import {
  CALL_SCENE_HEAD_MENU_READY_DELAY,
  CALL_SCENE_TRAILING_DELAY,
  createPostwinState,
  POSTWIN_NEXT_BOX_CLEAR_DELAY,
} from "../../src/engine/postwin.ts";
import { collectSoundTick, type SoundEvent } from "../../src/audio/soundEvents.ts";
import { frontierTransitionPresentationForTableIndex } from "../../src/engine/battleTransition.ts";
import { BRAIN_BATTLE_TRANSITION_START_ELAPSED } from "../../src/engine/battleRoom.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

interface RomRow {
  f: number;
  sha: string;
  rng: number;
  draws?: number | null;
  press?: string[];
  gate?: [number, number];
  adv?: [number, number];
  sounds?: { frame: number; kind: string; id: number | null; name?: string | null; pan: number | null; player?: string; via?: string }[];
  where?: string;
  cb2?: string;
}

export interface RomRecording {
  challenge: number;
  playerSetIds?: number[];
  scene: "on" | "off";
  gateK: number;
  win: boolean;
  recordStart: { symbols: 0 | 1 | 2; heardBrainSpeech: { silver: number; gold: number } };
  rngStart: number;
  frames: RomRow[];
}

function record(setId: number, fixedIv: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv, abilitySlot: (personality & 1) as 0 | 1, otId: PLAYER_TRAINER_ID };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

/** One generated win through the public controller interfaces (tools/compare/factoryRoundIntroGeneralizationStage.ts advanceProofWin). */
function advanceWin(state: FactoryRoundBattleOrchestratorState): FactoryRoundBattleOrchestratorState {
  const start = state.round.presentation?.command;
  if (start?.type !== "battleStart") throw new Error("stage: no pending battle start");
  let round = advanceRoundController(completeBattlePresentation(state.round, { commandId: start.commandId }));
  round = resolveRoundBattle(round, {
    outcome: "win",
    playerParty: round.rules.playerParty,
    opponentParty: round.rules.currentOpponent.party,
    rngValue: round.rules.rngValue,
  });
  let next: FactoryRoundBattleOrchestratorState = {
    ...state,
    round,
    battle: null,
    battleCommandPresentation: null,
    battleResolutionPresentation: null,
    activeBattleCallStart: null,
  };
  next = preGenerateFactoryRoundNextOpponent(next);
  const won = next.round.presentation?.command;
  if (won?.type !== "battleWon") throw new Error("stage: no battleWon");
  next = advanceFactoryRoundPresentation(completeFactoryRoundPresentation(next, { commandId: won.commandId }));
  const offer = next.round.presentation?.command;
  if (offer?.type !== "swapOffer") throw new Error("stage: no swapOffer");
  next = chooseFactoryRoundSwap(completeFactoryRoundPresentation(next, { commandId: offer.commandId }), { type: "decline" });
  const resolved = next.round.presentation?.command;
  if (resolved?.type !== "swapResolved") throw new Error("stage: no swapResolved");
  return advanceFactoryRoundPresentation(completeFactoryRoundPresentation(next, { commandId: resolved.commandId }));
}

/**
 * The GO ON menu before the Factory Head: the round's six wins resolved (the seventh battle's swap offer pending, so the NO the player gives
 * resolves it as in play), postwin parked at the open AskReadyForHead menu (generatedRoundBattle7NolandPostwinAskReadyMenuOpenStage's fields).
 */
export function nolandAskReadyStage(rom: RomRecording): EngineState {
  const c = rom.challenge;
  const fixedIv = getLevel50InitialRentalFixedIv(c, false);
  const sets = rom.playerSetIds ?? [267, 268, 269];
  const player = [record(sets[0]!, fixedIv), record(sets[1]!, fixedIv), record(sets[2]!, fixedIv)] as const;
  const heard = rom.recordStart.heardBrainSpeech;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: `noland-scene-c${c}`,
    rngValue: rom.rngStart,
    factoryWinStreak: c * 7,
    factorySymbolsCount: rom.recordStart.symbols,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: c * 7,
    facilityState: { rentsCount: 0, heardBrainSpeech: { silver: heard.silver === 1, gold: heard.gold === 1 } },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: player,
      savedRentalRecords: [...player, record(270, fixedIv), record(271, fixedIv), record(272, fixedIv)],
    },
  });
  for (let i = 0; i < 5; i += 1) orchestrator = advanceWin(orchestrator);
  // The sixth win: stop at the swap offer (the AskSwapBeforeHead NO resolves it, core.ts dialoguePage 4).
  {
    const start = orchestrator.round.presentation?.command;
    if (start?.type !== "battleStart") throw new Error("stage: no sixth battle");
    let round = advanceRoundController(completeBattlePresentation(orchestrator.round, { commandId: start.commandId }));
    round = resolveRoundBattle(round, {
      outcome: "win",
      playerParty: round.rules.playerParty,
      opponentParty: round.rules.currentOpponent.party,
      rngValue: round.rules.rngValue,
    });
    orchestrator = preGenerateFactoryRoundNextOpponent({
      ...orchestrator,
      round,
      battle: null,
      battleCommandPresentation: null,
      battleResolutionPresentation: null,
      activeBattleCallStart: null,
    });
    const won = orchestrator.round.presentation?.command;
    if (won?.type !== "battleWon") throw new Error("stage: no sixth battleWon");
    orchestrator = advanceFactoryRoundPresentation(completeFactoryRoundPresentation(orchestrator, { commandId: won.commandId }));
  }
  const base = createInitialState({ battleScene: rom.scene });
  return {
    ...base,
    factoryRoundBattleOrchestrator: orchestrator,
    prebattleRoom: null,
    postwin: {
      ...createPostwinState(),
      elapsed: POSTWIN_NEXT_BOX_CLEAR_DELAY + CALL_SCENE_TRAILING_DELAY + CALL_SCENE_HEAD_MENU_READY_DELAY + 50,
      frontierBrain: true,
      healDismissElapsed: 0,
      callScenePage: 5,
      callSceneDismissElapsed: 0,
      continuationCursorPos: 0,
      continuationCursorDisplayPos: 0,
    },
    rngMode: "vblank",
    rngValue: rom.rngStart >>> 0,
  };
}

function rgbSha(rgba: Uint8Array): { sha: string; rgb: Buffer } {
  const rgb = Buffer.alloc((rgba.length / 4) * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i]!;
    rgb[j + 1] = rgba[i + 1]!;
    rgb[j + 2] = rgba[i + 2]!;
  }
  return { sha: createHash("sha256").update(rgb).digest("hex").slice(0, 16), rgb };
}

const NONE: ReadonlySet<GbaButton> = new Set();

function lcgDistance(a: number, b: number, limit = 20000): number | null {
  for (let n = 0; n <= limit; n += 1) {
    if (a === b) return n;
    a = (Math.imul(a, 0x41c64e6d) + 0x6073) >>> 0;
  }
  return null;
}

export interface EngineRow {
  f: number;
  sha: string;
  rng: number;
  draws: number | null;
  /** [A, B]: does a one-frame press now change the scene state one tick later (the ROM's `adv`)? */
  adv: [number, number];
  press?: string[];
  /** A ROM press the engine did not take on its frame: pressed again here, this many frames late. */
  late?: number;
  sounds: SoundEvent[];
  where: string;
}

/** The scene-owning sub-states (everything a press can act on outside the battle kernel), for the press test. */
function sceneKey(s: EngineState): string {
  const o = s.factoryRoundBattleOrchestrator;
  return JSON.stringify([
    s.battleRoom, s.prebattleRoom, s.postwin, s.factorySwap, s.factoryTerminal, s.lobbyAttendant, s.lobbyFreeRoam, s.summaryScreen, s.battleScene,
    o?.round.presentation?.command ?? null, o?.battleStartIntro ?? null, o?.battleCommandPresentation ?? null, o?.battleResolutionPresentation ?? null,
  ]);
}

function pressAdvances(state: EngineState, button: GbaButton, base: string): boolean {
  return sceneKey(tick(state, new Set([button]))) !== base;
}

/** What the engine is showing, for the report: the owning sub-state and its phase. */
function whereOf(s: EngineState): string {
  if (s.battleRoom) return `battleRoom:${s.battleRoom.phase}:${s.battleRoom.elapsed}${s.battleRoom.speechLine !== undefined ? `:line${s.battleRoom.speechLine}:${s.battleRoom.speechMode}` : ""}`;
  if (s.prebattleRoom) return `prebattleRoom:${s.prebattleRoom.phase}:${s.prebattleRoom.elapsed}`;
  if (s.postwin) return `postwin:${s.postwin.elapsed}`;
  if (s.factoryTerminal) return "factoryTerminal";
  if (s.lobbyFreeRoam) return "lobby";
  const o = s.factoryRoundBattleOrchestrator;
  if (o?.battleResolutionPresentation) return "battle";
  if (o?.round.presentation?.command) return `round:${o.round.presentation.command.type}`;
  return "other";
}

/**
 * The ROM's battle transition (GetSpecialBattleTransition's Random() % 12, battle_setup.c:885): its draw is the last of the frame the battle
 * BGM starts. The engine draws the Head's transition from its own gameplay stream (scheduledBrainOpponent), not the room's per-frame
 * cursor, so the frame compare of the transition itself gives the engine the ROM's (`engineTransition` in the report keeps the engine's).
 */
export function romTransitionTableIndex(rom: RomRecording): number | null {
  const start = rom.frames.find((r) => (r.sounds ?? []).some((e) => e.kind === "bgm" && e.id === 471));
  return start === undefined ? null : ((start.rng >>> 16) % 12);
}

export const engineTransitions: { tableIndex: number; name: string }[] = [];
/** The ROM's pause from the box gone to the battle start (Noland's party build) and the engine's, when both reached it. */
export const pauses: { rom: number | null; engine: number } = { rom: null, engine: BRAIN_BATTLE_TRANSITION_START_ELAPSED };

export function romBattleBgmFrame(rom: RomRecording): number | null {
  return rom.frames.find((r) => (r.sounds ?? []).some((e) => e.kind === "bgm" && e.id === 471))?.f ?? null;
}

export function driveEngine(rom: RomRecording, frames: number, gates: boolean, dump?: { dir: string; from: number; to: number }): EngineRow[] {
  let state = nolandAskReadyStage(rom);
  const romTransition = romTransitionTableIndex(rom);
  engineTransitions.length = 0;
  const romBgm = romBattleBgmFrame(rom);
  pauses.rom = null;
  let settledFrom: number | null = null;
  const rows: EngineRow[] = [];
  let prevRng = state.rngValue;
  let pending: { button: GbaButton; since: number } | null = null;
  for (let f = 1; f <= frames; f += 1) {
    const romRow = rom.frames[f];
    if (romRow === undefined) break;
    const wantsTest = gates && (romRow.adv !== undefined || romRow.press !== undefined || pending !== null);
    let adv: [number, number] = [0, 0];
    if (wantsTest) {
      const base = sceneKey(tick(state, NONE));
      adv = [Number(pressAdvances(state, "A", base)), Number(pressAdvances(state, "B", base))];
    }
    let press: GbaButton[] = [];
    let late: number | undefined;
    const romPress = (romRow.press ?? []) as GbaButton[];
    if (romPress.length > 0) {
      const b = romPress[0]!;
      // A press the scene cannot take (DOWN on a menu, or no test) is replayed as is.
      if (!gates || b === "DOWN" || b === "UP" || adv[b === "B" ? 1 : 0] === 1) press = romPress;
      else pending = { button: b, since: f };
    } else if (pending !== null && adv[pending.button === "B" ? 1 : 0] === 1) {
      press = [pending.button];
      late = f - pending.since;
      pending = null;
    }
    const buttons: ReadonlySet<GbaButton> = new Set(press);
    const ticked = collectSoundTick(state.frame + 1, () => tick(state, buttons));
    state = ticked.result;
    // The pause before the battle transition is the ROM's party build (it varies with Noland's team); the frames after it are compared with
    // the engine's transition started on the ROM's frame (`pauses` keeps both).
    if (state.battleRoom?.phase === "brainSpeechSettled") {
      if (settledFrom === null) {
        settledFrom = f;
        if (romBgm !== null) pauses.rom = romBgm - f;
      }
      if (pauses.rom !== null) {
        const elapsed = Math.max(0, f - settledFrom - (pauses.rom - BRAIN_BATTLE_TRANSITION_START_ELAPSED));
        if (elapsed !== state.battleRoom.elapsed) state = { ...state, battleRoom: { ...state.battleRoom, elapsed } };
      }
    }
    const room = state.battleRoom;
    if (room?.frontierBrainWalkup && room.transitionPresentation !== undefined && romTransition !== null
      && room.transitionPresentation.tableIndex !== romTransition) {
      engineTransitions.push({ tableIndex: room.transitionPresentation.tableIndex, name: room.transitionPresentation.transitionName });
      state = { ...state, battleRoom: { ...room, transitionPresentation: frontierTransitionPresentationForTableIndex(romTransition) } };
    } else if (room?.frontierBrainWalkup && room.transitionPresentation !== undefined && engineTransitions.length === 0) {
      engineTransitions.push({ tableIndex: room.transitionPresentation.tableIndex, name: room.transitionPresentation.transitionName });
    }
    const { sha, rgb } = rgbSha(render(state));
    if (dump !== undefined && f >= dump.from && f <= dump.to) writeFileSync(join(dump.dir, `e${f}.rgb`), rgb);
    rows.push({
      f, sha, rng: state.rngValue >>> 0, draws: lcgDistance(prevRng >>> 0, state.rngValue >>> 0), adv,
      ...(press.length ? { press } : {}), ...(late !== undefined ? { late } : {}), sounds: [...ticked.events], where: whereOf(state),
    });
    prevRng = state.rngValue;
  }
  return rows;
}

const SE_PLAYER_BY_VIA: Record<string, string> = { PlaySE12WithPanning: "SE12", PlaySE1WithPanning: "SE1", PlaySE2WithPanning: "SE2" };

/** kind:id@player; the ROM log names a panned SE's player by its caller (soundEventProbe `via`), the engine by `player`. */
function soundKey(e: { kind: string; id: number | null; pan?: number | null; player?: string; via?: string }): string {
  const player = e.player ?? (e.kind === "se" && e.via !== undefined ? SE_PLAYER_BY_VIA[e.via] : undefined);
  return `${e.kind}:${e.id}${player ? `@${player}` : ""}`;
}

export interface SceneCompare {
  sha: number[];
  adv: number[];
  draws: { f: number; rom: number | null; engine: number | null; where: string }[];
  sounds: { f: number; rom: string[]; engine: string[] }[];
}

/** Frame-by-frame differences between a ROM recording and the engine's rows, frames `from`..`through`. */
export function compareScene(rom: RomRecording, rows: readonly EngineRow[], from = 1, through = Infinity): SceneCompare {
  const out: SceneCompare = { sha: [], adv: [], draws: [], sounds: [] };
  for (const e of rows) {
    if (e.f < from || e.f > through) continue;
    const r = rom.frames[e.f]!;
    if (r.sha !== e.sha) out.sha.push(e.f);
    if (r.adv !== undefined && (r.adv[0] !== e.adv[0] || r.adv[1] !== e.adv[1])) out.adv.push(e.f);
    if (r.draws !== e.draws) out.draws.push({ f: e.f, rom: r.draws ?? null, engine: e.draws, where: e.where });
    const rs = [...new Set((r.sounds ?? []).map(soundKey))].sort();
    const es = [...new Set(e.sounds.map(soundKey))].sort();
    if (rs.join() !== es.join()) out.sounds.push({ f: e.f, rom: rs, engine: es });
  }
  return out;
}

/** A recording kept as a test fixture: what the compare reads, sounds as {kind, id, player}, the RNG value only on the battle start's frame. */
export interface SceneFixture {
  name: string;
  note: string;
  /** The last frame the recording is compared through (the frames after it depend on what the engine does not model; the note says what). */
  through: number;
  /** The battle intro's "would like to battle!" prompt, when the recording reaches it: the ROM's press frame and its A / B gate. */
  prompt?: { f: number; adv: [number, number] };
  recording: RomRecording;
}

export function writeSceneFixture(rom: RomRecording, path: string, name: string, note: string, through: number): void {
  const bgm = romBattleBgmFrame(rom);
  const frames = rom.frames.slice(0, through + 1).map((r) => ({
    f: r.f, sha: r.sha, draws: r.draws ?? null,
    ...(r.press ? { press: r.press } : {}), ...(r.adv ? { adv: r.adv } : {}),
    ...(r.sounds?.length ? { sounds: r.sounds.map((e) => ({ kind: e.kind, id: e.id, ...(soundKey(e).includes("@") ? { player: soundKey(e).split("@")[1] } : {}) })) } : {}),
    ...(r.f === bgm ? { rng: r.rng } : {}),
  }));
  const recording = { challenge: rom.challenge, scene: rom.scene, gateK: rom.gateK, win: rom.win, playerSetIds: rom.playerSetIds, recordStart: rom.recordStart,
    rngStart: rom.rngStart, frames };
  const next = rom.frames[through + 1];
  const prompt = next?.press !== undefined && next.adv !== undefined ? { f: next.f, adv: next.adv } : undefined;
  if (prompt !== undefined) frames.push({ f: next!.f, sha: next!.sha, draws: next!.draws ?? null, press: next!.press, adv: next!.adv });
  writeFileSync(path, gzipSync(JSON.stringify({ name, note, through, ...(prompt ? { prompt } : {}), recording })));
}

export function loadSceneFixture(path: string | URL): SceneFixture {
  const fixture = JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")) as SceneFixture;
  fixture.recording.frames.forEach((r) => { if (r.rng === undefined) (r as { rng: number }).rng = 0; });
  return fixture;
}

/** Spans of consecutive frames where `bad(f)` holds. */
function spans(fs: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const f of fs) {
    const last = out[out.length - 1];
    if (last && last[1] === f - 1) last[1] = f;
    else out.push([f, f]);
  }
  return out;
}

function main(): void {
  const [romPath, outPath, ...rest] = process.argv.slice(2);
  if (!romPath || !outPath) throw new Error("usage: nolandSceneEngine.ts ROM.json OUT.json [--frames N] [--dump DIR --from F --to T] [--no-gates]");
  const opt = (name: string): string | undefined => {
    const i = rest.indexOf(name);
    return i === -1 ? undefined : rest[i + 1];
  };
  const rom = JSON.parse(readFileSync(romPath, "utf8")) as RomRecording;
  const fixtureOut = opt("--fixture");
  if (fixtureOut !== undefined) {
    writeSceneFixture(rom, fixtureOut, opt("--name") ?? "", opt("--note") ?? "", Number(opt("--through")));
    console.log(`wrote ${fixtureOut}`);
    return;
  }
  const frames = Number(opt("--frames") ?? rom.frames.length - 1);
  const dumpDir = opt("--dump");
  if (dumpDir) mkdirSync(dumpDir, { recursive: true });
  const dump = dumpDir ? { dir: dumpDir, from: Number(opt("--from") ?? 0), to: Number(opt("--to") ?? frames) } : undefined;
  const rows = driveEngine(rom, frames, !rest.includes("--no-gates"), dump);
  const shaBad: number[] = [];
  const rngBad: number[] = [];
  const drawsBad: { f: number; rom: number | null; engine: number | null; where: string }[] = [];
  const gateBad: number[] = [];
  const soundBad: { f: number; rom: string[]; engine: string[] }[] = [];
  for (const e of rows) {
    const r = rom.frames[e.f]!;
    if (r.sha !== e.sha) shaBad.push(e.f);
    if (r.rng !== e.rng) rngBad.push(e.f);
    if (r.draws !== e.draws) drawsBad.push({ f: e.f, rom: r.draws ?? null, engine: e.draws, where: e.where });
    if (r.adv !== undefined && (r.adv[0] !== e.adv[0] || r.adv[1] !== e.adv[1])) gateBad.push(e.f);
    const rs = [...new Set((r.sounds ?? []).map(soundKey))].sort();
    const es = [...new Set(e.sounds.map(soundKey))].sort();
    if (rs.join() !== es.join()) soundBad.push({ f: e.f, rom: rs, engine: es });
  }
  const summary = {
    frames: rows.length,
    shaMismatch: shaBad.length,
    shaSpans: spans(shaBad).slice(0, 60),
    rngMismatch: rngBad.length,
    drawsMismatch: drawsBad.length,
    drawsFirst: drawsBad.slice(0, 40),
    rngFirst: rngBad.slice(0, 10).map((f) => ({ f, rom: rom.frames[f]!.rng, romDraws: rom.frames[f]!.draws, engine: rows[f - 1]!.rng, engineDraws: rows[f - 1]!.draws, where: rows[f - 1]!.where })),
    gateMismatch: gateBad.length,
    gateSpans: spans(gateBad).slice(0, 60).map(([a, b]) => ({ from: a, to: b, rom: rom.frames[a]!.adv, engine: rows[a - 1]!.adv, where: rows[a - 1]!.where })),
    late: rows.filter((r) => r.late !== undefined).map((r) => ({ f: r.f, late: r.late, where: r.where })),
    soundMismatch: soundBad.slice(0, 40),
    romTransition: romTransitionTableIndex(rom),
    engineTransition: engineTransitions[0] ?? null,
    pause: { ...pauses },
  };
  writeFileSync(outPath, JSON.stringify({ summary, engine: rows.map((r) => ({ ...r, sounds: r.sounds.map(soundKey) })) }));
  console.log(`transition rom ${summary.romTransition} engine ${JSON.stringify(summary.engineTransition)} pause rom ${summary.pause.rom} engine ${summary.pause.engine}`);
  console.log(`frames ${summary.frames} sha-mismatch ${summary.shaMismatch} draws-mismatch ${summary.drawsMismatch} rng-mismatch ${summary.rngMismatch} gate-mismatch ${summary.gateMismatch} sound-mismatch ${soundBad.length} late ${JSON.stringify(summary.late)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
