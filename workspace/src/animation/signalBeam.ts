/**
 * Source-relative presentation reducer for MOVE_SIGNAL_BEAM.
 *
 * This is deliberately a semantic model of Move_SIGNAL_BEAM and
 * SignalBeamOrbs only.  It receives current Scene-ON allocation, geometry,
 * palette, painter, and presentation-RNG facts; it never receives a trace,
 * framebuffer, controller tick, or gameplay-owned state.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type SignalBeamSide = "player" | "opponent";
export interface SignalBeamPoint { readonly x: number; readonly y: number; }
export type SignalBeamMatrix = readonly [number, number, number, number];

export interface SignalBeamBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: SignalBeamMatrix;
}

/** Persistent scheduler key supplied from live OAM state, never a trace row. */
export interface SignalBeamPainterSprite {
  readonly slot: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly oamY: number;
}

export interface SignalBeamResourceAllocation {
  readonly paletteBank: number;
  readonly tileSlot: number;
  readonly tileRange: readonly [number, number];
}

export interface SignalBeamOrbPairAllocation {
  readonly redSlot: number;
  readonly greenSlot: number;
}

export interface SignalBeamLiveInputs {
  readonly attackerSide: SignalBeamSide;
  readonly targetSide: SignalBeamSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** Source BATTLER_COORD_X_2/Y_PIC_OFFSET origins from current geometry. */
  readonly attackerPictureOrigin: Readonly<SignalBeamPoint>;
  readonly targetPictureOrigin: Readonly<SignalBeamPoint>;
  readonly attackerSprite: Readonly<SignalBeamBattlerSprite>;
  readonly targetSprite: Readonly<SignalBeamBattlerSprite>;
  /** The 23 source allocations in SignalBeamOrbs invocation order. */
  readonly orbPairs: readonly SignalBeamOrbPairAllocation[];
  readonly taskSlots: Readonly<{
    readonly attackerShake: number;
    readonly pan: number;
    readonly sinTimer: number;
    readonly targetShake: number;
  }>;
  readonly paletteBlendSpriteSlot: number;
  readonly resources: Readonly<{
    readonly duck: SignalBeamResourceAllocation;
    readonly redOrb: SignalBeamResourceAllocation;
    readonly greenOrb: SignalBeamResourceAllocation;
  }>;
  /** This root does not allocate affine matrices; retain the live allocator. */
  readonly matrixBitmap: number;
  readonly matrixSlots: readonly SignalBeamMatrix[];
  readonly spriteOrder: readonly number[];
  readonly painterSprites: readonly SignalBeamPainterSprite[];
  /** The selected target OBJ palette's unfaded 15-bit colors. */
  readonly targetPalette: Readonly<{ readonly bank: number; readonly unfaded: readonly number[] }>;
  /** Ordinary entry setup resets WIN0 once; all other registers are inert. */
  readonly registers: Readonly<{ readonly win0h: number; readonly win0v: number }>;
  readonly animationRngSeed: number;
  /** Opaque gameplay state is intentionally carried, never modified. */
  readonly gameplayRng: unknown;
}

export const SIGNAL_BEAM_SOURCE_START = 0x082d0eb2;
export const SIGNAL_BEAM_SOURCE_END_EXCLUSIVE = 0x082d0f9a;
export const SIGNAL_BEAM_DUCK_TAG = 10073;
export const SIGNAL_BEAM_RED_ORB_TAG = 10264;
export const SIGNAL_BEAM_GREEN_ORB_TAG = 10265;
export const SIGNAL_BEAM_ORB_PAIRS = 23;
export const SIGNAL_BEAM_ORB_DURATION = 30;
export const SIGNAL_BEAM_ORB_RETAINED_ROWS = 29;

export interface SignalBeamSourceCursor {
  readonly owner: "Move_SIGNAL_BEAM";
  readonly pointer: number;
  readonly pointerOffset: 0 | 3 | 6 | 9 | 28 | 197 | 198 | 231;
  readonly active: boolean;
  readonly wait: number;
}

export interface SignalBeamOrbSprite {
  readonly kind: "red-orb" | "green-orb";
  readonly pairIndex: number;
  readonly slot: number;
  readonly template: "gSignalBeamRedOrbSpriteTemplate" | "gSignalBeamGreenOrbSpriteTemplate";
  readonly callback: "AnimToTargetInSinWave_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: 2;
  readonly matrixNum: 0;
  readonly matrix: SignalBeamMatrix;
  readonly flags: 1;
  readonly data: readonly [number, number, number, number, number, number, number, number];
  readonly sourceCreationOrder: number;
}

