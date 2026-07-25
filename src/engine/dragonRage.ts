// DRAGON_RAGE rung 4 (ANIMATION_PROGRESS.md's 2026-07-25 sections): the
// whole move body, driven by the decoded script
// (`src/data/gen/battle-move-anim-scripts.json`'s `DRAGON_RAGE` entry) via
// `animScriptInterpreter.ts`'s new `interpretAnimSchedule` (the
// `waitforvisualfinish`-aware generalization the MIST_BALL enumeration
// flagged as needed) rather than a hand-fit absolute-tick timeline. Every
// creation tick this module predicts was cross-checked exactly against
// `dump-dragonrage-full.py`'s RAM probe in both attacker orientations
// (`dragonrage-full-probe-{player,opponent}-attacker.json`) before this file
// was written - see `tests/dragonRage.test.ts`.
//
// Reuses `shakeMon.ts` (both `AnimTask_ShakeMon` calls, attacker then
// target - unchanged primitive, first ATTACKER-side call site) and
// `slideMon.ts` (`SlideMonToOffset`/`SlideMonToOriginalPos`, rung 2's
// already-ported/RAM-pinned primitive) verbatim. This module adds the two
// genuinely new mechanisms: the fire-spit sprite
// (`StartDragonFireTranslation`'s side-asymmetric offset branch plus its
// own single-step affine program, RAM-probed per side) and the 8
// fire-plume sprites (`AnimDragonRageFirePlume`'s static-position/one-shot-
// reveal/self-destroy-on-animEnd shape, RAM-probed frame cadence).
//
// Not yet wired into `sceneOnPresentation.ts`'s move dispatch or a dense
// oracle comparator - see ANIMATION_PROGRESS.md's DRAGON_RAGE section for
// the named remainder. `mistBall.ts` is the established precedent for a
// standalone, Tier-1-pinned, not-yet-wired engine module in this codebase.
import battleMoveAnimScripts from "../data/gen/battle-move-anim-scripts.json" with { type: "json" };
import {
  interpretAnimSchedule,
  type AnimScheduleLifetime,
  type AnimScriptCommand,
  type ScheduledAnimEvent,
} from "./animScriptInterpreter.ts";
import { shakeMonSequence, shakeMonOffsetAtTick, type ShakeMonOffset } from "./shakeMon.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOffsetDestroyTick,
  slideMonToOriginalPosAtTick,
  slideMonToOriginalPosDestroyTick,
  type SlideMonBattlerSide,
  type SlideMonOffset,
} from "./slideMon.ts";

type RawDragonRageCommand = AnimScriptCommand & {
  readonly template?: string;
  readonly x?: number;
  readonly y?: number;
  readonly subpriorityOffset?: number;
};

const DRAGON_RAGE_SCRIPT = battleMoveAnimScripts.DRAGON_RAGE as {
  main: RawDragonRageCommand[];
};

export type DragonRageSide = "player" | "opponent";

/** `AnimTask_ShakeMon(5, ANIM_ATTACKER, 0, 2, 40, 1)` (`battle_anim_scripts.s:5247`). */
export const DRAGON_RAGE_ATTACKER_SHAKE = { xOffset: 0, yOffset: 2, numTimes: 40, frameDelay: 1 } as const;
/** `AnimTask_ShakeMon(5, ANIM_TARGET, 0, 3, 25, 1)` (`battle_anim_scripts.s:5254`). */
export const DRAGON_RAGE_TARGET_SHAKE = { xOffset: 0, yOffset: 3, numTimes: 25, frameDelay: 1 } as const;
/** `createsprite gSlideMonToOffsetSpriteTemplate, ANIM_TARGET, 2, 0, 15, 0, 0, 4` (`:5249`): argv `[battlerFlag=0, targetXOffset=15, targetYOffset=0, mirrorVertical=0, duration=4]`. */
export const DRAGON_RAGE_SLIDE_TO_OFFSET = { targetXOffset: 15, targetYOffset: 0, mirrorVertical: false, durationTicks: 4 } as const;
/** `createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_TARGET, 66, 0, 0, 4` (`:5271`). */
export const DRAGON_RAGE_SLIDE_TO_ORIGINAL_POS = { axisSnapMode: 0 as const, durationTicks: 4 };
/** `create_dragon_rage_fire_spit_sprite ANIM_TARGET, 2, 30, 15, 0, 10, 10` (`:5251`). */
export const DRAGON_RAGE_FIRE_SPIT_ARGS = { initialX: 30, initialY: 15, targetX: 0, targetY: 10, duration: 10 } as const;

