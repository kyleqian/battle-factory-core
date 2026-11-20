import enemyElevations from "../data/gen/enemy-mon-elevations.json" with { type: "json" };
import monPicCoordsData from "../data/gen/mon-pic-coords.json" with { type: "json" };
import substituteDollAsset from "../animation/assets/substitute.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import castformFormsData from "../assets/gen/castform-forms.json" with { type: "json" };
import spritePalettesData from "../assets/gen/battle-sprite-palettes.json" with { type: "json" };
import picGeometryData from "../assets/gen/battle-pic-geometry.json" with { type: "json" };
import type { MonPicGeometry } from "./monPicGeometry.ts";
import { backPixels, frontPixels } from "./monPicPixels.ts";
import { SPECIES_SPINDA_SYMBOL, spindaSpottedTileset } from "./spindaSpots.ts";
import type { BattleCommandPresentationState } from "./battleCommandPresentation.ts";
import type { RgbColor } from "./bg.ts";

export type BattleCommandMonPicTileset = Readonly<{
  columns: number;
  rows: number;
  tiles: readonly (readonly number[])[];
}>;

export type BattleCommandMonPic = Readonly<{
  tileset: BattleCommandMonPicTileset;
  palette: readonly RgbColor[];
}>;

export type BattleCommandMonPicCoords = Readonly<{
  width: number;
  height: number;
  yOffset: number;
}>;

export type BattleCommandFieldArtBattler = Readonly<{
  species: number;
  speciesSymbol: string;
  pic: BattleCommandMonPic;
  /**
   * Columns / rows / first opaque row of `pic.tileset`, from src/assets/gen/battle-pic-geometry.json (bnd254b). Tick-path code
   * (faint timing, the Extrasensory gate) reads this, never the sprite pixels in `pic.tileset`, which only renderers read.
   */
  picGeometry: MonPicGeometry;
  coords: BattleCommandMonPicCoords;
  /** Unelevated canvas origin; use battleCommandFieldSpriteOrigin for scanout. */
  origin: Readonly<{ x: number; y: number }>;
  /**
   * Set when the field battler is shown as the Substitute doll (BattleCommandFieldBattler.substituteDoll): `pic` is the
   * doll sheet + palette, `origin` the doll corner, the species elevation does not apply and the opponent's shadow is
   * hidden. `species` / `speciesSymbol` / `coords` stay the mon's.
   */
  substituteDoll?: true;
  /**
   * cast83 (ISSUES #143): a CASTFORM shown in a weather form (the field battler's presentation-only `castformForm`, 1..3): `pic` is
   * the form's frame + castformPalette[form], the opponent's `coords` are gCastformFrontSpriteCoords[form], and the origin / elevation
   * follow the form (castformFieldArtForm). Absent for every other battler and for the normal form.
   */
  castformForm?: number;
  /**
   * trf174: set when the battler is shown transformed (BattleCommandFieldBattler.transform): `species` / `speciesSymbol` /
   * `coords` / `origin` / elevation are the copied species' (GetBattlerSpriteDefault_Y and the shadow read transformSpecies) and
   * `pic` is its back (player) / front (opponent) picture with the transform palette (battleCommandTransformPalette). The x2
   * the sprite keeps is the battler's own: `restSpeciesSymbol` names the species whose front idle rest it still holds.
   */
  restSpeciesSymbol?: string;
}>;

export type BattleCommandFieldArtView = Readonly<{
  player: BattleCommandFieldArtBattler;
  opponent: BattleCommandFieldArtBattler;
}>;

type SpeciesRow = Readonly<{ id: number; name: string }>;
type SpeciesStatsAsset = Readonly<{ species: readonly SpeciesRow[] }>;
type CoordsAsset = Readonly<{
  back: Readonly<Record<string, BattleCommandMonPicCoords>>;
  front: Readonly<Record<string, BattleCommandMonPicCoords>>;
}>;

