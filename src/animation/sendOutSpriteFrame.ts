import selectorTables from "../data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import frontPicAnimPrograms from "../data/gen/front-pic-anim-programs.json" with { type: "json" };

/**
 * Rung-3 send-out sprite-frame half (ISSUES #71 cross-lane ask item 2).
 *
 * The front send-out plays TWO concurrent state machines: the movement anim
 * (dispatched by `frontSendOutFrameAtTick`, `sendOutDispatcher.ts`) and the
 * sprite's own ANIMCMD playback, which picks which of the two front-pic frames
 * is on screen. This module is the species-generic half: it resolves the
 * species' index-1 ANIMCMD program (`sAnim_<Name>_1`, extracted to
 * `front-pic-anim-programs.json`) and reduces a tick to the frame that renders.
 *
 * Anchor: tick 0 = the tick `StartSpriteAnim(sprite, 1)` runs, which is the
 * same `affineAnimEnded` tick on which the movement-anim clock of
 * `frontSendOutFrameAtTick` starts; unlike the movement anim, this program is
 * never deferred by animationDelay. The engine-visible OAM latch may trail by
 * one display frame (see `src/engine/kabutoSendOut.ts` doc comments); modeling
 * that latch is the consumer's render-seam concern, not this reducer's.
 */

const generatedPrograms = frontPicAnimPrograms.species as Readonly<
  Record<string, ReadonlyArray<{ readonly frame: number; readonly duration: number }>>
>;
const generatedFrontAnimIds = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;

/** Source predicate `HasTwoFramesAnimation` (reference/pokeemerald/src/pokemon.c:6988). */
const TWO_FRAMES_EXCLUDED: ReadonlySet<string> = new Set(["CASTFORM", "DEOXYS", "SPINDA", "UNOWN"]);

/**
 * `HasTwoFramesAnimation(species)` — TRUE for every species except CASTFORM,
 * DEOXYS, SPINDA and UNOWN (src/pokemon.c:6988). Species with no index-1
 * program (not keyed in `front-pic-anim-programs.json`, e.g. SPINDA) also
 * report false — the ANIMCMD program never starts for them.
 */
export function hasTwoFramesAnimation(species: string): boolean {
  if (!(species in generatedPrograms)) return false;
  return !TWO_FRAMES_EXCLUDED.has(species);
}

/**
 * Frame (0 or 1) of `species`' front-pic ANIMCMD program at
 * `ticksSinceAnimStart`, or null when the input cannot resolve to a frame.
 *
 * - null when the tick is negative or non-integer, or when `species` has no
 *   program entry AND is not a known selector-tables species (unknown strings
 *   are rejected defensively rather than guessed).
 * - 0 when `hasTwoFramesAnimation(species)` is false — the program never
 *   starts and frame 0 is what renders.
 * - otherwise the program is walked cumulatively: the returned frame is the
 *   step whose `[start, start + duration)` window contains the tick. Past the
 *   end, playback has stopped and the sprite keeps the last step's frame
 *   (`ANIMCMD_END` semantics), so the last step's frame is returned. A step
 *   frame outside 0|1 for a two-frames species throws loudly — the index-1
 *   programs are two-frame anims so this should be impossible.
 *
 * Anchor: tick 0 = the tick `StartSpriteAnim(sprite, 1)` runs, which is the
 * same `affineAnimEnded` tick on which the movement-anim clock of
 * `frontSendOutFrameAtTick` starts; unlike the movement anim, this program is
 * never deferred by animationDelay. The engine-visible OAM latch may trail by
 * one display frame (see `src/engine/kabutoSendOut.ts` doc comments); modeling
 * that latch is the consumer's render-seam concern, not this reducer's.
 */
export function frontSendOutSpriteFrameAtTick(species: string, ticksSinceAnimStart: number): 0 | 1 | null {
  if (!Number.isInteger(ticksSinceAnimStart) || ticksSinceAnimStart < 0) return null;
  const known = species in generatedPrograms || species in generatedFrontAnimIds;
  if (!known) return null;
  if (!hasTwoFramesAnimation(species)) return 0;
  const program = generatedPrograms[species];
  let consumed = 0;
  let lastFrame: number = 0;
  for (const step of program) {
    if (step.frame !== 0 && step.frame !== 1) {
      throw new Error(
        `frontSendOutSpriteFrameAtTick: ${species} index-1 program step frame ${step.frame} outside 0|1`,
      );
    }
    if (ticksSinceAnimStart < consumed + step.duration) return step.frame;
    consumed += step.duration;
    lastFrame = step.frame;
  }
  return lastFrame as 0 | 1;
}
