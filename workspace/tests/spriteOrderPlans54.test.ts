import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderProductionBodyPlan,
  SPRITE_ORDER_GEOMETRY_KEYED_BODIES,
} from "../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, type LiveSpriteOrderHost } from "../src/engine/liveSpriteOrderHost.ts";
import { liveMoveGeometrySpriteOrderPlanText } from "../src/engine/liveMoveAnimation.ts";
import { ERUPTION_PROVEN_SPRITE_ORDER_PLANS } from "../src/animation/eruptionSpriteOrderPlan.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";

// S10A plans54 (docs/next-adapters-plans54.md): Fury Cutter keyed by the MOVE_ANIMATION payload's furyCutterCounter, and Eruption made
// fail-closed by attacker geometry (ISSUES #155). ROM receipts are direct-mGBA probes (plans54Probe.py / plans51Probe.py, every job twice
// in fresh processes, A == B), extracted by plans54Extract.py / plans51Extract.py and checked per frame by plans54Check.ts.
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/${name}`, import.meta.url), "utf8"));
interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
type Units = { jobs: Record<string, { unit: string; identicalAB: boolean; ops: (string | number)[][]; units: Unit[] }> };
const units54 = fixture("plans54/units.json") as Units;
const units51 = fixture("plans51/units.json") as Units;
const check = fixture("plans54/check.json") as { notIdenticalAB: number; results: Record<string, { instances: number; matched: number; unproven: number; sides: string[] }> };
const sides = ["player", "opponent"] as const;
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

function perFrameExact(unit: Unit, plan: NonNullable<ReturnType<typeof spriteOrderProductionBodyPlan>>): boolean {
  const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
  if (unit.windows.length !== plan.length || unit.strayFChanges !== 0) return false;
  let cursor = start;
  for (let k = 0; k < plan.length; k += 1) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = unit.windows[k]!;
    if (!cursor.order.known) return false;
    const created = cursor.occupied.filter(slot => !before.occupied.includes(slot));
    const destroyed = before.occupied.filter(slot => !cursor.occupied.includes(slot));
    if (!same(created, rom.C.map(([slot]) => slot).sort((l, r) => l - r)) || !same(destroyed, [...rom.D].sort((l, r) => l - r))
      || !same(cursor.order.free, rom.F)) return false;
  }
  return cursor.occupied.filter(slot => !start.occupied.includes(slot)).length === 0;
}
function bodies(units: Units, move: number) {
  const out: { job: string; side: "player" | "opponent"; ops: (string | number)[][]; unit: Unit; chainIndex: number }[] = [];
  for (const [job, entry] of Object.entries(units.jobs)) {
    const chain = { player: 0, opponent: 0 };
    for (const unit of entry.units) {
      const body = /^body (\d+):(player|opponent)$/.exec(unit.label);
      if (unit.kind !== "body" || unit.truncated || !body || Number(body[1]) !== move) continue;
      const side = body[2] as "player" | "opponent";
      out.push({ job, side, ops: entry.ops, unit, chainIndex: ++chain[side] });
    }
  }
  return out;
}
const speciesOf = (ops: (string | number)[][], side: "player" | "opponent") => Number(ops.find(op => op[0] === "species" && op[1] === side)![2]);

describe("plans54 receipts", () => {
  it("every job is identical across its two fresh runs and every checked instance is exact per frame", () => {
    for (const entry of Object.values(units54.jobs)) expect(entry.identicalAB).toBe(true);
    expect(check.notIdenticalAB).toBe(0);
    for (const [label, r] of Object.entries(check.results)) {
      expect(r.matched, label).toBe(r.instances);
      expect(r.unproven, label).toBe(0);
    }
  });
});

describe("Fury Cutter 210 keyed by furyCutterCounter (plans54)", () => {
  const KEYS = [210, 10210, 20210, 30210];
  it("every ROM body is per-frame exact under the production plan of its counter key, counters 1..5 on both sides, 2 attackers per side", () => {
    const counters = { player: new Set<number>(), opponent: new Set<number>() };
    const attackers = { player: new Set<number>(), opponent: new Set<number>() };
    let instances = 0;
    for (const { job, side, ops, unit, chainIndex } of bodies(units54, 210)) {
      const counter = Math.min(chainIndex, 5);
      const plan = spriteOrderProductionBodyPlan(KEYS[Math.min(counter, 4) - 1]!, side);
      expect(plan, `${job} #${chainIndex}`).not.toBeNull();
      expect(perFrameExact(unit, plan!), `${job} #${chainIndex}`).toBe(true);
      counters[side].add(counter);
      attackers[side].add(speciesOf(ops, side));
      instances += 1;
    }
    expect(instances).toBe(25);
    for (const side of sides) {
      expect([...counters[side]].sort(), side).toEqual([1, 2, 3, 4, 5]);
      expect(attackers[side].size, side).toBe(2);
    }
    // the two plan shapes (the counter-1 slice alone vs the slice + palette blend controller) differ: the key is load-bearing
    expect(spriteOrderProductionBodyPlan(210, "player")).toEqual(decodeSpriteOrderPlan("Cf;D0"));
    for (const key of KEYS.slice(1)) for (const side of sides) expect(spriteOrderProductionBodyPlan(key, side)).toEqual(decodeSpriteOrderPlan("Cff;D1;D0"));
  });

  const ev = (sequence: number, kind: string, extra: object = {}) =>
    Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
  const after = (events: readonly BattleKernelSemanticEvent[]) => {
    const host: LiveSpriteOrderHost = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 3 });
    return advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: [{ events }] }, Number.POSITIVE_INFINITY).tracker;
  };
  const fury = (battler: 0 | 1, counter?: number) => ev(10, "animation", { animationId: "MOVE_ANIMATION", battler, target: 1 - battler,
    arguments: ["210", "0", "10", "5", "70", "0", ...(counter === undefined ? [] : [String(counter)])] });

  it("the host keys the body by the payload's counter; a body without the counter stays unplanned", () => {
    for (const battler of [0, 1] as const) {
      const attackerSide = battler === 0 ? "player" as const : "opponent" as const;
      for (const counter of [1, 2, 3, 4, 5]) {
        const tracker = after([fury(battler, counter)]);
        const want = applySpriteOrderPresentationEvent(createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory")),
          { kind: "move-animation", moveId: KEYS[Math.min(counter, 4) - 1]!, attackerSide });
        expect(tracker.cursor.order.known, `${battler}/${counter}`).toBe(true);
        expect(tracker.cursor.order.free, `${battler}/${counter}`).toEqual(want.cursor.order.free);
      }
      // counters 2+ allocate two sprites in the body's first window (the per-frame plans differ); both leave the same free order after it
      expect(spriteOrderProductionBodyPlan(10210, attackerSide)).not.toEqual(spriteOrderProductionBodyPlan(210, attackerSide));
      expect(after([fury(battler, 2)]).cursor.order.free).toEqual(after([fury(battler, 1)]).cursor.order.free);
      expect(after([fury(battler)]).cursor.order.known).toBe(false);
      expect(after([fury(battler)]).invalidReason).toContain("furyCutterCounter");
    }
  });
});

