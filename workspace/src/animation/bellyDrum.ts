import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  updateOrderedSprite,
} from "./spriteOrder.ts";

/**
 * Source-relative MOVE_BELLY_DRUM reducer.
 *
 * The script's six hand/note pairs are created at source ages 7, 24, 41,
 * 50, 59, and 68 in the retained Scene-ON window.  The first displayed
 * row is the preceding source row, so a plain created sprite reports its
 * callback state one row after the create command.  This module deliberately
 * exposes source arguments and geometry only; HP cost, stat stages, battle
 * state, and the controller remain outside the presentation seam.
 */
export const BELLY_DRUM_WINDOW_FRAMES = 110;
export const BELLY_DRUM_FIRST_INACTIVE_AGE = 109;
export const BELLY_DRUM_SPAWN_AGES = [7, 24, 41, 50, 59, 68] as const;
export const BELLY_DRUM_SOUND_AGES = BELLY_DRUM_SPAWN_AGES;
export const BELLY_DRUM_SOURCE_OFFSETS = [0, 3, 6, 40, 66, 92, 118, 144, 168, 177] as const;
const BELLY_DRUM_SOURCE_OFFSET_FIRST_AGES = [0, 1, 4, 7, 24, 41, 50, 59, 68, 109] as const;

/** `cmd->unk0` on gBellyDrumHandSpriteTemplate/gSlowFlyingMusicNotesSpriteTemplate. */
export const BELLY_DRUM_NOTE_DIRECTIONS = [0, 1, 0, 1, 0, 1] as const;
/** `cmd->unk1`, the music-note animation number. */
export const BELLY_DRUM_NOTE_ANIMATIONS = [0, 1, 3, 2, 1, 0] as const;
/** `cmd->unk2`, the gParticlesColorBlendTable row. */
export const BELLY_DRUM_NOTE_PALETTE_ROWS = [0, 1, 3, 0, 1, 3] as const;
/** `cmd->unk3`, the initial sine phase. */
export const BELLY_DRUM_NOTE_PHASES = [0, 0, 128, 128, 0, 0] as const;
export const BELLY_DRUM_NOTE_SPRITE_SLOTS = [4, 5, 7, 9, 10, 5] as const;
export const BELLY_DRUM_HAND_SPRITE_SLOTS = [3, 3, 3, 4, 3, 4] as const;

export type BellyDrumSide = "player" | "opponent";

export interface BellyDrumPoint {
  readonly x: number;
  readonly y: number;
}

export interface BellyDrumNote {
  readonly index: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly direction: 0 | 1;
  readonly animation: 0 | 1 | 2 | 3;
  readonly paletteRow: 0 | 1 | 3;
  readonly phase: number;
  readonly scale: number;
  readonly affinePaPd: number;
  /** `data[0..5]` after the callback's preceding-row transfer. */
  readonly linearData: readonly number[];
  readonly spriteSlot: number;
}

export interface BellyDrumHand {
  readonly index: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly right: boolean;
  readonly hFlip: boolean;
  readonly spriteSlot: number;
}

export interface BellyDrumShakeTask {
  readonly index: number;
  readonly localAge: number;
  readonly battler: BellyDrumSide;
  readonly data: readonly number[];
}

export interface BellyDrumAudio {
  readonly index: number;
  readonly soundEffect: "SE_M_BELLY_DRUM";
  readonly id: 185;
  readonly pan: "SOUND_PAN_ATTACKER";
  readonly panX: -64 | 63;
}

export interface BellyDrumState {
  readonly active: boolean;
  readonly sourceOffset: number;
  readonly visualTaskCount: number;
  readonly hands: readonly BellyDrumHand[];
  readonly notes: readonly BellyDrumNote[];
  readonly shakeTasks: readonly BellyDrumShakeTask[];
  readonly audio: BellyDrumAudio | null;
  readonly rainbowBlend: boolean;
  readonly clearRainbowBlend: boolean;
}

