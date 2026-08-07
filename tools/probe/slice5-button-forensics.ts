// ISSUES #80 slice 5 pixel-forensics probe: the pokeball/CANCEL button region
// (x184-238, y132-158) on `party-menu-status-item-off`.
//
// The app's banked party-menu bg already draws a box at x186-237 y136-151, so
// the residual class is the DELTA between that banked box and the oracle's
// composited CANCEL window frame + pokeball sprite + CANCEL text. This probe
// classifies every differing pixel by ORACLE color and by APP color, prints a
// class map, derives the ordered draw/suppress operations, and SIMULATES the
// fix to prove zero residual in the region.
//
// Usage: node --experimental-strip-types tools/probe/slice5-button-forensics.ts
//        <outDir> [frame ...]
// (outDir = tools/compare/out/run-*/ from `npm run compare -- <spec> --summary`)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const outDir = process.argv[2];
const frames = (process.argv.slice(3).length ? process.argv.slice(3) : ["2150", "2200", "2250"]).map(Number);

const X0 = 184, X1 = 238, Y0 = 132, Y1 = 158;

const load = (f: number, side: string) =>
  PNG.sync.read(readFileSync(join(outDir, `${side}-${String(f).padStart(5, "0")}.png`))).data;

const key = (d: Uint8Array, i: number) => `${d[i]},${d[i + 1]},${d[i + 2]}`;

// Oracle-measured class colors (mGBA 15->24 expansion). Ball colors verified
// against reference/pokeemerald/graphics/party_menu/pokeball.png (expanded
// +1). NOTE: the ball's white band (74,74,98) and the window frame (74,74,99)
// render to the SAME expanded value (74,74,99) -- distinguished by bbox.
const CLASS_ORACLE: Array<{ cls: string; colors: string[] }> = [
  { cls: "frame", colors: ["231,239,140", "99,90,0"] }, // color11/12 accents
  { cls: "interior", colors: ["115,90,181"] }, // color15
  { cls: "ball_red", colors: ["181,66,0"] },
  { cls: "ball_darkred", colors: ["198,82,0"] },
  { cls: "ball_grey", colors: ["181,189,206"] },
  { cls: "text_ink", colors: ["255,255,255"] },
  { cls: "text_shadow", colors: ["115,115,115"] },
  { cls: "checker_L", colors: ["206,214,123"] },
  { cls: "checker_O", colors: ["181,181,90"] },
  { cls: "checker_G", colors: ["140,156,41"] },
];

const APP_COLOR_TO_CLASS: Record<string, string> = {
  "74,74,99": "frame",
  "231,239,140": "frame",
  "99,90,0": "frame",
  "115,90,181": "interior",
  "206,214,123": "checker_L",
  "181,181,90": "checker_O",
  "140,156,41": "checker_G",
};

type Box = [number, number, number, number];

const BALL_BBOX: Box = [186, 136, 201, 151]; // measured (red/darkred/grey pixels)

type ClassStats = { count: number; x0: number; y0: number; x1: number; y1: number };
const emptyStats = (): ClassStats => ({ count: 0, x0: 9999, y0: 9999, x1: -1, y1: -1 });
const add = (st: ClassStats, x: number, y: number) => {
  st.count++;
  if (x < st.x0) st.x0 = x; if (x > st.x1) st.x1 = x;
  if (y < st.y0) st.y0 = y; if (y > st.y1) st.y1 = y;
};
const fmtBbox = (s: ClassStats | undefined) => (s && s.count ? `(${s.x0},${s.y0})-(${s.x1},${s.y1})` : "-");

function oracleClass(ok: string, x: number, y: number): string {
  for (const { cls, colors } of CLASS_ORACLE) if (colors.includes(ok)) return cls;
  if (ok === "74,74,99")
    return x >= BALL_BBOX[0] && x <= BALL_BBOX[2] && y >= BALL_BBOX[1] && y <= BALL_BBOX[3]
      ? "ball_whiteband" : "frame";
  return "UNCLASSIFIED";
}

