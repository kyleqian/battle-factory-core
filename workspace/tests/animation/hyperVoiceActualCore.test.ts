import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/hyperVoiceActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_HYPER_VOICE live Scene-ON compositor", () => {
  it("matches all 210 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "hyper-voice-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_HYPER_VOICE", rows: 210, componentMatched: 210,
      seamMatched: 210, rawRgbMatched: 210, framebufferMatched: 210,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 105, componentMatched: 105,
          seamMatched: 105, rawRgbMatched: 105, framebufferMatched: 105,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 105, componentMatched: 105,
          seamMatched: 105, rawRgbMatched: 105, framebufferMatched: 105,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["CROBAT", "BLISSEY"], sidesReversed: true,
        geometryAndPictureOriginsChanged: true,
        spriteTaskResourceMatrixAllocationsChanged: true, painterOrderChanged: true,
        palettesAndAudioChanged: true, seamChanged: true, framebufferChanged: true,
        gameplayRngOpaqueAndUnchanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
    expect(first.alteredLiveControl.canonicalSeam).not.toBe(first.alteredLiveControl.changedSeam);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
