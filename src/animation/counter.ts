/**
 * Complete source-relative `Move_COUNTER` visual body.
 *
 * Ages are RAM truth relative to the move-owned window (frame 207 both
 * orientations, so both orientations share the same ages and differ only in
 * the battler geometry and the mirrored x offsets). COUNTER has TWO
 * task-driven motions measured separately: the elliptical attacker lunge
 * displays TWO frames after its RAM state (RAM age 10 -> pixels age 12, the
 * TAKE_DOWN WindUpLunge / LICK ShakeMon2 case) while the ShakeMon target x2
 * displays only ONE frame after its RAM state (RAM flips at odd ages ->
 * change-map events at even ages 270,272,...); both slides are SPRITE-driven
 * and display RAM+1. The draw case must therefore split the latch (two-age
 * lunge, one-age shake, one-age slides), exactly as the staging ledger's
 * displayed-timing mapping states. This reducer stays calibrated to the
 * probe's RAM readings.
 *
 * The whole window is static except for the settled event list
 * (`tools/compare/evidence/counter-changemap-*.txt`):
 * - `loadspritegfx ANIM_TAG_IMPACT` + `ANIM_TAG_HANDS_AND_FEET` fill the
 *   12-age static prefix (no move sprites, no tasks, screen byte-identical).
 * - `monbg ANIM_DEF_PARTNER` hides the target sprite from RAM age 7;
 *   `setalpha 12, 8` (BLDCNT 0x3f40 / BLDALPHA 0x080c) from age 10; both
 *   cleared by `clearmonbg`/`blendoff` at age 83 (RAM-truth only - the change
 *   map is static after age 83, no blend pixel step).
 * - `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER,18,6,1,4)` runs
 *   one full elliptical cycle at wavePeriod 1<<4=16: attacker x2/y2 over RAM
 *   ages 10-23 = Sin(phase,18)/-Cos(phase,6)+6 at phase 16,32,...,224 (x2
 *   negated for an opponent-side attacker), task destroyed age 24 (x2=y2=0).
 * - `SlideMonToOffset(0,20,0,0,4)` dummy (invisible, at the TARGET X_2/Y_PIC)
 *   drives the attacker x2 5,10,15,20,20 over ages 25-29 (mirrored -20 for an
 *   opponent-side attacker); the x2 holds at the final offset through age 56.
 * - three `create_basic_hitsplat_sprite` (ANIM_TAG_IMPACT, static anim 0,
 *   affine anim 0, subpriority 28, `AnimHitSplatBasic`) at target-relative
 *   anchors (x mirrored by `SetAnimSpriteInitialXOffset`) - ages 31/39/47,
 *   alive 9 ages each - and three `create_fist_sprite` (gFistFootSpriteTemplate
 *   `AnimBasicFistOrFoot`/`WaitAnimForDuration`, anim 0, subpriority 27) at the
 *   same anchors 3 ages later, alive 9 ages each (the `SetCallbackToStoredInData6`
 *   hop keeps the final no-op frame on screen: ages 34-42, 42-50, 50-58).
 * - `AnimTask_ShakeMon(ANIM_TARGET,5,0,25,1)` first observed RAM age 34; the
 *   target x2 toggles 5/0 in same-value pairs, flips at odd ages (5 on 36-37,
 *   0 on 38-39, ...), restoring 0 and self-destroying at age 82. The reducer
 *   leaves targetX2 0 before the shake: the pre-shake ONIX front-idle x2=1
 *   hold is a species-idle property the draw case supplies, not the move's
 *   state (and after the shake the x2 stays 0).
 * - `SlideMonToOriginalPos(0,0,5)` dummy drives the attacker x2 back from the
 *   held offset (20/-20) to 0 over ages 57-61.
 * - SE_M_VITAL_THROW plays at the lunge start (age 10); SE_M_VITAL_THROW2
 *   three times at the hitsplat ages 31/39/47 (SE1, pan X tracked).
 */
