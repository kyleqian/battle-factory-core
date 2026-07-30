import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type PresentBranch = "damage" | "heal";
export type PresentSide = "player" | "opponent";
export interface PresentPoint { readonly x: number; readonly y: number }
export interface PresentMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface PresentBag {
  readonly slot: 3;
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly matrix: PresentMatrix;
  readonly callback: "AnimItemSteal_Step1" | "AnimItemSteal_Step2";
}

export interface PresentEffectSprite {
  readonly kind: "explosion" | "greenSparkle" | "blueStar";
  readonly sourceIndex: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly frame: number;
  readonly callback: "AnimSpriteOnMonPos" | "AnimPresentHealParticle";
}

export interface PresentState {
  readonly active: boolean;
  readonly branch: PresentBranch;
  readonly itemBagLoaded: boolean;
  readonly explosionLoaded: boolean;
  readonly greenSparkleLoaded: boolean;
  readonly blueStarLoaded: boolean;
  readonly bag: PresentBag | null;
  readonly explosions: readonly PresentEffectSprite[];
  readonly greenSparkles: readonly PresentEffectSprite[];
  readonly blueStars: readonly PresentEffectSprite[];
  readonly sound:
    | "SE_M_TAIL_WHIP"
    | "SE_M_BUBBLE2"
    | "SE_M_SELF_DESTRUCT"
    | "SE_M_MORNING_SUN"
    | "SE_M_ABSORB_2"
    | null;
  readonly soundSide: PresentSide | null;
}

export const PRESENT_DAMAGE_FRAME_COUNT = 201;
export const PRESENT_HEAL_FRAME_COUNT = 252;

const EXPLOSION_START_AGES = [118, 126, 134, 142, 150] as const;
const EXPLOSION_OFFSETS = [
  { x: 0, y: 0, slot: 3 },
  { x: 24, y: -24, slot: 4 },
  { x: -16, y: 16, slot: 5 },
  { x: -24, y: -12, slot: 3 },
  { x: 16, y: 16, slot: 4 },
] as const;
const GREEN_START_AGES = [121, 126, 131, 136, 141, 146, 151, 156, 161] as const;
const GREEN_X = [-16, 16, 32, -32, 0, -8, -8, 24, -24] as const;
const GREEN_SLOTS = [3, 4, 5, 7, 3, 4, 5, 7, 3] as const;
const STAR_START_AGES = [198, 207, 216, 225] as const;
const STAR_OFFSETS = [
  { x: 0, y: -5, slot: 3 },
  { x: -15, y: 10, slot: 4 },
  { x: -15, y: -15, slot: 5 },
  { x: 10, y: -5, slot: 3 },
] as const;
const BAG_WOBBLE_2 = [
  1, 2, 1, 0, -1, -2, -1, 0, 1, 2,
  1, 0, -1, -2, -1, 0, 1, 2, 1, 0,
] as const;
const STAR_FRAMES = [
  0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4,
  4, 4, 5, 5, 5, 6, 6, 0, 0, 0,
] as const;

