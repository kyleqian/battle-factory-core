import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import { poisonFangEffectAtAge, type PoisonFangSprite } from "./poisonFang.ts";

export type HyperFangTargetSide = "player" | "opponent";

export interface HyperFangBackgroundState {
  readonly variant: "player" | "opponent";
  readonly impact: boolean;
  readonly bldy: number;
}

export interface HyperFangEffect {
  readonly contest: false;
  readonly targetPlayerSide: boolean;
  readonly background: HyperFangBackgroundState;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sprites: readonly PoisonFangSprite[];
}

/** Battle animations honestly take HyperFangContinue's non-contest branch. */
export function hyperFangBranch(targetSide: HyperFangTargetSide) {
  return {
    contest: false as const,
    targetPlayerSide: targetSide === "player",
    background: targetSide,
  };
}

/**
 * Complete Move_HYPER_FANG body. Age zero is the SE_M_BITE display frame;
 * all timings are source-script-relative and shared by both target sides.
 */
export function hyperFangEffectAtAge(
  age: number,
  targetSide: HyperFangTargetSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): HyperFangEffect {
  const branch = hyperFangBranch(targetSide);
  // Hyper Fang uses the identical gFangSpriteTemplate as Poison Fang.
  const fang = poisonFangEffectAtAge(age - 26, "player", targetCenter)
    .sprites.filter((sprite) => sprite.kind === "fang");
  const firstFade = age >= 9 && age <= 44
    ? age <= 24 ? age - 8 : Math.max(0, 44 - age)
    : 0;
  const restoreFade = age >= 70 && age <= 105
    ? age <= 85 ? age - 69 : Math.max(0, 105 - age)
    : 0;
  return {
    contest: branch.contest,
    targetPlayerSide: branch.targetPlayerSide,
    background: {
      variant: branch.background,
      impact: age >= 26 && age < 88,
      bldy: Math.min(16, Math.max(firstFade, restoreFade)),
    },
    targetOffset: age < 46
      ? { x2: 0, y2: 0 }
      : shakeMonOffsetAtTick(0, 10, 10, 1, age - 45),
    sprites: fang,
  };
}
