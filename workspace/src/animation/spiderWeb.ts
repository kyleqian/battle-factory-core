/**
 * Source-relative Scene-ON state for MOVE_SPIDER_WEB.
 *
 * This reducer follows `Move_SPIDER_WEB`, `SpiderWebThread`,
 * `AnimTranslateWebThread_*`, and `AnimSpiderWeb_*` from the pinned source.
 * It is intentionally a semantic presentation receipt: it owns neither a
 * framebuffer compositor nor battle/controller/RNG state.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type SpiderWebSide = "player" | "opponent";

export interface SpiderWebPoint {
  readonly x: number;
  readonly y: number;
}

/** Live `Task_UpdateMonBg` setup facts supplied by the presentation caller. */
export interface SpiderWebMonBgInput {
  readonly layer: "bg1" | "bg2";
  readonly spriteSlot: number;
  readonly spriteX: number;
  readonly spriteY: number;
  readonly bgX: number;
  readonly bgY: number;
  readonly inBg2: boolean;
  readonly battlerId: 0 | 1;
}

/**
 * Allocator, geometry, and ordering state already live at Battle Scene ON's
 * presentation boundary.  The source script supplies the fixed constants
 * (512 speed, amplitude 20, 14 copies, three-frame cadence); this shape
 * supplies only the state that actually varies with the live battle scene.
 */
export interface SpiderWebLiveInputs {
  readonly attackerSide: SpiderWebSide;
  readonly targetSide: SpiderWebSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerCenter: SpiderWebPoint;
  readonly targetCenter: SpiderWebPoint;
  /** `InitSpritePosToAnimAttacker(..., TRUE)` after live picture offsets. */
  readonly threadOrigin: SpiderWebPoint;
  readonly threadSpriteSlots: readonly number[];
  readonly paletteSpriteSlot: number;
  readonly webSpriteSlot: number;
  readonly webMatrixSlot: number;
  readonly updateMonBgTaskSlot: number;
  readonly clearMonBgTaskSlot: number;
  readonly loopSoundTaskSlot: number;
  /** Current global `sSpriteOrder`, never a canonical trace-specific order. */
  readonly spriteOrder: readonly number[];
  readonly paletteSubpriority: number;
  readonly threadSubpriority: number;
  readonly webSubpriority: number;
  readonly baseMatrixBitmap: number;
  readonly monbg: SpiderWebMonBgInput;
}

export interface SpiderWebTask {
  readonly slot: number;
  readonly callback:
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg"
    | "Task_LoopAndPlaySE";
  readonly data: readonly number[];
}

export interface SpiderWebThread {
  readonly kind: "thread";
  readonly slot: number;
  readonly template: "gWebThreadSpriteTemplate";
  readonly callback: "AnimTranslateWebThread_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly visible: true;
  readonly matrix: readonly [256, 0, 0, 256];
  /** The source sprite data after this row's callback. */
  readonly data: readonly [number, number, number, number, number, 20, number, 0];
}

export interface SpiderWebOverlay {
  readonly kind: "web";
  readonly slot: number;
  readonly matrixSlot: number;
  readonly template: "gSpiderWebSpriteTemplate";
  readonly callback: "AnimSpiderWeb_Step" | "AnimSpiderWeb_End";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly subpriority: number;
  readonly visible: boolean;
  readonly matrix: readonly [number, 0, 0, number];
  readonly data: readonly [number, number, number, 0, 0, 0, 0, 0];
}

export interface SpiderWebPaletteBlend {
  readonly kind: "paletteBlend";
  readonly slot: number;
  readonly template: "gSimplePaletteBlendSpriteTemplate";
  readonly callback: "AnimSimplePaletteBlend_Step";
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  readonly visible: false;
  readonly selector: "F_PAL_BG";
  readonly delay: 2;
  readonly initialBlendY: 0 | 9;
  readonly targetBlendY: 0 | 9;
  readonly color: "RGB_BLACK";
}

