// prep8: opponent-attacker ordinary routes: for generated seeds the player presses its slot-0 move once; records runs whose FIRST move request is an opponent (attacker 1) request for one of the
// ten allocator-plan-v2 moves, with the order-input known bit (first-body provider validity) and the displayed field. Opponent-orientation proofs.
//   FROM=0 TO=800 BUDGET_S=100 node --experimental-strip-types tools/integration/prep8OpponentRouteScan.ts > tools/integration/fixtures/prep8-opponent-routes-<from>.json
import { prep7Replay as prep8Replay } from "./prep7Replay.ts"; // prep7Replay.ts reused unmodified
const IDS: Record<number, string> = { 129: "SWIFT", 271: "TRICK", 85: "THUNDERBOLT", 218: "FRUSTRATION", 32: "HORN_DRILL", 69: "SEISMIC_TOSS", 62: "AURORA_BEAM", 254: "STOCKPILE", 253: "UPROAR", 192: "ZAP_CANNON" };
const FROM = Number(process.env.FROM ?? 0), TO = Number(process.env.TO ?? 800), BUDGET = Number(process.env.BUDGET_S ?? 100) * 1000, STREAK = Number(process.env.STREAK ?? 0);
const t0 = Date.now(); const out: any = { schema: "prep8-opponent-route-scan/v1", from: FROM, to: TO, streak: STREAK, probedSeeds: 0, last: FROM, hits: [] as any[], counts: {} as Record<string, number> };
for (let seed = FROM; seed < TO; seed++) {
  if (Date.now() - t0 > BUDGET) break;
  out.probedSeeds++; out.last = seed;
  try {
    const rep = prep8Replay(seed, "on", [0], STREAK, true);
    const q: any = rep.requests.find((r: any) => r.attacker === 1 && IDS[r.moveId]);
    if (!q) continue;
    const firstBody = rep.requests[0] === q;
    out.counts[IDS[q.moveId]] = (out.counts[IDS[q.moveId]] ?? 0) + 1;
    out.hits.push({ seed, move: IDS[q.moveId], firstBody, orderInputKnown: q.orderInput?.known ?? false, frame: q.frame, turn: q.turn, field: q.field, previous: rep.requests.slice(0, 3).map((r: any) => [r.moveId, r.attacker]) });
  } catch (e) { /* stall: skip */ }
}
out.elapsedSeconds = Math.round((Date.now() - t0) / 1000);
console.log(JSON.stringify(out));
