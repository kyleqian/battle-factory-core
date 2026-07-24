// Dev-time extractor for the source-native visual inputs shared by the
// Battle Factory's normal loss and seventh-win terminal messages. It reads
// only the Lobby layout/tilesets and the object-event poses visible at the
// regular singles handoff, then writes self-contained JSON artifacts. Run:
//   node --experimental-strip-types tools/extract/extract-factory-lobby-terminal.ts
// Or pass --out-dir <directory> to reproduce both artifacts elsewhere.
//
// No oracle pixels, ROM data, or runtime reference files are used by the
// production build. See docs/factory-lobby-terminal-assets.md.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { loadJascPal } from "./jascPal.ts";
import { parseTilemap } from "./tilemap.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const outIndex = process.argv.indexOf("--out-dir");
if (outIndex !== -1 && !process.argv[outIndex + 1]) throw new Error("--out-dir needs a directory");
const OUT = outIndex === -1 ? ROOT : resolve(process.argv[outIndex + 1]!);
const ASSETS = join(OUT, "src", "assets", "gen");
const DATA = join(OUT, "src", "data", "gen");

mkdirSync(ASSETS, { recursive: true });
mkdirSync(DATA, { recursive: true });

const terminalDownArrow = decodeIndexedPng(
  join(REF, "graphics", "fonts", "down_arrow.png"),
);
writeJson(join(ASSETS, "factory-terminal-down-arrow.json"), {
  width: terminalDownArrow.width,
  height: terminalDownArrow.height,
  blitWidth: 8,
  blitHeight: 16,
  indices: Array.from({ length: terminalDownArrow.height }, (_, row) =>
    [...terminalDownArrow.indices.slice(row * terminalDownArrow.width, (row + 1) * terminalDownArrow.width)]
  ),
});

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

type TileEntry = { tile: number; hFlip: boolean; vFlip: boolean; pal: number };
type Block = { metatileId: number; collision: number; elevation: number };

function readBlocks(path: string, count: number): Block[] {
  const source = readFileSync(path);
  if (source.length !== count * 2) throw new Error(`${path}: expected ${count * 2} bytes, got ${source.length}`);
  const blocks: Block[] = [];
  for (let i = 0; i < count; i += 1) {
    const value = source.readUInt16LE(i * 2);
    blocks.push({ metatileId: value & 0x3ff, collision: (value >> 10) & 0x3, elevation: (value >> 12) & 0xf });
  }
  return blocks;
}

