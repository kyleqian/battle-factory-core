import enemyElevations from "../data/gen/enemy-mon-elevations.json" with { type: "json" };
import backSpritesData from "../assets/gen/battle-back-sprites.json" with { type: "json" };
import frontSpritesData from "../assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import monPicCoordsData from "../data/gen/mon-pic-coords.json" with { type: "json" };
import substituteDollAsset from "../animation/assets/substitute.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
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
  coords: BattleCommandMonPicCoords;
  /** Unelevated canvas origin; use battleCommandFieldSpriteOrigin for scanout. */
  origin: Readonly<{ x: number; y: number }>;
  /**
   * Set when the field battler is shown as the Substitute doll (BattleCommandFieldBattler.substituteDoll): `pic` is the
   * doll sheet + palette, `origin` the doll corner, the species elevation does not apply and the opponent's shadow is
   * hidden. `species` / `speciesSymbol` / `coords` stay the mon's.
   */
  substituteDoll?: true;
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
const backSprites = backSpritesData as Readonly<Record<string, BattleCommandMonPic>>;
const frontSprites = frontSpritesData as Readonly<Record<string, BattleCommandMonPic>>;
const coords = monPicCoordsData as CoordsAsset;

/** GetBattlerYDelta (battle_anim_mons.c:208-210) returns sCastformBackSpriteYCoords[gBattleMonForms]
 * (:72-79, all 0, normal form modelled) for a player CASTFORM instead of gMonBackPicCoords y_offset (13). */
const SOURCE_BACK_Y_DELTA: Readonly<Record<string, number>> = { CASTFORM: 0 };

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

function fieldArtBattler(
  species: number,
  side: "player" | "opponent",
  doll = false,
): BattleCommandFieldArtBattler {
  const speciesSymbol = speciesSymbolById.get(species);
  if (speciesSymbol === undefined) {
    throw new Error(`battle-command field art: unknown species id ${species}`);
  }
  const pic = side === "player"
    ? backSprites[speciesSymbol]
    : frontSprites[speciesSymbol];
  const picCoords = side === "player"
    ? coords.back[speciesSymbol]
    : coords.front[speciesSymbol];
  if (pic === undefined || picCoords === undefined) {
    throw new Error(
      `battle-command field art: missing ${side} battle pic for SPECIES_${speciesSymbol}`,
    );
  }

  if (doll) {
    return Object.freeze({
      species, speciesSymbol, pic: SUBSTITUTE_DOLL_PIC[side], coords: picCoords, origin: SUBSTITUTE_DOLL_ORIGIN[side],
      substituteDoll: true as const,
    });
  }
  // GetBattlerSpriteCoord(BATTLER_COORD_X_2/Y_PIC_OFFSET) places both
  // 64×64 OBJ canvases at fixed X origins; the source pic-coordinate table
  // supplies the species-specific resting Y offset inside that canvas.
  return Object.freeze({
    species,
    speciesSymbol,
    pic,
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
    player: fieldArtBattler(field.player.species, "player", field.player.substituteDoll === true),
    opponent: fieldArtBattler(field.opponent.species, "opponent", field.opponent.substituteDoll === true),
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
    ? battleCommandFieldSpriteOrigin(fieldArtBattler(battler.species, side), side)
    : battleCommandFieldSpriteOrigin(battler, side);
}

/** gEnemyMonElevation of the displayed opponent; 0 for the player and for the Substitute doll (prep37: elevated GOLBAT's
 * doll at (144, 24), 6898 / 6898 rows). */
export function battleCommandFieldArtElevation(
  battler: BattleCommandFieldArtBattler,
  side: "player" | "opponent",
): number {
  return side === "opponent" && battler.substituteDoll !== true
    ? (enemyElevations as Readonly<Record<string, number>>)[battler.speciesSymbol] ?? 0
    : 0;
}
