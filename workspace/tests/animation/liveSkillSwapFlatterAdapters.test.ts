import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS, LIVE_MOVE_RANDOM2_PLANS } from "../../src/engine/liveMovePresentationRng.ts";
import { presentationRngPlanWords } from "../../src/engine/presentationRngHost.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION } from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveSkillSwapOrbLives, liveSkillSwapOrbScale } from "../../src/engine/liveMoveOamAssembler.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { fixturePresentationRng, liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import { flatterConfetti } from "../../tools/integration/prep32FlatterModel.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { orbLives35, orbScale35 } from "../../tools/integration/prep35SkillSwapModel.ts";
import { iu120Ages, iu120EffectAges } from "../helpers/iu120Rows.ts";

// S10A Skill Swap (285, faithful timing) from the prep35 source model (docs/next-adapters-prep35.md s3 item 1). Dense windows:
// tools/integration/fixtures/s10a-live/skill-swap-*.json, receipt tools/integration/fixtures/sf-live-receipt.json (tools/integration/d4aTimingCheck.ts:
// zero residual in the policy phase, only the documented rows in the other phase).
const DIR = "tools/integration/fixtures/s10a-live";
type LiveFixture = Fixture & { presentationRngActivation?: { value: number; source: string }; timingPhase?: "event" | "no-event"; timingPhases?: Record<string, "event" | "no-event">; restoreRow?: number };
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as LiveFixture;
const NAMES = readdirSync(DIR).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/sf-live-receipt.json", "utf8"));
const effectOf = (f: Fixture, age = 0) => {
  const view = liveView(f, age);
  return { view, effect: view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never } };
};
type ReceiptWindow = { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
  runs: { residualPixels: number; digest: string; affectedAges: number[] }[] };
const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
const expectOnOffParity = (on: ReturnType<typeof generatedCommandAnimationReplay>, off: ReturnType<typeof generatedCommandAnimationReplay>) => {
  expect(on.stalled).toBe(off.stalled);
  expect(off.boundaries).toHaveLength(on.boundaries.length);
  for (let i = 0; i < on.boundaries.length; i += 1) {
    expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
    expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
  }
  expect(on.state.facilityState).toEqual(off.state.facilityState);
  expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
};

