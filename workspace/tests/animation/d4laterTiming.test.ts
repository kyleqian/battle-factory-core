import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import {
  dominantLiveMoveTimingPhase, LIVE_MOVE_TIMING_POLICY, liveMoveOptionalLagAge, liveMoveTimingBodyOf, liveMoveTimingParameter, liveMoveTimingSidePhase,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveSheerColdRestoreFadeEndAge } from "../../src/engine/liveProfileMoves.ts";

// S10A d4later (docs/next-adapters-d4later.md): the optional lag of Sheer Cold (329, age 171) and Extrasensory (326, task row 142) for an
// OPPONENT attacker is measured per body class: the battle's first body (the order host's firstBody) mostly without it, a LATER body always
// with it. Counters tools/integration/fixtures/d4later/counters.json (speciesAudit2Counters.py, twice fresh, explicit lab seeds); windows
// tools/integration/fixtures/later58/live (d4aTimingCheck.ts receipt tools/integration/fixtures/d4later/d4-timing-later58-opponent.json).
const root = join(import.meta.dirname, "../..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
const status = read("docs/animation-integration-live-status.json");
type Body = { move: string; bodyRows: number; lagAges: number[]; firstBody: boolean; part: number };
const counters = read("tools/integration/fixtures/d4later/counters.json") as { scenario: string; r0EqualsR1: boolean; bodies: Body[] }[];
const check = read("tools/integration/fixtures/d4later/d4-timing-later58-opponent.json") as { fixture: string; move: string; body: string;
  selectedPhase: boolean; window: number; expectedDuration: number; runs: { residualPixels: number; digest: string; affectedAges: number[] }[];
  violations: string[] }[];
const request = (moveId: number, attacker: 0 | 1) => ({ moveId, attacker, target: 1 - attacker, turn: 0 } as unknown as BattleMoveAnimationRequest);
const sideOf = (scenario: string): "player" | "opponent" => (/-opp-|-opponent-/.test(scenario.split("/").pop()!.replace(/-player-.*/, "")) ? "opponent" : "player");
const count = (move: string, side: string, firstBody: boolean, lagAge: number) => {
  const bodies = counters.filter((c) => sideOf(c.scenario) === side).flatMap((c) => c.bodies).filter((b) => b.move === move && b.firstBody === firstBody);
  return { event: bodies.filter((b) => b.lagAges.includes(lagAge)).length, none: bodies.filter((b) => !b.lagAges.includes(lagAge)).length };
};

describe("d4later: first vs later body D4 phase (Sheer Cold 329, Extrasensory 326, opponent attacker)", () => {
  it("the counters are twice-fresh identical and split by body class", () => {
    expect(counters.length).toBe(98);
    expect(counters.every((c) => c.r0EqualsR1)).toBe(true);
    // Sheer Cold age 171: opponent first 0 : 12, later 5 : 0; player first 14 : 0, later 4 : 1 (the player entry is unchanged: lag).
    expect(count("SHEER_COLD", "opponent", true, 171)).toEqual({ event: 0, none: 12 });
    expect(count("SHEER_COLD", "opponent", false, 171)).toEqual({ event: 5, none: 0 });
    expect(count("SHEER_COLD", "player", true, 171)).toEqual({ event: 14, none: 0 });
    expect(count("SHEER_COLD", "player", false, 171)).toEqual({ event: 4, none: 1 });
    // Extrasensory: the counter's lag age 141 is the policy's task row 142 (fixed 121 / 122 = task rows 122 / 123). Opponent first 3 : 4 (the
    // ALAKAZAM -> GOLEM first bodies lag), later 11 : 0.
    expect(count("EXTRASENSORY", "opponent", true, 141)).toEqual({ event: 3, none: 4 });
    expect(count("EXTRASENSORY", "opponent", false, 141)).toEqual({ event: 11, none: 0 });
  });

  it("the later-body parameters are body-keyed with the counted phases; the first-body parameters are unchanged", () => {
    for (const [id, age, rows] of [[329, 171, 191], [326, 142, 162]] as const) {
      // asl155 adds the PLAYER later-body Extrasensory parameters (tests/asl155ExtrasensoryPlayerLater.test.ts); d4later's are the opponent ones
      const later = LIVE_MOVE_TIMING_POLICY[id]!.parameters.filter((p) => p.body === "later" && (id === 329 || p.side === "opponent"));
      expect(later.map((p) => [p.kind, p.age, p.side, p.chosen, p.tieRuleUsed])).toEqual([["optional-lag-age", age, "opponent", "event", false]]);
      expect(later[0]!.alternatives).toEqual([{ phase: "event", bodyRows: rows, measured: id === 329 ? 5 : 11 }, { phase: "no-event", bodyRows: rows - 1, measured: 0 }]);
      expect(dominantLiveMoveTimingPhase(later[0]!.alternatives)).toEqual({ phase: "event", tie: false });
      const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[] }[]).find((e) => e.id === id)!;
      expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[id]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    }
    expect(liveMoveTimingSidePhase(329, "optional-lag-age", "opponent")).toBe("no-event");
    expect(liveMoveTimingSidePhase(329, "optional-lag-age", "opponent", "later")).toBe("event");
    expect(liveMoveTimingSidePhase(329, "optional-lag-age", "player", "later")).toBe("event");
    expect(liveMoveOptionalLagAge(326)).toBeNull();
    expect(liveMoveOptionalLagAge(326, "opponent", "later")).toBe(142);
    expect(liveMoveOptionalLagAge(326, "player", "later")).toBe(142); // asl155 (scan93 patch B: 9 of 11 player later windows lag)
    expect(liveMoveTimingParameter(326, "optional-lag-age")!.body).toBeUndefined();
  });

  it("the body class follows the order host lend; the durations and the Sheer Cold restore end follow the class", () => {
    expect(liveMoveTimingBodyOf(undefined)).toBe("first");
    expect(liveMoveTimingBodyOf({ known: true, firstBody: true })).toBe("first");
    expect(liveMoveTimingBodyOf({ known: true })).toBe("later");
    expect([0, 1].map((a) => liveMoveAnimationDuration(request(329, a as 0 | 1)))).toEqual([191, 190]);
    expect([0, 1].map((a) => liveMoveAnimationDuration(request(329, a as 0 | 1), undefined, "later"))).toEqual([191, 191]);
    expect([0, 1].map((a) => liveMoveAnimationDuration(request(326, a as 0 | 1)))).toEqual([161, 161]);
    expect([0, 1].map((a) => liveMoveAnimationDuration(request(326, a as 0 | 1), undefined, "later"))).toEqual([162, 162]);
    expect([liveSheerColdRestoreFadeEndAge("opponent"), liveSheerColdRestoreFadeEndAge("opponent", "later")]).toEqual([188, 189]);
  });

  it("the later58 opponent windows: every later body is in the policy phase, 0 px twice fresh at its duration; first bodies unchanged", () => {
    expect(check).toHaveLength(32);
    for (const r of check) {
      expect(r.violations).toEqual([]);
      expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
      if (r.body === "later") expect([r.selectedPhase, r.runs[0]!.residualPixels, r.window]).toEqual([true, 0, r.expectedDuration]);
    }
    expect(check.filter((r) => r.body === "later").map((r) => r.move).sort()).toEqual([...Array(11).fill("EXTRASENSORY"), ...Array(5).fill("SHEER_COLD")]);
    // The ALAKAZAM -> GOLEM opponent FIRST bodies lag (the first-body minority): the documented rows 143..158 only.
    const other = check.filter((r) => !r.selectedPhase);
    expect(other.map((r) => r.fixture.split("/").pop())).toEqual(["extrasensory-opp-alakazam-golem-growl-0.json", "extrasensory-opp-alakazam-golem-splash-0.json"]);
    for (const r of other) expect([r.body, r.runs[0]!.residualPixels, r.runs[0]!.affectedAges]).toEqual(["first", 293344, Array.from({ length: 16 }, (_, i) => 143 + i)]);
  });
});
