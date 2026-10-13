// offs152 (S10A, ISSUES #146 items 4/5 + remainder; docs/offs152-scene-off-send-in-tail.md): a Scene OFF Roar forced switch (player
// HOUNDOUR Roar drags out the staged opponent party slot 1) rendered THROUGH THE PRODUCTION PATH (createBattleResolutionPresentationRenderView
// + renderBattleResolutionLiveView, snd145Compare.ts's method) from the Pausex20 pause's first frame (G + 1) through the "dragged out!"
// print, compared per row with a dense Scene OFF oracle window (snd145Stage.py --off: bin/oracle lab captures 220..559).
// Constructed segment = the commands production projects for a Scene OFF Roar body (pinned on census routes by
// tests/offs152SceneOffForcedSwitch.test.ts): [used message (done), move-animation pause P = 41, switch-out (forced hold 4, target at
// rest), sprite-visibility (recall, gap 6), switch-in {battler 1, the staged species, Scene OFF timing as production builds it}, next message].
// Alignment: the switch-in's elapsed 2 (the closed ball's first frame) == the first ROM frame whose ball box equals production's;
// row t = 0 is the pause's first frame (switch-in elapsed 0 = t 51). The player half is transplanted from the ROM (constructed HP).
//   node --experimental-strip-types --no-warnings tools/integration/offs152Compare.ts <scenario.json> <rom-png-dir> <out.json>
//     [--base]   (the pre-offs152 Scene OFF chain: no pause, 32-frame voluntary recall, sprite-visibility 1, slide 33, 91 + 11)
//     [--slide=N] [--duration=N]  (controls)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import {
  FORCED_RETURN_TO_BALL_HOLD_FRAMES, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES, RETURN_TO_BALL_SPAN_FRAMES,
  SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming,
} from "../../src/engine/battleResolutionPresentation.ts";
import * as tail from "../../src/engine/switchInTail.ts";

const [scenarioPath, romDir, outPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (name: string) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a === undefined ? null : Number(a.split("=")[1]);
};
const base = process.argv.includes("--base");
const name = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");

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
const incomingMon = parties.opponent[1];
const playerMon = parties.player[0];
const species = incomingMon.species as number;
const mon = (b: 0 | 1, m: any, partyIndex: 0 | 1) => Object.freeze({
  species: m.species as number, name: name(m.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
  partyIndex, level: m.level as number, hp: 100, maxHP: 100, gender: m.gender as "male" | "female", status: "none" as const,
  moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
});
const field = Object.freeze({ player: mon(0, playerMon, 0), opponent: mon(1, parties.opponent[0], 0) });
const incoming = mon(1, incomingMon, 1);
const message = (seq: number, lines: string[]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
  noCursor: false, timing: { minimumFrames: 24, holdFrames: 0 } });
// Scene OFF tail as production builds it (offs152 R3: sceneOffOpponentSwitchIn*; before it: slide 33 default, 91 + 11).
const offTail = (tail as any).sceneOffOpponentSwitchInHealthboxSlideElapsed;
const slide = opt("slide") ?? (base || offTail === undefined ? null : offTail(species));
const timing = opt("duration") !== null ? { minimumFrames: opt("duration")! - SWITCH_IN_WAITSTATE_HOLD_FRAMES }
  : base ? { minimumFrames: 91 } : switchInTiming(1, species, false);
const pause = base ? 0 : 41;
const switchOut = base
  ? Object.freeze({ type: "switch-out", eventSequence: 3, battler: 1, timing: { minimumFrames: RETURN_TO_BALL_SPAN_FRAMES } })
  : Object.freeze({ type: "switch-out", eventSequence: 3, battler: 1, timing: { minimumFrames: FORCED_RETURN_TO_BALL_HOLD_FRAMES },
    skipAnimation: true, targetAtRest: true });