export type CounterBattlerSide = "player" | "opponent";

export interface CounterFistSprite {
  readonly x: number;
  readonly y: number;
}

export interface CounterHitsplatSprite {
  readonly x: number;
  readonly y: number;
  /**
   * The ROM's OAM slot for this sprite, measured from the probe's hardware OAM
   * (not allocator order). The allocator hands out slots 3,4,5 to the first
   * three sprites and then reuses them cyclically, so the hitsplats land on
   * slots 3 (h1), 5 (h2), 4 (h3) and the fists on 4 (f1), 3 (f2), 5 (f3). For
   * equal-subpriority semi-transparent overlaps the LOWER OAM slot wins the
   * PPU's one-selected-OBJ blend (probe-measured at the frame-247
   * hitsplat1/hitsplat2 and frame-255 hitsplat2/hitsplat3 overlaps), so the
   * draw case sorts the hitsplats by this slot descending.
   */
  readonly slot: number;
}

export interface CounterSoundEvent {
  readonly age: number;
  readonly song: "SE_M_VITAL_THROW" | "SE_M_VITAL_THROW2";
  readonly pan: number;
}

export interface CounterState {
  readonly attackerX2: number;
  readonly attackerY2: number;
  readonly fists: readonly CounterFistSprite[];
  readonly hitsplats: readonly CounterHitsplatSprite[];
  readonly targetX2: number;
  readonly targetInvisible: boolean;
  readonly blendOn: boolean;
  readonly soundEvents: readonly CounterSoundEvent[];
}

export interface CounterGeometry {
  readonly attackerSide: CounterBattlerSide;
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetSide: CounterBattlerSide;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

/** RAM age of `monbg ANIM_DEF_PARTNER` (target sprite invisible, BG copy). */
export const MONBG_AGE = 7;
/** RAM age of `setalpha 12, 8` and the elliptical lunge task's first observed tick. */
export const SETALPHA_AGE = 10;
/** RAM age `AnimTask_TranslateMonEllipticalRespectSide` self-destroys (x2=y2=0). */
export const LUNGE_DESTROY_AGE = 24;
/** RAM age `SlideMonToOffset(0,20,0,0,4)` starts driving the attacker x2. */
export const SLIDE_OFFSET_FIRST_AGE = 25;
/** RAM age of the first basic hitsplat (x=-15,y=18) / SE_M_VITAL_THROW2. */
export const HITSPLAT_1_AGE = 31;
/** RAM age of the first fist sprite (x=-15,y=18). */
export const FIST_1_AGE = 34;
/** RAM age of `AnimTask_ShakeMon(ANIM_TARGET,5,0,25,1)`'s first observed tick. */
export const SHAKE_FIRST_AGE = 34;
/** RAM age of the second hitsplat (x=0,y=-4). */
export const HITSPLAT_2_AGE = 39;
/** RAM age of the second fist (x=0,y=-4). */
export const FIST_2_AGE = 42;
/** RAM age of the third hitsplat (x=15,y=9). */
export const HITSPLAT_3_AGE = 47;
/** RAM age of the third fist (x=15,y=9). */
export const FIST_3_AGE = 50;
/** RAM age `SlideMonToOriginalPos(0,0,5)` starts driving the attacker x2 back. */
export const SLIDE_ORIGIN_FIRST_AGE = 57;
/** RAM age of `clearmonbg`/`blendoff`. */
export const CLEAR_AGE = 83;

const ELLIPSE_WIDTH = 18;
const ELLIPSE_HEIGHT = 6;
const ELLIPSE_STEP = 16;
const SLIDE_OFFSET_DISTANCE = 20;
const SLIDE_OFFSET_DURATION = 4;
export const SLIDE_ORIGIN_DURATION = 5;
const HITSPLAT_LIFETIME = 9;
const FIST_LIFETIME = 9;
const SHAKE_TICK_BASE = 33; // RAM age 34 -> shakeMonSequence tick 1

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
} from "./slideMon.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";