const speciesSymbolById = new Map(
  (speciesStatsData as SpeciesStatsAsset).species.map(({ id, name }) => [
    id,
    name.replace(/^SPECIES_/, ""),
  ]),
);
const spritePalettes = spritePalettesData as unknown as Readonly<Record<"back" | "front", Readonly<Record<string, readonly RgbColor[]>>>>;
const picGeometry = picGeometryData as unknown as Readonly<{
  back: Readonly<Record<string, MonPicGeometry>>;
  front: Readonly<Record<string, MonPicGeometry>>;
  substituteDoll: Readonly<Record<"player" | "opponent", MonPicGeometry>>;
  castform: readonly Readonly<Record<"player" | "opponent", MonPicGeometry>>[];
}>;
// The battler's pic: `palette` from battle-sprite-palettes.json (tick-path reads: liveMoveAnimation, liveMovePaletteComposite), and `tileset` /
// `frame2` as lazy getters over the pixel provider (monPicPixels.ts, installed by renderers only), so building a view never reads pixels and
// the headless graph carries no sprite JSON (bnd256c). Cached: the pic object stays stable per species.
const picCache = new Map<string, BattleCommandMonPic>();
function speciesPic(side: "player" | "opponent", speciesSymbol: string): BattleCommandMonPic | undefined {
  const key = `${side}/${speciesSymbol}`;
  let pic = picCache.get(key);
  if (pic === undefined) {
    const palette = spritePalettes[side === "player" ? "back" : "front"][speciesSymbol];
    if (palette === undefined) return undefined;
    const pixels = side === "player" ? backPixels : frontPixels;
    const lazy = { palette } as { palette: readonly RgbColor[] };
    Object.defineProperty(lazy, "tileset", { enumerable: true, get: () => pixels(speciesSymbol)!.tileset });
    if (side === "opponent") Object.defineProperty(lazy, "frame2", { enumerable: true, get: () => pixels(speciesSymbol)!.frame2 });
    pic = Object.freeze(lazy) as BattleCommandMonPic;
    picCache.set(key, pic);
  }
  return pic;
}
const coords = monPicCoordsData as CoordsAsset;

// spd1: an opponent SPINDA's front picture carries its personality's spots (DrawSpindaSpots, pokemon.c:5808-5812; src/engine/spindaSpots.ts).
// Same lazy shape as speciesPic (the spotted tileset is built on the first pixel read), cached per personality.
const spindaPicCache = new Map<number, BattleCommandMonPic>();
function spindaFrontPic(personality: number): BattleCommandMonPic | undefined {
  const key = personality >>> 0;
  let pic = spindaPicCache.get(key);
  if (pic === undefined) {
    const base = speciesPic("opponent", SPECIES_SPINDA_SYMBOL);
    if (base === undefined) return undefined;
    let spotted: BattleCommandMonPicTileset | undefined;
    const lazy = { palette: base.palette } as { palette: readonly RgbColor[] };
    Object.defineProperty(lazy, "tileset", { enumerable: true, get: () => (spotted ??= spindaSpottedTileset(frontPixels(SPECIES_SPINDA_SYMBOL)!.tileset, key)) });
    Object.defineProperty(lazy, "frame2", { enumerable: true, get: () => frontPixels(SPECIES_SPINDA_SYMBOL)!.frame2 });
    pic = Object.freeze(lazy) as BattleCommandMonPic;
    if (spindaPicCache.size > 64) spindaPicCache.clear();
    spindaPicCache.set(key, pic);
  }
  return pic;
}

/** GetBattlerYDelta (battle_anim_mons.c:208-210) returns sCastformBackSpriteYCoords[gBattleMonForms]
 * (:72-79, all 0, normal form modelled) for a player CASTFORM instead of gMonBackPicCoords y_offset (13). */
const SOURCE_BACK_Y_DELTA: Readonly<Record<string, number>> = { CASTFORM: 0 };

type CastformFormArt = Readonly<{
  form: number;
  front: BattleCommandMonPic;
  back: BattleCommandMonPic;
  frontCoords: BattleCommandMonPicCoords;
  elevation: number;
  backYDelta: number;
}>;
/** cast83: src/assets/gen/castform-forms.json (tools/extract/cast83-extract-castform-forms.ts), indexed by CASTFORM_NORMAL .. _ICE. */
const castformForms = (castformFormsData as unknown as Readonly<{ forms: readonly CastformFormArt[] }>).forms;

/**
 * cast83: the weather form whose art the field draws for a CASTFORM, or undefined (every other species, the normal form, and an
 * unknown form, which keeps the normal art; liveCastformFormDeclines still declines it). The ROM loads the form's frame and
 * castformPalette[form] (HandleSpeciesGfxDataChange / BattleLoad*MonSpriteGfx, battle_gfx_sfx_util.c:615-620 / :678-682 / :945-947).
 */
export function castformFieldArtForm(speciesSymbol: string, castformForm: number | undefined): CastformFormArt | undefined {
  if (speciesSymbol !== "CASTFORM" || castformForm === undefined || castformForm === 0) return undefined;
  return castformForms[castformForm];
}

