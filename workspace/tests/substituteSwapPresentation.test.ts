import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { LIVE_BATTLER_X2_IDLE, applyLiveBattlerX2Event } from "../src/engine/liveBattlerX2History.ts";
import {
  liveMoveAnimationDuration, liveMoveAnimationPresentation, liveMoveSubstituteDollDeclines, liveMoveSubstituteDollUnproven,
} from "../src/engine/liveMoveAnimation.ts";
import {
  LIVE_SUBSTITUTE_SWAP_BODY_IDS, liveSubstituteSwapApplies, liveSubstituteSwapProven, liveSubstituteSwapView, substituteSwapCompositeDuration, substituteSwapFrameAt, substituteSwapRows,
  substituteSwapScriptRows,
} from "../src/engine/liveSubstituteSwap.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

// S10A Substitute swaps (src/engine/liveSubstituteSwap.ts; tools/integration/fixtures/subst-swap-live-receipt.json):
// SUBSTITUTE_TO_MON / MON_TO_SUBSTITUTE around a proven body whose attacker is shown as the doll.
const mon = (species: number, battler: 0 | 1, doll = false) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0, ...(doll ? { substituteDoll: true as const } : {}),
});
const field = (playerDoll: boolean, opponentDoll: boolean): BattleResolutionDisplayedField =>
  ({ player: mon(53, 0, playerDoll), opponent: mon(80, 1, opponentDoll) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra }) as BattleMoveAnimationRequest;

describe("Substitute swap task (AnimTask_SwapMonSpriteToFromSubstitute)", () => {
  it("player: x2 -5 per row to -105, the load on row 21, back to 0 on row 42 (42 script rows; prep37 RAM rows)", () => {
    const rows = substituteSwapRows("player", true);
    expect(substituteSwapScriptRows("player")).toBe(42);
    expect(rows).toHaveLength(43);
    expect(rows.slice(0, 21).map((r) => r.x2)).toEqual(Array.from({ length: 21 }, (_, i) => -5 * (i + 1)));
    expect(rows.slice(0, 21).every((r) => r.doll)).toBe(true);
    expect(rows[21]).toEqual({ x2: -105, doll: false });
    expect(rows.slice(22, 42).map((r) => r.x2)).toEqual(Array.from({ length: 20 }, (_, i) => -100 + 5 * i));
    expect(rows[42]).toEqual({ x2: 0, doll: false });
    expect(substituteSwapRows("player", false).map((r) => r.doll)).toEqual(rows.map((r) => !r.doll));
  });
  it("opponent: x2 +5 per row to 100, the load on row 20, back to 0 on row 40 (40 script rows)", () => {
    const rows = substituteSwapRows("opponent", true);
    expect(substituteSwapScriptRows("opponent")).toBe(40);
    expect(rows.map((r) => r.x2)).toEqual([...Array.from({ length: 20 }, (_, i) => 5 * (i + 1)), 100,
      ...Array.from({ length: 19 }, (_, i) => 95 - 5 * i), 0]);
    expect(rows.findIndex((r) => !r.doll)).toBe(20);
  });
  it("composite frames: 2-row display latch, body age 0 shows the swap tail, swap-back row 0 is the body's first inactive row", () => {
    expect(substituteSwapCompositeDuration("player", 48)).toBe(48 + 85);
    expect(substituteSwapCompositeDuration("opponent", 48)).toBe(48 + 81);
    expect(substituteSwapFrameAt("player", 48, 0)).toMatchObject({ kind: "swap", x2: 0, doll: true });
    expect(substituteSwapFrameAt("player", 48, 2)).toMatchObject({ kind: "swap", x2: -5, doll: true });
    expect(substituteSwapFrameAt("player", 48, 43)).toMatchObject({ kind: "swap", x2: -5, doll: false, afterBody: false });
    expect(substituteSwapFrameAt("player", 48, 44)).toEqual({ kind: "body", age: 1 });
    expect(substituteSwapFrameAt("player", 48, 43 + 47)).toEqual({ kind: "body", age: 47 });
    expect(substituteSwapFrameAt("player", 48, 43 + 48)).toMatchObject({ kind: "swap", x2: 0, doll: false, afterBody: true });
    expect(substituteSwapFrameAt("player", 48, 132)).toMatchObject({ kind: "swap", x2: -10, doll: true });
    expect(substituteSwapFrameAt("opponent", 48, 41)).toMatchObject({ kind: "swap", x2: 5, doll: false });
    expect(substituteSwapFrameAt("opponent", 48, 42)).toEqual({ kind: "body", age: 1 });
  });
});

