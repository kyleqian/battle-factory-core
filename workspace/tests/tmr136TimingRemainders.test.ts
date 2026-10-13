// tmr136 (S10A, ISSUES #166 (A) + aud129 s2 (B); docs/tmr136-timing-remainders.md): two Scene ON timing remainders.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import {
  advanceLiveBattlerX2Host, createLiveBattlerX2Host, invalidateLiveBattlerX2Host, liveMoveBattlerX2InputForBody,
} from "../src/engine/liveBattlerX2History.ts";
import {
  LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS, LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration, liveSmokescreenAheadFromAge,
} from "../src/engine/liveMoveAnimation.ts";
import {
  dominantLiveMoveTimingPhase, LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_USE_KEYED_IDS,
  liveMoveTimingBodyRows, liveMoveTimingUseOf,
} from "../src/engine/liveMoveTimingPolicy.ts";
import { LIVE_SUBSTITUTE_SWAP_BODY_FRAMING } from "../src/engine/liveSubstituteSwap.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

const DT_TAIL = "tools/integration/fixtures/tmr136/dt-tail";
type TailRow = {
  fixture: string; side: string; species: string; live: boolean; duration: number; same: boolean; rows: number; bodyRows: number; bodyPx: number;
  tailRows: number; tailPx: number; tailPerRow: [number, number][]; romGlyphAge: number; romGlyphAgeR2: number;
  romGlyphBox: { px: number; bbox: [number, number, number, number] }; romChanges: { age: number }[];
};
const tailRows = (): TailRow[] => readdirSync(DT_TAIL).filter((n) => n.endsWith(".json")).sort()
  .flatMap((n) => (JSON.parse(readFileSync(join(DT_TAIL, n), "utf8")) as { rows: TailRow[] }).rows);

describe("tmr136 (A): the live Double Team window holds the General_StatsChange's rel 69..77", () => {
  it("adds 9 rows: 230 -> 239 for both attacker sides; the Substitute swap composite (the framed ROM body) is unchanged", () => {
    expect(LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS).toBe(9);
    for (const attacker of [0, 1] as const) {
      const req = { moveId: 104, attacker, target: attacker, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 } as BattleMoveAnimationRequest;
      expect(liveMoveAnimationDuration(req)).toBe(230 + LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS);
    }
    expect(LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.get(104)).toEqual({ rows: 159, shift: -1 });
  });

  it("12 dense direct-mGBA windows (6 species pairs, both sides, both bodies, r1 == r2): every body row and every added row 0 px", () => {
    const rows = tailRows();
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((r) => r.side))).toEqual(new Set(["player", "opponent"]));
    expect(new Set(rows.map((r) => `${r.side} ${r.species}`)).size).toBe(6);
    for (const r of rows) {
      expect(r, r.fixture).toMatchObject({ live: true, same: true, duration: 239, rows: 240, bodyRows: 231, bodyPx: 0, tailRows: 9, tailPx: 0 });
      expect(r.tailPerRow.map(([age]) => age), r.fixture).toEqual([230, 231, 232, 233, 234, 235, 236, 237, 238]);
    }
  });

  it("the ROM's next message box changes first on window age 239 (rel 78) = the first frame after the 239-row window", () => {
    for (const r of tailRows()) {
      expect([r.romGlyphAge, r.romGlyphAgeR2], r.fixture).toEqual([239, 239]);
      expect(r.romChanges[0]!.age, r.fixture).toBe(239);
      // The change lies inside the message box (text rows 124..149, x from the box's left margin 16).
      const [x0, , y0, y1] = r.romGlyphBox.bbox;
      expect(x0 >= 8 && y0 >= 112 && y1 < 160, r.fixture).toBe(true);
      expect(r.romGlyphAge).toBe(r.duration);
    }
  });
});

const smoke = (attacker: 0 | 1 = 1): BattleMoveAnimationRequest =>
  ({ moveId: 108, attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 });
const moveEvent = (sequence: number, battler: 0 | 1, moveId: number) => Object.freeze({ sequence, provenance: undefined,
  payload: { kind: "animation", animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: [String(moveId), "0", "0", "0", "0", "0"] },
}) as unknown as BattleKernelSemanticEvent;
const resolutionOf = (requestId: number, events: BattleKernelSemanticEvent[]) =>
  ({ resolutionId: { requestId }, segmentIndex: 0, segments: [{ events }] });

