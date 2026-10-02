import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const run = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/outrageActualCore.ts", "--require-exact"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
}));

describe("MOVE_OUTRAGE actual shared core", () => {
  it("passes all 240 retained rows in two fresh processes with zero residual pixels", () => {
    const first = run();
    const second = run();
    for (const result of [first, second]) {
      expect(result).toMatchObject({
        schema: "outrage-actual-core-verdict/v1",
        oracleProfile: "battle-scene-on",
        move: "MOVE_OUTRAGE",
        rows: 240,
        componentMatched: 240,
        seamMatched: 240,
        rawRgbMatched: 240,
        framebufferMatched: 240,
        residualPixels: 0,
        freshProcessPass: 1,
        orientations: [
          { orientation: "player-back", rows: 120, componentMatched: 120, seamMatched: 120, rawRgbMatched: 120, framebufferMatched: 120, residualPixels: 0, failures: [] },
          { orientation: "opponent-front", rows: 120, componentMatched: 120, seamMatched: 120, rawRgbMatched: 120, framebufferMatched: 120, residualPixels: 0, failures: [] },
        ],
        alteredLiveControl: {
          species: ["CROBAT", "BLISSEY"],
          sidesReversed: true,
          geometryAllocationOrderPaletteAndPresentationRngChanged: true,
          gameplayRngOpaqueAndUnchanged: true,
        },
      });
    }
    expect(first.digest).not.toBe(second.digest);
  }, 120000);
});
