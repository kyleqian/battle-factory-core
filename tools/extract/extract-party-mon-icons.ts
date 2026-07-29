// Dev-time extractor for every party-menu icon reachable through the Battle
// Factory mon corpus. Emerald's icon loader resolves a species through
// gMonIconTable and gMonIconPaletteIndices, so preserve both the decoded two
// 32x32 frames and the shared palette-table index used by the ROM.
//
// Run with:
//   npm run extract:party-mon-icons
//
// Never imported at runtime - the production build only reads the committed
// JSON artifact under src/assets/gen/.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gbaRoundTrip } from "./gbaColor.ts";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

type FrontierMons = { count: number; entries: Array<{ species: string }> };
type Rgb = { r: number; g: number; b: number };
interface Tileset { columns: number; rows: number; tiles: number[][] }

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const DATA_GEN = join(ROOT, "src", "data", "gen");
const OUT = join(ROOT, "src", "assets", "gen", "party-mon-icons.json");

function sourceTable(source: string, name: string): string {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`const\\s+[^;{]*?\\b${escapedName}\\s*\\[[^=;]*\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`).exec(source);
  if (!match) throw new Error(`missing ${name} source table`);
  return match[1]!;
}

function parseJascPalette(path: string): Rgb[] {
  const lines = readFileSync(path, "utf8").trim().split(/\r?\n/);
  if (lines[0] !== "JASC-PAL" || lines[1] !== "0100" || lines[2] !== "16") {
    throw new Error(`${path}: expected a 16-color JASC-PAL file`);
  }
  const colors = lines.slice(3).map((line) => line.trim().split(/\s+/).map(Number));
  if (colors.length !== 16 || colors.some((rgb) => rgb.length !== 3 || rgb.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255))) {
    throw new Error(`${path}: invalid 16-color JASC palette`);
  }
  return colors.map(([r, g, b]) => ({ r: gbaRoundTrip(r!), g: gbaRoundTrip(g!), b: gbaRoundTrip(b!) }));
}

const corpus = JSON.parse(readFileSync(join(DATA_GEN, "battle-frontier-mons.json"), "utf8")) as FrontierMons;
if (corpus.count !== 882 || corpus.entries.length !== corpus.count) {
  throw new Error(`expected complete 882-entry Battle Frontier mon corpus, got ${corpus.entries.length}`);
}
const species = [...new Set(corpus.entries.map((entry) => entry.species))].sort();

const iconSource = readFileSync(join(REF, "src", "pokemon_icon.c"), "utf8");
const iconBySpecies = new Map(
  [...sourceTable(iconSource, "gMonIconTable").matchAll(/\[(SPECIES_[A-Z0-9_]+)\]\s*=\s*(gMonIcon_[A-Za-z0-9_]+),/g)]
    .map((match) => [match[1]!, match[2]!]),
);
const paletteIndexBySpecies = new Map(
  [...sourceTable(iconSource, "gMonIconPaletteIndices").matchAll(/\[(SPECIES_[A-Z0-9_]+)\]\s*=\s*(\d+),/g)]
    .map((match) => [match[1]!, Number(match[2]!)]),
);

const pokemonGraphics = readFileSync(join(REF, "src", "data", "graphics", "pokemon.h"), "utf8");
const pathByIconSymbol = new Map(
  [...pokemonGraphics.matchAll(/const u8 (gMonIcon_[A-Za-z0-9_]+)\[\] = INCGFX_U8\("([^"]+\/icon\.png)", "\.4bpp"\);/g)]
    .map((match) => [match[1]!, match[2]!]),
);

const graphicsSource = readFileSync(join(REF, "src", "graphics.c"), "utf8");
const palettePathByIndex = new Map(
  [...sourceTable(graphicsSource, "gMonIconPalettes").matchAll(/INCGFX_U16\("([^"]+icon_palette_(\d+)\.pal)", "\.gbapal"\),/g)]
    .map((match) => [Number(match[2]!), match[1]!]),
);
if (palettePathByIndex.size !== 3 || ![0, 1, 2].every((index) => palettePathByIndex.has(index))) {
  throw new Error(`expected gMonIconPalettes to define indices 0, 1, and 2`);
}
const palettes = new Map([...palettePathByIndex.entries()].map(([index, path]) => [index, parseJascPalette(join(REF, path))]));

const icons: Record<string, {
  sourcePath: string;
  width: number;
  height: number;
  frameCount: 2;
  paletteIndex: number;
  frame0: Tileset;
  frame1: Tileset;
  palette: Rgb[];
}> = {};

for (const speciesName of species) {
  const iconSymbol = iconBySpecies.get(speciesName);
  if (!iconSymbol) throw new Error(`${speciesName}: missing gMonIconTable entry`);
  const sourcePath = pathByIconSymbol.get(iconSymbol);
  if (!sourcePath) throw new Error(`${speciesName}: ${iconSymbol} has no icon.png source`);
  const paletteIndex = paletteIndexBySpecies.get(speciesName);
  if (paletteIndex === undefined) throw new Error(`${speciesName}: missing gMonIconPaletteIndices entry`);
  const palette = palettes.get(paletteIndex);
  if (!palette) throw new Error(`${speciesName}: palette index ${paletteIndex} is not a loaded gMonIconPalettes entry`);

  const image = decodeIndexedPng(join(REF, sourcePath));
  if (image.width !== 32 || image.height !== 64) {
    throw new Error(`${speciesName}: expected a 32x64 icon sheet, got ${image.width}x${image.height}`);
  }
  const { columns, tiles } = sliceTiles(image);
  icons[speciesName] = {
    sourcePath,
    width: image.width,
    height: image.height,
    frameCount: 2,
    paletteIndex,
    frame0: { columns, rows: 4, tiles: tiles.slice(0, 16).map((tile) => [...tile.pixels]) },
    frame1: { columns, rows: 4, tiles: tiles.slice(16, 32).map((tile) => [...tile.pixels]) },
    palette,
  };
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(icons)}\n`);
console.log(`wrote ${OUT} (${species.length} Frontier species, 2 frames each)`);
