// plans54: per-frame ROM check of the plans54 order plans against direct-mGBA unit receipts (plans54Extract.py / plans51Extract.py) --
// prep45Check.ts's / plans51Check.ts's method and checkUnit unchanged (copied: those scripts run at import): the production plan cursor
// (applySpriteOrderUnitPlan, decodeSpriteOrderPlan) applies the plan prefix through every allocation window from the ROM F at the unit
// start; created / destroyed slots and F must equal the ROM after every window; a single survivor must be destroyed by the very next
// allocation window (carry).
//   Fury Cutter 210: the k-th 210 body of a job's unbroken chain has furyCutterCounter min(k, 5) (Cmd_furycuttercalc), checked against the
//     proposed plan of its order key (PLANS54_PLANS; liveSpriteOrderHost.ts FURY_CUTTER_ORDER_KEYS).
//   Eruption 284: checked against the PRODUCTION seam text liveMoveGeometrySpriteOrderPlanText(284, side, species) at the job's species
//     (a null text = fail closed: counted as `unproven`, never as exact).
//   Hail 258 and HAIL_CONTINUES (the first mv-0 body of each end turn in a hail job; a second one in the same end turn is Leftovers'
//     HELD_ITEM_EFFECT): the PRODUCTION seam text liveMoveGeometrySpriteOrderPlanText(258, side, species), and separately the plan
//     PREDICTED before the probes (fixtures/plans54/hail-predictions.json) -> `predictedExact`.
//   Blizzard 59: the PRODUCTION seam text liveMoveGeometrySpriteOrderPlanText(59, side, species) and the PREDICTED plan
//     (fixtures/plans54/blizzard-predictions.json).
//   Water Spout 323: the PRODUCTION seam text at the body's HP tier (read from the ROM's launch window) and the ROM's own start order (F0 =
//     the lent order); a body starting at the known-entry order is also checked against fixtures/plans54/water-spout-predictions.json.
// usage: node --experimental-strip-types tools/integration/plans54Check.ts <out.json> <units.json>...
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";
import { liveMoveGeometrySpriteOrderPlanText } from "../../src/engine/liveMoveAnimation.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
import { predictedWaterSpoutPlan } from "./plans54WaterSpoutPredict.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { unit: string; base: string; ops: (string | number)[][] | null; units: Unit[]; identicalAB: boolean }

/** Proposed keyed plans (order key -> plan text), both attacker sides. */
export const PLANS54_PLANS: Readonly<Record<string, string>> = Object.freeze({
  // Move_FURY_CUTTER, counter 1 (FuryCutterContinue2): the gCuttingSliceSpriteTemplate slice only (AnimSlice_Step 20 + 3 frames)
  "body 210": "Cf;D0",
  // counters 2 / 3 / 4+: the slice plus the complex_palette_blend controller sprite in the same frame (createvisualtask runs the task
  // at once); the blend (delay 3, 1 or 3 blends: ~10 / ~18 callbacks) is destroyed before the slice (~25 callbacks)
  "body 10210": "Cff;D1;D0",
  "body 20210": "Cff;D1;D0",
  "body 30210": "Cff;D1;D0",
});
const FURY_CUTTER_KEYS = [210, 10210, 20210, 30210];

const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

