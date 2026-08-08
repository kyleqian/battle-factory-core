// Rerunnable forensics probe for ISSUES #80 open-window residual classes A and B
// (docs/fade-layer-forensics.md §8). Reads oracle + app captures from a
// `npm run compare -- mid-battle-switch-dense-a-off --capture-range 758:790
// --summary` out dir and verifies, with a PASS/FAIL verdict:
//
//   1. Class A: the 8 OBJ-lag frames (766/768/770/772/774/776/778/780) each
//      carry ~7400-7600 diff px over bbox (13,16)-(229,111); the OBJ mask
//      derived from the oracle alone (unchanged 765->766, changed 766->767)
//      is 7528 px and equals the app-vs-oracle diff at 766 exactly.
//   2. Class B: the 5 frames 771/773/775/777/779 each carry 1639 (2037 at
//      779) diff px, entirely inside the player-healthbox region
//      (127,74)-(229,111) (at 779 bbox widens to 49,74 to include the back
//      sprite). The dominant residual class is the healthbox's 1-row-down
//      content shift: from frame 770 onward, ~1619 px of the healthbox show
//      the settled color of the pixel one row ABOVE them, at the same OBJ
//      blend y -- i.e. oracle(x,y) == blend(settled(x,y-1), y_obj). This is
//      NOT the opponent front sprite (byte-exact there) and NOT a third fade
//      schedule (the healthbox interior tracks y_obj exactly, §6).
//   3. The healthbox interior reference pixel (145,78) tracks y_obj (§6
//      closed forms) per frame 766-781 -- no third schedule.
//   4. Edges: 763-765 byte-exact; 766/768/770 are Class A; 771 is the first
//      frame the Class-B residual appears as the SOLE diff (first odd-e
//      frame after the content shift begins at 770).
//
// Usage: node --experimental-strip-types tools/probe/fade-open-residual.ts
//   <compare-out-dir>
//   (must contain oracle-00758..oracle-00790.png and app-00758..app-00790.png;
//    a missing capture is a FAIL, not a skip.)
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const [outDir] = process.argv.slice(2);
if (!outDir) {
  console.error("usage: node --experimental-strip-types tools/probe/fade-open-residual.ts <compare-out-dir>");
  process.exit(2);
}

function expand5(v: number): number {
  return (v << 3) | (v >> 2);
}
function blendToBlack(c5: number, y: number): number {
  return c5 + (((0 - c5) * y) >> 4);
}
function blend24(col: [number, number, number], y: number): [number, number, number] {
  const b = [col[0] >> 3, col[1] >> 3, col[2] >> 3];
  return [
    expand5(blendToBlack(b[0]!, y)),
    expand5(blendToBlack(b[1]!, y)),
    expand5(blendToBlack(b[2]!, y)),
  ];
}
function blendBase5(base: [number, number, number], y: number): [number, number, number] {
  return [
    expand5(blendToBlack(base[0], y)),
    expand5(blendToBlack(base[1], y)),
    expand5(blendToBlack(base[2], y)),
  ];
}

