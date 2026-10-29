// apx223 (evidence only): size an approximate move body against the Scene ON ROM. For one census command (seed, move, attacker) this
// stages the same lead species / genders on a mechanicLab `overrides.parties` window (the attacker's four slots = the move, the other
// lead's = Splash), captures every ROM frame of turn 1, aligns it with the production live renderer's body rows for the census command
// and writes per-frame battle-field mismatch counts plus ROM | ours | diff PNGs.
//   node --experimental-strip-types --no-warnings tools/integration/apx223OracleCheck.ts --name=curse-ghost --seed=231 --move=174 \
//        --attacker=0 --code=approx:turn-0 --work=/tmp/a223/curse [--out=tools/integration/fixtures/approximate/oracle-check]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { apx217Strip } from "./apx217TransformStrips.ts";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const name = arg("name")!, seed = Number(arg("seed")), moveId = Number(arg("move")), attacker = Number(arg("attacker"));
const work = arg("work")!, outDir = arg("out");
const captureFrom = Number(arg("from") ?? 40), captureTo = Number(arg("to") ?? 900);
mkdirSync(work, { recursive: true });

const ours = apx217Strip(seed, moveId, attacker, arg("code") ?? "approx:")!;
if (!ours) throw new Error("census command not reached");
const field = (ours.targetState as any).battleResolutionPresentation.segments[(ours.targetState as any).battleResolutionPresentation.segmentIndex].field;

