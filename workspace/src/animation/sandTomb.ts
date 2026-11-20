/**
 * Source-relative MOVE_SAND_TOMB presentation reducer.
 *
 * This is deliberately only the battle-animation body.  It models the
 * script cursor, MUD_SAND allocations, palette programs, ShakeMon and the
 * vortex sprites from the ported source; battle resolution, damage, RNG
 * ownership and controller progression remain outside this module.
 */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { advanceRngValue } from "../engine/rng.ts";
import { sortGbaSpriteOrder } from "./gbaObjCompositor.ts";

export type SandTombOrientation = "player-back" | "opponent-front";
export type SandTombSide = "player" | "opponent";

export interface SandTombSpriteOrderKey {
  readonly slot: number;
  readonly priority: 0 | 1 | 2 | 3;
  readonly subpriority: number;
  /** Signed OAM top coordinate consumed by `SortSprites`. */
  readonly y: number;
}

/** Live source allocator/order facts, supplied by the Scene-ON caller. */
export interface SandTombSpriteOrderProfile {
  readonly initialOrder: readonly number[];
  readonly initialKeys: readonly SandTombSpriteOrderKey[];
  readonly freeSpriteSlots: readonly number[];
}

export interface SandTombTargetGeometry {
  /** `GetBattlerSpriteCoord2(target, X/Y)` used by the vortex template. */
  readonly vortexCenter: Readonly<{ x: number; y: number }>;
  /** `GetBattlerSpriteCoord(target, X_2/Y_PIC_OFFSET)` for palette sentinels. */
  readonly paletteCenter: Readonly<{ x: number; y: number }>;
  readonly spriteSlot: number;
  readonly initialX2: number;
  readonly initialY2: number;
  readonly subpriority: number;
  readonly sortTopY: number;
}

/**
 * trp1 (docs/trp1-turn-trap-animation.md): `main` is MOVE_SAND_TOMB; `turn-trap` is General_TurnTrap's Status_SandTomb
 * (battle_anim_scripts.s:10427-10439), the same script with `AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 2, 30, 1` and two SandTombSwirlingDirt
 * calls, so its `delay 22` and closing blend start 24 rows earlier. The cursor keeps MOVE_SAND_TOMB's script offsets (diagnostic only).
 */
export type SandTombBody = "main" | "turn-trap";
const SAND_TOMB_BODY = {
  main: { calls: 3, shakeTimes: 43, closingAge: 100, endAge: 123 },
  "turn-trap": { calls: 2, shakeTimes: 30, closingAge: 76, endAge: 99 },
} as const;
const bodyOf = (profile: Readonly<SandTombAnimationProfile>) => SAND_TOMB_BODY[profile.body ?? "main"];

export interface SandTombAnimationProfile {
  readonly orientation: SandTombOrientation;
  /** 123 for MOVE_SAND_TOMB, 99 for the `turn-trap` body. */
  readonly endAge: number;
  /** trp1: absent = `main`. */
  readonly body?: SandTombBody;
  readonly attackerSide: SandTombSide;
  readonly attackerSpriteSlot: number;
  readonly attackerSubpriority: number;
  readonly target: Readonly<SandTombTargetGeometry>;
  readonly spriteOrder: Readonly<SandTombSpriteOrderProfile>;
  /** Live OBJ allocator output after `loadspritegfx ANIM_TAG_MUD_SAND`. */
  readonly mudSand: Readonly<{
    readonly tag: number;
    readonly tileNum: number;
    readonly paletteNum: number;
  }>;
  /** The visual task allocator is external; its slot is ordinary live state. */
  readonly shakeTaskSlot: number;
  readonly shakeTaskPriority: number;
  readonly startingAnimationRng: number;
  readonly gameplayRng: number;
  /** Immutable caller-owned battle snapshot; never selects an animation path. */
  readonly immutableGameplayState?: unknown;
}

