// S11 aud241b: the effectiveness SEs, the faint cry and SE_FAINT, and the player's low-HP loop of the Factory singles battle path.
// Write-only presentation (src/audio/soundEvents.ts): reads the resolution presentation, never changes it. docs/aud241b-battle-sounds.md.
import {
  handleLowHpMusicChange,
  playFaintCry,
  playPannedSe,
  scheduleAfter,
  SE_EFFECTIVE,
  SE_FAINT,
  SE_NOT_EFFECTIVE,
  SE_PAN_OPPONENT,
  SE_PAN_PLAYER,
  SE_SUPER_EFFECTIVE,
} from "./screenSounds.ts";
import { factoryBattleBgm } from "./battleStartSounds.ts";
import { animSoundPan2, emitSound } from "../audio/soundEvents.ts";
import { battleResolutionCommandDuration, currentCommandField, liveMoveSourceAge, moveBodyExtraRows, presentedMoveDurationOnSoundClock } from "./battleResolutionPresentationRender.ts";
import type { BattleKernelSemanticEvent } from "./battleDecisionBoundary.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import { FUTURE_SIGHT_HIT_COMMAND_FRAMES } from "./battleResolutionPresentation.ts";
import type {
  BattleResolutionPresentationCommand,
  BattleResolutionPresentationState,
  BattleResolutionSegment,
} from "./battleResolutionPresentation.ts";

/** Ticks the Scene ON oracle trails the engine's presentation clock for the controller-side sounds (the same lag in every window). */
const SCENE_ON_LAG = 7;
const EXPLOSION_USER_FAINT_EXTRA_ROWS = 2;
const EXPLOSION_FAMILY_MOVE_IDS: ReadonlySet<number> = new Set([120, 153]);
/** CRY_MODE_FAINT cry pan (battle_gfx_sfx_util.c: -25 player / +25 opponent). */
const FAINT_CRY_PAN_PLAYER = -25;
const FAINT_CRY_PAN_OPPONENT = 25;
/** `playfaintcry; pause B_WAIT_TIME_LONG; dofaintanimation`: the cry starts this many rows before the SE_FAINT. */
const FAINT_CRY_BEFORE_SE = 66;
/** Ticks from the faint command's first tick to the cry (relative to `leadFrames - 66`) and to SE_FAINT (relative to `leadFrames`). */
const FAINT_SOUND_OFFSET = 2;
/** HealthbarDone's HandleLowHpMusicChange runs one tick after the hp command's end; the SetMonData (datahpupdate) one later. */
const HEALTHBAR_DONE_AFTER_HP_END = 1;
const SET_MON_DATA_AFTER_HEALTHBAR_DONE = 1;
/**
 * BattleScript_DamagingWeatherLoop runs `effectivenesssound; hitanimation BS_ATTACKER` (battle_scripts_1.s:3212): PlayerHandlePlaySE pans by the side of
 * gActiveBattler = gBattlerTarget, which DoFieldEndTurnEffects (battle_util.c:1186-1191) has set to the first present battler (the player), so both ticks pan to the player.
 */
const DAMAGING_WEATHER_LOOP_SCRIPT = "BattleScript_DamagingWeatherLoop";
/**
 * etp2 (ROM labs etp1-hail-{on,off}, aud252 fixture): after the damage print's `waitmessage` the ROM runs orword, effectivenesssound, hitanimation; the SE is the row
 * before the hit (ON 988 / 1136, OFF 514 / 662). Our hit command starts 3 rows earlier than the ROM's hitanimation row (986 / 1134, OFF 512 / 660), so the SE is
 * 3 ticks after our command start tick (the etp1Engine frame + 2) in both scenes, not the controller lag (ON 7 less the lead rows, which put it 4-6 rows late once the etp1 print leads moved the loop).
 */
const WEATHER_LOOP_HIT_SE_AFTER_COMMAND_ROWS = 3;
/** fpl1 (ssm1): the Scene ON self-confusion hit command starts 3 rows before the ROM's hitanimation, its effectivenesssound one row before it. */
const SELF_CONFUSION_HIT_SE_AFTER_COMMAND_ROWS = 2;

