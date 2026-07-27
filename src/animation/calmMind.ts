export const CALM_MIND_BLEND_START_AGE = 3;
export const CALM_MIND_DARK_HOLD_START_AGE = 20;
export const CALM_MIND_REVERSE_BLEND_START_AGE = 84;
export const CALM_MIND_CLEANUP_AGE = 100;
export const CALM_MIND_RING_START_AGES = [20, 36, 52] as const;
export const CALM_MIND_RING_CALLBACKS = 30;

export interface CalmMindRing {
  readonly spawnIndex: number;
  readonly localAge: number;
  /** Source affine accumulator before `ConvertScaleParam`. */
  readonly sourceScale: number;
  /** GBA OAM matrix A/D value after `ConvertScaleParam`. */
  readonly oamScale: number;
}

export interface CalmMindState {
  readonly paletteBlendY: number;
  readonly attackerOnMonBg: boolean;
  readonly nonAttackerInvisible: boolean;
  readonly rings: readonly CalmMindRing[];
}

/**
 * Source reducer for the complete `Move_CALM_MIND` visual body.
 *
 * Age zero is the settled field immediately before `monbg ANIM_ATK_PARTNER`.
 * The three rings follow the literal delay-14 script schedule; command
 * dispatch contributes the two additional callbacks between creations.
 */
export function calmMindAtAge(age: number): CalmMindState {
  let paletteBlendY = 0;
  if (age >= CALM_MIND_REVERSE_BLEND_START_AGE) {
    paletteBlendY = Math.max(
      0,
      16 - (age - CALM_MIND_REVERSE_BLEND_START_AGE),
    );
  } else if (age >= CALM_MIND_BLEND_START_AGE) {
    paletteBlendY = Math.min(16, age - CALM_MIND_BLEND_START_AGE);
  }

  const rings: CalmMindRing[] = [];
  for (let index = 0; index < CALM_MIND_RING_START_AGES.length; index++) {
    const localAge = age - CALM_MIND_RING_START_AGES[index]!;
    if (localAge < 0 || localAge > CALM_MIND_RING_CALLBACKS) continue;
    // AnimateSprites consumes the first -16 affine callback on the creation
    // pass before the sprite reaches hardware OAM.
    const sourceScale = 0x200 - 0x10 * Math.min(
      localAge + 1,
      CALM_MIND_RING_CALLBACKS,
    );
    rings.push({
      spawnIndex: index,
      localAge,
      sourceScale,
      oamScale: Math.floor(0x10000 / sourceScale),
    });
  }

  return {
    paletteBlendY,
    attackerOnMonBg: age >= 1 && age < CALM_MIND_CLEANUP_AGE,
    nonAttackerInvisible:
      age >= CALM_MIND_DARK_HOLD_START_AGE
      && age < CALM_MIND_REVERSE_BLEND_START_AGE,
    rings,
  };
}