/**
 * Rung 5 remainder (ANIMATION_PROGRESS.md 2026-07-25): per-mechanism
 * capture-lag bisection, same shape as `dragonBreath.ts`'s own
 * `DRAGON_BREATH_FRAMEBUFFER_OAM_AGE_LAG`/`_PALETTE_AGE_LAG` split - a
 * named per-mechanism constant, not a global fudge. Each value is
 * `renderTick - lag = the RAM tick that tick's photo actually shows`,
 * confirmed via `tools/compare/dragonRagePortable.ts`'s own dense
 * framebuffer count (`dragon-rage-player-charmeleon-opponent-onix`, both
 * cross-checked against a full grid sweep over `tools/compare/scratch/
 * dragonrage-dense-cached.ts` against one cached oracle capture - direct
 * component-vs-photo pixel correlation, not curve-fitting). An early
 * box-isolated bisection pass (`dragonrage-lag-bisect{,-cached}.ts`)
 * initially suggested lower values for shake/slide; those numbers turned
 * out to be silently contaminated by this module's OWN prior hardcoded
 * `age - 1` (removed by this rung) still being applied inside `render()`
 * underneath the bisection script's already-shifted age - the dense
 * full-frame sweep below, run against the real committed draw path with NO
 * other hidden shift, is what these values are actually pinned to.
 *
 * `AnimTask_ShakeMon` (both call sites - `gTasks[]`/`RunTasks`-driven):
 * lag 2 makes every dense frame across the whole shake phase (render ages
 * 0-78) match except age 1 itself (a single-frame boundary artifact where
 * `shakeMonOffsetAtRenderTick`'s own `renderTick < creationTick` guard
 * zeroes a legitimate just-past-creation state once shifted by lag 2 -
 * named, not chased further this step). Target shake reuses the same
 * `AnimTask_ShakeMon`/`AnimTask_ShakeMon_Step` call (RAM-confirmed
 * identical) so it shares this lag by mechanism identity; it is not
 * independently dense-verified because the target-shake phase (render age
 * 97+) is where the separate, already root-caused idle-bob x2 residual (see
 * this rung's ledger section) blocks a clean per-frame count regardless of
 * lag.
 */
export const DRAGON_RAGE_FRAMEBUFFER_SHAKE_AGE_LAG = 2;
/**
 * `SlideMonToOffset`/`SlideMonToOriginalPos` (dummy `gSprites[].callback`
 * translations): lag 1 - the shake tasks' own default, NOT the lower value
 * the (contaminated, see above) box-isolated pass first suggested - makes
 * every dense frame through the slide phase (render ages 79-85) match.
 */
export const DRAGON_RAGE_FRAMEBUFFER_SLIDE_AGE_LAG = 1;
/**
 * The fire-spit sprite (`StartDragonFireTranslation`): direct RAM-to-pixel
 * correlation (render age 87's own predicted x2=22 exactly matches RAM
 * tick 176 - the already-Tier-1-pinned "component" math - while the
 * PHOTOGRAPHED fire pixels at that same render tick sit at the x2=14
 * column, i.e. RAM tick 175's value) confirms lag 1, the same tier the
 * shake tasks use. The dense sweep's own fire-spit-active window (render
 * ages 86-96) still shows a real, smaller pixel residual at this lag (not
 * resolved by trying 0 or 2 instead - both score equal or worse) - left as
 * a named remainder, likely a further `drawSpriteSheetAffineRotate`
 * rounding question rather than a timing one.
 */
export const DRAGON_RAGE_FRAMEBUFFER_FIRE_SPIT_AGE_LAG = 1;
/**
 * The 8 fire-plume sprites (`AnimDragonRageFirePlume`, static position +
 * one-shot frame reveal): NOT independently pixel-isolated this step - every
 * spawn's own drawn box overlaps both the target sprite (mid target-shake
 * the whole time) and at least one sibling plume for its entire 26-tick
 * life, so no clean single-mechanism window exists in this fixture, and the
 * dense sweep's own score was identical across lag 0/1/2 in this window
 * (masked by the concurrent target idle-bob residual). Encoded as the
 * fire-spit's own confirmed lag (1) by mechanism-class inference (both are
 * plain `Cmd_createsprite`-created, `AnimateSprites`-stepped sprites,
 * unlike the slide dummies' own dedicated linear-translation step
 * functions) - a named, not-yet-independently-confirmed choice.
 */
export const DRAGON_RAGE_FRAMEBUFFER_FIRE_PLUME_AGE_LAG = 1;

