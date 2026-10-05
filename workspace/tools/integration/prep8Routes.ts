// prep8: ordinary generated-rental routes for the ten allocator-plan-v2 moves (copy of prep6Routes.ts): party member 0 = rentals[0] knows the move; seeds 0..9999 ascending, streak 0..42 step 7,
// rentsCount 0, playerTrainerId 416049562. Per move: the first slot-0 route, the accepted-species route, the first route of every carrier species (alternate-species proofs).
//   node --experimental-strip-types tools/integration/prep8Routes.ts > tools/integration/fixtures/prep8-routes.json
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
const ACCEPTED: Record<string, string[]> = { SWIFT: ["STARYU"], TRICK: ["FURRET"], THUNDERBOLT: ["DELCATTY"], FRUSTRATION: ["FURRET"], HORN_DRILL: ["SEAKING"], SEISMIC_TOSS: ["GRUMPIG"], AURORA_BEAM: ["SEADRA"], STOCKPILE: ["PELIPPER"], UPROAR: ["VIGOROTH"], ZAP_CANNON: ["FORRETRESS"] };
const MOVES: Record<string, number> = { SWIFT: 129, TRICK: 271, THUNDERBOLT: 85, FRUSTRATION: 218, HORN_DRILL: 32, SEISMIC_TOSS: 69, AURORA_BEAM: 62, STOCKPILE: 254, UPROAR: 253, ZAP_CANNON: 192 };
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
      if (!sp[rental.speciesName]) sp[rental.speciesName] = { seed, streak, slot, setId: rental.setId, species: rental.speciesName, moves: [...m.moves], hp: m.hp, maxHp: m.maxHP, gender: m.gender, personality: m.personality, level: m.level, item: m.itemName,
        acceptedSpecies: ACCEPTED[name].some((s) => rental.speciesName === `SPECIES_${s}`) };
    }
  });
}
const routes: Record<string, any[]> = {};
for (const [name, sp] of Object.entries(bySpecies)) routes[name] = Object.values(sp).sort((a, b) => (Number(b.acceptedSpecies) - Number(a.acceptedSpecies)) || (a.seed - b.seed) || (a.streak - b.streak));
console.log(JSON.stringify({ schema: "prep8-routes/v1", playerTrainerId: 416049562, rentsCount: 0, streakMax: STREAK_MAX, slot0Counts: slotCounts, anySlotCounts: anySlot,
  species: Object.fromEntries(Object.entries(species).map(([k, v]) => [k, [...v].sort()])), routes }, null, 1));
