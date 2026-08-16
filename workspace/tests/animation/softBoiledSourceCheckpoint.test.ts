import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sourceFixture from "../fixtures/soft-boiled-animation-source-staging.json" with { type: "json" };

const fixture = sourceFixture as Record<string, any>;
const completeRecordKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function expectCompletePartyRecord(mon: Record<string, unknown>): void {
  expect(Object.keys(mon).sort()).toEqual([...completeRecordKeys].sort());
  expect(Object.keys(mon.ivs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(Object.keys(mon.evs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
}

describe("MOVE_SOFT_BOILED authoritative-source and legal bilateral Scene-ON staging checkpoint", () => {
  it("pins the complete root/called interval, all visual dependencies, carrier, component graph, and independent controls", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/softBoiledSourceAudit.ts",
    ], { encoding: "utf8" }));

    expect(audit).toMatchObject({
      move: fixture.move,
      moveId: fixture.moveId,
      status: "unsupported-source-staging-checkpoint",
      source: fixture.source,
      sourceHashes: fixture.sourceHashes,
      scripts: fixture.scripts,
      components: fixture.components,
      lifecycle: {
        loads: ["ANIM_TAG_BREAKING_EGG", "ANIM_TAG_THIN_RING", "ANIM_TAG_BLUE_STAR"],
        eggCreates: 2,
        eggArgs: [[0, 16, 0], [0, 16, 1]],
        eggDelayBeforeBreak: 127,
        rings: 2,
        ringArgs: [31, 16, 0, 1],
        ringSpacing: 8,
        cleanupSignal: "setarg 7, 0xFFFF before waitforvisualfinish",
        monbg: ["monbg ANIM_ATK_PARTNER", "clearmonbg ANIM_ATK_PARTNER"],
        healingStars: 4,
        audioConstants: { SE_M_HORN_ATTACK: 166, SE_M_TAIL_WHIP: 167, SE_M_ABSORB_2: 179 },
      },
      called: {
        visualCommands: [
          "loadspritegfx", "monbg", "playsewithpan", "createvisualtask", "createsprite", "delay",
          "simple_palette_blend", "setarg", "waitforvisualfinish", "clearmonbg", "call", "end",
        ],
        tasks: ["AnimTask_ShakeMon"],
        templates: [
          "gSoftBoiledEggSpriteTemplate", "gThinRingExpandingSpriteTemplate",
          "gHealingBlueStarSpriteTemplate", "gSimplePaletteBlendSpriteTemplate",
        ],
        callbacks: [
          "AnimSoftBoiledEgg", "AnimSoftBoiledEgg_Step1", "AnimSoftBoiledEgg_Step2",
          "AnimSoftBoiledEgg_Step3", "AnimSoftBoiledEgg_Step3_Callback1",
          "AnimSoftBoiledEgg_Step3_Callback2", "AnimSoftBoiledEgg_Step4",
          "AnimSoftBoiledEgg_Step4_Callback", "AnimSpriteOnMonPos", "AnimSimplePaletteBlend",
        ],
        assets: ["ANIM_TAG_BREAKING_EGG", "ANIM_TAG_THIN_RING", "ANIM_TAG_BLUE_STAR"],
      },
      carrier: {
        earliestLegal: {
          index: 332, label: "FRONTIER_MON_CHANSEY_2", species: "SPECIES_CHANSEY",
          moves: ["MOVE_SEISMIC_TOSS", "MOVE_SHADOW_BALL", "MOVE_DOUBLE_TEAM", "MOVE_SOFT_BOILED"],
          item: "BATTLE_FRONTIER_ITEM_LEFTOVERS",
          evSpread: ["F_EV_SPREAD_SP_DEFENSE", "F_EV_SPREAD_DEFENSE"], nature: "NATURE_RELAXED",
        },
        challenge2Range: { start: 267, end: 371 },
      },
      ownership: { gameplayState: false, damage: false, rng: false, ai: false, controller: false, renderer: false },
    });
    expect(audit.scripts.Move_SOFT_BOILED).toHaveLength(21);
    expect(audit.scripts.HealingEffect2).toHaveLength(10);
    expect(audit.carrier.allLevel50.map((carrier: { index: number }) => carrier.index))
      .toEqual([332, 462, 654, 677, 750]);
    expect(audit.controls.MOVE_RECOVER).toContain("does not prove Soft Boiled eggs");
    expect(audit.controls.MOVE_MILK_DRINK).toContain("does not prove Soft Boiled's breaking-egg");
  });

  it.each([
    ["playerBack", true], ["opponentFront", false],
  ] as const)("keeps %s capture-free, complete, bilateral, and limited to legal controller/AI staging", (orientation, playerAttacker) => {
    const stageFixture = fixture.stages[orientation];
    const stage = JSON.parse(readFileSync(stageFixture.scenario, "utf8")) as Record<string, any>;
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 2, battleNum: 2, trainerId: 110,
      playerSetIds: playerAttacker ? [330, 331, 332] : [267, 268, 269],
      opponentSetIds: playerAttacker ? [267, 268, 269] : [330, 331, 332],
    });
    expect(stage.trace).not.toHaveProperty("captureFrames");
    expect(stage).not.toHaveProperty("preCheckpointCaptureAllFrames");
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const transient of ["battlers", "hp", "outcome", "sideConditions", "stages", "status", "weather"]) {
      expect(stage.overrides).not.toHaveProperty(transient);
    }
    expect(stage.trace.segments).toEqual([
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
      { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
    ]);
    const parties = stage.overrides.parties as Record<string, Record<string, unknown>[]>;
    expect(parties.player).toHaveLength(3);
    expect(parties.opponent).toHaveLength(3);
    [...parties.player, ...parties.opponent].forEach(expectCompletePartyRecord);
    const attacker = playerAttacker ? parties.player : parties.opponent;
    const defender = playerAttacker ? parties.opponent : parties.player;
    expect(attacker.every((mon) => mon.species === 113 && mon.level === 50
      && mon.nature === 7 && mon.item === 200 && mon.abilitySlot === 0 && mon.gender === "female"
      && JSON.stringify(mon.evs) === JSON.stringify({ hp: 0, attack: 0, defense: 170, speed: 0, spAttack: 0, spDefense: 170 })
      && JSON.stringify(mon.moves) === JSON.stringify([135, 135, 135, 135]))).toBe(true);
    expect(defender.every((mon) => mon.species === 95 && mon.level === 50
      && mon.abilitySlot === 0 && JSON.stringify(mon.moves) === JSON.stringify([33, 33, 33, 33]))).toBe(true);
    for (const mon of [...parties.player, ...parties.opponent]) {
      for (const transient of ["hp", "status", "statStages", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(sha256(stageFixture.scenario)).toBe(stageFixture.scenarioSha256);
    expect(stageFixture.endpoint).toMatchObject({ frame: 934, attackerHp: 325, attackerMaxHp: 325, battleOutcome: 0, allPartyChecksumsValid: true });
    expect(stageFixture.endpoint.softBoiledPp[stageFixture.endpoint.consumedSoftBoiledPpSlot]).toBe(9);
    expect(stageFixture.endpoint.softBoiledPp.reduce((total: number, pp: number) => total + pp, 0)).toBe(39);
    expect(stageFixture.endpoint.defenderPp.reduce((total: number, pp: number) => total + pp, 0)).toBe(139);
    expect(stageFixture.endpoint.partyChecksums).toEqual({
      player: [true, true, true], opponent: [true, true, true],
    });
  });

  it("keeps Soft Boiled unsupported despite the exact Recover/Milk Drink controls", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
      entries: Array<{ move: string; status: string }>;
    };
    expect(coverage.entries.find((entry) => entry.move === "MOVE_SOFT_BOILED")).toBeUndefined();
    expect(coverage.entries.find((entry) => entry.move === "MOVE_RECOVER"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry) => entry.move === "MOVE_MILK_DRINK"))
      .toMatchObject({ status: "exact" });
    expect(fixture.coverageCredit).toBe(false);
    expect(fixture.boundedRemainder).toContain("No dense capture, reducer, typed presentation seam, compositor");
  });
});
