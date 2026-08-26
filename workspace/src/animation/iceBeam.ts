/**
 * Source-relative reducer for Move_ICE_BEAM's crystal body.
 *
 * This is deliberately a presentation reducer.  It owns the decoded script
 * cursor, the four crystal templates, the two palette-blend sentinels, the
 * looped SE task, target-monbg ShakeMon2, allocator/order state, and resource
 * lifetimes.  It never resolves damage, advances gameplay RNG, or draws a
 * framebuffer.  The Scene-ON adapter may consume this state later, once a
 * separately audited compositor exists.
 */

import { advanceRngValue } from "../engine/rng.ts";
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { sortGbaSpriteOrder } from "./gbaObjCompositor.ts";
import { linearTranslationOffsetAfterCallbacks } from "./animLinearTranslation.ts";

export type IceBeamOrientation = "player-back" | "opponent-front";
export type IceBeamSide = "player" | "opponent";
export type IceBeamCrystalTemplate =
  | "gIceBeamOuterCrystalSpriteTemplate"
  | "gIceBeamInnerCrystalSpriteTemplate"
  | "gIceCrystalHitLargeSpriteTemplate"
  | "gIceCrystalHitSmallSpriteTemplate";

export const ICE_BEAM_FIRST_INACTIVE_AGE = 202;
export const ICE_BEAM_TILE_TAG = 10141;
export const ICE_BEAM_TILE_BYTES = 0x01c0;
export const ICE_BEAM_PALETTE_SLOT = 7;
export const ICE_BEAM_LOOP_SONG_ID = 183;
export const ICE_BEAM_LOOP_SONG = "se_m_bubble_beam2" as const;
export const ICE_BEAM_IMPACT_SONG = "se_icy_wind" as const;

export interface IceBeamPoint {
  readonly x: number;
  readonly y: number;
}

/** Explicit source coordinates; callers derive these from live battler art. */
export interface IceBeamGeometry {
  /** `GetBattlerSpriteCoord(attacker, X_2/Y_PIC_OFFSET)`. */
  readonly attackerPictureOffset: Readonly<IceBeamPoint>;
  /** `GetBattlerSpriteCoord(target, X_2/Y_PIC_OFFSET)`. */
  readonly targetPictureOffset: Readonly<IceBeamPoint>;
  /** `InitSpritePosToAnimTarget(TRUE)`'s target center. */
  readonly targetCenter: Readonly<IceBeamPoint>;
  readonly monbgBaseHofs: number;
  readonly monbgBaseVofs: number;
}

export interface IceBeamSpriteOrderKey {
  readonly slot: number;
  readonly priority: 0 | 1 | 2 | 3;
  readonly subpriority: number;
  readonly y: number;
}

export interface IceBeamSpriteOrderProfile {
  /** Live source `sSpriteOrder`; a permutation keeps equal-key stability. */
  readonly initialOrder?: readonly number[];
  /** Live keys for non-move sprites, if the caller has them. */
  readonly initialKeys?: readonly IceBeamSpriteOrderKey[];
}

export interface IceBeamAnimationProfile {
  readonly orientation: IceBeamOrientation;
  readonly endAge: number;
  readonly geometry: Readonly<IceBeamGeometry>;
  readonly attackerSide?: IceBeamSide;
  readonly targetSpriteSlot?: number;
  readonly soundTaskSlot?: number;
  readonly monbgTaskSlot?: number;
  readonly shakeTaskSlot?: number;
  readonly clearTaskSlot?: number;
  /** The observed animation-only gRng2 value at source age zero. */
  readonly animationRngStart?: number;
  /** Gameplay is a caller-owned immutable observation, never advanced here. */
  readonly gameplayRng: number;
  readonly immutableGameplayState?: unknown;
  readonly spriteOrder?: Readonly<IceBeamSpriteOrderProfile>;
}

export interface IceBeamSourceCursor {
  readonly active: boolean;
  readonly owner: "Move_ICE_BEAM" | "IceBeamCreateCrystals" | "IceCrystalEffectShort";
  readonly offset: number;
  readonly pointer: number;
  readonly pointerParity: 0 | 1;
  readonly wait: number;
  readonly args: readonly number[];
}

export interface IceBeamSprite {
  readonly slot: number;
  readonly kind: "beam" | "impact" | "palette";
  readonly template: IceBeamCrystalTemplate | "gSimplePaletteBlendSpriteTemplate";
  readonly callback:
    | "DestroyAnimSprite"
    | "AnimTranslateLinear_WithFollowup"
    | "RunStoredCallbackWhenAffineAnimEnds"
    | "AnimFlickerIceEffectParticle"
    | "AnimSimplePaletteBlend_Step";
  readonly owner: "Move_ICE_BEAM" | "IceBeamCreateCrystals" | "IceCrystalEffectShort";
  readonly birthAge: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly number[];
  readonly attr: readonly [number, number, number];
  readonly subpriority: number;
  readonly priority: 2 | 3;
  readonly invisible: boolean;
  readonly animNum: 0;
  readonly animCmdIndex: 0;
  readonly animDelayCounter: 0;
  readonly cellTileOffset: 4 | 6;
  readonly affineAnim: Readonly<{
    readonly command: "FRAME/JUMP" | "FRAME/FRAME/FRAME/END" | "none";
    readonly frameIndex: number;
    readonly ended: boolean;
  }>;
  readonly matrixNum: number;
  readonly matrix: readonly [number, number, number, number];
}

