/**
 * Source-age reducer for MOVE_WATER_PULSE.
 *
 * The script owns the scheduling below; the Scene-ON caller provides the
 * current battlers, allocator choices, and battle-background facts.  This is
 * deliberately a semantic presentation model, not a framebuffer compositor:
 * it never imports a recording, scenario, screenshot, or canonical party.
 */
import asset from "./assets/water-pulse.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type WaterPulseSide = "player" | "opponent";

export interface WaterPulsePoint {
  readonly x: number;
  readonly y: number;
}

export interface WaterPulseResourceSlot {
  readonly tileSlot: number;
  readonly paletteBank: number;
  readonly tileRange: readonly [number, number];
}

/** Facts intentionally supplied by the live Battle Scene ON presenter. */
export interface WaterPulseLiveInputs {
  readonly attackerSide: WaterPulseSide;
  readonly targetSide: WaterPulseSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** Current `BATTLER_COORD_X_2/Y_PIC_OFFSET` positions for simple blend work. */
  readonly attackerCenter: Readonly<WaterPulsePoint>;
  readonly targetCenter: Readonly<WaterPulsePoint>;
  /** `AnimSimplePaletteBlend`'s target picture coordinate (may differ on a back sprite). */
  readonly targetPictureCenter: Readonly<WaterPulsePoint>;
  /** `InitSpritePosToAnimAttacker(..., TRUE)` is intentionally a separate source point. */
  readonly attackerRingOrigin: Readonly<WaterPulsePoint>;
  /** Ring callback's target X_2/Y_PIC_OFFSET source point. */
  readonly targetRingCenter: Readonly<WaterPulsePoint>;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  readonly attackerSubpriority: number;
  readonly targetSubpriority: number;
  readonly targetInitialOffset: Readonly<WaterPulsePoint>;
  readonly simplePaletteSpriteSlot: number;
  readonly smallBubbleSlots: readonly [number, number, number, number, number];
  readonly ringSlots: readonly [number, number, number];
  readonly ringBubbleSlots: readonly [
    number, number, number, number, number, number,
    number, number, number, number, number, number,
  ];
  readonly ringMatrixSlots: readonly [number, number, number];
  readonly ringBubbleMatrixSlots: readonly [
    number, number, number, number, number, number,
    number, number, number, number, number, number,
  ];
  readonly smallBubbles: Readonly<WaterPulseResourceSlot>;
  readonly blueRing2: Readonly<WaterPulseResourceSlot>;
  readonly updateMonBgTaskSlot: number;
  readonly clearMonBgTaskSlot: number;
  readonly shakeTaskSlot: number;
  /** Source `Task_UpdateMonBg` setup fields, derived by the live caller. */
  readonly monBg: Readonly<{
    readonly layer: "bg1" | "bg2";
    readonly layerId: number;
    readonly snapshot: Readonly<WaterPulsePoint>;
    readonly baseScroll: Readonly<WaterPulsePoint>;
    readonly activeCnt: number;
    readonly inactiveCnt: number;
  }>;
  /** Existing non-owned allocation state, restored at cleanup. */
  readonly initialMatrixBitmap: number;
  /** Existing GBA sprite order, used only as a stable source-sort tiebreaker. */
  readonly spriteOrder: readonly number[];
  /** `gRng2` at source age zero; gameplay RNG is never touched. */
  readonly animationRngSeed: number;
}

export const WATER_PULSE_FIRST_INACTIVE_AGE = 159;
export const WATER_PULSE_SMALL_BUBBLES_TAG = 10155;
export const WATER_PULSE_BLUE_RING_2_TAG = asset.blueRing2.tag;
export const WATER_PULSE_COLOR_BGR555 = 29472;

export interface WaterPulseSourceCursor {
  readonly owner: "Move_WATER_PULSE";
  readonly pointerOffset: number;
  readonly wait: number;
  readonly active: boolean;
}

