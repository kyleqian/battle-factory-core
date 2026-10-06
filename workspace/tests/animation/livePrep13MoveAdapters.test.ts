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
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";

// docs/next-adapters-prep13.md: Ice Beam (58), Water Spout (323), Hidden Power (237). The dense framebuffer proofs are
// tools/integration/fixtures/prep13-live/*.json (receipt prep13-live-adapter-receipt.json).
const request = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra,
});
function displayed(player: string, opponent: string, hp: [number, number] = [100, 100], personality?: number): BattleResolutionDisplayedField {
  const mon = (name: string, side: "player" | "opponent") => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: hp[0], maxHP: hp[1], gender: "male", status: "none",
    ...(personality !== undefined && side === "player" ? { personality } : {}),
  });
  return { player: mon(player, "player"), opponent: mon(opponent, "opponent") } as unknown as BattleResolutionDisplayedField;
}
const knownOrder = (): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(58, 0)).input!;
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
const cfg = (field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, order?: LiveMoveSpriteOrderInput, age = 0) =>
  liveMoveAnimationPresentation(req, field, age, undefined, undefined, order);
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live prep13 move adapters", () => {
  it("registers Ice Beam and Water Spout with the accepted durations and shadow rows", () => {
    for (const id of [58, 323]) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    }
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(58, a))).toBe(203);
    // Water Spout's body length depends on the attacker's party HP and picture height: no field, no duration.
    expect(liveMoveAnimationDuration(request(323, 0))).toBeNull();
  });

  // prep13 s1.2 / mechanic-water-spout-tiers-* ROM rows by attacker party HP (NOSEPASS carrier, max HP 137) and side.
  it.each([
    [137, 0, 278], [129, 0, 270], [113, 0, 254], [89, 0, 229], [57, 0, 204], [17, 0, 204],
    [137, 1, 278], [129, 1, 270], [113, 1, 254], [89, 1, 230], [57, 1, 206], [17, 1, 201],
  ] as const)("Water Spout duration at HP %i/137 attacker %i = %i rows (ROM tier scenarios)", (hp, attacker, rows) => {
    const base = attacker === 0 ? displayed("NOSEPASS", "SHUCKLE") : displayed("SHUCKLE", "NOSEPASS");
    const side = attacker === 0 ? "player" : "opponent";
    const field = { ...base, [side]: { ...base[side], hp, maxHP: 137 } } as BattleResolutionDisplayedField;
    expect(liveMoveAnimationDuration(request(323, attacker), field)).toBe(rows);
  });

  it("Water Spout takes the picture height of the attacker (KINGDRA player-back is 2 rows shorter), is gated on the lent order", () => {
    const order = knownOrder();
    const kingdra = displayed("KINGDRA", "GOLEM", [150, 150]);
    expect(liveMoveAnimationDuration(request(323, 0), kingdra)).toBe(276);
    expect(liveMoveAnimationDuration(request(323, 1), displayed("GOLEM", "KINGDRA", [150, 150]))).toBe(278);
    expect(liveMoveAnimationPresentation(request(323, 0), kingdra, 0)).toBeNull();
    const inputs = (liveMoveAnimationPresentation(request(323, 0), kingdra, 0, undefined, undefined, order)!.config as any).animationInputs;
    expect(inputs).toMatchObject({ attackerSide: "player", attackerHp: 150, attackerMaxHp: 150, attackerSubpriority: 30,
      launchTaskSlot: 0, attackerSourceHeight: 52 });
    expect(inputs.launchSpriteSlots.slice(0, 8)).toEqual([3, 4, 5, 7, 9, 10, 11, 12]);
    expect(inputs.spriteOrderSeed).toHaveLength(64);
    const opp = (liveMoveAnimationPresentation(request(323, 1), displayed("GOLEM", "KINGDRA", [150, 150]), 0, undefined, undefined, order)!.config as any).animationInputs;
    expect(opp).toMatchObject({ attackerSide: "opponent", attackerSubpriority: 40, attackerSourceHeight: 56 });
  });

  it("Ice Beam is gated on the lent order and derives geometry from the production anchors", () => {
    const order = knownOrder();
    const f = displayed("LAPRAS", "GOLEM");
    expect(cfg(f, request(58, 0), order)).not.toBeNull();
    expect(cfg(f, request(58, 0))).toBeNull();
    expect(cfg(f, request(58, 0), { known: false } as never)).toBeNull();
    const profile = (cfg(f, request(58, 0), order)!.config as any).animationProfile;
    // prep13-ice-beam-check.json: LAPRAS back (72, 92) / GOLEM front (176, 45); the monbg base is 544 - (target centre + idle x2).
    expect(profile).toMatchObject({ orientation: "player-back", endAge: 202,
      geometry: { attackerPictureOffset: { x: 72, y: 92 }, targetPictureOffset: { x: 176, y: 45 } } });
    expect(profile.spriteOrder.initialOrder).toHaveLength(64);
    const opp = (cfg(displayed("GOLEM", "LAPRAS"), request(58, 1), order)!.config as any).animationProfile;
    expect(opp.orientation).toBe("opponent-front");
    expect(opp.geometry.attackerPictureOffset).toEqual({ x: 176, y: 53 });
  });

  it("renders Ice Beam for alternate carriers in both orientations", () => {
    const order = knownOrder();
    for (const a of [0, 1] as const) {
      const field = a === 0 ? displayed("SLOWBRO", "GOLEM") : displayed("GOLEM", "SLOWBRO");
      const req = request(58, a);
      expect(cfg(field, req, order)).not.toBeNull();
      expect(new Set([0, 50, 100, 202].map(age => render(field, req, age, order))).size).toBeGreaterThan(1);
    }
  }, 240000);

  // route = ordinary-input replay (prep13 s2 seeds: generated rentals, party member 0 knows the move, one turn).
  const routes: { move: string; id: number; seed: number; moves: (0 | 1 | 2 | 3)[]; streak: number; bodies: number[] }[] = [
    { move: "ICE_BEAM 0/14 DELCATTY", id: 58, seed: 0, moves: [3], streak: 14, bodies: [203] },
    { move: "ICE_BEAM 1/14 DUNSPARCE", id: 58, seed: 1, moves: [0], streak: 14, bodies: [203] },
    // Not a first body: the opponent's Flail acts first and the tracked order is lent after it (prep13-route-probe.json).
    { move: "WATER_SPOUT 83/14 WAILMER", id: 323, seed: 83, moves: [0], streak: 14, bodies: [263] },
  ];
  it.each(routes)("completes ordinary $move and preserves ON/OFF rules and RNG", r => {
    const on = generatedCommandAnimationReplay(r.seed, "on", r.moves, r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", r.moves, r.streak);
    const bodies = on.animations.filter(a => a.moveId === r.id && a.attacker === 0);
    expect(bodies.map(b => b.ages.length)).toEqual(r.bodies);
    for (const body of bodies) {
      expect(body.ages).toEqual(Array.from({ length: body.ages.length }, (_, age) => age));
      expect(body.adapterActive.every(Boolean)).toBe(true);
    }
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
  }, 240000);
});
