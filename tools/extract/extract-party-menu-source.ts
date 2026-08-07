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

// sCancelButton_Tilemap = graphics/party_menu/cancel_button.bin (a 7x2 tilemap
// of u16 tile indices with the palette-1 bit already baked in). It is stamped
// into BG1 at tile (23,18) by DrawCancelConfirmButtons ->
// CopyToBgTilemapBufferRect_ChangePalette(1, sCancelButton_Tilemap, 23, 18, 7, 2, 17)
// (party_menu.c:1199-1205, data/party_menu.h:110). Banked here as a drawSlot
// slot reusing the party-menu tileset + palette (mirror of slots.wideEmpty).
function cancelButtonTilemap(): { width: number; height: number; tiles: number[] } {
  const raw = readFileSync(join(PARTY_GFX, "cancel_button.bin"));
  const tiles: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    tiles.push((raw[i]! | (raw[i + 1]! << 8)) & 0x3ff);
  }
  return { width: 7, height: 2, tiles };
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
    // sCancelButton_Tilemap = graphics/party_menu/cancel_button.bin (7x2 tiles
    // at bg tile (23,18), palette bank 1 via the baked-in 0x1000 bit). See the
    // helper above for the source citation.
    cancelButton: cancelButtonTilemap(),
  },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(asset)}\n`);
console.log(`wrote ${OUT}`);
