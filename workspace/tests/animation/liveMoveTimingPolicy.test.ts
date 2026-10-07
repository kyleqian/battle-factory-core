import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION, dominantLiveMoveTimingPhase,
  liveMoveBgWriteRow, liveMoveOptionalLagAge, liveMoveTimingBodyRows, liveMoveTimingParameter,
} from "../../src/engine/liveMoveTimingPolicy.ts";

// D4 (docs/faithful-timing.md): the policy is the dominant phase over ALL banked measurements of each parameter; a tie selects the
// phase without the optional event. The table is recomputed here from the banked lag measurements (prep25 + the D4a tie-break).
type LagRow = { scenario: string; body: number; len: number; lagAges: number[]; iterations: number };
const banked = (key: string): LagRow[] => [
  ...(JSON.parse(readFileSync("tools/integration/fixtures/prep25/lag-frames.json", "utf8")) as Record<string, LagRow[]>)[key]!,
  ...(JSON.parse(readFileSync("tools/integration/fixtures/d4a/lag-frames-tiebreak.json", "utf8")) as Record<string, LagRow[]>)[key]!,
];

describe("live move timing policy (D4)", () => {
  it("is versioned and holds only documented CPU-phase parameters", () => {
    expect(LIVE_MOVE_TIMING_POLICY_VERSION).toBe("live-move-timing.v1.dominant-measured-phase.tie-no-optional-event");
    for (const [id, entry] of Object.entries(LIVE_MOVE_TIMING_POLICY)) {
      expect(entry.move).toMatch(/^MOVE_/);
      for (const p of entry.parameters) {
        expect(["optional-lag-age", "bg-write-row", "palette-transfer-row"]).toContain(p.kind);
        const dominant = dominantLiveMoveTimingPhase(p.alternatives);
        expect([id, p.chosen, p.tieRuleUsed]).toEqual([id, dominant.phase, dominant.tie]);
        expect(p.evidence.length).toBeGreaterThan(0);
      }
    }
    for (const id of LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS) expect(LIVE_MOVE_TIMING_POLICY[id]).toBeDefined();
  });

  it("the tie rule picks the phase without the optional event; otherwise the most measured phase wins", () => {
    expect(dominantLiveMoveTimingPhase([{ phase: "event", bodyRows: 2, measured: 2 }, { phase: "no-event", bodyRows: 1, measured: 2 }])).toEqual({ phase: "no-event", tie: true });
    expect(dominantLiveMoveTimingPhase([{ phase: "event", bodyRows: 2, measured: 3 }, { phase: "no-event", bodyRows: 1, measured: 2 }])).toEqual({ phase: "event", tie: false });
    expect(dominantLiveMoveTimingPhase([{ phase: "event", bodyRows: 2, measured: 1 }, { phase: "no-event", bodyRows: 1, measured: 2 }])).toEqual({ phase: "no-event", tie: false });
  });

  it.each([[183, "mach-punch"], [171, "nightmare"]] as const)("move %i: the optional-lag table equals the banked measurements (%s)", (id, key) => {
    const p = liveMoveTimingParameter(id, "optional-lag-age")!;
    const rows = banked(key);
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      expect(row.iterations).toBe(p.iterations);
      expect(row.lagAges.filter((age) => age !== p.age)).toEqual(p.fixedLagAges);
    }
    const withLag = rows.filter((row) => row.lagAges.includes(p.age));
    expect(withLag.every((row) => row.len === p.alternatives[0].bodyRows)).toBe(true);
    expect(rows.filter((row) => !row.lagAges.includes(p.age)).every((row) => row.len === p.alternatives[1].bodyRows)).toBe(true);
    expect(p.alternatives).toEqual([
      { phase: "event", bodyRows: p.iterations + p.fixedLagAges.length + 1, measured: withLag.length },
      { phase: "no-event", bodyRows: p.iterations + p.fixedLagAges.length, measured: rows.length - withLag.length },
    ]);
    expect(liveMoveOptionalLagAge(id)).toBe(p.chosen === "event" ? p.age : null);
    expect(liveMoveTimingBodyRows(id)).toBe(p.chosen === "event" ? p.alternatives[0].bodyRows : p.alternatives[1].bodyRows);
  });

  it("is render-pure: no gameplay, RNG or capture imports", () => {
    const source = readFileSync("src/engine/liveMoveTimingPolicy.ts", "utf8");
    expect(source).not.toMatch(/^import /m);
    expect(liveMoveOptionalLagAge(1)).toBeNull();
    expect(liveMoveTimingBodyRows(1)).toBeNull();
    expect(liveMoveBgWriteRow(1)).toBeNull();
  });

  it("bg-write-row: 'event' is the later write row (age), 'no-event' the earlier (age - 1); Megahorn picks the measured row 8 (7 of 10)", () => {
    const p = liveMoveTimingParameter(224, "bg-write-row")!;
    expect([p.age, p.chosen, p.tieRuleUsed]).toEqual([8, "event", false]);
    expect(liveMoveBgWriteRow(224)).toBe(8);
    expect(liveMoveBgWriteRow(183)).toBeNull();
    expect(liveMoveOptionalLagAge(224)).toBe(156);
    expect(liveMoveTimingBodyRows(224)).toBe(177);
    expect(liveMoveBgWriteRow(279)).toBe(5);
    expect(liveMoveOptionalLagAge(279)).toBeNull();
    expect([liveMoveOptionalLagAge(309), liveMoveTimingBodyRows(309), liveMoveBgWriteRow(309)]).toEqual([195, 215, null]);
  });
});