describe("live adapters with a Substitute doll", () => {
  // apx215 (liveMovePlayback.ts approximate "substitute-doll"): the unproven doll bodies are drawn approximately (the swaps around the body
  // for a subbed attacker, the body on the doll for a doll defender); the proven rule is liveSubstituteSwapProven /
  // liveMoveSubstituteDollUnproven. Only a multi-hit body's earlier hit still declines.
  it("a subbed ATTACKER's proven body is presented with the swaps; the defender doll and unproven bodies are approximate", () => {
    expect([29, 34, 73].every((id) => LIVE_SUBSTITUTE_SWAP_BODY_IDS.has(id))).toBe(true);
    const plain = field(false, false);
    for (const [moveId, body] of [[29, 48], [34, 107], [73, 141]] as const) {
      expect(liveMoveAnimationDuration(req(moveId, 0), plain)).toBe(body);
      expect(liveMoveAnimationDuration(req(moveId, 0), field(true, false))).toBe(body + 85);
      expect(liveMoveAnimationDuration(req(moveId, 1), field(false, true))).toBe(body + 81);
      expect(liveMoveSubstituteDollDeclines(req(moveId, 0), field(true, false))).toBe(false);
      expect(liveSubstituteSwapProven(req(moveId, 0), field(true, false))).toBe(true);
      // Defender doll (either direction): proven only for Body Slam (prep38; drawn on the doll, tests/substituteDollDefenderLive.test.ts);
      // apx215: the unproven ones draw the body on the doll at the doll-free length. Both dolls: proven never; apx215: the swaps around the
      // body on the defender's doll.
      expect(liveMoveSubstituteDollUnproven(req(moveId, 0), field(false, true))).toBe(moveId !== 34);
      expect(liveMoveSubstituteDollUnproven(req(moveId, 1), field(true, false))).toBe(moveId !== 34);
      expect(liveMoveAnimationDuration(req(moveId, 0), field(false, true))).toBe(body);
      expect(liveMoveAnimationDuration(req(moveId, 1), field(true, false))).toBe(body);
      expect(liveSubstituteSwapProven(req(moveId, 0), field(true, true))).toBe(false);
      expect(liveSubstituteSwapApplies(req(moveId, 0), field(true, true))).toBe(true);
      expect(liveMoveAnimationDuration(req(moveId, 0), field(true, true))).toBe(body + 85);
      // A multi-hit chain's non-final hit (multihit >= 2): no MON_TO_SUBSTITUTE in the source; not proven, declined (also approximately).
      expect(liveSubstituteSwapApplies(req(moveId, 0, { multihit: 2 }), field(true, false))).toBe(false);
      expect(liveMoveAnimationDuration(req(moveId, 0, { multihit: 2 }), field(true, false))).toBeNull();
    }
    // Unproven bodies while the attacker is the doll (Swagger live without the doll; prep40: pair residual): apx215, the swaps around the body.
    const swagger = liveMoveAnimationDuration(req(207, 0), plain)!;
    expect(swagger).not.toBeNull();
    expect(liveSubstituteSwapProven(req(207, 0), field(true, false))).toBe(false);
    expect(liveMoveAnimationDuration(req(207, 0), field(true, false))).toBe(swagger + 85);
    // Self-targeted requests by the doll's battler: unproven for Headbutt; apx215, the swaps around the body.
    expect(liveMoveSubstituteDollUnproven({ ...req(29, 0), target: 0 }, field(true, false))).toBe(true);
    expect(liveMoveAnimationDuration({ ...req(29, 0), target: 0 }, field(true, false))).toBe(48 + 85);
  });
  // apx215: unproven, now approximate (the swap rows and body drawn with the field art's palette).
  it("a SHINY battler is outside the proven swaps (audit 13 defect 2: the ROM shows the shiny palette, the swap rows / body art have none)", () => {
    // ROM shiny personalities of the audit's STEELIX attackers (species-audit-13/swap-personality.tsv), Factory OT 416049562.
    const SHINY_OPPONENT = 3251286175, SHINY_PLAYER = 1586573250, PLAIN = 0x12345678;
    const withPersonality = (f: BattleResolutionDisplayedField, player: number, opponent: number) =>
      ({ player: { ...f.player, personality: player }, opponent: { ...f.opponent, personality: opponent } }) as BattleResolutionDisplayedField;
    for (const [moveId, body] of [[29, 48], [34, 107], [73, 141]] as const) {
      expect(liveMoveAnimationDuration(req(moveId, 0), withPersonality(field(true, false), PLAIN, PLAIN))).toBe(body + 85);
      expect(liveMoveAnimationDuration(req(moveId, 1), withPersonality(field(false, true), PLAIN, PLAIN))).toBe(body + 81);
      // Shiny subbed attacker (either side) and a shiny target: not proven; apx215, presented approximately with the swaps.
      expect(liveSubstituteSwapProven(req(moveId, 0), withPersonality(field(true, false), SHINY_PLAYER, PLAIN))).toBe(false);
      expect(liveSubstituteSwapProven(req(moveId, 1), withPersonality(field(false, true), PLAIN, SHINY_OPPONENT))).toBe(false);
      expect(liveSubstituteSwapProven(req(moveId, 0), withPersonality(field(true, false), PLAIN, SHINY_OPPONENT))).toBe(false);
      expect(liveMoveSubstituteDollUnproven(req(moveId, 0), withPersonality(field(true, false), SHINY_PLAYER, PLAIN))).toBe(true);
      expect(liveMoveSubstituteDollDeclines(req(moveId, 0), withPersonality(field(true, false), SHINY_PLAYER, PLAIN))).toBe(false);
      expect(liveMoveAnimationDuration(req(moveId, 0), withPersonality(field(true, false), SHINY_PLAYER, PLAIN))).toBe(body + 85);
      expect(liveMoveAnimationDuration(req(moveId, 1), withPersonality(field(false, true), PLAIN, SHINY_OPPONENT))).toBe(body + 81);
    }
  });
  it("swap rows draw the doll / mon at the task x2; body rows run the adapter on the mon with the attacker's x2 zeroed", () => {
    const base = { healthboxes: {}, message: null, visibility: {}, waitCursor: null } as never;
    const view = (age: number) => ({ ...(base as object), field: field(true, false),
      effect: { type: "move", request: req(29, 0), age } }) as never;
    const swap = liveSubstituteSwapView(view(10))!;
    expect(swap.kind).toBe("swap");
    expect(swap.view.effect).toBeNull();
    expect(swap.view.fieldArt.player.substituteDoll).toBe(true);
    expect(swap.view.fieldArt.player.origin).toEqual({ x: 40 - 5 * 9, y: 65 });
    // An elevated opponent target's shadow: the idle latch on swap row 0, hidden on later swap rows (anim script active).
    expect((liveSubstituteSwapView(view(0))!.view as { postBodyShadowHidden?: boolean }).postBodyShadowHidden).toBeUndefined();
    expect((swap.view as { postBodyShadowHidden?: boolean }).postBodyShadowHidden).toBe(true);
    expect((liveSubstituteSwapView(view(43 + 47 + 1))!.view as { postBodyShadowHidden?: boolean }).postBodyShadowHidden).toBe(true);
    const body = liveSubstituteSwapView(view(50))!;
    expect(body.kind).toBe("body");
    expect(body.view.field.player.substituteDoll).toBeUndefined();
    expect(body.view.effect).toMatchObject({ type: "move", age: 7, battlerX2Input: { zeroed: ["player"] } });
    expect(liveSubstituteSwapView({ ...(view(10) as object), field: field(false, false) } as never)).toBeNull();
  });
  it("x2 history: a Substitute body leaves the OTHER battler's front idle rest (self-target; ONIX +1 measured)", () => {
    const after = applyLiveBattlerX2Event(LIVE_BATTLER_X2_IDLE, { kind: "move-body", moveId: 164, attackerSide: "player" });
    expect(after).toEqual({ player: "zeroed", opponent: "idle" });
  });
});

