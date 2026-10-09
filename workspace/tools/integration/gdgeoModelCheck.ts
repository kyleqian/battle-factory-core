// gdgeo: the body-202 / body-72 geometry model (liveMoveAnimation.ts liveMoveGeometrySpriteOrderPlanText) against the observed ROM plans of a prep43-format
// units.json (prep43Extract.py). usage: node --experimental-strip-types tools/integration/gdgeoModelCheck.ts <units.json> [<out.json>]
// Per job: the scenario's lead species (base scenario + variant), the model plan, the observed body-202 plan, equal or not; with a
// gdgeoMechanism.py receipt as 3rd argument also the ROM oam.y of every multi-destroy group's orbs at their last live frame vs the
// model's orb y (gigaDrainAtAge) at the orb's last live age.
import { readFileSync, writeFileSync } from "node:fs";
import { GIGA_DRAIN_ORB_FIRST_AGE, GIGA_DRAIN_ORB_GROUPS, GIGA_DRAIN_ORB_GROUP_SPAWN_PERIOD, gigaDrainAtAge } from "../../src/animation/gigaDrain.ts";
import { MEGA_DRAIN_ORB_FIRST_AGE, MEGA_DRAIN_ORB_PAIRS, MEGA_DRAIN_ORB_PAIR_SPAWN_PERIOD, megaDrainAtAge } from "../../src/animation/megaDrain.ts";
import { liveMoveAbsorptionOrbCenters, liveMoveGeometrySpriteOrderPlanText } from "../../src/engine/liveMoveAnimation.ts";
type Species = { playerSpecies: number; opponentSpecies: number };
const gdPlan = (side: "player" | "opponent", species: Species) => liveMoveGeometrySpriteOrderPlanText(202, side, species);
const mdPlan = (side: "player" | "opponent", species: Species) => liveMoveGeometrySpriteOrderPlanText(72, side, species);

