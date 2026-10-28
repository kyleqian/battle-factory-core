import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { carryLiveSpriteOrder, type LiveOamSprite } from "../../src/engine/liveMoveOamAssembler.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
import { willOWispTimeline } from "../../src/animation/willOWisp.ts";
import { sortGbaSpriteOrder } from "../../src/animation/gbaObjCompositor.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { iu120Ages, iu120Extra } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep20.md + oam1: the production hardware-OAM provider (src/engine/liveMoveOamAssembler.ts). Dense
// framebuffer proofs: tools/integration/fixtures/oam1-live/*.json (receipt oam1-live-adapter-receipt.json).
type Json = Record<string, any>;
const corpus = (path: string): Json[] => JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")).frames;
const request = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra,
});
function displayed(player: string, opponent: string, personality?: number): BattleResolutionDisplayedField {
  const mon = (name: string, side: "player" | "opponent") => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none", ...(personality !== undefined && side === "player" ? { personality } : {}),
  });
  return { player: mon(player, "player"), opponent: mon(opponent, "opponent") } as unknown as BattleResolutionDisplayedField;
}
const firstBodyOrder = (): LiveMoveSpriteOrderInput =>
  ({ ...prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(261, 0)).input!, firstBody: true });
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};
const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(`tools/integration/fixtures/oam1-live/${name}.json`, "utf8")) as Fixture;
const hardwareOamAt = (f: Fixture, age: number): string[] => {
  const view = liveView(f, age), effect = view.effect as any;
  const state = liveMoveAnimationPresentation(effect.request, view.field, age, undefined, effect.spriteAllocatorInput,
    effect.spriteOrderInput, undefined, effect.battlerX2Input) as any;
  return state.config.animationInputs.buffers.hardwareOam;
};

