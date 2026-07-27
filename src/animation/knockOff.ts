import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
} from "./slideMon.ts";

export type KnockOffSide = "player" | "opponent";

export interface KnockOffBodyState {
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly strike: null | Readonly<{
    angle: number;
    sheetFrame: 0 | 1;
    mirrored: boolean;
  }>;
  readonly palette: Readonly<{ color: "white"; coeff: 10 }> | null;
  readonly hitsplatVisible: boolean;
}

function knockOffTargetOffsetAtAge(age: number): Readonly<{ x2: number; y2: number }> {
  if (age < 17) return { x2: 0, y2: 0 };
  if (age < 22) {
    return slideMonToOffsetAtTick({
      battlerSide: "opponent",
      targetXOffset: -12,
      targetYOffset: 10,
      mirrorVertical: false,
      durationTicks: 3,
    }, age - 17);
  }

  // The target shake is created while the slide-out offset is held. The
  // final target-return helper starts later and, by source task priority,
  // writes its absolute interpolation before the shake task applies its
  // same-tick delta. These are callback-order deltas, not fitted positions.
  const held = { x2: 12, y2: 9 };
  const shakeDeltaByAge = new Map<number, number>([
    [22, -3], [23, 6], [25, -6], [27, 6], [29, -6], [31, 3],
  ]);
  if (age < 29) {
    let y2 = held.y2;
    for (let tick = 22; tick <= age; tick += 1) {
      y2 += shakeDeltaByAge.get(tick) ?? 0;
    }
    return { x2: held.x2, y2 };
  }
  const restored = slideMonToOriginalPosAtTick({
    currentX2: 12,
    currentY2: 12,
    axisSnapMode: 0,
    durationTicks: 6,
  }, age - 29);
  return {
    x2: restored.x2,
    y2: restored.y2 + (shakeDeltaByAge.get(age) ?? 0),
  };
}

/**
 * Source-relative MOVE_KNOCK_OFF body.
 *
 * Ages are animation-script ticks beginning with the horizontal-lunge
 * `createsprite`. The constants below are literal consequences of the
 * script's `delay 4`, `delay 8`, `delay 3`, `delay 5`, and `delay 10`
 * commands, never battle/turn/frame identifiers.
 */
export function knockOffBodyAtAge(
  age: number,
  attackerSide: KnockOffSide,
  targetSide: KnockOffSide,
): KnockOffBodyState {
  const attackerOffset = {
    x2: horizontalLungeX2AtTick(4, 6, attackerSide, age),
    y2: 0,
  };
  // The script's first restore helper has argv[0] = 0 and therefore targets
  // the attacker, which is already back at zero after the lunge. The
  // slide-out and later restore helper both target the defender.
  const targetOffset = targetSide === "opponent"
    ? knockOffTargetOffsetAtAge(age)
    : { x2: -knockOffTargetOffsetAtAge(age).x2, y2: knockOffTargetOffsetAtAge(age).y2 };
  const strikeAge = age - 7;
  const strike = strikeAge >= 0 && strikeAge < 8
    ? {
      angle: (192 + (targetSide === "player" ? -11 : 11) * (strikeAge + 1)) & 0xff,
      sheetFrame: (strikeAge < 3 ? 0 : 1) as 0 | 1,
      mirrored: targetSide === "player",
    }
    : null;

  return {
    attackerOffset,
    targetOffset,
    strike,
    // AnimComplexPaletteBlend applies white immediately, counts its five
    // delay callbacks, then restores with the second (black, coeff 0) leg.
    palette: age >= 17 && age <= 21 ? { color: "white", coeff: 10 } : null,
    // Animation 2's affine program is displayed for ten OAM transfers.
    hitsplatVisible: age >= 17 && age <= 26,
  };
}
