// apx210 (docs/finish-plan.md Phase 2; src/engine/liveMovePlayback.ts): every move-animation command is classified live / approximate(reason)
// / static(reason) / pause; each decline path names one reason code. apx215 promoted "substitute-doll" to approximate
// (tests/apx215SubstituteDollApproximate.test.ts), apx217 "transform" (tests/apx217TransformApproximate.test.ts); every other class
// stays static.
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField, BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";
import {
  battleResolutionCommandDuration, type BattleResolutionPresentationRenderView,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../src/engine/liveMoveAnimation.ts";
import {
  LIVE_MOVE_APPROXIMATE_POLICY, LIVE_MOVE_DECLINE_CLASSES, liveMoveDeclineClassOf, liveMovePlaybackClassification, liveMovePlaybackCode,
} from "../src/engine/liveMovePlayback.ts";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };

const mon = (name: string, battler: 0 | 1, extra: object = {}) => ({
  species: speciesStats.species.find((s) => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
  hp: 100, maxHP: 120, gender: "male", status: "none", side: battler === 0 ? "player" : "trainer", battler, personality: 0, otId: 0,
  partyIndex: 0, moveIds: [0, 0, 0, 0], currentPP: [0, 0, 0, 0], ppBonuses: 0, ...extra,
});
const fieldOf = (player: object = {}, opponent: object = {}, names: [string, string] = ["SWELLOW", "SHUCKLE"]) =>
  ({ player: mon(names[0], 0, player), opponent: mon(names[1], 1, opponent) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1 = 0, extra: object = {}) =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 40, damage: 0, friendship: 70, multihit: 0, ...extra }) as BattleMoveAnimationRequest;
const command = (animation?: BattleMoveAnimationRequest) => Object.freeze({
  type: "move-animation", eventSequence: 1, battler: animation?.attacker ?? 0, ...(animation ? { animation } : {}),
  timing: Object.freeze({ minimumFrames: 23 }),
}) as BattleResolutionPresentationCommand;
/** The render view production builds for the command's first row (only the fields the live renderer's decision reads). */
const viewOf = (request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField, effect: object = {}, opponentSprite = true) =>
  ({
    field, effect: { type: "move", request, age: 0, ...effect },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: opponentSprite, healthbox: true } },
  }) as unknown as BattleResolutionPresentationRenderView;
const classify = (request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField, view?: BattleResolutionPresentationRenderView) =>
  liveMovePlaybackClassification(command(request), field, view);