/**
 * A same-frame double-step collapses each `AnimTask_ShakeMon` call's own
 * port tick 0 into its creation tick (priority 5, same mechanism
 * `fly.ts`'s `FLY_SHAKE_CREATION_AGE` documents for FLY's own priority-5
 * call site - RAM-confirmed again here, both DRAGON_RAGE call sites).
 */
function shakeMonOffsetAtRenderTick(
  args: { xOffset: number; yOffset: number; numTimes: number; frameDelay: number },
  creationTick: number,
  renderTick: number,
): ShakeMonOffset {
  if (renderTick < creationTick) return { x2: 0, y2: 0 };
  return shakeMonOffsetAtTick(
    args.xOffset, args.yOffset, args.numTimes, args.frameDelay,
    renderTick - creationTick + 1,
  );
}

/** Ticks-since-creation of the first tick the task is gone, matching `shakeMonOffsetAtRenderTick`'s own `+1`-shifted indexing. */
function shakeMonGoneAfterTicks(numTimes: number, frameDelay: number): number {
  return shakeMonSequence(0, 0, numTimes, frameDelay).length - 2;
}

/**
 * `StartDragonFireTranslation` (`battle_anim_dragon.c:218-243`)'s own
 * per-tick Q8.8 delta and single-step affine matrix, RAM-probed directly
 * (`dump-dragonrage-full.py`, both fixtures) rather than closed-form
 * derived: the observed constant per-tick deltas (data[1]/data[2], fixed
 * across the sprite's whole life) don't reproduce via
 * `floor(|distance|<<8/duration)` from either battler's own resolved
 * `BATTLER_COORD_X_2`/`Y_PIC_OFFSET` - same "RAM-probed literal, not a
 * closed form" convention `dragonBreath.ts`'s own `MATRIX_A`/`MATRIX_B`
 * tables already use for this same callback family.
 */
export interface DragonRageFireSpitGeometry {
  readonly side: DragonRageSide;
  readonly start: Readonly<{ x: number; y: number }>;
  /** Signed Q8.8 per-tick delta; sign carries direction, magnitude accumulates. */
  readonly deltaXQ8: number;
  readonly deltaYQ8: number;
  readonly matrix: Readonly<{ pa: number; pb: number; pc: number; pd: number }>;
}

export const DRAGON_RAGE_FIRE_SPIT_GEOMETRY: Readonly<Record<DragonRageSide, DragonRageFireSpitGeometry>> = {
  player: {
    side: "player",
    start: { x: 102, y: 112 },
    deltaXQ8: 1894,
    deltaYQ8: -1537,
    matrix: { pa: -183, pb: -4, pc: 4, pd: -183 },
  },
  opponent: {
    side: "opponent",
    start: { x: 161, y: 64 },
    deltaXQ8: -2279,
    deltaYQ8: 870,
    matrix: { pa: 184, pb: 0, pc: 0, pd: 184 },
  },
};

export interface DragonRageFireSpitState {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  /** 0-indexed frame into `sAnim_DragonRageFire`'s 3-frame sheet. */
  readonly sheetFrame: 0 | 1 | 2;
  readonly matrix: Readonly<{ pa: number; pb: number; pc: number; pd: number }>;
}

function signedDeltaMagnitude(deltaQ8: number, steps: number): number {
  const magnitude = (Math.abs(deltaQ8) * steps) >> 8;
  return deltaQ8 < 0 ? -magnitude : magnitude;
}

/**
 * `age` = ticks since the fire-spit sprite's own creation tick. Lifetime is
 * `duration + 1` (age 0..10 inclusive, RAM-confirmed: the accumulator
 * finishes its 10th step at age 9, then holds one more tick before
 * self-destroying - same "age 0..duration inclusive" shape
 * `dragonBreath.ts`'s own fire sprites already use).
 */
export function dragonRageFireSpitStateAtAge(
  age: number,
  geometry: DragonRageFireSpitGeometry = DRAGON_RAGE_FIRE_SPIT_GEOMETRY.player,
): DragonRageFireSpitState | null {
  const duration = DRAGON_RAGE_FIRE_SPIT_ARGS.duration;
  if (age < 0 || age > duration) return null;
  const steps = Math.min(age + 1, duration);
  return {
    x: geometry.start.x,
    y: geometry.start.y,
    x2: signedDeltaMagnitude(geometry.deltaXQ8, steps),
    y2: signedDeltaMagnitude(geometry.deltaYQ8, steps),
    // RAM-confirmed cadence, identical shape to `dragonBreath.ts`'s own
    // `sheetFrame` formula (`sAnim_DragonRageFire`'s 3-frame/3-tick sheet
    // is byte-identical to `sAnim_DragonBreathFire_0`).
    sheetFrame: (Math.floor((age + 1) / 3) % 3) as 0 | 1 | 2,
    matrix: geometry.matrix,
  };
}

