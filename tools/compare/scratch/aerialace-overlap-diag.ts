// Mission A scratch diagnostic (worktree PROBE step, no src/ changes):
// pixel-dump app-vs-oracle at the AERIAL_ACE overlap residual, renders
// 12368-12373, classify each mismatched pixel's oracle color against
// candidate palettes (Pidgeotto OBJ palette undarkened/darkened, BG
// undarkened/darkened, and the BlendPalette-formula clone-blend output).
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";
import { renderAppTrace } from "../appTrace.ts";
import opponentFrontSpritesAsset from "../../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import battleBgAsset from "../../../src/assets/gen/battle-bg.json" with { type: "json" };

const trace = JSON.parse(
  readFileSync("tools/compare/traces-groundtruth/battle1-turn10-dense.json", "utf8"),
) as Trace;
trace.captureFrames = [12367, 12368, 12369, 12370, 12371, 12372, 12373];

const [{ captures: oracleCaptures }, appCaptures] = await Promise.all([
  runOracleTrace(trace),
  renderAppTrace(trace),
]);

function pngToRgba(buf: Buffer): Uint8Array {
  return PNG.sync.read(buf).data;
}

type Rgb = { r: number; g: number; b: number };
function blendPalette(c: Rgb, target: Rgb, coeff: number): Rgb {
  const b = (v: number, t: number) => v + (((t - v) * coeff) >> 4);
  return { r: b(c.r, target.r), g: b(c.g, target.g), b: b(c.b, target.b) };
}
function blendChannel(top: number, bottom: number, eva: number, evb: number): number {
  return Math.min(255, Math.round((top * eva + bottom * evb) / 16));
}
function blendRgb(top: Rgb, bottom: Rgb, eva: number, evb: number): Rgb {
  return {
    r: blendChannel(top.r, bottom.r, eva, evb),
    g: blendChannel(top.g, bottom.g, eva, evb),
    b: blendChannel(top.b, bottom.b, eva, evb),
  };
}
const RGB_BLACK: Rgb = { r: 0, g: 0, b: 0 };

const pidgeotto = (opponentFrontSpritesAsset as any).PIDGEOTTO;
const pidgeottoPalette: Rgb[] = pidgeotto.palette;
const pidgeottoPaletteDark: Rgb[] = pidgeottoPalette.map((c) => (c ? blendPalette(c, RGB_BLACK, 10) : c));
const bg = battleBgAsset as any;
const bgPalette0: Rgb[] = bg.palette[0];
const bgPalette0Dark: Rgb[] = bgPalette0.map((c: Rgb) => (c ? blendPalette(c, RGB_BLACK, 10) : c));

function nearestPaletteMatch(rgb: Rgb, palette: Rgb[]): { idx: number; dist: number } {
  let best = { idx: -1, dist: Infinity };
  palette.forEach((c, idx) => {
    if (!c) return;
    const d = (c.r - rgb.r) ** 2 + (c.g - rgb.g) ** 2 + (c.b - rgb.b) ** 2;
    if (d < best.dist) best = { idx, dist: d };
  });
  return best;
}

const PIDGEOTTO_CORNER = { x: 144, y: 19 };

const appByFrame = new Map(appCaptures.map((c) => [c.frame, c]));

// bbox from the handoff: (178,41)-(190,62), widened slightly + whole
// Pidgeotto territory for the darken-plateau ticks (600/893px, no bbox given).
const BBOX = { x0: 170, y0: 19, x1: 214, y1: 70 };

for (const oc of oracleCaptures) {
  const app = appByFrame.get(oc.frame);
  if (!app) continue;
  const oracleRgba = pngToRgba(oc.png);
  const appRgba = app.rgba instanceof Buffer ? app.rgba : Buffer.from(app.rgba);
  let mismatches = 0;
  const rows: string[] = [];
  for (let y = BBOX.y0; y < BBOX.y1; y += 1) {
    for (let x = BBOX.x0; x < BBOX.x1; x += 1) {
      const o = (y * 240 + x) * 4;
      const or = oracleRgba[o]!, og = oracleRgba[o + 1]!, ob = oracleRgba[o + 2]!;
      const ar = appRgba[o]!, ag = appRgba[o + 1]!, ab = appRgba[o + 2]!;
      if (or === ar && og === ag && ob === ab) continue;
      mismatches += 1;
      const oracleRgb = { r: or, g: og, b: ob };
      const appRgb = { r: ar, g: ag, b: ab };
      const px = x - PIDGEOTTO_CORNER.x;
      const py = y - PIDGEOTTO_CORNER.y;
      const matches = {
        pidgeottoLight: nearestPaletteMatch(oracleRgb, pidgeottoPalette),
        pidgeottoDark: nearestPaletteMatch(oracleRgb, pidgeottoPaletteDark),
        bgLight: nearestPaletteMatch(oracleRgb, bgPalette0),
        bgDark: nearestPaletteMatch(oracleRgb, bgPalette0Dark),
      };
      const best = Object.entries(matches).sort((a, b) => a[1].dist - b[1].dist)[0]!;
      rows.push(
        `  (${x},${y}) sprite-local(${px},${py}) oracle=(${or},${og},${ob}) app=(${ar},${ag},${ab}) ` +
          `best=${best[0]}#${best[1].idx}(d2=${best[1].dist})`,
      );
    }
  }
  console.log(`frame ${oc.frame}: ${mismatches} mismatches in bbox`);
  for (const r of rows.slice(0, 40)) console.log(r);
  if (rows.length > 40) console.log(`  ... (${rows.length - 40} more)`);
}
