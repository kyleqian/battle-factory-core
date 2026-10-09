import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import {
  dominantLiveMoveTimingPhase, LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, liveMoveTimingBodyRows, liveMoveTimingSidePhase,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { CONFUSE_RAY_FRAME_COUNT } from "../../src/animation/confuseRay.ts";

// d4tails (S10A, ISSUES #152): Icy Wind, Blizzard and Confuse Ray reclassified to faithful timing (an optional lag before the closing
// restore fade, counted fresh); Faint Attack measured but not landed (its player-side dominant phase is the short body).
const root = join(import.meta.dirname, "../..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
const status = read("docs/animation-integration-live-status.json");
const receipt = read("tools/integration/fixtures/d4tails-live-receipt.json");
type Body = { move: string; activation: number; bodyRows: number; lagAges: number[] };
const counters = read("tools/integration/fixtures/d4tails/counters.json") as { scenario: string; r0EqualsR1: boolean; bodies: Body[] }[];
const bodies = (move: string) => counters.flatMap((c) => c.bodies.filter((b) => b.move === move).map((b) => ({ ...b, scenario: c.scenario })));
const request = (moveId: number, attacker: 0 | 1) => ({ moveId, attacker, target: 1 - attacker, turn: 0 } as unknown as BattleMoveAnimationRequest);
const entry = (id: number) => status.faithfulTimingAdapters.find((x: { id: number }) => x.id === id);
const ages = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
type Window = { fixture: string; move: string; measuredPhase: string; selectedPhase: boolean; rows: number; expectedDuration: number;
  px: number[]; affectedAges: number[]; digestsIdentical: boolean; violations: string[] };
const windows = (move: string) => (receipt.windows as Window[]).filter((w) => w.move === move);

describe("d4tails counters (fresh direct-mGBA, two runs per scenario)", () => {
  it("are reproducible and show the optional lag as the only body-length difference", () => {
    expect(counters).toHaveLength(46);
    for (const c of counters) expect(c.r0EqualsR1, c.scenario).toBe(true);
    for (const b of bodies("ICY_WIND")) {
      expect(b.lagAges.slice(0, 2), b.scenario).toEqual([241, 242]);
      expect(b.bodyRows, b.scenario).toBe(b.lagAges.includes(261) ? 286 : 285);
    }
  });
});

describe("d4tails: Icy Wind (196) optional lag at 261", () => {
  it("is a faithful-timing entry with the measured 11 : 4 counts and the lag phase (287 rows)", () => {
    const [p] = LIVE_MOVE_TIMING_POLICY[196]!.parameters;
    expect(p).toMatchObject({ kind: "optional-lag-age", age: 261, fixedLagAges: [241, 242], iterations: 284, chosen: "event", tieRuleUsed: false });
    expect(p!.alternatives).toEqual([{ phase: "event", bodyRows: 287, measured: 11 }, { phase: "no-event", bodyRows: 286, measured: 4 }]);
    expect(dominantLiveMoveTimingPhase(p!.alternatives).phase).toBe("event");
    const icy = bodies("ICY_WIND");
    expect([icy.filter((b) => b.lagAges.includes(261)).length, icy.filter((b) => !b.lagAges.includes(261)).length]).toEqual([11, 4]);
    expect(liveMoveTimingBodyRows(196)).toBe(287);
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(196, a))).toBe(liveMoveTimingBodyRows(196));
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(196);
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(196);
  });

  it("proves 11 lag windows 0 px and 4 short bodies only on the documented tail rows, twice fresh", () => {
    const w = windows("ICY_WIND");
    expect(w).toHaveLength(15);
    for (const x of w) {
      expect(x.digestsIdentical && x.violations.length === 0, x.fixture).toBe(true);
      if (x.selectedPhase) expect([x.px, x.rows, x.expectedDuration], x.fixture).toEqual([[0, 0, 0, 0], 287, 287]);
      else expect([x.measuredPhase, x.rows, x.affectedAges], x.fixture).toEqual(["no-event", 286, entry(196).alternatePhaseResidual.ages]);
    }
    expect(w.filter((x) => x.selectedPhase)).toHaveLength(11);
    expect(entry(196).alternatePhaseResidual.ages).toEqual([...ages(263, 278), 280, 285]);
  });
});

