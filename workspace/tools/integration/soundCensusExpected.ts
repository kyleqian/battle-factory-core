// aud243a: the resolved move-animation SE rows of the aud242 table for the (move, turn, attacker, target) keys of a census arm, for soundCensusDelta.py --t1.
//   node --experimental-strip-types --no-warnings tools/integration/soundCensusExpected.ts <keys.json: [[move, turn, attacker, target]...]> <out.json>
// Out: { "move,turn,attacker,target": { rows: [[offset from script frame 0, kind, id, pan, task 0|1]...], gated, ends } | null } using the table's own variant walk (moveAnimOpRows
// with the request's attacker / target sides), independently of the age clock emitMoveAnimSounds runs on. Frame of a row = (frame of body age 0) + 8 + offset (1 + 7, moveAnimSounds.ts).
import { readFileSync, writeFileSync } from "node:fs";
import timing from "../../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { moveAnimOpRows } from "../../src/engine/moveAnimSounds.ts";

const keys: number[][] = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const out: Record<string, unknown> = {};
for (const [move, turn, attacker, target] of keys) {
  const entry = (timing as any).moves[move!];
  if (entry === undefined) { out[`${move},${turn},${attacker},${target}`] = null; continue; }
  const turnIndex = turn! < timing.turns ? turn! : timing.turns - 2 + (turn! & 1);
  const slot = turnIndex * timing.sides + (attacker === 0 ? 0 : 1);
  const context = { attackerSide: attacker === 0 ? "player" : "opponent", targetSide: target === 0 ? "player" : "opponent" } as const;
  const rows: unknown[] = [];
  for (const op of (timing as any).variants[entry.variants[slot]]) {
    for (const row of moveAnimOpRows(op, context)) rows.push([op.frame + row.offset, row.emission.kind, row.emission.id, row.emission.pan, row.task === true ? 1 : 0]);
  }
  out[`${move},${turn},${attacker},${target}`] = { rows, gated: entry.gated[slot], ends: entry.ends[slot] };
}
writeFileSync(process.argv[3]!, JSON.stringify(out));
