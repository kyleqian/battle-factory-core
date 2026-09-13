import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/smogActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_SMOG live Scene-ON compositor", () => {
  it("matches all 612 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "smog-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_SMOG", rows: 612, componentMatched: 612,
      seamMatched: 612, rawRgbMatched: 612, framebufferMatched: 612,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 306, componentMatched: 306,
          seamMatched: 306, rawRgbMatched: 306, framebufferMatched: 306,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 306, componentMatched: 306,
          seamMatched: 306, rawRgbMatched: 306, framebufferMatched: 306,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: {
        species: ["CROBAT", "BLISSEY"], sidesReversed: true,
        geometryAndPictureOriginChanged: true,
        spriteTaskResourceMatrixAllocationOrderMonbgBgPaletteAndPresentationRngChanged: true,
        gameplayRngOpaqueAndUnconsumed: true,
      },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