export interface SignalBeamPaletteBlendSprite {
  readonly kind: "complex-palette-blend";
  readonly slot: number;
  readonly template: "gComplexPaletteBlendSpriteTemplate";
  readonly callback: "AnimComplexPaletteBlend_Step1" | "AnimComplexPaletteBlend_Step2";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly subpriority: number;
  readonly oamPriority: 3;
  readonly matrixNum: 0;
  readonly matrix: SignalBeamMatrix;
  readonly flags: 5;
  readonly data: readonly [number, number, number, number, number, number, number, number];
  readonly sourceCreationOrder: 12;
}

export type SignalBeamSprite = SignalBeamOrbSprite | SignalBeamPaletteBlendSprite;

export interface SignalBeamTask {
  readonly slot: number;
  readonly callback: "AnimTask_ShakeMon_Step" | "AnimTask_RunSinAnimTimer" | "Task_PanFromInitialToTarget";
  readonly role: "attacker-shake" | "target-shake" | "sin-timer" | "pan";
  readonly data: readonly number[];
}

export interface SignalBeamState {
  readonly age: number;
  readonly active: boolean;
  readonly source: SignalBeamSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: SignalBeamSide; readonly species: string; readonly sprite: SignalBeamBattlerSprite; readonly shake: SignalBeamPoint }>;
    readonly target: Readonly<{ readonly side: SignalBeamSide; readonly species: string; readonly sprite: SignalBeamBattlerSprite; readonly shake: SignalBeamPoint }>;
  }>;
  readonly sprites: readonly SignalBeamSprite[];
  readonly tasks: readonly SignalBeamTask[];
  readonly resources: Readonly<{
    readonly duck: Readonly<SignalBeamResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly redOrb: Readonly<SignalBeamResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly greenOrb: Readonly<SignalBeamResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly allocator: Readonly<{ readonly matrixBitmap: number; readonly matrixSlots: readonly SignalBeamMatrix[]; readonly affineAllocated: false }>;
  }>;
  readonly palette: Readonly<{
    readonly targetBank: number;
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly phase: "base" | "red" | "green";
    readonly softwareWrite: "none" | "red" | "green" | "restore";
  }>;
  readonly registers: Readonly<{ readonly win0h: number; readonly win0v: number }>;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software";
    readonly palette: "initial" | "preceding-faded";
  }>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{
    readonly channel: "SE1";
    readonly sound: "SE_M_BUBBLE_BEAM";
    readonly sourcePan: "SOUND_PAN_ATTACKER";
    readonly pan: number;
  }>[];
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayUnchanged: true }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly ownedSprites: number;
    readonly resourcesReleased: boolean;
  }>;
}

