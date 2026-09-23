import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/fury-cutter-evidence.json", "utf8",
)) as Json;

describe("MOVE_FURY_CUTTER dense evidence checkpoint", () => {
  it("replays the verifier and pins both fresh bilateral four-body receipts", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/furyCutterEvidence.ts",
    ], { encoding: "utf8" });
    expect(JSON.parse(output)).toMatchObject({
      schema: "fury-cutter-evidence-checkpoint/v1",
      status: "unsupported", coverageCredit: false, noProductionClaim: false,
      graphComponents: 17, representatives: ["MOVE_FURY_CUTTER"],
      novelTrackComponents: expect.arrayContaining([
        "subroutine:FuryCutterContinue", "task:AnimTask_GetFuryCutterHitCount",
      ]),
      boundary: {
        productionChanged: true, reducerAdded: true, typedSceneOnSeam: true,
        compositorAdded: true, actualCoreFramebufferAcceptance: false,
        coveragePromotion: false, componentTrackFulfilled: false,
        boundaryOrBarrierChanged: false,
      },
    });
    expect(fixture).toMatchObject({
      schema: "fury-cutter-evidence-checkpoint/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_FURY_CUTTER",
      status: "unsupported", coverageCredit: false, graphComponents: 17,
      noProductionClaim: false,
    });
    expect(fixture.branches).toHaveLength(2);
    const seen = new Set<string>();
    for (const branch of fixture.branches as Json[]) {
      seen.add(branch.side);
      expect(branch).toMatchObject({
        powers: [10, 20, 40, 80],
        directions: ["right", "left", "right", "left"],
        maps: [1, 2, 3, 4], denseRows: 172, rawRgbRows: 172,
        firstInactiveCleanup: true, twiceFreshByteIdentity: true,
        repeatProbeSha256: branch.probeSha256,
        repeatRawRgbSequenceSha256: branch.rawRgbSequenceSha256,
      });
      expect(branch.bodyWindows).toHaveLength(4);
      expect(branch.bodyWindows.every((window: Json) => window.frameCount === 43)).toBe(true);
      expect(branch.mapFiles).toHaveLength(4);
      for (const mapPath of branch.mapFiles as string[]) {
        const map = JSON.parse(readFileSync(mapPath, "utf8")) as Json;
        expect(map).toMatchObject({
          schema: "fury-cutter-normalized-change-map/v1",
          oracleProfile: "battle-scene-on", side: branch.side,
          sourceRows: expect.any(Array),
          latches: {
            hardwareOamEqualsPrecedingSoftware: "42/42",
            hardwareMatricesEqualsPrecedingSoftware: "42/42",
            independentNormalizedBankMaps: true,
          },
          resources: { cutTag: { tag: 10138, absentAfterCleanup: true } },
          cleanup: { age: 42, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 },
          state: {
            partiesStable: true, battlersStable: true, engineStable: true,
            immutableStable: true, gameplayRngTransitions: [],
          },
        });
        expect(map.sourceRows).toHaveLength(43);
        expect(map.latches.sourceSliceMatrixAndOam).toHaveLength(1);
        expect(map.tasks).toMatchObject({
          AnimTask_ShakeMon_Step: expect.any(Array),
          Task_UpdateMonBg: expect.any(Array), Task_ClearMonBg: expect.any(Array),
        });
        expect(map.audio).toEqual(expect.arrayContaining([
          expect.objectContaining({ symbol: "se_m_razor_wind" }),
        ]));
      }
    }
    expect(seen).toEqual(new Set(["player-back", "opponent-front"]));
  });
});
