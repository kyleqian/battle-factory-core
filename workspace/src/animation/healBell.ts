import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { grantingStarFrameAtLocalAge } from "./synthesis.ts";
import { sortGbaSpriteOrder } from "./gbaObjCompositor.ts";

/** Complete Move_HEAL_BELL pointer window, including first inactive cleanup. */
export const HEAL_BELL_FRAME_COUNT = 261;
export const HEAL_BELL_NOTE_STARTS = [34, 69, 104] as const;
export const HEAL_BELL_RING_STARTS = [34, 69, 104] as const;
export const HEAL_BELL_SPARKLE_STARTS = [142, 152] as const;
export const HEAL_BELL_FINAL_RING_START = 217;

export interface HealBellNotePath {
  readonly x: number;
  readonly y: number;
  readonly duration: number;
  readonly tileVariant: number;
  readonly paletteVariant: number;
}

/** The twelve literal gHealBellMusicNoteSpriteTemplate argv paths. */
export const HEAL_BELL_NOTE_GROUPS: readonly (readonly HealBellNotePath[])[] =
  Object.freeze([
    Object.freeze([
      { x: 48, y: -18, duration: 35, tileVariant: 0, paletteVariant: 0 },
      { x: -48, y: 20, duration: 30, tileVariant: 1, paletteVariant: 1 },
      { x: -38, y: -29, duration: 30, tileVariant: 2, paletteVariant: 2 },
      { x: 36, y: 18, duration: 30, tileVariant: 3, paletteVariant: 3 },
    ]),
    Object.freeze([
      { x: 19, y: 26, duration: 35, tileVariant: 4, paletteVariant: 4 },
      { x: -34, y: -12, duration: 30, tileVariant: 5, paletteVariant: 5 },
      { x: 41, y: -20, duration: 34, tileVariant: 6, paletteVariant: 2 },
      { x: -15, y: 26, duration: 32, tileVariant: 7, paletteVariant: 0 },
    ]),
    Object.freeze([
      { x: -48, y: 18, duration: 31, tileVariant: 0, paletteVariant: 2 },
      { x: 48, y: -20, duration: 30, tileVariant: 2, paletteVariant: 5 },
      { x: 38, y: 29, duration: 33, tileVariant: 4, paletteVariant: 3 },
      { x: -36, y: -18, duration: 30, tileVariant: 6, paletteVariant: 1 },
    ]),
  ]);

/** Source-interpreter ages for all 44 root commands, in source order. */
export const HEAL_BELL_ROOT_COMMAND_AGES = Object.freeze([
  0, 1, 4, 7, 10, 20, 20, 20,
  34, 34, 34, 34, 34, 34,
  69, 69, 69, 69, 69, 69,
  104, 104, 104, 104, 104, 104,
  139, 139, 139, 139, 139, 139,
  142, 142, 142, 152, 152, 214,
  214, 217, 217, 217, 217, 217,
] as const);

const NOTE_SLOTS = Object.freeze([
  Object.freeze([4, 5, 7, 9]),
  Object.freeze([5, 7, 9, 10]),
  Object.freeze([4, 7, 10, 11]),
] as const);

export interface HealBellNote {
  readonly group: number;
  readonly path: number;
  readonly slot: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly remaining: number;
  readonly deltaXQ8: number;
  readonly deltaYQ8: number;
  readonly accumulatorXQ8: number;
  readonly accumulatorYQ8: number;
  readonly tileVariant: number;
  readonly paletteVariant: number;
  readonly paletteSlot: 8 | 10 | 11;
}

export interface HealBellRing {
  readonly kind: "normal" | "blend";
  readonly slot: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly matrixScale: number;
}

export interface HealBellSparkle {
  readonly slot: number;
  readonly spawnIndex: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly frame: number;
}

export interface HealBellPaletteTask {
  readonly owner: "initial" | "ring-exclude" | "ring-attacker"
    | "final-exclude" | "final-attacker";
  readonly startAge: number;
  readonly counter: number;
  readonly coefficient: number;
  readonly startCoefficient: number;
  readonly targetCoefficient: number;
  readonly delay: number;
}