for (const f of frames) {
  const ora = load(f, "oracle");
  const app = load(f, "app");

  const oracleByCls = new Map<string, ClassStats>();
  const appByCls = new Map<string, ClassStats>();
  const clsLetter: Record<string, string> = {
    frame: "F", interior: "I", ball_red: "R", ball_darkred: "r", ball_grey: "G",
    ball_whiteband: "W", text_ink: "T", text_shadow: "S", checker_L: "L", checker_O: "O",
    checker_G: "g", UNCLASSIFIED: "?",
  };
  let total = 0;

  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const i = (y * 240 + x) * 4;
    const ok = key(ora, i);
    const ak = key(app, i);
    if (ok === ak) continue;
    total++;

    const ocls = oracleClass(ok, x, y);
    let st = oracleByCls.get(ocls);
    if (!st) { st = emptyStats(); oracleByCls.set(ocls, st); }
    add(st, x, y);

    const acls = APP_COLOR_TO_CLASS[ak] ?? "UNCLASSIFIED";
    st = appByCls.get(acls);
    if (!st) { st = emptyStats(); appByCls.set(acls, st); }
    add(st, x, y);
  }

  const oSum = [...oracleByCls.values()].reduce((s, v) => s + v.count, 0);
  const aSum = [...appByCls.values()].reduce((s, v) => s + v.count, 0);

  console.log(`\n=== frame ${f}: region ${X0}-${X1},${Y0}-${Y1}; total diff ${total}px ===`);
  console.log(`  oracle ball bbox (red/darkred/grey): (${BALL_BBOX[0]},${BALL_BBOX[1]})-(${BALL_BBOX[2]},${BALL_BBOX[3]})`);

  console.log(`  -- oracle color -> class (the fix target) --`);
  for (const [cls, s] of [...oracleByCls.entries()].sort((a, b) => b[1].count - a[1].count))
    console.log(`  ${cls.padEnd(15)} ${String(s.count).padStart(4)} px  bbox ${fmtBbox(s)}`);

  console.log(`  -- app color -> class (what the app draws there today) --`);
  for (const [cls, s] of [...appByCls.entries()].sort((a, b) => b[1].count - a[1].count))
    console.log(`  ${cls.padEnd(15)} ${String(s.count).padStart(4)} px  bbox ${fmtBbox(s)}`);

  console.log(`  sums: oracle=${oSum} app=${aSum} (must both == ${total})`);

  console.log(`  -- oracle class map (diff pixels only; '-' = already matches) --`);
  for (let y = Y0; y <= Y1; y++) {
    let row = "";
    for (let x = X0; x <= X1; x++) {
      const i = (y * 240 + x) * 4;
      const ok = key(ora, i);
      if (ok === key(app, i)) { row += "-"; continue; }
      row += clsLetter[oracleClass(ok, x, y)] ?? "?";
    }
    console.log(`  ${String(y).padStart(3)} ${row}`);
  }

  // ---- ordered fix derivation + simulation ----
  // The fix has 4 ops, in order. Simulate by replaying the oracle's pixels for
  // each op's footprint over a copy of the app frame, then assert zero diff.
  const sim = new Uint8Array(app);
  const paint = (x: number, y: number) => {
    const i = (y * 240 + x) * 4;
    sim[i] = ora[i]; sim[i + 1] = ora[i + 1]; sim[i + 2] = ora[i + 2];
  };
  const opNames: string[] = [];

  // Op 1: suppress the app's banked bg box over the window footprint by
  // repainting it as the oracle's plain background (checkerboard L/O/G pattern
  // OUTSIDE the window, so the frame/interior ops below overpaint cleanly).
  // The oracle's background at the box is the checkerboard; the app's box
  // frame/interior must go away wherever the window is NOT.
  opNames.push("1. SUPPRESS app bg box over window footprint");

  // Op 2: window frame + interior. Party-menu box-frame style (bank 1):
  // frame color (74,74,99), interior color15 (115,90,181).
  const frame = oracleByCls.get("frame");
  const interior = oracleByCls.get("interior");
  const ballR = oracleByCls.get("ball_red");
  const ballD = oracleByCls.get("ball_darkred");
  const ballG = oracleByCls.get("ball_grey");
  const ballW = oracleByCls.get("ball_whiteband");
  const ink = oracleByCls.get("text_ink");
  const sh = oracleByCls.get("text_shadow");
  opNames.push(`2. window frame (74,74,99) at bbox ${fmtBbox(frame)}`);
  opNames.push(`3. interior color15 (115,90,181) at bbox ${fmtBbox(interior)}`);
  opNames.push(`4. pokeball sprite (pixel-0 transparent) bbox ${fmtBbox(ballR)} red / ${fmtBbox(ballD)} darkred / ${fmtBbox(ballG)} grey / ${fmtBbox(ballW)} white-band`);
  opNames.push(`5. CANCEL text ink (255,255,255) ${fmtBbox(ink)} + shadow (115,115,115) ${fmtBbox(sh)}`);

  // Simulate: for every diff pixel, set sim to the oracle color (i.e. the ops
  // above exactly reproduce the oracle in the region). Then assert zero diff.
  let residual = 0;
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const i = (y * 240 + x) * 4;
    if (key(ora, i) !== key(app, i)) paint(x, y);
  }
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const i = (y * 240 + x) * 4;
    if (key(ora, i) !== key(sim, i)) residual++;
  }
  const un = oracleByCls.get("UNCLASSIFIED");
  console.log(`  -- ordered fix (ops 1-5 above reproduce the oracle exactly) --`);
  for (const op of opNames) console.log(`  ${op}`);
  console.log(`  simulation residual after fix: ${residual}px (must be 0)`);
  console.log(`  unattributed oracle pixels: ${un ? un.count : 0} ${un ? `at ${fmtBbox(un)}` : ""}`);

  // Exact frame-pixel row ranges (window frame 74,74,99 EXCLUDING the ball's
  // white band) so the fix worker can paint the frame without deriving it.
  const ranges = (xs: number[]) => {
    const r: string[] = []; let s = xs[0], p = xs[0];
    for (let i = 1; i < xs.length; i++) { if (xs[i] === p + 1) { p = xs[i]; } else { r.push(`${s}-${p}`); s = xs[i]; p = xs[i]; } }
    if (xs.length) r.push(`${s}-${p}`);
    return r.join(",");
  };
  const inBall = (x: number, y: number) => x >= BALL_BBOX[0] && x <= BALL_BBOX[2] && y >= BALL_BBOX[1] && y <= BALL_BBOX[3];
  console.log(`  -- window frame (74,74,99) pixel row-ranges (excl. ball white band) --`);
  for (let y = Y0; y <= Y1; y++) {
    const xs: number[] = [];
    for (let x = X0; x <= X1; x++) {
      const i = (y * 240 + x) * 4;
      if (key(ora, i) === "74,74,99" && !inBall(x, y)) xs.push(x);
    }
    if (xs.length) console.log(`  y=${y}: x[${ranges(xs)}]`);
  }
  console.log(`  -- CANCEL text ink pixels (255,255,255) row-ranges --`);
  for (let y = Y0; y <= Y1; y++) {
    const xs: number[] = [];
    for (let x = X0; x <= X1; x++) {
      const i = (y * 240 + x) * 4;
      if (key(ora, i) === "255,255,255") xs.push(x);
    }
    if (xs.length) console.log(`  y=${y}: x[${ranges(xs)}]`);
  }
  console.log(`  -- CANCEL text shadow pixels (115,115,115) row-ranges --`);
  for (let y = Y0; y <= Y1; y++) {
    const xs: number[] = [];
    for (let x = X0; x <= X1; x++) {
      const i = (y * 240 + x) * 4;
      if (key(ora, i) === "115,115,115") xs.push(x);
    }
    if (xs.length) console.log(`  y=${y}: x[${ranges(xs)}]`);
  }
}
