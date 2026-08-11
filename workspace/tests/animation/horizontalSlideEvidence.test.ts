import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import krabbyScenario from "../../tools/compare/fixtures/sendout-front-krabby.json" with { type: "json" };
import krabbyRunA from "../../tools/compare/fixtures/sendout-front-krabby-run-a.json" with { type: "json" };
import krabbyRunB from "../../tools/compare/fixtures/sendout-front-krabby-run-b.json" with { type: "json" };
import corsolaScenario from "../../tools/compare/fixtures/sendout-front-corsola.json" with { type: "json" };
import corsolaRunA from "../../tools/compare/fixtures/sendout-front-corsola-run-a.json" with { type: "json" };
import corsolaRunB from "../../tools/compare/fixtures/sendout-front-corsola-run-b.json" with { type: "json" };
import zigzagoonScenario from "../../tools/compare/fixtures/sendout-front-zigzagoon.json" with { type: "json" };
import zigzagoonRunA from "../../tools/compare/fixtures/sendout-front-zigzagoon-run-a.json" with { type: "json" };
import zigzagoonRunB from "../../tools/compare/fixtures/sendout-front-zigzagoon-run-b.json" with { type: "json" };
import whismurScenario from "../../tools/compare/fixtures/sendout-front-whismur.json" with { type: "json" };
import whismurRunA from "../../tools/compare/fixtures/sendout-front-whismur-run-a.json" with { type: "json" };
import whismurRunB from "../../tools/compare/fixtures/sendout-front-whismur-run-b.json" with { type: "json" };

const receipts = [
  ["KRABBY", krabbyScenario, krabbyRunA, krabbyRunB, 98, 5, 372,
    "cea94859fc353e431fc7393228cbc4b18f5532a6bcb95af10219cc5df5648b07"],
  ["CORSOLA", corsolaScenario, corsolaRunA, corsolaRunB, 222, 4, 373,
    "b76201a913b2036e0d7c3cc8e939431a6a0d40f03c03846f43996abb3aa52cd4"],
  ["ZIGZAGOON", zigzagoonScenario, zigzagoonRunA, zigzagoonRunB, 288, 4, 373,
    "e3261da2b51b339985c30c32f04252739a2d7ce475db406e2816fd330467b864"],
  ["WHISMUR", whismurScenario, whismurRunA, whismurRunB, 370, 9, 373,
    "094437764c82a40da10b929ba235895427a46cbd646c5a2e77591ca6c6783889"],
] as const;

describe("ANIM_H_SLIDE Scene-ON evidence", () => {
  it("pins source ID 3, the distinct normal initializer, and source-order callback lifecycle", () => {
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
    expect(constants).toMatch(/^#define ANIM_H_SLIDE\s+3$/m);

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf(
      "void LaunchAnimationTaskForFrontSprite", taskStart,
    );
    const task = animationSource.slice(taskStart, taskEnd);
    expect(taskStart).toBeGreaterThanOrEqual(0);
    expect(taskEnd).toBeGreaterThan(taskStart);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;/,
    );

    const sharedStart = animationSource.indexOf("static void HorizontalSlide(struct Sprite *sprite)\n{");
    const initializerStart = animationSource.indexOf(
      "static void Anim_HorizontalSlide(struct Sprite *sprite)\n{", sharedStart,
    );
    const initializerEnd = animationSource.indexOf(
      "static void VerticalSlide(struct Sprite *sprite)\n{", initializerStart,
    );
    const shared = animationSource.slice(sharedStart, initializerStart);
    const initializer = animationSource.slice(initializerStart, initializerEnd);
    expect(sharedStart).toBeGreaterThanOrEqual(0);
    expect(initializerStart).toBeGreaterThan(sharedStart);
    expect(initializerEnd).toBeGreaterThan(initializerStart);
    expect(initializer).toMatch(
      /sprite->data\[0\] = 40;[\s\S]*?HorizontalSlide\(sprite\);[\s\S]*?sprite->callback = HorizontalSlide;/,
    );

    const firstFlip = shared.indexOf("TryFlipX(sprite);");
    const terminal = shared.indexOf("if (sprite->data[2] > sprite->data[0])");
    const wait = shared.indexOf("sprite->callback = WaitAnimEnd;");
    const clear = shared.indexOf("sprite->x2 = 0;", wait);
    const sine = shared.indexOf("sprite->x2 = Sin((sprite->data[2] * 384 / sprite->data[0]) % 256, 6);");
    const increment = shared.indexOf("sprite->data[2]++;");
    const secondFlip = shared.lastIndexOf("TryFlipX(sprite);");
    expect(firstFlip).toBeGreaterThanOrEqual(0);
    expect(firstFlip).toBeLessThan(terminal);
    expect(terminal).toBeLessThan(wait);
    expect(wait).toBeLessThan(clear);
    expect(clear).toBeLessThan(sine);
    expect(sine).toBeLessThan(increment);
    expect(increment).toBeLessThan(secondFlip);

    for (const [species] of receipts) {
      expect(selectorSource).toMatch(new RegExp(
        `^\\s*\\[SPECIES_${species} - 1\\]\\s*= ANIM_H_SLIDE,$`, "m",
      ));
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_SLIDE");
    }
  });

  it.each(receipts)("pins a complete legal challenge-0 %s party", (
    _species, scenario, _runA, _runB, speciesId,
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
        shiny: false,
      }));
    }
  });

  it.each(receipts)("matches byte-identical independent settled %s Scene-ON receipts", (
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
