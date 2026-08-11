import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import raticateScenario from "../../tools/compare/fixtures/sendout-front-raticate.json" with { type: "json" };
import raticateRunA from "../../tools/compare/fixtures/sendout-front-raticate-run-a.json" with { type: "json" };
import raticateRunB from "../../tools/compare/fixtures/sendout-front-raticate-run-b.json" with { type: "json" };
import fearowScenario from "../../tools/compare/fixtures/sendout-front-fearow.json" with { type: "json" };
import fearowRunA from "../../tools/compare/fixtures/sendout-front-fearow-run-a.json" with { type: "json" };
import fearowRunB from "../../tools/compare/fixtures/sendout-front-fearow-run-b.json" with { type: "json" };
import yanmaScenario from "../../tools/compare/fixtures/sendout-front-yanma.json" with { type: "json" };
import yanmaRunA from "../../tools/compare/fixtures/sendout-front-yanma-run-a.json" with { type: "json" };
import yanmaRunB from "../../tools/compare/fixtures/sendout-front-yanma-run-b.json" with { type: "json" };

const receipts = [
  ["RATICATE", raticateScenario, raticateRunA, raticateRunB, 20, 11, 373,
    "8813e872595ede6ee0047bfee2e403d8db9384763230caf2c7a18b52634d9808"],
  ["FEAROW", fearowScenario, fearowRunA, fearowRunB, 22, 7, 372,
    "47b454268a9660ac8756382a8464d2f3e57f2cc618f985a8cbfefe7a505484f1"],
  ["YANMA", yanmaScenario, yanmaRunA, yanmaRunB, 193, 21, 374,
    "a745006922877d4441281a3403d70cf20fdc3609fbae9f686be9e2201a1b60c4"],
] as const;

describe("ANIM_FIGURE_8 Scene-ON evidence", () => {
  it("pins source ID 43 and initializer-only callback installation", () => {
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
    expect(constants).toMatch(/^#define ANIM_FIGURE_8\s+43$/m);

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = animationSource.slice(taskStart, taskEnd);
    expect(taskStart).toBeGreaterThanOrEqual(0);
    expect(taskEnd).toBeGreaterThan(taskStart);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;/,
    );

    const initializerStart = animationSource.indexOf("static void Anim_Figure8(struct Sprite *sprite)\n{");
    const callbackStart = animationSource.indexOf("static void Figure8(struct Sprite *sprite)\n{", initializerStart);
    const callbackEnd = animationSource.indexOf("static void Anim_FlashYellow", callbackStart);
    const initializer = animationSource.slice(initializerStart, callbackStart);
    const callback = animationSource.slice(callbackStart, callbackEnd);
    expect(initializerStart).toBeGreaterThanOrEqual(0);
    expect(callbackStart).toBeGreaterThan(initializerStart);
    expect(callbackEnd).toBeGreaterThan(callbackStart);
    expect(initializer).toMatch(
      /HandleStartAffineAnim\(sprite\);[\s\S]*?sprite->data\[6\] = 0;[\s\S]*?sprite->data\[7\] = 0;[\s\S]*?sprite->callback = Figure8;/,
    );
    expect(initializer).not.toContain("Figure8(sprite);");

    const firstFlip = callback.indexOf("TryFlipX(sprite);");
    const increment = callback.indexOf("sprite->data[6] += 4;");
    const xSine = callback.indexOf("sprite->x2 = -(Sin(sprite->data[6], 16));");
    const ySine = callback.indexOf("sprite->y2 = -(Sin((sprite->data[6] * 2) & 0xFF, 8));");
    const restorePhase = callback.indexOf("sprite->data[6] > 192");
    const negativePhase = callback.indexOf("sprite->data[6] > 64");
    const terminal = callback.indexOf("sprite->data[6] > 255");
    const clearX = callback.indexOf("sprite->x2 = 0;", terminal);
    const clearY = callback.indexOf("sprite->y2 = 0;", terminal);
    const identity = callback.indexOf("HandleSetAffineData(sprite, 256, 256, 0);", terminal);
    const reset = callback.indexOf("ResetSpriteAfterAnim(sprite);", terminal);
    const wait = callback.indexOf("sprite->callback = WaitAnimEnd;", terminal);
    const secondFlip = callback.lastIndexOf("TryFlipX(sprite);");
    expect([
      firstFlip, increment, xSine, ySine, restorePhase, negativePhase,
      terminal, clearX, clearY, identity, reset, wait, secondFlip,
    ]).toEqual([...[
      firstFlip, increment, xSine, ySine, restorePhase, negativePhase,
      terminal, clearX, clearY, identity, reset, wait, secondFlip,
    ]].sort((a, b) => a - b));
    expect(firstFlip).toBeGreaterThanOrEqual(0);

    for (const [species] of receipts) {
      expect(selectorSource).toMatch(new RegExp(
        `^\\s*\\[SPECIES_${species} - 1\\]\\s*= ANIM_FIGURE_8,$`, "m",
      ));
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_FIGURE_8");
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