function sin(index: number, amplitude: number): number {
  const value = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((amplitude * value) / 256);
}

function cos(index: number, amplitude: number): number {
  return sin(index + 64, amplitude);
}

/**
 * `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER,18,6,1,4)` at a
 * RAM age. Wave period 1<<4 = 16, so the first observed tick (age 10) already
 * writes phase 16 and the task runs phases 16..240 then wraps to 0 and
 * self-destroys at age 24. `RespectSide` negates the width for an
 * opponent-side attacker. Verified against the probe: (6,1)@10,
 * (18,6)@13, (-18,6)@21, (-13,2)@23, (0,0)@24.
 */
function counterAttackerOffset(
  age: number,
  attackerSide: CounterBattlerSide,
): { x2: number; y2: number } {
  if (age < SETALPHA_AGE || age >= LUNGE_DESTROY_AGE) return { x2: 0, y2: 0 };
  const phase = ELLIPSE_STEP * (age - SETALPHA_AGE + 1);
  const width = attackerSide === "player" ? ELLIPSE_WIDTH : -ELLIPSE_WIDTH;
  return {
    x2: sin(phase, width),
    y2: -cos(phase, ELLIPSE_HEIGHT) + ELLIPSE_HEIGHT,
  };
}

/** The attacker x2 held after `SlideMonToOffset` finishes (mirrored for an opponent-side attacker). */
function slideOffsetFinalX2(attackerSide: CounterBattlerSide): number {
  return slideMonToOffsetAtTick(
    {
      battlerSide: attackerSide,
      targetXOffset: SLIDE_OFFSET_DISTANCE,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: SLIDE_OFFSET_DURATION,
    },
    SLIDE_OFFSET_DURATION,
  ).x2;
}

/**
 * The attacker sprite's own x2 at a RAM age: the elliptical lunge (ages 10-23),
 * the slide-to-offset ramp + hold (ages 25-56), and the slide-to-original
 * return (ages 57-61). The two slide dummy sprites use the shared `slideMon.ts`
 * ports verbatim.
 */
function counterAttackerX2(age: number, geometry: CounterGeometry): number {
  if (age >= SLIDE_ORIGIN_FIRST_AGE && age < SLIDE_ORIGIN_FIRST_AGE + SLIDE_ORIGIN_DURATION) {
    return slideMonToOriginalPosAtTick(
      {
        currentX2: slideOffsetFinalX2(geometry.attackerSide),
        currentY2: 0,
        axisSnapMode: 0,
        durationTicks: SLIDE_ORIGIN_DURATION,
      },
      age - SLIDE_ORIGIN_FIRST_AGE,
    ).x2;
  }
  if (age >= SLIDE_OFFSET_FIRST_AGE && age < SLIDE_ORIGIN_FIRST_AGE) {
    return slideMonToOffsetAtTick(
      {
        battlerSide: geometry.attackerSide,
        targetXOffset: SLIDE_OFFSET_DISTANCE,
        targetYOffset: 0,
        mirrorVertical: false,
        durationTicks: SLIDE_OFFSET_DURATION,
      },
      Math.min(age - SLIDE_OFFSET_FIRST_AGE, SLIDE_OFFSET_DURATION),
    ).x2;
  }
  if (age >= SETALPHA_AGE && age < LUNGE_DESTROY_AGE) {
    return counterAttackerOffset(age, geometry.attackerSide).x2;
  }
  return 0;
}

/** The attacker sprite's own y2 at a RAM age (only the lunge moves y). */
function counterAttackerY2(age: number, geometry: CounterGeometry): number {
  if (age >= SETALPHA_AGE && age < LUNGE_DESTROY_AGE) {
    return counterAttackerOffset(age, geometry.attackerSide).y2;
  }
  return 0;
}

