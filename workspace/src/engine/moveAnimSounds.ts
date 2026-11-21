// S11 aud242a/b/c: the script-level move-animation SEs (playsewithpan / playse / waitplaysewithpan / loopsewithpan / panse* / setpan) of a live Scene ON move
// animation, at the frame the decoded script command executes. Write-only presentation (src/audio/soundEvents.ts): reads the resolution
// presentation, never changes it. Data: src/data/gen/anim-sound-timing.json (tools/extract/extract-anim-sound-timing.ts). docs/aud242-move-anim-sounds.md.
import { TURN_TRAP_SCRIPT_LABEL, turnTrapBranchOf, type TurnTrapBranch } from "./turnTrapBranch.ts";
import timingData from "../data/gen/anim-sound-timing.json" with { type: "json" };
import { animSoundPan, animSoundPan2, calculatePanIncrement, emitSound, keepPanInRange, type AnimPanContext, type SoundEmission } from "../audio/soundEvents.ts";
import { scheduleAfter, CRY_MODE_ECHO_END, CRY_MODE_ECHO_START, CRY_MODE_HIGH_PITCH, CRY_MODE_ROAR_1, CRY_MODE_ROAR_2, playAnimTaskCry, scheduleAnimTaskBgmRestore, stopAnimTaskCry } from "./screenSounds.ts";
import { CRY_ECHO_END_FRAMES, CRY_ECHO_START_FRAMES, CRY_HIGH_PITCH_FRAMES, CRY_ROAR_2_FRAMES } from "../data/cryModeFrames.ts";
import { factoryBattleBgm } from "./battleStartSounds.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import { liveMoveSourceAge, moveAnimationScriptStartRow, statsChangeSourceAge } from "./battleResolutionPresentationRender.ts";
import { bodyCLeadRuleApplies, bodyStatusTailRuleApplies, FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES, HELD_ITEM_EFFECT_COMMAND_FRAMES, RAIN_CONTINUES_SCRIPT_START_ROWS, WEATHER_CONTINUES_LAUNCH_LEAD_ROWS, isWeatherContinuesAnimation, type BattleStatusAnimationName, type WeatherContinuesAnimation } from "./battleResolutionPresentation.ts";

export interface TimedOp {
  readonly op: "playsewithpan" | "playse" | "waitplaysewithpan" | "loopsewithpan" | "panse" | "panse_adjustnone" | "panse_adjustall" | "setpan" | "soundtask_loopse" | "soundtask_fireblast" | "soundtask_se1" | "soundtask_se2" | "sprite_confuseray_ball" | "task_rollout" | "task_shockwave_bolt" | "sprite_willowisp_orb";
  readonly frame: number;
  readonly id: number | null;
  readonly pan: number | null;
  readonly target?: number;
  readonly inc?: number;
  readonly wait?: number;
  readonly times?: number;
  readonly step?: number;
  readonly gap?: number;
  readonly id2?: number;
}
interface TimingTable {
  readonly turns: number;
  readonly sides: number;
  readonly variants: readonly (readonly TimedOp[])[];
  readonly moves: readonly Readonly<{ move: number; variants: readonly number[]; pic?: readonly number[]; counter?: readonly number[]; damage?: readonly number[]; hp?: readonly number[]; flag?: readonly number[]; flagKind?: "power" | "heal"; elevation?: readonly number[]; top?: readonly number[] }>[];
  /** aud242o: per Rollout counter 1..5, the variant index (the walk reads AnimTask_Rollout's length from GetRolloutCounter). */
  readonly counterGrids: readonly (readonly number[])[];
  /** aud258: per Seismic Toss damage level 0..2 (AnimTask_GetSeismicTossDamageLevel: gAnimMoveDmg < 33 / 33..65 / > 65), the variant index. */
  readonly damageGrids: readonly (readonly number[])[];
  /** aud262: per AnimTask_IsHealingMove result (gAnimMoveDmg > 0 -> 0, else 1), the variant index. */
  readonly flagGrids: readonly (readonly number[])[];
  /** aud262: the sorted distinct GetBattlerElevation values (0 = player / unelevated) and, per class, the variant index (Rapid Spin's AnimTask_RapinSpinMonElevation). */
  readonly elevationClasses: readonly number[];
  /** aud262: BATTLER_COORD_ATTR_TOP classes per side and the per-attacker-class variant grids. */
  readonly topYs: readonly (readonly number[])[];
  readonly topGrids: readonly (readonly number[])[];
  readonly elevationGrids: readonly (readonly number[])[];
  /** aud242l: per side, the sorted distinct pic Y (GetBattlerSpriteFinal_Y(..., TRUE)) a battler on that side can have. */
  readonly picYs: readonly (readonly number[])[];
  /** aud242l: grids of variant indices, row = attacker pic Y class, column = target pic Y class (both in picYs order). */
  readonly picGrids: readonly (readonly number[])[];
  /** aud249: gBattleAnims_StatusConditions + gBattleAnims_General, one variant per attacker side. */
  readonly general: readonly Readonly<{ label: string; variants: readonly number[] }>[];
}
const timing = timingData as unknown as TimingTable;

