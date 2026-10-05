// One ordinary generated-rental route per prep4 move (party member 0 = rentals[0] knows it).
//   node --experimental-strip-types tools/integration/prep4Routes.ts > tools/integration/fixtures/prep4-routes.json
// seeds 0..9999 ascending, streak 0..42 step 7, rentsCount 0, playerTrainerId 416049562 (0x18D6D41A).
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";

const ACCEPTED: Record<string, string> = { EMBER: "ONIX", DRAGON_BREATH: "ONIX", DEFENSE_CURL: "PHANPY", INGRAIN: "CACTURNE", MEAN_LOOK: "MURKROW", SMELLING_SALT: "GRANBULL", BIND: "ONIX", WRAP: "TENTACOOL" };
const MOVES: Record<string, number> = { EMBER: 52, DRAGON_BREATH: 225, DEFENSE_CURL: 111, INGRAIN: 275, MEAN_LOOK: 212, SMELLING_SALT: 265, BIND: 20, WRAP: 35 };
const ids = new Set(Object.values(MOVES));
const found: Record<string, unknown[]> = {};
const slotCounts: Record<string, number> = {};
const species: Record<string, Set<string>> = {};
for (let seed = 0; seed < 10000; seed++) {
  for (let streak = 0; streak <= 42; streak += 7) {
    const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
    g.rentals.forEach((rental, slot) => {
      const m = createFactoryCorpusPartyMember(rental) as any;
      for (const [name, id] of Object.entries(MOVES)) {
        if (!(m.moves as readonly number[]).includes(id)) continue;
        (species[name] ??= new Set()).add(rental.speciesName);
        if (slot === 0) {
          slotCounts[name] = (slotCounts[name] ?? 0) + 1;
          const rec = { seed, streak, slot, setId: rental.setId, species: rental.speciesName, moves: [...m.moves], hp: m.hp, maxHp: m.maxHP,
            gender: m.gender, personality: m.personality, level: m.level, item: m.itemName, acceptedSpecies: ACCEPTED[name] };
          const list = (found[name] ??= []) as any[];
          if (list.length === 0) list.push({ kind: "first", ...rec });
          if (rental.speciesName === `SPECIES_${ACCEPTED[name]}` && !list.some((r) => r.kind === "accepted-species")) list.push({ kind: "accepted-species", ...rec });
        }
      }
    });
  }
}
console.log(JSON.stringify({ schema: "prep4-routes/v1", playerTrainerId: 416049562, rentsCount: 0, slot0Counts: slotCounts,
  species: Object.fromEntries(Object.entries(species).map(([k, v]) => [k, [...v].sort()])), routes: found }, null, 1));
