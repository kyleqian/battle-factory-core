// apx217 (docs/finish-plan.md Phase 2; src/engine/liveMovePlayback.ts): approximate promotion of class "transform". A body while either
// battler is shown transformed (trf174's liveTransformedBattlerDeclines) is drawn from the field art — the copied species' picture,
// corner, elevation and transform palette — with its own live duration; the Transform body itself draws outside its proven picture
// scope (shiny attacker, SPINDA / CASTFORM, a transformed battler). Both classify approx:transform. A Transform at itself or with a
// Substitute doll still holds the static field under its own reason.
// Census battles (lsd194Census.ts input loop) through the production live renderer: tools/integration/apx217TransformStrips.ts.
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField, BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import { LIVE_MOVE_APPROXIMATE_POLICY, liveMovePlaybackClassification } from "../src/engine/liveMovePlayback.ts";
import {
  LIVE_TRANSFORM_MOVE_ID, LIVE_TRANSFORM_ROWS, liveTransformBodyDeclineReason, liveTransformDeclineReason, liveTransformedBattlerUnproven,
} from "../src/engine/liveTransform.ts";
import { apx217Strip } from "../tools/integration/apx217TransformStrips.ts";

const mon = (species: number, battler: 0 | 1, extra: object = {}) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const, personality: 0,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0, ...extra,
});
// DITTO (132) <-> SLOWBRO (80).
const field = (player: object = {}, opponent: object = {}): BattleResolutionDisplayedField =>
  ({ player: mon(132, 0, player), opponent: mon(80, 1, opponent) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra }) as BattleMoveAnimationRequest;
const command = (animation: BattleMoveAnimationRequest) => Object.freeze({
  type: "move-animation", eventSequence: 1, battler: animation.attacker, animation, timing: Object.freeze({ minimumFrames: 23 }),
}) as BattleResolutionPresentationCommand;
const transformed = field({ transform: { species: 80, personality: 0 } });

describe("apx217: approximate transform", () => {
  it("the policy promotes transform", () => {
    expect(LIVE_MOVE_APPROXIMATE_POLICY.transform).toBe("approximate");
  });

  it("a body while a battler is shown transformed: its own live duration, classified approx", () => {
    for (const a of [0, 1] as const) {
      const headbutt = req(29, a);
      expect(liveTransformedBattlerUnproven(headbutt, transformed)).toBe(true);
      expect(liveMoveAnimationDuration(headbutt, transformed)).toBe(liveMoveAnimationDuration(headbutt, field()));
      expect(battleResolutionCommandDuration(command(headbutt), transformed)).toBe(battleResolutionCommandDuration(command(headbutt), field()));
      expect(liveMovePlaybackClassification(command(headbutt), transformed)).toEqual({ kind: "approximate", reason: "transform" });
      expect(liveMovePlaybackClassification(command(headbutt), field())).toEqual({ kind: "live" });
    }
    // A body without a case keeps its own reason (the transform gate no longer masks it).
    expect(liveMovePlaybackClassification(command(req(1, 0)), transformed)).toEqual({ kind: "static", reason: "other:no-adapter-unscripted" });
  });

  it("the Transform body outside its proven picture scope draws with its own length; self target / doll still decline", () => {
    const transform = req(LIVE_TRANSFORM_MOVE_ID, 0);
    expect(liveMovePlaybackClassification(command(transform), field())).toEqual({ kind: "live" });
    const shiny = (((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) << 16) >>> 0;
    for (const f of [field({ personality: shiny }), field({}, { species: 308 }), field({}, { transform: { species: 95, personality: 0 } })]) {
      expect(liveTransformDeclineReason(transform, f)).not.toBeNull();
      expect(liveTransformBodyDeclineReason(transform, f)).toBeNull();
      expect(liveMoveAnimationDuration(transform, f)).toBe(LIVE_TRANSFORM_ROWS);
      expect(liveMovePlaybackClassification(command(transform), f)).toEqual({ kind: "approximate", reason: "transform" });
    }
    expect(liveMovePlaybackClassification(command({ ...transform, target: 0 }), field()))
      .toEqual({ kind: "static", reason: "other:transform-self-target" });
    expect(liveMoveAnimationDuration(transform, field({}, { substituteDoll: true }))).toBeNull();
  });

  it.each([
    // census seed 197: CHANSEY (player) shown transformed into MANTINE; Bubblebeam both ways, Icy Wind from the opponent.
    ["Bubblebeam 61 player (transformed attacker, census seed 197)", 197, 61, 0, 244],
    ["Icy Wind 196 opponent (transformed target, census seed 197)", 197, 196, 1, 290],
  ])("%s: draws non-static rows, classifies approx, deterministic on replay", (_name, seed, moveId, attacker, rows) => {
    const first = apx217Strip(seed, moveId, attacker)!;
    expect(first).not.toBeNull();
    expect(first.code).toBe("approx:transform");
    expect(first.rows).toBe(rows);
    expect(first.nonStaticRows).toBeGreaterThan(rows * 0.85);
    const again = apx217Strip(seed, moveId, attacker)!;
    expect(again.rows).toBe(first.rows);
    expect(again.nonStaticRows).toBe(first.nonStaticRows);
    expect(again.sha256).toBe(first.sha256);
  }, 240000);
});
