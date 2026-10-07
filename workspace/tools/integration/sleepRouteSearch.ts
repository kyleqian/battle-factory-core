// Sleep-target route search (S10A Nightmare): first generated-rental routes (r3ProfileRouteSearch.ts recipe: seeds ascending, streak 0..42 step 7)
// whose rentals[0] knows <moveId> AND a sleep-inducing move (Hypnosis 95, Lovely Kiss 142, Sleep Powder 79, Sing 47, Spore 147, Grass Whistle 320);
// ordinary input: turn 1 the sleep move, turns 2.. the move. Reports every candidate; never picks by live output.
//   node --experimental-strip-types tools/integration/sleepRouteSearch.ts <moveId> [maxCandidates] [moveTurns] [maxSeed]
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const SLEEP_MOVES = [95, 142, 79, 47, 147, 320];
const moveId = Number(process.argv[2]);
const maxCandidates = Number(process.argv[3] ?? 6);
const moveTurns = Number(process.argv[4] ?? 1);
const maxSeed = Number(process.argv[5] ?? 3000);
const out: unknown[] = [];
let tried = 0;
for (let seed = 0; seed < maxSeed && tried < maxCandidates; seed++) for (let streak = 0; streak <= 42 && tried < maxCandidates; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const m = createFactoryCorpusPartyMember(g.rentals[0]!) as { moves: readonly number[] };
  const slot = m.moves.indexOf(moveId);
  const sleepSlot = m.moves.findIndex((move) => SLEEP_MOVES.includes(move));
  if (slot < 0 || sleepSlot < 0) continue;
  tried++;
  const slots = [sleepSlot, ...Array(moveTurns).fill(slot)] as (0 | 1 | 2 | 3)[];
  try {
    const run = generatedCommandAnimationReplay(seed, "on", slots, streak);
    const bodies = run.animations.filter((a) => a.moveId === moveId || SLEEP_MOVES.includes(a.moveId));
    out.push({ seed, streak, slots, species: g.rentals[0]!.speciesName, stalled: run.stalled,
      prompt: run.state.battleCommandPresentation?.lifecycle.phase,
      bodies: bodies.map((b) => ({ moveId: b.moveId, attacker: b.attacker, ages: b.ages.length, active: b.adapterActive.every(Boolean) })) });
  } catch (error) {
    out.push({ seed, streak, slots, species: g.rentals[0]!.speciesName, error: String(error).slice(0, 200) });
  }
}
console.log(JSON.stringify(out));
