// prep11: deeper slot-0 route search for a move whose prep11-routes.json candidate did not request it (Spider Web, Recycle).
//   node --experimental-strip-types tools/integration/prep11RouteSearch.ts <MOVE_ID> <maxReplays> [seedMax]  -> JSON lines of routes whose body was requested
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { prep7Replay } from "./prep7Replay.ts";
const id = Number(process.argv[2]), maxReplays = Number(process.argv[3]), seedMax = Number(process.argv[4] ?? 3000);
let replays = 0;
for (let seed = 0; seed < seedMax && replays < maxReplays; seed++) for (let streak = 0; streak <= 42 && replays < maxReplays; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const m = createFactoryCorpusPartyMember(g.rentals[0]!) as any;
  const idx = (m.moves as number[]).indexOf(id);
  if (idx < 0) continue;
  replays++;
  try {
    const rep = prep7Replay(seed, "on", [idx as 0 | 1 | 2 | 3], streak, true);
    const mine = rep.requests.filter((q: any) => q.moveId === id);
    console.log(JSON.stringify({ seed, streak, species: g.rentals[0]!.speciesName, slotIndex: idx, requested: mine.length, first: rep.requests[0]?.moveId === id,
      orderKnown: (mine[0] as any)?.orderInput?.known ?? null, attacker: (mine[0] as any)?.attacker ?? null, turn: (mine[0] as any)?.turn ?? null }));
  } catch (e) { console.log(JSON.stringify({ seed, streak, error: String(e).slice(0, 100) })); }
}