export interface SpiderWebFrame {
  readonly age: number;
  readonly active: boolean;
  readonly firstInactiveCleanup: boolean;
  readonly source: Readonly<{
    owner: "Move_SPIDER_WEB";
    offset: 0 | 3 | 6 | 8 | 10 | 27 | 106 | 118 | 123 | 140 | 160;
    pointer: number;
    pointerParity: 0 | 1;
    wait: number;
  }>;
  readonly battlers: Readonly<{
    attacker: Readonly<{ side: SpiderWebSide; species: string; center: SpiderWebPoint }>;
    target: Readonly<{ side: SpiderWebSide; species: string; center: SpiderWebPoint }>;
  }>;
  readonly threads: readonly SpiderWebThread[];
  readonly web: SpiderWebOverlay | null;
  readonly paletteBlend: SpiderWebPaletteBlend | null;
  readonly tasks: readonly SpiderWebTask[];
  readonly resources: Readonly<{
    spiderWebLoaded: boolean;
    webThreadLoaded: boolean;
    spiderWebTag: 10181 | null;
    webThreadTag: 10180 | null;
    matrixBitmap: number;
  }>;
  readonly monbg: Readonly<{
    sourceActive: boolean;
    displayActive: boolean;
    clearActive: boolean;
    layer: "bg1" | "bg2";
    registers: Readonly<{
      bg1hofs: number;
      bg1vofs: number;
      bg2hofs: number;
      bg2vofs: number;
    }>;
  }>;
  readonly registers: Readonly<{ bldcnt: number; bldalpha: number }>;
  readonly audio: Readonly<{
    loop: Readonly<{ active: boolean; event: "SE_M_STRING_SHOT"; pan: number }>;
    impact: Readonly<{ onset: boolean; event: "SE_M_STRING_SHOT2"; pan: number }>;
  }>;
  readonly painterSlots: readonly number[];
  /** Measured move-local RAM-to-display transfer contract, not a renderer. */
  readonly displayTransfer: Readonly<{
    oam: "current" | "predecessor";
    matrices: "current" | "predecessor";
    palette: "current" | "predecessor" | "same-row-monbg-setup";
  }>;
}

export const SPIDER_WEB_SOURCE_START = 0x082d38e0;
export const SPIDER_WEB_SOURCE_END_EXCLUSIVE = 0x082d3981;
export const SPIDER_WEB_FRAME_COUNT = 207;
export const SPIDER_WEB_THREAD_COUNT = 14;

function assertInputs(input: Readonly<SpiderWebLiveInputs>): void {
  const spriteSlots = [input.paletteSpriteSlot, input.webSpriteSlot,
    ...input.threadSpriteSlots];
  const taskSlots = [input.updateMonBgTaskSlot, input.clearMonBgTaskSlot,
    input.loopSoundTaskSlot];
  const points = [input.attackerCenter, input.targetCenter, input.threadOrigin];
  if (input.attackerSide === input.targetSide || !input.attackerSpecies
    || !input.targetSpecies || input.threadSpriteSlots.length !== SPIDER_WEB_THREAD_COUNT
    || new Set(input.threadSpriteSlots).size !== SPIDER_WEB_THREAD_COUNT
    || spriteSlots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || taskSlots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 16)
    || !Number.isInteger(input.webMatrixSlot) || input.webMatrixSlot < 0 || input.webMatrixSlot >= 32
    || input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64
    || points.some((point) => !Number.isInteger(point.x) || !Number.isInteger(point.y))
    || !Number.isInteger(input.paletteSubpriority) || !Number.isInteger(input.threadSubpriority)
    || !Number.isInteger(input.webSubpriority) || !Number.isInteger(input.baseMatrixBitmap)
    || input.monbg.layer !== (input.targetSide === "player" ? "bg2" : "bg1")) {
    throw new Error("invalid live Spider Web inputs");
  }
}

function sourceAtAge(age: number): SpiderWebFrame["source"] {
  let offset: SpiderWebFrame["source"]["offset"] = 140;
  let wait = 1;
  if (age === 0) { offset = 0; wait = 0; }
  else if (age <= 3) { offset = 3; wait = age === 1 ? 1 : 0; }
  else if (age <= 6) { offset = 6; wait = age === 4 ? 1 : 0; }
  else if (age <= 9) { offset = 8; wait = age === 7 ? 1 : 0; }
  else if (age <= 11) { offset = 10; wait = age === 10 ? -1 : 0; }
  else if (age <= 38) { offset = 27; wait = 1; }
  else if (age <= 80) { offset = 160; wait = (age - 39) % 3 === 0 ? 1 : 0; }
  else if (age <= 120) { offset = 106; wait = 1; }
  else if (age <= 173) { offset = 118; wait = 1; }
  else if (age <= 178) { offset = 123; wait = age === 174 ? 1 : 0; }
  const pointer = SPIDER_WEB_SOURCE_START + offset;
  return { owner: "Move_SPIDER_WEB", offset, pointer,
    pointerParity: (pointer & 1) as 0 | 1, wait };
}

