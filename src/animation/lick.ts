/**
 * Complete source-relative `Move_LICK` visual body.
 *
 * Ages are RAM truth relative to the move-owned window (frame 214 player-back /
 * 213 opponent-front, so both orientations share the same ages and differ only
 * in the target geometry). LICK's window is the whole move: the sprite is
 * created at RAM age 21 at the TARGET center and the entire animation after
 * the 5 anim frames is the `AnimLick_Step` invisible flicker ladder, so
 * sprite-driven events display exactly ONE frame after their RAM state (the
 * change map's flicker blinks at 246, 248, 252, ... agree), while the
 * TASK-driven ShakeMon2 x2 displays TWO frames late (RAM age 21 -> pixels 237)
 * - the TAKE_DOWN WindUpLunge / SLASH case, so the draw case must split the
 * display latch (one-age lick, two-age shake). The pre-shake ONIX front-idle
 * x2=1 hold is a species-idle property the draw case supplies, NOT the move's
 * state, so this reducer leaves targetX2 at 0 before the shake.
 *
 * The whole window is static except for the settled event list
 * (`tools/compare/evidence/lick-changemap-*.txt`):
 * - `loadspritegfx ANIM_TAG_LICK` fills the 21-age static prefix (no move
 *   sprites, no tasks, screen byte-identical).
 * - the LICK sprite (`gLickSpriteTemplate`, gOamData_AffineOff_ObjNormal_16x32,
 *   subpriority 38) is created at RAM age 21 at the TARGET center and marches
 *   `sAnim_Lick` (5 frames of 8 tiles, 2 ticks each): cmd0 21, cmd1 22-23,
 *   cmd2 24-25, cmd3 26-27, cmd4 28-30, animEnded 31.
 * - `AnimLick_Step` (battle_anim_ghost.c:468) IS the rest of the move: from
 *   age 31 the sprite is forced invisible every animEnded entry, then the
 *   data[0]/data[1]/data[2] counter ladder toggles `invisible`: case 0 flips
 *   every 2 ticks (visible at 33, 36, 39, 42, 45), case 1 every 4 ticks
 *   (visible at 50, 55, 60, 65, 70), then data[0]==2 -> DestroyAnimSprite at
 *   age 71.
 * - `AnimTask_ShakeMon2 (ANIM_TARGET, 1, 0, 16, 1)` created RAM age 21 drives
 *   the target x2 by +-1, toggling every 2 ages: -1 at 21-22, +1 at 23-24,
 *   -1 at 25-26, ..., -1 at 49-50, then x2=0 and task destroyed at 51.
 * - SE_M_LICK plays once at the creation age.
 * - No palette/BG changes: BLDCNT/BLDALPHA/BLDY all 0 the whole window.
 */
export type LickTargetSide = "player" | "opponent";

export interface LickSprite {
  readonly x: number;
  readonly y: number;
  readonly tileOffset: number;
  readonly invisible: boolean;
}

export interface LickSoundEvent {
  readonly age: number;
  readonly song: "SE_M_LICK";
  readonly pan: number;
}

export interface LickState {
  readonly lick: LickSprite | null;
  readonly targetX2: number;
  readonly soundEvents: readonly LickSoundEvent[];
}

export interface LickGeometry {
  readonly targetSide: LickTargetSide;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

/** RAM age the LICK sprite is created (and SE_M_LICK plays). */
export const LICK_SPAWN_AGE = 21;
/** RAM age `sAnim_Lick` reaches animEnded and the invisible flicker ladder starts. */
export const LICK_ANIM_END_AGE = 31;
/** RAM age `AnimLick_Step` case 0 finishes its 5 flips and moves to case 1. */
export const LICK_CASE_1_AGE = 46;
/** RAM age `AnimLick_Step` case 1 finishes its 5 flips and DestroyAnimSprite runs. */
export const LICK_DESTROY_AGE = 71;
/** RAM age `AnimTask_ShakeMon2 (1, 0, 16, 1)` restores x2 to 0 and self-destroys. */
export const SHAKE_END_AGE = 51;

const FRAME_TILES = [0, 8, 16, 24, 32];

/** The `sAnim_Lick` anim cmd index at a RAM age (0..4, then 5 = END). */
function lickCmdIndex(age: number): number {
  if (age < LICK_SPAWN_AGE || age >= LICK_DESTROY_AGE) return -1;
  if (age === LICK_SPAWN_AGE) return 0;
  if (age <= 23) return 1;
  if (age <= 25) return 2;
  if (age <= 27) return 3;
  return 4;
}

/**
 * `AnimLick_Step`'s invisible flag at a RAM age. Before animEnded the sprite
 * is visible; from age 31 every animEnded entry forces invisible TRUE, then
 * the ladder toggles it: case 0 flips when data[1]==2 (ages 33, 36, 39, 42,
 * 45 visible), case 1 flips when data[1]==4 (ages 50, 55, 60, 65, 70 visible),
 * destroying at 71. Verified against the probe's invisible bits.
 */
function lickInvisible(age: number): boolean {
  if (age < LICK_ANIM_END_AGE || age >= LICK_DESTROY_AGE) return false;
  if (age < LICK_CASE_1_AGE) return (age - 33) % 3 !== 0;
  return (age - 50) % 5 !== 0;
}

function lickSpriteAtAge(age: number, targetCenter: Readonly<{ x: number; y: number }>): LickSprite | null {
  const cmd = lickCmdIndex(age);
  if (cmd < 0) return null;
  return {
    x: targetCenter.x,
    y: targetCenter.y,
    tileOffset: FRAME_TILES[Math.min(cmd, FRAME_TILES.length - 1)]!,
    invisible: lickInvisible(age),
  };
}

/**
 * `AnimTask_ShakeMon2 (1, 0, 16, 1)`'s x2 at a RAM age (closed form). The task
 * writes x2 = +1 at creation then toggles between +-1 every frameDelay+1 ages,
 * holding each value for 2 ages, and restores x2 to 0 on the 16th (final)
 * toggle. Verified against the probe: -1 at 21-22, +1 at 23-24, -1 at 25-26,
 * ..., -1 at 49-50, 0 from 51. The +1 creation write at age 20 is the same
 * same-frame transient the task's immediate step overwrites before any frame
 * displays (and it equals the ONIX front-idle hold, which the draw case
 * supplies) so the reducer leaves it 0. Duplicates the shared
 * `shakeMon2OffsetAtTick` port; the Tier-1 pin keeps the two in sync.
 */
function lickShakeX2(age: number): number {
  if (age < LICK_SPAWN_AGE || age >= SHAKE_END_AGE) return 0;
  const phase = (age - LICK_SPAWN_AGE) % 4;
  return phase === 0 || phase === 1 ? -1 : 1;
}

export function lickAtAge(age: number, geometry: LickGeometry): LickState {
  const { targetSide, targetCenter } = geometry;
  return {
    lick: lickSpriteAtAge(age, targetCenter),
    targetX2: lickShakeX2(age),
    soundEvents: age === LICK_SPAWN_AGE
      ? [{ age, song: "SE_M_LICK", pan: targetSide === "player" ? -63 : 63 }]
      : [],
  };
}
