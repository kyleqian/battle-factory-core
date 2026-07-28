import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
  type SlideMonBattlerSide,
} from "./slideMon.ts";

export interface BodySlamState {
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly verticalDipActive: boolean;
  readonly slideToOffsetCount: number;
  readonly slideToOriginalCount: number;
  readonly hitsplat: Readonly<{ x: number; y: number; animation: 0 }> | null;
  readonly shakeTaskActive: boolean;
  readonly active: boolean;
}

function verticalDipY(age: number): number {
  const tick = age - 7;
  if (tick < 0 || tick > 14) return 0;
  if (tick <= 5) return tick + 1;
  if (tick <= 7) return 6;
  return Math.max(0, 13 - tick);
}

function targetShakeX(age: number): number {
  const tick = age - 54;
  if (tick < 0 || tick > 20) return 0;
  if (tick === 0) return -4;
  return Math.floor((tick - 1) / 2) % 2 === 0 ? 4 : -4;
}

/**
 * Pure source-relative `Move_BODY_SLAM` reducer.
 *
 * Age zero is the first display with `gAnimScriptActive` set for the move.
 * The reducer composes the generic SlideMon helpers and the source task
 * cadence; it has no battle clock, input delay, damage, or turn ownership.
 */
export function bodySlamAtAge(
  age: number,
  attackerSide: SlideMonBattlerSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): BodySlamState {
  const attackerSlide = slideMonToOffsetAtTick({
    battlerSide: attackerSide,
    targetXOffset: 26,
    targetYOffset: 0,
    mirrorVertical: false,
    durationTicks: 5,
  }, age - 36);
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const targetSlide = slideMonToOffsetAtTick({
    battlerSide: targetSide,
    targetXOffset: -28,
    targetYOffset: 0,
    mirrorVertical: false,
    durationTicks: 3,
  }, age - 47);
  let attackerX2 = age < 36 ? 0 : attackerSlide.x2;
  let targetX2 = age < 47 ? 0 : targetSlide.x2;
  if (age >= 54 && age <= 74) targetX2 += targetShakeX(age);
  if (age >= 88) {
    attackerX2 = slideMonToOriginalPosAtTick({
      currentX2: attackerSlide.x2,
      currentY2: 0,
      axisSnapMode: 0,
      durationTicks: 6,
    }, age - 88).x2;
  }
  if (age >= 95) {
    targetX2 = slideMonToOriginalPosAtTick({
      currentX2: targetSlide.x2,
      currentY2: 0,
      axisSnapMode: 1,
      durationTicks: 6,
    }, age - 95).x2;
  }
  return {
    attackerOffset: { x2: attackerX2, y2: verticalDipY(age) },
    targetOffset: { x2: targetX2, y2: 0 },
    verticalDipActive: age >= 7 && age <= 21,
    slideToOffsetCount:
      (age >= 36 && age <= 41 ? 1 : 0) + (age >= 47 && age <= 50 ? 1 : 0),
    slideToOriginalCount:
      (age >= 88 && age <= 93 ? 1 : 0) + (age >= 95 && age <= 100 ? 1 : 0),
    hitsplat: age >= 44 && age <= 52
      ? {
          x: targetCenter.x + (attackerSide === "player" ? -10 : 10),
          y: targetCenter.y,
          animation: 0,
        }
      : null,
    shakeTaskActive: age >= 54 && age <= 74,
    active: age >= 0 && age <= 105,
  };
}
