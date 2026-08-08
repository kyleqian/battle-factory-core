import { windUpLungeAtTick } from "./windUpLunge.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
  type SlideMonBattlerSide,
} from "./slideMon.ts";
import { shakeMonInPlaceOffsetAtTick } from "./shakeMonInPlace.ts";

/**
 * Complete source-relative `Move_TAKE_DOWN` visual body.
 *
 * Ages are RAM truth relative to the move-owned window (frame 214 both
 * orientations, so they share the same ages and differ only in the battler
 * geometry and side sign). `move_TAKE_DOWN`:
 *
 *     loadspritegfx ANIM_TAG_IMPACT
 *     monbg ANIM_DEF_PARTNER              -> target moved to BG (singles)
 *     setalpha 12, 8
 *     createvisualtask AnimTask_WindUpLunge, 5, ANIM_ATTACKER, -24, 8, 23, 10, 40, 10
 *     delay 35
 *     complex_palette_blend ... F_PAL_BG|F_PAL_BATTLERS, 3, 1, BLACK 10 -> BLACK 0
 *     create_basic_hitsplat_sprite ANIM_ATTACKER, 4, x=-10, y=0, relative_to=ANIM_TARGET, 0
 *     playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET
 *     delay 1
 *     createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 1, -16, 0, 0, 4
 *     waitforvisualfinish
 *     createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 4, 0, 12, 1
 *     waitforvisualfinish
 *     delay 2
 *     createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 5
 *     delay 3
 *     createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 1, 0, 7
 *     waitforvisualfinish
 *     clearmonbg ANIM_DEF_PARTNER / blendoff / end
 *
 * Measured windows (`tools/compare/evidence/take-down-changemap-*.txt`):
 * player-back 214..311 (98 frames), opponent-front 215..311 (97 frames, the
 * 214 opening frame carries the DETECT-class enemy-shadow teardown). RAM
 * events land at the same absolute frames in both orientations:
 * - WindUpLunge: task created RAM 220, Step1 writes x2 -2..-24 over RAM
 *   221-243 (windUpDuration 23), Step2 delay (10) holds -24 over RAM 244-253,
 *   Step2 lunge returns x2 -20..+16 over RAM 254-263 (lungeDelta 1024),
 *   task destroyed at 264. Opponent attacker mirrors to +1..+23 / +19..-17.
 * - The wave (amplitude 8) rides `Sin((u8)(data[10]>>8), 8)`: probe y2 = 0,0,
 *   2,3,4,4,5,6,7,...0 over the windup, held through the delay and lunge.
 * - monbg: the TARGET (ANIM_DEF_PARTNER bit0 = ANIM_TARGET) is moved to BG1
 *   from RAM 218 to 306 (invisible), restored by clearmonbg at 307.
 * - complex_palette_blend sprite alive RAM 258-265: first blend (BLACK, y=10)
 *   writes 84 faded entries at 258, second at 261; hardware shows them 259/262.
 * - basic hitsplat created RAM 258 at the TARGET's center + (x=-10 mirrored),
 *   alive through 266, destroyed 267 (its teardown is the 537px change at 268).
 * - SlideMonToOffset (target, -16 mirrored, duration 4) moves the target x2
 *   4,8,12,16 over RAM 261-264, holds 16; sprite gone 266.
 * - ShakeMonInPlace (x=4,y=0,n=12,delay=1) toggles the target x2 12/20 around
 *   the 16 hold over RAM 268-288, restores 16 at 289.
 * - SlideMonToOriginalPos #1 (attacker, 5 ticks) returns attacker 12,9,6,3,0
 *   over RAM 294-298; #2 (target, 7 ticks) returns target 13,11,9,6,4,2,0 over
 *   RAM 299-305. Both destroyed at 299/306.
 * - setalpha (BLDCNT 0x3f40) at 221, blendoff at 307. SE_M_MEGA_KICK2 at 258.
 */
export interface TakeDownHitsplat {
  readonly x: number;
  readonly y: number;
  readonly animation: 0;
}

export interface TakeDownSoundEvent {
  readonly age: number;
  readonly song: "SE_M_MEGA_KICK2";
  readonly pan: number;
}

export interface TakeDownState {
  readonly attackerX2: number;
  readonly attackerY2: number;
  readonly targetX2: number;
  readonly windUpActive: boolean;
  readonly slideToOffsetCount: number;
  readonly slideToOriginalCount: number;
  readonly hitsplat: TakeDownHitsplat | null;
  readonly blendDarken: boolean;
  readonly monbg: boolean;
  readonly soundEvents: readonly TakeDownSoundEvent[];
}

