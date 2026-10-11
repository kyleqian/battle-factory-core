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
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState, spriteOrderForSlots } from "../../src/engine/spriteOrderProvider.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { land97Ages } from "../helpers/land97LeadAges.ts";

// docs/next-adapters-prep7.md: live durations are counted from the activation frame to the first inactive script row
// (the later hit/HP/text rows belong to the queue's own commands). Shadow row 0 = live age 0 = activation.
// route = prep7 s2.5 (seed / index of the move on party member 0 / streak, from prep7-routes.json).
type Orders = readonly [number | null, number | null];
// attacker: which side's body the ordinary route must produce (default the player, 0).
const cases: { id: number; move: string; duration: Orders; shadow: number | undefined; alt: [string, string];
  route: { seed: number; move: 0 | 1 | 2 | 3; streak: number; turns?: number; stall?: boolean; attacker?: 0 | 1 }; order?: true }[] = [
  { id: 332, move: "AERIAL_ACE", duration: [50, 50], shadow: 0, alt: ["CHARIZARD", "ONIX"], route: { seed: 3, move: 0, streak: 0 } },
  { id: 98, move: "QUICK_ATTACK", duration: [33, 33], shadow: 0, alt: ["RAICHU", "ONIX"], route: { seed: 3, move: 1, streak: 0 } },
  // Ice Punch has no accepted-species rental carrier: the ordinary route is the alternate-species Gengar route (prep7 s2.5).
  // Fake Tears: row -1 (the first displayed row is one frame after activation): no shadow row; 83 script rows + 4 clear rows.
  { id: 313, move: "FAKE_TEARS", duration: [87, 87], shadow: undefined, alt: ["PLUSLE", "ONIX"], route: { seed: 0, move: 0, streak: 14 } },
  // Sleep Talk needs a sleeping attacker: Seaking seed 3014 / streak 14 (prep7 s2.5): turn 1/2 the opponent plays Double Team and
  // Sleep Powder, the player's Sleep Talk (index 2) pressed three times fires on turn 3; the called move is an ordinary second request.
  { id: 214, move: "SLEEP_TALK", duration: [186, 189], shadow: 0, alt: ["WHISCASH", "ONIX"], route: { seed: 3014, move: 2, streak: 14, turns: 3, stall: true } },
  // Rock Slide: both attacker sides (S10A sides added the player attacker, tests/animation/liveRockSlideSides.test.ts). Route =
  // the opponent's Onix (seed 134, streak 0, player presses slot 0; first body, order known, prep7 s2.5).
  { id: 157, move: "ROCK_SLIDE", duration: [138, 138], shadow: 0, alt: ["DUGTRIO", "ONIX"], route: { seed: 134, move: 0, streak: 0, attacker: 1 } },
  // Order consumers (first-body gate, known tracked order only). Routes: prep7 s2.5 (Charizard 8/21/0 slot 0; Kingdra 4/35/2).
  { id: 126, move: "FIRE_BLAST", duration: [197, 197], shadow: 0, alt: ["NINETALES", "ONIX"], route: { seed: 8, move: 0, streak: 21 }, order: true },
  { id: 349, move: "DRAGON_DANCE", duration: [142, 142], shadow: 0, alt: ["KINGDRA", "ONIX"], route: { seed: 4, move: 2, streak: 35 }, order: true },
  { id: 8, move: "ICE_PUNCH", duration: [184, 184], shadow: 0, alt: ["GENGAR", "ONIX"], route: { seed: 18, move: 2, streak: 42 } },
];