function signedStep(delta: number, duration: number): number {
  const step = Math.trunc((Math.abs(delta) << 8) / duration);
  return delta < 0 ? step | 1 : step & ~1;
}

function signedOffset(step: number, accumulated: number): number {
  const distance = accumulated >> 8;
  return step & 1 ? -distance : distance;
}

function threadAtAge(
  age: number,
  index: number,
  input: Readonly<SpiderWebLiveInputs>,
): SpiderWebThread | null {
  const startAge = 39 + index * 3;
  const localAge = age - startAge;
  if (localAge < 0) return null;
  const dx = input.targetCenter.x - input.threadOrigin.x;
  const dy = input.targetCenter.y - input.threadOrigin.y;
  // `create_web_thread_sprite(..., unk2=512, amplitude=20, ...)`.
  const duration = Math.trunc((Math.abs(dx) << 8) / 512);
  if (duration <= 0 || localAge > duration - 1) return null;
  const xStep = signedStep(dx, duration);
  const yStep = signedStep(dy, duration);
  const n = localAge + 1;
  const xAccumulated = n * xStep;
  const yAccumulated = n * yStep;
  const phaseBeforeStep = (localAge * 13) & 0xff;
  return {
    kind: "thread", slot: input.threadSpriteSlots[index]!,
    template: "gWebThreadSpriteTemplate", callback: "AnimTranslateWebThread_Step",
    x: input.threadOrigin.x, y: input.threadOrigin.y,
    x2: signedOffset(xStep, xAccumulated)
      + ((GBA_SINE_TABLE_256[phaseBeforeStep]! * 20) >> 8),
    y2: signedOffset(yStep, yAccumulated), subpriority: input.threadSubpriority,
    visible: true, matrix: [256, 0, 0, 256],
    data: [duration - n, xStep, yStep, xAccumulated, yAccumulated, 20,
      (n * 13) & 0xff, 0],
  };
}

function webAtAge(age: number, input: Readonly<SpiderWebLiveInputs>): SpiderWebOverlay | null {
  if (age < 121 || age > 172) return null;
  // `FRAME(0x10, 0x10, 0, 0)` establishes 16, then the loop's first
  // `FRAME(0x6, 0x6, 0, 1)` applies in the creation row: 22 + 6*n.
  const scale = 22 + (age - 121) * 6;
  const coefficient = 16 - Math.floor((age - 140) / 2);
  const clampedCoefficient = Math.max(0, Math.min(16, coefficient));
  const data1 = Math.max(0, age - 140);
  return {
    kind: "web", slot: input.webSpriteSlot, matrixSlot: input.webMatrixSlot,
    template: "gSpiderWebSpriteTemplate",
    callback: age === 172 ? "AnimSpiderWeb_End" : "AnimSpiderWeb_Step",
    x: input.targetCenter.x, y: input.targetCenter.y, x2: 0, y2: 0,
    subpriority: input.webSubpriority, visible: age < 172,
    matrix: [Math.trunc(0x10000 / scale), 0, 0, Math.trunc(0x10000 / scale)],
    data: [clampedCoefficient, data1, Math.min(20, age - 120), 0, 0, 0, 0, 0],
  };
}

function paletteBlendAtAge(
  age: number,
  input: Readonly<SpiderWebLiveInputs>,
): SpiderWebPaletteBlend | null {
  if (age < 12 || age > 37 && age < 179 || age > 204) return null;
  const fadingIn = age <= 37;
  return {
    kind: "paletteBlend", slot: input.paletteSpriteSlot,
    template: "gSimplePaletteBlendSpriteTemplate",
    callback: "AnimSimplePaletteBlend_Step", x: input.targetCenter.x,
    y: input.targetCenter.y, subpriority: input.paletteSubpriority,
    visible: false, selector: "F_PAL_BG", delay: 2,
    initialBlendY: fadingIn ? 0 : 9, targetBlendY: fadingIn ? 9 : 0,
    color: "RGB_BLACK",
  };
}

