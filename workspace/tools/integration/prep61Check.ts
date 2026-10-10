// prep61: per-frame ROM check of the semi-invulnerable two-turn order plans against direct-mGBA unit receipts (prep61Extract.py) --
// prep45Check.ts's / plans54Check.ts's checkUnit unchanged (copied: those scripts run at import): the production plan cursor
// (applySpriteOrderUnitPlan, decodeSpriteOrderPlan) applies the plan prefix through every allocation window from the ROM F at the unit
// start; created / destroyed slots and F must equal the ROM after every window; a single survivor must be destroyed by the very next
// allocation window (carry).
//   Setup / unleash bodies (labels `body 19:<side>` / `body 10019:<side>`, ... from gAnimMoveTurn): checked against PREP61_PLANS.
//   The other battler's bodies inside the hidden window (between the setup and the unleash body of the same job): checked against the
//     production table (SPRITE_ORDER_PRODUCTION_BODIES; no row = `unplanned`).
//   Hidden window: every allocation window between the setup body's end and the unleash body's start is attributed to (a) a body unit,
//     (b) the player's action-prompt pair (`Cff;D0,1` / `Cff;D1,0` in a gap) or (c) nothing else (`other` = a blip or an unmodelled unit). With the
//     RAM invisible bit of the hidden battler at every window.
//   Dive 291 / 10291: words-dependent (docs/next-adapters-prep61.md): reported per instance with the RAM gRng2Value at the body start;
//     no plan is proposed (`words`).
// usage: node --experimental-strip-types tools/integration/prep61Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS } from "../../src/engine/spriteOrderProductionPlans.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit {
  kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[];
  ram: { animMoveTurn: number; invisible: number; semiInvulnerable: number; rng2: string };
}
interface Job { unit: string; attackerSide: "player" | "opponent"; units: Unit[]; identicalAB: boolean }

/** Proposed order plans (host key -> plan text). Bounce's unleash is side-keyed (the two hitsplat-pair destroys swap). */
export const PREP61_PLANS: Readonly<Record<string, string>> = Object.freeze({
  // FlySetUp: gFlyBallUpSpriteTemplate only (AnimFlyBallUp; DestroyAnimSprite when it leaves the screen)
  "body 19:player": "Cf;D0", "body 19:opponent": "Cf;D0",
  // FlyUnleash: gFlyBallAttackSpriteTemplate, then (delay 20) the basic hitsplat; the ball is destroyed first
  "body 10019:player": "Cf;Cf;D0;D1", "body 10019:opponent": "Cf;Cf;D0;D1",
  // BounceSetUp: gBounceBallShrinkSpriteTemplate only
  "body 340:player": "Cf;D0", "body 340:opponent": "Cf;D0",
  // BounceUnleash: gBounceBallLandSpriteTemplate, then (delay 7) the basic hitsplat; player attacker: ball destroyed first, opponent:
  // hitsplat first
  "body 10340:player": "Cf;Cf;D0;D1", "body 10340:opponent": "Cf;Cf;D1;D0",
});
const WORDS_KEYS = new Set([291, 10291]);

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

