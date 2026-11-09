/**
 * ISSUES #97 remainder, SIDE-lane instrument (docs/turn5-resolve-offc-tail-
 * diagnosis.md §11e's own flagged "probable fourth mechanism"): pins the
 * `TURN5_MATERIALIZE_RAMP_COEFF` falling-edge residual across render ticks
 * 6763-6783 for `turn5-resolve-off-c`, the same "one-tick-early falling
 * edge" question §4c/§4d already answered for `TURN5_BG_FADE_Y` - here on
 * PIDGEOTTO's own sprite recolor ramp instead of the background.
 *
 * Method: EXACT integer inversion of `blendComponentToward` (battleScene.ts:
 * 5789-5794), not a least-squares fit. That formula is:
 *   c5 = component8 >> 3; t5 = target8 >> 3
 *   b5 = c5 + ((t5 - c5) * coeff) >> 4        (coeff in 0..16)
 *   component8_out = (b5 << 3) | (b5 >> 2)
 * which is invertible per-channel: given an observed rendered component8,
 * b5_observed = component8 >> 3 recovers b5 exactly (the 5->8 expansion is
 * bijective over the 32 values `blendComponentToward` can produce), then
 * trying every integer coeff 0..16 against the KNOWN base color (read
 * directly off a tick where both app and oracle are already independently
 * confirmed at coeff=0 - `oracle-06785.png`/`app-06785.png`, pixel-exact
 * per §11c) and the KNOWN tint target (`ballOpenFadeColor.rgb8` =
 * (255,181,247), battle-anim-tables.json, the same constant
 * `MATERIALIZE_TINT_COLOR` uses) finds the UNIQUE coeff (if any) that
 * reproduces the observed byte exactly - a much stronger instrument than a
 * fuzzy back-solve, and directly comparable to the app's own
 * `turn5MaterializeCoeff(t)` return value tick-for-tick.
 *
 * Run: node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-materialize-tint-probe.ts <run-out-dir>
 * (run-out-dir = a `tools/compare/out/run-*` directory from a
 * `npm run compare -- turn5-resolve-off-c --capture-range 6755:6790` covering
 * the window; defaults to `tools/compare/out/latest` if omitted.)
 */
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { join } from "node:path";
import { PNG } from "pngjs";
import { turn5MaterializeCoeff } from "../../src/engine/battleScene.ts";

const runDir = process.argv[2] ?? join(import.meta.dirname, "../compare/out/latest");

const RANGE: readonly [number, number] = [6763, 6790];

// `ballOpenFadeColor.rgb8` (src/data/gen/battle-anim-tables.json) - same
// constant `MATERIALIZE_TINT_COLOR` (battleScene.ts:5419) resolves to.
const TINT_TARGET = { r: 255, g: 181, b: 247 } as const;

// PIDGEOTTO's own sprite silhouette coordinates §11c already validated as
// matching exactly (outside the particle-tail footprint x=127-145,y=23-61
// and outside the healthbox region) - reused verbatim here since the real
// sprite's scale/position is RAM-confirmed static across this whole window
// (§11a: a=d=256,y2=0 from RAM 6756/render 6757 onward).
const COORDS: ReadonlyArray<readonly [string, number, number]> = [
  ["silhouette_175_30", 175, 30],
  ["silhouette_190_50", 190, 50],
  ["silhouette_160_45", 160, 45],
];

function loadPng(name: string): Buffer {
  return PNG.sync.read(readFileSync(join(runDir, name))).data;
}

function pixelAt(buf: Buffer, x: number, y: number): { r: number; g: number; b: number } {
  const o = (y * 240 + x) * 4;
  return { r: buf[o]!, g: buf[o + 1]!, b: buf[o + 2]! };
}

