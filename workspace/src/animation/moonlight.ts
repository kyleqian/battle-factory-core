import {
  healingBlueStarsAtAge,
  type RecoverEffectSprite,
} from "./recover.ts";

export const MOONLIGHT_FRAME_COUNT = 352;
export const MOONLIGHT_MOON_START_AGE = 41;
export const MOONLIGHT_END_FADE_START_AGE = 222;
export const MOONLIGHT_SPRITES_DESTROY_AGE = 245;
export const MOONLIGHT_HEALING_START_AGE = 298;

export const MOONLIGHT_SPARKLE_STARTS =
  Object.freeze([73, 105, 137, 169, 201] as const);
export const MOONLIGHT_SPARKLE_X_OFFSETS =
  Object.freeze([-12, -24, 21, 0, 10] as const);
export const MOONLIGHT_SPARKLE_OAM_SLOTS =
  Object.freeze([4, 5, 7, 9, 10] as const);

export interface MoonlightSparkle {
  readonly kind: "sparkle";
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
}

export interface MoonlightStar {
  readonly kind: "star";
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
}

export interface MoonlightState {
  readonly active: boolean;
  readonly moonLoaded: boolean;
  readonly greenSparkleLoaded: boolean;
  readonly blueStarLoaded: boolean;
  readonly moonVisible: boolean;
  readonly alpha: Readonly<{ eva: number; evb: number }>;
  readonly background:
    | Readonly<{
        mode: "blend";
        target: "black" | "moonWhite";
        coefficient: number;
      }>
    | Readonly<{ mode: "solid"; color: Readonly<{ r: number; g: number; b: number }> }>;
  readonly battlerPaletteCoefficient: number;
  readonly effectPaletteCoefficient: number;
  readonly sparkles: readonly MoonlightSparkle[];
  readonly stars: readonly MoonlightStar[];
  readonly visualTaskCount: number;
  readonly audio: Readonly<{
    moonlightActive: boolean;
    healingActive: boolean;
  }>;
}

/** Source `AnimTask_AlphaFadeIn(0,16,16,0,1)`. */
export function moonlightAlphaAtAge(
  age: number,
): Readonly<{ eva: number; evb: number }> {
  if (age < 42) return { eva: 0, evb: 16 };
  const steps = Math.min(32, Math.floor((age - 42) / 2) + 1);
  const eva = Math.ceil(steps / 2);
  const evb = 16 - Math.floor(steps / 2);
  return { eva, evb };
}

/**
 * Palette state written by the opening `simple_palette_blend` and the
 * background-special case in `AnimTask_MoonlightEndFade`.
 */
export function moonlightBackgroundAtAge(age: number): MoonlightState["background"] {
  if (age < 12) {
    return { mode: "blend", target: "black", coefficient: 0 };
  }
  if (age < MOONLIGHT_END_FADE_START_AGE) {
    return {
      mode: "blend",
      target: "black",
      coefficient: Math.min(16, 2 + 2 * Math.floor((age - 12) / 3)),
    };
  }
  if (age < 275) {
    if (age === MOONLIGHT_END_FADE_START_AGE) {
      return { mode: "solid", color: { r: 0, g: 0, b: 0 } };
    }
    const step = Math.min(16, Math.max(1, age - 221));
    const expand = (channel: number) => (channel << 3) | (channel >> 2);
    if (step === 16) {
      return {
        mode: "solid",
        color: { r: expand(27), g: expand(29), b: expand(31) },
      };
    }
    return {
      mode: "solid",
      color: {
        r: expand(Math.floor(step * 13 / 8)),
        g: expand(Math.floor(step * 14 / 8)),
        b: expand(Math.floor(step * 15 / 8)),
      },
    };
  }
  return {
    mode: "blend",
    target: "moonWhite",
    coefficient: age < 277
      ? 16
      : Math.max(0, 14 - 2 * Math.floor((age - 277) / 2)),
  };
}

export function moonlightEndPaletteCoefficient(age: number): number {
  if (age < 225) return 0;
  if (age < 239) return Math.min(16, 2 + 2 * Math.floor((age - 225) / 2));
  if (age < 278) return 16;
  return Math.max(0, 14 - 2 * Math.floor((age - 278) / 2));
}

export function moonlightSparklesAtAge(
  age: number,
  attackerX: number,
): readonly MoonlightSparkle[] {
  if (age >= MOONLIGHT_SPRITES_DESTROY_AGE) return [];
  const sprites: MoonlightSparkle[] = [];
  for (let index = 0; index < MOONLIGHT_SPARKLE_STARTS.length; index += 1) {
    const local = age - MOONLIGHT_SPARKLE_STARTS[index]!;
    if (local < 0) continue;
    sprites.push({
      kind: "sparkle",
      spawnIndex: index,
      oamSlot: MOONLIGHT_SPARKLE_OAM_SLOTS[index]!,
      x: attackerX + MOONLIGHT_SPARKLE_X_OFFSETS[index]!,
      y: Math.min(120, Math.floor((local + 1) / 2)),
      frame: Math.floor((local + 1) / 8) % 4,
    });
  }
  return sprites;
}

function starFromShared(
  sprite: RecoverEffectSprite,
): MoonlightStar {
  // The fourth creation reuses slot 3 after the first star destroys itself.
  const oamSlots = [3, 4, 5, 3] as const;
  return {
    kind: "star",
    spawnIndex: sprite.spawnIndex,
    oamSlot: oamSlots[sprite.spawnIndex]!,
    x: sprite.x,
    y: sprite.y,
    frame: sprite.frame,
  };
}

/** Pure source-relative `Move_MOONLIGHT`, including shared HealingEffect. */
export function moonlightAtAge(
  age: number,
  side: "player" | "opponent",
  attackerX: number,
  healingCenter: Readonly<{ x: number; y: number }>,
): MoonlightState {
  const sparkles = moonlightSparklesAtAge(age, attackerX);
  const stars = healingBlueStarsAtAge(
    age - MOONLIGHT_HEALING_START_AGE,
    side,
    healingCenter,
  ).map(starFromShared);
  const alphaTaskActive = age >= 41 && age <= 104;
  const endFadeTaskActive = age >= 223 && age <= 297;
  return {
    active: age >= 0 && age < MOONLIGHT_FRAME_COUNT,
    moonLoaded: age >= 1 && age < 351,
    greenSparkleLoaded: age >= 4 && age < 351,
    blueStarLoaded: age >= 7 && age < 351,
    moonVisible:
      age >= MOONLIGHT_MOON_START_AGE
      && age < MOONLIGHT_SPRITES_DESTROY_AGE,
    alpha: moonlightAlphaAtAge(age),
    background: moonlightBackgroundAtAge(age),
    battlerPaletteCoefficient: moonlightEndPaletteCoefficient(age),
    effectPaletteCoefficient: moonlightEndPaletteCoefficient(age),
    sparkles,
    stars,
    visualTaskCount:
      Number(alphaTaskActive) + Number(endFadeTaskActive)
      + Number(age >= 10 && age <= 39),
    audio: {
      moonlightActive: age >= 41 && age <= 123,
      healingActive: age >= MOONLIGHT_HEALING_START_AGE && age <= 350,
    },
  };
}
