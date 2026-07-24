export type SandAttackSide = "player" | "opponent";

export interface SandAttackDirtSeed {
  readonly slot: number;
  readonly xStep: number;
  readonly yStep: number;
}

export interface SandAttackAnimationProfile {
  /** The 30 stock `Random2()`-resolved linear translations, in spawn order. */
  readonly dirt: readonly SandAttackDirtSeed[];
  /** Live source `sSpriteOrder` immediately before the move allocates sprites. */
  readonly spriteOrderSeed: readonly number[];
}

export interface SandAttackDirtSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
}

export interface SandAttackAnimationState {
  readonly attackerX2: number;
  readonly dirt: readonly SandAttackDirtSprite[];
}

export const SAND_ATTACK_SLIDE_FIRST_DISPLAY_AGE = 51;
export const SAND_ATTACK_DIRT_FIRST_DISPLAY_AGE = 56;
export const SAND_ATTACK_DIRT_WAVE_STRIDE = 4;
export const SAND_ATTACK_DIRT_LIFETIME = 21;

const SLIDE_MAGNITUDES: readonly number[] = [3, 6, 9, 9, 9, 4, 0];

/**
 * Source `SlideMonToOffset` / `SlideMonToOriginalPos`. The script requests
 * x=-10; `InitSpritePosToAnimAttacker(..., TRUE)` mirrors it for an
 * opponent-side attacker.
 */
export function sandAttackAttackerX2AtAge(
  age: number,
  attackerSide: SandAttackSide,
): number {
  const magnitude =
    SLIDE_MAGNITUDES[age - SAND_ATTACK_SLIDE_FIRST_DISPLAY_AGE] ?? 0;
  if (magnitude === 0) return 0;
  return attackerSide === "opponent" ? magnitude : -magnitude;
}

/**
 * Source `AnimDirtScatter`: six waves of five 8x8 sprites, all launched from
 * attacker coord2 plus the mirrored x=15/y=15 script arguments. The supplied
 * Q8.8 steps are the already-resolved animation RNG outcome; this display
 * reducer neither advances RNG nor owns battle state.
 */
export function sandAttackDirtAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: SandAttackSide,
  profile: Readonly<SandAttackAnimationProfile>,
): readonly SandAttackDirtSprite[] {
  const origin = {
    x: attackerCenter.x + (attackerSide === "player" ? 15 : -15),
    y: attackerCenter.y + 15,
  };
  const candidatesAt = (candidateAge: number) => profile.dirt
    .map((seed, index): SandAttackDirtSprite | null => {
      const wave = Math.floor(index / 5);
      const firstDisplayAge =
        SAND_ATTACK_DIRT_FIRST_DISPLAY_AGE
        + wave * SAND_ATTACK_DIRT_WAVE_STRIDE;
      const n = candidateAge - firstDisplayAge + 1;
      if (n < 1 || n > SAND_ATTACK_DIRT_LIFETIME) return null;
      const clamped = Math.min(n, 20);
      const dx = Math.floor((clamped * seed.xStep) / 256);
      return {
        slot: seed.slot,
        x: origin.x + (attackerSide === "opponent" ? -dx : dx),
        y: origin.y + Math.floor((clamped * seed.yStep) / 256),
      };
    })
    .filter((sprite): sprite is SandAttackDirtSprite => sprite !== null);

  const current = candidatesAt(age);
  if (current.length === 0) return current;

  // Faithful `SortSprites` insertion passes. Inactive slots retain the
  // source dummy key/y, so a later wave enters at its real live seed
  // position rather than an invented creation order.
  const order = profile.spriteOrderSeed.slice();
  for (
    let sortAge = SAND_ATTACK_DIRT_FIRST_DISPLAY_AGE;
    sortAge <= age;
    sortAge += 1
  ) {
    const packed = new Array<number>(64).fill((3 << 8) | 255);
    const y = new Array<number>(64).fill(-96);
    for (const sprite of candidatesAt(sortAge)) {
      packed[sprite.slot] = (2 << 8) | 2;
      y[sprite.slot] = sprite.y - 4;
    }
    for (let index = 1; index < order.length; index += 1) {
      let cursor = index;
      while (cursor > 0) {
        const prior = order[cursor - 1]!;
        const next = order[cursor]!;
        if (
          packed[prior]! > packed[next]!
          || (packed[prior] === packed[next] && y[prior]! < y[next]!)
        ) {
          order[cursor - 1] = next;
          order[cursor] = prior;
          cursor -= 1;
        } else {
          break;
        }
      }
    }
  }
  return current.slice().sort(
    (a, b) => order.indexOf(b.slot) - order.indexOf(a.slot),
  );
}

export function sandAttackAnimationAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: SandAttackSide,
  profile: Readonly<SandAttackAnimationProfile>,
): SandAttackAnimationState {
  return {
    attackerX2: sandAttackAttackerX2AtAge(age, attackerSide),
    dirt: sandAttackDirtAtAge(age, attackerCenter, attackerSide, profile),
  };
}

export interface SandAttackAccuracyBanner {
  readonly eva: number;
  readonly bg1Y: number;
}

/** Non-sharp `StatsChangeAnimation` decrease, relative to gCurrentMove. */
export function sandAttackAccuracyBannerAtAge(
  age: number,
): SandAttackAccuracyBanner | null {
  if (age < 112 || age > 171) return null;
  const eva = age <= 151
    ? Math.min(10, Math.floor((age - 112) / 2) + 1)
    : Math.max(0, 10 - (Math.floor((age - 152) / 2) + 1));
  return {
    eva,
    bg1Y: Math.max(-180, -3 * Math.max(0, age - 110)),
  };
}