export interface IceBeamTask {
  readonly slot: number;
  readonly priority: number;
  readonly callback:
    | "SoundTask_LoopSEAdjustPanning_Step"
    | "Task_UpdateMonBg"
    | "AnimTask_ShakeMon2_Step"
    | "Task_ClearMonBg";
  readonly data: readonly number[];
}

export interface IceBeamPaletteProgram {
  readonly name: "opening-bg" | "target-fade-in" | "target-fade-out" | "closing-bg";
  readonly selector: "F_PAL_BG" | "F_PAL_TARGET";
  readonly slot: number;
  readonly delay: -31 | 0 | 1 | 5;
  readonly active: boolean;
  readonly source: Readonly<{ readonly offset: number; readonly wait: number; readonly args: readonly number[] }> | null;
  readonly initialBlendY: number;
  readonly targetBlendY: number;
  readonly color: "RGB_BLACK" | "RGB(0,20,31)";
  readonly coefficient: number;
  readonly spriteActive: boolean;
}

export interface IceBeamFrame {
  readonly age: number;
  readonly active: boolean;
  readonly source: IceBeamSourceCursor;
  readonly sprites: readonly IceBeamSprite[];
  /** Complete affine-matrix register intent, including inactive identity slots. */
  readonly matrices: readonly (readonly [number, number, number, number])[];
  readonly tasks: readonly IceBeamTask[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0 | 1;
  readonly targetMonbg: Readonly<{
    readonly taskActive: boolean;
    readonly layer: 1 | 2;
    /** The live target sprite write. This is not a live-OBJ display model. */
    readonly targetX2: number;
    readonly targetY2: 0;
    readonly displayedHofs: number;
    readonly displayAge: number;
    readonly hardwareLagRows: 1;
    readonly sourceCallbackRange: readonly [38, 86];
    readonly displayCallbackRange: readonly [39, 87];
  }>;
  readonly registers: Readonly<{
    readonly bg1cnt: number;
    readonly bg2cnt: number;
    readonly bg1hofs: number;
    readonly bg1vofs: number;
    readonly bg2hofs: number;
    readonly bg2vofs: number;
    readonly bg2vofsValue: number;
    readonly bldcnt: number;
    readonly bldalpha: number;
    readonly splitBgPriority: boolean;
    readonly monbgEnabled: boolean;
    readonly blendEnabled: boolean;
  }>;
  readonly palette: Readonly<{
    readonly programs: readonly IceBeamPaletteProgram[];
    readonly selectedSelectors: readonly ("F_PAL_BG" | "F_PAL_TARGET")[];
    readonly hardwareTransfer: "pre-animation" | "preceding-software-faded";
    readonly hardwareLagRows: 1;
    readonly softwareAge: number;
    readonly hardwareAge: number;
  }>;
  readonly audio: Readonly<{
    readonly loop: Readonly<{
      readonly songId: 183;
      readonly song: typeof ICE_BEAM_LOOP_SONG;
      readonly active: boolean;
      readonly pan: number;
      readonly playAges: readonly number[];
      readonly startThisRow: boolean;
    }>;
    readonly impactStarts: readonly Readonly<{ readonly age: number; readonly song: typeof ICE_BEAM_IMPACT_SONG; readonly pan: number }>[];
  }>;
  readonly resources: Readonly<{
    readonly tileTag: 10141;
    readonly paletteTag: 10141;
    readonly paletteSlot: 7;
    readonly tileBytes: 0x01c0;
    readonly loaded: boolean;
    readonly freed: boolean;
  }>;
  readonly order: Readonly<{
    readonly fullSourceOrder: readonly number[];
    readonly fullPainterOrder: readonly number[];
    readonly sourceOrder: readonly number[];
    readonly painterOrder: readonly number[];
  }>;
  readonly animationRng: number;
  readonly animationRngTransition: Readonly<{ readonly previous: number | null; readonly next: number | null }>;
  readonly gameplay: Readonly<{ readonly rng: number; readonly immutableState: unknown; readonly changed: false }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly activeSprites: number;
    readonly activeTasks: number;
    readonly resourcesFreed: boolean;
  }>;
}

export interface IceBeamTimeline {
  readonly frames: readonly IceBeamFrame[];
  readonly endAge: number;
}

