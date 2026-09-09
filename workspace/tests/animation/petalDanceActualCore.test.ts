import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/petalDanceActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_PETAL_DANCE live Scene-ON compositor", () => {
  it("matches all 488 rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "petal-dance-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_PETAL_DANCE",
      rows: 488,
      componentMatched: 488,
      framebufferMatched: 488,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 244, componentMatched: 244,
          framebufferMatched: 244, residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 244, componentMatched: 244,
          framebufferMatched: 244, residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["IVYSAUR", "RELICANTH"],
        geometryChanged: true, allocationMatrixOrderChanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
