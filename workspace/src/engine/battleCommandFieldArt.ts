import backSpritesData from "../assets/gen/battle-back-sprites.json" with { type: "json" };
import frontSpritesData from "../assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import monPicCoordsData from "../data/gen/mon-pic-coords.json" with { type: "json" };
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
  /** Resting top-left of the source 64×64 OBJ canvas. */
  origin: Readonly<{ x: number; y: number }>;
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

function fieldArtBattler(
  species: number,
  side: "player" | "opponent",
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
      y: (side === "player" ? 48 : 8) + picCoords.yOffset,
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
    player: fieldArtBattler(field.player.species, "player"),
    opponent: fieldArtBattler(field.opponent.species, "opponent"),
  });
}
