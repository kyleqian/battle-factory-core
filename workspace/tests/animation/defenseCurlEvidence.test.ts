import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyDefenseCurlEvidence } from "../../tools/compare/defenseCurlEvidence.ts";

describe("MOVE_DEFENSE_CURL bilateral evidence checkpoint", () => {
  it("pins all complete retained rows and the new live-attacker deformation latch", () => {
    expect(verifyDefenseCurlEvidence()).toEqual({
      "player-back": { pointerRows: 100, taskRows: 51, orbRows: 42, oamPredecessor: 99, palettePredecessor: 99, matrixAgeMinusTwo: 98, gameplayRngTransitions: 0, animationRngTransitions: 99 },
      "opponent-front": { pointerRows: 100, taskRows: 51, orbRows: 42, oamPredecessor: 99, palettePredecessor: 99, matrixAgeMinusTwo: 98, gameplayRngTransitions: 0, animationRngTransitions: 99 },
    });
  });

  it("reproduces the ECLIPSING_ORB source asset byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "defense-curl-assets-"));
    const output = join(scratch, "defense-curl.json");
    try {
      execFileSync("node", ["--experimental-strip-types", "tools/compare/extractDefenseCurlAssets.ts", "--out", output], { cwd: resolve(new URL("../..", import.meta.url).pathname) });
      expect(readFileSync(output)).toEqual(readFileSync(new URL("../../src/animation/assets/defense-curl.json", import.meta.url)));
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
