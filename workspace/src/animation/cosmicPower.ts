import { grantingStarFrameAtLocalAge } from "./synthesis.ts";
import { linearTranslationOffsetAfterCallbacks } from "./animLinearTranslation.ts";

/**
 * Source-relative `Move_COSMIC_POWER` body.  Age zero is the first row whose
 * animation-script pointer is inside Move_COSMIC_POWER; the inactive cleanup
 * row is age 240.  The values below are the literal task/sprite schedules
 * from the Scene-ON source window, rather than a battle-clock checkpoint.
 */
export const COSMIC_POWER_FRAME_COUNT = 241;
export const COSMIC_POWER_FIRST_INACTIVE_AGE = 240;
export const COSMIC_POWER_SOURCE_START = 0x082d5f5d;
export const COSMIC_POWER_SOURCE_END_EXCLUSIVE = 0x082d5fe2;
export const COSMIC_POWER_GRANTING_STAR_STARTS = [129, 139] as const;
export const COSMIC_POWER_GRANTING_STAR_ARGS = Object.freeze([
  Object.freeze({ x: -15, y: 0 }),
  Object.freeze({ x: 12, y: -5 }),
] as const);
export const COSMIC_POWER_GRANTING_STAR_DURATION = 60;

export interface CosmicPowerSprite {
  readonly kind: "grantingStar";
  readonly spawnIndex: 0 | 1;
  readonly oamSlot: 3 | 4;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly y2: number;
  readonly invisible: boolean;
}

export interface CosmicPowerAudioEvent {
  readonly age: number;
  readonly player: "SE1" | "SE2";
  readonly song: "SE_M_COSMIC_POWER" | "SE_M_MORNING_SUN";
  readonly pan: number;
}

export interface CosmicPowerState {
  readonly age: number;
  readonly active: boolean;
  readonly background: "battle" | "cosmic";
  readonly backgroundDarkCoefficient: number;
  readonly bg3vofs: number;
  readonly slidingBgTaskActive: boolean;
  /** `gPlttBufferFaded` coefficient in the non-attacker OBJ banks. */
  readonly nonAttackerBlendCoefficient: number;
  /** Source task's current `data[10]`, before the display latch. */
  readonly nonAttackerBlendRamCoefficient: number;
  readonly nonAttackerBlendTaskActive: boolean;
  readonly fadeToBgTaskActive: boolean;
  readonly bldcnt: number;
  readonly bldy: number;
  readonly resources: Readonly<{
    readonly sparkle2Loaded: boolean;
    readonly cosmicBackgroundLoaded: boolean;
  }>;
  readonly audio: readonly CosmicPowerAudioEvent[];
  readonly sprites: readonly CosmicPowerSprite[];
}

function blendTaskRamCoefficient(age: number): number {
  if (age >= 4 && age <= 17) return age - 2;
  if (age >= 181 && age <= 194) return 13 - (age - 181);
  return 0;
}

/** Displayed palette writes are one scanout behind the task's RAM writes. */
export function cosmicPowerDisplayedBlendCoefficient(age: number): number {
  if (age >= 4 && age <= 18) return Math.min(15, age - 3);
  if (age >= 19 && age <= 180) return 15;
  if (age >= 181 && age <= 195) return Math.max(0, 15 - (age - 180));
  return 0;
}

function fadeBldyAtAge(age: number): number {
  if (age >= 20 && age <= 55) {
    if (age <= 36) return age - 20;
    if (age <= 39) return 16;
    return Math.max(0, 16 - (age - 39));
  }
  if (age >= 202 && age <= 238) {
    if (age <= 218) return age - 202;
    if (age <= 222) return 16;
    return Math.max(0, 16 - (age - 222));
  }
  return 0;
}

function spritesAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): readonly CosmicPowerSprite[] {
  const sprites: CosmicPowerSprite[] = [];
  for (let index = 0; index < COSMIC_POWER_GRANTING_STAR_STARTS.length; index += 1) {
    const localAge = age - COSMIC_POWER_GRANTING_STAR_STARTS[index]!;
    const frame = grantingStarFrameAtLocalAge(localAge);
    if (frame === null) continue;
    const args = COSMIC_POWER_GRANTING_STAR_ARGS[index]!;
    const callbacks = Math.min(localAge + 1, COSMIC_POWER_GRANTING_STAR_DURATION);
    sprites.push({
      kind: "grantingStar",
      spawnIndex: index as 0 | 1,
      oamSlot: (3 + index) as 3 | 4,
      x: center.x + (side === "player" ? args.x : -args.x),
      y: center.y + args.y,
      frame,
      y2: linearTranslationOffsetAfterCallbacks(
        32,
        callbacks,
        COSMIC_POWER_GRANTING_STAR_DURATION,
      ),
      invisible: false,
    });
  }
  return sprites;
}

/**
 * Reduce the source-owned task, palette, BG, audio, resource, and OAM state.
 * The caller owns battler geometry and all battle/controller state.
 */
export function cosmicPowerAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): CosmicPowerState {
  const active = age >= 0 && age < COSMIC_POWER_FIRST_INACTIVE_AGE;
  const bldy = fadeBldyAtAge(age);
  const background = age >= 38 && age < COSMIC_POWER_FIRST_INACTIVE_AGE
    ? "cosmic" : "battle";
  return {
    age,
    active,
    background,
    backgroundDarkCoefficient: bldy,
    bg3vofs: age >= 38 && age <= 220 ? Math.min(91, Math.floor((age - 38) / 2)) : 0,
    slidingBgTaskActive: age >= 38 && age <= 219,
    nonAttackerBlendCoefficient: cosmicPowerDisplayedBlendCoefficient(age),
    nonAttackerBlendRamCoefficient: blendTaskRamCoefficient(age),
    nonAttackerBlendTaskActive:
      (age >= 4 && age <= 17) || (age >= 181 && age <= 194),
    fadeToBgTaskActive: (age >= 19 && age <= 55) || (age >= 201 && age <= 238),
    bldcnt:
      (age >= 20 && age <= 55) || (age >= 202 && age <= 238)
        ? 232 : 0,
    bldy,
    resources: {
      sparkle2Loaded: age >= 0,
      cosmicBackgroundLoaded: age >= 38,
    },
    audio: [
      ...(age === 4
        ? [{ age, player: "SE2" as const, song: "SE_M_COSMIC_POWER" as const, pan: 0 }]
        : []),
      ...(age === 129
        ? [{
            age,
            player: "SE1" as const,
            song: "SE_M_MORNING_SUN" as const,
            pan: side === "player" ? -64 : 63,
          }]
        : []),
    ],
    sprites: active ? spritesAtAge(age, side, center) : [],
  };
}