function currentCommand(
  resolution: BattleResolutionPresentationState | null,
): Readonly<{ command: BattleResolutionPresentationCommand; segment: BattleResolutionSegment; elapsed: number }> | null {
  if (resolution === null || resolution.lifecycle.phase !== "presenting") return null;
  const segment = resolution.segments[resolution.segmentIndex];
  const command = segment?.commands[resolution.commandIndex];
  return segment === undefined || command === undefined ? null : { command, segment, elapsed: resolution.lifecycle.phaseElapsed };
}

/**
 * Cmd_effectivenesssound's SE for the hit animation command, from the kernel `play-se` receipt that precedes it (null: none played),
 * and whether the receipt belongs to the end-turn weather loop.
 */
function effectivenessSong(segment: BattleResolutionSegment, eventSequence: number): Readonly<{ song: number; weatherLoop: boolean }> | null {
  const index = segment.events.findIndex((event) => event.sequence === eventSequence);
  for (let at = index - 1; at >= 0; at -= 1) {
    const { payload, provenance } = segment.events[at]!;
    if (payload.kind === "play-se") {
      const { songId } = payload;
      return songId === SE_NOT_EFFECTIVE || songId === SE_EFFECTIVE || songId === SE_SUPER_EFFECTIVE
        ? { song: songId, weatherLoop: provenance?.sourceLabel === DAMAGING_WEATHER_LOOP_SCRIPT }
        : null;
    }
    if (payload.kind === "animation") return null;
  }
  return null;
}

