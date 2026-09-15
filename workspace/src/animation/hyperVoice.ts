/**
 * Source-relative Scene-ON reduction for MOVE_HYPER_VOICE.
 *
 * The move script owns two calls to HyperVoiceEffect.  This module models
 * that cursor and those callbacks from live presentation inputs only.  It
 * intentionally has no retained recording, rendered-image, or
 * gameplay-resolution dependency.
 */

export type HyperVoiceSide = "player" | "opponent";
export interface HyperVoicePoint { readonly x: number; readonly y: number; }
export type HyperVoiceMatrix = readonly [number, number, number, number];

export interface HyperVoiceBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: HyperVoiceMatrix;
  /** Current live OAM words, carried through rather than reconstructed. */
  readonly attr: readonly [number, number, number];
}

export interface HyperVoiceResourceAllocation {
  readonly tag: number;
  readonly paletteBank: number;
  readonly tileSlot: number;
  readonly tileRange: readonly [number, number];
}

/** Inputs owned by the live Scene-ON presentation boundary. */
export interface HyperVoiceLiveInputs {
  readonly attackerSide: HyperVoiceSide;
  readonly targetSide: HyperVoiceSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** Numeric species passed to SoundTask_PlayCryWithEcho by the live scene. */
  readonly attackerCrySpecies: number;
  /** `BATTLER_COORD_X_2/Y_PIC_OFFSET`, supplied by the current scene. */
  readonly attackerPictureOrigin: Readonly<HyperVoicePoint>;
  readonly targetPictureOrigin: Readonly<HyperVoicePoint>;
  readonly attackerSprite: Readonly<HyperVoiceBattlerSprite>;
  readonly targetSprite: Readonly<HyperVoiceBattlerSprite>;
  readonly taskSlots: Readonly<{
    readonly cry: number;
    readonly scale: number;
    readonly targetShake: number;
    readonly platform: number;
    readonly waitForCry: number;
    readonly duckBgm: number;
  }>;
  readonly spriteSlots: Readonly<{ readonly paletteBlend: number; readonly ring: number; }>;
  /** Allocator-derived priority of the invisible palette-control sprite. */
  readonly paletteBlendSubpriority: number;
  readonly matrixSlots: Readonly<{ readonly ring: number; readonly attackerScale: number; }>;
  readonly resource: Readonly<HyperVoiceResourceAllocation>;
  /** The scene's persistent, live source SortSprites seed. */
  readonly spriteOrder: readonly number[];
  /** Source-order slots used to place a transient ring/palette sprite. */
  readonly painter: Readonly<{ readonly shadowSlot: number; readonly ringInsertionBefore: number; }>;
  readonly palettes: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
    readonly backgroundBanks: readonly [number, number, number];
    readonly attackerBank: number;
    readonly targetBank: number;
    readonly thinRingBank: number;
    /** Palette uploaded by `loadspritegfx ANIM_TAG_THIN_RING`. */
    readonly thinRingPalette: readonly number[];
  }>;
  readonly matrixBitmap: number;
  /** Presentation RNG evolves here; gameplay RNG is opaque and read-only. */
  readonly animationRngSeed: number;
  readonly gameplayRng: unknown;
}

export const HYPER_VOICE_SOURCE_START = 0x082d50d6;
export const HYPER_VOICE_SOURCE_END_EXCLUSIVE = 0x082d516a;
export const HYPER_VOICE_THIN_RING_TAG = 10203;
export const HYPER_VOICE_FIRST_INACTIVE_AGE = 104;
const EFFECT_STARTS = [4, 59] as const;
const EFFECT_DURATION = 44;
const RING_DURATION = 45;
const IDENTITY: HyperVoiceMatrix = [256, 0, 0, 256];

export interface HyperVoiceSourceCursor {
  readonly owner: "Move_HYPER_VOICE";
  readonly pointer: number;
  readonly pointerOffset: 0 | 3 | 17 | 20 | 34 | 35;
  readonly active: boolean;
  readonly wait: number;
}

