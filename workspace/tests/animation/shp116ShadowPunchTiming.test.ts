import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import {
  LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, dominantLiveMoveTimingPhase, liveMoveOptionalLagAge,
  liveMoveTimingBodyRows, liveMoveTimingSidePhase,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { ctl95ControlRowSha, readCtl95ControlFixture } from "../../tools/integration/ctl95ControlFixture.ts";
import { liveView } from "../../tools/integration/liveAdapterFramebuffer.ts";

// S10A shp116 (sp103, docs/next-adapters-sp103.md + docs/shp116-shadow-lead-and-shadow-punch-d4.md; fp100 precedent): Shadow Punch
// 325's optional lag at body row 90 (production age 82; restorebg's LoadDefaultBg frame) is a D4 CPU-phase parameter; production renders
// the dominant measured phase (lag) on both sides and counts the move as faithful timing.
type PhaseRow = { stem: string; body: number; side: "player" | "opponent"; romBodyRows: number; lagAges: number[]; phase: "event" | "no-event" };
const phaseRows: PhaseRow[] = readFileSync("tools/integration/fixtures/sp103/receipts/phase.tsv", "utf8").trim().split("\n").slice(1).map((line) => {
  const [stem, body, side, , , , rows, lags, phase] = line.split("\t") as string[];
  return { stem: stem!, body: Number(body), side: side as "player", romBodyRows: Number(rows), lagAges: lags!.split(",").map(Number), phase: phase as "event" };
});
// Live audit 24's 6 fresh bodies + the 2 accepted HAUNTER -> ONIX fixtures (108 rows, no lag), banked (docs/live-audit-24.md TIMING-PHASE).
const AUDIT24 = { opponent: { event: 2, "no-event": 2 }, player: { event: 2, "no-event": 2 } } as const;
const req = (attacker: 0 | 1) => ({ moveId: 325, attacker, target: 1 - attacker, turn: 0, power: 60, damage: 30, friendship: 70, multihit: 0 }) as never;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe("shp116: Shadow Punch age-90 restore lag (D4)", () => {
  it("the banked phase table: every body lags at 27, 70, 71; the optional lag at 90 decides 109 vs 108 rows", () => {
    expect(phaseRows).toHaveLength(24);
    for (const r of phaseRows) {
      expect(r.lagAges).toEqual(r.phase === "event" ? [27, 70, 71, 90] : [27, 70, 71]);
      expect(r.romBodyRows).toBe(r.phase === "event" ? 109 : 108);
    }
    expect(new Set(phaseRows.map((r) => r.stem)).size).toBe(6);
    expect(["player", "opponent"].map((side) => [side, phaseRows.filter((r) => r.side === side && r.phase === "event").length,
      phaseRows.filter((r) => r.side === side && r.phase === "no-event").length])).toEqual([["player", 11, 1], ["opponent", 10, 2]]);
  });

  it("the policy entry is the dominant measured phase per side (lag on both), recomputed from the table + audit 24", () => {
    for (const side of ["opponent", "player"] as const) {
      const rows = phaseRows.filter((r) => r.side === side);
      const counts = { event: rows.filter((r) => r.phase === "event").length + AUDIT24[side].event,
        "no-event": rows.filter((r) => r.phase === "no-event").length + AUDIT24[side]["no-event"] };
      const p = LIVE_MOVE_TIMING_POLICY[325]!.parameters.find((q) => q.side === side)!;
      expect(p).toMatchObject({ kind: "optional-lag-age", age: 90, fixedLagAges: [27, 70, 71], iterations: 105, chosen: "event", tieRuleUsed: false });
      expect(p.alternatives).toEqual([{ phase: "event", bodyRows: 109, measured: counts.event }, { phase: "no-event", bodyRows: 108, measured: counts["no-event"] }]);
      expect(dominantLiveMoveTimingPhase(p.alternatives)).toEqual({ phase: "event", tie: false });
      expect([liveMoveOptionalLagAge(325, side), liveMoveTimingBodyRows(325, side), liveMoveTimingSidePhase(325, "optional-lag-age", side)]).toEqual([90, 109, "event"]);
    }
    expect(LIVE_MOVE_TIMING_POLICY[325]!.parameters.map((p) => [p.side, p.alternatives[0].measured, p.alternatives[1].measured])).toEqual([["opponent", 12, 4], ["player", 13, 3]]);
  });

  it("accounting: Shadow Punch moved from scoped exact to faithful timing (236 + 13 + 27 = 276 after tmr136's Smokescreen; Struggle the separate + 1)", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(325);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(325);
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    expect([status.implementedCount - Object.keys(status.additionalRequiredBodies).length, status.faithfulRandomCount, status.faithfulTimingCount]).toEqual([236, 13, 27]);
    expect(status.implementedCount).toBe(237);
    expect(status.implementedAdapters.some((e: { id: number }) => e.id === 325)).toBe(false);
    const entry = status.faithfulTimingAdapters.find((e: { id: number }) => e.id === 325);
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[325]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.alternatePhaseResidual).toMatchObject({ ages: [...range(83, 98), 101], maxPixelsPerRow: 18176 });
    const census = JSON.parse(readFileSync("tools/integration/fixtures/remaining-adapters-census.json", "utf8"));
    expect(census.summary?.sumsTo ?? census.sumsTo).toBe("236+13+27+0+0=276");
  });

  it("the live adapter follows the policy: 107 player / 106 opponent rows and liveFadeHost deferrals 1", () => {
    expect([liveMoveAnimationDuration(req(0)), liveMoveAnimationDuration(req(1))]).toEqual([107, 106]);
    for (const name of ["sp103-opponent-haunter-quagsire-b0", "sp103-player-haunter-steelix-b0"]) {
      const v = liveView(readCtl95ControlFixture(`tools/integration/fixtures/sp103/windows/${name}.json`).fixture, 90);
      const config = liveMoveAnimationPresentation((v.effect as unknown as { request: never }).request, v.field, 90)?.config as
        { move: string; liveFadeHost?: { restoreTaskStartCallbackDeferrals: number } };
      expect([config.move, config.liveFadeHost]).toEqual(["SHADOW_PUNCH", { restoreTaskStartCallbackDeferrals: 1 }]);
    }
  });

  describe("committed ROM windows (fresh direct mGBA, r1 == r2) re-rendered through the production live renderer", () => {
    const dir = "tools/integration/fixtures/sp103/windows";
    const windows = readdirSync(dir).filter((n) => n.endsWith(".json")).sort();
    // The policy-phase residual row outside the D4 entry: the player window's last row (106) is the pre-existing E+5 trail row
    // (live audit 24 ARTIFACT, both phases). The elevated opponent TARGET's (CROBAT) shadow return at 101 + deferrals is drawn
    // (shp116, the sp103 DEFECT): without it ages 102..105 are 200 px each (the revert experiment in the shp116 doc).
    const EXPECTED: Record<string, number[]> = {
      "sp103-opponent-haunter-aerodactyl-slow-b0.json": [],
      "sp103-opponent-haunter-quagsire-b0.json": [],
      "sp103-opponent-haunter-steelix-b2.json": [],
      "sp103-player-haunter-steelix-b0.json": [106],
      "sp103-player-haunter-crobat-b0.json": [106],
      "sp103-player-haunter-crobat-slow-b0.json": [106],
      // Other phase (no lag at 90): the fade-in 83..98 one BLDY step off, the opponent shadow return one row earlier in the ROM (101:
      // the HAUNTER attacker's / the CROBAT target's), and the documented last rows (the ROM's next output inside the one-row-longer
      // window; the player's trail row).
      "sp103-opponent-haunter-steelix-b0.json": [...range(83, 98), 101, 105],
      "sp103-player-haunter-crobat-slow-b3.json": [...range(83, 98), 101, 105, 106],
    };
    it("eight windows: 6 policy phase (opponent 3, player 3) + 2 other phase (opponent STEELIX b0, player CROBAT-slow b3)", () => {
      expect(windows).toEqual(Object.keys(EXPECTED).sort());
      const phaseOf = (name: string) => phaseRows.find((r) => `${r.stem}-b${r.body}.json` === name)!.phase;
      expect(windows.filter((n) => phaseOf(n) === "no-event")).toEqual(["sp103-opponent-haunter-steelix-b0.json", "sp103-player-haunter-crobat-slow-b3.json"]);
    });
    for (const name of windows) {
      it(name, () => {
        const f = readCtl95ControlFixture(`${dir}/${name}`);
        expect(f.rows).toHaveLength(f.fixture.attacker.geometry.side === "player" ? 107 : 106);
        const bad = f.rows.filter(([age, , sha]) => ctl95ControlRowSha(f, age) !== sha).map(([age]) => age);
        expect(bad).toEqual(EXPECTED[name]);
      }, 60_000);
    }
  });
});
