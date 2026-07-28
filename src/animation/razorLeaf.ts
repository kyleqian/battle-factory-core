import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type RazorLeafSide = "player" | "opponent";
export type RazorLeafSound =
  | "SE_M_POISON_POWDER"
  | "SE_M_RAZOR_WIND2"
  | "SE_M_RAZOR_WIND";

export interface RazorLeafParticle {
  readonly spawnIndex: number;
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly tileOffset: number;
  readonly callback: "step1" | "transition" | "step2";
}

export interface RazorLeafCutter {
  readonly index: number;
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
}

export interface RazorLeafState {
  readonly particles: readonly RazorLeafParticle[];
  readonly cutters: readonly RazorLeafCutter[];
  readonly targetX2: number;
  /** The second literal task is created but immediately aborts in singles. */
  readonly defenderPartnerShakeRequested: boolean;
  readonly defenderPartnerShakeActive: false;
  readonly defenderPartnerOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly soundRestart: RazorLeafSound | null;
  readonly active: boolean;
}

export const RAZOR_LEAF_PARTICLE_FIRST_AGE = 3;
export const RAZOR_LEAF_CUTTER_FIRST_AGE = 101;
export const RAZOR_LEAF_SHAKE_FIRST_AGE = 123;
export const RAZOR_LEAF_BODY_LAST_AGE = 138;

const PARTICLE_ARGS = [
  [-3, -2, 10], [-1, -1, 15], [-4, -4, 7], [3, -3, 11], [-1, -6, 8],
  [2, -1, 12], [-3, -4, 13], [4, -5, 7], [2, -6, 11], [-3, -5, 8],
] as const;
const PARTICLE_TILES = [0, 4, 8, 12, 16, 20, 16, 12, 8, 4] as const;
const POISON_RESTART_AGES = new Set([3, 13, 24, 35, 46]);

function gbaSin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function particleAtAge(
  age: number,
  spawnIndex: number,
  attackerSide: RazorLeafSide,
  origin: Readonly<{ x: number; y: number }>,
): RazorLeafParticle | null {
  const spawnAge = RAZOR_LEAF_PARTICLE_FIRST_AGE + spawnIndex * 4;
  const localAge = age - spawnAge;
  if (localAge < 0) return null;
  const [dx, dy, duration] = PARTICLE_ARGS[spawnIndex]!;
  if (localAge > duration + 80) return null;
  const upwardCallbacks = Math.min(localAge + 1, duration);
  const fallCallbacks = Math.max(0, localAge - duration);
  const initialAngle = (dy & 1) === 0 ? 0 : 128;
  const sway = fallCallbacks === 0
    ? 0
    : gbaSin(initialAngle + (fallCallbacks - 1) * 2, 25);
  return {
    spawnIndex,
    age: localAge,
    x: origin.x + dx * upwardCallbacks,
    y: origin.y + dy * upwardCallbacks,
    x2: attackerSide === "player" ? sway : -sway,
    y2: Math.floor(fallCallbacks / 2),
    tileOffset: PARTICLE_TILES[Math.floor((localAge + 1) / 5) % 10]!,
    callback: localAge < duration
      ? "step1"
      : localAge === duration ? "transition" : "step2",
  };
}

function cutterAtAge(
  age: number,
  index: number,
  attackerSide: RazorLeafSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): RazorLeafCutter | null {
  const localAge = age - RAZOR_LEAF_CUTTER_FIRST_AGE;
  if (localAge < 0) return null;
  const direction = attackerSide === "player" ? 1 : -1;
  const x = attackerCenter.x + direction * 20;
  const y = attackerCenter.y - 10;
  const targetX = targetCenter.x + direction * 20;
  const targetY = targetCenter.y;
  const callbacks = localAge + 1;
  const dx = linearTranslationDeltaQ8(targetX - x, 22);
  const dy = linearTranslationDeltaQ8(targetY - y, 22);
  const x2 = linearTranslationOffsetAfterCallbacks(dx, callbacks, callbacks);
  const linearY = linearTranslationOffsetAfterCallbacks(dy, callbacks, callbacks);
  const wave = gbaSin((Math.trunc(0x8000 / 22) * callbacks) >> 8, index === 0 ? 20 : -20);
  const y2 = linearY + wave;
  if (x + x2 > 256 || x + x2 < -16 || y + y2 > 160 || y + y2 < -16) {
    return null;
  }
  const animation = Math.floor((localAge + 1) / 3) % 4;
  return {
    index,
    age: localAge,
    x,
    y,
    x2,
    y2,
    hFlip: animation === 1 || animation === 2,
    vFlip: animation === 2 || animation === 3,
  };
}

/**
 * Complete source-owned `Move_RAZOR_LEAF` body. `target_both=TRUE` still
 * resolves to the single visible target in singles; SetAverageBattlerPositions
 * duplicates that target rather than consulting the absent partner.
 */
export function razorLeafAtAge(
  age: number,
  attackerSide: RazorLeafSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): RazorLeafState {
  const particles = PARTICLE_ARGS.map((_, index) =>
    particleAtAge(age, index, attackerSide, attackerCenter),
  ).filter((sprite): sprite is RazorLeafParticle => sprite !== null);
  const cutters = [0, 1].map((index) =>
    cutterAtAge(age, index, attackerSide, attackerCenter, targetCenter),
  ).filter((sprite): sprite is RazorLeafCutter => sprite !== null);
  const shake = age < RAZOR_LEAF_SHAKE_FIRST_AGE
    ? { x2: 0, y2: 0 }
    : shakeMon2OffsetAtTick(2, 0, 8, 1, age - RAZOR_LEAF_SHAKE_FIRST_AGE + 1);
  return {
    particles,
    cutters,
    targetX2: shake.x2,
    defenderPartnerShakeRequested: age === RAZOR_LEAF_SHAKE_FIRST_AGE,
    defenderPartnerShakeActive: false,
    defenderPartnerOnMonBg: age >= 0 && age < RAZOR_LEAF_BODY_LAST_AGE,
    alpha: age >= 0 && age < RAZOR_LEAF_BODY_LAST_AGE
      ? { eva: 12, evb: 8 } : null,
    soundRestart: POISON_RESTART_AGES.has(age)
      ? "SE_M_POISON_POWDER"
      : age === RAZOR_LEAF_CUTTER_FIRST_AGE
        ? "SE_M_RAZOR_WIND2"
        : age === RAZOR_LEAF_SHAKE_FIRST_AGE ? "SE_M_RAZOR_WIND" : null,
    active: age >= 0 && age <= RAZOR_LEAF_BODY_LAST_AGE,
  };
}
