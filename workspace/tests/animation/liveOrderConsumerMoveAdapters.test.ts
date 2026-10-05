import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import {
  initSpriteOrderState, knownEntrySpriteOrderState, spriteOrderForSlots,
} from "../../src/engine/spriteOrderProvider.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { grudgeConfigFor, grudgeRowsFor } from "../../tools/compare/grudgeFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";

// docs/order-consumer-prep.md §0/§1/§4/§5: Grudge (288) is READY-WITH-PROVIDER for the battle's first move body;
// window 66..274 / 70..278 (209 rows, shadow row 0); seed = F before the six-flame window filtered to [3,4,5,7,9,10].
function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const request = (attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId: 288, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
const knownOrder = (): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).input!;
function render(field: BattleResolutionDisplayedField, attacker: 0 | 1, age: number, order?: LiveMoveSpriteOrderInput): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "GRUDGE!"], visibleCharacters: 99 },
    effect: { type: "move", request: request(attacker), age, spriteOrderInput: order },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};
function expectRulesEqual(on: ReturnType<typeof generatedCommandAnimationReplay>,
  off: ReturnType<typeof generatedCommandAnimationReplay>): void {
  expect(on.boundaries.length).toBeGreaterThan(0);
  expect(off.boundaries).toHaveLength(on.boundaries.length);
  for (let i = 0; i < on.boundaries.length; i += 1) {
    expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
    expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
  }
}

describe("live order-consumer adapters: Grudge (first move body of a battle)", () => {
  it("registers Grudge with the accepted duration and #142 shadow row", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(288);
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(a))).toBe(209);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[288]).toBe(0);
  });

  it("derives the accepted staged config from production anchors and the provider order (both orientations)", () => {
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const accepted = grudgeConfigFor(orientation, grudgeRowsFor(orientation));
      const attacker = orientation === "player-back" ? 0 : 1;
      const field = attacker === 0 ? displayed("HAUNTER", "ONIX") : displayed("ONIX", "HAUNTER");
      const live = liveMoveAnimationPresentation(request(attacker), field, 0, undefined, undefined, knownOrder())!.config as
        typeof accepted;
      expect(live.attacker).toEqual(accepted.attacker);
      expect(live.target).toEqual(accepted.target);
      // animationRngSeed is a state-only diagnostic of grudge.ts (no pixel consumer).
      const { animationRngSeed: _live, ...liveProfile } = live.animationProfile;
      const { animationRngSeed: _accepted, ...acceptedProfile } = accepted.animationProfile;
      expect(liveProfile).toEqual(acceptedProfile);
      expect(live.animationProfile.spriteOrderSeed).toEqual([4, 3, 5, 10, 9, 7]);
    }
  });

  it("refuses an unknown order (bounded scene-off fallback) and never guesses one", () => {
    const field = displayed("HAUNTER", "ONIX");
    expect(liveMoveAnimationPresentation(request(0), field, 0)).toBeNull();
    // After the first body the host order is invalid and lends nothing.
    const consumed = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).next;
    expect(prepareLiveMoveSpriteOrder(consumed, request(0)).input).toBeUndefined();
    expect(liveMoveAnimationPresentation(request(0), field, 0, undefined, undefined,
      prepareLiveMoveSpriteOrder(consumed, request(0)).input)).toBeNull();
    // A different known order is consumed as given (the provider, not a literal, owns the seed).
    const identity = prepareLiveMoveSpriteOrder(initSpriteOrderState(), request(0)).input!;
    const config = liveMoveAnimationPresentation(request(0), field, 0, undefined, undefined, identity)!.config as any;
    expect(config.animationProfile.flameSlots).toEqual([0, 1, 2, 3, 4, 5]);
    expect(config.animationProfile.spriteOrderSeed).toEqual(spriteOrderForSlots(initSpriteOrderState(), [0, 1, 2, 3, 4, 5]));
  });

  it("renders an alternate carrier (NINETALES) in both orientations without fixture-species throws", () => {
    for (const a of [0, 1] as const) {
      const field = a === 0 ? displayed("NINETALES", "ONIX") : displayed("ONIX", "NINETALES");
      expect(liveMoveAnimationPresentation(request(a), field, 0, undefined, undefined, knownOrder())).not.toBeNull();
      expect(new Set([0, 60, 104, 208].map(age => render(field, a, age, knownOrder()))).size).toBeGreaterThan(1);
    }
  });

  it("plays ordinary Grudge as the battle's first body (seed 57, slot 3, Haunter) with the adapter active every age", () => {
    const on = generatedCommandAnimationReplay(57, "on", [3], 0);
    const off = generatedCommandAnimationReplay(57, "off", [3], 0);
    const firstBody = on.commands.find(row => row.type === "move-animation")!;
    expect((firstBody.command as { animation: { moveId: number } }).animation.moveId).toBe(288);
    expect(firstBody.spriteOrderInput).toBeDefined();
    const body = on.animations.find(a => a.moveId === 288 && a.attacker === 0)!;
    expect(body.player).toBe("HAUNTER");
    expect(body.ages).toEqual(Array.from({ length: 209 }, (_, age) => age));
    expect(body.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectRulesEqual(on, off);
  }, 120000);

  it("declines (scene-off fallback) when Grudge is not the first body (seed 16, slot 3: opponent Light Screen first)", () => {
    const on = generatedCommandAnimationReplay(16, "on", [3], 0);
    const off = generatedCommandAnimationReplay(16, "off", [3], 0);
    expect(on.requests.map(q => [q.moveId, q.attacker])).toEqual([[113, 1], [288, 0]]);
    const body = on.animations.find(a => a.moveId === 288 && a.attacker === 0)!;
    expect(body.ages).toEqual(Array.from({ length: 209 }, (_, age) => age));
    expect(body.adapterActive.some(Boolean)).toBe(false);
    expect(on.commands.filter(row => row.type === "move-animation").map(row => row.spriteOrderInput !== undefined))
      .toEqual([true, false]);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectRulesEqual(on, off);
  }, 120000);
});
