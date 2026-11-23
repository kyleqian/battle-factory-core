import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LIVE_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveAnimation.ts";
import {
  dominantLiveMoveTimingPhase, LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, liveMoveBgWriteRow, liveMoveTimingSidePhase,
} from "../../src/engine/liveMoveTimingPolicy.ts";
import { lightScreenAtAge, mirrorCoatAtAge } from "../../src/animation/lightScreen.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// S10A lsbz (ISSUES #152 "Light Screen (113) opponent attacker, row 59"; docs/live-audit-15-chains.md s1 TIMING-PHASE): the opponent's
// row-59 BLDALPHA write lands at once (dominant, 9 windows) or one frame late under the row-60 write (the SNORLAX / CHANSEY first body and
// the accepted after-Tackle fixture). Windows tools/integration/fixtures/lsbz/windows/light-screen-*; receipt
// tools/integration/fixtures/lsbz-live-receipt.json (d4aTimingCheck.ts, one process per fixture, two passes x two fresh runs).
const root = join(import.meta.dirname, "../..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
const status = read("docs/animation-integration-live-status.json");
const receipt = read("tools/integration/fixtures/lsbz-live-receipt.json");
type Window = { fixture: string; move: string; side: "player" | "opponent"; measuredPhase: string; selectedPhase: boolean; rows: number;
  expectedDuration: number; px: number[]; affectedAges: number[]; maxPixelsPerRow: number; digestsIdentical: boolean; violations: string[] };
const windows = (receipt.windows as Window[]).filter((w) => w.move === "LIGHT_SCREEN");
const center = { x: 176, y: 40 };

describe("lsbz: Light Screen (113) opponent row-59 BLDALPHA write phase", () => {
  it("is an opponent-only faithful-timing entry with the measured phases (hold 2 : direct 9 -> no hold)", () => {
    const params = LIVE_MOVE_TIMING_POLICY[113]!.parameters;
    expect(params.map((p) => [p.side, p.kind, p.age, p.fixedLagAges, p.iterations, p.chosen, p.tieRuleUsed])).toEqual([
      ["opponent", "bg-write-row", 60, [68, 69], 86, "no-event", false]]);
    expect(params[0]!.alternatives).toEqual([{ phase: "event", bodyRows: 88, measured: 2 }, { phase: "no-event", bodyRows: 88, measured: 9 }]);
    expect(dominantLiveMoveTimingPhase(params[0]!.alternatives).phase).toBe("no-event");
    expect(liveMoveTimingSidePhase(113, "bg-write-row", "opponent")).toBe("no-event");
    expect(liveMoveTimingSidePhase(113, "bg-write-row", "player")).toBeNull();
    expect(liveMoveBgWriteRow(113, "opponent")).toBe(59);
  });

  it("the reducer's hold is an input: the policy phase differs from the accepted hold on reducer age 52 (row 59) only", () => {
    const differing: number[] = [];
    for (let age = -2; age <= 80; age++) {
      if (JSON.stringify(lightScreenAtAge(age, center, "opponent", false)) !== JSON.stringify(lightScreenAtAge(age, center, "opponent"))) differing.push(age);
      // Player side and Mirror Coat never hold.
      expect(lightScreenAtAge(age, center, "player", false), `player ${age}`).toEqual(lightScreenAtAge(age, center, "player"));
    }
    expect(differing).toEqual([52]);
    expect([lightScreenAtAge(52, center, "opponent").alpha, lightScreenAtAge(52, center, "opponent", false).alpha]).toEqual([
      { eva: 9, evb: 7 }, { eva: 8, evb: 8 }]);
    expect(mirrorCoatAtAge(52, center, "opponent").alpha).toEqual({ eva: 8, evb: 8 });
  });

  it("proves 17 policy-phase windows 0 px (9 opponent, 8 player) and the 2 hold windows only on row 59, twice fresh", () => {
    expect(windows).toHaveLength(19);
    const entry = status.faithfulTimingAdapters.find((x: { id: number }) => x.id === 113);
    expect([entry.alternatePhaseResidual.ages, entry.alternatePhaseResidual.maxPixelsPerRow]).toEqual([[59], 2658]);
    for (const w of windows) {
      expect([w.digestsIdentical, w.violations, w.px.length, w.rows, w.expectedDuration], w.fixture).toEqual([true, [], 4, 88, 88]);
      const policy = w.side === "opponent" ? "no-event" : undefined;
      expect(w.selectedPhase, w.fixture).toBe(policy === undefined || w.measuredPhase === policy);
      if (w.selectedPhase) expect(w.px, w.fixture).toEqual([0, 0, 0, 0]);
      else expect([w.affectedAges, w.px], w.fixture).toEqual([[59], [2658, 2658, 2658, 2658]]);
    }
    const count = (side: string, selected: boolean) => windows.filter((w) => w.side === side && w.selectedPhase === selected).length;
    expect([count("opponent", true), count("opponent", false), count("player", true), count("player", false)]).toEqual([9, 2, 8, 0]);
    expect(windows.filter((w) => !w.selectedPhase).map((w) => w.fixture.split("/").pop()).sort()).toEqual([
      "light-screen-a15-ctl-light-screen-opp.json", "light-screen-accepted-opponent.json"]);
    expect(receipt.lightScreen.summary).toMatchObject({ fixtures: 19, policyPhase: 17, policyPhaseZeroPx: 17, otherPhase: 2, otherPhaseOnlyDocumented: 2, violations: 0 });
  });

  it("is counted as faithful timing, not scoped exact", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(113);
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(113);
    expect(status.implementedAdapters.some((x: { id: number }) => x.id === 113)).toBe(false);
  });
});

// lsbz ordinary routes (live-share census seeds 0..299, liveShareCensus.ts streak = i * 11 % 49): the opponent's Light Screen (policy phase, no
// hold) and the opponent's impact-198 Blizzard (WALREIN -> JYNX: fallback 361 rows on 8e72343a7, live 362 = impact + 164 now) through the
// generated route, the following prompt reached, Scene ON/OFF gameplay / RNG / facility parity.
describe("lsbz ordinary routes", () => {
  const rulesWithoutSceneMarker = (v: { rules: any }) => {
    const rc = v.rules.rulesContext;
    return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
  };
  it.each([
    ["LIGHT_SCREEN 81/9 PILOSWINE (opponent)", 113, 81, 9, 0 as const, 86], // bwf1: 88 -> 86 (the ROM window),
    ["BLIZZARD 87/26 WALREIN -> JYNX (opponent, impact 198)", 59, 87, 26, 0 as const, 362],
  ])("route %s: body live on every age, following prompt reached, Scene ON/OFF parity", (_name, id, seed, streak, slot, ages) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const bodies = on.animations.filter((a) => a.moveId === id && a.attacker === 1);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(id, ages, "opponent"));
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
