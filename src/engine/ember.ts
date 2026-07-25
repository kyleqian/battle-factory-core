/**
 * Source-shaped reducer for `Move_EMBER` (`data/battle_anim_scripts.s:919-937`).
 *
 * Two independent sprite families, both tagged `ANIM_TAG_SMALL_EMBER`, both
 * non-affine (`gOamData_AffineOff_ObjNormal_32x32`):
 *
 * - Three `gEmberSpriteTemplate` sprites (`TranslateAnimSpriteToTargetMonLocation`
 *   -> `StartAnimLinearTranslation`, `battle_anim_mons.c:1546-1570`), spawned
 *   6 RAM ticks apart (`delay 4` costs 6 ticks under the shared script-VM
 *   rule this codebase already derived for FEATHER_DANCE - confirmed again
 *   here against a second, independent move). Each travels from the attacker
 *   toward a target-relative point (`-16`/`0`/`+16` px spread) over 20 ticks,
 *   using a static frame (`gDummySpriteAnimTable`, frame 0).
 * - Three `gEmberFlareSpriteTemplate` sprites (`AnimEmberFlare` ->
 *   `AnimTravelDiagonally` -> `StartAnimLinearTranslation`,
 *   `battle_anim_fire.c:624-632`, `battle_anim_mons.c:1591-1624`), spawned by
 *   `EmberFireHit` (`battle_anim_scripts.s:934-937`) starting 18 ticks after
 *   the third ember (`delay 16` costs 18 ticks), also 6 ticks apart. Each
 *   travels a short horizontal hop near the target over 20 ticks, cycling a
 *   5-frame sheet (`sAnim_BasicFire`) at 4 ticks/frame.
 *
 * Both families share `StartAnimLinearTranslation`'s Q8.8 accumulator
 * (`animLinearTranslation.ts`'s doc explains the closed form used here,
 * ported inline as `signedLinearOffset` to match the sibling DRAGON_BREATH/
 * FLAMETHROWER modules' own local copies rather than introducing a third
 * import site for the same nine-line function).
 */

export type EmberAttackerSide = "player" | "opponent";

export interface EmberGeometry {
  /** Attacker `BATTLER_COORD_X_2`/`Y_PIC_OFFSET` (`animationCenter`). */
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  /** Target `BATTLER_COORD_X_2`/`Y_PIC_OFFSET` (`animationCenter`); only `.x` feeds these formulas. */
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  /** Target `BATTLER_COORD_X`/`Y` (`battlePositionCenter`, no pic-offset). */
  readonly targetBattlePosition: Readonly<{ x: number; y: number }>;
  readonly attackerSide: EmberAttackerSide;
  /**
   * `createsprite ..., ANIM_TARGET, 2, ...`: subpriority is target-relative,
   * `GetBattlerSpriteSubpriority(gBattleAnimTarget) - subpriorityOffset`.
   * Per-side/species (e.g. 40 opponent-front, 30 player-back for this
   * codebase's established ONIX/MURKROW pair - RAM-probe-confirmed both
   * orientations resolve to 38/28, matching DRAGON_BREATH's own reused
   * `targetSubpriority`), not a fixed constant.
   */
  readonly targetSubpriority: number;
}

const SUBPRIORITY_OFFSET = 2;

export const EMBER_SPAWN_COUNT = 3;
export const EMBER_SPAWN_INTERVAL = 6;
export const EMBER_DURATION = 20;
export const EMBER_INITIAL_X_OFFSET = 20;
export const EMBER_TARGET_Y_OFFSET = 24;
export const EMBER_TARGET_X_OFFSETS = [-16, 0, 16] as const;

export const EMBER_FLARE_SPAWN_COUNT = 3;
export const EMBER_FLARE_SPAWN_INTERVAL = 6;
export const EMBER_FLARE_DURATION = 20;
export const EMBER_FLARE_INITIAL_X_OFFSET = -24;
export const EMBER_FLARE_INITIAL_Y_OFFSET = 24;
export const EMBER_FLARE_TARGET_X_OFFSET = 24;
export const EMBER_FLARE_TARGET_Y_OFFSET = 24;
/** `delay 16` after the third ember costs 18 real ticks (the `delay N -> N+2` VM rule). */
export const EMBER_FLARE_FIRST_SPAWN_AGE =
  (EMBER_SPAWN_COUNT - 1) * EMBER_SPAWN_INTERVAL + 18;
export const EMBER_FLARE_SHEET_FRAME_COUNT = 5;
export const EMBER_FLARE_FRAME_DURATION = 4;

export interface EmberSprite {
  readonly spawnIndex: number;
  readonly age: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly subpriority: number;
}

export interface EmberFlareSprite {
  readonly spawnIndex: number;
  readonly age: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly sheetFrame: 0 | 1 | 2 | 3 | 4;
  readonly subpriority: number;
}

/** `attackerX < targetX ? +offset : -offset` (`SetAnimSpriteInitialXOffset`), collapsed to a side check under this codebase's fixed player-left/opponent-right singles geometry. */
function sideSignedOffset(side: EmberAttackerSide, magnitude: number): number {
  return side === "player" ? magnitude : -magnitude;
}