interface Unit { kind: string; label: string; plan: string; truncated: boolean }
interface Job { base: string; variant: unknown; units: Unit[]; identicalAB: boolean; predicted?: string }
const input = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { jobs: Record<string, Job> };
interface Group { frame: number; orderBefore: number[]; keys: Record<string, number[]> }
const mechanism = process.argv[4] ? (JSON.parse(readFileSync(process.argv[4], "utf8")) as { jobs: Record<string, Group[]> }).jobs : null;
let yChecked = 0, yBad = 0;
/** Model oam.y of plan sprite n (0 controller, 1 hitsplat, 2.. orbs) at its last live age. */
function modelOrbY(move: number, side: "player" | "opponent", player: number, opponent: number, n: number): number | null {
  const centers = liveMoveAbsorptionOrbCenters(side, { playerSpecies: player, opponentSpecies: opponent })!;
  const groups: readonly (readonly { wavePeriod: number }[])[] = move === 72 ? MEGA_DRAIN_ORB_PAIRS : GIGA_DRAIN_ORB_GROUPS;
  const size = groups[0]!.length, orb = n - 2, args = groups[Math.floor(orb / size)]?.[orb % size];
  if (args === undefined) return null;
  const age = (move === 72 ? MEGA_DRAIN_ORB_FIRST_AGE : GIGA_DRAIN_ORB_FIRST_AGE)
    + Math.floor(orb / size) * (move === 72 ? MEGA_DRAIN_ORB_PAIR_SPAWN_PERIOD : GIGA_DRAIN_ORB_GROUP_SPAWN_PERIOD) + args.wavePeriod - 1;
  const sprite = (move === 72 ? megaDrainAtAge : gigaDrainAtAge)(age, centers.target, centers.attacker, side, centers.attacker).sprites
    .find(s => s.kind === "orb" && s.spawnIndex === orb);
  if (!sprite) return null;
  const raw = (sprite.y + sprite.y2 - 8) & 0xff;
  return raw >= 160 ? raw - 256 : raw;
}
export const MAJORITY = "Cf;D0;Cf;D1;Cfff;Cfff;Cfff;Cfff;Cfff;D2;Cfff;D5,6;D3;Cfff;D8,10;D4;Cfff;D12,13;D7,9;D16;D11;D17,19;D14;D15;D21;D18;D23,24;D20;D22;D25;Cf;Cf;Cf;D26;Cf;D27;D28;D29;Cf;D30";
const rows = [];
let bad = 0;
for (const [name, job] of Object.entries(input.jobs)) {
  const units = job.units.filter(u => u.kind === "body" && /^body (202|72):/.test(u.label) && !u.truncated);
  if (units.length === 0) continue;
  const scenario = JSON.parse(readFileSync(`tools/battle-lab/${job.base}.json`, "utf8"));
  const parties = scenario.overrides.parties;
  let player = parties.player[0].species as number, opponent = parties.opponent[0].species as number;
  const variant = (Array.isArray(job.variant) ? job.variant : []) as (string | number)[];
  if (variant[0] === "both") { player = variant[1] as number; opponent = variant[2] as number; }
  else for (let i = variant[0] === "extend" ? 2 : 0; i + 1 < variant.length; i += 2) {
    if (variant[i] === "player") player = variant[i + 1] as number; else if (variant[i] === "opponent") opponent = variant[i + 1] as number;
  }
  for (const unit of units) {
    const side = unit.label.endsWith(":player") ? "player" : "opponent", move = unit.label.startsWith("body 72:") ? 72 : 202;
    const model = (move === 72 ? mdPlan : gdPlan)(side, { playerSpecies: player, opponentSpecies: opponent });
    const ok = model === unit.plan;
    if (!ok) bad += 1;
    const observedClass = move === 72 ? (unit.plan.includes("D5,6") ? "older-first (D5,6)" : unit.plan.includes("D6,5") ? "newer-first (D6,5)" : "other")
      : unit.plan === MAJORITY ? "majority" : unit.plan === MAJORITY.replace("D7,9", "D9,7") ? "flip window 18 (D9,7)" : "other";
    if (job.predicted !== undefined && job.predicted !== observedClass) bad += 1;
    rows.push({ job: name, move, side, player, opponent, identicalAB: job.identicalAB, observedClass, predicted: job.predicted ?? null, model, match: ok });
    console.log(`${ok ? "OK " : "BAD"} ${name} ${side} player ${player} opponent ${opponent} observed ${observedClass} predicted ${job.predicted ?? "-"} AB ${job.identicalAB}`);
    if (!ok) console.log(`   observed ${unit.plan}\n   model    ${model}`);
    // multi-destroy windows: the observed D tokens are n-indices in sSpriteOrder order, the mechanism group lists slots in that order
    const multi = unit.plan.split(";").filter(w => /D[0-9]+,[0-9]/.test(w)).map(w => w.slice(w.indexOf("D") + 1).split(",").map(Number));
    const groups = mechanism?.[name] ?? [];
    if (mechanism) {
      if (groups.length !== multi.length) { yBad += 1; console.log(`   mechanism groups ${groups.length} != plan multi-destroy windows ${multi.length}`); }
      multi.forEach((ns, k) => {
        const group = groups[k];
        if (!group) return;
        ns.forEach((n, i) => {
          const rom = group.keys[String(group.orderBefore[i])]![2]!, model = modelOrbY(move, side, player, opponent, n);
          yChecked += 1;
          if (rom !== model) { yBad += 1; console.log(`   y mismatch f${group.frame} n${n}: rom ${rom} model ${model}`); }
        });
      });
    }
  }
}
console.log(`${rows.length - bad}/${rows.length} body-202 / body-72 units: model == observed${mechanism ? `; last-sort orb y: ${yChecked - yBad}/${yChecked} model == ROM oam.y` : ""}`);
bad += yBad;
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify({ schema: "gdgeo-model-check/v1", rows }, null, 1) + "\n");
process.exitCode = bad === 0 ? 0 : 1;
