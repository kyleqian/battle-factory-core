import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Verdict = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Verdict => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/nightmareActualCore.ts", "--require-exact",
], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }));

describe("MOVE_NIGHTMARE complete live-core legal presentation", () => {
  it("is pixel-exact twice independently through bilateral cleanup", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "nightmare-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_NIGHTMARE", rows: 338,
      componentMatched: 338, seamMatched: 338, rawRgbMatched: 338,
      framebufferMatched: 338, residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 169, componentMatched: 169,
          seamMatched: 169, rawRgbMatched: 169, framebufferMatched: 169,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 169, componentMatched: 169,
          seamMatched: 169, rawRgbMatched: 169, framebufferMatched: 169,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: {
        species: ["CROBAT", "BLISSEY"], sidesReversed: true,
        geometryAllocationOrderPaletteAndPresentationRngChanged: true,
        gameplayRngOpaqueAndUnchanged: true,
      },
      contestArmExecuted: false, componentTrackFulfilled: false,
      digest: "54afeed80fad9432ed07f372b0e80445ccf69f9fbf564f37b7f7e3f218e08ac1",
    });
    expect(first.alteredLiveControl.changed)
      .not.toBe(first.alteredLiveControl.canonical);
  }, 30_000);
});
