// Random2 R1: first generated-rental routes (prep11 §4 recipe: rentals[0] knows the move, seeds ascending, streak 0..42
// step 7, playerTrainerId 416049562) whose ordinary input reaches the move's live body. Never picks by live output.
//   node --experimental-strip-types tools/integration/random2R1/routeSearch.ts <moveId> [maxCandidates] [turns]
import { generateInitialFactoryRentals } from "../../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../../src/engine/factoryCorpusParty.ts";
import { random2Route } from "./routeHarness.ts";

const moveId = Number(process.argv[2]);
const maxCandidates = Number(process.argv[3] ?? 6);
const turns = Number(process.argv[4] ?? 2);
const out: unknown[] = [];
let tried = 0;
for (let seed = 0; seed < 10000 && tried < maxCandidates; seed++) for (let streak = 0; streak <= 42 && tried < maxCandidates; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const m = createFactoryCorpusPartyMember(g.rentals[0]!) as { moves: readonly number[] };
  const slot = m.moves.indexOf(moveId);
  if (slot < 0) continue;
  tried++;
  try {
    const route = random2Route(seed, "on", Array(turns).fill(slot), streak, 0x808db3eb);
    const bodies = route.bodies.filter((b) => b.moveId === moveId);
    out.push({ seed, streak, slot, species: g.rentals[0]!.speciesName, stalled: route.run.stalled, turnsCompleted: route.run.boundaries.length - 1,
      bodies: bodies.map((b) => ({ key: b.key, attacker: b.attacker, turn: b.turn, power: b.power, ages: b.ages.length,
        firstAge: b.ages[0], allActive: b.active.every(Boolean), activation: b.activationHostFrame, words: b.words })) });
  } catch (error) {
    out.push({ seed, streak, slot, species: g.rentals[0]!.speciesName, error: String(error).slice(0, 200) });
  }
}
console.log(JSON.stringify(out, null, 1));
