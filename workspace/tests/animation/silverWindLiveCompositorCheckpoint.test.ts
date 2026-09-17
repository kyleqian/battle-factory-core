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

describe("MOVE_SILVER_WIND live compositor checkpoint", () => {
  it("extracts Sparkle6 source art reproducibly", () => {
    const committed = readFileSync(resolve(root, "src/animation/assets/silver-wind.json"), "utf8");
    const output = resolve(createScratchDir("pokebench-silver-wind-assets-"), "silver-wind.json");
    execFileSync(process.execPath,
      ["--experimental-strip-types", "tools/compare/extractSilverWindAssets.ts", "--out", output],
      { cwd: root, encoding: "utf8" });
    expect(readFileSync(output, "utf8")).toBe(committed);
  });

  it("drives every retained row and the material live control without promotion", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "silver-wind-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_SILVER_WIND", rows: 389, componentMatched: 389,
      seamMatched: 389, rawRgbMatched: 389, framebufferMatched: 41,
      alteredLiveControl: {
        species: ["CHARIZARD", "BLISSEY"], sidesReversed: true,
        geometryAllocationOrderPaletteAndPresentationRngChanged: true,
        gameplayRngOpaqueAndUnchanged: true,
      },
      componentTrackFulfilled: false,
    });
    expect(first.residualPixels).toBeGreaterThan(0);
    expect(first.alteredLiveControl.changed).not.toBe(first.alteredLiveControl.canonical);
  }, 30_000);
});
