import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation, type LiveMoveDeclineSink,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState, spriteOrderForSlots } from "../../src/engine/spriteOrderProvider.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep9.md (the five D-PAL moves: no palette snapshot is consumed) and docs/next-adapters-prep7.md +
// docs/sprite-order-policy-gaps.md (Double Team / Feather Dance). Every adapter is gated on the lent tracked order.
// route = ordinary-input replay (seed / slots pressed per turn / streak); alt = an alternate carrier vs ONIX.
type Pair = readonly [number | null, number | null];
const cases: { id: number; move: string; duration: Pair; shadowRow: 0 | undefined; alt: [string, string];
  route: { seed: number; moves: (0 | 1 | 2 | 3)[]; streak: number } }[] = [
  { id: 202, move: "GIGA_DRAIN", duration: [230, 230], shadowRow: 0, alt: ["VENUSAUR", "ONIX"], route: { seed: 8, moves: [3], streak: 14 } },
  { id: 241, move: "SUNNY_DAY", duration: [158, 158], shadowRow: 0, alt: ["CHARIZARD", "ONIX"], route: { seed: 8, moves: [1], streak: 21 } },
  { id: 72, move: "MEGA_DRAIN", duration: [218, 218], shadowRow: 0, alt: ["TANGELA", "ONIX"], route: { seed: 29, moves: [0], streak: 7 } },
  { id: 71, move: "ABSORB", duration: [194, 194], shadowRow: undefined, alt: ["LOMBRE", "ONIX"], route: { seed: 23, moves: [3], streak: 0 } },
  { id: 138, move: "DREAM_EATER", duration: [266, 267], shadowRow: 0, alt: ["JYNX", "ONIX"], route: { seed: 41, moves: [1, 2], streak: 14 } },
  { id: 104, move: "DOUBLE_TEAM", duration: [239, 239], /* tmr136: 230 + 9 tail rows */ shadowRow: undefined, alt: ["DELCATTY", "ONIX"], route: { seed: 0, moves: [2], streak: 7 } },
  { id: 297, move: "FEATHER_DANCE", duration: [168, 168], shadowRow: 0, alt: ["PIDGEOT", "ONIX"], route: { seed: 3, moves: [2], streak: 0 } },
];

function displayed(player: string, opponent: string, status: { player?: string; opponent?: string } = {}): BattleResolutionDisplayedField {
  const mon = (name: string, st = "none") => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: st,
    // Production fields carry the party personality (battleCommandPresentation.ts); Double Team reads the player's nature from it (dt60).
    personality: 3,
  });
  return { player: mon(player, status.player), opponent: mon(opponent, status.opponent) } as unknown as BattleResolutionDisplayedField;
}
const request = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
const knownOrder = (moveId: number): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(moveId, 0)).input!;
function render(field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, age: number, order?: LiveMoveSpriteOrderInput): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: field.player.status, currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: field.opponent.status },
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
const lent = (order: LiveMoveSpriteOrderInput) => ({ known: true as const, free: order.free, pendingDestroyed: [] });

