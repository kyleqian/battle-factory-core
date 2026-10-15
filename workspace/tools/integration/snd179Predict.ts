// snd179 (ISSUES #146 open item 1; docs/snd179-scene-on-forced-player-send-in.md): the Scene ON forced PLAYER send-in "X was dragged out!"
// row, predicted from source only and compared with the ON player-target sweep fixture.
//   message (frames after the send-in start, i.e. fixture txtStart - ball) = max(91, cry + 66, T_back + 70)
//     cry     = SEND_IN_TAIL_OFF_CRY_FRAMES[species]  (compiled cry sample length; the Scene OFF model's cry-bound term)
//     T_back  = first tick at which the species' back-animation reducer (selectBackSendOutAnimation: sSpeciesToBackAnimSet + the sent-in
//               mon's nature mod -> sBackAnimationIds) reports callback WaitAnimEnd; Scene ON only (BattleAnimateBackSprite is a no-op
//               under HITMARKER_NO_ANIMATIONS), the ON-only third bound.
//   CASTFORM (385) is +1 in the same way as every other send-in model (healthbox slide 66, OFF message +1): CASTFORM_SHIFT, reported separately.
//   node --experimental-strip-types --no-warnings tools/integration/snd179Predict.ts [--fixture=<sweep.txt>] [--nature=6] [--json=<out.json>]
//   node --experimental-strip-types --no-warnings tools/integration/snd179Predict.ts --probes=<rom-rows-r1.json>,<rom-rows-r2.json>   (fresh ROM probes)
import { readFileSync, writeFileSync } from "node:fs";
import { BACK_SEND_OUT_REDUCERS } from "../../src/animation/sendOutDispatcher.ts";
import { selectBackSendOutAnimation } from "../../src/animation/backSendOutAnim.ts";
import { SEND_IN_TAIL_OFF_CRY_FRAMES } from "../../src/data/sendInTailOff.ts";

export const SLIDE_BOUND_MESSAGE = 91;
export const CRY_TERM = 66;
export const BACK_ANIM_TERM = 70;
export const CASTFORM_SHIFT = 1;
const SPECIES_CASTFORM = 385;
const NATURE_DOCILE = 6;

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([^=]+)=(.*)$/.exec(a); return m ? [m[1], m[2]] : [a, "1"]; }));
const fixture = args.fixture ?? "tools/integration/fixtures/forced-switch/species-sweep-player-target.txt";
const nature = Number(args.nature ?? NATURE_DOCILE);

const speciesStats = JSON.parse(readFileSync("src/data/gen/species-stats.json", "utf8")).species as { id: number; name: string }[];
const nameOf = new Map(speciesStats.map((r) => [r.id, r.name.replace(/^SPECIES_/, "")]));

/** First back-animation reducer tick whose callback is WaitAnimEnd (null: species without a reducer / never within 400 ticks). */
export function backAnimWaitTick(species: string, natureId: number): number | null {
  const sel = selectBackSendOutAnimation(species, natureId);
  if (sel === null) return null;
  const reducer = BACK_SEND_OUT_REDUCERS[sel.backAnimSet];
  if (reducer === undefined) return null;
  for (let t = 0; t < 400; t += 1) {
    const r = reducer(species, natureId, t) as { callback?: string } | null;
    if (r === null) return null;
    if (r.callback === "WaitAnimEnd") return t;
  }
  return null;
}

export function sceneOnForcedPlayerMessage(speciesId: number, natureId: number) {
  const name = nameOf.get(speciesId)!;
  const cry = SEND_IN_TAIL_OFF_CRY_FRAMES[speciesId]!;
  const back = backAnimWaitTick(name, natureId);
  const terms = { slide: SLIDE_BOUND_MESSAGE, cry: cry + CRY_TERM, back: back === null ? -Infinity : back + BACK_ANIM_TERM };
  const message = Math.max(terms.slide, terms.cry, terms.back);
  const bound = message === terms.back && terms.back > Math.max(terms.slide, terms.cry) ? "back-anim" : message === terms.cry && terms.cry > terms.slide ? "cry" : "slide";
  return { name, cry, backTick: back, terms, message, bound, shifted: message + (speciesId === SPECIES_CASTFORM ? CASTFORM_SHIFT : 0) };
}

