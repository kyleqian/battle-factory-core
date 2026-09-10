import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/destinyBondActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_DESTINY_BOND live Scene-ON compositor", () => {
  it("matches all 376 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "destiny-bond-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_DESTINY_BOND", rows: 376, componentMatched: 376,
      framebufferMatched: 376, residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 188, componentMatched: 188,
          framebufferMatched: 188, residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 188, componentMatched: 188,
          framebufferMatched: 188, residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["GRUMPIG", "RELICANTH"], geometryChanged: true,
        allocationMatrixTaskOrderPaletteBackgroundChanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
