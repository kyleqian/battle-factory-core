/** Source-relative presentation reducer for Move_SOLAR_BEAM.
 *
 * The two bodies deliberately share only the command constants from the
 * stock script.  Geometry, side, and the selected target-side background are
 * inputs; battle state, damage, RNG, and the inter-turn controller remain
 * outside this module.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type SolarBeamSide = "player" | "opponent";
export type SolarBeamBody = "setup" | "unleash";

export const SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE = 107;
export const SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE = 159;
export const SOLAR_BEAM_SETUP_ORB_COUNT = 14;
export const SOLAR_BEAM_UNLEASH_BIG_ORB_COUNT = 21;
export const SOLAR_BEAM_UNLEASH_SMALL_ORB_COUNT = 15;

export interface SolarBeamPoint {
  readonly x: number;
  readonly y: number;
}

export interface SolarBeamOrb {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: number;
  readonly matrix: readonly [number, number, number, number];
  readonly subpriority: number;
}

export interface SolarBeamState {
  readonly body: SolarBeamBody;
  readonly age: number;
  readonly active: boolean;
  readonly resources: Readonly<{ orbs: boolean; freed: boolean }>;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly background: Readonly<{
    readonly variant: SolarBeamSide;
    readonly active: boolean;
    readonly impact: boolean;
    /** Source BLDY during fade-to/restore-BG. */
    readonly bldy: number;
  }>;
  /** OBJ BlendColorCycle on the attacking battler during setup. */
  readonly paletteBlend: Readonly<{
    readonly color: "yellow";
    readonly coefficient: number;
  }> | null;
  /** BlendBattleAnimPal on the target during unleash. */
  readonly targetPaletteBlend: Readonly<{
    readonly coefficient: number;
    readonly restoring: boolean;
  }> | null;
  readonly absorptionOrbs: readonly SolarBeamOrb[];
  readonly bigOrbs: readonly SolarBeamOrb[];
  readonly smallOrbs: readonly SolarBeamOrb[];
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sound: "SE_M_MEGA_KICK" | "SE_M_SOLAR_BEAM" | null;
}

const ABSORPTION_OFFSETS: readonly SolarBeamPoint[] = [
  { x: 40, y: 40 }, { x: -40, y: -40 }, { x: 0, y: 40 }, { x: 0, y: -40 },
  { x: 40, y: -20 }, { x: 40, y: 20 }, { x: -40, y: -20 }, { x: -40, y: 20 },
  { x: -20, y: 30 }, { x: 20, y: -30 }, { x: -20, y: -30 }, { x: 20, y: 30 },
  { x: -40, y: 0 }, { x: 40, y: 0 },
];

function assertPoint(point: Readonly<SolarBeamPoint>, label: string): void {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`${label} must contain integer coordinates`);
  }
}

function sideSign(side: SolarBeamSide): 1 | -1 {
  return side === "player" ? 1 : -1;
}

function sourceOrbOrigin(
  attackerCenter: Readonly<SolarBeamPoint>,
): SolarBeamPoint {
  // GetBattlerSpriteCoord(X_2, Y_PIC_OFFSET), followed by the command's
  // +15 x for the unleash orb.  Y_PIC_OFFSET is ten pixels below the
  // resolved animation center for singles.
  return { x: attackerCenter.x, y: attackerCenter.y + 10 };
}

function unleashOrigin(
  side: SolarBeamSide,
  attackerCenter: Readonly<SolarBeamPoint>,
): SolarBeamPoint {
  const origin = sourceOrbOrigin(attackerCenter);
  return { x: origin.x + sideSign(side) * 15, y: origin.y };
}

function absorptionMatrix(callbacks: number): readonly [number, number, number, number] {
  // gPowerAbsorptionOrbAffineAnimCmds is -5/-5 and the first visible row is
  // after the creation callback.  ObjAffineSet writes the reciprocal of the
  // Q8.8 accumulator 246, 241, ... (the same BIOS truncation as the ROM).
  const accumulator = 246 - 5 * Math.min(Math.max(callbacks - 1, 0), 16);
  const scale = Math.trunc(0x10000 / accumulator);
  return [scale, 0, 0, scale];
}

function linearOffset(distance: number, callbacks: number, duration: number): number {
  return linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(distance, duration), callbacks, duration,
  );
}

function gbaSin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function absorptionOrbs(
  age: number,
  side: SolarBeamSide,
  attackerCenter: Readonly<SolarBeamPoint>,
): readonly SolarBeamOrb[] {
  const origin = sourceOrbOrigin(attackerCenter);
  const sign = sideSign(side);
  return ABSORPTION_OFFSETS.flatMap((offset, index) => {
    const start = 7 + index * 4;
    const local = age - start;
    if (local < 0 || local > 16) return [];
    const x = origin.x + sign * offset.x;
    const y = origin.y + offset.y;
    const callbacks = local + 1;
    return [{
      index, x, y,
      x2: linearOffset(-sign * offset.x, callbacks, 16),
      y2: linearOffset(-offset.y, callbacks, 16),
      frame: 8,
      matrix: absorptionMatrix(callbacks),
      subpriority: side === "player" ? 28 : 38,
    }];
  });
}

