import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderForSlots, spriteOrderWithOccupiedPrefix } from "../../src/engine/spriteOrderProvider.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { HPD4_BODY_LEAD_ROWS, iu120Ages } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep8.md: the ten allocator-plan-v2 moves. Live durations run from the activation frame to the first
// inactive script row (window start = activation, row 0 for all ten); every adapter is gated on the lent tracked order.
// route = prep8 s2.3 (seed / slot of the move on party member 0 / streak, prep8-routes.json / prep8-opponent-routes-0.json).
type Orders = readonly [number, number];
const cases: { id: number; move: string; duration: Orders; alt: [string, string]; fields?: Partial<BattleMoveAnimationRequest>;
  route: { seed: number; move: 0 | 1 | 2 | 3; streak: number; attacker?: 0 | 1; stall?: boolean } }[] = [
  { id: 129, move: "SWIFT", duration: [78, 80], alt: ["ELEKID", "ONIX"], route: { seed: 45, move: 2, streak: 0 } },
  { id: 271, move: "TRICK", duration: [225, 225], alt: ["ALAKAZAM", "ONIX"], route: { seed: 71, move: 0, streak: 35 } },
  { id: 218, move: "FRUSTRATION", duration: [229, 229], alt: ["PERSIAN", "ONIX"], fields: { friendship: 0 }, route: { seed: 20, move: 0, streak: 14 } },
  { id: 69, move: "SEISMIC_TOSS", duration: [228, 228], alt: ["BLASTOISE", "ONIX"], fields: { damage: 50 }, route: { seed: 2, move: 3, streak: 21 } },
  { id: 32, move: "HORN_DRILL", duration: [193, 192], alt: ["DEWGONG", "ONIX"], route: { seed: 267, move: 0, streak: 35 } },
  { id: 62, move: "AURORA_BEAM", duration: [216, 216], alt: ["CLOYSTER", "ONIX"], route: { seed: 52, move: 0, streak: 7 } },
  { id: 253, move: "UPROAR", duration: [73, 73], alt: ["VIGOROTH", "ONIX"], 
    // Uproar locks the user in for 2-5 turns (no command prompt follows the body): the driver stops at the frame budget.
    route: { seed: 585, move: 3, streak: 7, stall: true } },
  { id: 85, move: "THUNDERBOLT", duration: [237, 237], alt: ["CASTFORM", "ONIX"], route: { seed: 0, move: 2, streak: 14 } },
  { id: 254, move: "STOCKPILE", duration: [99, 99], alt: ["SWALOT", "ONIX"], route: { seed: 161, move: 2, streak: 7 } },
  { id: 192, move: "ZAP_CANNON", duration: [112, 112], alt: ["FORRETRESS", "ONIX"], route: { seed: 1585, move: 3, streak: 35 } },
];
// Opponent-attacker ordinary routes (generated rental on the player side presses slot 0; the opponent's move is the body).
const opponentRoutes: { id: number; move: string; duration: number; route: { seed: number; move: 0 | 1 | 2 | 3; streak: number; attacker?: 0 | 1; stall?: boolean } }[] = [
  { id: 129, move: "SWIFT", duration: 80, route: { seed: 424, move: 0 as const, streak: 0, attacker: 1 as const } },
  { id: 218, move: "FRUSTRATION", duration: 229, route: { seed: 50, move: 0 as const, streak: 14, attacker: 1 as const } },
];

function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const request = (moveId: number, attacker: 0 | 1, fields: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...fields,
});
const knownOrder = (moveId: number): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(moveId, 0)).input!;
function render(field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, age: number, order?: LiveMoveSpriteOrderInput): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: req, age, spriteOrderInput: order },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const cfg = (field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, order?: LiveMoveSpriteOrderInput) =>
  liveMoveAnimationPresentation(req, field, 0, undefined, undefined, order)?.config as unknown as Record<string, any>;
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};
const fieldFor = (carrier: string, other: string, a: 0 | 1) => a === 0 ? displayed(carrier, other) : displayed(other, carrier);

