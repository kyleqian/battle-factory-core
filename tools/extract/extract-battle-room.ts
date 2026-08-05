// Dev-time extractor: reads reference/pokeemerald's
// BattleFrontier_BattleFactoryBattleRoom map (tileset + layout + border), the
// three overworld sprite sheets visible in the S6 room-entry choreography
// (the fake player object, the 6 background scientists, and the opponent's
// walk-in sprite resolved via SetBattleFacilityTrainerGfxId), writing
// committed, decoded artifacts under src/assets/gen/ + src/data/gen/. Run
// with:
//   node --experimental-strip-types tools/extract/extract-battle-room.ts
//
// Never imported at runtime - the production build only reads its JSON
// output. See docs/battle-room-notes.md for the oracle cross-checks that
// pinned the geometry constants below (camera origin, sprite settle tiles).

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
// LAYOUT_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM (data/layouts/layouts.json):
// 13x12 blocks, same tileset pair as the pre-battle room - primary "building"
// + secondary "battle_factory" (data/tilesets/{primary/building,secondary/
// battle_factory}) - but this room references a different block subset, so
// its own tile/palette/metatile extraction is kept self-contained here
// (mirrors extract-prebattle-room.ts's convention, some source tiles/
// palettes legitimately overlap between the two committed JSON files).
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

  function readBlocks(buf: Buffer, count: number) {
    const blocks: { metatileId: number; collision: number; elevation: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const v = buf.readUInt16LE(i * 2);
      blocks.push({ metatileId: v & 0x3ff, collision: (v >> 10) & 0x3, elevation: (v >> 12) & 0xf });
    }
    return blocks;
  }

  const width = 13;
  const height = 12;
  const mapBin = readFileSync(join(REF, "data", "layouts", "BattleFrontier_BattleFactoryBattleRoom", "map.bin"));
  const blocks = readBlocks(mapBin, width * height);

  // border.bin: 2x2 blocks shown when the camera reveals area past the map
  // edge (this room is 208px wide vs. the 240px screen, so the border shows
  // as a 16px margin on both sides - see docs/battle-room-notes.md).
  const borderBin = readFileSync(join(REF, "data", "layouts", "BattleFrontier_BattleFactoryBattleRoom", "border.bin"));
  const borderBlocks = readBlocks(borderBin, 4);

  const usedMetatiles = new Map<number, { layerType: number; entries: { tile: number; hFlip: boolean; vFlip: boolean; pal: number }[] }>();
  const usedTiles = new Map<number, number[]>();
  const usedPalettes = new Set<number>();

  function noteMetatile(metatileId: number): void {
    if (usedMetatiles.has(metatileId)) return;
    const isSecondary = metatileId >= 512;
    const tilemap = isSecondary ? secondaryMetaTilemap : primaryMetaTilemap;
    const localId = isSecondary ? metatileId - 512 : metatileId;
    const entries = tilemap.entries.slice(localId * 8, localId * 8 + 8).map((e) => ({
      tile: e.tile,
      hFlip: e.hFlip,
      vFlip: e.vFlip,
      pal: e.palette,
    }));
    usedMetatiles.set(metatileId, { layerType: layerTypeOf(metatileId), entries });
    for (const e of entries) {
      usedPalettes.add(e.pal);
      if (!usedTiles.has(e.tile)) {
        const tile = e.tile < 512 ? primaryTiles[e.tile] : secondaryTiles[e.tile - 512];
        usedTiles.set(e.tile, tile ? [...tile.pixels] : new Array(64).fill(0));
      }
    }
  }

  for (const block of blocks) noteMetatile(block.metatileId);
  for (const block of borderBlocks) noteMetatile(block.metatileId);

  const tilesOut: Record<string, number[]> = {};
  for (const [tileNum, pixels] of usedTiles) tilesOut[tileNum] = pixels;
  const palettesOut: Record<string, { r: number; g: number; b: number }[]> = {};
  for (const slot of usedPalettes) palettesOut[slot] = palettes[slot]!;
  const metatilesOut: Record<string, { layerType: number; entries: { tile: number; hFlip: boolean; vFlip: boolean; pal: number }[] }> = {};
  for (const [id, meta] of usedMetatiles) metatilesOut[id] = meta;

  writeJson(join(ASSETS_GEN, "battle-room-tileset.json"), {
    tiles: tilesOut,
    palettes: palettesOut,
    metatiles: metatilesOut,
  });

  writeJson(join(DATA_GEN, "battle-room-layout.json"), {
    width,
    height,
    blocks,
    border: { width: 2, height: 2, blocks: borderBlocks },
    // Camera: oracle-derived (docs/battle-room-notes.md S2/S3) - unlike the
    // pre-battle room's fixed static shot, THIS room's camera actively pans
    // (tracks the REAL, invisible LOCALID_PLAYER's walk_up x5 - the fake
    // decoy object is one column to its west and does NOT drive the camera -
    // despite the scripts.inc header comment implying a fixed camera; see
    // notes doc for the oracle evidence). Standard field-camera formula
    // (originX = realPlayerTileX*16+8-120, originY = realPlayerTileY*16+8-80,
    // same as prebattle-room-notes.md's derivation) applied to the real
    // player's tile: initialCameraOriginPx is its value at the warp-landing
    // tile (6,11) (not independently oracle-verified - the tick-520-525
    // window carries an unrelated screen-brightness fade-in that defeats
    // direct pixel comparison, see notes doc); settledCameraOriginPx is its
    // value at the real player's post-walk tile (6,6), oracle-confirmed
    // pixel-exact (0/38400 diff, tick 624 and again 740-838).
    initialCameraOriginPx: { x: -16, y: 104 },
    settledCameraOriginPx: { x: -16, y: 24 },
    // Settle tiles (post-EventScript_EnterRoom movement, scripts.inc:104-116).
    // realPlayerTile is the invisible, camera-driving object (warped to (6,11)
    // per BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc's `warp ...,
    // 6, 11`); the visible fake decoy walks the same pattern one column west.
    objects: {
      realPlayerTile: { spawn: { x: 6, y: 11 }, settle: { x: 6, y: 6 } },
      player: { spawnTile: { x: 5, y: 11 }, settleTile: { x: 5, y: 6 }, settleFacing: "east" },
      opponent: { spawnTile: { x: 7, y: 1 }, settleTile: { x: 7, y: 6 }, settleFacing: "west" },
      scientists: [
        { localId: 1, tile: { x: 0, y: 6 }, turn: "east" },
        { localId: 2, tile: { x: 0, y: 4 }, turn: "east" },
        { localId: 3, tile: { x: 0, y: 8 }, turn: "east" },
        { localId: 4, tile: { x: 12, y: 4 }, turn: "west" },
        { localId: 5, tile: { x: 12, y: 6 }, turn: "west" },
        { localId: 6, tile: { x: 12, y: 8 }, turn: "west" },
      ],
    },
  });
}

