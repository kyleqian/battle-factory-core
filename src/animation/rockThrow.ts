import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

/**
 * 1:1 source port of Move_ROCK_THROW's visual body
 * (`reference/pokeemerald/data/battle_anim_scripts.s:2098-2117`) reusing the
 * shared `gFallingRockSpriteTemplate` / `AnimFallingRock` /
 * `AnimFallingRock_Step` / `TranslateSpriteInEllipse` falling-rock component
 * (the same source body ROCK_SLIDE's `rockSlideRockState` transcribes),
 * the `AnimShakeMonOrBattlePlatforms` BG-Y shake (`shake_mon_or_platform`
 * velocity=6, shake_timer=1, shake_duration=15, SHAKE_BG_Y), and the
 * `AnimTask_ShakeMon(ANIM_TARGET,0,5,20,1)` target shake.
 *
 * Script body (all timings RAM-measured against the mechanicLab probe):
 *   loadspritegfx ANIM_TAG_ROCKS
 *   shake_mon_or_platform ANIM_TARGET, 6, 1, 15, SHAKE_BG_Y   (RAM age 3)
 *   createsprite gFallingRockSpriteTemplate, 0, 1, 0, 0        (RAM age 3)
 *   playsewithpan SE_M_ROCK_THROW
 *   delay 6  ->  createsprite 19, 1, 10, 0                    (RAM age 11)
 *   delay 6  ->  createsprite -23, 2, -10, 0                  (RAM age 19)
 *   createvisualtask AnimTask_ShakeMon, ANIM_TARGET, 0, 5, 20, 1  (same tick)
 *   delay 6  ->  createsprite -15, 1, -10, 0                  (RAM age 27)
 *   delay 6  ->  createsprite 23, 2, 10, 0                    (RAM age 35)
 *   waitforvisualfinish / end
 *
 * Each `createsprite`+`playsewithpan` pair costs one script tick each before
 * the following `delay 6`, so the measured RAM spawn stride is 8 frames (the
 * ROCK_SLIDE stride was 4 for its `delay 2`). `arg3 = 0` skips
 * `SetAverageBattlerPositions`, so the rock base is the `createsprite`
 * initial position `GetBattlerSpriteCoord(target, BATTLER_COORD_X_2 /
 * Y_PIC_OFFSET)` plus `AnimFallingRock`'s own `x += arg0` / `y += 14`.
 */

/** The five `gFallingRockSpriteTemplate` argv triples `[xOffset, animNum, velocity]` (arg3=0). */
export const ROCK_THROW_ROCK_TABLE: readonly {
  xOffset: number;
  animNum: 0 | 1 | 2;
  velocity: number;
}[] = [
  { xOffset: 0, animNum: 1, velocity: 0 },
  { xOffset: 19, animNum: 1, velocity: 10 },
  { xOffset: -23, animNum: 2, velocity: -10 },
  { xOffset: -15, animNum: 1, velocity: -10 },
  { xOffset: 23, animNum: 2, velocity: 10 },
];

export const ROCK_THROW_ROCK_COUNT = ROCK_THROW_ROCK_TABLE.length;

/** Frames between consecutive rock spawns (RAM-measured: createsprite + playse + delay 6). */
export const ROCK_THROW_SPAWN_STRIDE = 8;

/**
 * `AnimShakeMonOrBattlePlatforms` BG3-Y display sequence for velocity=6,
 * shake_timer=1, shake_duration=15. RAM-measured: the shake is created at the
 * rock anchor (RAM age 3), the first `-6` write lands at RAM age 5 (two
 * countdown ticks after creation, unlike ROCK_SLIDE's one), and the restore
 * lands at RAM age 15; with the one-tick render lag the displayed sequence
 * (indexed by `age - 1 - rockAnchorAge`) is the 17-entry row below.
 */
const ROCK_THROW_SHAKE_SEQUENCE: readonly number[] = [
  0, 0, -6, -6, 0, 0, -6, -6, 0, 0, -6, -6, 0, 0, -6, -6, 0,
];

export interface RockThrowAnimationProfile {
  /** RAM age of the shake task and first falling-rock creation. */
  readonly rockAnchorAge: number;
  /** First display age where the target's `AnimTask_ShakeMon` y2 reads +5. */
  readonly targetShakeStartAge: number;
  /** Last display age where the target's `AnimTask_ShakeMon` y2 reads +5. */
  readonly targetShakeEndAge: number;
  /** Display age where the target's sprite x2 drops from the ONIX-front idle residual +1 to 0 (the shake task's xOffset=0 write). */
  readonly targetX2OffAge: number;
  /** Live `sSpriteOrder` before this animation allocates its sprites. */
  readonly spriteOrderSeed: readonly number[];
  /** Sprite slots already occupied at the same seed boundary. */
  readonly occupiedSpriteSlots: readonly number[];
}

