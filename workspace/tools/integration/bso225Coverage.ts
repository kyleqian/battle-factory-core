// bso225: which Factory (species, nature) rentals have a banked back send-out reducer, and the fields the reducers report.
//   node --experimental-strip-types --no-warnings tools/integration/bso225Coverage.ts [out.json]
import { writeFileSync } from "node:fs";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import { BACK_ANIM_NATURE_ORDER, selectBackSendOutAnimation } from "../../src/animation/backSendOutAnim.ts";
import { BACK_SEND_OUT_REDUCERS, backSendOutFrameAtTick } from "../../src/animation/sendOutDispatcher.ts";

const pairs = new Map<string, { species: string; nature: string }>();
for (const e of frontierMons.entries as { species: string; nature: string }[]) {
  const species = e.species.replace(/^SPECIES_/, ""); const nature = e.nature;
  pairs.set(`${species}/${nature}`, { species, nature });
}
const bySet: Record<string, { covered: number; missing: number }> = {};
const missing: string[] = []; const fields = new Set<string>(); let covered = 0;
for (const { species, nature } of pairs.values()) {
  const natureId = BACK_ANIM_NATURE_ORDER.indexOf(nature);
  const sel = selectBackSendOutAnimation(species, natureId);
  const set = sel?.backAnimSet ?? "NONE";
  bySet[set] ??= { covered: 0, missing: 0 };
  const ok = sel !== null && BACK_SEND_OUT_REDUCERS[set] !== undefined && backSendOutFrameAtTick(species, nature, 0) !== null;
  if (ok) {
    covered += 1; bySet[set]!.covered += 1;
    const sample = BACK_SEND_OUT_REDUCERS[set]!(species, natureId, 3) as Record<string, unknown>;
    for (const k of Object.keys(sample)) fields.add(k);
  } else { missing.push(`${species}/${nature}:${set}`); bySet[set]!.missing += 1; }
}
const result = { pairs: pairs.size, covered, missing: missing.length, missingList: missing, bySet, reducerFields: [...fields].sort() };
console.log(JSON.stringify(result, null, 1));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 1) + "\n");
