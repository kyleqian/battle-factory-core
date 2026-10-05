// Find ordinary generated-rental routes whose slot-0 mon reaches a hitting move body (attacker 0) for moves whose
// first-found prep4 route missed (Bind/Wrap accuracy < 100: a miss emits no animation body).
//   node --experimental-strip-types tools/integration/hbufferS1RouteScan.ts <MOVE> <moveId> [maxHits]
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const [name, idText, maxText] = process.argv.slice(2);
const id = Number(idText);
const max = Number(maxText ?? 3);
let hits = 0;
for (let seed = 0; seed < 10000 && hits < max; seed++) {
  for (let streak = 0; streak <= 42 && hits < max; streak += 7) {
    const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
    const m = createFactoryCorpusPartyMember(g.rentals[0]!) as any;
    const move = (m.moves as number[]).indexOf(id);
    if (move < 0) continue;
    try {
      const on = generatedCommandAnimationReplay(seed, "on", [move as 0 | 1 | 2 | 3], streak);
      const body = on.animations.find(a => a.moveId === id && a.attacker === 0);
      console.log(JSON.stringify({ name, seed, streak, move, species: g.rentals[0]!.speciesName, body: body ? body.ages.length : null,
        active: body?.adapterActive.every(Boolean) ?? null, others: on.animations.map(a => [a.moveId, a.attacker, a.ages.length]) }));
      if (body && body.adapterActive.every(Boolean)) hits++;
    } catch (e) { console.log(JSON.stringify({ name, seed, streak, move, error: String(e).slice(0, 120) })); }
  }
}