export interface RockThrowGeometry {
  /** `GetBattlerSpriteCoord(target, X_2/Y_PIC_OFFSET)` plus `AnimFallingRock`'s y+=14 (arg3=0 skips SetAverageBattlerPositions). */
  readonly rockOrigin: Readonly<{ x: number; y: number }>;
}

export const ROCK_THROW_ANIMATION_PROFILE: Readonly<RockThrowAnimationProfile> =
  Object.freeze({
    rockAnchorAge: 3,
    targetShakeStartAge: 24,
    targetShakeEndAge: 57,
    targetX2OffAge: 999,
    spriteOrderSeed: [
      62, 60, 0, 63, 1, 61, 6, 8, 2, 3, 4, 21, 20, 5, 19, 18, 17, 16,
      15, 14, 13, 12, 11, 10, 9, 7, 54, 55, 56, 57, 58, 59, 23, 22, 48,
      49, 50, 51, 52, 53, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
      35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
    ],
    occupiedSpriteSlots: [0, 1, 2, 6, 8, 60, 61, 62, 63],
  });

/** `gSineTable[i]` Q8.8 lookup; `Math.floor` matches C's arithmetic shift-by-8 (RAM-cross-verified for ROCK_SLIDE's 20 rocks). */
function gbaSinTable(index: number, amplitude: number): number {
  const v = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((amplitude * v) / 256);
}
function gbaCosTable(index: number, amplitude: number): number {
  return gbaSinTable(index + 64, amplitude);
}

/** `gBattle_BG3_Y` at display age `age` (one-tick render lag), or 0 outside the shake. */
export function rockThrowBg3Y(
  age: number,
  profile: Readonly<RockThrowAnimationProfile> = ROCK_THROW_ANIMATION_PROFILE,
): number {
  const d = age - 1 - profile.rockAnchorAge;
  if (d < 0 || d >= ROCK_THROW_SHAKE_SEQUENCE.length) return 0;
  return ROCK_THROW_SHAKE_SEQUENCE[d]!;
}

/**
 * A single falling rock's render state at display age `age`, or `null`
 * outside its active window. The phase model is identical to ROCK_SLIDE's
 * `rockSlideRockState` (both transcribe `AnimFallingRock` +
 * `TranslateSpriteInEllipse`): n=0..14 phase 1 (arc down), n=15 held,
 * n=16..47 phase 2 (settle wobble + one-time `x += velocity`), n=48 held,
 * destroyed at n=49. `ramTick = age - 1`.
 */
export function rockThrowRockState(
  index: number,
  age: number,
  profile: Readonly<RockThrowAnimationProfile> = ROCK_THROW_ANIMATION_PROFILE,
  geometry: Readonly<RockThrowGeometry>,
): { centerX: number; centerY: number; animNum: 0 | 1 | 2 } | null {
  const args = ROCK_THROW_ROCK_TABLE[index];
  if (!args) return null;
  // The framebuffer shows the previous RAM tick's sprite state (same
  // one-tick render lag `rockSlideRockState` models via `ramTick = t - 1`),
  // so display age `age` maps to RAM tick `age - 1` and the phase counter is
  // `(age - 1) - 1 - spawnRamTick`.
  const spawnRamTick = profile.rockAnchorAge + ROCK_THROW_SPAWN_STRIDE * index;
  const n = age - 2 - spawnRamTick;
  if (n < 0 || n > 48) return null;
  let x2: number;
  let y2: number;
  let xShift = 0;
  if (n <= 15) {
    const nClamped = Math.min(n, 14);
    const circlePosIn = 4 + 4 * nClamped;
    x2 = 0;
    y2 = gbaCosTable(circlePosIn, -70);
  } else {
    const nClamped = Math.min(n, 47);
    const circlePosIn = 128 + 4 * nClamped;
    x2 = gbaSinTable(circlePosIn, args.velocity);
    y2 = gbaCosTable(circlePosIn, -24);
    xShift = args.velocity;
  }
  return {
    centerX: geometry.rockOrigin.x + args.xOffset + xShift + x2,
    centerY: geometry.rockOrigin.y + y2,
    animNum: args.animNum,
  };
}

/** `sprite->y + sprite->y2 + centerToCornerVecY` wrapped to OAM y semantics (same as `rockSlideDrawOrder`). */
function wrapOamY(cornerY: number): number {
  const u8 = ((cornerY % 256) + 256) % 256;
  return u8 >= 160 ? u8 - 256 : u8;
}

