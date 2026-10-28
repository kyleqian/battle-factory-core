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
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Extra, ont193ScriptTail } from "../helpers/iu120Rows.ts";

const request = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra,
});
function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const knownOrder = (): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(222, 0)).input!;
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
// docs/next-adapters-prep11.md: Leech Seed main body (73), Tri Attack (161), Petal Dance (80), Destiny Bond (194), Air Cutter (314),
// Foresight (193), Sky Uppercut (327), Recycle (278), Spider Web (169). The dense framebuffer proofs are
// tools/integration/fixtures/prep11-live/*.json (receipt prep11-live-adapter-receipt.json); ISSUES #144 is pinned in leafBlade.test.ts.
const DURATION: Record<number, number> = { 73: 141, 161: 284, 80: 244, 194: 188, 314: 112, 193: 167, 327: 188, 278: 203, 169: 207 };
const ORDER_GATED = [161, 80, 194, 314, 193, 327, 169]; // Leech Seed (main body) and Recycle need no order
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live prep11 move adapters", () => {
  it("registers the nine moves with the accepted durations and row-0 shadow rows", () => {
    for (const [id, duration] of Object.entries(DURATION)) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(Number(id));
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[Number(id)]).toBe(0);
      for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(Number(id), a)), id).toBe(duration);
    }
    // Out of scope for this batch.
    // Fly / Bounce (19, 340) are pinned in liveFlyBounce.test.ts.
    // Rollout (205) is pinned in liveRollout.test.ts.
    // Baton Pass (226) became a live adapter later (prep27); it is pinned in liveBatonPassAdapter.test.ts.
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(226);
  });

  it("gates the order consumers on the lent order; Leech Seed and Recycle are order-independent", () => {
    const order = knownOrder();
    const f = displayed("ONIX", "GROVYLE");
    for (const id of Object.keys(DURATION).map(Number)) {
      const gated = ORDER_GATED.includes(id);
      expect(cfg(f, request(id, 0), order), String(id)).not.toBeNull();
      expect(cfg(f, request(id, 1), order), String(id)).not.toBeNull();
      expect(cfg(f, request(id, 0), { known: false } as never) === null, String(id)).toBe(gated);
      expect(cfg(f, request(id, 0)) === null, String(id)).toBe(gated);
    }
  });

  it("derives the configs from the production anchors (prep11 s0.2)", () => {
    const order = knownOrder();
    const lsA = (cfg(displayed("EXEGGCUTE", "ONIX"), request(73, 0))!.config as any);
    expect(lsA).toMatchObject({ body: "main", targetRestOffset: { x2: 1, y2: 0 }, allocatorProfile: { seeds: [3, 4, 5] } });
    expect((cfg(displayed("EXEGGCUTE", "GOLEM"), request(73, 0))!.config as any).targetRestOffset).toEqual({ x2: 0, y2: 0 });
    const tri = (cfg(displayed("PORYGON", "SHUCKLE"), request(161, 0), order)!.config as any).animationProfile;
    expect(tri).toMatchObject({ triangleSlot: 3, fireSlots: [4, 5, 7, 9, 10, 11, 12, 3], lightningSlots: [3, 4, 5], paletteSlots: [3, 12],
      effectSubpriority: 38 });
    // monbg (prep11-monbg-formula.json): the target battler position + the species front-idle x2 (ONIX 1, others 0).
    const mon = (p: string, o: string, a: 0 | 1, id: number) => (cfg(displayed(p, o), request(id, a), order)!.config as any).animationInputs.monbg;
    expect(mon("HITMONLEE", "ONIX", 0, 193)).toMatchObject({ layer: "bg1", spriteX: 177, bgX: -145, inBg2: false, battlerId: 1 });
    expect(mon("HITMONLEE", "GOLEM", 0, 193)).toMatchObject({ spriteX: 176, bgX: -144 });
    expect(mon("ONIX", "MACHOKE", 1, 193)).toMatchObject({ layer: "bg2", spriteX: 72, spriteY: 80, bgX: -40, bgY: -48, inBg2: true, battlerId: 0 });
    // Petal Dance: InitAnimLinearTranslation steps (|dy| << 8) / duration from the script arguments (accepted GLOOM corpora).
    const steps = (p: string, o: string, a: 0 | 1) =>
      (cfg(displayed(p, o), request(80, a), order)!.config as any).animationInputs.flowerFixedPointSteps.map((s: any) => s.y);
    expect(steps("GLOOM", "ONIX", 0)).toEqual([90, 80, 80, 90, 80, 80, 90, 80, 80, 60, 60, 96, 96]);
    expect(steps("ONIX", "GLOOM", 1)).toEqual([76, 80, 80, 76, 80, 80, 76, 80, 80, 60, 60, 96, 96]);
    // Recycle: the arrow origin and the blend task palette id (OBJ_PLTT_ID(bank) + 1).
    expect((cfg(displayed("PORYGON", "GYARADOS"), request(278, 0))!.config as any).animationProfile)
      .toMatchObject({ attackerTop: 81, spriteSlot: 3, matrixNum: 0, attackerPaletteIdPlusOne: 257 });
    expect((cfg(displayed("GYARADOS", "PORYGON"), request(278, 1))!.config as any).animationProfile)
      .toMatchObject({ attackerTop: 33, attackerPaletteIdPlusOne: 273 });
    // Spider Web: the thread leaves 20 px toward the target from the attacker's pic offset.
    expect((cfg(displayed("SPINARAK", "ONIX"), request(169, 0), order)!.config as any).animationInputs.threadOrigin).toEqual({ x: 92, y: 104 });
    expect((cfg(displayed("ONIX", "SPINARAK"), request(169, 1), order)!.config as any).animationInputs.threadOrigin).toEqual({ x: 156, y: 59 });
  });

  const cases: { id: number; alt: [string, string] }[] = [
    { id: 73, alt: ["VENUSAUR", "ONIX"] }, { id: 161, alt: ["DUGTRIO", "SHUCKLE"] }, { id: 80, alt: ["VILEPLUME", "ONIX"] },
    { id: 194, alt: ["GENGAR", "ONIX"] }, { id: 314, alt: ["CROBAT", "CHANSEY"] }, { id: 193, alt: ["HITMONLEE", "ONIX"] },
    { id: 327, alt: ["HITMONCHAN", "ONIX"] }, { id: 278, alt: ["PORYGON", "TAUROS"] }, { id: 169, alt: ["ARIADOS", "ONIX"] },
  ];
  it.each(cases)("renders move $id with an alternate carrier in both orientations", c => {
    for (const a of [0, 1] as const) {
      const field = a === 0 ? displayed(c.alt[0], c.alt[1]) : displayed(c.alt[1], c.alt[0]);
      const req = request(c.id, a), order = knownOrder(), duration = liveMoveAnimationDuration(req)!;
      expect(cfg(field, req, order), `${c.id} ${a}`).not.toBeNull();
      expect(new Set([0, Math.floor(duration / 4), Math.floor(duration / 2), duration - 1].map(age => render(field, req, age, order))).size)
        .toBeGreaterThan(1);
    }
  }, 240000);

  // route = ordinary-input replay (seed / move slot pressed per turn / streak: prep11-route-probe.json, prep11RouteSearch.ts).
  const routes: { move: string; id: number; seed: number; moves: (0 | 1 | 2 | 3)[]; streak: number }[] = [
    { move: "LEECH_SEED 16/28 VENUSAUR", id: 73, seed: 16, moves: [0], streak: 28 },
    { move: "TRI_ATTACK 0/21 DUGTRIO", id: 161, seed: 0, moves: [1], streak: 21 },
    { move: "PETAL_DANCE 49/7 GLOOM", id: 80, seed: 49, moves: [0], streak: 7 },
    { move: "DESTINY_BOND 18/42 GENGAR", id: 194, seed: 18, moves: [3], streak: 42 },
    { move: "AIR_CUTTER 57/7 GOLBAT", id: 314, seed: 57, moves: [0], streak: 7 },
    { move: "FORESIGHT 100/14 HITMONLEE", id: 193, seed: 100, moves: [2], streak: 14 },
    { move: "SKY_UPPERCUT 48/7 HITMONCHAN", id: 327, seed: 48, moves: [1], streak: 7 },
    { move: "SPIDER_WEB 567/0 ARIADOS", id: 169, seed: 567, moves: [1], streak: 0 },
    // Recycle fails without a consumed item: turn 1 Psybeam (opponent Sitrus-triggering hit), turn 2 Recycle (not the first body).
    { move: "RECYCLE 378/0 PORYGON (two turns)", id: 278, seed: 378, moves: [0, 2], streak: 0 },
  ];
  it.each(routes)("completes ordinary $move and preserves ON/OFF rules and RNG", r => {
    const on = generatedCommandAnimationReplay(r.seed, "on", r.moves, r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", r.moves, r.streak);
    const bodies = on.animations.filter(a => a.moveId === r.id && a.attacker === 0);
    // Petal Dance locks in for several turns: every body is complete (one input, 2-3 bodies).
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies.map(b => b.ages.length)).toEqual(bodies.map(() => DURATION[r.id]! + iu120Extra(r.id) + ont193ScriptTail(r.id)));
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
    }
  }, 240000);
});
