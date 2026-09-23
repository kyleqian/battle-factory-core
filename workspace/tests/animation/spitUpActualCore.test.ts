import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/spitUpActualCore.ts", "--require-exact"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_SPIT_UP actual-core framebuffer", () => {
  it("matches all six complete windows in two fresh processes with no residual pixels", () => {
    const first = run(); const second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "spit-up-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_SPIT_UP", rows: 650,
      componentMatched: 650, seamMatched: 650, rawRgbMatched: 650,
      framebufferMatched: 650, residualPixels: 0,
      alteredLiveControl: { sidesGeometryAllocationMatricesOrderChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true } });
    expect(first.windows).toHaveLength(6);
    expect(first.windows.every((window: Record<string, any>) =>
      window.framebufferMatched === window.rows && window.residualPixels === 0)).toBe(true);
  }, 120_000);
});
