import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(new URL("../..", import.meta.url).pathname);
const inspectRazorWindFramebuffer = (): any[] => JSON.parse(execFileSync(
  process.execPath,
  ["--experimental-strip-types", "tools/compare/razorWindFramebuffer.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
));

describe("MOVE_RAZOR_WIND actual-core residual diagnostic", () => {
  it("reproduces and classifies every retained setup and unleash row", () => {
    const result = inspectRazorWindFramebuffer();
    expect(inspectRazorWindFramebuffer()).toEqual(result);
    expect(result.map(({ orientation, totalRows, zeroRows, residualPixels,
      peakResidualPixels, componentExactRows, bodies, failures }) => ({ orientation,
      totalRows, zeroRows, residualPixels, peakResidualPixels, componentExactRows,
      bodies, failures }))).toEqual([
      {
        orientation: "player-back", totalRows: 119, zeroRows: 119,
        residualPixels: 0, peakResidualPixels: 0, componentExactRows: 119,
        bodies: {
          setup: { rows: 46, zeroRows: 46, residualPixels: 0,
            peakResidualPixels: 0, componentExactRows: 46 },
          unleash: { rows: 73, zeroRows: 73, residualPixels: 0,
            peakResidualPixels: 0, componentExactRows: 73 },
        }, failures: [],
      },
      {
        orientation: "opponent-front", totalRows: 119, zeroRows: 119,
        residualPixels: 0, peakResidualPixels: 0, componentExactRows: 119,
        bodies: {
          setup: { rows: 46, zeroRows: 46, residualPixels: 0,
            peakResidualPixels: 0, componentExactRows: 46 },
          unleash: { rows: 73, zeroRows: 73, residualPixels: 0,
            peakResidualPixels: 0, componentExactRows: 73 },
        }, failures: [],
      },
    ]);
    for (const orientation of result) {
      expect(Object.values(orientation.regions).reduce((sum, count) => sum + count, 0))
        .toBe(orientation.residualPixels);
      expect(orientation.bodies.setup.rows).toBe(46);
      expect(orientation.bodies.unleash.rows).toBe(73);
      expect(orientation.failures.every((row) => row.bounds !== null
        || row.componentMismatches.length > 0)).toBe(true);
    }
  }, 30_000);
});
