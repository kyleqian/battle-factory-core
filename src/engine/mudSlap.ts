import {
  mudSandAttackerX2AtAge,
  type MudSandAttackerSide,
} from "./mudSandSlide.ts";

export interface MudSlapMudSeed {
  readonly slot: number;
  readonly xStep: number;
  readonly yStep: number;
}

export interface MudSlapAnimationProfile {
  /** The 30 stock `Random2()`-resolved linear translations, in spawn order. */
  readonly mud: readonly MudSlapMudSeed[];
  /** Live source `sSpriteOrder` immediately before the move allocates mud. */
  readonly spriteOrderSeed: readonly number[];
}

export interface MudSlapMudSprite {
  readonly slot: number;
  /** Center position of the independently rendered 16x16 frame-1 sprite. */
  readonly x: number;
  readonly y: number;
}

export interface MudSlapAnimationState {
  readonly attackerX2: number;
  readonly mud: readonly MudSlapMudSprite[];
}

export const MUD_SLAP_SLIDE_FIRST_DISPLAY_AGE = 47;
export const MUD_SLAP_MUD_FIRST_DISPLAY_AGE = 52;
export const MUD_SLAP_MUD_WAVE_STRIDE = 4;
export const MUD_SLAP_MUD_LIFETIME = 21;
export const MUD_SLAP_MUD_HALF_SIZE = 8;

function candidatesAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: MudSandAttackerSide,
  profile: Readonly<MudSlapAnimationProfile>,
  firstWaveAge: number,
): readonly MudSlapMudSprite[] {
  const origin = {
    x: attackerCenter.x + (attackerSide === "player" ? 15 : -15),
    y: attackerCenter.y + 15,
  };
  return profile.mud
    .map((seed, index): MudSlapMudSprite | null => {
      const wave = Math.floor(index / 5);
      const firstDisplayAge =
        firstWaveAge + wave * MUD_SLAP_MUD_WAVE_STRIDE;
      const n = age - firstDisplayAge + 1;
      if (n < 1 || n > MUD_SLAP_MUD_LIFETIME) return null;
      const clamped = Math.min(n, 20);
      const dxMagnitude = Math.floor((clamped * seed.xStep) / 256);
      const dyMagnitude = Math.floor((clamped * seed.yStep) / 256);
      return {
        slot: seed.slot,
        x: origin.x + (seed.xStep & 1 ? -dxMagnitude : dxMagnitude),
        y: origin.y + (seed.yStep & 1 ? -dyMagnitude : dyMagnitude),
      };
    })
    .filter((sprite): sprite is MudSlapMudSprite => sprite !== null);
}

/**
 * MUD SLAP's own `gMudSlapMudSpriteTemplate` program: six waves of five
 * 16x16 frame-1 sprites. It shares `AnimDirtScatter` translation semantics
 * with SAND ATTACK, but its geometry, script arguments, resolved velocities,
 * and lifetime are modeled as an independent move component.
 */
function orderedMudAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: MudSandAttackerSide,
  profile: Readonly<MudSlapAnimationProfile>,
  firstWaveAge: number,
): readonly MudSlapMudSprite[] {
  const current = candidatesAtAge(
    age,
    attackerCenter,
    attackerSide,
    profile,
    firstWaveAge,
  );
  if (current.length === 0) return current;

  const order = profile.spriteOrderSeed.slice();
  for (
    let sortAge = firstWaveAge;
    sortAge <= age;
    sortAge += 1
  ) {
    const packed = new Array<number>(64).fill((3 << 8) | 255);
    const y = new Array<number>(64).fill(-96);
    for (const sprite of candidatesAtAge(
      sortAge,
      attackerCenter,
      attackerSide,
      profile,
      firstWaveAge,
    )) {
      packed[sprite.slot] = (2 << 8) | 2;
      y[sprite.slot] = sprite.y - MUD_SLAP_MUD_HALF_SIZE;
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

export function mudSlapMudAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: MudSandAttackerSide,
  profile: Readonly<MudSlapAnimationProfile>,
): readonly MudSlapMudSprite[] {
  return orderedMudAtAge(
    age,
    attackerCenter,
    attackerSide,
    profile,
    MUD_SLAP_MUD_FIRST_DISPLAY_AGE,
  );
}

/** Current callback/OAM state, one display latch ahead of live RGB. */
export function mudSlapSourceMudAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: MudSandAttackerSide,
  profile: Readonly<MudSlapAnimationProfile>,
): readonly MudSlapMudSprite[] {
  return orderedMudAtAge(
    age,
    attackerCenter,
    attackerSide,
    profile,
    MUD_SLAP_MUD_FIRST_DISPLAY_AGE - 1,
  );
}

export function mudSlapAnimationAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: MudSandAttackerSide,
  profile: Readonly<MudSlapAnimationProfile>,
): MudSlapAnimationState {
  return {
    attackerX2: mudSandAttackerX2AtAge(
      age,
      attackerSide,
      MUD_SLAP_SLIDE_FIRST_DISPLAY_AGE,
    ),
    mud: mudSlapMudAtAge(age, attackerCenter, attackerSide, profile),
  };
}