export interface HyperVoiceTask {
  readonly slot: number;
  readonly callback:
    | "SoundTask_PlayCryWithEcho_Step"
    | "AnimTask_ScaleMonAndRestore_Step"
    | "AnimTask_ShakeMon2_Step"
    | "AnimTask_ShakeBattlePlatforms_Step"
    | "SoundTask_WaitForCry"
    | "Task_DuckBGMForPokemonCry";
  readonly role: "cry" | "scale" | "target-shake" | "platform" | "wait-for-cry" | "duck-bgm";
  readonly data: readonly number[];
}

export interface HyperVoiceRingSprite {
  readonly kind: "thin-ring";
  readonly slot: number;
  readonly template: "gHyperVoiceRingSpriteTemplate";
  readonly callback: "AnimHyperVoiceRing_WaitEnd";
  readonly affine: "gHyperVoiceRingAffineAnimCmds";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: 2;
  readonly matrixNum: number;
  readonly matrix: HyperVoiceMatrix;
  readonly data: readonly [number, number, number, number, number, 0, 0, 0];
  readonly sourceCreationOrder: 1;
}

export interface HyperVoicePaletteSprite {
  readonly kind: "simple-palette-blend";
  readonly slot: number;
  readonly template: "gSimplePaletteBlendSpriteTemplate";
  readonly callback: "AnimSimplePaletteBlend_Step";
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  readonly selector: "F_PAL_BG | F_PAL_BATTLERS";
  readonly delay: 3;
  readonly initialBlendY: 8;
  readonly targetBlendY: 0;
  readonly color: "RGB_YELLOW";
  readonly sourceCreationOrder: 0;
}

