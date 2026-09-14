import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/machPunchActualCore.ts", "--require-exact",
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_MACH_PUNCH live Scene-ON compositor", () => {
  it("matches all 221 bilateral rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "mach-punch-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_MACH_PUNCH", rows: 221, componentMatched: 221,
      seamMatched: 221, rawRgbMatched: 221, framebufferMatched: 221,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 111, componentMatched: 111,
          seamMatched: 111, rawRgbMatched: 111, framebufferMatched: 111,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 110, componentMatched: 110,
          seamMatched: 110, rawRgbMatched: 110, framebufferMatched: 110,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["MACHOKE", "BLISSEY"], sidesReversed: true,
        identitySpeciesGeometryOriginsChanged: true,
        spriteTaskResourceMatrixAllocationAndPainterOrderChanged: true,
        registersAndPresentationRngChanged: true,
        gameplayStateAndRngOpaqueUnchanged: true },
    });
    expect(first.alteredLiveControl.canonicalSeam).not.toBe(first.alteredLiveControl.changedSeam);
    expect(first.alteredLiveControl.canonicalFramebuffer).not.toBe(first.alteredLiveControl.changedFramebuffer);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
