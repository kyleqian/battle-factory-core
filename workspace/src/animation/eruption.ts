/**
 * Source-relative composition of Move_ERUPTION's already audited visual
 * components.
 *
 * This reducer is deliberately a presentation seam, not a battle effect. It
 * owns the source cursor, visual task/sprite/resource lifetime, animation RNG
 * observation, and the Eruption-specific loopsewithpan program. Gameplay
 * state, damage, turn order, and the framebuffer stay outside this module.
 */

import {
  eruptionAudioAtAge,
  type EruptionAudioFrame,
  type EruptionAudioProfile,
} from "./eruptionAudio.ts";
import {
  eruptionFallingRockAtAge,
  type EruptionFallingRockFrame,
  type EruptionFallingRockProfile,
  type EruptionFallingRockSpriteState,
} from "./eruptionFallingRock.ts";
import {
  eruptionHorizontalShakeAtAge,
  type EruptionHorizontalShakeFrame,
  type EruptionHorizontalShakeProfile,
} from "./eruptionHorizontalShake.ts";
import {
  eruptionLaunchAtAge,
  type EruptionLaunchFrame,
  type EruptionLaunchProfile,
  type EruptionLaunchRockState,
} from "./eruptionLaunch.ts";
import {
  eruptionPaletteAtAge,
  type EruptionPaletteState,
  type EruptionPaletteProfile,
  type EruptionSimplePaletteSprite,
} from "./eruptionPalette.ts";
import { sortGbaSpriteOrder } from "./gbaObjCompositor.ts";

export type EruptionOrientation = "player-back" | "opponent-front";

export interface EruptionSpriteOrderKey {
  readonly slot: number;
  readonly priority: 0 | 1 | 2 | 3;
  readonly subpriority: number;
  /** Signed OAM top coordinate used by SortSprites. */
  readonly y: number;
}

/**
 * The live pre-animation sSpriteOrder and keys are ordinary scene inputs.
 * Supplying them lets the reduced compositor seam retain stable equal-key
 * ordering without baking a per-age order table into the reducer.
 */
export interface EruptionSpriteOrderProfile {
  readonly initialOrder?: readonly number[];
  readonly initialKeys?: readonly EruptionSpriteOrderKey[];
}

export interface EruptionAnimationProfile {
  readonly orientation: EruptionOrientation;
  readonly endAge: number;
  readonly launch: Readonly<EruptionLaunchProfile>;
  readonly falling: Readonly<EruptionFallingRockProfile>;
  readonly horizontalShake: Readonly<EruptionHorizontalShakeProfile>;
  readonly palette: Readonly<EruptionPaletteProfile>;
  readonly audio: Readonly<EruptionAudioProfile>;
  readonly gameplayRng: number;
  /** Immutable caller-owned battle snapshot; never read to choose a branch. */
  readonly immutableGameplayState?: unknown;
  readonly spriteOrder?: Readonly<EruptionSpriteOrderProfile>;
}

export interface EruptionSourceCursor {
  readonly owner: "Move_ERUPTION";
  readonly command:
    | "script_bootstrap"
    | "script_delay"
    | "simple_palette_blend"
    | "AnimTask_EruptionLaunchRocks"
    | "createsprite"
    | "AnimTask_HorizontalShake";
  readonly offset: number;
  readonly pointer: number;
  readonly pointerParity: 0 | 1;
  readonly wait: number;
  readonly args: readonly number[];
  readonly active: boolean;
}

export type EruptionLaunchSprite = EruptionLaunchRockState & { readonly kind: "launch" };
export type EruptionFallingSprite = EruptionFallingRockSpriteState & { readonly kind: "falling" };
export type EruptionPaletteSprite = EruptionSimplePaletteSprite & { readonly kind: "palette" };
export type EruptionSprite = EruptionLaunchSprite | EruptionFallingSprite | EruptionPaletteSprite;

export interface EruptionTask {
  readonly kind: "launch" | "wait-play-se" | "platform-shake" | "battler-shake" | "loop-play-se";
  readonly slot: number;
  readonly priority: number;
  readonly callback: string;
  readonly data: readonly number[];
}

