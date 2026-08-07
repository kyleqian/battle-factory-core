// Rerunnable forensics probe for ISSUES #80 per-layer fade (docs/fade-layer-forensics.md).
// Reads oracle captures from a `npm run compare` out dir and prints the measured
// per-frame (y_bg, y_obj) against the §1/§2 tables, the §3 960-963 class counts,
// and the §6 open-window field fade-out schedule.
//
// Usage: node --experimental-strip-types tools/probe/fade-layer-forensics.ts <close-out-dir> [open-out-dir] [field-out-dir]
//   close-out-dir : must contain oracle-00958..oracle-00985.png (capture-range 958:985)
//   open-out-dir  : must contain oracle-00803..oracle-00824.png (capture-range 803:830)
//   field-out-dir : must contain oracle-00762..oracle-00808.png (capture-range 758:830)
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const [closeDir, openDir, fieldDir] = process.argv.slice(2);
if (!closeDir) {
  console.error("usage: node --experimental-strip-types tools/probe/fade-layer-forensics.ts <close-out-dir> [open-out-dir] [field-out-dir]");
  process.exit(2);
}

// Blend model: faded5 = c5 + (((0 - c5) * y) >> 4), target black. mGBA expands
// 5-bit v to 24-bit as (v << 3) | (v >> 2).
function expand5(v: number): number {
  return (v << 3) | (v >> 2);
}
function blendToBlack(c5: number, y: number): number {
  return c5 + (((0 - c5) * y) >> 4);
}
// Decode y from a measured 24-bit pixel vs a 5-bit base, matching within +-2.
function decodeY(r: number, g: number, b: number, c5: [number, number, number]): number {
  const best: { y: number; err: number } = { y: -1, err: Infinity };
  for (let y = 0; y <= 16; y++) {
    const fr = expand5(blendToBlack(c5[0]!, y));
    const fg = expand5(blendToBlack(c5[1]!, y));
    const fb = expand5(blendToBlack(c5[2]!, y));
    const err = Math.abs(fr - r) + Math.abs(fg - g) + Math.abs(fb - b);
    if (err < best.err) { best.y = y; best.err = err; }
  }
  return best.err <= 2 ? best.y : -1;
}

const BG_BASE: [number, number, number] = [14, 11, 22]; // box interior (115,90,181)
const OBJ_BASE: [number, number, number] = [22, 8, 0];  // ball red (181,66,0)

