import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  singNoteAffinePaPdAtLocalAge,
  singNoteScaleAtLocalAge,
} from "./sing.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  updateOrderedSprite,
} from "./spriteOrder.ts";

/**
 * Source-relative MOVE_TEETER_DANCE reducer.
 *
 * The ROM creates the five fast-note sprites at source ages 6, 32, 58, 84,
 * and 110. A plain script-created sprite is first displayed from the
 * preceding source row, so the retained Scene-ON display ages are 7, 33, 59,
 * 85, and 111. Each callback then exposes local ages 1..47; callback age 48
 * destroys the sprite. The task has the same one-row display boundary: its
 * first visible step is age 7 and its final live row is age 166.
 */
export const TEETER_DANCE_WINDOW_FRAMES = 169;
export const TEETER_DANCE_FIRST_INACTIVE_AGE = 168;
export const TEETER_DANCE_FIRST_NOTE_AGE = 7;
export const TEETER_DANCE_NOTE_SPAWN_AGES = [7, 33, 59, 85, 111] as const;
export const TEETER_DANCE_NOTE_X_OFFSETS = [16, 0, -16, -8, 8] as const;
export const TEETER_DANCE_NOTE_ANIMATIONS = [0, 0, 0, 1, 2] as const;
export const TEETER_DANCE_NOTE_SPRITE_SLOTS = [3, 4] as const;
export const TEETER_DANCE_NOTE_ORDER_SEED = [3, 4] as const;
export const TEETER_DANCE_SOUND_AGES = [7, 33, 59, 85, 111] as const;

export type TeeterDanceSide = "player" | "opponent";

export interface TeeterDancePoint {
  readonly x: number;
  /** BATTLER_COORD_Y_PIC_OFFSET, not the battler's sprite y. */
  readonly y: number;
}

export interface TeeterDanceNote {
  readonly index: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animation: number;
  readonly tileOffset: number;
  readonly paletteIndex: 0;
  readonly scale: number;
  readonly affinePaPd: number;
  readonly spriteSlot: 3 | 4;
}

export interface TeeterDanceTaskState {
  readonly tick: number;
  readonly phase: 0 | 1 | 2;
  readonly sideSign: 1 | -1;
  readonly baseX: number;
  readonly baseY: number;
  readonly x: number;
  readonly x2: number;
  readonly data: readonly number[];
}

export interface TeeterDanceAudio {
  readonly soundEffect: "SE_M_TEETER_DANCE";
  readonly panX: -64 | 63;
}

export interface TeeterDanceState {
  readonly active: boolean;
  readonly visualTaskCount: number;
  readonly battlerX: number;
  readonly battlerX2: number;
  readonly task: TeeterDanceTaskState | null;
  readonly notes: readonly TeeterDanceNote[];
  readonly audio: TeeterDanceAudio | null;
}

function truncDiv(numerator: number, denominator: number): number {
  return Math.trunc(numerator / denominator);
}

function sine(index: number, amplitude: number): number {
  return Math.floor((GBA_SINE_TABLE_256[index & 0xff]! * amplitude) / 256) || 0;
}

function sideSign(side: TeeterDanceSide): 1 | -1 {
  return side === "player" ? 1 : -1;
}

function noteSlotForIndex(index: number): 3 | 4 {
  // The two live notes alternate the lowest-free slots. At every third
  // creation the first slot has already been freed by callback age 48.
  return (index & 1) === 0 ? 3 : 4;
}

/** The fast template's affine scale program is shared with the music-note sheet. */
export function teeterDanceNoteScaleAtLocalAge(localAge: number): number {
  return singNoteScaleAtLocalAge(localAge);
}

export function teeterDanceNoteAffinePaPdAtLocalAge(localAge: number): number {
  return singNoteAffinePaPdAtLocalAge(localAge);
}

export function teeterDanceNoteAtAge(
  age: number,
  index: number,
  attacker: TeeterDancePoint,
  side: TeeterDanceSide,
): TeeterDanceNote | null {
  const spawnAge = TEETER_DANCE_NOTE_SPAWN_AGES[index];
  if (spawnAge === undefined) return null;
  const localAge = age - spawnAge + 1;
  if (localAge < 1 || localAge >= 48) return null;
  const rawOffset = TEETER_DANCE_NOTE_X_OFFSETS[index]!;
  const offset = rawOffset * sideSign(side);
  const velocityX = truncDiv(offset * 16, 5);
  const velocityY = truncDiv(-2 * 128, 5);
  const xFixed = ((attacker.x + offset) << 4) + velocityX * localAge;
  const yFixed = ((attacker.y - 2) << 4) + velocityY * localAge;
  // The source stops advancing after the 16-step orbit wraps at local age
  // 22 (data[3] becomes 1), leaving Cos(0,18)/Sin(0,18) held thereafter.
  const phase = localAge > 6 && localAge < 22
    ? ((localAge - 6) * 16) & 0xff
    : 0;
  const hasOrbit = localAge > 6;
  const animation = TEETER_DANCE_NOTE_ANIMATIONS[index]!;
  return {
    index,
    localAge,
    x: xFixed >> 4,
    y: yFixed >> 4,
    x2: hasOrbit ? sine(phase + 64, 18) : 0,
    y2: hasOrbit ? sine(phase, 18) : 0,
    animation,
    tileOffset: animation * 4,
    paletteIndex: 0,
    scale: teeterDanceNoteScaleAtLocalAge(localAge),
    affinePaPd: teeterDanceNoteAffinePaPdAtLocalAge(localAge),
    spriteSlot: noteSlotForIndex(index),
  };
}

