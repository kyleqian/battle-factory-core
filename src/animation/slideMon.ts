/**
 * Generic 1:1 ports of `SlideMonToOffset` and `SlideMonToOriginalPos`
 * (`reference/pokeemerald/src/battle_anim_mon_movement.c:478-576`), the
 * dummy-sprite pair `gSlideMonToOffsetSpriteTemplate`/
 * `gSlideMonToOriginalPosSpriteTemplate` drive. Both share
 * `InitSpriteDataForLinearTranslation`'s plain-truncating-division Q8.8 setup
 * (`battle_anim_mons.c:1055-1063` - NOT `InitAnimLinearTranslation`'s
 * direction-forced-into-low-bit variant that `animLinearTranslation.ts`
 * already ports for a different caller family), but their per-tick step
 * functions (`TranslateSpriteLinearByIdFixedPoint` vs
 * `SlideMonToOriginalPos_Step`) diverge in two real, RAM-confirmed ways this
 * port preserves:
 *
 * 1. **Rounding.** `TranslateSpriteLinearByIdFixedPoint` writes
 *    `data[3] >> 8` straight to `x2`/`y2` (a plain s16 field).
 *    `SlideMonToOriginalPos_Step` instead writes `(s8)(data[3] >> 8) +
 *    data[5]` - the accumulator's own contribution is truncated to 8 bits
 *    *before* adding back the sprite's original offset. Irrelevant at this
 *    move's own small magnitudes (<=15px) but part of the real function, so
 *    `slideMonToOriginalPosAtTick` keeps the cast (`toS8`).
 * 2. **Self-destroy timing.** `TranslateSpriteLinearByIdFixedPoint`'s finish
 *    branch calls `SetCallbackToStoredInData6`, which only *reassigns*
 *    `sprite->callback` to `DestroyAnimSprite` - the actual destroy fires on
 *    the FOLLOWING tick's dispatch. `SlideMonToOriginalPos_Step`'s finish
 *    branch calls `DestroyAnimSprite` directly, same tick. RAM-probed against
 *    a real MOVE_DRAGON_RAGE window (`src/data/gen/dragonrage-slide-probe.json`,
 *    CHARMELEON_2 vs ONIX, `tools/battle-lab/
 *    mechanic-dragon-rage-charmeleon-onix.json`): for a 4-tick duration, the
 *    offset-slide dummy sprite is alive for 5 ticks (168-172, the last one a
 *    repeated no-op finish call) and gone by tick 173, while the
 *    original-pos dummy sprite is alive for exactly 4 ticks (235-238, the
 *    4th IS the finish call) and gone by tick 239 - a full tick sooner
 *    relative to its own creation. `slideMonToOffsetDestroyDelay`/
 *    `slideMonToOriginalPosDestroyDelay` capture this asymmetry explicitly.
 *
 * "Ticks since creation" = 0 on the dummy sprite's own `createsprite` tick,
 * which RAM confirms *fuses with the first accumulate call* (no separate
 * "created but not yet stepped" tick is observable) - so tick 0 already
 * reflects one step applied, matching the probe's own first visible row.
 */

export interface SlideMonOffset {
  readonly x2: number;
  readonly y2: number;
}

/** `InitSpriteDataForLinearTranslation`: plain truncating-toward-zero Q8.8 division (`battle_anim_mons.c:1055-1063`). */
function linearDeltaQ8(distance: number, durationTicks: number): number {
  return Math.trunc((distance << 8) / durationTicks);
}

/** `(s8)` cast applied in `SlideMonToOriginalPos_Step` before adding back the base offset. */
function toS8(value: number): number {
  const byte = value & 0xff;
  return byte >= 0x80 ? byte - 0x100 : byte;
}

export type SlideMonBattlerSide = "player" | "opponent";

export interface SlideMonToOffsetArgs {
  /** `GetBattlerSide` of the battler this dummy sprite moves (its own createsprite `battlerFlag` resolved to a side). */
  readonly battlerSide: SlideMonBattlerSide;
  /** `gBattleAnimArgs[1]`, before the opponent-side mirror `SlideMonToOffset` itself applies. */
  readonly targetXOffset: number;
  /** `gBattleAnimArgs[2]`, before the opponent-side mirror (only applied when `mirrorVertical`). */
  readonly targetYOffset: number;
  /** `gBattleAnimArgs[3] === 1`. */
  readonly mirrorVertical: boolean;
  /** `gBattleAnimArgs[4]`. */
  readonly durationTicks: number;
}

