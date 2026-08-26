/**
 * Source-relative reducer for only MOVE_ERUPTION's paired
 * `AnimTask_HorizontalShake` calls.
 *
 * The Eruption script creates a platform task followed by an all-visible-
 * battlers task. This module deliberately owns neither the falling/launch
 * rocks, palette, audio, scene seam, nor a framebuffer. Callers provide the
 * ordinary live geometry, task slots, allocator lifetime, and RNG snapshots;
 * no species, set, trace, or absolute-frame identity selects a branch.
 */

export type EruptionHorizontalShakeOrientation = "player-back" | "opponent-front";
export type EruptionShakeBattlerSide = "player" | "opponent";
export type EruptionHorizontalShakeTaskState = 0 | 1 | 2;

export const ERUPTION_HORIZONTAL_SHAKE_SOURCE_BASE = 0x082c_e30b;
export const ERUPTION_HORIZONTAL_SHAKE_SOURCE_OFFSET = 187;
export const ERUPTION_HORIZONTAL_SHAKE_PLATFORM_ARGS = [5, 8, 60] as const;
export const ERUPTION_HORIZONTAL_SHAKE_BATTLER_ARGS = [4, 8, 60] as const;
/** `gBattleAnimArgs` after the script has issued both task commands. */
export const ERUPTION_HORIZONTAL_SHAKE_CAPTURED_ARGS = [4, 8, 60, 70, 1, 0, 0, 0] as const;
export const ERUPTION_HORIZONTAL_SHAKE_INTENSITY = 8;
export const ERUPTION_HORIZONTAL_SHAKE_DURATION = 60;
export const ERUPTION_HORIZONTAL_SHAKE_INITIAL_OFFSET = 11;
export const ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS = 200;
export const ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG = 10201;

export interface EruptionHorizontalShakeBattlerGeometry {
  /** Battle battler id passed through `IsBattlerSpriteVisible`. */
  readonly battlerId: number;
  readonly side: EruptionShakeBattlerSide;
  readonly spriteSlot: number;
  /** Source `sprite->x/y` are not changed by this task. */
  readonly x: number;
  readonly y: number;
  /** Pre-task offsets. The first task callback only increments `data[1]`. */
  readonly initialX2: number;
  readonly initialY2: number;
}

export interface EruptionHorizontalShakeResourceSnapshot {
  readonly tileTag: number;
  readonly paletteTag: number;
  readonly tileRangeBeforeLoad: readonly [number, number];
  readonly tileRange: readonly [number, number];
  readonly paletteSlot: number;
  readonly loadedAge: number;
  readonly freedAge: number;
}

export interface EruptionHorizontalShakeProfile {
  readonly orientation: EruptionHorizontalShakeOrientation;
  /** Last captured source age before the commands create the two tasks. */
  readonly taskCreationAge: number;
  /** Complete retained-window age, inclusive. */
  readonly endAge: number;
  readonly platformTaskSlot: number;
  readonly battlerTaskSlot: number;
  readonly platformInitialX: number;
  /** `AnimTask_ShakeBattlers` copies exactly these visible sprite ids. */
  readonly battlers: readonly [
    EruptionHorizontalShakeBattlerGeometry,
    EruptionHorizontalShakeBattlerGeometry,
  ];
  /** Global animation RNG is observed, but this task consumes none of it. */
  readonly startingAnimationRng: number;
  /** Gameplay RNG is a pass-through invariant for this presentation task. */
  readonly gameplayRng: number;
  readonly resources: EruptionHorizontalShakeResourceSnapshot;
}

export interface EruptionHorizontalShakeSource {
  readonly owner: "Move_ERUPTION";
  readonly command: "AnimTask_HorizontalShake";
  readonly offset: 187;
  readonly pointer: number;
  readonly pointerParity: 0;
  /** The two source literals are issued in this source order. */
  readonly platformArgs: readonly [5, 8, 60];
  readonly battlerArgs: readonly [4, 8, 60];
  /** Live `gBattleAnimArgs` on the first observable callback row. */
  readonly capturedArgs: readonly [4, 8, 60, 70, 1, 0, 0, 0];
  readonly firstCallbackAge: number;
}

