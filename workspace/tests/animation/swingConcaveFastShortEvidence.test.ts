import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import sandshrewScenario from "../../tools/compare/fixtures/sendout-front-sandshrew.json" with { type: "json" };
import sandshrewRunA from "../../tools/compare/fixtures/sendout-front-sandshrew-run-a.json" with { type: "json" };
import sandshrewRunB from "../../tools/compare/fixtures/sendout-front-sandshrew-run-b.json" with { type: "json" };
import latiasScenario from "../../tools/compare/fixtures/sendout-front-latias.json" with { type: "json" };
import latiasRunA from "../../tools/compare/fixtures/sendout-front-latias-run-a.json" with { type: "json" };
import latiasRunB from "../../tools/compare/fixtures/sendout-front-latias-run-b.json" with { type: "json" };

const RECEIPTS = [
  ["SANDSHREW", 27, 4, sandshrewScenario, sandshrewRunA, sandshrewRunB, 372,
    "955a186fdeb2b253a3617590207723a4111c81a11628bab71adc5ffcdd177d9a"],
  ["LATIAS", 380, 6, latiasScenario, latiasRunA, latiasRunB, 373,
    "bf88104dee8bb42023b67c237d509ab80a2aa64ecbc4761d95395fcd35eb2a38"],
] as const;