describe("oam1 production hardware-OAM provider: MOVE_WILL_O_WISP", () => {
  it("registers Will-O-Wisp with the geometry-derived durations and the activation shadow row", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(261);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[261]).toBe(0);
    expect(liveMoveAnimationDuration(request(261, 0))).toBe(214);
    expect(liveMoveAnimationDuration(request(261, 1))).toBe(213);
  });

  it("derives the orb translation from the anchors (InitAnimLinearTranslationWithSpeed): accepted profile and other dy / dx", () => {
    // Accepted (orb origin = attacker sBattlerCoords, fire origin = target pic point): the former hard-coded 256/75, 257/144.
    const player = willOWispTimeline("player", { x: 72, y: 80 }, { x: 176, y: 49 });
    expect([player.xDelta, player.yDelta, player.orbEnd, player.fireStart, player.fireEnd, player.cleanup]).toEqual([256, 75, 146, 163, 190, 213]);
    const opponent = willOWispTimeline("opponent", { x: 176, y: 40 }, { x: 72, y: 99 });
    expect([opponent.xDelta, opponent.yDelta, opponent.orbEnd, opponent.fireStart, opponent.fireEnd, opponent.cleanup]).toEqual([257, 144, 145, 162, 189, 212]);
    // Elevated GOLBAT target (pic y 37 -> dy -43) and a doubles-like dx (not reachable in singles: X_2 is static).
    expect(willOWispTimeline("player", { x: 72, y: 80 }, { x: 176, y: 37 }).yDelta).toBe((Math.trunc((43 << 8) / 105) & ~1) | 1);
    const wide = willOWispTimeline("player", { x: 72, y: 80 }, { x: 200, y: 49 });
    expect([wide.duration, wide.orbEnd, wide.cleanup]).toEqual([129, 170, 237]);
  });

  it("carries the full 64-slot order: free slots hold the ResetSprite dummy key, so they never pass an in-use sprite", () => {
    const order = [...Array(64).keys()];
    const sprites: LiveOamSprite[] = [
      { slot: 5, attr: [100, 0, 2 << 10], subpriority: 20, visible: true, oamY: 100 },
      { slot: 3, attr: [10, 0, 2 << 10], subpriority: 20, visible: false, oamY: 120 },
    ];
    const carried = carryLiveSpriteOrder(order, sprites, sortGbaSpriteOrder);
    expect(carried.slice(0, 2)).toEqual([3, 5]); // equal priority word: the larger (stale) oam.y first
    expect(carried.slice(2)).toEqual(order.filter(s => s !== 3 && s !== 5)); // dummy keys tie: their order is retained
  });

  it("builds the retained corpus hardware OAM exactly on every body row from production inputs (both accepted orientations)", () => {
    for (const [name, path] of [
      ["will-o-wisp-player-plusle-opponent-shuckle", "tools/compare/evidence/will-o-wisp-player-dense-state.json.gz"],
      ["will-o-wisp-opponent-plusle-player-shuckle", "tools/compare/evidence/will-o-wisp-opponent-dense-state.json.gz"],
    ] as const) {
      const rows = corpus(path), f = fixture(name);
      let exact = 0;
      for (let age = 1; age < rows.length; age += 1) if (JSON.stringify(hardwareOamAt(f, age)) === JSON.stringify(rows[age]!.hardwareOam)) exact += 1;
      expect(exact).toBe(rows.length - 1);
    }
  });

  it("is gated on a known order, non-shiny battlers and a zero target idle rest", () => {
    const field = displayed("NINETALES", "GOLBAT");
    expect(liveMoveAnimationPresentation(request(261, 0), field, 50, undefined, undefined, firstBodyOrder())?.config.move).toBe("WILL_O_WISP");
    expect(liveMoveAnimationPresentation(request(261, 0), field, 50)).toBeNull();
    // Later bodies (any known lend) are exact too: 12/12 lb26 fixtures (later-bodies-lb26/wisp-*).
    const later = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(261, 0)).input!;
    expect(liveMoveAnimationPresentation(request(261, 0), field, 50, undefined, undefined, later)?.config.move).toBe("WILL_O_WISP");
    // A shiny personality under the Factory OT (GET_SHINY_VALUE < 8): the repo has no shiny battle palette.
    const shiny = ((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) << 16 >>> 0;
    expect(liveMoveAnimationPresentation(request(261, 0), displayed("NINETALES", "GOLBAT", shiny), 50, undefined, undefined, firstBodyOrder())).toBeNull();
  });

  // Ordinary generated-rental route (orderConsumerRouteScan.ts WILL_O_WISP 261): seed 82 streak 7, BANETTE slot 1, first body.
  it("route 82/7 BANETTE: adapter active every age, prompt reached; Scene ON/OFF boundaries, RNG and rules identical", () => {
    const on = generatedCommandAnimationReplay(82, "on", [1], 7);
    const off = generatedCommandAnimationReplay(82, "off", [1], 7);
    const bodies = on.animations.filter(a => a.moveId === 261 && a.attacker === 0);
    expect(bodies.map(b => b.ages.length)).toEqual([214 + iu120Extra(261)]);
    expect(bodies[0]!.ages).toEqual(iu120Ages(261, 214));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
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

describe("oam1 production hardware-OAM provider: MOVE_PURSUIT", () => {
  it("registers the normal body (103 rows, activation shadow row) and declines the switch-interception body", () => {
    // d4w (prep41): reclassified to faithful timing (lag at 82, 103 rows = the policy's event phase).
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(228);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(228);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[228]).toBe(0);
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(228, a))).toBe(103);
    expect(liveMoveAnimationDuration(request(228, 1, { turn: 1 }))).toBeNull();
    const field = displayed("SNEASEL", "GOLBAT");
    expect(liveMoveAnimationPresentation(request(228, 0, { power: 40 }), field, 47, undefined, undefined, firstBodyOrder())?.config.move).toBe("PURSUIT");
    expect(liveMoveAnimationPresentation(request(228, 0, { power: 40, turn: 1 }), field, 47, undefined, undefined, firstBodyOrder())).toBeNull();
    expect(liveMoveAnimationPresentation(request(228, 0, { power: 40 }), field, 47)).toBeNull();
    // d4w (prep41 s1.4): the first-body gate is lifted; any known lend engages (later bodies proved dense, tools/integration/fixtures/d4w-live).
    const later = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(228, 0)).input!;
    expect(later.firstBody).toBeUndefined();
    expect(liveMoveAnimationPresentation(request(228, 0, { power: 40 }), field, 47, undefined, undefined, later)?.config.move).toBe("PURSUIT");
  });

  it("builds the retained corpus hardware OAM (entries + matrix pad words) on every body row, both accepted orientations", () => {
    for (const [name, path] of [
      ["pursuit-player-beedrill-opponent-shuckle", "tools/compare/evidence/pursuit-player-dense-state.json.gz"],
      ["pursuit-opponent-beedrill-player-shuckle", "tools/compare/evidence/pursuit-opponent-dense-state.json.gz"],
    ] as const) {
      const rows = corpus(path), f = fixture(name);
      let exact = 0;
      for (let age = 1; age < rows.length; age += 1) if (JSON.stringify(hardwareOamAt(f, age)) === JSON.stringify(rows[age]!.hardwareOam)) exact += 1;
      expect(exact).toBe(rows.length - 1);
    }
  });

  // orderConsumerRouteScan.ts PURSUIT 228: first-body player Pursuit on generated rentals.
  it.each([[52, 0, 1], [38, 14, 2]] as const)("route %i/%i slot %i: active every age, prompt reached, ON/OFF parity", (seed, streak, slot) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const bodies = on.animations.filter(a => a.moveId === 228 && a.attacker === 0);
    expect(bodies.map(b => b.ages.length)).toEqual([103 + iu120Extra(228)]);
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
  }, 240000);
});

