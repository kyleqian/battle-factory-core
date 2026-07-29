import { shakeMonInPlaceOffsetAtTick } from "./shakeMonInPlace.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
  type SlideMonBattlerSide,
} from "./slideMon.ts";

export interface SlamHitSprite {
  readonly x: number;
  readonly y: number;
  readonly sheetFrame: 4 | 5 | 6 | 7;
  readonly hFlip: boolean;
}

export interface SlamState {
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly slamHit: SlamHitSprite | null;
  readonly hitsplat: Readonly<{ x: number; y: number; animation: 1 }> | null;
  readonly slideToOffsetCount: number;
  readonly slideToOriginalCount: number;
  readonly shakeTaskActive: boolean;
  readonly monbgActive: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly loadedTags: readonly ("ANIM_TAG_SLAM_HIT" | "ANIM_TAG_IMPACT")[];
  readonly active: boolean;
}

function slamHitFrame(age: number): 4 | 5 | 6 | 7 {
  const spriteAge = age - 13;
  // The sprite animation runner advances before the first software receipt:
  // source duration 3 yields 2/3/3 displays, while the terminal duration 6
  // remains for 7 receipts through animEnded cleanup.
  if (spriteAge < 2) return 4;
  if (spriteAge < 5) return 5;
  if (spriteAge < 8) return 6;
  return 7;
}

/**
 * Pure source-relative `Move_SLAM` reducer.
 *
 * Age zero is the first display with `gAnimScriptActive` set. Resource
 * decompression consumes ages 0..9; the body starts at age 10 and reaches
 * the first inactive cleanup display at age 53.
 */
export function slamAtAge(
  age: number,
  attackerSide: SlideMonBattlerSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): SlamState {
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attackerOut = slideMonToOffsetAtTick({
    battlerSide: attackerSide,
    targetXOffset: 20,
    targetYOffset: 3,
    mirrorVertical: false,
    durationTicks: 4,
  }, age - 10);
  const targetOut = slideMonToOffsetAtTick({
    battlerSide: targetSide,
    targetXOffset: -12,
    targetYOffset: 10,
    mirrorVertical: false,
    durationTicks: 3,
  }, age - 18);

  let attackerOffset = age < 10 ? { x2: 0, y2: 0 } : attackerOut;
  if (age >= 18) {
    attackerOffset = slideMonToOriginalPosAtTick({
      currentX2: attackerOut.x2,
      currentY2: attackerOut.y2,
      axisSnapMode: 0,
      durationTicks: 5,
    }, age - 18);
  }

  let targetOffset = age < 18 ? { x2: 0, y2: 0 } : targetOut;
  if (age >= 23 && age <= 32) {
    const shake = shakeMonInPlaceOffsetAtTick(0, 3, 6, 1, age - 22);
    targetOffset = {
      x2: targetOut.x2 + shake.x2,
      y2: targetOut.y2 + shake.y2,
    };
  }
  if (age >= 40) {
    targetOffset = slideMonToOriginalPosAtTick({
      currentX2: targetOut.x2,
      currentY2: targetOut.y2,
      axisSnapMode: 0,
      durationTicks: 6,
    }, age - 40);
  }

  return {
    attackerOffset,
    targetOffset,
    slamHit: age >= 13 && age <= 27
      ? {
          x: targetCenter.x,
          y: targetCenter.y,
          sheetFrame: slamHitFrame(age),
          hFlip: attackerSide === "player",
        }
      : null,
    hitsplat: age >= 18 && age <= 27
      ? { x: targetCenter.x, y: targetCenter.y, animation: 1 }
      : null,
    slideToOffsetCount:
      Number(age >= 10 && age <= 14) + Number(age >= 18 && age <= 21),
    slideToOriginalCount:
      Number(age >= 18 && age <= 22) + Number(age >= 40 && age <= 45),
    shakeTaskActive: age >= 23 && age <= 31,
    monbgActive: age >= 10 && age <= 46,
    alpha: age >= 10 && age <= 46 ? { eva: 12, evb: 8 } : null,
    loadedTags: age >= 10 && age <= 46
      ? ["ANIM_TAG_SLAM_HIT", "ANIM_TAG_IMPACT"]
      : [],
    active: age >= 0 && age <= 52,
  };
}