describe("Eruption 284 fail-closed by attacker geometry (plans54, ISSUES #155)", () => {
  const instances = [...bodies(units51, 284), ...bodies(units54, 284)];
  it("every ROM instance (plans51 + plans54) is per-frame exact under the production seam text at its species", () => {
    expect(instances).toHaveLength(12);
    for (const { job, side, ops, unit } of instances) {
      const text = liveMoveGeometrySpriteOrderPlanText(284, side, { playerSpecies: speciesOf(ops, "player"), opponentSpecies: speciesOf(ops, "opponent") });
      expect(text, job).not.toBeNull();
      expect(perFrameExact(unit, decodeSpriteOrderPlan(text!)), job).toBe(true);
    }
    // 2 opponent plans and 3 player plans over the proven attackers; CAMERUPT 340 (the only Factory Eruption user) is proven on both sides
    expect(new Set(Object.values(ERUPTION_PROVEN_SPRITE_ORDER_PLANS.opponent)).size).toBe(2);
    expect(new Set(Object.values(ERUPTION_PROVEN_SPRITE_ORDER_PLANS.player)).size).toBe(3);
    for (const side of sides) expect(ERUPTION_PROVEN_SPRITE_ORDER_PLANS[side][340], side).toBeDefined();
  });

  it("an unproven attacker or a missing geometry plan invalidates; the elevated opponent GOLBAT carries its own plan", () => {
    expect(SPRITE_ORDER_GEOMETRY_KEYED_BODIES.has(284)).toBe(true);
    const known = () => createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
    // the base table's 284:opponent row is no longer used: without a geometry plan the body invalidates (before plans54 it applied
    // the 25-window plan, wrong for GOLBAT)
    expect(applySpriteOrderPresentationEvent(known(), { kind: "move-animation", moveId: 284, attackerSide: "opponent" }).cursor.order.known).toBe(false);
    expect(liveMoveGeometrySpriteOrderPlanText(284, "opponent", { playerSpecies: 95, opponentSpecies: 6 })).toBeNull();
    expect(liveMoveGeometrySpriteOrderPlanText(284, "player", { playerSpecies: 6, opponentSpecies: 95 })).toBeNull();
    const golbat = liveMoveGeometrySpriteOrderPlanText(284, "opponent", { playerSpecies: 95, opponentSpecies: 42 })!;
    expect(decodeSpriteOrderPlan(golbat)).toHaveLength(23);
    expect(golbat).not.toBe(liveMoveGeometrySpriteOrderPlanText(284, "opponent", { playerSpecies: 95, opponentSpecies: 340 }));
    // the target never changes the plan (the launch rocks start at the attacker; the falling rocks use absolute coordinates)
    expect(liveMoveGeometrySpriteOrderPlanText(284, "player", { playerSpecies: 340, opponentSpecies: 95 }))
      .toBe(liveMoveGeometrySpriteOrderPlanText(284, "player", { playerSpecies: 340, opponentSpecies: 143 }));
  });
});
