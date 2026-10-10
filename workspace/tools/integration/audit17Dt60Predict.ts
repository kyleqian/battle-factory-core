// Live audit 17 P2: the dt60 class PREDICTION (production's liveDoubleTeamAttackerStepCounter over the generated
// src/data/gen/dt60-mon-anim-data3.json) for every Factory Double Team set whose species is NOT in dt60's grid, both sides; the player
// prediction uses personality = the set's nature index (back anim = sBackAnimNatureModTable[personality % 25]). Picks up to 2 per
// class (zero / one-call-ahead) per side into <out.json> (audit17Stage.py stages them); written BEFORE any probe.
//   node --experimental-strip-types --no-warnings tools/integration/audit17Dt60Predict.ts <out.json>
import { writeFileSync } from "node:fs";
import mons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { liveDoubleTeamAttackerStepCounter } from "../../src/engine/liveMoveAnimation.ts";

const NATURES = ["HARDY", "LONELY", "BRAVE", "ADAMANT", "NAUGHTY", "BOLD", "DOCILE", "RELAXED", "IMPISH", "LAX", "TIMID", "HASTY", "SERIOUS",
  "JOLLY", "NAIVE", "MODEST", "MILD", "QUIET", "BASHFUL", "RASH", "CALM", "GENTLE", "SASSY", "CAREFUL", "QUIRKY"];
const DT60_GRID = new Set(["UMBREON", "SCYTHER", "WALREIN", "GARDEVOIR", "CLEFABLE", "METAGROSS", "DUSCLOPS", "SHUCKLE", "CHANSEY", "ARBOK", "ONIX"]);
const rows: Record<string, unknown>[] = [];
const seen = new Set<string>();
for (const e of mons.entries as { label: string; species: string; moves: string[]; nature: string }[]) {
  if (!e.moves.includes("MOVE_DOUBLE_TEAM")) continue;
  const species = e.species.replace(/^SPECIES_/, "");
  const nature = NATURES.indexOf(e.nature.replace(/^NATURE_/, ""));
  const stats = speciesStats.species.find((s) => s.name === e.species)!;
  const gender = stats.genderRatio === 255 ? "genderless" : stats.genderRatio === 254 ? "female" : "male";
  for (const side of ["opponent", "player"] as const) {
    const key = `${side}:${species}:${side === "player" ? nature : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const d = liveDoubleTeamAttackerStepCounter(side, species, side === "player" ? nature : undefined);
    rows.push({ side, species, speciesId: stats.id, nature, natureName: NATURES[nature], gender, set: e.label, data3: d,
      predicted: d === null ? "declined" : d < 0 ? "behind (declined)" : d >= 1 ? "one-call-ahead" : "zero", inDt60Grid: DT60_GRID.has(species) });
  }
}
const grid: Record<string, unknown>[] = [];
for (const side of ["opponent", "player"]) {
  for (const cls of ["zero", "one-call-ahead"]) {
    grid.push(...rows.filter((r) => r.side === side && r.predicted === cls && !r.inDt60Grid
      && !grid.some((g) => g.side === side && g.species === r.species)).slice(0, 2));
  }
}
writeFileSync(process.argv[2]!, `${JSON.stringify({ schema: "audit17-dt60-prediction/v1", factoryDoubleTeamSets: rows, grid }, null, 1)}\n`);
for (const g of grid) console.log(g.side, g.species, g.natureName, g.data3, g.predicted);
console.log(rows.length, "side/species/nature rows;", rows.filter((r) => !r.inDt60Grid).length, "outside dt60's grid");
