import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import unownScenario from "../../tools/compare/fixtures/sendout-front-unown.json" with { type: "json" };
import unownRunA from "../../tools/compare/fixtures/sendout-front-unown-run-a.json" with { type: "json" };
import unownRunB from "../../tools/compare/fixtures/sendout-front-unown-run-b.json" with { type: "json" };
import glalieScenario from "../../tools/compare/fixtures/sendout-front-glalie.json" with { type: "json" };
import glalieRunA from "../../tools/compare/fixtures/sendout-front-glalie-run-a.json" with { type: "json" };
import glalieRunB from "../../tools/compare/fixtures/sendout-front-glalie-run-b.json" with { type: "json" };
import duskullScenario from "../../tools/compare/fixtures/sendout-front-duskull.json" with { type: "json" };
import duskullRunA from "../../tools/compare/fixtures/sendout-front-duskull-run-a.json" with { type: "json" };
import duskullRunB from "../../tools/compare/fixtures/sendout-front-duskull-run-b.json" with { type: "json" };

const receipts = [
  ["UNOWN", unownScenario, unownRunA, unownRunB, 201, 0, 0, 373,
    "4bba4625ae521e0e58665b2963e5152e0d27726fa26aa506ae760c5b1e126c95"],
  ["GLALIE", glalieScenario, glalieRunA, glalieRunB, 362, 1, 4, 373,
    "b13802454ef9b92cf94aa210d4027f2ce67a12ae96dc7ca252c044782561f3f3"],
  ["DUSKULL", duskullScenario, duskullRunA, duskullRunB, 355, 1, 6, 373,
    "1baa7e01f12a7a3ee1b831845281a714a34667adfedebb3ac2dada343628b20a"],
] as const;

describe("ANIM_ZIGZAG_FAST Scene-ON evidence", () => {
  it("pins source ID 10, task defaults, fast initializer order, and shared Zigzag order", () => {
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
    expect(constants).toMatch(/^#define ANIM_ZIGZAG_FAST\s+10$/m);

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = animationSource.slice(taskStart, taskEnd);
    expect(taskStart).toBeGreaterThanOrEqual(0);
    expect(taskEnd).toBeGreaterThan(taskStart);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;/,
    );

    const sharedStart = animationSource.indexOf("static void Zigzag(struct Sprite *sprite)\n{");
    const initializerStart = animationSource.indexOf(
      "static void Anim_ZigzagFast(struct Sprite *sprite)\n{", sharedStart,
    );
    const initializerEnd = animationSource.indexOf("static void HorizontalShake", initializerStart);
    const shared = animationSource.slice(sharedStart, initializerStart);
    const initializer = animationSource.slice(initializerStart, initializerEnd);
    expect(sharedStart).toBeGreaterThanOrEqual(0);
    expect(initializerStart).toBeGreaterThan(sharedStart);
    expect(initializerEnd).toBeGreaterThan(initializerStart);
    expect(initializer).toMatch(/Zigzag\(sprite\);[\s\S]*?sprite->callback = Zigzag;/);

    const firstFlip = shared.indexOf("TryFlipX(sprite);");
    const resetLeg = shared.indexOf("if (sprite->data[2] == 0)");
    const firstBoundary = shared.indexOf("if (sZigzagData[sprite->data[3]][2] == sprite->data[2])");
    const advanceLeg = shared.indexOf("sprite->data[3]++;");
    const resetCounter = shared.indexOf("sprite->data[2] = 0;");
    const terminal = shared.lastIndexOf("if (sZigzagData[sprite->data[3]][2] == 0)");
    const wait = shared.indexOf("sprite->callback = WaitAnimEnd;", terminal);
    const xStep = shared.indexOf("sprite->x2 += sZigzagData[sprite->data[3]][0];");
    const yStep = shared.indexOf("sprite->y2 += sZigzagData[sprite->data[3]][1];");
    const increment = shared.indexOf("sprite->data[2]++;");
    const secondFlip = shared.lastIndexOf("TryFlipX(sprite);");
    expect([
      firstFlip, resetLeg, firstBoundary, advanceLeg, resetCounter, terminal,
      wait, xStep, yStep, increment, secondFlip,
    ]).toEqual([...[
      firstFlip, resetLeg, firstBoundary, advanceLeg, resetCounter, terminal,
      wait, xStep, yStep, increment, secondFlip,
    ]].sort((a, b) => a - b));
    expect(firstFlip).toBeGreaterThanOrEqual(0);
    expect([...shared.matchAll(/TryFlipX\(sprite\);/g)]).toHaveLength(2);

    for (const [species] of receipts) {
      expect(selectorSource).toMatch(new RegExp(
        `^\\s*\\[SPECIES_${species} - 1\\]\\s*= ANIM_ZIGZAG_FAST,$`, "m",
      ));
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_ZIGZAG_FAST");
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
    species, _scenario, runA, runB, speciesId, animNum, animCmdIndex, rawBytes, rawSha256,
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
      animNum,
      animCmdIndex,
      data2: speciesId,
      callback: "0x8007428",
      callbackSymbol: "SpriteCallbackDummy",
    });
    expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
  });
});
