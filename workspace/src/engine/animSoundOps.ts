// hit1 (docs/hit1-move-hit-timing.md): the pure half of the move-animation sound table (src/data/gen/anim-sound-timing.json, aud242): the resolved ops
// of a body variant and the sound rows each op makes, split out of moveAnimSounds.ts (no change) so the presentation's body length (Cmd_end's
// IsSEPlaying wait, animEndSeWait.ts) reads it without importing the sound emitters, which import the presentation modules back.
import timingData from "../data/gen/anim-sound-timing.json" with { type: "json" };
import { animSoundPan, animSoundPan2, calculatePanIncrement, keepPanInRange, type AnimPanContext, type SoundEmission } from "../audio/soundEvents.ts";

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
export const timing = timingData as unknown as TimingTable;

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