describe("tmr136 (B): Smokescreen 108's use-keyed D4 policy (the battle's first Smokescreen = the 124-row no-lag phase)", () => {
  it("is a use-keyed optional-lag-age 49 entry: first use 15 : 1 -> no lag (124 rows), later uses 1 : 7 -> lag (125 rows)", () => {
    const params = LIVE_MOVE_TIMING_POLICY[108]!.parameters;
    expect(params.map((p) => [p.kind, p.age, p.use, p.chosen])).toEqual([
      ["optional-lag-age", 49, "first", "no-event"], ["optional-lag-age", 49, "later", "event"]]);
    for (const p of params) expect(dominantLiveMoveTimingPhase(p.alternatives)).toEqual({ phase: p.chosen, tie: false });
    expect([...LIVE_MOVE_TIMING_USE_KEYED_IDS]).toEqual([108]);
    expect([liveMoveTimingUseOf(undefined), liveMoveTimingUseOf(1), liveMoveTimingUseOf(2), liveMoveTimingUseOf(7)])
      .toEqual([undefined, "first", "later", "later"]);
    expect(liveMoveTimingBodyRows(108, undefined, "first", "first")).toBe(124);
    expect(liveMoveTimingBodyRows(108, undefined, "first", "later")).toBe(125);
    expect(liveMoveTimingBodyRows(108)).toBeNull(); // an unknown use matches no use-keyed parameter
  });

  it("duration 124 for use 1, 125 for later uses and for an unknown use (the status quo), both sides; rows >= 49 show age + 1 in the no-lag phase", () => {
    for (const a of [0, 1] as const) {
      expect([undefined, 1, 2, 3].map((use) => liveMoveAnimationDuration(smoke(a), undefined, "first", use))).toEqual([125, 124, 125, 125]);
    }
    expect([undefined, 1, 2].map(liveSmokescreenAheadFromAge)).toEqual([null, 49, null]);
  });

  it("is reclassified from scoped exact to faithful timing (disjoint buckets)", () => {
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(108);
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(108);
  });

  it("the use ordinal comes from the x2 history host's per-battle fold of the battle's own MOVE_ANIMATION events (render-pure, no RNG)", () => {
    let host = createLiveBattlerX2Host();
    expect(liveMoveBattlerX2InputForBody(host, { moveId: 108 })).toEqual({ zeroed: [], moveUse: 1 });
    // turn 1: Tackle 33, then Smokescreen (the host is advanced strictly before the body's own event, as the orchestrator does)
    const t1 = [moveEvent(0, 0, 33), moveEvent(1, 1, 108)];
    host = advanceLiveBattlerX2Host(host, resolutionOf(1, t1), 1, true);
    expect(liveMoveBattlerX2InputForBody(host, { moveId: 108 })?.moveUse).toBe(1);
    host = advanceLiveBattlerX2Host(host, resolutionOf(1, t1), Number.POSITIVE_INFINITY);
    // turn 2: the OTHER battler's Smokescreen is the battle's second
    const t2 = [moveEvent(2, 0, 108)];
    host = advanceLiveBattlerX2Host(host, resolutionOf(2, t2), 2, true);
    expect(liveMoveBattlerX2InputForBody(host, { moveId: 108 })?.moveUse).toBe(2);
    // moves without a use-keyed parameter carry no use (their input is unchanged)
    expect(liveMoveBattlerX2InputForBody(host, { moveId: 33 })).not.toHaveProperty("moveUse");
    // replay: the same events give the same ordinal
    const again = advanceLiveBattlerX2Host(advanceLiveBattlerX2Host(createLiveBattlerX2Host(), resolutionOf(1, t1), Number.POSITIVE_INFINITY),
      resolutionOf(2, t2), 2, true);
    expect(liveMoveBattlerX2InputForBody(again, { moveId: 108 })).toEqual(liveMoveBattlerX2InputForBody(host, { moveId: 108 }));
    // unseen events: the use is unknown for the rest of the battle (the status quo 125 rows)
    const unseen = invalidateLiveBattlerX2Host(host, "battle advanced without a presented resolution", true);
    expect(liveMoveBattlerX2InputForBody(unseen, { moveId: 108 })?.moveUse).toBeUndefined();
    // a new resolution while the previous one was not drained: unknown too
    const partial = advanceLiveBattlerX2Host(createLiveBattlerX2Host(), resolutionOf(1, t1), 0);
    const next = advanceLiveBattlerX2Host(partial, resolutionOf(2, t2), 2, true);
    expect(liveMoveBattlerX2InputForBody(next, { moveId: 108 })?.moveUse).toBeUndefined();
  });

  it("24 dense direct-mGBA windows (aud129's Smokescreen scenarios, two fresh probes each): the 22 policy-phase windows 0 px; revert fails", () => {
    type W = { fixture: string; use: string | null; duration: number; romBodyRows: number; px: number; same: boolean; verdict: string; residualFirst: number | null };
    const final = JSON.parse(readFileSync("tools/integration/fixtures/tmr136/smoke-final.json", "utf8")) as { rows: W[]; tally: Record<string, number> };
    const revert = JSON.parse(readFileSync("tools/integration/fixtures/tmr136/smoke-revert.json", "utf8")) as { rows: W[]; tally: Record<string, number> };
    expect(final.rows).toHaveLength(24);
    expect(final.rows.every((w) => w.same)).toBe(true);
    expect(final.tally).toEqual({ "OK use1 rom124 dur124": 15, "OK use2+ rom125 dur125": 7, "PHASE use1 rom125 dur124": 1, "PHASE use2+ rom124 dur125": 1 });
    for (const w of final.rows) {
      if (w.duration === w.romBodyRows) expect(w.px, w.fixture).toBe(0);
      else expect([w.verdict, w.residualFirst], w.fixture).toEqual(["PHASE", 49]);
    }
    // Revert experiment (no use ordinal: production's previous fixed 125 rows): the 16 first-use / 124-row windows are the other phase.
    expect(revert.tally).toEqual({ "OK None rom125 dur125": 8, "PHASE None rom124 dur125": 16 });
  });

  it("ordinary route seed 4 (player KOFFING Smokescreen x3): the first body is 1 row shorter, later bodies unchanged; ON/OFF rules / RNG / facility equal", () => {
    const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
    const on = generatedCommandAnimationReplay(4, "on", Array(8).fill(1), 0, true, true);
    const off = generatedCommandAnimationReplay(4, "off", Array(8).fill(1), 0, true, true);
    const bodies = on.animations.filter((a) => a.moveId === 108);
    // base 439575012: 130 / 130 / 130 rows (3 universal pre + 125 + 2 post); tmr136: 3 + 124 + 2 for the battle's first Smokescreen.
    expect(bodies.map((b) => b.ages.length)).toEqual([129, 130, 130]);
    expect(bodies.every((b) => b.adapterActive.every(Boolean))).toBe(true);
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
  }, 240000);
});
