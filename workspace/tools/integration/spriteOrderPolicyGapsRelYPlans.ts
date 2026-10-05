// Writes fixtures/sprite-order-policy-gaps/relative-y-plans.json: the proposed production rows for NEEDS-KEYS bodies whose KEYS groups are relative-y static
// (docs/sprite-order-policy-gaps.md Q1/Q3): 313 Fake Tears and 283 Endeavor, both sides, in the same {verdict, plan} row shape the production table generator
// (tools/integration/spriteOrderProductionTable.ts) reads, plus the encoded plan text. Round-trip checked through decodeSpriteOrderPlan.
//   run: node --experimental-strip-types tools/integration/spriteOrderPolicyGapsRelYPlans.ts [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { encodeSpriteOrderPlan } from "./spriteOrderProductionTable.ts";

const FX = new URL("./fixtures/", import.meta.url);
const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, FX), "utf8"));
const ext = read("sprite-order-body-plans-ext.json").bodies;
const endeavor = read("sprite-order-policy-gaps/sprite-order-body-plans-endeavor.json").bodies;
const rely = read("sprite-order-policy-gaps/relative-y-candidates.json").bodies;
const bodies: Record<string, unknown> = {};
for (const [key, row] of [["283:opponent", endeavor], ["283:player", endeavor], ["313:opponent", ext], ["313:player", ext]] as const) {
  const plan = (row as any)[key].plan;
  const encoded = encodeSpriteOrderPlan(plan);
  if (JSON.stringify(decodeSpriteOrderPlan(encoded)) !== JSON.stringify(plan)) throw new Error(`round trip failed for ${key}`);
  bodies[key] = { verdict: "EXACT-PLAN", rule: "relative-y static", plan, encoded, census: rely[key] ? { scenarios: rely[key].scenarios, distinctAbsoluteYFingerprints: rely[key].distinctAbsoluteYFingerprints } : null };
}
const out = { schema: "sprite-order-policy-gaps-rely-plans/v1", note: "proposed additions to the production body table; see docs/sprite-order-policy-gaps.md", bodies };
console.log(Object.entries(bodies).map(([k, v]) => `${k} ${(v as any).encoded}`).join("\n"));
if (process.argv.includes("--write")) writeFileSync(new URL("sprite-order-policy-gaps/relative-y-plans.json", FX), `${JSON.stringify(out, null, 1)}\n`);