function checkUnit(unit: Unit, next: Unit | undefined, text: string) {
  const plan = decodeSpriteOrderPlan(text);
  const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
  const problems: string[] = [];
  if (unit.windows.length !== plan.length) problems.push(`window count ${unit.windows.length} != plan ${plan.length}`);
  if (unit.strayFChanges !== 0) problems.push(`${unit.strayFChanges} F changes without allocation`);
  let frames = 0, cursor = start;
  for (let k = 0; k < Math.min(plan.length, unit.windows.length); k++) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = unit.windows[k]!;
    if (!cursor.order.known) { problems.push(`window ${k} f${rom.f}: plan did not resolve`); break; }
    const created = cursor.occupied.filter(slot => !before.occupied.includes(slot));
    const destroyed = before.occupied.filter(slot => !cursor.occupied.includes(slot));
    const romCreated = rom.C.map(([slot]) => slot).sort((l, r) => l - r);
    const romDestroyed = [...rom.D].sort((l, r) => l - r);
    if (!same(created, romCreated) || !same(destroyed, romDestroyed) || !same(cursor.order.free, rom.F)) {
      problems.push(`window ${k} f${rom.f}: created ${created}/${romCreated} destroyed ${destroyed}/${romDestroyed} F ${same(cursor.order.free, rom.F) ? "==" : "!="}`);
    }
    frames += 1;
  }
  const survivors = cursor.order.known ? cursor.occupied.filter(slot => !start.occupied.includes(slot)) : [];
  let carry: string | null = null;
  if (survivors.length === 1) {
    const first = next?.windows[0];
    const carried = applySpriteOrderUnitPlan(cursor, [{ D: [["o", survivors[0]!]] }]);
    if (!first || first.C.length !== 0 || !same(first.D, survivors) || !same(carried.order.free, first.F)) {
      problems.push(`carry: next window ${JSON.stringify(first && { C: first.C, D: first.D })} vs survivor ${survivors}`);
    } else { carry = `f${first.f} D${survivors[0]}`; frames += 1; }
  } else if (survivors.length > 1) problems.push(`${survivors.length} survivors`);
  return { problems, frames, survivors: survivors.length, carry };
}

/** The job's lead species per side from its ops (both sides are set by every plans51 / plans54 Eruption job). */
function speciesOf(job: Job): { player?: number; opponent?: number } {
  const out: { player?: number; opponent?: number } = {};
  for (const op of job.ops ?? []) if (op[0] === "species") out[op[1] as "player" | "opponent"] = Number(op[2]);
  return out;
}

const [outPath, ...inputs] = process.argv.slice(2);
const predictions = (JSON.parse(readFileSync(new URL("./fixtures/plans54/hail-predictions.json", import.meta.url), "utf8")) as
  { predictions: Record<string, string> }).predictions;
const waterSpoutPredictions = (JSON.parse(readFileSync(new URL("./fixtures/plans54/water-spout-predictions.json", import.meta.url), "utf8")) as
  { predictions: Record<string, string | null> }).predictions;
/** The Water Spout tier scenarios' lead when a job sets no species op: NOSEPASS 320 (the "wailmer" scenarios). */
const WATER_SPOUT_DEFAULT_ATTACKER = 320;
const blizzardPredictions = (JSON.parse(readFileSync(new URL("./fixtures/plans54/blizzard-predictions.json", import.meta.url), "utf8")) as
  { predictions: Record<string, string> }).predictions;
type Entry = { instances: number; matched: number; unproven: number; framesChecked: number; sides: string[]; jobs: string[]; plan: string | null;
  predictedExact?: number;
  mismatches: { job: string; frame: number; observedPlan: string; problems: string[] }[] };
