// Source-composed ICE_PUNCH presentation clocks. Ages are relative to the
// first displayed `Move_ICE_PUNCH` script frame, never a battle tick.

import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import {
  battleAnimTeardownState,
  type BattleAnimTeardownState,
} from "./battleAnimTeardown.ts";

export const ICE_PUNCH_OVERLAY_FIRST_AGE = 16;
export const ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE = 35;
export const ICE_PUNCH_LARGE_SPIRAL_FIRST_AGE = 42;
export const ICE_PUNCH_SPIRAL_TICKS = 30;
export const ICE_PUNCH_HIT_FIRST_AGE = 90;
export const ICE_PUNCH_HIT_SPAWN_CADENCE = 6;
export const ICE_PUNCH_HIT_LIFETIME = 37;
export const ICE_PUNCH_TARGET_RESTORE_FIRST_AGE = 139;
export const ICE_PUNCH_BG_RESTORE_FIRST_AGE = 166;
export const ICE_PUNCH_MON_BG_CLEAR_AGE = 179;
export const ICE_PUNCH_SCRIPT_END_AGE = 183;

export const ICE_PUNCH_TEARDOWN_PROFILE = Object.freeze({
  paletteRestoreFirstAge: ICE_PUNCH_BG_RESTORE_FIRST_AGE,
  paletteInitialCoeff: 7,
  paletteTargetCoeff: 0,
  paletteDelta: 2,
  paletteCallbacksPerStep: 2,
  monBgClearAge: ICE_PUNCH_MON_BG_CLEAR_AGE,
  scriptEndAge: ICE_PUNCH_SCRIPT_END_AGE,
});

const SMALL_PHASES = [0, 64, 128, 192] as const;
const LARGE_PHASES = [32, 96, 160, 224] as const;
const HIT_CRYSTALS = [
  { kind: "large", x: -10, y: -10, sourceSlot: 3 },
  { kind: "small", x: 10, y: 20, sourceSlot: 4 },
  { kind: "large", x: -5, y: 10, sourceSlot: 5 },
  { kind: "small", x: 17, y: -12, sourceSlot: 7 },
  { kind: "small", x: -15, y: 15, sourceSlot: 9 },
  { kind: "small", x: 0, y: 0, sourceSlot: 10 },
  { kind: "large", x: 20, y: 2, sourceSlot: 11 },
] as const;

/**
 * RAM-pinned `GetBattlerSpriteSubpriority(target) - offset` results. Lower
 * subpriority reaches lower OAM indices and wins within the shared OBJ
 * priority, so software compositing visits this list back-to-front.
 */
export const ICE_PUNCH_OBJ_LAYERS_BACK_TO_FRONT = [
  { kind: "crystal", subpriority: 28 },
  { kind: "hitsplat", subpriority: 27 },
  { kind: "fist", subpriority: 26 },
] as const;

export interface IcePunchCrystal {
  readonly kind: "small" | "large";
  readonly centerX: number;
  readonly centerY: number;
  /** OAM affine matrix, Q8.8. Small crystals use the identity matrix. */
  readonly pa: number;
  readonly pb: number;
  readonly pc: number;
  readonly pd: number;
  /** Source sprite slot, retained solely as the stable-sort identity. */
  readonly sourceSlot: number;
}

export interface IcePunchHitCrystal extends IcePunchCrystal {
  readonly visible: boolean;
}

export interface IcePunchOverlayState {
  readonly backgroundBlackCoeff: number;
  readonly targetIceCoeff: number;
  readonly teardown: BattleAnimTeardownState;
}

/**
 * The two source palette tasks become visible on the same three displayed
 * VBlanks. `simple_palette_blend` advances the BG ramp by two while
 * `AnimTask_BlendBattleAnimPal` advances the target ramp by one.
 */
export function icePunchOverlayState(age: number): IcePunchOverlayState {
  const teardown = battleAnimTeardownState(age, ICE_PUNCH_TEARDOWN_PROFILE);
  if (age < ICE_PUNCH_OVERLAY_FIRST_AGE) {
    return { backgroundBlackCoeff: 0, targetIceCoeff: 0, teardown };
  }
  if (age < ICE_PUNCH_OVERLAY_FIRST_AGE + 3) {
    return { backgroundBlackCoeff: 2, targetIceCoeff: 0, teardown };
  }
  if (age < ICE_PUNCH_OVERLAY_FIRST_AGE + 6) {
    return { backgroundBlackCoeff: 4, targetIceCoeff: 1, teardown };
  }
  return {
    backgroundBlackCoeff:
      age < ICE_PUNCH_OVERLAY_FIRST_AGE + 9
        ? 6
        : teardown.backgroundPaletteCoeff,
    targetIceCoeff:
      age < ICE_PUNCH_TARGET_RESTORE_FIRST_AGE
        ? Math.min(
            9,
            2 + Math.floor((age - (ICE_PUNCH_OVERLAY_FIRST_AGE + 6)) / 3),
          )
        : Math.max(
            0,
            8 - Math.floor((age - ICE_PUNCH_TARGET_RESTORE_FIRST_AGE) / 3),
          ),
    teardown,
  };
}

function gbaSin(index: number, amplitude: number): number {
  const value = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((amplitude * value) / 256);
}

