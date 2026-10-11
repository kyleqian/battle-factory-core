import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../../src/engine/liveMovePresentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY } from "../../src/engine/liveMoveTimingPolicy.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";

// S10A scoped exact (docs/next-adapters-prep34.md): Extreme Speed (245) and Memento (262). Dense windows tools/integration/fixtures/s10a-live/
// {extreme-speed,memento}-*.json (tools/integration/s10aEsMementoFixtures.py from 2 fresh prep22Probe runs per scenario), receipt
// tools/integration/fixtures/em-live-receipt.json (d4aTimingCheck.ts, two independent invocations of 2 fresh runs each; no CPU-phase parameter,
// so every window must be exact and as long as the live duration).
const DIR = "tools/integration/fixtures/s10a-live";
const namesOf = (prefix: string) => readdirSync(DIR).filter((n) => n.startsWith(prefix) && n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture;
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/em-live-receipt.json", "utf8"));
const effectOf = (f: Fixture, age = 0) => {
  const view = liveView(f, age);
  return { view, effect: view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never } };
};
type Run = { residualPixels: number; digest: string };
type Window = { fixture: string; move: string; invocationA: { window: number; expectedDuration: number; violations: string[]; runs: Run[] };
  invocationB: { window: number; violations: string[]; runs: Run[] } };
const windowsOf = (move: string) => (receipt.windows as Window[]).filter((w) => w.move === move);
const OT = 416049562, SHINY = ((OT >>> 16) ^ (OT & 0xffff)) >>> 0;
const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
type Choices = Parameters<typeof generatedCommandAnimationReplay>[2];
const routeParity = (seed: number, choices: Choices, streak: number, id: number, ages: number) => {
  const on = generatedCommandAnimationReplay(seed, "on", choices, streak);
  const off = generatedCommandAnimationReplay(seed, "off", choices, streak);
  const bodies = on.animations.filter((a) => a.moveId === id && a.attacker === 0);
  expect(bodies).toHaveLength(1);
  expect(bodies[0]!.ages).toEqual(Array.from({ length: ages }, (_, age) => age));
  expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
  expect(on.stalled).toBe(off.stalled);
  expect(off.boundaries).toHaveLength(on.boundaries.length);
  for (let i = 0; i < on.boundaries.length; i += 1) {
    expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
    expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
  }
  expect(on.state.facilityState).toEqual(off.state.facilityState);
  expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  return on;
};

