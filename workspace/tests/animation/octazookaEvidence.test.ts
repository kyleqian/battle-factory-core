import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../../tools/compare/fixtures/octazooka-evidence.json" with { type: "json" };
import { verifyOctazookaEvidence } from "../../tools/compare/octazookaEvidence.ts";

describe("MOVE_OCTAZOOKA bilateral dense evidence checkpoint", () => {
  it("pins the exact source interval, component graph, callbacks, audio, and lowest carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      move: "MOVE_OCTAZOOKA", moveId: 190,
      sourceBounds: {
        start: "0x082d2b83", endExclusive: "0x082d2be9", byteLength: 102,
        sha256: "1c86b2d6fc47a5825cd0e3f63d74c413d524eb025e09676de1e4d1851863c0a9",
      },
      graph: { blocks: ["Move_OCTAZOOKA"], components: fixture.components },
      carrier: {
        frontierMon: "FRONTIER_MON_OCTILLERY_1", setId: 256, speciesId: 224,
        item: "BATTLE_FRONTIER_ITEM_SHELL_BELL", nature: "NATURE_HARDY", evs: ["SP_ATTACK", "ATTACK"],
      },
      templates: ["gOctazookaBallSpriteTemplate", "gOctazookaSmokeSpriteTemplate"],
      callbacks: ["TranslateAnimSpriteToTargetMonLocation", "AnimSpriteOnMonPos", "DestroyAnimSprite"],
      audio: {
        launch: { soundEffect: "SE_M_MEGA_KICK2", id: 141, pan: "SOUND_PAN_ATTACKER" },
        impact: { soundEffect: "SE_M_SELF_DESTRUCT", id: 177, pan: "SOUND_PAN_TARGET" },
      },
    });
  });

  it("replays every retained bilateral state/RGB/change-map row through first inactive cleanup", () => {
    const result = verifyOctazookaEvidence();
    for (const side of ["player-back", "opponent-front"] as const) {
      expect(result[side]).toMatchObject({
        lifecycle: { ballCreates: 1, ballDestroys: 1, smokeCreates: 4, smokeDestroys: 4 },
        latches: { oam: "79/79", matrices: "79/79", palette: "79/79" },
        sourceRows: 80, rawRgbRows: 80, gameplayRngTransitions: 0, animationRngTransitions: 79,
        framebufferCompared: false,
      });
    }
    expect(fixture).toMatchObject({
      status: "exact", coverageCredit: true,
      evidenceScope: {
        productionAnimationChanged: true, reducerAdded: true, typedSeamAdded: true,
        compositorAdded: true, framebufferCompared: true, coveragePromotion: true,
        boundaryOrBarrierChanged: false, gameplayStateOwned: false,
        fullDenseRowsRetained: true, twiceFreshByteIdentical: true,
      },
      acceptance: {
        freshRunsPerOrientation: 2, sourceRows: "80/80 + 80/80", rawRgbRows: "80/80 + 80/80",
        observedPointerParities: [0, 1], oamLatch: "79/79 preceding-software rows per orientation",
        matrixLatch: "79/79 preceding-software rows per orientation", paletteLatch: "79/79 preceding-faded rows per orientation",
        gameplayRngTransitions: 0, animationRngTransitions: 79, firstInactiveCleanupAge: 79,
      },
    });
  });

  it("uses complete legal challenge-1 parties with unique held items and awards no sibling credit", () => {
    for (const side of ["player-back", "opponent-front"] as const) {
      const scenario = JSON.parse(readFileSync(fixture.orientations[side].scenario, "utf8")) as Record<string, any>;
      expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 1 });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      for (const party of Object.values(scenario.overrides.parties) as any[][]) {
        expect(party).toHaveLength(3);
        expect(new Set(party.map((mon) => mon.species)).size).toBe(3);
        const items = party.map((mon) => mon.item).filter(Boolean);
        expect(new Set(items).size).toBe(items.length);
        for (const mon of party) {
          expect(mon).toMatchObject({ level: 50, ppUps: [0, 0, 0, 0], friendship: 70, shiny: false });
          expect(mon.moves).toHaveLength(4); expect(Object.keys(mon.ivs)).toHaveLength(6); expect(Object.keys(mon.evs)).toHaveLength(6);
          for (const transient of ["hp", "status", "statStages", "volatile", "weather", "outcome"]) expect(mon).not.toHaveProperty(transient);
        }
      }
    }
    expect(fixture.controls).toEqual({
      mist: "source-neighbor control only; no shared acceptance",
      smokescreen: "shared smoke-family control only; no shared acceptance",
    });
    expect(fixture.productionAcceptance).toMatchObject({ reducerRows: "160/160", typedSeamRows: "160/160", productionFramebufferRows: "160/160", productionFramebufferResidualPixels: 0 });
  });
});
