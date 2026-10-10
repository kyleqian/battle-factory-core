// hide66: summarize hide66Census.ts --commands JSONL: the move bodies presented LIVE while the NON-attacker battler's sprite was hidden
// (view.visibility; the production semi-invulnerable hide), i.e. the live bodies that drew the hidden battler before hide66.
//   node tools/integration/hide66CensusSummary.mjs <commands.jsonl> [<label>]
import { readFileSync } from "node:fs";
const [path, label = path] = process.argv.slice(2);
const rows = readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const other = (c) => c.side === "player" ? 1 : 0;
const inSpan = rows.filter((c) => c.kind === "move" && c.visHidden?.[other(c)]);
const semiSpan = rows.filter((c) => c.kind === "move" && c.semiHidden?.[other(c)]);
const liveWrong = rows.filter((c) => (c.liveFramesOtherHidden ?? 0) > 0);
const drawing = rows.filter((c) => (c.framesDrawingHidden ?? 0) > 0);
const by = new Map();
for (const c of inSpan) {
  const k = `${c.move}|${c.side}|${c.status}`;
  const r = by.get(k) ?? { move: c.move, moveId: c.moveId, side: c.side, status: c.status, commands: 0, frames: 0, liveFramesOtherHidden: 0 };
  r.commands++; r.frames += c.frames; r.liveFramesOtherHidden += c.liveFramesOtherHidden ?? 0;
  r.framesDrawingHidden = (r.framesDrawingHidden ?? 0) + (c.framesDrawingHidden ?? 0);
  if (c.framesDrawingHidden) r.commandsDrawingHidden = (r.commandsDrawingHidden ?? 0) + 1;
  by.set(k, r);
}
const out = {
  label, commands: rows.length, battles: new Set(rows.map((c) => c.battle)).size,
  hiddenSpanBodies: { commands: inSpan.length, frames: inSpan.reduce((a, c) => a + c.frames, 0), semiInvulnerableHide: semiSpan.length },
  liveWhileOtherHidden: { commands: liveWrong.length, frames: liveWrong.reduce((a, c) => a + c.liveFramesOtherHidden, 0) },
  liveDrawingHidden: { commands: drawing.length, frames: drawing.reduce((a, c) => a + c.framesDrawingHidden, 0) },
  byMove: [...by.values()].sort((a, b) => b.liveFramesOtherHidden - a.liveFramesOtherHidden || b.commands - a.commands || a.move.localeCompare(b.move)),
};
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
