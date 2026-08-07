// ISSUES #78 forensics for `mid-battle-switch-pacing-b-off`: the four (five)
// remaining red frames at the turn-2 edge (1399/1400 box-text tail, 1406/1407
// fight-menu chrome, plus 1408 which the extended capture exposes).
//
// Every diff pixel of every red frame is classified by oracle color and by
// app color into named classes (see the class tables in
// docs/switch-pacing-tail-forensics.md), with a per-class bbox + count and a
// PASS/FAIL on the unattributed count (target: 0). The script also verifies
// the transition schedule: the app reproduces the oracle's turn-end sequence
// (box-text clear / menu open / menu redraw) exactly N frames late, and that
// oracle(f) == app(f+1) for the whole menu-chrome window.
//
// Usage:
//   node --experimental-strip-types tools/probe/switch-pacing-tail-forensics.ts
//     <outDir> [frame ...]
// (outDir = tools/compare/out/run-*/ from `npm run compare -- <spec> --summary`
// or a `--capture-range 1395:1410` scratch run. Default frames: the full red
// set 1399 1400 1406 1407 1408.)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const outDir = process.argv[2];
const frames = (process.argv.slice(3).length ? process.argv.slice(3) : ["1399", "1400", "1406", "1407", "1408"]).map(Number);

const load = (f: number, side: string) =>
  PNG.sync.read(readFileSync(join(outDir, `${side}-${String(f).padStart(5, "0")}.png`))).data;

const key = (d: Uint8Array, i: number) => `${d[i]},${d[i + 1]},${d[i + 2]}`;

type ClassStats = { count: number; x0: number; y0: number; x1: number; y1: number };
const emptyStats = (): ClassStats => ({ count: 0, x0: 9999, y0: 9999, x1: -1, y1: -1 });
const add = (st: ClassStats, x: number, y: number) => {
  st.count++;
  if (x < st.x0) st.x0 = x; if (x > st.x1) st.x1 = x;
  if (y < st.y0) st.y0 = y; if (y > st.y1) st.y1 = y;
};
const fmtBbox = (s: ClassStats | undefined) => (s && s.count ? `(${s.x0},${s.y0})-(${s.x1},${s.y1})` : "-");

// ---- frame 1399/1400: box-text tail -------------------------------------
// Oracle has cleared the "But nothing happened!" message box to field bg;
// the app still draws the box interior + the white text glyphs.
const ORACLE_FIELD_BG = "107,165,165";
const APP_BOX_INTERIOR = "107,90,115";
const APP_TEXT_INK = "255,255,255";

// ---- frame 1406: fight-menu open (app 1f late) --------------------------
// Oracle draws the fight-menu chrome at the bottom; the app still draws the
// settled field + healthbox. Oracle classes by color role (the FightMenu
// window's frame/interior/ink palette, measured on the oracle frame).
const FIGHT_MENU_ORACLE_CLASSES: Readonly<Record<string, string>> = {
  "255,255,255": "menu_text_white",      // move names + box text
  "115,107,132": "menu_frame",            // FightMenu window frame
  "214,214,206": "menu_chrome_light",
  "74,74,74": "menu_chrome_dark",
  "107,90,115": "menu_interior",
  "41,49,49": "menu_border_dark",
  "222,214,222": "menu_chrome_pale",
  "74,74,107": "menu_chrome_blue",
  "140,140,206": "menu_chrome_blue_light",
  "74,66,82": "box_frame_dark",
  "214,206,214": "menu_chrome_white_pink",
  "173,189,173": "menu_chrome_greenish",
  "99,99,148": "menu_chrome_blue_dim",
  "115,115,173": "menu_chrome_blue_pale",
};
// The app's 1406 frame draws the pre-menu field instead.
const APP_SETTLED_FIELD_CLASSES: Readonly<Record<string, string>> = {
  "107,165,165": "field_bg",
  "74,66,82": "healthbox_frame",
  "214,74,57": "healthbox_hp_red",
  "132,140,140": "healthbox_hp_grey",
  "156,74,99": "healthbox_chrome_pink",
  "107,66,90": "healthbox_chrome_dark",
  "173,107,99": "healthbox_chrome_brown",
};

// ---- frame 1407/1408: menu-chrome redraw (app 1f late) ------------------
// Both sides draw the same fight-menu chrome; the app is one frame behind,
// so oracle 1407 == app 1408 exactly. The 1641px diff is the same menu
// redraw the oracle performed one frame earlier. Class by exact color so any
// pixel NOT in the known menu palette surfaces as UNCLASSIFIED.
const MENU_REDRAW_PALETTE: ReadonlySet<string> = new Set([
  "222,214,181", "82,107,99", "255,255,222", "33,57,0", "82,107,90",
  "255,255,255", "66,66,66", "189,189,156", "198,189,115", "90,214,132",
  "115,255,173", "123,148,132", "57,82,66", "214,214,198", "198,198,181",
  "255,156,148", "247,148,115", "247,247,255", "255,181,123", "255,231,0",
  "222,107,90", "206,206,189", "214,206,189", "239,239,222", "231,231,214",
]);