const MAIN_SOURCE_BASE = 0x082d_06c0;
const EFFECT_SOURCE_BASE = 0x082d_7720;
const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const OPENING_ARGS = [1, 1, 0, 7, 0, 0, 0, 0] as const;
const OUTER_ARGS = [20, -12, 0, -12, 20, 0, 10, 0] as const;
const INNER_ARGS = [20, 0, 0, 0, 11, 0, 10, 0] as const;
const RESTORE_TARGET_ARGS = [4, 5, 7, 0, 32384, 0, 10, 0] as const;
const RESTORE_BG_ARGS = [1, 0, 7, 0, 0, 0, 10, 0] as const;
const IMPACT_OFFSETS = [
  [-10, -10, "large"], [10, 20, "small"], [-5, 10, "large"],
  [17, -12, "small"], [-15, 15, "small"], [0, 0, "small"], [20, 2, "large"],
] as const;
const IMPACT_AGES = [109, 115, 121, 127, 133, 139, 145] as const;
const INITIAL_ORDER = [
  62, 60, 0, 63, 1, 61, 6, 8, 2, 4, 3, 21, 20, 5, 19, 18,
  17, 16, 15, 14, 13, 12, 11, 10, 9, 7, 54, 55, 56, 57, 58, 59,
  23, 22, 48, 49, 50, 51, 52, 53, 24, 25, 26, 27, 28, 29, 30, 31,
  32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
] as const;
const STATIC_SPRITE_SLOTS = [0, 1, 2, 6, 8, 60, 61, 62, 63] as const;
const STATIC_MATRIX_SLOTS = [1, 2] as const;
const IDENTITY = [256, 0, 0, 256] as const;
const DEFAULT_STATIC_KEYS: readonly IceBeamSpriteOrderKey[] = Array.from(
  { length: 64 },
  (_, slot): IceBeamSpriteOrderKey => {
    let priority: 0 | 1 | 2 | 3 = 3;
    let subpriority = 255;
    let y = -96;
    if (slot === 0 || slot === 1 || slot === 61 || slot === 63) {
      priority = 0; subpriority = 1; y = slot === 0 || slot === 63 ? 72 : 14;
    } else if (slot === 2) {
      priority = 3; subpriority = 200; y = 0;
    } else if (slot === 6) {
      priority = 2; subpriority = 30; y = 68;
    } else if (slot === 8) {
      priority = 2; subpriority = 40; y = 17;
    } else if (slot === 60 || slot === 62) {
      priority = 0; subpriority = 0; y = slot === 62 ? 84 : 26;
    }
    return { slot, priority, subpriority, y };
  },
);

type Event = {
  readonly id: string;
  readonly birthAge: number;
  readonly endAge: number;
  readonly kind: "beam" | "impact" | "palette";
  readonly template?: IceBeamCrystalTemplate;
  readonly owner: IceBeamSprite["owner"];
  readonly duration?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly needsMatrix: boolean;
  slot?: number;
  matrixNum?: number;
};

function sideFor(profile: Readonly<IceBeamAnimationProfile>): IceBeamSide {
  return profile.attackerSide ?? (profile.orientation === "player-back" ? "player" : "opponent");
}

function signFor(profile: Readonly<IceBeamAnimationProfile>): 1 | -1 {
  return sideFor(profile) === "player" ? 1 : -1;
}

function assertPoint(label: string, point: Readonly<IceBeamPoint>): void {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) throw new Error(`${label} must be integer geometry`);
}

function assertProfile(profile: Readonly<IceBeamAnimationProfile>): void {
  if (!Number.isInteger(profile.endAge) || profile.endAge < ICE_BEAM_FIRST_INACTIVE_AGE
    || (profile.orientation !== "player-back" && profile.orientation !== "opponent-front")
    || !Number.isInteger(profile.gameplayRng)) throw new Error("invalid Ice Beam profile");
  assertPoint("attackerPictureOffset", profile.geometry.attackerPictureOffset);
  assertPoint("targetPictureOffset", profile.geometry.targetPictureOffset);
  assertPoint("targetCenter", profile.geometry.targetCenter);
  if (![profile.targetSpriteSlot ?? (sideFor(profile) === "player" ? 8 : 6),
    profile.soundTaskSlot ?? 0, profile.monbgTaskSlot ?? 1, profile.shakeTaskSlot ?? 2,
    profile.clearTaskSlot ?? 0].every(Number.isInteger)) throw new Error("invalid Ice Beam task slots");
  const order = profile.spriteOrder?.initialOrder;
  if (order && (order.length !== 64 || new Set(order).size !== 64 || order.some((slot) => slot < 0 || slot >= 64))) {
    throw new Error("Ice Beam initial order must be a 64-slot permutation");
  }
}

