import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/heal-bell.json" with { type: "json" };
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_HEAL_BELL source presentation assets", () => {
  it("regenerates the complete shared sprite and Chimecho bundle byte-for-byte", () => {
    const output = join(createScratchDir("heal-bell-assets-"), "heal-bell.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractHealBellAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/heal-bell.json"),
    );
  });

  it("pins the Bell, five source palette rows, ring, Sparkle 2, and battler geometry", () => {
    expect(asset.source).toMatchObject({
      bell: expect.stringContaining("gBellSpriteTemplate"),
      musicNotes2: expect.stringContaining("gHealBellMusicNoteSpriteTemplate"),
      thinRing: expect.stringContaining("gBlendThinRingExpandingSpriteTemplate"),
      sparkle2: expect.stringContaining("gSparklingStarsSpriteTemplate"),
    });
    expect([asset.bell.tileset.columns, asset.bell.tileset.rows]).toEqual([4, 12]);
    expect([asset.musicNotes2.tileset.columns, asset.musicNotes2.tileset.rows])
      .toEqual([2, 32]);
    expect(asset.musicNotes2.palettes).toHaveLength(5);
    expect(asset.musicNotes2.palettes.every((palette) => palette.length === 16))
      .toBe(true);
    expect([asset.thinRing.tileset.columns, asset.thinRing.tileset.rows])
      .toEqual([8, 8]);
    expect([asset.sparkle2.tileset.columns, asset.sparkle2.tileset.rows])
      .toEqual([4, 32]);
    expect([asset.chimechoBack.tileset.columns, asset.chimechoBack.tileset.rows])
      .toEqual([8, 8]);
    expect([asset.chimechoFront.tileset.columns, asset.chimechoFront.tileset.rows])
      .toEqual([8, 16]);
  });
});
