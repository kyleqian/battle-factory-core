// S11 aud242a: the script-level move-animation SEs (playsewithpan / playse / waitplaysewithpan / loopsewithpan) of a live Scene ON move
// animation, at the frame the decoded script command executes. Write-only presentation (src/audio/soundEvents.ts): reads the resolution
// presentation, never changes it. Data: src/data/gen/anim-sound-timing.json (tools/extract/extract-anim-sound-timing.ts). docs/aud242-move-anim-sounds.md.
import timingData from "../data/gen/anim-sound-timing.json" with { type: "json" };
import { animSoundPan, emitSound } from "../audio/soundEvents.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import { liveMoveSourceAge } from "./battleResolutionPresentationRender.ts";

interface TimedOp {
  readonly op: "playsewithpan" | "playse" | "waitplaysewithpan" | "loopsewithpan";
  readonly frame: number;
  readonly id: number;
  readonly pan: number | null;
  readonly wait?: number;
  readonly times?: number;
}
interface TimingTable {
  readonly turns: number;
  readonly variants: readonly (readonly TimedOp[])[];
  readonly moves: readonly Readonly<{ move: number; variants: readonly number[] }>[];
}
const timing = timingData as unknown as TimingTable;

/** Body age of the script's first command (script frame 0). */
const FIRST_COMMAND_AGE = 1;
/** Scene ON controller lag between the script's sound call and the session tick (the ROM windows, tests/aud242aMoveAnimSounds.test.ts; same 7 as battleHitSounds SCENE_ON_LAG). */
const AGE_TO_SOUND_ROWS = 7;

/** The script frames (relative to the script start) at which an op plays: loopsewithpan is t0, t0 + wait, then every wait + 1 frames. */
function playFrames(op: TimedOp): readonly number[] {
  if (op.op !== "loopsewithpan") return [op.frame];
  const wait = op.wait ?? 0;
  const frames: number[] = [];
  for (let play = 0; play < (op.times ?? 1); play += 1) frames.push(play === 0 ? op.frame : op.frame + wait + (play - 1) * (wait + 1));
  return frames;
}

function variantOf(move: number, turn: number): readonly TimedOp[] {
  const entry = timing.moves[move];
  if (entry === undefined) return [];
  const turnIndex = turn < timing.turns ? turn : timing.turns - 2 + (turn & 1);
  return timing.variants[entry.variants[turnIndex]!]!;
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
  for (const op of variantOf(request.moveId, request.turn)) {
    for (const frame of playFrames(op)) {
      if (age !== frame + FIRST_COMMAND_AGE + AGE_TO_SOUND_ROWS) continue;
      emitSound({ kind: "se", id: op.id, pan: op.pan === null ? null : animSoundPan(op.pan, context) });
    }
  }
}