function bigOrbs(
  age: number,
  side: SolarBeamSide,
  attackerCenter: Readonly<SolarBeamPoint>,
  targetCenter: Readonly<SolarBeamPoint>,
): readonly SolarBeamOrb[] {
  const start = unleashOrigin(side, attackerCenter);
  const orbs: Array<SolarBeamOrb | null> = Array.from({ length: SOLAR_BEAM_UNLEASH_BIG_ORB_COUNT }, (_, index): SolarBeamOrb | null => {
    const spawn = 4 + index * 6;
    const local = age - spawn;
    if (local < 0 || local > 20) return null;
    const callbacks = local + 1;
    return {
      index, x: start.x, y: start.y,
      x2: linearOffset(targetCenter.x - start.x, callbacks, 20),
      y2: linearOffset(targetCenter.y - start.y, callbacks, 20),
      frame: index % 7, matrix: [256, 0, 0, 256] as const,
      subpriority: side === "player" ? 37 : 27,
    };
  });
  return orbs.filter((orb): orb is SolarBeamOrb => orb !== null);
}

function smallOrbs(
  age: number,
  side: SolarBeamSide,
  attackerCenter: Readonly<SolarBeamPoint>,
  targetCenter: Readonly<SolarBeamPoint>,
): readonly SolarBeamOrb[] {
  const start = unleashOrigin(side, attackerCenter);
  const orbs: Array<SolarBeamOrb | null> = Array.from({ length: SOLAR_BEAM_UNLEASH_SMALL_ORB_COUNT }, (_, index): SolarBeamOrb | null => {
    const spawn = 4 + index * 7;
    const local = age - spawn;
    // The task-created first sprite runs its callback on the creation row;
    // later sprites receive the ordinary one-row allocator handoff.
    const life = index === 0 ? 78 : 79;
    if (local < 0 || local > life) return null;
    const callbacks = local + 1;
    const angle = (index * 15) & 0xff;
    return {
      index, x: start.x, y: start.y,
      x2: linearOffset(targetCenter.x - start.x, callbacks, 80) + gbaSin(angle, 5),
      y2: linearOffset(targetCenter.y - start.y, callbacks, 80) + gbaSin(angle + 64, 14),
      frame: 7, matrix: [256, 0, 0, 256] as const,
      subpriority: side === "player" ? 46 : 36,
    };
  });
  return orbs.filter((orb): orb is SolarBeamOrb => orb !== null);
}

function setupPaletteCoefficient(age: number): number {
  if (age < 7 || age > 101) return 0;
  // Four source BlendColorCycle legs, delay 1, target 11.  The source's
  // alternating BG/OBJ fade advances by one every two display callbacks.
  const local = age - 7;
  const leg = Math.floor(local / 24);
  const inLeg = local % 24;
  const value = Math.min(11, Math.floor((inLeg + 1) / 2));
  return leg % 2 === 0 ? value : 11 - value;
}

function targetPalette(age: number): SolarBeamState["targetPaletteBlend"] {
  if (age < 16 || age > 35) return null;
  return { coefficient: Math.min(10, Math.floor((age - 15) / 2)), restoring: false };
}

function fadeCoefficient(age: number): number {
  if (age < 1) return 0;
  if (age < 20) return Math.min(16, age - 1);
  if (age < 151) return 16;
  if (age < 167) return 16 - (age - 151);
  return 0;
}

function commonState(
  age: number,
  body: SolarBeamBody,
  attackerSide: SolarBeamSide,
  targetSide: SolarBeamSide,
  attackerCenter: Readonly<SolarBeamPoint>,
  targetCenter: Readonly<SolarBeamPoint>,
): SolarBeamState {
  const setup = body === "setup";
  const firstInactive = setup
    ? SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE
    : SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE;
  const active = age >= 0 && age < firstInactive;
  const backgroundActive = !setup && age >= 1 && age < 167;
  const targetOffset = !setup && age >= 22 && age <= 150
    ? shakeMon2OffsetAtTick(
      targetSide === "opponent" ? -2 : 2, 0, 65, 1, age - 22,
    )
    : { x2: 0, y2: 0 };
  const palette = setupPaletteCoefficient(age);
  return {
    body, age, active,
    resources: {
      orbs: age >= 1 && age < firstInactive,
      freed: age >= firstInactive,
    },
    targetOnMonBg: setup
      ? age >= 4 && age < 106
      : age >= 1 && age < 151,
    alpha: setup
      ? age >= 7 && age < 103 ? { eva: 12, evb: 8 } : null
      : null,
    background: {
      variant: targetSide,
      active: backgroundActive,
      impact: backgroundActive && age < 151,
      bldy: setup ? 0 : fadeCoefficient(age),
    },
    paletteBlend: setup && palette > 0 ? { color: "yellow", coefficient: palette } : null,
    targetPaletteBlend: setup ? null : targetPalette(age),
    absorptionOrbs: setup ? absorptionOrbs(age, attackerSide, attackerCenter) : [],
    bigOrbs: setup ? [] : bigOrbs(age, attackerSide, attackerCenter, targetCenter),
    smallOrbs: setup ? [] : smallOrbs(age, attackerSide, attackerCenter, targetCenter),
    targetOffset,
    sound: setup && age === 7
      ? "SE_M_MEGA_KICK"
      : !setup && age === 4 ? "SE_M_SOLAR_BEAM" : null,
  };
}

export function solarBeamAtAge(
  age: number,
  body: SolarBeamBody,
  attackerSide: SolarBeamSide,
  targetSide: SolarBeamSide,
  attackerCenter: Readonly<SolarBeamPoint>,
  targetCenter: Readonly<SolarBeamPoint>,
): SolarBeamState {
  assertPoint(attackerCenter, "attackerCenter");
  assertPoint(targetCenter, "targetCenter");
  return commonState(age, body, attackerSide, targetSide, attackerCenter, targetCenter);
}
