// ordl126 (docs/ordl126-order-plans-live.md): the landed ord124 plans for Odor Sleuth 316 + False Swipe 206, checked per allocation window
// against direct-mGBA ROM receipts (plans69 units + ord124 units), plus the revert experiment (static D0,1 without the tied-word group).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeSpriteOrderPlan, spriteOrderProductionBodyPlan } from "../src/engine/spriteOrderEventTransform";
import { SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS } from "../src/engine/spriteOrderProductionPlans";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, type SpriteOrderPlan } from "../src/engine/spriteOrderProvider";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { identicalAB: boolean; units: Unit[] }

const read = (path: string) => JSON.parse(readFileSync(path, "utf8")) as { jobs: Record<string, Job> };
const files = ["tools/integration/fixtures/plans69/units.json", "tools/integration/fixtures/ord124/ord124-units.json"];
const instances: { key: string; unit: Unit; where: string }[] = [];
for (const file of files) {
  for (const [name, job] of Object.entries(read(file).jobs)) {
    for (const unit of job.units) {
      const m = /^body (316|206):(player|opponent)$/.exec(unit.label);
      if (unit.kind === "body" && !unit.truncated && m) instances.push({ key: `${m[1]}:${m[2]}`, unit, where: `${name}@${unit.frame}` });
    }
  }
}

const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

function problems(unit: Unit, plan: SpriteOrderPlan): string[] {
  const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
  const out: string[] = [];
  if (unit.windows.length !== plan.length) out.push("window count");
  if (unit.strayFChanges !== 0) out.push("stray F changes");
  let cursor = start;
  for (let k = 0; k < Math.min(plan.length, unit.windows.length); k++) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = unit.windows[k]!;
    if (!cursor.order.known) { out.push(`window ${k}: unresolved`); break; }
    const created = cursor.occupied.filter(slot => !before.occupied.includes(slot));
    const destroyed = before.occupied.filter(slot => !cursor.occupied.includes(slot));
    if (!same(created, rom.C.map(([slot]) => slot).sort((l, r) => l - r)) || !same(destroyed, [...rom.D].sort((l, r) => l - r))
      || !same(cursor.order.free, rom.F)) out.push(`window ${k}`);
  }
  return out;
}

const planOf = (key: string) => decodeSpriteOrderPlan(SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_BODIES[key]!]!);
const TEXT: Record<string, string> = {
  "316:player": "Cff;Cf;Cf;D2;D3;D0,1/P552,552;Cf;D4",
  "316:opponent": "Cff;Cf;Cf;D2;D3;D0,1/P542,542;Cf;D4",
  "206:player": "Cf;Cf;Cf;Cf;Cf;Cf;D1;Cf;D2;D3;D4;D5;D6;D0;Cf;D7",
  "206:opponent": "Cf;Cf;Cf;Cf;Cf;Cf;D1;Cf;D2;D3;D4;D5;D6;D0;Cf;D7",
};

describe("ordl126 landed order plans: Odor Sleuth 316 + False Swipe 206", () => {
  it("decodes both bodies, both sides, to the ord124 row texts", () => {
    for (const [key, text] of Object.entries(TEXT)) {
      const [id, side] = key.split(":") as [string, "player" | "opponent"];
      expect(SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_BODIES[key]!]).toBe(text);
      expect(spriteOrderProductionBodyPlan(Number(id), side)).toEqual(decodeSpriteOrderPlan(text));
    }
  });

  it("the tied-word group follows the lend: [3, 4, ...] frees D0,1 order, [4, 3, ...] frees D1,0 order", () => {
    for (const key of ["316:player", "316:opponent"]) {
      for (const lend of [[3, 4, 5, 6, 7, 8, 9, 10], [4, 3, 5, 6, 7, 8, 9, 10]]) {
        const start = createSpriteOrderPlanCursor({ known: true, free: lend, pendingDestroyed: [] });
        const plan = planOf(key);
        const afterCreate = applySpriteOrderUnitPlan(start, plan.slice(0, 1));
        expect(afterCreate.occupied.filter(s => !start.occupied.includes(s)).sort((a, b) => a - b)).toEqual([3, 4]);
        const done = applySpriteOrderUnitPlan(start, plan.slice(0, 6));
        expect(done.order.known).toBe(true);
        expect(done.order.free.slice(0, 2)).toEqual(lend.slice(0, 2));
      }
    }
  });

  it("every 316 / 206 ROM unit (plans69 + ord124 receipts) is exact per window", () => {
    const counts: Record<string, number> = {};
    for (const { key, unit, where } of instances) {
      counts[key] = (counts[key] ?? 0) + 1;
      expect({ where, problems: problems(unit, planOf(key)) }).toEqual({ where, problems: [] });
    }
    expect(counts["316:player"]).toBe(29);
    expect(counts["316:opponent"]).toBe(22);
    expect((counts["206:player"] ?? 0) + (counts["206:opponent"] ?? 0)).toBe(18);
  });

  it("revert experiment: a static D0,1 (no tied-word group) fails exactly the [4, 3] lend class (21 instances)", () => {
    let failing = 0;
    let passing = 0;
    for (const { key, unit } of instances.filter(i => i.key.startsWith("316"))) {
      const bad = problems(unit, decodeSpriteOrderPlan(TEXT[key]!.replace(/\/P\d+,\d+/, "")));
      const fourThree = unit.F0[0] === 4 && unit.F0[1] === 3;
      if (bad.length > 0) { failing += 1; expect(fourThree).toBe(true); } else { passing += 1; expect(fourThree).toBe(false); }
    }
    expect(failing).toBe(21);
    expect(passing).toBe(30);
  });
});
