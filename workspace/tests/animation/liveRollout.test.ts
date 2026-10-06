import { describe, expect, it } from "vitest";
import { battleMoveAnimationRequest, type BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";

// docs/rollout-endeavor-prep.md s0.1 / next-adapters-prep11 ROLLOUT: bodies by request.rolloutCounter. Dense framebuffer
// proofs: tools/integration/fixtures/rollout-live/*.json (receipt tools/integration/fixtures/rollout-live-receipt.json).
const request = (counter: number | undefined, power: number): BattleMoveAnimationRequest => ({
  moveId: 205, attacker: 0, target: 1, turn: 0, power, damage: 10, friendship: 70, multihit: 0,
  ...(counter === undefined ? {} : { rolloutCounter: counter }),
});

describe("live Rollout adapter", () => {
  it("registers the move with a row-0 shadow row and one duration per counter body", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(205);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[205]).toBe(0);
    [167, 167, 161, 153, 145].forEach((rows, i) => {
      expect(liveMoveAnimationDuration(request(i + 1, 30 << i))).toBe(rows);
    });
  });
  it("declines a missing counter, an out-of-range counter and Defense Curl power", () => {
    expect(liveMoveAnimationDuration(request(undefined, 30))).toBeNull();
    expect(liveMoveAnimationDuration(request(6, 960))).toBeNull();
    expect(liveMoveAnimationDuration(request(1, 60))).toBeNull();
  });
  it("parses the optional seventh MOVE_ANIMATION argument only", () => {
    expect(battleMoveAnimationRequest(0, 1, ["205", "0", "30", "5", "70", "0", "3"]).rolloutCounter).toBe(3);
    expect(battleMoveAnimationRequest(0, 1, ["33", "0", "35", "5", "70", "0"]).rolloutCounter).toBeUndefined();
    expect(() => battleMoveAnimationRequest(0, 1, ["205", "0", "30", "5", "70", "0", "3", "1"])).toThrow();
  });
});
