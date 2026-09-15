import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Verdict = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Verdict => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/shockWaveActualCore.ts", "--require-exact",
], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }));

describe("MOVE_SHOCK_WAVE complete live-core presentation", () => {
  it("is pixel-exact twice independently through bilateral cleanup", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "shock-wave-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SHOCK_WAVE",
      rows: 530,
      componentMatched: 530,
      seamMatched: 530,
      rawRgbMatched: 530,
      framebufferMatched: 530,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 267, framebufferMatched: 267,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 263, framebufferMatched: 263,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: {
        species: ["CROBAT", "BLISSEY"], sidesReversed: true,
        geometryAllocationOrderAndPresentationRngChanged: true,
        gameplayRngOpaqueAndUnchanged: true,
      },
      digest: "8bbc9a85fe452b2b6af19a38d7c67fea6a4687786c2ff102cd34ea24c6919fb6",
    });
    expect(first.alteredLiveControl.changed)
      .not.toBe(first.alteredLiveControl.canonical);
  });
});
