import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Verdict = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Verdict => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/overheatActualCore.ts", "--require-exact"], { cwd: root, encoding: "utf8", maxBuffer: 4 << 20 }));

describe("MOVE_OVERHEAT complete live-core legal presentation", () => {
  it("is pixel-exact twice independently through bilateral cleanup", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "overheat-actual-core-verdict/v1", oracleProfile: "battle-scene-on", move: "MOVE_OVERHEAT", rows: 460,
      componentMatched: 460, seamMatched: 460, rawRgbMatched: 460, framebufferMatched: 460, residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 230, componentMatched: 230, seamMatched: 230, rawRgbMatched: 230, framebufferMatched: 230, residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 230, componentMatched: 230, seamMatched: 230, rawRgbMatched: 230, framebufferMatched: 230, residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["CROBAT", "BLISSEY"], sidesReversed: true, geometryAllocationOrderPaletteAndPresentationRngChanged: true, gameplayRngOpaqueAndUnchanged: true },
      componentTrackFulfilled: false,
    });
    expect(first.alteredLiveControl.changed).not.toBe(first.alteredLiveControl.canonical);
  }, 30_000);
});
