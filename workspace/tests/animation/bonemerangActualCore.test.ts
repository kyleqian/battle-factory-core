import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/bonemerangActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_BONEMERANG live Scene-ON compositor", () => {
  it("matches all 144 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "bonemerang-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_BONEMERANG", rows: 144, componentMatched: 144,
      seamMatched: 144, rawRgbMatched: 144, framebufferMatched: 144,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 72, componentMatched: 72,
          seamMatched: 72, rawRgbMatched: 72, framebufferMatched: 72,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 72, componentMatched: 72,
          seamMatched: 72, rawRgbMatched: 72, framebufferMatched: 72,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["CUBONE", "BLISSEY"], sidesReversed: true,
        geometryAndPictureOriginChanged: true,
        spriteTaskResourceMatrixAllocationAndPainterOrderChanged: true,
        gameplayRngOpaqueAndUnconsumed: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
