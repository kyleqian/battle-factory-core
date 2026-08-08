import { describe, expect, it } from "vitest";
import lick from "../src/assets/gen/battle-anim-lick.json";

describe("battle-anim-lick.json (MOVE_LICK staging: gLickSpriteTemplate art)", () => {
  it("pins lick.png's tileset shape (5 frames of 2x4 tiles = 8 each, matching the compiled 0x0500-byte sheet)", () => {
    expect(lick.frames.columns).toBe(2);
    expect(lick.frames.rows).toBe(4);
    expect(lick.frames.list.length).toBe(5);
    for (const frame of lick.frames.list) {
      expect(frame.length).toBe(8);
      for (const tile of frame) {
        expect(tile.length).toBe(64);
      }
    }
    expect(lick.tileset.tiles.length).toBe(8);
    expect(lick.palette.length).toBe(16);
  });

  it("every frame is nonempty (at least one nonzero pixel index)", () => {
    for (const frame of lick.frames.list) {
      const hasInk = frame.some((tile) => tile.some((px) => px !== 0));
      expect(hasInk).toBe(true);
    }
  });

  it("pins sAnim_Lick's own frame schedule (5 frames of 8 tiles, 2 ticks each, no loop)", () => {
    expect(lick.anim.frameTileOffsets).toEqual([0, 8, 16, 24, 32]);
    expect(lick.anim.durationTicksPerFrame).toBe(2);
    expect(lick.anim.loops).toBe(false);
  });

  it("pins the OAM shape (AFFINE OFF + OBJ NORMAL 16x32, not 32x32, not OBJ_BLEND/affine - gOamData_AffineOff_ObjNormal_16x32)", () => {
    expect(lick.oam).toEqual({ shape: "16x32", size: "16x32", affine: false, affineMode: "OFF", objMode: "NORMAL" });
  });

  it("regenerates byte-for-byte from the standalone extractor", async () => {
    const { execFileSync } = await import("node:child_process");
    const { readFileSync } = await import("node:fs");
    const assetPath = new URL("../src/assets/gen/battle-anim-lick.json", import.meta.url);
    const committed = readFileSync(assetPath, "utf8");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-lick-sprite.ts"], { stdio: "pipe" });
    const regenerated = readFileSync(assetPath, "utf8");
    expect(regenerated).toBe(committed);
  });
});
