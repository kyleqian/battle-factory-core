import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const matrix = JSON.parse(readFileSync(
  "tools/compare/fixtures/spit-up-evidence-matrix.json", "utf8",
)) as {
  branches: Array<Record<string, any>>;
};

describe("MOVE_SPIT_UP source and legal staging checkpoint", () => {
  it("pins the complete ten-component pointer-owned graph and no-credit controls", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/spitUpSourceAudit.ts",
    ], { encoding: "utf8" });
    const audit = JSON.parse(output);
    expect(audit).toMatchObject({
      schema: "spit-up-source-audit/v1",
      move: "MOVE_SPIT_UP",
      status: "unsupported-evidence-checkpoint",
      coverageCredit: false,
      graph: {
        blocks: ["Move_SPIT_UP", "SpitUpStrong", "SpitUpStrongest", "SpitUpContinue"],
        componentCount: 10,
        novelTrackComponents: [
          "asset:ANIM_TAG_RED_ORB_2", "sprite:gSpitUpOrbSpriteTemplate",
          "subroutine:SpitUpContinue", "subroutine:SpitUpStrong",
          "subroutine:SpitUpStrongest", "task:AnimTask_SpitUpDeformMon",
        ],
      },
      carrier: { factoryCount: 1, level50Count: 1, lowestLegal: {
        index: 248, label: "FRONTIER_MON_SWALOT_1", species: "SPECIES_SWALOT",
      } },
      checkpoint: {
        productionChanged: false, reducerAdded: false, typedSceneOnSeam: false,
        compositorAdded: false, actualCoreFramebufferAcceptance: false,
        coveragePromotion: false, componentTrackFulfilled: false,
      },
    });
    expect(audit.graph.components).toHaveLength(10);
    expect(audit.controls.siblingMoves).toEqual({
      MOVE_STOCKPILE: "exact", MOVE_SWALLOW: "exact", MOVE_FLAIL: "exact",
      MOVE_RAPID_SPIN: "exact", MOVE_ENDEAVOR: "exact", MOVE_HORN_DRILL: "exact",
    });
  });

  it("keeps MOVE_SPIT_UP unsupported and the red-orb track unfulfilled", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SPIT_UP"))
      .toBeUndefined();
    const track = coverage.componentTracks.find(
      (entry: { id: string }) => entry.id === "spit-up-red-orb-power-branches",
    );
    expect(track).toMatchObject({ representatives: ["MOVE_SPIT_UP"], fulfilled: false });
    expect(track.components).toEqual([
      "asset:ANIM_TAG_RED_ORB_2", "sprite:gSpitUpOrbSpriteTemplate",
      "subroutine:SpitUpContinue", "subroutine:SpitUpStrong",
      "subroutine:SpitUpStrongest", "task:AnimTask_SpitUpDeformMon",
    ]);
  });

  it("uses six bilateral legal party-only natural-input scenarios", () => {
    expect(matrix).toMatchObject({
      schema: "spit-up-natural-evidence-matrix/v1",
      oracleProfile: "battle-scene-on",
      status: "unsupported-evidence-checkpoint",
      coverageCredit: false,
    });
    expect(matrix.branches).toHaveLength(6);
    const allowedButtons = new Set(["A", "B", "DOWN", "LEFT", "RIGHT", "UP"]);
    for (const branch of matrix.branches) {
      const scenario = JSON.parse(readFileSync(branch.scenario, "utf8"));
      const carrierSide = branch.orientation === "player-back" ? "player" : "opponent";
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      expect(scenario.overrides).toEqual(expect.objectContaining({ parties: expect.any(Object) }));
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(scenario.overrides).not.toHaveProperty("battlers");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario[carrierSide + "SetIds"]).toEqual([248, 249, 250]);
      expect(scenario.overrides.parties[carrierSide][0]).toMatchObject({ species: 317, level: 50 });
      expect(scenario.overrides.parties[carrierSide][0].moves).toEqual(
        expect.arrayContaining([254, 255]),
      );
      for (const side of ["player", "opponent"]) {
        for (const mon of scenario.overrides.parties[side]) {
          expect(mon).toMatchObject({
            level: 50,
            ivs: expect.any(Object),
            evs: expect.any(Object),
            moves: expect.any(Array),
            ppUps: expect.any(Array),
            abilitySlot: expect.any(Number),
          });
          for (const transient of ["hp", "status", "stockpileCounter", "statStages", "stages"])
            expect(mon).not.toHaveProperty(transient);
        }
      }
      expect(scenario.trace.segments.every((segment: { frames: number; buttons: string[] }) => (
        Number.isInteger(segment.frames) && segment.frames > 0
        && segment.buttons.every((button) => allowedButtons.has(button))
      ))).toBe(true);
      expect(scenario.trace.segments.some((segment: { buttons: string[] }) => segment.buttons.includes("A")))
        .toBe(true);
      expect(scenario.trace).not.toHaveProperty("captureFrames");
    }
  });
});
