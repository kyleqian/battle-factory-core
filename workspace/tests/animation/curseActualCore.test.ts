import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/curseActualCore.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 32 << 20 }));
describe("MOVE_CURSE actual shared-core framebuffer", () => {
  it("pins the complete 1,098-row partial and residual twice fresh", () => {
    const first = run(), second = run(); expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "curse-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_CURSE", rows: 1098,
      componentMatched: 1098, seamMatched: 1098, rawRgbMatched: 1098,
      framebufferMatched: 1096, residualPixels: 1380,
      alteredLiveControl: { sidesGeometryAllocationOrderChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true } });
    expect(first.windows).toHaveLength(4);
    expect(first.windows.map((window: Record<string, any>) => ({ window: window.window,
      framebufferMatched: window.framebufferMatched, residualPixels: window.residualPixels,
      failureDetails: window.failureDetails.map((detail: Record<string, any>) =>
        ({ age: detail.age, bounds: detail.bounds })) }))).toEqual([
      { window: "ghost-player", framebufferMatched: 372, residualPixels: 720,
        failureDetails: [{ age: 26, bounds: [0, 0, 239, 17] }] },
      { window: "ghost-opponent", framebufferMatched: 372, residualPixels: 660,
        failureDetails: [{ age: 26, bounds: [0, 0, 239, 13] }] },
      { window: "stats-player", framebufferMatched: 176, residualPixels: 0, failureDetails: [] },
      { window: "stats-opponent", framebufferMatched: 176, residualPixels: 0, failureDetails: [] },
    ]);
    expect(first.residualDiagnosis).toMatchObject({ exactRows: 1096, totalRows: 1098,
      retainedHardwareSnapshotInsufficient: true,
      resumeCondition: expect.stringContaining("VCOUNT/scanline split") });
  }, 120_000);
});
