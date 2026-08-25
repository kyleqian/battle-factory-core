import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyMeanLookEvidence } from "../../tools/compare/meanLookEvidence.ts";

describe("MOVE_MEAN_LOOK bilateral evidence checkpoint", () => {
  it("replays every retained source/state/latch/RGB row for the exact promotion", () => {
    expect(verifyMeanLookEvidence()).toEqual({
      "player-back": { pointerRows: 171, eyeRows: 159, hiddenRows: 11, wobbleRows: 16, oamPredecessor: 170, matrixPredecessor: 170, palettePredecessor: 169, gameplayRngTransitions: 0, animationRngTransitions: 168 },
      "opponent-front": { pointerRows: 171, eyeRows: 159, hiddenRows: 11, wobbleRows: 16, oamPredecessor: 170, matrixPredecessor: 170, palettePredecessor: 169, gameplayRngTransitions: 0, animationRngTransitions: 168 },
    });
  });
  it("re-extracts the source EYE art and palette byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "mean-look-assets-")); const output = join(scratch, "mean-look.json");
    try { execFileSync("node", ["--experimental-strip-types", "tools/compare/extractMeanLookAssets.ts", "--out", output], { cwd: resolve(new URL("../..", import.meta.url).pathname) }); expect(readFileSync(output)).toEqual(readFileSync(new URL("../../src/animation/assets/mean-look.json", import.meta.url))); }
    finally { rmSync(scratch, { recursive: true, force: true }); }
  });
});
