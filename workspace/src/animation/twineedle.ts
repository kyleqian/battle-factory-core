import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type TwineedleSide = "player" | "opponent";

export interface TwineedleSprite {
  readonly kind: "needle" | "impact";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
  readonly animation: 0 | 3;
  readonly oamSlot: number;
}

export interface TwineedleSoundEvent {
  readonly age: number;
  readonly song: "SE_M_RAZOR_WIND2" | "SE_M_HORN_ATTACK";
  readonly pan: number;
}

export interface TwineedleEffect {
  readonly attackerSide: TwineedleSide;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetMonbg: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sprites: readonly TwineedleSprite[];
  readonly soundEvents: readonly TwineedleSoundEvent[];
}

const NEEDLES = [
  { initialX: 10, initialY: -4, targetX: 0, targetY: -4 },
  { initialX: 20, initialY: 12, targetX: 10, targetY: 12 },
] as const;

/**
 * BIOS `ArcTan2Neg` + `ObjAffineSet` receipts for Move_TWINEEDLE's two
 * parallel vectors in standard singles coordinates. Both needles share a
 * vector; the opponent branch mirrors the script Y args and target X args
 * before computing it (`AnimTranslateStinger`).
 */
export function twineedleNeedleMatrix(
  attackerSide: TwineedleSide,
): Readonly<{ a: number; b: number; c: number; d: number }> {
  return attackerSide === "player"
    ? { a: 126, b: 222, c: -222, d: 126 }
    : { a: -109, b: -231, c: 231, d: -109 };
}

function needleSprite(
  age: number,
  index: number,
  attackerSide: TwineedleSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): TwineedleSprite | null {
  if (age < 0 || age > 20) return null;
  const args = NEEDLES[index]!;
  const side = attackerSide === "player" ? 1 : -1;
  const startX = attackerCenter.x + side * args.initialX;
  const startY = attackerCenter.y + side * args.initialY;
  const endX = targetCenter.x + side * args.targetX;
  const endY = targetCenter.y + side * args.targetY;
  const callbacks = Math.min(age + 1, 20);
  return {
    kind: "needle",
    x: startX,
    y: startY,
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(endX - startX, 20),
      callbacks,
      20,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(endY - startY, 20),
      callbacks,
      20,
    ),
    matrix: twineedleNeedleMatrix(attackerSide),
    animation: 0,
    oamSlot: 3 + index,
  };
}

/**
 * Complete source-relative `Move_TWINEEDLE` body. Age zero is the first
 * displayed callback step of both linear stingers. Age 36 is the
 * `clearmonbg` / `blendoff` cleanup display.
 */
export function twineedleEffectAtAge(
  age: number,
  attackerSide: TwineedleSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): TwineedleEffect {
  const sprites: TwineedleSprite[] = NEEDLES.flatMap((_, index) => {
    const sprite = needleSprite(
      age, index, attackerSide, attackerCenter, targetCenter,
    );
    return sprite ? [sprite] : [];
  });
  const impactYSign = attackerSide === "player" ? 1 : -1;
  for (const [spawnAge, x, y, slot] of [
    [22, 0, -4, 3],
    [25, 10, 12, 4],
  ] as const) {
    const localAge = age - spawnAge;
    if (localAge >= 0 && localAge <= 9) {
      sprites.push({
        kind: "impact",
        x: targetCenter.x + impactYSign * x,
        y: targetCenter.y + impactYSign * y,
        x2: 0,
        y2: 0,
        matrix: { a: 512, b: 0, c: 0, d: 512 },
        animation: 3,
        oamSlot: slot,
      });
    }
  }
  const attackerPan = attackerSide === "player" ? -64 : 63;
  const targetPan = attackerSide === "player" ? 63 : -63;
  return {
    attackerSide,
    alpha: age >= 0 && age <= 35 ? { eva: 12, evb: 8 } : null,
    targetMonbg: age >= 0 && age <= 35,
    // The task is issued after script `delay 20`; its creation write is
    // already followed by two task callbacks when the first hit-splat
    // display appears at age 22.
    targetOffset: age < 22
      ? { x2: 0, y2: 0 }
      : shakeMon2OffsetAtTick(2, 0, 5, 1, age - 21),
    sprites,
    soundEvents: [
      { age: 0, song: "SE_M_RAZOR_WIND2", pan: attackerPan },
      { age: 6, song: "SE_M_RAZOR_WIND2", pan: attackerPan },
      { age: 22, song: "SE_M_HORN_ATTACK", pan: targetPan },
      { age: 27, song: "SE_M_HORN_ATTACK", pan: targetPan },
    ],
  };
}