export interface EruptionHorizontalShakeTask {
  readonly slot: number;
  readonly sourcePriority: 5;
  readonly callback: "AnimTask_ShakePlatforms" | "AnimTask_ShakeBattlers";
  readonly data: readonly [
    EruptionHorizontalShakeTaskState, number, number, 60,
    number, number, number, number,
    number, number, number, number,
    number, number, number, 11,
  ];
}

export interface EruptionHorizontalShakeBattlerState {
  readonly battlerId: number;
  readonly side: EruptionShakeBattlerSide;
  readonly spriteSlot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  /** `BuildOamBuffer` sees the task-owned source x2 one callback later. */
  readonly displayedOamX2: number;
  /** Hardware OAM subsequently receives the preceding software OAM row. */
  readonly hardwareOamX2: number;
}

export interface EruptionHorizontalShakeFrame {
  readonly age: number;
  readonly localAge: number;
  readonly source: EruptionHorizontalShakeSource;
  readonly platformTask: EruptionHorizontalShakeTask | null;
  readonly battlerTask: EruptionHorizontalShakeTask | null;
  readonly battlers: readonly EruptionHorizontalShakeBattlerState[];
  readonly platform: Readonly<{
    /** RAM `gBattle_BG3_X` after this callback. */
    readonly sourceX: number;
    /** The BG3 hardware register receives the preceding RAM row. */
    readonly displayedX: number;
  }>;
  readonly lifecycle: Readonly<{
    readonly created: boolean;
    readonly active: boolean;
    readonly firstInactive: boolean;
    readonly destroyed: boolean;
    readonly callbackRows: number;
    readonly ownedVisualTaskCount: 0 | 2;
  }>;
  readonly rng: Readonly<{
    readonly animation: number;
    readonly animationPrevious: number | null;
    readonly animationNext: number | null;
    readonly gameplay: number;
    readonly animationConsumedByTask: false;
    readonly gameplayConsumedByTask: false;
  }>;
  readonly resources: Readonly<{
    readonly tileTag: number;
    readonly paletteTag: number;
    readonly tileRange: readonly [number, number];
    readonly paletteSlot: number;
    readonly tileAllocationRetained: boolean;
    readonly paletteAllocationRetained: boolean;
    readonly passedThroughWithoutTaskAllocation: true;
  }>;
}

interface ShakeCore {
  readonly state: EruptionHorizontalShakeTaskState;
  readonly delay: number;
  readonly timer: number;
  readonly horizontalOffset: number;
  readonly platformDelta: number;
  readonly battlerX2: number;
}

function assertProfile(profile: Readonly<EruptionHorizontalShakeProfile>): void {
  const { resources } = profile;
  if (!Number.isInteger(profile.taskCreationAge)
    || !Number.isInteger(profile.endAge)
    || profile.endAge < profile.taskCreationAge
    || !Number.isInteger(profile.platformTaskSlot)
    || !Number.isInteger(profile.battlerTaskSlot)
    || profile.platformTaskSlot === profile.battlerTaskSlot
    || profile.battlers.length !== 2
    || new Set(profile.battlers.map(({ battlerId }) => battlerId)).size !== 2
    || new Set(profile.battlers.map(({ spriteSlot }) => spriteSlot)).size !== 2
    || resources.tileTag !== ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG
    || resources.paletteTag !== ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG
    || resources.tileRange.length !== 2
    || resources.tileRangeBeforeLoad.length !== 2
    || resources.paletteSlot < 0
    || resources.paletteSlot >= 16
    || resources.loadedAge < 0
    || resources.freedAge <= resources.loadedAge) {
    throw new Error("invalid Eruption horizontal-shake component profile");
  }
}

