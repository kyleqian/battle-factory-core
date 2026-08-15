import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_POISON_POWDER bounded source/classification checkpoint", () => {
  it("pins the complete source graph, resource identity, and absent Factory carrier", () => {
    const output = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/compare/poisonPowderSourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain("0x082c941c..0x082c954d (0x131 bytes)");
    expect(output).toContain("asset:ANIM_TAG_POISON_BUBBLE");
    expect(output).toContain(
      "gPoisonPowderParticleSpriteTemplate -> AnimMovePowderParticle_Step",
    );
    expect(output).toContain("Poison Bubble is loaded but not instantiated");
    expect(output).toContain("no Level-50 Factory carrier");
    expect(output).toContain("SPECIES_BULBASAUR");
  });

  it("does not falsify the Level-50 coverage ratchet", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries).toHaveLength(189);
    expect(
      coverage.entries.find(
        (entry: { move: string }) => entry.move === "MOVE_POISON_POWDER",
      ),
    ).toBeUndefined();

    const inventory = JSON.parse(
      readFileSync("src/data/gen/factory-animation-inventory.json", "utf8"),
    );
    expect(
      inventory.tiers.level50.moves.find(
        (move: { move: string }) => move.move === "MOVE_POISON_POWDER",
      ),
    ).toBeUndefined();
    expect(
      inventory.tiers.outsideFactory.moves.find(
        (move: { move: string }) => move.move === "MOVE_POISON_POWDER",
      ),
    ).toMatchObject({
      id: 77,
      frontierMonCount: 0,
      speciesCount: 0,
      exampleMons: [],
    });
  });
});
