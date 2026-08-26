/**
 * Source-relative reducer for Move_ERUPTION's six
 * `gEruptionFallingRockSpriteTemplate` call sites.
 *
 * `AnimEruptionFallingRock` initializes a sprite and the sprite scheduler
 * immediately runs its first `_Step` callback in the creation frame. The
 * reducer keeps that creation-frame convention, the C callback's three
 * states, source cursor, allocator/resource observations, and the ordinary
 * one-row software-to-hardware OAM lag. It owns no task, shake, audio,
 * palette-fade, compositor, or gameplay state.
 */

export const ERUPTION_FALLING_ROCK_SOURCE_BASE = 0x082c_e30b;
export const ERUPTION_FALLING_ROCK_SOURCE_OFFSETS = {
  create: 153,
  horizontalShake: 187,
  closingPalette: 204,
} as const;

export const ERUPTION_FALLING_ROCK_TILE_OFFSETS = [0, 16, 32, 48, 0, 16] as const;
export const ERUPTION_FALLING_ROCK_WARM_ROCK_TAG = 10201;

type FallingRockCell = 0 | 1 | 2 | 3;
type FallingRockArgs = readonly [number, number, number, number, FallingRockCell, 0, 0, 0];

/** The six literal `createsprite` argument tuples in Move_ERUPTION. */
export const ERUPTION_FALLING_ROCK_SOURCE_CALLS = [
  [200, -32, 0, 100, 0, 0, 0, 0],
  [30, -32, 16, 90, 1, 0, 0, 0],
  [150, -32, 32, 60, 2, 0, 0, 0],
  [90, -32, 48, 80, 3, 0, 0, 0],
  [110, -32, 64, 50, 0, 0, 0, 0],
  [60, -32, 80, 70, 1, 0, 0, 0],
] as const satisfies readonly FallingRockArgs[];

const HORIZONTAL_SHAKE_ARGS = [4, 8, 60, 70, 1, 0, 0, 0] as const;
const CLOSING_PALETTE_ARGS = [31, 4, 4, 0, 31, 0, 0, 0] as const;
const SOURCE_CREATE_WAIT = 22;
const SOURCE_HORIZONTAL_WAIT = 80;
const SOURCE_HORIZONTAL_START = 24;
const SOURCE_HORIZONTAL_FINAL_ZERO = 105;
const OAM_HFLIP = 0x8000;
const OAM_PRIORITY = 2;
const DEFAULT_OAM_CENTER_OFFSET = 16;
const DEFAULT_SUBPRIORITY = 3;

export interface EruptionFallingRockGeometry {
  /** Sprite center to OAM top-left offset for the 32x32 template. */
  readonly oamCenterOffsetX: number;
  readonly oamCenterOffsetY: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly horizontalFlip: boolean;
}

export interface EruptionFallingRockAllocator {
  /** Inactive sprite slots in the allocator's exact scan order. */
  readonly freeSpriteSlots: readonly number[];
  readonly tileTag: number;
  readonly paletteTag: number;
  readonly tileRange: readonly [number, number];
  readonly tileRangeBeforeLoad: readonly [number, number];
  readonly paletteSlot: number;
  /** Source-relative resource ages, not absolute emulator frames. */
  readonly loadedAge: number;
  readonly freedAge: number | null;
}

export interface EruptionFallingRockSourcePhase {
  readonly offset: 153 | 187 | 204;
  readonly pointer: number;
  readonly pointerParity: 0 | 1;
  readonly wait: number;
  readonly args: readonly number[];
}

export interface EruptionFallingRockProfile {
  /** Source-relative age at which all six creates run. */
  readonly creationAge: number;
  /** Inclusive source-relative end of the retained observation window. */
  readonly endAge: number;
  readonly calls: readonly [
    FallingRockArgs,
    FallingRockArgs,
    FallingRockArgs,
    FallingRockArgs,
    FallingRockArgs,
    FallingRockArgs,
  ];
  readonly geometry: EruptionFallingRockGeometry;
  readonly allocator: EruptionFallingRockAllocator;
  /** Animation-only RNG is passed through; this component consumes none. */
  readonly startingAnimationRng: number;
}

export interface EruptionFallingRockSpriteState {
  readonly slot: number;
  readonly sourceOrderIndex: number;
  readonly template: "gEruptionFallingRockSpriteTemplate";
  readonly templateCallback: "AnimEruptionFallingRock";
  readonly callback: "AnimEruptionFallingRock_Step";
  readonly birthAge: number;
  readonly localAge: number;
  readonly state: 0 | 1 | 2;
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: -3 | 0 | 3;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly invisible: 0;
  readonly data: readonly [number, number, number, number, 0, 0, number, number];
  readonly tileOffset: 0 | 16 | 32 | 48;
  readonly paletteSlot: number;
  readonly attr: readonly [number, number, number];
  /** Creation-row software OAM is first visible in hardware on the next row. */
  readonly displayedInOam: boolean;
}