function loadPng(dir: string, f: number, prefix: "oracle" | "app"): Uint8Array | null {
  const path = join(dir, `${prefix}-${String(f).padStart(5, "0")}.png`);
  if (!existsSync(path)) return null;
  return PNG.sync.read(readFileSync(path)).data;
}
function loadOracle(dir: string, f: number): Uint8Array | null {
  return loadPng(dir, f, "oracle");
}
function px(data: Uint8Array, x: number, y: number): [number, number, number] {
  const i = (y * 240 + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

// ---- §1 close window table (frames 964-980) ----
const CLOSE_TABLE: Record<number, [number, number]> = {
  964: [0, 0], 965: [2, 0], 966: [2, 2], 967: [4, 2], 968: [4, 4],
  969: [6, 4], 970: [6, 6], 971: [8, 6], 972: [8, 8], 973: [10, 8],
  974: [10, 10], 975: [12, 10], 976: [12, 12], 977: [14, 12], 978: [14, 14],
  979: [16, 14], 980: [16, 16],
};
// ---- §2 open window table (frames 803-824) ----
const OPEN_TABLE: Record<number, [number, number]> = {
  803: [16, 16], 804: [16, 16], 805: [16, 16], 806: [16, 16],
  807: [16, 16], 808: [16, 16], 809: [14, 16], 810: [14, 14],
  811: [12, 14], 812: [12, 12], 813: [10, 12], 814: [10, 10],
  815: [8, 10], 816: [8, 8], 817: [6, 8], 818: [6, 6], 819: [4, 6],
  820: [4, 4], 821: [2, 4], 822: [2, 2], 823: [0, 2], 824: [0, 0],
};

// ---- §3 message-region class counts (frames 960-963) ----
// (oracle@diff, app@diff) top classes, frame 960, from the verified receipt.
const CLASS_EXPECT = {
  oracleTop: { "255,255,255": 1452, "181,181,90": 674, "206,214,123": 670 },
  appTop: { "255,255,255": 1874, "74,74,99": 308, "115,90,181": 201 },
  px960: 5141,
  px963: 6008,
};

let failures = 0;
const fail = (msg: string): void => { failures++; console.error(`  FAIL: ${msg}`); };

console.log("== §1 close window (oracle 964-980) ==");
let closeOk = true;
for (let f = 964; f <= 980; f++) {
  const data = loadOracle(closeDir, f);
  if (!data) { closeOk = false; fail(`frame ${f}: no capture in ${closeDir}`); continue; }
  const bg = px(data, 204, 140);
  const obj = px(data, 193, 138);
  const ybg = decodeY(bg[0], bg[1], bg[2], BG_BASE);
  const yobj = decodeY(obj[0], obj[1], obj[2], OBJ_BASE);
  const [ebg, eobj] = CLOSE_TABLE[f]!;
  const ok = ybg === ebg && yobj === eobj;
  if (!ok) { closeOk = false; fail(`frame ${f}: measured (${ybg},${yobj}) expected (${ebg},${eobj})  bg=${bg} obj=${obj}`); }
  console.log(`  ${f}: measured (y_bg=${String(ybg).padStart(2)}, y_obj=${String(yobj).padStart(2)}) expected (${ebg},${eobj}) ${ok ? "OK" : "MISMATCH"}`);
}
console.log(`  §1 ${closeOk ? "PASS" : "FAIL"} (frames 964-980)`);

if (openDir) {
  console.log("== §2 open window (oracle 803-824) ==");
  let openOk = true;
  for (let f = 803; f <= 824; f++) {
    const data = loadOracle(openDir, f);
    if (!data) { openOk = false; fail(`frame ${f}: no capture in ${openDir}`); continue; }
    const bg = px(data, 204, 140);
    const obj = px(data, 193, 138);
    const ybg = decodeY(bg[0], bg[1], bg[2], BG_BASE);
    const yobj = decodeY(obj[0], obj[1], obj[2], OBJ_BASE);
    const [ebg, eobj] = OPEN_TABLE[f]!;
    const ok = ybg === ebg && yobj === eobj;
    if (!ok) { openOk = false; fail(`frame ${f}: measured (${ybg},${yobj}) expected (${ebg},${eobj})  bg=${bg} obj=${obj}`); }
    console.log(`  ${f}: measured (y_bg=${String(ybg).padStart(2)}, y_obj=${String(yobj).padStart(2)}) expected (${ebg},${eobj}) ${ok ? "OK" : "MISMATCH"}`);
  }
  console.log(`  §2 ${openOk ? "PASS" : "FAIL"} (frames 803-824)`);
}

console.log("== §3 message-region residual (960-963) ==");
let clsOk = true;
for (const f of [960, 961, 962, 963]) {
  const od = loadOracle(closeDir, f);
  const ad = loadPng(closeDir, f, "app");
  if (!od || !ad) { clsOk = false; fail(`frame ${f}: no capture in ${closeDir}`); continue; }
  const oc = new Map<string, number>();
  const ac = new Map<string, number>();
  let tot = 0;
  for (let y = 80; y < 160; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4;
    if (od[i] === ad[i] && od[i + 1] === ad[i + 1] && od[i + 2] === ad[i + 2]) continue;
    tot++;
    const ok_ = `${od[i]},${od[i + 1]},${od[i + 2]}`;
    const ak = `${ad[i]},${ad[i + 1]},${ad[i + 2]}`;
    oc.set(ok_, (oc.get(ok_) ?? 0) + 1);
    ac.set(ak, (ac.get(ak) ?? 0) + 1);
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join(" ");
  const expPx = f < 963 ? CLASS_EXPECT.px960 : CLASS_EXPECT.px963;
  const okPx = Math.abs(tot - expPx) <= 3;
  if (!okPx) { clsOk = false; fail(`frame ${f}: diff px ${tot} expected ~${expPx}`); }
  console.log(`  ${f}: diff px=${tot} (expected ~${expPx}) ${okPx ? "OK" : "MISMATCH"}`);
  console.log(`       oracle@diff: ${top(oc, 3)}`);
  console.log(`       app@diff:    ${top(ac, 3)}`);
}
// Class sanity: oracle top-1 class should be white, app top classes should include the CANCEL window + button colors.
const od = loadOracle(closeDir, 960);
const ad = loadPng(closeDir, 960, "app");
if (!od || !ad) {
  console.log("  frame 960: no capture (skipping class sanity)");
} else {
  const oc960 = new Map<string, number>();
  const ac960 = new Map<string, number>();
  for (let y = 80; y < 160; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4;
    if (od[i] !== ad[i] || od[i + 1] !== ad[i + 1] || od[i + 2] !== ad[i + 2]) {
      const ok_ = `${od[i]},${od[i + 1]},${od[i + 2]}`;
      const ak = `${ad[i]},${ad[i + 1]},${ad[i + 2]}`;
      oc960.set(ok_, (oc960.get(ok_) ?? 0) + 1);
      ac960.set(ak, (ac960.get(ak) ?? 0) + 1);
    }
  }
  const orcWhite = oc960.get("255,255,255") ?? 0;
  const appBtn = (ac960.get("181,66,0") ?? 0);
  const appCancel = (ac960.get("115,90,181") ?? 0);
  const expectWhite = Math.abs(orcWhite - CLASS_EXPECT.oracleTop["255,255,255"]!) <= 3;
  const expectBtn = appBtn >= 70 && appBtn <= 80; // oracle draws NO button (0), app draws 73
  if (!expectWhite) { clsOk = false; fail(`frame 960 oracle white@diff ${orcWhite} expected ~${CLASS_EXPECT.oracleTop["255,255,255"]}`); }
  if (!expectBtn) { clsOk = false; fail(`frame 960 app ball-red button ${appBtn}px expected ~73 (oracle has 0)`); }
  if (appCancel < 180 || appCancel > 215) { clsOk = false; fail(`frame 960 app CANCEL interior ${appCancel}px expected ~201`); }
  console.log(`  frame 960: oracle white@diff=${orcWhite} (exp ~1452), app button-red=${appBtn} (exp 73), app CANCEL interior=${appCancel} (exp 201)`);
  console.log(`  §3 ${clsOk ? "PASS" : "FAIL"}`);
}
// ---- §6 open-window field fade-out (frames 762-808) ----
// Reference pixels chosen for the pre-menu switch screen (the battle field that
// fades out before the party menu opens). BG = white screen background @ (4,4)
// base (31,31,31)5; OBJ = battler front-sprite body maroon @ (176,52) base
// (20,3,7)5. openElapsed e = frame - 763 (confirm frame = A-press 762-763, the
// app pops the menu at 763). Closed forms:
//   y_bg(e)  = min(16, 2 * max(0, floor((e - 1) / 2)))
//   y_obj(e) = min(16, 2 * max(0, floor((e - 2) / 2)))
const FIELD_BG_BASE: [number, number, number] = [31, 31, 31]; // white (255,255,255)
const FIELD_OBJ_BASE: [number, number, number] = [20, 3, 7];  // sprite maroon (165,24,57)
const fieldYbg = (e: number): number => Math.min(16, 2 * Math.max(0, Math.floor((e - 1) / 2)));
const fieldYobj = (e: number): number => Math.min(16, 2 * Math.max(0, Math.floor((e - 2) / 2)));

if (fieldDir) {
  console.log("== §6 open window field fade-out (oracle 762-808) ==");
  let fieldOk = true;
  for (let f = 762; f <= 808; f++) {
    const data = loadOracle(fieldDir, f);
    if (!data) { fieldOk = false; fail(`frame ${f}: no capture in ${fieldDir}`); continue; }
    const bg = px(data, 4, 4);
    const obj = px(data, 176, 52);
    const ybg = decodeY(bg[0], bg[1], bg[2], FIELD_BG_BASE);
    const yobj = decodeY(obj[0], obj[1], obj[2], FIELD_OBJ_BASE);
    const e = f - 763;
    const [ebg, eobj] = [fieldYbg(e), fieldYobj(e)];
    const ok = ybg === ebg && yobj === eobj;
    if (!ok) { fieldOk = false; fail(`frame ${f}: measured (${ybg},${yobj}) expected (${ebg},${eobj})  bg=${bg} obj=${obj}`); }
    console.log(`  ${f} e=${String(e).padStart(2)}: measured (y_bg=${String(ybg).padStart(2)}, y_obj=${String(yobj).padStart(2)}) expected (${ebg},${eobj}) ${ok ? "OK" : "MISMATCH"}`);
  }
  // Edge checks: last fully-bright 765, first blend 766, BG black 780, all-black 781, last all-black 808.
  const edgeExp: Record<number, [number, number]> = {
    765: [0, 0], 766: [2, 0], 780: [16, 14], 781: [16, 16], 808: [16, 16],
  };
  for (const [f, [ebg, eobj]] of Object.entries(edgeExp)) {
    const data = loadOracle(fieldDir, Number(f));
    if (!data) { fieldOk = false; fail(`edge frame ${f}: no capture in ${fieldDir}`); continue; }
    const ybg = decodeY(...px(data, 4, 4), FIELD_BG_BASE);
    const yobj = decodeY(...px(data, 176, 52), FIELD_OBJ_BASE);
    if (ybg !== ebg || yobj !== eobj) {
      fieldOk = false;
      fail(`edge frame ${f}: measured (${ybg},${yobj}) expected (${ebg},${eobj})`);
    }
  }
  console.log(`  §6 ${fieldOk ? "PASS" : "FAIL"} (frames 762-808, closed forms + edges)`);
}

console.log(failures === 0 ? "\nALL CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
