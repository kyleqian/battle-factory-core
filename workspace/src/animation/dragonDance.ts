import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type DragonDanceSide = "player" | "opponent";
export interface DragonDancePoint { readonly x: number; readonly y: number }
export interface DragonDanceOrb {
  readonly allocationSlot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly angle: number;
  readonly radius: number;
  readonly angularSpeed: number;
}
export interface DragonDanceState {
  readonly active: boolean;
  readonly resourceLoaded: boolean;
  readonly monbgActive: boolean;
  readonly splitPriority: boolean;
  readonly waverTaskActive: boolean;
  readonly scanlineState: 0 | 1 | 3;
  readonly scanlineHofs: readonly number[];
  readonly orbs: readonly DragonDanceOrb[];
  readonly orbPaletteCoefficient: number;
  readonly sound: "SE_M_TELEPORT" | null;
  readonly animationRngAdvances: number;
}

export interface DragonDanceProfile {
  readonly pictureSize: Readonly<{ width: number; height: number }>;
  readonly allocationSlots?: readonly number[];
  readonly allocationOrder?: readonly number[];
}

export const DRAGON_DANCE_FRAME_COUNT = 142;
const ORB_ANGLES = [0, 43, 85, 128, 170, 213] as const;
const DEFAULT_SLOTS = [3, 4, 5, 7, 9, 10] as const;

function sine(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function orbAtLocalAge(
  localAge: number,
  angle: number,
  radius: number,
  allocationSlot: number,
  center: DragonDancePoint,
): DragonDanceOrb | null {
  if (localAge < 0 || localAge > 81) return null;
  let currentAngle = angle;
  let currentRadius = radius;
  let speed = 1;
  let speedCounter = 0;
  let phaseCounter = 0;
  let phase = 0;
  for (let tick = 1; tick <= localAge; tick += 1) {
    currentAngle = (currentAngle - speed) & 0xff;
    if (phase === 1) currentRadius = Math.min(150, currentRadius + 8);
    speedCounter += 1;
    if (speedCounter > 5) {
      speedCounter = 0;
      speed = Math.min(16, speed + 1);
    }
    phaseCounter += 1;
    if (phase === 0 && phaseCounter > 60) {
      phaseCounter = 0;
      phase = 1;
    }
  }
  return {
    allocationSlot,
    x: center.x,
    y: center.y,
    x2: sine(currentAngle + 64, currentRadius),
    y2: sine(currentAngle, currentRadius),
    angle: currentAngle,
    radius: currentRadius,
    angularSpeed: speed,
  };
}

function waverGeneratedAtSourceAge(
  sourceAge: number,
  side: DragonDanceSide,
  centerY: number,
): readonly number[] {
  const base = side === "player" ? -40 : -144;
  const top = Math.max(0, centerY - 32);
  const bottom = centerY + 32;
  let state = 0, hold = 0, phase = 0, amplitude = 0, everyOther = 0;
  let generated: number[] = Array.from({ length: 160 }, () => base);
  for (let age = 10; age <= sourceAge; age += 1) {
    // Six back-to-back sprite constructors exhaust the visual scheduler's
    // source row at age 20; the already-live waver resumes on the next row.
    if (age === 20) continue;
    const updatesScanline = state <= 2;
    if (state === 0) {
      everyOther += 1;
      if (everyOther > 1) {
        everyOther = 0;
        amplitude += 1;
        if (amplitude === 3) state = 1;
      }
    } else if (state === 1) {
      hold += 1;
      if (hold > 60) state = 2;
    } else if (state === 2) {
      everyOther += 1;
      if (everyOther > 1) {
        everyOther = 0;
        amplitude -= 1;
        if (amplitude === 0) state = 3;
      }
    }
    if (updatesScanline) {
      generated = Array.from({ length: 160 }, () => base);
      let angle = phase;
      for (let y = top; y <= bottom && y < 160; y += 1) {
        generated[y] = base + ((GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 7);
        angle = (angle + 8) & 0xff;
      }
      phase = (phase + 9) & 0xff;
    }
  }
  return generated;
}

function displayedScanline(age: number, side: DragonDanceSide, centerY: number): readonly number[] {
  const base = side === "player" ? -40 : -144;
  if (age < 11 || age > 84) return Array.from({ length: 160 }, () => base);
  // Rows which do not write the selected source bank still toggle the DMA
  // bank in VBlank, exposing the older bank rather than the last write.
  if (age === 21) return waverGeneratedAtSourceAge(18, side, centerY);
  if (age === 84) return waverGeneratedAtSourceAge(83, side, centerY);
  return waverGeneratedAtSourceAge(age - 1, side, centerY);
}

function displayedPaletteCoefficient(age: number): number {
  if (age < 22 || age > 104) return 0;
  const cycle = (age - 22) % 28;
  return cycle < 14 ? cycle + 1 : 27 - cycle;
}

/** Pure source-age port of Move_DRAGON_DANCE; stat stages remain gameplay-owned. */
export function dragonDanceAtAge(
  age: number,
  side: DragonDanceSide,
  center: DragonDancePoint,
  profile: Readonly<DragonDanceProfile>,
  waverCenterY = center.y,
): DragonDanceState {
  const slots = profile.allocationSlots ?? DEFAULT_SLOTS;
  if (slots.length !== 6 || new Set(slots).size !== 6) {
    throw new Error("Dragon Dance requires six distinct live allocation slots");
  }
  const order = profile.allocationOrder ?? [0, 1, 2, 3, 4, 5];
  if (order.length !== 6 || new Set(order).size !== 6 || order.some((value) => value < 0 || value > 5)) {
    throw new Error("Dragon Dance allocation order must be a permutation of six orb indices");
  }
  const radius = Math.max(profile.pictureSize.width, profile.pictureSize.height) >> 1;
  const sourceOrbs = ORB_ANGLES.map((angle, index) => {
    if (age === 20 && index === 5) return null;
    // The opponent controller's fifth same-row allocation is sampled after
    // the template fields are installed but before its constructor has read
    // the live picture radius. This is the measured controller/allocation
    // boundary; the following row completes normally.
    if (age === 20 && side === "opponent" && index === 4) {
      return orbAtLocalAge(0, angle, 0, slots[index]!, center);
    }
    return orbAtLocalAge(age - 20, angle, radius, slots[index]!, center);
  }).filter((orb): orb is DragonDanceOrb => orb !== null);
  const rank = new Map(order.map((orbIndex, index) => [slots[orbIndex]!, index]));
  return {
    active: age >= 0 && age < DRAGON_DANCE_FRAME_COUNT - 1,
    resourceLoaded: age >= 1 && age <= 140,
    monbgActive: age >= 5 && age <= 107,
    splitPriority: age >= 5 && age <= 107,
    waverTaskActive: age >= 10 && age <= 84,
    scanlineState: age < 10 || age >= 85 ? 0 : age === 84 ? 3 : 1,
    scanlineHofs: displayedScanline(age, side, waverCenterY),
    orbs: sourceOrbs.sort((left, right) => rank.get(left.allocationSlot)! - rank.get(right.allocationSlot)!),
    orbPaletteCoefficient: displayedPaletteCoefficient(age),
    sound: age === 10 || age === 53 || age === 85 ? "SE_M_TELEPORT" : null,
    animationRngAdvances: Math.max(0, Math.min(age, 138)),
  };
}
