import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import {
  LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION, dominantLiveMoveTimingPhase, liveMoveTimingSidePhase,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { liveSheerColdRestoreFadeEndAge } from "../../src/engine/liveProfileMoves.ts";

// ISSUES #151 D4 accounting (docs/issue151-diagnosis.md, docs/faithful-timing.md "Counts can change by reclassification"): Sheer Cold (329) and
// Hyper Voice (304) move from scoped exact to faithful timing; the policy's dominant phase equals the reducers' former defaults, so the accepted
// sheer-cold-live / q2-live fixtures stay exact (receipt tools/integration/fixtures/d4d2-live-receipt.json, d4aTimingCheck.ts).
const DIR = "tools/integration/fixtures/d4d2-live";
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/d4d2-live-receipt.json", "utf8"));
type Window = { fixture: string; move: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
  runs: { residualPixels: number; digest: string; affectedAges: number[]; maxPixelsPerRow: number }[] };
const wrappers = (prefix: string) => readdirSync(DIR).filter((n) => n.startsWith(prefix)).map((n) =>
  ({ name: n, ...JSON.parse(readFileSync(`${DIR}/${n}`, "utf8")) as { sourceFixture: string; timingPhase: string; attacker: { geometry: { side: string } } } }));

for (const [id, move, prefix, accepted] of [[329, "SHEER_COLD", "sheer-cold-", "tools/integration/fixtures/sheer-cold-live/"],
  [304, "HYPER_VOICE", "hyper-voice-", "tools/integration/fixtures/q2-live/"]] as const) {
  describe(`#151 ${move} (${id}) faithful timing`, () => {
    it("is reclassified once: faithful timing, not scoped exact; the status entry is the policy", () => {
      expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(id);
      expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(id);
      expect((status.implementedAdapters as { id: number }[]).some((e) => e.id === id)).toBe(false);
      const entry = (status.faithfulTimingAdapters as { id: number; timingParameters: unknown[]; policyVersion: string; d3: boolean }[]).find((e) => e.id === id)!;
      expect(entry.timingParameters).toEqual(LIVE_MOVE_TIMING_POLICY[id]!.parameters.map(({ evidence: _evidence, ...p }) => p));
      expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
      expect(entry.d3).toBe(false);
    });

    it("the policy counts are the banked measured phases of the checked windows (per side where measured per side)", () => {
      const ws = wrappers(prefix);
      // The issue151 windows are all first bodies: the d4later body-keyed later-body parameter (opponent 329) is counted by
      // tests/animation/d4laterTiming.test.ts (tools/integration/fixtures/d4later/counters.json).
      for (const p of LIVE_MOVE_TIMING_POLICY[id]!.parameters.filter((q) => q.body === undefined)) {
        const scoped = ws.filter((w) => p.side === undefined || w.attacker.geometry.side === p.side);
        const shiny = id === 329 ? (p.side === "player" ? 1 : 2) : 0; // the declined shiny STEELIX windows count in the banked table (#151 s1)
        expect(scoped.filter((w) => w.timingPhase === "event").length + (id === 329 && p.side === "player" ? shiny : 0)).toBe(p.alternatives[0]!.measured);
        expect(scoped.filter((w) => w.timingPhase === "no-event").length + (id === 329 && p.side === "opponent" ? shiny : 0)).toBe(p.alternatives[1]!.measured);
        expect(dominantLiveMoveTimingPhase(p.alternatives).phase).toBe(p.chosen);
      }
    });

    it("the receipt: policy-phase windows exact twice fresh (every accepted fixture among them), other-phase windows only on the documented rows", () => {
      const documented = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual: { ages: number[]; maxPixelsPerRow: number } }[])
        .find((e) => e.id === id)!.alternatePhaseResidual;
      const rows = (receipt.windows as Window[]).filter((r) => r.move === move);
      expect(rows.map((r) => r.fixture.split("/").pop()).sort()).toEqual(wrappers(prefix).map((w) => w.name).sort());
      const byName = new Map(wrappers(prefix).map((w) => [w.name, w]));
      for (const r of rows) {
        expect(r.violations).toEqual([]);
        expect(r.runs[1]!.digest).toBe(r.runs[0]!.digest);
        if (r.selectedPhase) {
          expect(r.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
          expect(r.window).toBe(r.expectedDuration);
        } else {
          expect(r.runs[0]!.affectedAges.every((age) => documented.ages.includes(age))).toBe(true);
          expect(r.runs[0]!.maxPixelsPerRow).toBeLessThanOrEqual(documented.maxPixelsPerRow);
        }
        if (byName.get(r.fixture.split("/").pop()!)!.sourceFixture.startsWith(accepted)) expect(r.selectedPhase).toBe(true);
      }
      expect(rows.filter((r) => byName.get(r.fixture.split("/").pop()!)!.sourceFixture.startsWith(accepted)).length).toBe(id === 329 ? 6 : 8);
    });
  });
}

describe("#151 the adapters read the policy; the dominant phase equals the former reducer defaults (byte-identical accepted outputs)", () => {
  it("Sheer Cold: restore fade end 189 (player attacker, lag) / 188 (opponent, no lag) = sheerCold.ts restoreEndAge's side default; 191 / 190 rows", () => {
    expect(liveMoveTimingSidePhase(329, "optional-lag-age", "player")).toBe("event");
    expect(liveMoveTimingSidePhase(329, "optional-lag-age", "opponent")).toBe("no-event");
    expect(liveSheerColdRestoreFadeEndAge("player")).toBe(189);
    expect(liveSheerColdRestoreFadeEndAge("opponent")).toBe(188);
    for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration({ moveId: 329, attacker, target: (1 - attacker) as 0 | 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }))
        .toBe(attacker === 0 ? 191 : 190);
    }
  });
  it("Hyper Voice: the late upload (16-line band) on both sides = hyperVoice.ts's staged default", () => {
    for (const side of ["player", "opponent"] as const) expect(liveMoveTimingSidePhase(304, "palette-upload-scanline", side)).toBe("event");
  });
});