describe("apx210: decline reasons", () => {
  it("duration gates (a pure function of (command, field)): an unscripted no-adapter move, an unproven turn -> static, hold unchanged", () => {
    const cases: [BattleMoveAnimationRequest, BattleResolutionDisplayedField, string][] = [
      [req(1), fieldOf(), "other:no-adapter-unscripted"], // Pound: no liveMoveAnimationDuration case and no script body (approxScript.ts)
      [req(256), fieldOf(), "other:turn-0"], // Swallow at stockpile 0: a duration only at another turn
    ];
    for (const [request, field, reason] of cases) {
      expect(liveMoveAnimationDuration(request, field)).toBeNull();
      const c = command(request);
      expect(liveMovePlaybackClassification(c, field)).toEqual({ kind: "static", reason });
      expect(liveMovePlaybackCode(liveMovePlaybackClassification(c, field)!)).toBe(`static:${reason}`);
      // Still the static hold: battleResolutionCommandDuration's decline length (seGate 0 + minimumFrames).
      expect(battleResolutionCommandDuration(c, field)).toBe(23);
    }
    // apx217: Headbutt with a transformed battler on the field (trf174's gate) is drawn approximately; without it, live.
    const transformed = fieldOf({}, { transform: { species: 132 } });
    expect(liveMoveAnimationDuration(req(29), transformed)).toBe(liveMoveAnimationDuration(req(29), fieldOf()));
    expect(classify(req(29), transformed)).toEqual({ kind: "approximate", reason: "transform" });
    expect(classify(req(29), fieldOf())).toEqual({ kind: "live" });
  });

  it("presentation gates (the render view): apx219 / apx221 / apx222: sprite-order-unknown, castform-form, endeavor-power, hidden-target -> approximate, body drawn", () => {
    const plain = fieldOf();
    const castform = fieldOf({}, { castformForm: 1 }, ["SWELLOW", "CASTFORM"]);
    const cases: [BattleMoveAnimationRequest, BattleResolutionDisplayedField, BattleResolutionPresentationRenderView, string][] = [
      [req(202), plain, viewOf(req(202), plain), "sprite-order-unknown"], // Giga Drain without an order lend
      [req(283), plain, viewOf(req(283), plain, { battlerX2Input: { zeroed: [], staleMovePowerUnknown: true } }), "endeavor-power"],
      [req(98), castform, viewOf(req(98), castform), "castform-form"], // Quick Attack at a sun-form CASTFORM: 98:at:1 not proven
      [req(327), plain, viewOf(req(327), plain, {}, false), "hidden-target"], // Sky Uppercut at a hidden (Fly) target
    ];
    for (const [request, field, view, reason] of cases) {
      // The duration gate passes: only the field-only classification says live; the view names the presentation gate.
      expect(liveMoveAnimationDuration(request, field)).not.toBeNull();
      expect(classify(request, field)).toEqual({ kind: "live" });
      expect(classify(request, field, view)).toEqual({ kind: "approximate", reason });
      const e = (view.effect as { battlerX2Input?: never });
      const body = liveMoveAnimationPresentation(request, field, 0, undefined, undefined, undefined, undefined, e.battlerX2Input,
        reason === "hidden-target" ? { player: false, opponent: true } : undefined);
      expect(body).not.toBeNull();
    }
    // Endeavor with a known stale power is live; the plain Quick Attack is live.
    expect(classify(req(283), plain, viewOf(req(283), plain))).toEqual({ kind: "live" });
    expect(classify(req(98), plain, viewOf(req(98), plain))).toEqual({ kind: "live" });
  });

  it("no body request is a pause; other commands are unclassified", () => {
    expect(liveMovePlaybackClassification(command(), fieldOf())).toEqual({ kind: "pause" });
    expect(liveMovePlaybackCode({ kind: "pause" })).toBe("pause");
    expect(liveMovePlaybackClassification({ type: "turn-end", timing: { minimumFrames: 1 } } as never, fieldOf())).toBeNull();
  });
});

describe("apx210: the approximate hook", () => {
  it("is static except apx215's substitute-doll, apx217's transform, apx219's sprite-order-unknown / allocator-unknown and apx221's and apx222's classes", () => {
    const promoted = ["substitute-doll", "transform", "sprite-order-unknown", "allocator-unknown", "castform-form", "endeavor-power", "hidden-target", "no-adapter", "turn-0"];
    for (const c of LIVE_MOVE_DECLINE_CLASSES) {
      expect(LIVE_MOVE_APPROXIMATE_POLICY[c]).toBe(promoted.includes(c) ? "approximate" : "static");
    }
    expect(liveMoveDeclineClassOf("other:shiny")).toBe("other");
    expect(liveMoveDeclineClassOf("substitute-doll")).toBe("substitute-doll");
  });

  it("a policy promoting ONE class reclassifies only that class", () => {
    const policy = { ...LIVE_MOVE_APPROXIMATE_POLICY, "no-adapter": "static" as const };
    // apx222: Peck's script body is approximate under the shipped policy; with the class demoted it holds static again.
    expect(liveMovePlaybackClassification(command(req(64)), fieldOf())).toEqual({ kind: "approximate", reason: "no-adapter" });
    expect(liveMovePlaybackClassification(command(req(64)), fieldOf(), undefined, policy)).toEqual({ kind: "static", reason: "no-adapter" });
    // apx222: Curse's Ghost branch (turn 0) is the script-built CURSE_GHOST body, approximate "turn-0"; the Stats branch (turn 1) is live.
    expect(liveMovePlaybackClassification(command(req(174)), fieldOf())).toEqual({ kind: "approximate", reason: "turn-0" });
    expect(liveMovePlaybackClassification(command(req(174, 0, { turn: 1 })), fieldOf())).toEqual({ kind: "live" });
    expect(liveMovePlaybackClassification(command(req(174)), fieldOf(), undefined, { ...policy, "turn-0": "static" })).toEqual({ kind: "static", reason: "turn-0" });
    // Headbutt has no proven defender-doll cell (LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS): approximate under the shipped policy.
    const doll = fieldOf({}, { substituteDoll: true });
    const promoted = liveMovePlaybackClassification(command(req(29)), doll)!;
    expect(promoted).toEqual({ kind: "approximate", reason: "substitute-doll" });
    expect(liveMovePlaybackCode(promoted)).toBe("approx:substitute-doll");
  });
});