export interface EruptionFallingRockLifecycle {
  readonly slot: number;
  readonly sourceOrderIndex: number;
  readonly birthAge: number;
  /** The callback age that destroys this sprite; no row contains it. */
  readonly destroyAge: number;
  readonly lastVisibleAge: number;
  readonly tileOffset: 0 | 16 | 32 | 48;
}

export interface EruptionFallingRockFrame {
  readonly age: number;
  readonly animationRng: number;
  readonly animationRngTransition: Readonly<{ readonly previous: number | null; readonly next: number | null }>;
  readonly source: EruptionFallingRockSourcePhase | null;
  readonly sprites: readonly EruptionFallingRockSpriteState[];
  readonly visual: Readonly<{
    readonly activeSprites: number;
    readonly createdSprites: number;
    readonly ownedVisualTaskCount: 0;
  }>;
  readonly resources: Readonly<{
    readonly tileTag: number;
    readonly paletteTag: number;
    readonly tileRange: readonly [number, number];
    readonly paletteSlot: number;
    readonly tileAllocationRetained: boolean;
    readonly paletteAllocationRetained: boolean;
  }>;
  readonly oamTransfer: Readonly<{
    readonly transferLagRows: 1;
    readonly hardwareEqualsPrecedingSoftware: boolean;
  }>;
  readonly destroyedSlots: readonly number[];
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly activeSprites: number;
    readonly active: boolean;
  }>;
}

interface MutableRock {
  readonly slot: number;
  readonly sourceOrderIndex: number;
  readonly birthAge: number;
  readonly tileOffset: 0 | 16 | 32 | 48;
  readonly targetY: number;
  destroyAge: number;
  state: 0 | 1 | 2;
  x: number;
  y: number;
  y2: -3 | 0 | 3;
  bounceTimer: number;
  bounceDir: number;
  endTimer: number;
  fallDelay: number;
  alive: boolean;
}

function assertProfile(profile: Readonly<EruptionFallingRockProfile>): void {
  const { allocator, geometry } = profile;
  if (!Number.isInteger(profile.creationAge) || profile.creationAge < 0
    || !Number.isInteger(profile.endAge) || profile.endAge < profile.creationAge
    || profile.calls.length !== 6
    || allocator.freeSpriteSlots.length < 6
    || new Set(allocator.freeSpriteSlots).size !== allocator.freeSpriteSlots.length
    || allocator.tileTag !== ERUPTION_FALLING_ROCK_WARM_ROCK_TAG
    || allocator.paletteTag !== ERUPTION_FALLING_ROCK_WARM_ROCK_TAG
    || allocator.tileRange.length !== 2
    || allocator.tileRangeBeforeLoad.length !== 2
    || allocator.tileRange[1] < 84
    || allocator.paletteSlot < 0 || allocator.paletteSlot >= 16
    || allocator.loadedAge < 0
    || (allocator.freedAge !== null && allocator.freedAge <= allocator.loadedAge)
    || geometry.oamCenterOffsetX < 0 || geometry.oamCenterOffsetY < 0
    || !Number.isInteger(geometry.subpriority) || !Number.isInteger(geometry.oamPriority)) {
    throw new Error("invalid Eruption falling-rock component profile");
  }
  profile.calls.forEach((args, index) => {
    if (args.length !== 8
      || !args.every((value) => Number.isInteger(value))
      || args[4] !== ([0, 1, 2, 3, 0, 1] as const)[index]
      || args[5] !== 0 || args[6] !== 0 || args[7] !== 0) {
      throw new Error(`invalid Eruption falling-rock source call ${index}`);
    }
  });
}

function animationRngAtAge(age: number, starting: number): number {
  let value = starting >>> 0;
  for (let index = 0; index < age; index += 1) {
    value = (Math.imul(value, 0x41c64e6d) + 0x6073) >>> 0;
  }
  return value;
}