describe("Extreme Speed (245) live adapter (scoped exact)", () => {
  const names = namesOf("extreme-speed-");
  it("is a faithful-timing adapter (a13fix: the optional lag at 292, 321-row dominant phase; never faithful random); 321 rows both sides; row-0 #142 shadow", () => {
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(245);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(245);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(245);
    expect(LIVE_MOVE_TIMING_POLICY[245]!.parameters.map((p) => [p.kind, p.age, p.chosen])).toEqual([["optional-lag-age", 292, "event"]]);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[245]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 80, damage: 10, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 245 })).toBe(321);
    }
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 245)).toBe(false);
    expect((status.faithfulTimingAdapters as { id: number }[]).some((e) => e.id === 245)).toBe(true);
  });

  it("5 windows (accepted ARCANINE -> DUGTRIO + prep34 SMEARGLE -> GOLEM both orientations, elevated GOLBAT target) from each own activation", () => {
    expect(names).toEqual(["extreme-speed-alt-opponent-smeargle-golem", "extreme-speed-alt-player-smeargle-golbat", "extreme-speed-alt-player-smeargle-golem",
      "extreme-speed-opponent-arcanine-player-dugtrio", "extreme-speed-player-arcanine-opponent-dugtrio"]);
    for (const n of names) {
      const f = fixtureAt(n);
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(321);
      const { effect } = effectOf(f);
      const config = liveMoveAnimationPresentation(effect.request, liveView(f, 0).field, 0)!.config as any;
      expect([config.move, config.animationAgeOffset]).toEqual(["EXTREME_SPEED", 43]);
      // The attacker pic-coords yOffset (back for a player attacker, front for an opponent): ARCANINE 6 / 2, SMEARGLE 10 / 6.
      const player = f.attacker.geometry.side === "player";
      expect(config.attackerYOffset).toBe(f.attacker.species === "ARCANINE" ? (player ? 6 : 2) : (player ? 10 : 6));
    }
  });

  it("the receipt: every window exact twice fresh in two invocations, window == duration; staged outputs byte-identical", () => {
    const rows = windowsOf("EXTREME_SPEED");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(names);
    for (const r of rows) {
      for (const inv of [r.invocationA, r.invocationB]) {
        expect(inv.violations).toEqual([]);
        expect(inv.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
        expect(inv.window).toBe(321);
      }
      expect(r.invocationB.runs[0]!.digest).toBe(r.invocationA.runs[0]!.digest);
      expect(r.invocationA.expectedDuration).toBe(321);
    }
    expect(receipt.stagedByteIdentity.identical).toBe(true);
    expect(Object.keys(receipt.stagedByteIdentity.base)).toEqual(expect.arrayContaining(["EXTREME_SPEED player-to-opponent", "EXTREME_SPEED opponent-to-player"]));
  });

  it("gates: declines for a shiny battler and for a non-zero idle rest on either battler", () => {
    for (const name of ["extreme-speed-player-arcanine-opponent-dugtrio", "extreme-speed-opponent-arcanine-player-dugtrio"]) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      const call = (field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0);
      expect(call()).not.toBeNull();
      for (const side of ["player", "opponent"] as const) expect(call({ ...view.field, [side]: { ...view.field[side], personality: SHINY } })).toBeNull();
      // ONIX has a front idle rest (x2 1): as the opponent battler (attacker or target) the body declines.
      expect(call({ ...view.field, opponent: { ...view.field.opponent, species: 95, speciesSymbol: "ONIX", name: "ONIX" } as never })).toBeNull();
      expect(call({ ...view.field, opponent: { ...view.field.opponent, species: 76, speciesSymbol: "GOLEM", name: "GOLEM" } as never })).not.toBeNull();
    }
  });

  // tools/integration/r3ProfileRouteSearch.ts 245 4 1 4000 (first candidates: 182/21, 182/35, 182/42, 248/21 ARCANINE slot 1, all live 321 ages).
  it("route 182/21 ARCANINE: live every age, following prompt reached, Scene ON/OFF parity", () => {
    const on = routeParity(182, [1], 21, 245, 321);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 240000);
});