/** Body age of the script's first command (script frame 0). */
const FIRST_COMMAND_AGE = 1;
/** Scene ON controller lag between the script's sound call and the session tick (the ROM windows, tests/aud242aMoveAnimSounds.test.ts; same 7 as battleHitSounds SCENE_ON_LAG). */
const AGE_TO_SOUND_ROWS = 7;

/** One sound row of an op and its offset (script frames) from the op's own frame. */
export interface OpRow { readonly offset: number; readonly emission: SoundEmission; /** Written by a pan task (RunTasks, after the script step of the same iteration), not by the script command. */ readonly task?: true }

/** loopsewithpan is t0, t0 + wait, then every wait + 1 frames; the status / General launches (ROM T2 windows) play every gap at wait + 1 (`uniform`). */
function loopOffsets(op: TimedOp, uniform: boolean): readonly number[] {
  const wait = op.wait ?? 0;
  const offsets: number[] = [];
  for (let play = 0; play < (op.times ?? 1); play += 1) offsets.push(play === 0 ? 0 : uniform ? play * (wait + 1) : wait + (play - 1) * (wait + 1));
  return offsets;
}

/**
 * Cmd_panse / _adjustnone / _adjustall: PlaySE12WithPanning(currentPan) in the script step, then Task_PanFromInitialToTarget (battle_anim.c:1408-1448)
 * runs from the same iteration's RunTasks: it acts when its counter reaches framesToWait (rows at 0, w + 1, 2 (w + 1), ...), adds the increment,
 * and on reaching the target (or at once for a zero increment) writes the target and ends.
 */
function panRows(op: TimedOp, context: AnimPanContext): readonly OpRow[] {
  const arg = (n: number | null | undefined): number => n ?? 0;
  let current: number, target: number, increment: number;
  if (op.op === "panse") {
    current = animSoundPan(arg(op.pan), context);
    target = animSoundPan(arg(op.target), context);
    increment = calculatePanIncrement(current, target, arg(op.inc));
  } else if (op.op === "panse_adjustall") {
    [current, target, increment] = [animSoundPan2(arg(op.pan), context), animSoundPan2(arg(op.target), context), animSoundPan2(arg(op.inc), context)];
  } else {
    [current, target, increment] = [arg(op.pan), arg(op.target), arg(op.inc)];
  }
  const wait = arg(op.wait);
  const rows: OpRow[] = [{ offset: 0, emission: { kind: "se", id: op.id, pan: current } }];
  const initial = current;
  let pan = current;
  for (let step = 0; step < 512; step += 1) {
    pan += increment;
    const done = increment === 0 || (initial < target ? pan >= target : pan <= target);
    rows.push({ offset: wait + step * (wait + 1), emission: { kind: "pan", id: null, pan: done ? target : pan }, task: true });
    if (done) break;
  }
  return rows;
}

