// lsd194 (docs/lsd194-print-floor-and-drain.md): dense pixel window across the Leech Seed drain, production render vs the ROM's raw RGB (lsd186 scenario,
// sub183RomFrames.py direct mGBA dump). Window = the "was seeded!" print's first row .. the end of the "sapped by LEECH SEED!" print.
// Alignment: production row A (the first row after the "was seeded!" print) <-> ROM frame D - 10 (D = the drain's first instruction frame, rom-drain-runs.json).
// Regions: box y >= 112, opp sprite x 136..215 y 0..79, ply sprite x 32..111 y 40..111, other = the rest (healthboxes).
//   node --experimental-strip-types --no-warnings tools/integration/lsd194DrainDense.ts <rom-runs.json> <rom.json-name> <rom.rgb.gz> <out.json> --scene=on|off --side=player|opponent --seed=N --onixMove=33
import { readFileSync, writeFileSync } from "node:fs";
import { crc32, deflateSync, gunzipSync } from "node:zlib";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { battleResolutionCommandDuration, createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { LIVE_BATTLER_X2_IDLE, LIVE_BATTLER_X2_SCENE_OFF_INPUT } from "../../src/engine/liveBattlerX2History.ts";
import { lsd186Production } from "./lsd186Production.ts";

const arg = (n: string, d?: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const [runsPath, romName, romRgb, outPath] = process.argv.slice(2, 6) as [string, string, string, string];
const scene = arg("scene", "off") as "on" | "off", side = arg("side", "player") as "player" | "opponent";
const W = 240, H = 160, FS = W * H * 3;
const rom = gunzipSync(readFileSync(romRgb));
const D = (JSON.parse(readFileSync(runsPath, "utf8")) as Record<string, { D: number }[]>)[romName]![0]!.D;
const prod = lsd186Production({ scene, seederSide: side, seed: Number(arg("seed")), onixMove: Number(arg("onixMove", "33")) });
const commands = prod.commands as any[];
const fb = new Uint8Array(W * H * 4);
const render = (commandIndex: number, phaseElapsed: number) => {
  const state = {
    field: prod.field, segments: [{ field: prod.field, beforeRules: prod.beforeRules, afterRules: prod.afterRules, events: prod.events, commands }],
    segmentIndex: 0, commandIndex, lifecycle: { phase: "presenting", phaseElapsed },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0, liveOrdinaryBattlerX2History: LIVE_BATTLER_X2_IDLE,
    ...(scene === "off" && arg("x2") !== "idle" ? { liveMoveBattlerX2Input: LIVE_BATTLER_X2_SCENE_OFF_INPUT } : {}),
  };
  fb.fill(0);
  renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(state as never));
  return Uint8Array.from(fb);
};
const timeline: [number, number][] = [];
commands.forEach((c, k) => { const d = battleResolutionCommandDuration(c, prod.field); for (let e = 0; e < d; e++) timeline.push([k, e]); });
const seededIdx = commands.findIndex((c) => c.type === "message" && /seeded/.test(JSON.stringify(c.lines)));
const seededStart = timeline.findIndex(([k]) => k === seededIdx);
const A = timeline.findIndex(([k]) => k === seededIdx + 1);
const sappedIdx = commands.findIndex((c, k) => k > seededIdx && c.type === "message");
const endT = timeline.findIndex(([k]) => k === sappedIdx + 1);
const regionOf = (x: number, y: number) => y >= 112 ? "box" : x >= 136 && x < 216 && y < 80 ? "opp" : x >= 32 && x < 112 && y >= 40 ? "ply" : "other";
const diff = (f: Uint8Array, romFrame: number) => {
  const r = { box: 0, opp: 0, ply: 0, other: 0 };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, j = romFrame * FS + (y * W + x) * 3;
    if (f[i] !== rom[j] || f[i + 1] !== rom[j + 1] || f[i + 2] !== rom[j + 2]) r[regionOf(x, y)]++;
  }
  return r;
};
const romA = D - 10;
const rows: any[] = [];
for (let t = seededStart; t < endT; t++) {
  const f = romA + (t - A);
  if (f < 1 || (f + 1) * FS > rom.length) continue;
  const [k, e] = timeline[t]!;
  rows.push({ t: t - A, rom: f, command: k, type: commands[k].type, elapsed: e, ...diff(render(k, e), f) });
}
const sum = (sel: any[]) => ({ rows: sel.length, exactRows: sel.filter((r) => r.box + r.opp + r.ply + r.other === 0).length, box: sel.reduce((a, r) => a + r.box, 0),
  opp: sel.reduce((a, r) => a + r.opp, 0), ply: sel.reduce((a, r) => a + r.ply, 0), other: sel.reduce((a, r) => a + r.other, 0) });
const bySegment: Record<string, ReturnType<typeof sum>> = {};
for (const [name, pred] of [
  ["seededPrint", (r: any) => r.command === seededIdx], ["lead(sprite-visibility)", (r: any) => commands[r.command].type === "sprite-visibility"],
  ["animation(general-animation)", (r: any) => commands[r.command].type === "general-animation"], ["seededBar+gap(hp)", (r: any) => r.command > seededIdx && commands[r.command].type === "hp" && r.command === commands.findIndex((c, k) => k > seededIdx && c.type === "hp")],
  ["receiverBar(hp)", (r: any) => commands[r.command].type === "hp" && r.command !== commands.findIndex((c, k) => k > seededIdx && c.type === "hp")], ["sappedPrint", (r: any) => r.command === sappedIdx],
] as const) bySegment[name] = sum(rows.filter(pred));
const out = { schema: "lsd194-drain-dense/v1", scene, side, seed: arg("seed"), D, romA, window: { fromRowA: seededStart - A, toRowA: endT - 1 - A }, total: sum(rows), bySegment, rows };
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
console.log(scene, side, JSON.stringify({ window: out.window, total: out.total, bySegment }, null, 0));

// --dump=t,t,..: production | ROM side by side PNGs (t = row relative to A) at <out>.t<N>.png
const png = (w: number, h: number, rgb: Buffer) => {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const chunk = (type: string, data: Buffer) => { const b = Buffer.concat([Buffer.from(type), data]); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b) >>> 0); return Buffer.concat([len, b, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
for (const t of (arg("dump") ?? "").split(",").filter(Boolean).map(Number)) {
  const [k, e] = timeline[A + t]!; const p = render(k, e); const f = romA + t;
  const img = Buffer.alloc(480 * 160 * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) { img[(y * 480 + x) * 3 + c] = p[(y * W + x) * 4 + c]!; img[(y * 480 + 240 + x) * 3 + c] = rom[f * FS + (y * W + x) * 3 + c]!; }
  writeFileSync(`${outPath}.t${t}.png`, png(480, 160, img));
}
