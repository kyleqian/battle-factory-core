import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import spearowScenario from "../../tools/compare/fixtures/sendout-front-spearow.json" with { type: "json" };
import spearowRunA from "../../tools/compare/fixtures/sendout-front-spearow-run-a.json" with { type: "json" };
import spearowRunB from "../../tools/compare/fixtures/sendout-front-spearow-run-b.json" with { type: "json" };
import skiploomScenario from "../../tools/compare/fixtures/sendout-front-skiploom.json" with { type: "json" };
import skiploomRunA from "../../tools/compare/fixtures/sendout-front-skiploom-run-a.json" with { type: "json" };
import skiploomRunB from "../../tools/compare/fixtures/sendout-front-skiploom-run-b.json" with { type: "json" };

const receipts = [
  ["SPEAROW", spearowScenario, spearowRunA, spearowRunB, 21, 15,
    "9e1ce2d84208d71287a87450e2df28961d717329dc7cc3d3495146674bbd61ec"],
  ["SKIPLOOM", skiploomScenario, skiploomRunA, skiploomRunB, 188, 7,
    "787a4f0eab9dca690d555347d938bee8fa4eb008c464e3727af53073db0be45b"],
] as const;

describe("ANIM_RISING_WOBBLE Scene-ON evidence", () => {
  it("pins source ID 24, callback-initializer order, widths, teardown, and mappings", () => {
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
    expect(constants).toMatch(/^#define ANIM_RISING_WOBBLE\s+24$/m);

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = animationSource.slice(taskStart, taskEnd);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;/,
    );

    const callbackStart = animationSource.indexOf("static void RisingWobble(struct Sprite *sprite)\n{");
    const initializerStart = animationSource.indexOf(
      "static void Anim_RisingWobble(struct Sprite *sprite)\n{",
    );
    const initializerEnd = animationSource.indexOf(
      "static void Anim_HorizontalSlideWobble", initializerStart,
    );
    const callback = animationSource.slice(callbackStart, initializerStart);
    const initializer = animationSource.slice(initializerStart, initializerEnd);
    expect(callbackStart).toBeGreaterThanOrEqual(0);
    expect(initializerStart).toBeGreaterThan(callbackStart);
    expect(initializerEnd).toBeGreaterThan(initializerStart);
    expect(initializer).toMatch(
      /sprite->data\[0\] = 5;[\s\S]*?RisingWobble\(sprite\);[\s\S]*?sprite->callback = RisingWobble;/,
    );

    const startAffine = callback.indexOf("if (sprite->data[2] == 0)");
    const terminal = callback.indexOf("if (sprite->data[2] > 100)");
    const identity = callback.indexOf("HandleSetAffineData(sprite, 256, 256, 0);", terminal);
    const clearY = callback.indexOf("sprite->y2 = 0;", terminal);
    const reset = callback.indexOf("ResetSpriteAfterAnim(sprite);", terminal);
    const wait = callback.indexOf("sprite->callback = WaitAnimEnd;", terminal);
    const index = callback.indexOf("index = (sprite->data[2] * 256) / 100;");
    const mask = callback.indexOf("var &= 0xFF;");
    const yWrite = callback.indexOf("sprite->y2 = -(Sin(index / 2, sprite->data[0] * 2));");
    const affineWrite = callback.indexOf("HandleSetAffineData(sprite, 256, 256, Sin(var, 3276));");
    const increment = callback.indexOf("sprite->data[2]++;");
    expect([
      startAffine, terminal, identity, clearY, reset, wait,
      index, mask, yWrite, affineWrite, increment,
    ]).toEqual([...[
      startAffine, terminal, identity, clearY, reset, wait,
      index, mask, yWrite, affineWrite, increment,
    ]].sort((a, b) => a - b));
    expect(callback).toMatch(/s16 index = 0;/);
    expect(callback).toMatch(/s32 var = 0;/);

    for (const [species] of receipts) {
      expect(selectorSource).toMatch(new RegExp(
        `^\\s*\\[SPECIES_${species} - 1\\]\\s*= ANIM_RISING_WOBBLE,$`, "m",
      ));
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_RISING_WOBBLE");
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

  it.each(receipts)("matches paired byte-identical settled %s Scene-ON receipts", (
    species, _scenario, runA, runB, speciesId, animCmdIndex, rawSha256,
  ) => {
    const stem = species.toLowerCase();
    const rawA = readFileSync(new URL(
      `../../tools/compare/fixtures/sendout-front-${stem}-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `../../tools/compare/fixtures/sendout-front-${stem}-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(373);
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
