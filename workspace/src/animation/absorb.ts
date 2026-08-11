import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { healingBlueStarsAtAge } from "./recover.ts";

export const ABSORB_ORB_ARGS = Object.freeze([
  Object.freeze({ x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }),
  Object.freeze({ x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }),
  Object.freeze({ x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 }),
  Object.freeze({ x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 }),
  Object.freeze({ x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }),
  Object.freeze({ x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }),
  Object.freeze({ x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 }),
  Object.freeze({ x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 }),
] as const);

export const ABSORB_ORB_FIRST_AGE = 34;
// A literal `delay 4` occupies six rendered scheduler passes.
export const ABSORB_ORB_SPAWN_PERIOD = 6;
export const ABSORB_HEALING_FIRST_AGE = 129;
export const ABSORB_BODY_LAST_AGE = 193;

export type AbsorbSound =
  | "SE_M_ABSORB"
  | "SE_M_CRABHAMMER"
  | "SE_M_ABSORB_2";

export interface AbsorbSprite {
  readonly kind: "hitsplat" | "orb" | "star";
  readonly spawnIndex: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: number;
  readonly xScale: number;
  readonly yScale: number;
}

export interface AbsorbState {
  readonly sprites: readonly AbsorbSprite[];
  readonly targetX2: number;
  readonly targetY2: number;
  readonly targetOnMonBg: boolean;
  readonly splitBgPriorityFoes: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly bgPaletteBlendY: number;
  readonly bgPaletteBlendColor: 0x33ed;
  readonly paletteControllerActive: boolean;
  readonly soundRestart: AbsorbSound | null;
  readonly active: boolean;
}

function gbaSin(index: number, amplitude: number): number {
  return Math.floor(GBA_SINE_TABLE_256[index & 0xff]! * amplitude / 256);
}

function bgPaletteBlendYAtAge(age: number): number {
  if (age < 5 || age >= 183) return 0;
  if (age < 8) return 2;
  if (age < 178) return 4;
  if (age < 180) return 4;
  return 2;
}

function absorptionOrbAtAge(
  age: number,
  index: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
): AbsorbSprite | null {
  const local = age - ABSORB_ORB_FIRST_AGE - index * ABSORB_ORB_SPAWN_PERIOD;
  const args = ABSORB_ORB_ARGS[index]!;
  if (local < 0 || local >= args.wavePeriod) return null;
  const callbacks = local + 1;
  const startX = targetCenter.x + (attackerSide === "player" ? args.x : -args.x);
  const startY = targetCenter.y + args.y;
  const x2 = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(attackerCenter.x - startX, args.wavePeriod),
    callbacks,
    args.wavePeriod,
  );
  const linearY = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(attackerCenter.y - startY, args.wavePeriod),
    callbacks,
    args.wavePeriod,
  );
  const angle = (Math.trunc(0x8000 / args.wavePeriod) * callbacks) >> 8;
  // The affine interpreter consumes one command before the creation
  // callback and another on the first displayed AnimateSprites pass.
  const affineScale = 256 - 5 * (callbacks + 1);
  const matrix = Math.trunc(0x10000 / affineScale);
  return {
    kind: "orb",
    spawnIndex: index,
    x: startX,
    y: startY,
    x2,
    y2: linearY + gbaSin(angle, args.waveAmplitude),
    frame: 8,
    xScale: matrix,
    yScale: matrix,
  };
}

/** Complete source-owned `Move_ABSORB` visual body, relative to `monbg`. */
export function absorbAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
  healingCenter: Readonly<{ x: number; y: number }> = attackerCenter,
): AbsorbState {
  const sprites: AbsorbSprite[] = [];
  if (age >= 16 && age <= 25) {
    sprites.push({
      kind: "hitsplat", spawnIndex: 0,
      x: targetCenter.x, y: targetCenter.y, x2: 0, y2: 0,
      frame: 2, xScale: 372, yScale: 372,
    });
  }
  for (let index = 0; index < ABSORB_ORB_ARGS.length; index++) {
    const orb = absorptionOrbAtAge(
      age, index, targetCenter, attackerCenter, attackerSide,
    );
    if (orb) sprites.push(orb);
  }
  sprites.push(...healingBlueStarsAtAge(
    age - ABSORB_HEALING_FIRST_AGE,
    attackerSide,
    healingCenter,
  ).map((sprite): AbsorbSprite => ({
    kind: "star", spawnIndex: sprite.spawnIndex,
    x: sprite.x, y: sprite.y, x2: 0, y2: 0, frame: sprite.frame,
    xScale: sprite.xScale, yScale: sprite.yScale,
  })));
  // The creation pass is not displayed; five on/off toggles leave the two
  // complete two-display "on" intervals below before the terminal reset.
  const shakeY = (age >= 22 && age <= 23) || (age >= 26 && age <= 27)
    ? 5 : 0;
  const orbRestart = age >= ABSORB_ORB_FIRST_AGE
    && age <= ABSORB_ORB_FIRST_AGE + 7 * ABSORB_ORB_SPAWN_PERIOD
    && (age - ABSORB_ORB_FIRST_AGE) % ABSORB_ORB_SPAWN_PERIOD === 0;
  return {
    sprites,
    targetX2: 0,
    targetY2: shakeY,
    targetOnMonBg: age >= 0 && age < 191,
    splitBgPriorityFoes: age >= 0 && age < 191,
    alpha: age >= 3 && age < 191 ? { eva: 12, evb: 8 } : null,
    bgPaletteBlendY: bgPaletteBlendYAtAge(age),
    bgPaletteBlendColor: 0x33ed,
    paletteControllerActive:
      (age >= 3 && age <= 14) || (age >= 178 && age <= 189),
    soundRestart: age === 16 ? "SE_M_ABSORB"
      : orbRestart ? "SE_M_CRABHAMMER"
      : age === ABSORB_HEALING_FIRST_AGE ? "SE_M_ABSORB_2" : null,
    active: age >= 0 && age <= ABSORB_BODY_LAST_AGE,
  };
}
