import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import shellderScenario from "../../tools/compare/fixtures/sendout-front-shellder.json" with { type: "json" };
import shellderRunA from "../../tools/compare/fixtures/sendout-front-shellder-run-a.json" with { type: "json" };
import shellderRunB from "../../tools/compare/fixtures/sendout-front-shellder-run-b.json" with { type: "json" };
import horseaScenario from "../../tools/compare/fixtures/sendout-front-horsea.json" with { type: "json" };
import horseaRunA from "../../tools/compare/fixtures/sendout-front-horsea-run-a.json" with { type: "json" };
import horseaRunB from "../../tools/compare/fixtures/sendout-front-horsea-run-b.json" with { type: "json" };
import starmieScenario from "../../tools/compare/fixtures/sendout-front-starmie.json" with { type: "json" };
import starmieRunA from "../../tools/compare/fixtures/sendout-front-starmie-run-a.json" with { type: "json" };
import starmieRunB from "../../tools/compare/fixtures/sendout-front-starmie-run-b.json" with { type: "json" };
import clamperlScenario from "../../tools/compare/fixtures/sendout-front-clamperl.json" with { type: "json" };
import clamperlRunA from "../../tools/compare/fixtures/sendout-front-clamperl-run-a.json" with { type: "json" };
import clamperlRunB from "../../tools/compare/fixtures/sendout-front-clamperl-run-b.json" with { type: "json" };
import anorithScenario from "../../tools/compare/fixtures/sendout-front-anorith.json" with { type: "json" };
import anorithRunA from "../../tools/compare/fixtures/sendout-front-anorith-run-a.json" with { type: "json" };
import anorithRunB from "../../tools/compare/fixtures/sendout-front-anorith-run-b.json" with { type: "json" };

const receipts = [
  ["SHELLDER", shellderScenario, shellderRunA, shellderRunB, 90, 3, 372,
    "f9b846b9d9418dd0a678c4d1222f7c9df42464634fee8ac0bd39a3b0e6c02b6a"],
  ["HORSEA", horseaScenario, horseaRunA, horseaRunB, 116, 4, 373,
    "16d0d76e49bf990c01fa4957dc6ff92d99510fe56b3e2141478ce82d64c082d3"],
  ["STARMIE", starmieScenario, starmieRunA, starmieRunB, 121, 4, 373,
    "9151d0bd0b93524e3ecf9091c2e7aebae9e9860db06cfb0398606944df1e0712"],
  ["CLAMPERL", clamperlScenario, clamperlRunA, clamperlRunB, 366, 6, 373,
    "8df94958eab3a2d6d67008250c5511f1b2902f1b70b106aadfe397e2fcf05f61"],
  ["ANORITH", anorithScenario, anorithRunA, anorithRunB, 347, 4, 373,
    "81ddad2de88ce1327715b4b3a17141f60c0d3339a8f967977b1e8f63cbefa48f"],
] as const;

describe("ANIM_TWIST Scene-ON evidence", () => {
  it("pins source ID 18, its distinct one-run initializer, and every selector mapping", () => {
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url),
      "utf8",
    );
    const animationSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const selectorSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon.c", import.meta.url),
      "utf8",
    );
    expect(constants).toMatch(/^#define ANIM_TWIST\s+18$/m);

    const initializerStart = animationSource.indexOf("static void Anim_Twist(struct Sprite *sprite)\n{");
    const initializerEnd = animationSource.indexOf(
      "static void Spin(struct Sprite *sprite)\n{", initializerStart,
    );
    expect(initializerStart).toBeGreaterThanOrEqual(0);
    expect(initializerEnd).toBeGreaterThan(initializerStart);
    const initializer = animationSource.slice(initializerStart, initializerEnd);
    expect(initializer).toMatch(
      /u8 id = sprite->data\[0\] = AddNewAnim\(\);[\s\S]*?sAnims\[id\]\.rotation = 512;[\s\S]*?sAnims\[id\]\.delay = 0;[\s\S]*?Twist\(sprite\);[\s\S]*?sprite->callback = Twist;/,
    );
    expect(initializer).not.toMatch(/sAnims\[id\]\.runs\s*=/);

    for (const [species] of receipts) {
      expect(selectorSource).toMatch(new RegExp(
        `^\\s*\\[SPECIES_${species} - 1\\]\\s*= ANIM_TWIST,$`, "m",
      ));
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_TWIST");
    }
  });

  it.each(receipts)("pins a complete legal challenge-0 %s party", (
    species, scenario, _runA, _runB, speciesId,
  ) => {
    expect(scenario).toMatchObject({
      mode: "mechanicLab",
      profile: "battle-scene-on",
      level: 50,
      challengeNum: 0,
      battleNum: 0,
      trainerId: 50,
    });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties.opponent[0]!.species).toBe(speciesId);
    for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
      expect(setId).toBeGreaterThanOrEqual(110);
      expect(setId).toBeLessThanOrEqual(199);
    }
    for (const mon of [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ]) {
      expect(mon.level).toBe(50);
      expect(Object.keys(mon.ivs)).toHaveLength(6);
      expect(Object.keys(mon.evs)).toHaveLength(6);
      expect(mon.moves).toHaveLength(4);
      expect(mon.ppUps).toHaveLength(4);
      expect(mon).toEqual(expect.objectContaining({
        item: expect.any(Number),
        abilitySlot: expect.any(Number),
        friendship: expect.any(Number),
        gender: expect.any(String),
        shiny: expect.any(Boolean),
      }));
    }
    expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_TWIST");
  });

  it.each(receipts)("matches paired byte-identical settled %s Scene-ON receipts", (
    species, _scenario, runA, runB, speciesId, animCmdIndex, rawBytes, rawSha256,
  ) => {
    const stem = species.toLowerCase();
    const rawA = readFileSync(new URL(
      `../../tools/compare/fixtures/sendout-front-${stem}-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `../../tools/compare/fixtures/sendout-front-${stem}-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(rawBytes);
    expect(rawA.at(-1)).toBe("}".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
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
    expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
  });
});
