import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { poisonBubblesAtAge } from "./sludge.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type PoisonStingSide = "player" | "opponent";

export interface PoisonStingSprite {
  readonly kind: "needle" | "impact" | "poisonBubble";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
  readonly oamSlot: number;
  readonly spawnIndex: number;
  readonly animation: 0 | 2;
}

export interface PoisonStingEffect {
  readonly attackerSide: PoisonStingSide;
  readonly loadedTags: readonly ("NEEDLE" | "IMPACT" | "POISON_BUBBLE")[];
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetMonbg: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sprites: readonly PoisonStingSprite[];
  readonly soundEvents: readonly {
    age: number;
    song: "SE_M_RAZOR_WIND2" | "SE_M_HORN_ATTACK" | "SE_M_TOXIC";
    pan: number;
  }[];
}

const BUBBLE_START_AGES = [46, 54, 62, 70, 78, 86] as const;

/** BIOS ArcTan2Neg/ObjAffineSet receipts for the bilateral set-3 Weedle stages. */
export function poisonStingNeedleMatrix(side: PoisonStingSide) {
  return side === "player"
    ? { a: 152, b: 205, c: -205, d: 152 }
    : { a: -92, b: -238, c: 238, d: -92 };
}

/** Complete source-relative Move_POISON_STING body, entry display through cleanup. */
export function poisonStingEffectAtAge(
  age: number,
  attackerSide: PoisonStingSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): PoisonStingEffect {
  const sprites: PoisonStingSprite[] = [];
  const side = attackerSide === "player" ? 1 : -1;
  const needleAge = age - 13;
  if (needleAge >= 0 && needleAge <= 20) {
    const startX = attackerCenter.x + side * 20;
    const startY = attackerCenter.y;
    const endX = targetCenter.x - side * 8;
    const endY = targetCenter.y;
    const callbacks = Math.min(needleAge + 1, 20);
    sprites.push({
      kind: "needle", x: startX, y: startY,
      x2: linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(endX - startX, 20), callbacks, 20,
      ),
      y2: linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(endY - startY, 20), callbacks, 20,
      ),
      matrix: poisonStingNeedleMatrix(attackerSide), oamSlot: 3,
      spawnIndex: 0, animation: 0,
    });
  }
  if (age >= 35 && age <= 44) {
    sprites.push({
      kind: "impact", x: targetCenter.x, y: targetCenter.y, x2: 0, y2: 0,
      matrix: { a: 372, b: 0, c: 0, d: 372 }, oamSlot: 3,
      spawnIndex: 0, animation: 2,
    });
  }
  for (const bubble of poisonBubblesAtAge(
    age, attackerSide, targetCenter, BUBBLE_START_AGES,
  )) {
    sprites.push({
      kind: "poisonBubble", x: bubble.x, y: bubble.y, x2: 0, y2: 0,
      matrix: { a: bubble.xScale, b: 0, c: 0, d: bubble.yScale },
      oamSlot: bubble.oamSlot, spawnIndex: bubble.spawnIndex, animation: 0,
    });
  }
  const attackerPan = attackerSide === "player" ? -64 : 63;
  const targetPan = attackerSide === "player" ? 63 : -63;
  return {
    attackerSide,
    loadedTags: age >= 112 ? [] : [
      ...(age >= 1 ? ["NEEDLE" as const] : []),
      ...(age >= 4 ? ["IMPACT" as const] : []),
      ...(age >= 7 ? ["POISON_BUBBLE" as const] : []),
    ],
    alpha: age >= 13 && age <= 107 ? { eva: 12, evb: 8 } : null,
    targetMonbg: age >= 10 && age <= 107,
    targetOffset: age < 35
      ? { x2: 0, y2: 0 }
      : shakeMon2OffsetAtTick(2, 0, 5, 1, age - 34),
    sprites,
    soundEvents: [
      { age: 13, song: "SE_M_RAZOR_WIND2", pan: attackerPan },
      { age: 35, song: "SE_M_HORN_ATTACK", pan: targetPan },
      ...BUBBLE_START_AGES.map((soundAge) => ({
        age: soundAge, song: "SE_M_TOXIC" as const, pan: targetPan,
      })),
    ],
  };
}
