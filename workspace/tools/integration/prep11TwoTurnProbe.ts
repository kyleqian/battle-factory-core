// prep11: two-turn moves (FLY 19, BOUNCE 340) through the ordinary command path for TWO turns: records the MOVE_ANIMATION requests (turn 0 charge / turn 1 strike).
//   node --experimental-strip-types tools/integration/prep11TwoTurnProbe.ts
import { readFileSync } from "node:fs";
import { prep7Replay } from "./prep7Replay.ts";
const routes = JSON.parse(readFileSync("tools/integration/fixtures/prep11-routes.json", "utf8")).routes;
for (const [m, id] of [["FLY", 19], ["BOUNCE", 340]] as const) for (const r of routes[m].slice(0, 4)) {
  const idx = r.moves.indexOf(id);
  try {
    const rep = prep7Replay(r.seed, "on", [idx, idx] as any, r.streak, true);
    console.log(m, r.seed, r.streak, r.species, JSON.stringify(rep.requests.slice(0, 6).map((q: any) => [q.moveId, q.attacker, q.turn, q.power, q.frame, q.orderInput?.known])));
  } catch (e) { console.log(m, r.seed, "ERR", String(e).slice(0, 100)); }
}
