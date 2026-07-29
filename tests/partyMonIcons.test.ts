import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import iconsData from "../src/assets/gen/party-mon-icons.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };

type Icon = {
  sourcePath: string;
  width: number;
  height: number;
  frameCount: number;
  paletteIndex: number;
  frame0: { columns: number; rows: number; tiles: number[][] };
  frame1: { columns: number; rows: number; tiles: number[][] };
  palette: Array<{ r: number; g: number; b: number }>;
};

const icons = iconsData as Record<string, Icon>;
const frontierMons = frontierMonsData as { count: number; entries: Array<{ index: number; species: string }> };

describe("party-mon-icons.json (complete Battle Factory party-icon surface)", () => {
  it("reproduces the committed source-derived catalog byte-for-byte", () => {
    const path = "src/assets/gen/party-mon-icons.json";
    const before = readFileSync(path, "utf8");
    execFileSync("npm", ["run", "extract:party-mon-icons"], { stdio: "pipe" });
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("contains all and only the 376 species occurring in the 882 Frontier mon sets", () => {
    expect(frontierMons.count).toBe(882);
    const usedSpecies = [...new Set(frontierMons.entries.map((entry) => entry.species))].sort();
    expect(usedSpecies).toHaveLength(376);
    expect(Object.keys(icons)).toEqual(usedSpecies);
  });

  it("joins every Frontier set to a source-exact two-frame icon and its palette table", () => {
    for (const mon of frontierMons.entries) {
      const icon = icons[mon.species];
      expect(icon, `Frontier set ${mon.index} (${mon.species}) has an extracted icon`).toBeDefined();
      expect(icon!.sourcePath).toMatch(/^graphics\/pokemon\/(?:[a-z0-9_]+\/)+icon\.png$/);
      expect(icon!.width).toBe(32);
      expect(icon!.height).toBe(64);
      expect(icon!.frameCount).toBe(2);
      expect(icon!.paletteIndex).toBeGreaterThanOrEqual(0);
      expect(icon!.paletteIndex).toBeLessThanOrEqual(2);
      expect(icon!.palette).toHaveLength(16);
      for (const frame of [icon!.frame0, icon!.frame1]) {
        expect(frame).toMatchObject({ columns: 4, rows: 4 });
        expect(frame.tiles).toHaveLength(16);
        expect(frame.tiles.every((tile) => tile.length === 64 && tile.every((pixel) => pixel >= 0 && pixel < 16))).toBe(true);
      }
    }
  });
});
