import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import { getMonGender, type MonGender } from "./monGender.ts";

type SpeciesStatsRow = Readonly<{ id: number; genderRatio: number }>;

const SPECIES_GENDER_RATIO_BY_ID: ReadonlyMap<number, number> = new Map(
  (speciesStatsData.species as readonly SpeciesStatsRow[]).map((row) => [row.id, row.genderRatio]),
);

/** `GetGenderFromSpeciesAndPersonality` (`src/pokemon.c:3471-3485`). */
export function resolveBattleScriptMonGender(species: number, personality: number): MonGender {
  const genderRatio = SPECIES_GENDER_RATIO_BY_ID.get(species);
  if (genderRatio === undefined) throw new Error(`no genderRatio data for species id ${species}`);
  return getMonGender(genderRatio, personality);
}
