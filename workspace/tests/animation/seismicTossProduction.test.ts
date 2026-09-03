import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(new URL("../..", import.meta.url).pathname);
const inspect = (): any => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/seismicTossFramebuffer.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

describe("MOVE_SEISMIC_TOSS Medium production body", () => {
  it("extracts BG_IN_AIR deterministically", () => {
    const output = execFileSync("mktemp", ["-d"], { encoding: "utf8" }).trim() + "/asset.json";
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractSeismicTossAssets.ts", "--out", output], { cwd: root });
    expect(readFileSync(output)).toEqual(readFileSync(resolve(root,
      "src/animation/assets/seismic-toss.json")));
  });

  it("matches every component row twice and measures the bounded framebuffer remainder", () => {
    const result = inspect(), repeat = inspect();
    expect(result.comparisons.map((item: any) => [item.totalRows, item.componentExactRows]))
      .toEqual([[228, 228], [228, 228]]);
    expect(result.comparisons.map((item: any) => [item.zeroRows, item.residualPixels,
      item.peakResidualPixels])).toEqual([[0, 628763, 3128], [0, 438889, 2293]]);
    expect(repeat).toEqual(result);
    expect(result.alteredControl.baseFramebufferSha256)
      .not.toBe(result.alteredControl.alteredFramebufferSha256);
    expect(new Set(result.alteredControl.allocator.map((row: number[]) => row[0])).size)
      .toBeGreaterThan(4);
  });
});