export interface HealBellResources {
  readonly bell: boolean;
  readonly musicNotes2: boolean;
  readonly musicNoteVariantPalettes: boolean;
  readonly thinRing: boolean;
  readonly sparkle2: boolean;
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
}

export interface HealBellState {
  readonly age: number;
  readonly active: boolean;
  readonly rootCommandsReached: number;
  readonly bell: null | Readonly<{
    slot: 3; x: number; y: number; frame: number; hFlip: boolean;
  }>;
  readonly notes: readonly HealBellNote[];
  readonly rings: readonly HealBellRing[];
  readonly sparkles: readonly HealBellSparkle[];
  readonly paletteTasks: readonly HealBellPaletteTask[];
  readonly palette: Readonly<{
    /** F_PAL_BG, excluding the two visible battlers. */
    backgroundCoefficient: number;
    readonly backgroundTarget: Readonly<{ r: 99; g: 198; b: 247 }>;
    /** F_PAL_ATK_SIDE; the single-battle carrier is the only visible member. */
    attackerCoefficient: number;
  }>;
  readonly resources: HealBellResources;
  readonly audio: "SE_M_HEAL_BELL" | "SE_M_MORNING_SUN" | "SE_SHINY" | null;
  readonly audioPan: -64 | 63 | null;
  readonly visualTaskCount: number;
}

function noteAtAge(
  group: number,
  pathIndex: number,
  age: number,
  side: "player" | "opponent",
  origin: Readonly<{ x: number; y: number }>,
): HealBellNote | null {
  const path = HEAL_BELL_NOTE_GROUPS[group]![pathIndex]!;
  const localAge = age - HEAL_BELL_NOTE_STARTS[group]!;
  if (localAge < 0 || localAge > path.duration) return null;
  const orientedX = side === "player" ? path.x : -path.x;
  const dx = linearTranslationDeltaQ8(orientedX, path.duration);
  // InitSpritePosToAnimAttacker starts at Y-24, while data[4]'s destination
  // is the unshifted battler Y plus argv[3].
  const dy = linearTranslationDeltaQ8(path.y + 24, path.duration);
  const callbacks = Math.min(localAge + 1, path.duration);
  return {
    group,
    path: pathIndex,
    slot: NOTE_SLOTS[group]![pathIndex]!,
    localAge,
    x: origin.x,
    y: origin.y,
    x2: linearTranslationOffsetAfterCallbacks(dx, callbacks, path.duration),
    y2: linearTranslationOffsetAfterCallbacks(dy, callbacks, path.duration),
    remaining: Math.max(0, path.duration - callbacks),
    deltaXQ8: Math.abs(dx),
    deltaYQ8: Math.abs(dy),
    accumulatorXQ8: Math.abs(dx) * callbacks,
    accumulatorYQ8: Math.abs(dy) * callbacks,
    tileVariant: path.tileVariant,
    paletteVariant: path.paletteVariant,
    paletteSlot: ([8, 10, 11] as const)[Math.floor(path.paletteVariant / 2)]!,
  };
}

function ringAt(
  age: number,
  startAge: number,
  slot: number,
  kind: "normal" | "blend",
  center: Readonly<{ x: number; y: number }>,
): HealBellRing | null {
  const localAge = age - startAge;
  if (localAge < 0 || localAge > 30) return null;
  return {
    kind, slot, localAge, x: center.x, y: center.y,
    matrixScale: Math.floor(0x10000 / (32 + Math.min(localAge, 29) * 16)),
  };
}

function paletteTask(
  age: number,
  startAge: number,
  owner: HealBellPaletteTask["owner"],
  delay: number,
  startCoefficient: number,
  targetCoefficient: number,
): HealBellPaletteTask | null {
  if (age < startAge) return null;
  let counter = 0;
  let coefficient = startCoefficient;
  let active = true;
  for (let tick = 0; tick <= age - startAge && active; tick += 1) {
    const callbacks = tick === 0 ? 2 : 1;
    for (let callback = 0; callback < callbacks; callback += 1) {
      if (counter === delay) {
        counter = 0;
        if (coefficient < targetCoefficient) coefficient += 1;
        else if (coefficient > targetCoefficient) coefficient -= 1;
        else active = false;
      } else counter += 1;
      if (!active) break;
    }
  }
  return active ? {
    owner, startAge, counter, coefficient, startCoefficient,
    targetCoefficient, delay,
  } : null;
}

