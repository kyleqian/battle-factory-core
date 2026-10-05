// prep9: replays generated-rental routes (prep9-routes.json) through the ordinary command path with the move in slot 0's move slot, one turn, and records the MOVE_ANIMATION requests
// (attacker, frame, displayed field at the event, order-input known flag = the production provider's first-body bit). Per move: candidate routes in file order (accepted species first,
// then each carrier's first route) until MAX_FIRST first-body hits (order consumers) / MAX_OK requests were found; every probed route is recorded.
//   node --experimental-strip-types tools/integration/prep9RouteProbe.ts [MOVE] > tools/integration/fixtures/prep9-route-probe.json
import { readFileSync } from "node:fs";
import { prep7Replay as prep9Replay } from "./prep7Replay.ts"; // prep7Replay.ts reused unmodified
const routes = JSON.parse(readFileSync("tools/integration/fixtures/prep9-routes.json", "utf8")).routes as Record<string, any[]>;
const ID: Record<string, number> = { ABSORB: 71, MEGA_DRAIN: 72, GIGA_DRAIN: 202, DREAM_EATER: 138, SUNNY_DAY: 241 };
const ORDER = new Set(["MEGA_DRAIN", "GIGA_DRAIN", "DREAM_EATER", "SUNNY_DAY"]);
const only = process.argv[2];
const MAX_CAND = Number(process.env.MAX_CAND ?? 14), MAX_HITS = Number(process.env.MAX_HITS ?? 4);
const out: any[] = [];
for (const [move, list] of Object.entries(routes)) {
  if (only && move !== only) continue;
  let hits = 0;
  for (const r of list.slice(0, MAX_CAND)) {
    if (hits >= MAX_HITS) break;
    const idx = r.moves.indexOf(ID[move]);
    try {
      const rep = prep9Replay(r.seed, "on", [idx as 0 | 1 | 2 | 3], r.streak, true);
      const all = rep.requests.map((q: any) => ({ moveId: q.moveId, attacker: q.attacker, turn: q.turn, frame: q.frame, orderInputKnown: q.orderInput?.known ?? false, orderFreeHead: q.orderInput?.freeHead }));
      const mine = rep.requests.filter((q: any) => q.moveId === ID[move]);
      const firstBody = rep.requests.length > 0 && rep.requests[0].moveId === ID[move];
      if (mine.length && (!ORDER.has(move) || (mine[0] as any).orderInput?.known)) hits++;
      out.push({ move, seed: r.seed, streak: r.streak, species: r.species, acceptedSpecies: r.acceptedSpecies, slotIndex: idx, setId: r.setId, moves: r.moves, requestedMove: mine.length > 0, firstBody, firstBodyOrderKnown: firstBody ? (mine[0] as any).orderInput?.known ?? false : null,
        moveRequest: mine[0] ? { attacker: (mine[0] as any).attacker, turn: (mine[0] as any).turn, frame: (mine[0] as any).frame, field: (mine[0] as any).field, orderInput: (mine[0] as any).orderInput } : null, allRequests: all.slice(0, 6) });
    } catch (e) { out.push({ move, seed: r.seed, streak: r.streak, species: r.species, error: String(e).slice(0, 200) }); }
  }
}
console.log(JSON.stringify(out, null, 1));
