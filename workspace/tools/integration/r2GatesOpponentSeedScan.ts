// r2-gates: seeds (0 streak) whose FIRST opponent lead (party[0]) knows a move; cheap (no battle). Player lead = rentals[0].
//   node --experimental-strip-types --no-warnings tools/integration/r2GatesOpponentSeedScan.ts <from> <to> <moveId>
import { createFactoryRoundBattleOrchestrator } from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
const [from, to, id] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4])];
for (let seed = from; seed < to; seed++) {
  const s: any = createFactoryRoundBattleOrchestrator({ id: `x-${seed}`, rngValue: seed, battleScene: "on", factoryWinStreak: Number(process.env.STREAK ?? 0), playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] } } as any);
  const opp = s.round.presentation.command.opponent, rec = opp.rentalRecords as any[];
  const leadId = opp.party[0].id;
  rec.forEach((r, i) => { const m = createFactoryCorpusPartyMember(r) as any;
    if ((m.moves as number[]).includes(id)) console.log(JSON.stringify({ seed, idx: i, lead: i === 0, species: r.speciesName ?? opp.party[i].species, moves: m.moves, player: s.round.presentation.command.playerParty[0].species })); });
}
