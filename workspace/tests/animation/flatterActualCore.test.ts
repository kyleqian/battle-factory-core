import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Verdict = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Verdict => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/flatterActualCore.ts", "--require-exact",
], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_FLATTER complete live-core presentation", () => {
  it("matches all 438 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "flatter-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_FLATTER",
      rows: 438,
      componentMatched: 438,
      seamMatched: 438,
      rawRgbMatched: 438,
      framebufferMatched: 438,
      residualPixels: 0,
      windows: [
        { orientation: "player-back", rows: 219, framebufferMatched: 219,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 219, framebufferMatched: 219,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: {
        species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
        orderMatricesPalettesResourcesAudioRngChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true,
      },
    });
    expect(first.alteredLiveControl.changed).not.toBe(first.alteredLiveControl.canonical);
    expect(first.digest).toBe("23b937f914158f8447305e2b3dfd93f8c6ee0fe7f15cbfc500a0ac3c50024683");
  }, 30_000);
});