function crystalAt(
  age: number,
  firstAge: number,
  phase: number,
  kind: IcePunchCrystal["kind"],
  sourceSlot: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): IcePunchCrystal | null {
  const n = age - firstAge;
  if (n < 0 || n >= ICE_PUNCH_SPIRAL_TICKS) return null;

  // AnimIcePunchSwirlingParticle invokes the translation callback once at
  // creation. The first displayed VBlank therefore contains source step 1.
  // On the last callback, TranslateSpriteInGrowingCircle destroys the sprite
  // before its radius-zero state reaches OAM; hardware retains the already
  // latched step 29 for the 30th display. The same source/OAM lifecycle is
  // independently visible for small (2403->2404) and large (2410->2411).
  const animationStep = n + 1;
  const translationStep = Math.min(
    animationStep,
    ICE_PUNCH_SPIRAL_TICKS - 1,
  );
  const radius = 60 - translationStep * 2;
  const orbitAngle = phase + translationStep * 9;
  // Affine animation advances independently even while the destroyed
  // sprite's final translation is retained in hardware.
  const affineAngle = kind === "large" ? (animationStep + 1) * 40 : 0;
  const sine = kind === "large" ? gbaSin(affineAngle, 256) : 0;
  const cosine = kind === "large" ? gbaSin(affineAngle + 64, 256) : 256;
  return {
    kind,
    centerX: targetCenter.x + gbaSin(orbitAngle, radius),
    centerY: targetCenter.y + gbaSin(orbitAngle + 64, radius),
    pa: cosine,
    pb: kind === "large" ? -sine : 0,
    pc: sine,
    pd: cosine,
    sourceSlot,
  };
}

function oamTop(crystal: IcePunchCrystal): number {
  // gOamData_AffineOff_ObjBlend_8x8 uses a 4px half-height, while
  // gOamData_AffineDouble_ObjBlend_8x16 has a doubled 32px destination box.
  return crystal.centerY - (crystal.kind === "large" ? 16 : 4);
}

/**
 * Source-composed small+large Ice Punch spiral in software draw order.
 *
 * `SortSprites` insertion-sorts equal-priority sprites by OAM top Y and
 * preserves its prior order on ties. We replay that generic ordering from
 * the two source creation batches, then reverse OAM order for compositing.
 */
export function icePunchSpiralCrystals(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly IcePunchCrystal[] {
  let order: IcePunchCrystal[] = [];
  for (
    let taskAge = ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE;
    taskAge <= age;
    taskAge += 1
  ) {
    const live = [
      ...SMALL_PHASES.map((phase, index) =>
        crystalAt(
          taskAge,
          ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE,
          phase,
          "small",
          [3, 4, 5, 7][index]!,
          targetCenter,
        )),
      ...LARGE_PHASES.map((phase, index) =>
        crystalAt(
          taskAge,
          ICE_PUNCH_LARGE_SPIRAL_FIRST_AGE,
          phase,
          "large",
          9 + index,
          targetCenter,
        )),
    ].filter((crystal): crystal is IcePunchCrystal => crystal !== null);
    const liveSlots = new Set(live.map((crystal) => crystal.sourceSlot));
    order = order.filter((crystal) => liveSlots.has(crystal.sourceSlot));
    for (const crystal of live) {
      const existing = order.findIndex(
        (candidate) => candidate.sourceSlot === crystal.sourceSlot,
      );
      if (existing >= 0) order[existing] = crystal;
      else order.push(crystal);
    }
    order.sort((a, b) => oamTop(b) - oamTop(a));
  }
  return order.reverse();
}

/**
 * Seven source `IceCrystalEffectShort` sprites in software draw order.
 *
 * Script `delay 4` produces a six-callback create cadence in this command
 * stream. The affine animation starts at scale 211/256, reaches identity
 * over ten callbacks, holds for six, then its stored callback flickers for
 * 20 callbacks. `age` is callback/RAM age; the presentation adapter applies
 * the shared one-frame OBJ latch.
 */
export function icePunchHitCrystals(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  horizontalDirection: -1 | 1 = 1,
): readonly IcePunchHitCrystal[] {
  return HIT_CRYSTALS.flatMap((definition, index) => {
    const localAge =
      age - (ICE_PUNCH_HIT_FIRST_AGE + index * ICE_PUNCH_HIT_SPAWN_CADENCE);
    if (localAge < 0 || localAge >= ICE_PUNCH_HIT_LIFETIME) return [];
    const affineStep = Math.min(localAge, 9);
    const matrix = Math.floor(0x10000 / (211 + affineStep * 5));
    return [{
      kind: definition.kind,
      centerX: targetCenter.x + definition.x * horizontalDirection,
      centerY: targetCenter.y + definition.y,
      pa: matrix,
      pb: 0,
      pc: 0,
      pd: matrix,
      sourceSlot: definition.sourceSlot,
      visible: localAge < 18 || localAge % 2 === 1,
    }];
  }).sort((a, b) => {
    const topA = a.centerY - (a.kind === "large" ? 8 : 4);
    const topB = b.centerY - (b.kind === "large" ? 8 : 4);
    return topA - topB || b.sourceSlot - a.sourceSlot;
  });
}
