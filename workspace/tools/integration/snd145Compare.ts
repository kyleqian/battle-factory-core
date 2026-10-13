// snd145 (S10A, ISSUES #146 remainder; docs/snd145-send-in-tail-live.md): an OPPONENT send-in (faint replacement or forced Roar switch)
// rendered THROUGH THE PRODUCTION PATH (createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView, gaf140Compare.ts's
// method) and compared per row with a dense Scene ON oracle window (bin/oracle lab PNGs). Constructed segment: [previous message,
// sprite-visibility(opponent hidden, recall), switch-in {battler 1, incoming = the staged species, timing as production builds it},
// next message]; the incoming healthbox is the staged mon at full HP.
// Alignment: production switch-in elapsed 2 (the closed ball's first frame) == the first ROM frame whose ball box equals production's;
// then elapsed e == ROM frame anchor - 2 + e. Rows compared: e = 0 .. (next message first glyph or `--until`) + 2.
// The player half (back sprite + healthbox: x < 120, 48 <= y < 112 and x >= 120, 64 <= y < 112) is transplanted from the ROM (the
// constructed player HP is not the ROM's); every other pixel is compared and split into regions:
//   hb  = opponent healthbox band (x < 120, y < 48)    opp = opponent sprite / platform (x >= 120, y < 64)
//   msg = message box (y >= 112)                       bg  = the rest of the field (the white fade's BG outside the regions above)
//   node --experimental-strip-types --no-warnings tools/integration/snd145Compare.ts <scenario.json> <rom-png-dir> <faint|roar> <out.json>
//     [--slide=N] [--duration=N]   (controls: override the opponent slide start / switch-in duration; default = production's)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../../src/engine/battleResolutionPresentation.ts";
import { opponentSwitchInHealthboxSlideElapsed } from "../../src/engine/switchInTail.ts";
import * as renderModule from "../../src/engine/battleResolutionPresentationRender.ts";

const [scenarioPath, romDir, kind, outPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (name: string) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a === undefined ? null : Number(a.split("=")[1]);
};
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
const before = kind === "faint" ? ["BLACK BELT SHIZUKA sent", `out ${name(species)}!`] : [`${name(playerMon.species)} used`, "ROAR!"];
const after = kind === "faint" ? ["What will", `${name(playerMon.species)} do?`] : [`Foe ${name(species)} was`, "dragged out!"];
const message = (seq: number, lines: string[]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
  noCursor: false, timing: { minimumFrames: 24, holdFrames: 0 } });