describe("live prep9 move adapters", () => {
  it("registers the moves with the accepted durations and shadow rows (Absorb / Double Team: no row)", () => {
    for (const c of cases) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(c.id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[c.id]).toBe(c.shadowRow);
      for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(c.id, a)), `${c.move} ${a}`).toBe(c.duration[a]);
    }
  });

  it("gates every adapter on the lent tracked order; Double Team is live for either attacker side (S10A sides)", () => {
    for (const c of cases) for (const a of [0, 1] as const) {
      if (c.duration[a] === null) continue;
      const field = a === 0 ? displayed(c.alt[0], c.alt[1]) : displayed(c.alt[1], c.alt[0]);
      // apx219: an unknown order still declines the proven body; it is drawn approximately with the known-entry first-action order.
      for (const unknown of [undefined, { known: false } as never]) {
        const sink: LiveMoveDeclineSink = {};
        expect(liveMoveAnimationPresentation(request(c.id, a), field, 0, undefined, undefined, unknown, undefined, undefined, undefined, sink),
          `${c.move} ${a}`).not.toBeNull();
        expect(sink.approximate, `${c.move} ${a}`).toBe("sprite-order-unknown");
      }
      expect(cfg(field, request(c.id, a), knownOrder(c.id)), `${c.move} ${a}`).not.toBeNull();
    }
    expect(cfg(displayed("ONIX", "GROVYLE"), request(104, 1), knownOrder(104))).not.toBeNull();
  });

  it("derives the configs from the allocator constants, the production anchors and the lent order (prep9 s2)", () => {
    const order = knownOrder(202);
    const seed = (slots: number[]) => spriteOrderForSlots(lent(order), slots);
    const c202 = cfg(displayed("ROSELIA", "ONIX"), request(202, 0), order)!.config as any;
    expect(c202.allocatorProfile).toMatchObject({ hitsplat: 3, stars: [3, 4, 5, 3], paletteController: 3,
      orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 3, 20, 21, 4, 7, 9, 5, 11, 13],
      orderSeed: seed([3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]) });
    // First body: the provider order is [4,3,...]; after Tackle the bounce pair swaps ([3,4,...]); the seed follows the lend.
    expect(c202.allocatorProfile.orderSeed.slice(0, 2)).toEqual([4, 3]);
    const swapped = { known: true as const, free: [3, 4, ...order.free.filter(s => s !== 3 && s !== 4)] };
    expect((cfg(displayed("ROSELIA", "ONIX"), request(202, 0), swapped)!.config as any).allocatorProfile.orderSeed.slice(0, 2)).toEqual([3, 4]);
    // Pic-offset healing / absorption centres: the player attacker's +8 (y 96), the opponent's front pic (corner + 32).
    expect(c202).toMatchObject({ healingCenter: { x: 72, y: 96 }, absorptionCenter: { x: 72, y: 96 } });
    const c72 = cfg(displayed("ONIX", "SKIPLOOM"), request(72, 1), order)!.config as any;
    expect(c72.allocatorProfile).toMatchObject({ hitsplat: 3, stars: [3, 4, 5, 3], paletteController: 3,
      orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 3, 15, 4, 5, 10, 16], orderSeed: seed([3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16]) });
    expect(c72.healingCenter.x).toBe(176);
    // Absorb: no order field; reducer age == live age (window starts 10 frames after activation, Taunt convention).
    const absorb = cfg(displayed("LOMBRE", "ONIX"), request(71, 0), order, 7)!;
    expect((absorb.config as any).allocatorProfile).toEqual({ hitsplat: 3, orbs: [3, 4, 5, 7, 9, 3, 4, 10], stars: [3, 4, 5, 3], paletteController: 3 });
    expect(absorb.age).toBe(7);
    // Dream Eater: the target's settled front idle offset (ONIX x2 1 as the opponent, 0 as the player target).
    expect((cfg(displayed("WIGGLYTUFF", "ONIX"), request(138, 0), order)!.config as any).targetRestOffset).toEqual({ x2: 1, y2: 0 });
    expect((cfg(displayed("ONIX", "WIGGLYTUFF"), request(138, 1), order)!.config as any).targetRestOffset).toEqual({ x2: 0, y2: 0 });
    // Sunny Day: the 64-entry order, ray slots and the echo-only palette banks (attacker partner 17 player / 18 opponent).
    const sunny = (cfg(displayed("BELLOSSOM", "ONIX"), request(241, 0), order)!.config as any).animationInputs;
    expect(sunny).toMatchObject({ raySlots: [3, 4, 5, 7], paletteBanks: { background: [0, 1, 2, 3], attackerPartner: 17 } });
    expect(sunny.spriteOrder).toHaveLength(64);
    expect((cfg(displayed("ONIX", "BELLOSSOM"), request(241, 1), order)!.config as any).animationInputs.paletteBanks.attackerPartner).toBe(18);
    // Double Team: frontClone "b" on the first body's lent order (4 before 3), "a" when 3 precedes 4.
    expect((cfg(displayed("ONIX", "GROVYLE"), request(104, 0), order)!.config as any).animationProfile.frontClone).toBe("b");
    expect((cfg(displayed("ONIX", "GROVYLE"), request(104, 0), swapped)!.config as any).animationProfile.frontClone).toBe("a");
    // Feather Dance: reducer age = live age + 44 (printer-relative), neutral controller.
    expect(cfg(displayed("PIDGEOTTO", "ONIX"), request(297, 0), order, 5)!.age).toBe(49);
  });

  it("renders every move with an alternate carrier in both orientations without fixture-species throws", () => {
    for (const c of cases) for (const a of [0, 1] as const) {
      if (c.duration[a] === null) continue;
      const status = c.id === 138 ? (a === 0 ? { opponent: "sleep" } : { player: "sleep" }) : {};
      const field = a === 0 ? displayed(c.alt[0], c.alt[1], status) : displayed(c.alt[1], c.alt[0], status);
      const req = request(c.id, a);
      const duration = liveMoveAnimationDuration(req)!;
      const order = knownOrder(c.id);
      expect(cfg(field, req, order), `${c.move} ${a}`).not.toBeNull();
      expect(new Set([0, Math.floor(duration / 4), Math.floor(duration / 2), duration - 1].map(age => render(field, req, age, order))).size, `${c.move} ${a}`).toBeGreaterThan(1);
    }
  }, 240000);

  it("draws Dream Eater's sleep status from the displayed field, not from the orientation", () => {
    const req = request(138, 0), order = knownOrder(138);
    const asleep = render(displayed("WIGGLYTUFF", "ONIX", { opponent: "sleep" }), req, 10, order);
    expect(render(displayed("WIGGLYTUFF", "ONIX"), req, 10, order)).not.toBe(asleep);
  });

  it.each(cases)("completes ordinary $move and preserves ON/OFF rules and RNG", c => {
    const r = c.route;
    const on = generatedCommandAnimationReplay(r.seed, "on", r.moves, r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", r.moves, r.streak);
    const body = on.animations.find(a => a.moveId === c.id && a.attacker === 0);
    expect(body?.ages).toEqual(iu120Ages(c.id, c.duration[0]!));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    const bodyRow = on.commands.find(row => row.type === "move-animation"
      && (row.command as { animation: { moveId: number; attacker: number } }).animation.moveId === c.id
      && (row.command as { animation: { attacker: number } }).animation.attacker === 0)!;
    expect(bodyRow.spriteOrderInput).toBeDefined();
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 240000);
});
