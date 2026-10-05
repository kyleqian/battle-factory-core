// Writes fixtures/sprite-order-body-plans-rely.json: EXACT rows for the (move, side) cells whose REL-Y-STATIC claim was confirmed by
// spriteOrderRelYConfirm.py (fixtures/sprite-order-rely/confirmed-plans.json + verdicts.json), in the row shape of
// fixtures/sprite-order-policy-gaps/relative-y-plans.json ({verdict, rule, plan, encoded, census}) plus per-row provenance.
// tier "confirmed": identical plan + relative-y vectors over >= 2 distinct absolute-y geometries.
// tier "abs-invariant": identical plan + identical absolute y over >= 3 scenarios on different species pairs (y does not depend on picture geometry).
//   run: node --experimental-strip-types tools/integration/spriteOrderRelYPlans.ts [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { encodeSpriteOrderPlan } from "./spriteOrderProductionTable.ts";

const FX = new URL("./fixtures/", import.meta.url);
const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, FX), "utf8"));
const confirmed = read("sprite-order-rely/confirmed-plans.json") as Record<string, { plan: any; relativeY: number[][]; geometries: string[]; absFingerprints: string[]; tier?: string }>;
const verdicts = new Map((read("sprite-order-rely/verdicts.json").cells as any[]).map(c => [c.cell as string, c]));
const bodies: Record<string, unknown> = {};
for (const key of Object.keys(confirmed).sort((a, b) => verdicts.get(b)!.weight - verdicts.get(a)!.weight || a.localeCompare(b))) {
  const c = confirmed[key]!, v = verdicts.get(key)!;
  const encoded = encodeSpriteOrderPlan(c.plan);
  if (JSON.stringify(decodeSpriteOrderPlan(encoded)) !== JSON.stringify(c.plan)) throw new Error(`round trip failed for ${key}`);
  bodies[key] = {
    verdict: "EXACT-PLAN", rule: c.tier === "abs-invariant" ? "relative-y static (absolute y also species-invariant)" : "relative-y static", tier: c.tier ?? "confirmed", plan: c.plan, encoded,
    census: { weight: v.weight, oldScenarios: v.oldScenarios, geometries: c.geometries, distinctAbsoluteYFingerprints: c.absFingerprints.length, relativeY: c.relativeY },
    provenance: { scenarios: c.geometries.map(g => g.startsWith("old:") ? g.slice(4) : `tools/integration/fixtures/sprite-order-rely/scenarios/${v.move}-${v.side}-${g.slice(4)}.json`), probes: v.probes },
  };
}
const out = { schema: "sprite-order-body-plans-rely/v1", note: "EXACT rows from docs/sprite-order-rely-confirmation.md; same row shape as sprite-order-policy-gaps/relative-y-plans.json", bodies };
const tiers = Object.values(bodies).reduce<Record<string, number>>((a, b: any) => ({ ...a, [b.tier]: (a[b.tier] ?? 0) + 1 }), {});
console.log(Object.keys(bodies).length, "rows", JSON.stringify(tiers), "distinct plans", new Set(Object.values(bodies).map((b: any) => b.encoded)).size);
if (process.argv.includes("--write")) writeFileSync(new URL("sprite-order-body-plans-rely.json", FX), `${JSON.stringify(out, null, 1)}\n`);
