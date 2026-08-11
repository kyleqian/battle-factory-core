// Defect A instrument, step 3 (top ANIMATION_PROGRESS.md entry's own "real
// next instrument"): for a fixed peak-scale tick, brute-force the
// attacker/target's own 64x64 tileset (accounting for the active tint
// coefficient) to find which (row,col) texel actually produces the oracle's
// observed color at several interior mismatched pixels, then compare that
// against this engine's own computed (sx,sy) from
// drawSpriteSheetAffineStretch's sampling formula. If the found texel and
// the computed texel differ by a CONSISTENT delta, that names the exact
// rounding/coordinate bug.
import { readFileSync } from "node:fs";
import battleBackSprites from "../../../src/assets/gen/battle-back-sprites.json" with { type: "json" };
import battleOpponentFrontSprites from "../../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };

const move = process.argv[2]; // FUTURE_SIGHT | CONFUSION
const rgbDir = process.argv[3];
const tick = Number(process.argv[4]);
const ox = Number(process.argv[5]); // sprite's own native (non-doubled) corner x
const oy = Number(process.argv[6]);
const mx = Number(process.argv[7]); // real RAM matrix a, already lag-corrected to what this tick's screen shows
const my = Number(process.argv[8]);
// tintCoeff: a literal number, or "sweep" to try every 0..16 (GBA
// BeginNormalPaletteFade's own coeff range) rather than trusting a single
// computed value - rules out "wrong tint coefficient" as an innocent
// explanation for a texel search coming up empty.
const tintCoeffArg = process.argv[9];
const sweepCoeff = tintCoeffArg === "sweep";
const tintR = Number(process.argv[10] ?? 255);
const tintG = Number(process.argv[11] ?? 255);
const tintB = Number(process.argv[12] ?? 255);
// remaining argv: pixel list as "x,y" pairs
const pixelArgs = process.argv.slice(13);

const w = 64;
const h = 64;
const halfW = w / 2;
const halfH = h / 2;

function blendComponentToward(component8, target8, coeff) {
  const c5 = component8 >> 3;
  const t5 = target8 >> 3;
  const b5 = c5 + (((t5 - c5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}

function sheet(move) {
  if (move === "FUTURE_SIGHT") return battleBackSprites.KADABRA;
  return battleOpponentFrontSprites.ONIX;
}
const { tileset, palette } = sheet(move);

function rawTexel(row, col) {
  const tileRow = Math.floor(row / 8);
  const tileCol = Math.floor(col / 8);
  const inTileY = row % 8;
  const inTileX = col % 8;
  const tile = tileset.tiles[tileRow * tileset.columns + tileCol];
  if (!tile) return null;
  const idx = tile[inTileY * 8 + inTileX];
  if (idx === 0) return null;
  return palette[idx] ?? null;
}

function tinted(c, coeff) {
  if (coeff <= 0) return c;
  return {
    r: blendComponentToward(c.r, tintR, coeff),
    g: blendComponentToward(c.g, tintG, coeff),
    b: blendComponentToward(c.b, tintB, coeff),
  };
}

function texelColor(row, col, coeff) {
  const c = rawTexel(row, col);
  if (!c) return null;
  return tinted(c, coeff);
}

// Sanity check: reproduce the engine's own sampling formula for a given
// screen pixel, to confirm this script's ox/oy/mx/my agree with what
// drawSpriteSheetAffineStretch actually computed.
function engineSample(x, y, coeff) {
  const dx = x - ox;
  const dy = y - oy;
  const rx = dx - halfW;
  const ry = dy - halfH;
  const sx = ((rx * mx) >> 8) + halfW;
  const sy = ((ry * my) >> 8) + halfH;
  if (sx < 0 || sx >= w || sy < 0 || sy >= h) return { sx, sy, inBounds: false, color: null };
  return { sx, sy, inBounds: true, color: texelColor(sy, sx, coeff) };
}

const oracleRgb = readFileSync(`${rgbDir}/${String(tick).padStart(5, "0")}.rgb`);
function oracleColorAt(x, y) {
  const o = (y * 240 + x) * 3;
  return { r: oracleRgb[o], g: oracleRgb[o + 1], b: oracleRgb[o + 2] };
}

function eq(a, b) {
  return a && b && a.r === b.r && a.g === b.g && a.b === b.b;
}

const coeffsToTry = sweepCoeff
  ? Array.from({ length: 17 }, (_, i) => i)
  : [Number(tintCoeffArg)];

console.log(
  `move=${move} tick=${tick} ox=${ox} oy=${oy} mx=${mx} my=${my} `
  + `tintCoeff=${sweepCoeff ? "sweep(0..16)" : tintCoeffArg} tint=(${tintR},${tintG},${tintB})`,
);
for (const arg of pixelArgs) {
  const [xs, ys] = arg.split(",");
  const x = Number(xs);
  const y = Number(ys);
  const oracleColor = oracleColorAt(x, y);
  const primaryCoeff = coeffsToTry[0];
  const engine = engineSample(x, y, primaryCoeff);
  const matches = [];
  for (const coeff of coeffsToTry) {
    for (let row = 0; row < h; row += 1) {
      for (let col = 0; col < w; col += 1) {
        const c = texelColor(row, col, coeff);
        if (eq(c, oracleColor)) matches.push({ row, col, coeff });
      }
    }
  }
  const engineMatch = engine.inBounds && eq(engine.color, oracleColor) ? "MATCH" : "no-match";
  const deltas = matches.map((m) => `(${m.col - engine.sx},${m.row - engine.sy},coeff=${m.coeff})`).join(" ");
  console.log(
    `(${x},${y}) oracle=${oracleColor.r},${oracleColor.g},${oracleColor.b}`
    + ` engineSample sx=${engine.sx} sy=${engine.sy} inBounds=${engine.inBounds}`
    + ` color=${engine.color ? `${engine.color.r},${engine.color.g},${engine.color.b}` : "transparent"} engineMatch=${engineMatch}`
    + ` texelMatches=${matches.length}${matches.length && matches.length <= 8 ? ` [${matches.map((m) => `(${m.col},${m.row},c${m.coeff})`).join(" ")}]` : ""}`
    + (matches.length && matches.length <= 8 ? ` deltas(col-sx,row-sy,coeff)=${deltas}` : ""),
  );
}
