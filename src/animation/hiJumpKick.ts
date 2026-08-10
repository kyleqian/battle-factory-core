import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
  type SlideMonBattlerSide,
} from "./slideMon.ts";
import { shakeMonInPlaceOffsetAtTick } from "./shakeMonInPlace.ts";

/** The two legal Scene-ON orientations used by this acceptance unit. */
export type HiJumpKickSide = SlideMonBattlerSide;

export type HiJumpKickSound = "SE_M_JUMP_KICK" | "SE_M_VITAL_THROW2";

export interface HiJumpKickSoundEvent {
  readonly age: number;
  readonly song: HiJumpKickSound;
  readonly panSide: HiJumpKickSide;
}

export interface HiJumpKickFoot {
  /** `gJumpKickSpriteTemplate`'s post-callback primary coordinates. */
  readonly x: number;
  readonly y: number;
  /** `AnimTravelDiagonally`'s Q8.8 secondary-coordinate output. */
  readonly x2: number;
  readonly y2: number;
  readonly variant: 1;
}

export interface HiJumpKickHitsplat {
  readonly x: number;
  readonly y: number;
  readonly animation: 1;
}

export interface HiJumpKickState {
  readonly active: boolean;
  readonly handsAndFeetLoaded: boolean;
  readonly impactLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  /** The live attacker sprite's source-RAM secondary coordinates. */
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  /** The live target sprite's source-RAM secondary x coordinate. */
  readonly targetX2: number;
  readonly slideToOffsetCount: number;
  readonly slideToOriginalCount: number;
  readonly shakeTaskActive: boolean;
  readonly foot: HiJumpKickFoot | null;
  readonly hitsplat: HiJumpKickHitsplat | null;
  readonly soundEvents: readonly HiJumpKickSoundEvent[];
}

/** First pointer-bounded source age: `loadspritgfx HANDS_AND_FEET`. */
export const HI_JUMP_KICK_FIRST_AGE = 0;
/** `loadspritgfx IMPACT` has completed by this RAM age. */
export const HI_JUMP_KICK_IMPACT_LOAD_AGE = 3;
/** `Task_UpdateMonBg` first hides the target's OBJ at this RAM age. */
export const HI_JUMP_KICK_MONBG_FIRST_AGE = 6;
/** `setalpha 12,8` first reaches the hardware register at this RAM age. */
export const HI_JUMP_KICK_ALPHA_FIRST_AGE = 9;
/** First `gSlideMonToOffsetSpriteTemplate` creation (attacker). */
export const HI_JUMP_KICK_ATTACKER_SLIDE_AGE = 9;
/** First `gSlideMonToOriginalPosSpriteTemplate` creation (attacker). */
export const HI_JUMP_KICK_ATTACKER_RETURN_AGE = 31;
/** First `gJumpKickSpriteTemplate` creation and `SE_M_JUMP_KICK`. */
export const HI_JUMP_KICK_FOOT_FIRST_AGE = 35;
/** First basic hitsplat, target push, and `SE_M_VITAL_THROW2`. */
export const HI_JUMP_KICK_CONTACT_AGE = 47;
/** First `AnimTask_ShakeMonInPlace` task step. */
export const HI_JUMP_KICK_SHAKE_FIRST_AGE = 52;
/** First target return dummy creation. */
export const HI_JUMP_KICK_TARGET_RETURN_AGE = 79;
/** `clearmonbg`/`blendoff` cleanup age. */
export const HI_JUMP_KICK_CLEAR_AGE = 86;
/** First inactive source frame is age 90. */
export const HI_JUMP_KICK_FRAME_COUNT = 91;

const IDENTITY = { x2: 0, y2: 0 } as const;

function sideSign(side: HiJumpKickSide): 1 | -1 {
  return side === "player" ? 1 : -1;
}