export interface TakeDownGeometry {
  readonly attackerSide: SlideMonBattlerSide;
  readonly targetSide: SlideMonBattlerSide;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

/** RAM age of the first WindUpLunge Step1 write. */
export const WIND_UP_FIRST_STEP_AGE = 7;
/** RAM age of the complex-palette-blend / hitsplat / SE frame. */
export const CONTACT_AGE = 44;
/** RAM age of the SlideMonToOffset target push's first write. */
export const TARGET_PUSH_FIRST_STEP_AGE = 47;
/** RAM age of the ShakeMonInPlace task's first toggle write. */
export const SHAKE_FIRST_STEP_AGE = 54;
/** RAM age of the first SlideMonToOriginalPos (attacker) creation. */
export const SLIDE_BACK_ATTACKER_AGE = 80;
/** RAM age of the second SlideMonToOriginalPos (target) creation. */
export const SLIDE_BACK_TARGET_AGE = 85;
/** RAM age of the script's trailing `clearmonbg`/`blendoff`. */
export const CLEAR_AGE = 93;

const LUNGE_ARGS = {
  horizontalSpeed: -24,
  waveAmplitude: 8,
  windUpDuration: 23,
  delayBeforeLunge: 10,
  targetXOffset: 40,
  lungeDuration: 10,
} as const;

export function takeDownAtAge(
  age: number,
  geometry: TakeDownGeometry,
): TakeDownState {
  const { attackerSide, targetSide, targetCenter } = geometry;
  // The target's slide/shake/return all mirror for a player-side target: the
  // SlideMonToOffset script arg is `-16`, which `SlideMonToOffset` itself only
  // negates for the opponent side, so the player-side target is pushed -16.
  const targetSign = targetSide === "player" ? -1 : 1;

  const lunge = windUpLungeAtTick(LUNGE_ARGS, attackerSide, age - WIND_UP_FIRST_STEP_AGE);

  // The target's slide-to-offset (created by gSlideMonToOffsetSpriteTemplate,
  // -16 mirrored for the opponent side, duration 4) pushes it +16 over ages
  // 47-50 and holds 16 until the slide-back at 85 (or -16 for the player side).
  const push = age >= TARGET_PUSH_FIRST_STEP_AGE
    ? slideMonToOffsetAtTick({
        battlerSide: targetSide,
        targetXOffset: -16,
        targetYOffset: 0,
        mirrorVertical: false,
        durationTicks: 4,
      }, age - TARGET_PUSH_FIRST_STEP_AGE).x2
    : 0;

  // ShakeMonInPlace (4, 0, 12, 1) toggles the target x2 between the pushed
  // hold +/-16 by +/-4 over ages 54-74, restoring at 75.
  const shake = age >= SHAKE_FIRST_STEP_AGE
    ? shakeMonInPlaceOffsetAtTick(4, 0, 12, 1, age - SHAKE_FIRST_STEP_AGE + 1).x2
    : 0;

  // The lunge's own last x2/y2 writes hold on the sprite after the task is
  // destroyed: the attacker rests at +16 (player) / -17 (opponent), y2 held at
  // the sine tail 1, until the SlideMonToOriginalPos dummy returns it to rest.
  let attackerX2 = lunge.offset.x2;
  let attackerY2 = age >= WIND_UP_FIRST_STEP_AGE ? lunge.offset.y2 : 0;
  let targetX2 = age < TARGET_PUSH_FIRST_STEP_AGE
    ? 0
    : push + (age >= SHAKE_FIRST_STEP_AGE && age < 75 ? shake : 0);
  if (age >= SLIDE_BACK_ATTACKER_AGE) {
    const back = slideMonToOriginalPosAtTick({
      currentX2: lunge.offset.x2,
      currentY2: lunge.offset.y2,
      axisSnapMode: 0,
      durationTicks: 5,
    }, age - SLIDE_BACK_ATTACKER_AGE);
    attackerX2 = back.x2;
    attackerY2 = back.y2;
  }
  if (age >= SLIDE_BACK_TARGET_AGE) {
    targetX2 = slideMonToOriginalPosAtTick({
      currentX2: targetSign * 16,
      currentY2: 0,
      axisSnapMode: 0,
      durationTicks: 7,
    }, age - SLIDE_BACK_TARGET_AGE).x2;
  }

  const hitsplat = age >= CONTACT_AGE && age <= 52
    ? {
        x: targetCenter.x + (targetSide === "player" ? 10 : -10),
        y: targetCenter.y,
        animation: 0 as const,
      }
    : null;

  return {
    attackerX2,
    attackerY2,
    targetX2,
    windUpActive: age >= WIND_UP_FIRST_STEP_AGE && age < 50,
    slideToOffsetCount: age >= TARGET_PUSH_FIRST_STEP_AGE && age < TARGET_PUSH_FIRST_STEP_AGE + 5 ? 1 : 0,
    slideToOriginalCount:
      (age >= SLIDE_BACK_ATTACKER_AGE && age < SLIDE_BACK_ATTACKER_AGE + 5 ? 1 : 0)
      + (age >= SLIDE_BACK_TARGET_AGE && age < SLIDE_BACK_TARGET_AGE + 7 ? 1 : 0),
    hitsplat,
    blendDarken: age >= CONTACT_AGE && age < 47,
    monbg: age >= 4 && age < CLEAR_AGE,
    soundEvents: age === CONTACT_AGE
      ? [{
          age,
          song: "SE_M_MEGA_KICK2",
          pan: targetSide === "player" ? -63 : 63,
        }]
      : [],
  };
}
