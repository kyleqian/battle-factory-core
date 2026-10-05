// forced-switch: does the EXISTING sprite-order unit plans model the Roar/Whirlwind forced switch?  Seeds a plan cursor from the ROM free order (isolated, as in
// spriteOrderUncoveredReplay) just before the target battler is freed (E+3), applies  D o<battler slot>  (instant free) -> switchInStart -> switchInParticles
// from src/engine/spriteOrderEventTransform.ts, and compares the predicted free order to the ROM (prep11Probe.py PREP11_ALWAYS=1 raw output) after each unit.
// node --experimental-strip-types tools/integration/forcedSwitchOrderCheck.ts <rawDir>
import { readFileSync, readdirSync } from "node:fs";
import { decodeSpriteOrderPlan, SPRITE_ORDER_UNIT_PLAN_TEXTS } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";
const dir = process.argv[2];
const same = (a: readonly number[], b: readonly number[]) => JSON.stringify(a) === JSON.stringify(b);
for (const name of readdirSync(dir).filter(n => n.endsWith(".json")).sort()) {
  const d = JSON.parse(readFileSync(`${dir}/${name}`, "utf8"));
  const body = d.bodies.find((b: any) => b.move === 46 || b.move === 18);
  const E = body.end;
  const occAt = (f: number) => { const s = new Set<number>(); for (const e of d.spawns) if (e.f <= f) { if (e.ev === "+") s.add(e.slot); else s.delete(e.slot); } return s; };
  const orderAt = (f: number): number[] => { let o: number[] = d.orderSeries[0][1]; for (const [g, od] of d.orderSeries) if (g <= f) o = od; return o; };
  const freeAt = (f: number) => { const occ = occAt(f); return orderAt(f).filter((s: number) => !occ.has(s)); };
  const freed = d.spawns.find((e: any) => e.ev === "-" && e.f >= E + 3 && e.f <= E + 6);
  const starts = d.spawns.filter((e: any) => e.ev === "+" && e.f >= E + 9 && e.f <= E + 13).map((e: any) => e.f);
  const ballFrame = starts[0];
  const parts = d.spawns.filter((e: any) => e.ev === "+" && e.f > ballFrame + 3);
  const lastFree = Math.max(...d.spawns.filter((e: any) => e.ev === "-" && e.f > ballFrame).map((e: any) => e.f));
  let cursor = createSpriteOrderPlanCursor({ known: true, free: freeAt(E + 3), pendingDestroyed: [] }, [...occAt(E + 3)].sort((a, b) => a - b));
  const out: string[] = [`${name} E=${E} freedBattlerSlot=${freed.slot}@E+${freed.f - E} ball@E+${ballFrame - E} particles=${parts.length} lastFree@E+${lastFree - E}`];
  const step = (label: string, text: string, at: number) => {
    cursor = applySpriteOrderUnitPlan(cursor, decodeSpriteOrderPlan(text));
    const obs = freeAt(at);
    out.push(`  ${label}: known=${cursor.order.known} predictedFree==ROM@E+${at - E}: ${cursor.order.known && same(cursor.order.free, obs)}${cursor.order.known && !same(cursor.order.free, obs) ? ` (first diff idx ${cursor.order.free.findIndex((v, i) => v !== obs[i])}; pred ${cursor.order.free.slice(0, 8)} rom ${obs.slice(0, 8)})` : ""}`);
  };
  step("D o<battler> (instant free, no particles)", `Do${freed.slot}`, freed.f + 1);
  step("switchInStart  Cff;Cf", SPRITE_ORDER_UNIT_PLAN_TEXTS.switchInStart, ballFrame + 2);
  step("switchInParticles", SPRITE_ORDER_UNIT_PLAN_TEXTS.switchInParticles, lastFree + 1);
  console.log(out.join("\n"));
}
