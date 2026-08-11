import { describe, expect, it } from "vitest";
import bugCatcher from "../src/assets/gen/trainer-pic-bug-catcher.json" with { type: "json" };
import brendanBack from "../src/assets/gen/trainer-pic-brendan-back.json" with { type: "json" };

// Oracle cross-check (docs/battle-bringup-notes.md's transition-end/intro
// scene, scratch trace): the Bug Catcher front pic rendered from this exact
// JSON is 100% pixel-identical (890/890) to the oracle's on-screen trainer
// sprite. Brendan's back pic sheet's frame index 3 (not 0, initially
// assumed) is likewise 100% pixel-identical (1344/1344) - frames 0-2 (the
// throw animation's other poses) each mismatch ~52% against that same frame.

describe("trainer-pic-bug-catcher.json", () => {
  it("is a 64x64 (8x8 tile) sprite with its own embedded 16-color palette", () => {
    expect(bugCatcher.tileset.columns).toBe(8);
    expect(bugCatcher.tileset.rows).toBe(8);
    expect(bugCatcher.tileset.tiles).toHaveLength(64);
    expect(bugCatcher.palette).toHaveLength(16);
  });

  it("pins the y-offset from gTrainerFrontPicCoords[TRAINER_PIC_BUG_CATCHER]", () => {
    expect(bugCatcher.yOffsetPx).toBe(8);
  });

  it("pins the first non-blank tile (oracle-confirmed 100% exact)", () => {
    const firstNonBlank = bugCatcher.tileset.tiles.findIndex((t) => t.some((v) => v !== 0));
    expect(firstNonBlank).toBe(13);
  });
});

describe("trainer-pic-brendan-back.json", () => {
  it("is a 4-frame 64x64 sheet (8x32 tiles) with a separate JASC palette", () => {
    expect(brendanBack.frameCount).toBe(4);
    expect(brendanBack.tileset.columns).toBe(8);
    expect(brendanBack.tileset.rows).toBe(32);
    expect(brendanBack.tileset.tiles).toHaveLength(256);
    expect(brendanBack.palette).toHaveLength(16);
  });

  it("pins the y-offset from gTrainerBackPicCoords[TRAINER_BACK_PIC_BRENDAN]", () => {
    expect(brendanBack.yOffsetPx).toBe(32);
  });

  it("pins a skin-tone palette entry (oracle-visible on the sprite's face)", () => {
    expect(brendanBack.palette[1]).toEqual({ r: 255, g: 222, b: 206 });
  });
});