if (process.argv[1]?.endsWith("snd179Predict.ts") && args.probes) {
  const files = args.probes.split(",").map((f) => JSON.parse(readFileSync(f, "utf8")) as any[]);
  let exact = 0, exactShifted = 0, identical = 0;
  const first = files[0]!;
  for (let i = 0; i < first.length; i += 1) {
    const row = first[i];
    const same = files.every((f) => f[i].sha256 === row.sha256);
    if (same) identical += 1;
    const c = row.case;
    const p = sceneOnForcedPlayerMessage(c.species, c.nature ?? NATURE_DOCILE);
    const ok = p.message === row.message, okShifted = p.shifted === row.message;
    if (ok) exact += 1;
    if (okShifted) exactShifted += 1;
    console.log(`${okShifted ? "ok  " : "MISS"} ${row.id}: species ${c.species} nature ${c.nature ?? NATURE_DOCILE} attacker ${row.species[1]} bound ${p.bound} cry ${p.cry} T ${p.backTick}: predicted ${p.shifted}, ROM ${row.message}${same ? "" : " (r1 != r2!)"}`);
  }
  console.log(`${first.length} probes: ${exact} exact without the CASTFORM shift, ${exactShifted} with; r1 == r2 byte-identical ${identical} / ${first.length} (${files.length} runs)`);
} else if (process.argv[1]?.endsWith("snd179Predict.ts")) {
  const rows = readFileSync(fixture, "utf8").split("\n")
    .map((l) => /^(\d+) \S+ pidx \[1, 0\] species \[\d+, (\d+)\] ball (\d+) y2start \S+ hbslide (\d+) ctrlIdle \S+ txtStart (\d+)/.exec(l))
    .filter((m) => m !== null).map((m) => ({ species: +m![1]!, attacker: +m![2]!, ball: +m![3]!, slide: +m![4]!, text: +m![5]! }));
  const out: any[] = [];
  let exact = 0, offsExact = 0, exactShifted = 0;
  const boundCount: Record<string, number> = {}, boundExact: Record<string, number> = {};
  for (const r of rows) {
    const p = sceneOnForcedPlayerMessage(r.species, nature);
    const measured = r.text - r.ball;
    const residual = measured - p.message;
    const offsPred = Math.max(91, p.cry + 66);
    if (residual === 0) exact += 1;
    if (measured === p.shifted) exactShifted += 1;
    if (measured === offsPred) offsExact += 1;
    boundCount[p.bound] = (boundCount[p.bound] ?? 0) + 1;
    if (residual === 0) boundExact[p.bound] = (boundExact[p.bound] ?? 0) + 1;
    out.push({ species: r.species, name: p.name, cry: p.cry, backTick: p.backTick, bound: p.bound, predicted: p.message, measured, residual, offsOnlyPrediction: offsPred });
  }
  console.log(`fixture ${fixture}: ${rows.length} rows, nature ${nature}`);
  console.log(`snd179 model max(91, cry+66, T_back+70): ${exact} / ${rows.length} exact`);
  console.log(`  with the CASTFORM +1 shift:          ${exactShifted} / ${rows.length} exact`);
  console.log(`OFF model max(91, cry+66) alone:        ${offsExact} / ${rows.length} exact`);
  console.log("by predicted bound (n / exact):", Object.entries(boundCount).map(([k, v]) => `${k} ${v}/${boundExact[k] ?? 0}`).join(", "));
  for (const o of out) if (o.residual !== 0) console.log(`MISS species ${o.species} ${o.name} cry ${o.cry} backTick ${o.backTick} bound ${o.bound}: predicted ${o.predicted}, measured ${o.measured}, residual ${o.residual >= 0 ? "+" : ""}${o.residual}`);
  if (args.json) writeFileSync(args.json, JSON.stringify({ fixture, nature, rows: rows.length, exact, exactShifted, offsExact, boundCount, boundExact, out }, null, 1) + "\n");
}
