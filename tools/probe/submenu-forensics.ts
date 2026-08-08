import { PNG } from "pngjs";
import { readFileSync, readdirSync } from "node:fs";

const dir = process.argv[2];
if (!dir) throw new Error("usage: submenu-forensics.ts <compare-out-dir>");
const files = readdirSync(dir).filter((f) => /^oracle-(\d+)\.png$/.test(f));
files.sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
function load(n: number, side = "oracle"): PNG {
  return PNG.sync.read(readFileSync(`${dir}/${side}-${String(n).padStart(5, "0")}.png`));
}
function color(p: PNG, x: number, y: number): string {
  const i = (y * p.width + x) * 4;
  return `${p.data[i]},${p.data[i + 1]},${p.data[i + 2]}`;
}
const frameCols = new Set(["74,74,107", "115,107,132", "222,214,222", "173,189,173", "99,99,148", "115,115,173", "140,140,206"]);

let fail = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!cond) fail++;
}

// (a) geometry: oracle frame bbox in cols 130-240
const f927 = load(927);
let minX = 240, maxX = 0, minY = 160, maxY = 0;
for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
  if (frameCols.has(color(f927, x, y))) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
// The message window frame at x0-141 also matches frame colors; the submenu is the
// right-hand block. Restrict to x>=144.
let wminX = 240, wmaxX = 0, wminY = 160, wmaxY = 0;
for (let y = 90; y < 160; y++) for (let x = 144; x < 240; x++) {
  if (frameCols.has(color(f927, x, y))) {
    if (x < wminX) wminX = x;
    if (x > wmaxX) wmaxX = x;
    if (y < wminY) wminY = y;
    if (y > wmaxY) wmaxY = y;
  }
}
check("oracle submenu frame rect", wminX === 146 && wmaxX === 237 && wminY === 98 && wmaxY === 157,
  `(${wminX},${wminY})-(${wmaxX},${wmaxY})`);

// interior white
let ifirst = -1, ilast = -1, ifirstY = 160, ilastY = 0;
for (let y = 90; y < 160; y++) {
  let rowFirst = -1, rowLast = -1;
  for (let x = 144; x < 240; x++) {
    if (color(f927, x, y) === "255,255,255") { if (rowFirst < 0) rowFirst = x; rowLast = x; }
  }
  if (rowFirst === 150) { if (y < ifirstY) ifirstY = y; if (y > ilastY) ilastY = y; }
}
// find interior x-extent on a mid row (y120, no text on this row between lines)
for (let x = 144; x < 240; x++) if (color(f927, x, 120) === "255,255,255") { if (ifirst < 0) ifirst = x; ilast = x; }
check("oracle submenu interior white", ifirst === 150 && ilast === 233 && ifirstY === 102 && ilastY === 153,
  `(${ifirst},${ifirstY})-(${ilast},${ilastY})`);

// (b) text ink rows and origins
function inkProfile(y0: number, y1: number): Map<number, number> {
  const m = new Map<number, number>();
  for (let x = 144; x < 240; x++) {
    let n = 0;
    for (let y = y0; y <= y1; y++) if (color(f927, x, y) === "214,214,206") n++;
    if (n) m.set(x, n);
  }
  return m;
}
const l1 = inkProfile(108, 117);
const l2 = inkProfile(124, 133);
const l3 = inkProfile(140, 149);
// Text is at window-relative x=8 -> screen x=160; the cursor ▶ (x153-158) is a
// separate glyph on line 1, so exclude x<160 when measuring the SEND OUT string.
const minxText1 = [...l1.keys()].find((x) => x >= 160);
const minx2 = [...l2.keys()][0];
const minx3 = [...l3.keys()][0];
check("line1 SEND OUT text x", minxText1 === 160, `text start x=${minxText1}`);
check("line2 SUMMARY text x", minx2 === 160, `text start x=${minx2}`);
check("line3 CANCEL text x", minx3 === 160, `text start x=${minx3}`);
// cursor arrow: the ink run left of the text on line 1 (x153-158)
let arrow = -1;
for (let x = 144; x < 160; x++) if (inkProfile(108, 117).has(x)) { arrow = x; break; }
check("cursor ▶ on line 1 at x", arrow === 153, `arrow ink starts x=${arrow}`);

// (c) static across 926-963
let windowMotion = 0, iconMotion = 0, maxMotion = 0;
for (let n = 927; n <= 963; n++) {
  const a = load(n - 1), b = load(n);
  let w = 0, icon = 0;
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4;
    if (a.data[i] !== b.data[i]) {
      const inWin = x >= 146 && x <= 237 && y >= 98 && y <= 157;
      const inIcon = x >= 7 && x <= 112 && y >= 9 && y <= 55;
      if (inWin) w++;
      else if (inIcon) icon++;
      else maxMotion++;
    }
  }
  windowMotion += w;
  iconMotion += icon;
}
check("submenu window byte-static 927-963", windowMotion === 0, `window px changed across 927-963: ${windowMotion}`);
check("only icon toggles move (488px x5)", iconMotion === 488 * 5, `icon toggle px total: ${iconMotion}`);

// (d) one-frame pop
const f925 = load(925), f926 = load(926);
let pop = 0;
for (let y = 98; y <= 157; y++) for (let x = 146; x <= 237; x++) {
  const i = (y * 240 + x) * 4;
  if (f925.data[i] !== f926.data[i]) pop++;
}
check("window pops in one frame at 926", pop > 4500, `925→926 window-region change px: ${pop}`);

// app delta: interior white top row (post-fix: matches the oracle at y102;
// the old scaffold drew it 16px too high at y86, docs/fade-layer-forensics.md
// §10(a))
const app = load(927, "app");
let appTop = 160;
for (let y = 70; y < 160; y++) {
  let isWhite = true;
  for (let x = 150; x <= 233; x++) if (color(app, x, y) !== "255,255,255") { isWhite = false; break; }
  if (isWhite) { appTop = y; break; }
}
check("app submenu interior top matches oracle", appTop === 102, `app interior top y=${appTop} (oracle 102)`);

console.log(fail === 0 ? "\nALL CHECKS PASS" : `\n${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
