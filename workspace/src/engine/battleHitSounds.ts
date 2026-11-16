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
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import type {
  BattleResolutionPresentationCommand,
  BattleResolutionPresentationState,
  BattleResolutionSegment,
} from "./battleResolutionPresentation.ts";

/** Ticks the Scene ON oracle trails the engine's presentation clock for the controller-side sounds (the same lag in every window). */
const SCENE_ON_LAG = 7;
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
  if (prior !== null && prior.command.type === "hp" && prior.command.battler === 0 && (now === null || now.command !== prior.command)) {
    const lag = sceneLag(prior.segment);
    const { from, to } = prior.command;
    const maxHp = prior.segment.field.player.maxHP;
    scheduleAfter(HEALTHBAR_DONE_AFTER_HP_END + lag, () => handleLowHpMusicChange(from, maxHp));
    scheduleAfter(HEALTHBAR_DONE_AFTER_HP_END + SET_MON_DATA_AFTER_HEALTHBAR_DONE + lag, () => handleLowHpMusicChange(to, maxHp));
  }
  if (now === null || (prior !== null && prior.command === now.command)) return;
  const { command, segment } = now;
  const lag = sceneLag(segment);
  if (command.type === "hit-animation") {
    const song = effectivenessSong(segment, command.eventSequence);
    if (song !== null) {
      const panBattler = song.weatherLoop ? 0 : command.battler;
      scheduleAfter(lag, () => playPannedSe(song.song, panBattler === 0 ? SE_PAN_PLAYER : SE_PAN_OPPONENT));
    }
    return;
  }
  if (command.type !== "faint") return;
  const lead = command.timing.leadFrames;
  if (lead === undefined) return;
  const side = command.battler === 0 ? segment.field.player : segment.field.opponent;
  const pan = command.battler === 0 ? FAINT_CRY_PAN_PLAYER : FAINT_CRY_PAN_OPPONENT;
  scheduleAfter(lead - FAINT_CRY_BEFORE_SE + FAINT_SOUND_OFFSET + lag, () => playFaintCry(bgm, side.species, pan));
  scheduleAfter(lead + FAINT_SOUND_OFFSET + lag, () => {
    if (command.battler === 0) handleLowHpMusicChange(0, segment.field.player.maxHP);
    playPannedSe(SE_FAINT, command.battler === 0 ? SE_PAN_PLAYER : SE_PAN_OPPONENT);
  });
}

function sceneLag(segment: BattleResolutionSegment): number {
  return (segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0 ? SCENE_ON_LAG : 0;
}