export const DRAGON_RAGE_FIRE_SPIT_GONE_AFTER_TICKS = DRAGON_RAGE_FIRE_SPIT_ARGS.duration + 1;

/**
 * `AnimDragonRageFirePlume` (`battle_anim_dragon.c:246-265`): a STATIC-
 * position sprite (no translation) placed at the target's own
 * `BATTLER_COORD_X`/`Y` (`targetBattlePosition` - NOT the fire-spit's own
 * `X_2`/`Y_PIC_OFFSET` anchor; both RAM-solved independently and confirmed
 * distinct, see `tests/dragonRage.test.ts`), offset by
 * `SetAnimSpriteInitialXOffset` (side-signed, same pattern `ember.ts`'s own
 * `sideSignedOffset` already established) on X and a plain add on Y, then
 * plays a 5-frame one-shot reveal and self-destroys once `animEnded`
 * latches.
 */
export interface DragonRageFirePlumeSpawn {
  readonly x: number;
  readonly y: number;
  readonly subpriorityOffset: number;
}

/** The 8 `create_dragon_rage_fire_plume_sprite` argvs, in script order (`battle_anim_scripts.s:5255-5269`). */
export const DRAGON_RAGE_FIRE_PLUME_SPAWNS: readonly DragonRageFirePlumeSpawn[] =
  DRAGON_RAGE_SCRIPT.main
    .filter((cmd): cmd is RawDragonRageCommand & { x: number; y: number; subpriorityOffset: number } =>
      cmd.op === "create_dragon_rage_fire_plume_sprite")
    .map((cmd) => ({ x: cmd.x, y: cmd.y, subpriorityOffset: cmd.subpriorityOffset }));

/** `attackerX < targetX ? +offset : -offset` (`SetAnimSpriteInitialXOffset`), collapsed under this codebase's fixed player-left/opponent-right singles geometry - same convention as `ember.ts`'s own `sideSignedOffset`. */
function sideSignedOffset(side: DragonRageSide, magnitude: number): number {
  return side === "player" ? magnitude : -magnitude;
}

/** `GetBattlerSpriteSubpriority(target) + (raw>=64 ? raw-64 : -raw)` (`Cmd_createsprite`, `battle_anim.c:355-399`). */
function plumeSubpriority(targetSubpriority: number, raw: number): number {
  return raw >= 64 ? targetSubpriority + (raw - 64) : targetSubpriority - raw;
}

/**
 * RAM-probed per-tick frame cadence (`dump-dragonrage-full.py`, both
 * fixtures, all 8 spawns): `sAnim_DragonRageFirePlume`'s 5 frames each
 * declare `duration 5`, but the FIRST frame only holds 4 displayed ticks
 * (one tick consumed by the creation-tick's own synchronous `BeginAnim`
 * call, the same "creation tick already reflects one step" idiom
 * `slideMon.ts` documents) and the LAST frame holds 2 extra ticks after its
 * own 5-tick countdown finishes (`ANIMCMD_END` sets `animEnded`;
 * `RunStoredCallbackWhenAnimEnds` only reassigns the destroy callback via
 * `SetCallbackToStoredInData6`, so the actual `DestroyAnimSprite` fires one
 * tick later still) before the sprite disappears. Total lifetime: 26 ticks,
 * identical across all 8 independently-probed spawns.
 */
const FIRE_PLUME_FRAME_BOUNDARIES = [4, 9, 14, 19, 26] as const;
export const DRAGON_RAGE_FIRE_PLUME_GONE_AFTER_TICKS = 26;

export interface DragonRageFirePlumeState {
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  /** 0-indexed frame into `sAnim_DragonRageFirePlume`'s 5-frame sheet. */
  readonly sheetFrame: 0 | 1 | 2 | 3 | 4;
}

