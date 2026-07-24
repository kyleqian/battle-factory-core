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
}>;

const POSITION_X2 = [
  5, 10, 15, 20, 25, 31, 36, 41, 46, 51, 57,
  62, 67, 72, 77, 83, 88, 93, 98, 103, 103,
] as const;

const POSITION_Y2 = [
  -2, -4, -6, -8, -10, -13, -15, -17, -19, -21, -24,
  -26, -28, -30, -32, -35, -37, -39, -41, -43, -43,
] as const;

const MATRIX_A = [
  -703, -617, -549, -495, -450, -413, -382, -355, -331, -311, -292,
  -276, -262, -249, -237, -226, -216, -207, -199, -191, -184,
] as const;

const MATRIX_B = [
  -17, -15, -13, -12, -11, -10, -9, -8, -8, -7, -7,
  -6, -6, -6, -5, -5, -5, -5, -4, -4, -4,
] as const;

export const DRAGON_BREATH_FIRE_SPAWN_COUNT = 11;
export const DRAGON_BREATH_FIRE_FIRST_SPAWN_RAM_OFFSET = 229;
export const DRAGON_BREATH_FIRE_SPAWN_INTERVAL = 4;
export const DRAGON_BREATH_FIRE_RENDER_LAG = 1;
export const DRAGON_BREATH_FIRE_LIFETIME = POSITION_X2.length;

export type DragonBreathFireGeometry = Readonly<{
  attackerCenter: Readonly<{ x: number; y: number }>;
  projectileSubpriority: number;
}>;

export const CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY: DragonBreathFireGeometry = {
  attackerCenter: { x: 72, y: 88 },
  projectileSubpriority: 38,
};

export function dragonBreathFireSprites(
  renderTick: number,
  pressTick: number,
  geometry: DragonBreathFireGeometry = CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
): DragonBreathFireSprite[] {
  const ramTick = renderTick - DRAGON_BREATH_FIRE_RENDER_LAG;
  const sprites: DragonBreathFireSprite[] = [];
  for (let spawnIndex = 0; spawnIndex < DRAGON_BREATH_FIRE_SPAWN_COUNT; spawnIndex += 1) {
    const spawnTick = pressTick
      + DRAGON_BREATH_FIRE_FIRST_SPAWN_RAM_OFFSET
      + spawnIndex * DRAGON_BREATH_FIRE_SPAWN_INTERVAL;
    const age = ramTick - spawnTick;
    if (age < 0 || age >= DRAGON_BREATH_FIRE_LIFETIME) continue;
    const pa = MATRIX_A[age]!;
    const pb = MATRIX_B[age]!;
    sprites.push({
      spawnIndex,
      age,
      centerX: geometry.attackerCenter.x + POSITION_X2[age]!,
      centerY: geometry.attackerCenter.y + POSITION_Y2[age]!,
      sheetFrame: ((Math.floor((age + 1) / 3) % 3) + 1) as 1 | 2 | 3,
      pa,
      pb,
      pc: -pb,
      pd: pa,
      subpriority: geometry.projectileSubpriority,
    });
  }

  // `SortSprites` gives the larger screen-y sprite the lower OAM index when
  // priority/subpriority tie. Draw losers first so the same winner is painted
  // last in the software framebuffer.
  return sprites.sort((a, b) =>
    a.centerY - b.centerY || b.spawnIndex - a.spawnIndex
  );
}
