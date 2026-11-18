import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import {
  dominantLiveMoveTimingPhase, LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, liveMoveTimingSidePhase,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { FAINT_ATTACK_ANIMATION_PROFILE, faintAttackBgState, faintAttackRestoreProfile } from "../../src/animation/faintAttack.ts";

// S10A fa185 (ISSUES #152 "Faint Attack (185) short bodies"): the optional restorebg lag at 205 per attacker side (player: none, the
// restore fade-in one row earlier; opponent: lag). Counters tools/integration/fixtures/d4tails/counters.json; windows
// tools/integration/fixtures/fa185/windows; receipt tools/integration/fixtures/fa185-live-receipt.json (d4aTimingCheck.ts, twice fresh).
const root = join(import.meta.dirname, "../..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
const status = read("docs/animation-integration-live-status.json");
const receipt = read("tools/integration/fixtures/fa185-live-receipt.json");
type Body = { move: string; activation: number; bodyRows: number; lagAges: number[] };
const counters = read("tools/integration/fixtures/d4tails/counters.json") as { scenario: string; r0EqualsR1: boolean; bodies: Body[] }[];
const request = (attacker: 0 | 1) => ({ moveId: 185, attacker, target: 1 - attacker, turn: 0 } as unknown as BattleMoveAnimationRequest);
const ages = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
type Window = { fixture: string; side: "player" | "opponent"; measuredPhase: string; selectedPhase: boolean; rows: number;
  expectedDuration: number; px: number[]; affectedAges: number[]; digestsIdentical: boolean; violations: string[] };
const windows = receipt.windows as Window[];

describe("fa185: Faint Attack (185) per-side optional restore lag at 205", () => {
  it("is a side-keyed faithful-timing entry with the counted phases (player 1 : 6 -> no lag, opponent 2 : 1 -> lag)", () => {
    const params = LIVE_MOVE_TIMING_POLICY[185]!.parameters;
    expect(params.map((p) => [p.side, p.kind, p.age, p.iterations, p.chosen, p.tieRuleUsed])).toEqual([
      ["player", "optional-lag-age", 205, 219, "no-event", false], ["opponent", "optional-lag-age", 205, 219, "event", false]]);
    for (const p of params) {
      expect(p.fixedLagAges).toEqual([80, 81, 108, 109, 182, 183]);
      expect(dominantLiveMoveTimingPhase(p.alternatives).phase).toBe(p.chosen);
    }
    expect(params[0]!.alternatives).toEqual([{ phase: "event", bodyRows: 226, measured: 1 }, { phase: "no-event", bodyRows: 225, measured: 6 }]);
    expect(params[1]!.alternatives).toEqual([{ phase: "event", bodyRows: 226, measured: 2 }, { phase: "no-event", bodyRows: 225, measured: 1 }]);
    expect(liveMoveTimingSidePhase(185, "optional-lag-age", "player")).toBe("no-event");
    expect(liveMoveTimingSidePhase(185, "optional-lag-age", "opponent")).toBe("event");
    // The counted bodies (fresh, r0 == r1): every body has the six fixed lags; the optional lag only in the two opponent long bodies.
    const fa = counters.flatMap((c) => c.bodies.filter((b) => b.move === "FAINT_ATTACK").map((b) => ({ ...b, scenario: c.scenario, ok: c.r0EqualsR1 })));
    expect(fa).toHaveLength(9);
    for (const b of fa) {
      expect([b.ok, b.lagAges.slice(0, 6), b.bodyRows], b.scenario).toEqual([true, [80, 81, 108, 109, 182, 183], b.lagAges.includes(205) ? 225 : 224]);
    }
    expect(fa.filter((b) => b.lagAges.includes(205)).map((b) => b.scenario.split("/").pop()).sort()).toEqual([
      "s10aside-faint-attack-opponent-golbat-player-golem.json", "s10aside-faint-attack-opponent-grovyle-player-onix.json"]);
    expect(fa.filter((b) => !b.lagAges.includes(205) && !b.scenario.includes("opponent-delcatty"))).toHaveLength(6);
  });

  it("renders the policy phase: 226 player / 227 opponent rows (liv2: the ROM window 225 + 1, was 220 / 221), the player restore fade-in one row earlier (ages 203..218 only)", () => {
    expect(liveMoveAnimationDuration(request(0))).toBe(226);
    expect(liveMoveAnimationDuration(request(1))).toBe(227);
    expect(faintAttackRestoreProfile(true)).toBe(FAINT_ATTACK_ANIMATION_PROFILE);
    const short = faintAttackRestoreProfile(false);
    expect([short.defaultBgSwapAge, short.doneAge]).toEqual([203, 218]);
    const differing = ages(0, 230).filter((age) =>
      JSON.stringify(faintAttackBgState(age, short)) !== JSON.stringify(faintAttackBgState(age, FAINT_ATTACK_ANIMATION_PROFILE)));
    expect(differing).toEqual(ages(203, 218));
  });

  it("proves 8 policy-phase windows 0 px on both sides and 2 other-phase windows only on the documented ages, twice fresh", () => {
    expect(windows).toHaveLength(10);
    const entry = status.faithfulTimingAdapters.find((x: { id: number }) => x.id === 185);
    expect(entry.alternatePhaseResidual.ages).toEqual(ages(203, 218));
    for (const w of windows) {
      expect([w.digestsIdentical, w.violations, w.px.length], w.fixture).toEqual([true, [], 4]);
      const policy = w.side === "player" ? "no-event" : "event";
      expect(w.selectedPhase, w.fixture).toBe(w.measuredPhase === policy);
      if (w.selectedPhase) expect([w.px, w.rows, w.expectedDuration], w.fixture).toEqual([[0, 0, 0, 0], w.side === "player" ? 220 : 221, w.rows]);
      else expect(w.affectedAges, w.fixture).toEqual(ages(203, 218));
    }
    const selected = (side: string) => windows.filter((w) => w.side === side && w.selectedPhase).length;
    expect([selected("player"), selected("opponent")]).toEqual([6, 2]);
    // The accepted prep6 player body is the documented other phase (the long body: 221 rows, 281,024 px on 203..218).
    const prep6 = windows.find((w) => w.fixture.endsWith("/prep6-faint-attack-player.json"))!;
    expect([prep6.side, prep6.measuredPhase, prep6.selectedPhase, prep6.rows, prep6.px[0]]).toEqual(["player", "event", false, 221, 281024]);
    expect(receipt.summary).toMatchObject({ fixtures: 10, policyPhase: 8, policyPhaseZeroPx: 8, otherPhase: 2, otherPhaseOnlyDocumented: 2, violations: 0 });
  });

  it("is counted as faithful timing, not scoped exact", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(185);
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(185);
    expect(status.implementedAdapters.some((x: { id: number }) => x.id === 185)).toBe(false);
  });
});