/**
 * SoundTask_LoopSEAdjustPanning (battle_anim_sound_tasks.c): Cmd_createsoundtask calls the Step once in the script step, and RunTasks runs it again in the
 * same iteration and every iteration after. It plays when its play counter (starting at r9 = `gap`) reaches r9, then every gap + 1 calls, with the pan
 * as it stood before this call's pan step; the pan steps by the increment every step + 1 calls (the call that plays its last SE ends the task first).
 * Call 0 is the script step (offset 0); call n >= 1 is RunTasks of iteration n - 1.
 */
function loopSeRows(op: TimedOp, context: AnimPanContext): readonly OpRow[] {
  const arg = (n: number | null | undefined): number => n ?? 0;
  const source = animSoundPan(arg(op.pan), context);
  const target = animSoundPan(arg(op.target), context);
  const increment = calculatePanIncrement(source, target, arg(op.inc));
  const step = arg(op.step);
  const gap = arg(op.gap);
  let playsLeft = arg(op.times);
  let playCounter = gap;
  let panCounter = 0;
  let pan = source;
  const rows: OpRow[] = [];
  for (let call = 0; playsLeft > 0 && call < 4096; call += 1) {
    const offset = call === 0 ? 0 : call - 1;
    if (playCounter++ === gap) {
      playCounter = 0;
      rows.push(call === 0 ? { offset, emission: { kind: "se", id: op.id, pan } } : { offset, emission: { kind: "se", id: op.id, pan }, task: true });
      playsLeft -= 1;
      if (playsLeft === 0) break;
    }
    if (panCounter++ === step) {
      panCounter = 0;
      pan = keepPanInRange(pan + increment);
    }
  }
  return rows;
}

/**
 * AnimConfuseRayBallBounce (battle_anim_ghost.c:220-311, aud242o): the sprite plays the SE itself. Sprite call 0 is the init (script step), call k >= 1 is AnimateSprites of iteration
 * k - 1 (before the same iteration's RunTasks); `times` = D Step1 translate calls (calls 1..D), call D + 1 installs Step2 and plays nothing, Step2 runs calls D + 2..n (`gap`).
 * data[5] (the phase) steps by 5 (mod 256) on every call that does not return early; a call plays when its old phase is 0 or above 196 and the new one is above 0: Step1 with
 * PlaySE12WithPanning(gAnimCustomPanning), Step2 with PlaySE. gAnimCustomPanning is the pan task's data[11] after its calls 0..k - 1 (SoundTask_AdjustPanningVar: call 0 is the
 * creating step, call j >= 1 RunTasks of iteration j - 1, sprites run first); once the task ends it keeps its last value.
 */
function confuseRayBallRows(op: TimedOp, context: AnimPanContext): readonly OpRow[] {
  const arg = (n: number | null | undefined): number => n ?? 0;
  const source = animSoundPan(arg(op.pan), context);
  const target = animSoundPan(arg(op.target), context);
  const increment = calculatePanIncrement(source, target, arg(op.inc));
  const wait = arg(op.wait);
  const [duration, last] = [arg(op.times), arg(op.gap)];
  let [pan, counter, taskDone] = [source, 0, false];
  const stepPanTask = (): void => {
    if (taskDone) return;
    if (counter++ === wait) { counter = 0; pan = keepPanInRange(pan + increment); }
    if (pan === target) taskDone = true;
  };
  stepPanTask();
  const rows: OpRow[] = [];
  let phase = 0;
  for (let call = 1; call <= last; call += 1) {
    if (call !== duration + 1) {
      const [old, next] = [phase, (phase + 5) & 0xff];
      phase = next;
      if ((old === 0 || old > 196) && next > 0) rows.push({ offset: call - 1, emission: { kind: "se", id: op.id, pan: call <= duration ? pan : null } });
    }
    stepPanTask();
  }
  return rows;
}

/**
 * AnimTask_Rollout (battle_anim_rock.c:584-715, aud242o): the entry only sets `func`, so call n >= 1 is RunTasks of iteration n - 1 (offset n - 1). Case 0 plays `id` (SE_M_HEADBUTT) at the
 * start pan on calls 1..10; case 3 (calls 41..40 + D, D = `times`) plays `id2` (SE_M_DIG) every p = max(D / 8 - 1, 1) calls after adding (pan2 - pan1) / D (C division) to the pan.
 */