type SubstituteDollAsset = Readonly<{
  front: BattleCommandMonPicTileset;
  back: BattleCommandMonPicTileset;
  palette: readonly RgbColor[];
}>;
const substituteDoll = substituteDollAsset as unknown as SubstituteDollAsset;
const SUBSTITUTE_DOLL_PIC = Object.freeze({
  player: Object.freeze({ tileset: substituteDoll.back, palette: substituteDoll.palette }),
  opponent: Object.freeze({ tileset: substituteDoll.front, palette: substituteDoll.palette }),
});
/**
 * Doll corner: sBattlerCoords x (72 / 176) - 32 and GetSubstituteSpriteDefault_Y (battle_anim_mons.c:332:
 * BATTLER_COORD_Y + 17 player / + 16 opponent = 97 / 56) - 32; species independent and never elevated
 * (prep37 field.json: 1993 / 4399 / 2207 Scene OFF / 6898 elevated GOLBAT doll pixels exact at these corners).
 */
const SUBSTITUTE_DOLL_ORIGIN = Object.freeze({
  player: Object.freeze({ x: 40, y: 65 }),
  opponent: Object.freeze({ x: 144, y: 24 }),
});

/**
 * trf174: HandleSpeciesGfxDataChange's palette (battle_gfx_sfx_util.c:1005-1017): the copied species' palette, then
 * BlendPalette(paletteOffset, 16, 6, RGB_WHITE) — each 5-bit channel c + (((31 - c) * 6) >> 4) — copied into the unfaded buffer, so the
 * transformed battler keeps the blend for the rest of its stay. (The shiny pick from the user's own personality / OT is not modelled:
 * a shiny transformer's body declines, liveTransform.ts.)
 */
export function battleCommandTransformPalette(palette: readonly RgbColor[]): readonly RgbColor[] {
  const blend = (c8: number) => {
    const c5 = c8 >> 3;
    const b5 = c5 + (((31 - c5) * 6) >> 4);
    return (b5 << 3) | (b5 >> 2);
  };
  return Object.freeze(palette.map((color) => Object.freeze({ r: blend(color.r), g: blend(color.g), b: blend(color.b) })));
}

const transformPaletteCache = new Map<string, readonly RgbColor[]>();

function fieldArtBattler(
  species: number,
  side: "player" | "opponent",
  doll = false,
  castformForm?: number,
  transform?: Readonly<{ species: number; personality: number }>,
  personality?: number,
): BattleCommandFieldArtBattler {
  if (transform !== undefined && !doll) {
    const own = speciesSymbolById.get(species);
    // The copied species' art; a transformed CASTFORM shows its normal form here (the target's form is not tracked).
    const shown = fieldArtBattler(transform.species, side);
    const key = `${side}/${shown.speciesSymbol}`;
    let palette = transformPaletteCache.get(key);
    if (palette === undefined) {
      palette = battleCommandTransformPalette(shown.pic.palette);
      transformPaletteCache.set(key, palette);
    }
    return Object.freeze({
      ...shown, pic: Object.freeze({ get tileset() { return shown.pic.tileset; }, palette }),
      ...(own === undefined ? {} : { restSpeciesSymbol: own }),
    });
  }
  const speciesSymbol = speciesSymbolById.get(species);
  if (speciesSymbol === undefined) {
    throw new Error(`battle-command field art: unknown species id ${species}`);
  }
  const pic = side === "opponent" && speciesSymbol === SPECIES_SPINDA_SYMBOL && personality !== undefined
    ? spindaFrontPic(personality)
    : speciesPic(side, speciesSymbol);
  const geometry = picGeometry[side === "player" ? "back" : "front"][speciesSymbol];
  const picCoords = side === "player"
    ? coords.back[speciesSymbol]
    : coords.front[speciesSymbol];
  if (pic === undefined || geometry === undefined || picCoords === undefined) {
    throw new Error(
      `battle-command field art: missing ${side} battle pic for SPECIES_${speciesSymbol}`,
    );
  }

  const form = castformFieldArtForm(speciesSymbol, castformForm);
  if (doll) {
    return Object.freeze({
      species, speciesSymbol, pic: SUBSTITUTE_DOLL_PIC[side], picGeometry: picGeometry.substituteDoll[side], coords: picCoords, origin: SUBSTITUTE_DOLL_ORIGIN[side],
      substituteDoll: true as const, ...(form === undefined ? {} : { castformForm: form.form }),
    });
  }
  if (form !== undefined) {
    // GetBattlerYDelta: sCastformBackSpriteYCoords[form] (player) / gCastformFrontSpriteCoords[form].y_offset (opponent);
    // GetBattlerSpriteCoordAttr reads gMonBackPicCoords for the player and gCastformFrontSpriteCoords[form] for the opponent
    // (battle_anim_mons.c:206-208 / :235-237 / :2252-2254).
    const formCoords = side === "player" ? picCoords : Object.freeze({ ...form.frontCoords });
    return Object.freeze({
      species,
      speciesSymbol,
      pic: side === "player" ? form.back : form.front,
      picGeometry: picGeometry.castform[form.form]![side],
      coords: formCoords,
      origin: Object.freeze({ x: side === "player" ? 40 : 144, y: side === "player" ? 48 + form.backYDelta : 8 + form.frontCoords.yOffset }),
      castformForm: form.form,
    });
  }
  // GetBattlerSpriteCoord(BATTLER_COORD_X_2/Y_PIC_OFFSET) places both
  // 64×64 OBJ canvases at fixed X origins; the source pic-coordinate table
  // supplies the species-specific resting Y offset inside that canvas.
  return Object.freeze({
    species,
    speciesSymbol,
    pic,
    picGeometry: geometry,
    coords: picCoords,
    origin: Object.freeze({
      x: side === "player" ? 40 : 144,
      y: (side === "player" ? 48 : 8) +
        (side === "player" ? SOURCE_BACK_Y_DELTA[speciesSymbol] ?? picCoords.yOffset : picCoords.yOffset),
    }),
  });
}

