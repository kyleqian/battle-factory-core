import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import staryuScenario from "../../tools/compare/fixtures/sendout-front-staryu.json" with { type: "json" };
import staryuRunA from "../../tools/compare/fixtures/sendout-front-staryu-run-a.json" with { type: "json" };
import staryuRunB from "../../tools/compare/fixtures/sendout-front-staryu-run-b.json" with { type: "json" };

describe("ANIM_TWIST_TWICE Scene-ON evidence", () => {
  it("pins a complete legal challenge-0 STARYU party", () => {
    expect(staryuScenario).toMatchObject({
      mode: "mechanicLab",
      profile: "battle-scene-on",
      level: 50,
      challengeNum: 0,
      battleNum: 0,
      trainerId: 50,
      opponentSetIds: [128, 149, 180],
    });
    expect(staryuScenario.overrides.parties.player).toHaveLength(3);
    expect(staryuScenario.overrides.parties.opponent).toHaveLength(3);
    expect(staryuScenario.overrides.parties.opponent[0]).toMatchObject({
      species: 120,
      nature: 24,
      moves: [61, 107, 129, 113],
      gender: "genderless",
    });
    for (const setId of [...staryuScenario.playerSetIds, ...staryuScenario.opponentSetIds]) {
      expect(setId).toBeGreaterThanOrEqual(110);
      expect(setId).toBeLessThanOrEqual(199);
    }
    for (const mon of [
      ...staryuScenario.overrides.parties.player,
      ...staryuScenario.overrides.parties.opponent,
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

  it("pins paired byte-identical raw settled STARYU receipts", () => {
    const rawA = readFileSync(new URL(
      "../../tools/compare/fixtures/sendout-front-staryu-run-a.json", import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      "../../tools/compare/fixtures/sendout-front-staryu-run-b.json", import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(373);
    expect(rawA.at(-1)).toBe("}".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(
      "67e14ee16e9eb44e699ee888cf405fd69e1901b2c689adf3f6932347cee5be5c",
    );
    expect(staryuRunA).toEqual(staryuRunB);
    expect(selectorTables.frontAnimIds.species.STARYU).toBe("ANIM_TWIST_TWICE");
    expect(staryuRunA.ticks).toHaveLength(1);
    expect(staryuRunA.ticks[0]!.battler1).toMatchObject({
      x2: 0,
      y2: 0,
      animNum: 1,
      animCmdIndex: 4,
      data2: 120,
      callback: "0x8007428",
      callbackSymbol: "SpriteCallbackDummy",
    });
    expect(speciesFrontIdleRestOffset("STARYU")).toEqual({ x2: 0, y2: 0 });
  });
});
