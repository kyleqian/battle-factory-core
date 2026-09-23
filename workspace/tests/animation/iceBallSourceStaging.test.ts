import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"].sort();
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort();
const graph = [
  "asset:ANIM_TAG_ICE_CHUNK", "asset:ANIM_TAG_ICE_CRYSTALS",
  "sprite:gIceBallChunkSpriteTemplate", "sprite:gIceBallImpactShardSpriteTemplate",
  "subroutine:IceBallContinue", "subroutine:IceBallContinue2", "subroutine:IceBallEnd",
  "subroutine:IceBallImpactShard", "subroutine:IceBallMediun", "subroutine:IceBallSetIceBg",
  "subroutine:IceBallStrong", "subroutine:IceBallStrongest", "subroutine:IceBallUnsetIceBg",
  "subroutine:IceBallWeak", "subroutine:IceBallWeakest",
  "task:AnimTask_GetIceBallCounter", "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
  "visualCommand:fadetobg", "visualCommand:restorebg", "visualCommand:waitbgfadein",
];
const transient = ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"];

function expectPartyRecord(mon: Json): void {
  expect(Object.keys(mon).sort()).toEqual(completeKeys);
  expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
  expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
  for (const key of transient) expect(Object.hasOwn(mon, key)).toBe(false);
}

describe("MOVE_ICE_BALL source and legal Scene-ON staging checkpoint", () => {
  it("re-runs the source audit deterministically and pins the complete 20-component graph", () => {
    const first = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/iceBallSourceAudit.ts"], { cwd: root, encoding: "utf8" });
    expect(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/iceBallSourceAudit.ts"], { cwd: root, encoding: "utf8" })).toBe(first);
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "ice-ball-source-audit/v1", move: "MOVE_ICE_BALL", moveId: 301,
      status: "unsupported-evidence-checkpoint", coverageCredit: false,
      graph: { componentCount: 20, components: graph },
      branches: { counters: [1, 2, 3, 4, 5], shardCounts: [5, 7, 9, 10, 10], shakeDurations: [8, 10, 14, 18, 30], shardLife: 21, arcDuration: 30 },
      carrier: { factoryCount: 3, level50Count: 3, preferred: { index: 59, label: "FRONTIER_MON_SPHEAL", species: "SPECIES_SPHEAL" } },
      checkpoint: { productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false },
    });
    expect(audit.carrier.entries.map((entry: Json) => entry.label)).toEqual(["FRONTIER_MON_SPHEAL", "FRONTIER_MON_DELIBIRD", "FRONTIER_MON_SEALEO_1"]);
    expect(readJson("tools/compare/fixtures/ice-ball/source-audit.json")).toEqual(audit);
  });

  it.each([
    ["tools/battle-lab/mechanic-ice-ball-player-spheal-opponent-onix.json", [118, 158, 188], [156, 149, 180], "player", "opponent"],
    ["tools/battle-lab/mechanic-ice-ball-opponent-spheal-player-onix.json", [156, 149, 180], [118, 158, 188], "opponent", "player"],
  ] as const)("keeps %s party-only and transient-free", (path, playerSetIds, opponentSetIds, attackerSide, targetSide) => {
    const stage = readJson(path);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, battleNum: 2, trainerId: 50, seed: 305420103 });
    expect(stage.playerSetIds).toEqual(playerSetIds);
    expect(stage.opponentSetIds).toEqual(opponentSetIds);
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const side of ["player", "opponent"] as const) {
      expect(stage.overrides.parties[side]).toHaveLength(3);
      stage.overrides.parties[side].forEach(expectPartyRecord);
    }
    expect(stage.overrides.parties[attackerSide][0]).toMatchObject({ species: 341, level: 50, moves: [301, 301, 301, 301], item: 221, abilitySlot: 0 });
    expect(stage.overrides.parties[targetSide][0]).toMatchObject({ species: 403, level: 50, gender: "genderless", moves: [33, 33, 33, 33] });
    expect(stage.trace.segments).toEqual(expect.arrayContaining([{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }]));
  });

  it("promotes only MOVE_ICE_BALL and its sole non-exclusive track after production acceptance", () => {
    const coverage = readJson("ANIMATION_COVERAGE.json");
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_ICE_BALL")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "ice-ball-five-counter-bg-shards")).toMatchObject({ components: graph, representatives: ["MOVE_ICE_BALL"], fulfilled: true });
  });
});
