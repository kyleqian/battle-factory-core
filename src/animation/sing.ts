import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  updateOrderedSprite,
} from "./spriteOrder.ts";

export const SING_NOTE_SPAWN_AGES =
  [0, 7, 14, 21, 28, 34, 40, 46, 52, 58, 64, 70] as const;

const NOTE_ANIMS = [7, 6, 1, 2, 3, 2, 5, 6, 2, 2, 1, 5] as const;
const NOTE_PALETTES = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3] as const;
const NOTE_TILE_OFFSETS = [0, 4, 8, 12, 16, 20, 0, 4] as const;
const SING_NOTE_SPRITE_SLOTS =
  [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16] as const;
const SING_NOTE_ORDER_SEED =
  [3, 4, 5, 16, 15, 14, 13, 12, 11, 10, 9, 7] as const;

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
  /** Hardware affine PA/PD produced by `CalcCenterToCornerVec`'s scale reciprocal. */
  readonly affinePaPd: number;
}

/** Shared wavy-note geometry, palette-independent (`battle_anim_effects_1.c` AnimWavyMusicNotes/Step + CalcVelocity). */
export interface WavyMusicNoteGeometry {
  readonly index: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly animation: number;
  readonly tileOffset: number;
  readonly vFlip: boolean;
  readonly scale: number;
  readonly affinePaPd: number;
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

export function singNoteAffinePaPdAtLocalAge(localAge: number): number {
  return Math.trunc(0x10000 / singNoteScaleAtLocalAge(localAge));
}

/** Shared wavy-note body (see `singNotesAtAge`): spawn ages, velocity, wave, scale. */
export function wavyMusicNotesGeometryAtAge(
  age: number,
  origin: SingPoint,
  target: SingPoint,
): readonly WavyMusicNoteGeometry[] {
  const velocity = noteVelocity(origin, target);
  const notes: WavyMusicNoteGeometry[] = [];
  for (let index = 0; index < SING_NOTE_SPAWN_AGES.length; index += 1) {
    const localAge = age - SING_NOTE_SPAWN_AGES[index]! + 1;
    if (localAge < 1) continue;
    const xFixed = (origin.x << 4) + velocity.x * localAge;
    const yFixed = (origin.y << 4) + velocity.y * localAge;
    const x = xFixed >> 4;
    const y = yFixed >> 4;
    if (x < -16 || x > 256 || y < -16 || y > 128) continue;
    const animation = NOTE_ANIMS[index]!;
    notes.push({
      index,
      localAge,
      x,
      y,
      y2: (GBA_SINE_TABLE_256[(localAge * 5) & 0xff]! * 15) >> 8,
      animation,
      tileOffset: NOTE_TILE_OFFSETS[animation]!,
      vFlip: animation >= 6,
      scale: singNoteScaleAtLocalAge(localAge),
      affinePaPd: singNoteAffinePaPdAtLocalAge(localAge),
    });
  }
  return notes;
}

/** SING-specific palette cycle: `sBlendTableIdx` advances every 13 frames; the source argv pins palette 0,1,2,3,0,1,2,3,0,1,2,3 (DIFFERENT from GRASS_WHISTLE's pinned unk1=1). */
export function singPaletteIndexFor(index: number, localAge: number): number {
  return (NOTE_PALETTES[index]! + Math.floor(localAge / 13)) % 4;
}

export function singNotesAtAge(
  age: number,
  origin: SingPoint,
  target: SingPoint,
): readonly SingNote[] {
  return wavyMusicNotesGeometryAtAge(age, origin, target).map((note) => ({
    ...note,
    paletteIndex: singPaletteIndexFor(note.index, note.localAge),
  }));
}

/**
 * Shared persistent-`sSpriteOrder` pass (see `singNotesBackToFrontAtAge`).
 * The note->sprite-slot pool and initial OAM order are the caller's:
 * GRASS_WHISTLE derives its own pair from its probe's sprite records (they
 * coincide with SING's in both legal orientations), so this stays shared.
 */
export function wavyMusicNotesBackToFrontAtAge(
  age: number,
  origin: SingPoint,
  target: SingPoint,
  notesAtAge: (
    age: number,
    origin: SingPoint,
    target: SingPoint,
  ) => readonly { readonly index: number; readonly y: number; readonly y2: number }[],
  slots: readonly number[] = SING_NOTE_SPRITE_SLOTS,
  orderSeed: readonly number[] = SING_NOTE_ORDER_SEED,
): readonly { readonly index: number; readonly y: number; readonly y2: number }[] {
  if (age < 0) return [];
  let order = createSpriteOrderState(
    slots,
    orderSeed,
  );
  for (let tick = 0; tick <= age; tick += 1) {
    const notes = notesAtAge(tick, origin, target);
    const owners = new Set(notes.map((note) => note.index));
    for (const occupant of order.occupants) {
      if (!owners.has(occupant.owner)) {
        order = destroyOrderedSprite(order, occupant.owner);
      }
    }
    for (const note of notes) {
      const key = {
        priority: 2,
        subpriority: 0,
        oamY: note.y + note.y2 - 16,
        affineMode: "double" as const,
        oamSize: 1 as const,
        oamShape: "square" as const,
      };
      if (order.occupants.some((occupant) => occupant.owner === note.index)) {
        order = updateOrderedSprite(order, note.index, key);
      } else {
        order = createOrderedSprite(order, note.index, key);
      }
    }
    order = sortSpriteOrder(order);
  }
  const byIndex = new Map(
    notesAtAge(age, origin, target).map((note) => [note.index, note]),
  );
  return spriteOwnersBackToFront(order)
    .map((owner) => byIndex.get(owner))
    .filter((note): note is { readonly index: number; readonly y: number; readonly y2: number } => note !== undefined);
}

/**
 * Ports the shared persistent `sSpriteOrder` pass for SING's allocation
 * pool. The side-independent seed is live-probed immediately before the
 * first note in both legal orientations.
 */
export function singNotesBackToFrontAtAge(
  age: number,
  origin: SingPoint,
  target: SingPoint,
): readonly SingNote[] {
  const notes = new Map(
    singNotesAtAge(age, origin, target).map((note) => [note.index, note]),
  );
  return wavyMusicNotesBackToFrontAtAge(
    age,
    origin,
    target,
    singNotesAtAge,
  )
    .map((note) => notes.get(note.index))
    .filter((note): note is SingNote => note !== undefined);
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
