// S11 aud242a/b/c: the script-level move-animation SEs (playsewithpan / playse / waitplaysewithpan / loopsewithpan / panse* / setpan) of a live Scene ON move
// animation, at the frame the decoded script command executes. Write-only presentation (src/audio/soundEvents.ts): reads the resolution
// presentation, never changes it. Data: src/data/gen/anim-sound-timing.json (tools/extract/extract-anim-sound-timing.ts). docs/aud242-move-anim-sounds.md.
import { TURN_TRAP_SCRIPT_LABEL, turnTrapBranchOf, type TurnTrapBranch } from "./turnTrapBranch.ts";
import { animSoundPan2, emitSound, type AnimPanContext } from "../audio/soundEvents.ts";
import { moveAnimOpRows, timing, variantOf, type OpRow, type TimedOp, type VariantInputs } from "./animSoundOps.ts";
export { moveAnimOpRows, variantOf, type OpRow, type TimedOp, type VariantInputs };
import { scheduleAfter, CRY_MODE_ECHO_END, CRY_MODE_ECHO_START, CRY_MODE_HIGH_PITCH, CRY_MODE_ROAR_1, CRY_MODE_ROAR_2, playAnimTaskCry, scheduleAnimTaskBgmRestore, stopAnimTaskCry } from "./screenSounds.ts";
import { CRY_ECHO_END_FRAMES, CRY_ECHO_START_FRAMES, CRY_HIGH_PITCH_FRAMES, CRY_ROAR_2_FRAMES } from "../data/cryModeFrames.ts";
import { factoryBattleBgm } from "./battleStartSounds.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import { liveMoveSourceAge, moveAnimationScriptStartRow, statsChangeSourceAge } from "./battleResolutionPresentationRender.ts";
import { bodyCLeadRuleApplies, bodyStatusTailRuleApplies, FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES, HELD_ITEM_EFFECT_COMMAND_FRAMES, RAIN_CONTINUES_SCRIPT_START_ROWS, WEATHER_CONTINUES_LAUNCH_LEAD_ROWS, isWeatherContinuesAnimation, type BattleStatusAnimationName, type WeatherContinuesAnimation } from "./battleResolutionPresentation.ts";

/** Body age of the script's first command (script frame 0). */
const FIRST_COMMAND_AGE = 1;
/** Scene ON controller lag between the script's sound call and the session tick (the ROM windows, tests/aud242aMoveAnimSounds.test.ts; same 7 as battleHitSounds SCENE_ON_LAG). */
const AGE_TO_SOUND_ROWS = 7;

/** StatsChangeAnimation_Step2 plays its SE (battle_anim_utility_funcs.c:561-564) on this stats-change command age. */
export const STATS_CHANGE_SE_AGE = 7;
/**
 * snd3 (docs/snd3-sweep-sounds.md): the battle-start entry script's stats-change command (pau4, BattleScript_IntimidateActivatesEnd3's
 * `playanimation BS_TARGET, B_ANIM_STATS_CHANGE`) starts on the ROM's gAnimScriptActive edge + 1 and its banner is ROM-exact, so Step2's SE
 * (edge + 4, three frames before the banner's first frame) is command age 3 (ROM lab sta6m-intimp-off: SE 245 at app frame 732, command 729).
 */
export const ENTRY_STATS_CHANGE_SE_AGE = 3;
const SE_M_STAT_INCREASE = 239;
const SE_M_STAT_DECREASE = 245;
const SOUND_PAN_ATTACKER_VALUE = -64;

/**
 * General_StatsChange's SE (both scenes): SE_M_STAT_INCREASE / DECREASE with BattleAnimAdjustPanning2(SOUND_PAN_ATTACKER) for the animated battler.
 * `seAge`: the command age of the SE (the battle-start entry phase passes ENTRY_STATS_CHANGE_SE_AGE).
 */
export function emitStatsChangeSounds(after: BattleResolutionPresentationState | null, seAge?: number): void {
  if (after === null || after.lifecycle.phase !== "presenting") return;
  const source = statsChangeSourceAge(after, seAge === undefined);
  if (source === null || source.age !== (seAge ?? STATS_CHANGE_SE_AGE)) return;
  emitSound({
    kind: "se", id: source.direction === "up" ? SE_M_STAT_INCREASE : SE_M_STAT_DECREASE,
    pan: animSoundPan2(SOUND_PAN_ATTACKER_VALUE, { attackerSide: source.battler === 0 ? "player" : "opponent", targetSide: source.battler === 0 ? "opponent" : "player" }),
  });
}