export function dragonRageFirePlumeStateAtAge(
  spawn: DragonRageFirePlumeSpawn,
  attackerSide: DragonRageSide,
  targetBattlePosition: Readonly<{ x: number; y: number }>,
  targetSubpriority: number,
  age: number,
): DragonRageFirePlumeState | null {
  if (age < 0 || age >= DRAGON_RAGE_FIRE_PLUME_GONE_AFTER_TICKS) return null;
  let sheetFrame = 0;
  while (sheetFrame < 4 && age >= FIRE_PLUME_FRAME_BOUNDARIES[sheetFrame]!) sheetFrame += 1;
  return {
    x: targetBattlePosition.x + sideSignedOffset(attackerSide, spawn.x),
    y: targetBattlePosition.y + spawn.y,
    subpriority: plumeSubpriority(targetSubpriority, spawn.subpriorityOffset),
    sheetFrame: sheetFrame as 0 | 1 | 2 | 3 | 4,
  };
}

/**
 * The whole move's schedule, computed from the decoded script via
 * `interpretAnimSchedule` (`animScriptInterpreter.ts`) - creation ticks are
 * DERIVED from each primitive's own lifetime plus the RAM-confirmed
 * `waitforvisualfinish` 1-tick resolution lag, not hand-fit. `t0` is the
 * attacker `AnimTask_ShakeMon`'s own creation tick (the script's first
 * scheduled event) in the caller's own tick space - the one externally-
 * calibrated anchor this move needs, same role `DRAGON_BREATH_FIRE_FIRST_
 * SPAWN_RAM_OFFSET`/`FLY_SHAKE_CREATION_AGE` play for their own moves.
 */
export interface DragonRageSchedule {
  readonly attackerShakeTick: number;
  readonly slideToOffsetTick: number;
  readonly fireSpitTick: number;
  readonly targetShakeTick: number;
  readonly firePlumeTicks: readonly number[];
  readonly slideToOriginalPosTick: number;
}

function dragonRageLifetimeOf(cmd: RawDragonRageCommand): AnimScheduleLifetime {
  if (cmd.op === "createvisualtask") {
    const [, , , numTimes, frameDelay] = cmd.args as unknown as [unknown, unknown, unknown, number, number];
    return { goneAfterTicks: shakeMonGoneAfterTicks(numTimes, frameDelay) };
  }
  if (cmd.template === "gSlideMonToOffsetSpriteTemplate") {
    return { goneAfterTicks: slideMonToOffsetDestroyTick(DRAGON_RAGE_SLIDE_TO_OFFSET.durationTicks) };
  }
  if (cmd.template === "gSlideMonToOriginalPosSpriteTemplate") {
    return { goneAfterTicks: slideMonToOriginalPosDestroyTick(DRAGON_RAGE_SLIDE_TO_ORIGINAL_POS.durationTicks) };
  }
  if (cmd.op === "create_dragon_rage_fire_spit_sprite") {
    return { goneAfterTicks: DRAGON_RAGE_FIRE_SPIT_GONE_AFTER_TICKS };
  }
  if (cmd.op === "create_dragon_rage_fire_plume_sprite") {
    return { goneAfterTicks: DRAGON_RAGE_FIRE_PLUME_GONE_AFTER_TICKS };
  }
  throw new Error(`dragonRageLifetimeOf: unexpected creation op ${cmd.op}`);
}

const DRAGON_RAGE_EVENTS: readonly ScheduledAnimEvent[] =
  interpretAnimSchedule(DRAGON_RAGE_SCRIPT.main, dragonRageLifetimeOf as (cmd: AnimScriptCommand) => AnimScheduleLifetime);

export function dragonRageSchedule(t0: number): DragonRageSchedule {
  const byOp = (op: string, template?: string) =>
    DRAGON_RAGE_EVENTS.filter((e) => e.cmd.op === op && (template === undefined || (e.cmd as RawDragonRageCommand).template === template));
  const [attackerShake, targetShake] = byOp("createvisualtask");
  const [slideToOffset] = byOp("createsprite", "gSlideMonToOffsetSpriteTemplate");
  const [slideToOriginalPos] = byOp("createsprite", "gSlideMonToOriginalPosSpriteTemplate");
  const [fireSpit] = byOp("create_dragon_rage_fire_spit_sprite");
  const firePlumes = byOp("create_dragon_rage_fire_plume_sprite");
  return {
    attackerShakeTick: t0 + attackerShake!.tick,
    slideToOffsetTick: t0 + slideToOffset!.tick,
    fireSpitTick: t0 + fireSpit!.tick,
    targetShakeTick: t0 + targetShake!.tick,
    firePlumeTicks: firePlumes.map((e) => t0 + e.tick),
    slideToOriginalPosTick: t0 + slideToOriginalPos!.tick,
  };
}

export type { SlideMonBattlerSide, SlideMonOffset };
export {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
  shakeMonOffsetAtRenderTick,
};
