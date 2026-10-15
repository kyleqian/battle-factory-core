// trn181 (docs/trn181-action-transition-on.md): a dense Scene ON ROM window around one action transition (the previous action's anchor
// print -> the draw-nothing pause -> the next action's "used" print) against production's own frames.
// ROM: trn181RomFrames.py (direct mGBA, the scenario with the ON profile) = every screen frame + the probe rows. Production: the
// kernel's presentation commands for the same species / moves (trn176Production, Scene ON; synthetic stats), each row rendered through
// renderBattleResolutionLiveView at (commandIndex, phaseElapsed). Alignment: production's "used" command first-glyph row (the first row
// whose message box differs from the row before) <-> --romUsed (the ROM frame whose message box first changes to the used print); the
// remaining offset is the anchor-end error (trn176Predict's residual), reported by the production/ROM first-glyph rows. Rects:
// box y 112..159, opponent sprite x 136..215 y 0..79, player sprite x 32..111 y 40..111, other = the rest (healthboxes: synthetic HP).
//   node --experimental-strip-types --no-warnings tools/integration/trn181DenseCompare.ts <rom.json> <rom.rgb.gz> <out.json> \
//     --player=PRIMEAPE:339 --opponent=ONIX:33 --playerFirst=1 --romUsed=451 [--romAnchor=351] [--bodies=player:10] [--anchor=<command index of the print>]  [--after=30]
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { trn176Production } from "./trn176Predict.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { battleResolutionCommandDuration, createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE } from "../../src/engine/liveBattlerX2History.ts";

const [romJson, romRgb, outPath] = process.argv.slice(2, 5) as [string, string, string];
const arg = (n: string, d?: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const [pSp, pMv] = arg("player")!.split(":"), [oSp, oMv] = arg("opponent")!.split(":");
const playerFirst = arg("playerFirst", "1") === "1";
const romUsed = Number(arg("romUsed")), after = Number(arg("after", "19"));
const W = 240, H = 160, FS = W * H * 3;
const rom = gunzipSync(readFileSync(romRgb));
const probe = JSON.parse(readFileSync(romJson, "utf8"));
const prod = trn176Production(pSp, Number(pMv), oSp, Number(oMv), playerFirst, "on");
const commands = prod.commands as any[];
const fb = new Uint8Array(W * H * 4);
// the tracked x2 history (rst139): the bodies before the transition, ROM order (--bodies=player:10,...)
let history = LIVE_BATTLER_X2_IDLE;
for (const b of (arg("bodies", "") ?? "").split(",").filter(Boolean)) {
  const [side, moveId] = b.split(":");
  history = applyLiveBattlerX2Event(history, { kind: "move-body", moveId: Number(moveId), attackerSide: side as "player" | "opponent" });
}

const render = (commandIndex: number, phaseElapsed: number) => {
  const state = {
    field: prod.field, segments: [{ field: prod.field, beforeRules: prod.beforeRules, afterRules: prod.afterRules, events: prod.events, commands }],
    segmentIndex: 0, commandIndex, lifecycle: { phase: "presenting", phaseElapsed },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0, liveOrdinaryBattlerX2History: history,
  };
  fb.fill(0);
  renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(state as never));
  return Uint8Array.from(fb);
};
// production timeline rows: [command index, elapsed] for every presented row
const timeline: [number, number][] = [];
commands.forEach((c, k) => { const d = battleResolutionCommandDuration(c, prod.field); for (let e = 0; e < d; e++) timeline.push([k, e]); });
// the used print: the message after the pause
const pauseIndex = commands.findIndex((c) => c.type === "move-animation" && !c.animation && c.actionTransition);
if (pauseIndex < 0) throw new Error("no action-transition pause in the production commands");
const usedIndex = commands.findIndex((c, k) => k > pauseIndex && c.type === "message" && c.lines.join("\n").includes(" used\n"));
const anchorIndex = arg("anchor") !== undefined ? Number(arg("anchor")) : pauseIndex - 1;
const rgbaAt = (fbuf: Uint8Array, x: number, y: number) => (y * W + x) * 4;
const regionOf = (x: number, y: number) => y >= 112 ? "box" : x >= 136 && x < 216 && y < 80 ? "opp" : x >= 32 && x < 112 && y >= 40 ? "ply" : "other";
const diff = (f: Uint8Array, romFrame: number) => {
  const r = { box: 0, opp: 0, ply: 0, other: 0 };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = rgbaAt(f, x, y), j = romFrame * FS + (y * W + x) * 3;
    if (f[i] !== rom[j] || f[i + 1] !== rom[j + 1] || f[i + 2] !== rom[j + 2]) r[regionOf(x, y)]++;
  }
  return r;
};
const boxChanged = (a: Uint8Array, b: Uint8Array) => { let n = 0; for (let y = 112; y < H; y++) for (let x = 0; x < W; x++) { const i = rgbaAt(a, x, y); if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; } return n; };
// production first-glyph row of the used print
const cache = new Map<number, Uint8Array>();
const frameOf = (t: number) => { let f = cache.get(t); if (!f) { f = render(timeline[t]![0], timeline[t]![1]); cache.set(t, f); } return f; };
const usedStart = timeline.findIndex(([k]) => k === usedIndex);
let prodUsed = -1;
for (let t = usedStart; t < timeline.length; t++) if (boxChanged(frameOf(t), frameOf(t - 1)) >= 500) { prodUsed = t; break; }
if (prodUsed < 0) throw new Error("no first-glyph row for the used print");
const anchorStart = timeline.findIndex(([k]) => k === anchorIndex);
let prodAnchor = -1;
for (let t = anchorStart; t < usedStart; t++) if (boxChanged(frameOf(t), frameOf(t - 1)) >= 500) { prodAnchor = t; break; }
// ROM: the first-glyph spikes (box change >= 500 px)
const romBoxDiff = (f: number) => { let n = 0; for (let y = 112; y < H; y++) for (let x = 0; x < W; x++) { const j = (y * W + x) * 3; for (let c = 0; c < 3; c++) if (rom[f * FS + j + c] !== rom[(f - 1) * FS + j + c]) { n++; break; } } return n; };
const romSpikes: number[] = [];
for (let f = 1; f < probe.rows.length; f++) if (romBoxDiff(f) >= 500) romSpikes.push(f);

