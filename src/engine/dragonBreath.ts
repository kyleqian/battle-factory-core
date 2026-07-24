/**
 * Source-shaped reducer for `gDragonBreathFireSpriteTemplate`.
 *
 * `Move_DRAGON_BREATH` contains eleven `create_dragon_breath_fire_sprite`
 * commands separated by `delay 2`.  The battle-animation interpreter makes
 * those observable every four RAM ticks.  Each sprite then follows the same
 * `AnimTranslateLinear_WithFollowup` path and affine program for 21 observable
 * RAM states.  The tables below are the final OAM values, read through
 * `tools/probe/dump-dragonbreath-anim.py`; they are shared by every spawn.
 */

export type DragonBreathFireSprite = Readonly<{
  spawnIndex: number;
  age: number;
  centerX: number;
  centerY: number;
  sheetFrame: 1 | 2 | 3;
  pa: number;
  pb: number;
  pc: number;
  pd: number;
  subpriority: number;
  hFlip: boolean;
  vFlip: boolean;
  /** `monbg ANIM_DEF_PARTNER`: the target is a BG layer during the effect. */
  targetOnMonBg: true;
}>;

const MATRIX_A = [
  -703, -617, -549, -495, -450, -413, -382, -355, -331, -311, -292,
  -276, -262, -249, -237, -226, -216, -207, -199, -191, -184,
] as const;

const MATRIX_B = [
  -17, -15, -13, -12, -11, -10, -9, -8, -8, -7, -7,
  -6, -6, -6, -5, -5, -5, -5, -4, -4, -4,
] as const;

const NON_ROTATED_MATRIX_A = [
  704, 618, 550, 496, 451, 414, 383, 356, 332, 312, 293,
  277, 263, 250, 238, 227, 217, 208, 200, 192, 185,
] as const;

export const DRAGON_BREATH_FIRE_SPAWN_COUNT = 11;
export const DRAGON_BREATH_FIRE_FIRST_SPAWN_RAM_OFFSET = 229;
export const DRAGON_BREATH_FIRE_SPAWN_INTERVAL = 4;
export const DRAGON_BREATH_FIRE_RENDER_LAG = 1;
export const DRAGON_BREATH_FIRE_DURATION = 20;
export const DRAGON_BREATH_FIRE_LIFETIME = MATRIX_A.length;

export type DragonBreathFireGeometry = Readonly<{
  attackerCenter: Readonly<{ x: number; y: number }>;
  targetCenter: Readonly<{ x: number; y: number }>;
  attackerSide: "player" | "opponent";
  /** Script argument passed to `StartDragonFireTranslation`. */
  duration: number;
  /** `create_dragon_breath_fire_sprite ANIM_TARGET, 2`: target - 2. */
  targetSubpriority: number;
  subpriorityOffset: number;
  /** Interpreter-observed cadence for the eleven source commands. */
  spawnCount: number;
  spawnInterval: number;
}>;

export const CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY: DragonBreathFireGeometry = {
  attackerCenter: { x: 72, y: 88 },
  targetCenter: { x: 176, y: 44 },
  attackerSide: "player",
  duration: DRAGON_BREATH_FIRE_DURATION,
  targetSubpriority: 40,
  subpriorityOffset: 2,
  spawnCount: DRAGON_BREATH_FIRE_SPAWN_COUNT,
  spawnInterval: DRAGON_BREATH_FIRE_SPAWN_INTERVAL,
};

function signedLinearOffset(start: number, end: number, duration: number, age: number): number {
  const distance = end - start;
  // `InitAnimLinearTranslation` stores abs(delta)<<8 / duration, with the
  // low bit carrying direction. `AnimTranslateLinear` updates immediately;
  // the final observable state is then retained for the destroy callback.
  let fixedDelta = Math.floor((Math.abs(distance) << 8) / duration);
  if (distance < 0) fixedDelta |= 1;
  else fixedDelta &= ~1;
  const steps = Math.min(age + 1, duration);
  const magnitude = (fixedDelta * steps) >> 8;
  return distance < 0 ? -magnitude : magnitude;
}

export function dragonBreathFireSprites(
  renderTick: number,
  pressTick: number,
  geometry: DragonBreathFireGeometry = CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
): DragonBreathFireSprite[] {
  if (!Number.isInteger(geometry.duration) || geometry.duration <= 0) {
    throw new Error("DRAGON_BREATH duration must be a positive integer");
  }
  const ramTick = renderTick - DRAGON_BREATH_FIRE_RENDER_LAG;
  const sprites: DragonBreathFireSprite[] = [];
  for (let spawnIndex = 0; spawnIndex < geometry.spawnCount; spawnIndex += 1) {
    const spawnTick = pressTick
      + DRAGON_BREATH_FIRE_FIRST_SPAWN_RAM_OFFSET
      + spawnIndex * geometry.spawnInterval;
    const age = ramTick - spawnTick;
    const lifetime = geometry.duration + 1;
    if (age < 0 || age >= lifetime) continue;
    // The landed affine evidence covers the source duration=20 program.
    // Keeping this guard explicit prevents a different callback duration
    // from silently indexing a fitted table.
    if (geometry.duration !== DRAGON_BREATH_FIRE_DURATION) {
      throw new Error("DRAGON_BREATH affine evidence currently requires duration 20");
    }
    const rotated = geometry.attackerSide === "player";
    const pa = rotated ? MATRIX_A[age]! : NON_ROTATED_MATRIX_A[age]!;
    const pb = rotated ? MATRIX_B[age]! : 0;
    sprites.push({
      spawnIndex,
      age,
      centerX: geometry.attackerCenter.x + signedLinearOffset(
        geometry.attackerCenter.x,
        geometry.targetCenter.x,
        geometry.duration,
        age,
      ),
      centerY: geometry.attackerCenter.y + signedLinearOffset(
        geometry.attackerCenter.y,
        geometry.targetCenter.y,
        geometry.duration,
        age,
      ),
      sheetFrame: ((Math.floor((age + 1) / 3) % 3) + 1) as 1 | 2 | 3,
      pa,
      pb,
      pc: rotated ? -pb : 0,
      pd: pa,
      subpriority: geometry.targetSubpriority - geometry.subpriorityOffset,
      hFlip: rotated,
      vFlip: rotated,
      targetOnMonBg: true,
    });
  }

  // `SortSprites` gives the larger screen-y sprite the lower OAM index when
  // priority/subpriority tie. Draw losers first so the same winner is painted
  // last in the software framebuffer.
  return sprites.sort((a, b) =>
    a.centerY - b.centerY || b.spawnIndex - a.spawnIndex
  );
}
