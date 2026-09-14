import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/signalBeamActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_SIGNAL_BEAM live Scene-ON compositor", () => {
  it("matches all 291 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "signal-beam-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_SIGNAL_BEAM", rows: 291, componentMatched: 291,
      seamMatched: 291, rawRgbMatched: 291, framebufferMatched: 291,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 146, componentMatched: 146,
          seamMatched: 146, rawRgbMatched: 146, framebufferMatched: 146,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 145, componentMatched: 145,
          seamMatched: 145, rawRgbMatched: 145, framebufferMatched: 145,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["CUBONE", "BLISSEY"], sidesReversed: true,
        identitySpeciesGeometryOriginsChanged: true,
        spriteTaskResourceMatrixAllocationAndPainterOrderChanged: true,
        targetPaletteRegistersAndPresentationRngChanged: true,
        gameplayStateAndRngOpaqueUnchanged: true },
    });
    expect(first.alteredLiveControl.canonicalSeam).not.toBe(first.alteredLiveControl.changedSeam);
    expect(first.alteredLiveControl.canonicalFramebuffer).not.toBe(first.alteredLiveControl.changedFramebuffer);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