/**
 * `SetAnimSpriteInitialXOffset` mirroring: the sprite x offset is SUBTRACTED
 * when the attacker sits right of the target, ADDED otherwise (the
 * attackerX==targetX branch is unreachable in a 1v1). Verified against the
 * probe: player-back target (161,60)=(176-15,42+18), opponent-front
 * (87,106)=(72+15,88+18).
 */
function mirroredAnchor(
  xOffset: number,
  yOffset: number,
  geometry: CounterGeometry,
): Omit<CounterHitsplatSprite, "slot"> {
  const right = geometry.attackerCenter.x > geometry.targetCenter.x;
  return {
    x: geometry.targetCenter.x + (right ? -xOffset : xOffset),
    y: geometry.targetCenter.y + yOffset,
  };
}

const HITSPLAT_SPECS = [
  { spawnAge: HITSPLAT_1_AGE, xOffset: -15, yOffset: 18 },
  { spawnAge: HITSPLAT_2_AGE, xOffset: 0, yOffset: -4 },
  { spawnAge: HITSPLAT_3_AGE, xOffset: 15, yOffset: 9 },
] as const;

const FIST_SPECS = [
  { spawnAge: FIST_1_AGE, xOffset: -15, yOffset: 18 },
  { spawnAge: FIST_2_AGE, xOffset: 0, yOffset: -4 },
  { spawnAge: FIST_3_AGE, xOffset: 15, yOffset: 9 },
] as const;

function counterHitsplats(
  age: number,
  geometry: CounterGeometry,
): readonly CounterHitsplatSprite[] {
  return HITSPLAT_SPECS.flatMap((spec, index) => {
    if (age < spec.spawnAge || age >= spec.spawnAge + HITSPLAT_LIFETIME) return [];
    return [{ ...mirroredAnchor(spec.xOffset, spec.yOffset, geometry), slot: 3 + ((index * 2) % 3) }];
  });
}

function counterFists(age: number, geometry: CounterGeometry): readonly CounterFistSprite[] {
  return FIST_SPECS.flatMap((spec) => {
    if (age < spec.spawnAge || age >= spec.spawnAge + FIST_LIFETIME) return [];
    return [mirroredAnchor(spec.xOffset, spec.yOffset, geometry)];
  });
}

/**
 * `AnimTask_ShakeMon(ANIM_TARGET,5,0,25,1)`'s target x2 at a RAM age. The
 * shared `shakeMonSequence(5,0,25,1)` port's tick 0 (+5 creation write) is
 * behind the first observed frame, so the observed ONIX x2 (0 at age 34-35,
 * 5 at 36-37, ...) is the shared sequence shifted one tick (age 34 -> tick 1).
 * Restored to 0 and self-destroyed at age 82.
 */
function counterShakeX2(age: number): number {
  if (age < SHAKE_FIRST_AGE || age >= SHAKE_FIRST_AGE + 48) return 0;
  return shakeMonOffsetAtTick(5, 0, 25, 1, age - SHAKE_TICK_BASE).x2;
}

export function counterAtAge(age: number, geometry: CounterGeometry): CounterState {
  const soundEvents: CounterSoundEvent[] = [];
  if (age === SETALPHA_AGE) {
    soundEvents.push({
      age,
      song: "SE_M_VITAL_THROW",
      pan: geometry.attackerSide === "player" ? -64 : 63,
    });
  }
  for (const spec of HITSPLAT_SPECS) {
    if (age === spec.spawnAge) {
      soundEvents.push({
        age,
        song: "SE_M_VITAL_THROW2",
        pan: geometry.targetSide === "player" ? -63 : 63,
      });
    }
  }
  return {
    attackerX2: counterAttackerX2(age, geometry),
    attackerY2: counterAttackerY2(age, geometry),
    fists: counterFists(age, geometry),
    hitsplats: counterHitsplats(age, geometry),
    targetX2: counterShakeX2(age),
    targetInvisible: age >= MONBG_AGE && age < CLEAR_AGE,
    blendOn: age >= SETALPHA_AGE && age < CLEAR_AGE,
    soundEvents,
  };
}
