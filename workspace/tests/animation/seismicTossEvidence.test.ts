import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Json => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/seismicTossEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as Json;

describe("MOVE_SEISMIC_TOSS dense Scene-ON evidence checkpoint", () => {
  it("strictly replays both twice-fresh complete Medium windows", () => {
    const first = run(), second = run(); expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "seismic-toss-bilateral-evidence/v1", status: "unsupported-evidence", coverageCredit: false, sourceAuditRunSha256: "f3093f6503fa5c53639933c3c77fe8b865477d5745c9bbb3d6d84b79736bd9f6",
      orientations: {
        "player-back": { rows: 228, sourceWindow: { startFrame: 77, endFrame: 304, frameCount: 228 }, changedRows: 196, cleanup: { age: 227, active: false, ownedSprites: 0, ownedTasks: 0 } },
        "opponent-front": { rows: 228, sourceWindow: { startFrame: 81, endFrame: 308, frameCount: 228 }, changedRows: 196, cleanup: { age: 227, active: false, ownedSprites: 0, ownedTasks: 0 } },
      } });
    for (const side of ["player-back", "opponent-front"]) expect(first.orientations[side].latches).toEqual({ oam: { matches: "227/227", exceptions: [] }, matrices: { matches: "227/227", exceptions: [] }, palette: { matches: "226/227", exceptions: [7] } });
  });

  it("retains the unsupported evidence receipt beside the later exact production entry", () => {
    const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/seismic-toss-evidence.json"), "utf8")) as Json;
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(receipt).toMatchObject({ oracleProfile: "battle-scene-on", moveId: 69, coverageCredit: false, branch: { animationDamage: 50, result: 1, label: "SeismicTossMedium" }, acceptance: { freshRunsPerOrientation: 2, denseRowsPerOrientation: 228, rawRgbRowsPerOrientation: 228 } });
    expect(receipt.evidenceScope).toMatchObject({ productionAnimationChanged: false, reducerAdded: false, assetBundleAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, gameplayStateOwned: false, siblingAcceptance: false, transientOverrides: [] });
    expect(coverage.entries).toHaveLength(236);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SEISMIC_TOSS"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.filter((entry: Json) => ["MOVE_ROCK_THROW", "MOVE_ROCK_SLIDE", "MOVE_ANCIENT_POWER"].includes(entry.move)).every((entry: Json) => entry.status === "exact")).toBe(true);
    expect(coverage.componentTracks.find((entry: Json) => entry.id === "seismic-toss-air-rock-scatter")).toMatchObject({ representatives: ["MOVE_SEISMIC_TOSS"], fulfilled: true });
  });
});
