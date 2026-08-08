/**
 * Complete source-relative `Move_SLASH` visual body.
 *
 * Ages are RAM truth relative to the move-owned window (frame 73 player-back /
 * 77 opponent-front, so both orientations share the same ages and differ only
 * in the battler geometry). Every sprite event displays exactly ONE frame after
 * the RAM state that causes it, EXCEPT the task-driven shake x2 which displays
 * TWO frames late (the TAKE_DOWN WindUpLunge case) — see
 * `tools/compare/evidence/slash-changemap-*.txt`. The draw case must therefore
 * split the display latch (one-age for the slices, two-age for the shake), and
 * this reducer stays calibrated to the probe's RAM readings.
 *
 * The whole window is static except for the settled event list:
 * - `loadspritegfx ANIM_TAG_SLASH` prefix ages 0-3 (static screen, no sprites).
 * - slice 1 (`gSlashSliceSpriteTemplate`, OAM `gOamData_AffineOff_ObjNormal_
 *   32x32` — AFFINE OFF + OBJ NORMAL, NOT ObjBlend) created RAM age 4 at the
 *   TARGET center x2 (X_2) - 8 / Y_PIC_OFFSET, animNum 0 =
 *   `gSlashSliceAnimCmds1` (4 frames of 16 tiles, 4 ticks each, no loop),
 *   destroyed RAM age 38.
 * - slice 2 created RAM age 10 at the TARGET center + 8, destroyed RAM age 44.
 * - `AnimTask_ShakeMon2 (ANIM_TARGET, 4, 0, 18, 1)` RAM ages 10-43: drives the
 *   target sprite x2 by +-4, toggling every 2 ages (-4 at 10-11, +4 at 12-13,
 *   ...), task destroyed RAM age 44 and x2 restored to 0.
 * - SE_M_RAZOR_WIND at slice creation ages 4 and 10.
 * - after each slice's anim ends, `AnimFalseSwipeSlice_Step3` toggles its
 *   `invisible` every 2 ages (slice 1 from RAM age 22, slice 2 from age 28),
 *   counting to 8 then `DestroyAnimSprite` at ages 38 / 44.
 * - no palette/BG work at all: no monbg, no fadetobg, no setalpha/blendoff.
 */
export type SlashTargetSide = "player" | "opponent";

export interface SlashSliceSprite {
  readonly x: number;
  readonly y: number;
  /** Tile offset into the 64-tile sheet: 0, 16, 32 or 48 (4 stacked 32x32 frames). */
  readonly tileOffset: 0 | 16 | 32 | 48;
  readonly invisible: boolean;
}

export interface SlashSoundEvent {
  readonly age: number;
  readonly song: "SE_M_RAZOR_WIND";
  readonly pan: number;
}

export interface SlashState {
  readonly slices: readonly SlashSliceSprite[];
  /** Target sprite x2 driven by AnimTask_ShakeMon2 (+-4, 2-age toggle, 0 after). */
  readonly targetX2: number;
  readonly soundEvents: readonly SlashSoundEvent[];
}

export interface SlashGeometry {
  readonly targetSide: SlashTargetSide;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

/** RAM age of `loadspritegfx ANIM_TAG_SLASH`'s visible prefix (static, no sprites). */
export const PREFIX_AGES = 4;
/** RAM age of the first slice / SE_M_RAZOR_WIND. */
export const SLICE_1_AGE = 4;
/** RAM age of the second slice + the ShakeMon2 task + SE_M_RAZOR_WIND. */
export const SLICE_2_AGE = 10;
/** RAM age the first slice's anim ends and AnimFalseSwipeSlice_Step3 takes over. */
export const SLICE_1_TEARDOWN_AGE = 20;
/** RAM age the second slice's anim ends and Step3 takes over. */
export const SLICE_2_TEARDOWN_AGE = 26;
/** RAM age the first slice is destroyed. */
export const SLICE_1_DESTROY_AGE = 38;
/** RAM age the second slice / shake task are destroyed. */
export const SLICE_2_DESTROY_AGE = 44;
/** RAM age the shake task starts driving x2. */
export const SHAKE_START_AGE = 10;
/** RAM age the shake task is destroyed and x2 restored to 0. */
export const SHAKE_END_AGE = 44;

const SLICE_CMD_TICKS = 4;

/** `gSlashSliceAnimCmds1` command index at `age` for a slice created at `createAge`. */
function sliceCmdIndex(age: number, createAge: number): number {
  const local = age - createAge;
  if (local < 0) return -1;
  // animDelayCounter starts at 3 and consumes one tick on the creation frame,
  // so cmd0 spans 3 ages and cmd1..3 span 4 each: cmd = floor((local + 1) / 4).
  return Math.min(3, Math.floor((local + 1) / SLICE_CMD_TICKS));
}

/** `invisible` under AnimFalseSwipeSlice_Step3 (toggles every 2 ages from teardown+2). */
function sliceInvisible(age: number, teardownAge: number): boolean {
  if (age < teardownAge + 2) return false;
  return ((age - teardownAge) % 4) >= 2;
}

function sliceAlive(
  age: number,
  createAge: number,
  teardownAge: number,
  destroyAge: number,
  xOffset: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): SlashSliceSprite | null {
  if (age < createAge || age >= destroyAge) return null;
  const cmd = sliceCmdIndex(age, createAge);
  if (cmd < 0) return null;
  return {
    x: targetCenter.x + xOffset,
    y: targetCenter.y,
    tileOffset: (cmd * 16) as 0 | 16 | 32 | 48,
    invisible: sliceInvisible(age, teardownAge),
  };
}

/** `AnimTask_ShakeMon2 (ANIM_TARGET, 4, 0, 18, 1)` x2 on the target sprite. */
function shakeX2AtAge(age: number): number {
  if (age < SHAKE_START_AGE || age >= SHAKE_END_AGE) return 0;
  return ((age - SHAKE_START_AGE) % 4) < 2 ? -4 : 4;
}

export function slashAtAge(age: number, geometry: SlashGeometry): SlashState {
  const { targetCenter } = geometry;
  const slices = [
    sliceAlive(age, SLICE_1_AGE, SLICE_1_TEARDOWN_AGE, SLICE_1_DESTROY_AGE, -8, targetCenter),
    sliceAlive(age, SLICE_2_AGE, SLICE_2_TEARDOWN_AGE, SLICE_2_DESTROY_AGE, +8, targetCenter),
  ].filter((s): s is SlashSliceSprite => s !== null);
  return {
    slices,
    targetX2: shakeX2AtAge(age),
    soundEvents: [SLICE_1_AGE, SLICE_2_AGE].includes(age)
      ? [{
          age,
          song: "SE_M_RAZOR_WIND",
          pan: geometry.targetSide === "player" ? -63 : 63,
        }]
      : [],
  };
}
