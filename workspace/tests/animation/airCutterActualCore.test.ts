import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/airCutterActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_AIR_CUTTER live Scene-ON compositor", () => {
  it("matches all 224 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "air-cutter-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_AIR_CUTTER", rows: 224, componentMatched: 224,
      seamMatched: 224, rawRgbMatched: 224, framebufferMatched: 224,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 112, componentMatched: 112,
          seamMatched: 112, rawRgbMatched: 112, framebufferMatched: 112,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 112, componentMatched: 112,
          seamMatched: 112, rawRgbMatched: 112, framebufferMatched: 112,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["CROBAT", "BLISSEY"], geometryChanged: true,
        allocationMatrixTaskResourceOrderMonbgChanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
