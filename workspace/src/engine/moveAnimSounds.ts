// S11 aud242a/b/c: the script-level move-animation SEs (playsewithpan / playse / waitplaysewithpan / loopsewithpan / panse* / setpan) of a live Scene ON move
// animation, at the frame the decoded script command executes. Write-only presentation (src/audio/soundEvents.ts): reads the resolution
// presentation, never changes it. Data: src/data/gen/anim-sound-timing.json (tools/extract/extract-anim-sound-timing.ts). docs/aud242-move-anim-sounds.md.
import timingData from "../data/gen/anim-sound-timing.json" with { type: "json" };
import { animSoundPan, animSoundPan2, calculatePanIncrement, emitSound, type AnimPanContext, type SoundEmission } from "../audio/soundEvents.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import { liveMoveSourceAge } from "./battleResolutionPresentationRender.ts";

export interface TimedOp {
  readonly op: "playsewithpan" | "playse" | "waitplaysewithpan" | "loopsewithpan" | "panse" | "panse_adjustnone" | "panse_adjustall" | "setpan";
  readonly frame: number;
  readonly id: number | null;
  readonly pan: number | null;
  readonly target?: number;
  readonly inc?: number;
  readonly wait?: number;
  readonly times?: number;
}
interface TimingTable {
  readonly turns: number;
  readonly sides: number;
  readonly variants: readonly (readonly TimedOp[])[];
  readonly moves: readonly Readonly<{ move: number; variants: readonly number[] }>[];
}
const timing = timingData as unknown as TimingTable;

/** Body age of the script's first command (script frame 0). */
const FIRST_COMMAND_AGE = 1;
/** Scene ON controller lag between the script's sound call and the session tick (the ROM windows, tests/aud242aMoveAnimSounds.test.ts; same 7 as battleHitSounds SCENE_ON_LAG). */
const AGE_TO_SOUND_ROWS = 7;

/** One sound row of an op and its offset (script frames) from the op's own frame. */
export interface OpRow { readonly offset: number; readonly emission: SoundEmission; /** Written by a pan task (RunTasks, after the script step of the same iteration), not by the script command. */ readonly task?: true }

/** loopsewithpan is t0, t0 + wait, then every wait + 1 frames. */
function loopOffsets(op: TimedOp): readonly number[] {
  const wait = op.wait ?? 0;
  const offsets: number[] = [];
  for (let play = 0; play < (op.times ?? 1); play += 1) offsets.push(play === 0 ? 0 : wait + (play - 1) * (wait + 1));
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

/** Exported for tests/aud242cMoveAnimSounds.test.ts (the panse_adjustnone / _adjustall / framesToWait arithmetic has no ROM window). */
export function moveAnimOpRows(op: TimedOp, context: AnimPanContext): readonly OpRow[] {
  switch (op.op) {
    case "loopsewithpan": return loopOffsets(op).map((offset) => ({ offset, emission: { kind: "se", id: op.id, pan: animSoundPan(op.pan ?? 0, context) } }));
    case "playse": return [{ offset: 0, emission: { kind: "se", id: op.id, pan: null } }];
    case "setpan": return [{ offset: 0, emission: { kind: "pan", id: null, pan: animSoundPan(op.pan ?? 0, context) } }];
    case "panse": case "panse_adjustnone": case "panse_adjustall": return panRows(op, context);
    default: return [{ offset: 0, emission: { kind: "se", id: op.id, pan: animSoundPan(op.pan ?? 0, context) } }];
  }
}

/** The resolved ops of the move's (turn, attacker side) walk: variant index = turn * sides + side (the side-dependent jumpret* branches resolve from the request). */
function variantOf(move: number, turn: number, attackerSide: 0 | 1): readonly TimedOp[] {
  const entry = timing.moves[move];
  if (entry === undefined) return [];
  const turnIndex = turn < timing.turns ? turn : timing.turns - 2 + (turn & 1);
  return timing.variants[entry.variants[turnIndex * timing.sides + attackerSide]!]!;
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
  const due: OpRow[] = [];
  for (const op of variantOf(request.moveId, request.turn, request.attacker === 0 ? 0 : 1)) {
    const base = age - FIRST_COMMAND_AGE - AGE_TO_SOUND_ROWS - op.frame;
    if (base < 0) continue;
    for (const row of moveAnimOpRows(op, context)) if (row.offset === base) due.push(row);
  }
  // Per iteration the script step runs before RunTasks: every command's row, then the pan tasks' rows in creation order.
  for (const row of due) if (row.task !== true) emitSound(row.emission);
  for (const row of due) if (row.task === true) emitSound(row.emission);
}
