import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import omanyteScenario from "../../tools/compare/fixtures/sendout-front-omanyte.json" with { type: "json" };
import omanyteRunA from "../../tools/compare/fixtures/sendout-front-omanyte-run-a.json" with { type: "json" };
import omanyteRunB from "../../tools/compare/fixtures/sendout-front-omanyte-run-b.json" with { type: "json" };
import lanturnScenario from "../../tools/compare/fixtures/sendout-front-lanturn.json" with { type: "json" };
import lanturnRunA from "../../tools/compare/fixtures/sendout-front-lanturn-run-a.json" with { type: "json" };
import lanturnRunB from "../../tools/compare/fixtures/sendout-front-lanturn-run-b.json" with { type: "json" };
import jumpluffScenario from "../../tools/compare/fixtures/sendout-front-jumpluff.json" with { type: "json" };
import jumpluffRunA from "../../tools/compare/fixtures/sendout-front-jumpluff-run-a.json" with { type: "json" };
import jumpluffRunB from "../../tools/compare/fixtures/sendout-front-jumpluff-run-b.json" with { type: "json" };
import claydolScenario from "../../tools/compare/fixtures/sendout-front-claydol.json" with { type: "json" };
import claydolRunA from "../../tools/compare/fixtures/sendout-front-claydol-run-a.json" with { type: "json" };
import claydolRunB from "../../tools/compare/fixtures/sendout-front-claydol-run-b.json" with { type: "json" };

const receipts = [
  ["OMANYTE", omanyteScenario, omanyteRunA, omanyteRunB, 138, 7, 373,
    "dc4bbb0eee279c7d3a30f2062d7d6589a9e060327821da7ee4359e866656dcbd"],
  ["LANTURN", lanturnScenario, lanturnRunA, lanturnRunB, 171, 4, 373,
    "3b1426d8bc2186aaa5a733adbb6435c08d5da2f7364b872557f4389291053e8c"],
  ["JUMPLUFF", jumpluffScenario, jumpluffRunA, jumpluffRunB, 189, 5, 373,
    "71ff480a0b9a62492f7e243ebfdda963d2f698e6bade85608b4d56e8c60b2ae5"],
  ["CLAYDOL", claydolScenario, claydolRunA, claydolRunB, 344, 10, 374,
    "d6b99b7e666e14b003e7d475f8506d299ae709136c76f87211eaba49b91b477d"],
] as const;

describe("ANIM_V_SLIDE_WOBBLE_SMALL Scene-ON evidence", () => {
  it.each(receipts)("pins a fresh complete legal challenge-0 %s party", (
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
    expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SLIDE_WOBBLE_SMALL");
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