/** The shake sprite's own lifetime in RAM ticks (`shake_duration=15`). */
const ROCK_THROW_SHAKE_LIFETIME = 15;

/** `Cmd_createsprite`'s `GetBattlerSpriteSubpriority(gBattleAnimTarget) - 2` for every rock (same constant as ROCK_SLIDE). */
const ROCK_THROW_SUBPRIORITY = 38;

/** Ticks before the anchor used as the simulation seed (the first frame of the dense window, before any allocation). */
const ROCK_THROW_ORDER_SEED_OFFSET = 3;

/** `sDummySprite`'s packed sort key (filler for non-rock slots). */
const ROCK_THROW_FILLER_PACKED_KEY = (3 << 8) | 255;
const ROCK_THROW_FILLER_Y = -96;

function rockThrowSpawnRamTick(
  index: number,
  profile: Readonly<RockThrowAnimationProfile>,
): number {
  return profile.rockAnchorAge + ROCK_THROW_SPAWN_STRIDE * index;
}

function rockThrowDespawnRamTick(
  index: number,
  profile: Readonly<RockThrowAnimationProfile>,
): number {
  // One tick past the rock's last rendered state (the slot frees the frame
  // after the final `n=48` render latches, matching the observed despawn).
  return rockThrowSpawnRamTick(index, profile) + 50;
}

type RockThrowOrderEvent = {
  ramTick: number;
  isDestroy: boolean;
  rank: number;
  rockIndex: number | null;
};

const rockThrowOrderCache = new Map<string, Map<number, readonly number[]>>();

/**
 * Simulates the whole ROCK_THROW window's slot lifecycle + one `SortSprites`
 * pass per RAM tick (the same insertion-sort comparator and lowest-free-slot
 * allocator ROCK_SLIDE's `computeRockSlideOrders` transcribes). Only five
 * rocks ever coexist, but slots are reused (the shake frees slot 3 before
 * rock 2 spawns) and the array evolves, so the relative order is not a fixed
 * table. All rocks share the packed key `2<<8|38`, so within the rocks the
 * sort orders by OAM y ascending (stable within exact ties).
 */
function computeRockThrowOrders(
  profile: Readonly<RockThrowAnimationProfile>,
  geometry: Readonly<RockThrowGeometry>,
): Map<number, readonly number[]> {
  const anchor = profile.rockAnchorAge;
  const seedRamTick = anchor - ROCK_THROW_ORDER_SEED_OFFSET;
  const lastRamTick = rockThrowDespawnRamTick(ROCK_THROW_ROCK_COUNT - 1, profile);

  const events: RockThrowOrderEvent[] = [
    { ramTick: anchor, isDestroy: false, rank: -1, rockIndex: null },
    { ramTick: anchor + ROCK_THROW_SHAKE_LIFETIME, isDestroy: true, rank: -1, rockIndex: null },
  ];
  for (let i = 0; i < ROCK_THROW_ROCK_COUNT; i += 1) {
    events.push({ ramTick: rockThrowSpawnRamTick(i, profile), isDestroy: false, rank: i, rockIndex: i });
    events.push({ ramTick: rockThrowDespawnRamTick(i, profile), isDestroy: true, rank: i, rockIndex: i });
  }
  events.sort((a, b) => a.ramTick - b.ramTick || Number(a.isDestroy) - Number(b.isDestroy) || a.rank - b.rank);

  const inUse = new Array<boolean>(64).fill(false);
  for (const slot of profile.occupiedSpriteSlots) inUse[slot] = true;
  let shakeSlot = -1;
  const rockSlot = new Array<number>(ROCK_THROW_ROCK_COUNT).fill(-1);

  const order = profile.spriteOrderSeed.slice();
  const result = new Map<number, readonly number[]>();

  let eventIdx = 0;
  for (let ramTick = seedRamTick + 1; ramTick <= lastRamTick; ramTick += 1) {
    while (eventIdx < events.length && events[eventIdx]!.ramTick === ramTick) {
      const ev = events[eventIdx]!;
      if (ev.isDestroy) {
        const slot = ev.rockIndex === null ? shakeSlot : rockSlot[ev.rockIndex]!;
        inUse[slot] = false;
        if (ev.rockIndex === null) shakeSlot = -1;
        else rockSlot[ev.rockIndex] = -1;
      } else {
        let slot = 0;
        while (inUse[slot]) slot += 1;
        inUse[slot] = true;
        if (ev.rockIndex === null) shakeSlot = slot;
        else rockSlot[ev.rockIndex] = slot;
      }
      eventIdx += 1;
    }

    const packedKey = new Array<number>(64).fill(ROCK_THROW_FILLER_PACKED_KEY);
    const yKey = new Array<number>(64).fill(ROCK_THROW_FILLER_Y);
    for (let i = 0; i < ROCK_THROW_ROCK_COUNT; i += 1) {
      const slot = rockSlot[i]!;
      if (slot < 0) continue;
      const state = rockThrowRockState(i, ramTick + 1, profile, geometry);
      if (!state) continue;
      packedKey[slot] = (2 << 8) | ROCK_THROW_SUBPRIORITY;
      yKey[slot] = wrapOamY(state.centerY - 16);
    }

    for (let i = 1; i < 64; i += 1) {
      let j = i;
      while (j > 0) {
        const s1 = order[j - 1]!;
        const s2 = order[j]!;
        const p1 = packedKey[s1]!;
        const p2 = packedKey[s2]!;
        if (p1 > p2 || (p1 === p2 && yKey[s1]! < yKey[s2]!)) {
          order[j - 1] = s2;
          order[j] = s1;
          j -= 1;
        } else {
          break;
        }
      }
    }

    const alive: { index: number; pos: number }[] = [];
    for (let i = 0; i < ROCK_THROW_ROCK_COUNT; i += 1) {
      const slot = rockSlot[i]!;
      if (slot >= 0) alive.push({ index: i, pos: order.indexOf(slot) });
    }
    alive.sort((a, b) => b.pos - a.pos);
    result.set(ramTick, alive.map((r) => r.index));
  }

  return result;
}

