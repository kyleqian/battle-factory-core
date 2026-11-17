import { normalPaletteFadeY } from "./normalPaletteFade.ts";
import { healingBlueStarsAtAge, type RecoverEffectSprite } from "./recover.ts";

/**
 * wsh2: General_WishHeal (data/battle_anim_scripts.s:10667): simple_palette_blend F_PAL_BG black 0 -> 10 (delay 3), SE, GrantingStarsEffect
 * (two stars 10 callbacks apart, 60 ticks each), HealingEffect (four blue stars 9 apart; the Recover / Synthesis component,
 * recover.ts healingBlueStarsAtAge) and the blend back 10 -> 0. Age 0 = the command's first row (effect.age); the three script waits
 * (`WISH_HEAL_*_AGE`) were fitted against the ROM (docs/wsh1-general-anim-commands.md "wsh2").
 */
export const WISH_HEAL_BG_UP_AGE = 11;
export const WISH_HEAL_GRANTING_FIRST_VISIBLE_AGE = 43;
export const WISH_HEAL_HEALING_OFFSET = 75;
export const WISH_HEAL_BG_DOWN_AGE = 167;
export const WISH_HEAL_LAST_AGE = 193;

/** The second granting star's 61st tick (local 60) is not drawn: the script unloads ANIM_TAG_SPARKLE_2 and loads BLUE_STAR over it on that frame (no `delay 1` as Synthesis has). */
const GRANTING_LAST_LOCAL = 10 + 59;

export interface WishHealRow {
  /** BlendPalette y (toward RGB_BLACK) of the BG palettes. */
  readonly bgBlackCoeff: number;
  /** heldItemHeal.ts star age of the granting stars (96 / 106 = their first visible rows), or null while neither is on screen. */
  readonly grantingStarAge: number | null;
  readonly blueStars: readonly RecoverEffectSprite[];
}

export function wishHealRowAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): WishHealRow {
  const bgBlackCoeff = age < WISH_HEAL_BG_DOWN_AGE
    ? normalPaletteFadeY(age - WISH_HEAL_BG_UP_AGE + 1, 3, 0, 10, "bg")
    : normalPaletteFadeY(age - WISH_HEAL_BG_DOWN_AGE + 1, 3, 10, 0, "bg");
  const grantingLocal = age - WISH_HEAL_GRANTING_FIRST_VISIBLE_AGE;
  return {
    bgBlackCoeff: age < WISH_HEAL_BG_UP_AGE ? 0 : bgBlackCoeff,
    grantingStarAge: grantingLocal >= 0 && grantingLocal < GRANTING_LAST_LOCAL + 1 ? 96 + grantingLocal : null,
    blueStars: healingBlueStarsAtAge(age - (WISH_HEAL_GRANTING_FIRST_VISIBLE_AGE + WISH_HEAL_HEALING_OFFSET), side, center),
  };
}
