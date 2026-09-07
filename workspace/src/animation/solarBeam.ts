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

/**
 * `GetBattlerSpriteCoord(..., BATTLER_COORD_Y_PIC_OFFSET)` is the battler
 * sheet corner plus the side's fixed in-sheet anchor in singles.  Keeping
 * this derived from the live corner preserves species-specific front/back
 * `y_offset` values without adding a scenario coordinate.
 */
function yPicOffset(side: SolarBeamSide, spriteCornerY: number): number {
  return spriteCornerY + (side === "player" ? 40 : 32);
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
  targetPicOffsetY: number,
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
      y2: linearOffset(targetPicOffsetY - start.y, callbacks, 20),
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
  targetPicOffsetY: number,
): readonly SolarBeamOrb[] {
  const start = unleashOrigin(side, attackerCenter);
  const orbs: Array<SolarBeamOrb | null> = Array.from({ length: SOLAR_BEAM_UNLEASH_SMALL_ORB_COUNT }, (_, index): SolarBeamOrb | null => {
    // The task's creation row is shared with the first scripted big orb;
    // its six-row first interval is followed by the source task's regular
    // seven-row cadence.
    const spawn = index === 0 ? 4 : 3 + index * 7;
    const local = age - spawn;
    // The task-created first sprite runs its callback on the creation row;
    // later sprites receive the ordinary one-row allocator handoff.
    const life = index === 0 ? 78 : 79;
    if (local < 0 || local > life || age > 150) return null;
    // The first task-created sprite receives both its explicit initializer
    // callback and the ordinary sprite pass on age 4. Later births receive
    // one callback on their creation row.
    const callbacks = local + (index === 0 ? 2 : 1);
    const angle = ((callbacks - 1) * 15) & 0xff;
    return {
      index, x: start.x, y: start.y,
      x2: linearOffset(targetCenter.x - start.x, callbacks, 80) + gbaSin(angle, 5),
      y2: linearOffset(targetPicOffsetY - start.y, callbacks, 80) + gbaSin(angle + 64, 14),
      frame: 7, matrix: [256, 0, 0, 256] as const,
      subpriority: (side === "player" ? 40 : 30) + (angle > 0x7f ? 1 : 6),
    };
  });
  return orbs.filter((orb): orb is SolarBeamOrb => orb !== null);
}

function setupPaletteCoefficient(age: number): number {
  if (age < 10 || age > 96) return 0;
  // The two BlendColorCycle passes use delay 1 while the animation engine's
  // task cadence exposes one coefficient step every three retained rows.
  // Each pass is 48 rows including its source-held extrema.
  const local = (age - 10) % 48;
  if (local < 15) return 2 + Math.floor(local / 3) * 2;
  if (local < 24) return 11;
  if (local < 39) return 9 - Math.floor((local - 24) / 3) * 2;
  return 0;
}

function targetPalette(age: number): SolarBeamState["targetPaletteBlend"] {
  if (age < 18 || age > 149) return null;
  return {
    coefficient: Math.min(10, 1 + Math.floor((age - 18) / 2)),
    restoring: false,
  };
}

function commonState(
  age: number,
  body: SolarBeamBody,
  attackerSide: SolarBeamSide,
  targetSide: SolarBeamSide,
  attackerCenter: Readonly<SolarBeamPoint>,
  targetCenter: Readonly<SolarBeamPoint>,
  targetSpriteCorner: Readonly<SolarBeamPoint>,
): SolarBeamState {
  const setup = body === "setup";
  const firstInactive = setup
    ? SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE
    : SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE;
  const active = age >= 0 && age < firstInactive;
  // Solar Beam's own BG VRAM maps switch atomically on source ages 4 and
  // 151. Unlike FadeToBg users that drive BLDY, this body's retained
  // register map stays at zero throughout both handoffs.
  const backgroundActive = !setup && age >= 4 && age < 151;
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
      bldy: 0,
    },
    paletteBlend: setup && palette > 0 ? { color: "yellow", coefficient: palette } : null,
    targetPaletteBlend: setup ? null : targetPalette(age),
    absorptionOrbs: setup ? absorptionOrbs(age, attackerSide, attackerCenter) : [],
    bigOrbs: setup ? [] : bigOrbs(
      age, attackerSide, attackerCenter, targetCenter,
      yPicOffset(targetSide, targetSpriteCorner.y),
    ),
    smallOrbs: setup ? [] : smallOrbs(
      age, attackerSide, attackerCenter, targetCenter,
      yPicOffset(targetSide, targetSpriteCorner.y),
    ),
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
  targetSpriteCorner: Readonly<SolarBeamPoint> = targetCenter,
): SolarBeamState {
  assertPoint(attackerCenter, "attackerCenter");
  assertPoint(targetCenter, "targetCenter");
  assertPoint(targetSpriteCorner, "targetSpriteCorner");
  return commonState(
    age, body, attackerSide, targetSide, attackerCenter, targetCenter,
    targetSpriteCorner,
  );
}
