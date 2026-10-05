// prep7: Sleep Talk needs a sleeping attacker. Scans ordinary generated-rental routes (slot-0 rental knows SLEEP_TALK 214) for a three-turn replay (the Sleep Talk slot pressed every turn) in which a MOVE_ANIMATION
// request for 214 appears, and records the next request (the called move: an ordinary second request like Metronome on master) + the displayed field (attacker status) at the Sleep Talk event.
//   BUDGET_S=240 node --experimental-strip-types tools/integration/prep7SleepTalkScan.ts > tools/integration/fixtures/prep7-sleep-talk-scan.json
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { prep7Replay } from "./prep7Replay.ts";
const t0 = Date.now(), BUDGET = Number(process.env.BUDGET_S ?? 240) * 1000, HITS = Number(process.env.HITS ?? 4);
const out: any = { schema: "prep7-sleep-talk-scan/v1", probed: 0, hits: [] as any[], misses: [] as any[] };
const seenSpecies = new Set<string>();
outer: for (let seed = 0; seed < 10000; seed++) for (let streak = 0; streak <= 42; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const rental = g.rentals[0]!; const m = createFactoryCorpusPartyMember(rental) as any;
  const idx = (m.moves as number[]).indexOf(214); if (idx < 0) continue;
  if (Date.now() - t0 > BUDGET) break outer;
  out.probed++;
  try {
    const rep = prep7Replay(seed, "on", [idx as 0, idx as 0, idx as 0], streak, true);
    const i = rep.requests.findIndex((q: any) => q.moveId === 214);
    if (i >= 0) {
      const q: any = rep.requests[i];
      out.hits.push({ seed, streak, species: rental.speciesName, setId: rental.setId, moves: m.moves, slotIndex: idx, sleepTalkRequest: { attacker: q.attacker, turn: q.turn, frame: q.frame, field: q.field, orderInput: q.orderInput },
        precedingRequests: rep.requests.slice(0, i).map((r: any) => [r.moveId, r.attacker]), followingRequests: rep.requests.slice(i + 1, i + 4).map((r: any) => ({ moveId: r.moveId, attacker: r.attacker, turn: r.turn })) });
      if (out.hits.length >= HITS) break outer;
    } else if (out.misses.length < 6) out.misses.push({ seed, streak, species: rental.speciesName, requests: rep.requests.map((r: any) => [r.moveId, r.attacker]).slice(0, 6) });
  } catch (e) { out.misses.push({ seed, streak, error: String(e).slice(0, 120) }); }
}
out.elapsedSeconds = Math.round((Date.now() - t0) / 1000);
console.log(JSON.stringify(out, null, 1));