/** The alive rocks (by table index) at display age `age`, background-first (same convention as `rockSlideDrawOrder`). */
export function rockThrowDrawOrder(
  age: number,
  profile: Readonly<RockThrowAnimationProfile> = ROCK_THROW_ANIMATION_PROFILE,
  geometry: Readonly<RockThrowGeometry>,
): readonly number[] {
  const ramTick = age - 1;
  const cacheKey = [
    profile.rockAnchorAge,
    geometry.rockOrigin.x,
    geometry.rockOrigin.y,
    profile.spriteOrderSeed.join(","),
  ].join("|");
  let cached = rockThrowOrderCache.get(cacheKey);
  if (!cached) {
    cached = computeRockThrowOrders(profile, geometry);
    rockThrowOrderCache.set(cacheKey, cached);
  }
  return cached.get(ramTick) ?? [];
}

/**
 * `AnimTask_ShakeMon(ANIM_TARGET,0,5,20,1)` DISPLAYED y2. RAM-measured: the
 * task's y2 toggles 5→0 every two RAM ticks from RAM age 16 (2-on-2-off), but
 * the battler sprite's OAM latches the shake two frames behind its RAM write,
 * so the framebuffer shows 5 at display ages 24,25,28,29,...,56,57 (the RAM
 * pattern shifted by two). Outside that window the ONIX stays at y2=0.
 */
export function rockThrowTargetY2(
  age: number,
  profile: Readonly<RockThrowAnimationProfile> = ROCK_THROW_ANIMATION_PROFILE,
): number {
  if (age < profile.targetShakeStartAge || age > profile.targetShakeEndAge) return 0;
  const d = age - profile.targetShakeStartAge;
  return d % 4 < 2 ? 5 : 0;
}

/**
 * The opponent-front ONIX target's permanent idle-bob residual x2=+1. The
 * `AnimTask_ShakeMon` xOffset=0 write is NOT reflected in the framebuffer
 * (the same two-frame OAM latch hides it), so the +1 idle residual stays
 * visible for the whole window. The player-back ONIX target has no residual;
 * the caller decides per side.
 */
export function rockThrowTargetX2(
  _age: number,
  _profile: Readonly<RockThrowAnimationProfile> = ROCK_THROW_ANIMATION_PROFILE,
): number {
  return 1;
}

export interface RockThrowAnimationState {
  readonly bg3Y: number;
  readonly targetY2: number;
  readonly targetX2: number;
  readonly rocks: readonly {
    readonly centerX: number;
    readonly centerY: number;
    readonly animNum: 0 | 1 | 2;
  }[];
}

export function rockThrowAnimationAtAge(
  age: number,
  profile: Readonly<RockThrowAnimationProfile> = ROCK_THROW_ANIMATION_PROFILE,
  geometry: Readonly<RockThrowGeometry>,
): RockThrowAnimationState {
  return {
    bg3Y: rockThrowBg3Y(age, profile),
    targetY2: rockThrowTargetY2(age, profile),
    targetX2: rockThrowTargetX2(age, profile),
    rocks: rockThrowDrawOrder(age, profile, geometry)
      .map((index) => rockThrowRockState(index, age, profile, geometry))
      .filter((rock): rock is NonNullable<typeof rock> => rock !== null),
  };
}
