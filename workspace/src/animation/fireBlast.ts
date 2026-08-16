import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

/** Full Move_FIRE_BLAST source window, including first inactive cleanup. */
export const FIRE_BLAST_FRAME_COUNT = 197;
export const FIRE_BLAST_RING_STARTS = [4, 11, 18] as const;
export const FIRE_BLAST_CROSS_STARTS = [
  113, 118, 123, 128, 133, 138, 143, 148, 153,
] as const;
export const FIRE_BLAST_RING_PHASES = [0, 51, 102, 153, 204] as const;
export const FIRE_BLAST_CROSS_VECTORS = [
  { duration: 10, x: 0, y: -2 },
  { duration: 13, x: -2, y: 0 },
  { duration: 13, x: 2, y: 0 },
  { duration: 15, x: -2, y: 2 },
  { duration: 15, x: 2, y: 2 },
] as const;

const RESERVED_SPRITE_SLOTS = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]);

export interface FireBlastGeometry {
  readonly attackerPictureCenter: Readonly<{ x: number; y: number }>;
  readonly targetPictureCenter: Readonly<{ x: number; y: number }>;
  readonly targetSpriteSlot: number;
}

export interface FireBlastRing {
  readonly kind: "ring";
  readonly group: number;
  readonly index: number;
  readonly slot: number;
  readonly localAge: number;
  readonly callback: "AnimFireRing_Step1" | "AnimFireRing_Step2" | "AnimFireRing_Step3";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly number[];
  readonly animationFrame: number;
  readonly animationDelayCounter: number;
  readonly tileIndex: number;
  readonly paletteSlot: 7;
  readonly matrix: readonly [256, 0, 0, 256];
}

export interface FireBlastCross {
  readonly kind: "cross";
  readonly group: number;
  readonly index: number;
  readonly slot: number;
  readonly localAge: number;
  readonly callback: "TranslateSpriteLinear" | "DestroyAnimSprite";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly number[];
  readonly animationFrame: number;
  readonly animationDelayCounter: number;
  readonly tileIndex: number;
  readonly paletteSlot: 7;
  readonly matrix: readonly [256, 0, 0, 256];
}

export interface FireBlastPaletteTask {
  readonly owner: "fade-to-black" | "restore-from-black";
  readonly data: readonly number[];
}

export interface FireBlastShakeTask {
  readonly data: readonly number[];
}

export interface FireBlastSoundTask {
  readonly callback: "SoundTask_FireBlast_Step1" | "SoundTask_FireBlast_Step2";
  readonly data: readonly number[];
}

export interface FireBlastSourceCursor {
  readonly owner: "Move_FIRE_BLAST" | "FireBlastRing";
  readonly offset: number;
  readonly wait: number;
}

export interface FireBlastState {
  readonly age: number;
  readonly active: boolean;
  readonly source: FireBlastSourceCursor;
  readonly rings: readonly FireBlastRing[];
  readonly crosses: readonly FireBlastCross[];
  readonly paletteTasks: readonly FireBlastPaletteTask[];
  readonly shakeTask: FireBlastShakeTask | null;
  readonly soundTask: FireBlastSoundTask | null;
  readonly targetShakeX2: number;
  readonly palette: Readonly<{
    backgroundCoefficient: number;
    hardwareBackgroundCoefficient: number;
    target: Readonly<{ r: 0; g: 0; b: 0 }>;
  }>;
  readonly registers: Readonly<{
    bldcnt: 0; bldalpha: 0; bldy: 0; mosaic: 0;
  }>;
  readonly resources: Readonly<{
    smallEmber: boolean;
    tileTags: readonly number[];
    paletteTags: readonly number[];
  }>;
  readonly audio: Readonly<{
    event: "SE_M_FLAME_WHEEL" | "SE_M_FLAME_WHEEL2" | null;
    pan: number | null;
  }>;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
}

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