const BELL_FRAMES = Object.freeze([
  { tile: 0, ticks: 5, hFlip: false },
  { tile: 1, ticks: 6, hFlip: false },
  { tile: 2, ticks: 15, hFlip: false },
  { tile: 1, ticks: 6, hFlip: false },
  { tile: 0, ticks: 6, hFlip: false },
  { tile: 1, ticks: 6, hFlip: true },
  { tile: 2, ticks: 15, hFlip: true },
  { tile: 1, ticks: 6, hFlip: true },
  { tile: 0, ticks: 6, hFlip: false },
  { tile: 1, ticks: 6, hFlip: false },
  { tile: 2, ticks: 15, hFlip: false },
  { tile: 1, ticks: 6, hFlip: false },
  { tile: 0, ticks: 7, hFlip: false },
] as const);

function bellAtAge(age: number, center: Readonly<{ x: number; y: number }>) {
  let local = age - 20;
  if (local < 0 || local > 104) return null;
  for (const frame of BELL_FRAMES) {
    if (local < frame.ticks) {
      return { slot: 3 as const, x: center.x, y: center.y,
        frame: frame.tile, hFlip: frame.hFlip };
    }
    local -= frame.ticks;
  }
  return null;
}

function resourcesAtAge(age: number): HealBellResources {
  const initial = age >= 1 && age < 139;
  const sparkle = age >= 139 && age < 214;
  const finalRing = age >= 214 && age < 260;
  return {
    bell: initial,
    musicNotes2: age >= 4 && age < 139,
    musicNoteVariantPalettes: age >= 20 && age < 139,
    thinRing: (age >= 7 && age < 139) || finalRing,
    sparkle2: sparkle,
    paletteTags: initial
      ? [10205, ...(age >= 4 ? [10206] : []),
        ...(age >= 7 ? [10203] : []), ...(age >= 20 ? [9999, 9998] : [])]
      : sparkle ? [10049] : finalRing ? [10203] : [],
    tileTags: initial
      ? [10205, ...(age >= 4 ? [10206] : []), ...(age >= 7 ? [10203] : [])]
      : sparkle ? [10049] : finalRing ? [10203] : [],
  };
}

