import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectTriAttackAlteredControl,
  inspectTriAttackFramebuffer,
} from "../../tools/compare/triAttackFramebuffer.ts";

const root = resolve(import.meta.dirname, "../..");

describe("MOVE_TRI_ATTACK exact production presentation", () => {
  it("re-extracts its two source-owned art sheets reproducibly", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractTriAttackAssets.ts",
      "--check",
    ], { cwd: root, encoding: "utf8" });
    expect(output).toContain("Tri Attack assets match authoritative sources");
  });

  it("matches every bilateral source component and actual-core framebuffer row", () => {
    const comparisons = inspectTriAttackFramebuffer();
    expect(comparisons.map(({ orientation, totalRows, zeroRows, residualPixels,
      peakResidualPixels, componentExactRows, failures }) => ({
      orientation, totalRows, zeroRows, residualPixels, peakResidualPixels,
      componentExactRows, failureRows: failures.length,
    }))).toEqual([
      { orientation: "player-back", totalRows: 284, zeroRows: 284,
        residualPixels: 0, peakResidualPixels: 0,
        componentExactRows: 284, failureRows: 0 },
      { orientation: "opponent-front", totalRows: 284, zeroRows: 284,
        residualPixels: 0, peakResidualPixels: 0,
        componentExactRows: 284, failureRows: 0 },
    ]);
  });

  it("responds materially to live species, sides, geometry, allocator, matrices, and order", () => {
    const control = inspectTriAttackAlteredControl();
    expect(control.species).toEqual(["MAGBY", "ONIX"]);
    expect(control.sides).toEqual(["opponent", "player"]);
    expect(control.baseFramebufferSha256).not.toBe(control.alteredFramebufferSha256);
    expect(control.allocator.triangleSlot).toBe(15);
    expect(control.allocator.triangleMatrixId).toBe(11);
    expect(control.geometry.targetPictureCenter).toEqual({ x: 70, y: 89 });
  });
});
