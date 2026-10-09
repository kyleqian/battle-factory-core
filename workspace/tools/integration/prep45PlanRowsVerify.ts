// prep45: checks that fixtures/prep45/plan-rows.json, appended after the prep43 rows by tools/integration/spriteOrderProductionTable.ts's
// renderer, yields exactly the (key -> plan text) mapping of the temporary patch (fixtures/prep45/prep45-temp-src.diff). Indices differ
// (the renderer orders appended bodies before anims); texts must not.
// usage: node --experimental-strip-types tools/integration/prep45PlanRowsVerify.ts render <out.ts>   (writes the regenerated module)
//        node --experimental-strip-types tools/integration/prep45PlanRowsVerify.ts dump <module.ts> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { renderSpriteOrderProductionTable } from "./spriteOrderProductionTable.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
if (process.argv[2] === "render") {
  writeFileSync(process.argv[3]!, renderSpriteOrderProductionTable(fixture("sprite-order-body-plans-ext.json"), fixture("sprite-order-gap-causes.json"), [
    fixture("sprite-order-policy-gaps/relative-y-plans.json").bodies, fixture("sprite-order-body-plans-rely.json").bodies,
    fixture("prep28/plan-rows.json").bodies, fixture("prep28/plan-rows-sky-attack.json").bodies,
  ], [fixture("prep43/plan-rows.json"), fixture("prep45/plan-rows.json")]));
} else {
  const m = await import(pathToFileURL(process.argv[3]!).href) as { SPRITE_ORDER_PRODUCTION_PLANS: string[]; SPRITE_ORDER_PRODUCTION_BODIES: Record<string, number>; SPRITE_ORDER_PRODUCTION_ANIMS: Record<string, number> };
  const map = (r: Record<string, number>) => Object.fromEntries(Object.keys(r).sort().map(k => [k, m.SPRITE_ORDER_PRODUCTION_PLANS[r[k]!]]));
  writeFileSync(process.argv[4]!, JSON.stringify({ bodies: map(m.SPRITE_ORDER_PRODUCTION_BODIES), anims: map(m.SPRITE_ORDER_PRODUCTION_ANIMS) }, null, 1) + "\n");
}
