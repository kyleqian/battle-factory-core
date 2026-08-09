import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import assets from "../../src/animation/assets/poisonSting.json";
import {
  poisonStingEffectAtAge,
  poisonStingNeedleMatrix,
} from "../../src/animation/poisonSting.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPoisonStingView,
} from "../../src/animation/sceneOnPresentation.ts";

const attacker = { x: 72, y: 99 };
const target = { x: 176, y: 42 };

describe("MOVE_POISON_STING source-relative presentation", () => {
  const effect = (age: number, side: "player" | "opponent" = "player") =>
    poisonStingEffectAtAge(age, side, attacker, target);

  it("ports tag, blend, needle, animation-2 impact, ShakeMon2, bubbles, sounds, and cleanup", () => {
    expect(effect(0).loadedTags).toEqual([]);
    expect(effect(7).loadedTags).toEqual(["NEEDLE", "IMPACT", "POISON_BUBBLE"]);
    expect(effect(13)).toMatchObject({
      alpha: { eva: 12, evb: 8 }, targetMonbg: true,
      sprites: [{ kind: "needle", x: 92, y: 99, oamSlot: 3 }],
    });
    expect(poisonStingNeedleMatrix("player")).toEqual({ a: 152, b: 205, c: -205, d: 152 });
    expect(poisonStingNeedleMatrix("opponent")).toEqual({ a: -92, b: -238, c: 238, d: -92 });
    expect(effect(35).sprites[0]).toMatchObject({
      kind: "impact", animation: 2, matrix: { a: 372, b: 0, c: 0, d: 372 },
    });
    expect([35, 36, 37, 38, 39, 40, 41, 42, 43].map((age) => effect(age).targetOffset.x2))
      .toEqual([-2, -2, 2, 2, -2, -2, 2, 2, 0]);
    expect([46, 54, 62, 70, 78, 86].map((age, index) =>
      effect(age).sprites.some((sprite) => sprite.kind === "poisonBubble" && sprite.spawnIndex === index)
    )).toEqual([true, true, true, true, true, true]);
    expect(effect(13).soundEvents).toContainEqual({ age: 13, song: "SE_M_RAZOR_WIND2", pan: -64 });
    expect(effect(35).soundEvents).toContainEqual({ age: 35, song: "SE_M_HORN_ATTACK", pan: 63 });
    expect(effect(112)).toMatchObject({ loadedTags: [], alpha: null, targetMonbg: false });
    expect(effect(112).sprites).toEqual([]);
  });

  it("crosses only the typed Scene-ON presentation seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "POISON_STING" as const,
      attacker: {
        species: "WEEDLE", geometry: {
          side: "player" as const, spriteCorner: { x: 40, y: 59 },
          animationCenter: attacker, battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX", geometry: {
          side: "opponent" as const, spriteCorner: { x: 144, y: 10 },
          animationCenter: target, battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: { playerHp: 105, playerMaxHp: 138, opponentHp: 128, opponentMaxHp: 128 },
    });
    expect(sceneOnPoisonStingView({ ...stage, age: 35 })).toMatchObject({
      attacker: { species: "WEEDLE" }, target: { species: "ONIX" },
      targetOffset: { x2: -2, y2: 0 }, sprites: [{ kind: "impact", animation: 2 }],
    });
    expect(Object.keys(stage.config.fieldProfile)).toEqual([
      "playerHp", "playerMaxHp", "opponentHp", "opponentMaxHp",
    ]);
  });

  it("pins the exact lowest set-3 Weedle carrier and isolated source body", () => {
    const constants = readFileSync("reference/pokeemerald/include/constants/battle_frontier_mons.h", "utf8");
    const mons = readFileSync("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h", "utf8");
    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    expect(constants).toContain("#define FRONTIER_MON_WEEDLE         3");
    const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_WEEDLE]"), mons.indexOf("[FRONTIER_MON_WURMPLE]"));
    expect(carrier).toContain("SPECIES_WEEDLE");
    expect(carrier).toContain("{MOVE_POISON_STING, MOVE_STRING_SHOT, MOVE_NONE, MOVE_NONE}");
    expect(carrier).toContain("BATTLE_FRONTIER_ITEM_FOCUS_BAND");
    expect(carrier).toContain("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP");
    expect(carrier).toContain("NATURE_QUIRKY");
    const body = scripts.slice(scripts.indexOf("Move_POISON_STING:"), scripts.indexOf("Move_TWINEEDLE:"));
    for (const command of [
      "ANIM_TAG_NEEDLE", "ANIM_TAG_IMPACT", "ANIM_TAG_POISON_BUBBLE",
      "create_linear_stinger_sprite", "animation=2", "AnimTask_ShakeMon2",
      "monbg ANIM_TARGET", "splitbgprio ANIM_TARGET", "setalpha 12, 8", "PoisonBubblesEffect",
      "SE_M_RAZOR_WIND2", "SE_M_HORN_ATTACK", "clearmonbg ANIM_TARGET", "blendoff",
    ]) expect(body).toContain(command);
    expect(assets.source.carrier).toContain("index 3 FRONTIER_MON_WEEDLE");
    expect(assets.source.carrier).toContain("lowest Level-50 Factory POISON_STING carrier");
    expect(assets.source.reused).toContain("identical tag/template source identity");
  });

  it("pins complete legal bilateral fixtures and immutable evidence receipts", () => {
    for (const path of [
      "tools/compare/fixtures/poison-sting-player-weedle-opponent-onix.json",
      "tools/compare/fixtures/poison-sting-opponent-weedle-player-onix.json",
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.acceptance.status).toBe("exact");
      expect(fixture.sourceWindow.frameCount).toBe(113);
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const weedle = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .find((mon: { species: number }) => mon.species === 13);
      expect(weedle).toMatchObject({ nature: 24, ivs: { hp: 3, attack: 3, defense: 3, speed: 3, spAttack: 3, spDefense: 3 }, evs: { hp: 255, attack: 255 }, item: 196, abilitySlot: 0, friendship: 70, gender: "male", shiny: false });
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.changeMapSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
