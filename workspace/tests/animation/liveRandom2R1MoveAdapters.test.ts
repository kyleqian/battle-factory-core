import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import plans from "../../tools/integration/fixtures/prep12-random2/plans.json" with { type: "json" };
import activationProbes from "../../tools/integration/fixtures/random2-r1/activation-probes.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import {
  LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS, LIVE_MOVE_RANDOM2_PLANS, activateLiveMovePresentationRng,
  liveMovePresentationRngBodyKey, miniTwinklingStarFromWords, tickLiveMovePresentationRngSession,
} from "../../src/engine/liveMovePresentationRng.ts";
import {
  createPresentationRngHostAt, createPresentationRngSession, presentationRngBodyWords,
} from "../../src/engine/presentationRngHost.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";
import { fixturePresentationRng, liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import { iu120EffectAges } from "../helpers/iu120Rows.ts";

type PlanEntry = { key: string; acceptedActivationValue: number; draws: { ageOffset: number; count: number }[];
  pinnedWords: unknown; predictedFromPlan: unknown; alternate?: { activationValue: number; firstWords: number[] } };
const planMoves = (plans as unknown as { moves: Record<string, { entries: PlanEntry[] }> }).moves;
const probes = (activationProbes as unknown as { probes: { label: string; bodies: { activationValue: number;
  plan: { ageOffset: number; count: number }[]; words: number[][] }[] }[] }).probes;
const fixture = (path: string): Fixture => {
  const source = JSON.parse(readFileSync(path, "utf8")) as Fixture;
  return source.sourceFixture ? { ...JSON.parse(readFileSync(source.sourceFixture, "utf8")), ...source } : source;
};

/** Per move: prep12 plan key, move id, accepted fixtures (player/opponent), alternate, opponent probe label. */
const MOVES = [
  {
    name: "double-kick", id: 24,
    // plans.json form: the four raw words (fistRandom x, y, xSign, ySign).
    plansForm: (draws: readonly (readonly number[])[]): unknown => draws.flat(),
    fixtures: {
      player: "tools/integration/fixtures/random2-r1/double-kick-player-nidorina-opponent-onix.json",
      opponent: "tools/integration/fixtures/random2-r1/double-kick-opponent-nidorina-player-onix.json",
      alternate: "tools/integration/fixtures/random2-r1/double-kick-alt-player-hitmonlee-opponent-golem.json",
    },
    probe: "double-kick-opponent",
    route: { seed: 51, streak: 0, slot: 0 as const, turns: 2, bodies: 4 }, // both hits on both turns
  },
  {
    name: "astonish", id: 310,
    // plans.json form: per droplet [w & 0x1ff, w & 0x7f].
    plansForm: (draws: readonly (readonly number[])[]): unknown => {
      const w = draws.flat();
      return [[w[0]! & 0x1ff, w[1]! & 0x7f], [w[2]! & 0x1ff, w[3]! & 0x7f]];
    },
    fixtures: {
      player: "tools/integration/fixtures/random2-r1/astonish-player-loudred-opponent-onix.json",
      opponent: "tools/integration/fixtures/random2-r1/astonish-opponent-loudred-player-onix.json",
      alternate: "tools/integration/fixtures/random2-r1/astonish-alt-player-gengar-opponent-golem.json",
    },
    probe: "astonish-opponent",
    // First-found 6/0 LOUDRED reaches the body on turn 1 only; 8/0 LOUDRED reaches it on both turns.
    route: { seed: 8, streak: 0, slot: 2 as const, turns: 2, bodies: 2 },
  },
  {
    name: "thrash", id: 37,
    // plans.json form: three raw four-word groups (fistRandom[g] x, y, xSign, ySign).
    plansForm: (draws: readonly (readonly number[])[]): unknown => draws.map((group) => [...group]),
    fixtures: {
      player: "tools/integration/fixtures/random2-r1/thrash-player-tauros-opponent-onix.json",
      opponent: "tools/integration/fixtures/random2-r1/thrash-opponent-tauros-player-onix.json",
      alternate: "tools/integration/fixtures/random2-r1/thrash-alt-player-snorlax-opponent-golem.json",
    },
    probe: "thrash-opponent",
    // 26/21 TAUROS: two chosen Thrash turns lock in for 2 + 3 consecutive bodies (one per lock-in segment).
    route: { seed: 26, streak: 21, slot: 1 as const, turns: 2, bodies: 5 },
  },
  {
    name: "flail", id: 175,
    // plans.json form: [[w0 % 48, w1 % 24]] (the hit-splat x2 + 24, y2 + 12).
    plansForm: (draws: readonly (readonly number[])[]): unknown => [[draws[0]![0]! % 48, draws[0]![1]! % 24]],
    fixtures: {
      player: "tools/integration/fixtures/random2-r1/flail-player-krabby-opponent-onix.json",
      opponent: "tools/integration/fixtures/random2-r1/flail-opponent-krabby-player-onix.json",
      alternate: "tools/integration/fixtures/random2-r1/flail-alt-player-magikarp-opponent-golem.json",
    },
    probe: "flail-full-hp-opponent",
    // 43/0 KRABBY: Flail at power 20 then 40 (request.power = gBattleMovePower after the HP drop).
    route: { seed: 43, streak: 0, slot: 2 as const, turns: 2, bodies: 2 },
  },
  {
    name: "wish", id: 273,
    // plans.json form: per star [tileOffset, yOffset] (miniTwinklingStarFromWords).
    plansForm: (draws: readonly (readonly number[])[]): unknown => draws.map((pair) => {
      const star = miniTwinklingStarFromWords(pair[0]!, pair[1]!);
      return [star.tileOffset, star.yOffset];
    }),
    fixtures: {
      player: "tools/integration/fixtures/random2-r1/wish-player-illumise-opponent-onix.json",
      opponent: "tools/integration/fixtures/random2-r1/wish-opponent-illumise-player-onix.json",
      alternate: "tools/integration/fixtures/random2-r1/wish-alt-player-volbeat-opponent-golem.json",
    },
    probe: "wish-opponent",
    // First-found 16/14 PLUSLE: turn 1 Wish body; the turn-2 Wish fails by rule (a wish is pending), no body.
    route: { seed: 16, streak: 14, slot: 3 as const, turns: 2, bodies: 1 },
  },
] as const;

const sessionKey = liveMovePresentationRngBodyKey({ resolutionId: { requestId: 0 }, segmentIndex: 0, commandIndex: 0 });

describe("faithful-random live adapters: plans and accounting", () => {
  it("production plans equal prep12 plans.json and stay disjoint from the scoped-exact ids", () => {
    for (const move of MOVES) {
      expect(LIVE_MOVE_RANDOM2_PLANS[move.id]).toEqual(planMoves[move.name]!.entries[0]!.draws.map(
        ({ ageOffset, count }) => ({ ageOffset, count })));
    }
    // Hyper Beam (63) is the prep13 and Rain Dance (240) / Water Pulse (352) the prep14 faithful-random adapters
    // (tests/animation/livePrep13MoveAdapters.test.ts, liveRandom2R4MoveAdapters.test.ts; Mud-Slap 189 / Sand-Attack 28: liveRandom2R5MoveAdapters.test.ts; Lovely Kiss 142: liveProfileMoveAdapters.test.ts; Luster Purge 295: livePrep29Adapters.test.ts; Flatter 260: liveSkillSwapFlatterAdapters.test.ts).
    expect([...LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS].sort((a, b) => a - b)).toEqual([...MOVES.map((m) => m.id), 63, 240, 352, 189, 28, 142, 295, 260].sort((a, b) => a - b));
    for (const id of LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS) {
      expect((LIVE_MOVE_ANIMATION_IDS as readonly number[]).includes(id)).toBe(false);
      expect(liveMoveAnimationDuration({ moveId: id, attacker: 0, target: 1, turn: 0, power: 20, damage: 0, friendship: 70, multihit: 0 })).not.toBeNull();
    }
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    expect((status.faithfulRandomAdapters as { id: number }[]).map((e) => e.id).sort((a, b) => a - b))
      .toEqual([...LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS].sort((a, b) => a - b));
  });

  it.each(MOVES)("$name: the production activation reproduces every accepted / probed vector (pinned provenance)", (move) => {
    const pinnedWords = (value: number) => {
      const host = activateLiveMovePresentationRng(
        createPresentationRngHostAt(createPresentationRngState(value, "pinned")), { moveId: move.id }, sessionKey);
      const record = presentationRngBodyWords(host, sessionKey)!;
      expect(record.provenance).toBe("pinned");
      expect(record.activationValue).toBe(value);
      return record.draws;
    };
    for (const entry of planMoves[move.name]!.entries) {
      const draws = pinnedWords(entry.acceptedActivationValue);
      expect(move.plansForm(draws)).toEqual(entry.predictedFromPlan);
      if (entry.pinnedWords !== null) expect(move.plansForm(draws)).toEqual(entry.pinnedWords);
      if (entry.alternate) {
        expect(pinnedWords(entry.alternate.activationValue).flat().slice(0, entry.alternate.firstWords.length))
          .toEqual(entry.alternate.firstWords);
      }
    }
    for (const body of probes.find((p) => p.label === move.probe)!.bodies) {
      expect(LIVE_MOVE_RANDOM2_PLANS[move.id]).toEqual(body.plan.map(({ ageOffset, count }) => ({ ageOffset, count })));
      expect(pinnedWords(body.activationValue).map((d) => [...d])).toEqual(body.words);
    }
    // Each pinned fixture names its activation (never words) and the harness activates through production.
    for (const path of Object.values(move.fixtures)) {
      const f = fixture(path);
      const view = liveView(f, 0);
      const effect = view.effect as { request: { moveId: number }; presentationRng?: { host: unknown } };
      expect(effect.request.moveId).toBe(move.id);
      expect(fixturePresentationRng(f, effect.request as never)!.host).toEqual(effect.presentationRng!.host);
    }
  });

  it.each(MOVES)("$name: no activated body -> no live config (scene-off fallback); render never draws", (move) => {
    const f = fixture(move.fixtures.player);
    const view = liveView(f, 12);
    const effect = view.effect as Parameters<typeof liveMoveAnimationPresentation>[0] extends never ? never : {
      request: Parameters<typeof liveMoveAnimationPresentation>[0]; age: number;
      presentationRng: { host: ReturnType<typeof createPresentationRngHostAt>; key: string } };
    expect(liveMoveAnimationPresentation(effect.request, view.field, 12)).toBeNull();
    expect(liveMoveAnimationPresentation(effect.request, view.field, 12, undefined, undefined, undefined,
      { host: effect.presentationRng.host, key: "other-body" })).toBeNull();
    expect(liveMoveAnimationPresentation(effect.request, view.field, 12, undefined, undefined, undefined,
      { host: null, key: effect.presentationRng.key })).toBeNull();
    const before = JSON.stringify(effect.presentationRng.host);
    const a = new Uint8Array(240 * 160 * 4), b = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(a, view);
    renderBattleResolutionLiveView(b, view);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    expect(JSON.stringify(effect.presentationRng.host)).toBe(before);
  });

  it.each(MOVES)("$name: ISSUES #142 shadow row 0 for an elevated opponent (both orientations)", (move) => {
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[move.id]).toBe(0);
    const rows = JSON.parse(readFileSync("tools/integration/fixtures/issue142-shadow-rows-extra.json", "utf8")).rows
      .filter((r: { id: number }) => r.id === move.id);
    expect(rows.map((r: { orientation: string }) => r.orientation).sort()).toEqual(["opponent", "player"]);
  });
});

