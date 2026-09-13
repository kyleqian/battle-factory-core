/**
 * Source-relative presentation reducer for MOVE_BONEMERANG.
 *
 * This owns one visual-script root only.  It deliberately receives live
 * battler coordinates, allocation identities, background state, painter seed,
 * and presentation RNG from the Scene-ON seam; move resolution, damage,
 * gameplay RNG, and battle control stay outside this module.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";

export type BonemerangSide = "player" | "opponent";
export type BonemerangBgLayer = "bg1" | "bg2";
export interface BonemerangPoint { readonly x: number; readonly y: number; }
export type BonemerangMatrix = readonly [number, number, number, number];

export interface BonemerangBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: BonemerangMatrix;
}

/** A complete live painter seed, rather than a recording-derived order. */
export interface BonemerangPainterSprite {
  readonly slot: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly oamY: number;
}

export interface BonemerangResourceAllocation {
  readonly paletteBank: number;
  readonly tileSlot: number;
  readonly tileRange: readonly [number, number];
}

export interface BonemerangLiveInputs {
  readonly attackerSide: BonemerangSide;
  readonly targetSide: BonemerangSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** Source X_2/Y_PIC_OFFSET coordinates supplied by current scene geometry. */
  readonly attackerPictureCenter: Readonly<BonemerangPoint>;
  readonly targetPictureCenter: Readonly<BonemerangPoint>;
  readonly attackerSprite: Readonly<BonemerangBattlerSprite>;
  readonly targetSprite: Readonly<BonemerangBattlerSprite>;
  /** Source allocator identities, in visual-script creation order. */
  readonly allocations: Readonly<{
    readonly boneSpriteSlot: number;
    readonly impactSpriteSlot: number;
    readonly lungeSpriteSlot: number;
    readonly shakeTaskSlot: number;
    readonly updateMonBgTaskSlot: number;
    readonly clearMonBgTaskSlot: number;
    readonly boneMatrixSlot: number;
    readonly impactMatrixSlot: number;
  }>;
  readonly resources: Readonly<{
    readonly bone: BonemerangResourceAllocation;
    readonly impact: BonemerangResourceAllocation;
  }>;
  /** Persistent live OAM scheduler seed and slots occupied before this root. */
  readonly spriteOrder: readonly number[];
  readonly painterSprites: readonly BonemerangPainterSprite[];
  readonly initialMatrixBitmap: number;
  readonly monbg: Readonly<{
    readonly layer: BonemerangBgLayer;
    /** Task_UpdateMonBg's captured gBattle_BGn_X/Y. */
    readonly scroll: Readonly<BonemerangPoint>;
    readonly targetBgPriority: number;
  }>;
  /** Register values selected from live scene setup, not a party or trace. */
  readonly background: Readonly<{
    readonly baseBg1Cnt: number;
    readonly baseBg2Cnt: number;
    readonly monbgBg1Cnt: number;
    readonly monbgBg2Cnt: number;
    readonly splitBg1Cnt: number;
    readonly splitBg2Cnt: number;
  }>;
  /** Presentation RNG is independent from opaque game mechanics RNG. */
  readonly animationRngSeed: number;
  readonly gameplayRng: unknown;
}

export const BONEMERANG_SOURCE_START = 0x082d17cc;
export const BONEMERANG_SOURCE_END_EXCLUSIVE = 0x082d1820;
export const BONEMERANG_FIRST_INACTIVE_AGE = 71;
export const BONEMERANG_BONE_TAG = 10000;
export const BONEMERANG_IMPACT_TAG = 10135;

export interface BonemerangSourceCursor {
  readonly owner: "Move_Bonemerang";
  readonly pointer: number;
  readonly pointerOffset: 0 | 3 | 6 | 8 | 26 | 64 | 79 | 83;
  readonly active: boolean;
  readonly wait: number;
}

