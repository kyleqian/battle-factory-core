import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Verdict = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Verdict => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/psywaveActualCore.ts", "--require-exact",
], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_PSYWAVE complete live-core presentation", () => {
  it("matches all 410 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "psywave-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_PSYWAVE",
      rows: 410,
      componentMatched: 410,
      seamMatched: 410,
      rawRgbMatched: 410,
      framebufferMatched: 410,
      residualPixels: 0,
      windows: [
        { window: "player-back", rows: 205, framebufferMatched: 205,
          residualPixels: 0, failures: [] },
        { window: "opponent-front", rows: 205, framebufferMatched: 205,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: {
        species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
        orderMatricesPalettesResourcesRegistersAudioRngChanged: true,
        resourcesPalettesRegistersAudioChanged: true, animationRngChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true,
      },
    });
    expect(first.alteredLiveControl.changed).not.toBe(first.alteredLiveControl.canonical);
  }, 30_000);
});
