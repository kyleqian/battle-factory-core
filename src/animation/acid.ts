import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
  blendColorCycleObjYAtAge,
  type BlendColorCycleTiming,
} from "./blendColorCycle.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export const ACID_BUBBLE_START_AGES = [0, 7, 14] as const;
export const ACID_DROPLET_START_AGES = [31, 43, 55, 67, 79] as const;
export const ACID_DROPLET_DURATIONS = [55, 55, 50, 45, 50] as const;
export const ACID_DROPLET_OFFSETS = [
  { x: 0, y: -22 },
  { x: -26, y: -24 },
  { x: 15, y: -27 },
  { x: -15, y: -17 },
  { x: 27, y: -22 },
] as const;

const ACID_BLEND_TIMING: BlendColorCycleTiming = {
  legs: [{ startY: 0, targetY: 12 }, { startY: 12, targetY: 0 }],
  deltaY: 1,
};

// OAM inverse-scale values emitted by the two source affine programs after
// AnimateSprites has run on the creation frame.
const BUBBLE_MATRICES = [
  191, 197, 203, 210, 217, 224, 232, 240, 250, 260,
  250, 240, 232, 224, 217, 210, 203, 197, 191, 186, 186,
] as const;
const DROPLET_MATRICES = [
  [292, 227], [315, 215], [341, 204], [372, 195], [409, 186], [372, 195],
  [341, 204], [315, 215], [292, 227], [273, 240], [256, 256], [273, 240],
] as const;

export interface AcidSprite {
  readonly kind: "bubble" | "droplet";
  readonly x: number;
  readonly y: number;
  readonly frame: 0 | 1;
  readonly xScale: number;
  readonly yScale: number;
  readonly spawnIndex: number;
}

export interface AcidEffect {
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly defenderPaletteY: number;
  readonly sprites: readonly AcidSprite[];
}

/** Complete `Move_ACID` body, relative to the first poison-bubble callback. */
export function acidEffectAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  attackerOrigin: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): AcidEffect {
  const sprites: AcidSprite[] = [];
  for (let index = 0; index < ACID_BUBBLE_START_AGES.length; index += 1) {
    const local = age - ACID_BUBBLE_START_AGES[index]!;
    if (local < 0 || local >= 40) continue;
    const startX = attackerOrigin.x + (attackerSide === "player" ? 20 : -20);
    const endpointOffset = [0, 24, -24][index]!;
    const endX = targetCenter.x
      + (attackerSide === "player" ? endpointOffset : -endpointOffset);
    const callbacks = local + 1;
    const arcAngle = Math.trunc((Math.trunc(0x8000 / 40) * callbacks) / 256) & 0xff;
    const matrix = BUBBLE_MATRICES[local % BUBBLE_MATRICES.length]!;
    sprites.push({
      kind: "bubble",
      x: startX + linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(endX - startX, 40), callbacks, 40,
      ),
      y: attackerOrigin.y + linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(targetCenter.y - attackerOrigin.y, 40),
        callbacks,
        40,
      ) + Math.floor((GBA_SINE_TABLE_256[arcAngle]! * -30) / 256),
      frame: 0,
      xScale: matrix,
      yScale: matrix,
      spawnIndex: index,
    });
  }

  for (let index = 0; index < ACID_DROPLET_START_AGES.length; index += 1) {
    const local = age - ACID_DROPLET_START_AGES[index]!;
    const duration = ACID_DROPLET_DURATIONS[index]!;
    if (local < 0 || local > duration) continue;
    const offset = ACID_DROPLET_OFFSETS[index]!;
    const x = targetCenter.x
      + (attackerSide === "player" ? offset.x : -offset.x);
    const callbacks = local + 1;
    const [xScale, yScale] = DROPLET_MATRICES[local % DROPLET_MATRICES.length]!;
    sprites.push({
      kind: "droplet",
      x,
      y: targetCenter.y + offset.y + linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(55 - offset.y, duration), callbacks, duration,
      ),
      frame: 1,
      xScale,
      yScale,
      spawnIndex: index,
    });
  }

  return {
    // The script creates both literal tasks, but singles has no visible
    // defender partner; only ANIM_TARGET owns an OAM sprite.
    targetOffset: shakeMon2OffsetAtTick(2, 0, 10, 1, age - 30),
    defenderPaletteY: blendColorCycleObjYAtAge(age - 31, ACID_BLEND_TIMING),
    sprites,
  };
}
