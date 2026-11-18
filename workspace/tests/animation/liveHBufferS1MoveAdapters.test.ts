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
import { HPD4_BODY_LEAD_ROWS, iu120Ages } from "../helpers/iu120Rows.ts";

// docs/h-buffer-s1-prep.md: accepted dense windows (rows); shadow row 0 iff the window starts at activation
// (Bind +2, the first non-zero row; Dragon Breath -6 has no row). alt = an alternate carrier pair for the render test.
// Bind/Wrap miss (75%/85% accuracy) emits no body, so the first-found prep4 routes (136/0, 65/0) were replaced by hitting
// seeds of the same carriers (tools/integration/hbufferS1RouteScan.ts). route.move = index of the move on party member 0 (prep s3, tools/integration/fixtures/prep4-routes.json).
const cases = [
  { id: 212, move: "MEAN_LOOK", duration: 171, shadow: 0, alt: ["SABLEYE", "ONIX"], route: { seed: 25, move: 1 as const, streak: 14 } },
  { id: 265, move: "SMELLING_SALT", duration: 121, shadow: 0, alt: ["MACHOP", "ONIX"], route: { seed: 21, move: 1 as const, streak: 21 } },
  { id: 111, move: "DEFENSE_CURL", duration: 100, shadow: 0, alt: ["SANDSHREW", "ONIX"], route: { seed: 85, move: 1 as const, streak: 0 } },
  { id: 275, move: "INGRAIN", duration: 164, shadow: 0, alt: ["LILEEP", "ONIX"], route: { seed: 26, move: 2 as const, streak: 0 } },
  { id: 35, move: "WRAP", duration: 38, shadow: 0, alt: ["OMANYTE", "ONIX"], route: { seed: 67, move: 3 as const, streak: 0 } },
  { id: 20, move: "BIND", duration: 45, shadow: 2, alt: ["ARBOK", "ONIX"], route: { seed: 138, move: 1 as const, streak: 0 } },
  { id: 225, move: "DRAGON_BREATH", duration: 83, shadow: undefined, alt: ["DRATINI", "ONIX"], route: { seed: 136, move: 2 as const, streak: 0 } },
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

describe("live H_BUFFER S1 move adapters", () => {
  it("registers the seven moves with the accepted durations and shadow rows", () => {
    for (const c of cases) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(c.id);
      for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(c.id, a))).toBe(c.duration);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[c.id]).toBe(c.shadow);
    }
  });

  it("pins the derived configs against the accepted fixtures (prep s2)", () => {
    // Defense Curl: animationCenter = battlePositionCenter + (0,6), not the pic point (72,102)/(176,56).
    expect(cfg(displayed("PHANPY", "ONIX"), 111, 0).attacker.geometry.animationCenter).toEqual({ x: 72, y: 86 });
    expect(cfg(displayed("ONIX", "PHANPY"), 111, 1).attacker.geometry.animationCenter).toEqual({ x: 176, y: 46 });
    expect(cfg(displayed("PHANPY", "ONIX"), 111, 0).animationProfile).toEqual({ attackerPicYOffset: 14, attackerSubpriority: 30 });
    expect(cfg(displayed("ONIX", "PHANPY"), 111, 1).animationProfile.attackerSubpriority).toBe(40);
    // Mean Look / Ingrain: the attacker's subpriority.
    expect(cfg(displayed("MURKROW", "ONIX"), 212, 0).animationProfile).toEqual({ targetSubpriority: 30 });
    expect(cfg(displayed("ONIX", "MURKROW"), 212, 1).animationProfile).toEqual({ targetSubpriority: 40 });
    expect(cfg(displayed("CACTURNE", "ONIX"), 275, 0).animationProfile).toEqual({ attackerSubpriority: 30 });
    expect(cfg(displayed("ONIX", "CACTURNE"), 275, 1).animationProfile).toEqual({ attackerSubpriority: 40 });
    // Smelling Salt: target pic coords (Onix opponent-front / player-back).
    expect(cfg(displayed("GRANBULL", "ONIX"), 265, 0).animationProfile).toEqual({
      targetLeft: 148, targetRight: 204, targetTop: 10, targetPictureY: 42, targetVerticalSpan: 60 });
    expect(cfg(displayed("ONIX", "GRANBULL"), 265, 1).animationProfile).toEqual({
      targetLeft: 44, targetRight: 100, targetTop: 56, targetPictureY: 88, targetVerticalSpan: 64 });
    // Dragon Breath: attacker/target pic points and target subpriority.
    expect(cfg(displayed("ONIX", "MURKROW"), 225, 0).animationProfile).toMatchObject({
      attackerCenter: { x: 72, y: 88 }, targetCenter: { x: 176, y: 51 }, attackerSide: "player", targetSubpriority: 40 });
    expect(cfg(displayed("MURKROW", "ONIX"), 225, 1).animationProfile).toMatchObject({
      attackerCenter: { x: 176, y: 42 }, targetCenter: { x: 72, y: 97 }, attackerSide: "opponent", targetSubpriority: 30 });
    // The geometry follows the species.
    const alt = displayed("DRATINI", "ONIX");
    expect(cfg(alt, 225, 0).animationProfile.attackerCenter)
      .toEqual(liveBattlerAnchors("player", createBattleCommandFieldArtView(alt)).picOffsetPoint);
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
    expect(body?.ages).toEqual(iu120Ages(c.id, c.duration, "player", HPD4_BODY_LEAD_ROWS.get(c.id)));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(2);
    expect(off.boundaries).toHaveLength(2);
    for (let i = 0; i < 2; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 120000);
});