// LAYOUT_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY: 19x12 blocks, primary
// building + secondary battle_factory. The player lands at (4,8); regular
// field-camera centering gives (-48,56), so the 2x2 layout border is part of
// the visible terminal viewport (three columns on the left, two rows below).
{
  const primaryDir = join(REF, "data", "tilesets", "primary", "building");
  const secondaryDir = join(REF, "data", "tilesets", "secondary", "battle_factory");
  const primaryTiles = sliceTiles(decodeIndexedPng(join(primaryDir, "tiles.png"))).tiles;
  const secondaryTiles = sliceTiles(decodeIndexedPng(join(secondaryDir, "tiles.png"))).tiles;
  const palettes: Record<number, { r: number; g: number; b: number }[]> = {};
  for (let slot = 0; slot < 6; slot += 1) palettes[slot] = loadJascPal(join(primaryDir, "palettes", `${String(slot).padStart(2, "0")}.pal`));
  for (let slot = 6; slot < 13; slot += 1) palettes[slot] = loadJascPal(join(secondaryDir, "palettes", `${String(slot).padStart(2, "0")}.pal`));

  const primaryMetatiles = readFileSync(join(primaryDir, "metatiles.bin"));
  const secondaryMetatiles = readFileSync(join(secondaryDir, "metatiles.bin"));
  const primaryTilemap = parseTilemap(primaryMetatiles, 8, primaryMetatiles.length / 16);
  const secondaryTilemap = parseTilemap(secondaryMetatiles, 8, secondaryMetatiles.length / 16);
  const primaryAttrs = readFileSync(join(primaryDir, "metatile_attributes.bin"));
  const secondaryAttrs = readFileSync(join(secondaryDir, "metatile_attributes.bin"));
  const width = 19;
  const height = 12;
  const layoutDir = join(REF, "data", "layouts", "BattleFrontier_BattleFactoryLobby");
  const blocks = readBlocks(join(layoutDir, "map.bin"), width * height);
  const borderBlocks = readBlocks(join(layoutDir, "border.bin"), 4);
  const usedMetatiles = new Map<number, { layerType: number; entries: TileEntry[] }>();
  const usedTiles = new Map<number, number[]>();
  const usedPalettes = new Set<number>();

  function noteMetatile(metatileId: number): void {
    if (usedMetatiles.has(metatileId)) return;
    const secondary = metatileId >= 512;
    const localId = secondary ? metatileId - 512 : metatileId;
    const tilemap = secondary ? secondaryTilemap : primaryTilemap;
    const attrs = secondary ? secondaryAttrs : primaryAttrs;
    const entries = tilemap.entries.slice(localId * 8, localId * 8 + 8).map((entry) => ({
      tile: entry.tile,
      hFlip: entry.hFlip,
      vFlip: entry.vFlip,
      pal: entry.palette,
    }));
    usedMetatiles.set(metatileId, { layerType: (attrs.readUInt16LE(localId * 2) >> 12) & 0xf, entries });
    for (const entry of entries) {
      usedPalettes.add(entry.pal);
      if (!usedTiles.has(entry.tile)) {
        const tile = entry.tile < 512 ? primaryTiles[entry.tile] : secondaryTiles[entry.tile - 512];
        if (!tile) throw new Error(`missing tile ${entry.tile} used by metatile ${metatileId}`);
        usedTiles.set(entry.tile, [...tile.pixels]);
      }
    }
  }

  for (const block of blocks) noteMetatile(block.metatileId);
  for (const block of borderBlocks) noteMetatile(block.metatileId);
  const tiles: Record<string, number[]> = {};
  for (const [id, pixels] of usedTiles) tiles[id] = pixels;
  const usedPaletteData: Record<string, { r: number; g: number; b: number }[]> = {};
  for (const id of usedPalettes) usedPaletteData[id] = palettes[id]!;
  const metatiles: Record<string, { layerType: number; entries: TileEntry[] }> = {};
  for (const [id, data] of usedMetatiles) metatiles[id] = data;

  writeJson(join(ASSETS, "factory-lobby-terminal-tileset.json"), { tiles, palettes: usedPaletteData, metatiles });
  writeJson(join(DATA, "factory-lobby-terminal-layout.json"), {
    width,
    height,
    blocks,
    border: { width: 2, height: 2, blocks: borderBlocks },
    terminalWarp: { x: 4, y: 8, facing: "north" },
    cameraOriginPx: { x: -48, y: 56 },
    visibleObjects: [
      { id: "player", localId: "LOCALID_PLAYER", graphicsId: "OBJ_EVENT_GFX_BRENDAN_NORMAL", tile: { x: 4, y: 8 }, facing: "north", pose: "north", asset: "player" },
      { id: "singlesAttendant", localId: "LOCALID_FACTORY_ATTENDANT_SINGLES", graphicsId: "OBJ_EVENT_GFX_SCIENTIST_1", tile: { x: 4, y: 7 }, facing: "south", pose: "south", asset: "scientist" },
      { id: "woman", graphicsId: "OBJ_EVENT_GFX_WOMAN_1", tile: { x: 3, y: 11 }, facing: "south", pose: "south", asset: "woman" },
      { id: "fatMan", graphicsId: "OBJ_EVENT_GFX_FAT_MAN", tile: { x: 6, y: 10 }, facing: "south", pose: "south", asset: "fatMan" },
      { id: "doublesAttendant", localId: "LOCALID_FACTORY_ATTENDANT_DOUBLES", graphicsId: "OBJ_EVENT_GFX_SCIENTIST_1", tile: { x: 14, y: 7 }, facing: "south", pose: "south", asset: "scientist" },
      { id: "camper", graphicsId: "OBJ_EVENT_GFX_CAMPER", tile: { x: 14, y: 11 }, facing: "south", pose: "south", asset: "camper" },
      { id: "picnicker", graphicsId: "OBJ_EVENT_GFX_PICNICKER", tile: { x: 13, y: 11 }, facing: "east", pose: "east", asset: "picnicker" },
    ],
  });
}

// The terminal script locks the overworld immediately after map loading. Its
// regular camera exposes only these starting poses (not the off-screen double
// attendant/camper/picnicker), so keep the extracted object art equally small.
{
  function extractPose(sheetPath: string, frameIndex: number, hFlip = false): { columns: number; rows: number; tiles: number[][] } {
    const sheet = sliceTiles(decodeIndexedPng(sheetPath));
    const tiles: number[][] = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const tile = sheet.tiles[row * sheet.columns + frameIndex * 2 + (hFlip ? 1 - col : col)];
        if (!tile) throw new Error(`missing standard overworld frame ${frameIndex}`);
        tiles.push(hFlip
          ? Array.from({ length: 64 }, (_, index) =>
              tile.pixels[Math.floor(index / 8) * 8 + (7 - index % 8)]!)
          : [...tile.pixels]);
      }
    }
    return { columns: 2, rows: 4, tiles };
  }

  const people = join(REF, "graphics", "object_events", "pics", "people");
  const paletteDir = join(REF, "graphics", "object_events", "palettes");
  writeJson(join(ASSETS, "factory-lobby-terminal-npcs.json"), {
    // sAnimTable_Standard: face south = source frame 0; face north = 1.
    player: { frame: 1, frames: [extractPose(join(people, "brendan", "walking.png"), 1)], palette: loadJascPal(join(paletteDir, "brendan.pal")) },
    scientist: { frame: 0, frames: [extractPose(join(people, "scientist_1.png"), 0)], palette: loadJascPal(join(paletteDir, "npc_3.pal")) },
    woman: { frame: 0, frames: [extractPose(join(people, "woman_1.png"), 0)], palette: loadJascPal(join(paletteDir, "npc_1.pal")) },
    fatMan: { frame: 0, frames: [extractPose(join(people, "fat_man.png"), 0)], palette: loadJascPal(join(paletteDir, "npc_1.pal")) },
    camper: { frame: 0, frames: [extractPose(join(people, "camper.png"), 0)], palette: loadJascPal(join(paletteDir, "npc_3.pal")) },
    picnicker: { frame: 2, frames: [extractPose(join(people, "picnicker.png"), 2, true)], palette: loadJascPal(join(paletteDir, "npc_3.pal")) },
  });
}
