// Ordinary generated-rental carrier census (S10A H_BUFFER triage). Evidence only.
//   node --experimental-strip-types tools/integration/hBufferCarrierCensus.ts > tools/integration/fixtures/h-buffer-carrier-census.json
// Counts, per move id, the generated Level-50 initial rentals (seeds 0..9999 x streak 0,7,..,42) whose
// createFactoryCorpusPartyMember(rental).moves contain it, plus the species carrying it.
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";

const counts: Record<string, number> = {};
const species: Record<string, Set<string>> = {};
let rentals = 0;
for (let seed = 0; seed < 10000; seed++) {
  for (let streak = 0; streak <= 42; streak += 7) {
    const generated = generateInitialFactoryRentals({
      rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 0x12345678,
    });
    for (const rental of generated.rentals) {
      rentals += 1;
      for (const move of createFactoryCorpusPartyMember(rental).moves as readonly number[]) {
        const key = String(move);
        counts[key] = (counts[key] ?? 0) + 1;
        (species[key] ??= new Set()).add(rental.speciesName);
      }
    }
  }
}
console.log(JSON.stringify({
  schema: "h-buffer-carrier-census/v1",
  seeds: "0..9999", streaks: "0..42 step 7", rentsCount: 0, playerTrainerId: "0x12345678", rentals,
  counts,
  species: Object.fromEntries(Object.entries(species).map(([k, v]) => [k, [...v].sort()])),
}));