function sourceAtAge(age: number, profile: Readonly<EruptionFallingRockProfile>): EruptionFallingRockSourcePhase | null {
  const localAge = age - profile.creationAge;
  if (localAge < 0 || age > profile.endAge) return null;
  let offset: 153 | 187 | 204;
  let wait: number;
  let args: readonly number[];
  if (localAge < SOURCE_HORIZONTAL_START) {
    offset = ERUPTION_FALLING_ROCK_SOURCE_OFFSETS.create;
    wait = Math.max(0, SOURCE_CREATE_WAIT - localAge);
    args = profile.calls[5]!;
  } else if (localAge <= SOURCE_HORIZONTAL_FINAL_ZERO) {
    offset = ERUPTION_FALLING_ROCK_SOURCE_OFFSETS.horizontalShake;
    wait = localAge === SOURCE_HORIZONTAL_FINAL_ZERO
      ? 0
      : SOURCE_HORIZONTAL_WAIT - (localAge - SOURCE_HORIZONTAL_START);
    args = HORIZONTAL_SHAKE_ARGS;
  } else {
    offset = ERUPTION_FALLING_ROCK_SOURCE_OFFSETS.closingPalette;
    wait = 1;
    args = CLOSING_PALETTE_ARGS;
  }
  const pointer = ERUPTION_FALLING_ROCK_SOURCE_BASE + offset;
  return {
    offset,
    pointer,
    pointerParity: (pointer & 1) as 0 | 1,
    wait,
    args: [...args],
  };
}

function oamAttributes(
  rock: Readonly<MutableRock>,
  profile: Readonly<EruptionFallingRockProfile>,
): readonly [number, number, number] {
  const { geometry, allocator } = profile;
  const attr0 = (rock.y + rock.y2 - geometry.oamCenterOffsetY) & 0xff;
  const attr1 = (geometry.horizontalFlip ? OAM_HFLIP : 0)
    | ((rock.x - geometry.oamCenterOffsetX) & 0x1ff);
  const attr2 = ((allocator.paletteSlot << 12)
    | (geometry.oamPriority << 10)
    | (allocator.tileRange[0] + rock.tileOffset)) & 0xffff;
  return [attr0, attr1, attr2];
}

function stepFallingRock(rock: MutableRock): void {
  rock.y += 8;
  if (rock.y >= rock.targetY) {
    rock.y = rock.targetY;
    rock.state = 2;
  }
}

function stepRock(rock: MutableRock, age: number): void {
  switch (rock.state) {
    case 0:
      if (rock.fallDelay !== 0) {
        rock.fallDelay -= 1;
        return;
      }
      rock.state = 1;
      // The source callback deliberately falls through into the falling body.
      stepFallingRock(rock);
      return;
    case 1:
      stepFallingRock(rock);
      return;
    case 2:
      rock.bounceTimer += 1;
      if (rock.bounceTimer > 1) {
        rock.bounceTimer = 0;
        rock.bounceDir += 1;
        rock.y2 = (rock.bounceDir & 1) !== 0 ? -3 : 3;
      }
      rock.endTimer += 1;
      if (rock.endTimer > 16) {
        rock.alive = false;
        // The callback destroys the sprite at this age; no frame exposes it.
      }
      return;
    default:
      throw new Error(`invalid Eruption falling-rock state at age ${age}`);
  }
}

function createRocks(profile: Readonly<EruptionFallingRockProfile>): MutableRock[] {
  return profile.calls.map((args, sourceOrderIndex) => {
    const tileOffset = (args[4] * 16) as 0 | 16 | 32 | 48;
    const fallDelay = args[2];
    const rock: MutableRock = {
      slot: profile.allocator.freeSpriteSlots[sourceOrderIndex]!,
      sourceOrderIndex,
      birthAge: profile.creationAge,
      tileOffset,
      targetY: args[3],
      destroyAge: 0,
      state: 0,
      x: args[0],
      y: args[1],
      y2: 0,
      bounceTimer: 0,
      bounceDir: 0,
      endTimer: 0,
      fallDelay,
      alive: true,
    };
    // CreateSprite invokes AnimEruptionFallingRock, then the first Step in
    // this same source row, before the OAM transfer observes the sprite.
    stepRock(rock, profile.creationAge);
    return rock;
  });
}

function lifecycleFor(rock: Readonly<MutableRock>): EruptionFallingRockLifecycle {
  return {
    slot: rock.slot,
    sourceOrderIndex: rock.sourceOrderIndex,
    birthAge: rock.birthAge,
    destroyAge: rock.destroyAge,
    lastVisibleAge: rock.destroyAge - 1,
    tileOffset: rock.tileOffset,
  };
}

function spriteState(
  rock: Readonly<MutableRock>,
  age: number,
  profile: Readonly<EruptionFallingRockProfile>,
): EruptionFallingRockSpriteState {
  return {
    slot: rock.slot,
    sourceOrderIndex: rock.sourceOrderIndex,
    template: "gEruptionFallingRockSpriteTemplate",
    templateCallback: "AnimEruptionFallingRock",
    callback: "AnimEruptionFallingRock_Step",
    birthAge: rock.birthAge,
    localAge: age - rock.birthAge,
    state: rock.state,
    x: rock.x,
    y: rock.y,
    x2: 0,
    y2: rock.y2,
    subpriority: profile.geometry.subpriority,
    oamPriority: profile.geometry.oamPriority,
    invisible: 0,
    data: [rock.state, rock.bounceTimer, rock.bounceDir, rock.endTimer, 0, 0, rock.fallDelay, rock.targetY],
    tileOffset: rock.tileOffset,
    paletteSlot: profile.allocator.paletteSlot,
    attr: oamAttributes(rock, profile),
    displayedInOam: age > rock.birthAge,
  };
}