export interface EruptionPalettePrograms {
  readonly opening: Readonly<{
    readonly active: boolean;
    readonly source: EruptionPaletteState["source"];
    readonly coefficient: number;
  }>;
  readonly closing: Readonly<{
    readonly active: boolean;
    readonly source: EruptionPaletteState["source"];
    readonly coefficient: number;
  }>;
}

export interface EruptionFrame {
  readonly age: number;
  readonly active: boolean;
  readonly source: EruptionSourceCursor;
  readonly launch: EruptionLaunchFrame;
  readonly falling: EruptionFallingRockFrame;
  readonly horizontalShake: EruptionHorizontalShakeFrame;
  readonly palette: EruptionPaletteState;
  readonly audio: EruptionAudioFrame;
  readonly sprites: readonly EruptionSprite[];
  readonly tasks: readonly EruptionTask[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly allocator: Readonly<{
    readonly tileTag: number;
    readonly tileRange: readonly [number, number];
    readonly tileAllocationRetained: boolean;
    readonly paletteTag: number;
    readonly paletteSlot: number;
    readonly paletteAllocationRetained: boolean;
    readonly launchScanOrder: readonly number[];
    readonly fallingScanOrder: readonly number[];
    readonly paletteSlotByProgram: Readonly<{ readonly opening: number; readonly closing: number }>;
  }>;
  readonly order: Readonly<{
    /** Complete source sSpriteOrder, including the two live battlers. */
    readonly fullSourceOrder: readonly number[];
    /** Complete back-to-front software painter order. */
    readonly fullPainterOrder: readonly number[];
    /** Source sSpriteOrder, restricted to Eruption-owned live objects. */
    readonly sourceOrder: readonly number[];
    /** Back-to-front software painter order. */
    readonly painterOrder: readonly number[];
  }>;
  readonly palettePrograms: EruptionPalettePrograms;
  readonly resources: Readonly<{
    readonly tile: Readonly<{ readonly tag: number; readonly retained: boolean }>;
    readonly palette: Readonly<{ readonly tag: number; readonly slot: number; readonly retained: boolean }>;
    readonly freed: boolean;
  }>;
  readonly animationRng: number;
  readonly animationRngTransition: Readonly<{ readonly previous: number | null; readonly next: number | null }>;
  readonly gameplay: Readonly<{
    readonly rng: number;
    readonly immutableState: unknown;
    readonly changed: false;
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly activeSprites: number;
    readonly activeTasks: number;
    readonly resourcesFreed: boolean;
  }>;
}

export interface EruptionTimeline {
  readonly frames: readonly EruptionFrame[];
  readonly endAge: number;
}

// A presentation config retains one immutable profile for its whole move.
// Cache only the pure source-derived reducer output so dense framebuffer
// verification does not replay the same 476/494-row state machine per pixel
// row. No oracle/framebuffer bytes enter this cache.
const TIMELINE_CACHE = new WeakMap<Readonly<EruptionAnimationProfile>, EruptionTimeline>();

const SOURCE_BASE = 0x082c_e30b;
const OPENING_ARGS = [31, 2, 0, 4, 31, 0, 0, 0] as const;
const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const DUMMY_KEY: EruptionSpriteOrderKey = { slot: 0, priority: 3, subpriority: 0xff, y: -96 };

function assertProfile(profile: Readonly<EruptionAnimationProfile>): void {
  if (!Number.isInteger(profile.endAge) || profile.endAge < 0
    || profile.launch.endAge !== profile.endAge
    || profile.falling.endAge !== profile.endAge
    || profile.horizontalShake.endAge !== profile.endAge
    || profile.audio.endAge !== profile.endAge
    || profile.palette.cleanupAge !== profile.endAge
    || profile.launch.side !== (profile.orientation === "player-back" ? "player" : "opponent")
    || profile.audio.attackerSide !== profile.launch.side) {
    throw new Error("invalid composed Eruption profile");
  }
  const values = [
    profile.launch.startingAnimationRng,
    profile.falling.startingAnimationRng,
    profile.horizontalShake.startingAnimationRng,
  ];
  if (new Set(values).size !== 1) throw new Error("Eruption component RNG seeds must agree");
  if (profile.spriteOrder?.initialOrder) {
    const order = profile.spriteOrder.initialOrder;
    if (order.length !== 64 || new Set(order).size !== 64 || order.some((slot) => slot < 0 || slot >= 64)) {
      throw new Error("Eruption sprite order must be a 64-slot permutation");
    }
  }
}

function cursor(
  command: EruptionSourceCursor["command"],
  offset: number,
  wait: number,
  args: readonly number[],
  active: boolean,
): EruptionSourceCursor {
  const pointer = SOURCE_BASE + offset;
  return {
    owner: "Move_ERUPTION",
    command,
    offset,
    pointer,
    pointerParity: (pointer & 1) as 0 | 1,
    wait,
    args: [...args],
    active,
  };
}

function sourceAtAge(
  age: number,
  profile: Readonly<EruptionAnimationProfile>,
  launch: Readonly<EruptionLaunchFrame>,
  falling: Readonly<EruptionFallingRockFrame>,
  palette: Readonly<EruptionPaletteState>,
): EruptionSourceCursor {
  const active = age < profile.endAge;
  if (age === 0) return cursor("script_bootstrap", 0, 0, ZERO_ARGS, active);
  if (age < 4) return cursor("script_delay", 3, age === 1 ? 1 : 0, ZERO_ARGS, active);
  if (age < profile.launch.waves[0].taskStartAge) {
    return cursor("simple_palette_blend", 20, palette.source?.wait ?? 1, OPENING_ARGS, active);
  }
  if (launch.source) {
    return cursor("AnimTask_EruptionLaunchRocks", launch.source.offset, launch.source.wait, OPENING_ARGS, active);
  }
  if (age < profile.launch.waves[1].taskStartAge) {
    return cursor("AnimTask_EruptionLaunchRocks", profile.launch.waves[0].sourceOffset, 1, OPENING_ARGS, active);
  }
  // The second launch task's final callback is followed by one retained
  // command row before the script's wait-30 tail advances to offset 49.
  // The source-created falling-rock command begins 32 rows later.
  const postLaunchCursorAge = profile.falling.creationAge - 32;
  if (age < postLaunchCursorAge) {
    return cursor("AnimTask_EruptionLaunchRocks", profile.launch.waves[1].sourceOffset, 1, OPENING_ARGS, active);
  }
  if (age < profile.falling.creationAge) {
    return cursor("script_delay", 49, Math.max(0, profile.falling.creationAge - age - 2), OPENING_ARGS, active);
  }
  if (falling.source) {
    const command = falling.source.offset === 153
      ? "createsprite"
      : falling.source.offset === 187 ? "AnimTask_HorizontalShake" : "simple_palette_blend";
    return cursor(command, falling.source.offset, falling.source.wait, falling.source.args, active);
  }
  if (palette.source?.command === "closing") {
    return cursor("simple_palette_blend", 204, 1, [31, 4, 4, 0, 31, 0, 0, 0], active);
  }
  return cursor("script_delay", 49, 0, OPENING_ARGS, active);
}

function waitAndPlayTask(
  age: number,
  profile: Readonly<EruptionAnimationProfile>,
): EruptionTask | null {
  const wave = profile.launch.waves.find((candidate) =>
    age >= candidate.taskStartAge && age <= candidate.companionTaskEndAge);
  if (!wave) return null;
  const localAge = age - wave.taskStartAge;
  const pan = profile.launch.side === "player" ? -64 : 63;
  return {
    kind: "wait-play-se",
    slot: wave.companionTaskSlot,
    priority: 0xfe,
    callback: "Task_WaitAndPlaySE",
    data: [178, pan, Math.max(0, 59 - localAge), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

function tasksAtAge(
  age: number,
  profile: Readonly<EruptionAnimationProfile>,
  launch: Readonly<EruptionLaunchFrame>,
  shake: Readonly<EruptionHorizontalShakeFrame>,
  audio: Readonly<EruptionAudioFrame>,
): readonly EruptionTask[] {
  const tasks: EruptionTask[] = [];
  if (launch.task) tasks.push({
    kind: "launch", slot: launch.task.slot, priority: launch.task.priority,
    callback: launch.task.func, data: [...launch.task.data],
  });
  const wait = waitAndPlayTask(age, profile);
  if (wait) tasks.push(wait);
  if (shake.platformTask) tasks.push({
    // The platform task's linked-list predecessor changes to LIST_END when
    // the loopsewithpan task leaves the list; the callback/data stay intact.
    kind: "platform-shake", slot: shake.platformTask.slot, priority: audio.task ? 2 : 0xfe,
    callback: shake.platformTask.callback, data: [...shake.platformTask.data],
  });
  if (shake.battlerTask) tasks.push({
    kind: "battler-shake", slot: shake.battlerTask.slot, priority: 0,
    callback: shake.battlerTask.callback, data: [...shake.battlerTask.data],
  });
  if (audio.task) tasks.push({
    kind: "loop-play-se", slot: audio.task.slot, priority: audio.task.priority,
    callback: audio.task.callback, data: [...audio.task.data],
  });
  return tasks.sort((left, right) => left.slot - right.slot);
}

function spriteKey(sprite: Readonly<EruptionSprite>): EruptionSpriteOrderKey {
  if (sprite.kind === "launch") {
    return { slot: sprite.slot, priority: 2, subpriority: sprite.subpriority, y: signedY(sprite.attr[0]!) };
  }
  if (sprite.kind === "falling") {
    return { slot: sprite.slot, priority: sprite.oamPriority as 0 | 1 | 2 | 3, subpriority: sprite.subpriority, y: signedY(sprite.attr[0]!) };
  }
  return { slot: sprite.slot, priority: 3, subpriority: sprite.subpriority, y: signedY(sprite.attr[0]!) };
}

function signedY(value: number): number {
  const byte = value & 0xff;
  return byte >= 160 ? byte - 256 : byte;
}

function ownedSprites(
  launch: Readonly<EruptionLaunchFrame>,
  falling: Readonly<EruptionFallingRockFrame>,
  palette: Readonly<EruptionPaletteState>,
): readonly EruptionSprite[] {
  return [
    ...launch.sprites.map((sprite) => ({ ...sprite, kind: "launch" as const })),
    ...falling.sprites.map((sprite) => ({ ...sprite, kind: "falling" as const })),
    ...(palette.sprite ? [{ ...palette.sprite, kind: "palette" as const }] : []),
  ].sort((left, right) => left.slot - right.slot);
}

function nextOrder(
  prior: readonly number[],
  sprites: readonly EruptionSprite[],
  profile: Readonly<EruptionAnimationProfile>,
): number[] {
  const keys = new Map<number, EruptionSpriteOrderKey>(
    (profile.spriteOrder?.initialKeys ?? []).map((key) => [key.slot, key]),
  );
  const owned = new Map(sprites.map((sprite) => [sprite.slot, spriteKey(sprite)]));
  const allKeys = Array.from({ length: 64 }, (_, slot) => owned.get(slot) ?? keys.get(slot) ?? { ...DUMMY_KEY, slot });
  return sortGbaSpriteOrder(prior, allKeys as readonly { readonly slot: number; readonly priority: 0 | 1 | 2 | 3; readonly subpriority: number; readonly y: number }[]);
}

function frameAtAge(
  age: number,
  profile: Readonly<EruptionAnimationProfile>,
  launch: Readonly<EruptionLaunchFrame>,
  falling: Readonly<EruptionFallingRockFrame>,
  shake: Readonly<EruptionHorizontalShakeFrame>,
  palette: Readonly<EruptionPaletteState>,
  audio: Readonly<EruptionAudioFrame>,
  order: readonly number[],
): EruptionFrame {
  const sprites = ownedSprites(launch, falling, palette);
  const tasks = tasksAtAge(age, profile, launch, shake, audio);
  const fallingSprites = falling.sprites.length;
  const paletteSprites = palette.sprite ? 1 : 0;
  const waitTask = waitAndPlayTask(age, profile);
  const source = sourceAtAge(age, profile, launch, falling, palette);
  const ownedSlots = new Set(sprites.map((sprite) => sprite.slot));
  const sourceOrder = order.filter((slot) => ownedSlots.has(slot));
  const opening = age >= 4 && age < 19;
  const closing = age >= profile.palette.closingCommandAge && age < profile.palette.cleanupAge;
  const tileRetained = launch.resources.tileAllocationRetained;
  const paletteRetained = palette.resources.warmRockPaletteAllocated;
  const animationRng = launch.animationRng;
  return {
    age,
    active: age < profile.endAge,
    source,
    launch,
    falling,
    horizontalShake: shake,
    palette,
    audio,
    sprites,
    tasks,
    visualTaskCount: launch.visualTaskCount + fallingSprites + shake.lifecycle.ownedVisualTaskCount + paletteSprites,
    soundTaskCount: (waitTask ? 1 : 0) + audio.soundTaskCount,
    allocator: {
      tileTag: launch.resources.tileTag,
      tileRange: launch.resources.tileRange,
      tileAllocationRetained: tileRetained,
      paletteTag: palette.resources.warmRockPaletteTag,
      paletteSlot: palette.resources.warmRockPaletteSlot,
      paletteAllocationRetained: paletteRetained,
      launchScanOrder: [...launch.allocation.slots],
      fallingScanOrder: falling.sprites.map((sprite) => sprite.slot),
      paletteSlotByProgram: profile.palette.paletteSpriteSlots,
    },
    order: {
      fullSourceOrder: [...order],
      fullPainterOrder: [...order].reverse(),
      sourceOrder,
      painterOrder: [...sourceOrder].reverse(),
    },
    palettePrograms: {
      opening: { active: opening, source: opening ? palette.source : null, coefficient: opening ? palette.fade.coefficient : 0 },
      closing: { active: closing, source: closing ? palette.source : null, coefficient: closing ? palette.fade.coefficient : 0 },
    },
    resources: {
      tile: { tag: launch.resources.tileTag, retained: tileRetained },
      palette: { tag: palette.resources.warmRockPaletteTag, slot: palette.resources.warmRockPaletteSlot, retained: paletteRetained },
      freed: age >= profile.endAge,
    },
    animationRng,
    animationRngTransition: {
      previous: age > 0 ? launch.animationRngTransition.previous : null,
      next: age < profile.endAge ? launch.animationRngTransition.next : null,
    },
    gameplay: { rng: profile.gameplayRng, immutableState: profile.immutableGameplayState ?? null, changed: false },
    cleanup: {
      firstInactive: age === profile.endAge,
      activeSprites: sprites.length,
      activeTasks: tasks.length,
      resourcesFreed: age >= profile.endAge,
    },
  };
}

/** Replay all banked Eruption components through the retained cleanup row. */
export function eruptionTimeline(profile: Readonly<EruptionAnimationProfile>): EruptionTimeline {
  const cached = TIMELINE_CACHE.get(profile);
  if (cached) return cached;
  assertProfile(profile);
  const launch = Array.from({ length: profile.endAge + 1 }, (_, age) => eruptionLaunchAtAge(age, profile.launch));
  const fallingTimeline = Array.from({ length: profile.endAge + 1 }, (_, age) => eruptionFallingRockAtAge(age, profile.falling));
  const shake = Array.from({ length: profile.endAge + 1 }, (_, age) => eruptionHorizontalShakeAtAge(age, profile.horizontalShake));
  const palette = Array.from({ length: profile.endAge + 1 }, (_, age) => eruptionPaletteAtAge(age, profile.palette));
  const audio = Array.from({ length: profile.endAge + 1 }, (_, age) => eruptionAudioAtAge(age, profile.audio));
  let order = profile.spriteOrder?.initialOrder?.slice() ?? Array.from({ length: 64 }, (_, slot) => slot);
  const frames: EruptionFrame[] = [];
  for (let age = 0; age <= profile.endAge; age += 1) {
    const sprites = ownedSprites(launch[age]!, fallingTimeline[age]!, palette[age]!);
    if (age > 0) order = nextOrder(order, sprites, profile);
    frames.push(frameAtAge(age, profile, launch[age]!, fallingTimeline[age]!, shake[age]!, palette[age]!, audio[age]!, order));
  }
  const timeline = { frames, endAge: profile.endAge };
  TIMELINE_CACHE.set(profile, timeline);
  return timeline;
}

export function eruptionAtAge(age: number, profile: Readonly<EruptionAnimationProfile>): EruptionFrame {
  if (!Number.isInteger(age) || age < 0 || age > profile.endAge) throw new Error("Eruption age out of range");
  return eruptionTimeline(profile).frames[age]!;
}