export interface BonemerangProjectile {
  readonly kind: "bone";
  readonly slot: number;
  readonly template: "gBonemerangSpriteTemplate";
  readonly callback: "AnimBonemerangProjectile_Step" | "AnimBonemerangProjectile_End";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: 2;
  readonly matrixNum: number;
  readonly matrix: BonemerangMatrix;
  readonly data: readonly number[];
  readonly sourceCreationOrder: 0;
}

export interface BonemerangHitsplat {
  readonly kind: "impact";
  readonly slot: number;
  readonly template: "gBasicHitSplatSpriteTemplate";
  readonly callback: "RunStoredCallbackWhenAffineAnimEnds" | "DestroyAnimSprite";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly subpriority: number;
  readonly oamPriority: 2;
  readonly matrixNum: number;
  readonly matrix: readonly [303, 0, 0, 303];
  readonly data: readonly [0, 0, 0, 0, 0, 0, number, number];
  readonly sourceCreationOrder: 1;
}

export interface BonemerangLunge {
  readonly kind: "lunge";
  readonly slot: number;
  readonly template: "gHorizontalLungeSpriteTemplate";
  readonly callback: "TranslateSpriteLinearById" | "ReverseHorizontalLungeDirection" | "DestroyAnimSprite";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly invisible: true;
  readonly subpriority: number;
  readonly oamPriority: 3;
  readonly matrixNum: 0;
  readonly matrix: readonly [256, 0, 0, 256];
  readonly data: readonly [number, number, 0, number, 6, 0, number, number];
  readonly sourceCreationOrder: 2;
}

export type BonemerangSprite = BonemerangProjectile | BonemerangHitsplat | BonemerangLunge;

export interface BonemerangTask {
  readonly slot: number;
  readonly callback: "Task_UpdateMonBg" | "Task_ClearMonBg" | "AnimTask_ShakeMon_Step";
  readonly role: "update-mon-bg" | "clear-mon-bg" | "shake";
  readonly data: readonly number[];
}

export interface BonemerangState {
  readonly age: number;
  readonly active: boolean;
  readonly source: BonemerangSourceCursor;
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: BonemerangSide; readonly species: string; readonly sprite: BonemerangBattlerSprite; readonly lunge: BonemerangPoint }>;
    readonly target: Readonly<{ readonly side: BonemerangSide; readonly species: string; readonly sprite: BonemerangBattlerSprite; readonly shake: BonemerangPoint; readonly visible: boolean }>;
  }>;
  readonly sprites: readonly BonemerangSprite[];
  readonly tasks: readonly BonemerangTask[];
  readonly resources: Readonly<{
    readonly bone: Readonly<BonemerangResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly impact: Readonly<BonemerangResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly allocator: Readonly<{ readonly matrixBitmap: number; readonly boneAllocated: boolean; readonly impactAllocated: boolean }>;
  }>;
  readonly background: Readonly<{
    readonly layer: BonemerangBgLayer;
    readonly monbg: boolean;
    readonly splitPriority: boolean;
    readonly clearPending: boolean;
    readonly targetVisible: boolean;
    readonly softwareScroll: BonemerangPoint;
    readonly hardwareScroll: BonemerangPoint;
    readonly vram: "battle" | "mon-bg" | "clear-pending";
  }>;
  readonly registers: Readonly<{
    readonly bldcnt: number;
    readonly bldalpha: number;
    readonly bldy: 0;
    readonly bg1hofs: number;
    readonly bg1vofs: number;
    readonly bg2hofs: number;
    readonly bg2vofs: number;
    readonly bg1cnt: number;
    readonly bg2cnt: number;
  }>;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software";
    /** Age seven is this root's source-owned monbg palette write. */
    readonly palette: "initial" | "preceding-faded" | "same-row-monbg-setup";
  }>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{
    readonly channel: "SE1";
    readonly sound: "SE_M_BONEMERANG" | "SE_M_HORN_ATTACK" | "SE_M_VITAL_THROW";
    readonly sourcePan: "SOUND_PAN_ATTACKER" | "SOUND_PAN_TARGET";
    readonly pan: -64 | -63 | 63;
  }>[];
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayUnchanged: true }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: 0; readonly ownedSprites: number; readonly resourcesReleased: boolean }>;
}

