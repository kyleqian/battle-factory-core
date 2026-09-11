import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/digActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_DIG live Scene-ON compositor", () => {
  it("matches all 526 bilateral setup/unleash rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "dig-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_DIG", rows: 526, componentMatched: 526,
      framebufferMatched: 526, residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 263, componentMatched: 263,
          framebufferMatched: 263, residualPixels: 0, failures: [],
          bodies: [
            { body: "setup", rows: 195, framebufferMatched: 195, residualPixels: 0 },
            { body: "unleash", rows: 68, framebufferMatched: 68, residualPixels: 0 },
          ] },
        { orientation: "opponent-front", rows: 263, componentMatched: 263,
          framebufferMatched: 263, residualPixels: 0, failures: [],
          bodies: [
            { body: "setup", rows: 195, framebufferMatched: 195, residualPixels: 0 },
            { body: "unleash", rows: 68, framebufferMatched: 68, residualPixels: 0 },
          ] },
      ],
      alteredLiveControl: { species: ["FLYGON", "BLISSEY"], geometryChanged: true,
        allocationMatrixTaskOrderMonbgScanlineChanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
