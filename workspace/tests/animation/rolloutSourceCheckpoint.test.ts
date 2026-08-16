import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../fixtures/rollout-animation-source-staging.json" with { type: "json" };

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

describe("MOVE_ROLLOUT authoritative-source staging checkpoint", () => {
  it("pins the full source body, pointers, command order, counter branches, resources, audio, and carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/rolloutSourceAudit.ts",
    ], { encoding: "utf8" }));

    expect(audit).toMatchObject({
      move: fixture.move,
      moveId: fixture.moveId,
      status: "unsupported-source-staging-checkpoint",
      source: fixture.source,
      sourceHashes: fixture.sourceHashes,
      scripts: fixture.scripts,
      counterBranches: fixture.counterBranches,
      components: fixture.components,
      lifecycle: {
        loads: ["ANIM_TAG_IMPACT", "ANIM_TAG_MUD_SAND", "ANIM_TAG_ROCKS"],
        monbg: "ANIM_DEF_PARTNER",
        splitbgprio: "ANIM_TARGET",
        alpha: [12, 8],
        teardown: ["clearmonbg ANIM_DEF_PARTNER", "blendoff"],
        rootAudio: expect.stringContaining("SE_M_MEGA_KICK2"),
        rolloutAudio: expect.stringContaining("SE_M_HEADBUTT"),
        audioConstants: { SE_M_MEGA_KICK2: 141, SE_M_HEADBUTT: 162, SE_M_DIG: 175 },
        templates: [
          "gRolloutMudSpriteTemplate: AffineOff ObjNormal 8x8 ANIM_TAG_MUD_SAND",
          "gRolloutRockSpriteTemplate: AffineOff ObjNormal 32x32 ANIM_TAG_ROCKS",
        ],
        particle: expect.stringContaining("fixed 18-tick horizontal arc"),
      },
      counterFallback: expect.stringContaining("retVal - 1"),
      powerOwnership: expect.stringContaining("never computes or mutates"),
      sideDependencies: {
        path: expect.stringContaining("partner-target Y exception"),
        panning: expect.stringContaining("reverse"),
        targetShake: expect.stringContaining("rather than damage"),
      },
      carrier: {
        lowestLegal: fixture.carrier.lowestLegal,
        challenge0Range: fixture.carrier.challenge0Range,
      },
      ownership: { gameplayState: false, rng: false, controller: false, renderer: false },
    });
    expect(audit.carrier.allLevel50).toEqual([
      { index: 115, label: "FRONTIER_MON_VOLTORB", species: "SPECIES_VOLTORB", moves: ["MOVE_SPARK", "MOVE_SCREECH", "MOVE_ROLLOUT", "MOVE_LIGHT_SCREEN"] },
      { index: 120, label: "FRONTIER_MON_PHANPY", species: "SPECIES_PHANPY", moves: ["MOVE_ROLLOUT", "MOVE_DEFENSE_CURL", "MOVE_ROCK_TOMB", "MOVE_SANDSTORM"] },
      { index: 170, label: "FRONTIER_MON_WAILMER_1", species: "SPECIES_WAILMER", moves: ["MOVE_WHIRLPOOL", "MOVE_ROAR", "MOVE_DEFENSE_CURL", "MOVE_ROLLOUT"] },
      { index: 200, label: "FRONTIER_MON_DUNSPARCE_1", species: "SPECIES_DUNSPARCE", moves: ["MOVE_HEADBUTT", "MOVE_GLARE", "MOVE_DEFENSE_CURL", "MOVE_ROLLOUT"] },
      { index: 432, label: "FRONTIER_MON_SHUCKLE_1", species: "SPECIES_SHUCKLE", moves: ["MOVE_ROLLOUT", "MOVE_DEFENSE_CURL", "MOVE_SLEEP_TALK", "MOVE_REST"] },
    ]);
  });

  it("proves the generated singleton component identity and keeps the exact controls independent", () => {
    const graph = JSON.parse(readFileSync("src/data/gen/battle-animation-components.json", "utf8"));
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const componentsFor = (move: string): string[] => graph.moves.find((entry: { move: string }) => entry.move === move)?.componentIds ?? [];
    const coverageFor = (move: string) => coverage.entries.find((entry: { move: string }) => entry.move === move);

    expect(componentsFor(fixture.move)).toEqual(fixture.components);
    expect(graph.components.find((component: { id: string }) => component.id === "task:AnimTask_Rollout"))
      .toEqual({ id: "task:AnimTask_Rollout", kind: "task", name: "AnimTask_Rollout", moveCount: 1, level50MoveCount: 1, moves: ["MOVE_ROLLOUT"] });
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === fixture.componentTrack.id))
      .toMatchObject(fixture.componentTrack);
    const rolloutTrack = coverage.componentTracks.find((track: { id: string }) => track.id === fixture.componentTrack.id);
    expect(rolloutTrack.goal).toMatch(/fulfilled/iu);
    expect(rolloutTrack.goal).toContain("1,586/1,586");
    expect(rolloutTrack).toMatchObject({ fulfilled: true });
    expect(coverageFor("MOVE_ROLLOUT")).toMatchObject({ status: "exact" });

    expect(coverageFor("MOVE_SAND_ATTACK")).toMatchObject({ status: "exact" });
    expect(componentsFor("MOVE_SAND_ATTACK")).toContain("asset:ANIM_TAG_MUD_SAND");
    expect(coverageFor("MOVE_ANCIENT_POWER")).toMatchObject({ status: "exact" });
    expect(componentsFor("MOVE_ANCIENT_POWER")).toEqual(expect.arrayContaining([
      "asset:ANIM_TAG_ROCKS", "asset:ANIM_TAG_IMPACT",
    ]));
    expect(coverageFor("MOVE_ICE_BALL")).toBeUndefined();
    expect(componentsFor("MOVE_ICE_BALL")).toEqual(expect.arrayContaining([
      "task:AnimTask_GetIceBallCounter", "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
    ]));
    expect(componentsFor("MOVE_ICE_BALL")).not.toContain("task:AnimTask_Rollout");
    // The source-staging checkpoint remains historical; exact credit lives
    // in the complete bilateral rollout-evidence fixture and coverage entry.
    expect(fixture.coverageCredit).toBe(false);
  });

  it.each([
    ["playerBack", true], ["opponentFront", false],
  ] as const)("keeps %s as a capture-free legal Scene-ON party stage", (orientation, playerAttacker) => {
    const stageFixture = fixture.stages[orientation];
    const stage = JSON.parse(readFileSync(stageFixture.scenario, "utf8")) as Record<string, any>;
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 0, battleNum: 2, trainerId: 50,
      playerSetIds: playerAttacker ? [113, 114, 115] : [110, 111, 112],
      opponentSetIds: playerAttacker ? [110, 111, 112] : [113, 114, 115],
      seed: playerAttacker ? 305420102 : 305420104,
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
    expect(attacker.every((mon) => mon.species === 100 && mon.level === 50
      && mon.nature === 6 && mon.item === 221 && mon.abilitySlot === 0 && mon.gender === "genderless"
      && JSON.stringify(mon.evs) === JSON.stringify({ hp: 252, attack: 0, defense: 0, speed: 0, spAttack: 252, spDefense: 0 })
      && JSON.stringify(mon.moves) === JSON.stringify([205, 205, 205, 205]))).toBe(true);
    expect(defender.every((mon) => mon.species === 95 && mon.level === 50
      && JSON.stringify(mon.evs) === JSON.stringify({ hp: 252, attack: 0, defense: 252, speed: 0, spAttack: 0, spDefense: 0 })
      && JSON.stringify(mon.moves) === JSON.stringify([33, 33, 33, 33]))).toBe(true);
    for (const mon of [...parties.player, ...parties.opponent]) {
      for (const transient of ["hp", "status", "statStages", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(sha256(stageFixture.scenario)).toBe(stageFixture.scenarioSha256);
    expect(stageFixture.endpoint).toMatchObject({ frame: 934, allPartyChecksumsValid: true });
    expect(stageFixture.endpoint.rolloutPp[stageFixture.endpoint.consumedRolloutPpSlot]).toBe(19);
    expect(stageFixture.endpoint.rolloutPp.reduce((total, pp) => total + pp, 0)).toBe(79);
    expect(stageFixture.endpoint.partyChecksums).toEqual({
      player: [true, true, true], opponent: [true, true, true],
    });
  });
});
