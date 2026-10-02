import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/iceBallActualCore.ts", "--require-exact"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_ICE_BALL actual shared-core framebuffer", () => {
  it("matches all ten complete natural counter windows twice fresh", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "ice-ball-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_ICE_BALL", rows: 872,
      componentMatched: 872, seamMatched: 872, rawRgbMatched: 872,
      framebufferMatched: 872, residualPixels: 0,
      alteredLiveControl: { sideGeometryPresentationRngAllocationChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true } });
    expect(first.windows).toHaveLength(10);
    expect(first.windows.every((window: Record<string, any>) =>
      window.framebufferMatched === window.rows && window.residualPixels === 0)).toBe(true);
  }, 120_000);
});