const IDENTITY: BonemerangMatrix = [256, 0, 0, 256];
const HIT_MATRIX: readonly [303, 0, 0, 303] = [303, 0, 0, 303];
const ARC_DURATION = 20;
const ARC_DELTA = Math.trunc(0x8000 / ARC_DURATION);

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Bonemerang source age ${age}`);
}
function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) throw new Error(`invalid Bonemerang ${label}`);
}
function assertInputs(input: Readonly<BonemerangLiveInputs>): void {
  if (input.attackerSide === input.targetSide) throw new Error("Bonemerang requires opposing live battler sides");
  for (const [label, slot] of Object.entries(input.allocations)) assertSlot(slot, label, label.endsWith("Slot") && !label.includes("Matrix") ? 64 : 32);
  if (input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64 || input.spriteOrder.some((slot) => slot < 0 || slot >= 64)) {
    throw new Error("Bonemerang requires a 64-slot painter order seed");
  }
}

/** Root script cursor derived from source waits, including its first inactive row. */
export function bonemerangSourceAtAge(age: number): BonemerangSourceCursor {
  assertAge(age);
  let pointerOffset: BonemerangSourceCursor["pointerOffset"];
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 7) { pointerOffset = 6; wait = age === 4 ? 1 : 0; }
  else if (age < 10) { pointerOffset = 8; wait = age === 7 ? 1 : 0; }
  else if (age < 32) { pointerOffset = 26; wait = Math.max(0, 30 - age); }
  else if (age < 51) { pointerOffset = 64; wait = Math.max(0, 49 - age); }
  else if (age < 67) { pointerOffset = 79; wait = 1; }
  else { pointerOffset = 83; wait = 1; }
  return { owner: "Move_Bonemerang", pointer: BONEMERANG_SOURCE_START + pointerOffset, pointerOffset, active: age < BONEMERANG_FIRST_INACTIVE_AGE, wait };
}

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}
function q8Delta(from: number, to: number): number {
  const raw = Math.trunc(Math.abs(to - from) * 256 / ARC_DURATION);
  return to < from ? raw | 1 : raw & ~1;
}
function q8Offset(delta: number, callbacks: number): number {
  const value = Math.trunc(delta * callbacks / 256);
  if (value === 0) return 0;
  return delta & 1 ? -value : value;
}
function arcLeg(from: Readonly<BonemerangPoint>, to: Readonly<BonemerangPoint>, height: number, callbacks: number) {
  const xDelta = q8Delta(from.x, to.x), yDelta = q8Delta(from.y, to.y);
  const fixedX = xDelta * callbacks, fixedY = yDelta * callbacks, phase = ARC_DELTA * callbacks;
  return {
    xDelta, yDelta, fixedX, fixedY, phase,
    x2: q8Offset(xDelta, callbacks),
    y2: q8Offset(yDelta, callbacks) + gbaSin(phase >> 8, height),
  };
}
function affineMatrix(age: number): BonemerangMatrix {
  const angle = ((age - 8) * 15) & 0xff;
  const sine = GBA_SINE_TABLE_256[angle]!;
  const cosine = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
  return [cosine, -sine, sine, cosine];
}
function projectileAtAge(age: number, input: Readonly<BonemerangLiveInputs>): BonemerangProjectile | null {
  if (age < 10 || age > 50) return null;
  const outward = age <= 29;
  const callbacks = outward ? age - 9 : age - 30;
  const first = arcLeg(input.attackerPictureCenter, input.targetPictureCenter, -40, ARC_DURATION);
  const returnedStart = { x: input.attackerPictureCenter.x + first.x2, y: input.attackerPictureCenter.y + first.y2 };
  const leg = outward
    ? arcLeg(input.attackerPictureCenter, input.targetPictureCenter, -40, callbacks)
    : arcLeg(returnedStart, input.attackerPictureCenter, 40, callbacks);
  return {
    kind: "bone", slot: input.allocations.boneSpriteSlot, template: "gBonemerangSpriteTemplate",
    callback: outward ? "AnimBonemerangProjectile_Step" : "AnimBonemerangProjectile_End",
    x: outward ? input.attackerPictureCenter.x : returnedStart.x,
    y: outward ? input.attackerPictureCenter.y : returnedStart.y,
    x2: leg.x2, y2: leg.y2, subpriority: input.attackerSprite.subpriority - 2,
    oamPriority: 2, matrixNum: input.allocations.boneMatrixSlot, matrix: affineMatrix(age),
    data: [ARC_DURATION - callbacks, leg.xDelta, leg.yDelta, leg.fixedX, leg.fixedY, outward ? -40 : 40, ARC_DELTA, leg.phase],
    sourceCreationOrder: 0,
  };
}
function hitsplatAtAge(age: number, input: Readonly<BonemerangLiveInputs>): BonemerangHitsplat | null {
  if (age < 32 || age > 41) return null;
  return {
    kind: "impact", slot: input.allocations.impactSpriteSlot, template: "gBasicHitSplatSpriteTemplate",
    callback: age === 41 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds",
    x: input.targetPictureCenter.x, y: input.targetPictureCenter.y, x2: 0, y2: 0,
    subpriority: input.attackerSprite.subpriority - 2, oamPriority: 2,
    matrixNum: input.allocations.impactMatrixSlot, matrix: HIT_MATRIX,
    data: [0, 0, 0, 0, 0, 0, 15357, 2058], sourceCreationOrder: 1,
  };
}
function lungeAtAge(age: number, input: Readonly<BonemerangLiveInputs>): BonemerangLunge | null {
  if (age < 51 || age > 65) return null;
  const local = age - 50;
  const signed = input.attackerSide === "player" ? -4 : 4;
  const callback = age === 65 ? "DestroyAnimSprite" : age === 57 ? "ReverseHorizontalLungeDirection" : "TranslateSpriteLinearById";
  const remaining = age <= 56 ? 6 - local : age === 57 ? 0 : Math.max(0, 64 - age);
  return {
    kind: "lunge", slot: input.allocations.lungeSpriteSlot, template: "gHorizontalLungeSpriteTemplate", callback,
    x: input.targetPictureCenter.x, y: input.targetPictureCenter.y, x2: 0, y2: 0, invisible: true,
    subpriority: input.attackerSprite.subpriority - 2, oamPriority: 3, matrixNum: 0, matrix: IDENTITY,
    data: [remaining, age < 58 ? signed : -signed, 0, input.attackerSprite.slot, 6, 0, age < 58 ? 22741 : 15357, age < 58 ? 2061 : 2058],
    sourceCreationOrder: 2,
  };
}
function shakeAtAge(age: number): BonemerangPoint {
  if (age < 34 || age > 39) return { x: 0, y: 0 };
  return { x: age === 34 || age === 35 || age === 38 || age === 39 ? 5 : 0, y: 0 };
}
function tasksAtAge(age: number, input: Readonly<BonemerangLiveInputs>): BonemerangTask[] {
  const tasks: BonemerangTask[] = [];
  if (age >= 32 && age <= 39) {
    const local = age - 32;
    tasks.push({ slot: input.allocations.shakeTaskSlot, callback: "AnimTask_ShakeMon_Step", role: "shake",
      data: [input.targetSprite.slot, 4 - Math.floor(local / 2), 1, local % 2 === 0 ? 1 : 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
  }
  if (age >= 67 && age <= 69) {
    tasks.push({ slot: input.allocations.clearMonBgTaskSlot, callback: "Task_ClearMonBg", role: "clear-mon-bg",
      data: [0, age === 67 ? 1 : 2, input.monbg.layer === "bg1" ? 1 : 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
  }
  if (age >= 7 && age <= 69) {
    tasks.push({ slot: input.allocations.updateMonBgTaskSlot, callback: "Task_UpdateMonBg", role: "update-mon-bg",
      data: [input.targetSprite.slot, input.targetSprite.x, input.targetSprite.y, input.monbg.scroll.x, input.monbg.scroll.y,
        input.monbg.layer === "bg1" ? 0 : 1, input.monbg.targetBgPriority, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
  }
  return tasks;
}
function sourceScrollAtAge(age: number, input: Readonly<BonemerangLiveInputs>): BonemerangPoint {
  if (age < 7 || age >= 70) return { x: 0, y: 0 };
  const shake = shakeAtAge(age);
  return { x: input.monbg.scroll.x - shake.x, y: input.monbg.scroll.y - shake.y };
}
function hardwareScrollAtAge(age: number, input: Readonly<BonemerangLiveInputs>): BonemerangPoint {
  return age < 8 ? { x: 0, y: 0 } : sourceScrollAtAge(age - 1, input);
}
function paletteDrawsAtAge(age: number): number {
  // The retained root's two clear-monbg frames stop the presentation clock;
  // the first inactive dispatch takes one final presentation step.
  return age <= 68 ? age : age <= 70 ? 68 : age - 2;
}
function stepRng(seed: number): number { return (Math.imul(seed, 1103515245) + 24691) >>> 0; }
function animationRngAtAge(seed: number, age: number): number {
  let value = seed >>> 0;
  for (let draw = 0; draw < paletteDrawsAtAge(age); draw += 1) value = stepRng(value);
  return value;
}
function dynamicOrderKey(sprite: BonemerangSprite): BonemerangPainterSprite {
  return { slot: sprite.slot, subpriority: sprite.subpriority, oamPriority: sprite.oamPriority, oamY: sprite.y + sprite.y2 };
}
function painterOrderAtAge(age: number, input: Readonly<BonemerangLiveInputs>, sprites: readonly BonemerangSprite[]): readonly number[] {
  const keys = new Map(input.painterSprites.map((sprite) => [sprite.slot, sprite]));
  // Reset destroyed slots exactly as Sprite reset does before the next sort.
  for (const slot of [input.allocations.boneSpriteSlot, input.allocations.impactSpriteSlot, input.allocations.lungeSpriteSlot]) {
    keys.set(slot, { slot, subpriority: 0xff, oamPriority: 3, oamY: 160 });
  }
  for (const sprite of sprites) keys.set(sprite.slot, dynamicOrderKey(sprite));
  const order = input.spriteOrder.slice();
  const keyFor = (slot: number): BonemerangPainterSprite => keys.get(slot) ?? { slot, subpriority: 0xff, oamPriority: 3, oamY: 160 };
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
  return order;
}

/** Complete source-root reducer through the first inactive resource cleanup row. */
export function bonemerangAtAge(age: number, input: Readonly<BonemerangLiveInputs>): BonemerangState {
  assertAge(age); assertInputs(input);
  const source = bonemerangSourceAtAge(age);
  const projectile = projectileAtAge(age, input), hitsplat = hitsplatAtAge(age, input), lunge = lungeAtAge(age, input);
  const sprites = [projectile, hitsplat, lunge].filter((sprite): sprite is BonemerangSprite => sprite !== null);
  const tasks = tasksAtAge(age, input);
  const shake = shakeAtAge(age);
  const sourceScroll = sourceScrollAtAge(age, input), hardwareScroll = hardwareScrollAtAge(age, input);
  const loadedBone = age >= 1 && age < BONEMERANG_FIRST_INACTIVE_AGE;
  const loadedImpact = age >= 4 && age < BONEMERANG_FIRST_INACTIVE_AGE;
  const boneAllocated = projectile !== null, impactAllocated = hitsplat !== null;
  const matrixBitmap = input.initialMatrixBitmap | (boneAllocated ? (1 << input.allocations.boneMatrixSlot) : 0) | (impactAllocated ? (1 << input.allocations.impactMatrixSlot) : 0);
  const bg = input.background;
  const bg1cnt = age < 8 ? bg.baseBg1Cnt : age < 10 ? bg.monbgBg1Cnt : bg.splitBg1Cnt;
  const bg2cnt = age < 8 ? bg.baseBg2Cnt : age < 10 ? bg.monbgBg2Cnt : bg.splitBg2Cnt;
  const attackerLunge = lunge ? { x: horizontalLungeX2AtTick(6, -4, input.attackerSide, age - 50), y: 0 } : { x: 0, y: 0 };
  const targetVisible = age < 7 || age >= 67;
  const blend = age >= 10 && age <= 66;
  const audio: BonemerangState["audio"] = age === 10
    ? [{ channel: "SE1", sound: "SE_M_BONEMERANG", sourcePan: "SOUND_PAN_ATTACKER", pan: input.attackerSide === "player" ? -64 : 63 }]
    : age === 32
      ? [{ channel: "SE1", sound: "SE_M_HORN_ATTACK", sourcePan: "SOUND_PAN_TARGET", pan: input.targetSide === "player" ? -64 : 63 }]
      : age === 51
        ? [{ channel: "SE1", sound: "SE_M_VITAL_THROW", sourcePan: "SOUND_PAN_ATTACKER", pan: input.attackerSide === "player" ? -64 : 63 }]
        : [];
  return {
    age, active: source.active, source,
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: input.attackerSprite, lunge: attackerLunge },
      target: { side: input.targetSide, species: input.targetSpecies, sprite: input.targetSprite, shake, visible: targetVisible },
    },
    sprites, tasks,
    resources: {
      bone: { ...input.resources.bone, tag: loadedBone ? BONEMERANG_BONE_TAG : null, loaded: loadedBone },
      impact: { ...input.resources.impact, tag: loadedImpact ? BONEMERANG_IMPACT_TAG : null, loaded: loadedImpact },
      allocator: { matrixBitmap, boneAllocated, impactAllocated },
    },
    background: {
      layer: input.monbg.layer, monbg: age >= 7 && age <= 69, splitPriority: age >= 10,
      clearPending: age >= 67 && age <= 70, targetVisible, softwareScroll: sourceScroll, hardwareScroll,
      vram: age < 8 ? "battle" : age <= 68 ? "mon-bg" : age <= 70 ? "clear-pending" : "battle",
    },
    registers: {
      bldcnt: blend ? 16192 : 0, bldalpha: blend ? 2060 : 0, bldy: 0,
      bg1hofs: input.monbg.layer === "bg1" ? hardwareScroll.x & 0x1ff : 0,
      bg1vofs: input.monbg.layer === "bg1" ? hardwareScroll.y & 0x1ff : 0,
      bg2hofs: input.monbg.layer === "bg2" ? hardwareScroll.x & 0x1ff : 0,
      bg2vofs: input.monbg.layer === "bg2" ? hardwareScroll.y & 0x1ff : 0,
      bg1cnt, bg2cnt,
    },
    displayTransfer: { oam: age === 0 ? "initial" : "preceding-software", matrices: age === 0 ? "initial" : "preceding-software", palette: age === 0 ? "initial" : age === 7 ? "same-row-monbg-setup" : "preceding-faded" },
    painterOrder: painterOrderAtAge(age, input, sprites), audio,
    rng: { animation: animationRngAtAge(input.animationRngSeed, age), sourceDraws: paletteDrawsAtAge(age), gameplay: input.gameplayRng, gameplayUnchanged: true },
    cleanup: { firstInactive: age === BONEMERANG_FIRST_INACTIVE_AGE, visualTasks: sprites.length + tasks.filter((task) => task.role === "shake").length, soundTasks: 0, ownedSprites: sprites.length, resourcesReleased: age >= BONEMERANG_FIRST_INACTIVE_AGE },
  };
}
