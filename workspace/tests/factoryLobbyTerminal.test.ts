import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import layout from "../src/data/gen/factory-lobby-terminal-layout.json" with { type: "json" };
import tileset from "../src/assets/gen/factory-lobby-terminal-tileset.json" with { type: "json" };
import npcs from "../src/assets/gen/factory-lobby-terminal-npcs.json" with { type: "json" };
import downArrow from "../src/assets/gen/factory-terminal-down-arrow.json" with { type: "json" };

describe("Factory Lobby terminal visual extraction", () => {
  it("pins the regular loss/seventh-win handoff viewport including its required border", () => {
    expect(layout.width).toBe(19);
    expect(layout.height).toBe(12);
    expect(layout.blocks).toHaveLength(19 * 12);
    expect(layout.border).toEqual({
      width: 2,
      height: 2,
      blocks: [
        { metatileId: 1, collision: 0, elevation: 0 },
        { metatileId: 1, collision: 0, elevation: 0 },
        { metatileId: 1, collision: 0, elevation: 0 },
        { metatileId: 1, collision: 0, elevation: 0 },
      ],
    });
    expect(layout.terminalWarp).toEqual({ x: 4, y: 8, facing: "north" });
    // (4*16+8 - 120, 8*16+8 - 80): ordinary field-camera centering.
    expect(layout.cameraOriginPx).toEqual({ x: -48, y: 56 });
  });

  it("keeps only the objects exposed by the terminal singles viewport", () => {
    expect(layout.visibleObjects).toEqual([
      { id: "player", localId: "LOCALID_PLAYER", graphicsId: "OBJ_EVENT_GFX_BRENDAN_NORMAL", tile: { x: 4, y: 8 }, facing: "north", pose: "north", asset: "player" },
      { id: "singlesAttendant", localId: "LOCALID_FACTORY_ATTENDANT_SINGLES", graphicsId: "OBJ_EVENT_GFX_SCIENTIST_1", tile: { x: 4, y: 7 }, facing: "south", pose: "south", asset: "scientist" },
      { id: "woman", graphicsId: "OBJ_EVENT_GFX_WOMAN_1", tile: { x: 3, y: 11 }, facing: "south", pose: "south", asset: "woman" },
      { id: "fatMan", graphicsId: "OBJ_EVENT_GFX_FAT_MAN", tile: { x: 6, y: 10 }, facing: "south", pose: "south", asset: "fatMan" },
      { id: "doublesAttendant", localId: "LOCALID_FACTORY_ATTENDANT_DOUBLES", graphicsId: "OBJ_EVENT_GFX_SCIENTIST_1", tile: { x: 14, y: 7 }, facing: "south", pose: "south", asset: "scientist" },
      { id: "camper", graphicsId: "OBJ_EVENT_GFX_CAMPER", tile: { x: 14, y: 11 }, facing: "south", pose: "south", asset: "camper" },
      { id: "picnicker", graphicsId: "OBJ_EVENT_GFX_PICNICKER", tile: { x: 13, y: 11 }, facing: "east", pose: "east", asset: "picnicker" },
    ]);
    expect(Object.keys(npcs)).toEqual(["player", "scientist", "woman", "fatMan", "camper", "picnicker"]);
    // The player carries the full 9-frame walking.png sheet (0=south stand,
    // 1=north stand, 2=west stand, 3/4=south walk1/2, 5/6=north walk1/2,
    // 7/8=west walk1/2) for the free-roam walk-cycle (docs/factory-lobby-
    // freeroam-ground-truth.md §3a); the other NPCs keep their single pose.
    expect(npcs.player.frames).toHaveLength(9);
    for (const frame of npcs.player.frames) {
      expect(frame).toMatchObject({ columns: 2, rows: 4 });
      expect(frame.tiles).toHaveLength(8);
    }
    // The woman carries her full 9-frame walking sheet too: the wander-NPC
    // schedule (docs/factory-lobby-freeroam-ground-truth.md §6) renders her
    // walk-cycle poses; the remaining NPCs keep their single pose.
    expect(npcs.woman.frames).toHaveLength(9);
    for (const frame of npcs.woman.frames) {
      expect(frame).toMatchObject({ columns: 2, rows: 4 });
      expect(frame.tiles).toHaveLength(8);
    }
    expect(npcs.woman.palette).toHaveLength(16);
    for (const npc of [npcs.scientist, npcs.fatMan, npcs.camper, npcs.picnicker]) {
      expect(npc.frames).toHaveLength(1);
      expect(npc.frames[0]).toMatchObject({ columns: 2, rows: 4 });
      expect(npc.frames[0].tiles).toHaveLength(8);
      expect(npc.palette).toHaveLength(16);
    }
    expect(npcs.player.palette).toHaveLength(16);
    expect(npcs.player.frame).toBe(1); // standard face-north frame
    expect(npcs.scientist.frame).toBe(0); // standard face-south frame
    expect(npcs.picnicker.frame).toBe(2); // east = west frame h-flipped
    expect(downArrow).toMatchObject({ width: 8, height: 48, blitWidth: 8, blitHeight: 16 });
    expect(new Set(downArrow.indices.flat())).toEqual(new Set([0, 2, 4]));
  });

  it("pins source decoded metatile and palette inputs rather than a screen capture", () => {
    const referenced = new Set([...layout.blocks, ...layout.border.blocks].map((block) => block.metatileId));
    expect(Object.keys(tileset.metatiles).map(Number).sort((a, b) => a - b)).toEqual([...referenced].sort((a, b) => a - b));
    expect(tileset.metatiles["1"]).toMatchObject({ layerType: 0 });
    expect(tileset.metatiles["547"].entries).toHaveLength(8);
    expect(tileset.tiles["0"]).toHaveLength(64);
    expect(tileset.palettes["6"][10]).toEqual({ r: 214, g: 214, b: 198 });
    // Woman 1 and Fat Man share OBJ_EVENT_PAL_TAG_NPC_1 in source.
    expect(npcs.woman.palette).toEqual(npcs.fatMan.palette);
  });

  it("reproduces the committed source artifacts byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-lobby-terminal-"));
    try {
      execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-factory-lobby-terminal.ts", "--out-dir", directory], { stdio: "pipe" });
      for (const relative of [
        "src/assets/gen/factory-lobby-terminal-tileset.json",
        "src/assets/gen/factory-lobby-terminal-npcs.json",
        "src/assets/gen/factory-terminal-down-arrow.json",
        "src/data/gen/factory-lobby-terminal-layout.json",
      ]) {
        expect(readFileSync(join(directory, relative))).toEqual(readFileSync(relative));
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