const results: Record<string, Entry> = {};
let jobs = 0, notIdentical = 0;
for (const path of inputs) {
  const input = JSON.parse(readFileSync(path, "utf8")) as { jobs: Record<string, Job> };
  for (const [name, job] of Object.entries(input.jobs)) {
    if (job.unit !== "BODY210" && job.unit !== "BODY284" && job.unit !== "BODY258" && job.unit !== "BODY59" && job.unit !== "BODY323") continue;
    jobs += 1;
    if (!job.identicalAB) notIdentical += 1;
    const chain = { player: 0, opponent: 0 };
    let previousBody = "";
    job.units.forEach((unit, index) => {
      if (unit.kind !== "body") return;
      const afterHail = previousBody === "general HAIL_CONTINUES";
      previousBody = unit.label;
      const hailContinues = job.unit === "BODY258" && unit.label === "general HAIL_CONTINUES" && !afterHail;
      const m = hailContinues ? ["", "258", "player"] : /^body (\d+):(player|opponent)$/.exec(unit.label);
      if (unit.truncated || !m || (m[1] !== "210" && m[1] !== "284" && m[1] !== "258" && m[1] !== "59" && m[1] !== "323")) return;
      const side = m[2] as "player" | "opponent";
      let label: string, text: string | null, predicted: string | undefined;
      if (m[1] === "258") {
        const species = speciesOf(job);
        label = `${hailContinues ? "general HAIL_CONTINUES" : `body 258 ${side}`} ${species.player}-${species.opponent}`;
        text = liveMoveGeometrySpriteOrderPlanText(258, side, { playerSpecies: species.player!, opponentSpecies: species.opponent! });
        predicted = predictions[`${species.player}-${species.opponent}`];
      } else if (m[1] === "323") {
        // the HP tier from the ROM's own launch window (CreateWaterSpoutLaunchDroplets: 20 / 10 / 7 / 5 orbs for tiers 3 / 2 / 1 / 0)
        const orbs = unit.windows[0]?.C.length ?? 0;
        const tier = ({ 20: 3, 10: 2, 7: 1, 5: 0 } as Record<number, 0 | 1 | 2 | 3>)[orbs];
        const species = speciesOf(job);
        const attacker = (side === "player" ? species.player : species.opponent) ?? WATER_SPOUT_DEFAULT_ATTACKER;
        label = `body 323 ${side} ${attacker} t${tier}`;
        text = tier === undefined ? null : predictedWaterSpoutPlan(side, attacker, tier, unit.F0);
        const atEntry = unit.F0.length === KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER.length && unit.F0.every((slot, at) => slot === KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER[at]);
        predicted = atEntry && tier !== undefined ? waterSpoutPredictions[`${side}-${attacker}-t${tier}`] ?? undefined : undefined;
      } else if (m[1] === "59") {
        const species = speciesOf(job);
        const attacker = side === "player" ? species.player : species.opponent, target = side === "player" ? species.opponent : species.player;
        label = `body 59 ${side} ${attacker}-${target}`;
        text = liveMoveGeometrySpriteOrderPlanText(59, side, { playerSpecies: species.player!, opponentSpecies: species.opponent! });
        predicted = blizzardPredictions[`${side}-${attacker}-${target}`];
      } else if (m[1] === "210") {
        const counter = Math.min(++chain[side], 5);
        label = `body ${FURY_CUTTER_KEYS[Math.min(counter, 4) - 1]}`;
        text = PLANS54_PLANS[label]!;
      } else {
        const species = speciesOf(job);
        if (species.player === undefined || species.opponent === undefined) return;
        label = `body 284 ${side} ${side === "player" ? species.player : species.opponent}`;
        text = liveMoveGeometrySpriteOrderPlanText(284, side, { playerSpecies: species.player, opponentSpecies: species.opponent });
      }
      const entry = results[label] ??= { instances: 0, matched: 0, unproven: 0, framesChecked: 0, sides: [], jobs: [], plan: text, mismatches: [] };
      entry.instances += 1;
      if (!entry.sides.includes(side)) entry.sides.push(side);
      if (!entry.jobs.includes(name)) entry.jobs.push(name);
      if (text === null) { entry.unproven += 1; return; }
      const next = job.units.slice(index + 1).find(u => u.windows.length > 0);
      if (predicted !== undefined && checkUnit(unit, next, predicted).problems.length === 0) entry.predictedExact = (entry.predictedExact ?? 0) + 1;
      const checked = checkUnit(unit, next, text);
      entry.framesChecked += checked.frames;
      if (checked.problems.length === 0) entry.matched += 1;
      else entry.mismatches.push({ job: name, frame: unit.frame, observedPlan: unit.plan, problems: checked.problems.slice(0, 4) });
    });
  }
}
const out = { schema: "plans54-check/v1", jobs, notIdenticalAB: notIdentical, plans: PLANS54_PLANS, results };
writeFileSync(outPath!, JSON.stringify(out, null, 1) + "\n");
console.log(`${jobs} jobs, ${notIdentical} A/B differ`);
for (const [label, r] of Object.entries(results).sort(([l], [r]) => l.localeCompare(r))) {
  console.log(`${label}: ${r.matched}/${r.instances} instances exact${r.unproven ? ` (${r.unproven} unproven: no plan)` : ""}${r.predictedExact !== undefined ? ` (predicted plan exact ${r.predictedExact})` : ""}, ${r.framesChecked} allocation frames, sides ${r.sides.join("+")}, jobs ${r.jobs.length}`);
  for (const m of r.mismatches) console.log(`   MISMATCH ${m.job} @${m.frame}: ${m.problems.join(" | ")}`);
}