/** Pure source-relative Heal Bell presentation reducer. */
export function healBellAtAge(
  age: number,
  side: "player" | "opponent",
  animationCenter: Readonly<{ x: number; y: number }>,
  battlePositionCenter: Readonly<{ x: number; y: number }>,
): HealBellState {
  const noteOrigin = {
    x: battlePositionCenter.x,
    y: battlePositionCenter.y - 24,
  };
  const notes = HEAL_BELL_NOTE_GROUPS.flatMap((group, groupIndex) =>
    group.flatMap((_path, pathIndex) => {
      const note = noteAtAge(groupIndex, pathIndex, age, side, noteOrigin);
      return note ? [note] : [];
    }));
  const rings = HEAL_BELL_RING_STARTS.flatMap((startAge, index) => {
    const ring = ringAt(age, startAge, 10 + index, "normal", noteOrigin);
    return ring ? [ring] : [];
  });
  const finalRing = ringAt(
    age, HEAL_BELL_FINAL_RING_START, 3, "blend", battlePositionCenter,
  );
  if (finalRing) rings.push(finalRing);
  const sparkles = HEAL_BELL_SPARKLE_STARTS.flatMap((startAge, index) => {
    const localAge = age - startAge;
    const frame = grantingStarFrameAtLocalAge(localAge);
    if (frame === null) return [];
    const xOffset = side === "player" ? [-15, 12][index]! : -[-15, 12][index]!;
    return [{
      slot: 3 + index,
      spawnIndex: index,
      localAge,
      x: animationCenter.x + xOffset,
      y: animationCenter.y + [0, -5][index]!,
      y2: Math.floor(32 * Math.min(localAge + 1, 60) / 256),
      frame,
    }];
  });
  const paletteTasks = [
    paletteTask(age, 10, "initial", 0, 0, 10),
    ...HEAL_BELL_RING_STARTS.flatMap((startAge) => [
      paletteTask(age, startAge, "ring-exclude", 3, 8, 0),
      paletteTask(age, startAge, "ring-attacker", 3, 2, 10),
    ]),
    paletteTask(age, 217, "final-exclude", 3, 10, 0),
    paletteTask(age, 217, "final-attacker", 3, 10, 0),
  ].filter((task): task is HealBellPaletteTask => task !== null);
  // AnimTask_BlendSpriteColor_Step2 writes the current coefficient to the
  // faded bank before advancing data[10]. Its initializer and first task pass
  // account for the two callbacks at creation; the palette then reaches
  // hardware through the ordinary one-row GBA palette latch. These formulas
  // expose the faded-bank result, including its hold after task destruction.
  let backgroundCoefficient = 0;
  let attackerCoefficient = age < 10 ? 0 : age < 19 ? age - 9 : 10;
  for (const startAge of HEAL_BELL_RING_STARTS) {
    if (age < startAge + 2) continue;
    const step = Math.floor((age - startAge - 2) / 4);
    backgroundCoefficient = Math.max(0, 8 - step);
    attackerCoefficient = Math.min(10, 2 + step);
  }
  if (age >= 219) {
    const step = Math.floor((age - 219) / 4);
    backgroundCoefficient = Math.max(0, 10 - step);
    attackerCoefficient = Math.max(0, 10 - step);
  }
  const bell = bellAtAge(age, noteOrigin);
  const audio = HEAL_BELL_RING_STARTS.includes(age as 34 | 69 | 104)
    ? "SE_M_HEAL_BELL" as const
    : age === 142 ? "SE_M_MORNING_SUN" as const
      : age === 217 ? "SE_SHINY" as const : null;
  return {
    age,
    active: age >= 0 && age < HEAL_BELL_FRAME_COUNT - 1,
    rootCommandsReached: HEAL_BELL_ROOT_COMMAND_AGES.filter(
      (commandAge) => commandAge <= age,
    ).length,
    bell,
    notes,
    rings,
    sparkles,
    paletteTasks,
    palette: {
      backgroundCoefficient,
      backgroundTarget: { r: 99, g: 198, b: 247 },
      attackerCoefficient,
    },
    resources: resourcesAtAge(age),
    audio,
    audioPan: audio === null ? null : side === "player" ? -64 : 63,
    visualTaskCount: Number(bell !== null) + notes.length + rings.length
      + sparkles.length + paletteTasks.length,
  };
}

export const HEAL_BELL_REUSED_ORDER_SLOTS = [4, 5, 7, 9, 10, 11] as const;

/**
 * Back-to-front note order after replaying the source's persistent stable OAM
 * sort. Ring slots 10/11 participate before being reused, and inactive slots
 * retain ResetSprite's priority, so a same-Y crossing cannot be reduced to a
 * stateless coordinate tie-break.
 */
export function healBellNotesInPainterOrder(
  age: number,
  side: "player" | "opponent",
  animationCenter: Readonly<{ x: number; y: number }>,
  battlePositionCenter: Readonly<{ x: number; y: number }>,
  /** Relative `sSpriteOrder` of the six reused slots at activation; the accepted staged history assumes ascending. */
  initialOrder: readonly number[] = HEAL_BELL_REUSED_ORDER_SLOTS,
): readonly HealBellNote[] {
  let order: number[] = [...initialOrder];
  for (let tick = 0; tick <= age; tick += 1) {
    const state = healBellAtAge(tick, side, animationCenter, battlePositionCenter);
    order = sortGbaSpriteOrder(order, order.map((slot) => {
      const note = state.notes.find((candidate) => candidate.slot === slot);
      if (note) return {
        slot, priority: 2 as const, subpriority: 40,
        y: note.y + note.y2 - 8,
      };
      const ring = state.rings.find((candidate) => candidate.slot === slot);
      if (ring) return {
        slot, priority: 2 as const, subpriority: 40,
        y: ring.y - 64,
      };
      return { slot, priority: 3 as const, subpriority: 255, y: -96 };
    }));
  }
  const state = healBellAtAge(age, side, animationCenter, battlePositionCenter);
  const bySlot = new Map(state.notes.map((note) => [note.slot, note] as const));
  return order.slice().reverse().flatMap((slot) => {
    const note = bySlot.get(slot);
    return note ? [note] : [];
  });
}
