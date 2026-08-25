import { describe, expect, it } from "vitest";
import { verifyIngrainEvidence } from "../../tools/compare/ingrainEvidence.ts";

describe("MOVE_INGRAIN bilateral evidence receipt", () => {
  it("pins complete legal first-use rows, source reducer parity, latches, RGB, and unsupported status", () => {
    expect(verifyIngrainEvidence()).toEqual({
      "player-back": {
        pointerRows: 164,
        rootRows: 155,
        orbRows: 45,
        oamPredecessor: 163,
        matrixPredecessor: 163,
        palettePredecessor: 163,
        gameplayRngTransitions: 0,
        animationRngTransitions: 163,
        registerChanges: 0,
      },
      "opponent-front": {
        pointerRows: 164,
        rootRows: 155,
        orbRows: 45,
        oamPredecessor: 163,
        matrixPredecessor: 163,
        palettePredecessor: 163,
        gameplayRngTransitions: 0,
        animationRngTransitions: 163,
        registerChanges: 0,
      },
    });
  });
});