function loadPng(f: number, kind: "oracle" | "app"): Uint8Array | null {
  const path = join(outDir!, `${kind}-${String(f).padStart(5, "0")}.png`);
  if (!existsSync(path)) return null;
  return PNG.sync.read(readFileSync(path)).data;
}
function px(data: Uint8Array, x: number, y: number): [number, number, number] {
  const i = (y * 240 + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}
function diffStats(o: Uint8Array, a: Uint8Array): { n: number; bbox: [number, number, number, number] | null } {
  let n = 0;
  let x0 = 999, y0 = 999, x1 = -1, y1 = -1;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      if (o[i] !== a[i] || o[i + 1] !== a[i + 1] || o[i + 2] !== a[i + 2]) {
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { n, bbox: n ? [x0, y0, x1, y1] : null };
}
const eq = (c1: [number, number, number], c2: [number, number, number]): boolean =>
  c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2];

// §6 closed forms (openElapsed e = frame - 763).
const yBg = (e: number): number => Math.min(16, 2 * Math.max(0, Math.floor((e - 1) / 2)));
const yObj = (e: number): number => Math.min(16, 2 * Math.max(0, Math.floor((e - 2) / 2)));

let failures = 0;
const fail = (msg: string): void => { failures++; console.error(`  FAIL: ${msg}`); };
const near = (v: number, e: number, tol: number): boolean => Math.abs(v - e) <= tol;

const CLASS_A = [766, 768, 770, 772, 774, 776, 778, 780];
const CLASS_B = [771, 773, 775, 777, 779];
const CLASS_A_EXPECT: Record<number, number> = {
  766: 7528, 768: 7350, 770: 7453, 772: 7453, 774: 7626, 776: 7443, 778: 7453, 780: 6939,
};

console.log("== §8.1 edge / hold frames (758-765) ==");
let edgeOk = true;
for (const f of [758, 759, 760]) {
  const o = loadPng(f, "oracle");
  const a = loadPng(f, "app");
  if (!o || !a) { edgeOk = false; fail(`frame ${f}: missing capture (oracle or app)`); continue; }
  const d = diffStats(o, a);
  const ok = near(d.n, 538, 5);
  if (!ok) { edgeOk = false; fail(`frame ${f}: diff px ${d.n} expected ~538`); }
  console.log(`  ${f}: diff ${d.n} px bbox=${d.bbox ? d.bbox.join(",") : "none"} ${ok ? "OK" : "MISMATCH"}`);
}
for (const f of [761, 762, 763, 764, 765]) {
  const o = loadPng(f, "oracle");
  const a = loadPng(f, "app");
  if (!o || !a) { edgeOk = false; fail(`frame ${f}: missing capture`); continue; }
  const d = diffStats(o, a);
  if (d.n !== 0) { edgeOk = false; fail(`frame ${f}: expected byte-exact, diff=${d.n}`); }
  console.log(`  ${f}: diff ${d.n} px ${d.n === 0 ? "OK (byte-exact)" : "MISMATCH"}`);
}
console.log(`  §8.1 ${edgeOk ? "PASS" : "FAIL"}`);

console.log("== §8.2 Class A frames (OBJ-lag) ==");
let classAOk = true;
for (const f of CLASS_A) {
  const o = loadPng(f, "oracle");
  const a = loadPng(f, "app");
  if (!o || !a) { classAOk = false; fail(`frame ${f}: missing capture`); continue; }
  const d = diffStats(o, a);
  const exp = CLASS_A_EXPECT[f]!;
  const okN = near(d.n, exp, 5);
  const okB = !!d.bbox && d.bbox[0] <= 13 && d.bbox[1] <= 16 && d.bbox[2] >= 229 && d.bbox[3] >= 110;
  if (!okN) { classAOk = false; fail(`frame ${f}: diff px ${d.n} expected ~${exp}`); }
  if (!okB) { classAOk = false; fail(`frame ${f}: bbox ${d.bbox ? d.bbox.join(",") : "none"} not (13,16)-(229,111)+`); }
  console.log(`  ${f}: diff ${d.n} px bbox=${d.bbox ? d.bbox.join(",") : "none"} (exp ~${exp}, bbox 13,16-229,111) ${okN && okB ? "OK" : "MISMATCH"}`);
}
console.log(`  §8.2 ${classAOk ? "PASS" : "FAIL"}`);

console.log("== §8.3 OBJ mask from the oracle (765->766->767) ==");
{
  const o765 = loadPng(765, "oracle");
  const o766 = loadPng(766, "oracle");
  const o767 = loadPng(767, "oracle");
  const a766 = loadPng(766, "app");
  if (!o765 || !o766 || !o767 || !a766) {
    fail("missing capture for OBJ mask (need 765/766/767 oracle + 766 app)");
  } else {
    const obj: Array<[number, number]> = [];
    for (let y = 0; y < 160; y++) {
      for (let x = 0; x < 240; x++) {
        if (eq(px(o765, x, y), px(o766, x, y)) && !eq(px(o766, x, y), px(o767, x, y))) obj.push([x, y]);
      }
    }
    const d = diffStats(o766, a766);
    const sameAsAppDiff = d.n === obj.length && obj.every(([x, y]) => !eq(px(o766, x, y), px(a766, x, y)));
    const ok = near(obj.length, 7528, 5) && sameAsAppDiff;
    if (!near(obj.length, 7528, 5)) { fail(`OBJ mask ${obj.length} px expected ~7528`); }
    if (!sameAsAppDiff) { fail(`OBJ mask does not equal the app-vs-oracle diff at 766 (${obj.length} vs ${d.n})`); }
    console.log(`  OBJ mask: ${obj.length} px (exp ~7528); 766 app-diff ${d.n} px; sets equal: ${sameAsAppDiff} ${ok ? "OK" : "MISMATCH"}`);
    const xs = obj.map(([x]) => x); const ys = obj.map(([, y]) => y);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
    console.log(`  OBJ mask bbox: (${x0},${y0})-(${x1},${y1}) (exp (13,16)-(229,111))`);
  }
}

console.log("== §8.4 Class B frames (healthbox residual) ==");
let classBOk = true;
const HEALTH = { x0: 127, y0: 74, x1: 230, y1: 112 };
for (const f of CLASS_B) {
  const o = loadPng(f, "oracle");
  const a = loadPng(f, "app");
  const s = loadPng(765, "oracle");
  if (!o || !a || !s) { classBOk = false; fail(`frame ${f}: missing capture`); continue; }
  const d = diffStats(o, a);
  const exp = f === 779 ? 2037 : 1639;
  const okN = near(d.n, exp, 5);
  const insideHealth = !!d.bbox
    && d.bbox[0] >= HEALTH.x0 && d.bbox[1] >= HEALTH.y0
    && d.bbox[2] <= HEALTH.x1 && d.bbox[3] <= HEALTH.y1;
  // 779's bbox intentionally widens to include the player's back sprite
  // (x=49..95) -- the same 1-row content-shift residual.
  const insideHealth779 = !!d.bbox
    && d.bbox[0] >= 49 && d.bbox[1] >= 74
    && d.bbox[2] <= 230 && d.bbox[3] <= 112;
  if (!okN) { classBOk = false; fail(`frame ${f}: diff px ${d.n} expected ~${exp}`); }
  if (f === 779 ? !insideHealth779 : !insideHealth) {
    classBOk = false;
    fail(`frame ${f}: bbox ${d.bbox ? d.bbox.join(",") : "none"} not within ${f === 779 ? "(49,74)-(230,111)" : "healthbox (127,74)-(230,111)"}`);
  }
  // dominant class: 1-row-down content shift at y_obj (healthbox interior is on the OBJ schedule, §6).
  const y = yObj(f - 763);
  let shifted = 0;
  for (let yy = 0; yy < 160; yy++) {
    for (let x = 0; x < 240; x++) {
      const t = px(o, x, yy);
      if (eq(t, px(a, x, yy))) continue;
      if (yy - 1 >= 0 && eq(t, blend24(px(s, x, yy - 1), y))) shifted++;
    }
  }
  const okShift = shifted >= (f === 779 ? 350 : 1550);
  if (!okShift) { classBOk = false; fail(`frame ${f}: shifted-to-row-above px ${shifted} expected >= ${f === 779 ? 350 : 1550} of ${d.n}`); }
  console.log(`  ${f}: diff ${d.n} px bbox=${d.bbox ? d.bbox.join(",") : "none"} (exp ${exp}, ${f === 779 ? "widened healthbox+back-sprite" : "healthbox"} region) | row-above shift ${shifted}/${d.n} @y_obj=${y} ${okN && (f === 779 ? insideHealth779 : insideHealth) && okShift ? "OK" : "MISMATCH"}`);
}
console.log(`  §8.4 ${classBOk ? "PASS" : "FAIL"}`);

console.log("== §8.5 healthbox interior tracks y_obj (no third schedule) ==");
let schedOk = true;
const INTERIOR: [number, number] = [145, 78];
const INTERIOR_BASE: [number, number, number] = [31, 31, 27]; // (255,255,222)
function decodeY(r: number, g: number, b: number, base: [number, number, number]): number {
  let best = { y: -1, err: Infinity };
  for (let y = 0; y <= 16; y++) {
    const c = blendBase5(base, y);
    const err = Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b);
    if (err < best.err) best = { y, err };
  }
  return best.err <= 2 ? best.y : -1;
}
for (let f = 766; f <= 781; f++) {
  const o = loadPng(f, "oracle");
  if (!o) { schedOk = false; fail(`frame ${f}: missing capture`); continue; }
  const c = px(o, INTERIOR[0], INTERIOR[1]);
  const measured = decodeY(c[0], c[1], c[2], INTERIOR_BASE);
  const exp = yObj(f - 763);
  if (measured !== exp) { schedOk = false; fail(`frame ${f}: interior y=${measured} expected y_obj=${exp}`); }
  console.log(`  ${f}: interior (145,78)=${c} -> y=${measured} exp y_obj=${exp} ${measured === exp ? "OK" : "MISMATCH"}`);
}
console.log(`  §8.5 ${schedOk ? "PASS" : "FAIL"}`);

console.log("== §8.6 why 771, not 766 ==");
{
  // 766/768/770 are Class A (whole healthbox differs, OBJ-lag); 767/769 byte-exact;
  // the content shift begins at 770; 771 is the first BG==OBJ frame isolating it.
  const o770 = loadPng(770, "oracle");
  const a770 = loadPng(770, "app");
  if (!o770 || !a770) {
    fail("missing capture for §8.6 (need 770)");
  } else {
    const d770 = diffStats(o770, a770);
    const oks = d770.n >= 7000;
    if (!oks) { fail(`frame 770 diff ${d770.n} px expected >= 7000 (Class A, content shift present but masked)`); }
    console.log(`  frame 770 (first shifted, Class A): diff ${d770.n} px >= 7000 ${oks ? "OK" : "MISMATCH"}`);
  }
}

console.log(failures === 0 ? "\nALL CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
