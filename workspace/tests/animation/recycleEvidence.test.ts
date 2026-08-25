import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { verifyRecycleEvidence } from "../../tools/compare/recycleEvidence.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_RECYCLE legal bilateral production presentation", () => {
  it("re-extracts the pinned 64x64 ANIM_TAG_RECYCLE art byte-for-byte", () => {
    const scratch = createScratchDir("recycle-assets-");
    const output = `${scratch}/recycle.json`;
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractRecycleAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(readFileSync(
      "src/animation/assets/recycle.json",
    ));
  });

  it("pins both complete 203-row windows, latches, and legal staging", () => {
    expect(verifyRecycleEvidence()).toEqual({
      "player-back": {
        pointerRows: 203,
        arrowRows: 138,
        blendTaskRows: 47,
        oamPredecessor: 202,
        palettePredecessor: 202,
        matrixPredecessor: 202,
        freshAffinePaintAge: 11,
        gameplayRngTransitions: 0,
        animationRngTransitions: 200,
      },
      "opponent-front": {
        pointerRows: 203,
        arrowRows: 138,
        blendTaskRows: 47,
        oamPredecessor: 202,
        palettePredecessor: 202,
        matrixPredecessor: 202,
        freshAffinePaintAge: 11,
        gameplayRngTransitions: 0,
        animationRngTransitions: 200,
      },
    });
  });

  it("replays every retained component row through the source-relative reducer and typed seam", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/recycleReducerAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      schema: "recycle-reducer-audit/v1",
      framebufferCompared: false,
      "player-back": {
        reducerRows: 203,
        typedSeamRows: 203,
        lifecycle: { creates: 1, destroys: 1, arrowRows: 138, blendTaskRows: 47 },
        cleanup: { age: 202, active: false, sprite: null, resources: 0 },
      },
      "opponent-front": {
        reducerRows: 203,
        typedSeamRows: 203,
        lifecycle: { creates: 1, destroys: 1, arrowRows: 138, blendTaskRows: 47 },
        cleanup: { age: 202, active: false, sprite: null, resources: 0 },
      },
    });
  });

  it("promotes Recycle alone and fulfills its non-exclusive arrow track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_RECYCLE")).toMatchObject({
      status: "exact",
    });
    expect(coverage.componentTracks.find((track: any) => track.id === "recycle-arrow")).toMatchObject({
      id: "recycle-arrow",
      components: ["asset:ANIM_TAG_RECYCLE", "sprite:gRecycleSpriteTemplate"],
      representatives: ["MOVE_RECYCLE"],
      fulfilled: true,
      goal: expect.stringContaining("FULFILLED"),
    });
  });
});
