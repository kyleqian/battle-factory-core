import { sludgeEffectAtAge, type SludgeSprite } from "./sludge.ts";

export const TOXIC_LARGE_BUBBLE_START_AGES =
  [0, 17, 34, 51, 68, 85, 102, 119] as const;
export const TOXIC_POISON_BUBBLE_START_AGES =
  [157, 165, 173, 181, 189, 197] as const;

export interface ToxicSprite {
  readonly kind: "toxicBubble" | "poisonBubble";
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly spawnIndex: number;
  readonly oamSlot: number;
}

const LARGE_OFFSETS = [-24, 8, -8, 24, -24, 8, -8, 24] as const;

/**
 * Complete Move_TOXIC visual body, age zero at the first
 * gToxicBubbleSpriteTemplate creation callback.
 */
export function toxicEffectAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly ToxicSprite[] {
  const sprites: ToxicSprite[] = [];
  for (let index = 0; index < TOXIC_LARGE_BUBBLE_START_AGES.length; index += 1) {
    const local = age - TOXIC_LARGE_BUBBLE_START_AGES[index]!;
    if (local < 0 || local >= 20) continue;
    const xOffset = LARGE_OFFSETS[index]!;
    sprites.push({
      kind: "toxicBubble",
      x: targetCenter.x + (attackerSide === "player" ? xOffset : -xOffset),
      y: targetCenter.y + 16,
      frame: Math.min(3, Math.floor((local + 1) / 5)),
      xScale: 256,
      yScale: 256,
      spawnIndex: index,
      oamSlot: 3 + (index % 2),
    });
  }
  const bubbles = sludgeEffectAtAge(
    age - 116,
    attackerSide,
    targetCenter,
    targetCenter,
  ).sprites.filter((sprite): sprite is SludgeSprite =>
    sprite.kind === "poisonBubble"
  );
  for (const bubble of bubbles) {
    sprites.push({ ...bubble, kind: "poisonBubble", frame: 0 });
  }
  return sprites;
}
