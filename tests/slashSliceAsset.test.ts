import { describe, expect, it } from "vitest";
import slashSlice from "../src/assets/gen/battle-anim-slash-slice.json";

describe("battle-anim-slash-slice.json (MOVE_SLASH staging: gSlashSliceSpriteTemplate art)", () => {
  it("pins slash.png's tileset shape (4 frames of 4x4 tiles = 16 each, matching the compiled 0x0800-byte sheet)", () => {
    expect(slashSlice.frames.columns).toBe(4);
    expect(slashSlice.frames.rows).toBe(4);
    expect(slashSlice.frames.list.length).toBe(4);
    for (const frame of slashSlice.frames.list) {
      expect(frame.length).toBe(16);
      for (const tile of frame) {
        expect(tile.length).toBe(64);
      }
    }
    expect(slashSlice.tileset.tiles.length).toBe(16);
    expect(slashSlice.palette.length).toBe(16);
  });

  it("every frame is nonempty (at least one nonzero pixel index)", () => {
    for (const frame of slashSlice.frames.list) {
      const hasInk = frame.some((tile) => tile.some((px) => px !== 0));
      expect(hasInk).toBe(true);
    }
  });

  it("pins gSlashSliceAnimCmds1's own frame schedule (4 frames, 4 ticks each, no loop)", () => {
    expect(slashSlice.anim.frameTileOffsets).toEqual([0, 16, 32, 48]);
    expect(slashSlice.anim.durationTicksPerFrame).toBe(4);
    expect(slashSlice.anim.loops).toBe(false);
  });

  it("pins the OAM shape (AFFINE OFF + OBJ NORMAL, not OBJ_BLEND/affine - gOamData_AffineOff_ObjNormal_32x32)", () => {
    expect(slashSlice.oam).toEqual({ shape: "32x32", size: "32x32", affine: false, affineMode: "OFF", objMode: "NORMAL" });
  });

  it("regenerates byte-for-byte from the standalone extractor", async () => {
    const { execFileSync } = await import("node:child_process");
    const { readFileSync } = await import("node:fs");
    const assetPath = new URL("../src/assets/gen/battle-anim-slash-slice.json", import.meta.url);
    const committed = readFileSync(assetPath, "utf8");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-slash-slice.ts"], { stdio: "pipe" });
    const regenerated = readFileSync(assetPath, "utf8");
    expect(regenerated).toBe(committed);
  });
});