/** Called once per collected tick with the round's resolution presentation before and after the tick; write-only. */
export function emitBattleHitSounds(
  before: BattleResolutionPresentationState | null,
  after: BattleResolutionPresentationState | null,
  frontierBrain: boolean,
): void {
  const prior = currentCommand(before);
  const now = currentCommand(after);
  const bgm = factoryBattleBgm(frontierBrain);
  if (now === null || (prior !== null && prior.command === now.command)) return;
  const { command, segment } = now;
  // hpd4: a move body's script lead and hit tail are presented rows the ROM-calibrated controller sounds (SCENE_ON_LAG) already carry; a sound anchored to
  // a later command start subtracts them, and one that would then precede its anchor is scheduled from the earlier command (hit SE, HP bar).
  const lag = Math.max(0, sceneLag(segment) - (after === null ? 0 : moveBodyExtraRows(after, false)));
  if (command.type === "move-animation") {
    const next = segment.commands[segment.commands.indexOf(command) + 1];
    const duration = after === null ? null : presentedMoveDurationOnSoundClock(after);
    if (next !== undefined && next.type === "hit-animation" && duration !== null && (command.timing.bodyLeadFrames ?? 0) === 0 && EXPLOSION_FAMILY_MOVE_IDS.has(command.animation?.moveId ?? -1)) {
      // mxp1: the leadless Self-Destruct / Explosion body presents the hit command on the ROM's `hitanimation` row (A end + 10); its SE is `effectivenesssound`'s, the row before.
      const explosionSong = effectivenessSong(segment, next.eventSequence);
      if (explosionSong !== null) scheduleAfter(Math.max(0, duration), () => playPannedSe(explosionSong.song, next.battler === 0 ? SE_PAN_PLAYER : SE_PAN_OPPONENT));
      return;
    }
    if (next === undefined || next.type !== "hit-animation" || duration === null || (command.timing.bodyLeadFrames ?? 0) === 0) return;
    const song = effectivenessSong(segment, next.eventSequence);
    if (song === null) return;
    const panBattler = song.weatherLoop ? 0 : next.battler;
    // snd1: the SE starts with the hit: this body's presented end (the pre-lead duration plus its own lead / tail rows), where hpd4 / hpd5 put the
    // ROM's hit. ROM aud242q-iceball5: SE 462 / 967 / 1477 / 1996 / 2589 (the frame before the hits 463 / 968 / 1478 / 1997 / 2590); ours now
    // 463 / 968 / 1478 / 2000 / 2597 (the last two follow our hit drift), the aud241b Seismic Toss windows stay exact. The old anchor
    // subtracted every earlier lead body of the whole presentation (moveBodyExtraRows), so the SE moved earlier turn after turn: Ice Ball's
    // came 12 / 30 / 48 / 63 / 77 frames early, on top of the impact SE from roll 3 on (Kyle's 2026-11-20 Delibird: 39, then 26 frames
    // after the impact instead of 41).
    const ownExtraRows = moveBodyExtraRows(after!, true) - moveBodyExtraRows(after!, false);
    scheduleAfter(Math.max(0, duration + ownExtraRows), () => playPannedSe(song.song, panBattler === 0 ? SE_PAN_PLAYER : SE_PAN_OPPONENT));
    return;
  }
  if (command.type === "hp" && command.battler === 0 && after !== null) {
    const { from, to } = command;
    // snd2: HandleLowHpMusicChange reads the mon on the field now (gBattlerPartyIndexes), not the one the turn started with: a switch-in
    // earlier in this segment is already in the command field.
    const field = currentCommandField(after);
    const maxHp = field.player.maxHP;
    const end = battleResolutionCommandDuration(command, field, "first") - (command.timing.tailFrames ?? 0) + HEALTHBAR_DONE_AFTER_HP_END + lag;
    scheduleAfter(Math.max(0, end), () => handleLowHpMusicChange(from, maxHp));
    scheduleAfter(Math.max(0, end + SET_MON_DATA_AFTER_HEALTHBAR_DONE), () => handleLowHpMusicChange(to, maxHp));
    return;
  }
  if (command.type === "general-animation" && command.animation === "FUTURE_SIGHT_HIT" && sceneLag(segment) > 0) {
    // hit2 (lab etp1-futuresight-on): BattleScript_DoFutureAttackHit's effectivenesssound is the row before the hitanimation row (ROM 3030, hit command 3031 on both sides),
    // the animation command's last row; the hit command's own anchor (the controller lag) put it 7 rows late.
    const next = segment.commands[segment.commands.indexOf(command) + 1];
    if (next?.type === "hit-animation") {
      const song = effectivenessSong(segment, next.eventSequence);
      const pan = next.battler === 0 ? SE_PAN_PLAYER : SE_PAN_OPPONENT;
      if (song !== null) scheduleAfter(FUTURE_SIGHT_HIT_COMMAND_FRAMES, () => playPannedSe(song.song, pan));
    }
    return;
  }
  if (command.type === "hit-animation") {
    const previous = segment.commands[segment.commands.indexOf(command) - 1];
    if (previous?.type === "general-animation" && previous.animation === "FUTURE_SIGHT_HIT" && sceneLag(segment) > 0) return;
    if (previous?.type === "move-animation" && (previous.timing.bodyLeadFrames ?? 0) > 0) return;
    if (previous?.type === "move-animation" && EXPLOSION_FAMILY_MOVE_IDS.has(previous.animation?.moveId ?? -1) && sceneLag(segment) > 0) return;
    const song = effectivenessSong(segment, command.eventSequence);
    if (song !== null) {
      const panBattler = song.weatherLoop ? 0 : command.battler;
      // hit1 (docs/hit1-move-hit-timing.md): after a move body without a lead (a lead body schedules the SE itself, above), the lead /
      // tail rows of the resolution's earlier lead bodies (another move, or a multi-hit's first hit) are already in this command's start:
      // subtracting them (moveBodyExtraRows) put the SE that many rows early (frame catcher: Petal Dance / Spark / Brick Break after a
      // lead body 8 / 9 early, Double Slap / Fury Swipes hits 2+ 7 to 9 early). A hit after a general animation (Future Sight's hit,
      // the end-turn hail / sandstorm loop: etp2's constant) keeps its own anchor.
      const anchor = previous?.type === "move-animation" ? sceneLag(segment) : lag;
      // etp2: the end-turn weather loop's hit SE is 3 ticks after its hit command in both scenes.
      scheduleAfter(song.weatherLoop ? WEATHER_LOOP_HIT_SE_AFTER_COMMAND_ROWS : command.timing.selfConfusion === true ? SELF_CONFUSION_HIT_SE_AFTER_COMMAND_ROWS : Math.max(0, anchor), () => playPannedSe(song.song, panBattler === 0 ? SE_PAN_PLAYER : SE_PAN_OPPONENT));
    }
    return;
  }
  if (command.type !== "faint") return;
  const lead = command.timing.leadFrames;
  if (lead === undefined) return;
  // mxp1: after a leadless Self-Destruct / Explosion body (ON) the presented hit / hp / message rows are on the ROM's rows, so the faint SE carries no controller lag
  // (ROM labs eqk1-{expl,sd}-{p,f}-on: target faint +7, user faint +5 with it); the user's own faint (the script's second tryfaintmon) is 2 rows later still.
  const explosionBody = segment.commands.find((c) => c.type === "move-animation" && c.animation !== undefined && EXPLOSION_FAMILY_MOVE_IDS.has(c.animation.moveId));
  const faintLag = followsFutureSightHit(segment, command) || followsEndTurnTickDamage(segment, command) ? 0
    : explosionBody?.type === "move-animation" && sceneLag(segment) > 0 ? (explosionBody.battler === command.battler ? EXPLOSION_USER_FAINT_EXTRA_ROWS : 0) : faintControllerLag(segment, after, command);
  // snd2: {Player,Opponent}HandleFaintingCry cry the party mon at gBattlerPartyIndexes[battler] (battle_controller_player.c /
  // battle_controller_opponent.c): the mon on the field at the faint. segment.field is the field the segment opened with, so a mon
  // sent in earlier in the same segment and knocked out there cried as the one it replaced (frame catcher, seed 3: "Go! PHANPY!" ...
  // "PHANPY fainted!" cried CHARMELEON). The command field has every completed switch-in; Transform keeps `species` (the party's).
  const field = after === null ? segment.field : currentCommandField(after);
  const side = command.battler === 0 ? field.player : field.opponent;
  const pan = command.battler === 0 ? FAINT_CRY_PAN_PLAYER : FAINT_CRY_PAN_OPPONENT;
  scheduleAfter(Math.max(0, lead - FAINT_CRY_BEFORE_SE + FAINT_SOUND_OFFSET + faintLag), () => playFaintCry(bgm, side.species, pan));
  scheduleAfter(Math.max(0, lead + FAINT_SOUND_OFFSET + faintLag), () => {
    if (command.battler === 0) handleLowHpMusicChange(0, field.player.maxHP);
    playPannedSe(SE_FAINT, command.battler === 0 ? SE_PAN_PLAYER : SE_PAN_OPPONENT);
  });
}