function sine(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

/** The slow-note affine program starts at 0xa0 and adds four per callback. */
export function bellyDrumNoteScaleAtLocalAge(localAge: number): number {
  return 0xa0 + Math.max(0, localAge) * 4;
}

export function bellyDrumNoteAffinePaPdAtLocalAge(localAge: number): number {
  return Math.trunc(0x10000 / bellyDrumNoteScaleAtLocalAge(localAge));
}

function noteSlotForIndex(index: number): number {
  // The source's ordinary allocator reuses the lowest free OBJ slot.  These
  // are the observed slots for the six-note sequence in the complete battle
  // window; callers can still render by owner rather than absolute slot.
  return BELLY_DRUM_NOTE_SPRITE_SLOTS[index] ?? 5;
}

function sourceOffsetAtAge(age: number): number {
  let selected = BELLY_DRUM_SOURCE_OFFSETS[0]!;
  for (let index = 0; index < BELLY_DRUM_SOURCE_OFFSET_FIRST_AGES.length; index += 1) {
    if (age >= BELLY_DRUM_SOURCE_OFFSET_FIRST_AGES[index]!) {
      selected = BELLY_DRUM_SOURCE_OFFSETS[index]!;
    }
  }
  return selected;
}

function noteAtAge(
  age: number,
  index: number,
  origin: BellyDrumPoint,
): BellyDrumNote | null {
  const spawnAge = BELLY_DRUM_SPAWN_AGES[index];
  if (spawnAge === undefined) return null;
  const localAge = age - spawnAge + 1;
  if (localAge < 1 || localAge > 40) return null;
  const direction = BELLY_DRUM_NOTE_DIRECTIONS[index]!;
  // InitAnimLinearTranslation stores Q8.8 velocities in data[1]/[2], then
  // AnimTranslateLinear writes the accumulated offsets to data[3]/[4].
  const xVelocity = direction === 0 ? 0xcd : 0xcc;
  const yVelocity = 0x101;
  const phaseBefore = (BELLY_DRUM_NOTE_PHASES[index]! + 8 * (localAge - 1)) & 0xff;
  const phase = (phaseBefore + 8) & 0xff;
  const linearX = direction === 0
    ? -((xVelocity * localAge) >> 8)
    : (xVelocity * localAge) >> 8;
  const linearY = -((yVelocity * localAge) >> 8);
  const x = origin.x;
  const y = origin.y;
  return {
    index,
    localAge,
    x,
    y,
    x2: linearX + (linearX < 0 ? -sine(phaseBefore, 8) : sine(phaseBefore, 8)),
    y2: linearY + sine(phaseBefore, 4),
    direction,
    animation: BELLY_DRUM_NOTE_ANIMATIONS[index]!,
    paletteRow: BELLY_DRUM_NOTE_PALETTE_ROWS[index]!,
    phase,
    scale: bellyDrumNoteScaleAtLocalAge(localAge),
    affinePaPd: bellyDrumNoteAffinePaPdAtLocalAge(localAge),
    linearData: [40 - localAge, xVelocity, yVelocity, xVelocity * localAge, yVelocity * localAge, phase],
    spriteSlot: noteSlotForIndex(index),
  };
}

export function bellyDrumNotesAtAge(
  age: number,
  origin: BellyDrumPoint,
): readonly BellyDrumNote[] {
  const notes: BellyDrumNote[] = [];
  for (let index = 0; index < BELLY_DRUM_SPAWN_AGES.length; index += 1) {
    const note = noteAtAge(age, index, origin);
    if (note) notes.push(note);
  }
  return notes;
}

/** Persistent `sSpriteOrder` projection for the ordinary slow-note pool. */
export function bellyDrumNotesBackToFrontAtAge(
  age: number,
  origin: BellyDrumPoint,
): readonly BellyDrumNote[] {
  let order = createSpriteOrderState(
    [4, 5, 7, 9, 10],
    [4, 5, 7, 9, 10],
  );
  for (let tick = 0; tick <= age; tick += 1) {
    const notes = bellyDrumNotesAtAge(tick, origin);
    const owners = new Set(notes.map((note) => note.index));
    for (const occupant of order.occupants) {
      if (!owners.has(occupant.owner)) order = destroyOrderedSprite(order, occupant.owner);
    }
    for (const note of notes) {
      const key = {
        priority: 2,
        subpriority: 0,
        oamY: note.y + note.y2 - 8,
        affineMode: "double" as const,
        oamSize: 0 as const,
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
  const byIndex = new Map(bellyDrumNotesAtAge(age, origin).map((note) => [note.index, note]));
  return spriteOwnersBackToFront(order)
    .map((owner) => byIndex.get(owner))
    .filter((note): note is BellyDrumNote => note !== undefined);
}

export function bellyDrumHandsAtAge(
  age: number,
  origin: BellyDrumPoint,
): readonly BellyDrumHand[] {
  const hands: BellyDrumHand[] = [];
  for (let index = 0; index < BELLY_DRUM_SPAWN_AGES.length; index += 1) {
    const spawnAge = BELLY_DRUM_SPAWN_AGES[index]!;
    const localAge = age - spawnAge;
    // WaitAnimForDuration starts with data[0]=8, and its first visible
    // callback row has data[0]=7; the zero row remains displayed once before
    // the stored DestroyAnimSprite callback runs.
    if (localAge < 0 || localAge >= 9) continue;
    const right = (index & 1) === 0;
    hands.push({
      index,
      localAge,
      x: origin.x + (right ? 16 : -16),
      y: origin.y,
      right,
      hFlip: right,
      spriteSlot: BELLY_DRUM_HAND_SPRITE_SLOTS[index] ?? 3,
    });
  }
  return hands;
}

export function bellyDrumShakeTasksAtAge(
  age: number,
  side: BellyDrumSide,
): readonly BellyDrumShakeTask[] {
  const tasks: BellyDrumShakeTask[] = [];
  for (let index = 0; index < BELLY_DRUM_SPAWN_AGES.length; index += 1) {
    const localAge = age - BELLY_DRUM_SPAWN_AGES[index]!;
    if (localAge < 0 || localAge >= 2) continue;
    tasks.push({
      index,
      localAge,
      battler: side,
      data: [0, 1, 1, 1, 0, 8, 0, 0],
    });
  }
  return tasks;
}

export function bellyDrumAudioAtAge(
  age: number,
  side: BellyDrumSide,
): BellyDrumAudio | null {
  const index = BELLY_DRUM_SOUND_AGES.indexOf(age as never);
  if (index < 0) return null;
  return {
    index,
    soundEffect: "SE_M_BELLY_DRUM",
    id: 185,
    pan: "SOUND_PAN_ATTACKER",
    panX: side === "player" ? -64 : 63,
  };
}

export function bellyDrumAtAge(
  age: number,
  origin: BellyDrumPoint,
  side: BellyDrumSide,
): BellyDrumState {
  const notes = bellyDrumNotesAtAge(age, origin);
  const hands = bellyDrumHandsAtAge(age, origin);
  const shakeTasks = bellyDrumShakeTasksAtAge(age, side);
  const sourceOffset = sourceOffsetAtAge(age);
  return {
    active: age >= 0 && age < BELLY_DRUM_FIRST_INACTIVE_AGE,
    sourceOffset,
    visualTaskCount: notes.length + hands.length + shakeTasks.length,
    hands,
    notes,
    shakeTasks,
    audio: bellyDrumAudioAtAge(age, side),
    rainbowBlend: age >= 0 && age < 3,
    clearRainbowBlend: age >= 108,
  };
}