/**
 * Resolves both field pictures only from the live command snapshot's species
 * IDs. No encounter, battle/turn number, trace clock, or recorded identity
 * participates.
 */
export function createBattleCommandFieldArtView(
  field: BattleCommandPresentationState["field"],
): BattleCommandFieldArtView {
  return Object.freeze({
    player: fieldArtBattler(field.player.species, "player", field.player.substituteDoll === true, field.player.castformForm,
      field.player.transform),
    opponent: fieldArtBattler(field.opponent.species, "opponent", field.opponent.substituteDoll === true, field.opponent.castformForm,
      field.opponent.transform, field.opponent.personality),
  });
}

/** Source GetBattlerSpriteFinal_Y(..., FALSE), converted from center to corner.
 * Existing Scene OFF renderers already subtract this elevation at scanout.
 * Live move adapters use the same rule before constructing their geometry.
 */
export function battleCommandFieldSpriteOrigin(
  battler: BattleCommandFieldArtBattler,
  side: "player" | "opponent",
): Readonly<{ x: number; y: number }> {
  return {
    x: battler.origin.x,
    y: battler.origin.y - battleCommandFieldArtElevation(battler, side),
  };
}

/**
 * The species' own corner (battleCommandFieldSpriteOrigin of the mon, elevation included) also while the battler is shown as the
 * Substitute doll: GetBattlerSpriteCoord / GetBattlerSpriteFinal_Y read the species pic coords and elevation, never the doll OBJ
 * (docs/next-adapters-prep38.md s2: doll-corner anchors break Attract, Bite, Body Slam, Brick Break, Crunch, Faint Attack).
 */
export function battleCommandFieldSpeciesSpriteOrigin(
  battler: BattleCommandFieldArtBattler,
  side: "player" | "opponent",
): Readonly<{ x: number; y: number }> {
  return battler.substituteDoll === true
    ? battleCommandFieldSpriteOrigin(fieldArtBattler(battler.species, side, false, battler.castformForm), side)
    : battleCommandFieldSpriteOrigin(battler, side);
}

/** gEnemyMonElevation of the displayed opponent; 0 for the player and for the Substitute doll (prep37: elevated GOLBAT's
 * doll at (144, 24), 6898 / 6898 rows). */
export function battleCommandFieldArtElevation(
  battler: BattleCommandFieldArtBattler,
  side: "player" | "opponent",
): number {
  if (side !== "opponent" || battler.substituteDoll === true) return 0;
  // cast83: sCastformElevations[form] (GetBattlerElevation, battle_anim_mons.c:258-259).
  const form = castformFieldArtForm(battler.speciesSymbol, battler.castformForm);
  return form?.elevation ?? (enemyElevations as Readonly<Record<string, number>>)[battler.speciesSymbol] ?? 0;
}