/** `InitAnimLinearTranslation`/`AnimTranslateLinear`'s Q8.8 accumulator, closed-form (same derivation as `dragonBreath.ts`/`flamethrower.ts`'s local copies). */
function signedLinearOffset(start: number, end: number, duration: number, age: number): number {
  const distance = end - start;
  let fixedDelta = Math.floor((Math.abs(distance) << 8) / duration);
  if (distance < 0) fixedDelta |= 1;
  else fixedDelta &= ~1;
  const steps = Math.min(age + 1, duration);
  const magnitude = (fixedDelta * steps) >> 8;
  return distance < 0 ? -magnitude : magnitude;
}

export function emberSpritesAtAge(
  animationAge: number,
  geometry: Readonly<EmberGeometry>,
): readonly EmberSprite[] {
  const startX = geometry.attackerCenter.x + sideSignedOffset(geometry.attackerSide, EMBER_INITIAL_X_OFFSET);
  const startY = geometry.attackerCenter.y;
  const lifetime = EMBER_DURATION + 1;
  const sprites: EmberSprite[] = [];
  for (let spawnIndex = 0; spawnIndex < EMBER_SPAWN_COUNT; spawnIndex += 1) {
    const spawnAge = spawnIndex * EMBER_SPAWN_INTERVAL;
    const age = animationAge - spawnAge;
    if (age < 0 || age >= lifetime) continue;
    const targetXOffset = EMBER_TARGET_X_OFFSETS[spawnIndex]!;
    const destX = geometry.targetCenter.x
      + (geometry.attackerSide === "opponent" ? -targetXOffset : targetXOffset);
    const destY = geometry.targetBattlePosition.y + EMBER_TARGET_Y_OFFSET;
    sprites.push({
      spawnIndex,
      age,
      centerX: startX + signedLinearOffset(startX, destX, EMBER_DURATION, age),
      centerY: startY + signedLinearOffset(startY, destY, EMBER_DURATION, age),
      subpriority: geometry.targetSubpriority - SUBPRIORITY_OFFSET,
    });
  }
  return sprites;
}

export function emberFlareSpritesAtAge(
  animationAge: number,
  geometry: Readonly<EmberGeometry>,
): readonly EmberFlareSprite[] {
  const startX = geometry.targetBattlePosition.x
    + sideSignedOffset(geometry.attackerSide, EMBER_FLARE_INITIAL_X_OFFSET);
  const startY = geometry.targetBattlePosition.y + EMBER_FLARE_INITIAL_Y_OFFSET;
  const destX = geometry.targetCenter.x
    + (geometry.attackerSide === "opponent" ? -EMBER_FLARE_TARGET_X_OFFSET : EMBER_FLARE_TARGET_X_OFFSET);
  const destY = geometry.targetBattlePosition.y + EMBER_FLARE_TARGET_Y_OFFSET;
  const lifetime = EMBER_FLARE_DURATION + 1;
  const sprites: EmberFlareSprite[] = [];
  for (let spawnIndex = 0; spawnIndex < EMBER_FLARE_SPAWN_COUNT; spawnIndex += 1) {
    const spawnAge = EMBER_FLARE_FIRST_SPAWN_AGE + spawnIndex * EMBER_FLARE_SPAWN_INTERVAL;
    const age = animationAge - spawnAge;
    if (age < 0 || age >= lifetime) continue;
    const sheetFrame = (Math.floor((age + 1) / EMBER_FLARE_FRAME_DURATION)
      % EMBER_FLARE_SHEET_FRAME_COUNT) as 0 | 1 | 2 | 3 | 4;
    sprites.push({
      spawnIndex,
      age,
      centerX: startX + signedLinearOffset(startX, destX, EMBER_FLARE_DURATION, age),
      centerY: startY + signedLinearOffset(startY, destY, EMBER_FLARE_DURATION, age),
      sheetFrame,
      subpriority: geometry.targetSubpriority - SUBPRIORITY_OFFSET,
    });
  }
  return sprites;
}

export interface EmberOrderedSprite {
  readonly kind: "ember" | "flare";
  readonly centerX: number;
  readonly centerY: number;
  readonly sheetFrame: 0 | 1 | 2 | 3 | 4;
}

/**
 * Both families share one subpriority (38): ties resolve by screen Y, larger
 * Y painted last/frontmost (`SortSprites`, same rule already established by
 * `dragonBreath.ts`'s own identically-shaped comment/sort).
 */
export function emberSpritesInDrawOrder(
  animationAge: number,
  geometry: Readonly<EmberGeometry>,
): readonly EmberOrderedSprite[] {
  const embers = emberSpritesAtAge(animationAge, geometry).map((sprite) => ({
    kind: "ember" as const,
    centerX: sprite.centerX,
    centerY: sprite.centerY,
    sheetFrame: 0 as const,
    spawnIndex: sprite.spawnIndex,
  }));
  const flares = emberFlareSpritesAtAge(animationAge, geometry).map((sprite) => ({
    kind: "flare" as const,
    centerX: sprite.centerX,
    centerY: sprite.centerY,
    sheetFrame: sprite.sheetFrame,
    spawnIndex: sprite.spawnIndex,
  }));
  return [...embers, ...flares].sort((a, b) =>
    a.centerY - b.centerY || a.spawnIndex - b.spawnIndex
  );
}
