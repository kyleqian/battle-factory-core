import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import selectorTables from "../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import battleFrontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };

const frontAnimIds = selectorTables.frontAnimIds.species as Record<string, string>;
const animationDelay = selectorTables.animationDelay.species as Record<string, number>;
const speciesToBackAnimSet = selectorTables.speciesToBackAnimSet.species as Record<string, string>;
const backAnimNatureMod = selectorTables.backAnimNatureMod.natures as Record<string, number>;
const backAnimationIds = selectorTables.backAnimationIds.sets as Record<string, string[]>;

const rentalPoolSpecies = new Set(
  (battleFrontierMonsData.entries as { species: string }[]).map((entry) => entry.species.replace(/^SPECIES_/, "")),
);

describe("send-out-anim-selector-tables.json (send-out intro animation selector tables, ANIMATION_PROGRESS.md rung 1)", () => {
  it("reproduces the committed artifact byte-for-byte", () => {
    const path = "src/data/gen/send-out-anim-selector-tables.json";
    const before = readFileSync(path, "utf8");
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-send-out-anim-selector-tables-"));
    execFileSync(
      "node",
      [
        "--experimental-strip-types",
        "tools/extract/extract-send-out-anim-selector-tables.ts",
        "--out-dir",
        outputDirectory,
      ],
      { stdio: "pipe" },
    );
    expect(readFileSync(join(outputDirectory, "send-out-anim-selector-tables.json"), "utf8")).toBe(before);
  });

  describe("sMonFrontAnimIdsTable (pokemon.c:1405-1793)", () => {
    it("has 386 literal entries", () => {
      expect(Object.keys(frontAnimIds).length).toBe(386);
    });

    it("pins hand-checked literal entries", () => {
      expect(frontAnimIds.BULBASAUR).toBe("ANIM_V_JUMPS_H_JUMPS");
      expect(frontAnimIds.RATTATA).toBe("ANIM_RAPID_H_HOPS");
      expect(frontAnimIds.CHIMECHO).toBe("ANIM_H_SLIDE_WOBBLE");
    });

    it("is absent for unused SPECIES_OLD_UNOWN_* legacy ids (zero-default, never Factory-reachable)", () => {
      expect(frontAnimIds.OLD_UNOWN_B).toBeUndefined();
      expect(frontAnimIds.OLD_UNOWN_Z).toBeUndefined();
      expect(rentalPoolSpecies.has("OLD_UNOWN_B")).toBe(false);
    });
  });

  describe("sMonAnimationDelayTable (pokemon.c:1795-1852)", () => {
    it("has 55 literal (nonzero) entries", () => {
      expect(Object.keys(animationDelay).length).toBe(55);
    });

    it("pins hand-checked literal entries", () => {
      expect(animationDelay.BLASTOISE).toBe(50);
      expect(animationDelay.KYOGRE).toBe(60);
      expect(animationDelay.RAYQUAZA).toBe(60);
    });

    it("is nonzero for exactly 52 of the 376 rental-pool species (docs/send-out-intro-animation-program.md §1)", () => {
      const nonzeroInPool = [...rentalPoolSpecies].filter((species) => animationDelay[species] !== undefined);
      expect(rentalPoolSpecies.size).toBe(376);
      expect(nonzeroInPool.length).toBe(52);
    });

    it("holds a known-zero rental species (absent = implicit-zero, no start delay) and a known-nonzero one", () => {
      expect(rentalPoolSpecies.has("BULBASAUR")).toBe(true);
      expect(animationDelay.BULBASAUR).toBeUndefined();
      expect(rentalPoolSpecies.has("BLASTOISE")).toBe(true);
      expect(animationDelay.BLASTOISE).toBe(50);
    });
  });

  describe("sSpeciesToBackAnimSet (pokemon_animation.c:213-601)", () => {
    it("has 386 literal entries", () => {
      expect(Object.keys(speciesToBackAnimSet).length).toBe(386);
    });

    it("pins hand-checked literal entries", () => {
      expect(speciesToBackAnimSet.CHARIZARD).toBe("BACK_ANIM_SHAKE_GLOW_RED");
      expect(speciesToBackAnimSet.BLASTOISE).toBe("BACK_ANIM_SHAKE_GLOW_BLUE");
      expect(speciesToBackAnimSet.CHIMECHO).toBe("BACK_ANIM_CONVEX_DOUBLE_ARC");
    });

    it("is absent for the same unused legacy ids as the front table (BACK_ANIM_NONE default)", () => {
      expect(speciesToBackAnimSet.OLD_UNOWN_B).toBeUndefined();
    });
  });

  describe("sBackAnimNatureModTable (pokemon_animation.c:817-844)", () => {
    it("has all 25 natures, dense", () => {
      expect(Object.keys(backAnimNatureMod).length).toBe(25);
    });

    it("pins hand-checked literal entries", () => {
      expect(backAnimNatureMod.NATURE_HARDY).toBe(0);
      expect(backAnimNatureMod.NATURE_TIMID).toBe(2);
      expect(backAnimNatureMod.NATURE_QUIRKY).toBe(1);
    });
  });

  describe("sBackAnimationIds (pokemon_animation.c:788-815)", () => {
    it("has all 25 back-anim sets, each a 3-element [natureMod0, natureMod1, natureMod2] triple", () => {
      expect(Object.keys(backAnimationIds).length).toBe(25);
      for (const triple of Object.values(backAnimationIds)) {
        expect(triple).toHaveLength(3);
      }
    });

    it("pins hand-checked literal entries", () => {
      expect(backAnimationIds.BACK_ANIM_H_VIBRATE).toEqual(["ANIM_H_VIBRATE_FASTEST", "ANIM_H_VIBRATE_FAST", "ANIM_H_VIBRATE"]);
      expect(backAnimationIds.BACK_ANIM_SHAKE_GLOW_BLUE).toEqual(["ANIM_SHAKE_GLOW_BLUE_FAST", "ANIM_SHAKE_GLOW_BLUE", "ANIM_SHAKE_GLOW_BLUE_SLOW"]);
    });
  });

  it("every symbol string is a bare identity-const spelling (no split/computed strings)", () => {
    const allSymbols = [
      ...Object.values(frontAnimIds),
      ...Object.values(speciesToBackAnimSet),
      ...Object.keys(backAnimNatureMod),
      ...Object.keys(backAnimationIds),
      ...Object.values(backAnimationIds).flat(),
    ];
    for (const symbol of allSymbols) {
      expect(symbol).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });
});
