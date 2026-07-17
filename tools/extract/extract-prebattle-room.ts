// Dev-time extractor: reads reference/pokeemerald's
// BattleFrontier_BattleFactoryPreBattleRoom map (tileset + layout), the
// attendant/player overworld sprite frames as posed in the settled S5 exit
// scene, and the standard field message-box window frame art, writing
// committed, decoded artifacts under src/assets/gen/ + src/data/gen/. Run
// with:
//   node --experimental-strip-types tools/extract/extract-prebattle-room.ts
//
// Never imported at runtime - the production build only reads its JSON output.
// See docs/prebattle-room-notes.md for the oracle cross-checks that pinned
// every geometry constant below (camera origin, NPC positions/frames,
// message-box rect).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap } from "./tilemap.ts";
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

// --- Map tileset + layout ---------------------------------------------------
// LAYOUT_BATTLE_FRONTIER_BATTLE_FACTORY_PRE_BATTLE_ROOM: primary "building"
// (data/tilesets/primary/building, 512 tiles / 8 metatiles - this map uses
// none of its metatiles, only its (unused) tile 0) + secondary
// "battle_factory" (data/tilesets/secondary/battle_factory, 432 tiles / 354
// metatiles). Global tile numbers 0-511 index the primary sheet, 512-1023
// index the secondary sheet (tile - 512); global metatile ids follow the
// same 512-split (fieldmap.h: NUM_TILES_IN_PRIMARY / NUM_METATILES_IN_PRIMARY).
// Global palette slots 0-5 load primary/palettes/0N.pal, 6-12 load
// secondary/palettes/0N.pal *by the same NN* (not a local 0-6 remap - slots
// 00-05.pal in a secondary tileset dir and 06-15.pal in a primary one are
// unused all-black placeholders, confirmed by inspecting
// data/tilesets/secondary/battle_factory/palettes/00.pal vs 06.pal).
{
  const primaryDir = join(REF, "data", "tilesets", "primary", "building");
  const secondaryDir = join(REF, "data", "tilesets", "secondary", "battle_factory");

  const primaryTilesImg = decodeIndexedPng(join(primaryDir, "tiles.png"));
  const secondaryTilesImg = decodeIndexedPng(join(secondaryDir, "tiles.png"));
  const primaryTiles = sliceTiles(primaryTilesImg).tiles;
  const secondaryTiles = sliceTiles(secondaryTilesImg).tiles;

  const palettes: Record<number, { r: number; g: number; b: number }[]> = {};
  for (let slot = 0; slot < 6; slot += 1) {
    palettes[slot] = loadJascPal(join(primaryDir, "palettes", `${String(slot).padStart(2, "0")}.pal`));
  }
  for (let slot = 6; slot < 13; slot += 1) {
    palettes[slot] = loadJascPal(join(secondaryDir, "palettes", `${String(slot).padStart(2, "0")}.pal`));
  }

  const primaryMetaBuf = readFileSync(join(primaryDir, "metatiles.bin"));
  const secondaryMetaBuf = readFileSync(join(secondaryDir, "metatiles.bin"));
  const primaryMetaCount = primaryMetaBuf.length / 16;
  const secondaryMetaCount = secondaryMetaBuf.length / 16;
  // metatiles.bin is N metatiles x 8 tile-entries (u16, same bit layout as a
  // BG screen entry) - reuse parseTilemap by treating it as an 8-wide grid
  // (one row == one metatile's 8 entries, row-major == metatile-major).
  const primaryMetaTilemap = parseTilemap(primaryMetaBuf, 8, primaryMetaCount);
  const secondaryMetaTilemap = parseTilemap(secondaryMetaBuf, 8, secondaryMetaCount);

  const primaryAttrBuf = readFileSync(join(primaryDir, "metatile_attributes.bin"));
  const secondaryAttrBuf = readFileSync(join(secondaryDir, "metatile_attributes.bin"));

  function layerTypeOf(metatileId: number): number {
    const isSecondary = metatileId >= 512;
    const buf = isSecondary ? secondaryAttrBuf : primaryAttrBuf;
    const localId = isSecondary ? metatileId - 512 : metatileId;
    const attr = buf.readUInt16LE(localId * 2);
    return (attr >> 12) & 0xf; // METATILE_ATTR_LAYER_MASK / SHIFT, global.fieldmap.h
  }

  const mapBin = readFileSync(join(REF, "data", "layouts", "BattleFrontier_BattleFactoryPreBattleRoom", "map.bin"));
  const width = 17;
  const height = 14;
  const blocks: { metatileId: number; collision: number; elevation: number }[] = [];
  for (let i = 0; i < width * height; i += 1) {
    const v = mapBin.readUInt16LE(i * 2);
    blocks.push({
      metatileId: v & 0x3ff,
      collision: (v >> 10) & 0x3,
      elevation: (v >> 12) & 0xf,
    });
  }

  // Only extract the tiles/palettes/metatile defs actually referenced by
  // this map's 238 blocks (the two source tilesets have 8+354 metatiles
  // total; this room's fixed, camera-static scene needs far fewer).
  const usedMetatiles = new Map<number, { layerType: number; entries: { tile: number; hFlip: boolean; vFlip: boolean; pal: number }[] }>();
  const usedTiles = new Map<number, number[]>();
  const usedPalettes = new Set<number>();

  for (const block of blocks) {
    if (usedMetatiles.has(block.metatileId)) continue;
    const isSecondary = block.metatileId >= 512;
    const tilemap = isSecondary ? secondaryMetaTilemap : primaryMetaTilemap;
    const localId = isSecondary ? block.metatileId - 512 : block.metatileId;
    const entries = tilemap.entries.slice(localId * 8, localId * 8 + 8).map((e) => ({
      tile: e.tile,
      hFlip: e.hFlip,
      vFlip: e.vFlip,
      pal: e.palette,
    }));
    usedMetatiles.set(block.metatileId, { layerType: layerTypeOf(block.metatileId), entries });
    for (const e of entries) {
      usedPalettes.add(e.pal);
      if (!usedTiles.has(e.tile)) {
        const tile = e.tile < 512 ? primaryTiles[e.tile] : secondaryTiles[e.tile - 512];
        usedTiles.set(e.tile, tile ? [...tile.pixels] : new Array(64).fill(0));
      }
    }
  }

  const tilesOut: Record<string, number[]> = {};
  for (const [tileNum, pixels] of usedTiles) tilesOut[tileNum] = pixels;
  const palettesOut: Record<string, { r: number; g: number; b: number }[]> = {};
  for (const slot of usedPalettes) palettesOut[slot] = palettes[slot]!;
  const metatilesOut: Record<string, { layerType: number; entries: { tile: number; hFlip: boolean; vFlip: boolean; pal: number }[] }> = {};
  for (const [id, meta] of usedMetatiles) metatilesOut[id] = meta;

  writeJson(join(ASSETS_GEN, "prebattle-room-tileset.json"), {
    tiles: tilesOut,
    palettes: palettesOut,
    metatiles: metatilesOut,
  });

  writeJson(join(DATA_GEN, "prebattle-room-layout.json"), {
    width,
    height,
    blocks,
    // Camera: oracle-confirmed (docs/prebattle-room-notes.md S2) the visible
    // 240x160 window is centered on the player tile's center pixel -
    // originX = playerTileX*16 + 8 - 120, originY = playerTileY*16 + 8 - 80.
    // Settled S5 exit scene (post-EnterRoom movement, scripts.inc:26-28):
    playerTile: { x: 8, y: 8 },
    attendantTile: { x: 8, y: 7 },
    cameraOriginPx: { x: 16, y: 56 },
  });
}

