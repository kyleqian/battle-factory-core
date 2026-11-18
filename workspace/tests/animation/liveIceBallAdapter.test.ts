import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { iceBallDisplayPlan } from "../../src/animation/iceBall.ts";
import { sceneOnIceBallView, type SceneOnIceBallPresentationState } from "../../src/animation/sceneOnPresentation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import {
  LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS, LIVE_ICE_BALL_RANDOM2_PLANS, liveMoveRandom2Plan,
} from "../../src/engine/liveMovePresentationRng.ts";
import {
  LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION, dominantLiveMoveTimingPhase,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveBattlerIsShiny } from "../../src/engine/liveMovePaletteComposite.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import { iu120EffectAges } from "../helpers/iu120Rows.ts";

// S10A Ice Ball (301), every counter body (docs/next-adapters-prep26.md s1 / s4). Faithful timing (D4: the lag rows are a CPU phase, per-counter
// dominant phase) with D3 (Random2 shards from the presentation host). Counters 1..4 take the seam-resolved deferred lend
// (docs/s10a-random2-order-lend-blocker.md design 1). Dense windows: tools/integration/fixtures/s10a-live/ice-ball-*.json (counter 0; receipt
// tools/integration/fixtures/d4d2-live-receipt.json) and tools/integration/fixtures/lend-live/ice-ball-*.json (counters 1..4; receipt
// tools/integration/fixtures/lend-live-receipt.json), d4aTimingCheck.ts.
const DIR = "tools/integration/fixtures/s10a-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("ice-ball-") && n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture & { timingPhase: string };
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const base = (attacker: 0 | 1, rolloutCounter?: number): BattleMoveAnimationRequest => ({
  moveId: 301, attacker, target: (1 - attacker) as 0 | 1, turn: 0, power: 30, damage: 10, friendship: 70, multihit: 0,
  ...(rolloutCounter === undefined ? {} : { rolloutCounter }) });

const presentationOf = (f: Fixture, age: number, activationValue?: number) => {
  const fixture = activationValue === undefined ? f : { ...f, presentationRngActivation: { value: activationValue, source: "test pin" } };
  const view = liveView(fixture, age);
  const e = view.effect as unknown as {
    request: BattleMoveAnimationRequest; spriteAllocatorInput: never; spriteOrderInput: never; presentationRng: never; battlerX2Input: never };
  return liveMoveAnimationPresentation(e.request, view.field, age, undefined, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng,
    e.battlerX2Input);
};

