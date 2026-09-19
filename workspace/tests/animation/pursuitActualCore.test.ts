import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Verdict = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Verdict => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/pursuitActualCore.ts", "--require-exact",
], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_PURSUIT complete live-core presentation", () => {
  it("is pixel-exact twice through normal, switch-interception, and cleanup windows", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "pursuit-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_PURSUIT",
      rows: 309,
      componentMatched: 309,
      seamMatched: 309,
      rawRgbMatched: 309,
      framebufferMatched: 309,
      residualPixels: 0,
      windows: [
        { window: "player-back", rows: 103, componentMatched: 103, seamMatched: 103,
          rawRgbMatched: 103, framebufferMatched: 103, residualPixels: 0, failures: [] },
        { window: "opponent-front", rows: 103, componentMatched: 103, seamMatched: 103,
          rawRgbMatched: 103, framebufferMatched: 103, residualPixels: 0, failures: [] },
        { window: "switchout-opponent-front", rows: 103, componentMatched: 103,
          seamMatched: 103, rawRgbMatched: 103, framebufferMatched: 103,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: {
        species: ["CROBAT", "BLISSEY"],
        sidesAndGeometryChanged: true,
        normalToSwitchoutAffineBranchChanged: true,
        allocationHistoryPaletteTileMatrixAndOrderChanged: true,
        buffersPalettesRegistersAudioPowerAndAnimationRngChanged: true,
        gameplayStateOpaqueAndUnchanged: true,
        gameplayRngOpaqueAndUnchanged: true,
      },
      digest: "e6fda4b30fad52a1cd97b51927df9bf68aafe3861ad67709d949e3a6d7c837e1",
    });
    expect(first.alteredLiveControl.changed).not.toBe(first.alteredLiveControl.canonical);
  }, 30_000);
});