describe("Memento (262) live adapter (scoped exact, first body)", () => {
  const names = namesOf("memento-");
  const later = JSON.parse(readFileSync("tools/integration/fixtures/s10a-live-declines/memento-later-player-weezing-chimecho.json", "utf8")) as Fixture;
  it("is a scoped-exact adapter (never faithful random / timing; no timing policy); duration from the field; row-0 #142 shadow", () => {
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).toContain(262);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(262);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).not.toContain(262);
    expect(LIVE_MOVE_TIMING_POLICY[262]).toBeUndefined();
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[262]).toBe(0);
    expect(liveMoveAnimationDuration({ moveId: 262, attacker: 0, target: 1, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 })).toBeNull();
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 262)).toBe(true);
  });

  it("5 first-body windows (accepted WEEZING -> ONIX + prep34 WEEZING -> GOLEM both orientations, elevated GOLBAT target); duration = the window", () => {
    expect(names).toEqual(["memento-alt-opponent-weezing-golem", "memento-alt-player-weezing-golbat", "memento-alt-player-weezing-golem",
      "memento-opponent-weezing-player-onix", "memento-player-weezing-opponent-onix"]);
    for (const n of names) {
      const f = fixtureAt(n);
      const { view, effect } = effectOf(f);
      expect((effect.spriteOrderInput as { firstBody?: boolean }).firstBody).toBe(true);
      expect(liveMoveAnimationDuration(effect.request, view.field)).toBe(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1);
      const config = liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput)!.config as any;
      expect(config.move).toBe("MEMENTO");
      // The self-KO displayed HP 0 is the field's (read only).
      expect(f.attacker.geometry.side === "player" ? view.field.player.hp : view.field.opponent.hp).toBe(0);
      expect([config.reducer.initialScanlineSourceBuffer, config.reducer.initialWindow]).toEqual([1, { win0h: 240, win0v: 161 }]);
    }
    // prep34 s2.4 derived inputs reproduce the accepted harness values (tools/compare/mementoPortable.ts WEEZING / ONIX).
    const p = effectOf(fixtureAt("memento-player-weezing-opponent-onix"));
    const r = (liveMoveAnimationPresentation(p.effect.request, p.view.field, 0, undefined, undefined, p.effect.spriteOrderInput)!.config as any).reducer;
    expect([r.attacker.shadowTop, r.attacker.shadowBottom, r.attacker.bgX, r.attacker.bgY]).toEqual([59, 111, -40, -54]);
    expect([r.target.shadowTop, r.target.shadowBottom, r.target.bgX, r.target.bgY]).toEqual([3, 71, -145, -10]);
  });

  it("the receipt: every first-body window exact twice fresh in two invocations, window == duration; the later body declines", () => {
    const rows = windowsOf("MEMENTO");
    const exact = rows.filter((r) => !r.fixture.includes("-later-"));
    expect(exact.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(names);
    for (const r of exact) {
      for (const inv of [r.invocationA, r.invocationB]) {
        expect(inv.violations).toEqual([]);
        expect(inv.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
      }
      expect(r.invocationA.window).toBe(r.invocationA.expectedDuration);
      expect(r.invocationB.runs[0]!.digest).toBe(r.invocationA.runs[0]!.digest);
    }
    const declined = rows.find((r) => r.fixture.includes("-later-"))!;
    expect(declined.invocationA.runs.map((run) => run.residualPixels)).toEqual([72910, 72910]);
    expect(receipt.stagedByteIdentity.identical).toBe(true);
    expect(Object.keys(receipt.stagedByteIdentity.base)).toEqual(expect.arrayContaining(["MEMENTO player", "MEMENTO opponent"]));
  });

  it("gates: a later body is live after Psywave (history known), declines after a Dragon Dance (history invalidated); an unknown order declines; a shiny battler declines", () => {
    const { view, effect } = effectOf(later);
    expect((effect.spriteOrderInput as { firstBody?: boolean }).firstBody).not.toBe(true);
    expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput)).not.toBeNull();
    const afterDd = effectOf({ ...later, precedingBodies: [{ moveId: 349, side: "player" }] });
    expect((afterDd.effect.spriteOrderInput as { scanlineHistory?: unknown }).scanlineHistory).toBeUndefined();
    expect(liveMoveAnimationPresentation(afterDd.effect.request, afterDd.view.field, 0, undefined, undefined, afterDd.effect.spriteOrderInput)).toBeNull();
    const first = effectOf(fixtureAt("memento-player-weezing-opponent-onix"));
    const call = (order: unknown, field = first.view.field) => liveMoveAnimationPresentation(first.effect.request, field, 0, undefined, undefined, order as never);
    expect(call(first.effect.spriteOrderInput)).not.toBeNull();
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    for (const side of ["player", "opponent"] as const) {
      expect(call(first.effect.spriteOrderInput, { ...first.view.field, [side]: { ...first.view.field[side], personality: SHINY } })).toBeNull();
    }
  });

  // /tmp scan (r3ProfileRouteSearch recipe with answerForcedSwitch): 61/28 no Memento body; 127/28, 193/28, 325/28 the opponent's body first
  // (later body: declines); 259/28 and 335/28 WEEZING first body live.
  it("route 259/28 WEEZING: live every age, the user faints, forced replacement, next action prompt, Scene ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(259, "on", [0], 28, false, true);
    const off = generatedCommandAnimationReplay(259, "off", [0], 28, false, true);
    const bodies = on.animations.filter((a) => a.moveId === 262 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(Array.from({ length: 179 }, (_, age) => age));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(false);
    expect(off.stalled).toBe(false);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  }, 240000);

  it("route 127/28 WEEZING (the opponent's body first): the later Memento body is live (scan93 history) and the battle continues", () => {
    const on = generatedCommandAnimationReplay(127, "on", [0], 28, false, true);
    const bodies = on.animations.filter((a) => a.moveId === 262 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.adapterActive.some(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 240000);
});
