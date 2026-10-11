import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveBattlerAnchors, liveBattlerCoordAttrs,
  liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
import { land97Ages } from "../helpers/land97LeadAges.ts";

// docs/next-adapters-prep2.md s2: accepted dense windows (rows); shadow row 0 iff the window starts at activation
// (Explosion -4 and Future Sight -5 start after it and have no row). alt = an alternate carrier pair for the render test.
const cases = [
  { id: 57, move: "SURF", duration: 144, shadow: true, alt: ["SEALEO", "ONIX"], route: { seed: 80, slot: 0 as const, streak: 14 } },
  { id: 330, move: "MUDDY_WATER", duration: 144, shadow: true, alt: ["SWAMPERT", "GOLEM"], route: { seed: 22, slot: 0 as const, streak: 14 } },
  { id: 196, move: "ICY_WIND", duration: 287, shadow: true, alt: ["POLIWHIRL", "ONIX"], route: { seed: 95, slot: 2 as const, streak: 0 } },
  { id: 59, move: "BLIZZARD", duration: 372, shadow: true, alt: ["WALREIN", "GOLEM"], route: { seed: 161, slot: 1 as const, streak: 14 } },
  { id: 252, move: "FAKE_OUT", duration: 86, shadow: true, alt: ["LOMBRE", "ONIX"], route: { seed: 23, slot: 1 as const, streak: 0 } },
  { id: 322, move: "COSMIC_POWER", duration: 241, shadow: true, alt: ["SOLROCK", "ONIX"], route: { seed: 26, slot: 1 as const, streak: 7 } },
  { id: 248, move: "FUTURE_SIGHT", duration: 114, shadow: false, alt: ["ABSOL", "ONIX"], route: { seed: 11, slot: 2 as const, streak: 0 } },
  // S10A Substitute: the former route 17/35 FORRETRESS hits the opponent's Substitute doll (164:1->1 first), so the shared gate
  // declines it (asserted below); 35/35 STEELIX is the first live candidate of r3ProfileRouteSearch.ts 153 8 1 4000 (stall allowed).
  { id: 153, move: "EXPLOSION", duration: 212, shadow: false, alt: ["FORRETRESS", "ONIX"], route: { seed: 35, slot: 3 as const, streak: 35 } },
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

describe("live prep2 move adapters", () => {
  it("registers the eight moves with the accepted durations and shadow rows", () => {
    for (const c of cases) {
      // Icy Wind / Blizzard: reclassified to faithful timing (d4tails, liveMoveTimingPolicy.ts 196 / 59); the exact prep2 proofs stay in scope.
      expect(c.id === 196 || c.id === 59 ? LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS : LIVE_MOVE_ANIMATION_IDS).toContain(c.id);
      for (const a of [0, 1] as const) {
        // Blizzard's accepted windows are 372 rows (player-back) / 361 (opponent-front), the Guillotine precedent.
        const expected = c.id === 59 && a === 1 ? 361 : c.duration;
        expect(liveMoveAnimationDuration(request(c.id, a))).toBe(expected);
      }
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[c.id]).toBe(c.shadow ? 0 : undefined);
    }
  });

  it("pins the derived anchors/coords against the accepted fixtures", () => {
    // Fake Out targetPictureYOffset = target coords.yOffset: accepted 9 (opp-front Shuckle) / 11 (player-back Shuckle).
    expect(cfg(displayed("MAKUHITA", "SHUCKLE"), 252, 0).targetPictureYOffset).toBe(9);
    expect(cfg(displayed("SHUCKLE", "MAKUHITA"), 252, 1).targetPictureYOffset).toBe(11);
    const art = createBattleCommandFieldArtView(displayed("MAKUHITA", "SHUCKLE"));
    expect(liveBattlerCoordAttrs("opponent", art)).toEqual({ ...art.opponent.coords });
    expect(liveBattlerCoordAttrs("player", art)).toEqual({ ...art.player.coords });
    // Icy Wind: Swinub (72,104)/(176,42)/(176,40); opponent Swinub (176,60)/(72,88)/(72,80).
    expect(cfg(displayed("SWINUB", "ONIX"), 196, 0).effectGeometry).toEqual({
      attackerCenter: { x: 72, y: 104 }, targetCenter: { x: 176, y: 42 }, spikeTargetCenter: { x: 176, y: 40 } });
    expect(cfg(displayed("ONIX", "SWINUB"), 196, 1).effectGeometry).toEqual({
      attackerCenter: { x: 176, y: 60 }, targetCenter: { x: 72, y: 88 }, spikeTargetCenter: { x: 72, y: 80 } });
    // Blizzard: Pelipper (72,94)/(176,42); opponent Pelipper (176,36)/(72,88).
    expect(cfg(displayed("PELIPPER", "ONIX"), 59, 0).effectGeometry).toEqual({
      attackerCenter: { x: 72, y: 94 }, targetCenter: { x: 176, y: 42 } });
    expect(cfg(displayed("ONIX", "PELIPPER"), 59, 1).effectGeometry).toEqual({
      attackerCenter: { x: 176, y: 36 }, targetCenter: { x: 72, y: 88 } });
    // The geometry follows the species.
    const alt = displayed("POLIWHIRL", "ONIX");
    expect(cfg(alt, 196, 0).effectGeometry.attackerCenter)
      .toEqual(liveBattlerAnchors("player", createBattleCommandFieldArtView(alt)).picOffsetPoint);
  });

  it("derives the particle slots at any geometry; Blizzard's live window follows its geometry-derived impact start", () => {
    // S10A geoice (docs/icy-wind-blizzard-geometry.md): the slots come from the replay, so the pair the retained table did not
    // cover (PORYGON -> TOGETIC) is live; Blizzard opponent ARBOK -> CATERPIE has impact start 198: before S10A lsbz the fixed
    // 361-row window (197 + 164) declined it; the window is now impact + 164 = 362 rows from the displayed field.
    expect(liveMoveAnimationPresentation(request(196, 0), displayed("SWINUB", "ONIX"), 0)).not.toBeNull();
    expect(liveMoveAnimationPresentation(request(196, 0), displayed("PORYGON", "TOGETIC"), 0)).not.toBeNull();
    expect(() => render(displayed("PORYGON", "TOGETIC"), 196, 0, 100)).not.toThrow();
    expect(liveMoveAnimationDuration(request(59, 1), displayed("CATERPIE", "ARBOK"))).toBe(362);
    expect(liveMoveAnimationPresentation(request(59, 1), displayed("CATERPIE", "ARBOK"), 0)).not.toBeNull();
    expect(() => render(displayed("CATERPIE", "ARBOK"), 59, 1, 100)).not.toThrow();
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

  it.each(cases.filter(c => c.id !== 153))("completes ordinary $move and preserves ON/OFF rules and RNG", c => {
    const r = c.route;
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.slot], r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.slot], r.streak);
    const body = on.animations.find(a => a.moveId === c.id && a.attacker === 0);
    expect(body?.ages).toEqual(land97Ages(c.id, c.duration, body?.opponent));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(2);
    expect(off.boundaries).toHaveLength(2);
    for (let i = 0; i < 2; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 120000);

  it("Explosion: the body ages with the attacker at HP 0, then the replacement screen is the documented boundary", () => {
    const r = cases.find(c => c.id === 153)!.route;
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.slot], r.streak, true);
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.slot], r.streak, true);
    const body = on.animations.find(a => a.moveId === 153 && a.attacker === 0);
    expect(body?.ages).toEqual(land97Ages(153, 212, body?.opponent));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    // setatkhptozero (battle_scripts_1.s:380) precedes attackanimation: the displayed field already shows HP 0.
    const hpZero = on.semanticEvents.some(e => JSON.stringify(e.event).includes("hp-change"));
    expect(hpZero).toBe(true);
    // The driver cannot answer the forced-replacement party screen; both modes stall there with equal rules/RNG.
    expect(on.stalled).toBe(true);
    expect(off.stalled).toBe(true);
    expect(on.state.battleForcedPartySelect).toBeTruthy();
    expect(rulesWithoutSceneMarker(on.state.battle as never)).toEqual(rulesWithoutSceneMarker(off.state.battle as never));
    expect(on.state.battle!.rng).toEqual(off.state.battle!.rng);
  }, 120000);

  it("Explosion into a Substitute doll (route 17/35 FORRETRESS): the body declines to the fallback; ON/OFF rules and RNG equal", () => {
    const on = generatedCommandAnimationReplay(17, "on", [0], 35, true);
    const off = generatedCommandAnimationReplay(17, "off", [0], 35, true);
    expect(on.requests.map((q) => `${q.moveId}:${q.attacker}->${q.target}`)).toEqual(["164:1->1", "153:0->1"]);
    expect(on.animations.find(a => a.moveId === 153)).toBeUndefined();
    expect(on.stalled).toBe(true);
    expect(off.stalled).toBe(true);
    expect(rulesWithoutSceneMarker(on.state.battle as never)).toEqual(rulesWithoutSceneMarker(off.state.battle as never));
    expect(on.state.battle!.rng).toEqual(off.state.battle!.rng);
  }, 120000);
});
