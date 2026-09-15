import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/psychUpActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_PSYCH_UP live Scene-ON compositor", () => {
  it("matches all 358 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "psych-up-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_PSYCH_UP", rows: 358, componentMatched: 358,
      seamMatched: 358, rawRgbMatched: 358, framebufferMatched: 358,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 179, componentMatched: 179,
          seamMatched: 179, rawRgbMatched: 179, framebufferMatched: 179,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 179, componentMatched: 179,
          seamMatched: 179, rawRgbMatched: 179, framebufferMatched: 179,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["CROBAT", "BLISSEY"], sidesReversed: true,
        geometryAndPictureOriginsChanged: true,
        spriteTaskResourceMatrixAllocationsChanged: true, painterOrderChanged: true,
        seamChanged: true, framebufferChanged: true,
        gameplayRngOpaqueAndUnchanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.alteredLiveControl.canonicalSeam).not.toBe(first.alteredLiveControl.changedSeam);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