/** Per iteration the script step runs before RunTasks: every command's row, then the pan tasks' rows in creation order. */
function emitOpsAt(ops: readonly TimedOp[], context: AnimPanContext, scriptRow: number, uniformLoop = false): void {
  const due: OpRow[] = [];
  for (const op of ops) {
    const base = scriptRow - op.frame;
    if (base < 0) continue;
    for (const row of moveAnimOpRows(op, context, uniformLoop)) if (row.offset === base) due.push(row);
  }
  for (const row of due) if (row.task !== true) emitSound(row.emission);
  for (const row of due) if (row.task === true) emitSound(row.emission);
}

const MOVE_ROAR = 46;
const MOVE_HOWL = 336;
const MOVE_HYPER_VOICE = 304;

const CRY_TASK_FRAMES = { ECHO_START: CRY_ECHO_START_FRAMES, ECHO_END: CRY_ECHO_END_FRAMES, ROAR_2: CRY_ROAR_2_FRAMES, HIGH_PITCH: CRY_HIGH_PITCH_FRAMES } as const;

/** Frames from a cry task's PlayCry call to the frame IsCryPlaying turns false: the derived cry length + 1. */
function cryTaskLength(mode: keyof typeof CRY_TASK_FRAMES, species: number): number | undefined {
  const frames = CRY_TASK_FRAMES[mode][species];
  return frames === undefined ? undefined : frames + 1;
}

type CryTaskRow =
  | Readonly<{ at: number; row: "cry"; mode: number; duck: boolean }>
  | Readonly<{ at: number; row: "stop" | "restore" }>;

/**
 * cry1 (ISSUES #219 family 3): the cry tasks of battle_anim_sound_tasks.c as rows at script frames (the extractor's rules: loadspritegfx / monbg 3, delay N + 2); all offsets
 * are ROM-measured (tools/audio/fixtures/cry1-*.json, docs/cry1-cry-tasks.md), the lengths D come from cryModeFrames.ts (the derived cry length + 1, the frame IsCryPlaying turns false; unknown species: first cries only).
 * Roar (SoundTask_PlayDoubleCry): ROAR_1 at frame 6 (ducks), ROAR_2 11 later, the restore D_R2 after ROAR_2. Howl (SoundTask_PlayCryHighPitch): HIGH_PITCH at frame 34 (after
 * `delay 12` + RoarEffect's `delay 15`), the restore D_HP later. Hyper Voice (SoundTask_PlayCryWithEcho, run twice, PlayCry_DuckNoRestore): ES at frame 5 (task created at 3), the
 * Step's stop D_ES later, EE the frame after; the second round's c0 stop is 53 after the first ES (species independent), ES2 2 after it, stop, EE2 (ByMode); the BGM comes back
 * at the earlier of EE2 + D_EE and the animation's DestroyAnimSoundTask (98 after the first ES). Only the effective rows (the ROM's `noop` duck / stop rows are not emitted).
 */
function cryTaskRows(move: number, species: number): readonly CryTaskRow[] | undefined {
  if (move === MOVE_ROAR) {
    const rows: CryTaskRow[] = [{ at: 6, row: "cry", mode: CRY_MODE_ROAR_1, duck: true }];
    const second = cryTaskLength("ROAR_2", species);
    if (second === undefined) return rows;
    rows.push({ at: 17, row: "cry", mode: CRY_MODE_ROAR_2, duck: false }, { at: 17 + second, row: "restore" });
    return rows;
  }
  if (move === MOVE_HOWL) {
    const rows: CryTaskRow[] = [{ at: 34, row: "cry", mode: CRY_MODE_HIGH_PITCH, duck: true }];
    const length = cryTaskLength("HIGH_PITCH", species);
    if (length !== undefined) rows.push({ at: 34 + length, row: "restore" });
    return rows;
  }
  if (move === MOVE_HYPER_VOICE) {
    const rows: CryTaskRow[] = [{ at: 5, row: "cry", mode: CRY_MODE_ECHO_START, duck: true }];
    const start = cryTaskLength("ECHO_START", species);
    const end = cryTaskLength("ECHO_END", species);
    if (start === undefined || end === undefined) return rows;
    rows.push(
      { at: 5 + start, row: "stop" },
      { at: 6 + start, row: "cry", mode: CRY_MODE_ECHO_END, duck: false },
      { at: 58, row: "stop" },
      { at: 60, row: "cry", mode: CRY_MODE_ECHO_START, duck: false },
      { at: 60 + start, row: "stop" },
      { at: 61 + start, row: "cry", mode: CRY_MODE_ECHO_END, duck: false },
      { at: Math.min(61 + start + end, 103), row: "restore" },
    );
    return rows;
  }
  return undefined;
}

