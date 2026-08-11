import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type SwordsDanceSide = "player" | "opponent";
export interface SwordsDanceBlade {
  readonly x: number;
  readonly y: number;
  /** GBA inverse affine matrix PA; PB/PC are 0 and PD is 256. */
  readonly pa: number;
}
export interface SwordsDanceState {
  readonly active: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly blade: SwordsDanceBlade | null;
  readonly monbgLoaded: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly swordTagLoaded: boolean;
  readonly flashTask: "step1" | "step2" | null;
  readonly swordPalette: "source" | "cyan-white";
  readonly soundStart: boolean;
}

export const SWORDS_DANCE_FRAME_COUNT = 70;
const riseY = [0, -5, -10, -15, -21, -26, -31, -31] as const;

function sine(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

/** Pure source-age port of Move_SWORDS_DANCE's 0x46-byte visual body. */
export function swordsDanceAtAge(
  age: number,
  side: SwordsDanceSide,
  attackerBattleCenter: Readonly<{ x: number; y: number }>,
): SwordsDanceState {
  const ellipseActive = age >= 7 && age <= 20;
  // The task constructor's immediate step leaves data[5]=16; the first
  // scheduled Step callback renders theta 16 and advances it to 32.
  const angle = 16 * (age - 6);
  const width = side === "player" ? 16 : -16;
  const bladeActive = age >= 7 && age <= 60;
  const scale = Math.min(256, 36 + Math.max(0, age - 7) * 20);
  const riseIndex = age >= 54 ? Math.min(age - 53, riseY.length - 1) : 0;
  return {
    active: age >= 0 && age < SWORDS_DANCE_FRAME_COUNT - 1,
    attackerOffset: ellipseActive
      ? { x2: sine(angle, width), y2: -sine(angle + 64, 6) + 6 }
      : { x2: 0, y2: 0 },
    blade: bladeActive ? {
      x: attackerBattleCenter.x,
      y: attackerBattleCenter.y + riseY[riseIndex]!,
      pa: Math.floor(0x10000 / scale),
    } : null,
    monbgLoaded: age >= 4 && age <= 64,
    alpha: age >= 7 && age <= 61 ? { eva: 12, evb: 8 } : null,
    swordTagLoaded: age >= 1 && age <= 68,
    flashTask: age >= 31 && age <= 47 ? "step1" : age === 48 ? "step2" : null,
    // Hardware palette transfer is one display behind gPlttBufferFaded.
    swordPalette: (age >= 32 && age <= 37) || (age >= 44 && age <= 50)
      ? "cyan-white" : "source",
    soundStart: age === 7,
  };
}
