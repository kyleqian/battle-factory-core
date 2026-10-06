import { describe, expect, it } from "vitest";
import { rolloutAtAge } from "../../src/animation/rollout.ts";
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
  it("declines a missing counter and an out-of-range counter; Defense Curl power (30 << counter, doubled) is live", () => {
    expect(liveMoveAnimationDuration(request(undefined, 30))).toBeNull();
    expect(liveMoveAnimationDuration(request(6, 960))).toBeNull();
    [167, 167, 161, 153].forEach((rows, i) => {
      expect(liveMoveAnimationDuration(request(i + 1, 60 << i))).toBe(rows);
    });
  });
  it("shake amplitude is clamp(floor(gAnimMovePower / 12), 1, 16); the plain ladder keeps 2/5/10/16/16", () => {
    const state = (counter: 1 | 2 | 3 | 4 | 5, movePower?: number) => rolloutAtAge(0, counter, {
      side: "player", attackerStart: { x: 0, y: 0 }, targetEnd: { x: 0, y: 0 }, attackerSpriteSlot: 6, targetSpriteSlot: 8,
      ...(movePower === undefined ? {} : { movePower }),
    }).shakeAmplitude;
    expect(([1, 2, 3, 4, 5] as const).map((c) => state(c))).toEqual([2, 5, 10, 16, 16]);
    expect(([1, 2, 3, 4, 5] as const).map((c) => state(c, 30 << (c - 1)))).toEqual([2, 5, 10, 16, 16]);
    expect(([1, 2, 3, 4] as const).map((c) => state(c, 60 << (c - 1)))).toEqual([5, 10, 16, 16]);
    expect(state(1, 1)).toBe(1);
  });
  it("parses the optional seventh MOVE_ANIMATION argument only", () => {
    expect(battleMoveAnimationRequest(0, 1, ["205", "0", "30", "5", "70", "0", "3"]).rolloutCounter).toBe(3);
    expect(battleMoveAnimationRequest(0, 1, ["33", "0", "35", "5", "70", "0"]).rolloutCounter).toBeUndefined();
    expect(() => battleMoveAnimationRequest(0, 1, ["205", "0", "30", "5", "70", "0", "3", "1"])).toThrow();
  });
});