describe("ANIM_SWING_CONCAVE_FAST_SHORT source and Scene-ON evidence", () => {
  it("pins selector 45, task initialization, affine/OAM widths, and source order", () => {
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url),
      "utf8",
    );
    const animationSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const spriteHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/sprite.h", import.meta.url),
      "utf8",
    );
    const gbaTypesHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/gba/types.h", import.meta.url),
      "utf8",
    );

    expect(constants).toMatch(/^#define ANIM_SWING_CONCAVE_FAST_SHORT\s+45$/m);
    expect(spriteHeader).toMatch(/\/\*0x24\*\/ s16 x2, y2;/);
    expect(spriteHeader).toMatch(/\/\*0x2E\*\/ s16 data\[8\];/);
    expect(gbaTypesHeader).toMatch(/#define ST_OAM_AFFINE_DOUBLE 3/);
    expect(gbaTypesHeader).toMatch(/#define ST_OAM_AFFINE_NORMAL 1/);

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = animationSource.slice(taskStart, taskEnd);
    expect(taskStart).toBeGreaterThanOrEqual(0);
    expect(taskEnd).toBeGreaterThan(taskStart);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?sprite->callback = sMonAnimFunctions/,
    );

    const sharedStart = animationSource.indexOf("static void SwingConcave(struct Sprite *sprite)\n{");
    const fastStart = animationSource.indexOf(
      "static void Anim_SwingConcave_FastShort(struct Sprite *sprite)\n{", sharedStart,
    );
    const fastEnd = animationSource.indexOf("static void SwingConvex", fastStart);
    const shared = animationSource.slice(sharedStart, fastStart);
    const fast = animationSource.slice(fastStart, fastEnd);
    expect(sharedStart).toBeGreaterThanOrEqual(0);
    expect(fastStart).toBeGreaterThan(sharedStart);
    expect(fastEnd).toBeGreaterThan(fastStart);

    const sharedPositions = [
      shared.indexOf("if (sprite->data[2] == 0)"),
      shared.indexOf("HandleStartAffineAnim(sprite);"),
      shared.indexOf("TryFlipX(sprite);"),
      shared.indexOf("if (sprite->data[2] > sAnims[sprite->data[0]].data)"),
      shared.indexOf("HandleSetAffineData(sprite, 256, 256, 0);"),
      shared.indexOf("sprite->x2 = 0;"),
      shared.indexOf("ResetSpriteAfterAnim(sprite);"),
      shared.indexOf("sprite->callback = WaitAnimEnd;"),
      shared.indexOf("s16 index = (sprite->data[2] * 256) / sAnims[sprite->data[0]].data;"),
      shared.indexOf("sprite->x2 = -(Sin(index, 10));"),
      shared.indexOf("HandleSetAffineData(sprite, 256, 256, Sin(index, 3276));"),
      shared.indexOf("sprite->data[2]++;"),
      shared.lastIndexOf("TryFlipX(sprite);"),
    ];
    expect(sharedPositions.every((position) => position >= 0)).toBe(true);
    expect(sharedPositions).toEqual([...sharedPositions].sort((a, b) => a - b));
    expect([...shared.matchAll(/TryFlipX\(sprite\);/g)]).toHaveLength(2);

    const initializerPositions = [
      fast.indexOf("u8 id = sprite->data[0] = AddNewAnim();"),
      fast.indexOf("sAnims[id].data = 50;"),
      fast.indexOf("SwingConcave(sprite);"),
      fast.indexOf("sprite->callback = SwingConcave;"),
    ];
    expect(initializerPositions.every((position) => position >= 0)).toBe(true);
    expect(initializerPositions).toEqual([...initializerPositions].sort((a, b) => a - b));
    expect(animationSource).toMatch(
      /\[ANIM_SWING_CONCAVE_FAST_SHORT\]\s*=\s*Anim_SwingConcave_FastShort,/,
    );
  });

  it("pins the complete generated census and every source selector row", () => {
    const mapped = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_SWING_CONCAVE_FAST_SHORT")
      .map(([species]) => species);
    const generatedSelectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    const selectorSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon.c", import.meta.url),
      "utf8",
    );
    expect(mapped).toEqual(["SANDSHREW", "KYOGRE", "LATIAS"]);
    expect(mapped.filter((species) => factorySpecies.has(species))).toEqual([
      "SANDSHREW", "LATIAS",
    ]);
    expect(mapped.filter((species) => !factorySpecies.has(species))).toEqual(["KYOGRE"]);
    for (const species of mapped) {
      expect(selectorSource).toMatch(new RegExp(
        `^\\s*\\[SPECIES_${species} - 1\\]\\s*= ANIM_SWING_CONCAVE_FAST_SHORT,$`, "m",
      ));
      expect(generatedSelectors[species]).toBe(
        "ANIM_SWING_CONCAVE_FAST_SHORT",
      );
    }
  });

  it.each(RECEIPTS)("pins a complete legal challenge-0 Scene-ON %s party", (
    _species, speciesId, _animCmdIndex, scenario,
  ) => {
    expect(scenario).toMatchObject({
      mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 0, battleNum: 0, trainerId: 50,
    });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties.opponent[0]!.species).toBe(speciesId);
    for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
      expect(setId).toBeGreaterThanOrEqual(110);
      expect(setId).toBeLessThanOrEqual(199);
    }
    for (const party of Object.values(scenario.overrides.parties) as any[][]) {
      for (const mon of party) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number), abilitySlot: expect.any(Number),
          friendship: expect.any(Number), gender: expect.any(String), shiny: false,
        }));
      }
    }
  });

  it.each(RECEIPTS)("matches byte-identical independent settled %s Scene-ON receipts", (
    species, speciesId, animCmdIndex, _scenario, runA, runB, bytes, sha256,
  ) => {
    const stem = species.toLowerCase();
    const rawA = readFileSync(new URL(
      `../../tools/compare/fixtures/sendout-front-${stem}-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `../../tools/compare/fixtures/sendout-front-${stem}-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(bytes);
    expect(rawA.at(-1)).toBe("}".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(sha256);
    expect(runA).toEqual(runB);
    expect(runA.ticks).toHaveLength(1);
    expect(runA.ticks[0]!.battler1).toMatchObject({
      x2: 0,
      y2: 0,
      animNum: 1,
      animCmdIndex,
      data2: speciesId,
      callback: "0x8007428",
      callbackSymbol: "SpriteCallbackDummy",
    });
  });
});
