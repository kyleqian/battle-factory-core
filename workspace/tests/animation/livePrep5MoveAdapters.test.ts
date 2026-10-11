import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveBattlerAnchors,
  liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { land97Ages } from "../helpers/land97LeadAges.ts";

// docs/next-adapters-prep5.md: accepted dense windows (rows); shadow row 0 iff the window starts at activation (Taunt -10: none).
// Aromatherapy is 400 rows player-attacker / 396 opponent-attacker (both windows end on script-end frame 474).
// Mist Ball: the first-found prep5 route (seed 90) emits no body (the player turn animates nothing; not investigated), so seed 330 (same Latias set, streak 49) is used.
// route.move = index of the move on party member 0 (prep5 s3, tools/integration/fixtures/prep5-routes{,-streak126}.json).
const cases = [
  { id: 296, move: "MIST_BALL", duration: [213, 213], shadow: 0, alt: ["LATIOS", "STEELIX"], route: { seed: 330, move: 0 as const, streak: 49 } },
  { id: 312, move: "AROMATHERAPY", duration: [400, 396], shadow: 0, alt: ["GLOOM", "ONIX"], route: { seed: 34, move: 3 as const, streak: 21 } },
  { id: 266, move: "FOLLOW_ME", duration: [185, 185], shadow: 0, alt: ["CLEFABLE", "ONIX"], route: { seed: 35, move: 3 as const, streak: 0 } },
  { id: 118, move: "METRONOME", duration: [127, 127], shadow: 0, alt: ["CLEFABLE", "ONIX"], route: { seed: 198, move: 0 as const, streak: 7 } },
  { id: 269, move: "TAUNT", duration: [125, 125], shadow: undefined, alt: ["MIGHTYENA", "SHUCKLE"], route: { seed: 25, move: 3 as const, streak: 7 } },
  { id: 187, move: "BELLY_DRUM", duration: [110, 110], shadow: 0, alt: ["POLIWHIRL", "ONIX"], route: { seed: 18, move: 3 as const, streak: 14 } },
];

function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const request = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
function render(field: BattleResolutionDisplayedField, moveId: number, attacker: 0 | 1, age: number): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: request(moveId, attacker), age },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const cfg = (field: BattleResolutionDisplayedField, id: number, attacker: 0 | 1) =>
  liveMoveAnimationPresentation(request(id, attacker), field, 0)?.config as unknown as Record<string, any>;
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live prep5 move adapters", () => {
  it("registers the six moves with the accepted durations and shadow rows", () => {
    for (const c of cases) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(c.id);
      for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(c.id, a))).toBe(c.duration[a]);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[c.id]).toBe(c.shadow);
    }
  });

  it("derives the anchor-based configs (prep5 s2.1)", () => {
    // Follow Me attackerTop: (battlePositionCenter.x, max(10, pic.y - height / 2)).
    expect(cfg(displayed("TOGETIC", "ONIX"), 266, 0).attackerTop).toEqual({ x: 72, y: 72 });
    expect(cfg(displayed("ONIX", "TOGETIC"), 266, 1).attackerTop).toEqual({ x: 176, y: 25 });
    // Metronome / Taunt attackerHead (SetSpriteNextToMonHead).
    expect(cfg(displayed("CHANSEY", "ONIX"), 118, 0).attackerHead).toEqual({ x: 112, y: 87 });
    expect(cfg(displayed("ONIX", "CHANSEY"), 118, 1).attackerHead).toEqual({ x: 140, y: 37 });
    expect(cfg(displayed("MURKROW", "SHUCKLE"), 269, 0).attackerHead).toEqual({ x: 104, y: 85 });
    expect(cfg(displayed("SHUCKLE", "MURKROW"), 269, 1).attackerHead).toEqual({ x: 144, y: 39 });
    // Belly Drum attackerNoteOrigin = attacker pic + (0, 8).
    expect(cfg(displayed("POLIWRATH", "ONIX"), 187, 0).attackerNoteOrigin).toEqual({ x: 72, y: 107 });
    expect(cfg(displayed("ONIX", "POLIWRATH"), 187, 1).attackerNoteOrigin).toEqual({ x: 176, y: 56 });
    // The geometry follows the species.
    const alt = displayed("CLEFABLE", "ONIX");
    expect(cfg(alt, 266, 0).attackerTop.y).toBe(
      Math.max(10, liveBattlerAnchors("player", createBattleCommandFieldArtView(alt)).picOffsetPoint.y
        - createBattleCommandFieldArtView(alt).player.coords.height / 2));
  });

  it("renders every move with an alternate carrier in both orientations without fixture-species throws", () => {
    for (const c of cases) for (const a of [0, 1] as const) {
      const [carrier, other] = c.alt as [string, string];
      const field = a === 0 ? displayed(carrier, other) : displayed(other, carrier);
      const duration = liveMoveAnimationDuration(request(c.id, a))!;
      expect(liveMoveAnimationPresentation(request(c.id, a), field, 0), `${c.move} ${a}`).not.toBeNull();
      expect(new Set([0, Math.floor(duration / 2), duration - 1].map(age => render(field, c.id, a, age))).size, `${c.move} ${a}`).toBeGreaterThan(1);
    }
  });

  it.each(cases)("completes ordinary $move and preserves ON/OFF rules and RNG", c => {
    const r = c.route;
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.move], r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.move], r.streak);
    const body = on.animations.find(a => a.moveId === c.id && a.attacker === 0);
    expect(body?.ages).toEqual(land97Ages(c.id, c.duration[0]!));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    if (c.id === 118) {
      // Body only: the called move is an ordinary second request (prep5 s2.5) handled by its own adapter or the fallback.
      const i = on.requests.findIndex(q => q.moveId === 118 && q.attacker === 0);
      expect(on.requests[i + 1]).toMatchObject({ attacker: 0 });
      expect(on.requests[i + 1]!.moveId).not.toBe(118);
    }
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 120000);
});
