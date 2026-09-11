import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/sheerColdActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_SHEER_COLD live Scene-ON compositor", () => {
  it("matches all 383 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "sheer-cold-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_SHEER_COLD", rows: 383, componentMatched: 383,
      seamMatched: 383, rawRgbMatched: 383, framebufferMatched: 383,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 192, componentMatched: 192,
          seamMatched: 192, rawRgbMatched: 192, framebufferMatched: 192,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 191, componentMatched: 191,
          seamMatched: 191, rawRgbMatched: 191, framebufferMatched: 191,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["CROBAT", "BLISSEY"], sidesReversed: true,
        geometryChanged: true, spriteTaskResourceMatrixAllocationOrderMonbgChanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
