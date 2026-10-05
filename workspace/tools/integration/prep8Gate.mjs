// prep8: production-shape evidence. Which preceding bodies can sit between the known entry and a target body while the production order host still lends a known order (SPRITE_ORDER_PRODUCTION_BODIES),
// and for which of them the affine/task baseline (bitmap 0x6, no tasks) is measured net-zero (allocator plan v2 corpus + target scenarios)?
//   node --experimental-strip-types tools/integration/prep8Gate.mjs > tools/integration/fixtures/prep8-gate.json
import { readFileSync } from "node:fs";
import { SPRITE_ORDER_PRODUCTION_BODIES } from "../../src/engine/spriteOrderProductionPlans.ts";
import { LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS } from "../../src/engine/liveMoveSpriteAllocator.ts";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const FX = "tools/integration/fixtures/affine-task";
const corpus = rd(`${FX}/corpus-summary.json`), summary = rd(`${FX}/summary.json`);
const closedNetZero = new Map(); // moveId -> { bodies, netZeroAll }
const add = (b) => { if (b.mv === 0 || b.fallFrame == null) return; const e = closedNetZero.get(b.mv) ?? { bodies: 0, netZeroAll: true, baselineAll: true }; e.bodies++; e.netZeroAll &&= b.netZeroMatrix && b.netZeroTask && b.netZeroSprite; e.baselineAll &&= b.baseline.bitmap === "00000006" && b.baseline.tasks.length === 0; closedNetZero.set(b.mv, e); };
for (const s of Object.values(corpus)) for (const b of s.bodies ?? []) add(b);
for (const s of Object.values(summary)) for (const b of s.bodies ?? []) add(b);
const planned = [...new Set(Object.keys(SPRITE_ORDER_PRODUCTION_BODIES).map((k) => Number(k.split(":")[0])))].sort((a, b) => a - b);
const measured = [...closedNetZero.keys()].sort((a, b) => a - b);
const TARGET = [129, 271, 85, 218, 32, 69, 62, 254, 253, 192];
const plannedMeasuredNetZero = planned.filter((id) => closedNetZero.get(id)?.netZeroAll);
const plannedUnmeasured = planned.filter((id) => !closedNetZero.has(id));
const plannedMeasuredNotNetZero = planned.filter((id) => closedNetZero.has(id) && !closedNetZero.get(id).netZeroAll);
console.log(JSON.stringify({ schema: "prep8-gate/v1",
  productionPlanBodyMoveIds: planned.length, targetIdsWithProductionBodyPlan: TARGET.filter((id) => planned.includes(id)), targetIdsWithoutProductionBodyPlan: TARGET.filter((id) => !planned.includes(id)),
  targetIdsInLiveSpriteAllocatorNetZeroSet: TARGET.filter((id) => LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS.includes(id)),
  measuredClosedBodyMoveIds: measured.length, measuredAllBaselinesAre0x6NoTasks: [...closedNetZero.values()].every((e) => e.baselineAll), measuredClosedBodiesNotNetZero: [...closedNetZero].filter(([, e]) => !e.netZeroAll).map(([id]) => id),
  plannedAndMeasuredNetZero: plannedMeasuredNetZero.length, plannedButNotMeasured: plannedUnmeasured, plannedButMeasuredNotNetZero: plannedMeasuredNotNetZero,
  precedingBodyIdsUsedByThisPrep: { 33: { planned: planned.includes(33), measured: closedNetZero.get(33) ?? null }, 64: { planned: planned.includes(64), measured: closedNetZero.get(64) ?? null } },
  targetBodies: Object.fromEntries(TARGET.map((id) => [id, closedNetZero.get(id) ?? null])) }, null, 1));