function animationRngAtAge(starting: number, age: number): number {
  let value = starting >>> 0;
  for (let index = 0; index < age; index += 1) {
    value = (Math.imul(value, 0x41c64e6d) + 0x6073) >>> 0;
  }
  return value;
}

/** State immediately after `callbacks` calls into either source callback. */
function coreAfterCallbacks(callbacks: number): ShakeCore {
  let state: EruptionHorizontalShakeTaskState = 0;
  let delay = 0;
  let timer = 0;
  let horizontalOffset = ERUPTION_HORIZONTAL_SHAKE_INITIAL_OFFSET;
  let platformDelta = 0;
  let battlerX2 = 0;
  for (let callback = 1; callback <= callbacks; callback += 1) {
    if (state === 2) break;
    delay += 1;
    if (delay <= 1) continue;
    delay = 0;
    platformDelta = (timer & 1) === 0 ? horizontalOffset : -horizontalOffset;
    battlerX2 = (timer & 1) === 0
      ? Math.floor((horizontalOffset + 1) / 2)
      : (-Math.floor(horizontalOffset / 2) || 0);
    timer += 1;
    if ((state === 0 && timer === ERUPTION_HORIZONTAL_SHAKE_DURATION)
      || (state === 1 && timer === 4)) {
      timer = 0;
      horizontalOffset -= 1;
      state = 1;
      if (horizontalOffset === 0) state = 2;
    }
  }
  return { state, delay, timer, horizontalOffset, platformDelta, battlerX2 };
}

function taskData(
  core: ShakeCore,
  kind: "platform" | "battlers",
  profile: Readonly<EruptionHorizontalShakeProfile>,
): EruptionHorizontalShakeTask["data"] {
  if (kind === "platform") {
    return [
      core.state, core.delay, core.timer, ERUPTION_HORIZONTAL_SHAKE_DURATION,
      0, 0, 0, 0, 0, 0, 0, 0, 0, profile.platformInitialX,
      core.horizontalOffset, ERUPTION_HORIZONTAL_SHAKE_INITIAL_OFFSET,
    ];
  }
  return [
    core.state, core.delay, core.timer, ERUPTION_HORIZONTAL_SHAKE_DURATION,
    0, 0, 0, 0, 0,
    profile.battlers[0].spriteSlot, profile.battlers[1].spriteSlot,
    0, 0, profile.battlers.length,
    core.horizontalOffset, ERUPTION_HORIZONTAL_SHAKE_INITIAL_OFFSET,
  ];
}

function sourceBattlerX2(
  localAge: number,
  geometry: Readonly<EruptionHorizontalShakeBattlerGeometry>,
): number {
  // Callback one only changes the task delay. It does not call
  // SetBattlersXOffsetForShake yet, so the source sprite retains its own x2.
  if (localAge <= 1) return geometry.initialX2;
  if (localAge <= ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS) return coreAfterCallbacks(localAge).battlerX2;
  // `case 2` clears every copied visible sprite before destroying the task.
  return 0;
}

function sourcePlatformX(localAge: number, initialX: number): number {
  if (localAge <= 0) return initialX;
  if (localAge <= ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS) return initialX + coreAfterCallbacks(localAge).platformDelta;
  // `AnimTask_ShakePlatforms` restores the initial scroll in case 2.
  return initialX;
}

function resourcesAtAge(
  age: number,
  profile: Readonly<EruptionHorizontalShakeProfile>,
): EruptionHorizontalShakeFrame["resources"] {
  const { resources } = profile;
  const retained = age >= resources.loadedAge && age < resources.freedAge;
  return {
    tileTag: resources.tileTag,
    paletteTag: resources.paletteTag,
    tileRange: (age < resources.loadedAge ? resources.tileRangeBeforeLoad : resources.tileRange) as readonly [number, number],
    paletteSlot: resources.paletteSlot,
    tileAllocationRetained: retained,
    paletteAllocationRetained: retained,
    passedThroughWithoutTaskAllocation: true,
  };
}