function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const request = (moveId: number, attacker: 0 | 1, turn = 0): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn, power: 0, damage: 0, friendship: 70, multihit: 0,
});
const knownOrder = (moveId: number): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(moveId, 0)).input!;
function render(field: BattleResolutionDisplayedField, moveId: number, attacker: 0 | 1, age: number, turn = 0,
  order?: LiveMoveSpriteOrderInput): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: request(moveId, attacker, turn), age, spriteOrderInput: order },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const cfg = (field: BattleResolutionDisplayedField, id: number, attacker: 0 | 1, turn = 0, order?: LiveMoveSpriteOrderInput) =>
  liveMoveAnimationPresentation(request(id, attacker, turn), field, 0, undefined, undefined, order)?.config as unknown as Record<string, any>;
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live prep7 move adapters", () => {
  it("registers the moves with the accepted durations and shadow rows", () => {
    for (const c of cases) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(c.id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[c.id]).toBe(c.shadow);
      for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(c.id, a)), `${c.move} ${a}`).toBe(c.duration[a]);
    }
    // Rock Slide: either attacker side (S10A sides).
    expect(liveMoveAnimationPresentation(request(157, 0), displayed("ONIX", "GROVYLE"), 0)).not.toBeNull();
    expect(liveMoveAnimationPresentation(request(157, 1), displayed("ONIX", "GROVYLE"), 0)).not.toBeNull();
  });

  it("derives the configs (prep7 s2.1) and the pre-activation age basis (s2.2)", () => {
    // Aerial Ace / Quick Attack: the accepted windows start 35/37 rows before the activation; live age 0 is the
    // activation frame = reducer age 42 / 44 in both orientations, so the config carries animationAgeOffset 42 / 44.
    for (const [id, offset] of [[332, 42], [98, 44]] as const) {
      for (const a of [0, 1] as const) {
        const field = a === 0 ? displayed("PIDGEOTTO", "ONIX") : displayed("ONIX", "PIDGEOTTO");
        const c = cfg(field, id, a);
        expect(c).toMatchObject({ animationAgeOffset: offset });
        // The HUD/hit rows are owned by the queue's hit/HP/message commands: the controller profile never fires.
        expect(c.controllerProfile.hitReactionFirstAge).toBeGreaterThan(10_000);
        expect(c.controllerProfile.hpDrainFirstAge).toBeGreaterThan(10_000);
        expect(liveMoveAnimationPresentation(request(id, a), field, 7)!.age).toBe(7);
      }
    }
  });

  it("derives the Fake Tears picture bounds and affine centre from the anchors (prep7 s2.1)", () => {
    // Opponent-front DELCATTY: pic point (176,48), 48x48 -> left 152, right 200, top 24; the affine centre is the sprite centre.
    expect(cfg(displayed("SHUCKLE", "DELCATTY"), 313, 1)).toMatchObject({
      attackerPictureBounds: { left: 152, right: 200, top: 24 }, attacker: { geometry: { animationCenter: { x: 176, y: 48 } } } });
    // Player-back DELCATTY: pic point (72,96), 64x48 -> 40..104, top 72; sprite centre (72,88).
    expect(cfg(displayed("DELCATTY", "SHUCKLE"), 313, 0)).toMatchObject({
      attackerPictureBounds: { left: 40, right: 104, top: 72 }, attacker: { geometry: { animationCenter: { x: 72, y: 88 } } } });
  });

  it("gates the order consumers on a known tracked order and derives their inputs from the provider (prep7 s2.3)", () => {
    for (const id of [126, 349]) {
      for (const a of [0, 1] as const) {
        const field = a === 0 ? displayed("DRAGONAIR", "ONIX") : displayed("ONIX", "DRAGONAIR");
        expect(liveMoveAnimationPresentation(request(id, a), field, 0), `${id} ${a}`).toBeNull();
      }
    }
    // Dragon Dance: provider free order over [3,4,5,7,9,10] = [4,3,5,10,9,7] -> each orb's index [1,0,2,5,4,3].
    const order = knownOrder(349);
    expect(spriteOrderForSlots({ known: true, free: order.free, pendingDestroyed: [] }, [3, 4, 5, 7, 9, 10])).toEqual([4, 3, 5, 10, 9, 7]);
    for (const a of [0, 1] as const) {
      const field = a === 0 ? displayed("DRAGONAIR", "ONIX") : displayed("ONIX", "DRAGONAIR");
      expect(cfg(field, 349, a, 0, order).animationProfile).toMatchObject({
        allocationSlots: [3, 4, 5, 7, 9, 10], allocationOrder: [1, 0, 2, 5, 4, 3], pictureSize: expect.any(Object) });
    }
    // A different known order is consumed as given.
    const identity = { known: true as const, free: Array.from({ length: 64 }, (_, i) => i) };
    expect(cfg(displayed("DRAGONAIR", "ONIX"), 349, 0, 0, identity).animationProfile.allocationOrder).toEqual([3, 4, 5, 7, 9, 10].map(slot => [3, 4, 5, 7, 9, 10].indexOf(slot)));
    // Fire Blast: first-body gate only; targetSpriteSlot is the known-entry battler slot, centres are the pic points.
    expect(cfg(displayed("OCTILLERY", "ONIX"), 126, 0, 0, order).animationProfile).toEqual({
      attackerPictureCenter: { x: 72, y: 98 }, targetPictureCenter: { x: 176, y: 42 }, targetSpriteSlot: 8 });
    expect(cfg(displayed("ONIX", "OCTILLERY"), 126, 1, 0, order).animationProfile).toEqual({
      attackerPictureCenter: { x: 176, y: 50 }, targetPictureCenter: { x: 72, y: 88 }, targetSpriteSlot: 6 });
  });

  it("renders every move with an alternate carrier in both orientations without fixture-species throws", () => {
    for (const c of cases) for (const a of [0, 1] as const) {
      const [carrier, other] = c.alt;
      const field = a === 0 ? displayed(carrier, other) : displayed(other, carrier);
      const duration = liveMoveAnimationDuration(request(c.id, a));
      if (duration === null) {
        expect(c.move).toBe("ROCK_SLIDE");
        expect(liveMoveAnimationPresentation(request(c.id, a), field, 0)).toBeNull();
        continue;
      }
      const order = c.order ? knownOrder(c.id) : undefined;
      expect(liveMoveAnimationPresentation(request(c.id, a), field, 0, undefined, undefined, order), `${c.move} ${a}`).not.toBeNull();
      expect(new Set([0, Math.floor(duration / 4), Math.floor(duration / 2), duration - 1].map(age => render(field, c.id, a, age, 0, order))).size, `${c.move} ${a}`).toBeGreaterThan(1);
    }
  }, 120000);

  it.each(cases)("completes ordinary $move and preserves ON/OFF rules and RNG", c => {
    const r = c.route;
    const slots = Array.from({ length: r.turns ?? 1 }, () => r.move);
    const on = generatedCommandAnimationReplay(r.seed, "on", slots, r.streak, r.stall ?? false);
    const off = generatedCommandAnimationReplay(r.seed, "off", slots, r.streak, r.stall ?? false);
    const side = r.attacker ?? 0;
    const body = on.animations.find(a => a.moveId === c.id && a.attacker === side);
    expect(body?.ages).toEqual(land97Ages(c.id, c.duration[side]!));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    if (c.order) {
      // The move is the battle's first body: the production host lent the known-entry order.
      const firstBody = on.commands.find(row => row.type === "move-animation")!;
      expect((firstBody.command as { animation: { moveId: number } }).animation.moveId).toBe(c.id);
      expect(firstBody.spriteOrderInput).toBeDefined();
    }
    if (!r.stall) expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 120000);
});
