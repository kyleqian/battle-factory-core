import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/waterPulseActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_WATER_PULSE live Scene-ON compositor", () => {
  it("matches all 320 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "water-pulse-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_WATER_PULSE", rows: 320, componentMatched: 320,
      framebufferMatched: 320, residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 160, componentMatched: 160,
          framebufferMatched: 160, residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 160, componentMatched: 160,
          framebufferMatched: 160, residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["WOBBUFFET", "RELICANTH"], geometryChanged: true,
        allocationMatrixTaskOrderPaletteBackgroundChanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