/** Ticks from the faint command's first tick to its SE_FAINT (the schedule above); null when the current command is not a faint with a lead. */
export function faintSeOffsetRows(state: BattleResolutionPresentationState): number | null {
  const segment = state.segments[state.segmentIndex];
  const command = segment?.commands[state.commandIndex];
  if (segment === undefined || command?.type !== "faint" || command.timing.leadFrames === undefined) return null;
  return Math.max(0, command.timing.leadFrames + FAINT_SOUND_OFFSET + (followsFutureSightHit(segment, command) || followsEndTurnTickDamage(segment, command) ? 0 : faintControllerLag(segment, state, command)));
}

/**
 * fcl1 (ROM labs fcl1-{aerialace,slash,facade,leafblade,psychic}-*-on): after a lead body (`moveBodyExtraRows` > 0) the faint cry and SE_FAINT of a KO whose chain is hit -> hp -> print -> faint
 * (BattleScript_FaintTarget straight after the hit's datahpupdate) sit at the ROM's rows with no controller lag (hit SE -> cry 94 rows in every lab); hpd4's `sceneLag - extra` left
 * them 1 row late whenever the extra was 6. A faint behind a second hp command (Double-Edge's recoil, aud252 seed 2230) keeps hpd4's lag, which the ROM rows there still show.
 */
function faintControllerLag(segment: BattleResolutionSegment, after: BattleResolutionPresentationState | null, faint: BattleResolutionPresentationCommand): number {
  const extra = after === null ? 0 : moveBodyExtraRows(after, false);
  let hpRows = 0;
  for (let at = segment.commands.indexOf(faint) - 1; at >= 0 && segment.commands[at]!.type !== "hit-animation"; at -= 1) if (segment.commands[at]!.type === "hp") hpRows += 1;
  return extra > 0 && hpRows <= 1 ? 0 : Math.max(0, sceneLag(segment) - extra);
}

/**
 * hit2 (lab etp1-futuresight-on, ROM 3187 vs ours 3194): the faint after the Scene ON Future Sight hit (BattleScript_DoFutureAttackHit, 3 script rows shorter than
 * BattleScript_HitFromAtk's tail) carries no controller lag: the faint SE is the ROM's lead + 2 rows after the faint command.
 */
function followsFutureSightHit(segment: BattleResolutionSegment, faint: BattleResolutionPresentationCommand): boolean {
  if (sceneLag(segment) === 0) return false;
  for (let at = segment.commands.indexOf(faint) - 1; at > 0; at -= 1) {
    if (segment.commands[at]!.type !== "hit-animation") continue;
    const before = segment.commands[at - 1]!;
    return before.type === "general-animation" && before.animation === "FUTURE_SIGHT_HIT";
  }
  return false;
}

