// Source-composed ICE_PUNCH presentation clocks. Ages are relative to the
// first displayed `Move_ICE_PUNCH` script frame, never a battle tick.

import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";

export const ICE_PUNCH_OVERLAY_FIRST_AGE = 16;
export const ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE = 35;
export const ICE_PUNCH_LARGE_SPIRAL_FIRST_AGE = 42;
export const ICE_PUNCH_SPIRAL_TICKS = 30;

const SMALL_PHASES = [0, 64, 128, 192] as const;
const LARGE_PHASES = [32, 96, 160, 224] as const;

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

export interface IcePunchOverlayState {
  readonly backgroundBlackCoeff: 0 | 2 | 4 | 6 | 7;
  readonly targetIceCoeff: number;
}

/**
 * The two source palette tasks become visible on the same three displayed
 * VBlanks. `simple_palette_blend` advances the BG ramp by two while
 * `AnimTask_BlendBattleAnimPal` advances the target ramp by one.
 */
export function icePunchOverlayState(age: number): IcePunchOverlayState {
  if (age < ICE_PUNCH_OVERLAY_FIRST_AGE) {
    return { backgroundBlackCoeff: 0, targetIceCoeff: 0 };
  }
  if (age < ICE_PUNCH_OVERLAY_FIRST_AGE + 3) {
    return { backgroundBlackCoeff: 2, targetIceCoeff: 0 };
  }
  if (age < ICE_PUNCH_OVERLAY_FIRST_AGE + 6) {
    return { backgroundBlackCoeff: 4, targetIceCoeff: 1 };
  }
  return {
    backgroundBlackCoeff:
      age < ICE_PUNCH_OVERLAY_FIRST_AGE + 9 ? 6 : 7,
    targetIceCoeff: Math.min(
      9,
      2 + Math.floor((age - (ICE_PUNCH_OVERLAY_FIRST_AGE + 6)) / 3),
    ),
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
  // creation. The first displayed VBlank therefore contains source step 1;
  // the final displayed VBlank contains step 30 before destruction.
  const step = n + 1;
  const radius = 60 - step * 2;
  const orbitAngle = phase + step * 9;
  const affineAngle = kind === "large" ? (step + 1) * 40 : 0;
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
