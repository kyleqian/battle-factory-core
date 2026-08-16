import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/soft-boiled.json" with { type: "json" };
import milkDrink from "../../src/animation/assets/milk-drink.json" with { type: "json" };
import metronome from "../../src/animation/assets/metronome.json" with { type: "json" };
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_SOFT_BOILED source presentation assets", () => {
  it("regenerates the exact bounded bundle byte-for-byte", () => {
    const output = join(createScratchDir("soft-boiled-assets-"), "soft-boiled.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractSoftBoiledAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/soft-boiled.json"),
    );
  });

  it("pins the required source art and exact shared identities", () => {
    expect(asset.source).toMatchObject({
      carrier: expect.stringContaining("FRONTIER_MON_CHANSEY_2 set 332"),
      breakingEgg: expect.stringContaining("gSoftBoiledEggSpriteTemplate"),
      thinRing: expect.stringContaining("gThinRingExpandingSpriteTemplate"),
      blueStar: expect.stringContaining("gHealingBlueStarSpriteTemplate"),
    });
    expect([asset.breakingEgg.tileset.columns, asset.breakingEgg.tileset.rows])
      .toEqual([4, 12]);
    expect([asset.thinRing.tileset.columns, asset.thinRing.tileset.rows])
      .toEqual([8, 8]);
    expect([asset.blueStar.tileset.columns, asset.blueStar.tileset.rows])
      .toEqual([4, 28]);
    expect([asset.chanseyBack.tileset.columns, asset.chanseyBack.tileset.rows])
      .toEqual([8, 8]);
    expect([asset.chanseyFront.tileset.columns, asset.chanseyFront.tileset.rows])
      .toEqual([8, 16]);
    expect(asset.thinRing).toEqual(milkDrink.thinRing);
    expect(asset.blueStar).toEqual(milkDrink.blueStar);
    expect(asset.chanseyBack).toEqual(metronome.chanseyBack);
    expect(asset.chanseyFront).toEqual(metronome.chanseyFront);
  });
});