// --- NPC overworld sprite frames (settled pose only) ------------------------
// Both frames come from a 144x32 (9-frame, 16x32 each) sheet; sliceTiles
// gives 18 cols x 4 rows of 8x8 tiles, frame N = tile columns [2N, 2N+1] x
// all 4 rows (object_event_pic_tables.h: overworld_frame(*, 2, 4, N)).
{
  function extractFrame(sheetPath: string, frameIndex: number) {
    const img = decodeIndexedPng(sheetPath);
    const sliced = sliceTiles(img);
    const tiles: number[][] = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const tx = frameIndex * 2 + col;
        const tile = sliced.tiles[row * sliced.columns + tx];
        tiles.push(tile ? [...tile.pixels] : new Array(64).fill(0));
      }
    }
    return { columns: 2, rows: 4, tiles };
  }

  // Attendant: OBJ_EVENT_GFX_SCIENTIST_1 (map.json), sPicTable_Scientist1
  // frame 0 = ANIM_STD_FACE_SOUTH (object_event_anims.h sAnim_FaceSouth
  // uses picture-table frame 0) - matches the settled scene (attendant
  // faces down, scripts.inc:418 `face_down`).
  const attendantFrame = extractFrame(join(REF, "graphics", "object_events", "pics", "people", "scientist_1.png"), 0);
  const attendantPalette = loadJascPal(join(REF, "graphics", "object_events", "palettes", "npc_3.pal"));

  // Player (Brendan, male protagonist - confirmed against the oracle PNG's
  // green-shirt sprite, docs/prebattle-room-notes.md): gObjectEventPic_
  // BrendanNormal, sPicTable_BrendanNormal frame 1 = ANIM_STD_FACE_NORTH
  // (sAnim_FaceNorth uses picture-table frame 1) - player faces up after
  // walking up into the room (scripts.inc Movement_PlayerEnterRoom, all
  // walk_up, no trailing face_* so it holds the walk direction).
  const playerFrame = extractFrame(join(REF, "graphics", "object_events", "pics", "people", "brendan", "walking.png"), 1);
  const playerPalette = loadJascPal(join(REF, "graphics", "object_events", "palettes", "brendan.pal"));

  writeJson(join(ASSETS_GEN, "prebattle-room-npcs.json"), {
    attendant: { tileset: attendantFrame, palette: attendantPalette, facing: "south" },
    player: { tileset: playerFrame, palette: playerPalette, facing: "north" },
  });
}

// --- Standard field message-box window frame --------------------------------
// graphics/text_window/message_box.png (56x16 = 7x2 8x8 tiles) is
// gMessageBox_Gfx/gMessageBox_Pal (src/graphics.c:1472-1473), the art
// DrawDialogueFrame composites into the field message box
// (src/field_message_box.c Task_DrawFieldMessage). It carries its own
// embedded 16-color palette (decodeIndexedPng reads the PNG's own PLTE).
{
  const msgBoxImg = decodeIndexedPng(join(REF, "graphics", "text_window", "message_box.png"));
  const sliced = sliceTiles(msgBoxImg);
  writeJson(join(ASSETS_GEN, "prebattle-room-msgbox.json"), {
    tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((t) => [...t.pixels]) },
    palette: msgBoxImg.palette,
  });
}
