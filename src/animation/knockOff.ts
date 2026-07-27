import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { shakeMonInPlaceOffsetAtTick } from "./shakeMonInPlace.ts";
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
  let attackerOffset = {
    x2: horizontalLungeX2AtTick(4, 6, attackerSide, age),
    y2: 0,
  };
  if (age >= 12 && age < 20) {
    attackerOffset = slideMonToOffsetAtTick(
      {
        battlerSide: attackerSide,
        targetXOffset: -12,
        targetYOffset: 10,
        mirrorVertical: false,
        durationTicks: 3,
      },
      age - 12,
    );
  } else if (age >= 20) {
    const heldX2 = attackerSide === "player" ? -12 : 12;
    attackerOffset = slideMonToOriginalPosAtTick(
      {
        currentX2: heldX2,
        currentY2: 10,
        axisSnapMode: 1,
        durationTicks: 6,
      },
      age - 20,
    );
  }

  const targetOffset = shakeMonInPlaceOffsetAtTick(0, 3, 6, 1, age - 15);
  const strikeAge = age - 4;
  const strike = strikeAge >= 0 && strikeAge < 8
    ? {
      angle: (192 + (targetSide === "player" ? -11 : 11) * strikeAge) & 0xff,
      sheetFrame: (strikeAge < 4 ? 0 : 1) as 0 | 1,
      mirrored: targetSide === "player",
    }
    : null;

  return {
    attackerOffset,
    targetOffset,
    strike,
    // AnimComplexPaletteBlend applies white immediately, counts its five
    // delay callbacks, then restores with the second (black, coeff 0) leg.
    palette: age >= 12 && age <= 17 ? { color: "white", coeff: 10 } : null,
    // `create_basic_hitsplat_sprite ... animation=2`: the shared affine
    // program contains eight timed frames before its stored destroy callback.
    hitsplatVisible: age >= 12 && age < 20,
  };
}
