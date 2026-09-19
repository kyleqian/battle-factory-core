import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createScratchDir } from "../../tools/lib/scratch.ts";

type Verdict = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Verdict => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/silverWindActualCore.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 4 << 20 }));

describe("MOVE_SILVER_WIND complete live compositor", () => {
  it("extracts Sparkle6 source art reproducibly", () => {
    const committed = readFileSync(resolve(root, "src/animation/assets/silver-wind.json"), "utf8");
    const output = resolve(createScratchDir("pokebench-silver-wind-assets-"), "silver-wind.json");
    execFileSync(process.execPath,
      ["--experimental-strip-types", "tools/compare/extractSilverWindAssets.ts", "--out", output],
      { cwd: root, encoding: "utf8" });
    expect(readFileSync(output, "utf8")).toBe(committed);
  });

  it("reproduces the complete bilateral window twice through the actual core", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "silver-wind-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_SILVER_WIND", rows: 389, componentMatched: 389,
      seamMatched: 389, rawRgbMatched: 389, framebufferMatched: 389,
      residualPixels: 0,
      scoped: {
        rows: 69, framebufferMatched: 69, residualRows: 0, residualPixels: 0,
        exact: true,
        outOfScope: {
          rows: 320, framebufferMatched: 320, residualRows: 0,
          residualPixels: 0,
        },
      },
      alteredLiveControl: {
        species: ["CHARIZARD", "BLISSEY"], sidesReversed: true,
        geometryAllocationOrderPaletteAndPresentationRngChanged: true,
        gameplayRngOpaqueAndUnchanged: true,
      },
      componentTrackFulfilled: false,
    });
    expect(first.orientations).toMatchObject([
      {
        orientation: "player-back", rows: 193, componentMatched: 193,
        seamMatched: 193, rawRgbMatched: 193, framebufferMatched: 193,
        residualPixels: 0, failures: [],
        scopedBands: [
          { name: "fade", firstAge: 12, lastAge: 29, rows: 18, framebufferMatched: 18, residualPixels: 0, exact: true },
          { name: "post-bug-restore", firstAge: 168, lastAge: 183, rows: 16, framebufferMatched: 16, residualPixels: 0, exact: true },
        ],
        // The scoped black row no longer darkens OBJ.
        blackFadeDiagnostic: { age: 28, framebufferExact: true, residualPixels: 0 },
      },
      {
        orientation: "opponent-front", rows: 196, componentMatched: 196,
        seamMatched: 196, rawRgbMatched: 196, framebufferMatched: 196,
        residualPixels: 0, failures: [],
        scopedBands: [
          { name: "entry-enemy-shadow", firstAge: 0, lastAge: 0, rows: 1, framebufferMatched: 1, residualPixels: 0, exact: true,
            retainedRgbBbox: [160, 65, 191, 73], moveLocalYOffset: -1 },
          { name: "fade", firstAge: 12, lastAge: 29, rows: 18, framebufferMatched: 18, residualPixels: 0, exact: true },
          { name: "post-bug-restore", firstAge: 171, lastAge: 186, rows: 16, framebufferMatched: 16, residualPixels: 0, exact: true },
        ],
        blackFadeDiagnostic: { age: 30, framebufferExact: true, residualPixels: 0 },
      },
    ]);
    expect(first.digest).toBe("e3c66e5fdd42c5c7d13165a6bbd05cbcba09a8f987935f34f26a9298c1a9614b");
    expect(first.alteredLiveControl.changed).not.toBe(first.alteredLiveControl.canonical);
  }, 45_000);
});