const rows: any[] = [];
const total = { box: 0, opp: 0, ply: 0, other: 0 }; let zero = 0, zeroNoOther = 0;
const before = arg("before") !== undefined ? Number(arg("before")) : prodUsed - anchorStart; // default: from the anchor command's first row
for (let dt = -before; dt <= after; dt++) {
  const t = prodUsed + dt, f = romUsed + dt;
  if (t < 0 || t >= timeline.length || f < 1 || f >= probe.rows.length) continue;
  const d = diff(frameOf(t), f);
  const [k, e] = timeline[t]!;
  rows.push({ dt, rom: f, command: k, type: commands[k].type + (k === pauseIndex ? "(pause)" : ""), elapsed: e, ...d });
  for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += d[key];
  if (d.box + d.opp + d.ply + d.other === 0) zero++;
  if (d.box + d.opp + d.ply === 0) zeroNoOther++;
}
// the anchor print's reveal rows compared with the ROM one row later (a pure 1-row shift of the text start)
const shiftedAnchor = { rows: 0, box: 0, exactRows: 0 };
for (let dt = -before; dt <= after; dt++) {
  const t = prodUsed + dt, f = romUsed + dt + 1;
  if (t < 0 || t >= timeline.length || f < 1 || f >= probe.rows.length || timeline[t]![0] !== anchorIndex) continue;
  const d = diff(frameOf(t), f);
  shiftedAnchor.rows++; shiftedAnchor.box += d.box; if (d.box === 0) shiftedAnchor.exactRows++;
}
const groups = (pred: (r: any) => boolean) => {
  const sel = rows.filter(pred);
  return { rows: sel.length, box: sel.reduce((a, r) => a + r.box, 0), opp: sel.reduce((a, r) => a + r.opp, 0), ply: sel.reduce((a, r) => a + r.ply, 0),
    other: sel.reduce((a, r) => a + r.other, 0), exactRows: sel.filter((r) => r.box + r.opp + r.ply === 0).length };
};
const out = {
  schema: "trn181-dense/v1", player: arg("player"), opponent: arg("opponent"), romUsed, romSpikes, prodAnchorRow: prodAnchor, prodUsedRow: prodUsed,
  commands: commands.slice(anchorIndex - 1, usedIndex + 1).map((c, i) => ({ index: anchorIndex - 1 + i, type: c.type, frames: battleResolutionCommandDuration(c, prod.field), actionTransition: c.actionTransition ?? false })),
  pauseFrames: commands[pauseIndex].timing.minimumFrames, prodAnchorToUsedRows: prodUsed - prodAnchor,
  window: { from: -before, to: after, rows: rows.length, totalPx: total, allRegionsExactRows: zero, spriteAndBoxExactRows: zeroNoOther },
  gap: groups((r) => r.type.includes("(pause)") || r.type === "sprite-visibility"),
  anchorPrint: groups((r) => r.command === anchorIndex), anchorPrintRomShiftedOneRow: shiftedAnchor, usedPrint: groups((r) => r.command === usedIndex),
  rows,
};
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ ...out, rows: undefined }, null, 1));