// Exact inversion of blendComponentToward for one channel: given base8,
// target8, and an observed rendered component8, return the set of integer
// coeffs in 0..16 that reproduce it exactly.
function coeffsMatching(base8: number, target8: number, observed8: number): number[] {
  const c5 = base8 >> 3;
  const t5 = target8 >> 3;
  const observedB5 = observed8 >> 3;
  const matches: number[] = [];
  for (let coeff = 0; coeff <= 16; coeff += 1) {
    const b5 = coeff > 0 ? c5 + (((t5 - c5) * coeff) >> 4) : c5;
    const predicted8 = (b5 << 3) | (b5 >> 2);
    if (predicted8 === observed8) matches.push(coeff);
  }
  return matches;
}

function pad(t: number): string {
  return String(t).padStart(5, "0");
}

const baseline: Record<string, { r: number; g: number; b: number }> = {};
for (const [name, x, y] of COORDS) {
  const oracleBase = pixelAt(loadPng(`oracle-${pad(6785)}.png`), x, y);
  const appBase = pixelAt(loadPng(`app-${pad(6785)}.png`), x, y);
  if (oracleBase.r !== appBase.r || oracleBase.g !== appBase.g || oracleBase.b !== appBase.b) {
    throw new Error(`${name}: app/oracle disagree at the t=6785 base tick (${JSON.stringify(appBase)} vs ${JSON.stringify(oracleBase)}) - §11c's "pixel-exact at 6785" premise doesn't hold at this coordinate, pick another`);
  }
  baseline[name] = oracleBase;
}

interface Row {
  tick: number;
  appReportedCoeff: number;
  perCoord: Record<string, {
    base: { r: number; g: number; b: number };
    oracle: { r: number; g: number; b: number };
    app: { r: number; g: number; b: number };
    oracleImpliedCoeff: { r: number[]; g: number[]; b: number[] };
    appImpliedCoeff: { r: number[]; g: number[]; b: number[] };
    pixelMatch: boolean;
  }>;
}

const rows: Row[] = [];
for (let t = RANGE[0]; t <= RANGE[1]; t += 1) {
  const oraclePng = loadPng(`oracle-${pad(t)}.png`);
  const appPng = loadPng(`app-${pad(t)}.png`);
  const perCoord: Row["perCoord"] = {};
  for (const [name, x, y] of COORDS) {
    const base = baseline[name]!;
    const oracle = pixelAt(oraclePng, x, y);
    const app = pixelAt(appPng, x, y);
    perCoord[name] = {
      base,
      oracle,
      app,
      oracleImpliedCoeff: {
        r: coeffsMatching(base.r, TINT_TARGET.r, oracle.r),
        g: coeffsMatching(base.g, TINT_TARGET.g, oracle.g),
        b: coeffsMatching(base.b, TINT_TARGET.b, oracle.b),
      },
      appImpliedCoeff: {
        r: coeffsMatching(base.r, TINT_TARGET.r, app.r),
        g: coeffsMatching(base.g, TINT_TARGET.g, app.g),
        b: coeffsMatching(base.b, TINT_TARGET.b, app.b),
      },
      pixelMatch: oracle.r === app.r && oracle.g === app.g && oracle.b === app.b,
    };
  }
  rows.push({ tick: t, appReportedCoeff: turn5MaterializeCoeff(t), perCoord });
}

const outPath = new URL("../../artifacts/turn5-resolve-offc-materialize-tint-probe.json", import.meta.url);
writeFileSync(outPath, JSON.stringify({ runDir, range: RANGE, tintTarget: TINT_TARGET, coords: COORDS, baseline, rows }, null, 0));
console.log(`wrote ${rows.length} rows to ${outPath.pathname}`);

console.log("\ntick | appCoeff | " + COORDS.map(([name]) => name).join(" | "));
for (const row of rows) {
  const cells = COORDS.map(([name]) => {
    const c = row.perCoord[name]!;
    const oc = c.oracleImpliedCoeff.r.join(",") || "NONE";
    const ac = c.appImpliedCoeff.r.join(",") || "NONE";
    return `oracle=${oc} app=${ac} ${c.pixelMatch ? "MATCH" : "DIFF"}`;
  });
  console.log(`${row.tick} | ${row.appReportedCoeff} | ${cells.join(" | ")}`);
}