// ---- stage the ROM lab -------------------------------------------------------------------------------------------------------
const iv = { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 };
const ev0 = { hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0 };
const mon = (species: number, move: number, gender: string, personality?: number) => ({
  species, level: 50, nature: 0, ivs: iv, evs: ev0, moves: [move, move, move, move], ppUps: [0, 0, 0, 0], item: 0, abilitySlot: 0, friendship: 70,
  gender, shiny: false, ...(personality === undefined ? {} : { personality }),
});
const lead = (m: any, move: number) => mon(m.species, move, m.gender);
// --other=<moveId>: the non-attacking lead's move (default Splash); --spam: press A every 20 frames after turn 1 so a second turn is played
// (Conversion 2 plays no animation until the target has used a move).
const otherMove = Number(arg("other") ?? 150), spam = process.argv.includes("--spam");
const labFor = (frames: number[]) => ({
  schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2, battleNum: 2, trainerId: 110,
  playerSetIds: [274, 354, 338], opponentSetIds: [349, 339, 327], seed: 1,
  overrides: { parties: {
    player: [lead(field.player, attacker === 0 ? moveId : otherMove), mon(1, 33, "male"), mon(4, 10, "male")],
    opponent: [lead(field.opponent, attacker === 1 ? moveId : otherMove), mon(187, 150, "female"), mon(129, 150, "female")] } },
  trace: { segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] },
    ...(spam ? Array.from({ length: Math.ceil((Math.max(...frames) - 34) / 20) }, () => [{ frames: 18, buttons: [] }, { frames: 2, buttons: ["A"] }]).flat()
      : [{ frames: Math.max(...frames) - 33, buttons: [] }])],
    captureFrames: frames },
});
/** One oracle run (<= 256 captures); cached per directory. */
const runLab = (dir: string, frames: number[]) => {
  if (existsSync(`${dir}/manifest.json`)) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/lab.json`, JSON.stringify(labFor(frames)));
  execFileSync("bin/oracle", ["--profile", "battle-scene-on", "lab", `${dir}/lab.json`, "-o", dir], { stdio: ["ignore", "ignore", "inherit"], timeout: 900000 });
};
console.log(`staged ${name}: player ${field.player.name} vs opponent ${field.opponent.name}; ours ${ours.rows} rows (${ours.code})`);

// ---- compare -------------------------------------------------------------------------------------------------------------------
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
  const out = new Uint8Array(width * height * 4); const stride = width * bpp; let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const f = raw[y * (stride + 1)]!; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)); const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? cur[i - bpp]! : 0; const b = prev[i]!; const c = i >= bpp ? prev[i - bpp]! : 0;
      const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
      cur[i] = (line[i]! + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
    }
    for (let x = 0; x < width; x += 1) { for (let k = 0; k < 3; k += 1) out[(y * width + x) * 4 + k] = cur[x * bpp + k]!; out[(y * width + x) * 4 + 3] = 255; }
    prev = cur;
  }
  return out;
}
function writePng(w: number, h: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) raw[y * (w * 3 + 1) + 1 + x * 3 + c] = rgba[(y * w + x) * 4 + c]!;
  const chunk = (type: string, data: Buffer) => {
    const b = Buffer.concat([Buffer.from(type), data]); const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b) >>> 0); return Buffer.concat([len, b, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// Battle-field region: the upper 112 rows (above the text box) minus the two healthbox rectangles, whose HP / level / name differ with the
// census battle's history rather than the body (the body's own healthbox motion is outside what this check can size).
const inField = (x: number, y: number) => y < 112 && !(x < 108 && y < 48) && !(x >= 124 && y >= 72);
const fieldPx: number[] = [];
for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) if (inField(x, y)) fieldPx.push(y * 240 + x);
const diffMask = (a: Uint8Array, b: Uint8Array) => {
  let n = 0; for (const p of fieldPx) if (a[p * 4] !== b[p * 4] || a[p * 4 + 1] !== b[p * 4 + 1] || a[p * 4 + 2] !== b[p * 4 + 2]) n++;
  return n;
};
const frameNo = (f: string) => Number(/(\d+)\.png$/.exec(f)![1]);
const rom = new Map<number, Uint8Array>();
const cmd = new Map<number, number>();
const load = (dir: string) => {
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".png"))) rom.set(frameNo(f), readPng(`${dir}/${f}`));
  for (const c of JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8")).captures) {
    cmd.set(c.frame, c.state.engine[attacker === 0 ? "playerControllerCommand" : "opponentControllerCommand"]);
  }
};
// The ROM body is the run of frames whose attacker-side controller command is CONTROLLER_MOVEANIMATION (15), as captured in the manifest.
const MOVEANIMATION = 15;
const bodyExtent = () => {
  const on = [...cmd.entries()].filter(([, c]) => c === MOVEANIMATION).map(([f]) => f).sort((a, b) => a - b);
  return on.length ? { first: on[0]!, last: on.at(-1)! } : null;
};
// 1. scout turn 1 at a stride (<= 256 captures per oracle run); 2. capture every frame of the body (+/- margin) in chunks.
const stride = Math.ceil((captureTo - captureFrom + 1) / 250);
const scout: number[] = []; for (let f = captureFrom; f <= captureTo; f += stride) scout.push(f);
runLab(`${work}/scout`, scout); load(`${work}/scout`);
const coarse = bodyExtent();
if (!coarse) throw new Error("no MOVEANIMATION command found in the scout window");
const margin = 12, fineFrom = coarse.first - stride - margin, fineTo = coarse.last + stride + margin;
for (let lo = fineFrom; lo <= fineTo; lo += 256) {
  const frames: number[] = []; for (let f = lo; f < lo + 256 && f <= fineTo; f += 1) frames.push(f);
  runLab(`${work}/fine-${lo}`, frames); load(`${work}/fine-${lo}`);
}
const exact = [...cmd.entries()].filter(([f, c]) => c === MOVEANIMATION && f >= fineFrom && f <= fineTo).map(([f]) => f).sort((a, b) => a - b);
const romStart = exact[0]!, romEnd = exact.at(-1)!, romRows = romEnd - romStart + 1;
console.log(`ROM MOVEANIMATION frames ${romStart}..${romEnd} (${romRows}); ours ${ours.rows} rows`);
const at = (f: number) => rom.get(f) ?? rom.get(romEnd + 1) ?? rom.get(romEnd)!;
// Visible extent (a run of changed frames; an idle gap of more than 4 frames ends it, which drops the post-move hit blink): the first / last frame whose battle-field region differs from the idle field (ROM: the frame before the command; ours: the
// command's static hold). The command stays active past the visible body (the HP drain), so these, not the command length, size the body.
const GAP = 4;
const extent = (frames: (i: number) => Uint8Array, idle: Uint8Array, from: number, to: number) => {
  let first = -1, last = -1;
  for (let i = from; i <= to; i += 1) if (diffMask(frames(i), idle) > 0) { if (first < 0) first = i; else if (i - last > GAP) break; last = i; }
  return { first, last, rows: first < 0 ? 0 : last - first + 1 };
};
const romIdle = rom.get(romStart - 1)!;
const romVis = extent(at, romIdle, romStart, romEnd);
const oursVis = extent((i) => ours.frames[i]!, ours.staticFrame!, 0, ours.rows - 1);
const visShift = romVis.first - oursVis.first - romStart;
console.log(`ROM command ${romStart}..${romEnd} (${romRows}); visible field change ${romVis.first}..${romVis.last} (${romVis.rows}); ours ${ours.rows} rows, visible ${oursVis.first}..${oursVis.last} (${oursVis.rows})`);
const costAt = (off: number) => { let c = 0; for (let i = 0; i < ours.rows; i += 1) c += diffMask(at(off + i), ours.frames[i]!); return c; };
const stats = (arr: number[]) => { const q = [...arr].sort((a, b) => a - b); return { median: q[Math.floor(q.length / 2)]!, max: q.at(-1)!, mean: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), zero: arr.filter((v) => v === 0).length }; };
const perAt = (off: number) => ours.frames.map((fr, i) => diffMask(at(off + i), fr));
// Stats over ours' visible rows only (the idle rows around the body match trivially).
const visSlice = (arr: number[]) => arr.slice(oursVis.first, oursVis.last + 1);
let bestOff = romStart + visShift, bestCost = Infinity;
for (let off = romStart + visShift - 25; off <= romStart + visShift + 25; off += 1) { if (!rom.has(off)) continue; const c = costAt(off); if (c < bestCost) { bestCost = c; bestOff = off; } }
const startAligned = perAt(romStart + visShift), bestAligned = perAt(bestOff);
const summary = {
  name, seed, moveId, attacker, code: ours.code, oursRows: ours.rows, oursVisible: oursVis, romCommandRows: romRows, romStart, romEnd,
  romVisible: romVis, fieldPixels: fieldPx.length,
  startAligned: { shift: visShift, ...stats(visSlice(startAligned)) }, bestShift: { shift: bestOff - romStart, ...stats(visSlice(bestAligned)) },
  perFrameStartAligned: startAligned, perFrameBestShift: bestAligned,
};
writeFileSync(`${work}/summary.json`, JSON.stringify(summary));
console.log(JSON.stringify({ ...summary, perFrameStartAligned: undefined, perFrameBestShift: undefined }));

// Side-by-side PNGs (ROM | ours | diff), start-aligned unless --shift is given, at --at=i,j,k (ours row indices) or three evenly spaced rows.
if (outDir) {
  mkdirSync(outDir, { recursive: true });
  const shift = Number(arg("shift") ?? 0);
  const picks = (arg("at") ?? "").split(",").filter(Boolean).map(Number);
  if (!picks.length) picks.push(...[0.15, 0.5, 0.85].map((q) => Math.floor(q * (ours.rows - 1))));
  picks.forEach((i) => {
    const a = at(romStart + visShift + shift + i), b = ours.frames[i]!;
    const img = new Uint8Array(720 * 160 * 4);
    for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
      const p = y * 240 + x;
      for (let c = 0; c < 4; c++) { img[(y * 720 + x) * 4 + c] = a[p * 4 + c]!; img[(y * 720 + 240 + x) * 4 + c] = b[p * 4 + c]!; }
      const bad = inField(x, y) && (a[p * 4] !== b[p * 4] || a[p * 4 + 1] !== b[p * 4 + 1] || a[p * 4 + 2] !== b[p * 4 + 2]);
      const o = (y * 720 + 480 + x) * 4;
      img[o] = bad ? 255 : (a[p * 4]! >> 2); img[o + 1] = bad ? 0 : (a[p * 4 + 1]! >> 2); img[o + 2] = bad ? 0 : (a[p * 4 + 2]! >> 2); img[o + 3] = 255;
    }
    writeFileSync(`${outDir}/${name}-row${String(i).padStart(3, "0")}.png`, writePng(720, 160, img));
  });
}

// --romat=k,l,m: a ROM-only strip of the body frames romStart+k.. (to see the body's tail past ours).
if (arg("romat") && outDir) {
  const ks = arg("romat")!.split(",").map(Number);
  const img = new Uint8Array(240 * ks.length * 160 * 4);
  ks.forEach((k, n) => { const a = at(romStart + k); for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) for (let c = 0; c < 4; c++) img[(y * 240 * ks.length + n * 240 + x) * 4 + c] = a[(y * 240 + x) * 4 + c]!; });
  writeFileSync(`${outDir}/${name}-rom-only.png`, writePng(240 * ks.length, 160, img));
}
if (process.argv.includes("--series")) console.log("ROM field px vs idle, per command frame:", JSON.stringify(Array.from({ length: romRows }, (_, k) => diffMask(at(romStart + k), romIdle))));
