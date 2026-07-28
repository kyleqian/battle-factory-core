import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export type BiteTargetSide = "player" | "opponent";

export interface BiteSprite {
  readonly kind: "sharpTeeth" | "impact";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly affineAnimation: 0 | 4;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
  readonly animation: number;
  readonly oamSlot: number;
}

export interface BiteEffect {
  readonly targetSide: BiteTargetSide;
  readonly alpha: Readonly<{ eva: number; evb: number }> | null;
  readonly targetMonbg: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly soundPan: -63 | 63;
  readonly sprites: readonly BiteSprite[];
}

/**
 * Complete `Move_BITE` visual body. Age zero is the first displayed
 * `gSharpTeethSpriteTemplate` callback step, after the script's two sprite
 * creations. All state is relative to that source event.
 */
export function biteEffectAtAge(
  age: number,
  targetSide: BiteTargetSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): BiteEffect {
  const sprites: BiteSprite[] = [];
  if (age >= 0 && age <= 18) {
    const step = age < 10 ? age + 1 : 19 - age;
    sprites.push({
      kind: "sharpTeeth",
      x: targetCenter.x,
      y: targetCenter.y - 32,
      x2: 0,
      y2: (819 * step) >> 8,
      affineAnimation: 0,
      matrix: { a: 256, b: 0, c: 0, d: 256 },
      animation: 0,
      oamSlot: 3,
    }, {
      kind: "sharpTeeth",
      x: targetCenter.x,
      y: targetCenter.y + 32,
      x2: 0,
      y2: (-819 * step) >> 8,
      affineAnimation: 4,
      matrix: { a: -256, b: 0, c: 0, d: -256 },
      animation: 0,
      oamSlot: 4,
    });
  }
  if (age >= 12 && age <= 21) {
    sprites.push({
      kind: "impact",
      x: targetCenter.x,
      y: targetCenter.y,
      x2: 0,
      y2: 0,
      affineAnimation: 0,
      matrix: { a: 372, b: 0, c: 0, d: 372 },
      animation: 2,
      oamSlot: 5,
    });
  }
  return {
    targetSide,
    alpha: age >= 0 && age <= 24 ? { eva: 12, evb: 8 } : null,
    targetMonbg: age >= 0 && age <= 24,
    targetOffset: age < 12
      ? { x2: 0, y2: 0 }
      : shakeMonOffsetAtTick(0, 4, 7, 1, age - 11),
    soundPan: targetSide === "player" ? -63 : 63,
    sprites,
  };
}
