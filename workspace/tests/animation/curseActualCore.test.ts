import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/curseActualCore.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 32 << 20 }));
describe("MOVE_CURSE actual shared-core framebuffer", () => {
  it("pins all 1,098 rows exact twice fresh with direct scanout timing", () => {
    const first = run(), second = run(); expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "curse-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_CURSE", rows: 1098,
      componentMatched: 1098, seamMatched: 1098, rawRgbMatched: 1098,
      framebufferMatched: 1098, residualPixels: 0,
      alteredLiveControl: { sidesGeometryAllocationOrderChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true } });
    expect(first.windows).toHaveLength(4);
    expect(first.windows.map((window: Record<string, any>) => ({ window: window.window,
      framebufferMatched: window.framebufferMatched, residualPixels: window.residualPixels,
      transfers: window.paletteScanoutTransfers, failures: window.failures }))).toEqual([
      { window: "ghost-player", framebufferMatched: 373, residualPixels: 0,
        transfers: [{ age: 26, vcount: 17, inHBlank: true, firstPostTransferScanline: 18 }], failures: [] },
      { window: "ghost-opponent", framebufferMatched: 373, residualPixels: 0,
        transfers: [{ age: 26, vcount: 14, inHBlank: false, firstPostTransferScanline: 14 }], failures: [] },
      { window: "stats-player", framebufferMatched: 176, residualPixels: 0, transfers: [], failures: [] },
      { window: "stats-opponent", framebufferMatched: 176, residualPixels: 0, transfers: [], failures: [] },
    ]);
    expect(first.closure).toEqual({ exactRows: 1098, totalRows: 1098,
      sourceTimedPaletteScanout: true, coordinateOrColorFit: false,
      directTimingFixture: "tools/compare/fixtures/curse-palette-transfer-timing.json" });
  }, 120_000);
});