export interface WaterPulseSprite {
  readonly kind: "simple-palette-blend" | "small-bubble" | "blue-ring" | "ring-bubble";
  readonly slot: number;
  readonly callback:
    | "AnimSimplePaletteBlend_Step"
    | "AnimWaterPulseBubble_Step"
    | "AnimWaterPulseRing_Step"
    | "AnimWaterPulseRingBubble";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  /** Source animation-frame selection; every Water Pulse instance starts at frame zero. */
  readonly frame: 0 | 1;
  readonly data: readonly number[];
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: readonly [number, number, number, number];
  readonly oam: Readonly<{
    readonly priority: 2 | 3;
    readonly affine: boolean;
    readonly doubleSize: boolean;
    readonly shape: "8x8" | "16x32";
  }>;
}

export interface WaterPulseTask {
  readonly slot: number;
  readonly callback: "Task_UpdateMonBg" | "Task_ClearMonBg" | "AnimTask_ShakeMon_Step";
  readonly data: readonly number[];
}

export interface WaterPulseState {
  readonly age: number;
  readonly active: boolean;
  readonly source: WaterPulseSourceCursor;
  readonly sprites: readonly WaterPulseSprite[];
  readonly tasks: readonly WaterPulseTask[];
  /** Source's OAM priority/subpriority sort over owned slots, with live baseline ties. */
  readonly order: Readonly<{
    readonly callerBaseline: readonly number[];
    readonly ownedSlots: readonly number[];
  }>;
  readonly targetOffset: Readonly<WaterPulsePoint>;
  readonly background: Readonly<{
    readonly vram: "battle" | "mon-bg" | "clear-pending";
    readonly vramEvent: "none" | "load-mon-bg" | "clear-mon-bg" | "restore-battle";
    readonly targetVisible: boolean;
    readonly softwareScroll: Readonly<WaterPulsePoint> | null;
  }>;
  readonly registers: Readonly<{
    readonly layer: "bg1" | "bg2";
    readonly hardwareCnt: number;
    readonly hardwareScroll: Readonly<WaterPulsePoint>;
    readonly transfer: "normal" | "preceding-mon-bg";
  }>;
  readonly palette: Readonly<{
    readonly colorBgr555: 29472;
    readonly softwareCoefficient: number;
    readonly hardwareCoefficient: number;
    readonly transfer: "current-faded" | "current-faded-monbg-setup" | "preceding-faded";
  }>;
  /** Whole OAM/matrix DMA is move-local ordinary predecessor transfer. */
  readonly displayTransfer: Readonly<{
    readonly oam: "current" | "preceding-software";
    readonly matrices: "current" | "preceding-software";
    readonly palettes: "current-faded" | "current-faded-monbg-setup" | "preceding-faded";
  }>;
  readonly resources: Readonly<{
    readonly smallBubbles: Readonly<WaterPulseResourceSlot & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly blueRing2: Readonly<WaterPulseResourceSlot & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly allocator: Readonly<{
      readonly matrixBitmap: number;
      readonly releasedAtFirstInactive: boolean;
    }>;
  }>;
  readonly audio: Readonly<{
    readonly events: readonly Readonly<{
      readonly channel: "SE1";
      readonly sound: "SE_M_BUBBLE3" | "SE_M_GIGA_DRAIN";
      readonly sourcePan: "SOUND_PAN_ATTACKER" | "SOUND_PAN_TARGET";
      readonly pan: -64 | 63;
    }>[];
  }>;
  readonly rng: Readonly<{
    readonly gameplay: "untouched";
    readonly animationBefore: number;
    readonly animationAfter: number;
    readonly advances: number;
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly visualTasks: number;
    readonly soundTasks: 0;
    readonly ownedSprites: number;
    readonly resourcesReleased: boolean;
  }>;
}

