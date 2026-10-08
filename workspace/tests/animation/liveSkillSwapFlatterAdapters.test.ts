import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../../src/engine/liveMovePresentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION } from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveSkillSwapOrbLives, liveSkillSwapOrbScale } from "../../src/engine/liveMoveOamAssembler.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { orbLives35, orbScale35 } from "../../tools/integration/prep35SkillSwapModel.ts";

// S10A Skill Swap (285, faithful timing) from the prep35 source model (docs/next-adapters-prep35.md s3 item 1). Dense windows:
// tools/integration/fixtures/s10a-live/skill-swap-*.json, receipt tools/integration/fixtures/sf-live-receipt.json (tools/integration/d4aTimingCheck.ts:
// zero residual in the policy phase, only the documented rows in the other phase).
const DIR = "tools/integration/fixtures/s10a-live";
type LiveFixture = Fixture & { timingPhase?: "event" | "no-event"; timingPhases?: Record<string, "event" | "no-event">; restoreRow?: number };
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

  it("gates: known lend required; declines with an unknown order, for a shiny battler and for a non-zero idle rest", () => {
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
      // An opponent with a front idle rest (ONIX): the battler OBJ / trajectory bounds are the rest-free points, so the body declines.
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 95, speciesSymbol: "ONIX", name: "ONIX" } as never })).toBeNull();
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 76, speciesSymbol: "GOLEM", name: "GOLEM" } as never })).not.toBeNull();
    }
  });

  // tools/integration/r3ProfileRouteSearch.ts 285 3 1 4000 (first candidates: 8/7 VENOMOTH, 18/35 GENGAR, 35/14 KECLEON, all slot 3, all active).
  it("route 8/7 VENOMOTH: Skill Swap live on every age, following prompt reached, Scene ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(8, "on", [3], 7);
    const off = generatedCommandAnimationReplay(8, "off", [3], 7);
    const bodies = on.animations.filter((a) => a.moveId === 285 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(Array.from({ length: 196 }, (_, age) => age));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectOnOffParity(on, off);
  }, 240000);
});
