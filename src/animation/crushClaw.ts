import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

/**
 * Complete source-relative `Move_CRUSH_CLAW` visual body.
 *
 * Ages are RAM truth relative to the move-owned window (frame 77 player-back /
 * 81 opponent-front, so both orientations share the same ages and differ only
 * in the lunge's sign and the battler geometry). Every visible event displays
 * exactly ONE frame after the RAM state that causes it, so the draw case
 * applies the shared one-display latch and this reducer stays calibrated to
 * the probe's RAM readings.
 *
 * The whole window is static except for the settled event list
 * (`tools/compare/evidence/crush-claw-changemap-*.txt`):
 * - the horizontal lunge (duration 6, xDelta 4, opponent negated) moves the
 *   attacker +4..+24 over RAM ages 13-18, holds 24 at ages 19-20, and comes
 *   back 20..0 over ages 21-26 (displayed 14-27).
 * - the first claw-slash pair (x=-10, animation=0) spawns at RAM age 19 and
 *   animates 5 frames (cmdIndex 0..4, 4 ticks each) through RAM age 39; the
 *   second pair (x=+10, animation=1) spawns at RAM age 33 and animates
 *   through RAM age 53.
 * - `AnimTask_ShakeMon2` (xOffset 2, yOffset 0, numTimes 18, frameDelay 1)
 *   toggles the target x2 between +2/-2 every two RAM ages from 19, ending
 *   with the zero write at RAM age 53.
 * - `setalpha 12, 8` (BLDCNT 0x3f40 / BLDALPHA 0x080c) is written at RAM age
 *   13 and cleared (`blendoff`) at RAM age 55; the monbg task runs RAM ages
 *   10..57. Neither blend write produces a pixel change in this window.
 * - `playsewithpan SE_M_RAZOR_WIND, SOUND_PAN_TARGET` fires at RAM ages 19
 *   and 33.
 */
export interface CrushClawSlash {
  readonly spawnAge: number;
  readonly x: number;
  readonly y: number;
  readonly animation: 0 | 1;
  readonly animationFrame: number;
}

export interface CrushClawSoundEvent {
  readonly age: number;
  readonly song: "SE_M_RAZOR_WIND";
  readonly pan: number;
}

export interface CrushClawState {
  readonly attackerX2: number;
  readonly targetX2: number;
  readonly slashes: readonly CrushClawSlash[];
  readonly soundEvents: readonly CrushClawSoundEvent[];
  readonly blendOn: boolean;
  readonly monbg: boolean;
}

export interface CrushClawGeometry {
  readonly attackerSide: "player" | "opponent";
  readonly targetSide: "player" | "opponent";
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

/** RAM age of the lunge's first translated frame. */
export const LUNGE_FIRST_STEP_AGE = 13;
/** RAM age of the first claw-slash pair's spawn frame. */
export const SLASH_1_SPAWN_AGE = 19;
/** RAM age of the ShakeMon2 task's first toggle frame. */
export const SHAKE_FIRST_STEP_AGE = 19;
/** RAM age of the second claw-slash pair's spawn frame. */
export const SLASH_2_SPAWN_AGE = 33;
/** RAM age of the script's trailing `blendoff`. */
export const BLEND_OFF_AGE = 55;

const SLASH_GROUPS = [
  { age: SLASH_1_SPAWN_AGE, x: -10, animation: 0 as const },
  { age: SLASH_2_SPAWN_AGE, x: 10, animation: 1 as const },
] as const;

/** Slash sprite cmdIndex (0..4) at `local` ticks after spawn, then destroy. */
function clawSlashAnimFrame(local: number): number {
  if (local < 0 || local > 20) return -1;
  return Math.min(4, Math.floor((local + 1) / 4));
}

export function crushClawSlashesAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly CrushClawSlash[] {
  return SLASH_GROUPS.flatMap((group) => {
    const local = age - group.age;
    const animationFrame = clawSlashAnimFrame(local);
    if (animationFrame < 0) return [];
    return [-10, 10].map((y) => ({
      spawnAge: group.age,
      x: targetCenter.x + group.x,
      y: targetCenter.y + y,
      animation: group.animation,
      animationFrame,
    }));
  });
}

export function crushClawAtAge(
  age: number,
  geometry: CrushClawGeometry,
): CrushClawState {
  const shake = shakeMon2OffsetAtTick(
    2,
    0,
    18,
    1,
    age - SHAKE_FIRST_STEP_AGE + 1,
  );
  return {
    attackerX2: horizontalLungeX2AtTick(
      6,
      4,
      geometry.attackerSide,
      age - LUNGE_FIRST_STEP_AGE + 1,
    ),
    targetX2: age < SHAKE_FIRST_STEP_AGE ? 0 : shake.x2,
    slashes: crushClawSlashesAtAge(age, geometry.targetCenter),
    soundEvents: [SLASH_1_SPAWN_AGE, SLASH_2_SPAWN_AGE].includes(age)
      ? [{
          age,
          song: "SE_M_RAZOR_WIND",
          pan: geometry.targetSide === "player" ? -63 : 63,
        }]
      : [],
    blendOn: age >= LUNGE_FIRST_STEP_AGE && age < BLEND_OFF_AGE,
    monbg: age >= 10 && age <= 57,
  };
}
