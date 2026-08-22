import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../../tools/compare/fixtures/hail-evidence.json" with { type: "json" };
import { verifyHailEvidence } from "../../tools/compare/hailEvidence.ts";

describe("MOVE_HAIL bilateral dense evidence checkpoint", () => {
  it("pins the source interval, component graph, lowest legal carrier, and Hail task body", () => {
    const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      move: "MOVE_HAIL", moveId: 258,
      sourceBounds: { start: "0x082cdc76", endExclusive: "0x082cdcae", byteLength: 56, sha256: "8a1e8e1583779dc1bd0dcacb4fbf64a923817a6a542beb2887ae9082481fd1bb" },
      graph: { blocks: ["Move_HAIL"], components: fixture.components },
      carrier: { frontierMon: "FRONTIER_MON_DELIBIRD", setId: 118, speciesId: 225, item: "BATTLE_FRONTIER_ITEM_NEVER_MELT_ICE", nature: "NATURE_DOCILE", evs: ["SP_ATTACK", "HP"] },
      tasks: ["AnimTask_BlendBattleAnimPal", "AnimTask_Hail"], templates: ["gHailParticleSpriteTemplate", "gIceCrystalHitLargeSpriteTemplate"],
      callbacks: ["AnimHailBegin", "AnimHailContinue"], audio: { soundEffect: "SE_M_HAIL", id: 242, pan: 0, interval: 8, count: 10 },
    });
  });

  it("replays all 316 dense/RGB/change-map rows and independently measures AnimTask_Hail", () => {
    const result = verifyHailEvidence();
    expect(result["player-back"]).toMatchObject({ sourceWindow: { startFrame: 66, endFrame: 223, frameCount: 158 }, taskRanges: { hail: [[34,128]], blend: [[7,32],[130,155]], audio: [[34,113]] }, lifecycle: { hailCreates: 30, impactCreates: 4, peakHail: 6 }, latches: { oam: "157/157", matrices: "157/157", palette: "157/157" }, gameplayRngTransitions: 0, animationRngTransitions: 157, framebufferCompared: true });
    expect(result["opponent-front"]).toMatchObject({ sourceWindow: { startFrame: 70, endFrame: 227, frameCount: 158 }, taskRanges: { hail: [[34,128]], blend: [[7,32],[130,155]], audio: [[34,113]] }, lifecycle: { hailCreates: 30, impactCreates: 4, peakHail: 6 }, latches: { oam: "157/157", matrices: "157/157", palette: "157/157" }, gameplayRngTransitions: 0, animationRngTransitions: 157, framebufferCompared: true });
    expect(fixture).toMatchObject({ status: "exact", coverageCredit: true, evidenceScope: { productionAnimationChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, framebufferCompared: true, coveragePromotion: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false, fullDenseRowsRetained: true, twiceFreshByteIdentical: true }, repeatability: { runsPerOrientation: 2, allMatched: true }, acceptance: { sourceRows: "158/158 + 158/158", rawRgbRows: "158/158 + 158/158", hailParticleCreatesPerOrientation: 30, impactCreatesPerOrientation: 4, reducerRows: 316, typedSeamRows: 316, productionFramebufferRows: 316, framebufferCompared: true } });
  });

  it("uses complete legal parties and grants no weather or ice-crystal sibling credit", () => {
    for (const side of ["player-back", "opponent-front"] as const) {
      const scenario = JSON.parse(readFileSync(fixture.orientations[side].scenario, "utf8")) as Record<string, any>;
      expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0 });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      for (const party of Object.values(scenario.overrides.parties) as any[][]) {
        expect(party).toHaveLength(3); expect(new Set(party.map((mon) => mon.species)).size).toBe(3);
        const items = party.map((mon) => mon.item).filter(Boolean); expect(new Set(items).size).toBe(items.length);
        for (const mon of party) { expect(mon).toMatchObject({ level: 50, ppUps: [0,0,0,0], friendship: 70, shiny: false }); expect(mon.moves).toHaveLength(4); expect(Object.keys(mon.ivs)).toHaveLength(6); expect(Object.keys(mon.evs)).toHaveLength(6); for (const transient of ["hp", "status", "statStages", "volatile", "weather", "outcome"]) expect(mon).not.toHaveProperty(transient); }
      }
    }
    expect(fixture.controls).toEqual({ rainDance: "exact weather-task control only; no Hail credit", icePunch: "exact palette/crystal control only; no Hail credit", blizzard: "exact ice-crystal control only; no Hail credit", icyWind: "exact ice-crystal control only; no Hail credit", crabhammer: "exact ice-crystal asset control only; no Hail credit", haze: "exact palette-task control only; no Hail credit", triAttack: "exact ice-crystal asset control only; no Hail credit" });
  });
});
