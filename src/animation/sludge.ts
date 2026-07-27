import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export const SLUDGE_PROJECTILE_DURATION = 40;
export const SLUDGE_POISON_BUBBLE_START_AGES = [41, 49, 57, 65, 73, 81] as const;
export const SLUDGE_POISON_BUBBLE_OFFSETS = [
  { x: 10, y: 10 },
  { x: 20, y: -20 },
  { x: -20, y: 15 },
  { x: 0, y: 0 },
  { x: -20, y: -20 },
  { x: 16, y: -8 },
] as const;

const PROJECTILE_MATRICES = [
  191, 197, 203, 210, 217, 224, 232, 240, 250, 260,
  250, 240, 232, 224, 217, 210, 203, 197, 191, 186, 186,
] as const;

export interface SludgeSprite {
  readonly kind: "projectile" | "poisonBubble";
  readonly x: number;
  readonly y: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly spawnIndex: number;
  readonly oamSlot: number;
}

export interface SludgeEffect {
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sprites: readonly SludgeSprite[];
}

function poisonBubbleAtLocalAge(
  local: number,
  spawnIndex: number,
  attackerSide: "player" | "opponent",
  targetCenter: Readonly<{ x: number; y: number }>,
): SludgeSprite | undefined {
  // AFFINEANIMCMD_FRAME(0x9c) initializes scale, then the 20-frame +5
  // command is advanced by AnimateSprites on the creation frame.
  if (local < 0 || local > 20) return undefined;
  const offset = SLUDGE_POISON_BUBBLE_OFFSETS[spawnIndex]!;
  const angle = ((local + 1) * 0xb) & 0xff;
  const scale = 0x9c + Math.min(local + 1, 20) * 5;
  const matrix = Math.trunc(0x10000 / scale);
  return {
    kind: "poisonBubble",
    x: targetCenter.x + (attackerSide === "player" ? offset.x : -offset.x)
      + Math.floor((GBA_SINE_TABLE_256[angle]! * 4) / 256),
    y: targetCenter.y + offset.y - Math.trunc(((local + 1) * 0x30) / 0x100),
    xScale: matrix,
    yScale: matrix,
    spawnIndex,
    oamSlot: [3, 4, 5, 3, 4, 5][spawnIndex]!,
  };
}

/**
 * Complete source-relative visual body for Move_SLUDGE, with age zero at
 * gSludgeProjectileSpriteTemplate's creation callback.
 */
export function sludgeEffectAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  projectileOrigin: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SludgeEffect {
  const sprites: SludgeSprite[] = [];
  if (age >= 0 && age < SLUDGE_PROJECTILE_DURATION) {
    const startX = projectileOrigin.x + (attackerSide === "player" ? 20 : -20);
    const callbacks = age + 1;
    const arcAngle = Math.trunc(
      (Math.trunc(0x8000 / SLUDGE_PROJECTILE_DURATION) * callbacks) / 256,
    ) & 0xff;
    const matrix = PROJECTILE_MATRICES[age % PROJECTILE_MATRICES.length]!;
    sprites.push({
      kind: "projectile",
      x: startX + linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(
          targetCenter.x - startX,
          SLUDGE_PROJECTILE_DURATION,
        ),
        callbacks,
        SLUDGE_PROJECTILE_DURATION,
      ),
      y: projectileOrigin.y + linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(
          targetCenter.y - projectileOrigin.y,
          SLUDGE_PROJECTILE_DURATION,
        ),
        callbacks,
        SLUDGE_PROJECTILE_DURATION,
      ) + Math.floor((GBA_SINE_TABLE_256[arcAngle]! * -30) / 256),
      xScale: matrix,
      yScale: matrix,
      spawnIndex: 0,
      oamSlot: 3,
    });
  }
  for (let index = 0; index < SLUDGE_POISON_BUBBLE_START_AGES.length; index += 1) {
    const sprite = poisonBubbleAtLocalAge(
      age - SLUDGE_POISON_BUBBLE_START_AGES[index]!,
      index,
      attackerSide,
      targetCenter,
    );
    if (sprite) sprites.push(sprite);
  }
  return {
    // A script-created visual task receives its synchronous initializer step
    // and the same frame's RunTasks step before this displayed latch.
    targetOffset: age < 41
      ? { x2: 0, y2: 0 }
      : shakeMonOffsetAtTick(3, 0, 5, 1, age - 40),
    sprites,
  };
}
