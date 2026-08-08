import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { metallicShineAtAge, type MetallicShineState } from "./metallicShine.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";

/**
 * Complete source-relative `Move_IRON_TAIL` visual body.
 *
 * Ages are RAM truth relative to the move-owned window (frame 216 player-back
 * / 215 opponent-front, so both orientations share the same ages and differ
 * only in the lunge's sign and the battler geometry). Every visible event
 * displays exactly ONE frame after the RAM state that causes it, so the
 * draw case applies the shared one-display latch and this reducer stays
 * calibrated to the probe's RAM readings.
 *
 * The whole window is static except for the settled event list
 * (`tools/compare/evidence/iron-tail-changemap-*.txt`):
 * - grayscale ON displays at age 7 (RAM `SetGrayscaleOrOriginalPalette`
 *   write at age 6) and stays on through the lunge/hitsplat/shake until the
 *   script's trailing `set_original_pal` (RAM age 126, displayed 127).
 * - the metallic-shine band renders only while `data10 >= 28`: sweep 1
 *   displays ages 13-37 and sweep 2 ages 45-69. Sweep 3 is invisible
 *   (`ClearBattleAnimBg` already ran) and the wrap frames (data10 0..24,
 *   displayed 38-44) are static.
 * - the horizontal lunge (duration 4, xDelta 4, opponent negated) moves the
 *   attacker +4..+16 over RAM ages 107-110, holds 16 at 111-112, and comes
 *   back 12..0 over 113-116 (displayed 108-117).
 * - the basic hitsplat (animation=2, 0xB0 scale) is RAM-visible ages
 *   115-124 (displayed 116-125); the ShakeMon (3, 0, 6, 1) toggles the
 *   target x2 3<->0 over RAM ages 117-124 (displayed 118-125).
 */
export interface IronTailState {
  readonly metallic: MetallicShineState;
  readonly attackerX2: number;
  readonly targetX2: number;
  readonly hitsplatVisible: boolean;
  readonly monbg: boolean;
  readonly alpha: boolean;
  readonly attackerPaletteRestored: boolean;
}

export interface IronTailSoundEvent {
  readonly age: number;
  readonly song: "SE_M_HARDEN" | "SE_M_VITAL_THROW2";
  readonly pan: number;
}

/** RAM age of the MetallicShine initializer's first step (the grayscale write). */
const METALLIC_SHINE_FIRST_STEP_AGE = 6;
/** RAM age of the horizontal lunge helper's first translated frame. */
const LUNGE_FIRST_STEP_AGE = 107;
/** RAM age of the hitsplat sprite's spawn frame. */
const HITSPLAT_SPAWN_AGE = 115;
/** RAM age of the ShakeMon task's first step write (target x2 leaves idle). */
const SHAKE_FIRST_STEP_AGE = 115;
/** RAM age of the script's trailing `set_original_pal`. */
const SET_ORIGINAL_PAL_AGE = 126;

export function ironTailAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): IronTailState {
  const shineAge = age - METALLIC_SHINE_FIRST_STEP_AGE + 1;
  const metallic = metallicShineAtAge(
    shineAge,
    attackerCenter.x,
    attackerCenter.y,
    true,
  );
  // The band only renders once the scrolled metal strip enters the attacker's
  // box (data10 28..124); the first seven callbacks of each sweep and the
  // wrap frames (data10 0..24) produce no pixels, and sweep 3 (data11==2)
  // is invisible because ClearBattleAnimBg already ran.
  const bandVisible = metallic.maskSpriteActive && metallic.data10 >= 28;
  return {
    metallic: {
      ...metallic,
      maskSpriteActive: bandVisible,
      metalBgLoaded: bandVisible,
    },
    attackerX2: horizontalLungeX2AtTick(
      4,
      4,
      attackerSide,
      age - LUNGE_FIRST_STEP_AGE + 1,
    ),
    targetX2: age < SHAKE_FIRST_STEP_AGE
      ? 0
      : shakeMonOffsetAtTick(
          3,
          0,
          6,
          1,
          age - SHAKE_FIRST_STEP_AGE + 1,
        ).x2,
    hitsplatVisible: age >= HITSPLAT_SPAWN_AGE && age <= HITSPLAT_SPAWN_AGE + 9,
    monbg: age >= 104 && age <= 132,
    alpha: age >= 107 && age <= 125,
    attackerPaletteRestored: age >= SET_ORIGINAL_PAL_AGE,
  };
}

/** Sound events used by the looped/single SE tasks (component-axis evidence). */
export function ironTailSoundEventsAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  targetSide: "player" | "opponent",
): readonly IronTailSoundEvent[] {
  const events: IronTailSoundEvent[] = [];
  if (age >= 4 && age <= 33) {
    events.push({
      age,
      song: "SE_M_HARDEN",
      pan: attackerSide === "player" ? -64 : 63,
    });
  }
  if (age === HITSPLAT_SPAWN_AGE) {
    events.push({
      age,
      song: "SE_M_VITAL_THROW2",
      pan: targetSide === "player" ? -63 : 63,
    });
  }
  return events;
}