function rolloutRows(op: TimedOp, context: AnimPanContext): readonly OpRow[] {
  const length = op.times ?? 32;
  const first = animSoundPan(op.pan ?? 0, context);
  const last = animSoundPan(op.target ?? 0, context);
  const increment = Math.trunc((last - first) / length);
  const period = Math.max(Math.trunc(length / 8) - 1, 1);
  const rows: OpRow[] = [];
  for (let call = 1; call <= 10; call += 1) rows.push({ offset: call - 1, emission: { kind: "se", id: op.id, pan: first }, task: true });
  let pan = first;
  for (let step = 1; step <= length; step += 1) {
    if (step % period !== 0) continue;
    pan += increment;
    rows.push({ offset: 40 + step - 1, emission: { kind: "se", id: op.id2 ?? null, pan }, task: true });
  }
  return rows;
}

/**
 * SoundTask_FireBlast: no immediate call, so call n runs in RunTasks of iteration n. Step1 (calls 0..109) plays the loop SE when its counter wraps (call 0,
 * then every 11) with the current pan and then adds the increment (2, signed toward the target); call 110 switches to Step2, which plays the ending SE
 * at the target pan twice, 6 calls apart (calls 111 and 117), and ends.
 */
function fireBlastRows(op: TimedOp, context: AnimPanContext): readonly OpRow[] {
  const source = animSoundPan(-64, context);
  const target = animSoundPan(63, context);
  const increment = calculatePanIncrement(source, target, 2);
  const rows: OpRow[] = [];
  let pan = source;
  let counter = 10;
  for (let call = 0; call < 110; call += 1) {
    if (++counter === 11) {
      counter = 0;
      rows.push({ offset: call, emission: { kind: "se", id: op.id, pan }, task: true });
    }
    pan = keepPanInRange(pan + increment);
  }
  for (const call of [111, 117]) rows.push({ offset: call, emission: { kind: "se", id: op.id2 ?? null, pan: target }, task: true });
  return rows;
}

/**
 * AnimTask_ShockWaveProgressingBolt (battle_anim_electric.c:1153-1266): data[14] starts at BattleAnimAdjustPanning(SOUND_PAN_ATTACKER) and gains data[15] =
 * (BattleAnimAdjustPanning(SOUND_PAN_TARGET) - data[14]) / 3 (C integer division) before each SE_M_THUNDERBOLT; `times` is the ordinal of the SE (1 or 2). The call
 * the SE plays on is in the table (it depends on the attacker's pic Y).
 */
function shockWaveBoltRows(op: TimedOp, context: AnimPanContext): readonly OpRow[] {
  const source = animSoundPan(-64, context);
  const increment = Math.trunc((animSoundPan(63, context) - source) / 3);
  return [{ offset: 0, emission: { kind: "se", id: op.id, pan: source + increment * (op.times ?? 1) }, task: true }];
}

/**
 * mvs1 (docs/mvs1-called-move-sounds.md): AnimWillOWispOrb_Step (battle_anim_fire.c:1166-1186) plays SE_M_FLAME_WHEEL with gAnimCustomPanning. `times` = 0: the
 * orb's own constant pan task (SOUND_PAN_ATTACKER -> SOUND_PAN_ATTACKER) wrote it; else the later SoundTask_AdjustPanningVar (pan / target / inc / wait as written,
 * battle_anim_sound_tasks.c:370-407) has run `times` calls: each call whose counter reaches `wait` adds the increment (KeepPanInRange), and it ends on the target.
 * ROM (frame catcher fcm1, an opponent attacker): pans 63 at script frame 41, then 11, 9, ..., -13 at 91..103 and -17 at 105.
 */
function willOWispOrbRows(op: TimedOp, context: AnimPanContext): readonly OpRow[] {
  let pan = animSoundPan(op.pan ?? 0, context);
  const calls = op.times ?? 0;
  if (calls > 0) {
    const target = animSoundPan(op.target ?? 0, context);
    const increment = calculatePanIncrement(pan, target, op.inc ?? 0);
    let counter = 0;
    for (let call = 0; call < calls && pan !== target; call += 1) {
      if (counter++ === (op.wait ?? 0)) { counter = 0; pan = keepPanInRange(pan + increment); }
    }
  }
  return [{ offset: 0, emission: { kind: "se", id: op.id, pan } }];
}

