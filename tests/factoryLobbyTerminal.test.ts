import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import layout from "../src/data/gen/factory-lobby-terminal-layout.json" with { type: "json" };
import tileset from "../src/assets/gen/factory-lobby-terminal-tileset.json" with { type: "json" };
import npcs from "../src/assets/gen/factory-lobby-terminal-npcs.json" with { type: "json" };

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
    ]);
    expect(Object.keys(npcs)).toEqual(["player", "scientist", "woman", "fatMan"]);
    for (const npc of Object.values(npcs)) {
      expect(npc.frames).toHaveLength(1);
      expect(npc.frames[0]).toMatchObject({ columns: 2, rows: 4 });
      expect(npc.frames[0].tiles).toHaveLength(8);
      expect(npc.palette).toHaveLength(16);
    }
    expect(npcs.player.frame).toBe(1); // standard face-north frame
    expect(npcs.scientist.frame).toBe(0); // standard face-south frame
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
        "src/data/gen/factory-lobby-terminal-layout.json",
      ]) {
        expect(readFileSync(join(directory, relative))).toEqual(readFileSync(relative));
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
