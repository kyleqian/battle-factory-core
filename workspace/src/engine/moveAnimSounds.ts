// S11 aud242a/b/c: the script-level move-animation SEs (playsewithpan / playse / waitplaysewithpan / loopsewithpan / panse* / setpan) of a live Scene ON move
// animation, at the frame the decoded script command executes. Write-only presentation (src/audio/soundEvents.ts): reads the resolution
// presentation, never changes it. Data: src/data/gen/anim-sound-timing.json (tools/extract/extract-anim-sound-timing.ts). docs/aud242-move-anim-sounds.md.
import timingData from "../data/gen/anim-sound-timing.json" with { type: "json" };
import { animSoundPan, animSoundPan2, calculatePanIncrement, emitSound, keepPanInRange, type AnimPanContext, type SoundEmission } from "../audio/soundEvents.ts";
import { scheduleAfter, CRY_MODE_ECHO_END, CRY_MODE_ECHO_START, CRY_MODE_HIGH_PITCH, CRY_MODE_ROAR_1, CRY_MODE_ROAR_2, playAnimTaskCry, scheduleAnimTaskBgmRestore, stopAnimTaskCry } from "./screenSounds.ts";
import { CRY_ECHO_END_FRAMES, CRY_ECHO_START_FRAMES, CRY_HIGH_PITCH_FRAMES, CRY_ROAR_2_FRAMES } from "../data/cryModeFrames.ts";
import { factoryBattleBgm } from "./battleStartSounds.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import { liveMoveSourceAge, statsChangeSourceAge } from "./battleResolutionPresentationRender.ts";
import { FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES, HELD_ITEM_EFFECT_COMMAND_FRAMES, WEATHER_CONTINUES_LAUNCH_LEAD_ROWS, isWeatherContinuesAnimation, type BattleStatusAnimationName, type WeatherContinuesAnimation } from "./battleResolutionPresentation.ts";