/** The SPECIES_NONE guard: the task destroys itself and plays nothing. */
export function emitCryTaskRows(move: number, species: number, attackerSide: "player" | "opponent", scriptRow: number, frontierBrain: boolean): void {
  if (species === 0) return;
  const rows = cryTaskRows(move, species);
  if (rows === undefined) return;
  const bgm = factoryBattleBgm(frontierBrain);
  for (const row of rows) {
    if (row.at !== scriptRow) continue;
    if (row.row === "cry") playAnimTaskCry(bgm, species, row.mode, attackerSide === "player" ? SOUND_PAN_ATTACKER_VALUE : 63, row.duck);
    else if (row.row === "stop") stopAnimTaskCry();
  }
  // The restore is scheduled from the first cry: Hyper Voice's DestroyAnimSoundTask restore falls after the engine's presented animation has ended (the next command's frames).
  const first = rows[0]!;
  const restore = rows.find((row) => row.row === "restore");
  if (restore !== undefined && first.at === scriptRow) scheduleAnimTaskBgmRestore(bgm, restore.at - first.at);
}

/**
 * aud260: the script's `end` waits for its parallel sound tasks and `waitsound` (battle_anim.c:482), so an SE past the command's last presenting row still plays
 * (the psn2 mechanism, move animations: Dynamic Punch's 5th SE 177). Scheduled from script row 0 for every row after `lastScriptRow`. Sound-only: the window is not lengthened.
 */
function scheduleMoveAnimationTail(ops: readonly TimedOp[], context: AnimPanContext, lastScriptRow: number): void {
  const tailRows = new Set<number>();
  for (const op of ops) for (const row of moveAnimOpRows(op, context)) if (op.frame + row.offset > lastScriptRow) tailRows.add(op.frame + row.offset);
  for (const scriptRow of tailRows) scheduleAfter(scriptRow, () => emitOpsAt(ops, context, scriptRow));
}

/**
 * snd3 (docs/snd3-sweep-sounds.md): gMovesWithQuietBGM (battle_anim_scripts.s:14-15: Sing, Perish Song, GrassWhistle). LaunchBattleAnimation
 * (battle_anim.c:248-256) sets the BGM to volume 128 on the launch row, the row before the script's first command (script row -1); Cmd_end
 * (battle_anim.c:520) sets it back to 256 on the row gAnimScriptActive falls. ROM (soundEventProbe on tools/battle-lab/snd3-<move>-<side>-on.json,
 * tools/audio/fixtures/snd3-*-window.json, and the frame catcher's seed 15 GrassWhistle, ROSELIA -> FURRET): the duck is 1 row before each
 * move's first SE's script row in all seven windows; the restore row is GrassWhistle 219 (SE-bound: SE_M_GRASSWHISTLE ends 201 rows after its
 * panse at 18, both sides and both species pairs), Perish Song 257 (both sides: its fixed 259-row body - 2) and Sing its geometry-derived ROM
 * body - 2 (liveSingBodyRows: the notes fly off the screen, then Cmd_end's 90-frame IsSEPlaying wait runs out, stops SE_M_SING on SE1,
 * battle_anim.c:493-501, and restores the BGM on the same row).
 */
export const QUIET_BGM_VOLUME = 128;
export const QUIET_BGM_LAUNCH_ROW = -1;
const MOVE_SING = 47;
const MOVE_PERISH_SONG = 195;
const MOVE_GRASS_WHISTLE = 320;
const SE_M_SING = 172;
const QUIET_BGM_FIXED_RESTORE_ROWS: Readonly<Partial<Record<number, number>>> = Object.freeze({ [MOVE_PERISH_SONG]: 257, [MOVE_GRASS_WHISTLE]: 219 });
const SING_RESTORE_ROWS_BEFORE_BODY_END = 2;

/** The script row of the quiet-BGM restore (and the SE Cmd_end stops on that row), or null for a move outside gMovesWithQuietBGM. */
export function quietBgmRestore(moveId: number, singBodyRows: () => number | null): Readonly<{ row: number; stopSe?: number }> | null {
  const fixed = QUIET_BGM_FIXED_RESTORE_ROWS[moveId];
  if (fixed !== undefined) return { row: fixed };
  if (moveId !== MOVE_SING) return null;
  const rows = singBodyRows();
  return rows === null ? null : { row: rows - SING_RESTORE_ROWS_BEFORE_BODY_END, stopSe: SE_M_SING };
}

