/**
 * Production palette composite for the BG-snapshot move bodies (Overheat, Silver Wind; prep16 s0.2). Pure and source-derived:
 * only existing production assets, never a capture row. Banks (BG 0-15, OBJ 16-31): BG 2/3 = battle-bg palette[0] (== [1]),
 * BG 4 = palette[2], OBJ 16 = the player's back-sprite palette, OBJ 17 = the opponent's front-sprite palette; every other bank
 * 0 (the reducers never read it; the move's own asset palettes are loaded by the reducers at their load age, and the monbg
 * bank is written by the reducers). All three arrays are identical at activation (prep16 s0.2, ROM banks 2-4/16/17).
 * Shiny battlers have no repo palette (genuinely missing): callers gate on `liveBattlerIsShiny`.
 */
import backSprites from "../assets/gen/battle-back-sprites.json" with { type: "json" };
import frontSprites from "../assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import battleBg from "../assets/gen/battle-bg.json" with { type: "json" };

type Rgb = Readonly<{ r: number; g: number; b: number }>;
export type LivePaletteComposite = Readonly<{ unfaded: number[]; faded: number[]; hardware: number[] }>;

const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;

/** The composite for the two displayed species (symbolic names, e.g. "SOLROCK"), or null when an art asset is missing. */
export function composeLivePalettes(playerSpecies: string, opponentSpecies: string): LivePaletteComposite | null {
  const back = (backSprites as unknown as Record<string, { palette: Rgb[] }>)[playerSpecies];
  const front = (frontSprites as unknown as Record<string, { palette: Rgb[] }>)[opponentSpecies];
  if (!back || !front) return null;
  const out = new Array<number>(512).fill(0);
  const put = (bank: number, palette: readonly Rgb[]) => palette.forEach((c, i) => { out[bank * 16 + i] = bgr555(c); });
  const bg = (battleBg as unknown as { palette: Rgb[][] }).palette;
  put(2, bg[0]!); put(3, bg[1]!); put(4, bg[2]!); put(16, back.palette); put(17, front.palette);
  return Object.freeze({ unfaded: out.slice(), faded: out.slice(), hardware: out.slice() });
}

type LiveArtPaletteBattler = Readonly<{
  speciesSymbol: string; substituteDoll?: true; castformForm?: number; pic: Readonly<{ palette: readonly Rgb[] }>;
}>;

/**
 * cast83 (ISSUES #143): composeLivePalettes for the displayed field art's species, with a CASTFORM shown in a weather form loading
 * castformPalette[form] (its art's palette) into its OBJ bank (16 player / 17 opponent; battle_gfx_sfx_util.c:619 / :682 / :947).
 * Identical to composeLivePalettes when neither battler carries a form.
 */
export function composeLiveArtPalettes(art: Readonly<Record<"player" | "opponent", LiveArtPaletteBattler>>): LivePaletteComposite | null {
  const composite = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
  if (composite === null || (art.player.castformForm === undefined && art.opponent.castformForm === undefined)) return composite;
  const patch = (words: readonly number[]) => {
    const out = words.slice();
    for (const side of ["player", "opponent"] as const) {
      if (art[side].castformForm !== undefined && art[side].substituteDoll !== true) {
        art[side].pic.palette.forEach((c, i) => { out[(side === "player" ? 16 : 17) * 16 + i] = bgr555(c); });
      }
    }
    return out;
  };
  return Object.freeze({ unfaded: patch(composite.unfaded), faded: patch(composite.faded), hardware: patch(composite.hardware) });
}

/**
 * composeLivePalettes for the displayed field art: a battler shown as the Substitute doll has gSubstituteDollPal in its OBJ bank
 * (16 player / 17 opponent; BattleLoadSubstituteOrMonSpriteGfx). docs/next-adapters-prep38.md s1 NEEDS-PALETTE-COMPOSITE: Megahorn's
 * monbg draws the doll tiles with that bank (95k..105k px with the species palette, 0 px with the doll's).
 */
export function composeLiveFieldPalettes(art: Readonly<Record<"player" | "opponent", LiveArtPaletteBattler>>): LivePaletteComposite | null {
  const composite = composeLiveArtPalettes(art);
  if (composite === null || (art.player.substituteDoll !== true && art.opponent.substituteDoll !== true)) return composite;
  const patch = (words: readonly number[]) => {
    const out = words.slice();
    for (const side of ["player", "opponent"] as const) {
      if (art[side].substituteDoll === true) art[side].pic.palette.forEach((c, i) => { out[(side === "player" ? 16 : 17) * 16 + i] = bgr555(c); });
    }
    return out;
  };
  return Object.freeze({ unfaded: patch(composite.unfaded), faded: patch(composite.faded), hardware: patch(composite.hardware) });
}

/** Factory mons are created with OT_ID_PRESET = the player's trainer id (factoryAnchorSession ANCHOR_FACTORY_METADATA). */
const FACTORY_OT_ID = 416_049_562;

/**
 * GET_SHINY_VALUE(otId, personality) < 8 under the Factory OT. Absent personality (staged views without one) is treated as
 * not shiny: every production displayed battler carries its personality.
 */
export function liveBattlerIsShiny(personality: number | undefined): boolean {
  if (personality === undefined) return false;
  const value = ((FACTORY_OT_ID >>> 16) ^ (FACTORY_OT_ID & 0xffff) ^ (personality >>> 16) ^ (personality & 0xffff)) >>> 0;
  return value < 8;
}