/** The scripts whose `datahpupdate` is an end-turn tick (the Leech Seed drain and its heal, the poison / burn tick, the damaging weather loop). */
const END_TURN_TICK_DAMAGE_SCRIPTS: ReadonlySet<string> = new Set([
  "BattleScript_LeechSeedTurnDrain",
  "BattleScript_LeechSeedTurnPrintAndUpdateHp",
  "BattleScript_DoTurnDmg",
  DAMAGING_WEATHER_LOOP_SCRIPT,
]);

/**
 * fkt1 (ROM labs fkt1-{kols,kotoxic,kosand}-on, T2 s310 d17 / s499 d20): `FaintAttacker+0` -> SE_FAINT is 67 rows in every ROM faint (`playfaintcry`, the 64-row `pause`, `dofaintanimation`), and the
 * faint box follows 19-20 rows after it. The controller lag (SCENE_ON_LAG) stands for the hit chain's hit-animation -> hp rows that the engine presents shorter than the ROM's, so after a move hit the
 * engine's faint command starts early and the lag carries the SE back to the ROM row; the end-turn tick chains (drain, poison, weather: no hit body of their own) have no such deficit, and the lag put the SE
 * 6 rows late against the faint print (SE16 -> print 14 against the ROM's 20). True when the damage that fainted the battler (the last hp-change before the faint animation) came from one of those scripts.
 */
function followsEndTurnTickDamage(segment: BattleResolutionSegment, faint: Extract<BattleResolutionPresentationCommand, { type: "faint" }>): boolean {
  const index = segment.events.findIndex((event) => event.sequence === faint.eventSequence);
  for (let at = index - 1; at >= 0; at -= 1) {
    const event = segment.events[at]!;
    if (event.payload.kind === "hp-change") return END_TURN_TICK_DAMAGE_SCRIPTS.has(event.provenance?.sourceLabel ?? "");
  }
  return false;
}

function sceneLag(segment: BattleResolutionSegment): number {
  return (segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0 ? SCENE_ON_LAG : 0;
}

const MOVE_DOUBLE_TEAM = 104;
/** Double Team's last SE is on script row 131; the STATS_CHANGE animation's SE_M_STAT_INCREASE follows 34 rows later (ROM windows: seed 2 x3, all +34). */
const DOUBLE_TEAM_STAT_SE_SCRIPT_ROW = 165;
/** Move-body age -> script row (moveAnimSounds FIRST_COMMAND_AGE + AGE_TO_SOUND_ROWS). */
const MOVE_BODY_AGE_TO_SCRIPT_ROW = 8;
const SE_M_STAT_INCREASE = 239;

/**
 * Scene ON Double Team: the live move window already contains the STATS_CHANGE animation (sc106: no stats-change command, so emitStatsChangeSounds is silent),
 * and the ROM plays General_StatsChange's SE_M_STAT_INCREASE inside it. Only when the segment presents the evasion rise (not at +6) for the attacker.
 */
export function emitDoubleTeamStatsChangeSound(after: BattleResolutionPresentationState | null): void {
  if (after === null || after.lifecycle.phase !== "presenting") return;
  const source = liveMoveSourceAge(after);
  if (source === null || source.request.moveId !== MOVE_DOUBLE_TEAM || source.age - MOVE_BODY_AGE_TO_SCRIPT_ROW !== DOUBLE_TEAM_STAT_SE_SCRIPT_ROW) return;
  const segment = after.segments[after.segmentIndex];
  const command = segment?.commands[after.commandIndex];
  if (segment === undefined || command === undefined || command.type !== "move-animation") return;
  let rise: BattleKernelSemanticEvent | undefined;
  for (const event of segment.events) {
    if (event.sequence <= command.eventSequence) continue;
    if (event.payload.kind === "message" && event.payload.messageId === "STRINGID_USEDMOVE") break;
    if (event.payload.kind === "animation" && event.payload.animationId === "STATS_CHANGE") { rise = event; break; }
  }
  if (rise === undefined || rise.payload.kind !== "animation" || rise.payload.battler !== source.request.attacker) return;
  const side = source.request.attacker === 0 ? "player" : "opponent";
  emitSound({ kind: "se", id: SE_M_STAT_INCREASE, pan: animSoundPan2(-64, { attackerSide: side, targetSide: side === "player" ? "opponent" : "player" }) });
}
