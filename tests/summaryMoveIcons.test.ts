import { describe, expect, it } from "vitest";
import effectBattle from "../src/assets/gen/summary-move-effect-battle.json" with { type: "json" };
import effectContest from "../src/assets/gen/summary-move-effect-contest.json" with { type: "json" };
import effectCancel from "../src/assets/gen/summary-move-effect-cancel.json" with { type: "json" };
import moveSelect from "../src/assets/gen/summary-move-select.json" with { type: "json" };

describe("summary-move-effect-{battle,contest}.json (move-list corner icons)", () => {
  it("is a 10x8 raw tilemap (source-confirmed width=10, file is 1 row longer than the 10x7 CopyNColumnsToTilemap reads)", () => {
    expect(effectBattle.tilemap.width).toBe(10);
    expect(effectBattle.tilemap.height).toBe(8);
    expect(effectBattle.tilemap.entries).toHaveLength(80);
    expect(effectBattle.readRows).toBe(7);

    expect(effectContest.tilemap.width).toBe(10);
    expect(effectContest.tilemap.height).toBe(8);
    expect(effectContest.tilemap.entries).toHaveLength(80);
  });

  it("decodes each entry's tile/hFlip/vFlip/palette bitfields", () => {
    for (const entry of effectBattle.tilemap.entries) {
      expect(entry.tile).toBeGreaterThanOrEqual(0);
      expect(entry.tile).toBeLessThan(1024);
      expect(entry.palette).toBeGreaterThanOrEqual(0);
      expect(entry.palette).toBeLessThan(16);
    }
  });
});

describe("summary-move-effect-cancel.json (5-move CANCEL toggle tilemap)", () => {
  it("is a flat 64-entry array (128-byte file / 2 bytes per entry)", () => {
    expect(effectCancel.entries).toHaveLength(64);
  });

  it("documents the 4 slices TilemapFiveMovesDisplay reads (pokemon_summary_screen.c:2583-2607)", () => {
    expect(effectCancel.slices).toEqual([
      { name: "insertA", offset: 0, length: 20 },
      { name: "insertB", offset: 20, length: 20 },
      { name: "removeA", offset: 20, length: 20 },
      { name: "removeB", offset: 40, length: 20 },
    ]);
    for (const slice of effectCancel.slices) {
      expect(slice.offset + slice.length).toBeLessThanOrEqual(effectCancel.entries.length);
    }
  });
});

describe("summary-move-select.json (move-select cursor sprite sheet)", () => {
  it("is a 16x128px (2x16-tile) sheet with its own embedded 16-color palette", () => {
    expect(moveSelect.tileset.columns).toBe(2);
    expect(moveSelect.tileset.rows).toBe(16);
    expect(moveSelect.tileset.tiles).toHaveLength(32);
    expect(moveSelect.palette).toHaveLength(16);
  });
});
