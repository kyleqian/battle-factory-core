// phy1m: rank the move bodies of a liveShareCensus --commands jsonl by presented count / frames, with their adapter / lead-audit status.
// node --experimental-strip-types --no-warnings tools/integration/phy1mRank.ts <enum.json> <c0.jsonl> [c1.jsonl ...]
import { readFileSync } from "node:fs";
import { BODY_LEAD_AUDITED_MOVE_IDS, HPD8_SHAPE_A_MOVE_IDS } from "../../src/engine/battleResolutionPresentation.ts";
const [enumPath, ...files] = process.argv.slice(2);
const en = JSON.parse(readFileSync(enumPath!, "utf8")) as { id: number; name: string; weightPct: number; caseMissingPlayer: boolean }[];
const byId = new Map(en.map((e) => [e.id, e]));
const rows = new Map<number, { n: number; live: number; frames: number; player: number; opp: number }>();
let total = 0, noReq = 0;
for (const f of files) for (const line of readFileSync(f!, "utf8").split("\n")) {
  if (!line) continue;
  const r = JSON.parse(line) as { kind: string; moveId: number; side: string; status: string; frames: number };
  if (r.moveId === -1) { noReq += 1; continue; }
  total += 1;
  const x = rows.get(r.moveId) ?? { n: 0, live: 0, frames: 0, player: 0, opp: 0 };
  x.n += 1; x.frames += r.frames; if (r.status === "live") x.live += 1; if (r.side === "player") x.player += 1; else x.opp += 1;
  rows.set(r.moveId, x);
}
const out = [...rows.entries()].map(([id, x]) => ({ id, name: byId.get(id)?.name ?? `#${id}`, ...x,
  audited: BODY_LEAD_AUDITED_MOVE_IDS.has(id), shapeA: HPD8_SHAPE_A_MOVE_IDS.has(id) })).sort((a, b) => b.n - a.n);
console.log(JSON.stringify({ requestCommands: total, noRequestCommands: noReq, moves: out }, null, 1));
