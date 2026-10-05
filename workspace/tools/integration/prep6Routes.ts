// One ordinary generated-rental route per prep5 move (party member 0 = rentals[0] knows it).
//   node --experimental-strip-types tools/integration/prep6Routes.ts > tools/integration/fixtures/prep6-routes.json
// seeds 0..9999 ascending, streak 0..STREAK_MAX (default 42) step 7, rentsCount 0, playerTrainerId 416049562 (0x18D6D41A).
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";

const ACCEPTED: Record<string, string> = { SELF_DESTRUCT: "SUDOWOODO", DOUBLE_TEAM: "ONIX", FAINT_ATTACK: "ONIX", ROCK_TOMB: "GRIMER", PAIN_SPLIT: "MISDREAVUS", DRAGON_DANCE: "DRAGONAIR", SAFEGUARD: "BAYLEEF", SWEET_SCENT: "WEEPINBELL", FIRE_BLAST: "OCTILLERY", SWALLOW: "PELIPPER", KNOCK_OFF: "PLUSLE" };
const MOVES: Record<string, number> = { SELF_DESTRUCT: 120, DOUBLE_TEAM: 104, FAINT_ATTACK: 185, ROCK_TOMB: 317, PAIN_SPLIT: 220, DRAGON_DANCE: 349, SAFEGUARD: 219, SWEET_SCENT: 230, FIRE_BLAST: 126, SWALLOW: 256, KNOCK_OFF: 282 };
const STREAK_MAX = Number(process.env.STREAK_MAX ?? 42); // some carriers need higher streaks: STREAK_MAX=126
const ids = new Set(Object.values(MOVES));
const found: Record<string, unknown[]> = {};
const slotCounts: Record<string, number> = {};
const species: Record<string, Set<string>> = {};
for (let seed = 0; seed < 10000; seed++) {
  for (let streak = 0; streak <= STREAK_MAX; streak += 7) {
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
console.log(JSON.stringify({ schema: "prep6-routes/v1", playerTrainerId: 416049562, rentsCount: 0, slot0Counts: slotCounts,
  species: Object.fromEntries(Object.entries(species).map(([k, v]) => [k, [...v].sort()])), routes: found }, null, 1));