export interface HyperVoiceState {
  readonly age: number;
  readonly active: boolean;
  readonly source: HyperVoiceSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly effect: Readonly<{ readonly call: 1 | 2 | null; readonly localAge: number | null; readonly callsStarted: number; }>;
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: HyperVoiceSide; readonly species: string; readonly sprite: HyperVoiceBattlerSprite; readonly scale: number; }>;
    readonly target: Readonly<{ readonly side: HyperVoiceSide; readonly species: string; readonly sprite: HyperVoiceBattlerSprite; readonly shake: HyperVoicePoint; readonly displayedShake: HyperVoicePoint; }>;
  }>;
  readonly sprites: Readonly<{ readonly ring: HyperVoiceRingSprite | null; readonly paletteBlend: HyperVoicePaletteSprite | null; }>;
  readonly tasks: readonly HyperVoiceTask[];
  readonly partnerShake: Readonly<{ readonly requested: boolean; readonly selector: "ANIM_DEF_PARTNER"; readonly active: false; readonly reason: "singles-no-visible-partner"; }>;
  readonly painterOrder: readonly number[];
  readonly matrices: Readonly<{
    readonly ring: Readonly<{ readonly slot: number; readonly allocated: boolean; readonly matrix: HyperVoiceMatrix | null }>;
    readonly attackerScale: Readonly<{ readonly slot: number; readonly matrix: HyperVoiceMatrix; readonly active: boolean }>;
    readonly bitmap: number;
  }>;
  readonly resources: Readonly<{
    readonly thinRing: Readonly<{ readonly tag: number | null; readonly loaded: boolean; readonly allocation: HyperVoiceResourceAllocation | null }>;
  }>;
  readonly platform: Readonly<{ readonly sourceX: number; readonly sourceY: 0; readonly hardwareX: number; }>;
  readonly palette: Readonly<{
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
    readonly selector: "F_PAL_BG | F_PAL_BATTLERS";
    readonly banks: readonly number[];
    readonly thinRingBank: number;
    readonly fade: Readonly<{ readonly active: boolean; readonly effectCall: 1 | 2 | null; readonly sourceBlendY: number | null; readonly initialBlendY: 8; readonly targetBlendY: 0; readonly color: "RGB_YELLOW" }>;
    readonly scanout: Readonly<{ readonly upperRows: 0 | 16; readonly upperHardware: readonly number[] }>;
  }>;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly ringMatrix: "initial" | "preceding-software";
    readonly attackerScaleMatrix: "initial" | "preceding-software" | "two-source-rows";
    readonly targetShake: "initial" | "two-source-rows";
    readonly platform: "initial" | "preceding-software";
    readonly palette: Readonly<{
      readonly thinRing: "initial" | "preceding-faded";
      readonly battlers: "initial" | "preceding-faded";
      readonly backgrounds: "initial" | "preceding-faded" | "same-row-effect-setup";
    }>;
  }>;
  readonly audio: Readonly<{
    readonly cry: Readonly<{ readonly species: string; readonly pan: number; readonly phase: "queued" | "echo-start" | "waiting" | "echo-end"; readonly state: number; readonly lastCry: boolean; readonly active: boolean }> | null;
    readonly waitForCry: boolean;
    readonly duckBgm: boolean;
    readonly events: readonly Readonly<{ readonly kind: "cry-echo-start" | "cry-echo-end"; readonly species: string; readonly pan: number }>[];
  }>;
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayUnchanged: true }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: 0; readonly ownedSprites: number; readonly resourcesReleased: boolean }>;
}

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Hyper Voice source age ${age}`);
}

function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) throw new Error(`invalid Hyper Voice ${label}`);
}

function assertInputs(input: Readonly<HyperVoiceLiveInputs>): void {
  if (input.attackerSide === input.targetSide) throw new Error("Hyper Voice requires opposing live battler sides");
  for (const [label, slot] of Object.entries(input.taskSlots)) assertSlot(slot, label, 16);
  for (const [label, slot] of Object.entries(input.spriteSlots)) assertSlot(slot, label, 64);
  for (const [label, slot] of Object.entries(input.matrixSlots)) assertSlot(slot, label, 32);
  if (!Number.isInteger(input.attackerCrySpecies) || input.attackerCrySpecies < 0) throw new Error("invalid Hyper Voice live cry species");
  if (input.palettes.unfaded.length !== 512 || input.palettes.faded.length !== 512
    || input.palettes.hardware.length !== 512 || input.palettes.thinRingPalette.length !== 16) {
    throw new Error("Hyper Voice requires live 32-bank palette memory");
  }
  assertSlot(input.resource.paletteBank, "Thin Ring palette bank", 16);
  assertSlot(input.resource.tileSlot, "Thin Ring tile slot", 32);
  if (input.resource.tag !== HYPER_VOICE_THIN_RING_TAG) throw new Error("Hyper Voice requires the live ANIM_TAG_THIN_RING allocation");
  if (input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64 || input.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error("Hyper Voice requires a live 64-slot painter order seed");
  }
  if (!input.spriteOrder.includes(input.painter.shadowSlot) || !input.spriteOrder.includes(input.painter.ringInsertionBefore)) throw new Error("Hyper Voice painter seed omits source slots");
}

function data(...values: number[]): readonly number[] {
  return [...values, ...Array.from({ length: Math.max(0, 16 - values.length) }, () => 0)].slice(0, 16);
}

function u32(value: number): number { return value >>> 0; }
function s16(value: number): number { return (value & 0x8000) !== 0 ? (value & 0xffff) - 0x10000 : value & 0xffff; }
function nextAnimationRng(value: number): number { return u32(Math.imul(value, 0x41c64e6d) + 0x6073); }
function animationRngAtAge(seed: number, age: number): number {
  let value = u32(seed);
  for (let index = 0; index < age; index += 1) value = nextAnimationRng(value);
  return value;
}
function effectFor(age: number): { readonly start: number; readonly call: 1 | 2; readonly local: number } | null {
  for (const [index, start] of EFFECT_STARTS.entries()) if (age >= start && age < start + EFFECT_DURATION) return { start, call: (index + 1) as 1 | 2, local: age - start };
  return null;
}
function effectStarted(age: number): number { return EFFECT_STARTS.filter((start) => age >= start).length; }
function taskDataForScale(local: number, slot: number): readonly number[] {
  const shrinking = local < 4;
  const remaining = shrinking ? 4 - local : 9 - local;
  const scale = shrinking ? 251 - 5 * local : 231 + 5 * (local - 4);
  return data(shrinking ? -5 : 5, shrinking ? -5 : 5, remaining, shrinking ? 5 : 0, slot, 0, 0, 0, 0, 0, scale, scale);
}
function scaleForLocal(local: number): number { return local < 4 ? 251 - 5 * local : 231 + 5 * (local - 4); }
function shakeForLocal(local: number): number { return local === 10 ? 0 : (Math.floor(local / 2) % 2 === 0 ? -1 : 1); }
function shakeTaskData(local: number, slot: number): readonly number[] {
  return data(slot, 5 - Math.floor(local / 2), 1, local % 2 === 0 ? 1 : 0, 1);
}
function platformTaskData(local: number): readonly number[] {
  return data(1, 0, 5 - Math.floor(local / 2), local % 2 === 0 ? 1 : 0, 0, 0, 0, 0, 1);
}
function sourceBlendY(local: number): number {
  // AnimSimplePaletteBlend starts at 8, then changes by two on its delay-3
  // cadence. BG palettes receive one extra UpdatePaletteFade on setup; their
  // one-row lead is represented separately by paletteAtAge.
  if (local < 4) return 8;
  if (local < 9) return 6;
  if (local < 14) return 4;
  if (local < 19) return 2;
  return 0;
}

function blendColor(source: number, target: number, coefficient: number): number {
  const blend = (component: number, targetComponent: number): number =>
    ((component * (16 - coefficient)) + targetComponent * coefficient) >> 4;
  const r = blend(source & 0x1f, target & 0x1f);
  const g = blend((source >> 5) & 0x1f, (target >> 5) & 0x1f);
  const b = blend((source >> 10) & 0x1f, (target >> 10) & 0x1f);
  return r | (g << 5) | (b << 10);
}

function effectStartForPalette(age: number): number | null {
  if (age >= EFFECT_STARTS[1] && age < EFFECT_STARTS[1] + 26) return EFFECT_STARTS[1];
  if (age >= EFFECT_STARTS[0] && age < EFFECT_STARTS[0] + 26) return EFFECT_STARTS[0];
  return null;
}

function paletteAtAge(age: number, input: Readonly<HyperVoiceLiveInputs>): readonly number[] {
  const palette = input.palettes.faded.slice();
  if (age >= 1) {
    const resourceStart = input.palettes.thinRingBank * 16;
    for (let color = 0; color < 16; color += 1) {
      palette[resourceStart + color] = input.palettes.thinRingPalette[color]!;
    }
  }
  const start = effectStartForPalette(age);
  if (start === null) return palette;
  const local = age - start;
  const bgCoefficient = sourceBlendY(local);
  const battlerCoefficient = sourceBlendY(Math.max(0, local - 1));
  for (const bank of input.palettes.backgroundBanks) {
    for (let color = 0; color < 16; color += 1) {
      const index = bank * 16 + color;
      palette[index] = blendColor(input.palettes.unfaded[index]!, 0x03ff, bgCoefficient);
    }
  }
  for (const bank of [input.palettes.attackerBank, input.palettes.targetBank]) {
    for (let color = 0; color < 16; color += 1) {
      const index = bank * 16 + color;
      palette[index] = blendColor(input.palettes.unfaded[index]!, 0x03ff, battlerCoefficient);
    }
  }
  return palette;
}

function hardwarePaletteAtAge(age: number, input: Readonly<HyperVoiceLiveInputs>): readonly number[] {
  if (age === 0) return input.palettes.hardware.slice();
  const hardware = paletteAtAge(age - 1, input).slice();
  if (EFFECT_STARTS.includes(age as 4 | 59)) {
    const current = paletteAtAge(age, input);
    for (const bank of input.palettes.backgroundBanks) {
      hardware.splice(bank * 16, 16, ...current.slice(bank * 16, bank * 16 + 16));
    }
  }
  return hardware;
}

function sourceTargetX2AtAge(age: number, input: Readonly<HyperVoiceLiveInputs>): number {
  const effect = effectFor(age);
  if (effect) return effect.local <= 10 ? shakeForLocal(effect.local) : 0;
  return age >= EFFECT_STARTS[0] ? 0 : input.targetSprite.x2;
}

function displayedTargetX2AtAge(age: number, input: Readonly<HyperVoiceLiveInputs>): number {
  const effect = effectFor(age);
  // ShakeMon2's creation callback seeds +1 into the first post-creation OAM
  // build. Its steady callback sequence then follows the measured RAM+2 path.
  if (effect?.local === 1) return 1;
  return sourceTargetX2AtAge(Math.max(0, age - 2), input);
}
function cryPhase(local: number): "queued" | "echo-start" | "waiting" | "echo-end" {
  if (local === 0) return "queued";
  if (local === 1) return "echo-start";
  if (local === 28) return "echo-end";
  return "waiting";
}
function ringMatrix(local: number): HyperVoiceMatrix {
  const sourceScale = 16 + 11 * (local + 1);
  const reciprocal = Math.floor(0x10000 / sourceScale);
  return [reciprocal, 0, 0, reciprocal];
}
function ringFor(age: number, input: Readonly<HyperVoiceLiveInputs>): HyperVoiceRingSprite | null {
  const effect = effectFor(age);
  if (!effect) return null;
  const { local } = effect;
  const sign = input.attackerSide === "player" ? -1 : 1;
  const x = input.attackerPictureOrigin.x + sign * 45;
  const y = input.attackerPictureOrigin.y;
  const dx = input.targetPictureOrigin.x - x;
  const dy = input.targetPictureOrigin.y - y;
  const steps = local + 2;
  const xDelta = (Math.floor(Math.abs(dx) * 256 / RING_DURATION) & ~1) | (dx < 0 ? 1 : 0);
  const yDelta = (Math.floor(Math.abs(dy) * 256 / RING_DURATION) & ~1) | (dy < 0 ? 1 : 0);
  const xAccum = xDelta * steps;
  const yAccum = yDelta * steps;
  const x2 = (xDelta & 1) ? -(xAccum >> 8) : (xAccum >> 8);
  const y2 = (yDelta & 1) ? -(yAccum >> 8) : (yAccum >> 8);
  const subpriority = (input.attackerSide === "player" ? input.attackerSprite : input.targetSprite).subpriority - 1;
  return {
    kind: "thin-ring", slot: input.spriteSlots.ring, template: "gHyperVoiceRingSpriteTemplate", callback: "AnimHyperVoiceRing_WaitEnd",
    affine: "gHyperVoiceRingAffineAnimCmds", x, y, x2, y2, subpriority, oamPriority: 2,
    matrixNum: input.matrixSlots.ring, matrix: ringMatrix(local),
    data: [RING_DURATION - steps, xDelta, yDelta, s16(xAccum), s16(yAccum), 0, 0, 0], sourceCreationOrder: 1,
  };
}
function paletteSpriteFor(age: number, input: Readonly<HyperVoiceLiveInputs>): HyperVoicePaletteSprite | null {
  const effect = effectFor(age);
  if (!effect || effect.local > 25) return null;
  return {
    kind: "simple-palette-blend", slot: input.spriteSlots.paletteBlend, template: "gSimplePaletteBlendSpriteTemplate", callback: "AnimSimplePaletteBlend_Step",
    x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, subpriority: input.paletteBlendSubpriority,
    selector: "F_PAL_BG | F_PAL_BATTLERS", delay: 3, initialBlendY: 8, targetBlendY: 0, color: "RGB_YELLOW", sourceCreationOrder: 0,
  };
}
function sourceAtAge(age: number): HyperVoiceSourceCursor {
  let pointerOffset: HyperVoiceSourceCursor["pointerOffset"];
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 49) { pointerOffset = 17; wait = 1; }
  else if (age < 59) { pointerOffset = 20; wait = Math.max(0, 57 - age); }
  else if (age < HYPER_VOICE_FIRST_INACTIVE_AGE) { pointerOffset = 34; wait = 1; }
  else pointerOffset = 35;
  return { owner: "Move_HYPER_VOICE", pointer: HYPER_VOICE_SOURCE_START + pointerOffset, pointerOffset, active: age < HYPER_VOICE_FIRST_INACTIVE_AGE, wait };
}

export function hyperVoiceSourceAtAge(age: number): HyperVoiceSourceCursor {
  assertAge(age);
  return sourceAtAge(age);
}

function painterOrder(input: Readonly<HyperVoiceLiveInputs>, ring: HyperVoiceRingSprite | null, palette: HyperVoicePaletteSprite | null): readonly number[] {
  let order = [...input.spriteOrder];
  const moveBefore = (slot: number, before: number): void => {
    order = order.filter((value) => value !== slot);
    const index = order.indexOf(before);
    order.splice(index < 0 ? order.length : index, 0, slot);
  };
  if (ring) moveBefore(ring.slot, input.painter.ringInsertionBefore);
  if (palette) moveBefore(palette.slot, input.painter.shadowSlot);
  return order;
}

function displayTransfer(age: number, effect: ReturnType<typeof effectFor>): HyperVoiceState["displayTransfer"] {
  const effectSetup = effect?.local === 0;
  const scaleLag = EFFECT_STARTS.some((start) => age >= start + 2 && age <= start + 11);
  const shakeLag = EFFECT_STARTS.some((start) => age >= start + 2 && age <= start + 12);
  return {
    oam: age === 0 ? "initial" : "preceding-software",
    ringMatrix: age === 0 ? "initial" : "preceding-software",
    attackerScaleMatrix: age === 0 ? "initial" : scaleLag ? "two-source-rows" : "preceding-software",
    targetShake: age === 0 ? "initial" : shakeLag ? "two-source-rows" : "initial",
    platform: age === 0 ? "initial" : "preceding-software",
    palette: {
      thinRing: age < 2 ? "initial" : "preceding-faded",
      battlers: age === 0 ? "initial" : "preceding-faded",
      backgrounds: effectSetup ? "same-row-effect-setup" : age === 0 ? "initial" : "preceding-faded",
    },
  };
}

/** Reduce a source-relative age of the complete Hyper Voice root. */
export function hyperVoiceAtAge(age: number, input: Readonly<HyperVoiceLiveInputs>): HyperVoiceState {
  assertAge(age);
  assertInputs(input);
  const source = sourceAtAge(age);
  const effect = effectFor(age);
  const ring = ringFor(age, input);
  const paletteBlend = paletteSpriteFor(age, input);
  const local = effect?.local ?? -1;
  const effectActive = effect !== null;
  const scaleActive = effectActive && local <= 8;
  const shakeActive = effectActive && local <= 9;
  const platformActive = effectActive && local <= 9;
  const cryActive = effectActive && local <= 28;
  const waitActive = effectActive && local === 0;
  const duckBgm = age >= 88;
  const scale = scaleActive ? scaleForLocal(local) : 256;
  const shakeX = effectActive && local <= 10 ? shakeForLocal(local) : 0;
  const platformX = effectActive && local <= 10 ? shakeForLocal(local) : 0;
  const priorEffect = age > 0 ? effectFor(age - 1) : null;
  const priorPlatformX = priorEffect && priorEffect.local <= 10 ? shakeForLocal(priorEffect.local) : 0;
  const pan = input.attackerSide === "player" ? -64 : 63;
  const cryState = !cryActive ? null : local < 5 ? local + 1 : local === 28 ? 6 : 5;
  const tasks: HyperVoiceTask[] = [];
  if (cryActive) tasks.push({ slot: input.taskSlots.cry, callback: "SoundTask_PlayCryWithEcho_Step", role: "cry", data: data(0, input.attackerCrySpecies, pan, 0, 0, 0, 0, 0, 0, cryState!, effect!.call === 2 ? 1 : 0) });
  if (scaleActive) tasks.push({ slot: input.taskSlots.scale, callback: "AnimTask_ScaleMonAndRestore_Step", role: "scale", data: taskDataForScale(local, input.attackerSprite.slot) });
  if (shakeActive) tasks.push({ slot: input.taskSlots.targetShake, callback: "AnimTask_ShakeMon2_Step", role: "target-shake", data: shakeTaskData(local, input.targetSprite.slot) });
  if (platformActive) tasks.push({ slot: input.taskSlots.platform, callback: "AnimTask_ShakeBattlePlatforms_Step", role: "platform", data: platformTaskData(local) });
  if (waitActive) tasks.push({ slot: input.taskSlots.waitForCry, callback: "SoundTask_WaitForCry", role: "wait-for-cry", data: data(0, 0, 0, 0, 0, 0, 0, 0, 0, 2) });
  if (duckBgm) tasks.push({ slot: input.taskSlots.duckBgm, callback: "Task_DuckBGMForPokemonCry", role: "duck-bgm", data: data() });
  const loaded = age >= 1 && age < HYPER_VOICE_FIRST_INACTIVE_AGE;
  const ownedSprites = Number(ring !== null) + Number(paletteBlend !== null);
  const visualTasks = ownedSprites + Number(cryActive) + Number(scaleActive) + Number(shakeActive) + Number(platformActive) + Number(waitActive);
  const attackerPrepared = age >= EFFECT_STARTS[0];
  const attackerMatrixNum = attackerPrepared ? input.matrixSlots.attackerScale : input.attackerSprite.matrixNum;
  const attackerMatrix = scaleActive ? [scale, 0, 0, scale] as HyperVoiceMatrix : attackerPrepared ? IDENTITY : input.attackerSprite.matrix;
  const targetX2 = effectActive ? shakeX : age >= EFFECT_STARTS[0] ? 0 : input.targetSprite.x2;
  const targetY2 = effectActive || age >= EFFECT_STARTS[0] ? 0 : input.targetSprite.y2;
  const fadedPalette = paletteAtAge(age, input);
  const hardwarePalette = hardwarePaletteAtAge(age, input);
  return {
    age, active: source.active, source,
    animArgs: age < 4 ? [0, 0, 0, 0, 0, 0, 0, 0] : [1, 0, 6, 1, 1, 0, 1, 0],
    effect: { call: effect?.call ?? null, localAge: effect?.local ?? null, callsStarted: effectStarted(age) },
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: { ...input.attackerSprite, matrixNum: attackerMatrixNum, matrix: attackerMatrix }, scale },
      target: { side: input.targetSide, species: input.targetSpecies, sprite: { ...input.targetSprite, x2: targetX2, y2: targetY2 }, shake: { x: effectActive ? shakeX : 0, y: 0 }, displayedShake: { x: displayedTargetX2AtAge(age, input), y: 0 } },
    },
    sprites: { ring, paletteBlend }, tasks,
    partnerShake: { requested: effectActive, selector: "ANIM_DEF_PARTNER", active: false, reason: "singles-no-visible-partner" },
    painterOrder: painterOrder(input, ring, paletteBlend),
    matrices: {
      ring: { slot: input.matrixSlots.ring, allocated: ring !== null, matrix: ring?.matrix ?? null },
      attackerScale: { slot: input.matrixSlots.attackerScale, matrix: attackerMatrix, active: scaleActive },
      bitmap: input.matrixBitmap | (ring ? (1 << input.matrixSlots.ring) : 0),
    },
    resources: { thinRing: { tag: loaded ? input.resource.tag : null, loaded, allocation: loaded ? input.resource : null } },
    platform: { sourceX: platformX, sourceY: 0, hardwareX: priorPlatformX },
    palette: {
      faded: fadedPalette, hardware: hardwarePalette,
      selector: "F_PAL_BG | F_PAL_BATTLERS", banks: [...input.palettes.backgroundBanks, input.palettes.attackerBank, input.palettes.targetBank], thinRingBank: input.palettes.thinRingBank,
      fade: { active: paletteBlend !== null, effectCall: paletteBlend ? effect!.call : null, sourceBlendY: paletteBlend ? sourceBlendY(local) : null, initialBlendY: 8, targetBlendY: 0, color: "RGB_YELLOW" },
      // The second call begins late enough in its source frame for scanlines
      // 0..15 to retain the preceding hardware palette. The lower field and
      // both palette-RAM snapshots already contain the new setup blend.
      scanout: {
        upperRows: effect?.call === 2 && local === 0 ? 16 : 0,
        upperHardware: effect?.call === 2 && local === 0
          ? hardwarePaletteAtAge(age - 1, input) : hardwarePalette,
      },
    },
    displayTransfer: displayTransfer(age, effect),
    audio: {
      cry: cryActive ? { species: input.attackerSpecies, pan, phase: cryPhase(local), state: cryState!, lastCry: effect!.call === 2, active: true } : null,
      waitForCry: waitActive, duckBgm,
      events: !cryActive ? [] : local === 1 ? [{ kind: "cry-echo-start", species: input.attackerSpecies, pan }] : local === 28 ? [{ kind: "cry-echo-end", species: input.attackerSpecies, pan }] : [],
    },
    rng: { animation: animationRngAtAge(input.animationRngSeed, age), sourceDraws: age, gameplay: input.gameplayRng, gameplayUnchanged: true },
    cleanup: { firstInactive: age === HYPER_VOICE_FIRST_INACTIVE_AGE, visualTasks, soundTasks: 0, ownedSprites, resourcesReleased: age >= HYPER_VOICE_FIRST_INACTIVE_AGE },
  };
}