function sourceCursor(age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamSourceCursor {
  const active = age < profile.endAge;
  const move = (offset: number, wait: number, args: readonly number[]): IceBeamSourceCursor => {
    const pointer = MAIN_SOURCE_BASE + offset;
    return { active, owner: "Move_ICE_BEAM", offset, pointer, pointerParity: (pointer & 1) as 0 | 1, wait, args: [...args] };
  };
  if (age === 0) return move(0, 0, ZERO_ARGS);
  if (age < 4) return move(2, age === 1 ? 1 : 0, ZERO_ARGS);
  if (age < 7) return move(10, age === 4 ? 1 : 0, ZERO_ARGS);
  if (age < 26) return move(27, 1, OPENING_ARGS);
  if (age < 29) return move(84, age === 26 ? 1 : 0, OUTER_ARGS);
  if (age < 62) return {
    active, owner: "IceBeamCreateCrystals", offset: 310, pointer: MAIN_SOURCE_BASE + 310,
    pointerParity: 0, wait: age % 3 === 2 ? 1 : 0, args: [...INNER_ARGS],
  };
  if (age < 65) return move(192, age === 62 ? 1 : 0, INNER_ARGS);
  if (age < 87) return move(209, 1, INNER_ARGS);
  if (age < 109) return move(212, Math.max(0, 20 - (age - 87)), INNER_ARGS);
  if (age < 145) {
    const index = Math.floor((age - 109) / 6);
    const start = 109 + index * 6;
    const [x, y] = IMPACT_OFFSETS[index] ?? IMPACT_OFFSETS[6]!;
    const offset = 65555 + index * 19;
    const pointer = EFFECT_SOURCE_BASE + (offset - 65536);
    return {
      active, owner: "IceCrystalEffectShort", offset, pointer,
      pointerParity: (pointer & 1) as 0 | 1, wait: Math.max(0, 4 - (age - start)),
      args: [x, y, 0, 0, 11, 0, 10, 0],
    };
  }
  if (age < 183) return move(234, 1, RESTORE_TARGET_ARGS);
  if (age < 198) return move(252, 1, RESTORE_BG_ARGS);
  return move(256, 1, RESTORE_BG_ARGS);
}

function eventList(): Event[] {
  const events: Event[] = [];
  const add = (event: Event): void => { events.push(event); };
  add({ id: "palette-opening", birthAge: 7, endAge: 24, kind: "palette", owner: "Move_ICE_BEAM", needsMatrix: false });
  for (let index = 0; index < 12; index += 1) {
    const age = 26 + index * 3;
    add({ id: `outer-${index}-a`, birthAge: age, endAge: age + 20, kind: "beam", template: "gIceBeamOuterCrystalSpriteTemplate", owner: index === 0 ? "Move_ICE_BEAM" : "IceBeamCreateCrystals", duration: 20, offsetX: 20, offsetY: 12, needsMatrix: false });
    add({ id: `outer-${index}-b`, birthAge: age, endAge: age + 20, kind: "beam", template: "gIceBeamOuterCrystalSpriteTemplate", owner: index === 0 ? "Move_ICE_BEAM" : "IceBeamCreateCrystals", duration: 20, offsetX: 20, offsetY: -12, needsMatrix: false });
  }
  for (let index = 0; index < 13; index += 1) {
    const age = 29 + index * 3;
    add({ id: `inner-${index}`, birthAge: age, endAge: age + 11, kind: "beam", template: "gIceBeamInnerCrystalSpriteTemplate", owner: "IceBeamCreateCrystals", duration: 11, offsetX: 20, offsetY: 0, needsMatrix: true });
  }
  add({ id: "palette-target-in", birthAge: 38, endAge: 57, kind: "palette", owner: "Move_ICE_BEAM", needsMatrix: false });
  for (let index = 0; index < IMPACT_AGES.length; index += 1) {
    const age = IMPACT_AGES[index]!;
    const [x, y, size] = IMPACT_OFFSETS[index]!;
    add({ id: `impact-${index}`, birthAge: age, endAge: age + 36, kind: "impact", template: size === "large" ? "gIceCrystalHitLargeSpriteTemplate" : "gIceCrystalHitSmallSpriteTemplate", owner: "IceCrystalEffectShort", offsetX: x, offsetY: y, needsMatrix: true });
    if (age === 145) add({ id: "palette-target-out", birthAge: 145, endAge: 178, kind: "palette", owner: "Move_ICE_BEAM", needsMatrix: false });
  }
  add({ id: "palette-closing-bg", birthAge: 183, endAge: 196, kind: "palette", owner: "Move_ICE_BEAM", needsMatrix: false });
  return events.sort((left, right) => left.birthAge - right.birthAge
    || (left.birthAge === 38 ? (left.kind === "palette" ? -1 : 1) : 0)
    || (left.birthAge === 145 ? (left.kind === "palette" ? 1 : -1) : 0));
}

function allocateEvents(profile: Readonly<IceBeamAnimationProfile>): Event[] {
  const events = eventList();
  const occupied = new Set<number>(STATIC_SPRITE_SLOTS);
  const matrices = new Set<number>(STATIC_MATRIX_SLOTS);
  for (let age = 0; age <= profile.endAge; age += 1) {
    const priorEvents = events.filter((event) => event.birthAge <= age - 1 && event.endAge >= age - 1);
    const used = new Set([...occupied, ...priorEvents.map((event) => event.slot!).filter(Number.isInteger)]);
    const usedMatrices = new Set([...matrices, ...priorEvents.filter((event) => event.needsMatrix).map((event) => event.matrixNum!).filter(Number.isInteger)]);
    for (const event of events.filter((candidate) => candidate.birthAge === age)) {
      let slot = 0; while (used.has(slot)) slot += 1;
      event.slot = slot; used.add(slot);
      if (event.needsMatrix) {
        let matrix = 0; while (usedMatrices.has(matrix)) matrix += 1;
        event.matrixNum = matrix; usedMatrices.add(matrix);
      }
    }
  }
  return events;
}

function tableAt(index: number): number {
  return GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
}

function innerMatrix(localAge: number): readonly [number, number, number, number] {
  const index = 44 - localAge * 10;
  const cosine = tableAt(index);
  const sine = tableAt(index + 64);
  return [cosine, -sine, sine, cosine];
}

/** Raw `InitAnimLinearTranslation` delta: direction lives in bit zero. */
function rawTranslationDeltaQ8(distance: number, duration: number): number {
  const magnitude = Math.trunc((Math.abs(distance) * 256) / duration);
  return distance < 0 ? magnitude | 1 : magnitude & ~1;
}

function impactMatrix(localAge: number): readonly [number, 0, 0, number] {
  const scale = 211 + Math.min(localAge, 9) * 5;
  const reciprocal = Math.floor(0x10000 / scale);
  return [reciprocal, 0, 0, reciprocal];
}

function matrixTableAt(
  age: number,
  events: readonly Event[],
): readonly (readonly [number, number, number, number])[] {
  const table = Array.from({ length: 32 }, () => IDENTITY as readonly [number, number, number, number]);
  for (const event of events) {
    if (!event.needsMatrix || event.matrixNum === undefined
      || event.birthAge > age || event.endAge < age) continue;
    table[event.matrixNum] = event.kind === "beam"
      ? innerMatrix(age - event.birthAge)
      : impactMatrix(age - event.birthAge);
  }
  return table;
}

function makeBeamSprite(event: Event, age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamSprite {
  const localAge = age - event.birthAge;
  const sign = signFor(profile);
  const isInner = event.template === "gIceBeamInnerCrystalSpriteTemplate";
  const duration = event.duration!;
  const startX = profile.geometry.attackerPictureOffset.x + sign * event.offsetX!;
  const startY = profile.geometry.attackerPictureOffset.y + event.offsetY!;
  const targetX = profile.geometry.targetPictureOffset.x + sign * 0;
  const targetY = profile.geometry.targetPictureOffset.y + event.offsetY!;
  const rawDx = rawTranslationDeltaQ8(targetX - startX, duration);
  const rawDy = rawTranslationDeltaQ8(targetY - startY, duration);
  const dx = rawDx & 1 ? -rawDx : rawDx;
  const dy = rawDy & 1 ? -rawDy : rawDy;
  const callbacks = localAge + 1;
  const x2 = linearTranslationOffsetAfterCallbacks(dx, callbacks, duration);
  const y2 = linearTranslationOffsetAfterCallbacks(dy, callbacks, duration);
  const matrix = isInner ? innerMatrix(localAge) : IDENTITY;
  const data = [Math.max(0, duration - 1 - localAge), rawDx, rawDy,
    rawDx * Math.min(callbacks, duration), rawDy * Math.min(callbacks, duration), 0, 15357, 2058];
  return {
    slot: event.slot!, kind: "beam",
    template: event.template!,
    callback: localAge === duration ? "DestroyAnimSprite" : "AnimTranslateLinear_WithFollowup",
    owner: event.owner, birthAge: event.birthAge, localAge, x: startX, y: startY, x2, y2, data,
    attr: [0, x2 + startX, isInner ? 31029 : 31031], subpriority: sideFor(profile) === "player" ? 28 : 38,
    priority: 2, invisible: false, animNum: 0, animCmdIndex: 0, animDelayCounter: 0,
    cellTileOffset: isInner ? 4 : 6,
    affineAnim: { command: isInner ? "FRAME/JUMP" : "none", frameIndex: isInner ? localAge : 0, ended: false },
    matrixNum: isInner ? event.matrixNum! : 0, matrix,
  };
}

function makeImpactSprite(event: Event, age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamSprite {
  const localAge = age - event.birthAge;
  const sign = signFor(profile);
  const x = profile.geometry.targetCenter.x + sign * event.offsetX!;
  const y = profile.geometry.targetCenter.y + event.offsetY!;
  const flickering = localAge >= 17;
  const matrix = impactMatrix(localAge);
  const data = [flickering ? localAge - 17 : 0, 0, 0, 0, 0, 0, -17943, 2064];
  return {
    slot: event.slot!, kind: "impact", template: event.template!,
    callback: flickering ? "AnimFlickerIceEffectParticle" : "RunStoredCallbackWhenAffineAnimEnds",
    owner: event.owner, birthAge: event.birthAge, localAge, x, y, x2: 0, y2: 0, data,
    attr: [0, x, event.template === "gIceCrystalHitLargeSpriteTemplate" ? 31029 : 31031],
    subpriority: sideFor(profile) === "player" ? 38 : 28, priority: 2,
    invisible: flickering && ((localAge - 17) & 1) === 1, animNum: 0, animCmdIndex: 0, animDelayCounter: 0,
    cellTileOffset: event.template === "gIceCrystalHitLargeSpriteTemplate" ? 4 : 6,
    affineAnim: { command: "FRAME/FRAME/FRAME/END", frameIndex: Math.min(localAge, 17), ended: flickering },
    matrixNum: event.matrixNum!, matrix,
  };
}

function paletteSprite(event: Event, age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamSprite {
  return {
    slot: event.slot!, kind: "palette", template: "gSimplePaletteBlendSpriteTemplate", callback: "AnimSimplePaletteBlend_Step",
    owner: event.owner, birthAge: event.birthAge, localAge: age - event.birthAge,
    x: profile.geometry.targetCenter.x, y: profile.geometry.targetCenter.y, x2: 0, y2: 0,
    data: [0, 0, 0, 0, 0, 0, 0, 0], attr: [160, 304, 65535],
    subpriority: sideFor(profile) === "player" ? 28 : 38, priority: 3,
    invisible: true, animNum: 0, animCmdIndex: 0, animDelayCounter: 0, cellTileOffset: 6,
    affineAnim: { command: "none", frameIndex: 0, ended: false }, matrixNum: 0, matrix: IDENTITY,
  };
}

function taskData(changes: Readonly<Record<number, number>>): number[] {
  const result = Array<number>(16).fill(0);
  for (const [index, value] of Object.entries(changes)) result[Number(index)] = value;
  return result;
}

function soundTask(age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamTask | null {
  if (age < 26 || age > 57) return null;
  const local = age - 26;
  const player = sideFor(profile) === "player";
  const pan = Math.max(-64, Math.min(63, (player ? -56 : 55) + (player ? 4 : -4) * local));
  return {
    slot: profile.soundTaskSlot ?? 0, priority: 0xfe, callback: "SoundTask_LoopSEAdjustPanning_Step",
    data: taskData({ 0: 183, 1: player ? -64 : 63, 2: player ? 63 : -63, 3: player ? 4 : -4,
      4: Math.max(1, 3 - Math.floor((local + 1) / 11)), 5: 0, 6: 10, 11: pan, 12: (local + 1) % 11 }),
  };
}

function monbgTask(age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamTask | null {
  if (age < 1 || age > 200) return null;
  const player = sideFor(profile) === "player";
  return { slot: profile.monbgTaskSlot ?? 1, priority: 0xfe, callback: "Task_UpdateMonBg",
    data: taskData(player ? { 0: 8, 1: 176, 2: 49, 3: -144, 4: -17, 6: 1 } : { 0: 6, 1: 72, 2: 91, 3: -40, 4: -59, 5: 1 }) };
}

function shakeTask(age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamTask | null {
  if (age < 38 || age > 85) return null;
  const local = age - 38;
  return { slot: profile.shakeTaskSlot ?? 2, priority: 0, callback: "AnimTask_ShakeMon2_Step",
    data: taskData({ 0: profile.targetSpriteSlot ?? (sideFor(profile) === "player" ? 8 : 6), 1: 24 - Math.floor(local / 2), 2: 1, 3: 1 - (local & 1), 4: 2, 5: 0 }) };
}

function clearTask(age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamTask | null {
  if (age < 198 || age > 200) return null;
  const player = sideFor(profile) === "player";
  return { slot: profile.clearTaskSlot ?? 0, priority: 0xfe, callback: "Task_ClearMonBg",
    data: taskData({ 1: Math.min(2, age - 197), 2: player ? 1 : 0 }) };
}

function sourceShake(age: number): number {
  if (age < 38 || age > 86) return 0;
  if (age === 86) return 0;
  return (Math.floor((age - 38) / 2) & 1) === 0 ? -2 : 2;
}

function registersAt(age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamFrame["registers"] {
  const player = sideFor(profile) === "player";
  const hofs = age < 2 || age >= profile.endAge ? 0
    : profile.geometry.monbgBaseHofs - (age >= 39 && age <= 86 ? sourceShake(age - 1) : 0);
  const active = age >= 2 && age < profile.endAge;
  const blend = age >= 4 && age < 198;
  return {
    bg1cnt: player ? (age >= 2 ? 23554 : 39936) : (age >= 4 ? 39937 : 39936),
    bg2cnt: player ? 24064 : (age >= 2 ? 24066 : 24064),
    bg1hofs: player ? hofs : 0, bg1vofs: player && age >= 2 && age < profile.endAge ? profile.geometry.monbgBaseVofs : 0,
    bg2hofs: player ? 0 : hofs, bg2vofs: player ? 0 : age >= 2 && age < profile.endAge ? profile.geometry.monbgBaseVofs : 0,
    bg2vofsValue: profile.geometry.monbgBaseVofs,
    bldcnt: blend ? 16192 : 0, bldalpha: blend ? 2060 : 0,
    splitBgPriority: active, monbgEnabled: active, blendEnabled: blend,
  };
}

function paletteSource(name: IceBeamPaletteProgram["name"]): IceBeamPaletteProgram["source"] {
  if (name === "opening-bg") return { offset: 27, wait: 1, args: [...OPENING_ARGS] };
  if (name === "target-fade-in") return { offset: 310, wait: 1, args: [...INNER_ARGS] };
  if (name === "target-fade-out") return { offset: 234, wait: 1, args: [...RESTORE_TARGET_ARGS] };
  return { offset: 252, wait: 1, args: [...RESTORE_BG_ARGS] };
}

function paletteProgramsAt(age: number): readonly IceBeamPaletteProgram[] {
  const specs: readonly [IceBeamPaletteProgram["name"], number, number, number, -31 | 0 | 1 | 5, number, number, IceBeamPaletteProgram["selector"], IceBeamPaletteProgram["color"]][] = [
    ["opening-bg", 7, 24, 3, 1, 0, 7, "F_PAL_BG", "RGB_BLACK"],
    ["target-fade-in", 38, 57, 16, -31, 0, 7, "F_PAL_TARGET", "RGB(0,20,31)"],
    ["target-fade-out", 145, 178, 12, 5, 7, 0, "F_PAL_TARGET", "RGB(0,20,31)"],
    ["closing-bg", 183, 196, 3, 0, 7, 0, "F_PAL_BG", "RGB_BLACK"],
  ];
  return specs.map(([name, first, last, slot, delay, initialBlendY, targetBlendY, selector, color]) => {
    const active = age >= first && age <= last;
    const local = Math.max(0, age - first);
    // `simple_palette_blend`'s software fade updates at the source's
    // two-frame hardware cadence.  The opening has a three-row cadence in
    // the retained Scene-ON window; the target fade-in is one coefficient per
    // two rows; the two restores step down by two every three/two rows.
    const coefficient = name === "opening-bg"
      ? Math.min(7, 2 * Math.floor((local + 1) / 3))
      : name === "target-fade-in"
        ? Math.min(7, Math.floor(local / 2))
        : name === "target-fade-out"
          ? Math.max(0, 7 - 2 * Math.floor(local / 7))
          : Math.max(0, 7 - 2 * Math.floor((local + 1) / 2));
    return { name, selector, slot, delay, active, source: active ? paletteSource(name) : null,
      initialBlendY, targetBlendY, color, coefficient, spriteActive: active };
  });
}

function animationRngAt(age: number, profile: Readonly<IceBeamAnimationProfile>): number {
  let value = (profile.animationRngStart ?? 0) >>> 0;
  // The retained source window advances gRng2 through its last active
  // callback (age 199), holds the two handoff rows, then records one final
  // teardown-side value on the first inactive row.
  const updates = age < 200 ? age : age < ICE_BEAM_FIRST_INACTIVE_AGE ? 199 : 200;
  for (let tick = 0; tick < updates; tick += 1) value = advanceRngValue(value);
  return value;
}

function spriteKey(sprite: IceBeamSprite): IceBeamSpriteOrderKey {
  // `SortSprites` compares the signed OAM top coordinate.  The center-to-
  // corner offset is template-owned and is applied after x2/y2 translation.
  const centerToCornerY = sprite.kind === "palette"
    ? -96
    : sprite.template === "gIceBeamInnerCrystalSpriteTemplate"
      || sprite.template === "gIceCrystalHitLargeSpriteTemplate" ? -8 : -4;
  return {
    slot: sprite.slot, priority: sprite.priority, subpriority: sprite.subpriority,
    y: sprite.y + sprite.y2 + centerToCornerY,
  };
}

function ownedSprites(age: number, profile: Readonly<IceBeamAnimationProfile>, events: readonly Event[]): IceBeamSprite[] {
  const activeEvents = events.filter((event) => event.birthAge <= age && event.endAge >= age);
  const matrixBySlot = matrixTableAt(age, events);
  return activeEvents.map((event) =>
    event.kind === "beam" ? makeBeamSprite(event, age, profile)
      : event.kind === "impact" ? makeImpactSprite(event, age, profile)
        : paletteSprite(event, age, profile)).map((sprite) => ({
          ...sprite,
          matrix: matrixBySlot[sprite.matrixNum] ?? IDENTITY,
        })).sort((left, right) => left.slot - right.slot);
}

function sourceOrderAt(age: number, profile: Readonly<IceBeamAnimationProfile>, sprites: readonly IceBeamSprite[], prior: readonly number[]): readonly number[] {
  const keys = new Map<number, IceBeamSpriteOrderKey>([
    ...DEFAULT_STATIC_KEYS.map((key) => [key.slot, key] as const),
    ...(profile.spriteOrder?.initialKeys ?? []).map((key) => [key.slot, key] as const),
  ]);
  const own = new Map(sprites.map((sprite) => [sprite.slot, spriteKey(sprite)]));
  const all = Array.from({ length: 64 }, (_, slot) => own.get(slot) ?? keys.get(slot) ?? { slot, priority: 3 as const, subpriority: 255, y: -96 });
  return age === 0 ? prior : sortGbaSpriteOrder(prior, all);
}

function frameAt(age: number, profile: Readonly<IceBeamAnimationProfile>, events: readonly Event[], priorOrder: readonly number[]): IceBeamFrame {
  const sprites = ownedSprites(age, profile, events);
  const sound = soundTask(age, profile);
  const monbg = monbgTask(age, profile);
  const shake = shakeTask(age, profile);
  const clear = clearTask(age, profile);
  const tasks = [sound, monbg, shake, clear].filter((task): task is IceBeamTask => task !== null).sort((left, right) => left.slot - right.slot);
  const source = sourceCursor(age, profile);
  const order = sourceOrderAt(age, profile, sprites, priorOrder);
  const ownSlots = new Set(sprites.map((sprite) => sprite.slot));
  const player = sideFor(profile) === "player";
  const targetX2 = sourceShake(age);
  const displayedHofs = registersAt(age, profile)[player ? "bg1hofs" : "bg2hofs"];
  const programs = paletteProgramsAt(age);
  const loopPlayAges = [26, 36, 46, 56] as const;
  const impactStarts = IMPACT_AGES.map((impactAge) => ({ age: impactAge, song: ICE_BEAM_IMPACT_SONG, pan: player ? 63 : -63 }));
  const animationRng = animationRngAt(age, profile);
  const active = age < profile.endAge;
  const registers = registersAt(age, profile);
  return {
    age, active, source, sprites, matrices: matrixTableAt(age, events), tasks,
    visualTaskCount: sprites.length + (shake ? 1 : 0), soundTaskCount: sound ? 1 : 0,
    targetMonbg: { taskActive: monbg !== null, layer: player ? 1 : 2, targetX2, targetY2: 0,
      displayedHofs, displayAge: age, hardwareLagRows: 1, sourceCallbackRange: [38, 86], displayCallbackRange: [39, 87] },
    registers,
    palette: { programs, selectedSelectors: programs.filter((program) => program.active).map((program) => program.selector),
      hardwareTransfer: age === 0 || age === 1 ? "pre-animation" : "preceding-software-faded", hardwareLagRows: 1,
      softwareAge: age, hardwareAge: Math.max(0, age - 1) },
    audio: { loop: { songId: 183, song: ICE_BEAM_LOOP_SONG, active: sound !== null, pan: sound?.data[11] ?? 0,
      playAges: loopPlayAges, startThisRow: loopPlayAges.includes(age as typeof loopPlayAges[number]) }, impactStarts },
    resources: { tileTag: ICE_BEAM_TILE_TAG, paletteTag: ICE_BEAM_TILE_TAG, paletteSlot: ICE_BEAM_PALETTE_SLOT,
      tileBytes: ICE_BEAM_TILE_BYTES, loaded: age >= 4 && age < profile.endAge, freed: age >= profile.endAge },
    order: { fullSourceOrder: [...order], fullPainterOrder: [...order].reverse(),
      sourceOrder: order.filter((slot) => ownSlots.has(slot)), painterOrder: order.filter((slot) => ownSlots.has(slot)).reverse() },
    animationRng, animationRngTransition: { previous: age > 0 ? animationRngAt(age - 1, profile) : null, next: age < profile.endAge ? animationRng : null },
    gameplay: { rng: profile.gameplayRng, immutableState: profile.immutableGameplayState ?? null, changed: false },
    cleanup: { firstInactive: age === profile.endAge, activeSprites: sprites.length, activeTasks: tasks.length, resourcesFreed: age >= profile.endAge },
  };
}

const TIMELINE_CACHE = new WeakMap<Readonly<IceBeamAnimationProfile>, IceBeamTimeline>();

export function iceBeamTimeline(profile: Readonly<IceBeamAnimationProfile>): IceBeamTimeline {
  const cached = TIMELINE_CACHE.get(profile);
  if (cached) return cached;
  assertProfile(profile);
  const events = allocateEvents(profile);
  let order = [...(profile.spriteOrder?.initialOrder ?? INITIAL_ORDER)];
  const frames: IceBeamFrame[] = [];
  for (let age = 0; age <= profile.endAge; age += 1) {
    const frame = frameAt(age, profile, events, order);
    frames.push(frame);
    order = [...frame.order.fullSourceOrder];
  }
  const timeline = { frames, endAge: profile.endAge };
  TIMELINE_CACHE.set(profile, timeline);
  return timeline;
}

export function iceBeamAtAge(age: number, profile: Readonly<IceBeamAnimationProfile>): IceBeamFrame {
  if (!Number.isInteger(age) || age < 0 || age > profile.endAge) throw new Error("Ice Beam age out of range");
  return iceBeamTimeline(profile).frames[age]!;
}

/** Convenient source-shaped defaults; no species or retained evidence is consulted. */
export function iceBeamProfileFor(orientation: IceBeamOrientation, overrides: Partial<IceBeamAnimationProfile> = {}): IceBeamAnimationProfile {
  const player = orientation === "player-back";
  return {
    orientation, endAge: ICE_BEAM_FIRST_INACTIVE_AGE,
    geometry: player
      ? { attackerPictureOffset: { x: 72, y: 104 }, targetPictureOffset: { x: 176, y: 49 }, targetCenter: { x: 176, y: 49 }, monbgBaseHofs: 368, monbgBaseVofs: 495 }
      : { attackerPictureOffset: { x: 176, y: 58 }, targetPictureOffset: { x: 72, y: 99 }, targetCenter: { x: 72, y: 99 }, monbgBaseHofs: 472, monbgBaseVofs: 453 },
    animationRngStart: player ? 689912548 : 1968892309,
    gameplayRng: player ? 2332666876 : 430046908,
    ...overrides,
  };
}

export { sourceShake as iceBeamSourceShakeAtAge };
