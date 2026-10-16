// sub183 (docs/sub183-substitute-turn-timing.md): production vs the ROM across a whole Substitute turn (the "X used SUBSTITUTE!" print ->
// the body -> the HP bar -> "The SUBSTITUTE took damage" style print -> the next action's "used" print), one scene.
// ROM: sub183RomFrames.py (direct mGBA; frame rows + raw RGB). Production: the kernel's presentation commands for the same species / moves
// (sub183Production, Scene ON or OFF; the Substitute user's real HP so the HP bar's span is the ROM's), each row rendered through
// renderBattleResolutionLiveView at (commandIndex, phaseElapsed). Alignment: production's Substitute "used" first-glyph row <-> --romUsed.
// Rects: box y 112..159, opponent sprite x 136..215 y 0..79, player sprite x 32..111 y 40..111, other = the rest (healthboxes).
//   node --experimental-strip-types --no-warnings tools/integration/sub183Dense.ts <rom.json> <rom.rgb.gz> <out.json> --scene=on|off \
//     --side=player|opponent --attacker=PERSIAN:53:172 --other=SLOWBRO:80:202 --romUsed=43 [--after=290] [--bodies=...]
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { battleResolutionCommandDuration, createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { LIVE_BATTLER_X2_IDLE, LIVE_BATTLER_X2_SCENE_OFF_INPUT } from "../../src/engine/liveBattlerX2History.ts";
import { sub183Production } from "./sub183Production.ts";

const arg = (n: string, d?: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const [romJson, romRgb, outPath] = process.argv.slice(2, 5) as [string, string, string];
const scene = arg("scene", "on") as "on" | "off", side = arg("side", "opponent") as "player" | "opponent";
const [aName, aId, aHp] = arg("attacker")!.split(":"), [oName, oId, oHp] = arg("other")!.split(":");
const romUsed = Number(arg("romUsed")), after = Number(arg("after", "290"));
const W = 240, H = 160, FS = W * H * 3;
const rom = gunzipSync(readFileSync(romRgb));
const probe = JSON.parse(readFileSync(romJson, "utf8"));
const prod = sub183Production({ scene, side, attacker: { name: aName!, id: Number(aId), hp: Number(aHp) }, other: { name: oName!, id: Number(oId), hp: Number(oHp) } });
const commands = prod.commands as any[];
const fb = new Uint8Array(W * H * 4);
const render = (commandIndex: number, phaseElapsed: number) => {
  const state = {
    field: prod.field, segments: [{ field: prod.field, beforeRules: prod.beforeRules, afterRules: prod.afterRules, events: prod.events, commands }],
    segmentIndex: 0, commandIndex, lifecycle: { phase: "presenting", phaseElapsed },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0, liveOrdinaryBattlerX2History: LIVE_BATTLER_X2_IDLE,
    ...(scene === "off" ? { liveMoveBattlerX2Input: LIVE_BATTLER_X2_SCENE_OFF_INPUT } : {}),
  };
  fb.fill(0);
  renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(state as never));
  return Uint8Array.from(fb);
};
const timeline: [number, number][] = [];
commands.forEach((c, k) => { const d = battleResolutionCommandDuration(c, prod.field); for (let e = 0; e < d; e++) timeline.push([k, e]); });
const usedIndex = commands.findIndex((c) => c.type === "message" && c.lines.join("\n").includes("SUBSTITUTE!"));
if (usedIndex < 0) throw new Error("no Substitute used print");
const nextUsedIndex = commands.findIndex((c, k) => k > usedIndex && c.type === "message" && c.lines.join("\n").includes(" used\n"));
const rgbaAt = (x: number, y: number) => (y * W + x) * 4;
const regionOf = (x: number, y: number) => y >= 112 ? "box" : x >= 136 && x < 216 && y < 80 ? "opp" : x >= 32 && x < 112 && y >= 40 ? "ply" : "other";
const cache = new Map<number, Uint8Array>();
const frameOf = (t: number) => { let f = cache.get(t); if (!f) { f = render(timeline[t]![0], timeline[t]![1]); cache.set(t, f); } return f; };
const diff = (f: Uint8Array, romFrame: number) => {
  const r = { box: 0, opp: 0, ply: 0, other: 0 };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = rgbaAt(x, y), j = romFrame * FS + (y * W + x) * 3;
    if (f[i] !== rom[j] || f[i + 1] !== rom[j + 1] || f[i + 2] !== rom[j + 2]) r[regionOf(x, y)]++;
  }
  return r;
};
const boxChanged = (a: Uint8Array, b: Uint8Array) => { let n = 0; for (let y = 112; y < H; y++) for (let x = 0; x < W; x++) { const i = rgbaAt(x, y); if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; } return n; };
const usedStart = timeline.findIndex(([k]) => k === usedIndex);
// The turn's first command: its first row is the first glyph (msg175: L rows from the first glyph to the final one).
let prodUsed = usedStart === 0 ? 0 : -1;
for (let t = Math.max(usedStart, 1); prodUsed < 0 && t < timeline.length; t++) if (boxChanged(frameOf(t), frameOf(t - 1)) >= 500) { prodUsed = t; break; }
if (prodUsed < 0) throw new Error("no first-glyph row for the used print");
const romBoxDiff = (f: number) => { let n = 0; for (let y = 112; y < H; y++) for (let x = 0; x < W; x++) { const j = (y * W + x) * 3; for (let c = 0; c < 3; c++) if (rom[f * FS + j + c] !== rom[(f - 1) * FS + j + c]) { n++; break; } } return n; };
const romSpikes: number[] = [];
for (let f = 1; f < probe.rows.length; f++) if (romBoxDiff(f) >= 500) romSpikes.push(f);
// production first-glyph rows of every message command (relative to the used print's first glyph)
const prodSpikes: { command: number; dt: number }[] = [];
for (let t = Math.max(usedStart, 1); t < timeline.length; t++) {
  if (t - prodUsed > after) break;
  if (commands[timeline[t]![0]].type === "message" && timeline[t - 1]![0] !== timeline[t]![0]) prodSpikes.push({ command: timeline[t]![0], dt: t - prodUsed });
}
const bodyIndex = commands.findIndex((c, k) => k > usedIndex && c.type === "move-animation");
const hpIndex = commands.findIndex((c, k) => k > usedIndex && c.type === "hp");
const start = (k: number) => (k < 0 ? null : timeline.findIndex(([c]) => c === k) - prodUsed);
const rows: any[] = [];
const total = { box: 0, opp: 0, ply: 0, other: 0 }; let zero = 0;
for (let dt = -3; dt <= after; dt++) {
  const t = prodUsed + dt, f = romUsed + dt;
  if (t < 0 || t >= timeline.length || f < 1 || f >= probe.rows.length) continue;
  const d = diff(frameOf(t), f);
  const [k, e] = timeline[t]!;
  rows.push({ dt, rom: f, command: k, type: commands[k].type, elapsed: e, ...d });
  for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += d[key];
  if (d.box + d.opp + d.ply + d.other === 0) zero++;
}
const group = (pred: (r: any) => boolean) => {
  const sel = rows.filter(pred);
  const sum = (key: string) => sel.reduce((a, r) => a + r[key], 0);
  return { rows: sel.length, exactRows: sel.filter((r) => r.box + r.opp + r.ply + r.other === 0).length, box: sum("box"), opp: sum("opp"), ply: sum("ply"), other: sum("other") };
};
// Shift scan: for each command, the ROM offset (frame - production row) at which the command's rows match best.
const shiftScan = (index: number) => {
  const mine = rows.filter((r) => r.command === index).map((r) => r.dt);
  const res: Record<number, number> = {};
  for (let s = -8; s <= 12; s++) {
    let exact = 0;
    for (const dt of mine) { const t = prodUsed + dt, f = romUsed + dt + s; if (f < 1 || f >= probe.rows.length) continue; const d = diff(frameOf(t), f); if (d.box + d.opp + d.ply + d.other === 0) exact++; }
    res[s] = exact;
  }
  return res;
};
const out = {
  schema: "sub183-dense/v1", scene, side, attacker: arg("attacker"), other: arg("other"), romUsed, romSpikes: romSpikes.filter((f) => f >= romUsed - 3 && f <= romUsed + after).map((f) => f - romUsed),
  prodUsedRow: prodUsed, prodSpikes,
  commands: commands.slice(usedIndex, (nextUsedIndex < 0 ? commands.length : nextUsedIndex + 1)).map((c, i) => ({
    index: usedIndex + i, type: c.type, frames: battleResolutionCommandDuration(c, prod.field), start: start(usedIndex + i), moveId: c.animation?.moveId ?? null,
  })),
  bodyStart: start(bodyIndex), hpStart: start(hpIndex),
  window: { from: -3, to: after, rows: rows.length, totalPx: total, allRegionsExactRows: zero },
  used: group((r) => r.command === usedIndex), body: group((r) => r.command === bodyIndex), hp: group((r) => r.command === hpIndex),
  afterHp: group((r) => r.command > hpIndex && r.command < nextUsedIndex), nextUsed: group((r) => r.command === nextUsedIndex),
  shiftScan: { body: shiftScan(bodyIndex), hp: shiftScan(hpIndex) },
  rows,
};
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ ...out, rows: undefined }, null, 1));
