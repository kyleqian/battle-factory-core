// S11 aud242a/b/c: the script-level move-animation SEs (playsewithpan / playse / waitplaysewithpan / loopsewithpan / panse* / setpan) of a live Scene ON move
// animation, at the frame the decoded script command executes. Write-only presentation (src/audio/soundEvents.ts): reads the resolution
// presentation, never changes it. Data: src/data/gen/anim-sound-timing.json (tools/extract/extract-anim-sound-timing.ts). docs/aud242-move-anim-sounds.md.
import timingData from "../data/gen/anim-sound-timing.json" with { type: "json" };
import { animSoundPan, animSoundPan2, calculatePanIncrement, emitSound, keepPanInRange, type AnimPanContext, type SoundEmission } from "../audio/soundEvents.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import { liveMoveSourceAge, statsChangeSourceAge } from "./battleResolutionPresentationRender.ts";
import { FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES, HELD_ITEM_EFFECT_COMMAND_FRAMES, WEATHER_CONTINUES_LAUNCH_LEAD_ROWS, isWeatherContinuesAnimation, type BattleStatusAnimationName, type WeatherContinuesAnimation } from "./battleResolutionPresentation.ts";

export interface TimedOp {
  readonly op: "playsewithpan" | "playse" | "waitplaysewithpan" | "loopsewithpan" | "panse" | "panse_adjustnone" | "panse_adjustall" | "setpan" | "soundtask_loopse" | "soundtask_fireblast" | "soundtask_se1" | "soundtask_se2";
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
  readonly moves: readonly Readonly<{ move: number; variants: readonly number[] }>[];
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
    default: return [{ offset: uniformLoop && op.op === "waitplaysewithpan" ? 1 : 0, emission: { kind: "se", id: op.id, pan: animSoundPan(op.pan ?? 0, context) } }];
  }
}

/** The resolved ops of the move's (turn, attacker side) walk: variant index = turn * sides + side (the side-dependent jumpret* branches resolve from the request). */
function variantOf(move: number, turn: number, attackerSide: 0 | 1): readonly TimedOp[] {
  const entry = timing.moves[move];
  if (entry === undefined) return [];
  const turnIndex = turn < timing.turns ? turn : timing.turns - 2 + (turn & 1);
  return timing.variants[entry.variants[turnIndex * timing.sides + attackerSide]!]!;
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

/** Called once per collected tick with the round's resolution presentation after the tick; emits the ops whose frame is this tick's. */
export function emitMoveAnimSounds(after: BattleResolutionPresentationState | null): void {
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
  emitOpsAt(variantOf(request.moveId, request.turn, request.attacker === 0 ? 0 : 1), context, age - FIRST_COMMAND_AGE - AGE_TO_SOUND_ROWS);
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
    emitOpsAt(generalVariant(STATUS_ANIMATION_LABELS[command.animation], command.battler), { attackerSide: side, targetSide: side, statusAnimActive: true }, age - STATUS_ANIMATION_SCRIPT_AGE, true);
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
