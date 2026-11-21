import { describe, expect, it } from "vitest";
import { diffRuns, summaryDiffLines } from "../tools/compare/diffRuns.ts";

const caps = (pixels: (number | null)[], start = 10, step = 1) =>
  pixels.map((diffPixels, index) => ({ frame: start + index * step, diffPixels }));

describe("compare --summary digest (cln10)", () => {
  it("prints nothing for an all-match trace", () => {
    expect(summaryDiffLines(caps([0, 0, 0]))).toEqual([]);
  });

  it("reports the first differing frame and the capture count per contiguous run", () => {
    const lines = summaryDiffLines(caps([0, 0, 5, 9, 3, 0, 0, 7, 0, 4]));
    expect(lines).toEqual([
      "first diff: frame 12 (5px)",
      "diff runs: 3 (5 of 10 captures differ)",
      "  12..14  3 captures  max 9px",
      "  17..17  1 capture  max 7px",
      "  19..19  1 capture  max 4px",
    ]);
  });

  it("runs follow capture order, so a sparse capture list still forms one run", () => {
    expect(diffRuns(caps([2, 3, 0, 4], 100, 2))).toEqual([
      { start: 100, end: 102, captures: 2, maxPixels: 3 },
      { start: 106, end: 106, captures: 1, maxPixels: 4 },
    ]);
  });

  it("counts a capture missing from the app as a differing one and caps the run list", () => {
    expect(summaryDiffLines(caps([null, 0]))[0]).toBe("first diff: frame 10 (MISSING from app)");
    const many = caps(Array.from({ length: 30 }, (_, index) => (index % 2 === 0 ? 1 : 0)));
    const lines = summaryDiffLines(many);
    expect(lines).toHaveLength(2 + 10 + 1);
    expect(lines[lines.length - 1]).toBe("  (+5 more runs; full list in manifest.json)");
  });
});