const IDENTITY: SignalBeamMatrix = [256, 0, 0, 256];
const ORB_START_AGE = 18;
const TARGET_SHAKE_AGE = 36;
const PALETTE_BLEND_AGE = 36;
const PAN_START_AGE = 18;
const TIMER_START_AGE = 18;
const SHAKE_DURATION = 48;

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Signal Beam source age ${age}`);
}
function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) throw new Error(`invalid Signal Beam ${label}`);
}
function assertInputs(input: Readonly<SignalBeamLiveInputs>): void {
  if (input.attackerSide === input.targetSide) throw new Error("Signal Beam requires opposing live battler sides");
  if (input.orbPairs.length !== SIGNAL_BEAM_ORB_PAIRS) throw new Error("Signal Beam requires all 23 source orb-pair allocations");
  for (const [index, pair] of input.orbPairs.entries()) {
    assertSlot(pair.redSlot, `red orb ${index}`, 64); assertSlot(pair.greenSlot, `green orb ${index}`, 64);
    if (pair.redSlot === pair.greenSlot) throw new Error(`Signal Beam orb pair ${index} aliases its two sprites`);
  }
  for (const [label, slot] of Object.entries(input.taskSlots)) assertSlot(slot, label, 16);
  assertSlot(input.paletteBlendSpriteSlot, "palette blend sprite", 64);
  if (input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64 || input.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error("Signal Beam requires a 64-slot painter order seed");
  }
  if (input.targetPalette.unfaded.length !== 16) throw new Error("Signal Beam requires one complete selected target palette bank");
}

/** Signal Beam completes when its source pan task reaches the live target pan. */
export function signalBeamFirstInactiveAge(input: Readonly<Pick<SignalBeamLiveInputs, "attackerSide" | "targetSide">>): number {
  const initial = input.attackerSide === "player" ? -64 : 63;
  const target = input.targetSide === "player" ? -63 : 63;
  return PAN_START_AGE + Math.abs(target - initial);
}

/** Complete root cursor including the source's first inactive cleanup row. */
export function signalBeamSourceAtAge(age: number, firstInactiveAge: number): SignalBeamSourceCursor {
  assertAge(age);
  let pointerOffset: SignalBeamSourceCursor["pointerOffset"];
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 7) { pointerOffset = 6; wait = age === 4 ? 1 : 0; }
  else if (age < 10) { pointerOffset = 9; wait = age === 7 ? 1 : 0; }
  else if (age < ORB_START_AGE) { pointerOffset = 28; wait = Math.max(0, 16 - age); }
  else if (age < 87) { pointerOffset = 231; wait = (age - ORB_START_AGE) % 3 === 0 ? 1 : 0; }
  else if (age < 118) { pointerOffset = 197; wait = 1; }
  else { pointerOffset = 198; wait = 1; }
  return { owner: "Move_SIGNAL_BEAM", pointer: SIGNAL_BEAM_SOURCE_START + pointerOffset, pointerOffset, active: age < firstInactiveAge, wait };
}

function zeroData(): number[] { return Array.from({ length: 16 }, () => 0); }
function gbaSin(index: number, amplitude: number): number { return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8; }
function linearDelta(from: number, to: number): number {
  const delta = Math.trunc(Math.abs(to - from) * 256 / SIGNAL_BEAM_ORB_DURATION);
  return to < from ? delta | 1 : delta & ~1;
}
function animationRngAtAge(seed: number, age: number): number {
  let result = seed >>> 0;
  for (let draw = 0; draw < age; draw += 1) result = (Math.imul(result, 1103515245) + 24691) >>> 0;
  return result;
}

interface OrbStep { readonly data: readonly [number, number, number, number, number, number, number, number]; readonly x2: number; readonly y2: number; }
function orbStep(input: Readonly<SignalBeamLiveInputs>, pairIndex: number, kind: "red-orb" | "green-orb", localAge: number): OrbStep {
  const x = input.attackerPictureOrigin.x + (input.attackerSide === "player" ? 10 : -10);
  const y = input.attackerPictureOrigin.y + 10;
  const d1 = linearDelta(x, input.targetPictureOrigin.x);
  const d2 = linearDelta(y, input.targetPictureOrigin.y);
  const birthAge = ORB_START_AGE + pairIndex * 3;
  const wave = ((birthAge - ORB_START_AGE) * 3) & 0xff;
  let d0 = SIGNAL_BEAM_ORB_DURATION, d3 = 0, d4 = 0, d5 = Math.trunc(0xd200 / SIGNAL_BEAM_ORB_DURATION);
  let d6 = wave > 127 ? (wave - 127) * 256 : wave * 256;
  let d7 = kind === "red-orb" ? 16 : -16;
  if (wave > 127) d7 = -d7;
  let x2 = 0, y2 = 0;
  // The initializer calls its callback once, then its new sprite runs once in
  // the same source row; all following rows run it once.
  for (let step = 0; step < localAge + 2; step += 1) {
    if (d0 !== 0) {
      d3 = (d3 + d1) & 0xffff; d4 = (d4 + d2) & 0xffff;
      x2 = d1 & 1 ? -(d3 >> 8) : d3 >> 8;
      y2 = d2 & 1 ? -(d4 >> 8) : d4 >> 8;
      d0 -= 1;
    }
    y2 += gbaSin(d6 >> 8, d7);
    if (((d6 + d5) >> 8) > 127) { d6 = 0; d7 = -d7; }
    else d6 += d5;
  }
  return { data: [d0, d1, d2, d3, d4, d5, d6, d7], x2, y2 };
}

function orbSpritesAtAge(age: number, input: Readonly<SignalBeamLiveInputs>): SignalBeamOrbSprite[] {
  const sprites: SignalBeamOrbSprite[] = [];
  for (let pairIndex = 0; pairIndex < SIGNAL_BEAM_ORB_PAIRS; pairIndex += 1) {
    const birth = ORB_START_AGE + pairIndex * 3, local = age - birth;
    if (local < 0 || local >= SIGNAL_BEAM_ORB_RETAINED_ROWS) continue;
    const pair = input.orbPairs[pairIndex]!;
    for (const kind of ["red-orb", "green-orb"] as const) {
      const stepped = orbStep(input, pairIndex, kind, local);
      sprites.push({
        kind, pairIndex, slot: kind === "red-orb" ? pair.redSlot : pair.greenSlot,
        template: kind === "red-orb" ? "gSignalBeamRedOrbSpriteTemplate" : "gSignalBeamGreenOrbSpriteTemplate",
        callback: "AnimToTargetInSinWave_Step", x: input.attackerPictureOrigin.x + (input.attackerSide === "player" ? 10 : -10), y: input.attackerPictureOrigin.y + 10,
        x2: stepped.x2, y2: stepped.y2, subpriority: input.targetSprite.subpriority - 3,
        oamPriority: 2, matrixNum: 0, matrix: IDENTITY, flags: 1, data: stepped.data,
        // Six SignalBeamOrbs calls precede complex_palette_blend; its dummy
        // helper occupies source creation order 12 before the final 17 pairs.
        sourceCreationOrder: (pairIndex < 6 ? pairIndex * 2 : pairIndex * 2 + 1) + (kind === "red-orb" ? 0 : 1),
      });
    }
  }
  return sprites;
}

function paletteEventAtAge(age: number): { readonly phase: "base" | "red" | "green"; readonly write: SignalBeamState["palette"]["softwareWrite"]; readonly coefficient: number; readonly color: number } {
  if (age < PALETTE_BLEND_AGE) return { phase: "base", write: "none", coefficient: 0, color: 0 };
  const events: readonly (readonly [number, "red" | "green" | "base", number, number])[] = [
    [36, "red", 8, 31], [44, "green", 8, 961], [53, "red", 8, 31], [62, "green", 8, 961],
    [71, "red", 8, 31], [80, "green", 8, 961], [90, "base", 0, 0],
  ];
  let current = events[0]!;
  for (const event of events) if (event[0] <= age) current = event; else break;
  return { phase: current[1] === "base" ? "base" : current[1], write: current[0] === age ? current[1] === "base" ? "restore" : current[1] : "none", coefficient: current[2], color: current[3] };
}
function blendColor(color: number, target: number, coefficient: number): number {
  const r = color & 31, g = (color >> 5) & 31, b = (color >> 10) & 31;
  const tr = target & 31, tg = (target >> 5) & 31, tb = (target >> 10) & 31;
  return (r + (((tr - r) * coefficient) >> 4)) | ((g + (((tg - g) * coefficient) >> 4)) << 5) | ((b + (((tb - b) * coefficient) >> 4)) << 10);
}
function paletteAtAge(age: number, input: Readonly<SignalBeamLiveInputs>): SignalBeamState["palette"] {
  const event = paletteEventAtAge(age);
  return {
    targetBank: input.targetPalette.bank, unfaded: input.targetPalette.unfaded,
    faded: event.phase === "base" ? input.targetPalette.unfaded : input.targetPalette.unfaded.map((color) => blendColor(color, event.color, event.coefficient)),
    phase: event.phase, softwareWrite: event.write,
  };
}
function paletteBlendSpriteAtAge(age: number, input: Readonly<SignalBeamLiveInputs>): SignalBeamPaletteBlendSprite | null {
  if (age < PALETTE_BLEND_AGE || age >= 90) return null;
  let d0 = 8, d1 = 8, d2 = 5;
  let callback: SignalBeamPaletteBlendSprite["callback"] = "AnimComplexPaletteBlend_Step1";
  for (let step = 0; step < age - PALETTE_BLEND_AGE + 1; step += 1) {
    if (callback === "AnimComplexPaletteBlend_Step2") break;
    if (d0 > 0) { d0 -= 1; continue; }
    if (d2 === 0) { callback = "AnimComplexPaletteBlend_Step2"; continue; }
    d1 ^= 0x100; d0 = d1 & 0xff; d2 -= 1;
  }
  return {
    kind: "complex-palette-blend", slot: input.paletteBlendSpriteSlot, template: "gComplexPaletteBlendSpriteTemplate", callback,
    x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, x2: 0, y2: 0, subpriority: input.attackerSprite.subpriority - 2,
    oamPriority: 3, matrixNum: 0, matrix: IDENTITY, flags: 5, data: [d0, d1, d2, 31, 8, 961, 8, 4], sourceCreationOrder: 12,
  };
}

interface ShakeResult { readonly data: readonly number[]; readonly offset: SignalBeamPoint; }
function shakeAtAge(age: number, start: number, sprite: Readonly<SignalBeamBattlerSprite>, x: number, y: number): ShakeResult | null {
  const local = age - start;
  if (local < 0 || local >= SHAKE_DURATION) return null;
  const data = zeroData(); data[0] = sprite.slot; data[1] = 25; data[2] = 1; data[3] = 1; data[4] = x; data[5] = y;
  let x2 = x, y2 = y;
  for (let step = 0; step < local + 2; step += 1) {
    if (data[3] === 0) {
      x2 = x2 === 0 ? data[4]! : 0; y2 = y2 === 0 ? data[5]! : 0;
      data[3] = data[2]!; data[1] -= 1;
    } else data[3] -= 1;
  }
  return { data, offset: { x: x2, y: y2 } };
}
function panAtAge(age: number, input: Readonly<SignalBeamLiveInputs>): SignalBeamTask | null {
  const initial = input.attackerSide === "player" ? -64 : 63, target = input.targetSide === "player" ? -63 : 63;
  const increment = initial < target ? 1 : -1, local = age - PAN_START_AGE;
  // The callback reaches its target one row after the final retained pan;
  // that reaching row destroys the sound task before scanout.
  if (local < 0 || local >= Math.abs(target - initial) - 1) return null;
  const data = zeroData(); data[0] = initial; data[1] = target; data[2] = increment; data[4] = initial + increment * (local + 1);
  return { slot: input.taskSlots.pan, callback: "Task_PanFromInitialToTarget", role: "pan", data };
}
function timerAtAge(age: number, input: Readonly<SignalBeamLiveInputs>): SignalBeamTask | null {
  const local = age - TIMER_START_AGE;
  if (local < 0 || local >= 99) return null;
  const data = zeroData(); data[0] = 99 - local;
  return { slot: input.taskSlots.sinTimer, callback: "AnimTask_RunSinAnimTimer", role: "sin-timer", data };
}
function tasksAtAge(age: number, input: Readonly<SignalBeamLiveInputs>): { readonly tasks: SignalBeamTask[]; readonly attackerShake: SignalBeamPoint; readonly targetShake: SignalBeamPoint } {
  const attacker = shakeAtAge(age, 10, input.attackerSprite, 0, 2), target = shakeAtAge(age, TARGET_SHAKE_AGE, input.targetSprite, 3, 0);
  const pan = panAtAge(age, input), timer = timerAtAge(age, input);
  const tasks: SignalBeamTask[] = [];
  if (attacker) tasks.push({ slot: input.taskSlots.attackerShake, callback: "AnimTask_ShakeMon_Step", role: "attacker-shake", data: attacker.data });
  if (pan) tasks.push(pan);
  if (timer) tasks.push(timer);
  if (target) tasks.push({ slot: input.taskSlots.targetShake, callback: "AnimTask_ShakeMon_Step", role: "target-shake", data: target.data });
  return { tasks, attackerShake: attacker?.offset ?? { x: 0, y: 0 }, targetShake: target?.offset ?? { x: 0, y: 0 } };
}
function animArgsAtAge(age: number): SignalBeamState["animArgs"] {
  if (age < 10) return [0, 0, 0, 0, 0, 0, 0, 0];
  if (age < ORB_START_AGE) return [0, 0, 2, 25, 1, 0, 0, 0];
  const phase = age <= 116 ? ((age - 17) * 3) & 0xff : 44;
  return age < TARGET_SHAKE_AGE ? [10, 10, 0, -16, 1, 0, 0, phase] : [10, 10, 0, -16, 8, 961, 8, phase];
}
function dynamicOrderKey(sprite: SignalBeamSprite): SignalBeamPainterSprite {
  return { slot: sprite.slot, subpriority: sprite.subpriority, oamPriority: sprite.oamPriority, oamY: sprite.y + sprite.y2 };
}
function spritesAtAge(age: number, input: Readonly<SignalBeamLiveInputs>): SignalBeamSprite[] {
  const palette = paletteBlendSpriteAtAge(age, input);
  return [...orbSpritesAtAge(age, input), ...(palette ? [palette] : [])];
}
function painterOrderAtAge(age: number, input: Readonly<SignalBeamLiveInputs>): readonly number[] {
  let order = input.spriteOrder.slice();
  const ownedSlots = new Set<number>([input.paletteBlendSpriteSlot]);
  for (const pair of input.orbPairs) { ownedSlots.add(pair.redSlot); ownedSlots.add(pair.greenSlot); }
  for (let currentAge = 0; currentAge <= age; currentAge += 1) {
    const keys = new Map(input.painterSprites.map((sprite) => [sprite.slot, sprite]));
    for (const slot of ownedSlots) keys.set(slot, { slot, subpriority: 0xff, oamPriority: 3, oamY: 160 });
    for (const sprite of spritesAtAge(currentAge, input)) keys.set(sprite.slot, dynamicOrderKey(sprite));
    const keyFor = (slot: number): SignalBeamPainterSprite => keys.get(slot) ?? { slot, subpriority: 0xff, oamPriority: 3, oamY: 160 };
    for (let index = 1; index < order.length; index += 1) {
      let cursor = index;
      while (cursor > 0) {
        const before = keyFor(order[cursor - 1]!); const current = keyFor(order[cursor]!);
        const beforePriority = (before.oamPriority << 8) | before.subpriority;
        const currentPriority = (current.oamPriority << 8) | current.subpriority;
        const swap = beforePriority > currentPriority || (beforePriority === currentPriority && ((before.oamY & 0xff) < (current.oamY & 0xff)));
        if (!swap) break;
        const saved = order[cursor]!; order[cursor] = order[cursor - 1]!; order[cursor - 1] = saved; cursor -= 1;
      }
    }
  }
  return order;
}

/** Complete MOVE_SIGNAL_BEAM source-root reduction through live cleanup. */
export function signalBeamAtAge(age: number, input: Readonly<SignalBeamLiveInputs>): SignalBeamState {
  assertAge(age); assertInputs(input);
  const firstInactive = signalBeamFirstInactiveAge(input), source = signalBeamSourceAtAge(age, firstInactive);
  const sprites = spritesAtAge(age, input), taskState = tasksAtAge(age, input), palette = paletteAtAge(age, input);
  const redLoaded = age >= 1 && age < firstInactive, greenLoaded = age >= 4 && age < firstInactive, duckLoaded = age >= 7 && age < firstInactive;
  const pan = taskState.tasks.find((task) => task.role === "pan");
  return {
    age, active: source.active, source, animArgs: animArgsAtAge(age),
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: input.attackerSprite, shake: taskState.attackerShake },
      target: { side: input.targetSide, species: input.targetSpecies, sprite: input.targetSprite, shake: taskState.targetShake },
    },
    sprites, tasks: taskState.tasks,
    resources: {
      duck: { ...input.resources.duck, tag: duckLoaded ? SIGNAL_BEAM_DUCK_TAG : null, loaded: duckLoaded },
      redOrb: { ...input.resources.redOrb, tag: redLoaded ? SIGNAL_BEAM_RED_ORB_TAG : null, loaded: redLoaded },
      greenOrb: { ...input.resources.greenOrb, tag: greenLoaded ? SIGNAL_BEAM_GREEN_ORB_TAG : null, loaded: greenLoaded },
      allocator: { matrixBitmap: input.matrixBitmap, matrixSlots: input.matrixSlots, affineAllocated: false },
    },
    palette,
    registers: { win0h: age === 0 ? input.registers.win0h : 0, win0v: age === 0 ? input.registers.win0v : 0 },
    displayTransfer: { oam: age === 0 ? "initial" : "preceding-software", matrices: age === 0 ? "initial" : "preceding-software", palette: age === 0 ? "initial" : "preceding-faded" },
    painterOrder: painterOrderAtAge(age, input),
    audio: age === PAN_START_AGE && pan ? [{ channel: "SE1", sound: "SE_M_BUBBLE_BEAM", sourcePan: "SOUND_PAN_ATTACKER", pan: pan.data[4]! }] : [],
    rng: { animation: animationRngAtAge(input.animationRngSeed, age), sourceDraws: age, gameplay: input.gameplayRng, gameplayUnchanged: true },
    cleanup: { firstInactive: age === firstInactive, visualTasks: sprites.length + taskState.tasks.filter((task) => task.role !== "pan").length, soundTasks: pan ? 1 : 0, ownedSprites: sprites.length, resourcesReleased: age >= firstInactive },
  };
}
