// gdgeo: per-frame ROM check of the geometry-keyed body-202 / 72 plans (liveMoveAnimation.ts liveMoveGeometrySpriteOrderPlanText) with the production plan
// cursor, exactly as prep43Check.ts checkUnit: from the ROM free order F at the unit start apply the plan prefix through window k and
// require the created slots, the destroyed slots and F after window k to equal ROM window k (every allocation frame), and no stray F
// change. Inputs are prep43-format units.json files (prep43Extract.py / gdgeoExtract.py); species from the job's scenario + variant.
// usage: node --experimental-strip-types tools/integration/gdgeoCheck.ts <out.json> <units.json> [<units.json> ...]
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";
import { liveMoveGeometrySpriteOrderPlanText } from "../../src/engine/liveMoveAnimation.ts";
type Species = { playerSpecies: number; opponentSpecies: number };
const gdPlan = (side: "player" | "opponent", species: Species) => liveMoveGeometrySpriteOrderPlanText(202, side, species);
const mdPlan = (side: "player" | "opponent", species: Species) => liveMoveGeometrySpriteOrderPlanText(72, side, species);

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { base: string; variant: unknown; units: Unit[]; identicalAB: boolean }
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

function species(job: Job): [number, number] {
  const parties = JSON.parse(readFileSync(`tools/battle-lab/${job.base}.json`, "utf8")).overrides.parties;
  let player = parties.player[0].species as number, opponent = parties.opponent[0].species as number;
  const v = (Array.isArray(job.variant) ? job.variant : []) as (string | number)[];
  if (v[0] === "both") return [v[1] as number, v[2] as number];
  for (let i = v[0] === "extend" ? 2 : 0; i + 1 < v.length; i += 2) {
    if (v[i] === "player") player = v[i + 1] as number; else if (v[i] === "opponent") opponent = v[i + 1] as number;
  }
  return [player, opponent];
}

function checkUnit(unit: Unit, text: string) {
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
    if (!same(created, rom.C.map(([slot]) => slot).sort((l, r) => l - r)) || !same(destroyed, [...rom.D].sort((l, r) => l - r))
      || !same(cursor.order.free, rom.F)) problems.push(`window ${k} f${rom.f}: F ${same(cursor.order.free, rom.F) ? "==" : "!="}`);
    frames += 1;
  }
  const survivors = cursor.order.known ? cursor.occupied.filter(slot => !start.occupied.includes(slot)) : [];
  if (survivors.length !== 0) problems.push(`${survivors.length} survivors`);
  return { problems, frames };
}

const rows: { job: string; move: number; side: string; player: number; opponent: number; frames: number; problems: string[] }[] = [];
for (const file of process.argv.slice(3)) {
  const input = JSON.parse(readFileSync(file, "utf8")) as { jobs: Record<string, Job> };
  for (const [name, job] of Object.entries(input.jobs)) {
    for (const unit of job.units) {
      if (unit.kind !== "body" || unit.truncated || !/^body (202|72):/.test(unit.label)) continue;
      const side = unit.label.endsWith(":player") ? "player" : "opponent", move = unit.label.startsWith("body 72:") ? 72 : 202;
      const [player, opponent] = species(job);
      const text = (move === 72 ? mdPlan : gdPlan)(side, { playerSpecies: player, opponentSpecies: opponent })!;
      const { problems, frames } = checkUnit(unit, text);
      if (!job.identicalAB) problems.push("A != B");
      rows.push({ job: name, move, side, player, opponent, frames, problems });
    }
  }
}
const exact = rows.filter(r => r.problems.length === 0).length;
writeFileSync(process.argv[2]!, JSON.stringify({ schema: "gdgeo-check/v1", instances: rows.length, exact,
  framesChecked: rows.reduce((n, r) => n + r.frames, 0), rows }, null, 1) + "\n");
console.log(`body 202 / 72 (geometry plan): ${exact}/${rows.length} instances exact, ${rows.reduce((n, r) => n + r.frames, 0)} allocation frames`);
for (const r of rows) if (r.problems.length) console.log(`   MISMATCH ${r.job}: ${r.problems.slice(0, 4).join(" | ")}`);
process.exitCode = exact === rows.length ? 0 : 1;
