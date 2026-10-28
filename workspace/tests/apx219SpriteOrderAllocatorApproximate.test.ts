// apx219 (docs/finish-plan.md Phase 2; src/engine/liveMovePlayback.ts): approximate promotion of classes "sprite-order-unknown" and
// "allocator-unknown". A body whose only decline is unknown sprite-order / allocator history is drawn with the known-entry first-action
// input (liveMoveAnimationPresentation's fallback: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER + firstBody; the known-entry firstMove allocator
// plan) and its own live duration; classified approx:<reason>. A body with its own known input is untouched.
// Census battles (lsd194Census.ts input loop) through the production live renderer: tools/integration/apx217TransformStrips.ts --code=.
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { liveMoveAnimationPresentation, type LiveMoveDeclineSink } from "../src/engine/liveMoveAnimation.ts";
import { LIVE_MOVE_APPROXIMATE_POLICY } from "../src/engine/liveMovePlayback.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } from "../src/engine/spriteOrderProvider.ts";
import { apx217Strip } from "../tools/integration/apx217TransformStrips.ts";

const mon = (species: number, battler: 0 | 1) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const, personality: 0,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
});
// PERSIAN (53) <-> SLOWBRO (80).
const field = { player: mon(53, 0), opponent: mon(80, 1) } as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as BattleMoveAnimationRequest;
const entryOrder = Object.freeze({ known: true as const, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, firstBody: true as const });

describe("apx219: approximate sprite-order-unknown / allocator-unknown", () => {
  it("the policy promotes both classes", () => {
    expect(Object.entries(LIVE_MOVE_APPROXIMATE_POLICY).filter(([, p]) => p === "approximate").map(([c]) => c))
      // apx221 promotes further classes (tests/apx221*.test.ts pin the full list); these four stay approximate.
      .toEqual(expect.arrayContaining(["substitute-doll", "sprite-order-unknown", "allocator-unknown", "transform"]));
  });

  it("an unknown order draws the known-entry body and names the class; a known input is untouched", () => {
    // Tri Attack 161 (an order consumer): without a lend it equals the body with the known-entry first-action lend.
    for (const a of [0, 1] as const) {
      const sink: LiveMoveDeclineSink = {};
      const approx = liveMoveAnimationPresentation(req(161, a), field, 10, undefined, undefined, undefined, undefined, undefined, undefined, sink);
      expect(approx).not.toBeNull();
      expect(sink).toEqual({ approximate: "sprite-order-unknown" });
      const known: LiveMoveDeclineSink = {};
      expect(liveMoveAnimationPresentation(req(161, a), field, 10, undefined, undefined, entryOrder, undefined, undefined, undefined, known))
        .toEqual(approx);
      expect(known).toEqual({});
    }
    // Magic Coat 277 (a wall-family allocator consumer): no allocator input -> the known-entry first-move plan.
    const sink: LiveMoveDeclineSink = {};
    expect(liveMoveAnimationPresentation(req(277, 1), field, 5, undefined, undefined, undefined, undefined, undefined, undefined, sink))
      .not.toBeNull();
    expect(sink).toEqual({ approximate: "allocator-unknown" });
  });

  it.each([
    // census seed 644: Hyper Beam 63 by the player after an unknown order history (apx217 Part A gate).
    ["Hyper Beam 63 player (census seed 644)", 644, 63, 0, "approx:sprite-order-unknown", 283],
    // census seed 197: Magic Coat 277 by the opponent after an unknown allocator history.
    ["Magic Coat 277 opponent (census seed 197)", 197, 277, 1, "approx:allocator-unknown", 83],
  ])("%s: draws non-static rows, classifies approx, deterministic on replay", (_name, seed, moveId, attacker, code, rows) => {
    const first = apx217Strip(seed, moveId, attacker, code)!;
    expect(first).not.toBeNull();
    expect(first.code).toBe(code);
    // The body's own live duration (a presentation gate never changed it); most rows differ from the static hold.
    expect(first.rows).toBe(rows);
    expect(first.nonStaticRows).toBeGreaterThan(rows * 0.6);
    const again = apx217Strip(seed, moveId, attacker, code)!;
    expect(again.rows).toBe(first.rows);
    expect(again.nonStaticRows).toBe(first.nonStaticRows);
    expect(again.sha256).toBe(first.sha256);
  }, 240000);
});
