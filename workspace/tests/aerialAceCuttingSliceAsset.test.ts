import { describe, expect, it } from "vitest";
import cuttingSlice from "../src/assets/gen/battle-anim-cutting-slice.json";

describe("battle-anim-cutting-slice.json (S7 groundwork: AERIAL_ACE's gCuttingSliceSpriteTemplate art)", () => {
  it("pins cut.png's tileset shape (4 frames of 4x4 tiles = 16 each, matching the compiled 0x0800-byte sheet)", () => {
    expect(cuttingSlice.frames.columns).toBe(4);
    expect(cuttingSlice.frames.rows).toBe(4);
    expect(cuttingSlice.frames.list.length).toBe(4);
    for (const frame of cuttingSlice.frames.list) {
      expect(frame.length).toBe(16);
      for (const tile of frame) {
        expect(tile.length).toBe(64);
      }
    }
    expect(cuttingSlice.tileset.tiles.length).toBe(16);
    expect(cuttingSlice.palette.length).toBe(16);
  });

  it("every frame is nonempty (at least one nonzero pixel index)", () => {
    for (const frame of cuttingSlice.frames.list) {
      const hasInk = frame.some((tile) => tile.some((px) => px !== 0));
      expect(hasInk).toBe(true);
    }
  });

  it("pins gCuttingSliceAnimCmds' own frame schedule (4 frames, 5 ticks each, no loop)", () => {
    expect(cuttingSlice.anim.frameTileOffsets).toEqual([0, 16, 32, 48]);
    expect(cuttingSlice.anim.durationTicksPerFrame).toBe(5);
    expect(cuttingSlice.anim.loops).toBe(false);
  });

  it("pins the OAM shape (AFFINE OFF + OBJ BLEND, not AFFINE_NORMAL/DOUBLE - gOamData_AffineOff_ObjBlend_32x32)", () => {
    expect(cuttingSlice.oam).toEqual({ shape: "32x32", size: "32x32", affine: false, affineMode: "OFF", objMode: "BLEND" });
  });
});
