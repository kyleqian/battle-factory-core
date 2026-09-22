import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Verdict = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Verdict => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/extrasensoryActualCore.ts", "--require-exact",
], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_EXTRASENSORY complete live-core presentation", () => {
  it("matches all 322 bilateral rows in two independent verifier processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "extrasensory-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_EXTRASENSORY", rows: 322,
      componentMatched: 322, seamMatched: 322, rawRgbMatched: 322,
      framebufferMatched: 322, residualPixels: 0,
      windows: [
        { window: "player-back", rows: 161, framebufferMatched: 161,
          residualPixels: 0, failures: [] },
        { window: "opponent-front", rows: 161, framebufferMatched: 161,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["CROBAT", "BLISSEY"],
        sidesAndGeometryChanged: true, allocationOrderRegistersAudioRngChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true },
    });
  }, 30_000);
});
