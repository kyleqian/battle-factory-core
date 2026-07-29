// Dev-time extractor: reads reference/pokeemerald's battle-mon art for every
// species reachable from the generated Battle Factory set catalog. It is
// deliberately separate from extract-front-sprites.ts: that catalog is for
// draft/summary presentation, whereas a battle needs both the player's BACK
// pic and the opponent's FRONT pic for any generated active battler.
// Also extracts gMonBackPicCoords/gMonFrontPicCoords in full: both are
// naturally all-species tables (one struct literal per SPECIES_* constant,
// not per-species art), so extracting only a handful of entries would just
// mean re-parsing the same source file again next time another species'
// coords are needed - the table itself, unlike the 386 sets of pixel art,
// is cheap (two numbers per species).
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-mon-pics.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { loadJascPal } from "./jascPal.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDir = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDir) throw new Error("--out-dir requires a directory");
const OUTPUT_ROOT = outDir === undefined ? RUN_ROOT : isAbsolute(outDir) ? outDir : join(RUN_ROOT, outDir);
const ASSETS_GEN = join(OUTPUT_ROOT, "src", "assets", "gen");
const DATA_GEN = join(OUTPUT_ROOT, "src", "data", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });
mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

interface Sprite {
  tileset: { columns: number; rows: number; tiles: number[][] };
  palette: { r: number; g: number; b: number }[];
}

interface PicSource {
  spriteDir: string;
  paletteDir: string;
}

function loadPic(source: PicSource, picFile: "front.png" | "back.png"): Sprite {
  const speciesDir = source.spriteDir;
  const image = decodeIndexedPng(join(speciesDir, picFile));
  if (image.width !== 64 || image.height !== 64) {
    throw new Error(`${speciesDir}/${picFile}: expected a 64x64 pic, got ${image.width}x${image.height}`);
  }
  const { columns, rows, tiles } = sliceTiles(image);
  const palette = loadJascPal(join(source.paletteDir, "normal.pal"));
  return { tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) }, palette };
}

// `HasTwoFramesAnimation` in pokemon.c:6988 excludes these four species.
// The catalog's established per-species schema nevertheless has a frame2
// field. Its entry is a duplicate of source frame 0 for these species; the
// real HasTwoFramesAnimation gate means it is never selected as an animation
// frame. CASTFORM and UNOWN also use source-default
// subdirectories (normal and a respectively), rather than the ordinary
// graphics/pokemon/<species>/ front/back files.
const ONE_FRAME_ANIMATION_SPECIES = new Set(["CASTFORM", "DEOXYS", "SPINDA", "UNOWN"]);

// The battle gMonFrontPicTable itself points at anim_front, not front. For the
// two-frame species it is a 64x128 stack; some ordinary front.png files differ
// by a few pixels from that source top frame, so treating front.png as canonical
// would silently produce the wrong battlefield pic. The established entries
// below were all previously self-verified equal and therefore remain byte-for-
// byte unchanged when regenerated.
function loadBattleFrontPic(source: PicSource, hasTwoFrames: boolean): Sprite & { frame2: { columns: number; rows: number; tiles: number[][] } } {
  const speciesDir = source.spriteDir;
  const image = decodeIndexedPng(join(speciesDir, "anim_front.png"));
  // UNOWN/SPINDA/DEOXYS still provide a stacked source bitmap, but the battle
  // code does not expose its lower half because HasTwoFramesAnimation is false.
  if (image.width !== 64 || (hasTwoFrames ? image.height !== 128 : image.height !== 64 && image.height !== 128)) {
    throw new Error(`${speciesDir}/anim_front.png: unexpected ${image.width}x${image.height} battle pic`);
  }
  const { columns, rows, tiles } = sliceTiles(image);
  const frameRows = image.height === 128 ? rows / 2 : rows;
  const frame0: Sprite = {
    tileset: { columns, rows: frameRows, tiles: tiles.slice(0, frameRows * columns).map((tile) => [...tile.pixels]) },
    palette: loadJascPal(join(source.paletteDir, "normal.pal")),
  };
  if (!hasTwoFrames) return { ...frame0, frame2: { ...frame0.tileset, tiles: frame0.tileset.tiles.map((tile) => [...tile]) } };
  return {
    ...frame0,
    frame2: { columns, rows: frameRows, tiles: tiles.slice(frameRows * columns).map((tile) => [...tile.pixels]) },
  };
}

