import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const run = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types",
  "tools/compare/skyAttackActualCore.ts", "--require-exact"],
{ encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_SKY_ATTACK live Scene-ON compositor", () => {
  it("reproduces the source assets byte-for-byte", () => {
    const output = resolve(createScratchDir("pokebench-sky-attack-asset-"), "sky-attack.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractSkyAttackAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/animation/assets/sky-attack.json")));
  });
  it("matches all 660 bilateral setup/unleash rows twice", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "sky-attack-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_SKY_ATTACK", rows: 660,
      componentMatched: 660, seamMatched: 660, rawRgbMatched: 660,
      framebufferMatched: 660, residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 330, setupRows: 149, unleashRows: 181,
          framebufferMatched: 330, residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 330, setupRows: 149, unleashRows: 181,
          framebufferMatched: 330, residualPixels: 0, failures: [] },
      ], alteredLiveControl: { species: ["WAILORD", "BLISSEY"], sidesReversed: true,
        geometryAndPictureOriginsChanged: true, allocationsAndPainterOrderChanged: true,
        animationRngChanged: true, framebufferChanged: true,
        gameplayRngOpaqueAndUnchanged: true } });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
  }, 60_000);
});