export interface SandTombSourceCursor {
  readonly owner: "Move_SAND_TOMB" | "SandTombSwirlingDirt";
  readonly command:
    | "loadspritegfx"
    | "script_delay"
    | "createsprite"
    | "simple_palette_blend"
    | "end";
  readonly offset: number;
  readonly pointer: number;
  readonly pointerParity: 0 | 1;
  readonly wait: number;
  readonly args: readonly number[];
  readonly active: boolean;
}

export interface SandTombDirtSprite {
  readonly kind: "dirt";
  readonly template: "gSwirlingDirtSpriteTemplate";
  readonly callback: "AnimParticleInVortex_Step";
  readonly slot: number;
  readonly birthAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly attr: readonly [number, number, number];
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface SandTombPaletteSprite {
  readonly kind: "palette";
  readonly template: "gSimplePaletteBlendSpriteTemplate";
  readonly callback: "AnimSimplePaletteBlend_Step";
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly invisible: true;
  readonly attr: readonly [number, number, number];
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export type SandTombSprite = SandTombDirtSprite | SandTombPaletteSprite;

export interface SandTombShakeTask {
  readonly kind: "shake";
  readonly slot: number;
  readonly priority: number;
  readonly callback: "AnimTask_ShakeMon_Step";
  readonly data: readonly number[];
}

export interface SandTombPaletteProgram {
  readonly name: "opening" | "closing";
  readonly active: boolean;
  readonly slot: number | null;
  readonly sourceCoefficient: number;
  /** Palette DMA sees the immediately preceding software faded palette. */
  readonly hardwareCoefficient: number;
}

export interface SandTombFrame {
  readonly age: number;
  readonly active: boolean;
  readonly source: SandTombSourceCursor;
  /** Source software OAM pose, separately retained from the task's live RAM. */
  readonly targetOamOffset: Readonly<{ readonly x2: number; readonly y2: number }>;
  readonly targetOffset: Readonly<{ readonly x2: number; readonly y2: number }>;
  readonly sprites: readonly SandTombSprite[];
  readonly tasks: readonly SandTombShakeTask[];
  readonly palette: Readonly<{
    readonly coefficient: number;
    readonly hardwareCoefficient: number;
    readonly programs: readonly SandTombPaletteProgram[];
    readonly targetColorBgr555: number;
  }>;
  readonly audio: Readonly<{
    readonly event: null | Readonly<{ readonly age: number; readonly channel: "SE1"; readonly song: "se_m_sand_tomb"; readonly pan: number }>;
  }>;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly resources: Readonly<{
    readonly tag: number;
    readonly tileRetained: boolean;
    readonly paletteRetained: boolean;
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

export interface SandTombTimeline {
  readonly endAge: number;
  readonly frames: readonly SandTombFrame[];
}

const TIMELINE_CACHE = new WeakMap<Readonly<SandTombAnimationProfile>, SandTombTimeline>();
const SOURCE_BASE = 0x082d_516a;
const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const CLOSING_ARGS = [4, 2, 7, 0, 563, -50, 1, 0] as const;
const DUMMY_KEY: SandTombSpriteOrderKey = { slot: 0, priority: 3, subpriority: 0xff, y: -96 };

/** Every invocation of the source subroutine has six identical cadence slots. */
export const SAND_TOMB_VORTEX_CALLS = [
  { y: 32, rise: 528, duration: 30, angleStep: 10, amplitude: 50, sourceOffset: 100 },
  { y: 36, rise: 480, duration: 20, angleStep: 13, amplitude: -46, sourceOffset: 123 },
  { y: 37, rise: 576, duration: 20, angleStep: 5, amplitude: 42, sourceOffset: 146 },
  { y: 35, rise: 400, duration: 25, angleStep: 8, amplitude: -42, sourceOffset: 169 },
  { y: 32, rise: 512, duration: 25, angleStep: 13, amplitude: 46, sourceOffset: 192 },
  { y: 37, rise: 464, duration: 30, angleStep: 12, amplitude: -50, sourceOffset: 215 },
] as const;

interface AllocatedDirt {
  readonly slot: number;
  readonly birthAge: number;
  readonly call: (typeof SAND_TOMB_VORTEX_CALLS)[number];
}

interface SandTombAllocations {
  readonly dirt: readonly AllocatedDirt[];
  readonly paletteSlots: Readonly<{ readonly opening: number; readonly closing: number }>;
}

function assertProfile(profile: Readonly<SandTombAnimationProfile>): void {
  if (!Number.isInteger(profile.endAge) || profile.endAge !== bodyOf(profile).endAge
    || profile.attackerSide !== (profile.orientation === "player-back" ? "player" : "opponent")
    || profile.attackerSpriteSlot < 0 || profile.attackerSpriteSlot >= 64
    || profile.target.spriteSlot < 0 || profile.target.spriteSlot >= 64
    || profile.spriteOrder.initialOrder.length !== 64
    || new Set(profile.spriteOrder.initialOrder).size !== 64
    || profile.spriteOrder.initialOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || profile.spriteOrder.freeSpriteSlots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || new Set(profile.spriteOrder.freeSpriteSlots).size !== profile.spriteOrder.freeSpriteSlots.length
    || profile.mudSand.tag !== 10074) {
    throw new Error("invalid Sand Tomb animation profile");
  }
}

function sine(index: number, amplitude: number): number {
  return Math.floor((GBA_SINE_TABLE_256[index & 0xff]! * amplitude) / 256);
}

function signedY(value: number): number {
  const byte = value & 0xff;
  return byte >= 160 ? byte - 256 : byte;
}

function coefficientAtAge(age: number, closingAge = 100): number {
  if (age < 8) return 0;
  if (age < 12) return 2;
  if (age < 16) return 4;
  if (age < 20) return 6;
  if (age < closingAge + 4) return 7;
  if (age < closingAge + 8) return 5;
  if (age < closingAge + 12) return 3;
  if (age < closingAge + 16) return 1;
  return 0;
}

function paletteSpriteAtAge(
  age: number,
  profile: Readonly<SandTombAnimationProfile>,
  allocation: Readonly<SandTombAllocations>,
): SandTombPaletteSprite | null {
  const closing = bodyOf(profile).closingAge;
  if (!((age >= 4 && age <= 25) || (age >= closing && age <= closing + 21))) return null;
  // `gSimplePaletteBlendSpriteTemplate` is invisible but deliberately joins
  // source ordering and visual-task accounting.
  const slot = age < closing ? allocation.paletteSlots.opening : allocation.paletteSlots.closing;
  return {
    kind: "palette", template: "gSimplePaletteBlendSpriteTemplate", callback: "AnimSimplePaletteBlend_Step",
    slot, x: profile.target.paletteCenter.x, y: profile.target.paletteCenter.y, x2: 0, y2: 0,
    subpriority: profile.attackerSubpriority, invisible: true,
    attr: [160, 304, 0xffff], data: [0, 0, 0, 0, 0, 0, 0, 0],
  };
}

/**
 * Allocate only from the ordinary live free-list.  The lifetime schedule is
 * source-derived, so no retained evidence row or species identity participates.
 */
function allocations(profile: Readonly<SandTombAnimationProfile>): SandTombAllocations {
  const free = [...profile.spriteOrder.freeSpriteSlots].sort((left, right) => left - right);
  const active: Array<Readonly<{ readonly slot: number; readonly deathAge: number }>> = [];
  const result: AllocatedDirt[] = [];
  let openingPaletteSlot: number | null = null;
  let closingPaletteSlot: number | null = null;
  let event = 0;
  const { calls, closingAge, endAge } = bodyOf(profile);
  const lastCreateAge = 4 + 4 * (6 * calls - 1);
  for (let age = 0; age <= endAge - 1; age += 1) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      // Script `createsprite` scans before this row's sprite callbacks run.
      // A terminal `data[0] == 0` dirt sprite therefore blocks its slot for
      // the following create row, then frees it for the row after that.
      if (active[index]!.deathAge < age - 1) free.push(active[index]!.slot), active.splice(index, 1);
    }
    free.sort((left, right) => left - right);
    if (age === 4 || age === closingAge) {
      const slot = free.shift();
      if (slot === undefined) throw new Error("Sand Tomb palette sprite allocator exhausted");
      const deathAge = age === 4 ? 25 : closingAge + 21;
      active.push({ slot, deathAge });
      if (age === 4) openingPaletteSlot = slot;
      else closingPaletteSlot = slot;
    }
    if (age >= 4 && age <= lastCreateAge && (age - 4) % 4 === 0) {
      const call = SAND_TOMB_VORTEX_CALLS[event % SAND_TOMB_VORTEX_CALLS.length]!;
      const slot = free.shift();
      if (slot === undefined) throw new Error("Sand Tomb dirt allocator exhausted");
      const entry = { slot, birthAge: age, call };
      active.push({ slot, deathAge: age + call.duration - 1 });
      result.push(entry);
      event += 1;
    }
  }
  if (result.length !== 6 * calls || openingPaletteSlot === null || closingPaletteSlot === null) {
    throw new Error("Sand Tomb source allocation cadence drifted");
  }
  return { dirt: result, paletteSlots: { opening: openingPaletteSlot, closing: closingPaletteSlot } };
}

function dirtAtAge(
  age: number,
  profile: Readonly<SandTombAnimationProfile>,
  entries: readonly AllocatedDirt[],
): readonly SandTombDirtSprite[] {
  return entries.flatMap((entry) => {
    const localAge = age - entry.birthAge;
    if (localAge < 0 || localAge >= entry.call.duration) return [];
    const { call } = entry;
    const x = profile.target.vortexCenter.x;
    const y = profile.target.vortexCenter.y + call.y;
    const data4 = call.rise * (localAge + 1);
    const data5 = (call.angleStep * (localAge + 1)) & 0xff;
    // `AnimParticleInVortex_Step` samples data[5] before adding data[2].
    const x2 = sine(call.angleStep * localAge, call.amplitude);
    const y2 = -(data4 >> 8);
    return [{
      kind: "dirt" as const, template: "gSwirlingDirtSpriteTemplate" as const,
      callback: "AnimParticleInVortex_Step" as const, slot: entry.slot, birthAge: entry.birthAge,
      x, y, x2, y2, subpriority: profile.target.subpriority - 2,
      attr: [
        (y + y2 - 4) & 0xff,
        (x + x2 - 4) & 0x1ff,
        profile.mudSand.tileNum | (2 << 10) | (profile.mudSand.paletteNum << 12),
      ] as const,
      data: [
        call.duration - 1 - localAge, call.rise, call.angleStep, call.amplitude,
        data4, data5, 0, 0,
      ] as const,
    }];
  }).sort((left, right) => left.slot - right.slot);
}

/** AnimTask_ShakeMon's last row: 4 + 2 * (numTimes - 1) (88 for MOVE_SAND_TOMB's 43, 62 for Status_SandTomb's 30). */
const shakeEndAge = (profile: Readonly<SandTombAnimationProfile>): number => 4 + 2 * (bodyOf(profile).shakeTimes - 1);

function targetAtAge(age: number, profile: Readonly<SandTombAnimationProfile>): Readonly<{ x2: number; y2: number }> {
  if (age < 4) return { x2: profile.target.initialX2, y2: profile.target.initialY2 };
  if (age >= shakeEndAge(profile)) return { x2: 0, y2: 0 };
  const phase = Math.floor((age - 4) / 2);
  return { x2: 0, y2: phase % 2 === 1 ? 2 : 0 };
}

/**
 * `AnimTask_ShakeMon` runs on the task pass around BuildOamBuffer.  Its live
 * sprite y2 and the source software OAM record have the observed phase split;
 * both then use the ordinary one-row hardware transfer independently.
 */
function targetOamAtAge(age: number, profile: Readonly<SandTombAnimationProfile>): Readonly<{ x2: number; y2: number }> {
  if (age < 4) return { x2: profile.target.initialX2, y2: profile.target.initialY2 };
  if (age > shakeEndAge(profile)) return { x2: 0, y2: 0 };
  return { x2: 0, y2: age % 4 === 0 || age % 4 === 3 ? 2 : 0 };
}

function shakeTaskAtAge(age: number, profile: Readonly<SandTombAnimationProfile>): SandTombShakeTask | null {
  if (age < 4 || age > shakeEndAge(profile) - 1) return null;
  const phase = Math.floor((age - 4) / 2);
  return {
    kind: "shake", slot: profile.shakeTaskSlot, priority: profile.shakeTaskPriority,
    callback: "AnimTask_ShakeMon_Step",
    data: [profile.target.spriteSlot, bodyOf(profile).shakeTimes - 1 - phase, 1, age % 2 === 0 ? 1 : 0, 0, 2,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

function cursorAtAge(age: number, profile: Readonly<SandTombAnimationProfile>): SandTombSourceCursor {
  const active = age < profile.endAge;
  const source = (
    owner: SandTombSourceCursor["owner"],
    command: SandTombSourceCursor["command"],
    offset: number,
    wait: number,
    args: readonly number[],
  ): SandTombSourceCursor => {
    const pointer = SOURCE_BASE + offset;
    return { owner, command, offset, pointer, pointerParity: (pointer & 1) as 0 | 1, wait, args: [...args], active };
  };
  if (age === 0) return source("Move_SAND_TOMB", "loadspritegfx", 0, 0, ZERO_ARGS);
  if (age < 4) return source("Move_SAND_TOMB", "script_delay", 3, age === 1 ? 1 : 0, ZERO_ARGS);
  const { calls, closingAge } = bodyOf(profile);
  if (age < 4 + 24 * calls) {
    const within = (age - 4) % 24;
    const call = SAND_TOMB_VORTEX_CALLS[Math.floor(within / 4)]!;
    return source(
      "SandTombSwirlingDirt", "createsprite", call.sourceOffset,
      Math.max(0, 2 - within % 4),
      [0, call.y, call.rise, call.duration, call.angleStep, call.amplitude, 1, 0],
    );
  }
  if (age < closingAge) {
    return source("Move_SAND_TOMB", "script_delay", 58, Math.max(0, closingAge - 2 - age),
      [0, 37, 464, 30, 12, -50, 1, 0]);
  }
  if (age < profile.endAge) return source("Move_SAND_TOMB", "simple_palette_blend", 75, 1, CLOSING_ARGS);
  return source("Move_SAND_TOMB", "end", 76, 0, CLOSING_ARGS);
}

function spriteKey(sprite: Readonly<SandTombSprite>): SandTombSpriteOrderKey {
  return {
    slot: sprite.slot,
    priority: ((sprite.attr[2] >> 10) & 3) as 0 | 1 | 2 | 3,
    subpriority: sprite.subpriority,
    y: signedY(sprite.attr[0]),
  };
}

function nextOrder(
  previous: readonly number[],
  target: Readonly<{ x2: number; y2: number }>,
  sprites: readonly SandTombSprite[],
  profile: Readonly<SandTombAnimationProfile>,
): number[] {
  const keys = new Map<number, SandTombSpriteOrderKey>(profile.spriteOrder.initialKeys.map((key) => [key.slot, key]));
  const targetKey = keys.get(profile.target.spriteSlot);
  if (!targetKey) throw new Error("Sand Tomb target sprite key missing");
  keys.set(profile.target.spriteSlot, { ...targetKey, y: profile.target.sortTopY + target.y2 });
  for (const sprite of sprites) keys.set(sprite.slot, spriteKey(sprite));
  const all = Array.from({ length: 64 }, (_, slot) => keys.get(slot) ?? { ...DUMMY_KEY, slot });
  return sortGbaSpriteOrder(previous, all);
}

function frameAtAge(
  age: number,
  profile: Readonly<SandTombAnimationProfile>,
  allocation: Readonly<SandTombAllocations>,
  fullOrder: readonly number[],
): SandTombFrame {
  const dirt = dirtAtAge(age, profile, allocation.dirt);
  const paletteSprite = paletteSpriteAtAge(age, profile, allocation);
  const sprites = [...dirt, ...(paletteSprite ? [paletteSprite] : [])].sort((left, right) => left.slot - right.slot);
  const task = shakeTaskAtAge(age, profile);
  const tasks = task ? [task] : [];
  const owned = new Set(sprites.map((sprite) => sprite.slot));
  const sourceOrder = fullOrder.filter((slot) => owned.has(slot));
  const closing = bodyOf(profile).closingAge;
  const sourceCoefficient = coefficientAtAge(age, closing);
  const hardwareCoefficient = coefficientAtAge(Math.max(0, age - 1), closing);
  const closingActive = age >= closing && age <= closing + 21;
  return {
    age, active: age < profile.endAge, source: cursorAtAge(age, profile),
    targetOamOffset: targetOamAtAge(age, profile), targetOffset: targetAtAge(age, profile),
    sprites, tasks,
    palette: {
      coefficient: sourceCoefficient,
      hardwareCoefficient,
      targetColorBgr555: 563,
      programs: [
        { name: "opening", active: age >= 4 && age <= 25, slot: age >= 4 && age <= 25 ? paletteSprite?.slot ?? null : null, sourceCoefficient, hardwareCoefficient },
        { name: "closing", active: closingActive, slot: closingActive ? paletteSprite?.slot ?? null : null, sourceCoefficient, hardwareCoefficient },
      ],
    },
    audio: { event: age === 4 ? { age, channel: "SE1", song: "se_m_sand_tomb", pan: profile.attackerSide === "player" ? 63 : -63 } : null },
    visualTaskCount: sprites.length + tasks.length,
    soundTaskCount: 0,
    resources: { tag: profile.mudSand.tag, tileRetained: age >= 1 && age < profile.endAge, paletteRetained: age >= 1 && age < profile.endAge, freed: age >= profile.endAge },
    order: { fullSourceOrder: [...fullOrder], fullPainterOrder: [...fullOrder].reverse(), sourceOrder, painterOrder: [...sourceOrder].reverse() },
    animationRng: Array.from({ length: age }, (_, index) => index).reduce((value) => advanceRngValue(value), profile.startingAnimationRng),
    animationRngTransition: {
      previous: age > 0 ? Array.from({ length: age - 1 }, (_, index) => index).reduce((value) => advanceRngValue(value), profile.startingAnimationRng) : null,
      next: age < profile.endAge ? advanceRngValue(Array.from({ length: age }, (_, index) => index).reduce((value) => advanceRngValue(value), profile.startingAnimationRng)) : null,
    },
    gameplay: { rng: profile.gameplayRng, immutableState: profile.immutableGameplayState ?? null, changed: false },
    cleanup: { firstInactive: age === profile.endAge, activeSprites: sprites.length, activeTasks: tasks.length, resourcesFreed: age >= profile.endAge },
  };
}

/** Replay the complete source body through its first inactive cleanup row. */
export function sandTombTimeline(profile: Readonly<SandTombAnimationProfile>): SandTombTimeline {
  const cached = TIMELINE_CACHE.get(profile);
  if (cached) return cached;
  assertProfile(profile);
  const allocation = allocations(profile);
  let order = [...profile.spriteOrder.initialOrder];
  const frames: SandTombFrame[] = [];
  for (let age = 0; age <= profile.endAge; age += 1) {
    const dirt = dirtAtAge(age, profile, allocation.dirt);
    const paletteSprite = paletteSpriteAtAge(age, profile, allocation);
    const sprites = [...dirt, ...(paletteSprite ? [paletteSprite] : [])] as readonly SandTombSprite[];
    const target = targetAtAge(age, profile);
    if (age > 0) order = nextOrder(order, target, sprites, profile);
    frames.push(frameAtAge(age, profile, allocation, order));
  }
  const timeline = { endAge: profile.endAge, frames };
  TIMELINE_CACHE.set(profile, timeline);
  return timeline;
}

export function sandTombAtAge(age: number, profile: Readonly<SandTombAnimationProfile>): SandTombFrame {
  if (!Number.isInteger(age) || age < 0 || age > profile.endAge) throw new Error("Sand Tomb age out of range");
  return sandTombTimeline(profile).frames[age]!;
}