// Preserve current object-key order as an append-only compatibility prefix.
// Coverage itself is derived below from battle-frontier-mons.json, never from
// this historical ordering list.
const ESTABLISHED_BACK_ORDER: Record<string, string> = {
  ONIX: "onix",
  MAGBY: "magby",
  BAYLEEF: "bayleef",
  PIDGEOTTO: "pidgeotto",
  // MOVE_FLY's required opposite-side portable case uses the legal set-184
  // MURKROW as the player's active battler. Keep this source art in the
  // same species-indexed bundle as every other live battle back sprite.
  MURKROW: "murkrow",
  // MOVE_BOUNCE's opposite-side acceptance case uses legal Level-50 set 121.
  SPOINK: "spoink",
  ARCANINE: "arcanine",
  DUGTRIO: "dugtrio",
  // MOVE_DRAGON_RAGE's Level-50-legal attacker (FRONTIER_MON_CHARMELEON_2)
  // needs its own back pic for the player-side staged orientation.
  CHARMELEON: "charmeleon",
  // MOVE_SHADOW_PUNCH's Level-50-legal attacker (FRONTIER_MON_HAUNTER_1)
  // needs its own back pic for the player-side staged orientation.
  HAUNTER: "haunter",
  // MOVE_GROWTH's Level-50-legal attacker (FRONTIER_MON_IVYSAUR_1) needs its
  // own back pic for the player-side staged orientation.
  IVYSAUR: "ivysaur",
  // MOVE_FUTURE_SIGHT's Level-50-legal attacker (FRONTIER_MON_KADABRA_1)
  // needs its own back pic for the player-side staged orientation.
  KADABRA: "kadabra",
};
const ESTABLISHED_FRONT_ORDER = {
  GROVYLE: "grovyle",
  MURKROW: "murkrow",
  PIDGEOTTO: "pidgeotto",
  KABUTO: "kabuto",
  ONIX: "onix",
  // MOVE_BOUNCE's legal portable Scene-ON stage uses set 121 SPOINK as
  // the opponent-side attacker. Its front pic is consumed by the shared
  // presentation compositor before the charge ball hides the battler.
  SPOINK: "spoink",
  ARCANINE: "arcanine",
  DUGTRIO: "dugtrio",
  // MOVE_DRAGON_RAGE's opposite-side staged orientation needs CHARMELEON's
  // front pic (opponent-side attacker).
  CHARMELEON: "charmeleon",
  // MOVE_SHADOW_PUNCH's opposite-side staged orientation needs HAUNTER's
  // front pic (opponent-side attacker).
  HAUNTER: "haunter",
  // MOVE_GROWTH's opposite-side staged orientation needs IVYSAUR's front
  // pic (opponent-side attacker).
  IVYSAUR: "ivysaur",
};

type FrontierMonCatalog = { entries: Array<{ index: number; species: string }> };
const frontierMons = JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "battle-frontier-mons.json"), "utf8")) as FrontierMonCatalog;
if (frontierMons.entries.length !== 882) throw new Error(`expected 882 generated Factory sets, got ${frontierMons.entries.length}`);
for (const [index, mon] of frontierMons.entries.entries()) {
  if (mon.index !== index || !/^SPECIES_[A-Z0-9_]+$/.test(mon.species)) {
    throw new Error(`invalid generated Factory set at index ${index}`);
  }
}

const catalogSpecies = [...new Set(frontierMons.entries.map((mon) => mon.species.replace(/^SPECIES_/, "")))];
if (catalogSpecies.length !== 376) throw new Error(`expected 376 distinct Factory species, got ${catalogSpecies.length}`);

function sourceForSpecies(species: string): PicSource {
  const speciesDir = join(REF, "graphics", "pokemon", species.toLowerCase());
  switch (species) {
    case "CASTFORM":
      return { spriteDir: join(speciesDir, "normal"), paletteDir: join(speciesDir, "normal") };
    case "UNOWN":
      return { spriteDir: join(speciesDir, "a"), paletteDir: speciesDir };
    default:
      return { spriteDir: speciesDir, paletteDir: speciesDir };
  }
}

function appendCatalogSpecies(established: Record<string, string>): string[] {
  return [...Object.keys(established), ...catalogSpecies.filter((species) => !(species in established))];
}

const backSprites: Record<string, Sprite> = {};
for (const species of appendCatalogSpecies(ESTABLISHED_BACK_ORDER)) {
  backSprites[species] = loadPic(sourceForSpecies(species), "back.png");
}
writeJson(join(ASSETS_GEN, "battle-back-sprites.json"), backSprites);

const opponentFrontSprites: Record<string, Sprite & { frame2?: { columns: number; rows: number; tiles: number[][] } }> = {};
for (const species of appendCatalogSpecies(ESTABLISHED_FRONT_ORDER)) {
  const source = sourceForSpecies(species);
  opponentFrontSprites[species] = loadBattleFrontPic(source, !ONE_FRAME_ANIMATION_SPECIES.has(species));
}
writeJson(join(ASSETS_GEN, "battle-opponent-front-sprites.json"), opponentFrontSprites);

// --- gMonBackPicCoords / gMonFrontPicCoords, in full -------------------------
// Struct literal: [SPECIES_X] = { .size = MON_COORDS_SIZE(w, h), .y_offset = N },
// where MON_COORDS_SIZE packs DIV_ROUND_UP(w,8)<<4 | DIV_ROUND_UP(h,8) - decoded
// back out to pixel width/height here so consumers don't need the macro.
function parseCoordsTable(path: string): Record<string, { width: number; height: number; yOffset: number }> {
  const text = readFileSync(path, "utf8");
  const re = /\[SPECIES_([A-Z0-9_]+)\]\s*=\s*\{\s*\.size\s*=\s*MON_COORDS_SIZE\((\d+),\s*(\d+)\),\s*\.y_offset\s*=\s*(-?\d+)\s*\}/g;
  const out: Record<string, { width: number; height: number; yOffset: number }> = {};
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(text))) {
    out[m[1]!] = { width: Number(m[2]), height: Number(m[3]), yOffset: Number(m[4]) };
    count += 1;
  }
  if (count < 400) throw new Error(`${path}: only parsed ${count} entries, expected 400+`);
  return out;
}

const backCoords = parseCoordsTable(join(REF, "src", "data", "pokemon_graphics", "back_pic_coordinates.h"));
const frontCoords = parseCoordsTable(join(REF, "src", "data", "pokemon_graphics", "front_pic_coordinates.h"));

for (const species of Object.keys(backSprites)) {
  if (!backCoords[species]) throw new Error(`gMonBackPicCoords missing SPECIES_${species}`);
}
for (const species of Object.keys(opponentFrontSprites)) {
  if (!frontCoords[species]) throw new Error(`gMonFrontPicCoords missing SPECIES_${species}`);
}

writeJson(join(DATA_GEN, "mon-pic-coords.json"), { back: backCoords, front: frontCoords });