describe("S10A Skill Swap (285) faithful timing", () => {
  const ss = NAMES.filter((n) => n.startsWith("skill-swap-"));

  it("is a faithful-timing adapter (never scoped exact / faithful random); 196 rows both sides; the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(285);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(285);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(285);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[285]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 285 })).toBe(196);
    }
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === 285)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[285]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(false);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 285)).toBe(false);
  });

  it("the orb program is the prep35 source model (allocation, source affine index ordinal & 3, sprite.c affine engine)", () => {
    const lives = liveSkillSwapOrbLives();
    expect(lives).toEqual(orbLives35());
    for (const l of lives) for (let n = 0; n <= 17; n += 1) expect(liveSkillSwapOrbScale(l.anim, n)).toBe(orbScale35(l.anim, n));
    expect(lives.map((l) => l.anim)).toEqual(lives.map((l) => l.ordinal & 3));
  });

  it("the policy counts are the measured phases of the 6 dense windows (accepted, prep22 ALAKAZAM -> GOLEM, prep33 ESPEON -> WEEZING / WEEZING -> SNORLAX)", () => {
    expect(ss).toHaveLength(6);
    const fx = ss.map(fixtureAt);
    for (const side of ["player", "opponent"]) expect(fx.filter((f) => f.attacker.geometry.side === side)).toHaveLength(3);
    const [lag, restore] = LIVE_MOVE_TIMING_POLICY[285]!.parameters;
    for (const f of fx) expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(f.timingPhase === "event" ? 196 : 195);
    expect(lag!.alternatives.map((a) => a.measured)).toEqual([fx.filter((f) => f.timingPhase === "event").length, fx.filter((f) => f.timingPhase === "no-event").length]);
    expect([lag!.kind, lag!.age, lag!.chosen, lag!.tieRuleUsed]).toEqual(["optional-lag-age", 176, "event", false]);
    const restoreEvent = fx.filter((f) => f.timingPhases!["palette-transfer-row"] === "event");
    expect(restoreEvent.map((f) => f.restoreRow)).toEqual([176]);
    expect(restore!.alternatives.map((a) => a.measured)).toEqual([restoreEvent.length, fx.length - restoreEvent.length]);
    expect([restore!.kind, restore!.age, restore!.chosen, restore!.tieRuleUsed]).toEqual(["palette-transfer-row", 176, "no-event", false]);
  });

  it("the receipt: the 4 lag windows exact twice fresh (both elevated-WEEZING row 0s too); the 2 no-lag windows only on the documented fade rows 177..192", () => {
    const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[]; windows: Record<string, { ages: number[] }> } }[])
      .find((e) => e.id === 285)!.alternatePhaseResidual;
    expect(documented.ages).toEqual(Array.from({ length: 16 }, (_, i) => 177 + i));
    const rows = (receipt.windows as ReceiptWindow[]).filter((r) => r.move === "SKILL_SWAP");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(ss);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      const name = r.fixture.replace(`${DIR}/`, "").replace(".json", "");
      if (r.selectedPhase || documented.windows[name]) {
        // the policy phase, or the display-neutral restore-row window (ALAKAZAM -> GOLEM player): every row exact
        expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
        expect(r.window).toBe(r.expectedDuration);
      } else {
        expect(r.runs[0]!.affectedAges).toEqual(documented.ages);
      }
    }
    expect(rows.filter((r) => r.selectedPhase)).toHaveLength(3);
    expect(rows.filter((r) => r.runs[0]!.residualPixels === 0)).toHaveLength(4);
  });

  it("gates: known lend required; declines with an unknown order and for a shiny battler; an idle-rest battler engages (ISSUES #152)", () => {
    for (const name of ["skill-swap-player-girafarig-opponent-shuckle", "skill-swap-opponent-girafarig-player-shuckle"]) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
      const lend = effect.spriteOrderInput as { known: true; free: number[] };
      expect(lend.known).toBe(true);
      const presentation = call(lend);
      expect(presentation).not.toBeNull();
      expect((presentation!.config as any).move).toBe("SKILL_SWAP");
      expect(call(undefined)).toBeNull();
      expect(call({ known: false })).toBeNull();
      const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
      for (const side of ["player", "opponent"] as const) expect(call(lend, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
      // An opponent with a front idle rest (ONIX) engages (species audit 12: ONIX / RATTATA attacker and target, both sides, 0 px fresh;
      // tools/integration/fixtures/d4w-152).
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 95, speciesSymbol: "ONIX", name: "ONIX" } as never })).not.toBeNull();
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 76, speciesSymbol: "GOLEM", name: "GOLEM" } as never })).not.toBeNull();
    }
  });

  // tools/integration/r3ProfileRouteSearch.ts 285 3 1 4000 (first candidates: 8/7 VENOMOTH, 18/35 GENGAR, 35/14 KECLEON, all slot 3, all active).
  it("route 8/7 VENOMOTH: Skill Swap live on every age, following prompt reached, Scene ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(8, "on", [3], 7);
    const off = generatedCommandAnimationReplay(8, "off", [3], 7);
    const bodies = on.animations.filter((a) => a.moveId === 285 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(285, 196));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectOnOffParity(on, off);
  }, 240000);
});

