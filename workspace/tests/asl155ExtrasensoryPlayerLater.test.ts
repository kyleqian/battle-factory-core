/**
 * asl155 B (docs/asl155-astonish-extrasensory-live.md): a player attacker's LATER Extrasensory 326 body under D4 faithful timing. The per-row
 * split S is a CPU phase (ord149 B1); per (stage, row) over the 5 measured SHUCKLE-class later bodies the dominant display class is S = 0 on all
 * 69 rows (1 tie by the tie rule), the first-body fitted row included (0 of 5). The lag at task row 142: 9 of 11 later windows. Live only for a
 * non-elevated target whose first visible monbg line is >= 27 with a known scanline history. Hermetic (committed receipts).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { EXTRASENSORY_PLAYER_LATER_MIN_TOP_LINE, liveFieldArtTopLine, liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import {
  dominantLiveMoveTimingPhase, LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, liveMoveOptionalLagAge, liveMoveScanoutSplitRow,
} from "../src/engine/liveMoveTimingPolicy.ts";
import speciesAsset from "../src/data/gen/species-stats.json" with { type: "json" };

const F = "tools/integration/fixtures/asl155";
const json = (name: string) => JSON.parse(readFileSync(`${F}/${name}`, "utf8"));
const ids = new Map((speciesAsset as { species: { id: number; name: string }[] }).species.map((s) => [s.name.replace("SPECIES_", ""), s.id]));
const topLine = (name: string) => liveFieldArtTopLine(
  createBattleCommandFieldArtView({ player: { species: 1 }, opponent: { species: ids.get(name)! } } as never).opponent);

describe("asl155 B: Extrasensory 326 player later bodies (D4 faithful timing)", () => {
  it("policy: player later lag at row 142 (event 9 : 2) and the scanline split S = 0 at the fitted row (no-event 5 : 0); other classes unchanged", () => {
    const later = LIVE_MOVE_TIMING_POLICY[326]!.parameters.filter((p) => p.side === "player" && p.body === "later");
    expect(later.map((p) => [p.kind, p.age, p.chosen, p.tieRuleUsed, p.alternatives.map((a) => [a.phase, a.bodyRows, a.measured])])).toEqual([
      ["optional-lag-age", 142, "event", false, [["event", 162, 9], ["no-event", 161, 2]]],
      ["scanline-split-line", 98, "no-event", false, [["event", 162, 0], ["no-event", 162, 5]]],
    ]);
    for (const p of later) expect(dominantLiveMoveTimingPhase(p.alternatives).phase).toBe(p.chosen);
    expect(liveMoveOptionalLagAge(326, "player", "later")).toBe(142);
    expect(liveMoveOptionalLagAge(326, "player")).toBeNull();
    expect(liveMoveScanoutSplitRow(326, "player", "later")).toBe(false);
    expect(liveMoveScanoutSplitRow(326, "player", "first")).toBe(true);
    expect(liveMoveScanoutSplitRow(326, "opponent", "later")).toBe(true);
    const req = (attacker: 0 | 1) => ({ moveId: 326, attacker, target: (1 - attacker) as 0 | 1, power: 80, damage: 10, friendship: 70, multihit: 0, turn: 0 });
    expect([liveMoveAnimationDuration(req(0)), liveMoveAnimationDuration(req(0), undefined, "later")]).toEqual([161, 162]);
    // already a faithful-timing adapter (first bodies, D4c): the count does not change
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS.filter((id) => id === 326)).toHaveLength(1);
  });

  it("the measured per-row distribution (ord149 xs): S = 0 dominant on 69 / 69 rows at line 27; residual rows 8 vs patch B 13", () => {
    const policy = json("asl155-xs-policy.json");
    expect([policy.laterBodies, policy.rowKeys, policy.dominantNoEvent, policy.ties, policy.visibleLine]).toEqual([5, 69, 69, 1, 27]);
    expect(policy.fittedRow).toEqual({ stage: 2, data1: 4, laterClasses: { 0: 5 }, firstBody: 28 });
    expect(policy.rows.filter((r: { tie: boolean }) => r.tie).map((r: { stage: number; data1: number; classes: object }) => [r.stage, r.data1, r.classes]))
      .toEqual([[2, 1, { 0: 2, 27: 2, 28: 1 }]]);
    expect(policy.totals).toEqual({ policyRows: 8, patchBRows: 13 });
    expect(Object.fromEntries(policy.windows.map((w: { fixture: string; policyAges: number[] }) => [w.fixture, w.policyAges]))).toEqual({
      "xs-pla-nuzleaf-shuckle-xs-1.json": [95, 101], "xs-pla-nuzleaf-shuckle-xs-2.json": [], "xs-pla-nuzleaf-shuckle-qa-0.json": [95],
      "xs-pla-nuzleaf-shuckle-qa-1.json": [99, 102, 108, 117], "xs-pla-nuzleaf-shuckle-qa-2.json": [95] });
  });

  it("target class: the first visible monbg line from the production pic equals the measured lines (SHUCKLE 27, GOLEM 18)", () => {
    expect(EXTRASENSORY_PLAYER_LATER_MIN_TOP_LINE).toBe(27);
    expect(["SHUCKLE", "GOLEM", "CROBAT", "STANTLER", "ESPEON", "NUZLEAF"].map(topLine)).toEqual([27, 18, 9, 9, 24, 24]);
  });

  it("dense windows through the production path (direct mGBA, receipt): SHUCKLE later live at the documented rows, other classes decline", () => {
    const rows = json("asl155-windows-b.json").rows as { fixture: string; live: boolean; firstBody: boolean; runs: { rows: number; residualPixels: number }[];
      affectedAges: string }[];
    const at = (name: string) => rows.find((r) => r.fixture === name)!;
    const px = (name: string) => [at(name).live, at(name).runs[0]!.residualPixels, at(name).runs[1]!.residualPixels, at(name).affectedAges];
    for (const n of ["xs-pla-nuzleaf-shuckle-xs-2.json", "xs-pla-nuzleaf-shuckle-splash-2.json", "xs-pla-nuzleaf-shuckle-psywave-2.json",
      "extrasensory-pla-nuzleaf-shuckle-growl-2.json", "extrasensory-pla-nuzleaf-shuckle-splash-2.json"]) expect(px(n)).toEqual([true, 0, 0, ""]);
    for (const n of ["xs-pla-nuzleaf-shuckle-xs-1.json", "xs-pla-nuzleaf-shuckle-splash-1.json", "xs-pla-nuzleaf-shuckle-psywave-1.json"]) {
      expect(px(n)).toEqual([true, 39, 39, "95..101 (2)"]);
    }
    expect(px("xs-pla-nuzleaf-shuckle-qa-2.json")).toEqual([true, 2, 2, "95..95 (1)"]);
    // the two measured no-lag windows: 1 / 4 split rows + the 16 documented lag rows 143..158
    expect(px("xs-pla-nuzleaf-shuckle-qa-0.json")).toEqual([true, 298050, 298050, "95..158 (17)"]);
    expect(px("xs-pla-nuzleaf-shuckle-qa-1.json")).toEqual([true, 298086, 298086, "99..158 (20)"]);
    for (const n of ["xs-pla-espeon-crobat-qa-0.json", "xs-pla-espeon-crobat-xs-1.json", "xs-pla-nuzleaf-shuckle-dd-1.json", "xs-pla-nuzleaf-shuckle-dd-2.json",
      "extrasensory-pla-alakazam-golem-growl-1.json", "extrasensory-pla-alakazam-golem-qa-0.json", "extrasensory-pla-alakazam-golem-qa-1.json",
      "extrasensory-pla-alakazam-golem-splash-1.json"]) expect(at(n).live, n).toBe(false);
    // first bodies unchanged (the accepted SHUCKLE first bodies 0 px; GOLEM's documented first-body alternate 1,433 px)
    for (const r of rows.filter((x) => x.firstBody && x.live)) expect(r.runs[0]!.residualPixels === 0 || r.runs[0]!.residualPixels === 1433, r.fixture).toBe(true);
  });
});