/** Exported for tests/aud242cMoveAnimSounds.test.ts (the panse_adjustnone / _adjustall / framesToWait arithmetic has no ROM window). */
export function moveAnimOpRows(op: TimedOp, context: AnimPanContext, uniformLoop = false): readonly OpRow[] {
  switch (op.op) {
    case "loopsewithpan": return loopOffsets(op, uniformLoop).map((offset) => ({ offset, emission: { kind: "se", id: op.id, pan: animSoundPan(op.pan ?? 0, context) } }));
    case "playse": return [{ offset: 0, emission: { kind: "se", id: op.id, pan: null } }];
    case "setpan": return [{ offset: 0, emission: { kind: "pan", id: null, pan: animSoundPan(op.pan ?? 0, context) } }];
    case "panse": case "panse_adjustnone": case "panse_adjustall": return panRows(op, context);
    case "soundtask_se1": case "soundtask_se2": return [{ offset: 0, emission: { kind: "se", id: op.id, pan: animSoundPan(op.pan ?? 0, context), player: op.op === "soundtask_se1" ? "SE1" : "SE2" } }];
    case "soundtask_loopse": return loopSeRows(op, context);
    case "soundtask_fireblast": return fireBlastRows(op, context);
    case "sprite_confuseray_ball": return confuseRayBallRows(op, context);
    case "task_rollout": return rolloutRows(op, context);
    case "task_shockwave_bolt": return shockWaveBoltRows(op, context);
    case "sprite_willowisp_orb": return willOWispOrbRows(op, context);
    default: return [{ offset: uniformLoop && op.op === "waitplaysewithpan" ? 1 : 0, emission: { kind: "se", id: op.id, pan: animSoundPan(op.pan ?? 0, context) } }];
  }
}

/** AnimTask_GetSeismicTossDamageLevel (battle_anim_rock.c:836-846): gAnimMoveDmg < 33 -> 0, 33..65 -> 1, > 65 -> 2 (signed compares; a negative value is level 0). */
function seismicTossDamageLevel(damage: number): 0 | 1 | 2 {
  if (damage > 65) return 2;
  return damage < 33 ? 0 : 1;
}

/**
 * The resolved ops of the move's (turn, attacker side) walk: variant index = turn * sides + side (the side-dependent jumpret* branches resolve from the request).
 * A move whose sprite lifetimes depend on the two battlers' pic Y (Blizzard, aud242l) carries a grid per slot; `picY` reads the live values and an unknown class keeps
 * the reference walk.
 */