/**
 * `AnimTravelDiagonally`'s actual initial coordinates for the HJK args
 * (-16, 8, 0, 0, 10, ANIM_TARGET, 1, 1). It calls
 * `InitSpritePosToAnimTarget` twice, so the initial offsets are doubled. The
 * target's picture center is the source destination; the resulting movement
 * is (+/-32, +/-16) over ten `InitAnimLinearTranslation` callbacks.
 */
function footOffsetAtAge(
  age: number,
  targetSide: HiJumpKickSide,
): Readonly<{ x2: number; y2: number }> {
  const callbacks = age - HI_JUMP_KICK_FOOT_FIRST_AGE + 1;
  const horizontalDistance = targetSide === "player" ? -32 : 32;
  const verticalDistance = targetSide === "player" ? 16 : -16;
  return {
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(horizontalDistance, 10),
      callbacks,
      10,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(verticalDistance, 10),
      callbacks,
      10,
    ),
  };
}

function targetIdleX2(targetSide: HiJumpKickSide): number {
  // The accepted target is ONIX. Its front picture has the measured one-pixel
  // idle x2 residual; its player back picture starts at zero.
  return targetSide === "opponent" ? 1 : 0;
}

function targetPushAtAge(
  age: number,
  targetSide: HiJumpKickSide,
): number {
  return slideMonToOffsetAtTick({
    battlerSide: targetSide,
    targetXOffset: -28,
    targetYOffset: 0,
    mirrorVertical: false,
    durationTicks: 3,
  }, age - HI_JUMP_KICK_CONTACT_AGE).x2;
}

function targetPushHold(targetSide: HiJumpKickSide): number {
  return targetPushAtAge(targetSide === "player"
    ? HI_JUMP_KICK_CONTACT_AGE + 3
    : HI_JUMP_KICK_CONTACT_AGE + 3, targetSide);
}

/**
 * Pure source-relative reducer for `Move_HI_JUMP_KICK`.
 *
 * The age is the RAM row relative to the first in-bounds
 * `Move_HI_JUMP_KICK` pointer, not an absolute battle tick. Every timing
 * boundary below comes from this move's own script rows and dense bilateral
 * probe; in particular the ShakeMonInPlace cadence is not inherited from
 * Double Edge or Take Down.
 */
