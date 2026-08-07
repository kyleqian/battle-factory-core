// Dev-time extractor for the source-authored party-menu background and slot
// tilemaps. Production renders live party records from this data; it never
// imports a canonical recording.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { parseTilemap } from "./tilemap.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const PARTY_GFX = join(ROOT, "reference", "pokeemerald", "graphics", "party_menu");
const OUT = join(ROOT, "src", "assets", "gen", "party-menu-source.json");

const image = decodeIndexedPng(join(PARTY_GFX, "bg.png"));
const sliced = sliceTiles(image);
const background = parseTilemap(readFileSync(join(PARTY_GFX, "bg.bin")));

function bytes(name: string): number[] {
  return [...readFileSync(join(PARTY_GFX, name))];
}

const asset = {
  source: {
    graphics: "graphics/party_menu/bg.png",
    tilemap: "graphics/party_menu/bg.bin",
    slots: "src/data/party_menu.h:sSlotTilemap_{Main,Wide,WideEmpty}",
  },
  tileset: {
    columns: sliced.columns,
    rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]),
  },
  palette: image.palette,
  background,
  slots: {
    main: { width: 10, height: 7, tiles: bytes("slot_main.bin") },
    wide: { width: 18, height: 3, tiles: bytes("slot_wide.bin") },
    // DrawEmptySlot (party_menu.c:2193-2195): BlitBitmapToPartyWindow(
    // windowId, sSlotTilemap_WideEmpty, 18, 0, 0, 18, 3) -- the empty-slot
    // box for mon-4/5/6, rendered with the PARTY_PAL_NO_MON palette
    // (sPartyBoxNoMonPalIds {17,27,28} -> gPartyMenuBg_Pal bank 1).
    wideEmpty: { width: 18, height: 3, tiles: bytes("slot_wide_empty.bin") },
  },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(asset)}\n`);
console.log(`wrote ${OUT}`);
