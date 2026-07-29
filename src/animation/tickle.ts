import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  rockMonBackAndForthAtAge,
  type CharmRockState,
  type CharmSide,
} from "./charm.ts";

export const TICKLE_FRAME_COUNT = 205;
export const TICKLE_EYE_START_AGE = 27;
export const TICKLE_SWAY_START_AGE = 93;
export const TICKLE_ROCK_START_AGE = 107;

export interface TickleEye {
  readonly slot: 3 | 4;
  readonly x: number;
  readonly y: number;
  readonly frame: 0 | 1 | 2;
}

export interface TickleState {
  readonly active: boolean;
  readonly eyeSparkleLoaded: boolean;
  readonly attackerPaletteBlackCoeff: number;
  readonly eyes: readonly TickleEye[];
  readonly attackerX2: number;
  readonly swayActive: boolean;
  readonly targetRock: CharmRockState;
  readonly soundRestart: "SE_M_DETECT" | "SE_M_TAIL_WHIP" | null;
  readonly soundPanSide: CharmSide | null;
}

export function ticklePaletteBlackCoeffAtAge(age: number): number {
  if (age < 4) return 0;
  if (age < 48) return Math.min(16, Math.max(0, Math.floor((age - 4) / 2) * 2));
  return Math.max(0, 16 - Math.floor((age - 48) / 2) * 2);
}

function eyeFrame(localAge: number): 0 | 1 | 2 {
  if (localAge < 3) return 0;
  if (localAge < 7) return 1;
  if (localAge < 11) return 2;
  if (localAge < 15) return 1;
  return 0;
}

export function tickleEyesAtAge(
  age: number,
  attackerSide: CharmSide,
  attackerPictureCenter: Readonly<{ x: number; y: number }>,
): readonly TickleEye[] {
  const localAge = age - TICKLE_EYE_START_AGE;
  if (localAge < 0 || localAge >= 20) return [];
  const offsets = attackerSide === "player" ? [-16, 16] : [16, -16];
  return offsets.map((offset, index) => ({
    slot: (3 + index) as 3 | 4,
    x: attackerPictureCenter.x + offset,
    y: attackerPictureCenter.y - 8,
    frame: eyeFrame(localAge),
  }));
}

export function swayMonX2AtAge(age: number, attackerSide: CharmSide): number {
  const localAge = age - TICKLE_SWAY_START_AGE;
  if (localAge < 0 || localAge >= 76) return 0;
  const waveIndex = ((localAge + 1) * 5) & 0xff;
  const amplitude = attackerSide === "player" ? 6 : -6;
  return (GBA_SINE_TABLE_256[waveIndex]! * amplitude) >> 8;
}

export function tickleAtAge(
  age: number,
  attackerSide: CharmSide,
  attackerPictureCenter: Readonly<{ x: number; y: number }>,
): TickleState {
  const detect = age === TICKLE_EYE_START_AGE;
  const tailWhip = age >= TICKLE_ROCK_START_AGE
    && age <= TICKLE_ROCK_START_AGE + 56
    && (age - TICKLE_ROCK_START_AGE) % 9 === 0;
  return {
    active: age >= 0 && age < TICKLE_FRAME_COUNT - 1,
    eyeSparkleLoaded: age >= 1 && age < TICKLE_FRAME_COUNT - 1,
    attackerPaletteBlackCoeff: ticklePaletteBlackCoeffAtAge(age),
    eyes: tickleEyesAtAge(age, attackerSide, attackerPictureCenter),
    attackerX2: swayMonX2AtAge(age, attackerSide),
    swayActive: age >= TICKLE_SWAY_START_AGE && age < 169,
    targetRock: rockMonBackAndForthAtAge(
      age - TICKLE_ROCK_START_AGE,
      attackerSide === "player" ? "opponent" : "player",
      2,
      6,
    ),
    soundRestart: detect ? "SE_M_DETECT" : tailWhip ? "SE_M_TAIL_WHIP" : null,
    soundPanSide: detect
      ? attackerSide
      : tailWhip ? (attackerSide === "player" ? "opponent" : "player") : null,
  };
}
