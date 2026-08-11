import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type MetronomeSide = "player" | "opponent";
export interface MetronomePoint { readonly x: number; readonly y: number }
export interface MetronomeMatrix {
  readonly a: number; readonly b: number;
  readonly c: number; readonly d: number;
}
export interface MetronomeThoughtBubble {
  readonly slot: 3;
  readonly x: number;
  readonly y: number;
  readonly frame: 0 | 1 | 2 | 3;
  readonly hFlip: boolean;
}
export interface MetronomeFinger {
  readonly slot: 4;
  readonly x: number;
  readonly y: number;
  readonly matrix: MetronomeMatrix;
}
export interface MetronomeState {
  readonly active: boolean;
  readonly fingerLoaded: boolean;
  readonly thoughtBubbleLoaded: boolean;
  readonly thoughtBubble: MetronomeThoughtBubble | null;
  readonly finger: MetronomeFinger | null;
  readonly soundRestart: "SE_M_METRONOME" | "SE_M_TAIL_WHIP" | null;
  readonly soundPanSide: MetronomeSide | null;
}

export const METRONOME_FRAME_COUNT = 127;
export const METRONOME_THOUGHT_CREATION_AGE = 7;
export const METRONOME_FINGER_CREATION_AGE = 15;

function inverseScale(scale: number): number {
  return Math.trunc(0x10000 / scale);
}

export function metronomeFingerMatrixAtAge(age: number): MetronomeMatrix | null {
  if (age < 15 || age > 116) return null;
  if (age <= 22) {
    const scale = 16 + 30 * (age - 14);
    const inverse = inverseScale(scale);
    return { a: inverse, b: 0, c: 0, d: inverse };
  }
  if (age <= 40) return { a: 256, b: 0, c: 0, d: 256 };
  if (age <= 106) {
    const local = (age - 41) % 22;
    const angle = local < 11 ? 4 * (local + 1) : 4 * (21 - local);
    const sin = GBA_SINE_TABLE_256[angle]!;
    const cos = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
    return { a: cos, b: -sin + 0, c: sin + 0, d: cos };
  }
  if (age >= 115) return { a: 4096, b: 0, c: 0, d: 4096 };
  const inverse = inverseScale(256 - 30 * (age - 106));
  return { a: inverse, b: 0, c: 0, d: inverse };
}

function thoughtFrame(age: number): 0 | 1 | 2 | 3 {
  if (age <= 7 || age >= 121) return 0;
  if (age <= 9 || age >= 119) return 1;
  if (age <= 11 || age >= 117) return 2;
  return 3;
}

export function metronomeAtAge(
  age: number,
  attackerSide: MetronomeSide,
  attackerHead: MetronomePoint,
): MetronomeState {
  const thoughtVisible = age >= 7 && age <= 124;
  const fingerMatrix = metronomeFingerMatrixAtAge(age);
  const soundRestart = age === 7 ? "SE_M_METRONOME"
    : age === 41 || age === 63 || age === 85 ? "SE_M_TAIL_WHIP"
    : null;
  return {
    active: age >= 0 && age < 126,
    fingerLoaded: age >= 1 && age < 126,
    thoughtBubbleLoaded: age >= 4 && age < 126,
    thoughtBubble: thoughtVisible ? {
      slot: 3,
      x: attackerHead.x,
      y: attackerHead.y,
      frame: thoughtFrame(age),
      hFlip: attackerSide === "player",
    } : null,
    finger: fingerMatrix ? {
      slot: 4,
      x: attackerHead.x,
      y: attackerHead.y,
      matrix: fingerMatrix,
    } : null,
    soundRestart,
    soundPanSide: soundRestart === null ? null : attackerSide,
  };
}