// --- Overworld sprite sheets (full 9-frame sAnimTable_Standard sheets) -----
// All three characters visible in this scene use the shared 16x32, 9-frame
// overworld_frame(*, 2, 4, N) layout (144x32px = 18x4 8x8-tiles); frame N is
// tile columns [2N, 2N+1] x all 4 rows. sAnimTable_Standard's animation
// commands (object_event_anims.h) resolve to these frame indices:
//   0 = face south         3,4 = walk south (alternating, + frame 0)
//   1 = face north         5,6 = walk north (alternating, + frame 1)
//   2 = face west (raw)    7,8 = walk west (alternating, + frame 2)
//   2 w/ hFlip = face east   7,8 w/ hFlip = walk east (alternating, + frame 2 hFlip)
// This scene's choreography only needs a subset of these per character (see
// docs/battle-room-notes.md), but the full sheet is extracted for each so a
// future engine slice isn't blocked on a second extraction pass.
{
  function extractSheet(sheetPath: string) {
    const img = decodeIndexedPng(sheetPath);
    const sliced = sliceTiles(img); // 18 cols x 4 rows
    const frames: { columns: number; rows: number; tiles: number[][] }[] = [];
    for (let frame = 0; frame < 9; frame += 1) {
      const tiles: number[][] = [];
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          const tx = frame * 2 + col;
          const tile = sliced.tiles[row * sliced.columns + tx];
          tiles.push(tile ? [...tile.pixels] : new Array(64).fill(0));
        }
      }
      frames.push({ columns: 2, rows: 4, tiles });
    }
    return frames;
  }

  // Fake player object (LOCALID_FACTORY_BATTLE_PLAYER): VAR_OBJ_GFX_ID_F is
  // set to OBJ_EVENT_GFX_RIVAL_BRENDAN_NORMAL for a male save
  // (BattleFrontier_BattleFactoryBattleRoom_EventScript_SetPlayerGfxMale,
  // scripts.inc) - this run's save is confirmed male (docs/prebattle-room-
  // notes.md). gObjectEventGraphicsInfo_RivalBrendanNormal
  // (object_event_graphics_info.h:1920-1937) uses the SAME sPicTable_
  // BrendanNormal / OBJ_EVENT_PAL_TAG_BRENDAN as the plain "BrendanNormal"
  // gfx already extracted for the pre-battle room - same source PNG.
  const playerFrames = extractSheet(join(REF, "graphics", "object_events", "pics", "people", "brendan", "walking.png"));
  const playerPalette = loadJascPal(join(REF, "graphics", "object_events", "palettes", "brendan.pal"));

  // Scientists (OBJ_EVENT_GFX_SCIENTIST_1, all 6 background NPCs) - same
  // sheet/palette as the pre-battle room's attendant.
  const scientistFrames = extractSheet(join(REF, "graphics", "object_events", "pics", "people", "scientist_1.png"));
  const scientistPalette = loadJascPal(join(REF, "graphics", "object_events", "palettes", "npc_3.pal"));

  // Opponent walk-in sprite: SetBattleFacilityTrainerGfxId(gTrainerBattleOpponent_A, 0)
  // (src/battle_factory.c:379-382) looks up trainer 50 DESTIN's facilityClass
  // (FACILITY_CLASS_BUG_CATCHER) in gTowerMaleFacilityClasses[28] (src/
  // battle_tower.c:153-181) and reads the parallel gTowerMaleTrainerGfxIds[28]
  // (:211-240) = OBJ_EVENT_GFX_BUG_CATCHER -> gObjectEventGraphicsInfo_
  // BugCatcher (object_event_graphics_info.h:704-720): sPicTable_BugCatcher /
  // OBJ_EVENT_PAL_TAG_NPC_1, also the standard 9-frame sheet.
  const opponentFrames = extractSheet(join(REF, "graphics", "object_events", "pics", "people", "bug_catcher.png"));
  const opponentPalette = loadJascPal(join(REF, "graphics", "object_events", "palettes", "npc_1.pal"));
  // Battle 2's canonical opponent JENSON is FACILITY_CLASS_FISHERMAN.
  // The same SetBattleFacilityTrainerGfxId lookup resolves that class to
  // OBJ_EVENT_GFX_FISHERMAN (battle_tower.c's parallel class/gfx tables).
  const fishermanFrames = extractSheet(join(REF, "graphics", "object_events", "pics", "people", "fisherman.png"));
  const fishermanPalette = loadJascPal(join(REF, "graphics", "object_events", "palettes", "npc_2.pal"));

  // Generated round opponents resolve their walk-in sprite through the same
  // facility-class lookup (see src/engine/factoryTrainerOverworldGfx.ts).
  // Trainer 9 LILIANA is FACILITY_CLASS_SCHOOL_KID_F (female index 7) ->
  // OBJ_EVENT_GFX_GIRL_3 (battle_tower.c:196/254) ->
  // gObjectEventGraphicsInfo_Girl3 (object_event_graphics_info.h:286-303):
  // sPicTable_Girl3 / OBJ_EVENT_PAL_TAG_NPC_2, the standard 9-frame sheet.
  const girl3Frames = extractSheet(join(REF, "graphics", "object_events", "pics", "people", "girl_3.png"));
  const girl3Palette = loadJascPal(join(REF, "graphics", "object_events", "palettes", "npc_2.pal"));

  writeJson(join(ASSETS_GEN, "battle-room-npcs.json"), {
    player: { frames: playerFrames, palette: playerPalette },
    scientist: { frames: scientistFrames, palette: scientistPalette },
    opponent: { frames: opponentFrames, palette: opponentPalette },
    fisherman: { frames: fishermanFrames, palette: fishermanPalette },
    girl3: { frames: girl3Frames, palette: girl3Palette },
  });
}