function emitQuietBgmRows(moveId: number, singBodyRows: () => number | null, scriptRow: number, frontierBrain: boolean): void {
  if (scriptRow !== QUIET_BGM_LAUNCH_ROW) return;
  const restore = quietBgmRestore(moveId, singBodyRows);
  if (restore === null) return;
  const bgm = factoryBattleBgm(frontierBrain);
  emitSound({ kind: "duck", id: bgm, pan: null, volume: QUIET_BGM_VOLUME });
  // The restore can fall after the engine's presented animation has ended (the next command's frames), so it is scheduled from the launch row.
  const delay = restore.row - QUIET_BGM_LAUNCH_ROW;
  if (restore.stopSe !== undefined) {
    const id = restore.stopSe;
    scheduleAfter(delay, () => emitSound({ kind: "stop", id, pan: null, player: "SE1" }));
  }
  scheduleAnimTaskBgmRestore(bgm, delay);
}

/**
 * mvs1 (docs/mvs1-called-move-sounds.md): the two moves Cmd_attackanimation animates under HITMARKER_NO_ANIMATIONS (battle_script_commands.c:1748, tested on
 * gCurrentMove: the called move under METRONOME). The controller then runs the whole script (DoMoveAnim, no scene test), sounds included: Scene OFF plays them.
 */
const MOVE_TRANSFORM = 144;
const MOVE_SUBSTITUTE = 164;
const MOVE_WILL_O_WISP = 261;
/**
 * mvs1: the bodies whose sound clock is the ROM script's own: script row 0 on the command row seGate + moveAnimationScriptStartRow (the script lead + 4),
 * not the generic clock (age - FIRST_COMMAND_AGE - AGE_TO_SOUND_ROWS) the other bodies were calibrated on. ROM (the mvs1 labs, both sides; Substitute and
 * Transform in both scenes; the frame catcher fcm1 runs): the generic clock put Substitute's SEs 7 rows late (its lead is presented as scriptLeadFrames, so the
 * body is drawn on the ROM's rows: SE_M_ATTRACT 2 rows before the first shrink row on the ROM, 5 after on ours), Transform's 5 late and Will-O-Wisp's 1 early.
 */
const SCRIPT_START_CLOCK_MOVE_IDS: ReadonlySet<number> = new Set([MOVE_TRANSFORM, MOVE_SUBSTITUTE, MOVE_WILL_O_WISP]);
/**
 * mxp1: Self-Destruct / Explosion present the ROM's gAnimScriptActive rise as body age 0 (window = A, no lead), so script row 0 is age 1 and the
 * table's frame is the SE row with no controller lag (ROM labs eqk1-{expl,sd}-{p,f}: the first SE is A + 4 = age 4 for the frame-3 op; the generic
 * 7-row lag put every body SE 7 rows late).
 */
const NO_SOUND_LAG_MOVE_IDS: ReadonlySet<number> = new Set([120, 153]);

