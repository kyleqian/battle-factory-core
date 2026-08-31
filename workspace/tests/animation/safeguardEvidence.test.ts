import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);

describe("MOVE_SAFEGUARD bilateral Scene-ON exact evidence", () => {
  it("retains two complete fresh legal three-mon windows with production credit", () => {
    const receipt = JSON.parse(readFileSync(
      "tools/compare/fixtures/safeguard-evidence.json", "utf8",
    ));
    expect(receipt).toMatchObject({
      schema: "safeguard-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SAFEGUARD",
      status: "exact",
      coverageCredit: true,
      evidenceScope: {
        productionAnimationChanged: true,
        reducerAdded: true,
        typedSeamAdded: true,
        compositorAdded: true,
        framebufferLookupAdded: false,
        coveragePromotion: true,
        boundaryOrBarrierChanged: false,
        gameplayStateOwned: false,
        fullDenseRowsRetained: true,
        twiceFreshByteIdentical: true,
      },
      acceptance: {
        sourceRows: { "player-back": 71, "opponent-front": 71 },
        typedSeamRows: { "player-back": 71, "opponent-front": 71 },
        productionFramebufferRows: { "player-back": 71, "opponent-front": 71 },
        productionFramebufferResidualPixels: 0,
      },
      repeatability: { runsPerOrientation: 2, allMatched: true },
    });
    for (const side of ["player-back", "opponent-front"] as const) {
      const scenario = JSON.parse(readFileSync(receipt.orientations[side].scenario, "utf8"));
      expect(scenario).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
    }
  });

  it("audits full dense hardware/state/RGB rows and normalized bilateral latches", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/safeguardEvidence.ts",
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
    for (const side of ["player-back", "opponent-front"]) {
      expect(result[side]).toMatchObject({
        window: { startFrame: 209, endFrame: 279, frameCount: 71 },
        rings: [[3, 7, 20], [4, 13, 26], [5, 19, 32]],
        latches: {
          oam: "70/70", matrices: "70/70", palette: "70/70",
          ringFirstVisibleRgbAges: [8, 14, 20],
          blendFadedAges: [36, 38, 40, 42, 44, 52, 54, 56, 58, 60],
          blendHardwareAges: [37, 39, 41, 43, 45, 53, 55, 57, 59, 61],
        },
        cleanup: { age: 70, scriptActive: false, visualTasks: 0, soundTasks: 0, rings: 0, tagged: false },
        gameplayRngTransitions: 0,
      });
    }
  }, 30_000);

  it("re-extracts the source Guard Ring asset byte-for-byte", () => {
    const output = join(createScratchDir("pokebench-safeguard-assets-"), "safeguard.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractSafeguardAssets.ts",
      "--out",
      output,
    ], { cwd: root });
    expect(readFileSync(output)).toEqual(readFileSync(join(root, "src/animation/assets/safeguard.json")));
  });
});