const LEND_DIR = "tools/integration/fixtures/lend-live";
const LEND_NAMES = readdirSync(LEND_DIR).filter((n) => n.startsWith("ice-ball-") && n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const lendFixtureAt = (name: string) => JSON.parse(readFileSync(`${LEND_DIR}/${name}.json`, "utf8")) as Fixture & { timingPhase: string };

describe("S10A Ice Ball (301): faithful timing with D3", () => {
  it("counts once, in faithful timing with d3 (never faithful random / scoped exact); the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(301);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(301);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(301);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[301]).toBe(0);
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 301)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[301]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(true);
    expect((status.faithfulRandomAdapters as { id: number }[]).some((e) => e.id === 301)).toBe(false);
  });

  it("the policy, per counter body: lag rows measured in prep26 iceball-check.json (counter 3: 1 of 3, counter 4: 2 of 3, else none)", () => {
    const check = JSON.parse(readFileSync("tools/integration/fixtures/prep26/iceball-check.json", "utf8")) as { name: string; lagRows: number[] }[];
    expect(check).toHaveLength(18);
    const params = LIVE_MOVE_TIMING_POLICY[301]!.parameters;
    expect(params.map((p) => p.rolloutCounter)).toEqual([1, 2, 3, 4, 5]);
    for (const p of params) {
      // The probed windows of this counter body; GLALIE player bodies 4..5 are post-KO (decline) but still measured.
      const windows = check.filter((w) => w.name.endsWith(`-b${p.rolloutCounter}`));
      const lag = windows.filter((w) => w.lagRows.length > 0);
      expect(p.alternatives.map((a) => a.measured), `counter ${p.rolloutCounter! - 1}`).toEqual([lag.length, windows.length - lag.length]);
      for (const w of lag) expect(w.lagRows).toEqual([p.age]);
      expect(p.chosen).toBe(dominantLiveMoveTimingPhase(p.alternatives).phase);
      expect(p.tieRuleUsed).toBe(false);
    }
    expect(params.map((p) => p.chosen)).toEqual(["no-event", "no-event", "no-event", "no-event", "event"]);
    for (const attacker of [0, 1] as const) {
      expect([1, 2, 3, 4, 5].map((c) => liveMoveAnimationDuration(base(attacker, c)))).toEqual([76, 76, 76, 76, 133]);
    }
  });

  it("declines without a counter, without a lend, without the earlier body's words, and after a KO / send-in / invalidation between the bodies", () => {
    for (const counter of [undefined, 0, 6]) for (const attacker of [0, 1] as const) expect(liveMoveAnimationDuration(base(attacker, counter))).toBeNull();
    const f = lendFixtureAt("ice-ball-player-spheal-opponent-registeel-b3");
    const view = liveView(f, 40);
    const e = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteAllocatorInput: never; battlerX2Input: never;
      spriteOrderInput: { known: true; free: number[]; deferred: { units: object[]; activation: object } };
      presentationRng: { host: { bodies: { key: string }[] }; key: string } };
    const present = (order: unknown, rng: unknown = e.presentationRng) => liveMoveAnimationPresentation(e.request, view.field, 40, undefined,
      e.spriteAllocatorInput, order as never, rng as never, e.battlerX2Input);
    expect(e.spriteOrderInput.free).toEqual([]);
    expect(present(e.spriteOrderInput)?.config.move).toBe("ICE_BALL");
    expect(present(undefined)).toBeNull();
    // The host without the earlier bodies' words (only the current body): the carry is unknown.
    const own = { ...e.presentationRng, host: { ...e.presentationRng.host, bodies: e.presentationRng.host.bodies.filter((b) => b.key === e.presentationRng.key) } };
    expect(present(e.spriteOrderInput, own)).toBeNull();
    const d = e.spriteOrderInput.deferred;
    for (const unit of [{ kind: "faint", side: "opponent" }, { kind: "next-mon-send-out" }, { kind: "switch-out" }, { kind: "invalidate", reason: "x" }]) {
      expect(present({ ...e.spriteOrderInput, deferred: { ...d, units: [...d.units, unit] } }), unit.kind).toBeNull();
      expect(present({ ...e.spriteOrderInput, deferred: { ...d, activation: { deferred: { ...(d.activation as { deferred: { units: object[] } }).deferred,
        units: [unit] } } } }), `nested ${unit.kind}`).toBeNull();
    }
  });

  it("deferred-lend windows: counters 1..4 (accepted bodies 2..5 both sides, GLALIE -> GOLEM bodies 2..3 both sides) through the production renderer", () => {
    expect(LEND_NAMES).toHaveLength(12);
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/lend-live-receipt.json", "utf8"));
    const rows = receipt.windows as { fixture: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string; affectedAges: number[] }[] }[];
    expect(rows.map((r) => r.fixture.replace(`${LEND_DIR}/`, "").replace(".json", "")).sort()).toEqual(LEND_NAMES);
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { windows: Record<string, { ages: number[] }> } }[])
      .find((x) => x.id === 301)!.alternatePhaseResidual.windows;
    for (const r of rows) {
      const name = r.fixture.replace(`${LEND_DIR}/`, "").replace(".json", "");
      expect(r.violations, name).toEqual([]);
      expect(r.runs).toHaveLength(2);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      if (r.selectedPhase) {
        expect(r.runs.map((run) => run.residualPixels), name).toEqual([0, 0]);
        expect(r.window).toBe(r.expectedDuration);
      } else {
        expect(name).toBe("ice-ball-player-spheal-opponent-registeel-b4");
        expect(r.runs[0]!.affectedAges).toEqual(documented[name]!.ages);
      }
    }
    expect(rows.filter((r) => !r.selectedPhase)).toHaveLength(1);
    for (const n of LEND_NAMES) {
      const f = lendFixtureAt(n) as Fixture & { iceBallChain: { earlier: { value: number }[] } };
      const counter = f.requestFields!.rolloutCounter!;
      expect(f.iceBallChain.earlier).toHaveLength(counter - 1);
      expect(Number.isInteger(f.presentationRngActivation!.value)).toBe(true);
      expect(presentationOf(f, 40)?.config.move).toBe("ICE_BALL");
    }
  });

  it("the Random2 plan is counter-keyed: 2 words per shard at step 37 (5 / 7 / 9 / 10 / 10 shards)", () => {
    expect(LIVE_ICE_BALL_RANDOM2_PLANS.map((plan) => plan)).toEqual([5, 7, 9, 10, 10].map((n) => [{ ageOffset: 37, count: 2 * n }]));
    for (let counter = 1; counter <= 5; counter += 1) expect(liveMoveRandom2Plan(base(0, counter))).toBe(LIVE_ICE_BALL_RANDOM2_PLANS[counter - 1]);
    expect(liveMoveRandom2Plan(base(0))).toBeNull();
  });

  it("gates: known lend required; declines with no order / no words and for a shiny battler", () => {
    const f = fixtureAt("ice-ball-alt-opponent-glalie-golem");
    const view = liveView(f, 40);
    const e = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteAllocatorInput: never; spriteOrderInput: never; presentationRng: never };
    expect(liveMoveAnimationPresentation(e.request, view.field, 40, undefined, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng)).not.toBeNull();
    expect(liveMoveAnimationPresentation(e.request, view.field, 40, undefined, e.spriteAllocatorInput, undefined, e.presentationRng)).toBeNull();
    expect(liveMoveAnimationPresentation(e.request, view.field, 40, undefined, e.spriteAllocatorInput, e.spriteOrderInput, undefined)).toBeNull();
    // A personality whose halves xor to the Factory OT id's halves is shiny (liveBattlerIsShiny).
    const shinyPersonality = [...Array(0x10000).keys()].map((hi) => (hi << 16 | 0) >>> 0).find((p) => liveBattlerIsShiny(p))!;
    const shinyField = { ...view.field, opponent: { ...view.field.opponent, personality: shinyPersonality } };
    expect(liveMoveAnimationPresentation(e.request, shinyField, 40, undefined, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng)).toBeNull();
  });

  it("pinned words: the probed activation values + 3 more; the shard OAM equals the reducer's own Random2 shards (both shard branches)", () => {
    const branches = { negativeX: 0, positiveX: 0, folded: 0, unfolded: 0 };
    const digests = new Set<string>();
    for (const name of ["ice-ball-alt-player-glalie-golem", "ice-ball-opponent-spheal-player-registeel"]) {
      const f = fixtureAt(name);
      for (const value of [f.presentationRngActivation!.value, 0, 0x12345678, 0xdeadbeef]) {
        for (const age of [38, 46, 57]) {
          const state = presentationOf(f, age, value) as SceneOnIceBallPresentationState | null;
          expect(state?.config.move).toBe("ICE_BALL");
          const view = sceneOnIceBallView(state!), plan = iceBallDisplayPlan(view);
          // hardwareOam[age] = build(state of age - 1): the reducer's shards of the previous row.
          const shards = sceneOnIceBallView({ ...state!, age: age - 1 }).sprites.filter((s) => s.kind === "shard");
          expect(shards).toHaveLength(5);
          const placed = plan.shards.map((o) => `${(o.attr[1] & 0x1ff)},${o.attr[0] & 0xff}`).sort();
          expect(placed).toEqual(shards.map((s) => `${(s.x + s.x2 - 4) & 0x1ff},${(s.y + s.y2 - 4) & 0xff}`).sort());
          for (const s of shards) {
            if (s.kind !== "shard") continue;
            if (s.randomA & 1) branches.negativeX += 1; else branches.positiveX += 1;
            // randB = Random2() & 0x1ff, > 0xff folded to 256 - randB (<= 0).
            if (s.randomB < 0) branches.folded += 1; else branches.unfolded += 1;
          }
          digests.add(JSON.stringify(plan.shards.map((o) => o.attr)));
        }
      }
    }
    expect(branches.negativeX).toBeGreaterThan(0);
    expect(branches.positiveX).toBeGreaterThan(0);
    expect(branches.folded).toBeGreaterThan(0);
    expect(branches.unfolded).toBeGreaterThan(0);
    expect(digests.size).toBeGreaterThan(8);
  });

  it("the receipt: 4 counter-0 windows (accepted SPHEAL -> REGISTEEL + prep25 GLALIE -> GOLEM, both orientations) exact twice fresh", () => {
    expect(NAMES).toEqual(["ice-ball-alt-opponent-glalie-golem", "ice-ball-alt-player-glalie-golem",
      "ice-ball-opponent-spheal-player-registeel", "ice-ball-player-spheal-opponent-registeel"]);
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/d4d2-live-receipt.json", "utf8"));
    const rows = (receipt.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string }[] }[]).filter((r) => r.move === "ICE_BALL");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(NAMES);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.selectedPhase).toBe(true);
      expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      expect(r.window).toBe(76);
      expect(r.expectedDuration).toBe(76);
    }
    for (const n of NAMES) {
      const f = fixtureAt(n);
      expect(f.timingPhase).toBe("no-event");
      expect(f.requestFields?.rolloutCounter).toBe(1);
      expect(Number.isInteger(f.presentationRngActivation!.value)).toBe(true);
    }
  });

  it("ordinary route seed 152 slot 1: an Ice Ball chain of 4 bodies, every body live every age (deferred lends), next prompt; replay equal; two presentation seeds and Scene OFF keep gameplay / RNG / facility", () => {
    const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
    const a = random2Route(152, "on", [1, 1, 1, 1], 0, SEED_A), a2 = random2Route(152, "on", [1, 1, 1, 1], 0, SEED_A);
    const b = random2Route(152, "on", [1, 1, 1, 1], 0, SEED_B), off = random2Route(152, "off", [1, 1, 1, 1], 0, SEED_A);
    const chain = a.bodies.filter((body) => body.moveId === 301 && body.attacker === 0);
    expect(chain.length).toBeGreaterThanOrEqual(3);
    chain.forEach((body, k) => {
      expect(body.ages, `body ${k + 1}`).toEqual(iu120EffectAges(301, k === 4 ? 133 : 76, "player", k === 0 ? 10 : 9));
      expect(body.active.every(Boolean), `body ${k + 1}`).toBe(true);
      expect(body.provenance).toBe("surrogate");
      expect(body.words).toHaveLength(2 * [5, 7, 9, 10, 10][k]!);
    });
    // Another presentation seed draws other words: the later bodies' words-dependent activation orders and frames differ, still live.
    const chainB = b.bodies.filter((body) => body.moveId === 301 && body.attacker === 0);
    expect(chainB.length).toBe(chain.length);
    expect(chainB.every((body) => body.active.every(Boolean))).toBe(true);
    expect(chainB[1]!.frameDigests).not.toEqual(chain[1]!.frameDigests);
    expect(a.run.stalled).toBe(false);
    expect(a.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(a2.bodies).toEqual(a.bodies);
    expect(off.bodies).toEqual([]);
    const rules = (value: (typeof a.run.boundaries)[number]) => ({
      ...value.rules, rulesContext: { ...value.rules.rulesContext, hitMarker: value.rules.rulesContext.hitMarker & ~0x80 } });
    expect(b.run.boundaries).toEqual(a.run.boundaries);
    expect(off.run.boundaries).toHaveLength(a.run.boundaries.length);
    for (let i = 0; i < a.run.boundaries.length; i += 1) {
      expect(rules(off.run.boundaries[i]!)).toEqual(rules(a.run.boundaries[i]!));
      expect(off.run.boundaries[i]!.rng).toEqual(a.run.boundaries[i]!.rng);
    }
    expect(b.run.state.facilityState).toEqual(a.run.state.facilityState);
    expect(off.run.state.facilityState).toEqual(a.run.state.facilityState);
    expect(off.run.state.round.rules.rngValue).toBe(a.run.state.round.rules.rngValue);
  }, 240000);

  it("ordinary route seed 1 DELIBIRD slot 1: chain bodies 1..4 live every age (ice72: body 3 follows the opponent's KO + send-in and body 4 nests it, the Ice Ball words unit replays the battle units); two presentation seeds and Scene OFF keep gameplay / RNG / facility", () => {
    const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
    const a = random2Route(1, "on", [1, 1, 1], 0, SEED_A), a2 = random2Route(1, "on", [1, 1, 1], 0, SEED_A);
    const b = random2Route(1, "on", [1, 1, 1], 0, SEED_B), off = random2Route(1, "off", [1, 1, 1], 0, SEED_A);
    const chain = a.bodies.filter((body) => body.moveId === 301 && body.attacker === 0);
    expect(chain.length).toBeGreaterThanOrEqual(4);
    expect(chain[0]!.ages).toEqual(iu120EffectAges(301, 76, "player", 10));
    expect(chain[0]!.provenance).toBe("surrogate");
    expect(chain[0]!.words).toHaveLength(10);
    expect(chain.slice(0, 4).map((body) => body.active.every(Boolean))).toEqual([true, true, true, true]);
    expect(b.bodies.filter((body) => body.moveId === 301 && body.attacker === 0).slice(0, 4).map((body) => body.active.every(Boolean)))
      .toEqual([true, true, true, true]);
    expect(a.run.stalled).toBe(false);
    expect(a.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(a2.bodies).toEqual(a.bodies);
    expect(b.bodies.filter((body) => body.moveId === 301)[0]!.words).not.toEqual(chain[0]!.words);
    expect(off.bodies).toEqual([]);
    const rules = (value: (typeof a.run.boundaries)[number]) => ({
      ...value.rules, rulesContext: { ...value.rules.rulesContext, hitMarker: value.rules.rulesContext.hitMarker & ~0x80 } });
    expect(b.run.boundaries).toEqual(a.run.boundaries);
    expect(off.run.boundaries).toHaveLength(a.run.boundaries.length);
    for (let i = 0; i < a.run.boundaries.length; i += 1) {
      expect(rules(off.run.boundaries[i]!)).toEqual(rules(a.run.boundaries[i]!));
      expect(off.run.boundaries[i]!.rng).toEqual(a.run.boundaries[i]!.rng);
    }
    expect(b.run.state.facilityState).toEqual(a.run.state.facilityState);
    expect(off.run.state.facilityState).toEqual(a.run.state.facilityState);
    expect(off.run.state.round.rules.rngValue).toBe(a.run.state.round.rules.rngValue);
  }, 240000);
});
