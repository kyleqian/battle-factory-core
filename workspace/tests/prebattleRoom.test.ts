import { describe, expect, it } from "vitest";
import layout from "../src/data/gen/prebattle-room-layout.json" with { type: "json" };
import tileset from "../src/assets/gen/prebattle-room-tileset.json" with { type: "json" };
import npcs from "../src/assets/gen/prebattle-room-npcs.json" with { type: "json" };
import msgbox from "../src/assets/gen/prebattle-room-msgbox.json" with { type: "json" };

// Every pinned value below was cross-checked against the oracle's settled
// S5 exit-scene captures (frame-00333/00337, /tmp/s5-scout/rent3-dense-exit-out/,
// scratch per instructions) by rendering the extracted tileset+layout+NPC
// sprites at the documented camera origin and sprite anchor, diffing against
// the oracle PNG: 0/38400 pixels differ on both frames. See
// docs/prebattle-room-notes.md.

describe("prebattle-room-layout.json", () => {
  it("has the LAYOUT_BATTLE_FRONTIER_BATTLE_FACTORY_PRE_BATTLE_ROOM dimensions (data/layouts/layouts.json)", () => {
    expect(layout.width).toBe(17);
    expect(layout.height).toBe(14);
    expect(layout.blocks.length).toBe(17 * 14);
  });

  it("pins the settled S5 exit-scene camera origin and NPC tile positions", () => {
    // originX = playerTileX*16 + 8 - 120, originY = playerTileY*16 + 8 - 80
    // (player's tile-center pixel fixed at screen center (120,80)).
    expect(layout.playerTile).toEqual({ x: 8, y: 8 });
    expect(layout.attendantTile).toEqual({ x: 8, y: 7 });
    expect(layout.cameraOriginPx).toEqual({ x: 16, y: 56 });
  });

  it("pins block 0 (top-left map corner)", () => {
    expect(layout.blocks[0]).toEqual({ metatileId: 538, collision: 1, elevation: 0 });
  });
});

describe("prebattle-room-tileset.json", () => {
  it("only extracted the metatiles/tiles/palettes this map's blocks actually reference", () => {
    const referencedMetatileIds = new Set(layout.blocks.map((b) => b.metatileId));
    expect(Object.keys(tileset.metatiles).map(Number).sort((a, b) => a - b)).toEqual(
      [...referencedMetatileIds].sort((a, b) => a - b),
    );
    expect(Object.keys(tileset.tiles).length).toBeGreaterThan(0);
    expect(Object.keys(tileset.palettes).length).toBeGreaterThan(0);
  });

  it("pins metatile 538's tile-entry layout (the map's top-left corner block)", () => {
    const meta = tileset.metatiles["538"];
    expect(meta.layerType).toBe(0); // METATILE_LAYER_TYPE_NORMAL
    expect(meta.entries).toHaveLength(8);
    expect(meta.entries[0]).toEqual({ tile: 656, hFlip: false, vFlip: false, pal: 6 });
    // bottom layer only (a plain wall block); top layer is all-zero/transparent.
    expect(meta.entries.slice(4)).toEqual([
      { tile: 0, hFlip: false, vFlip: false, pal: 0 },
      { tile: 0, hFlip: false, vFlip: false, pal: 0 },
      { tile: 0, hFlip: false, vFlip: false, pal: 0 },
      { tile: 0, hFlip: false, vFlip: false, pal: 0 },
    ]);
  });

  it("pins tile 656's raw pixel indices (top row)", () => {
    expect(tileset.tiles["656"].slice(0, 8)).toEqual([2, 4, 4, 2, 10, 10, 10, 10]);
  });

  it("pins palette slot 6's oracle-matching expanded RGB (secondary battle_factory/palettes/06.pal)", () => {
    // Index 10 is this room's floor color, cross-checked pixel-for-pixel
    // against the oracle capture's (214,214,198) floor tiles.
    expect(tileset.palettes["6"][10]).toEqual({ r: 214, g: 214, b: 198 });
    expect(tileset.palettes["6"][2]).toEqual({ r: 148, g: 148, b: 165 });
  });
});

describe("prebattle-room-npcs.json", () => {
  it("extracted all 9 standard 16x32 (2x4 8x8-tile) poses per NPC with its own 16-color palette", () => {
    for (const npc of [npcs.attendant, npcs.player]) {
      expect(npc.frames).toHaveLength(9);
      for (const frame of npc.frames) {
        expect(frame.columns).toBe(2);
        expect(frame.rows).toBe(4);
        expect(frame.tiles).toHaveLength(8);
      }
      expect(npc.palette).toHaveLength(16);
    }
  });

  it("pins facing directions matching the settled scene (attendant faces the player)", () => {
    expect(npcs.attendant.facing).toBe("south"); // scripts.inc face_down after walking in
    expect(npcs.player.facing).toBe("north"); // holds the walk_up direction
  });

  it("pins a skin-tone palette entry shared by both sprites (oracle-visible on both NPCs' faces)", () => {
    expect(npcs.attendant.palette[1]).toEqual({ r: 255, g: 214, b: 181 });
    expect(npcs.player.palette[1]).toEqual({ r: 255, g: 214, b: 181 });
  });
});

describe("prebattle-room-msgbox.json", () => {
  it("extracted the 56x16 (7x2 8x8-tile) standard field message-box frame with its embedded palette", () => {
    expect(msgbox.tileset.columns).toBe(7);
    expect(msgbox.tileset.rows).toBe(2);
    expect(msgbox.tileset.tiles).toHaveLength(14);
    expect(msgbox.palette).toHaveLength(16);
    // Pure white (255,255,255), matching the oracle's box-interior fill
    // exactly (ISSUES #15 fix: gbaColor.ts's to5Bit() previously rounded
    // this raw-multiple-of-8 PNG palette entry down by one GBA step -
    // 248 -> 30/31 - producing an off-white 247; see gbaColor.ts's module
    // doc). Index 2/3 (below) likewise now match the message text's
    // fg/shadow colors exactly - no separate baked/hardcoded asset needed.
    expect(msgbox.palette[1]).toEqual({ r: 255, g: 255, b: 255 });
    expect(msgbox.palette[2]).toEqual({ r: 99, g: 99, b: 99 });
    expect(msgbox.palette[3]).toEqual({ r: 214, g: 214, b: 206 });
  });
});
