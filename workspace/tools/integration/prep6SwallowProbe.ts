// prep6: Swallow turn/stockpile plumbing on a real generated route: Stockpile xN then Swallow; prints the MOVE_ANIMATION requests (turn = animTurn = stockpile counter)
//   node --experimental-strip-types tools/integration/prep6SwallowProbe.ts > tools/integration/fixtures/prep6-swallow-probe.json
import { prep6Replay } from "./prep6Replay.ts";
const routes = [{ seed: 161, streak: 7, stock: 2, swallow: 3, species: "PELIPPER set 213" }, { seed: 33, streak: 7, stock: 0, swallow: 1, species: "SWALOT set 248" }];
const out: any[] = [];
for (const r of routes) for (const n of [1, 2, 3]) {
  try {
    const rep = prep6Replay(r.seed, "on", [...Array(n).fill(r.stock), r.swallow] as any, r.streak, true);
    out.push({ ...r, stockpileUses: n, requests: rep.requests.filter((q) => q.attacker === 0).map((q) => ({ moveId: q.moveId, turn: q.turn, frame: q.frame, hp: (q as any).field?.player.hp })) });
  } catch (e) { out.push({ ...r, stockpileUses: n, error: String(e).slice(0, 160) }); }
}
console.log(JSON.stringify(out, null, 1));
