import { describe, expect, it } from "vitest";
import logo from "../src/assets/gen/battle-transition-frontier-logo.json" with { type: "json" };
import squares from "../src/assets/gen/battle-transition-frontier-squares.json" with { type: "json" };
import circles from "../src/assets/gen/battle-transition-frontier-circles.json" with { type: "json" };
import meta from "../src/data/gen/battle-transitions-frontier.json" with { type: "json" };

// Not oracle-cross-checked: which of the 12 Factory transitions plays is
// RNG-dependent (one Random() call, battle_setup.c:863,885), so a targeted
// oracle pixel trace can't cheaply pin a specific mechanism's frames without
// first reverse-engineering the RNG stream (out of scope for this step).
// Every value pinned below instead traces back to a decoded
// reference/pokeemerald source file (PNG palette/tile data or a raw
// tilemap/table binary) - see tools/extract/extract-battle-transition-frontier.ts's
// header for the reconstruction proof (source-PNG concatenation matches the
// ROM's own graphics_file_rules.mk build rule byte for byte).

describe("battle-transition-frontier-logo.json (LOGO_WIGGLE/LOGO_WAVE)", () => {
  it("has a 16-color palette (frontier_logo.png's own .gbapal)", () => {
    expect(logo.palette).toHaveLength(16);
  });

  it("has the full 41x5 raw tile slice (205 tiles, none truncated - battle_transition.c:330)", () => {
    expect(logo.tileset.columns).toBe(41);
    expect(logo.tileset.rows).toBe(5);
    expect(logo.tileset.tiles).toHaveLength(205);
  });

  it("has a 32x32 tilemap (frontier_logo.bin, a single BG_SCREEN_SIZE block)", () => {
    expect(logo.tilemap.width).toBe(32);
    expect(logo.tilemap.height).toBe(32);
    expect(logo.tilemap.entries).toHaveLength(1024);
  });

  it("pins tilemap entry 0 and its BG_PLTT_ID(15) palette slot", () => {
    expect(logo.tilemap.entries[0]).toEqual({ tile: 0, hFlip: false, vFlip: false, palette: 15 });
  });

  it("never references a tile beyond the 205-tile raw slice", () => {
    for (const e of logo.tilemap.entries) expect(e.tile).toBeLessThan(205);
  });

  it("pins tile 204 (the last raw tile)'s first row", () => {
    expect(logo.tileset.tiles[204]!.slice(0, 8)).toEqual([4, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("battle-transition-frontier-squares.json (SQUARES/SQUARES_SCROLL)", () => {
  it("has a 16-color palette (frontier_squares_blanktiles.png's own .gbapal)", () => {
    expect(squares.palette).toHaveLength(16);
  });

  it("has the Factory-relevant square layout constants (battle_transition.c:962-966)", () => {
    expect(squares.layout).toEqual({
      squareSizeTiles: 4,
      marginSizeTiles: 1,
      numSquaresPerRow: 7,
      numSquaresPerCol: 5,
      numSquares: 35,
    });
  });

  it("builds each tileset as blanktiles(2) ++ squares_<N>(16), matching graphics_file_rules.mk's cat rule", () => {
    for (const key of ["filledBg", "emptyBg", "shrink1", "shrink2"] as const) {
      expect(squares.tileset[key].blankTileCount).toBe(2);
      expect(squares.tileset[key].tiles).toHaveLength(18);
    }
  });

  it("pins filledBg tile 0 (blank) and tile 2 (first frontier_squares_1.png tile)", () => {
    expect(squares.tileset.filledBg.tiles[0]!.every((p) => p === 0)).toBe(true);
    expect(squares.tileset.filledBg.tiles[2]!.slice(0, 8)).toEqual([11, 12, 12, 12, 12, 12, 12, 12]);
  });

  it("has a 4x4 tilemap (frontier_squares.bin, SQUARE_SIZExSQUARE_SIZE) referencing only the squares_<N> half (tiles 2-17)", () => {
    expect(squares.tilemap.width).toBe(4);
    expect(squares.tilemap.height).toBe(4);
    expect(squares.tilemap.entries).toHaveLength(16);
    for (const e of squares.tilemap.entries) {
      expect(e.tile).toBeGreaterThanOrEqual(2);
      expect(e.tile).toBeLessThan(18);
    }
  });

  it("has the 64-entry scroll draw/erase order (sFrontierSquaresScroll_Positions, battle_transition.c:982-991)", () => {
    expect(squares.scrollPositions).toHaveLength(64);
    expect(squares.scrollPositions.slice(0, 4)).toEqual([0, 16, 41, 22]);
    expect(squares.scrollPositions.slice(-4)).toEqual([26, 42, 31, 8]);
    expect(new Set(squares.scrollPositions).size).toBe(64);
  });
});

describe("battle-transition-frontier-circles.json (CIRCLES_* family, all 8 variants)", () => {
  it("has the center backdrop's 45 raw tiles (43 used, 2 trailing unused - see extractor header)", () => {
    expect(circles.centerBg.tileset.tiles).toHaveLength(45);
  });

  it("has a 32x32 center tilemap referencing only tiles 0-42 (the 43 non-truncated tiles)", () => {
    expect(circles.centerBg.tilemap.width).toBe(32);
    expect(circles.centerBg.tilemap.height).toBe(32);
    for (const e of circles.centerBg.tilemap.entries) expect(e.tile).toBeLessThanOrEqual(42);
    expect(Math.max(...circles.centerBg.tilemap.entries.map((e) => e.tile))).toBe(42);
  });

  it("splits the 192-tile circle sheet into 3 distinct 64-tile (8x8) pieces per ANIMCMD_FRAME offsets", () => {
    for (const piece of [circles.circleSprites.top, circles.circleSprites.left, circles.circleSprites.right]) {
      expect(piece.columns).toBe(8);
      expect(piece.rows).toBe(8);
      expect(piece.tiles).toHaveLength(64);
    }
    // The 3 pieces must be genuinely distinct slices, not the same data 3x.
    expect(circles.circleSprites.top.tiles).not.toEqual(circles.circleSprites.left.tiles);
    expect(circles.circleSprites.left.tiles).not.toEqual(circles.circleSprites.right.tiles);
  });

  it("has a 16-color circle-sprite palette (frontier_logo_circles.png's own .gbapal)", () => {
    expect(circles.circleSprites.palette).toHaveLength(16);
  });
});

describe("battle-transitions-frontier.json (12-way id -> mechanism + params table)", () => {
  it("selects via B_TRANSITION_GROUP_B_FACTORY=6, one Random() call over 12 entries", () => {
    expect(meta.selector.groupId).toBe(6);
    expect(meta.table).toHaveLength(12);
  });

  it("has exactly the 12 ids from sBattleTransitionTable_BattleFrontier (battle_setup.c:131-145), excluding SQUARES_SPIRAL", () => {
    const ids = meta.table.map((t) => t.id).sort((a, b) => a - b);
    expect(ids).toEqual([29, 30, 31, 32, 34, 35, 36, 37, 38, 39, 40, 41]);
    expect(meta.table.some((t) => t.name.includes("SQUARES_SPIRAL"))).toBe(false);
  });

  it("assigns every entry to one of the 3 documented mechanism families", () => {
    const families = new Set(meta.table.map((t) => t.family));
    expect(families).toEqual(
      new Set(["logoWiggle", "logoWave", "squares", "squaresScroll", "circlesSlide", "circlesSpiral", "circlesSlideInSeq", "circlesSpiralInSeq"]),
    );
  });

  it("pins the circles-slide targets shared by every slide variant (SpriteCB_LogoCircleSlide targets)", () => {
    const meetEntry = meta.table.find((t) => t.name === "B_TRANSITION_FRONTIER_CIRCLES_MEET")!;
    expect(meetEntry.params.targets).toEqual({ top: { x: 120, y: 45 }, left: { x: 89, y: 97 }, right: { x: 151, y: 97 } });
  });

  it("pins the squares-scroll direction table (Random() % 4, battle_transition.c:4679-4697)", () => {
    const scrollEntry = meta.table.find((t) => t.name === "B_TRANSITION_FRONTIER_SQUARES_SCROLL")!;
    const scrollDirections = scrollEntry.params.scrollDirections ?? [];
    expect(scrollDirections).toHaveLength(4);
    expect(scrollDirections[1]).toEqual({ roll: 1, dx: -1, dy: -1, label: "up/left" });
  });

  it("every table entry's `assets` field points at one of the 3 committed asset JSONs", () => {
    const validAssets = new Set([
      "battle-transition-frontier-logo.json",
      "battle-transition-frontier-squares.json",
      "battle-transition-frontier-circles.json",
    ]);
    for (const t of meta.table) expect(validAssets.has(t.assets)).toBe(true);
  });
});
