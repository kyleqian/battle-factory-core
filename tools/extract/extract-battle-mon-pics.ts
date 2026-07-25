// Dev-time extractor: reads reference/pokeemerald's mon-pic art battle 1's
// bring-up needs that isn't already covered by extract-front-sprites.ts
// (which only holds FRONT pics of the 6 anchor rental species, used by the
// draft/summary screens - never shown in battle). A battle shows:
//   - the player's own party from BEHIND (back.png), for whichever of the 6
//     anchors got rented - this run's pinned S5 trace rents ONIX/MAGBY/
//     BAYLEEF (docs/battle-bringup-notes.md S5), so those 3 back pics.
//   - the opponent's active party from the FRONT (front.png) - battle 1's
//     opponent (Bug Catcher DESTIN, docs/battle-bringup-notes.md S5) fields
//     GROVYLE/MURKROW/PIDGEOTTO, none of which are anchor-pool species.
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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { loadJascPal } from "./jascPal.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

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

function loadPic(speciesDir: string, picFile: "front.png" | "back.png"): Sprite {
  const image = decodeIndexedPng(join(speciesDir, picFile));
  if (image.width !== 64 || image.height !== 64) {
    throw new Error(`${speciesDir}/${picFile}: expected a 64x64 pic, got ${image.width}x${image.height}`);
  }
  const { columns, rows, tiles } = sliceTiles(image);
  const palette = loadJascPal(join(speciesDir, "normal.pal"));
  return { tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) }, palette };
}

// Mechanism 5 (docs/battle-scene-notes.md §7.11/§7.16): species with
// `HasTwoFramesAnimation` (all but CASTFORM/DEOXYS/SPINDA/UNOWN) store their
// front-sprite entrance-animation 2nd frame as the BOTTOM half of a stacked
// 64x128 `anim_front.png` (top half is frame 0, pixel-identical to
// front.png - verified below, not assumed). Only GROVYLE's frame 2 is
// consumed by this run's engine so far (`SPRITE_ANIM_TAG`-less battle front
// sprites swap to it via `StartSpriteAnim(sprite, 1)`), but all three
// FRONT_SPECIES have the file, so all three are extracted while here.
function loadAnimFrame2(speciesDir: string, frame0: Sprite): { columns: number; rows: number; tiles: number[][] } {
  const image = decodeIndexedPng(join(speciesDir, "anim_front.png"));
  if (image.width !== 64 || image.height !== 128) {
    throw new Error(`${speciesDir}/anim_front.png: expected a 64x128 stacked 2-frame pic, got ${image.width}x${image.height}`);
  }
  const { columns, rows, tiles } = sliceTiles(image);
  const frameRows = rows / 2;
  const frame0Tiles = tiles.slice(0, frameRows * columns);
  const frame0Match = frame0Tiles.every((t, i) => t.pixels.every((p, j) => p === frame0.tileset.tiles[i]![j]));
  if (!frame0Match) throw new Error(`${speciesDir}/anim_front.png: top half doesn't match front.png - frame ordering assumption is wrong`);
  const frame1Tiles = tiles.slice(frameRows * columns);
  return { columns, rows: frameRows, tiles: frame1Tiles.map((t) => [...t.pixels]) };
}

// species display name -> reference/pokeemerald's graphics/pokemon/<dir>/ name.
const BACK_SPECIES: Record<string, string> = {
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
};
const FRONT_SPECIES: Record<string, string> = {
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
};

const backSprites: Record<string, Sprite> = {};
for (const [species, dir] of Object.entries(BACK_SPECIES)) {
  backSprites[species] = loadPic(join(REF, "graphics", "pokemon", dir), "back.png");
}
writeJson(join(ASSETS_GEN, "battle-back-sprites.json"), backSprites);

const opponentFrontSprites: Record<string, Sprite & { frame2: { columns: number; rows: number; tiles: number[][] } }> = {};
for (const [species, dir] of Object.entries(FRONT_SPECIES)) {
  const speciesDir = join(REF, "graphics", "pokemon", dir);
  const frame0 = loadPic(speciesDir, "front.png");
  const frame2 = loadAnimFrame2(speciesDir, frame0);
  opponentFrontSprites[species] = { ...frame0, frame2 };
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

for (const species of Object.keys(BACK_SPECIES)) {
  if (!backCoords[species]) throw new Error(`gMonBackPicCoords missing SPECIES_${species}`);
}
for (const species of Object.keys(FRONT_SPECIES)) {
  if (!frontCoords[species]) throw new Error(`gMonFrontPicCoords missing SPECIES_${species}`);
}

writeJson(join(DATA_GEN, "mon-pic-coords.json"), { back: backCoords, front: frontCoords });
