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
// command sequence around the two bodies (does production already hide the attacker between the charge and strike turns?)
for (const [m, id, seed, streak] of [["FLY", 19, 38, 7], ["BOUNCE", 340, 65, 7]] as const) {
  const r = routes[m].find((x: any) => x.seed === seed && x.streak === streak); const idx = r.moves.indexOf(id);
  const rep: any = prep7Replay(seed, "on", [idx, idx] as any, streak, true);
  console.log(m, rep.commands.map((c: any) => `${c.type}@${c.frame}${c.command.animation ? `[${c.command.animation.moveId}/t${c.command.animation.turn}]` : ""}${c.type === "sprite-visibility" ? JSON.stringify(c.command.visibility ?? c.command).slice(0, 70) : ""}`).slice(0, 26).join(" > "));
}
