// r2-gates: seeds (0 streak) whose FIRST opponent lead (party[0]) knows a move; cheap (no battle). Player lead = rentals[0].
//   [PLAYER=1] [STREAK=n] node --experimental-strip-types --no-warnings tools/integration/r2GatesOpponentSeedScan.ts <from> <to> <moveId>
import { censusDeal, censusRentals } from "./censusRound.ts";
import { createFactoryRoundBattleOrchestrator } from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
const [from, to, id] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4])];
for (let seed = from; seed < to; seed++) {
  // fop1: the census battle of the seed (censusRound.ts)
  const deal = { seed, factoryWinStreak: Number(process.env.STREAK ?? 0) };
  const s: any = createFactoryRoundBattleOrchestrator({ id: `x-${seed}`, battleScene: "on", factoryWinStreak: deal.factoryWinStreak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, ...censusDeal(deal) } as any);
  const opp = s.round.presentation.command.opponent;
  // PLAYER=1: the player's three selected rentals (idx = party member = the move-slot pattern owner), else the opponent trainer's party.
  const rec = (process.env.PLAYER ? censusRentals(deal).rentals.slice(0, 3) : opp.rentalRecords) as any[];
  const leadId = opp.party[0].id;
  rec.forEach((r, i) => { const m = createFactoryCorpusPartyMember(r) as any;
    if ((m.moves as number[]).includes(id)) console.log(JSON.stringify({ seed, idx: i, lead: i === 0, species: r.speciesName ?? opp.party[i].species, moves: m.moves, player: s.round.presentation.command.playerParty[0].species })); });
}
