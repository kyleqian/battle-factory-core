// Find ordinary generated-rental routes where the move is the battle's FIRST move-animation body (player first) with
// the live adapter active every age (provider consumers need a known order, which only the first body receives).
//   node --experimental-strip-types tools/integration/orderConsumerRouteScan.ts <MOVE> <moveId> [maxHits]
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const [name, idText, maxText] = process.argv.slice(2);
const id = Number(idText);
const max = Number(maxText ?? 1);
let hits = 0;
for (let seed = 0; seed < 10000 && hits < max; seed++) {
  for (let streak = 0; streak <= 42 && hits < max; streak += 7) {
    const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
    const m = createFactoryCorpusPartyMember(g.rentals[0]!) as any;
    const move = (m.moves as number[]).indexOf(id);
    if (move < 0) continue;
    try {
      const on = generatedCommandAnimationReplay(seed, "on", [move as 0 | 1 | 2 | 3], streak);
      const first = on.commands.find(row => row.type === "move-animation");
      const firstId = (first?.command as { animation?: { moveId: number } } | undefined)?.animation?.moveId;
      const body = on.animations.find(a => a.moveId === id && a.attacker === 0);
      const row = { name, seed, streak, move, species: g.rentals[0]!.speciesName, firstId, order: first?.spriteOrderInput !== undefined,
        ages: body?.ages.length ?? null, active: body?.adapterActive.every(Boolean) ?? null, requests: on.requests.map(q => [q.moveId, q.attacker]) };
      console.log(JSON.stringify(row));
      if (firstId === id && row.order && row.active && body!.ages.length === body!.adapterActive.length) hits++;
    } catch (e) { console.log(JSON.stringify({ name, seed, streak, move, error: String(e).slice(0, 120) })); }
  }
}
