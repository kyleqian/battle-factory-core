import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export const SING_NOTE_SPAWN_AGES =
  [0, 7, 14, 21, 28, 34, 40, 46, 52, 58, 64, 70] as const;

const NOTE_ANIMS = [7, 6, 1, 2, 3, 2, 5, 6, 2, 2, 1, 5] as const;
const NOTE_PALETTES = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3] as const;
const NOTE_TILE_OFFSETS = [0, 4, 8, 12, 16, 20, 0, 4] as const;

export interface SingPoint {
  readonly x: number;
  readonly y: number;
}

export interface SingNote {
  readonly index: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly animation: number;
  readonly tileOffset: number;
  readonly vFlip: boolean;
  readonly paletteIndex: number;
  readonly scale: number;
}

export interface SingPanTask {
  readonly initialPan: number;
  readonly targetPan: number;
  readonly incrementPan: number;
  readonly currentPan: number;
}

function truncDiv(numerator: number, denominator: number): number {
  return Math.trunc(numerator / denominator);
}

function noteVelocity(
  origin: SingPoint,
  target: SingPoint,
): Readonly<{ x: number; y: number }> {
  const deltaX = target.x - origin.x;
  const deltaY = target.y - origin.y;
  const factor = deltaX < 0 ? -40 : 40;
  const time = truncDiv(deltaX * 256, factor) || 1;
  return {
    x: truncDiv(deltaX * 256, time),
    y: truncDiv(deltaY * 256, time),
  };
}

/**
 * Ports `gWavyMusicNotesAffineAnimCmds`. `localAge=1` is the first callback
 * already reflected by the live sprite row.
 */
export function singNoteScaleAtLocalAge(localAge: number): number {
  const phase = (Math.max(1, localAge) - 1) % 32;
  return phase < 16
    ? 0x100 + 0x0c * (phase + 1)
    : 0x100 + 0x0c * (31 - phase);
}

export function singNotesAtAge(
  age: number,
  origin: SingPoint,
  target: SingPoint,
): readonly SingNote[] {
  const velocity = noteVelocity(origin, target);
  const notes: SingNote[] = [];
  for (let index = 0; index < SING_NOTE_SPAWN_AGES.length; index += 1) {
    const localAge = age - SING_NOTE_SPAWN_AGES[index]! + 1;
    if (localAge < 1) continue;
    const xFixed = (origin.x << 4) + velocity.x * localAge;
    const yFixed = (origin.y << 4) + velocity.y * localAge;
    const x = xFixed >> 4;
    const y = yFixed >> 4;
    if (x < -16 || x > 256 || y < -16 || y > 128) continue;
    const animation = NOTE_ANIMS[index]!;
    const blendStep = Math.floor(localAge / 13);
    notes.push({
      index,
      localAge,
      x,
      y,
      y2: (GBA_SINE_TABLE_256[(localAge * 5) & 0xff]! * 15) >> 8,
      animation,
      tileOffset: NOTE_TILE_OFFSETS[animation]!,
      vFlip: animation >= 6,
      paletteIndex: (NOTE_PALETTES[index]! + blendStep) % 4,
      scale: singNoteScaleAtLocalAge(localAge),
    });
  }
  return notes;
}

/** Ports `panse ... +2, 0` after side-relative panning adjustment. */
export function singPanTaskAtAge(
  age: number,
  attackerSide: "player" | "opponent",
): SingPanTask | null {
  if (age < 0) return null;
  const initialPan = attackerSide === "player" ? -64 : 63;
  const targetPan = attackerSide === "player" ? 63 : -63;
  const incrementPan = attackerSide === "player" ? 2 : -2;
  const currentPan = initialPan + incrementPan * (age + 1);
  if (
    (incrementPan > 0 && currentPan >= targetPan)
    || (incrementPan < 0 && currentPan <= targetPan)
  ) return null;
  return { initialPan, targetPan, incrementPan, currentPan };
}
