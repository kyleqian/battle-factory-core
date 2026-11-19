// bso225 (docs/bso225-player-back-send-out.md): snd182Compare.ts with the production segment's Scene mode switchable. Default = Scene ON
// (a fake `beforeRules` with hitMarker 0, so the player send-in draws the species back animation); `--before` = the pre-bso225 render
// (beforeRules null: the static back sprite). Per-row `mon` residual = player sprite region (x < 120, 48 <= y < 112) vs the ROM.
//   node --experimental-strip-types --no-warnings tools/integration/bso225Compare.ts <scenario.json> <rom-png-dir> <out.json> [--before] [--dump=t,..]
// snd182 (ISSUES #146; docs/snd182-scene-on-forced-player-send-in-live.md; plr162Compare.ts adapted to Scene ON): a Roar forced switch with the PLAYER as the target (opponent HOUNDOUR's
// Roar drags out the staged player party slot 1) rendered THROUGH THE PRODUCTION PATH (createBattleResolutionPresentationRenderView +
// renderBattleResolutionLiveView, offs152Compare.ts's method) from the pause's first frame through the "dragged out!" print, compared
// per row with a dense oracle window (snd182Stage.py: bin/oracle lab captures, Scene ON).
// Constructed segment = the commands production projects for a Scene OFF Roar on the player (pinned on census routes by
// tests/snd182PlayerForcedSendIn.test.ts): [used message (done), move-animation pause P = 41, switch-out (forced hold 4, target at rest),
// sprite-visibility (recall, gap 6), switch-in {battler 0, the staged species, its timing / slide / visual delay as production builds
// them}, next message]. Alignment: production's first send-in row that draws anything new (the thrown ball: elapsed 3 + visual
// delay) == the first ROM frame whose ball box equals production's. The OPPONENT half (x < 120, y < 48 and x >= 120, y < 64; the Tackle-damaged HP) is transplanted
// from the ROM; regions: `phb` the player healthbox (x >= 120, 64 <= y < 112), `mon` the player sprite / ball (x < 120, 48 <= y < 112),
// `msg` y >= 112.
//   node --experimental-strip-types --no-warnings tools/integration/snd182Compare.ts <scenario.json> <rom-png-dir> <out.json>
//     [--base]   (the pre-snd182 Scene ON player send-in: slide 66, 91 + 11)   [--slide=N] [--duration=N] [--visual-delay=N]  (controls)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import {
  FORCED_RETURN_TO_BALL_HOLD_FRAMES, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES, SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming,
} from "../../src/engine/battleResolutionPresentation.ts";
import { calculateMaxHp } from "../../src/engine/stats.ts";
import * as tail from "../../src/engine/switchInTail.ts";

const [scenarioPath, romDir, outPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (name: string) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a === undefined ? null : Number(a.split("=")[1]);
};
const base = process.argv.includes("--base");
const before = process.argv.includes("--before");
const sceneOnRules = Object.freeze({ rulesContext: Object.freeze({ hitMarker: 0 }) });
const stats = (id: number) => speciesStats.species.find((s) => s.id === id)!;
const name = (id: number) => stats(id).name.replace(/^SPECIES_/, "");

/** Minimal PNG decoder (8-bit RGB / RGBA, non-interlaced: the oracle's captures). */
function readPng(path: string): Uint8Array {
  const buf = readFileSync(path);
  let pos = 8; let width = 0; let height = 0; let colorType = 0; const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]!; }
    if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(width * height * 3); const stride = width * bpp; let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const f = raw[y * (stride + 1)]!; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)); const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? cur[i - bpp]! : 0; const b = prev[i]!; const c = i >= bpp ? prev[i - bpp]! : 0;
      const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
      cur[i] = (line[i]! + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
    }
    for (let x = 0; x < width; x += 1) for (let k = 0; k < 3; k += 1) out[(y * width + x) * 3 + k] = cur[x * bpp + k]!;
    prev = cur;
  }
  return out;
}