function ringAtAge(
  age: number,
  startAge: number,
  group: number,
  index: number,
  slot: number,
  geometry: FireBlastGeometry,
): FireBlastRing | null {
  const localAge = age - startAge;
  if (localAge < 0 || localAge > 72) return null;
  const initialPhase = FIRE_BLAST_RING_PHASES[index]!;
  let callback: FireBlastRing["callback"];
  let x = geometry.attackerPictureCenter.x;
  let y = geometry.attackerPictureCenter.y;
  let x2: number;
  let y2: number;
  let data0: number;
  let data1 = 0;
  let data2 = 0;
  let data3 = 0;
  let data4 = 0;
  let phase: number;
  if (localAge <= 17) {
    callback = localAge === 17 ? "AnimFireRing_Step2" : "AnimFireRing_Step1";
    phase = (initialPhase + localAge * 20) & 0xff;
    x2 = gbaSin(phase, 28);
    y2 = gbaSin(phase + 64, 28);
    phase = (phase + 20) & 0xff;
    data0 = localAge === 17 ? 25 : localAge + 1;
    if (localAge === 17) {
      data1 = Math.abs(linearTranslationDeltaQ8(
        geometry.targetPictureCenter.x - x, 25,
      ));
      data2 = Math.abs(linearTranslationDeltaQ8(
        geometry.targetPictureCenter.y - y, 25,
      ));
    }
  } else if (localAge <= 42) {
    callback = "AnimFireRing_Step2";
    const callbacks = localAge - 17;
    const signedX = linearTranslationDeltaQ8(geometry.targetPictureCenter.x - x, 25);
    const signedY = linearTranslationDeltaQ8(geometry.targetPictureCenter.y - y, 25);
    data1 = Math.abs(signedX);
    data2 = Math.abs(signedY);
    data3 = data1 * callbacks;
    data4 = data2 * callbacks;
    phase = (initialPhase + (localAge + 1) * 20) & 0xff;
    x2 = linearTranslationOffsetAfterCallbacks(signedX, callbacks, 25)
      + gbaSin((phase - 20) & 0xff, 28);
    y2 = linearTranslationOffsetAfterCallbacks(signedY, callbacks, 25)
      + gbaSin(((phase - 20) + 64) & 0xff, 28);
    data0 = 25 - callbacks;
  } else {
    callback = "AnimFireRing_Step3";
    const translationX = linearTranslationDeltaQ8(
      geometry.targetPictureCenter.x - x, 25,
    );
    const translationY = linearTranslationDeltaQ8(
      geometry.targetPictureCenter.y - y, 25,
    );
    data1 = Math.abs(translationX);
    data2 = Math.abs(translationY);
    data3 = Math.abs(translationX) * 25;
    data4 = Math.abs(translationY) * 25;
    x = geometry.targetPictureCenter.x;
    y = geometry.targetPictureCenter.y;
    const step3Age = localAge - 43;
    phase = (initialPhase + (localAge + 1) * 20) & 0xff;
    x2 = gbaSin((phase - 20) & 0xff, 28);
    y2 = gbaSin(((phase - 20) + 64) & 0xff, 28);
    data0 = step3Age + 1;
  }
  const animationClock = localAge + 1;
  const animationFrame = Math.floor(animationClock / 4) % 5;
  return {
    kind: "ring", group, index, slot, localAge, callback, x, y, x2, y2,
    data: [data0, data1, data2, data3, data4, 0, 0, phase],
    animationFrame,
    animationDelayCounter: 3 - animationClock % 4,
    tileIndex: 537 + animationFrame * 16,
    paletteSlot: 7,
    matrix: [256, 0, 0, 256],
  };
}

function crossAtAge(
  age: number,
  startAge: number,
  group: number,
  index: number,
  slot: number,
  geometry: FireBlastGeometry,
): FireBlastCross | null {
  const vector = FIRE_BLAST_CROSS_VECTORS[index]!;
  const localAge = age - startAge;
  if (localAge < 0 || localAge > vector.duration) return null;
  const callbacks = Math.min(localAge + 1, vector.duration);
  const animationClock = localAge + 1;
  const animationFrame = Math.floor(animationClock / 6) % 2;
  return {
    kind: "cross", group, index, slot, localAge,
    callback: localAge === vector.duration
      ? "DestroyAnimSprite" : "TranslateSpriteLinear",
    x: geometry.targetPictureCenter.x,
    y: geometry.targetPictureCenter.y,
    x2: vector.x * callbacks,
    y2: vector.y * callbacks,
    data: [Math.max(0, vector.duration - callbacks), vector.x, vector.y,
      0, 0, 0, 15357, 2058],
    animationFrame,
    animationDelayCounter: 5 - animationClock % 6,
    tileIndex: 569 + animationFrame * 16,
    paletteSlot: 7,
    matrix: [256, 0, 0, 256],
  };
}