function monbgRegisters(
  age: number,
  input: Readonly<SpiderWebLiveInputs>,
): SpiderWebFrame["monbg"]["registers"] {
  const visible = age >= 8 && age <= 177;
  const x = visible ? input.monbg.bgX & 0x1ff : 0;
  const y = visible ? input.monbg.bgY & 0x1ff : 0;
  return {
    bg1hofs: input.monbg.layer === "bg1" ? x : 0,
    bg1vofs: input.monbg.layer === "bg1" ? y : 0,
    bg2hofs: input.monbg.layer === "bg2" ? x : 0,
    bg2vofs: input.monbg.layer === "bg2" ? y : 0,
  };
}

export function spiderWebAtAge(
  age: number,
  input: Readonly<SpiderWebLiveInputs>,
): SpiderWebFrame {
  if (!Number.isInteger(age)) throw new Error("Spider Web age must be an integer");
  assertInputs(input);
  if (age < 0) {
    const initial = spiderWebAtAge(0, input);
    return { ...initial, age, active: false, firstInactiveCleanup: false };
  }
  const source = sourceAtAge(age);
  const active = age < 206;
  const threads = Array.from({ length: SPIDER_WEB_THREAD_COUNT }, (_, index) =>
    threadAtAge(age, index, input)).filter((thread): thread is SpiderWebThread => thread !== null);
  const web = webAtAge(age, input);
  const paletteBlend = paletteBlendAtAge(age, input);
  const sourceMonbgActive = age >= 7 && age <= 176;
  const clearActive = age >= 174 && age <= 176;
  const tasks: SpiderWebTask[] = [];
  if (age >= 39 && age <= 87) {
    const localAge = age - 39;
    tasks.push({ slot: input.loopSoundTaskSlot, callback: "Task_LoopAndPlaySE", data: [
      129, input.attackerSide === "player" ? -64 : 63, 9,
      5 - Math.floor((localAge + 1) / 10), 0, 0, 0, 0, (localAge + 1) % 10,
      0, 0, 0, 0, 0, 0, 0,
    ] });
  }
  if (clearActive) tasks.push({ slot: input.clearMonBgTaskSlot, callback: "Task_ClearMonBg", data: [
    0, age === 174 ? 1 : 2, input.monbg.battlerId, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
  ] });
  if (sourceMonbgActive) tasks.push({ slot: input.updateMonBgTaskSlot, callback: "Task_UpdateMonBg", data: [
    input.monbg.spriteSlot, input.monbg.spriteX, input.monbg.spriteY,
    input.monbg.bgX, input.monbg.bgY, Number(input.monbg.inBg2),
    input.monbg.battlerId, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ] });
  const activeSlots = new Set<number>([
    ...threads.map((thread) => thread.slot),
    ...(web ? [web.slot] : []),
    ...(paletteBlend ? [paletteBlend.slot] : []),
  ]);
  const coefficient = web?.data[0] ?? 0;
  return {
    age, active, firstInactiveCleanup: age === 206, source,
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies,
        center: input.attackerCenter },
      target: { side: input.targetSide, species: input.targetSpecies,
        center: input.targetCenter },
    },
    threads, web, paletteBlend, tasks,
    resources: {
      spiderWebLoaded: age >= 1 && age < 206,
      webThreadLoaded: age >= 4 && age < 206,
      spiderWebTag: age >= 1 && age < 206 ? 10181 : null,
      webThreadTag: age >= 4 && age < 206 ? 10180 : null,
      matrixBitmap: web
        ? input.baseMatrixBitmap | (1 << input.webMatrixSlot)
        : input.baseMatrixBitmap,
    },
    monbg: {
      sourceActive: sourceMonbgActive, displayActive: age >= 8 && age <= 177,
      clearActive, layer: input.monbg.layer, registers: monbgRegisters(age, input),
    },
    registers: web
      ? { bldcnt: 16192, bldalpha: coefficient | ((16 - coefficient) << 8) }
      : { bldcnt: 0, bldalpha: 0 },
    audio: {
      loop: { active: age >= 39 && age <= 87, event: "SE_M_STRING_SHOT",
        pan: input.attackerSide === "player" ? -64 : 63 },
      impact: { onset: age === 121, event: "SE_M_STRING_SHOT2",
        pan: input.targetSide === "player" ? -63 : 63 },
    },
    painterSlots: input.spriteOrder.filter((slot) => activeSlots.has(slot)),
    displayTransfer: {
      oam: age === 0 ? "current" : "predecessor",
      matrices: age === 0 ? "current" : "predecessor",
      palette: age === 0 ? "current" : age === 7 ? "same-row-monbg-setup" : "predecessor",
    },
  };
}