function trunc(value: number): number {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

function matrixForAngle(angle: number): PresentMatrix {
  const a = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
  const b = GBA_SINE_TABLE_256[angle & 0xff]!;
  return { a, b, c: -b, d: a };
}

function bagAngleAtAge(age: number): number {
  if (age >= 4 && age <= 12) return 8 + (age - 4) * 4;
  if (age >= 13 && age <= 32) return 36 - (age - 13) * 4;
  if (age >= 33 && age <= 42) return -36 + (age - 33) * 4;
  if (age >= 74 && age <= 93) return BAG_WOBBLE_2[age - 74]!;
  return 0;
}

function bagAtAge(
  age: number,
  attacker: PresentPoint,
  target: PresentPoint,
): PresentBag | null {
  if (age < 4 || age > 113) return null;
  if (age >= 63) {
    return {
      slot: 3,
      x: attacker.x + trunc((target.x - attacker.x) * 59 / 60),
      y: attacker.y - 5 + trunc((target.y + 10 - (attacker.y - 5)) * 59 / 60),
      y2: 0,
      matrix: matrixForAngle(bagAngleAtAge(age)),
      callback: "AnimItemSteal_Step2",
    };
  }
  const elapsed = age - 4;
  const callbackCount = elapsed + 1;
  const phase = (callbackCount * 6) % 132;
  const bounce = Math.floor(callbackCount * 6 / 132);
  const amplitude = 30 - bounce * 8;
  return {
    slot: 3,
    x: attacker.x + trunc((target.x - attacker.x) * elapsed / 60),
    y: attacker.y - 5
      + trunc((target.y + 10 - (attacker.y - 5)) * elapsed / 60),
    y2: Math.floor(
      GBA_SINE_TABLE_256[(phase + 128) & 0xff]! * amplitude / 256,
    ),
    matrix: matrixForAngle(bagAngleAtAge(age)),
    callback: "AnimItemSteal_Step1",
  };
}

function explosionsAtAge(
  age: number,
  target: PresentPoint,
  mirrorX: boolean,
): PresentEffectSprite[] {
  return EXPLOSION_START_AGES.flatMap((start, sourceIndex) => {
    const elapsed = age - start;
    if (elapsed < 0 || elapsed >= 20) return [];
    const offset = EXPLOSION_OFFSETS[sourceIndex]!;
    return [{
      kind: "explosion" as const,
      sourceIndex,
      slot: offset.slot,
      x: target.x + offset.x * (mirrorX ? -1 : 1),
      y: target.y + offset.y,
      y2: 0,
      frame: Math.min(3, Math.floor((elapsed + 1) / 5)),
      callback: "AnimSpriteOnMonPos" as const,
    }];
  });
}

function greenSparklesAtAge(
  age: number,
  target: PresentPoint,
  mirrorX: boolean,
): PresentEffectSprite[] {
  return GREEN_START_AGES.flatMap((start, sourceIndex) => {
    const elapsed = age - start;
    if (elapsed < 0 || elapsed >= 16) return [];
    return [{
      kind: "greenSparkle" as const,
      sourceIndex,
      slot: GREEN_SLOTS[sourceIndex]!,
      x: target.x + GREEN_X[sourceIndex]! * (mirrorX ? -1 : 1),
      y: target.y + 32,
      y2: -3 * (elapsed + 2),
      frame: Math.min(3, Math.floor((elapsed + 1) / 4)),
      callback: "AnimPresentHealParticle" as const,
    }];
  });
}

function blueStarsAtAge(
  age: number,
  target: PresentPoint,
  mirrorX: boolean,
): PresentEffectSprite[] {
  return STAR_START_AGES.flatMap((start, sourceIndex) => {
    const elapsed = age - start;
    if (elapsed < 0 || elapsed >= STAR_FRAMES.length) return [];
    const offset = STAR_OFFSETS[sourceIndex]!;
    return [{
      kind: "blueStar" as const,
      sourceIndex,
      slot: offset.slot,
      x: target.x + offset.x * (mirrorX ? -1 : 1),
      y: target.y + offset.y,
      y2: 0,
      frame: STAR_FRAMES[elapsed]!,
      callback: "AnimSpriteOnMonPos" as const,
    }];
  });
}

/** Pure source-relative port of Move_PRESENT after controller branch choice. */
export function presentAtAge(
  age: number,
  branch: PresentBranch,
  attackerSide: PresentSide,
  attackerBattlePosition: PresentPoint,
  targetBattlePosition: PresentPoint,
  targetAnimationCenter: PresentPoint = targetBattlePosition,
): PresentState {
  const end = branch === "damage"
    ? PRESENT_DAMAGE_FRAME_COUNT - 1
    : PRESENT_HEAL_FRAME_COUNT - 1;
  const explosionStart = EXPLOSION_START_AGES.includes(
    age as typeof EXPLOSION_START_AGES[number],
  );
  const sound = age === 4
    ? "SE_M_TAIL_WHIP"
    : [20, 36, 58].includes(age)
      ? "SE_M_BUBBLE2"
      : branch === "damage" && explosionStart
        ? "SE_M_SELF_DESTRUCT"
        : branch === "heal" && age === 121
          ? "SE_M_MORNING_SUN"
          : branch === "heal" && age === 198
            ? "SE_M_ABSORB_2"
            : null;
  const soundSide = sound === null
    ? null
    : sound === "SE_M_SELF_DESTRUCT"
        || sound === "SE_M_MORNING_SUN"
        || sound === "SE_M_ABSORB_2"
      ? (attackerSide === "player" ? "opponent" : "player")
      : sound === "SE_M_BUBBLE2" && age === 58
        ? (attackerSide === "player" ? "opponent" : "player")
        : attackerSide;
  return {
    active: age >= 0 && age < end,
    branch,
    itemBagLoaded: age >= 1 && age < end,
    explosionLoaded: branch === "damage" && age >= 115 && age < end,
    greenSparkleLoaded: branch === "heal" && age >= 115 && age < end,
    blueStarLoaded: branch === "heal" && age >= 118 && age < end,
    bag: bagAtAge(age, attackerBattlePosition, targetBattlePosition),
    explosions: branch === "damage"
      ? explosionsAtAge(age, targetBattlePosition, attackerSide === "opponent")
      : [],
    greenSparkles: branch === "heal"
      ? greenSparklesAtAge(
          age,
          targetBattlePosition,
          attackerSide === "opponent",
        )
      : [],
    blueStars: branch === "heal"
      ? blueStarsAtAge(
          age,
          {
            x: targetAnimationCenter.x,
            // CreateHealingEffect's target-side placement applies the
            // player battler's source +8 Y adjustment.
            y: targetAnimationCenter.y
              + (attackerSide === "opponent" ? 8 : 0),
          },
          attackerSide === "opponent",
        )
      : [],
    sound,
    soundSide,
  };
}