function allocateSprites(
  age: number,
  geometry: FireBlastGeometry,
): { rings: FireBlastRing[]; crosses: FireBlastCross[] } {
  const active = new Map<number, FireBlastRing | FireBlastCross>();
  const nextSlot = (): number => {
    for (let slot = 0; slot < 60; slot += 1) {
      if (!RESERVED_SPRITE_SLOTS.has(slot) && !active.has(slot)) return slot;
    }
    throw new Error("Fire Blast exhausted sprite slots");
  };
  const creations = [
    ...FIRE_BLAST_RING_STARTS.flatMap((startAge, group) =>
      FIRE_BLAST_RING_PHASES.map((_phase, index) =>
        ({ kind: "ring" as const, startAge, group, index }))),
    ...FIRE_BLAST_CROSS_STARTS.flatMap((startAge, group) =>
      FIRE_BLAST_CROSS_VECTORS.map((_vector, index) =>
        ({ kind: "cross" as const, startAge, group, index }))),
  ].sort((a, b) => a.startAge - b.startAge || a.index - b.index);
  for (let tick = 0; tick <= age; tick += 1) {
    for (const [slot, sprite] of active) {
      const current = sprite.kind === "ring"
        ? ringAtAge(tick, FIRE_BLAST_RING_STARTS[sprite.group]!,
          sprite.group, sprite.index, slot, geometry)
        : crossAtAge(tick, FIRE_BLAST_CROSS_STARTS[sprite.group]!,
          sprite.group, sprite.index, slot, geometry);
      if (current === null) active.delete(slot);
      else active.set(slot, current);
    }
    for (const creation of creations.filter((entry) => entry.startAge === tick)) {
      const slot = nextSlot();
      const sprite = creation.kind === "ring"
        ? ringAtAge(tick, creation.startAge, creation.group,
          creation.index, slot, geometry)
        : crossAtAge(tick, creation.startAge, creation.group,
          creation.index, slot, geometry);
      if (sprite) active.set(slot, sprite);
    }
  }
  return {
    rings: [...active.values()].filter((sprite): sprite is FireBlastRing =>
      sprite.kind === "ring").sort((a, b) => a.slot - b.slot),
    crosses: [...active.values()].filter((sprite): sprite is FireBlastCross =>
      sprite.kind === "cross").sort((a, b) => a.slot - b.slot),
  };
}

function paletteTaskAtAge(
  age: number,
  startAge: number,
  owner: FireBlastPaletteTask["owner"],
  delay: number,
  startCoefficient: number,
  targetCoefficient: number,
): FireBlastPaletteTask | null {
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
    owner,
    data: [14, 0, delay, startCoefficient, targetCoefficient, 0, 0, 0, 0,
      counter, coefficient, 0, 0, 0, 0, 0],
  } : null;
}

