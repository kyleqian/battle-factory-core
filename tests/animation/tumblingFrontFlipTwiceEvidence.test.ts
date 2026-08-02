import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import scenario from "../../tools/compare/fixtures/sendout-front-magnemite.json" with { type: "json" };
import runA from "../../tools/compare/fixtures/sendout-front-magnemite-run-a.json" with { type: "json" };
import runB from "../../tools/compare/fixtures/sendout-front-magnemite-run-b.json" with { type: "json" };

const RECEIPT_BYTES = 372;
const RECEIPT_SHA256 = "9f0354fb3d8f1ad72f6bd4a49ddc3b074c5f4151459833ad68b55e98647033cf";

describe("ANIM_TUMBLING_FRONT_FLIP_TWICE Scene-ON evidence", () => {
  it("pins selector 84, the source entry point, and MAGNEMITE's Factory set", () => {
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
    expect(constants).toMatch(/^#define ANIM_TUMBLING_FRONT_FLIP_TWICE\s+84$/m);
    expect(selectorSource).toMatch(
      /^\s*\[SPECIES_MAGNEMITE - 1\]\s*= ANIM_TUMBLING_FRONT_FLIP_TWICE,$/m,
    );
    expect(animationSource).toMatch(
      /static void Anim_TumblingFrontFlip_Twice\(struct Sprite \*sprite\)\s*\{[\s\S]*?sAnims\[id\]\.speed = 1;[\s\S]*?sAnims\[id\]\.runs = 2;[\s\S]*?TumblingFrontFlip\(sprite\);[\s\S]*?sprite->callback = TumblingFrontFlip;[\s\S]*?\}/,
    );
    expect(selectorTables.frontAnimIds.species.MAGNEMITE).toBe(
      "ANIM_TUMBLING_FRONT_FLIP_TWICE",
    );
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_MAGNEMITE"))
      .toEqual({
        index: 108,
        label: "FRONTIER_MON_MAGNEMITE",
        species: "SPECIES_MAGNEMITE",
        moves: [
          "MOVE_SHOCK_WAVE",
          "MOVE_SUPERSONIC",
          "MOVE_METAL_SOUND",
          "MOVE_REFLECT",
        ],
        itemTableId: 26,
        itemName: "BATTLE_FRONTIER_ITEM_RAWST_BERRY",
        evSpread: 24,
        evSpreadStats: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_SPEED"],
        nature: "NATURE_GENTLE",
      });
  });

  it("pins a complete legal challenge-0 Scene-ON MAGNEMITE party", () => {
    expect(scenario).toMatchObject({
      mode: "mechanicLab",
      profile: "battle-scene-on",
      level: 50,
      challengeNum: 0,
      battleNum: 0,
      trainerId: 50,
      playerSetIds: [135, 188, 184],
      opponentSetIds: [114, 149, 180],
    });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({
      species: 81,
      level: 50,
      nature: 21,
      moves: [351, 48, 319, 115],
      item: 136,
      abilitySlot: 0,
      friendship: 70,
      gender: "genderless",
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
      "../../tools/compare/fixtures/sendout-front-magnemite-run-a.json",
      import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      "../../tools/compare/fixtures/sendout-front-magnemite-run-b.json",
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
      animCmdIndex: 4,
      data2: 81,
      callback: "0x8007428",
      callbackSymbol: "SpriteCallbackDummy",
    });
    expect(speciesFrontIdleRestOffset("MAGNEMITE")).toEqual({ x2: 0, y2: 0 });
  });
});
