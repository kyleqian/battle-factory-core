import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderProductionBodyPlan, type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { encodeSpriteOrderPlan } from "../tools/integration/spriteOrderProductionTable.ts";

// S10A plans51 (docs/next-adapters-plans51.md): the next tail of sprite-order host stops. ROM receipts are direct-mGBA probes
// (plans51Probe.py, every job twice in fresh processes, A == B), extracted by plans51Extract.py and checked per frame by plans51Check.ts.
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/${name}`, import.meta.url), "utf8"));
interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
const units = fixture("plans51/units.json") as { jobs: Record<string, { unit: string; identicalAB: boolean; ops: unknown[][]; units: Unit[] }> };
const check = fixture("plans51/check.json") as { notIdenticalAB: number; results: Record<string, { instances: number; matched: number; sides: string[] }> };
const sides = ["player", "opponent"] as const;
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

/** Every ROM instance of `move` (per side): the production plan applied window by window from the ROM's start order gives the ROM's
 * created / destroyed slots and free order after every allocation window, and the unit leaves no survivor. */
function romInstances(move: number) {
  const out: { job: string; side: "player" | "opponent"; unit: Unit }[] = [];
  for (const [job, entry] of Object.entries(units.jobs)) {
    for (const unit of entry.units) {
      const body = /^body (\d+):(player|opponent)$/.exec(unit.label);
      if (unit.kind === "body" && !unit.truncated && body && Number(body[1]) === move) out.push({ job, side: body[2] as "player" | "opponent", unit });
    }
  }
  return out;
}
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

describe("plans51 sprite-order plans (ROM receipts -> production table)", () => {
  it("receipts: every job A == B, every proposed plan per-frame exact on both sides", () => {
    expect(check.notIdenticalAB).toBe(0);
    for (const job of Object.values(units.jobs)) expect(job.identicalAB).toBe(true);
    for (const [label, result] of Object.entries(check.results)) {
      expect(result.matched, label).toBe(result.instances);
      expect([...result.sides].sort(), label).toEqual(["opponent", "player"]);
    }
  });

  it("Outrage 200: one EXACT plan on both sides over 4 species pairs per side (14 ROM instances), lent through the order host", () => {
    const instances = romInstances(200);
    expect(instances).toHaveLength(14);
    for (const side of sides) {
      const plan = spriteOrderProductionBodyPlan(200, side);
      expect(plan, side).not.toBeNull();
      const mine = instances.filter(instance => instance.side === side);
      // at least two attacker species per side (the ops set the lead species of both sides)
      const attackers = new Set(mine.map(instance => JSON.stringify(units.jobs[instance.job]!.ops.find(op => op[0] === "species" && op[1] === side))));
      expect(attackers.size, side).toBeGreaterThanOrEqual(2);
      for (const { job, unit } of mine) {
        expect(unit.plan, `${job} @${unit.frame}`).toBe(encodeSpriteOrderPlan(plan!));
        expect(perFrameExact(unit, plan!), `${job} @${unit.frame}`).toBe(true);
      }
    }
    expect(encodeSpriteOrderPlan(spriteOrderProductionBodyPlan(200, "player")!)).toBe(encodeSpriteOrderPlan(spriteOrderProductionBodyPlan(200, "opponent")!));
    // 23 flames, all destroyed inside the body: the order stays known (it invalidated with "no EXACT plan: body 200:<side>" before plans51)
    for (const side of sides) {
      const tracker = applySpriteOrderPresentationEvent(createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory")),
        { kind: "move-animation", moveId: 200, attackerSide: side } as SpriteOrderPresentationEvent);
      expect(tracker.cursor.order.known, side).toBe(true);
    }
  });
});
