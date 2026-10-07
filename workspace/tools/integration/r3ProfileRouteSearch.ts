// r3 profile batch: first generated-rental routes (prep11 §4 recipe: rentals[0] knows the move, seeds ascending, streak 0..42 step 7)
// whose ordinary input reaches the move's live body.  Never picks by live output.
//   node --experimental-strip-types tools/integration/r3ProfileRouteSearch.ts <moveId> [maxCandidates] [turns] [maxSeed]
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const moveId = Number(process.argv[2]);
const maxCandidates = Number(process.argv[3] ?? 6);
const turns = Number(process.argv[4] ?? 2);
const maxSeed = Number(process.argv[5] ?? 3000);
const out: unknown[] = [];
let tried = 0;
for (let seed = 0; seed < maxSeed && tried < maxCandidates; seed++) for (let streak = 0; streak <= 42 && tried < maxCandidates; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const m = createFactoryCorpusPartyMember(g.rentals[0]!) as { moves: readonly number[] };
  const slot = m.moves.indexOf(moveId);
  if (slot < 0) continue;
  tried++;
  try {
    const run = generatedCommandAnimationReplay(seed, "on", Array(turns).fill(slot), streak);
    const bodies = run.animations.filter((a) => a.moveId === moveId);
    out.push({ seed, streak, slot, species: g.rentals[0]!.speciesName, stalled: run.stalled,
      prompt: run.state.battleCommandPresentation?.lifecycle.phase,
      bodies: bodies.map((b) => ({ attacker: b.attacker, ages: b.ages.length, active: b.adapterActive.every(Boolean) })) });
  } catch (error) {
    out.push({ seed, streak, slot, species: g.rentals[0]!.speciesName, error: String(error).slice(0, 200) });
  }
}
console.log(JSON.stringify(out));
