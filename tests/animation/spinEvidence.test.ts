import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import scenario from "../../tools/compare/fixtures/sendout-front-spheal.json" with { type: "json" };
import runA from "../../tools/compare/fixtures/sendout-front-spheal-run-a.json" with { type: "json" };
import runB from "../../tools/compare/fixtures/sendout-front-spheal-run-b.json" with { type: "json" };

const RECEIPT_BYTES = 373;
const RECEIPT_SHA256 = "47b66252cad485dec48946f8beffff1aef7760727a9794132a8f5b1488e4c8b5";

describe("ANIM_SPIN Scene-ON evidence", () => {
  it("pins selector 83, the source entry point, and SPHEAL's Factory set", () => {
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
    expect(constants).toMatch(/^#define ANIM_SPIN\s+83$/m);
    expect(selectorSource).toMatch(
      /^\s*\[SPECIES_SPHEAL - 1\]\s*= ANIM_SPIN,$/m,
    );
    expect(animationSource).toMatch(
      /static void Anim_Spin\(struct Sprite \*sprite\)\s*\{[\s\S]*?sAnims\[id\]\.delay = 60;[\s\S]*?sAnims\[id\]\.data = 30;[\s\S]*?Spin\(sprite\);[\s\S]*?sprite->callback = Spin;[\s\S]*?\}/,
    );
    expect(selectorTables.frontAnimIds.species.SPHEAL).toBe("ANIM_SPIN");
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_SPHEAL"))
      .toEqual({
        index: 59,
        label: "FRONTIER_MON_SPHEAL",
        species: "SPECIES_SPHEAL",
        moves: ["MOVE_ICE_BALL", "MOVE_WATER_PULSE", "MOVE_HAIL", "MOVE_MUD_SLAP"],
        itemTableId: 29,
        itemName: "BATTLE_FRONTIER_ITEM_NEVER_MELT_ICE",
        evSpread: 17,
        evSpreadStats: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"],
        nature: "NATURE_DOCILE",
      });
  });

  it("pins a complete legal challenge-0 Scene-ON SPHEAL party", () => {
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
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({
      species: 341,
      level: 50,
      nature: 6,
      moves: [301, 352, 258, 189],
      item: 212,
      abilitySlot: 0,
      friendship: 70,
      gender: "male",
      shiny: false,
    });
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

  it("pins byte-identical independent settled RAM receipts", () => {
    const rawA = readFileSync(new URL(
      "../../tools/compare/fixtures/sendout-front-spheal-run-a.json",
      import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      "../../tools/compare/fixtures/sendout-front-spheal-run-b.json",
      import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(RECEIPT_BYTES);
    expect(rawA.at(-1)).toBe("}".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(RECEIPT_SHA256);
    expect(runA).toEqual(runB);
    expect(runA.ticks).toHaveLength(1);
    expect(runA.ticks[0]!.battler1).toMatchObject({
      x2: 0,
      y2: 0,
      animNum: 1,
      animCmdIndex: 7,
      data2: 341,
      callback: "0x8007428",
      callbackSymbol: "SpriteCallbackDummy",
    });
    expect(speciesFrontIdleRestOffset("SPHEAL")).toEqual({ x2: 0, y2: 0 });
  });
});
