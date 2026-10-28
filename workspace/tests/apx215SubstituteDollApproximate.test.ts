// apx215 (docs/finish-plan.md Phase 2; src/engine/liveMovePlayback.ts): the first approximate promotion, class "substitute-doll". A body
// outside the proven Substitute-doll cells is drawn with the doll in place of the battler (a defender doll: the body on the doll; a subbed
// attacker: SUBSTITUTE_TO_MON / body / MON_TO_SUBSTITUTE, liveSubstituteSwapApplies) and classified approx:substitute-doll.
// Census battles (lsd194Census.ts input loop) through the production live renderer: tools/integration/apx215SubstituteDollStrips.ts.
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField, BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration, liveMoveSubstituteDollUnproven } from "../src/engine/liveMoveAnimation.ts";
import { LIVE_MOVE_APPROXIMATE_POLICY, liveMovePlaybackClassification } from "../src/engine/liveMovePlayback.ts";
import { liveSubstituteSwapApplies, liveSubstituteSwapProven, substituteSwapCompositeDuration } from "../src/engine/liveSubstituteSwap.ts";
import { apx215SubstituteDollStrip } from "../tools/integration/apx215SubstituteDollStrips.ts";

const mon = (species: number, battler: 0 | 1, doll = false) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0, ...(doll ? { substituteDoll: true as const } : {}),
});
// PERSIAN (53) <-> SLOWBRO (80).
const field = (playerDoll: boolean, opponentDoll: boolean): BattleResolutionDisplayedField =>
  ({ player: mon(53, 0, playerDoll), opponent: mon(80, 1, opponentDoll) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra }) as BattleMoveAnimationRequest;
const command = (animation: BattleMoveAnimationRequest) => Object.freeze({
  type: "move-animation", eventSequence: 1, battler: animation.attacker, animation, timing: Object.freeze({ minimumFrames: 23 }),
}) as BattleResolutionPresentationCommand;

describe("apx215: approximate substitute-doll", () => {
  it("the policy promotes substitute-doll (apx217: and transform; apx219: sprite-order-unknown, allocator-unknown)", () => {
    expect(Object.entries(LIVE_MOVE_APPROXIMATE_POLICY).filter(([, p]) => p === "approximate").map(([c]) => c))
      // apx221 promotes further classes (tests/apx221*.test.ts pin the full list); these four stay approximate.
      .toEqual(expect.arrayContaining(["substitute-doll", "sprite-order-unknown", "allocator-unknown", "transform"]));
  });

  it("duration = the body's own live duration (defender doll) / the swap composite around it (subbed attacker); classified approx", () => {
    // Headbutt (29) at a defender doll: no proven defender cell; the doll-free body length.
    const plain = liveMoveAnimationDuration(req(29, 0), field(false, false))!;
    expect(liveMoveSubstituteDollUnproven(req(29, 0), field(false, true))).toBe(true);
    expect(liveMoveAnimationDuration(req(29, 0), field(false, true))).toBe(plain);
    expect(battleResolutionCommandDuration(command(req(29, 0)), field(false, true))).toBe(battleResolutionCommandDuration(command(req(29, 0)), field(false, false)));
    expect(liveMovePlaybackClassification(command(req(29, 0)), field(false, true))).toEqual({ kind: "approximate", reason: "substitute-doll" });
    // Solar Beam's fire turn by a subbed attacker (proven: the charge turn only): the swaps around the doll-free fire body.
    for (const a of [0, 1] as const) {
      const side = a === 0 ? "player" : "opponent";
      const fire = req(76, a, { turn: 1 });
      const attackerDoll = field(a === 0, a === 1);
      expect(liveSubstituteSwapProven(fire, attackerDoll)).toBe(false);
      expect(liveSubstituteSwapApplies(fire, attackerDoll)).toBe(true);
      expect(liveMoveAnimationDuration(fire, attackerDoll)).toBe(substituteSwapCompositeDuration(side, liveMoveAnimationDuration(fire, field(false, false))!));
      expect(liveMovePlaybackClassification(command(fire), attackerDoll)).toEqual({ kind: "approximate", reason: "substitute-doll" });
    }
    // Proven cells stay live (exact); a body without a doll is untouched.
    expect(liveMovePlaybackClassification(command(req(29, 0)), field(true, false))).toEqual({ kind: "live" });
    expect(liveMovePlaybackClassification(command(req(34, 0)), field(false, true))).toEqual({ kind: "live" });
    expect(liveMovePlaybackClassification(command(req(29, 0)), field(false, false))).toEqual({ kind: "live" });
    // A multi-hit body's earlier hit by a subbed attacker still holds the static field, under its own reason.
    expect(liveMoveAnimationDuration(req(29, 0, { multihit: 2 }), field(true, false))).toBeNull();
    expect(liveMovePlaybackClassification(command(req(29, 0, { multihit: 2 })), field(true, false)))
      .toEqual({ kind: "static", reason: "other:substitute-earlier-hit" });
  });

  it.each([
    // census seed 17: FORRETRESS (player) Explosion at JYNX's doll (defender doll, no proven Explosion defender cell).
    ["Explosion 153 player at a defender doll (census seed 17)", 17, 153, 0, 219],
    // census seed 587: CRADILY (opponent) Solar Beam fire turn from behind its doll (swap composite around the body).
    ["Solar Beam 76 opponent fire turn from behind the doll (census seed 587)", 587, 76, 1, 241],
  ])("%s: draws non-static rows, classifies approx, deterministic on replay", (_name, seed, moveId, attacker, rows) => {
    const first = apx215SubstituteDollStrip(seed, moveId, attacker)!;
    expect(first).not.toBeNull();
    expect(first.code).toBe("approx:substitute-doll");
    expect(first.rows).toBe(rows);
    // The static hold would equal renderBattleResolutionSceneOffView on every row; the approximate body differs on almost all of them.
    expect(first.nonStaticRows).toBeGreaterThan(rows * 0.9);
    const again = apx215SubstituteDollStrip(seed, moveId, attacker)!;
    expect(again.rows).toBe(first.rows);
    expect(again.nonStaticRows).toBe(first.nonStaticRows);
    expect(again.sha256).toBe(first.sha256);
  }, 240000);
});