export interface VariantInputs {
  readonly picY?: (battler: 0 | 1) => number;
  readonly topY?: (battler: 0 | 1) => number;
  readonly rolloutCounter?: number;
  readonly damage?: number;
  /** GetBattlerElevation of the attacker (gEnemyMonElevation / sCastformElevations; 0 for the player). */
  readonly attackerElevation?: number;
  /** GetWaterSpoutPowerForAnim of the attacker (0..3): which quarter of max HP its current HP is in. */
  readonly attackerHpQuarter?: number;
}
export function variantOf(move: number, turn: number, attackerSide: 0 | 1, { picY, topY, rolloutCounter, damage, attackerElevation, attackerHpQuarter }: VariantInputs = {}): readonly TimedOp[] {
  const entry = timing.moves[move];
  if (entry === undefined) return [];
  const turnIndex = turn < timing.turns ? turn : timing.turns - 2 + (turn & 1);
  const slot = turnIndex * timing.sides + attackerSide;
  const counterGrid = entry.counter === undefined ? undefined : timing.counterGrids[entry.counter[slot]!];
  if (counterGrid !== undefined) return timing.variants[counterGrid[rolloutCounter !== undefined && rolloutCounter >= 1 && rolloutCounter <= 5 ? rolloutCounter - 1 : 0]!]!;
  const damageGrid = entry.damage === undefined ? undefined : timing.damageGrids[entry.damage[slot]!];
  if (damageGrid !== undefined && damage !== undefined) return timing.variants[damageGrid[seismicTossDamageLevel(damage)]!]!;
  const flagGrid = entry.flag === undefined || entry.flagKind !== "heal" || damage === undefined ? undefined : timing.flagGrids[entry.flag[slot]!];
  if (flagGrid !== undefined && damage !== undefined) return timing.variants[flagGrid[damage > 0 ? 0 : 1]!]!;
  const elevationGrid = entry.elevation === undefined || attackerElevation === undefined ? undefined : timing.elevationGrids[entry.elevation[slot]!];
  const elevationClass = timing.elevationClasses.indexOf(attackerElevation ?? -1);
  if (elevationGrid !== undefined && elevationClass >= 0) return timing.variants[elevationGrid[elevationClass]!]!;
  const topGrid = entry.top === undefined || topY === undefined ? undefined : timing.topGrids[entry.top[slot]!];
  if (topGrid !== undefined && topY !== undefined) {
    const row = timing.topYs[attackerSide]!.indexOf(topY(attackerSide));
    if (row >= 0) return timing.variants[topGrid[row]!]!;
  }
  const grid = entry.pic === undefined || picY === undefined ? undefined : timing.picGrids[entry.pic[slot]!];
  if (grid !== undefined) {
    const row = timing.picYs[attackerSide]!.indexOf(picY!(attackerSide));
    const column = timing.picYs[1 - attackerSide]!.indexOf(picY!(attackerSide === 0 ? 1 : 0));
    const quarterBase = entry.hp?.[slot] === 1 && attackerHpQuarter !== undefined ? attackerHpQuarter * timing.picYs[attackerSide]!.length * timing.picYs[1 - attackerSide]!.length : 0;
    if (row >= 0 && column >= 0) return timing.variants[grid[quarterBase + row * timing.picYs[1 - attackerSide]!.length + column]!]!;
  }
  return timing.variants[entry.variants[slot]!]!;
}

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
  const genericRow = age - FIRST_COMMAND_AGE - AGE_TO_SOUND_ROWS;
  const start = SCRIPT_START_CLOCK_MOVE_IDS.has(request.moveId) ? moveAnimationScriptStartRow(segment, command.eventSequence) : null;
  const scriptRow = start === null ? genericRow : after.lifecycle.phaseElapsed - (command.timing.seGateFrames ?? 0) - start;
  const ops = variantOf(request.moveId, request.turn, request.attacker === 0 ? 0 : 1, { picY: source.picOffsetY, topY: source.topY, rolloutCounter: request.rolloutCounter, damage: request.damage, attackerElevation: source.attackerElevation, attackerHpQuarter: source.attackerHpQuarter });
  emitQuietBgmRows(request.moveId, source.singBodyRows, scriptRow, frontierBrain);
  emitOpsAt(ops, context, scriptRow);
  if (scriptRow === 0) scheduleMoveAnimationTail(ops, context, lastAge - FIRST_COMMAND_AGE - AGE_TO_SOUND_ROWS + scriptRow - genericRow);
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
export const STATUS_ANIMATION_AUDITED_BODY_SCRIPT_AGE = 0;
function statusAnimationScriptAge(state: BattleResolutionPresentationState, name: BattleStatusAnimationName): number {
  // b4l: the status animation a c-lead B4 body (Thunder Wave, Sing, Will-O-Wisp, Confuse Ray ...) hands over to plays its first SE 3 rows after the command (ROM, the b4m labs), not 10:
  // only the command directly after the body (a `status` command may sit between), so end-of-turn / Toxic / other status animations keep their audited offset.
  const own = state.segments[state.segmentIndex]!.commands;
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
  return name === "SLP" || name === "CONFUSION" ? STATUS_ANIMATION_AUDITED_BODY_SCRIPT_AGE : STATUS_ANIMATION_SCRIPT_AGE;
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
    const scriptRow = command.animation === "RAIN_CONTINUES" ? elapsed - RAIN_CONTINUES_SCRIPT_START_ROWS : age - WEATHER_SCRIPT_AGE;
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