const slide = opt("slide");
const timing = opt("duration") === null ? switchInTiming(1, species) : { minimumFrames: opt("duration")! - SWITCH_IN_WAITSTATE_HOLD_FRAMES };
const duration = timing.minimumFrames + SWITCH_IN_WAITSTATE_HOLD_FRAMES;
const commands = [
  message(1, before),
  Object.freeze({ type: "sprite-visibility", eventSequence: 2, battler: 1, visible: false, recall: true, timing: { minimumFrames: 1 } }),
  Object.freeze({ type: "switch-in", eventSequence: 3, battler: 1, fromPartyIndex: 0, toPartyIndex: 1, incoming, incomingStatus1: 0,
    timing, settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES }),
  message(4, after),
];
const viewAt = (e: number) => createBattleResolutionPresentationRenderView({
  field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
  commandIndex: e < 0 ? 1 : e < duration ? 2 : 3, lifecycle: { phase: "presenting", phaseElapsed: e < 0 ? 0 : e < duration ? e : e - duration },
  confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
} as never);
const draw = (e: number) => {
  let view = viewAt(e);
  if (slide !== null && view.midBattleSwitchIn !== null) {
    view = { ...view, midBattleSwitchIn: renderModule.midBattleSwitchInAt(e, 1, slide) };
  }
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return fb;
};
const frames = readdirSync(romDir!).filter((f) => /^frame-\d+\.png$/.test(f)).map((f) => Number(f.slice(6, -4))).sort((a, b) => a - b);
const rom = new Map(frames.map((f) => [f, readPng(`${romDir}/frame-${String(f).padStart(5, "0")}.png`)]));
// Anchor: production elapsed 2 shows the closed ball at (168,56) 16x16.
const ball = draw(2);
const boxEqual = (r: Uint8Array) => {
  for (let y = 56; y < 72; y += 1) for (let x = 168; x < 184; x += 1) for (let k = 0; k < 3; k += 1) {
    if (r[(y * 240 + x) * 3 + k] !== ball[(y * 240 + x) * 4 + k]) return false;
  }
  return true;
};
const anchorFrame = frames.find((f) => boxEqual(rom.get(f)!) && !boxEqual(rom.get(f - 1) ?? new Uint8Array(240 * 160 * 3)));
if (anchorFrame === undefined) throw new Error("no ROM frame shows production's elapsed-2 ball");
const base = anchorFrame - 2;
const playerHalf = (x: number, y: number) => (x < 120 && y >= 48 && y < 112) || (x >= 120 && y >= 64 && y < 112);
const region = (x: number, y: number) => y >= 112 ? "msg" : x < 120 && y < 48 ? "hb" : x >= 120 && y < 64 ? "opp" : "bg";
const until = opt("until") ?? duration + 2;
const rows: { e: number; frame: number; total: number; hb: number; opp: number; msg: number; bg: number }[] = [];
for (let e = 0; e <= until; e += 1) {
  const r = rom.get(base + e);
  if (r === undefined) break;
  const p = draw(e);
  const row = { e, frame: base + e, total: 0, hb: 0, opp: 0, msg: 0, bg: 0 };
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
    if (playerHalf(x, y)) continue;
    const i = y * 240 + x;
    if (p[i * 4] !== r[i * 3] || p[i * 4 + 1] !== r[i * 3 + 1] || p[i * 4 + 2] !== r[i * 3 + 2]) {
      row.total += 1; row[region(x, y) as "hb" | "opp" | "msg" | "bg"] += 1;
    }
  }
  rows.push(row);
}
const tail = { slideStart: slide ?? opponentSwitchInHealthboxSlideElapsed(species), duration };
const sum = (k: "total" | "hb" | "opp" | "msg" | "bg") => rows.reduce((s, r) => s + r[k], 0);
const result = { scenario: scenarioPath, kind, species, name: name(species), anchorFrame, base, ...tail, rows: rows.length,
  zeroRows: rows.filter((r) => r.total === 0).length, px: { total: sum("total"), hb: sum("hb"), opp: sum("opp"), msg: sum("msg"), bg: sum("bg") },
  hbMsgNonZero: rows.filter((r) => r.hb + r.msg > 0).map((r) => [r.e, r.hb, r.msg]),
  bgNonZero: rows.filter((r) => r.bg > 0).map((r) => [r.e, r.bg]),
  oppNonZero: rows.filter((r) => r.opp > 0).map((r) => [r.e, r.opp]),
  perRow: rows };
writeFileSync(outPath!, JSON.stringify(result, null, 1) + "\n");
console.log(`${kind} ${name(species)} anchor ${anchorFrame} slide ${tail.slideStart} duration ${duration}: rows ${rows.length}, zero ${result.zeroRows}, px`,
  JSON.stringify(result.px), "hb/msg rows", JSON.stringify(result.hbMsgNonZero.slice(0, 12)));
// --dump=e1,e2,...: write production|ROM side-by-side PPMs (<out>.e<N>.ppm) for inspection.
const dumpArg = process.argv.find((x) => x.startsWith("--dump="));
if (dumpArg !== undefined) {
  for (const e of dumpArg.slice(7).split(",").map(Number)) {
    const p = draw(e); const r = rom.get(base + e)!;
    const img = Buffer.alloc(480 * 160 * 3);
    for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) for (let k = 0; k < 3; k += 1) {
      img[(y * 480 + x) * 3 + k] = p[(y * 240 + x) * 4 + k]!; img[(y * 480 + 240 + x) * 3 + k] = r[(y * 240 + x) * 3 + k]!;
    }
    writeFileSync(`${outPath}.e${e}.ppm`, Buffer.concat([Buffer.from(`P6 480 160 255\n`), img]));
  }
}