describe("faithful-random live adapters: surrogate ordinary routes", () => {
  const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
  it.each(MOVES)("$name: route reaches every body, live at every age, surrogate words; logic/RNG unchanged across seeds and Scene ON/OFF", (move) => {
    const { seed, streak, slot, turns } = move.route;
    const slots = Array(turns).fill(slot) as (0 | 1 | 2 | 3)[];
    const a = random2Route(seed, "on", slots, streak, SEED_A);
    const a2 = random2Route(seed, "on", slots, streak, SEED_A);
    const b = random2Route(seed, "on", slots, streak, SEED_B);
    const off = random2Route(seed, "off", slots, streak, SEED_A);
    const duration = liveMoveAnimationDuration({ moveId: move.id, attacker: 0, target: 1, turn: 0, power: 20, damage: 0, friendship: 70, multihit: 0 })!;
    const bodies = a.bodies.filter((body) => body.moveId === move.id && body.attacker === 0);
    expect(bodies).toHaveLength(move.route.bodies);
    expect(new Set(bodies.map((body) => body.key)).size).toBe(bodies.length);
    for (const body of bodies) {
      expect(body.ages).toEqual(iu120EffectAges(move.id, duration));
      expect(body.active.every(Boolean)).toBe(true);
      expect(body.provenance).toBe("surrogate");
      expect(body.words).toHaveLength(LIVE_MOVE_RANDOM2_PLANS[move.id]!.reduce((n, step) => n + step.count, 0));
      expect(body.activationHostFrame).not.toBeNull();
    }
    if (move.id === 175) expect(bodies.map((body) => body.power)).toEqual([20, 40]);
    // Following prompt reached after every turn.
    expect(a.run.stalled).toBe(false);
    expect(a.run.boundaries).toHaveLength(turns + 1);
    expect(a.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    // Visual reproducibility: same seed -> identical words and frames; another seed -> different words.
    expect(a2.bodies).toEqual(a.bodies);
    const bBodies = b.bodies.filter((body) => body.moveId === move.id && body.attacker === 0);
    expect(bBodies.map((body) => body.key)).toEqual(bodies.map((body) => body.key));
    for (let i = 0; i < bodies.length; i += 1) expect(bBodies[i]!.words).not.toEqual(bodies[i]!.words);
    // Scene OFF presents no move body and draws nothing.
    expect(off.bodies).toEqual([]);
    // Gameplay: identical boundaries (rules except the scene bit, RNG, battle boundary) for both seeds and Scene ON/OFF.
    const rules = (value: (typeof a.run.boundaries)[number]) => ({
      ...value.rules, rulesContext: { ...value.rules.rulesContext, hitMarker: value.rules.rulesContext.hitMarker & ~0x80 } });
    expect(b.run.boundaries).toEqual(a.run.boundaries);
    expect(off.run.boundaries).toHaveLength(a.run.boundaries.length);
    for (let i = 0; i < a.run.boundaries.length; i += 1) {
      expect(rules(off.run.boundaries[i]!)).toEqual(rules(a.run.boundaries[i]!));
      expect(off.run.boundaries[i]!.rng).toEqual(a.run.boundaries[i]!.rng);
      expect(off.run.boundaries[i]!.boundary).toEqual(a.run.boundaries[i]!.boundary);
    }
    expect(b.run.state.facilityState).toEqual(a.run.state.facilityState);
    expect(off.run.state.facilityState).toEqual(a.run.state.facilityState);
    expect(b.run.state.round.rules.rngValue).toBe(a.run.state.round.rules.rngValue);
    expect(off.run.state.round.rules.rngValue).toBe(a.run.state.round.rules.rngValue);
  }, 120000);

  it("the session tick steps once per presented frame and activates only at live age 0", () => {
    const route = random2Route(MOVES[0].route.seed, "on", [MOVES[0].route.slot], MOVES[0].route.streak, SEED_A);
    const host = route.session.host!;
    for (const record of host.bodies) expect(record.words.provenance).toBe("surrogate");
    // A null orchestrator drops the host; the activation helper is a no-op for moves without a plan.
    expect(tickLiveMovePresentationRngSession(route.session, null).host).toBeNull();
    expect(activateLiveMovePresentationRng(host, { moveId: 33 }, "tackle")).toBe(host);
    expect(createPresentationRngSession().host).toBeNull();
  }, 60000);
});
