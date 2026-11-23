import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView, renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveBattlerAnchors,
  liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep6.md: accepted dense windows (rows). Shadow rows: 0 where the window starts at activation (Rock Tomb,
// Safeguard, Sweet Scent, Swallow); Self-Destruct (-4), Knock Off (-6), Faint Attack (-4) start after it and have no row.
// route = prep6 s3 (seed / index of the move on party member 0 / streak). Rock Tomb: the first-found route 0/0/0 emits no body
// (prep6 s3), seed 41 does. Faint Attack has no accepted opponent-attacker evidence: duration/presentation are null there.
const cases = [
  { id: 317, move: "ROCK_TOMB", duration: [174, 174], shadow: 0, alt: ["GOLEM", "ONIX"], route: { seed: 41, move: 1 as const, streak: 0 } },
  { id: 219, move: "SAFEGUARD", duration: [71, 71], shadow: 0, alt: ["WOBBUFFET", "ONIX"], route: { seed: 59, move: 2 as const, streak: 0 } },
  { id: 230, move: "SWEET_SCENT", duration: [175, 175], shadow: 0, alt: ["VICTREEBEL", "ONIX"], route: { seed: 31, move: 3 as const, streak: 0 } },
  { id: 120, move: "SELF_DESTRUCT", duration: [123, 123], shadow: undefined, alt: ["FORRETRESS", "ONIX"], route: { seed: 56, move: 3 as const, streak: 14 } },
  { id: 282, move: "KNOCK_OFF", duration: [44, 44], shadow: undefined, alt: ["SABLEYE", "ONIX"], route: { seed: 15, move: 2 as const, streak: 7 } },
  // Faint Attack: faithful timing (fa185, liveMoveTimingPolicy.ts 185): the player side renders the no-restore-lag phase (liv2: 226 rows = the ROM window 225 + 1).
  { id: 185, move: "FAINT_ATTACK", duration: [226, 227], shadow: undefined, alt: ["MURKROW", "ONIX"], route: { seed: 0, move: 1 as const, streak: 7 } },
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

describe("live prep6 move adapters", () => {
  it("registers the seven moves with the accepted durations and shadow rows", () => {
    for (const c of [...cases, { id: 256, move: "SWALLOW", duration: [163, 161], shadow: 0 }]) {
      expect(c.id === 185 ? LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS : LIVE_MOVE_ANIMATION_IDS).toContain(c.id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[c.id]).toBe(c.shadow);
    }
    for (const c of cases) for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(c.id, a)), `${c.move} ${a}`).toBe(c.duration[a]);
    // Swallow: per stockpile branch (request.turn) and side; turn 0 (failed / unstocked) has no accepted body.
    for (const turn of [1, 2, 3]) {
      expect(liveMoveAnimationDuration(request(256, 0, turn))).toBe(148 + 15 * turn);
      expect(liveMoveAnimationDuration(request(256, 1, turn))).toBe(146 + 15 * turn);
    }
    expect(liveMoveAnimationDuration(request(256, 0, 0))).toBeNull();
    expect(liveMoveAnimationDuration(request(256, 0, 4))).toBeNull();
  });

  it("derives the anchor-based configs (prep6 s2.1)", () => {
    // Rock Tomb: the target battler slot is the known-entry slot (opponent 8, player 6); ONIX rests at x2 = 1 on the opponent side.
    expect(cfg(displayed("GRIMER", "ONIX"), 317, 0)).toMatchObject({
      targetSpriteSlot: 8, targetInitialX2: 1, effectCenter: { x: 176, y: 42 } });
    expect(cfg(displayed("ONIX", "GRIMER"), 317, 1)).toMatchObject({
      targetSpriteSlot: 6, targetInitialX2: 0, effectCenter: { x: 72, y: 88 } });
    // Safeguard ringSubpriority = attacker subpriority - 2; ring slots = known-entry first-free.
    expect(cfg(displayed("BAYLEEF", "ONIX"), 219, 0).animationProfile).toEqual({ ringSlots: [3, 4, 5], ringSubpriority: 28 });
    expect(cfg(displayed("ONIX", "BAYLEEF"), 219, 1).animationProfile).toEqual({ ringSlots: [3, 4, 5], ringSubpriority: 38 });
    // Sweet Scent: 24 petals in ROM spawn order, targetSubpriority = attacker subpriority - 2.
    const sweet = cfg(displayed("WEEPINBELL", "ONIX"), 230, 0).animationProfile;
    expect(sweet.spriteSlots).toHaveLength(24);
    expect(sweet.targetSubpriority).toBe(28);
    expect(cfg(displayed("ONIX", "WEEPINBELL"), 230, 1).animationProfile.targetSubpriority).toBe(38);
    // Swallow: stockpile = request.turn; the attacker's affine centre is the sprite centre (not the pic point); pic + yOffset
    // follow the live species.
    for (const turn of [1, 2, 3]) {
      expect(cfg(displayed("PELIPPER", "DELCATTY"), 256, 0, turn)).toMatchObject({
        stockpileCount: turn, attackerPictureOffset: { x: 72, y: 94 }, attackerPictureYOffset: 6,
        attacker: { geometry: { animationCenter: { x: 72, y: 86 } } } });
    }
    expect(cfg(displayed("DELCATTY", "PELIPPER"), 256, 1, 2)).toMatchObject({
      stockpileCount: 2, attackerPictureOffset: { x: 176, y: 36 }, attackerPictureYOffset: 4,
      attacker: { geometry: { animationCenter: { x: 176, y: 36 } } } });
    // Pictures follow the species.
    const alt = displayed("SWALOT", "ONIX");
    expect(cfg(alt, 256, 0, 1).attackerPictureOffset).toEqual(liveBattlerAnchors("player", createBattleCommandFieldArtView(alt)).picOffsetPoint);
    // Faint Attack: either attacker side (S10A sides).
    expect(liveMoveAnimationPresentation(request(185, 1), displayed("ONIX", "GROVYLE"), 0)).not.toBeNull();
    expect(liveMoveAnimationPresentation(request(185, 0), displayed("ONIX", "GROVYLE"), 0)).not.toBeNull();
    // Sweet Scent's accepted rows start at reducer age -4 (sweetScentFramebuffer.ts); the others map age 1:1.
    expect(liveMoveAnimationPresentation(request(230, 0), displayed("WEEPINBELL", "ONIX"), 10)!.age).toBe(6);
    expect(liveMoveAnimationPresentation(request(317, 0), displayed("GRIMER", "ONIX"), 10)!.age).toBe(10);
  });

  it("renders every move with an alternate carrier in both orientations without fixture-species throws", () => {
    for (const c of cases) for (const a of [0, 1] as const) {
      const [carrier, other] = c.alt as [string, string];
      const field = a === 0 ? displayed(carrier, other) : displayed(other, carrier);
      const duration = liveMoveAnimationDuration(request(c.id, a));
      if (duration === null) {
        expect(c.move, `${c.move} ${a}`).toBe("FAINT_ATTACK");
        expect(liveMoveAnimationPresentation(request(c.id, a), field, 0)).toBeNull();
        continue;
      }
      expect(liveMoveAnimationPresentation(request(c.id, a), field, 0), `${c.move} ${a}`).not.toBeNull();
      expect(new Set([0, Math.floor(duration / 4), Math.floor(duration / 2), duration - 1].map(age => render(field, c.id, a, age))).size, `${c.move} ${a}`).toBeGreaterThan(1);
    }
    for (const a of [0, 1] as const) for (const turn of [1, 2, 3]) {
      const field = a === 0 ? displayed("SWALOT", "ONIX") : displayed("ONIX", "SWALOT");
      const duration = liveMoveAnimationDuration(request(256, a, turn))!;
      expect(liveMoveAnimationPresentation(request(256, a, turn), field, 0)).not.toBeNull();
      expect(new Set([0, Math.floor(duration / 4), Math.floor(duration / 2), duration - 1].map(age => render(field, 256, a, age, turn))).size).toBeGreaterThan(1);
    }
  });

  // Slot source (prep6 s2.2/s2.3): the ring / petal / battler slots are the known-entry first-free labels; the host-less constants
  // are justified because no live pixel depends on them (every age, both orientations, relabelled slots render identically).
  it("slot labels are pixel-irrelevant for Safeguard, Sweet Scent and Rock Tomb", () => {
    const run = (id: number, attacker: 0 | 1, player: string, opponent: string, mutate: (c: any) => void): string => {
      const field = displayed(player, opponent);
      const d = liveMoveAnimationDuration(request(id, attacker))!;
      const h = createHash("sha256");
      for (let age = 0; age < d; age += 1) {
        const state = liveMoveAnimationPresentation(request(id, attacker), field, age)!;
        const config = { ...state.config } as any;
        mutate(config);
        const fb = new Uint8Array(240 * 160 * 4);
        renderSceneOnMovePresentation(fb, { ...state, config }, true);
        h.update(fb);
      }
      return h.digest("hex");
    };
    for (const a of [0, 1] as const) {
      const pair = (carrier: string) => (a === 0 ? [carrier, "ONIX"] : ["ONIX", carrier]) as [string, string];
      const [sp, so] = pair("WOBBUFFET");
      const sg = run(219, a, sp, so, () => {});
      expect(run(219, a, sp, so, c => { c.animationProfile = { ...c.animationProfile, ringSlots: [10, 11, 12] }; })).toBe(sg);
      expect(run(219, a, sp, so, c => { c.animationProfile = { ...c.animationProfile, ringSlots: [5, 4, 3] }; })).toBe(sg);
      const [wp, wo] = pair("VICTREEBEL");
      const sw = run(230, a, wp, wo, () => {});
      expect(run(230, a, wp, wo, c => { c.animationProfile = { ...c.animationProfile,
        spriteSlots: c.animationProfile.spriteSlots.map((x: number) => x + 20) }; })).toBe(sw);
      const [rp, ro] = pair("GOLEM");
      const rt = run(317, a, rp, ro, () => {});
      for (const slot of [0, 20]) expect(run(317, a, rp, ro, c => { c.targetSpriteSlot = slot; })).toBe(rt);
    }
  }, 120000);

  it.each(cases)("completes ordinary $move and preserves ON/OFF rules and RNG", c => {
    const r = c.route;
    const stall = c.id === 120;
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.move], r.streak, stall);
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.move], r.streak, stall);
    const body = on.animations.find(a => a.moveId === c.id && a.attacker === 0);
    expect(body?.ages).toEqual(iu120Ages(c.id, c.duration[0]!));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    if (stall) {
      // setatkhptozero precedes attackanimation: the displayed field already shows HP 0. The driver cannot answer the
      // forced-replacement party screen; both modes stall there with equal rules/RNG.
      expect(on.semanticEvents.some(e => JSON.stringify(e.event).includes("hp-change"))).toBe(true);
      expect(on.stalled).toBe(true);
      expect(off.stalled).toBe(true);
      expect(on.state.battleForcedPartySelect).toBeTruthy();
      expect(rulesWithoutSceneMarker(on.state.battle as never)).toEqual(rulesWithoutSceneMarker(off.state.battle as never));
      expect(on.state.battle!.rng).toEqual(off.state.battle!.rng);
      return;
    }
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 120000);

  // prep6 s3: Swalot set 248, seed 33 streak 7; [Stockpile x n, Swallow] = move indexes [0 x n, 1] -> Swallow request.turn n.
  it.each([1, 2, 3])("completes ordinary Swallow after %i Stockpile and preserves ON/OFF rules and RNG", n => {
    const slots = [...Array.from({ length: n }, () => 0 as const), 1 as const];
    const on = generatedCommandAnimationReplay(33, "on", slots, 7);
    const off = generatedCommandAnimationReplay(33, "off", slots, 7);
    const request = on.requests.find(q => q.moveId === 256 && q.attacker === 0);
    expect(request?.turn).toBe(n);
    const body = on.animations.find(a => a.moveId === 256 && a.attacker === 0);
    expect(body?.ages).toEqual(iu120Ages(256, 148 + 15 * n));
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 180000);
});
