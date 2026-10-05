// prep6: replays each prep6 route (prep6-routes.json, accepted-species else first) through the ordinary command path with the move in its slot and records
// the MOVE_ANIMATION request + displayed field at the event (HP presentation-only inputs: SELF_DESTRUCT displayed attacker HP, SWALLOW stockpile counter).
//   node --experimental-strip-types tools/integration/prep6RouteProbe.ts > tools/integration/fixtures/prep6-route-probe.json
import { readFileSync } from "node:fs";
import { prep6Replay } from "./prep6Replay.ts";
const routes = JSON.parse(readFileSync("tools/integration/fixtures/prep6-routes.json", "utf8")).routes as Record<string, any[]>;
const ID: Record<string, number> = { SELF_DESTRUCT: 120, DOUBLE_TEAM: 104, FAINT_ATTACK: 185, ROCK_TOMB: 317, PAIN_SPLIT: 220, DRAGON_DANCE: 349, SAFEGUARD: 219, SWEET_SCENT: 230, FIRE_BLAST: 126, SWALLOW: 256, KNOCK_OFF: 282 };
const only = process.argv[2];
const out: any[] = [];
for (const [move, list] of Object.entries(routes)) {
  if (only && move !== only) continue;
  for (const r of list) {
    const idx = r.moves.indexOf(ID[move]);
    try {
      const rep = prep6Replay(r.seed, "on", [idx as 0 | 1 | 2 | 3], r.streak, true);
      const req = rep.requests.filter((q) => q.moveId === ID[move]);
      out.push({ move, kind: r.kind, seed: r.seed, streak: r.streak, species: r.species, slotIndex: idx, requests: req.map((q) => ({ moveId: q.moveId, attacker: q.attacker, target: (q as any).target, turn: (q as any).turn, frame: q.frame, field: q.field, keys: Object.keys(q) })),
        allRequests: rep.requests.map((q) => [q.moveId, q.attacker, q.frame]) });
    } catch (e) { out.push({ move, kind: r.kind, seed: r.seed, streak: r.streak, error: String(e).slice(0, 200) }); }
  }
}
console.log(JSON.stringify(out, null, 1));
