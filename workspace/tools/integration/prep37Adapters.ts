/**
 * prep37 item 3(b): which live move adapters draw the subbed battler while it is shown as the doll.
 * Source scan of every LIVE_MOVE_ANIMATION_IDS script (data/battle_anim_scripts.s Move_<NAME> up to `end`, following
 * `goto`/`call` targets once) for operations on the DEFENDER's sprite / palette:
 *   monbg / monbgprio_* / clearmonbg on ANIM_TARGET | ANIM_DEF_PARTNER | all-battler selectors (copies the sprite's CURRENT tiles = the doll),
 *   createvisualtask <task>, <prio>, ANIM_TARGET ... (sprite tasks act on gBattlerSpriteIds[target] = the doll),
 *   F_PAL_TARGET / F_PAL_DEF palette selectors (blend the defender's bank = gSubstituteDollPal), invisible ANIM_TARGET.
 * Every live renderer draws BOTH battlers from species art (liveMoveAnimation.ts:1049-1075 -> liveSceneOnBattlerArt), so
 * every adapter draws the wrong defender while the defender is a doll; the scan only splits the adapters whose
 * body leaves the defender sprite untouched ("doll-art swap candidate", still unproven) from those that animate it.
 * usage: npx vite-node tools/integration/prep37Adapters.ts --out=<receipt.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { LIVE_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveAnimation.ts";
import movesData from "../../src/data/gen/moves.json" with { type: "json" };

const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
if (!out) throw new Error("usage: prep37Adapters.ts --out=<receipt.json>");
const src = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8").split("\n");
const labelLine = new Map<string, number>();
src.forEach((line, i) => { const m = /^(\w+):/.exec(line); if (m) labelLine.set(m[1]!, i); });
function block(label: string, seen = new Set<string>()): string[] {
  if (seen.has(label)) return [];
  seen.add(label);
  const start = labelLine.get(label);
  if (start === undefined) return [];
  const lines: string[] = [];
  for (let i = start + 1; i < src.length; i += 1) {
    const line = src[i]!.replace(/@.*$/, "").trim();
    if (!line || /^\w+:$/.test(line)) continue; // fall through into the next label
    lines.push(line);
    const words = line.split(/[\s,]+/);
    for (const word of words.slice(1)) if (labelLine.has(word) && word !== label) lines.push(...block(word, seen));
    if (/^(end|return|goto)\b/.test(line)) break;
  }
  return lines;
}
const moves = (movesData as unknown as { moves: { id: number; move: string }[] }).moves;
const nameById = new Map(moves.map((m) => [m.id, m.move.replace(/^MOVE_/, "")]));
const DEF = /ANIM_TARGET|ANIM_DEF_PARTNER|MAX_BATTLERS_COUNT|ANIM_PLAYER_|ANIM_OPPONENT_/;
const rows = [...new Set(LIVE_MOVE_ANIMATION_IDS)].sort((a, b) => a - b).map((id) => {
  const name = nameById.get(id)!;
  const body = block(`Move_${name}`);
  if (!body.length) throw new Error(`no script for Move_${name}`);
  const ops = new Set<string>();
  for (const line of body) {
    if (/^(monbg|monbgprio_\w+|clearmonbg|invisible|setalpha_\w*)\b/.test(line) && DEF.test(line)) ops.add(line.split(/\s+/)[0]! + " target");
    const task = /^createvisualtask\s+(\w+),\s*\d+,\s*(.*)$/.exec(line);
    if (task && DEF.test(task[2]!.split(",")[0]!)) ops.add(`task ${task[1]} target`);
    if (/F_PAL_TARGET|F_PAL_DEF|F_PAL_ADJACENT|F_PAL_ALL_BUT|F_PAL_BATTLERS/.test(line)) ops.add("palette selector covers the defender");
  }
  return { id, name, defenderOps: [...ops].sort(), class: ops.size ? "animates-defender" : "doll-art-swap-candidate" };
});
const summary = { adapters: rows.length, animatesDefender: rows.filter((r) => r.class === "animates-defender").length,
  dollArtSwapCandidates: rows.filter((r) => r.class !== "animates-defender").map((r) => r.name) };
writeFileSync(out, JSON.stringify({ schema: "prep37-adapters/v1", summary, rows }, null, 1) + "\n");
console.log(JSON.stringify(summary));
