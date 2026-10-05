// prep8: wider generated-rental route scan for the moves whose first route per species did not produce a move animation (accuracy-gated: Horn Drill 30%, Zap Cannon 50%) or no first body.
// Every (seed 0..9999, streak 0..42 step 7) route whose rentals[0] knows the move, in ascending order, replayed one turn with that move pressed (prep7Replay.ts reused unmodified), up to MAX_ROUTES per move.
//   node --experimental-strip-types tools/integration/prep8RouteScan.ts MOVE [MAX_ROUTES] > tools/integration/fixtures/prep8-route-scan-MOVE.json
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { prep7Replay } from "./prep7Replay.ts";
const ID: Record<string, number> = { SWIFT: 129, TRICK: 271, THUNDERBOLT: 85, FRUSTRATION: 218, HORN_DRILL: 32, SEISMIC_TOSS: 69, AURORA_BEAM: 62, STOCKPILE: 254, UPROAR: 253, ZAP_CANNON: 192 };
const move = process.argv[2]!, id = ID[move]!, MAX = Number(process.argv[3] ?? 120);
const out: any[] = []; let probed = 0;
outer: for (let seed = 0; seed < 10000; seed++) for (let streak = 0; streak <= 42; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const rental = g.rentals[0]!, m = createFactoryCorpusPartyMember(rental) as any, idx = (m.moves as readonly number[]).indexOf(id);
  if (idx < 0) continue;
  if (++probed > MAX) break outer;
  try {
    const rep = prep7Replay(seed, "on", [idx as 0 | 1 | 2 | 3], streak, true);
    const mine = rep.requests.filter((q: any) => q.moveId === id) as any[];
    out.push({ move, seed, streak, species: rental.speciesName, slotIndex: idx, moves: [...m.moves], requested: mine.length > 0, attacker: mine[0]?.attacker ?? null, frame: mine[0]?.frame ?? null,
      firstBody: rep.requests.length > 0 && (rep.requests[0] as any).moveId === id, orderInputKnown: mine[0]?.orderInput?.known ?? false, allRequests: rep.requests.slice(0, 4).map((q: any) => [q.moveId, q.attacker, q.frame]) });
  } catch (e) { out.push({ move, seed, streak, species: rental.speciesName, error: String(e).slice(0, 160) }); }
}
console.log(JSON.stringify({ schema: "prep8-route-scan/v1", move, probed: out.length, requested: out.filter((r) => r.requested).length, firstBodyKnown: out.filter((r) => r.requested && r.firstBody && r.orderInputKnown).length, routes: out }, null, 1));
