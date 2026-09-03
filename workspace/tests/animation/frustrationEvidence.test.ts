import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const verifier = "tools/compare/frustrationEvidence.ts";

function runVerifier(): Json {
  return JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", verifier], {
    cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  })) as Json;
}

describe("MOVE_FRUSTRATION dense Scene-ON evidence checkpoint", () => {
  it("replays the complete bilateral strongest-branch corpus twice without acceptance credit", () => {
    const first = runVerifier();
    const second = runVerifier();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "frustration-bilateral-evidence/v1", status: "unsupported-evidence", coverageCredit: false,
      move: "MOVE_FRUSTRATION", moveId: 218, sourceAuditRunSha256: "db24da254d65546352f860834894dfa593d34b40743cc4d663540f8d293a29c0",
      twiceFresh: true, rowsPerOrientation: 229,
      orientations: {
        "player-back": { rows: 229, sourceWindow: { startFrame: 76, endFrame: 304, frameCount: 229 }, changedRows: 112, lifecycle: { sprites: 8, tasks: 7 }, cleanup: { active: false, ownedSprites: 0, ownedTasks: 0 } },
        "opponent-front": { rows: 229, sourceWindow: { startFrame: 80, endFrame: 308, frameCount: 229 }, changedRows: 112, lifecycle: { sprites: 8, tasks: 7 }, cleanup: { active: false, ownedSprites: 0, ownedTasks: 0 } },
      },
    });
    for (const side of ["player-back", "opponent-front"]) expect(first.orientations[side].latches).toEqual({
      hardwareOamEqualsPrecedingSoftware: "228/228", hardwareMatricesEqualsPrecedingSoftware: "228/228",
      hardwarePaletteEqualsPrecedingFaded: "227/228", hardwareOamExceptions: [], hardwareMatrixExceptions: [], hardwarePaletteExceptions: [7],
    });
  });

  it("keeps the source/staging boundary and independent sibling controls explicit", () => {
    const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/frustration-evidence.json"), "utf8")) as Json;
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(fixture).toMatchObject({ schema: "frustration-bilateral-evidence/v1", oracleProfile: "battle-scene-on", moveId: 218, coverageCredit: false });
    expect(fixture.evidenceScope).toMatchObject({ freshRunsPerOrientation: 2, completeDenseRowsPerOrientation: 229, rawRgbRowsPerOrientation: 229,
      sourceEntryThroughFirstInactiveCleanup: true, productionAnimationChanged: false, coveragePromotion: false, gameplayStateOwned: false,
      reducerOrAssetsAdded: false, compositorOrPresentationSeamAdded: false, framebufferFitterAdded: false, transientOverrides: [] });
    expect(coverage.entries).toHaveLength(229);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_FRUSTRATION")).toBeUndefined();
    expect(coverage.entries.filter((entry: Json) => ["MOVE_SWAGGER", "MOVE_TORMENT", "MOVE_TAUNT"].includes(entry.move)).every((entry: Json) => entry.status === "exact")).toBe(true);
    const track = coverage.componentTracks.find((entry: Json) => entry.id === "anger-mark-grow-breath");
    expect(track).toMatchObject({ representatives: ["MOVE_SWAGGER", "MOVE_FRUSTRATION", "MOVE_TORMENT", "MOVE_TAUNT"] });
    expect(track.fulfilled).not.toBe(true);
  });
});
