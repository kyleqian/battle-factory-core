// aud118: census exposure of the Struggle-target x2 defect (docs/aud118-live-audit-26.md) from a census commands file (ret88Census.sh
// shards -> <dir>/merged.jsonl, battles in command order). The x2 tracker's fallback marks a Struggle 165 TARGET "zeroed", but
// Move_STRUGGLE shakes it only with the relative AnimTask_ShakeMonInPlace, so a target whose species front idle rest is non-zero (opponent
// ONIX / RATTATA; every player back rest is 0) keeps its rest in the ROM. Exposed = every later move command of the same battle that
// involves that opponent (its attacker on the opponent side, its target on the player side) before the opponent's species changes
// (a send-in resets the tracker to idle) or until a command whose tracker class for that opponent is not `keep` (production's
// liveBattlerX2MoveRoleClass: zeroed -> the ROM is zeroed too, unknown -> consumers keep the rest = the ROM): that command is still
// exposed (its input is the wrong one), the later ones are not. Live exposed commands are the ones that render with the wrong x2.
//   node --experimental-strip-types --no-warnings tools/integration/aud118Exposure.ts <merged.jsonl>
import { readFileSync } from "node:fs";
import { speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";
import { liveBattlerX2MoveRoleClass } from "../../src/engine/liveBattlerX2History.ts";

const rows = readFileSync(process.argv[2]!, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.kind === "move");
const rest = (s: string) => { const o = speciesFrontIdleRestOffsetOrZero(s.replace(/ /g, "_")); return o.x2 !== 0 || o.y2 !== 0; };
const opp = (r: any) => (r.side === "opponent" ? r.attacker : r.target) as string;
const struggles = rows.filter((r) => r.moveId === 165);
const trigger: any[] = [], exposed: any[] = [];
let armed: { battle: number; species: string } | null = null;
for (const r of rows) {
  if (armed && (r.battle !== armed.battle || opp(r) !== armed.species)) armed = null;
  if (armed) {
    exposed.push(r);
    if (liveBattlerX2MoveRoleClass(r.moveId, r.side === "opponent" ? "attacker" : "target") !== "keep") armed = null;
  }
  if (r.moveId === 165 && r.side === "player" && rest(r.target)) { trigger.push(r); armed = { battle: r.battle, species: r.target }; }
}
const count = (xs: string[]) => Object.fromEntries([...new Set(xs)].sort().map((k) => [k, xs.filter((x) => x === k).length]));
console.log(JSON.stringify({
  commands: rows.length,
  struggle: { total: struggles.length, live: struggles.filter((r) => r.status === "live").length,
    playerOntoOpponentWithNonzeroRest: trigger.length, triggerBattles: [...new Set(trigger.map((r) => r.battle))],
    triggerTargets: count(trigger.map((r) => r.target)) },
  exposedLaterCommands: { total: exposed.length, live: exposed.filter((r) => r.status === "live").length,
    byMove: count(exposed.map((r) => `${r.move}:${r.status}`)) },
}, null, 1));