// S10A Flatter (260, faithful random, D3) from the prep32 words / registers / palettes + the prep35 OAM provider (docs/next-adapters-prep35.md
// s3 item 2). Controlled bodies: the 114 words pinned at each window's ROM activation value (tools/integration/fixtures/s10a-live/flatter-*.json);
// two extra windows (sf-flatter-pin-*: idle frames before the first input) pin other activation values. Ordinary play draws surrogate words.
describe("S10A Flatter (260) faithful random", () => {
  const fl = NAMES.filter((n) => n.startsWith("flatter-"));
  const activationOf = (name: string) => fixtureAt(name).presentationRngActivation!.value;

  it("is a faithful-random adapter (never scoped exact / faithful timing); plan 65 + 114 words; 219 rows both sides; the status entry", () => {
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).toContain(260);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(260);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).not.toContain(260);
    expect(LIVE_MOVE_TIMING_POLICY[260]).toBeUndefined();
    expect(LIVE_MOVE_RANDOM2_PLANS[260]).toEqual([{ ageOffset: 65, count: 114 }]);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 260 })).toBe(219);
    }
    const entry = (status.faithfulRandomAdapters as { id: number; provenance: string; pinnedProofs: string[]; surrogateRoutes: string[] }[]).find((e) => e.id === 260)!;
    expect(entry.pinnedProofs).toEqual(["tools/integration/fixtures/sf-live-receipt.json"]);
    expect(entry.surrogateRoutes).toHaveLength(1);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 260)).toBe(false);
  });

  it("the production plan reproduces the prep32 source words (65 per-frame steps, then 3 draws per confetti) at every pinned activation", () => {
    expect(fl).toHaveLength(6);
    const occupied = [0, 1, 2, 6, 8, 60, 61, 62, 63, 3, 5]; // the scene, the spotlight (3) and the second dip (5) at the burst
    for (const name of fl) {
      const value = activationOf(name);
      const words = presentationRngPlanWords(createPresentationRngState(value, "pinned"), LIVE_MOVE_RANDOM2_PLANS[260]!);
      expect(words.provenance).toBe("pinned");
      expect([...words.words]).toEqual(flatterConfetti(value, occupied).words);
    }
  });

  it("5 distinct pinned activation values exercise both signs of data[0] / data[1], all 12 tile offsets and both sides", () => {
    const values = [...new Set(fl.map(activationOf))];
    expect(values).toHaveLength(5);
    const occupied = [0, 1, 2, 6, 8, 60, 61, 62, 63, 3, 5];
    const confetti = values.map((v) => flatterConfetti(v, occupied).confetti);
    const all = confetti.flat();
    for (const [base, field] of [[0x5e0, "data0"], [0x480, "data1"]] as const) {
      expect(all.some((c) => c[field] > base)).toBe(true);
      expect(all.some((c) => c[field] < base)).toBe(true);
    }
    expect(new Set(all.map((c) => c.tileOffset)).size).toBe(12);
    expect(new Set(all.map((c) => c.side))).toEqual(new Set([0, 1]));
    // the two extra pins (sf-flatter-pin-*) differ from every scenario activation's confetti
    const extra = ["flatter-pin-player-nidorina-opponent-onix-pad13", "flatter-pin-opponent-hypno-golem-pad29"].map(activationOf);
    for (const v of extra) expect(values.filter((w) => w !== v).every((w) => JSON.stringify(flatterConfetti(w, occupied).confetti) !== JSON.stringify(flatterConfetti(v, occupied).confetti))).toBe(true);
  });

  it("the receipt: all 6 pinned windows exact on every row twice fresh, window = the live duration", () => {
    const rows = (receipt.windows as ReceiptWindow[]).filter((r) => r.move === "FLATTER");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(fl);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.selectedPhase).toBe(true);
      expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      expect(r.window).toBe(219);
      expect(r.expectedDuration).toBe(219);
    }
    for (const side of ["player", "opponent"]) expect(fl.filter((n) => fixtureAt(n).attacker.geometry.side === side)).toHaveLength(3);
  });

  it("gates: words from the presentation host, first body, known lend; declines without words, with an unknown order, after an earlier body, for a shiny battler; an elevated opponent engages (ISSUES #152)", () => {
    for (const name of ["flatter-player-nidorina-opponent-onix", "flatter-opponent-nidorina-player-onix"]) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      const rng = fixturePresentationRng(f, effect.request);
      const call = (order: unknown, field = view.field, words = rng) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never, words);
      const lend = effect.spriteOrderInput as { known: true; free: number[]; firstBody: boolean };
      expect(lend.known).toBe(true);
      expect(lend.firstBody).toBe(true);
      const presentation = call(lend);
      expect(presentation).not.toBeNull();
      expect((presentation!.config as any).move).toBe("FLATTER");
      // the live anchors reach the view (prep35 papercut: the FLATTER view rebuilds the centres from geometry.animationCenter)
      const side = f.attacker.geometry.side;
      // attacker = its sprite centre (X_2, sprite y), target = BATTLER_COORD_X / _Y (no elevation)
      const center = (presentation!.config as any).attacker.geometry.animationCenter, corner = (presentation!.config as any).attacker.geometry.spriteCorner;
      expect(center.x).toBe(side === "player" ? 72 : 176);
      expect(corner).toEqual({ x: center.x - 32, y: center.y - 32 });
      expect((presentation!.config as any).target.geometry.animationCenter).toEqual(side === "player" ? { x: 176, y: 40 } : { x: 72, y: 80 });
      expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, lend as never, undefined)).toBeNull();
      expect(call(undefined)).toBeNull();
      expect(call({ known: false })).toBeNull();
      expect(call({ ...lend, firstBody: false })).toBeNull();
      const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
      for (const s of ["player", "opponent"] as const) expect(call(lend, { ...view.field, [s]: { ...view.field[s], personality: shiny } })).toBeNull();
      // GOLBAT (elevated): its row-0 shadow is drawn by the #142 hook (species audit 12: FLYGON / GOLBAT / SHEDINJA / WEEZING 0 px both roles).
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[260]).toBe(0);
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 42, speciesSymbol: "GOLBAT", name: "GOLBAT" } as never })).not.toBeNull();
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 76, speciesSymbol: "GOLEM", name: "GOLEM" } as never })).not.toBeNull();
    }
  });

  // tools/integration/r3ProfileRouteSearch.ts 260 3 1 4000 + the D3 harness (first candidates: 51/0 NIDORINA slot 3 active on every age; 92/0 NIDORINA
  // slot 3 declines: the opponent's Light Screen is an earlier unit, so the first-body gate keeps the scene-off view, logic unchanged).
  it("D3 route 51/0 NIDORINA: live every age with surrogate words; two presentation seeds and Scene OFF keep gameplay / RNG / facility; same seed -> same frames", () => {
    const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
    const a = random2Route(51, "on", [3], 0, SEED_A), a2 = random2Route(51, "on", [3], 0, SEED_A);
    const b = random2Route(51, "on", [3], 0, SEED_B), off = random2Route(51, "off", [3], 0, SEED_A);
    const bodies = a.bodies.filter((body) => body.moveId === 260 && body.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120EffectAges(260, 219));
    expect(bodies[0]!.active.every(Boolean)).toBe(true);
    expect(bodies[0]!.provenance).toBe("surrogate");
    expect(bodies[0]!.words).toHaveLength(114);
    expect(a.run.stalled).toBe(false);
    expect(a.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(a2.bodies).toEqual(a.bodies);
    const bBody = b.bodies.filter((body) => body.moveId === 260)[0]!;
    expect(bBody.words).not.toEqual(bodies[0]!.words);
    expect(bBody.frameDigests).not.toEqual(bodies[0]!.frameDigests);
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

// S10A Eruption (284, scoped exact) from the prep36 source-derived profile (docs/next-adapters-prep36.md s2; liveProfileMoves.ts liveEruptionProfile).
describe("S10A Eruption (284) scoped exact", () => {
  const er = NAMES.filter((n) => n.startsWith("eruption-"));

  it("is a scoped-exact adapter (never faithful random / timing); the duration is the derived endAge + 1 per attacker geometry", () => {
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).toContain(284);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(284);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).not.toContain(284);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[284]).toBe(0);
    expect((status.implementedAdapters as { id: number }[]).filter((e) => e.id === 284)).toHaveLength(1);
    expect(liveMoveAnimationDuration({ moveId: 284, attacker: 0, target: 1, power: 150, damage: 1, friendship: 70, multihit: 0, turn: 0 })).toBeNull();
    for (const name of er) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      expect(liveMoveAnimationDuration(effect.request, view.field)).toBe(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1);
    }
  });

  it("the live profile equals the prep36 source model (eruptionProfile36) for every window's species pair and lent order", async () => {
    const { eruptionProfile36 } = await import("../../tools/integration/prep36EruptionModel.ts");
    for (const name of er) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      const lend = effect.spriteOrderInput as { known: true; free: number[] };
      const presentation = liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, lend as never)!;
      const live = (presentation.config as any).animationProfile;
      const model = eruptionProfile36({ attackerSide: f.attacker.geometry.side, playerSpecies: view.field.player.species, opponentSpecies: view.field.opponent.species,
        activationOrder: live.spriteOrder.initialOrder, animationRng: 0, gameplayRng: 0 });
      expect(JSON.parse(JSON.stringify(live))).toEqual(JSON.parse(JSON.stringify(model)));
    }
  });

  it("the receipt: 9 windows (accepted, prep29, prep36 incl. real CAMERUPT both sides and the elevated WEEZING windows) exact on every row twice fresh", () => {
    const rows = (receipt.windows as ReceiptWindow[]).filter((r) => r.move === "ERUPTION");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(er);
    expect(er).toHaveLength(9);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      expect(r.window).toBe(r.expectedDuration);
    }
    expect(rows.reduce((n, r) => n + r.window, 0)).toBe(4374);
  });

  it("gates: known lend; declines with an unknown order, for a shiny battler, for an attacker with a front idle rest; any later known lend engages", () => {
    for (const name of ["eruption-alt-player-camerupt-golem", "eruption-alt-opponent-camerupt-golem"]) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
      const lend = effect.spriteOrderInput as { known: true; free: number[]; firstBody: boolean };
      const presentation = call(lend);
      expect((presentation!.config as any).move).toBe("ERUPTION");
      expect(call({ ...lend, firstBody: !lend.firstBody })).not.toBeNull();
      expect(call(undefined)).toBeNull();
      expect(call({ known: false })).toBeNull();
      const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
      for (const side of ["player", "opponent"] as const) expect(call(lend, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
      // ONIX (front idle rest x2 1): declines as the attacker (prep36 s1.4), engages as the target (the accepted ONIX target is 0 px).
      const onix = { species: 95, speciesSymbol: "ONIX", name: "ONIX" };
      if (f.attacker.geometry.side === "opponent") expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, ...onix } as never })).toBeNull();
      else expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, ...onix } as never })).not.toBeNull();
    }
  });

  // tools/integration/r3ProfileRouteSearch.ts 284 3 1 4000 (first candidates: 88/14, 211/14, 306/14 CAMERUPT slot 1, all active, 476 rows).
  it("route 88/14 CAMERUPT: Eruption live on every age, following prompt reached, Scene ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(88, "on", [1], 14);
    const off = generatedCommandAnimationReplay(88, "off", [1], 14);
    const bodies = on.animations.filter((a) => a.moveId === 284 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(284, 476));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectOnOffParity(on, off);
  }, 240000);
});