describe("live prep8 move adapters", () => {
  it("registers the moves with the accepted durations and shadow row 0", () => {
    for (const c of cases) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(c.id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[c.id]).toBe(0);
      for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(c.id, a, c.fields)), `${c.move} ${a}`).toBe(c.duration[a]);
    }
  });

  it("gates every adapter on the lent tracked order (and Frustration / Seismic Toss on the measured branch)", () => {
    for (const c of cases) for (const a of [0, 1] as const) {
      const field = fieldFor(c.alt[0], c.alt[1], a);
      expect(liveMoveAnimationPresentation(request(c.id, a, c.fields), field, 0), `${c.move} ${a}`).toBeNull();
      expect(liveMoveAnimationPresentation(request(c.id, a, c.fields), field, 0, undefined, undefined, { known: false } as never), `${c.move} ${a}`).toBeNull();
      expect(liveMoveAnimationPresentation(request(c.id, a, c.fields), field, 0, undefined, undefined, knownOrder(c.id)), `${c.move} ${a}`).not.toBeNull();
    }
    const order = knownOrder(218);
    // AnimTask_GetFrustrationPowerLevel: only friendship <= 30 is the ported strongest branch.
    expect(liveMoveAnimationPresentation(request(218, 0, { friendship: 31 }), displayed("FURRET", "ONIX"), 0, undefined, undefined, order)).toBeNull();
    expect(liveMoveAnimationPresentation(request(218, 0, { friendship: 30 }), displayed("FURRET", "ONIX"), 0, undefined, undefined, order)).not.toBeNull();
    // AnimTask_GetSeismicTossDamageLevel: only gAnimMoveDmg 33..65 is the ported medium branch.
    for (const [damage, live] of [[32, false], [33, true], [65, true], [66, false]] as const) {
      expect(liveMoveAnimationPresentation(request(69, 0, { damage }), displayed("GRUMPIG", "ONIX"), 0, undefined, undefined, order) !== null, `damage ${damage}`).toBe(live);
    }
  });

  it("derives the configs from the production anchors, the allocator constants and the lent order (prep8 s2.1)", () => {
    const order = knownOrder(129);
    const full = spriteOrderWithOccupiedPrefix({ known: true, free: order.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!;
    expect(full).toHaveLength(64);
    // Swift: pic points, battler slots, the opponent target's settled idle x2 (ONIX 1), star slots and ShakeMon2 task slot 0.
    expect(cfg(displayed("STARYU", "ONIX"), request(129, 0), order).animationProfile).toMatchObject({
      attackerSide: "player", attackerEffectCenter: { x: 72, y: 101 }, targetAverageCenter: { x: 176, y: 42 }, attackerSpriteSlot: 6,
      targetSpriteSlot: 8, targetInitialOffset: { x2: 1, y2: 0 }, starSlots: [3, 4, 5, 7, 9], targetShakeTaskSlot: 0 });
    expect(cfg(displayed("ONIX", "STARYU"), request(129, 1), order).animationProfile).toMatchObject({
      attackerSide: "opponent", attackerEffectCenter: { x: 176, y: 50 }, targetAverageCenter: { x: 72, y: 88 }, attackerSpriteSlot: 8,
      targetSpriteSlot: 6, targetInitialOffset: { x2: 0, y2: 0 } });
    // Trick: bag slots and the task-slot split (target stretch 0 / shake 1; attacker stretch 1 / shake 0).
    expect(cfg(displayed("FURRET", "BLISSEY"), request(271, 0), order).animationProfile).toMatchObject({
      bagSlots: [3, 4], attacker: { spriteSlot: 6, stretchTaskSlot: 1, shakeTaskSlot: 0 }, target: { spriteSlot: 8, stretchTaskSlot: 0, shakeTaskSlot: 1 },
      orientation: "player-back" });
    // Orders come from the lent order: Frustration's impact orders are the slots' indices in the 64-entry order.
    expect(cfg(displayed("FURRET", "ONIX"), request(218, 0, { friendship: 0 }), order).animationProfile).toMatchObject({
      angerSlot: 3, angerMatrix: 0, impactSlots: [3, 4], impactMatrices: [0, 3], impactOrders: [full.indexOf(3), full.indexOf(4)],
      impactSubpriority: 27, attackerSubpriority: 30, targetSubpriority: 40 });
    // A different known order is consumed as given (reversed free order: the orders follow it).
    const reversed = { known: true as const, free: [...order.free].reverse() };
    const fullReversed = spriteOrderWithOccupiedPrefix({ known: true, free: reversed.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!;
    expect(cfg(displayed("FURRET", "ONIX"), request(218, 0, { friendship: 0 }), reversed).animationProfile.impactOrders)
      .toEqual([fullReversed.indexOf(3), fullReversed.indexOf(4)]);
    // Horn Drill: hornMatrixId is the raw OAM flip bits per orientation; the order seed is the lend over slots 3,4,5.
    expect(cfg(displayed("SEAKING", "ONIX"), request(32, 0), order).animationProfile).toMatchObject({
      hornSlot: 4, hornMatrixId: 0, effectSubpriority: 37, spriteOrderSeed: spriteOrderForSlots({ known: true, free: order.free, pendingDestroyed: [] }, [3, 4, 5]) });
    expect(cfg(displayed("ONIX", "SEAKING"), request(32, 1), order).animationProfile).toMatchObject({ hornMatrixId: 24, effectSubpriority: 27 });
    // Seismic Toss: the battler palettes are the species art palettes (derivable, prep8 s2.1).
    const seismic = cfg(displayed("GRUMPIG", "ONIX"), request(69, 0, { damage: 50 }), order).animationProfile;
    expect(seismic.attackerPalette).toHaveLength(16);
    expect(seismic.attackerPalette).toEqual(createBattleCommandFieldArtView(displayed("GRUMPIG", "ONIX")).player.pic.palette);
    expect(seismic.targetPalette).toEqual(createBattleCommandFieldArtView(displayed("GRUMPIG", "ONIX")).opponent.pic.palette);
    // Uproar: the 64-entry order is the provider order; the attacker matrix is 1 (player slot 6) / 2 (opponent slot 8).
    expect(cfg(displayed("VIGOROTH", "ONIX"), request(253, 0), order).animationInputs).toMatchObject({
      spriteOrder: full, attackerMatrixSlot: 1, ringSlots: [3, 3, 3], noteSlots: [4, 5], ringMatrixSlots: [0, 0, 0] });
    expect(cfg(displayed("ONIX", "VIGOROTH"), request(253, 1), order).animationInputs.attackerMatrixSlot).toBe(2);
    // Aurora Beam: the 64-entry seed is the provider order; Stockpile: the lend over the orb slots; the ad-hoc shadow flag is off.
    expect(cfg(displayed("SEADRA", "ONIX"), request(62, 0), order).animationProfile.spriteOrderSeed).toEqual(full);
    const stock = cfg(displayed("ONIX", "PELIPPER"), request(254, 1), order);
    expect(stock.attackerShadowAtEntry).toBe(false);
    expect(stock.animationProfile).toMatchObject({ orbSlotPool: [3, 4, 5, 7, 9], orbMatrixPool: [0, 3, 4, 5, 6], attackerSubpriority: 40 });
    // Thunderbolt / Zap Cannon: orders are the slots' indices in the lent order.
    const bolt = cfg(displayed("DELCATTY", "SHUCKLE"), request(85, 0), order).animationProfile;
    expect(bolt.orb).toEqual({ slot: 3, matrixNum: 0, order: full.indexOf(3) });
    expect(bolt.flashes.map((f: any) => f.matrixNum)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    const zap = cfg(displayed("FORRETRESS", "SHUCKLE"), request(192, 0), order).animationProfile;
    expect(zap.ball).toEqual({ slot: 3, matrixNum: 0, order: full.indexOf(3) });
    expect(zap.sparks.map((s: any) => s.slot)).toEqual([4, 5, 7, 9, 10, 11, 12, 13]);
  });

  it("renders every move with an alternate carrier in both orientations without fixture-species throws", () => {
    for (const c of cases) for (const a of [0, 1] as const) {
      const field = fieldFor(c.alt[0], c.alt[1], a);
      const req = request(c.id, a, c.fields);
      const duration = liveMoveAnimationDuration(req)!;
      const order = knownOrder(c.id);
      expect(liveMoveAnimationPresentation(req, field, 0, undefined, undefined, order), `${c.move} ${a}`).not.toBeNull();
      expect(new Set([0, Math.floor(duration / 4), Math.floor(duration / 2), duration - 1].map(age => render(field, req, age, order))).size, `${c.move} ${a}`).toBeGreaterThan(1);
    }
  }, 240000);

  const routes = [
    ...cases.map(c => ({ ...c, side: 0 as 0 | 1, expected: c.duration[0] })),
    ...opponentRoutes.map(c => ({ id: c.id, move: `${c.move} (opponent)`, route: c.route, side: 1 as 0 | 1, expected: c.duration })),
  ];
  it.each(routes)("completes ordinary $move and preserves ON/OFF rules and RNG", c => {
    const r = c.route;
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.move], r.streak, r.stall ?? false);
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.move], r.streak, r.stall ?? false);
    const body = on.animations.find(a => a.moveId === c.id && a.attacker === c.side);
    expect(body?.ages).toEqual(iu120Ages(c.id, c.expected, c.side === 0 ? "player" : "opponent", c.side === 0 ? HPD4_BODY_LEAD_ROWS.get(c.id) : undefined));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    // The body is the battle's first (or, after Tackle/Peck, a known-order later) body: the production host lent the order.
    const bodyRow = on.commands.find(row => row.type === "move-animation"
      && (row.command as { animation: { moveId: number } }).animation.moveId === c.id)!;
    expect(bodyRow.spriteOrderInput).toBeDefined();
    if (!r.stall) expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 240000);
});
