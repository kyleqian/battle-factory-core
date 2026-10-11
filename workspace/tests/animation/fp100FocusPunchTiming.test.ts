import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { focusPunchAtAge, focusPunchFirstInactiveAge } from "../../src/animation/focusPunch.ts";
import { LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import {
  LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, dominantLiveMoveTimingPhase, liveMoveOptionalLagAge,
  liveMoveTimingBodyRows, liveMoveTimingSidePhase,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { ctl95ControlRowSha, readCtl95ControlFixture } from "../../tools/integration/ctl95ControlFixture.ts";
import { liveView } from "../../tools/integration/liveAdapterFramebuffer.ts";

// S10A fp100 (docs/fp100-focus-punch-d4.md): Focus Punch 264's optional lag at body age 131 (restorebg's LoadDefaultBg frame) is a D4
// CPU-phase parameter; production renders the dominant measured phase (lag) on both sides and counts the move as faithful timing.
type PhaseRow = { stem: string; side: "player" | "opponent"; romBodyRows: number; lagAges: number[]; phase: "event" | "no-event"; badAges: string };
const phaseRows: PhaseRow[] = readFileSync("tools/integration/fixtures/fp100/receipts/phase.tsv", "utf8").trim().split("\n").slice(1).map((line) => {
  const [stem, , side, , , rows, lags, phase, , bad] = line.split("\t") as string[];
  return { stem: stem!, side: side as "player", romBodyRows: Number(rows), lagAges: lags!.split(",").map(Number), phase: phase as "event", badAges: bad! };
});
// The accepted live fixtures (tools/compare/fixtures/focus-punch-*-breloom-*-starmie.json, banked; not re-probed): opponent 153 rows, player 154.
const ACCEPTED = { opponent: { event: 0, "no-event": 1 }, player: { event: 1, "no-event": 0 } } as const;
const req = (attacker: 0 | 1) => ({ moveId: 264, attacker, target: 1 - attacker, turn: 0, power: 150, damage: 42, friendship: 70, multihit: 0 }) as never;

describe("fp100: Focus Punch age-131 restore lag (D4)", () => {
  it("the banked phase table: every body lags at 30 and late fixed rows; the optional lag at 131 decides 154 vs 153 rows", () => {
    expect(phaseRows).toHaveLength(29);
    for (const r of phaseRows) {
      expect(r.lagAges).toEqual(r.phase === "event" ? [30, 131, 152, 153] : [30, 151, 152]);
      expect(r.romBodyRows).toBe(r.phase === "event" ? 154 : 153);
    }
    // >= 3 fresh pairs on each side, first and later bodies (fp100 scenarios).
    expect(new Set(phaseRows.filter((r) => r.stem.startsWith("fp100-")).map((r) => r.stem)).size).toBe(4);
  });

  it("the policy entry is the dominant measured phase per side (lag on both), recomputed from the table + the accepted fixtures", () => {
    for (const side of ["opponent", "player"] as const) {
      const rows = phaseRows.filter((r) => r.side === side);
      const counts = { event: rows.filter((r) => r.phase === "event").length + ACCEPTED[side].event,
        "no-event": rows.filter((r) => r.phase === "no-event").length + ACCEPTED[side]["no-event"] };
      const p = LIVE_MOVE_TIMING_POLICY[264]!.parameters.find((q) => q.side === side)!;
      expect(p).toMatchObject({ kind: "optional-lag-age", age: 131, fixedLagAges: [30, 151, 152], iterations: 150, chosen: "event", tieRuleUsed: false });
      expect(p.alternatives).toEqual([{ phase: "event", bodyRows: 154, measured: counts.event }, { phase: "no-event", bodyRows: 153, measured: counts["no-event"] }]);
      expect(dominantLiveMoveTimingPhase(p.alternatives)).toEqual({ phase: "event", tie: false });
      expect([liveMoveOptionalLagAge(264, side), liveMoveTimingBodyRows(264, side), liveMoveTimingSidePhase(264, "optional-lag-age", side)]).toEqual([131, 154, "event"]);
    }
    expect(LIVE_MOVE_TIMING_POLICY[264]!.parameters.map((p) => [p.side, p.alternatives[0].measured, p.alternatives[1].measured])).toEqual([["opponent", 14, 3], ["player", 9, 5]]);
  });

  it("the live adapter follows the policy: 155 rows and restoreLag on both sides", () => {
    expect([liveMoveAnimationDuration(req(0)), liveMoveAnimationDuration(req(1))]).toEqual([155, 155]);
    for (const name of ["fp100-opponent-machamp-snorlax-b0", "fp100-player-heracross-lapras-b0"]) {
      const v = liveView(readCtl95ControlFixture(`tools/integration/fixtures/fp100/windows/${name}.json`).fixture, 140);
      const config = liveMoveAnimationPresentation((v.effect as { request: never }).request, v.field, 140)?.config as { move: string; restoreLag?: boolean };
      expect([config.move, config.restoreLag]).toEqual(["FOCUS_PUNCH", true]);
    }
  });

  it("the reducer: the two phases differ only on the fade-in 132..147, the mon-BG cleanup row 149 and the first inactive row 153", () => {
    const c = { x: 72, y: 102 };
    expect([focusPunchFirstInactiveAge(true), focusPunchFirstInactiveAge(false)]).toEqual([154, 153]);
    const differing: number[] = [];
    for (let age = 0; age <= 155; age++) {
      if (JSON.stringify(focusPunchAtAge(age, "player", c, true)) !== JSON.stringify(focusPunchAtAge(age, "player", c, false))) differing.push(age);
    }
    expect(differing).toEqual([132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 149, 153]);
    // The default keeps the accepted per-side bodies (the Factory reducer and its evidence tests are unchanged).
    for (const age of [131, 132, 147, 149, 153]) {
      expect(focusPunchAtAge(age, "opponent", c)).toEqual(focusPunchAtAge(age, "opponent", c, true));
      expect(focusPunchAtAge(age, "player", c)).toEqual(focusPunchAtAge(age, "player", c, false));
    }
  });

  it("accounting: Focus Punch moved from scoped exact to faithful timing (238 + 13 + 25 = 276)", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(264);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(264);
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    expect([status.implementedCount, status.faithfulRandomCount, status.faithfulTimingCount]).toEqual([238, 13, 25]);
    expect(status.implementedAdapters.some((e: { id: number }) => e.id === 264)).toBe(false);
    const entry = status.faithfulTimingAdapters.find((e: { id: number }) => e.id === 264);
    expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[264]!.parameters.map(({ evidence: _evidence, ...p }) => p));
    expect(entry.alternatePhaseResidual).toMatchObject({ ages: [...Array.from({ length: 16 }, (_, i) => 132 + i), 154], maxPixelsPerRow: 18267 });
    const census = JSON.parse(readFileSync("tools/integration/fixtures/remaining-adapters-census.json", "utf8"));
    expect(census.summary?.sumsTo ?? census.sumsTo).toBe("238+13+25+0+0=276");
  });

  describe("committed ROM windows (fresh direct mGBA, r1 == r2) re-rendered through the production live renderer", () => {
    const dir = "tools/integration/fixtures/fp100/windows";
    const windows = readdirSync(dir).filter((n) => n.endsWith(".json")).sort();
    it("nine windows: 6 policy phase (opponent 4, player 2) + 3 other phase (opponent PERSIAN / elevated GOLBAT, player MACHAMP)", () => {
      expect(windows).toHaveLength(9);
    });
    for (const name of windows) {
      it(name, () => {
        const f = readCtl95ControlFixture(`${dir}/${name}`);
        const row = phaseRows.find((r) => `${r.stem}-b${f.body}.json` === name && f.rows.length === 155)!;
        expect(f.rows).toHaveLength(155);
        const bad = f.rows.filter(([age, , sha]) => ctl95ControlRowSha(f, age) !== sha).map(([age]) => age);
        if (phaseRowOf(name) === "event") expect(bad).toEqual([]);
        else expect(bad).toEqual([...Array.from({ length: 16 }, (_, i) => 132 + i), ...(f.fixture.attacker.species === "GOLBAT" ? [154] : [])]);
        expect(row).toBeDefined();
      }, 60_000);
    }
    function phaseRowOf(name: string): string {
      const body = Number(/-b(\d+)\.json$/.exec(name)![1]);
      const stem = name.replace(/-b\d+\.json$/, "");
      return phaseRows.filter((r) => r.stem === stem)[body]!.phase;
    }
  });
});