/** `SlideMonToOffset`'s own opponent-side mirror: x always negated, y only when `mirrorVertical`. */
export function slideMonToOffsetMirroredDeltas(
  args: SlideMonToOffsetArgs,
): { dx: number; dy: number } {
  const opponentSide = args.battlerSide === "opponent";
  return {
    dx: opponentSide ? -args.targetXOffset : args.targetXOffset,
    dy: opponentSide && args.mirrorVertical ? -args.targetYOffset : args.targetYOffset,
  };
}

/**
 * `x2`/`y2` at `ticksSinceCreation` ticks after the dummy sprite's own
 * `createsprite` tick (see module doc for tick-0 semantics). Freezes at the
 * target offset from `durationTicks - 1` onward - no forced snap, matching
 * `TranslateSpriteLinearByIdFixedPoint`'s own shape.
 */
export function slideMonToOffsetAtTick(
  args: SlideMonToOffsetArgs,
  ticksSinceCreation: number,
): SlideMonOffset {
  if (ticksSinceCreation < 0) return { x2: 0, y2: 0 };
  const { dx, dy } = slideMonToOffsetMirroredDeltas(args);
  const deltaX = linearDeltaQ8(dx, args.durationTicks);
  const deltaY = linearDeltaQ8(dy, args.durationTicks);
  const steps = Math.min(ticksSinceCreation + 1, args.durationTicks);
  return { x2: (deltaX * steps) >> 8, y2: (deltaY * steps) >> 8 };
}

/** Ticks-since-creation of the first tick the dummy sprite is gone (`x2`/`y2` frozen forever by then): the deferred `SetCallbackToStoredInData6` hop costs one extra tick beyond the last accumulate. */
export function slideMonToOffsetDestroyTick(durationTicks: number): number {
  return durationTicks + 1;
}

export interface SlideMonToOriginalPosArgs {
  /** The mover sprite's own `x2` at the moment this dummy sprite is created (`sprite->data[5]`). */
  readonly currentX2: number;
  /** The mover sprite's own `y2` at the moment this dummy sprite is created (`sprite->data[6]`). */
  readonly currentY2: number;
  /** `gBattleAnimArgs[1]`: 0 = both axes, 1 = horizontal only, 2 = vertical only. */
  readonly axisSnapMode: 0 | 1 | 2;
  /** `gBattleAnimArgs[2]`. */
  readonly durationTicks: number;
}

/**
 * `x2`/`y2` at `ticksSinceCreation` ticks after creation. From
 * `durationTicks` onward the dummy sprite has already run its finish branch
 * (same tick as its last accumulate - see module doc) and force-set the
 * axes it actually translates to exactly 0, leaving any frozen axis
 * (`axisSnapMode` excludes it) at its original `current{X,Y}2`.
 */
export function slideMonToOriginalPosAtTick(
  args: SlideMonToOriginalPosArgs,
  ticksSinceCreation: number,
): SlideMonOffset {
  if (ticksSinceCreation < 0) return { x2: args.currentX2, y2: args.currentY2 };
  if (ticksSinceCreation >= args.durationTicks) {
    return {
      x2: args.axisSnapMode === 2 ? args.currentX2 : 0,
      y2: args.axisSnapMode === 1 ? args.currentY2 : 0,
    };
  }
  const deltaX = args.axisSnapMode === 2 ? 0 : linearDeltaQ8(-args.currentX2, args.durationTicks);
  const deltaY = args.axisSnapMode === 1 ? 0 : linearDeltaQ8(-args.currentY2, args.durationTicks);
  const steps = ticksSinceCreation + 1;
  return {
    x2: toS8((deltaX * steps) >> 8) + args.currentX2,
    y2: toS8((deltaY * steps) >> 8) + args.currentY2,
  };
}

/** Ticks-since-creation of the first tick the dummy sprite is gone: `DestroyAnimSprite` runs directly in the finish branch, same tick as the last accumulate - one tick sooner than `slideMonToOffsetDestroyTick`'s deferred hop. */
export function slideMonToOriginalPosDestroyTick(durationTicks: number): number {
  return durationTicks;
}
