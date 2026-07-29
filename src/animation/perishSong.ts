import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export const PERISH_SONG_FRAME_COUNT = 259;

const NOTE_ARGS = [
  [0, 0, 0], [1, 1, 16], [2, 1, 32], [3, 2, 48],
  [4, 2, 64], [5, 0, 80], [6, 0, 96], [7, 1, 112],
  [8, 2, 128], [9, 0, 144], [10, 2, 160], [11, 0, 176],
  [12, 1, 192], [13, 3, 208], [14, 3, 224], [15, 0, 240],
] as const;

const NOTE_SLOTS =
  [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

export interface PerishSongNote {
  readonly index: number;
  readonly oamSlot: number;
  readonly animation: 0 | 1 | 2 | 3;
  readonly tileOffset: 0 | 4 | 8 | 12;
  readonly phase: number;
  readonly callbackCount: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

export interface PerishSongPan {
  readonly initialPan: number;
  readonly targetPan: number;
  readonly incrementPan: number;
  readonly currentPan: number;
}

export interface PerishSongState {
  readonly active: boolean;
  readonly musicNotes2Loaded: boolean;
  readonly notes: readonly PerishSongNote[];
  readonly paletteSentinelActive: boolean;
  readonly musicNotes2PaletteRestored: boolean;
  readonly backgroundBlackCoefficient: number;
  readonly battlersGrayscale: boolean;
  readonly pan: PerishSongPan | null;
}

function sine(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

function cosine(index: number, amplitude: number): number {
  return sine(index + 64, amplitude);
}

function anchor(index: number): Readonly<{ x: number; y: number }> {
  const [arg0, , phase] = NOTE_ARGS[index]!;
  const callbackCount = 121;
  const wave = (callbackCount * 3 + phase) & 0xff;
  return {
    x: 120 + cosine(wave, 100),
    y: Math.trunc(arg0 / 2) - 15
      + Math.trunc(callbackCount / 2)
      + sine(wave, 10)
      + cosine(callbackCount * 10, 4),
  };
}

function bounceY(age: number): number | null {
  let velocity = 5;
  let position = 0;
  let bounce = 0;
  for (let tick = 136; tick <= age; tick += 1) {
    position += velocity;
    velocity += 1;
    if (position > 48 && velocity > 0) {
      velocity = bounce - 5;
      bounce += 1;
      if (bounce > 3) return null;
    }
  }
  return position;
}

function matrixAtAge(age: number) {
  const rotationSteps = Math.max(0, Math.min(16, age - 123));
  const angle = rotationSteps * 8;
  const sin = GBA_SINE_TABLE_256[angle & 0xff]!;
  const cos = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
  return { a: cos, b: sin, c: sin === 0 ? 0 : -sin, d: cos };
}

/** Pure relative port of the sixteen `AnimPerishSongMusicNote` callbacks. */
export function perishSongNotesAtAge(age: number): readonly PerishSongNote[] {
  if (age < 4 || age > 167) return [];
  const callbackCount = age - 3;
  const notes: PerishSongNote[] = [];
  for (let index = 0; index < NOTE_ARGS.length; index += 1) {
    // The source interpreter reaches the final two creates on the next
    // script tick; their live rows nevertheless have callback count 2.
    if (age === 4 && index >= 14) continue;
    const [arg0, animation, phase] = NOTE_ARGS[index]!;
    let centerX: number;
    let centerY: number;
    if (callbackCount <= 120) {
      const wave = (callbackCount * 3 + phase) & 0xff;
      centerX = 120 + cosine(wave, 100);
      centerY = Math.trunc(arg0 / 2) - 15
        + Math.trunc(callbackCount / 2)
        + sine(wave, 10)
        + cosine(callbackCount * 10, 4);
    } else {
      const fixed = anchor(index);
      const y2 = age < 136 ? 0 : bounceY(age);
      if (y2 === null) continue;
      centerX = fixed.x;
      centerY = fixed.y + y2;
    }
    notes.push({
      index,
      oamSlot: NOTE_SLOTS[index]!,
      animation,
      tileOffset: (animation * 4) as 0 | 4 | 8 | 12,
      phase,
      callbackCount,
      centerX,
      centerY,
      matrix: matrixAtAge(age),
    });
  }
  return notes;
}

/** Software palette coefficient; hardware display consumes the preceding age. */
export function perishSongBackgroundBlackCoefficient(age: number): number {
  if (age < 113) return 0;
  if (age < 149) return Math.min(16, 2 + 2 * Math.floor((age - 113) / 5));
  if (age < 215) return 16;
  if (age < 250) return Math.max(0, 14 - 2 * Math.floor((age - 215) / 5));
  return 0;
}

export function perishSongPanAtAge(
  age: number,
  attackerSide: "player" | "opponent",
): PerishSongPan | null {
  const localAge = age - 27;
  if (localAge < 0) return null;
  const initialPan = attackerSide === "player" ? -64 : 63;
  const targetPan = attackerSide === "player" ? 63 : -63;
  const incrementPan = attackerSide === "player" ? 2 : -2;
  const currentPan = initialPan + incrementPan * (localAge + 1);
  if (
    (incrementPan > 0 && currentPan >= targetPan)
    || (incrementPan < 0 && currentPan <= targetPan)
  ) return null;
  return { initialPan, targetPan, incrementPan, currentPan };
}

/** `age=0` is the first active `Move_PERISH_SONG` source-script frame. */
export function perishSongAtAge(
  age: number,
  attackerSide: "player" | "opponent",
): PerishSongState {
  return {
    active: age >= 0 && age < PERISH_SONG_FRAME_COUNT,
    musicNotes2Loaded: age >= 1 && age < 258,
    notes: perishSongNotesAtAge(age),
    paletteSentinelActive: age >= 5 && age <= 187,
    musicNotes2PaletteRestored: age >= 108,
    backgroundBlackCoefficient: perishSongBackgroundBlackCoefficient(age),
    battlersGrayscale: age >= 109 && age < 211,
    pan: perishSongPanAtAge(age, attackerSide),
  };
}