/**
 * Replay one retained source-relative row. `taskCreationAge` is intentionally
 * the final captured row before the script creates both tasks: the first
 * observable task row has local age one after `RunTasks` calls its callback.
 */
export function eruptionHorizontalShakeAtAge(
  age: number,
  profile: Readonly<EruptionHorizontalShakeProfile>,
): EruptionHorizontalShakeFrame {
  assertProfile(profile);
  if (!Number.isInteger(age) || age < 0 || age > profile.endAge) {
    throw new Error("invalid Eruption horizontal-shake source age");
  }
  const localAge = age - profile.taskCreationAge;
  const active = localAge >= 1 && localAge <= ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS;
  const core = coreAfterCallbacks(Math.max(0, Math.min(localAge, ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS)));
  const source: EruptionHorizontalShakeSource = {
    owner: "Move_ERUPTION",
    command: "AnimTask_HorizontalShake",
    offset: ERUPTION_HORIZONTAL_SHAKE_SOURCE_OFFSET,
    pointer: ERUPTION_HORIZONTAL_SHAKE_SOURCE_BASE + ERUPTION_HORIZONTAL_SHAKE_SOURCE_OFFSET,
    pointerParity: 0,
    platformArgs: ERUPTION_HORIZONTAL_SHAKE_PLATFORM_ARGS,
    battlerArgs: ERUPTION_HORIZONTAL_SHAKE_BATTLER_ARGS,
    capturedArgs: ERUPTION_HORIZONTAL_SHAKE_CAPTURED_ARGS,
    firstCallbackAge: profile.taskCreationAge + 1,
  };
  const priorLocalAge = localAge - 1;
  const battlers = profile.battlers.map((geometry) => ({
    battlerId: geometry.battlerId,
    side: geometry.side,
    spriteSlot: geometry.spriteSlot,
    x: geometry.x,
    y: geometry.y,
    x2: sourceBattlerX2(localAge, geometry),
    y2: geometry.initialY2,
    displayedOamX2: sourceBattlerX2(priorLocalAge, geometry),
    hardwareOamX2: sourceBattlerX2(priorLocalAge - 1, geometry),
  }));
  const animation = animationRngAtAge(profile.startingAnimationRng, age);
  return {
    age,
    localAge,
    source,
    platformTask: active ? {
      slot: profile.platformTaskSlot,
      sourcePriority: 5,
      callback: "AnimTask_ShakePlatforms",
      data: taskData(core, "platform", profile),
    } : null,
    battlerTask: active ? {
      slot: profile.battlerTaskSlot,
      sourcePriority: 5,
      callback: "AnimTask_ShakeBattlers",
      data: taskData(core, "battlers", profile),
    } : null,
    battlers,
    platform: {
      sourceX: sourcePlatformX(localAge, profile.platformInitialX),
      displayedX: sourcePlatformX(priorLocalAge, profile.platformInitialX),
    },
    lifecycle: {
      created: localAge === 0,
      active,
      firstInactive: localAge === ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS + 1,
      destroyed: localAge >= ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS + 1,
      callbackRows: Math.max(0, Math.min(localAge, ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS)),
      ownedVisualTaskCount: active ? 2 : 0,
    },
    rng: {
      animation,
      animationPrevious: age > 0 ? animationRngAtAge(profile.startingAnimationRng, age - 1) : null,
      animationNext: age < profile.endAge ? animationRngAtAge(profile.startingAnimationRng, age + 1) : null,
      gameplay: profile.gameplayRng,
      animationConsumedByTask: false,
      gameplayConsumedByTask: false,
    },
    resources: resourcesAtAge(age, profile),
  };
}

/** Replay the full caller-provided source window through the first cleanup. */
export function eruptionHorizontalShakeTimeline(
  profile: Readonly<EruptionHorizontalShakeProfile>,
): readonly EruptionHorizontalShakeFrame[] {
  assertProfile(profile);
  return Array.from({ length: profile.endAge + 1 }, (_, age) => eruptionHorizontalShakeAtAge(age, profile));
}
