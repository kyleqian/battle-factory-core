// btl188 (evidence only, ISSUES #167 (a') remainder): Scene ON stat / protect rows, ROM milestones vs production milestones, in one
// row coordinate c (c0 = the used print's last glyph row G; production frame f is c = f - (G - firstGlyph)). Read-only.
//   node --experimental-strip-types --no-warnings tools/integration/btl188Rows.ts
import { readFileSync } from "node:fs";
import { trn176Production } from "./trn176Predict.ts";
import { liveMoveUniversalRows, liveMoveIdleLeadRows } from "../../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";

const S: Record<string, number> = { PRIMEAPE: 57, SNORLAX: 143, ONIX: 95 };
const rom = JSON.parse(readFileSync("tools/integration/fixtures/off108/receipts/rom-r1.json", "utf8")).scenarios;
const index = JSON.parse(readFileSync("tools/integration/fixtures/off108/scenario-index.json", "utf8"));
const names = ["bulk-up-ply-primeape-onix", "protect-ply-primeape-onix", "detect-ply-primeape-onix", "sand-attack-ply-primeape-snorlax", "double-team-ply-primeape-onix"];

for (const short of names) {
  const name = `off108-${short}`; const meta = index[`${name}.json`];
  const use = rom[name].on[0]; const offset = use.G - use.openerFirstChange;
  const runs = use.runs as any[];
  const waits = runs.filter((r) => r[2] > 2 && r[6] > 0);
  const body = waits[0]; const dt = meta.move === 104; // Double Team: no stats-change command, the live window owns the banner (sc106), the next wait is the print's
  const next = dt ? waits[2] : waits[1];
  const release = body[1] + body[2] - 1;
  const p = trn176Production(meta.attacker, meta.move, meta.target, 33, true, "on");
  const c = (f: number) => f - offset;
  const prodRows = p.rows;
  const bodyIdx = prodRows.findIndex((_r, i) => (p.commands[i] as any).type === "move-animation" && (p.commands[i] as any).animation);
  const bodyRow = prodRows[bodyIdx]!; const bodyCmd = p.commands[bodyIdx] as any;
  const after = prodRows.slice(bodyIdx + 1).find((_r, i) => ["stats-change", "message"].includes((p.commands[bodyIdx + 1 + i] as any).type))!;
  const rowsU = liveMoveUniversalRows(bodyCmd.animation, p.field);
  const lead = liveMoveIdleLeadRows(bodyCmd.animation, p.field);
  const live = liveMoveAnimationDuration(bodyCmd.animation, p.field);
  const ev = p.events as any[];
  const a = ev.find((e) => e.payload.kind === "animation" && e.payload.animationId === "MOVE_ANIMATION")!.provenance.instructionExecution;
  const nEv = ev.find((e) => e.provenance?.instructionExecution > a && (e.payload.kind === "animation" || e.payload.kind === "message"))!;
  const n = nEv.provenance.instructionExecution;
  const romGlyph = next[5][0];
  const bodyEnd = c(bodyRow.start + bodyRow.frames);
  const statsChange = (p.commands[bodyIdx + 1] as any)?.type === "stats-change" || (p.commands[bodyIdx + 2] as any)?.type === "stats-change";
  const expectedNext = statsChange ? next[1] + 1 : romGlyph;
  const dtStatsChangeStart = dt ? waits[1][1] + 1 : null; // the same convention: where a stats-change command would start // stats-change command starts one row after the ROM's stat-animation wait run starts (OFF-exact convention)
  console.log([
    short,
    `ROM: attackanimation c${body[1] - 1}, waitanimation c${body[1]}..c${release} (${body[2]} rows), next controller wait c${next[1]} (${next[2]}), its first screen change c${romGlyph}${dt ? `; stat-anim wait c${waits[1][1]} (${waits[1][2]})` : ""}`,
    `prod: body c${c(bodyRow.start)}..c${bodyEnd - 1} (${bodyRow.frames} = pre ${rowsU.pre} + lead ${lead} + live ${live} + post ${rowsU.post}), next ${(after as any).type} at c${c(after.start)}`,
    `kernel: attackanimation ${a}, next emit ${nEv.payload.animationId ?? nEv.payload.messageId} ${n} (n-a ${n - a})`,
    `body end -> ROM release ${release - bodyEnd}; expected next c${expectedNext}; short ${expectedNext - c(after.start)}; formula (n-a)+1+(release-bodyEnd) = ${n - a + 1 + release - bodyEnd}${dt ? ` (a stats-change would start c${dtStatsChangeStart} = release c${release} + ${n - a} + 1 = c${release + n - a + 1}; the window owns that span)` : ""}`,
  ].join("\n  "));
}
