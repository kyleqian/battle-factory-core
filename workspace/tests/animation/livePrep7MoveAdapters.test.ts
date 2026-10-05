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
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";

// docs/next-adapters-prep7.md: live durations are counted from the activation frame to the first inactive script row
// (the later hit/HP/text rows belong to the queue's own commands). Shadow row 0 = live age 0 = activation.
// route = prep7 s2.5 (seed / index of the move on party member 0 / streak, from prep7-routes.json).
type Orders = readonly [number | null, number | null];
const cases: { id: number; move: string; duration: Orders; shadow: number | undefined; alt: [string, string];
  route: { seed: number; move: 0 | 1 | 2 | 3; streak: number } }[] = [
  { id: 332, move: "AERIAL_ACE", duration: [50, 50], shadow: 0, alt: ["CHARIZARD", "ONIX"], route: { seed: 3, move: 0, streak: 0 } },
  { id: 98, move: "QUICK_ATTACK", duration: [33, 33], shadow: 0, alt: ["RAICHU", "ONIX"], route: { seed: 3, move: 1, streak: 0 } },
  // Ice Punch has no accepted-species rental carrier: the ordinary route is the alternate-species Gengar route (prep7 s2.5).
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
function render(field: BattleResolutionDisplayedField, moveId: number, attacker: 0 | 1, age: number, turn = 0): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: request(moveId, attacker, turn), age },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const cfg = (field: BattleResolutionDisplayedField, id: number, attacker: 0 | 1, turn = 0) =>
  liveMoveAnimationPresentation(request(id, attacker, turn), field, 0)?.config as unknown as Record<string, any>;
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

  it("renders every move with an alternate carrier in both orientations without fixture-species throws", () => {
    for (const c of cases) for (const a of [0, 1] as const) {
      const [carrier, other] = c.alt;
      const field = a === 0 ? displayed(carrier, other) : displayed(other, carrier);
      const duration = liveMoveAnimationDuration(request(c.id, a));
      if (duration === null) {
        expect(liveMoveAnimationPresentation(request(c.id, a), field, 0)).toBeNull();
        continue;
      }
      expect(liveMoveAnimationPresentation(request(c.id, a), field, 0), `${c.move} ${a}`).not.toBeNull();
      expect(new Set([0, Math.floor(duration / 4), Math.floor(duration / 2), duration - 1].map(age => render(field, c.id, a, age))).size, `${c.move} ${a}`).toBeGreaterThan(1);
    }
  }, 120000);

  it.each(cases)("completes ordinary $move and preserves ON/OFF rules and RNG", c => {
    const r = c.route;
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.move], r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.move], r.streak);
    const body = on.animations.find(a => a.moveId === c.id && a.attacker === 0);
    expect(body?.ages).toEqual(Array.from({ length: c.duration[0]! }, (_, age) => age));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 120000);
});
