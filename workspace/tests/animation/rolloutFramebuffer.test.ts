import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import shadow from "../../src/assets/gen/battle-enemy-shadow.json" with { type: "json" };
import { verifyRolloutFramebuffer } from "../../tools/compare/rolloutFramebuffer.ts";
import fixture from "../../tools/compare/fixtures/rollout-evidence.json" with { type: "json" };

describe("MOVE_ROLLOUT production framebuffer", () => {
  it("derives the five pointer-entry strips from the elevated enemy-shadow OAM layer", () => {
    const source = readFileSync(
      "reference/pokeemerald/src/battle_gfx_sfx_util.c",
      "utf8",
    );
    const elevation = readFileSync(
      "reference/pokeemerald/src/data/pokemon_graphics/enemy_mon_elevation.h",
      "utf8",
    );
    expect(source).toContain("void SpriteCB_EnemyShadow(struct Sprite *shadowSprite)");
    expect(source).toContain("if (gAnimScriptActive || battlerSprite->invisible)");
    expect(source).toContain("shadowSprite->invisible = invisible;");
    expect(elevation).toContain("[SPECIES_VOLTORB] = 10");
    expect(shadow).toMatchObject({
      width: 32,
      height: 8,
      color: { r: 82, g: 107, b: 99 },
    });
    expect(shadow.mask).toHaveLength(200);
    expect(shadow.elevatedSpecies).toContain("SPECIES_VOLTORB");

    const receipt = fixture.orientations["opponent-front"];
    const evidence = JSON.parse(
      gunzipSync(readFileSync(receipt.denseState)).toString("utf8"),
    ) as { bodies: Array<Array<Record<string, any>>> };
    for (const body of evidence.bodies) {
      const pointerEntry = body[0]!;
      const nextDisplay = body[1]!;
      const shadowOam = Buffer.from(pointerEntry.hardwareOam[11], "hex");
      expect(shadowOam.readUInt16LE(0) & 0xff).toBe(65);
      expect(shadowOam.readUInt16LE(2) & 0x1ff).toBe(160);
      expect(pointerEntry.softwareOam[11]).not.toBe(pointerEntry.hardwareOam[11]);
      expect(nextDisplay.hardwareOam[11]).toBe(pointerEntry.softwareOam[11]);
    }
  });

  it("matches every retained bilateral row with zero residual pixels", () => {
    expect(verifyRolloutFramebuffer()).toEqual({
      matched: { "player-back": 793, "opponent-front": 793 },
      residualRows: { "player-back": 0, "opponent-front": 0 },
      residualPixels: 0,
    });
  });
});
