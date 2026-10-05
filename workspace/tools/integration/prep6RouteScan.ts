// prep6: find ordinary generated-rental routes (slot-0 mon knows the move) where the move's MOVE_ANIMATION body is actually requested for attacker 0
// (accuracy misses / faints before the move emit none). node --experimental-strip-types tools/integration/prep6RouteScan.ts <MOVE> <moveId> [maxHits]
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { prep6Replay } from "./prep6Replay.ts";
const [name, idText, maxText] = process.argv.slice(2);
const id = Number(idText), max = Number(maxText ?? 3), STREAK_MAX = Number(process.env.STREAK_MAX ?? 42);
let hits = 0;
for (let seed = 0; seed < 10000 && hits < max; seed++) for (let streak = 0; streak <= STREAK_MAX && hits < max; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const m = createFactoryCorpusPartyMember(g.rentals[0]!) as any;
  const idx = (m.moves as number[]).indexOf(id); if (idx < 0) continue; if (process.env.SPECIES && g.rentals[0]!.speciesName !== `SPECIES_${process.env.SPECIES}`) continue;
  try {
    const rep = prep6Replay(seed, "on", [idx as 0 | 1 | 2 | 3], streak, true);
    const q = rep.requests.find((r) => r.moveId === id && r.attacker === 0);
    console.log(JSON.stringify({ name, seed, streak, idx, species: g.rentals[0]!.speciesName, setId: g.rentals[0]!.setId, requested: !!q, frame: q?.frame, field: q?.field, all: rep.requests.map((r) => [r.moveId, r.attacker]) }));
    if (q) hits++;
  } catch (e) { console.log(JSON.stringify({ name, seed, streak, error: String(e).slice(0, 100) })); }
}
