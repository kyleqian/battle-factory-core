import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderProductionBodyPlan,
} from "../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, type LiveSpriteOrderHost } from "../src/engine/liveSpriteOrderHost.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";

// ret88 (docs/ret88-return-weak.md): the kernel sends friendship 0 for every ordinary-play Return (ret80), which Move_RETURN's
// AnimTask_GetReturnPowerLevel sends to ReturnWeak (battle_anim_scripts.s:8939-8948: dip, dip, hitsplat). Its order plan was predicted
// (fixtures/ret88/predictions.json, committed before the probes) and measured per frame by direct mGBA (ret88Probe.py -> units.json ->
// ret88Check.ts check.json): both sides, 3 species pairs (an idle-rest ONIX target, an elevated GOLBAT target / attacker), 2 lab seeds,
// first and later bodies. The host keys it 40216 (ret80's 30216 / Magnitude 20222 way).
type Result = { instances: number; matched: number; framesChecked: number; carries: number; sides: string[]; jobs: string[] };
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/ret88/${name}`, import.meta.url), "utf8"));
const check = fixture("check.json") as { notIdenticalAB: number; plans: Record<string, string>; results: Record<string, Result> };
const units = fixture("units.json") as { jobs: Record<string, { identicalAB: boolean; units: { kind: string; label: string; F0: number[]; windows: { F: number[] }[] }[] }> };
const prediction = fixture("predictions.json") as { prediction: Record<string, string> };
const start = () => createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
const ev = (sequence: number, kind: string, extra: object = {}) =>
  Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
const after = (events: readonly BattleKernelSemanticEvent[]) => {
  const host: LiveSpriteOrderHost = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 3 });
  return advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: [{ events }] }, Number.POSITIVE_INFINITY).tracker;
};
const ret = (sequence: number, battler: 0 | 1, friendship: number) => ev(sequence, "animation", { animationId: "MOVE_ANIMATION", battler,
  target: 1 - battler, arguments: ["216", "0", "1", "0", String(friendship), "0"] });

describe("ret88: ReturnWeak (friendship < 61) order plan, host key 40216", () => {
  it("ROM receipts: the committed prediction is exact per frame on 24 / 24 bodies, both sides, 12 jobs identical across two fresh runs", () => {
    expect(check.notIdenticalAB).toBe(0);
    expect(Object.values(units.jobs).every(j => j.identicalAB)).toBe(true);
    expect(check.plans["body 216 weak"]).toBe(prediction.prediction["body 216 weak"]);
    expect(check.results["body 216 weak"]).toMatchObject({ instances: 24, matched: 24, framesChecked: 144, carries: 0 });
    expect([...check.results["body 216 weak"]!.sides].sort()).toEqual(["opponent", "player"]);
    expect(check.results["body 216 weak"]!.jobs).toHaveLength(12);
    for (const side of ["player", "opponent"] as const) {
      expect(spriteOrderProductionBodyPlan(40216, side)).toEqual(decodeSpriteOrderPlan(check.plans["body 216 weak"]!));
    }
  });

  it("from the entry state ReturnWeak ends at the ROM's free order after its last window (first body), and a later body keeps it", () => {
    const entry = start().cursor.order.free;
    for (const job of Object.values(units.jobs)) {
      const bodies = job.units.filter(u => u.kind === "body" && /^body 216:\w+ weak$/.test(u.label));
      expect(bodies).toHaveLength(2);
      expect(bodies[0]!.F0).toEqual(entry);
      for (const side of ["player", "opponent"] as const) {
        const first = applySpriteOrderPresentationEvent(start(), { kind: "move-animation", moveId: 40216, attackerSide: side });
        expect(first.cursor.order.free).toEqual(bodies[0]!.windows.at(-1)!.F);
        expect(first.cursor.order.free).toEqual(bodies[1]!.F0);
        const later = applySpriteOrderPresentationEvent(first, { kind: "move-animation", moveId: 40216, attackerSide: side });
        expect(later.cursor.order.free).toEqual(bodies[1]!.windows.at(-1)!.F);
      }
    }
  });

  it("the host lends 40216 at friendship 0 / 59 / 60 (power level 0), both sides; first and later bodies stay known", () => {
    for (const battler of [0, 1] as const) {
      const attackerSide = battler === 0 ? "player" as const : "opponent" as const;
      const want = applySpriteOrderPresentationEvent(start(), { kind: "move-animation", moveId: 40216, attackerSide }).cursor.order;
      for (const friendship of [0, 59, 60]) {
        const tracker = after([ret(10, battler, friendship)]);
        expect(tracker.cursor.order.known, `${battler}/${friendship}`).toBe(true);
        expect(tracker.cursor.order.free, `${battler}/${friendship}`).toEqual(want.free);
        expect(after([ret(10, battler, friendship), ret(11, battler, friendship)]).cursor.order.known).toBe(true);
      }
    }
  });

  // Dense windows through the production live renderer vs direct-mGBA RGB (audit20Check.ts: two fresh probes per scenario, r1 == r2;
  // tools/integration/ret88Windows.sh / ret88Consumers.sh). The committed summaries are the receipts of the code that added them.
  const summary = (name: string) => readFileSync(new URL(`../tools/integration/fixtures/ret88/${name}`, import.meta.url), "utf8").trim().split("\n");
  const rows = (lines: string[]) => lines.filter(l => /^pb-/.test(l)).map(l => ({ name: l.split(/\s+/)[0]!, move: l.split(/\s+/)[1]!, side: l.split(/\s+/)[2]!,
    live: / live=1 order/.test(l), rows: Number(/ rows=(\d+)/.exec(l)![1]), exact: Number(/ exact=(\d+)/.exec(l)![1]), px: Number(/ px=(\d+)/.exec(l)![1]),
    r1r2: / r1==r2=1 ages/.test(l) }));
  it("ReturnWeak body windows: every live window 88 / 88 rows at 0 px, both sides, first and later bodies, r1 == r2", () => {
    const w = rows(summary("weak-windows-summary.txt"));
    expect(w).toHaveLength(38);
    expect(w.every(x => x.move === "RETURN" && x.r1r2)).toBe(true);
    const live = w.filter(x => x.live);
    expect(live).toHaveLength(34);
    expect(live.every(x => x.rows === 88 && x.exact === 88 && x.px === 0)).toBe(true);
    expect(new Set(live.map(x => x.side))).toEqual(new Set(["player", "opponent"]));
    // the ret88Probe pairs: Dragonair / Onix (idle-rest target), Snorlax / Golbat (elevated target), Golbat / Snorlax (elevated attacker)
    for (const pair of ["148-95", "143-42", "42-143"]) for (const side of ["ply", "opp"]) {
      expect(live.some(x => x.name.startsWith(`pb-ret88w-${side}-${pair}-`)), `${side} ${pair}`).toBe(true);
    }
  });
  it("consumers after a ReturnWeak (6 moves, both sides): every lent order == the ROM's; no lend = fallback", () => {
    const lends = summary("consumer-lends-pi.txt").filter(l => /^pb-.*\.json\s+[A-Z_]+\s+live=/.test(l));
    expect(lends).toHaveLength(29);
    const moves = new Set(lends.map(l => l.split(/\s+/)[1]));
    expect(moves).toEqual(new Set(["AIR_CUTTER", "CURSE", "DOUBLE_TEAM", "DRAGON_DANCE", "ICE_BEAM", "THUNDERBOLT"]));
    for (const l of lends) expect(/ live=1 /.test(l) ? / pi-same=1 /.test(l) : / lend=None /.test(l), l).toBe(true);
    expect(lends.filter(l => / live=1 /.test(l))).toHaveLength(26);
  });
});