describe("oam1 production hardware-OAM provider: MOVE_FURY_CUTTER (counter-1 body)", () => {
  it("registers a 43-row body, runs only as a first body (counter 1 implied) and declines otherwise", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(210);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[210]).toBe(0);
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(210, a))).toBe(43);
    const field = displayed("SCYTHER", "GOLBAT");
    const live = liveMoveAnimationPresentation(request(210, 0, { power: 10 }), field, 10, undefined, undefined, firstBodyOrder()) as any;
    expect(live?.config.animationInputs.counter).toBe(1);
    expect(liveMoveAnimationPresentation(request(210, 0), field, 10)).toBeNull();
    const later = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(210, 0)).input!;
    expect(liveMoveAnimationPresentation(request(210, 0), field, 10, undefined, undefined, later)).toBeNull();
  });

  it("builds the retained counter-1 hardware OAM on every body row, both accepted orientations", () => {
    for (const [name, path] of [
      ["fury-cutter-counter1-player-grovyle-opponent-blissey", "tools/compare/evidence/fury-cutter-player-dense-state.json.gz"],
      ["fury-cutter-counter1-opponent-grovyle-player-blissey", "tools/compare/evidence/fury-cutter-opponent-dense-state.json.gz"],
    ] as const) {
      const rows = corpus(path).slice(0, 43), f = fixture(name);
      let exact = 0;
      for (let age = 1; age < rows.length; age += 1) if (JSON.stringify(hardwareOamAt(f, age)) === JSON.stringify(rows[age]!.hardwareOam)) exact += 1;
      expect(exact).toBe(42);
    }
  });

  // orderConsumerRouteScan.ts FURY_CUTTER 210: first-body player Fury Cutter on generated rentals.
  it.each([[58, 0, 0], [60, 0, 0]] as const)("route %i/%i slot %i: active every age, prompt reached, ON/OFF parity", (seed, streak, slot) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const bodies = on.animations.filter(a => a.moveId === 210 && a.attacker === 0);
    expect(bodies.map(b => b.ages.length)).toEqual([43 + iu120Extra(210)]);
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
  }, 240000);
});
