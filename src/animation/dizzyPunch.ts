import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export const DIZZY_PUNCH_SECOND_WAVE_AGE = 28;
export const DIZZY_PUNCH_LAST_BODY_AGE = 69;

const DUCK_VELOCITIES = [160, -256, 128, 416, -128, -384] as const;
const DUCK_AMPLITUDES = [-32, -40, -16, -38, -22, -31] as const;

export interface DizzyPunchDuck {
  readonly wave: 0 | 1;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly phase: number;
  readonly priority: 1 | 3;
  readonly invisible: boolean;
}

export interface DizzyPunchState {
  readonly attackerX2: number;
  readonly targetX2: number;
  readonly targetY2: number;
  readonly fists: readonly Readonly<{ x: number; y: number }>[];
  readonly hitsplats: readonly Readonly<{ x: number; y: number; animation: 1 }>[];
  readonly ducks: readonly DizzyPunchDuck[];
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly sound: "SE_M_COMET_PUNCH" | "SE_M_VITAL_THROW2" | null;
  readonly active: boolean;
}

function sine(index: number, amplitude: number): number {
  return Math.floor(GBA_SINE_TABLE_256[index & 0xff]! * amplitude / 256);
}

function duckWave(
  age: number,
  wave: 0 | 1,
  startAge: number,
  attackerSide: "player" | "opponent",
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly DizzyPunchDuck[] {
  const localAge = age - startAge;
  if (localAge < 0 || localAge >= 40) return [];
  const phase = (localAge + 1) * 3;
  const scriptX = wave === 0 ? 16 : -16;
  const scriptY = wave === 0 ? 8 : -8;
  const signedX = attackerSide === "player" ? scriptX : -scriptX;
  return DUCK_VELOCITIES.map((velocity, index) => ({
    wave,
    index,
    x: targetCenter.x + signedX,
    y: targetCenter.y + scriptY,
    x2: Math.floor(velocity * (localAge + 1) / 256),
    y2: sine(phase, DUCK_AMPLITUDES[index]!),
    phase,
    priority: phase < 128 ? 1 : 3,
    invisible: phase > 100 && phase % 2 !== 0,
  }));
}

function wavePosition(
  attackerSide: "player" | "opponent",
  targetCenter: Readonly<{ x: number; y: number }>,
  x: number,
  y: number,
): Readonly<{ x: number; y: number }> {
  return {
    x: targetCenter.x + (attackerSide === "player" ? x : -x),
    y: targetCenter.y + y,
  };
}

/**
 * Direct relative-age port of Emerald's first `Move_DIZZY_PUNCH` animation
 * script. Age zero is the first displayed callback of the first
 * `gHorizontalLungeSpriteTemplate`.
 */
export function dizzyPunchAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  targetCenter: Readonly<{ x: number; y: number }>,
): DizzyPunchState {
  const firstLunge = horizontalLungeX2AtTick(6, 4, attackerSide, age + 1);
  const secondLunge = horizontalLungeX2AtTick(
    6, 4, attackerSide, age - 20 + 1,
  );
  const firstShake = shakeMon2OffsetAtTick(3, 0, 7, 1, age - 6);
  const secondShake = shakeMon2OffsetAtTick(3, 0, 7, 1, age - 26);
  const firstFistAge = age - 8;
  const secondFistAge = age - DIZZY_PUNCH_SECOND_WAVE_AGE;
  const fists = [
    firstFistAge >= 0 && firstFistAge <= 20
      ? wavePosition(attackerSide, targetCenter, 16, 8) : null,
    secondFistAge >= 0 && secondFistAge <= 20
      ? wavePosition(attackerSide, targetCenter, -16, -8) : null,
  ].filter((value): value is Readonly<{ x: number; y: number }> => value !== null);
  const hitsplats = [
    firstFistAge >= 0 && firstFistAge <= 9
      ? { ...wavePosition(attackerSide, targetCenter, 16, 0), animation: 1 as const }
      : null,
    secondFistAge >= 0 && secondFistAge <= 9
      ? { ...wavePosition(attackerSide, targetCenter, -16, -16), animation: 1 as const }
      : null,
  ].filter((value): value is Readonly<{ x: number; y: number; animation: 1 }> =>
    value !== null);
  return {
    attackerX2: firstLunge + secondLunge,
    targetX2: firstShake.x2 + secondShake.x2,
    targetY2: firstShake.y2 + secondShake.y2,
    fists,
    hitsplats,
    ducks: [
      ...duckWave(age, 0, 8, attackerSide, targetCenter),
      ...duckWave(age, 1, DIZZY_PUNCH_SECOND_WAVE_AGE, attackerSide, targetCenter),
    ],
    targetOnMonBg: age >= 0 && age <= 68,
    alpha: age >= 0 && age <= 68 ? { eva: 12, evb: 8 } : null,
    sound: age === 8
      ? "SE_M_COMET_PUNCH"
      : age === DIZZY_PUNCH_SECOND_WAVE_AGE ? "SE_M_VITAL_THROW2" : null,
    active: age >= 0 && age <= DIZZY_PUNCH_LAST_BODY_AGE,
  };
}
