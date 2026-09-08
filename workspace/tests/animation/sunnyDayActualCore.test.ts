import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/sunnyDayActualCore.ts",
], { encoding: "utf8" }));

describe("MOVE_SUNNY_DAY actual-core production framebuffer", () => {
  it("is 316/316 zero-residual in two byte-identical fresh processes", () => {
    const first = run(), second = run();
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schema: "sunny-day-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SUNNY_DAY",
      rows: 316,
      componentMatched: 316,
      framebufferMatched: 316,
      residualPixels: 0,
      alteredLiveControl: {
        species: ["TORKOAL", "SURSKIT"],
        geometryChanged: true,
        allocationOrderChanged: true,
      },
    });
    expect(first.orientations).toEqual([
      { orientation: "player-back", rows: 158, componentMatched: 158, framebufferMatched: 158, residualPixels: 0, failures: [] },
      { orientation: "opponent-front", rows: 158, componentMatched: 158, framebufferMatched: 158, residualPixels: 0, failures: [] },
    ]);
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