/** Called once per collected tick with the round's resolution presentation after the tick; emits the ops whose frame is this tick's. */
export function emitMoveAnimSounds(after: BattleResolutionPresentationState | null, frontierBrain = false): void {
  if (after === null || after.lifecycle.phase !== "presenting") return;
  const segment = after.segments[after.segmentIndex];
  if (segment === undefined) return;
  const command = segment.commands[after.commandIndex];
  if (command?.type !== "move-animation") return;
  const source = liveMoveSourceAge(after);
  if (source === null) return;
  const { request, age, lastAge } = source;
  if ((segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0
    && request.moveId !== MOVE_TRANSFORM && request.moveId !== MOVE_SUBSTITUTE) return;
  const context = {
    attackerSide: request.attacker === 0 ? "player" : "opponent",
    targetSide: request.target === 0 ? "player" : "opponent",
  } as const;
  const soundLag = NO_SOUND_LAG_MOVE_IDS.has(request.moveId) ? 0 : AGE_TO_SOUND_ROWS;
  const genericRow = age - FIRST_COMMAND_AGE - soundLag;
  const start = SCRIPT_START_CLOCK_MOVE_IDS.has(request.moveId) ? moveAnimationScriptStartRow(segment, command.eventSequence) : null;
  const scriptRow = start === null ? genericRow : after.lifecycle.phaseElapsed - (command.timing.seGateFrames ?? 0) - start;
  const ops = variantOf(request.moveId, request.turn, request.attacker === 0 ? 0 : 1, { picY: source.picOffsetY, topY: source.topY, rolloutCounter: request.rolloutCounter, damage: request.damage, attackerElevation: source.attackerElevation, attackerHpQuarter: source.attackerHpQuarter });
  emitQuietBgmRows(request.moveId, source.singBodyRows, scriptRow, frontierBrain);
  emitOpsAt(ops, context, scriptRow);
  if (scriptRow === 0) scheduleMoveAnimationTail(ops, context, lastAge - FIRST_COMMAND_AGE - soundLag + scriptRow - genericRow);
  emitCryTaskRows(request.moveId, source.attackerSpecies, context.attackerSide, scriptRow, frontierBrain);
}

const STATUS_ANIMATION_LABELS: Readonly<Record<BattleStatusAnimationName, string>> = {
  PSN: "Status_Poison", CONFUSION: "Status_Confusion", BRN: "Status_Burn", INFATUATION: "Status_Infatuation", SLP: "Status_Sleep",
  PRZ: "Status_Paralysis", FRZ: "Status_Freeze", CURSED: "Status_Curse", NIGHTMARE: "Status_Nightmare",
};
const WEATHER_LABELS: Readonly<Record<WeatherContinuesAnimation, string>> = {
  RAIN_CONTINUES: "General_Rain", SUN_CONTINUES: "General_Sun", SANDSTORM_CONTINUES: "General_Sandstorm", HAIL_CONTINUES: "General_Hail",
};
/**
 * Status-animation command age (rows since the launch, after the IsBattleSEPlaying gate) of the script's first command. sta5: 0 = the ROM's
 * `gAnimScriptActive` rise row (the first SE is that row plus the table row's own frame), measured where the move body in front of it
 * carries its script lead + tail (the STA5 bodies: Flatter / Swagger / Spore / Toxic). The B4 "C" bodies' lead is landed (b4l), so a status
 * animation after one of them, and every Sleep / Confusion animation, is at 0 too. Elsewhere the 7 stays (Refresh, a cure berry, Poison / Burn / Paralysis outside a B4 body: ROM minus ours 2 / 3 at 7).
 */
export const STATUS_ANIMATION_SCRIPT_AGE = 7;
const END_TURN_STATUS_DAMAGE_LABEL = "BattleScript_DoStatusTurnDmg";
export const STATUS_ANIMATION_AUDITED_BODY_SCRIPT_AGE = 0;
function statusAnimationScriptAge(state: BattleResolutionPresentationState, name: BattleStatusAnimationName): number {
  // b4l: the status animation a c-lead B4 body (Thunder Wave, Sing, Will-O-Wisp, Confuse Ray ...) hands over to plays its first SE 3 rows after the command (ROM, the b4m labs), not 10:
  // only the command directly after the body (a `status` command may sit between), so end-of-turn / Toxic / other status animations keep their audited offset.
  const own = state.segments[state.segmentIndex]!.commands;
  // gsp3: the end-of-turn poison / burn tick (BattleScript_DoStatusTurnDmg, no move body) plays its first SE on the ROM's launch row + 1 (+ the table row), age 0 (labs gsp3-{toxic,willowisp}-*-on, 6 / 6 ticks).
  const current = own[state.commandIndex];
  const launched = current !== undefined && "eventSequence" in current
    ? state.segments[state.segmentIndex]!.events.find((event) => event.sequence === current.eventSequence)
    : undefined;
  if (launched?.provenance?.sourceLabel === END_TURN_STATUS_DAMAGE_LABEL) return STATUS_ANIMATION_AUDITED_BODY_SCRIPT_AGE;
  for (let c = state.commandIndex - 1; c >= 0; c -= 1) {
    const previous = own[c]!;
    if (previous.type === "status") continue;
    if (previous.type === "move-animation" && (previous.timing.bodyLeadFrames ?? 0) > 0 && previous.animation !== undefined && bodyCLeadRuleApplies(previous.animation.moveId)) return STATUS_ANIMATION_AUDITED_BODY_SCRIPT_AGE;
    break;
  }
  for (let s = 0; s <= state.segmentIndex; s += 1) {
    const commands = state.segments[s]!.commands;
    const end = s === state.segmentIndex ? state.commandIndex : commands.length;
    for (let c = 0; c < end; c += 1) {
      const command = commands[c]!;
      if (command.type === "move-animation" && (command.timing.bodyLeadFrames ?? 0) > 0 && command.animation !== undefined && bodyStatusTailRuleApplies(command.animation.moveId)) return STATUS_ANIMATION_AUDITED_BODY_SCRIPT_AGE;
    }
  }
  // b4l: Sleep and Confusion play their first SE 3 rows after the command wherever they start (T2 ROM rows, 25 Scene ON seeds: SE 197 mass 639 -> 347, 176 1,524 -> 840, 212 516 -> 138; no id worse);
  // Poison / Burn / Paralysis outside a B4 body keep the 10 (the same change moved them away from the ROM: SE 148 +216, 119 +43, 144 +24).
  return name === "SLP" || name === "CONFUSION" || name === "INFATUATION" ? STATUS_ANIMATION_AUDITED_BODY_SCRIPT_AGE : STATUS_ANIMATION_SCRIPT_AGE;
}
/** Weather-continues body age -> script row: the move-body clock (FIRST_COMMAND_AGE + AGE_TO_SOUND_ROWS). */
const WEATHER_SCRIPT_AGE = FIRST_COMMAND_AGE + AGE_TO_SOUND_ROWS;

/** aud250: command age -> script row of the General_* commands (ROM windows: focus punch x2 sides, leech seed drain x2 sides, castform rain-opp in both scenes). */
export const FOCUS_PUNCH_SETUP_SCRIPT_AGE = 5;
export const LEECH_SEED_DRAIN_SCRIPT_AGE = 7;
export const CASTFORM_CHANGE_SCRIPT_AGE = 5;
/** wsh1: command age -> script frame of General_WishHeal / General_FutureSightHit / General_FocusBand (calibrated on the T2 ROM rows, docs/wsh1-general-anim-commands.md). */
export const WISH_HEAL_SCRIPT_AGE = 6;
export const FUTURE_SIGHT_HIT_SCRIPT_AGE = 0;
export const FOCUS_BAND_SCRIPT_AGE = 0;
/**
 * ing1 (docs/fcp1-frame-catcher-pictures.md): command age -> script frame of General_IngrainHeal. ROM (soundEventProbe lab on
 * tools/battle-lab/ing1-player-on.json / ing1-opp-on.json): SE_M_CRABHAMMER x8 at command age 34 .. 76 every 6, SE_M_ABSORB_2 at 129 = the
 * table's 27 .. 69 and 122 + 7. The rooted battler is the script's attacker and target (both pans follow its side).
 */
export const INGRAIN_HEAL_SCRIPT_AGE = 7;
/**
 * trp1 (docs/trp1-turn-trap-animation.md): General_TurnTrap's branches (TURN_TRAP_SCRIPT_LABEL; the anim-sound-timing table walks each as
 * its own entry). ROM (soundEventProbe lab on tools/battle-lab/trp1-<move>-{player,opp}-on.json): every SE row is at command age = the
 * table's script frame (Status_BindWrap SE_M_SCRATCH 3 / 10 and SE_M_BIND 39, Status_FireSpin / Status_SandTomb 3, Status_Whirlpool 8,
 * Status_Clamp 9), panned to the trapped battler's side (it is the script's attacker and target), and the `stopsound` after
 * `waitforvisualfinish` stops the still-playing SE at TURN_TRAP_STOP's age.
 */
export const TURN_TRAP_SCRIPT_AGE = 0;
export const TURN_TRAP_STOP: Readonly<Partial<Record<TurnTrapBranch, Readonly<{ age: number; id: number; player: "SE1" | "SE2" }>>>> = Object.freeze({
  FIRE_SPIN: { age: 78, id: 150, player: "SE2" }, SAND_TOMB: { age: 98, id: 230, player: "SE1" }, WHIRLPOOL: { age: 103, id: 165, player: "SE1" },
});

/**
 * hie3: General_HeldItemEffect. The extracted table holds only the first SE (playsewithpan 152 at script frame 8: the rest follow `waitforvisualfinish`, which the
 * extractor cannot time). The rest is the script's own spacing, measured in five Scene ON ROM windows (step-mode probe, tests/hie3HeldItemSounds.test.ts): the
 * three SE_M_TAKE_DOWN rotations are 32 frames each (152 at 8 / 40 / 72), SE_M_MORNING_SUN (228) follows the third at +32 and SE_SHINY (102) the granting stars at +72.
 * Script frame 0 = the command's first frame + (minimumFrames - HELD_ITEM_EFFECT_COMMAND_FRAMES): the same drift-free epoch as the drawn animation (hie2b), so
 * a restart (229) starts it 15 frames in, a continuation (223) 9, a cure berry (192, its 32-frame `status` command netted out) 22 frames BEFORE the command.
 */
const HELD_ITEM_EFFECT_LATER_SE_OPS: readonly TimedOp[] = [
  { op: "playsewithpan", frame: 40, id: 152, pan: -64 }, { op: "playsewithpan", frame: 72, id: 152, pan: -64 },
  { op: "playsewithpan", frame: 104, id: 228, pan: -64 }, { op: "playsewithpan", frame: 176, id: 102, pan: -64 },
];

function heldItemEffectOps(battler: 0 | 1): readonly TimedOp[] {
  return [...generalVariant("General_HeldItemEffect", battler), ...HELD_ITEM_EFFECT_LATER_SE_OPS];
}

function generalVariant(label: string, attackerSide: 0 | 1): readonly TimedOp[] {
  const entry = timing.general.find((g) => g.label === label);
  return entry === undefined ? [] : timing.variants[entry.variants[attackerSide]!]!;
}

/**
 * psn2: the script's `end` waits for its parallel loopsewithpan task (battle_anim.c:482), so an SE past the command's window still plays. Schedules the rows whose command age
 * (script row + the script age) falls at or after the window end (none at age 0: Status_Poison's 6th SE 148 is age 70 of 71). Sound-only: the window is not lengthened.
 */
function scheduleStatusAnimationTail(ops: readonly TimedOp[], context: AnimPanContext, windowRows: number, scriptAge: number): void {
  const tailRows = new Set<number>();
  for (const op of ops) for (const row of moveAnimOpRows(op, context, true)) if (op.frame + row.offset + scriptAge >= windowRows) tailRows.add(op.frame + row.offset);
  for (const scriptRow of tailRows) scheduleAfter(scriptRow, () => emitOpsAt(ops, context, scriptRow, true));
}

/**
 * aud249: the SEs of the General_* animations the live presentation runs (Scene ON only: Cmd_statusanimation / Cmd_playanimation test
 * HITMARKER_NO_ANIMATIONS, so OFF presents none of these commands). Status conditions play with statusAnimActive (every pan follows the battler's
 * side, BattleAnimAdjustPanning :1265-1271); the end-turn weather bodies are General_Rain / the Sun, Sandstorm, Hail move scripts with battler 0 as attacker.
 */
export function emitGeneralAnimSounds(after: BattleResolutionPresentationState | null): void {
  if (after === null || after.lifecycle.phase !== "presenting") return;
  const command = after.segments[after.segmentIndex]?.commands[after.commandIndex];
  if (command === undefined) return;
  const elapsed = after.lifecycle.phaseElapsed;
  if (command.type === "status") {
    // A cure berry's script starts inside the netted `status` command before the held-item command (its first SEs fall before that command's first frame).
    const next = after.segments[after.segmentIndex]!.commands[after.commandIndex + 1];
    if (next?.type !== "general-animation" || next.animation !== "HELD_ITEM_EFFECT" || next.timing.minimumFrames >= HELD_ITEM_EFFECT_COMMAND_FRAMES) return;
    if ((after.segments[after.segmentIndex]!.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0) return;
    const side = next.battler === 0 ? "player" : "opponent";
    emitOpsAt(heldItemEffectOps(next.battler), { attackerSide: side, targetSide: next.battler === 0 ? "opponent" : "player" },
      elapsed - command.timing.minimumFrames - (next.timing.minimumFrames - HELD_ITEM_EFFECT_COMMAND_FRAMES), true);
  } else if (command.type === "status-animation") {
    const age = elapsed - (command.timing.seGateFrames ?? 0);
    if (age < 0) return;
    const side = command.battler === 0 ? "player" : "opponent";
    const ops = generalVariant(STATUS_ANIMATION_LABELS[command.animation], command.battler);
    const context = { attackerSide: side, targetSide: side, statusAnimActive: true } as const;
    const scriptAge = statusAnimationScriptAge(after, command.animation);
    emitOpsAt(ops, context, age - scriptAge, true);
    if (age === scriptAge) scheduleStatusAnimationTail(ops, context, command.timing.minimumFrames - (command.timing.seGateFrames ?? 0), scriptAge);
  } else if (command.type === "general-animation" && command.animated === true && isWeatherContinuesAnimation(command.animation)) {
    const age = elapsed - WEATHER_CONTINUES_LAUNCH_LEAD_ROWS;
    if (age < 0) return;
    // rnc1: General_Rain's script row 0 is the command's row RAIN_CONTINUES_SCRIPT_START_ROWS (the playanimation row; RAM-read rows,
    // docs/rnc1-rain-continues.md), so SE_M_RAIN_DANCE (script row 3) plays at command row 5 as on the ROM; it was 7 rows late.
    // sst1: General_Sandstorm's sounds run on the body's own clock (the art's: weatherContinuesBodyEffect draws script row `age`); on the
    // move-body sound clock SE_M_SANDSTORM played 8 rows after the ROM's (frame catcher, 15 end turns: 7 frames before the first sand
    // picture on the ROM, 1 after on ours, the pictures frame for frame the ROM's). hit2: Hail's General_Hail is the same script and the same clock (labs etp1-hail-on / etp2-hail-on: its 10 SEs were +8). Sun keeps the move-body clock (not in the sweep).
    const scriptRow = command.animation === "RAIN_CONTINUES" ? elapsed - RAIN_CONTINUES_SCRIPT_START_ROWS
      : command.animation === "SANDSTORM_CONTINUES" || command.animation === "HAIL_CONTINUES" ? age : age - WEATHER_SCRIPT_AGE;
    emitOpsAt(generalVariant(WEATHER_LABELS[command.animation], command.battler), {
      attackerSide: command.battler === 0 ? "player" : "opponent", targetSide: command.battler === 0 ? "opponent" : "player",
    }, scriptRow, true);
  } else if (command.type === "general-animation") {
    const side = command.battler === 0 ? "player" : "opponent";
    const other = command.battler === 0 ? "opponent" : "player";
    if (command.animation === "CASTFORM_CHANGE") {
      // Plays in both scenes (Cmd_docastformchangeanimation has no HITMARKER_NO_ANIMATIONS test; the Scene OFF ROM plays SE 203 / 204 too).
      emitOpsAt(generalVariant("General_CastformChange", command.battler), { attackerSide: side, targetSide: other }, elapsed - (command.castformLeadExtra ?? 0) - CASTFORM_CHANGE_SCRIPT_AGE, true);
    } else if ((after.segments[after.segmentIndex]!.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0) {
      if (command.animation === "FOCUS_PUNCH_SETUP" && command.timing.minimumFrames !== FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES) {
        emitOpsAt(generalVariant("General_FocusPunchSetUp", command.battler), { attackerSide: side, targetSide: other }, elapsed - FOCUS_PUNCH_SETUP_SCRIPT_AGE, true);
      } else if (command.animation === "HELD_ITEM_EFFECT") {
        emitOpsAt(heldItemEffectOps(command.battler), { attackerSide: side, targetSide: other }, elapsed - (command.timing.minimumFrames - HELD_ITEM_EFFECT_COMMAND_FRAMES), true);
      } else if (command.animation === "WISH_HEAL") {
        emitOpsAt(generalVariant("General_WishHeal", command.battler), { attackerSide: side, targetSide: other }, elapsed - WISH_HEAL_SCRIPT_AGE, true);
      } else if (command.animation === "FUTURE_SIGHT_HIT") {
        emitOpsAt(generalVariant("General_FutureSightHit", command.battler), { attackerSide: side, targetSide: other }, elapsed - FUTURE_SIGHT_HIT_SCRIPT_AGE, true);
      } else if (command.animation === "FOCUS_BAND") {
        emitOpsAt(generalVariant("General_FocusBand", command.battler), { attackerSide: side, targetSide: other }, elapsed - FOCUS_BAND_SCRIPT_AGE, true);
      } else if (command.animation === "INGRAIN_HEAL") {
        emitOpsAt(generalVariant("General_IngrainHeal", command.battler), { attackerSide: side, targetSide: side }, elapsed - INGRAIN_HEAL_SCRIPT_AGE, true);
      } else if (command.animation === "TURN_TRAP") {
        const branch = turnTrapBranchOf(command.trapMove ?? 0);
        emitOpsAt(generalVariant(TURN_TRAP_SCRIPT_LABEL[branch], command.battler), { attackerSide: side, targetSide: side }, elapsed - TURN_TRAP_SCRIPT_AGE, true);
        const stop = TURN_TRAP_STOP[branch];
        if (stop !== undefined && elapsed === stop.age + TURN_TRAP_SCRIPT_AGE) emitSound({ kind: "stop", id: stop.id, pan: null, player: stop.player });
      } else if (command.animation === "LEECH_SEED_DRAIN" && command.animated === true) {
        // command.battler is the seeded (drained) battler = the animation's target; the seeder is the attacker.
        emitOpsAt(generalVariant("General_LeechSeedDrain", command.battler === 0 ? 1 : 0), { attackerSide: other, targetSide: side }, elapsed - LEECH_SEED_DRAIN_SCRIPT_AGE, true);
      }
    }
  }
}
