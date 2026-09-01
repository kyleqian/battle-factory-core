import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/swift-yellow-star.json" with { type: "json" };
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_SWIFT deterministic YELLOW_STAR source asset", () => {
  it("regenerates byte-for-byte and retains the complete source sheet", () => {
    const output = join(createScratchDir("swift-assets-"), "swift-yellow-star.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractSwiftAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/swift-yellow-star.json"));
    expect(asset.source).toMatchObject({ art: "graphics/battle_anims/sprites/yellow_star.png", tag: { value: 10174 },
      graphics: { bytes: 512 }, palette: { entries: 16 } });
    expect(asset.tileset).toMatchObject({ columns: 4, rows: 4 });
    expect(asset.tileset.tiles).toHaveLength(16);
    expect(asset.palette).toHaveLength(16);
  });
});
