import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shockWaveTimingFor } from "../../src/animation/shockWave.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../../src/engine/liveMovePresentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY } from "../../src/engine/liveMoveTimingPolicy.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { shockWaveInputsFor } from "../../tools/compare/verifyShockWaveReducer.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// S10A scoped exact: Shock Wave (351) through the prep33 input builder (liveOamMoves.ts liveShockWaveInputs) and the reducer's geometry-derived
// timing (docs/next-adapters-prep33.md s0.2 / s3 item 1). Dense windows tools/integration/fixtures/d4a-live/shock-wave-*.json, receipt
// tools/integration/fixtures/ns-live-receipt.json (d4aTimingCheck.ts: no CPU-phase parameter, so every window must be exact and as long as the
// live duration).
const DIR = "tools/integration/fixtures/d4a-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("shock-wave-") && n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture;
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/ns-live-receipt.json", "utf8"));
const effectOf = (f: Fixture, age = 0) => {
  const view = liveView(f, age);
  return { view, effect: view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never } };
};

describe("Shock Wave (351) live adapter (scoped exact)", () => {
  it("is a scoped-exact adapter (never faithful random / timing; no timing policy); row-0 #142 shadow", () => {
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).toContain(351);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(351);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).not.toContain(351);
    expect(LIVE_MOVE_TIMING_POLICY[351]).toBeUndefined();
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[351]).toBe(0);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 351)).toBe(true);
    expect((status.faithfulTimingAdapters as { id: number }[]).some((e) => e.id === 351)).toBe(false);
  });

  it("timing: side-only callers keep the accepted tables; the derivation reproduces them for the accepted corpora (opt-in only)", () => {
    expect(shockWaveTimingFor({ attackerSide: "player" })).toEqual({ lightningStart: 159, shakeStart: 195, clearStart: 262, cleanupAge: 266 });
    expect(shockWaveTimingFor({ attackerSide: "opponent" })).toEqual({ lightningStart: 153, shakeStart: 191, clearStart: 258, cleanupAge: 262 });
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const input = shockWaveInputsFor(orientation);
      expect(shockWaveTimingFor({ ...input, derivedTiming: true })).toEqual(shockWaveTimingFor({ attackerSide: input.attackerSide }));
      // Without the opt-in the accepted / staged inputs keep the tables whatever their geometry.
      expect(shockWaveTimingFor({ ...input, attackerPictureOrigin: { x: 0, y: 0 } })).toEqual(shockWaveTimingFor({ attackerSide: input.attackerSide }));
    }
  });

  it("6 windows (accepted FLAAFFY -> CORSOLA, prep22 MANECTRIC -> WAILMER, prep33 RAICHU -> WEEZING / WEEZING -> SNORLAX): the live duration is each window", () => {
    expect(NAMES).toHaveLength(6);
    const expected: Record<string, number> = {
      "shock-wave-player-flaaffy-opponent-corsola": 267, "shock-wave-opponent-flaaffy-player-corsola": 263,
      "shock-wave-alt-player-manectric-wailmer": 266, "shock-wave-alt-opponent-manectric-wailmer": 264,
      "shock-wave-alt-player-raichu-weezing": 267, "shock-wave-alt-opponent-weezing-snorlax": 264,
    };
    for (const name of NAMES) {
      const f = fixtureAt(name);
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(expected[name]);
      const { view, effect } = effectOf(f);
      expect(liveMoveAnimationDuration(effect.request, view.field)).toBe(expected[name]);
    }
    expect(liveMoveAnimationDuration({ moveId: 351, attacker: 0, target: 1, turn: 0, power: 60, damage: 1, friendship: 70, multihit: 0 })).toBeNull();
  });

  it("the receipt: every window exact twice fresh through the production live renderer (row 0 of the elevated WEEZING windows too)", () => {
    const rows = (receipt.windows as { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
      runs: { residualPixels: number; digest: string }[] }[]).filter((r) => r.move === "SHOCK_WAVE");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(NAMES);
    for (const r of rows) {
      expect(r.violations).toEqual([]);
      expect(r.selectedPhase).toBe(true);
      expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      expect(r.window).toBe(r.expectedDuration);
    }
    expect(receipt.dirty).toBe(false);
    expect(receipt.shockWaveReducerChange.stagedDigest.byteIdentical).toBe(true);
    expect(receipt.shockWaveReducerChange.actualCore).toMatchObject({ byteIdentical: true, residualPixels: 0,
      digest: "8bbc9a85fe452b2b6af19a38d7c67fea6a4687786c2ff102cd34ea24c6919fb6" });
  });

  it("gates: known lend required; declines with an unknown order, for a shiny battler and for a non-zero idle rest", () => {
    for (const name of ["shock-wave-player-flaaffy-opponent-corsola", "shock-wave-opponent-flaaffy-player-corsola"]) {
      const f = fixtureAt(name);
      const { view, effect } = effectOf(f);
      const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
      const lend = effect.spriteOrderInput as { known: true; free: number[] };
      expect(lend.known).toBe(true);
      const presentation = call(lend);
      expect(presentation).not.toBeNull();
      expect((presentation!.config as any).move).toBe("SHOCK_WAVE");
      expect((presentation!.config as any).animationInputs.derivedTiming).toBe(true);
      expect(call(undefined)).toBeNull();
      expect(call({ known: false })).toBeNull();
      const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
      for (const side of ["player", "opponent"] as const) expect(call(lend, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 95, speciesSymbol: "ONIX", name: "ONIX" } as never })).toBeNull();
      expect(call(lend, { ...view.field, opponent: { ...view.field.opponent, species: 76, speciesSymbol: "GOLEM", name: "GOLEM" } as never })).not.toBeNull();
    }
  });

  // tools/integration/r3ProfileRouteSearch.ts 351 4 1 4000 (first candidates: 7/7 CASTFORM slot 2 active (266), 27/0 FLAAFFY active (267),
  // 72/0 NOSEPASS no Shock Wave body, 122/7 MAGNETON active (267)).
  it("route 7/7 CASTFORM: live every age, following prompt reached, Scene ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(7, "on", [2], 7);
    const off = generatedCommandAnimationReplay(7, "off", [2], 7);
    const bodies = on.animations.filter((a) => a.moveId === 351 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(351, 266));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  }, 240000);
});
