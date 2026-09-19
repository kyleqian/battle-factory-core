import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/snoreActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_SNORE live Scene-ON compositor", () => {
  it("reproduces the source Snore-Z asset byte-for-byte", () => {
    const output = resolve(createScratchDir("pokebench-snore-asset-"), "snore.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractSnoreAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve(root,
      "src/animation/assets/snore.json")));
  });

  it("matches all 140 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "snore-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_SNORE", rows: 140, componentMatched: 140,
      seamMatched: 140, rawRgbMatched: 140, framebufferMatched: 140,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 70, componentMatched: 70,
          seamMatched: 70, rawRgbMatched: 70, framebufferMatched: 70,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 70, componentMatched: 70,
          seamMatched: 70, rawRgbMatched: 70, framebufferMatched: 70,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["WAILORD", "BLISSEY"], sidesReversed: true,
        geometryAndPictureOriginsChanged: true,
        spriteTaskResourceMatrixAllocationsChanged: true, painterOrderChanged: true,
        palettesRegistersAndAnimationRngChanged: true, seamChanged: true,
        framebufferChanged: true, gameplayRngOpaqueAndUnchanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.alteredLiveControl.canonicalSeam).not.toBe(first.alteredLiveControl.changedSeam);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
