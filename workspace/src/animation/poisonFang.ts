import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import { sludgeEffectAtAge, type SludgeSprite } from "./sludge.ts";

export const POISON_FANG_BUBBLE_START_AGES = [33, 41, 49, 57, 65, 73] as const;

export interface PoisonFangSprite {
  readonly kind: "fang" | "poisonBubble";
  readonly x: number;
  readonly y: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly frame: number;
  readonly spawnIndex: number;
  readonly oamSlot: number;
}

export interface PoisonFangEffect {
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly defenderPaletteY: number;
  readonly sprites: readonly PoisonFangSprite[];
}

/** Delay-zero, four-leg 0↔12 cycle from Move_POISON_FANG. */
export function poisonFangTargetPaletteYAtAge(age: number): number {
  if (age < 35) return 0;
  const local = age - 35;
  if (local < 12) return 2 + 2 * Math.floor(local / 2);
  if (local < 18) return 12;
  if (local < 30) return 10 - 2 * Math.floor((local - 18) / 2);
  if (local < 36) return 0;
  if (local < 48) return 2 + 2 * Math.floor((local - 36) / 2);
  if (local < 54) return 12;
  if (local < 66) return 10 - 2 * Math.floor((local - 54) / 2);
  return 0;
}

/** Complete first Move_POISON_FANG script body, age zero at fang creation. */
export function poisonFangEffectAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  targetCenter: Readonly<{ x: number; y: number }>,
): PoisonFangEffect {
  const sprites: PoisonFangSprite[] = [];
  if (age >= 0 && age < 32) {
    const scale = 0x200 - Math.min(age + 1, 8) * 0x20;
    const matrix = Math.trunc(0x10000 / scale);
    const frame = age < 8 ? 0 : age < 24 ? 1 : age < 28 ? 2 : 3;
    sprites.push({
      kind: "fang", x: targetCenter.x, y: targetCenter.y,
      xScale: matrix, yScale: matrix, frame, spawnIndex: 0, oamSlot: 3,
    });
  }
  const bubbles = sludgeEffectAtAge(
    age + 8, attackerSide, targetCenter, targetCenter,
  ).sprites.filter((sprite): sprite is SludgeSprite =>
    sprite.kind === "poisonBubble"
  );
  for (const bubble of bubbles) {
    sprites.push({ ...bubble, kind: "poisonBubble", frame: 0 });
  }
  return {
    targetOffset: age < 12
      ? { x2: 0, y2: 0 }
      : shakeMonOffsetAtTick(3, 0, 10, 1, age - 11),
    defenderPaletteY: poisonFangTargetPaletteYAtAge(age),
    sprites,
  };
}