export interface TimedOp {
  readonly op: "playsewithpan" | "playse" | "waitplaysewithpan" | "loopsewithpan" | "panse" | "panse_adjustnone" | "panse_adjustall" | "setpan" | "soundtask_loopse" | "soundtask_fireblast" | "soundtask_se1" | "soundtask_se2" | "sprite_confuseray_ball" | "task_rollout" | "task_shockwave_bolt";
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
  readonly moves: readonly Readonly<{ move: number; variants: readonly number[]; pic?: readonly number[]; counter?: readonly number[]; damage?: readonly number[] }>[];
  /** aud242o: per Rollout counter 1..5, the variant index (the walk reads AnimTask_Rollout's length from GetRolloutCounter). */
  readonly counterGrids: readonly (readonly number[])[];
  /** aud258: per Seismic Toss damage level 0..2 (AnimTask_GetSeismicTossDamageLevel: gAnimMoveDmg < 33 / 33..65 / > 65), the variant index. */
  readonly damageGrids: readonly (readonly number[])[];
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
function variantOf(move: number, turn: number, attackerSide: 0 | 1, picY?: (battler: 0 | 1) => number, rolloutCounter?: number, damage?: number): readonly TimedOp[] {
  const entry = timing.moves[move];
  if (entry === undefined) return [];
  const turnIndex = turn < timing.turns ? turn : timing.turns - 2 + (turn & 1);
  const slot = turnIndex * timing.sides + attackerSide;
  const counterGrid = entry.counter === undefined ? undefined : timing.counterGrids[entry.counter[slot]!];
  if (counterGrid !== undefined) return timing.variants[counterGrid[rolloutCounter !== undefined && rolloutCounter >= 1 && rolloutCounter <= 5 ? rolloutCounter - 1 : 0]!]!;
  const damageGrid = entry.damage === undefined ? undefined : timing.damageGrids[entry.damage[slot]!];
  if (damageGrid !== undefined && damage !== undefined) return timing.variants[damageGrid[seismicTossDamageLevel(damage)]!]!;
  const grid = entry.pic === undefined || picY === undefined ? undefined : timing.picGrids[entry.pic[slot]!];
  if (grid !== undefined) {
    const row = timing.picYs[attackerSide]!.indexOf(picY!(attackerSide));
    const column = timing.picYs[1 - attackerSide]!.indexOf(picY!(attackerSide === 0 ? 1 : 0));
    if (row >= 0 && column >= 0) return timing.variants[grid[row * timing.picYs[1 - attackerSide]!.length + column]!]!;
  }
  return timing.variants[entry.variants[slot]!]!;
}

/** StatsChangeAnimation_Step2 plays its SE (battle_anim_utility_funcs.c:561-564) on this stats-change command age. */
export const STATS_CHANGE_SE_AGE = 7;
const SE_M_STAT_INCREASE = 239;
const SE_M_STAT_DECREASE = 245;
const SOUND_PAN_ATTACKER_VALUE = -64;

/** General_StatsChange's SE (both scenes): SE_M_STAT_INCREASE / DECREASE with BattleAnimAdjustPanning2(SOUND_PAN_ATTACKER) for the animated battler. */
export function emitStatsChangeSounds(after: BattleResolutionPresentationState | null): void {
  if (after === null || after.lifecycle.phase !== "presenting") return;
  const source = statsChangeSourceAge(after);
  if (source === null || source.age !== STATS_CHANGE_SE_AGE) return;
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

/** Called once per collected tick with the round's resolution presentation after the tick; emits the ops whose frame is this tick's. */
export function emitMoveAnimSounds(after: BattleResolutionPresentationState | null, frontierBrain = false): void {
  if (after === null || after.lifecycle.phase !== "presenting") return;
  const segment = after.segments[after.segmentIndex];
  if (segment === undefined || (segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0) return;
  const source = liveMoveSourceAge(after);
  if (source === null) return;
  const { request, age } = source;
  const context = {
    attackerSide: request.attacker === 0 ? "player" : "opponent",
    targetSide: request.target === 0 ? "player" : "opponent",
  } as const;
  const scriptRow = age - FIRST_COMMAND_AGE - AGE_TO_SOUND_ROWS;
  emitOpsAt(variantOf(request.moveId, request.turn, request.attacker === 0 ? 0 : 1, source.picOffsetY, request.rolloutCounter, request.damage), context, scriptRow);
  emitCryTaskRows(request.moveId, source.attackerSpecies, context.attackerSide, scriptRow, frontierBrain);
}

const STATUS_ANIMATION_LABELS: Readonly<Record<BattleStatusAnimationName, string>> = {
  PSN: "Status_Poison", CONFUSION: "Status_Confusion", BRN: "Status_Burn", INFATUATION: "Status_Infatuation", SLP: "Status_Sleep",
  PRZ: "Status_Paralysis", FRZ: "Status_Freeze", CURSED: "Status_Curse", NIGHTMARE: "Status_Nightmare",
};
const WEATHER_LABELS: Readonly<Record<WeatherContinuesAnimation, string>> = {
  RAIN_CONTINUES: "General_Rain", SUN_CONTINUES: "General_Sun", SANDSTORM_CONTINUES: "General_Sandstorm", HAIL_CONTINUES: "General_Hail",
};
/** Status-animation command age (rows since the launch, after the IsBattleSEPlaying gate) of the script's first command. */
export const STATUS_ANIMATION_SCRIPT_AGE = 7;
/** Weather-continues body age -> script row: the move-body clock (FIRST_COMMAND_AGE + AGE_TO_SOUND_ROWS). */
const WEATHER_SCRIPT_AGE = FIRST_COMMAND_AGE + AGE_TO_SOUND_ROWS;

/** aud250: command age -> script row of the General_* commands (ROM windows: focus punch x2 sides, leech seed drain x2 sides, castform rain-opp in both scenes). */
export const FOCUS_PUNCH_SETUP_SCRIPT_AGE = 5;
export const LEECH_SEED_DRAIN_SCRIPT_AGE = 7;
export const CASTFORM_CHANGE_SCRIPT_AGE = 5;

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
 * (script row + STATUS_ANIMATION_SCRIPT_AGE) falls at or after the window end; only Status_Poison's 6th SE 148 (age 77 of 71) has one. Sound-only: the window is not lengthened.
 */
function scheduleStatusAnimationTail(ops: readonly TimedOp[], context: AnimPanContext, windowRows: number): void {
  const tailRows = new Set<number>();
  for (const op of ops) for (const row of moveAnimOpRows(op, context, true)) if (op.frame + row.offset + STATUS_ANIMATION_SCRIPT_AGE >= windowRows) tailRows.add(op.frame + row.offset);
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
    emitOpsAt(ops, context, age - STATUS_ANIMATION_SCRIPT_AGE, true);
    if (age === STATUS_ANIMATION_SCRIPT_AGE) scheduleStatusAnimationTail(ops, context, command.timing.minimumFrames - (command.timing.seGateFrames ?? 0));
  } else if (command.type === "general-animation" && command.animated === true && isWeatherContinuesAnimation(command.animation)) {
    const age = elapsed - WEATHER_CONTINUES_LAUNCH_LEAD_ROWS;
    if (age < 0) return;
    emitOpsAt(generalVariant(WEATHER_LABELS[command.animation], command.battler), {
      attackerSide: command.battler === 0 ? "player" : "opponent", targetSide: command.battler === 0 ? "opponent" : "player",
    }, age - WEATHER_SCRIPT_AGE, true);
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
      } else if (command.animation === "LEECH_SEED_DRAIN" && command.animated === true) {
        // command.battler is the seeded (drained) battler = the animation's target; the seeder is the attacker.
        emitOpsAt(generalVariant("General_LeechSeedDrain", command.battler === 0 ? 1 : 0), { attackerSide: other, targetSide: side }, elapsed - LEECH_SEED_DRAIN_SCRIPT_AGE, true);
      }
    }
  }
}
