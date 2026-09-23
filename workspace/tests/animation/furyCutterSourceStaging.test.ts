import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const novel = [
  "subroutine:FuryCutterContinue", "subroutine:FuryCutterContinue2",
  "subroutine:FuryCutterLeft", "subroutine:FuryCutterMedium",
  "subroutine:FuryCutterRight", "subroutine:FuryCutterStrong",
  "subroutine:FuryCutterStrongest", "task:AnimTask_GetFuryCutterHitCount",
  "task:AnimTask_IsFuryCutterHitRight",
];
const scenarios = [
  ["player-back", "tools/battle-lab/mechanic-fury-cutter-player-grovyle-opponent-blissey.json"],
  ["opponent-front", "tools/battle-lab/mechanic-fury-cutter-opponent-grovyle-player-blissey.json"],
] as const;
const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
  entries: Array<{ move: string; status: string }>;
  componentTracks: Array<{ id: string; components: string[]; representatives: string[]; fulfilled: boolean }>;
};

describe("MOVE_FURY_CUTTER source and legal staging checkpoint", () => {
  it("pins the complete pointer-owned graph, census, and no-credit boundary", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/furyCutterSourceAudit.ts",
    ], { encoding: "utf8" });
    const audit = JSON.parse(output);
    expect(audit).toMatchObject({
      schema: "fury-cutter-source-audit/v1",
      move: "MOVE_FURY_CUTTER",
      status: "unsupported-evidence-checkpoint",
      coverageCredit: false,
      source: {
        pointerOwnedRoot: { symbol: "Move_FURY_CUTTER", byteLength: 207 },
        blocks: [
          "Move_FURY_CUTTER", "FuryCutterLeft", "FuryCutterRight",
          "FuryCutterContinue", "FuryCutterContinue2", "FuryCutterMedium",
          "FuryCutterStrong", "FuryCutterStrongest",
        ],
        branches: {
          counterValues: [1, 2, 3, 4],
          directions: { "1": "right", "2": "left", "3": "right", "4": "left" },
          paletteBlendRepeats: { "1": 0, "2": 1, "3": 3, "4": 3 },
          dynamicBasePower: { counter1: 10, counter2: 20, counter3: 40, counter4: 80 },
        },
      },
      graph: { componentCount: 17, novelTrackComponents: novel },
      carrier: {
        factoryCount: 5, level50Count: 5,
        entries: [
          { index: 141, label: "FRONTIER_MON_ANORITH", species: "SPECIES_ANORITH" },
          { index: 174, label: "FRONTIER_MON_IVYSAUR_1", species: "SPECIES_IVYSAUR" },
          { index: 188, label: "FRONTIER_MON_GROVYLE_1", species: "SPECIES_GROVYLE" },
          { index: 261, label: "FRONTIER_MON_KABUTOPS_1", species: "SPECIES_KABUTOPS" },
          { index: 263, label: "FRONTIER_MON_SCYTHER_1", species: "SPECIES_SCYTHER" },
        ],
      },
      checkpoint: {
        sourceAudit: true, completePointerOwnedRoot: true,
        completeReachableVisualGraph: true, directTemplateAndTaskBodies: true,
        fullFactoryCarrierCensus: true, legalBilateralPartyOnlyStaging: true,
        denseSemanticAndRawRgbEvidence: true, normalizedBankedMaps: true,
        twiceFreshByteIdentical: true, firstInactiveCleanup: true,
        counterBranchesOneThroughFour: true, latchMeasured: true,
        productionChanged: true, reducerAdded: true, typedSceneOnSeam: true,
        compositorAdded: true, actualCoreFramebufferAcceptance: false,
        coveragePromotion: false, componentTrackFulfilled: false,
        gameplayStateOwned: false, boundaryOrBarrierChanged: false,
      },
    });
    expect(audit.graph.components).toHaveLength(17);
    expect(audit.controls).toMatchObject({
      exactShared: expect.arrayContaining([
        "asset:ANIM_TAG_CUT", "sprite:gCuttingSliceSpriteTemplate",
        "task:AnimTask_ShakeMon", "visualCommand:complex_palette_blend",
      ]),
      siblingMoves: {
        MOVE_VICE_GRIP: "exact", MOVE_GUILLOTINE: "exact",
        MOVE_AIR_CUTTER: "exact", MOVE_AERIAL_ACE: "exact",
      },
      noTransferCredit: true,
    });
  });

  it("promotes only Fury Cutter and its non-exclusive counter track", () => {
    expect(coverage.entries.find((entry) => entry.move === "MOVE_FURY_CUTTER"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((entry) => entry.id === "fury-cutter-counter-power-branches"))
      .toMatchObject({ components: novel, representatives: ["MOVE_FURY_CUTTER"], fulfilled: true });
  });

  it("uses complete legal party-before-init scenarios in both orientations", () => {
    const allowedButtons = new Set(["A", "B", "DOWN", "LEFT", "RIGHT", "UP"]);
    for (const [orientation, path] of scenarios) {
      const scenario = JSON.parse(readFileSync(path, "utf8"));
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(scenario.overrides).not.toHaveProperty("battlers");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const carrierSide = orientation === "player-back" ? "player" : "opponent";
      expect(scenario.overrides.parties[carrierSide][0]).toMatchObject({ species: 278, level: 50 });
      expect(scenario.overrides.parties[carrierSide][0].moves).toEqual(
        orientation === "opponent-front" ? [210, 210, 210, 210] : [210, 283, 280, 104],
      );
      for (const side of ["player", "opponent"]) {
        for (const mon of scenario.overrides.parties[side]) {
          expect(mon).toMatchObject({
            level: 50, nature: expect.any(Number), ivs: expect.any(Object),
            evs: expect.any(Object), moves: expect.any(Array), ppUps: expect.any(Array),
            abilitySlot: expect.any(Number), friendship: expect.any(Number),
            gender: expect.any(String), shiny: expect.any(Boolean),
          });
          expect(Object.keys(mon.ivs).sort()).toEqual(
            ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort(),
          );
          expect(Object.keys(mon.evs).sort()).toEqual(
            ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort(),
          );
          for (const transient of ["hp", "status", "statStages", "stages", "furyCutterCounter", "furyCutterPower"])
            expect(mon).not.toHaveProperty(transient);
        }
      }
      expect(scenario.trace).not.toHaveProperty("captureFrames");
      expect(scenario.trace.segments.every((segment: { frames: number; buttons: string[] }) => (
        Number.isInteger(segment.frames) && segment.frames > 0
        && segment.buttons.every((button) => allowedButtons.has(button))
      ))).toBe(true);
      expect(scenario.trace.segments.some((segment: { buttons: string[] }) => segment.buttons.includes("A")))
        .toBe(true);
    }
  });
});
