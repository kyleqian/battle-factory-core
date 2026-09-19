import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const json = (path: string): Json => JSON.parse(read(path)) as Json;
const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/skyAttackSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function expectIdentity(record: Json): void {
  expect(record.source).toMatchObject({ path: expect.any(String), start: expect.any(Number), endExclusive: expect.any(Number), byteLength: expect.any(Number), sha256: expect.stringMatching(/^[a-f0-9]{64}$/u) });
  expect(record.rom).toMatchObject({ start: expect.stringMatching(/^0x08[0-9a-f]{6}$/u), endExclusive: expect.stringMatching(/^0x08[0-9a-f]{6}$/u), byteLength: expect.any(Number), romSha256: expect.stringMatching(/^[a-f0-9]{64}$/u) });
}

describe("MOVE_SKY_ATTACK authoritative source, carrier, and legal bilateral staging", () => {
  it("pins both half-open source intervals, all 31 generated components, direct identities, and sole carrier", () => {
    const text = auditText();
    expect(auditText()).toBe(text);
    expect(sha(text)).toBe("f8ef8e4282cfc4b6b674d9500c3cdc33eb500c4738d0fd833281a9df7cfa1835");
    const audit = JSON.parse(text) as Json;
    expect(audit).toMatchObject({
      schema: "sky-attack-source-audit/v1", move: "MOVE_SKY_ATTACK", moveId: 143, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: {
        pointerOwnedRoot: { source: { byteLength: 2663, sha256: "140e03588d7d42b2e5e17997d8bb5ce36b485ccddb69dd8a654ce18154c01f24" }, rom: { start: "0x082cd17b", endExclusive: "0x082cd313", byteLength: 408, romSha256: "f01aa15269c59aecc78bde4f74513c9ce3a96859d947bfe760da89d79a5620d1" } },
        sharedSkyBackground: { source: { byteLength: 401, sha256: "3cce7958e28a04562ae7495378b318fc95910c65821d1fd98731f5e25fecd6bc" }, rom: { start: "0x082d7ce5", endExclusive: "0x082d7d1d", byteLength: 56, romSha256: "996d89dc89b048cfcd9d920047a17a981fd2aea877342538bf02935d151247cd" } },
      },
      graph: { componentCount: 31 },
      carrier: { soleFactoryAndLevel50: { index: 663, label: "FRONTIER_MON_FEAROW_4", species: "SPECIES_FEAROW", moves: ["MOVE_DRILL_PECK", "MOVE_DOUBLE_EDGE", "MOVE_STEEL_WING", "MOVE_SKY_ATTACK"] }, inventory: { frontierMonCount: 1, speciesCount: 1 } },
    });
    expect(audit.graph.blocks).toEqual(["Move_SKY_ATTACK", "SkyAttackSetUp", "SkyAttackUnleash", "SkyAttackSetUpAgainstOpponent", "SkyAttackSetUpAgainstPartner", "SetSkyBg", "UnsetSkyBg", "SkyAttackEnd", "SetSkyBgContest", "SetSkyBgContinue"]);
    expect(audit.graph.components).toHaveLength(31);
    for (const key of ["birdCallback", "birdStep", "interpreter", "controllerEmit", "playerController", "opponentController", "attackAnimationGate"]) expectIdentity(audit.source.directBodies[key]);
    expectIdentity(audit.source.directBodies.birdTemplate);
    for (const record of Object.values(audit.source.directBodies.tasks) as Json[]) expectIdentity(record);
    expect(Object.keys(audit.source.directBodies.resources)).toHaveLength(8);
  });

  it("pins the battle-script/controller success and failure boundary plus singles reachability", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.battleBoundary.scripts).toEqual({
      effect: { symbol: "BattleScript_EffectSkyAttack", start: "0x082d93be", endExclusive: "0x082d93e6", byteLength: 40, romSha256: "03158a8634bd0b41649695612b813d9594ce45abca8ecee662286713f13a4b44" },
      secondTurn: { symbol: "BattleScript_TwoTurnMovesSecondTurn", start: "0x082d9040", endExclusive: "0x082d906f", byteLength: 47, romSha256: "1de17d583d1bdd54e5823c86471049f1771f4ae4fe6ebc26f2ee2d11d35ea98f" },
      firstTurn: { symbol: "BattleScriptFirstChargingTurn", start: "0x082d906f", endExclusive: "0x082d9099", byteLength: 42, romSha256: "1490b2675529261e20c5eb2e72e41aba287f538c5e3a1d259fc49483355f9cc9" },
    });
    expect(audit.battleBoundary.firstTurn).toContain("byte 3 = 0");
    expect(audit.battleBoundary.secondTurnSuccess).toContain("byte 3 = 1");
    expect(audit.battleBoundary.secondTurnFailure).toContain("does not call BtlController_EmitMoveAnimation");
    expect(audit.reachability.factorySingles.setup).toContain("SkyAttackSetUpAgainstOpponent");
    expect(audit.reachability.noCredit).toEqual(["SkyAttackSetUpAgainstPartner", "SetSkyBgContest"]);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-sky-attack-player-fearow-opponent-shuckle.json", "player", "opponent"],
    ["opponent-front", "tools/battle-lab/mechanic-sky-attack-opponent-fearow-player-shuckle.json", "opponent", "player"],
  ])("keeps the %s complete party-only transient-free stage", (_orientation, path, attackerSide, targetSide) => {
    const stage = json(path);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, battleNum: 0, trainerId: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
      }
    }
    expect(stage.overrides.parties[attackerSide][0]).toMatchObject({ species: 22, level: 50, moves: [143, 143, 143, 143], ppUps: [0, 0, 0, 0] });
    expect(stage.overrides.parties[targetSide][0]).toMatchObject({ species: 213, level: 50, moves: [150, 150, 150, 150] });
  });

  it("retains the historical compact no-credit receipt beside current exact acceptance", () => {
    const receipt = json("tools/compare/fixtures/sky-attack-staging-receipt.json");
    const coverage = json("ANIMATION_COVERAGE.json");
    expect(receipt).toMatchObject({ schema: "sky-attack-compact-staging-receipt/v1", oracleProfile: "battle-scene-on", move: "MOVE_SKY_ATTACK", moveId: 143, status: "unsupported-source-staging-checkpoint", coverageCredit: false, freshness: { runsPerOrientation: 2 } });
    expect(sha(read(receipt.source.audit))).toBe(receipt.source.auditSha256);
    expect(sha(auditText())).toBe(receipt.source.auditRunSha256);
    expect(sha(read(receipt.source.probe))).toBe(receipt.source.probeSha256);
    for (const [orientation, side, setupBattlers, unleashBattlers, digest] of [
      ["player-back", "player", [0, 1], [0, 1], "d1784d816e3cf2be862d48108e554b469c755d7a5f2a805ee921d34ed3db198d"],
      ["opponent-front", "opponent", [1, 0], [1, 0], "e91018f27573dd4845d626418df4067df8b6e4cdae2ba82a31397c1c38e8dac8"],
    ] as const) {
      const run = receipt.runs[orientation];
      expect(run).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, outputSha256: digest, attacker: { side, species: 22, moves: [143, 143, 143, 143] }, target: { species: 213 }, sourceRoot: { setup: { gAnimMoveTurn: 0, attackerBattler: setupBattlers[0], targetBattler: setupBattlers[1] }, unleash: { gAnimMoveTurn: 1, attackerBattler: unleashBattlers[0], targetBattler: unleashBattlers[1] }, observations: { setup: 124, unleash: 101 } }, twoTurn: { chargeStatusSeen: true, chargeStatusCleared: true, setupAnimTurn: 0, unleashAnimTurn: 1, pp: { spent: 1 } }, benches: { unchanged: true, checksumValid: true } });
      expect(run.target.finalHp).toBeLessThan(run.target.initialHp);
      expect(sha(read(run.scenario))).toBe(run.scenarioSha256);
    }
    expect(receipt.scope).toMatchObject({ denseWindowCaptured: false, rawRgbRetained: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false, battleStateInjected: false, boundaryOrBarrierChanged: false });
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SKY_ATTACK")).toMatchObject({ status: "exact" });
    const blendTrack = coverage.componentTracks.find((track: Json) => track.id === "blend-battle-anim-palette-exclude");
    expect(blendTrack.fulfilled).toBe(true);
    expect(blendTrack.representatives).toEqual(["MOVE_CALM_MIND", "MOVE_SKY_ATTACK", "MOVE_DESTINY_BOND", "MOVE_HEAL_BELL", "MOVE_LUSTER_PURGE", "MOVE_SILVER_WIND"]);
    for (const sibling of blendTrack.representatives.filter((move: string) => move !== "MOVE_SKY_ATTACK")) {
      expect(coverage.entries.find((entry: Json) => entry.move === sibling)?.status).toBe("exact");
    }
  });
});
