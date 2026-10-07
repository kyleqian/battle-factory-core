// prep28: writes the TEMPORARY production-table experiment into src/ (revert with `git checkout -- src`; prep28Run.sh does both and keeps the diff as
// tools/integration/fixtures/prep28/prep28-temp-src.patch).  Adds the prep28 EXACT-PLAN rows (plan-rows.json + plan-rows-sky-attack.json) through the
// production generator's own renderer, and (host) keys the Sky Attack strike as 10143 via MOVE_ANIMATION request.turn.
import { readFileSync, writeFileSync } from "node:fs";
import { renderSpriteOrderProductionTable } from "./spriteOrderProductionTable.ts";

const fx = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const text = renderSpriteOrderProductionTable(fx("sprite-order-body-plans-ext.json"), fx("sprite-order-gap-causes.json"), [
  fx("sprite-order-policy-gaps/relative-y-plans.json").bodies, fx("sprite-order-body-plans-rely.json").bodies,
  fx("prep28/plan-rows.json").bodies, fx("prep28/plan-rows-sky-attack.json").bodies]);
writeFileSync(new URL("../../src/engine/spriteOrderProductionPlans.ts", import.meta.url), text);
const hostPath = new URL("../../src/engine/liveSpriteOrderHost.ts", import.meta.url);
const host = readFileSync(hostPath, "utf8");
const from = 'return { event: { kind: "move-animation", moveId: request.moveId, attackerSide: battler === 0 ? "player" : "opponent" } };';
if (!host.includes(from)) throw new Error("host mapping not found");
writeFileSync(hostPath, host.replace(from, 'return { event: { kind: "move-animation", moveId: request.moveId === 143 && request.turn === 1 ? 10143 : request.moveId, attackerSide: battler === 0 ? "player" : "opponent" } };'));
console.log("temporary prep28 src experiment written");