export function teeterDanceNotesAtAge(
  age: number,
  attacker: TeeterDancePoint,
  side: TeeterDanceSide,
): readonly TeeterDanceNote[] {
  const notes: TeeterDanceNote[] = [];
  for (let index = 0; index < TEETER_DANCE_NOTE_SPAWN_AGES.length; index += 1) {
    const note = teeterDanceNoteAtAge(age, index, attacker, side);
    if (note) notes.push(note);
  }
  return notes;
}

/**
 * Persistent `sSpriteOrder` projection for the two-slot fast-note allocator.
 * Equal-priority ties are resolved by the live source order, while the sort
 * key follows the hardware OAM y/subpriority ordering.
 */
export function teeterDanceNotesBackToFrontAtAge(
  age: number,
  attacker: TeeterDancePoint,
  side: TeeterDanceSide,
): readonly TeeterDanceNote[] {
  let order = createSpriteOrderState(
    TEETER_DANCE_NOTE_SPRITE_SLOTS,
    TEETER_DANCE_NOTE_ORDER_SEED,
  );
  for (let tick = 0; tick <= age; tick += 1) {
    const notes = teeterDanceNotesAtAge(tick, attacker, side);
    const owners = new Set(notes.map((note) => note.index));
    for (const occupant of order.occupants) {
      if (!owners.has(occupant.owner)) order = destroyOrderedSprite(order, occupant.owner);
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
    teeterDanceNotesAtAge(age, attacker, side).map((note) => [note.index, note]),
  );
  return spriteOwnersBackToFront(order)
    .map((owner) => byIndex.get(owner))
    .filter((note): note is TeeterDanceNote => note !== undefined);
}

export function teeterDanceTaskAtAge(
  age: number,
  attacker: TeeterDancePoint,
  side: TeeterDanceSide,
  battler: TeeterDancePoint = attacker,
): TeeterDanceTaskState | null {
  const tick = age - 6;
  if (tick < 1 || tick > 160) return null;
  const sign = sideSign(side);
  const phase: 0 | 1 | 2 = tick >= 160 ? 2 : tick >= 128 ? 1 : 0;
  // data[9] stops at zero when case 0 completes; case 1 only advances
  // data[11].
  const data9 = phase === 0 ? (tick * 2) & 0xff : 0;
  const data11 = (tick * 8) & 0xff;
  const x = phase === 0
    ? battler.x + sign * (GBA_SINE_TABLE_256[data9]! >> 3)
    : battler.x;
  const x2 = GBA_SINE_TABLE_256[data11]! >> 5;
  return {
    tick,
    phase,
    sideSign: sign,
    baseX: battler.x,
    baseY: battler.y,
    x: phase === 0 && data9 === 0 ? battler.x : x,
    x2: phase === 1 && data11 === 0 ? 0 : x2,
    data: [phase, 0, 0, 0, sign, battler.x, battler.y, 0, 0, data9, 1, data11, 0, 0, 0, 0],
  };
}

export function teeterDanceAudioAtAge(
  age: number,
  side: TeeterDanceSide,
): TeeterDanceAudio | null {
  if (!(TEETER_DANCE_SOUND_AGES as readonly number[]).includes(age)) return null;
  return {
    soundEffect: "SE_M_TEETER_DANCE",
    panX: side === "player" ? -64 : 63,
  };
}

export function teeterDanceAtAge(
  age: number,
  attacker: TeeterDancePoint,
  side: TeeterDanceSide,
  battler: TeeterDancePoint = attacker,
): TeeterDanceState {
  const task = teeterDanceTaskAtAge(age, attacker, side, battler);
  const notes = teeterDanceNotesAtAge(age, attacker, side);
  return {
    active: age >= 0 && age < TEETER_DANCE_FIRST_INACTIVE_AGE,
    visualTaskCount: notes.length + (task ? 1 : 0),
    battlerX: task?.x ?? battler.x,
    battlerX2: task?.x2 ?? 0,
    task,
    notes,
    audio: teeterDanceAudioAtAge(age, side),
  };
}