const gap = base ? 1 : FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES;
const settleHoldFrames = SWITCH_IN_WAITSTATE_HOLD_FRAMES;
const duration = timing.minimumFrames + settleHoldFrames;
const commands = [
  message(1, [`${name(playerMon.species)} used`, "ROAR!"]),
  ...(pause > 0 ? [Object.freeze({ type: "move-animation", eventSequence: 2, battler: 0, timing: { minimumFrames: pause } })] : []),
  switchOut,
  Object.freeze({ type: "sprite-visibility", eventSequence: 4, battler: 1, visible: false, recall: true, timing: { minimumFrames: gap } }),
  Object.freeze({ type: "switch-in", eventSequence: 5, battler: 1, fromPartyIndex: 0, toPartyIndex: 1, incoming, incomingStatus1: 0,
    timing, settleHoldFrames, ...(slide === null ? {} : { healthboxSlideElapsed: slide }) }),
  message(6, [`Foe ${name(species)} was`, "dragged out!"]),
];
const spans = commands.map((c: any) => c.type === "switch-in" ? duration : c.timing.minimumFrames);
const sendInT = spans.slice(1, commands.length - 2).reduce((s, x) => s + x, 0); // t of switch-in elapsed 0
const viewAt = (t: number) => {
  let index = 1; let e = t;
  while (index < commands.length - 1 && e >= spans[index]!) { e -= spans[index]!; index += 1; }
  return createBattleResolutionPresentationRenderView({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex: index, lifecycle: { phase: "presenting", phaseElapsed: e },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
  } as never);
};
const draw = (t: number) => {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, viewAt(t));
  return fb;
};
const frames = readdirSync(romDir!).filter((f) => /^frame-\d+\.png$/.test(f)).map((f) => Number(f.slice(6, -4))).sort((a, b) => a - b);
const rom = new Map(frames.map((f) => [f, readPng(`${romDir}/frame-${String(f).padStart(5, "0")}.png`)]));
const ball = draw(sendInT + 2);
const boxEqual = (r: Uint8Array) => {
  for (let y = 56; y < 72; y += 1) for (let x = 168; x < 184; x += 1) for (let k = 0; k < 3; k += 1) {
    if (r[(y * 240 + x) * 3 + k] !== ball[(y * 240 + x) * 4 + k]) return false;
  }
  return true;
};
const anchorFrame = frames.find((f) => boxEqual(rom.get(f)!) && !boxEqual(rom.get(f - 1) ?? new Uint8Array(240 * 160 * 3)));
if (anchorFrame === undefined) throw new Error("no ROM frame shows production's elapsed-2 ball");
// ROM frame of t = 0: the ROM's send-in elapsed 0 is G + 52 (ball G + 54, off148 probe rows), so the pause starts at ball - 53.
const t0 = anchorFrame - 53;
const playerHalf = (x: number, y: number) => (x < 120 && y >= 48 && y < 112) || (x >= 120 && y >= 64 && y < 112);
const region = (x: number, y: number) => y >= 112 ? "msg" : x < 120 && y < 48 ? "hb" : x >= 120 && y < 64 ? "opp" : "bg";
const last = opt("until") ?? (sendInT + duration + 2);
const rows: { t: number; e: number; frame: number; total: number; hb: number; opp: number; msg: number; bg: number }[] = [];
for (let t = 0; t <= last; t += 1) {
  const r = rom.get(t0 + t);
  if (r === undefined) break;
  const p = draw(t);
  const row = { t, e: t - 51, frame: t0 + t, total: 0, hb: 0, opp: 0, msg: 0, bg: 0 };
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
    if (playerHalf(x, y)) continue;
    const i = y * 240 + x;
    if (p[i * 4] !== r[i * 3] || p[i * 4 + 1] !== r[i * 3 + 1] || p[i * 4 + 2] !== r[i * 3 + 2]) {
      row.total += 1; row[region(x, y) as "hb" | "opp" | "msg" | "bg"] += 1;
    }
  }
  rows.push(row);
}
// ROM landmarks (e = ROM send-in elapsed, G + 52 = e 0): the opponent sprite's removal, the healthbox slide's first moved row, the next text.
const oppBand = (f: Uint8Array) => Buffer.from(f.subarray(0, 64 * 240 * 3)).toString("base64");
const msgBand = (f: Uint8Array) => Buffer.from(f.subarray(112 * 240 * 3)).toString("base64");
const hbBand = (f: Uint8Array) => { const o: number[] = []; for (let y = 0; y < 48; y += 1) for (let x = 0; x < 120; x += 1) for (let k = 0; k < 3; k += 1) o.push(f[(y * 240 + x) * 3 + k]!); return o.join(); };
let romRemoval: number | null = null; let romNextText: number | null = null; let romSlide: number | null = null;
for (let t = 1; rom.has(t0 + t); t += 1) {
  if (romRemoval === null && oppBand(rom.get(t0 + t)!) !== oppBand(rom.get(t0 + t - 1)!)) romRemoval = t - 51;
  if (romSlide === null && t > 70 && hbBand(rom.get(t0 + t)!) !== hbBand(rom.get(t0 + t - 1)!)) romSlide = t - 51;
  if (romNextText === null && t > 51 + 20 && msgBand(rom.get(t0 + t)!) !== msgBand(rom.get(t0 + 51 + 20)!)) romNextText = t - 51;
}
const sum = (k: "total" | "hb" | "opp" | "msg" | "bg") => rows.reduce((s, r) => s + r[k], 0);
const result = { scenario: scenarioPath, species, name: name(species), base, anchorFrame, t0, pause, sendInT,
  slideStart: slide ?? 33, duration, romRemoval, romSlide, romNextText, rows: rows.length,
  zeroRows: rows.filter((r) => r.total === 0).length, px: { total: sum("total"), hb: sum("hb"), opp: sum("opp"), msg: sum("msg"), bg: sum("bg") },
  preSendInNonZero: rows.filter((r) => r.e < 0 && r.total > 0).map((r) => [r.e, r.total]),
  hbMsgNonZero: rows.filter((r) => r.hb + r.msg > 0).map((r) => [r.e, r.hb, r.msg]),
  oppNonZero: rows.filter((r) => r.opp > 0).map((r) => [r.e, r.opp]),
  bgNonZero: rows.filter((r) => r.bg > 0).map((r) => [r.e, r.bg]),
  perRow: rows };
writeFileSync(outPath!, JSON.stringify(result, null, 1) + "\n");
console.log(`${base ? "BASE " : ""}${name(species)} anchor ${anchorFrame} slide ${result.slideStart} duration ${duration} romRemoval ${romRemoval} romSlide ${romSlide} romNextText ${romNextText}: rows ${rows.length}, zero ${result.zeroRows}, px`,
  JSON.stringify(result.px), "pre-send-in", JSON.stringify(result.preSendInNonZero.slice(0, 8)), "hb/msg rows", JSON.stringify(result.hbMsgNonZero.slice(0, 10)));
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
