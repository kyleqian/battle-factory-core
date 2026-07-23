import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";

export type MagbySendOutTint =
  | { kind: "ball"; coeff: number }
  | { kind: "red"; coeff: number };

export interface MagbySendOutAnimation {
  x2: number;
  tint: MagbySendOutTint;
}

function gbaSin(index: number, amplitude: number): number {
  const value = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((value * amplitude) / 256);
}

/**
 * `BACK_ANIM_SHAKE_GLOW_RED` for MAGBY's Docile nature.
 *
 * `logicalTick=0` is the first visible ReleaseMonFromBall frame, not a
 * battle-global clock.  The reducer mirrors `Anim_ShakeGlowRed` and
 * `ShakeGlow_Move` (`pokemon_animation.c`): the red blend is refreshed on
 * even callback counters and the single horizontal shake begins when
 * data[2] reaches 54.
 */
function shakeGlowRed(logicalTick: number): { x2: number; redCoeff: number } {
  // OAM/palette writes performed by this callback are visible on the next
  // captured display frame (the same VBlank ownership lag used elsewhere
  // in the battle renderer).
  const callbacks = Math.max(0, logicalTick - 16);
  let data2 = 0;
  let data5 = 0;
  let x2 = 0;
  let redCoeff = 0;
  for (let callback = 0; callback < callbacks; callback += 1) {
    if (data2 > 127) break;
    if ((data2 & 1) === 0) redCoeff = gbaSin(data2, 12);
    if (data2 >= 54) {
      if (data5 > 20) {
        x2 = 0;
      } else {
        // The back-sprite callback applies the first (and only) shake in
        // the negative direction; data5=0 is the zero-displacement setup
        // callback, then values 1..20 make the visible excursion.
        const displacement = gbaSin(Math.trunc((data5 * 384) / 20) & 255, 6);
        x2 = displacement === 0 ? 0 : -displacement;
        data5 += 1;
      }
    }
    data2 += 1;
  }
  return { x2, redCoeff };
}

/**
 * Source/task-relative palette ownership for the overlapping ball release
 * and MAGBY back animation.  The ball fade task waits for the global fade,
 * then writes coefficients 16..1; the back animation independently writes
 * its even-counter red glow.  These boundaries are callback hand-offs
 * measured from the release clock (task data/OAM probe), not frame colors.
 */
export function magbySendOutAnimation(logicalTick: number): MagbySendOutAnimation {
  const shake = shakeGlowRed(logicalTick);
  if (logicalTick === 16) return { x2: shake.x2, tint: { kind: "ball", coeff: 16 } };
  if (logicalTick >= 17 && logicalTick <= 21) {
    // Before the ball-fade task takes palette ownership, the freshly
    // launched back-animation callback's write is already visible.
    const callbackCounter = logicalTick - 15;
    const lastEvenCounter = callbackCounter - 1 - ((callbackCounter - 1) & 1);
    return { x2: shake.x2, tint: { kind: "red", coeff: gbaSin(lastEvenCounter, 12) } };
  }
  if (logicalTick >= 22 && logicalTick <= 37) {
    return { x2: shake.x2, tint: { kind: "ball", coeff: 38 - logicalTick } };
  }
  // The ball task's final coefficient-1 write remains displayed for one
  // frame after its destruction; the next red callback reaches OBJ palette
  // memory on the following display frame.
  if (logicalTick === 38) return { x2: shake.x2, tint: { kind: "red", coeff: 0 } };
  return { x2: shake.x2, tint: { kind: "red", coeff: shake.redCoeff } };
}
