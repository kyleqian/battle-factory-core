import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import rapidashScenario from "../../tools/compare/fixtures/sendout-front-rapidash.json" with { type: "json" };
import rapidashRunA from "../../tools/compare/fixtures/sendout-front-rapidash-run-a.json" with { type: "json" };
import rapidashRunB from "../../tools/compare/fixtures/sendout-front-rapidash-run-b.json" with { type: "json" };
import absolScenario from "../../tools/compare/fixtures/sendout-front-absol.json" with { type: "json" };
import absolRunA from "../../tools/compare/fixtures/sendout-front-absol-run-a.json" with { type: "json" };
import absolRunB from "../../tools/compare/fixtures/sendout-front-absol-run-b.json" with { type: "json" };

const RECEIPTS = [
  ["RAPIDASH", 78, 2, rapidashScenario, rapidashRunA, rapidashRunB, 372,
    "85fdcb480a1a70a947a1332a6c22f3f23fbcd9c1e3ff7dbcf78bf90137e50431"],
  ["ABSOL", 359, 4, absolScenario, absolRunA, absolRunB, 373,
    "bb2389a403c0071b10a79610ce82ebcfcb4bea4467e261ac8c0abc4013825279"],
] as const;

describe("ANIM_CIRCULAR_VIBRATE Scene-ON evidence", () => {
  it("pins selector 17, task defaults, source order, and the complete Factory census", () => {
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
    expect(constants).toMatch(/^#define ANIM_CIRCULAR_VIBRATE\s+17$/m);

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = animationSource.slice(taskStart, taskEnd);
    expect(taskStart).toBeGreaterThanOrEqual(0);
    expect(taskEnd).toBeGreaterThan(taskStart);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;/,
    );

    const callbackStart = animationSource.indexOf(
      "static void Anim_CircularVibrate(struct Sprite *sprite)\n{",
    );
    const callbackEnd = animationSource.indexOf("static void Twist(struct Sprite *sprite)\n{", callbackStart);
    const callback = animationSource.slice(callbackStart, callbackEnd);
    expect(callbackStart).toBeGreaterThanOrEqual(0);
    expect(callbackEnd).toBeGreaterThan(callbackStart);
    const terminalGuard = callback.indexOf("if (sprite->data[2] > 512)");
    const wait = callback.indexOf("sprite->callback = WaitAnimEnd;", terminalGuard);
    const clearX = callback.indexOf("sprite->x2 = 0;", terminalGuard);
    const clearY = callback.indexOf("sprite->y2 = 0;", terminalGuard);
    const parity = callback.indexOf("if (!(sprite->data[2] & 1))");
    const positive = callback.indexOf("sign = 1;", parity);
    const negative = callback.indexOf("sign = -1;", positive);
    const amplitude = callback.indexOf("amplitude = Sin(sprite->data[2] / 4, 8);");
    const index = callback.indexOf("index = sprite->data[2] % 256;", amplitude);
    const yWrite = callback.indexOf("sprite->y2 = Sin(index, amplitude) * sign;", index);
    const xWrite = callback.indexOf("sprite->x2 = Cos(index, amplitude) * sign;", yWrite);
    const increment = callback.indexOf("sprite->data[2] += 9;", xWrite);
    const positions = [
      terminalGuard, wait, clearX, clearY, parity, positive, negative,
      amplitude, index, yWrite, xWrite, increment,
    ];
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(terminalGuard).toBeGreaterThanOrEqual(0);

    const mapped = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_CIRCULAR_VIBRATE")
      .map(([species]) => species);
    expect(mapped).toEqual(["RAPIDASH", "ABSOL"]);
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    expect(mapped.filter((species) => factory.has(species))).toEqual(mapped);
    for (const species of mapped) {
      expect(selectorSource).toMatch(new RegExp(
        `^\\s*\\[SPECIES_${species} - 1\\]\\s*= ANIM_CIRCULAR_VIBRATE,$`, "m",
      ));
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
    for (const party of Object.values(scenario.overrides.parties)) {
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
    expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
  });
});
