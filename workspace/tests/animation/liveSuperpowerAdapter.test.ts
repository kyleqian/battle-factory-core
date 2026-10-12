import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../../src/engine/liveMovePresentationRng.ts";
import {
  LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION, liveMoveBgWriteRow,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveSuperpowerInputs } from "../../src/engine/liveSuperpowerInputs.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// D4 faithful timing: Superpower (276) (docs/next-adapters-prep31.md s1 / s3; src/engine/liveSuperpowerInputs.ts) with the per-side monbg write row
// from src/engine/liveMoveTimingPolicy.ts. Dense windows tools/integration/fixtures/s10a-live/superpower-*.json (receipt r5-live-receipt.json; D4 check
// receipts s10a-live/receipts-d4/, tools/integration/d4aTimingCheck.ts).
const DIR = "tools/integration/fixtures/s10a-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("superpower-") && n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
type SpFixture = Fixture & { timingPhase: "event" | "no-event"; monbgCntRow: 10 | 11 };
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as SpFixture;
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/r5-live-receipt.json", "utf8"));
const effectOf = (f: Fixture, age = 0) => {
  const view = liveView(f, age);
  return { view, effect: view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never } };
};

describe("D4 Superpower (276) faithful timing", () => {
  it("is a faithful-timing adapter (never scoped exact / faithful random); 248 rows both sides; shadow row 0; the status entry is the policy", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(276);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(276);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(276);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[276]).toBe(0);
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 120, damage: 10, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 276 })).toBe(248);
    }
    const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean;
      alternatePhaseResidual: { ages: number[] } }[]).find((e) => e.id === 276)!;
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[276]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(entry.d3).toBe(false);
    expect(entry.alternatePhaseResidual.ages).toEqual([]);
    expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === 276)).toBe(false);
  });

  it("the monbg write row is per side (prep31 T: player {10: 2, 11: 1} -> 10, opponent {11: 3} -> 11); the fixtures carry their measured row", () => {
    expect(liveMoveBgWriteRow(276, "player")).toBe(10);
    expect(liveMoveBgWriteRow(276, "opponent")).toBe(11);
    const params = LIVE_MOVE_TIMING_POLICY[276]!.parameters;
    expect(params.map((p) => [p.side, p.kind, p.chosen])).toEqual([["player", "bg-write-row", "no-event"], ["opponent", "bg-write-row", "event"]]);
    expect(NAMES).toHaveLength(6);
    const fx = NAMES.map(fixtureAt);
    for (const side of ["player", "opponent"] as const) {
      const rows = fx.filter((f) => f.attacker.geometry.side === side).map((f) => f.monbgCntRow);
      const p = params.find((q) => q.side === side)!;
      expect(rows.filter((r) => r === 11).length).toBe(p.alternatives.find((a) => a.phase === "event")!.measured);
      expect(rows.filter((r) => r === 10).length).toBe(p.alternatives.find((a) => a.phase === "no-event")!.measured);
    }
    for (const f of fx) {
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(248);
      expect(f.timingPhase).toBe(f.monbgCntRow === 11 ? "event" : "no-event");
    }
  });

  it("the receipts: every window exact twice fresh, both phases (the documented other-phase residual is empty)", () => {
    const rows = (receipt.windows as { fixture: string; move: string; rows: number; exactRows: number; residualPixels: number; freshRuns: number;
      identical: boolean }[]).filter((r) => r.move === "SUPERPOWER");
    expect(rows.map((r) => r.fixture.replace(`${DIR}/`, "").replace(".json", "")).sort()).toEqual(NAMES);
    for (const r of rows) expect([r.freshRuns, r.identical, r.residualPixels, r.exactRows]).toEqual([2, true, 0, r.rows]);
    for (const name of NAMES) {
      const [d4] = JSON.parse(readFileSync(`${DIR}/receipts-d4/${name}.json`, "utf8")) as { selectedPhase: boolean; violations: string[];
        runs: { residualPixels: number; digest: string }[] }[];
      expect(d4!.violations).toEqual([]);
      expect(d4!.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
      expect(d4!.runs[1]!.digest).toBe(d4!.runs[0]!.digest);
    }
  });

  it("gates: known lend required (the prep31 WEEZING player window follows a Tackle), non-shiny, zero idle rests", () => {
    const f = fixtureAt("superpower-alt-player-machamp-weezing");
    expect(f.precedingBodies).toEqual([{ moveId: 33, side: "opponent" }]);
    const { view, effect } = effectOf(f);
    const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
    expect((call(effect.spriteOrderInput)!.config as any).move).toBe("SUPERPOWER");
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) expect(call(effect.spriteOrderInput, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
    const anchors = (x: number, y: number, rest = { x2: 0, y2: 0 }) => ({ spriteCenter: { x, y }, picOffsetPoint: { x, y }, frontIdleRest: rest });
    const base = { attackerSide: "player" as const, attackerSpecies: "MACHAMP", targetSpecies: "GOLEM", attacker: anchors(72, 86), target: anchors(176, 49),
      palettes: { unfaded: Array(512).fill(0), faded: Array(512).fill(0), hardware: Array(512).fill(0) } as never, orbPalette: [], meteorPalette: [], rockPalette: [],
      activationOrder: Array.from({ length: 64 }, (_, i) => i), sort: (previous: readonly number[]) => [...previous], monbgCntRow: 10 as const };
    expect(liveSuperpowerInputs({ ...base, target: anchors(176, 49, { x2: 2, y2: 0 }) })).toBeNull();
    expect(liveSuperpowerInputs({ ...base, attacker: anchors(72, 86, { x2: 0, y2: 1 }) })).toBeNull();
    const regs = (row: 10 | 11, age: number) => liveSuperpowerInputs({ ...base, monbgCntRow: row })!.animationInputsAt(age).registers as Record<string, number>;
    expect([regs(10, 10).bg2hofs, regs(11, 10).bg2hofs, regs(10, 11).bg2hofs, regs(11, 11).bg2hofs]).toEqual([(32 - 72) & 0x1ff, 0, (32 - 72) & 0x1ff, (32 - 72) & 0x1ff]);
  });

  const rulesWithoutSceneMarker = (v: { rules: any }) => {
    const rc = v.rules.rulesContext;
    return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
  };
  // route = generated rentals, party member 0 knows the move, one turn (tools/integration/r3ProfileRouteSearch.ts 276 4 1 4000, seeds ascending:
  // 179/42, 245/42 and 377/42 NIDOQUEEN active over 248 rows; 311/42 NIDOQUEEN no Superpower body).
  it("route 179/42 NIDOQUEEN: body live every age, following prompt reached, Scene ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(179, "on", [0], 42);
    const off = generatedCommandAnimationReplay(179, "off", [0], 42);
    const bodies = on.animations.filter((a) => a.moveId === 276 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(276, 248));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  }, 240000);
});