describe("d4tails: Blizzard (59) optional lag, per side", () => {
  it("is a per-side faithful-timing entry: player lag 347 (7 : 0, 372 rows), opponent lag 336 (3 : 1, 361 rows)", () => {
    const [player, opponent] = LIVE_MOVE_TIMING_POLICY[59]!.parameters;
    expect(player).toMatchObject({ kind: "optional-lag-age", age: 347, side: "player", chosen: "event", iterations: 369 });
    expect(player!.alternatives).toEqual([{ phase: "event", bodyRows: 372, measured: 7 }, { phase: "no-event", bodyRows: 371, measured: 0 }]);
    expect(opponent).toMatchObject({ kind: "optional-lag-age", age: 336, fixedLagAges: [356, 357], side: "opponent", chosen: "event", iterations: 358 });
    expect(opponent!.alternatives).toEqual([{ phase: "event", bodyRows: 361, measured: 3 }, { phase: "no-event", bodyRows: 360, measured: 1 }]);
    expect(liveMoveTimingSidePhase(59, "optional-lag-age", "player")).toBe("event");
    expect(liveMoveTimingSidePhase(59, "optional-lag-age", "opponent")).toBe("event");
    expect(liveMoveAnimationDuration(request(59, 0))).toBe(player!.alternatives[0].bodyRows);
    expect(liveMoveAnimationDuration(request(59, 1))).toBe(opponent!.alternatives[0].bodyRows);
    const bl = bodies("BLIZZARD");
    expect(bl.filter((b) => b.bodyRows === 371).every((b) => b.lagAges.join() === "347,368,369")).toBe(true);
    expect(bl.filter((b) => b.bodyRows === 371)).toHaveLength(7);
    expect(bl.filter((b) => b.lagAges.join() === "336,357,358")).toHaveLength(3);
    expect(bl.filter((b) => b.lagAges.join() === "356,357").map((b) => b.scenario.split("/").pop())).toEqual(["blizzard-opponent-blastoise-blastoise.json"]);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(59);
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(59);
  });

  it("proves 10 lag windows 0 px and BLASTOISE -> BLASTOISE only on ages 338..353, twice fresh", () => {
    const w = windows("BLIZZARD");
    expect(w).toHaveLength(11);
    for (const x of w) {
      expect(x.digestsIdentical && x.violations.length === 0, x.fixture).toBe(true);
      if (x.selectedPhase) expect([x.px, x.rows === x.expectedDuration], x.fixture).toEqual([[0, 0, 0, 0], true]);
    }
    expect(w.filter((x) => !x.selectedPhase).map((x) => [x.fixture.split("/").pop(), x.rows, x.affectedAges])).toEqual([
      ["blizzard-opponent-blastoise-blastoise.json", 360, ages(338, 353)]]);
    expect(entry(59).alternatePhaseResidual.ages).toEqual(ages(338, 353));
  });
});

describe("d4tails: Confuse Ray (109) optional lag at 249 (or 250)", () => {
  it("is a faithful-timing entry with the production-window counts 11 : 3 and the lag phase (270 rows)", () => {
    const [p] = LIVE_MOVE_TIMING_POLICY[109]!.parameters;
    expect(p).toMatchObject({ kind: "optional-lag-age", age: 249, fixedLagAges: [26, 229, 230], iterations: 266, chosen: "event", tieRuleUsed: false });
    expect(p!.alternatives).toEqual([{ phase: "event", bodyRows: 270, measured: 11 }, { phase: "no-event", bodyRows: 269, measured: 3 }]);
    expect(liveMoveTimingBodyRows(109)).toBe(CONFUSE_RAY_FRAME_COUNT);
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(109, a))).toBe(270);
    // Instrumented: 9 at 249, 3 at 250, 2 none (both positions precede the fade's first changed row 251).
    const cr = bodies("CONFUSE_RAY").map((b) => b.lagAges.slice(3).join() || "-");
    expect(["249", "250", "-"].map((k) => cr.filter((x) => x === k).length)).toEqual([9, 3, 2]);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(109);
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(109);
  });

  it("proves 11 long bodies 0 px and the 3 short bodies only on body ages 251..266 (production probes, twice fresh)", () => {
    const cr = receipt.confuseRay;
    expect(cr.passesIdentical).toBe(true);
    expect([cr.long, cr.longZeroPx, cr.short]).toEqual([11, 11, 3]);
    for (const s of cr.shortBodies) expect(s.bodyAges, s.window).toEqual("251..266");
    expect(entry(109).alternatePhaseResidual.ages).toEqual(ages(251, 266));
    for (const x of windows("CONFUSE_RAY")) expect([x.selectedPhase, x.px, x.rows], x.fixture).toEqual([true, [0, 0, 0, 0], 270]);
  });
});

describe("d4tails: Faint Attack (185) not landed", () => {
  it("stays scoped exact: its player-side dominant phase is the short body (a renderer change)", () => {
    expect(LIVE_MOVE_TIMING_POLICY[185]).toBeUndefined();
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(185);
    const fa = bodies("FAINT_ATTACK");
    for (const b of fa) expect(b.lagAges.slice(0, 6)).toEqual([80, 81, 108, 109, 182, 183]);
    expect(fa.map((b) => b.bodyRows === 225 ? "long" : "short").sort()).toEqual([...Array(2).fill("long"), ...Array(7).fill("short")]);
    expect(receipt.faintAttack.landed).toBe(false);
  });
});
