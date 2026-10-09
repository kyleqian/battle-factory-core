// gdgeo: the body-202 geometry model (src/engine/spriteOrderGigaDrainPlan.ts) against the observed ROM plans of a prep43-format
// units.json (prep43Extract.py). usage: node --experimental-strip-types tools/integration/gdgeoModelCheck.ts <units.json> [<out.json>]
// Per job: the scenario's lead species (base scenario + variant), the model plan, the observed body-202 plan, equal or not.
import { readFileSync, writeFileSync } from "node:fs";
import { gigaDrainSpriteOrderPlanForGeometry } from "../../src/engine/spriteOrderGigaDrainPlan.ts";

interface Unit { kind: string; label: string; plan: string; truncated: boolean }
interface Job { base: string; variant: unknown; units: Unit[]; identicalAB: boolean }
const input = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { jobs: Record<string, Job> };
export const MAJORITY = "Cf;D0;Cf;D1;Cfff;Cfff;Cfff;Cfff;Cfff;D2;Cfff;D5,6;D3;Cfff;D8,10;D4;Cfff;D12,13;D7,9;D16;D11;D17,19;D14;D15;D21;D18;D23,24;D20;D22;D25;Cf;Cf;Cf;D26;Cf;D27;D28;D29;Cf;D30";
const rows = [];
let bad = 0;
for (const [name, job] of Object.entries(input.jobs)) {
  const units = job.units.filter(u => u.kind === "body" && u.label.startsWith("body 202:") && !u.truncated);
  if (units.length === 0) continue;
  const scenario = JSON.parse(readFileSync(`tools/battle-lab/${job.base}.json`, "utf8"));
  const parties = scenario.overrides.parties;
  let player = parties.player[0].species as number, opponent = parties.opponent[0].species as number;
  const variant = (Array.isArray(job.variant) ? job.variant : []) as (string | number)[];
  for (let i = variant[0] === "extend" ? 2 : 0; i + 1 < variant.length; i += 2) {
    if (variant[i] === "player") player = variant[i + 1] as number; else if (variant[i] === "opponent") opponent = variant[i + 1] as number;
  }
  for (const unit of units) {
    const side = unit.label.endsWith(":player") ? "player" : "opponent";
    const model = gigaDrainSpriteOrderPlanForGeometry(side, { playerSpecies: player, opponentSpecies: opponent });
    const ok = model === unit.plan;
    if (!ok) bad += 1;
    rows.push({ job: name, side, player, opponent, identicalAB: job.identicalAB, observed: unit.plan, observedClass: unit.plan === MAJORITY ? "majority" : "other", model, match: ok });
    console.log(`${ok ? "OK " : "BAD"} ${name} ${side} player ${player} opponent ${opponent} observed ${unit.plan === MAJORITY ? "majority" : "OTHER"} AB ${job.identicalAB}`);
    if (!ok) console.log(`   observed ${unit.plan}\n   model    ${model}`);
  }
}
console.log(`${rows.length - bad}/${rows.length} body-202 units: model == observed`);
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify({ schema: "gdgeo-model-check/v1", rows }, null, 1) + "\n");
process.exitCode = bad === 0 ? 0 : 1;