const keyOf = (label: string) => Number(label.slice(5).split(":")[0]);
const [unitsPath, outPath] = process.argv.slice(2);
const jobs = (JSON.parse(readFileSync(unitsPath!, "utf8")) as { jobs: Record<string, Job> }).jobs;
const labels: Record<string, { instances: number; exact: number; frames: number; jobs: string[]; problems: string[] }> = {};
const words: { job: string; label: string; rng2: string; plan: string }[] = [];
const tableBodies: Record<string, { instances: number; exact: number; plan: string | null; jobs: string[]; problems: string[] }> = {};
const hidden: Record<string, { windows: { f: number; unit: string; attribution: string; hiddenInvisible: boolean }[]; other: number }> = {};
for (const [name, job] of Object.entries(jobs)) {
  if (!job.identicalAB) throw new Error(`${name}: A != B`);
  const us = job.units;
  for (let i = 0; i < us.length; i++) {
    const u = us[i]!;
    if (u.kind !== "body" || u.truncated || !u.label.startsWith("body ")) continue;
    if (WORDS_KEYS.has(keyOf(u.label))) { words.push({ job: name, label: u.label, rng2: u.ram.rng2, plan: u.plan }); continue; }
    const text = PREP61_PLANS[u.label];
    if (text === undefined) continue;
    const r = checkUnit(u, us.slice(i + 1).find(n => n.windows.length > 0), text);
    const row = labels[u.label] ??= { instances: 0, exact: 0, frames: 0, jobs: [], problems: [] };
    row.instances += 1; row.frames += r.frames;
    if (r.problems.length === 0) row.exact += 1; else row.problems.push(`${name}: ${r.problems.join("; ")}`);
    if (!row.jobs.includes(name)) row.jobs.push(name);
  }
  // The hidden window: from the end of the setup body to the start of the unleash body.
  const hiddenBit = job.attackerSide === "player" ? 1 : 2;
  const setup = us.findIndex(u => u.kind === "body" && [19, 340, 291].includes(keyOf(u.label)));
  const unleash = us.findIndex(u => u.kind === "body" && [10019, 10340, 10291].includes(keyOf(u.label)));
  if (setup < 0 || unleash < 0) { hidden[name] = { windows: [], other: -1 }; continue; }
  const entry = hidden[name] = { windows: [] as { f: number; unit: string; attribution: string; hiddenInvisible: boolean }[], other: 0 };
  for (let i = setup + 1; i < unleash; i++) {
    const u = us[i]!;
    if (u.kind === "body") {
      const key = u.label.slice(5);
      const index = (SPRITE_ORDER_PRODUCTION_BODIES as Record<string, number>)[key];
      const text = index === undefined ? null : SPRITE_ORDER_PRODUCTION_PLANS[index]!;
      const row = tableBodies[u.label] ??= { instances: 0, exact: 0, plan: text, jobs: [], problems: [] };
      row.instances += 1;
      if (!row.jobs.includes(name)) row.jobs.push(name);
      if (text !== null) {
        const r = checkUnit(u, us.slice(i + 1).find(n => n.windows.length > 0), text);
        if (r.problems.length === 0) row.exact += 1; else row.problems.push(`${name}: ${r.problems.join("; ")}`);
      } else row.problems.push(`${name}: no production plan (ROM ${u.plan})`);
      for (const w of u.windows) entry.windows.push({ f: w.f, unit: u.label, attribution: "body", hiddenInvisible: (u.ram.invisible & hiddenBit) !== 0 });
    } else {
      const prompt = u.plan === "Cff;D0,1" || u.plan === "Cff;D1,0";  // the pair's destroy order follows sSpriteOrder (after Dive's setup: D1,0)
      if (!prompt && u.windows.length > 0) entry.other += u.windows.length;
      for (const w of u.windows) entry.windows.push({ f: w.f, unit: "gap", attribution: prompt ? "action-prompt pair" : "other",
        hiddenInvisible: (u.ram.invisible & hiddenBit) !== 0 });
    }
  }
}
const result = { schema: "prep61-check/v1", plans: PREP61_PLANS, labels, tableBodiesInHiddenWindow: tableBodies, hiddenWindow: hidden, words };
writeFileSync(outPath!, JSON.stringify(result, null, 1) + "\n");
for (const [label, r] of Object.entries(labels).sort()) {
  console.log(`${label.padEnd(20)} ${r.exact}/${r.instances} exact, ${r.frames} allocation frames, jobs ${r.jobs.length}${r.problems.length ? `  PROBLEMS ${r.problems.join(" | ")}` : ""}`);
}
for (const [label, r] of Object.entries(tableBodies).sort()) {
  console.log(`hidden-window body ${label.padEnd(18)} table plan ${JSON.stringify(r.plan)}: ${r.exact}/${r.instances} exact${r.problems.length ? `  ${r.problems.join(" | ")}` : ""}`);
}
for (const [name, h] of Object.entries(hidden)) {
  const counts = new Map<string, number>();
  for (const w of h.windows) { const k = `${w.unit === "gap" ? w.attribution : w.unit}${w.hiddenInvisible ? "" : " (VISIBLE)"}`; counts.set(k, (counts.get(k) ?? 0) + 1); }
  console.log(`hidden window ${name.padEnd(22)} ${h.other < 0 ? "no setup/unleash pair" : `${h.windows.length} windows (${[...counts].map(([k, n]) => `${k} x${n}`).join(", ") || "none"}); other ${h.other}`}`);
}
const distinct = new Set(words.map(w => `${w.label} ${w.plan}`)).size;
console.log(`Dive: ${words.length} bodies, ${distinct} distinct (label, plan), ${new Set(words.map(w => w.rng2)).size} distinct gRng2Value at the body start`);
