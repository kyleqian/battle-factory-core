/** Pure source-age reducer for Emerald's MOVE_GRUDGE presentation body. */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  updateOrderedSprite,
  type SpriteOrderKey,
} from "./spriteOrder.ts";

export const GRUDGE_FIRST_INACTIVE_AGE = 208;
export const GRUDGE_FLAME_CREATE_AGE = 46;
export const GRUDGE_FLAME_DESTROY_AGE = 132;

export interface GrudgeAnimationProfile {
  readonly flameSlots: readonly [number, number, number, number, number, number];
  /** Relative live sSpriteOrder of the six allocator slots before creation. */
  readonly spriteOrderSeed: readonly [number, number, number, number, number, number];
  readonly attackerSubpriority: number;
  readonly targetSubpriority: number;
  readonly attackerBgPriority: number;
  readonly attackerWidth: number;
  /** Live GetBattlerSpriteCoord(X_2) / GetBattlerYCoordWithElevation pair. */
  readonly flameCenter: Readonly<{ x: number; y: number }>;
  readonly animationRngSeed: number;
}

export interface GrudgeFlame {
  readonly index: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly priority: number;
  readonly subpriority: number;
  readonly frame: 0 | 1 | 2 | 3;
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface GrudgeState {
  readonly age: number;
  readonly active: boolean;
  readonly scriptActive: boolean;
  readonly sourceOffset: number | null;
  readonly sourceWait: number;
  readonly background: "battle" | "ghost";
  readonly bldy: number;
  readonly monBg: Readonly<{ active: boolean; clearing: boolean }>;
  readonly blend: Readonly<{ active: boolean; eva: number; evb: number }>;
  readonly flames: readonly GrudgeFlame[];
  readonly flamePainterOrder: readonly number[];
  readonly resourcesLoaded: boolean;
  readonly animationRng: number;
  readonly audio: readonly Readonly<{ age: number; song: "PSYBEAM" | "EMBER" | "NIGHTMARE"; pan: "attacker" | "target" }>[];
}

const sin = (angle: number, amplitude: number): number =>
  (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;

function animationRngAtAge(seed: number, age: number): number {
  let value = seed >>> 0;
  for (let displayedAge = 1; displayedAge <= Math.max(0, age); displayedAge += 1) {
    // FadeToBg's copy handoff and ClearMonBg's two DMA rows consume the
    // scheduler interval without the ordinary animation-RNG VBlank step.
    if (displayedAge === 27 || displayedAge === 180 || displayedAge === 181) continue;
    value = (Math.imul(value, 1103515245) + 24691) >>> 0;
  }
  return value;
}

function sourceOffsetAtAge(age: number): number | null {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 5;
  if (age <= 45) return 12;
  if (age <= 57) return 28;
  if (age <= 139) return 30;
  if (age <= 177) return 36;
  if (age <= GRUDGE_FIRST_INACTIVE_AGE) return 39;
  return null;
}

function sourceWaitAtAge(age: number): number {
  if (age === 1 || age === 4 || (age >= 7 && age <= 45) || age >= 140) return 1;
  if (age >= 46 && age <= 55) return 56 - age;
  if (age >= 58 && age <= 137) return 138 - age;
  return 0;
}

function backgroundBldy(age: number): number {
  if (age >= 9 && age <= 24) return age - 8;
  if (age >= 25 && age <= 28) return 16;
  if (age >= 29 && age <= 44) return 44 - age;
  if (age >= 142 && age <= 156) return age - 141;
  if (age >= 157 && age <= 160) return 16;
  if (age >= 161 && age <= 176) return 176 - age;
  return 0;
}

function taskCoefficientsAtAge(age: number): readonly [number, number] {
  if (age < GRUDGE_FLAME_CREATE_AGE || age > 133) return [0, 0];
  let stage = 1;
  let timer = 16;
  let eva = 0;
  let evb = 16;
  // Hardware BLDALPHA displays the preceding source task write. Age 46 is
  // the initializer's same-row 0:16 write, so execute through age-1.
  for (let sourceAge = 47; sourceAge < age; sourceAge += 1) {
    if (stage === 1) {
      timer += 1;
      if (timer & 1) { if (eva < 14) eva += 1; }
      else if (evb > 4) evb -= 1;
      if (eva === 14 && evb === 4) { timer = 0; stage = 2; }
    } else if (stage === 2) {
      timer += 1;
      if (timer > 30) { timer = 0; stage = 3; }
    } else if (stage === 3) {
      timer += 1;
      if (timer & 1) { if (eva > 0) eva -= 1; }
      else if (evb < 16) evb += 1;
      if (eva === 0 && evb === 16) stage = 4;
    }
  }
  return [eva, evb];
}

function flameAtAge(
  age: number,
  index: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
  profile: Readonly<GrudgeAnimationProfile>,
): GrudgeFlame | null {
  if (age < GRUDGE_FLAME_CREATE_AGE || age >= GRUDGE_FLAME_DESTROY_AGE) return null;
  const localAge = age - GRUDGE_FLAME_CREATE_AGE;
  const initialAngle = index * 42;
  const angle = (initialAngle + (side === "player" ? -2 : 2) * localAge) & 0xff;
  const verticalCounter = index * 6 + localAge;
  // The initializer seeds data[5] but the callback does not derive data[6]
  // until the first subsequent animation row.
  const verticalAngle = localAge === 0 ? 0 : (verticalCounter * 8) & 0xff;
  const shifted = (angle - 65) & 0xffff;
  const priority = localAge === 0
    ? 2
    : profile.attackerBgPriority + (shifted < 127 ? 1 : 0);
  const frame = (localAge === 0 ? 0 : Math.floor((localAge - 1) / 4) % 4) as 0 | 1 | 2 | 3;
  return {
    index,
    slot: profile.flameSlots[index]!,
    x: center.x,
    y: center.y,
    x2: localAge === 0 ? 0 : sin(angle, Math.floor(profile.attackerWidth / 2) + 8),
    y2: localAge === 0 ? 0 : sin(verticalAngle, 7),
    priority,
    subpriority: profile.attackerSubpriority - 2,
    frame,
    data: [0, side === "player" ? 1 : 0, angle, Math.floor(profile.attackerWidth / 2) + 8, 0, verticalCounter, verticalAngle, 0],
  };
}

function orderKey(flame: Readonly<GrudgeFlame>): SpriteOrderKey {
  return {
    priority: flame.priority,
    subpriority: flame.subpriority,
    oamY: flame.y + flame.y2 - 16,
    affineMode: "off",
    oamSize: 2,
    oamShape: "vertical",
  };
}

function painterOrder(
  age: number,
  side: "player" | "opponent",
  profile: Readonly<GrudgeAnimationProfile>,
): readonly number[] {
  let order = createSpriteOrderState(profile.flameSlots, profile.spriteOrderSeed);
  if (age < GRUDGE_FLAME_CREATE_AGE || age >= GRUDGE_FLAME_DESTROY_AGE) return [];
  for (let index = 0; index < 6; index += 1) {
    const flame = flameAtAge(GRUDGE_FLAME_CREATE_AGE, index, side, profile.flameCenter, profile)!;
    order = createOrderedSprite(order, index, orderKey(flame));
  }
  // The retained source row is sampled after AnimateSprites and the ensuing
  // BuildOamBuffer pass, so its persistent order consumes that row's callback
  // state and preserves exact ties from every preceding pass.
  for (let sourceAge = GRUDGE_FLAME_CREATE_AGE + 1; sourceAge <= age; sourceAge += 1) {
    for (let index = 0; index < 6; index += 1) {
      const flame = flameAtAge(sourceAge, index, side, profile.flameCenter, profile)!;
      order = updateOrderedSprite(order, index, orderKey(flame));
    }
    order = sortSpriteOrder(order);
  }
  return spriteOwnersBackToFront(order);
}

/** Age zero is Move_GRUDGE's first retained pointer-owned source row. */
export function grudgeAtAge(
  age: number,
  side: "player" | "opponent",
  _attackerCenter: Readonly<{ x: number; y: number }>,
  profile: Readonly<GrudgeAnimationProfile>,
): GrudgeState {
  const flames = Array.from({ length: 6 }, (_, index) =>
    flameAtAge(age, index, side, profile.flameCenter, profile)).filter((flame): flame is GrudgeFlame => flame !== null);
  const [eva, evb] = taskCoefficientsAtAge(age);
  return {
    age,
    active: age >= 0 && age <= GRUDGE_FIRST_INACTIVE_AGE,
    scriptActive: age >= 0 && age < GRUDGE_FIRST_INACTIVE_AGE,
    sourceOffset: sourceOffsetAtAge(age),
    sourceWait: sourceWaitAtAge(age),
    background: age >= 25 && age <= 160 ? "ghost" : "battle",
    bldy: backgroundBldy(age),
    monBg: { active: age >= 4 && age <= 180, clearing: age >= 178 && age <= 180 },
    blend: { active: age >= 46 && age <= 133, eva, evb },
    flames,
    flamePainterOrder: painterOrder(age, side, profile),
    resourcesLoaded: age >= 1 && age < GRUDGE_FIRST_INACTIVE_AGE,
    animationRng: animationRngAtAge(profile.animationRngSeed, age),
    audio: [
      ...(age === 7 ? [{ age, song: "PSYBEAM" as const, pan: "attacker" as const }] : []),
      ...([46, 62, 78, 94].includes(age) ? [{ age, song: "EMBER" as const, pan: "attacker" as const }] : []),
      ...(age === 140 ? [{ age, song: "NIGHTMARE" as const, pan: "target" as const }] : []),
    ],
  };
}
