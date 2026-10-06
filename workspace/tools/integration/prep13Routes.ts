// prep13: ordinary generated-rental routes for the four prep13 moves (copy of prep11Routes.ts): party member 0 = rentals[0] knows the move; seeds 0..9999 ascending, streak 0..42 step 7,
// rentsCount 0, playerTrainerId 416049562. Per move: the first slot-0 route, the accepted-species route, the first route of every carrier species (alternate-species proofs).
//   node --experimental-strip-types tools/integration/prep13Routes.ts > tools/integration/fixtures/prep13-routes.json
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
const ACCEPTED: Record<string, string[]> = { ICE_BEAM: ["NINCADA"], WATER_SPOUT: ["NOSEPASS"], HIDDEN_POWER: ["UNOWN"], HYPER_BEAM: ["AERODACTYL"] };
const MOVES: Record<string, number> = { ICE_BEAM: 58, WATER_SPOUT: 323, HIDDEN_POWER: 237, HYPER_BEAM: 63 };
const PER_SPECIES = Number(process.env.PER_SPECIES ?? 1);
const STREAK_MAX = Number(process.env.STREAK_MAX ?? 42);
const bySpecies: Record<string, Record<string, any>> = {}, slotCounts: Record<string, number> = {}, anySlot: Record<string, number> = {}, species: Record<string, Set<string>> = {};
for (let seed = 0; seed < 10000; seed++) for (let streak = 0; streak <= STREAK_MAX; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  g.rentals.forEach((rental, slot) => {
    const m = createFactoryCorpusPartyMember(rental) as any;
    for (const [name, id] of Object.entries(MOVES)) {
      if (!(m.moves as readonly number[]).includes(id)) continue;
      (species[name] ??= new Set()).add(rental.speciesName); anySlot[name] = (anySlot[name] ?? 0) + 1;
      if (slot !== 0) continue;
      slotCounts[name] = (slotCounts[name] ?? 0) + 1;
      const sp = (bySpecies[name] ??= {});
      if ((sp[rental.speciesName] ??= []).length < PER_SPECIES) sp[rental.speciesName].push({ seed, streak, slot, setId: rental.setId, species: rental.speciesName, moves: [...m.moves], hp: m.hp, maxHp: m.maxHP, gender: m.gender, personality: m.personality, level: m.level, item: m.itemName,
        acceptedSpecies: ACCEPTED[name].some((s) => rental.speciesName === `SPECIES_${s}`) });
    }
  });
}
const routes: Record<string, any[]> = {};
for (const [name, sp] of Object.entries(bySpecies)) routes[name] = Object.values(sp).flat().sort((a, b) => (Number(b.acceptedSpecies) - Number(a.acceptedSpecies)) || (a.seed - b.seed) || (a.streak - b.streak));
console.log(JSON.stringify({ schema: "prep13-routes/v1", playerTrainerId: 416049562, rentsCount: 0, streakMax: STREAK_MAX, slot0Counts: slotCounts, anySlotCounts: anySlot,
  species: Object.fromEntries(Object.entries(species).map(([k, v]) => [k, [...v].sort()])), routes }, null, 1));