export function hiJumpKickAtAge(
  age: number,
  attackerSide: HiJumpKickSide,
  targetSide: HiJumpKickSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): HiJumpKickState {
  const attackerSignedOffset = sideSign(attackerSide) * -24;
  let attackerOffset: Readonly<{ x2: number; y2: number }> = IDENTITY;
  if (age >= HI_JUMP_KICK_ATTACKER_SLIDE_AGE
    && age < HI_JUMP_KICK_ATTACKER_RETURN_AGE) {
    attackerOffset = slideMonToOffsetAtTick({
      battlerSide: attackerSide,
      targetXOffset: -24,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: 8,
    }, age - HI_JUMP_KICK_ATTACKER_SLIDE_AGE);
  } else if (age >= HI_JUMP_KICK_ATTACKER_RETURN_AGE
    && age < HI_JUMP_KICK_FOOT_FIRST_AGE) {
    attackerOffset = slideMonToOriginalPosAtTick({
      currentX2: attackerSignedOffset,
      currentY2: 0,
      axisSnapMode: 0,
      durationTicks: 3,
    }, age - HI_JUMP_KICK_ATTACKER_RETURN_AGE);
  }

  const pushHold = targetPushHold(targetSide);
  let targetX2 = targetIdleX2(targetSide);
  if (age >= HI_JUMP_KICK_CONTACT_AGE
    && age < HI_JUMP_KICK_SHAKE_FIRST_AGE) {
    targetX2 = targetPushAtAge(age, targetSide);
  } else if (age >= HI_JUMP_KICK_SHAKE_FIRST_AGE
    && age < HI_JUMP_KICK_TARGET_RETURN_AGE) {
    // The task is created after the three-frame target push. Its initializer
    // performs the first write synchronously, then the frame-delay cadence
    // advances on alternating rows. `+1` is therefore deliberate: it maps
    // source age 52 to the helper's second sequence row (-3), matching both
    // HJK orientations' live OAM (24/-31).
    const shake = shakeMonInPlaceOffsetAtTick(
      3,
      0,
      11,
      1,
      age - HI_JUMP_KICK_SHAKE_FIRST_AGE + 1,
    ).x2;
    targetX2 = pushHold + shake;
  } else if (age >= HI_JUMP_KICK_TARGET_RETURN_AGE
    && age < HI_JUMP_KICK_CLEAR_AGE) {
    targetX2 = slideMonToOriginalPosAtTick({
      currentX2: pushHold,
      currentY2: 0,
      axisSnapMode: 0,
      durationTicks: 6,
    }, age - HI_JUMP_KICK_TARGET_RETURN_AGE).x2;
  } else if (age >= HI_JUMP_KICK_CLEAR_AGE) {
    targetX2 = 0;
  }

  const foot = age >= HI_JUMP_KICK_FOOT_FIRST_AGE
    && age < HI_JUMP_KICK_FOOT_FIRST_AGE + 11
    ? (() => {
        const targetSign = targetSide === "player" ? 1 : -1;
        const offset = footOffsetAtAge(age, targetSide);
        return {
          x: targetCenter.x + targetSign * 32,
          y: targetCenter.y + targetSign * -16,
          x2: offset.x2,
          y2: offset.y2,
          variant: 1 as const,
        };
      })()
    : null;

  const hitsplat = age >= HI_JUMP_KICK_CONTACT_AGE
    && age < HI_JUMP_KICK_CONTACT_AGE + 10
    ? {
        x: targetCenter.x,
        y: targetCenter.y,
        animation: 1 as const,
      }
    : null;

  return {
    active: age >= HI_JUMP_KICK_FIRST_AGE && age < 90,
    handsAndFeetLoaded: age >= HI_JUMP_KICK_FIRST_AGE
      && age < HI_JUMP_KICK_FRAME_COUNT - 1,
    impactLoaded: age >= HI_JUMP_KICK_IMPACT_LOAD_AGE
      && age < HI_JUMP_KICK_FRAME_COUNT - 1,
    targetOnMonBg: age >= HI_JUMP_KICK_MONBG_FIRST_AGE
      && age < HI_JUMP_KICK_CLEAR_AGE,
    alpha: age >= HI_JUMP_KICK_ALPHA_FIRST_AGE
      && age < HI_JUMP_KICK_CLEAR_AGE
      ? { eva: 12, evb: 8 }
      : null,
    attackerOffset,
    targetX2,
    slideToOffsetCount:
      (age >= HI_JUMP_KICK_ATTACKER_SLIDE_AGE
        && age < HI_JUMP_KICK_ATTACKER_SLIDE_AGE + 9 ? 1 : 0)
      + (age >= HI_JUMP_KICK_CONTACT_AGE
        && age < HI_JUMP_KICK_CONTACT_AGE + 4 ? 1 : 0),
    slideToOriginalCount:
      (age >= HI_JUMP_KICK_ATTACKER_RETURN_AGE
        && age < HI_JUMP_KICK_ATTACKER_RETURN_AGE + 3 ? 1 : 0)
      + (age >= HI_JUMP_KICK_TARGET_RETURN_AGE
        && age < HI_JUMP_KICK_TARGET_RETURN_AGE + 6 ? 1 : 0),
    shakeTaskActive: age >= HI_JUMP_KICK_SHAKE_FIRST_AGE
      && age < HI_JUMP_KICK_TARGET_RETURN_AGE - 8,
    foot,
    hitsplat,
    soundEvents: age === HI_JUMP_KICK_FOOT_FIRST_AGE
      ? [{ age, song: "SE_M_JUMP_KICK", panSide: targetSide }]
      : age === HI_JUMP_KICK_CONTACT_AGE
        ? [{ age, song: "SE_M_VITAL_THROW2", panSide: targetSide }]
        : [],
  };
}
