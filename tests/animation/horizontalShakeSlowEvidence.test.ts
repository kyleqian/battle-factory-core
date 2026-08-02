import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import dugtrioScenario from "../../tools/compare/fixtures/sendout-front-dugtrio.json" with { type: "json" };
import dugtrioA from "../../tools/compare/fixtures/sendout-front-dugtrio-run-a.json" with { type: "json" };
import dugtrioB from "../../tools/compare/fixtures/sendout-front-dugtrio-run-b.json" with { type: "json" };
import golduckScenario from "../../tools/compare/fixtures/sendout-front-golduck.json" with { type: "json" };
import golduckA from "../../tools/compare/fixtures/sendout-front-golduck-run-a.json" with { type: "json" };
import golduckB from "../../tools/compare/fixtures/sendout-front-golduck-run-b.json" with { type: "json" };
import doduoScenario from "../../tools/compare/fixtures/sendout-front-doduo.json" with { type: "json" };
import doduoA from "../../tools/compare/fixtures/sendout-front-doduo-run-a.json" with { type: "json" };
import doduoB from "../../tools/compare/fixtures/sendout-front-doduo-run-b.json" with { type: "json" };

const receipts = [
  ["DUGTRIO", dugtrioScenario, dugtrioA, dugtrioB, "sendout-front-dugtrio", 51, 9,
    "1abe9c26e063a2b15db3f3f6f832f458649075a302c2da25fd714807edd9cc94"],
  ["GOLDUCK", golduckScenario, golduckA, golduckB, "sendout-front-golduck", 55, 4,
    "4b67a65f258a3006b448e348aa6713c0376b6453a95ff35ca708041bd6ba2b14"],
  ["DODUO", doduoScenario, doduoA, doduoB, "sendout-front-doduo", 84, 4,
    "2ef5f1430ae2ffc7666a33ea21b3b9239531b3ba603d386039b29c65f6037abb"],
] as const;

describe("ANIM_H_SHAKE_SLOW Scene-ON evidence", () => {
  it.each(receipts)("pins complete legal staging for %s", (
    _species, scenario, _runA, _runB, _stem, speciesId,
  ) => {
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.mode).toBe("mechanicLab");
    expect(scenario.challengeNum).toBe(0);
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
  });

  it.each(receipts)("pins paired raw and normalized %s receipts", (
    species, _scenario, runA, runB, stem, speciesId, animCmdIndex, sha256,
  ) => {
    const rawA = readFileSync(new URL(
      `../../tools/compare/fixtures/${stem}-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `../../tools/compare/fixtures/${stem}-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(372);
    expect(rawA.at(-1)).toBe("}".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(sha256);
    expect(runA).toEqual(runB);
    expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_SHAKE_SLOW");
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