let allPass = true;

for (const f of frames) {
  const ora = load(f, "oracle");
  const app = load(f, "app");

  const oracleByCls = new Map<string, ClassStats>();
  const appByCls = new Map<string, ClassStats>();
  let total = 0;

  const oracleClass = (ok: string, x: number, y: number): string => {
    if (ok === ORACLE_FIELD_BG) return "field_bg";
    if (FIGHT_MENU_ORACLE_CLASSES[ok] !== undefined) return FIGHT_MENU_ORACLE_CLASSES[ok]!;
    if (MENU_REDRAW_PALETTE.has(ok)) return "menu_redraw_palette";
    return "UNCLASSIFIED";
  };
  const appClass = (ak: string, x: number, y: number): string => {
    if (ak === APP_BOX_INTERIOR) return "box_interior";
    if (ak === APP_TEXT_INK) return "text_ink";
    if (APP_SETTLED_FIELD_CLASSES[ak] !== undefined) return APP_SETTLED_FIELD_CLASSES[ak]!;
    if (MENU_REDRAW_PALETTE.has(ak)) return "menu_redraw_palette";
    return "UNCLASSIFIED";
  };

  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4;
    const ok = key(ora, i);
    const ak = key(app, i);
    if (ok === ak) continue;
    total++;
    for (const [clsMap, clsFn, col] of [
      [oracleByCls, oracleClass, ok],
      [appByCls, appClass, ak],
    ] as const) {
      const cls = clsFn(col, x, y);
      let st = clsMap.get(cls);
      if (!st) { st = emptyStats(); clsMap.set(cls, st); }
      add(st, x, y);
    }
  }

  const oSum = [...oracleByCls.values()].reduce((s, v) => s + v.count, 0);
  const aSum = [...appByCls.values()].reduce((s, v) => s + v.count, 0);
  const oUn = oracleByCls.get("UNCLASSIFIED");
  const aUn = appByCls.get("UNCLASSIFIED");
  const unattributed = (oUn?.count ?? 0) + (aUn?.count ?? 0);
  const pass = oSum === total && aSum === total && unattributed === 0;
  if (!pass) allPass = false;

  console.log(`\n=== frame ${f}: total diff ${total}px ===`);
  console.log(`  -- oracle color -> class --`);
  for (const [cls, s] of [...oracleByCls.entries()].sort((a, b) => b[1].count - a[1].count))
    console.log(`  ${cls.padEnd(24)} ${String(s.count).padStart(5)} px  bbox ${fmtBbox(s)}`);
  console.log(`  -- app color -> class --`);
  for (const [cls, s] of [...appByCls.entries()].sort((a, b) => b[1].count - a[1].count))
    console.log(`  ${cls.padEnd(24)} ${String(s.count).padStart(5)} px  bbox ${fmtBbox(s)}`);
  console.log(`  sums: oracle=${oSum} app=${aSum} (must both == ${total})`);
  console.log(`  UNCLASSIFIED: oracle=${oUn?.count ?? 0} app=${aUn?.count ?? 0}`);
  console.log(`  ${pass ? "PASS" : "FAIL"}: 0 unattributed, class sums reconcile`);
}

// ---- transition-schedule verification ------------------------------------
// Oracle 1398->1399 box-text clear, 1405->1406 menu open, 1406->1407 +
// 1407->1408 menu redraw; app does the same transitions at 1400->1401,
// 1406->1407, 1407->1408, 1408->1409. And oracle(f) == app(f+1) for the whole
// menu-chrome window (1406-1409), i.e. the app is exactly 1 frame behind.
const diffPx = (a: Uint8Array, b: Uint8Array): number => {
  let n = 0;
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4;
    if (key(a, i) !== key(b, i)) n++;
  }
  return n;
};

console.log(`\n=== transition-schedule verification ===`);
const trans = (label: string, fa: number, fb: number): void => {
  const oa = load(fa, "oracle"), ob = load(fb, "oracle");
  const aa = load(fa, "app"), ab = load(fb, "app");
  console.log(`  ${label}: oracle ${fa}->${fb} ${diffPx(oa, ob)}px; app ${fa}->${fb} ${diffPx(aa, ab)}px`);
};
trans("box-text clear", 1398, 1399);
trans("box-text clear", 1400, 1401);
trans("menu open", 1405, 1406);
trans("menu open", 1406, 1407);
trans("menu redraw", 1406, 1407);
trans("menu redraw", 1407, 1408);
trans("menu redraw", 1407, 1408);
trans("menu redraw", 1408, 1409);

console.log(`  -- oracle(f) vs app(f+1) over the menu-chrome window (expect 0px) --`);
for (let f = 1405; f <= 1409; f++) {
  const o = load(f, "oracle");
  const an = load(f + 1, "app");
  console.log(`  oracle ${f} vs app ${f + 1}: ${diffPx(o, an)}px`);
}

console.log(`\n${allPass ? "ALL FRAMES PASS" : "SOME FRAMES FAIL"}`);
process.exitCode = allPass ? 0 : 1;