const SMALL_BUBBLES = [
  { x: 100, y: 100, phase: 8, phaseStep: 1, amplitude: 20, duration: 40 },
  { x: 20, y: 100, phase: 16, phaseStep: 2, amplitude: 10, duration: 35 },
  { x: 200, y: 80, phase: 8, phaseStep: 1, amplitude: 40, duration: 20 },
  { x: 80, y: 60, phase: 10, phaseStep: 3, amplitude: 20, duration: 50 },
  { x: 140, y: 100, phase: 16, phaseStep: 1, amplitude: 20, duration: 30 },
] as const;
const RING_SPAWNS = [72, 79, 86] as const;
const RING_EMISSIONS = [
  { age: 86, ring: 0 }, { age: 93, ring: 1 }, { age: 100, ring: 2 },
  { age: 101, ring: 0 }, { age: 108, ring: 1 }, { age: 115, ring: 2 },
] as const;
const RING_AFFINE_DELTAS = [5, -10, 10, -10, 10, -10, 10] as const;

function range(age: number, first: number, last: number): boolean {
  return age >= first && age <= last;
}

/** The retained root cursor, derived from its script waits rather than rows. */
export function waterPulseSourceAtAge(age: number): WaterPulseSourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Water Pulse source age ${age}`);
  if (age === 0) return { owner: "Move_WATER_PULSE", pointerOffset: 0, wait: 0, active: true };
  if (age <= 3) return { owner: "Move_WATER_PULSE", pointerOffset: 3, wait: age === 1 ? 1 : 0, active: true };
  if (age <= 6) return { owner: "Move_WATER_PULSE", pointerOffset: 6, wait: age === 4 ? 1 : 0, active: true };
  if (age <= 9) return { owner: "Move_WATER_PULSE", pointerOffset: 8, wait: age === 7 ? 1 : 0, active: true };
  if (age <= 21) return { owner: "Move_WATER_PULSE", pointerOffset: 33, wait: Math.max(0, 20 - age), active: true };
  if (age <= 71) return { owner: "Move_WATER_PULSE", pointerOffset: 142, wait: 1, active: true };
  if (age <= 78) return { owner: "Move_WATER_PULSE", pointerOffset: 164, wait: Math.max(0, 77 - age), active: true };
  if (age <= 85) return { owner: "Move_WATER_PULSE", pointerOffset: 185, wait: Math.max(0, 84 - age), active: true };
  if (age <= 100) return { owner: "Move_WATER_PULSE", pointerOffset: 206, wait: Math.max(0, 99 - age), active: true };
  if (age <= 135) return { owner: "Move_WATER_PULSE", pointerOffset: 223, wait: 1, active: true };
  if (age <= 154) return { owner: "Move_WATER_PULSE", pointerOffset: 241, wait: 1, active: true };
  return { owner: "Move_WATER_PULSE", pointerOffset: 244, wait: 1, active: age < WATER_PULSE_FIRST_INACTIVE_AGE };
}

function advanceRng(value: number): number {
  return (Math.imul(value, 0x41c64e6d) + 0x6073) >>> 0;
}

function normalRngAdvance(age: number): boolean {
  return age >= 1 && (age <= 156 || age === 159);
}

function isEmissionAge(age: number): boolean {
  return RING_EMISSIONS.some((event) => event.age === age);
}

/** `gRng2` at the end of this source age, including the two callback Random2 calls. */
export function waterPulseAnimationRngAtAge(seed: number, age: number): number {
  let result = seed >>> 0;
  for (let sourceAge = 1; sourceAge <= age; sourceAge++) {
    if (normalRngAdvance(sourceAge)) result = advanceRng(result);
    if (isEmissionAge(sourceAge)) {
      result = advanceRng(result);
      result = advanceRng(result);
    }
  }
  return result;
}

function rngAdvancesAtAge(age: number): number {
  return (normalRngAdvance(age) ? 1 : 0) + (isEmissionAge(age) ? 2 : 0);
}

function randomsForEmission(seed: number, emissionAge: number): Readonly<{ y: number; x: number }> {
  let rng = waterPulseAnimationRngAtAge(seed, emissionAge - 1);
  // The script's normal source step occurs before the ring callback's two Random2 calls.
  rng = advanceRng(rng);
  rng = advanceRng(rng);
  const y = (rng >>> 16) % 10;
  rng = advanceRng(rng);
  return { y, x: (rng >>> 16) % 10 };
}

function targetOffsetAtAge(age: number, input: WaterPulseLiveInputs): WaterPulsePoint {
  if (age < 101) return input.targetInitialOffset;
  if (age > 134) return { x: 0, y: 0 };
  if (age <= 102) return { x: 0, y: 0 };
  return { x: 0, y: Math.floor((age - 103) / 2) % 2 === 0 ? 8 : 0 };
}

/** Macro-expanded `simple_palette_blend F_PAL_BG` coefficient body. */
export function waterPulsePaletteCoefficientAtAge(age: number): number {
  if (age <= 10) return 0;
  if (age <= 12) return 2;
  if (age <= 14) return 4;
  if (age <= 16) return 6;
  if (age <= 137) return 7;
  if (age <= 140) return 5;
  if (age <= 143) return 3;
  if (age <= 146) return 1;
  return 0;
}

function affineMatrix(scale: number): readonly [number, number, number, number] {
  const inverse = Math.trunc(65536 / scale);
  return [inverse, 0, 0, inverse];
}

/** `CreateSpriteAndAnimate` runs the first affine command once at creation. */
function ringScaleAtAge(elapsed: number): number {
  let scale = 256;
  let command = 0;
  let delay = 9;
  scale += RING_AFFINE_DELTAS[command]!;
  for (let frame = 0; frame <= elapsed; frame++) {
    if (delay > 0) {
      delay--;
      scale += RING_AFFINE_DELTAS[command]!;
    } else if (command < RING_AFFINE_DELTAS.length - 1) {
      command++;
      delay = 9;
      scale += RING_AFFINE_DELTAS[command]!;
    }
  }
  return scale;
}

function smallBubblesAtAge(age: number, input: WaterPulseLiveInputs): WaterPulseSprite[] {
  if (age < 22) return [];
  return SMALL_BUBBLES.flatMap((bubble, index) => {
    const calls = age - 22 + 1;
    if (calls >= bubble.duration) return [];
    const phase = (bubble.phaseStep * calls) & 0xff;
    const vertical = -bubble.phase * calls;
    return [{
      kind: "small-bubble" as const,
      slot: input.smallBubbleSlots[index]!,
      callback: "AnimWaterPulseBubble_Step" as const,
      x: bubble.x,
      y: bubble.y,
      x2: (GBA_SINE_TABLE_256[phase]! * bubble.amplitude) >> 8,
      y2: Math.trunc(vertical / 10),
      // All five source instances use the same SMALL_BUBBLES image frame;
      // the final template argument configures motion, not AnimNum.
      frame: 0,
      data: [bubble.phase, bubble.phaseStep, bubble.amplitude, bubble.duration - calls, vertical, phase, 0, 0],
      subpriority: input.attackerSubpriority + 2,
      matrixNum: 0,
      matrix: [256, 0, 0, 256] as const,
      oam: { priority: 3 as const, affine: false, doubleSize: false, shape: "8x8" as const },
    }];
  });
}

function simplePaletteSpriteAtAge(age: number, input: WaterPulseLiveInputs): WaterPulseSprite | null {
  if (!range(age, 10, 23) && !range(age, 136, 153)) return null;
  return {
    kind: "simple-palette-blend",
    slot: input.simplePaletteSpriteSlot,
    callback: "AnimSimplePaletteBlend_Step",
    x: input.targetPictureCenter.x,
    y: input.targetPictureCenter.y,
    x2: 0,
    y2: 0,
    frame: 0,
    data: [0, 0, 0, 0, 0, 0, 0, 0],
    subpriority: input.attackerSubpriority - 2,
    matrixNum: 0,
    matrix: [256, 0, 0, 256],
    oam: { priority: 3, affine: false, doubleSize: false, shape: "8x8" },
  };
}

function ringAtAge(age: number, input: WaterPulseLiveInputs, index: number): WaterPulseSprite | null {
  const spawn = RING_SPAWNS[index]!;
  const elapsed = age - spawn;
  if (!range(elapsed, 0, 39)) return null;
  const diffX = input.targetRingCenter.x - input.attackerRingOrigin.x;
  const diffY = input.targetRingCenter.y - input.attackerRingOrigin.y;
  return {
    kind: "blue-ring",
    slot: input.ringSlots[index]!,
    callback: "AnimWaterPulseRing_Step",
    x: input.attackerRingOrigin.x,
    y: input.attackerRingOrigin.y,
    x2: Math.trunc(elapsed * diffX / 40),
    y2: Math.trunc(elapsed * diffY / 40),
    frame: 0,
    data: [elapsed + 1, input.targetRingCenter.x, input.targetRingCenter.y, 40, 15, (elapsed + 1) % 15, 0, 0],
    subpriority: input.targetSubpriority - 2,
    matrixNum: input.ringMatrixSlots[index]!,
    matrix: affineMatrix(ringScaleAtAge(elapsed)),
    oam: { priority: 2, affine: true, doubleSize: true, shape: "16x32" },
  };
}

function ringBubblesAtAge(age: number, input: WaterPulseLiveInputs): WaterPulseSprite[] {
  const result: WaterPulseSprite[] = [];
  for (let eventIndex = 0; eventIndex < RING_EMISSIONS.length; eventIndex++) {
    const event = RING_EMISSIONS[eventIndex]!;
    if (age < event.age) continue;
    const ring = ringAtAge(event.age, input, event.ring);
    if (!ring) continue;
    const random = randomsForEmission(input.animationRngSeed, event.age);
    const diffX = input.targetRingCenter.x - input.attackerRingOrigin.x;
    const diffY = input.targetRingCenter.y - input.attackerRingOrigin.y;
    const elapsed = event.age - RING_SPAWNS[event.ring]!;
    const something = Math.trunc(elapsed / 2);
    const randomY = diffY + random.y - 5;
    const randomX = -diffX + random.x - 5;
    for (let member = 0; member < 2; member++) {
      const tupleIndex = eventIndex * 2 + member;
      const slot = input.ringBubbleSlots[tupleIndex]!;
      const firstCallback = event.age + (slot > input.ringSlots[event.ring]! ? 0 : 1);
      const calls = age < firstCallback ? 0 : age - firstCallback + 1;
      if (calls >= 20) continue;
      const signedX = member === 0 ? Math.abs(randomX) : -Math.abs(randomX);
      // The source affine list reaches its final -10 frame at 106 and then
      // ends; later movement callbacks retain that matrix rather than scaling
      // past it.
      const scale = calls <= 1 ? 256 : Math.max(106, 256 - (calls - 1) * 10);
      result.push({
        kind: "ring-bubble",
        slot,
        callback: "AnimWaterPulseRingBubble",
        x: ring.x + ring.x2,
        y: ring.y + ring.y2 + (member === 0 ? something : -something),
        x2: (randomY * calls) >> 7,
        y2: (signedX * calls) >> 7,
        frame: 0,
        data: [20 - calls, randomY, signedX, randomY * calls, signedX * calls, 0, 0, 0],
        subpriority: input.attackerSubpriority - 1,
        matrixNum: input.ringBubbleMatrixSlots[tupleIndex]!,
        matrix: affineMatrix(scale),
        oam: { priority: 3, affine: true, doubleSize: false, shape: "8x8" },
      });
    }
  }
  return result;
}

function updateMonBgTask(age: number, input: WaterPulseLiveInputs): WaterPulseTask | null {
  if (!range(age, 7, 157)) return null;
  const data = Array<number>(16).fill(0);
  data[0] = input.monBg.layerId;
  data[1] = input.monBg.snapshot.x;
  data[2] = input.monBg.snapshot.y;
  data[3] = input.monBg.baseScroll.x;
  data[4] = input.monBg.baseScroll.y;
  data[5] = input.monBg.layer === "bg2" ? 1 : 0;
  data[6] = input.monBg.layer === "bg1" ? 1 : 0;
  return { slot: input.updateMonBgTaskSlot, callback: "Task_UpdateMonBg", data };
}

function clearMonBgTask(age: number, input: WaterPulseLiveInputs): WaterPulseTask | null {
  if (!range(age, 155, 157)) return null;
  const data = Array<number>(16).fill(0);
  // `Task_ClearMonBg` runs once in its creation frame.  Its target-side
  // branch is source-owned rather than inherited from another move.
  data[1] = Math.min(2, age - 154);
  data[2] = input.monBg.layer === "bg1" ? 1 : 0;
  return { slot: input.clearMonBgTaskSlot, callback: "Task_ClearMonBg", data };
}

function shakeTask(age: number, input: WaterPulseLiveInputs): WaterPulseTask | null {
  if (!range(age, 101, 134)) return null;
  const data = Array<number>(16).fill(0);
  data[0] = input.targetSpriteSlot;
  data[1] = 17 - Math.floor((age - 101) / 2);
  data[2] = 1;
  data[3] = (age - 101) & 1 ? 0 : 1;
  data[5] = 8;
  return { slot: input.shakeTaskSlot, callback: "AnimTask_ShakeMon_Step", data };
}

function sourceScrollAtAge(age: number, input: WaterPulseLiveInputs): WaterPulsePoint | null {
  if (!range(age, 7, 157)) return null;
  const offset = targetOffsetAtAge(age, input);
  return {
    x: input.monBg.baseScroll.x + input.monBg.snapshot.x - (input.targetCenter.x + offset.x),
    y: input.monBg.baseScroll.y + input.monBg.snapshot.y - (input.targetCenter.y + offset.y),
  };
}

function audioAtAge(age: number, input: WaterPulseLiveInputs): WaterPulseState["audio"] {
  const attackerPan: -64 | 63 = input.attackerSide === "player" ? -64 : 63;
  const targetPan: -64 | 63 = input.targetSide === "player" ? -64 : 63;
  if (age === 10) return { events: [{ channel: "SE1", sound: "SE_M_BUBBLE3", sourcePan: "SOUND_PAN_ATTACKER", pan: attackerPan }] };
  if (age === 22) return { events: [{ channel: "SE1", sound: "SE_M_BUBBLE3", sourcePan: "SOUND_PAN_TARGET", pan: targetPan }] };
  if (age === 72 || age === 79 || age === 86) return { events: [{ channel: "SE1", sound: "SE_M_GIGA_DRAIN", sourcePan: "SOUND_PAN_ATTACKER", pan: attackerPan }] };
  return { events: [] };
}

function ownedOrder(sprites: readonly WaterPulseSprite[], baseline: readonly number[]): number[] {
  const rank = new Map(baseline.map((slot, index) => [slot, index]));
  return [...sprites].sort((left, right) => (left.kind === "simple-palette-blend" ? 1 : 0)
    - (right.kind === "simple-palette-blend" ? 1 : 0)
    || left.subpriority - right.subpriority
    || (right.y + right.y2) - (left.y + left.y2)
    || (rank.get(left.slot) ?? left.slot) - (rank.get(right.slot) ?? right.slot)
    || left.slot - right.slot).map((sprite) => sprite.slot);
}

/**
 * Replays the root script through source age.  It models allocation and
 * transfer state but intentionally stops before compositor/framebuffer work.
 */
export function waterPulseAtAge(age: number, input: WaterPulseLiveInputs): WaterPulseState {
  const source = waterPulseSourceAtAge(age);
  const simple = simplePaletteSpriteAtAge(age, input);
  const rings = RING_SPAWNS.flatMap((_, index) => {
    const ring = ringAtAge(age, input, index);
    return ring ? [ring] : [];
  });
  const sprites = [
    ...(simple ? [simple] : []),
    ...smallBubblesAtAge(age, input),
    ...rings,
    ...ringBubblesAtAge(age, input),
  ].sort((left, right) => left.slot - right.slot);
  const tasks = [updateMonBgTask(age, input), clearMonBgTask(age, input), shakeTask(age, input)]
    .flatMap((task) => task ? [task] : []).sort((left, right) => left.slot - right.slot);
  const sourceScroll = sourceScrollAtAge(age, input);
  const hardwareSourceScroll = range(age, 8, 158) ? sourceScrollAtAge(age - 1, input) : null;
  const matrices = sprites.filter((sprite) => sprite.oam.affine)
    .reduce((bitmap, sprite) => bitmap | (1 << sprite.matrixNum), input.initialMatrixBitmap);
  const before = waterPulseAnimationRngAtAge(input.animationRngSeed, Math.max(0, age - 1));
  const after = waterPulseAnimationRngAtAge(input.animationRngSeed, age);
  const paletteTransfer = age === 0 ? "current-faded" as const
    : age === 7 ? "current-faded-monbg-setup" as const : "preceding-faded" as const;
  return {
    age,
    active: source.active,
    source,
    sprites,
    tasks,
    order: { callerBaseline: [...input.spriteOrder], ownedSlots: ownedOrder(sprites, input.spriteOrder) },
    targetOffset: targetOffsetAtAge(age, input),
    background: {
      vram: age < 8 || age >= 159 ? "battle" : age <= 156 ? "mon-bg" : "clear-pending",
      vramEvent: age === 8 ? "load-mon-bg" : age === 157 ? "clear-mon-bg" : age === 159 ? "restore-battle" : "none",
      targetVisible: age < 7 || age >= 155,
      softwareScroll: sourceScroll,
    },
    registers: {
      layer: input.monBg.layer,
      // `clearmonbg` restores the scroll and VRAM after the prior VBlank; it
      // does not overwrite the selected BG's CNT setup on source age 159.
      hardwareCnt: age < 8 ? input.monBg.inactiveCnt : input.monBg.activeCnt,
      hardwareScroll: hardwareSourceScroll ?? { x: 0, y: 0 },
      transfer: range(age, 8, 158) ? "preceding-mon-bg" : "normal",
    },
    palette: {
      colorBgr555: WATER_PULSE_COLOR_BGR555,
      softwareCoefficient: waterPulsePaletteCoefficientAtAge(age),
      hardwareCoefficient: waterPulsePaletteCoefficientAtAge(age === 7 ? age : Math.max(0, age - 1)),
      transfer: paletteTransfer,
    },
    displayTransfer: {
      oam: age === 0 ? "current" : "preceding-software",
      matrices: age === 0 ? "current" : "preceding-software",
      palettes: paletteTransfer,
    },
    resources: {
      smallBubbles: { ...input.smallBubbles, tag: range(age, 1, 158) ? WATER_PULSE_SMALL_BUBBLES_TAG : null, loaded: range(age, 1, 158) },
      blueRing2: { ...input.blueRing2, tag: range(age, 4, 158) ? WATER_PULSE_BLUE_RING_2_TAG : null, loaded: range(age, 4, 158) },
      allocator: { matrixBitmap: age >= WATER_PULSE_FIRST_INACTIVE_AGE ? input.initialMatrixBitmap : matrices, releasedAtFirstInactive: age >= WATER_PULSE_FIRST_INACTIVE_AGE },
    },
    audio: audioAtAge(age, input),
    rng: { gameplay: "untouched", animationBefore: before, animationAfter: after, advances: rngAdvancesAtAge(age) },
    cleanup: {
      firstInactive: age === WATER_PULSE_FIRST_INACTIVE_AGE,
      visualTasks: sprites.filter((sprite) => sprite.kind !== "ring-bubble").length + (range(age, 101, 134) ? 1 : 0),
      soundTasks: 0,
      ownedSprites: sprites.length,
      resourcesReleased: age >= WATER_PULSE_FIRST_INACTIVE_AGE,
    },
  };
}