function shakeAtAge(age: number, targetSlot: number): FireBlastShakeTask | null {
  const localAge = age - 113;
  if (localAge < 0 || localAge > 37) return null;
  const decrements = Math.floor(localAge / 2) + 1;
  return { data: [targetSlot, 20 - decrements, 1, 1 - localAge % 2,
    5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
}

function soundAtAge(age: number, side: "player" | "opponent"): FireBlastSoundTask | null {
  const localAge = age - 4;
  if (localAge < 0 || localAge > 116) return null;
  const sourcePan = side === "player" ? -64 : 63;
  const targetPan = side === "player" ? 63 : -63;
  const finalStoredPan = side === "player" ? 63 : -64;
  const increment = side === "player" ? 2 : -2;
  if (localAge <= 109) {
    let pan = sourcePan;
    let counter = 10;
    for (let tick = 0; tick <= localAge; tick += 1) {
      counter += 1;
      if (counter === 11) counter = 0;
      pan = Math.max(-64, Math.min(63, pan + increment));
    }
    return { callback: "SoundTask_FireBlast_Step1",
      data: [144, 145, pan, targetPan, increment, 0, 0, 0, 0, 0,
        counter, localAge + 1, 0, 0, 0, 0] };
  }
  if (localAge === 110) {
    return { callback: "SoundTask_FireBlast_Step2",
      data: [144, 145, finalStoredPan, targetPan, increment, 0, 0, 0, 0, 0,
        5, 0, 0, 0, 0, 0] };
  }
  const step = localAge - 110;
  return { callback: "SoundTask_FireBlast_Step2",
    data: [144, 145, finalStoredPan, targetPan, increment, 0, 0, 0, 0, 0,
      (5 + step) % 6, Math.ceil(step / 6), 0, 0, 0, 0] };
}

function sourceCursor(age: number): FireBlastSourceCursor {
  if (age === 0) return { owner: "Move_FIRE_BLAST", offset: 0, wait: 0 };
  if (age <= 3) return { owner: "Move_FIRE_BLAST", offset: 3,
    wait: Math.max(0, 2 - age) };
  if (age <= 24) {
    const group = Math.min(2, Math.floor((age - 4) / 7));
    const local = age - (4 + group * 7);
    return { owner: "FireBlastRing", offset: 215, wait: Math.max(0, 5 - local) };
  }
  if (age <= 50) return { owner: "Move_FIRE_BLAST", offset: 30,
    wait: Math.max(0, 49 - age) };
  if (age <= 91) return { owner: "Move_FIRE_BLAST", offset: 47, wait: 1 };
  if (age <= 112) return { owner: "Move_FIRE_BLAST", offset: 50,
    wait: Math.max(0, 111 - age) };
  if (age <= 152) {
    const group = Math.min(7, Math.floor((age - 113) / 5));
    const start = 113 + group * 5;
    return { owner: "Move_FIRE_BLAST", offset: 74 + group * 7,
      wait: Math.max(0, 3 - (age - start)) };
  }
  if (age <= 169) return { owner: "Move_FIRE_BLAST", offset: 128, wait: 1 };
  if (age <= 195) return { owner: "Move_FIRE_BLAST", offset: 146, wait: 1 };
  return { owner: "Move_FIRE_BLAST", offset: 147, wait: 0 };
}

function backgroundCoefficientAtAge(age: number): number {
  if (age < 53) return 0;
  if (age <= 91) return Math.min(8, Math.floor((age - 53) / 4) + 1);
  if (age < 171) return 8;
  return Math.max(0, 7 - Math.floor((age - 171) / 3));
}

/** Pure source-relative Fire Blast reducer. */
export function fireBlastAtAge(
  age: number,
  side: "player" | "opponent",
  geometry: FireBlastGeometry,
): FireBlastState {
  const sprites = allocateSprites(age, geometry);
  const paletteTasks = [
    paletteTaskAtAge(age, 51, "fade-to-black", 3, 0, 8),
    paletteTaskAtAge(age, 170, "restore-from-black", 2, 8, 0),
  ].filter((task): task is FireBlastPaletteTask => task !== null);
  const shakeTask = shakeAtAge(age, geometry.targetSpriteSlot);
  const soundTask = soundAtAge(age, side);
  const coefficient = backgroundCoefficientAtAge(age);
  const priorCoefficient = backgroundCoefficientAtAge(Math.max(0, age - 1));
  const loopSound = soundTask?.callback === "SoundTask_FireBlast_Step1"
    && soundTask.data[10] === 0;
  const endSound = soundTask?.callback === "SoundTask_FireBlast_Step2"
    && soundTask.data[10] === 0 && soundTask.data[11] > 0;
  return {
    age,
    active: age >= 0 && age < FIRE_BLAST_FRAME_COUNT - 1,
    source: sourceCursor(age),
    ...sprites,
    paletteTasks,
    shakeTask,
    soundTask,
    targetShakeX2: shakeTask
      ? (age >= 115 && age % 4 < 3 ? 5 : 0)
      : 0,
    palette: {
      backgroundCoefficient: coefficient,
      hardwareBackgroundCoefficient: priorCoefficient,
      target: { r: 0, g: 0, b: 0 },
    },
    registers: { bldcnt: 0, bldalpha: 0, bldy: 0, mosaic: 0 },
    resources: {
      smallEmber: age >= 1 && age < 196,
      tileTags: age >= 1 && age < 196 ? [10029] : [],
      paletteTags: age >= 1 && age < 196 ? [10029] : [],
    },
    audio: loopSound
      ? { event: "SE_M_FLAME_WHEEL", pan: soundTask!.data[2] - (side === "player" ? 2 : -2) }
      : endSound ? { event: "SE_M_FLAME_WHEEL2", pan: side === "player" ? 63 : -63 }
        : { event: null, pan: null },
    visualTaskCount: sprites.rings.length + sprites.crosses.length
      + paletteTasks.length + Number(shakeTask !== null),
    soundTaskCount: Number(soundTask !== null),
  };
}
