// s10a: first generated-rental routes (r3ProfileRouteSearch.ts recipe: rentals[0] knows the moves, seeds ascending, streak 0..42 step 7)
// whose ordinary input (Stockpile x N, then Spit Up) reaches the Spit Up live body and the next prompt. Never picks by live output.
//   node --experimental-strip-types tools/integration/s10aSpitUpRouteSearch.ts [maxCandidates] [stockpiles] [maxSeed]
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const maxCandidates = Number(process.argv[2] ?? 4);
const stockpiles = Number(process.argv[3] ?? 1);
const maxSeed = Number(process.argv[4] ?? 20000);
const out: unknown[] = [];
let tried = 0;
for (let seed = 0; seed < maxSeed && tried < maxCandidates; seed++) for (let streak = 0; streak <= 42 && tried < maxCandidates; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const m = createFactoryCorpusPartyMember(g.rentals[0]!) as { moves: readonly number[] };
  const stock = m.moves.indexOf(254), spit = m.moves.indexOf(255);
  if (stock < 0 || spit < 0) continue;
  tried++;
  try {
    const run = generatedCommandAnimationReplay(seed, "on", [...Array(stockpiles).fill(stock), spit], streak);
    const bodies = run.animations.filter((a) => a.moveId === 255);
    out.push({ seed, streak, slots: [stock, spit], species: g.rentals[0]!.speciesName, stalled: run.stalled,
      prompt: run.state.battleCommandPresentation?.lifecycle.phase,
      bodies: bodies.map((b) => ({ attacker: b.attacker, turn: (b as { request?: { turn: number } }).request?.turn, ages: b.ages.length, active: b.adapterActive.every(Boolean) })) });
  } catch (error) {
    out.push({ seed, streak, slots: [stock, spit], species: g.rentals[0]!.speciesName, error: String(error).slice(0, 200) });
  }
}
console.log(JSON.stringify(out));
