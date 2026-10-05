// One ordinary generated-rental route per prep5 move (party member 0 = rentals[0] knows it).
//   node --experimental-strip-types tools/integration/prep5Routes.ts > tools/integration/fixtures/prep5-routes.json
// seeds 0..9999 ascending, streak 0..STREAK_MAX (default 42) step 7, rentsCount 0, playerTrainerId 416049562 (0x18D6D41A).
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";

const ACCEPTED: Record<string, string> = { HEAL_BELL: "CHIMECHO", MIST_BALL: "LATIAS", AROMATHERAPY: "VILEPLUME", PERISH_SONG: "MURKROW", DRAGON_RAGE: "CHARMELEON", FOLLOW_ME: "TOGETIC", TAUNT: "MURKROW", METRONOME: "CHANSEY", LEAF_BLADE: "SCEPTILE", BELLY_DRUM: "POLIWRATH" };
const MOVES: Record<string, number> = { HEAL_BELL: 215, MIST_BALL: 296, AROMATHERAPY: 312, PERISH_SONG: 195, DRAGON_RAGE: 82, FOLLOW_ME: 266, TAUNT: 269, METRONOME: 118, LEAF_BLADE: 348, BELLY_DRUM: 187 };
const STREAK_MAX = Number(process.env.STREAK_MAX ?? 42); // MIST_BALL carriers (Latias sets 798/843) need challengeNum >= 7: STREAK_MAX=126
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
console.log(JSON.stringify({ schema: "prep5-routes/v1", playerTrainerId: 416049562, rentsCount: 0, slot0Counts: slotCounts,
  species: Object.fromEntries(Object.entries(species).map(([k, v]) => [k, [...v].sort()])), routes: found }, null, 1));
