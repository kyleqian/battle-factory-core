import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/furyCutterActualCore.ts", "--require-exact"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_FURY_CUTTER actual-core framebuffer", () => {
  it("matches all eight complete counter windows in two fresh processes", () => {
    const first = run(); const second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "fury-cutter-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_FURY_CUTTER", rows: 344,
      componentMatched: 344, seamMatched: 344, rawRgbMatched: 344,
      framebufferMatched: 344, residualPixels: 0,
      alteredLiveControl: { sidesGeometryAllocationOrderChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true } });
    expect(first.windows).toHaveLength(8);
    expect(first.windows.every((window: Record<string, any>) =>
      window.framebufferMatched === window.rows && window.residualPixels === 0)).toBe(true);
  }, 60_000);
});
