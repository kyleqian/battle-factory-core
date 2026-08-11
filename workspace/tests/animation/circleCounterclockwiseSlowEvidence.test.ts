import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import drowzeeScenario from "../../tools/compare/fixtures/sendout-front-drowzee.json" with { type: "json" };
import drowzeeRunA from "../../tools/compare/fixtures/sendout-front-drowzee-run-a.json" with { type: "json" };
import drowzeeRunB from "../../tools/compare/fixtures/sendout-front-drowzee-run-b.json" with { type: "json" };
import spinarakScenario from "../../tools/compare/fixtures/sendout-front-spinarak.json" with { type: "json" };
import spinarakRunA from "../../tools/compare/fixtures/sendout-front-spinarak-run-a.json" with { type: "json" };
import spinarakRunB from "../../tools/compare/fixtures/sendout-front-spinarak-run-b.json" with { type: "json" };

const receipts = [
  ["DROWZEE", drowzeeScenario, drowzeeRunA, drowzeeRunB, 96, 5, 372,
    "1735dde24d224d3d98eafe6c4f28cfc8b1c28ac67863d168ed79cd730e2e4138"],
  ["SPINARAK", spinarakScenario, spinarakRunA, spinarakRunB, 167, 7, 373,
    "67fae9ba7ccda325f46df3a8a87e4574cd98a3e1dd9cf32ab4e2412d27e6579d"],
] as const;

describe("ANIM_CIRCLE_C_CLOCKWISE_SLOW Scene-ON evidence", () => {
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
    expect(selectorTables.frontAnimIds.species[species]).toBe(
      "ANIM_CIRCLE_C_CLOCKWISE_SLOW",
    );
  });

  it.each(receipts)("matches paired byte-identical settled %s receipts", (
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