const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("ordinary route: a subbed attacker's Leech Seed with the swaps", () => {
  it("MEGANIUM 103/28 [Substitute, Leech Seed]: presented live with the swaps, next prompt with the doll shown, Scene ON/OFF parity", () => {
    const seen: { ages: number; duration: number | null; kinds: Set<string> } = { ages: 0, duration: null, kinds: new Set() };
    const on = generatedCommandAnimationReplay(103, "on", [1, 0], 28, true, true, (state) => {
      const r = state.battleResolutionPresentation;
      if (r?.lifecycle.phase !== "presenting") return;
      const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
      if (command?.type !== "move-animation" || command.animation?.moveId !== 73) return;
      const view = createBattleResolutionPresentationRenderView(r);
      expect(view.field.player.substituteDoll).toBe(true);
      seen.duration = liveMoveAnimationDuration(command.animation, view.field);
      const swap = liveSubstituteSwapView(view);
      expect(swap).not.toBeNull();
      seen.kinds.add(swap!.kind);
      if (swap!.kind === "body") {
        const e = swap!.view.effect as { request: BattleMoveAnimationRequest; age: number };
        expect(liveMoveAnimationPresentation(e.request, swap!.view.field, e.age)).not.toBeNull();
      }
      seen.ages += 1;
    });
    const off = generatedCommandAnimationReplay(103, "off", [1, 0], 28, true, true);
    // MEGANIUM (player) Leech Seed 141 + the player swaps 85 = 226 rows (the ROM PERSIAN window measures 226 too).
    expect(seen.duration).toBe(226);
    expect(seen.ages).toBe(226);
    expect([...seen.kinds].sort()).toEqual(["body", "swap"]);
    expect(on.requests.map((q) => `${q.moveId}:${q.attacker}->${q.target}`)).toContain("73:0->1");
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.state.battleCommandPresentation?.field.player.substituteDoll).toBe(true);
    expect(off.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  }, 240000);
});
