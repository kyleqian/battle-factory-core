import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (path: string): Json => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", path], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })) as Json;

describe("MOVE_RETURN all-branch evidence checkpoint", () => {
  it("pins the complete 20-component graph, eight carriers, four staging branches, and FLATTER identity only", () => {
    const audit = run("tools/compare/returnSourceAudit.ts");
    expect(audit).toMatchObject({ schema: "return-source-audit/v1", move: "MOVE_RETURN", status: "exact", coverageCredit: true, graph: { componentCount: 20 }, sibling: { move: "MOVE_FLATTER", componentCount: 11, credit: false }, boundary: { reducer: true, typedSeam: true, compositor: true, framebufferAcceptance: true, coveragePromotion: true, trackCredit: true, siblingCredit: false } });
    expect(audit.level50Carriers.map((entry: Json) => entry.index)).toEqual([288, 306, 355, 459, 534, 567, 747, 827]);
    expect(audit.sibling.level50Carriers.map((entry: Json) => entry.index)).toEqual([146, 147]);
    expect(audit.reachability.completePartyOverride).toEqual({ weak: "friendship 0..60 (60 keeps the initialized selector 0)", medium: "61..91", strong: "92..200", strongest: "201..255" });
    expect(audit.reachability.retainedEvidence).toContain("weak 60, medium 61, strong 200, strongest 255");
  });

  it("keeps the historical evidence-only receipt intact beside later exact promotion", () => {
    const result = run("tools/compare/returnEvidence.ts");
    expect(result).toMatchObject({ schema: "return-all-branches-bilateral-evidence/v2", move: "MOVE_RETURN", status: "unsupported-evidence", coverageCredit: false, boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false } });
    const expected = {
      weak: { rows: 88, friendship: 60, latches: ["87/87", "87/87", "86/87"], cleanup: 87 },
      medium: { rows: 100, friendship: 61, latches: ["99/99", "99/99", "98/99"], cleanup: 99 },
      strong: { rows: 125, friendship: 200, latches: ["124/124", "124/124", "123/124"], cleanup: 124 },
      strongest: { rows: 282, friendship: 255, latches: ["281/281", "281/281", "280/281"], cleanup: 281 },
    };
    for (const [branch, expectedBranch] of Object.entries(expected)) {
      for (const side of ["player-back", "opponent-front"]) expect(result.branches[branch][side]).toMatchObject({
        rows: expectedBranch.rows,
        latches: { hardwareOamEqualsPrecedingSoftware: expectedBranch.latches[0], hardwareMatricesEqualPrecedingSoftware: expectedBranch.latches[1], hardwarePaletteEqualsPrecedingFaded: expectedBranch.latches[2], paletteSameRowExceptions: [4] },
        cleanup: { age: expectedBranch.cleanup, active: false, visualTasks: 0, soundTasks: 0 },
      });
    }
    const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/return-evidence.json"), "utf8")) as Json;
    expect(fixture.evidenceScope).toMatchObject({ allReachableSelectorBranchesRetained: true, explicitFriendships: { weak: 60, medium: 61, strong: 200, strongest: 255 }, twiceFreshByteIdentical: true, strongestCheckpointByteStable: true });
    expect(fixture.branches.strongest.friendship).toBe(expected.strongest.friendship);
    expect(fixture.branches.strongest.orientations["player-back"]).toMatchObject({ probeJsonSha256: "8d2c3569efdd02222dff040bf18c5d6c01781cf4cdf397ee071dd220123bbe2a", rawRgbSequenceSha256: "9b3723b35b7a92cbb98da9cc1ec87277b7bfe7809edf887b9ac124e46c7dcbe4", changeMapSha256: "2383586a1a2fb50ca872ec71c4e9150a4c91b41463f1d489fa9877558b0dd30b" });
    expect(fixture.branches.strongest.orientations["opponent-front"]).toMatchObject({ probeJsonSha256: "f7214f2e828bd053a606116a9f7bac3e71f860c9f3f71b6a4fdd963825116392", rawRgbSequenceSha256: "4a0692bfe09106d14be1c7b359d27c4d2524d514f8d709444163f404a881b506", changeMapSha256: "ff881ad46a3dc3d3efb4b115a66c13401a7c9268e77320d01a43d5b41910233a" });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.some((entry: Json) => entry.move === "MOVE_RETURN" && entry.status === "exact")).toBe(true);
    expect(coverage.entries.some((entry: Json) => entry.move === "MOVE_FLATTER")).toBe(false);
  });
});