function resourcesAtAge(
  age: number,
  profile: Readonly<EruptionFallingRockProfile>,
): EruptionFallingRockFrame["resources"] {
  const loaded = age >= profile.allocator.loadedAge;
  const retained = loaded && (profile.allocator.freedAge === null || age < profile.allocator.freedAge);
  return {
    tileTag: profile.allocator.tileTag,
    paletteTag: profile.allocator.paletteTag,
    tileRange: (loaded ? profile.allocator.tileRange : profile.allocator.tileRangeBeforeLoad) as readonly [number, number],
    paletteSlot: profile.allocator.paletteSlot,
    tileAllocationRetained: retained,
    paletteAllocationRetained: retained,
  };
}

function frameForAge(
  age: number,
  profile: Readonly<EruptionFallingRockProfile>,
  rocks: readonly MutableRock[],
  destroyedSlots: readonly number[],
  firstInactiveAge: number,
): EruptionFallingRockFrame {
  const active = age >= profile.creationAge
    ? rocks.filter((rock) => rock.alive)
    : [];
  return {
    age,
    animationRng: animationRngAtAge(age, profile.startingAnimationRng),
    animationRngTransition: {
      previous: age > 0 ? animationRngAtAge(age - 1, profile.startingAnimationRng) : null,
      next: age < profile.endAge ? animationRngAtAge(age + 1, profile.startingAnimationRng) : null,
    },
    source: sourceAtAge(age, profile),
    sprites: active.map((rock) => spriteState(rock, age, profile)),
    visual: { activeSprites: active.length, createdSprites: age >= profile.creationAge ? 6 : 0, ownedVisualTaskCount: 0 },
    resources: resourcesAtAge(age, profile),
    oamTransfer: { transferLagRows: 1, hardwareEqualsPrecedingSoftware: age > 0 },
    destroyedSlots: [...destroyedSlots],
    cleanup: {
      firstInactive: age === firstInactiveAge,
      activeSprites: active.length,
      active: active.length !== 0,
    },
  };
}

/** Replay from source age zero through the retained first cleanup row. */
export function eruptionFallingRockTimeline(
  profile: Readonly<EruptionFallingRockProfile>,
): Readonly<{ frames: readonly EruptionFallingRockFrame[]; lifecycle: readonly EruptionFallingRockLifecycle[] }> {
  assertProfile(profile);
  const rocks = createRocks(profile);
  const lifecycle: EruptionFallingRockLifecycle[] = [];
  let firstInactiveAge: number | null = null;
  const frames: EruptionFallingRockFrame[] = [];
  for (let age = 0; age <= profile.endAge; age += 1) {
    const destroyedSlots: number[] = [];
    if (age > profile.creationAge) {
      for (const rock of rocks) {
        if (!rock.alive) continue;
        stepRock(rock, age);
        if (!rock.alive) {
          rock.destroyAge = age;
          destroyedSlots.push(rock.slot);
          lifecycle.push(lifecycleFor(rock));
        }
      }
    }
    if (age >= profile.creationAge && rocks.every((rock) => !rock.alive) && firstInactiveAge === null) {
      firstInactiveAge = age;
    }
    frames.push(frameForAge(age, profile, rocks, destroyedSlots, firstInactiveAge ?? -1));
  }
  if (lifecycle.length !== rocks.length || firstInactiveAge === null) {
    throw new Error("Eruption falling-rock lifecycle did not reach cleanup");
  }
  return { frames, lifecycle };
}

export function eruptionFallingRockAtAge(
  age: number,
  profile: Readonly<EruptionFallingRockProfile>,
): EruptionFallingRockFrame {
  if (!Number.isInteger(age) || age < 0 || age > profile.endAge) throw new Error("Eruption falling-rock age out of range");
  return eruptionFallingRockTimeline(profile).frames[age]!;
}

export const ERUPTION_FALLING_ROCK_DEFAULT_GEOMETRY: Readonly<EruptionFallingRockGeometry> = {
  oamCenterOffsetX: DEFAULT_OAM_CENTER_OFFSET,
  oamCenterOffsetY: DEFAULT_OAM_CENTER_OFFSET,
  subpriority: DEFAULT_SUBPRIORITY,
  oamPriority: OAM_PRIORITY,
  horizontalFlip: true,
};