const scenario = JSON.parse(readFileSync(scenarioPath!, "utf8"));
const parties = scenario.overrides.parties;
const incomingMon = parties.player[1];
const species = incomingMon.species as number;
const mon = (b: 0 | 1, m: any, partyIndex: 0 | 1) => {
  const maxHP = calculateMaxHp(m.species, stats(m.species).baseHp, m.ivs.hp, m.evs.hp, m.level);
  return Object.freeze({
    species: m.species as number, name: name(m.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex, level: m.level as number, hp: maxHP, maxHP, gender: m.gender as "male" | "female", status: "none" as const,
    personality: (m.nature ?? 0) as number, moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
};
const field = Object.freeze({ player: mon(0, parties.player[0], 0), opponent: mon(1, parties.opponent[0], 0) });
const incoming = mon(0, incomingMon, 1);
const message = (seq: number, lines: string[]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
  noCursor: false, timing: { minimumFrames: 24, holdFrames: 0 } });
const slide = opt("slide") ?? (base ? null : tail.sceneOffPlayerForcedSwitchInHealthboxSlideElapsed(species));
const visualDelay = opt("visual-delay") ?? (base ? 0 : tail.sceneOffPlayerForcedSwitchInVisualDelay(species));
const nature = (incomingMon.nature ?? 0) as number;
const timing = opt("duration") !== null ? { minimumFrames: opt("duration")! - SWITCH_IN_WAITSTATE_HOLD_FRAMES }
  : switchInTiming(0, species, true, incoming.name, !base, nature);
const pause = 41;
const settleHoldFrames = SWITCH_IN_WAITSTATE_HOLD_FRAMES;
const duration = timing.minimumFrames + settleHoldFrames;
const commands = [
  message(1, [`Foe ${name(parties.opponent[0].species)} used`, "ROAR!"]),
  Object.freeze({ type: "move-animation", eventSequence: 2, battler: 1, timing: { minimumFrames: pause } }),
  Object.freeze({ type: "switch-out", eventSequence: 3, battler: 0, timing: { minimumFrames: FORCED_RETURN_TO_BALL_HOLD_FRAMES },
    skipAnimation: true, targetAtRest: true }),
  Object.freeze({ type: "sprite-visibility", eventSequence: 4, battler: 0, visible: false, recall: true,
    timing: { minimumFrames: FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES } }),
  Object.freeze({ type: "switch-in", eventSequence: 5, battler: 0, fromPartyIndex: 0, toPartyIndex: 1, incoming, incomingStatus1: 0,
    timing, settleHoldFrames, ...(slide === null ? {} : { healthboxSlideElapsed: slide }),
    ...(visualDelay === 0 ? {} : { sendInVisualDelay: visualDelay }) }),
  message(6, [`${name(species)} was`, "dragged out!"]),
];
const spans = commands.map((c: any) => c.type === "switch-in" ? duration : c.timing.minimumFrames);
const sendInT = spans.slice(1, commands.length - 2).reduce((s, x) => s + x, 0); // t of switch-in elapsed 0
const viewAt = (t: number) => {
  let index = 1; let e = t;
  while (index < commands.length - 1 && e >= spans[index]!) { e -= spans[index]!; index += 1; }
  return createBattleResolutionPresentationRenderView({
    field, segments: [{ field, beforeRules: before ? null : sceneOnRules, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex: index, lifecycle: { phase: "presenting", phaseElapsed: e },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
  } as never);
};
const draw = (t: number) => {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, viewAt(t));
  return fb;
};
if (process.env.BSO_PROBE) {
  for (let e = Number(process.env.BSO_PROBE_FROM ?? 0); e < (process.env.BSO_PROBE_TO ? Number(process.env.BSO_PROBE_TO) : duration); e += Number(process.env.BSO_PROBE_STEP ?? 8)) { const v = viewAt(sendInT + e) as any; const m = v.midBattleSwitchIn; console.log("probe e", e, "fade", JSON.stringify(v.midBattleSwitchFade), m === null ? "null" : JSON.stringify({ b: m.battler, el: m.elapsed, mv: m.monVisible, acc: m.emergeAccumulator, back: m.backAnim })); }
}
const frames = readdirSync(romDir!).filter((f) => /^frame-\d+\.png$/.test(f)).map((f) => Number(f.slice(6, -4))).sort((a, b) => a - b);
const rom = new Map(frames.map((f) => [f, readPng(`${romDir}/frame-${String(f).padStart(5, "0")}.png`)]));
// The thrown ball's box: the pixels that differ between production's first send-in frame drawing anything new and the frame before.
let ballT = sendInT + 1; let ball = draw(ballT); let prevFrame = draw(ballT - 1);
let x0 = 240; let y0 = 160; let x1 = -1; let y1 = -1;
for (; ballT < sendInT + 12 && x1 < 0; ballT += 1) {
  ball = draw(ballT); prevFrame = draw(ballT - 1);
  for (let y = 0; y < 112; y += 1) for (let x = 0; x < 240; x += 1) {
    const i = (y * 240 + x) * 4;
    if (ball[i] !== prevFrame[i] || ball[i + 1] !== prevFrame[i + 1] || ball[i + 2] !== prevFrame[i + 2]) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
}
ballT -= 1;
if (x1 < 0) throw new Error("production draws no ball in the send-in's first frames");
const boxEqual = (r: Uint8Array) => {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) for (let k = 0; k < 3; k += 1) {
    if (r[(y * 240 + x) * 3 + k] !== ball[(y * 240 + x) * 4 + k]) return false;
  }
  return true;
};
if (process.env.PLR162_DEBUG) console.log("ball", ballT - sendInT, x0, y0, x1, y1, frames.filter((f) => boxEqual(rom.get(f)!)).join(","));
const anchorFrame = frames.find((f) => boxEqual(rom.get(f)!) && !boxEqual(rom.get(f - 1) ?? new Uint8Array(240 * 160 * 3)));
if (anchorFrame === undefined) throw new Error("no ROM frame shows production's first ball frame");
const t0 = anchorFrame - ballT;
const opponentHalf = (x: number, y: number) => (x < 120 && y < 48) || (x >= 120 && y < 64);
const region = (x: number, y: number) => y >= 112 ? "msg" : x >= 120 ? "phb" : "mon";
const last = opt("until") ?? (sendInT + duration + 2);
const rows: { t: number; e: number; frame: number; total: number; phb: number; mon: number; msg: number }[] = [];
for (let t = 0; t <= last; t += 1) {
  const r = rom.get(t0 + t);
  if (r === undefined) break;
  const p = draw(t);
  const row = { t, e: t - sendInT, frame: t0 + t, total: 0, phb: 0, mon: 0, msg: 0 };
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
    if (opponentHalf(x, y)) continue;
    const i = y * 240 + x;
    if (p[i * 4] !== r[i * 3] || p[i * 4 + 1] !== r[i * 3 + 1] || p[i * 4 + 2] !== r[i * 3 + 2]) {
      row.total += 1; row[region(x, y) as "phb" | "mon" | "msg"] += 1;
    }
  }
  rows.push(row);
}
// ROM landmarks (e = send-in elapsed): the player sprite's removal, the player healthbox slide's first moved row, the next text.
const monBand = (f: Uint8Array) => { const o: number[] = []; for (let y = 48; y < 112; y += 1) for (let x = 0; x < 120; x += 1) o.push(f[(y * 240 + x) * 3]!); return o.join(); };
const msgBand = (f: Uint8Array) => Buffer.from(f.subarray(112 * 240 * 3)).toString("base64");
const hbBand = (f: Uint8Array) => { const o: number[] = []; for (let y = 64; y < 112; y += 1) for (let x = 120; x < 240; x += 1) for (let k = 0; k < 3; k += 1) o.push(f[(y * 240 + x) * 3 + k]!); return o.join(); };
let romRemoval: number | null = null; let romNextText: number | null = null; let romSlide: number | null = null;
for (let t = 1; rom.has(t0 + t); t += 1) {
  if (romRemoval === null && monBand(rom.get(t0 + t)!) !== monBand(rom.get(t0 + t - 1)!)) romRemoval = t - sendInT;
  if (romSlide === null && t > sendInT + 20 && hbBand(rom.get(t0 + t)!) !== hbBand(rom.get(t0 + t - 1)!)) romSlide = t - sendInT;
  if (romNextText === null && t > sendInT + 20 && msgBand(rom.get(t0 + t)!) !== msgBand(rom.get(t0 + sendInT + 20)!)) romNextText = t - sendInT;
}
const sum = (k: "total" | "phb" | "mon" | "msg") => rows.reduce((s, r) => s + r[k], 0);
const result = { scenario: scenarioPath, species, name: name(species), base, anchorFrame, anchorElapsed: ballT - sendInT, t0, pause, sendInT,
  slideStart: slide ?? 66, duration, romRemoval, romSlide, romNextText, rows: rows.length,
  zeroRows: rows.filter((r) => r.total === 0).length, px: { total: sum("total"), phb: sum("phb"), mon: sum("mon"), msg: sum("msg") },
  monSendIn: { px: rows.filter((r) => r.e >= 0).reduce((a, r) => a + r.mon, 0), rows: rows.filter((r) => r.e >= 0).length, nonZeroRows: rows.filter((r) => r.e >= 0 && r.mon > 0).length,
    firstNonZero: rows.filter((r) => r.e >= 0 && r.mon > 0).slice(0, 14).map((r) => [r.e, r.mon]) },
  animWindow: { px: rows.filter((r) => r.e >= 58 && r.e < 58 + 100).reduce((a, r) => a + r.mon, 0) },
  preSendInNonZero: rows.filter((r) => r.e < 0 && r.total > 0).map((r) => [r.e, r.total]),
  hbMsgNonZero: rows.filter((r) => r.phb + r.msg > 0).map((r) => [r.e, r.phb, r.msg]),
  monNonZero: rows.filter((r) => r.mon > 0).map((r) => [r.e, r.mon]),
  perRow: rows };
writeFileSync(outPath!, JSON.stringify(result, null, 1) + "\n");
console.log("send-in mon", JSON.stringify(result.monSendIn.px), "anim window", result.animWindow.px);
console.log(`${base ? "BASE " : ""}${name(species)} anchor ${anchorFrame} slide ${result.slideStart} duration ${duration} romRemoval ${romRemoval} romSlide ${romSlide} romNextText ${romNextText}: rows ${rows.length}, zero ${result.zeroRows}, px`,
  JSON.stringify(result.px), "pre-send-in", JSON.stringify(result.preSendInNonZero.slice(0, 8)), "hb/msg rows", JSON.stringify(result.hbMsgNonZero.slice(0, 10)),
  "mon rows", JSON.stringify(result.monNonZero.slice(0, 6)));
const dumpArg = process.argv.find((x) => x.startsWith("--dump="));
if (dumpArg !== undefined) {
  for (const t of dumpArg.slice(7).split(",").map(Number)) {
    const p = draw(t); const r = rom.get(t0 + t)!;
    const img = Buffer.alloc(480 * 160 * 3);
    for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) for (let k = 0; k < 3; k += 1) {
      img[(y * 480 + x) * 3 + k] = p[(y * 240 + x) * 4 + k]!; img[(y * 480 + 240 + x) * 3 + k] = r[(y * 240 + x) * 3 + k]!;
    }
    writeFileSync(`${outPath}.t${t}.ppm`, Buffer.concat([Buffer.from(`P6 480 160 255\n`), img]));
  }
}
