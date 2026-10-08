// S10A Substitute swaps: generated-rental candidates (prep11 s4 recipe: seeds ascending, streak 0..42 step 7) whose rentals[0]
// knows Substitute (164) AND one of the given bodies (default: LIVE_SUBSTITUTE_SWAP_BODY_IDS). Never picks by live output.
//   node --experimental-strip-types tools/integration/substSwapRouteCandidates.ts [maxCandidates] [maxSeed] [moveId,...]
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { LIVE_SUBSTITUTE_SWAP_BODY_IDS } from "../../src/engine/liveSubstituteSwap.ts";

const maxCandidates = Number(process.argv[2] ?? 6), maxSeed = Number(process.argv[3] ?? 4000);
const wanted = process.argv[4] ? new Set(process.argv[4].split(",").map(Number)) : LIVE_SUBSTITUTE_SWAP_BODY_IDS;
const out: unknown[] = [];
for (let seed = 0; seed < maxSeed && out.length < maxCandidates; seed++) for (let streak = 0; streak <= 42 && out.length < maxCandidates; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const m = createFactoryCorpusPartyMember(g.rentals[0]!) as { moves: readonly number[] };
  const sub = m.moves.indexOf(164), body = m.moves.findIndex((id) => wanted.has(id));
  if (sub >= 0 && body >= 0) out.push({ seed, streak, species: g.rentals[0]!.speciesName, moves: m.moves, sub, body });
}
console.log(JSON.stringify(out));
