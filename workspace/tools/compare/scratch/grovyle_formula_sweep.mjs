// Brute-force sweep over candidate affine-sampling formulas/box conventions
// for GROVYLE_STRETCH_TABLE, validated directly against oracle PNGs
// (tools/compare/out/sendout-baseline). RAM-exact d4/d5/y2 come from the
// already-committed table in src/engine/battleScene.ts (imported via a tiny
// re-scan of the source, since the table itself isn't exported) - simplest
// to just hardcode-read it here from the same literal source of truth: the
// committed RAM probe JSON, applying the SAME lag+1 convention already
// established and validated (grovyle_full_check.mjs).
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const CORNER = { x: 144, y: 12 };
const front = JSON.parse(readFileSync("src/assets/gen/battle-opponent-front-sprites.json", "utf8")).GROVYLE;
const ram = JSON.parse(readFileSync("/tmp/grovyle_stretch.json", "utf8")).ticks;
const ramByTick = new Map(ram.map(t => [t.tick, t]));
const tint = { r: 255, g: 181, b: 247 };

function toS16(u16) {
  return u16 >= 0x8000 ? u16 - 0x10000 : u16;
}

function blend5(src8, tgt8, coeff) {
  const s5 = src8 >> 3, t5 = tgt8 >> 3;
  const b5 = s5 + (((t5 - s5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}

function loadOracle(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}

function coeffFor(R) {
  if (R <= 1503) return 16;
  if (R <= 1518) return 1519 - R;
  return 0;
}

// candidate matrixParam formulas
const MX_FORMULAS = {
  inverted: (scale) => Math.trunc(0x10000 / scale),
  direct: (scale) => scale,
};

// candidate box arrangements: destHalf (used for ry/rx AND dy/dx range), origin shift
const BOXES = {
  undoubled: { destHalf: 32, boxSize: 64, originShift: 0 },
  doubled: { destHalf: 64, boxSize: 128, originShift: -32 },
};

const SRC_HALF = 32; // source tile is always 64x64, center 32 regardless of box

function render(tileset, palette, d4, d5, y2, coeff, mxFormula, box) {
  const w = tileset.columns * 8, h = tileset.rows * 8; // 64,64
  const mx = mxFormula(d4);
  const my = mxFormula(d5);
  const out = new Map(); // key "x,y" (final screen-relative-to-CORNER coords) -> color
  for (let dy = 0; dy < box.boxSize; dy++) {
    const ry = dy - box.destHalf;
    const sy = ((ry * my) >> 8) + SRC_HALF;
    if (sy < 0 || sy >= h) continue;
    const tileRow = Math.floor(sy / 8), inTileY = sy % 8;
    for (let dx = 0; dx < box.boxSize; dx++) {
      const rx = dx - box.destHalf;
      const sx = ((rx * mx) >> 8) + SRC_HALF;
      if (sx < 0 || sx >= w) continue;
      const tile = tileset.tiles[tileRow * tileset.columns + Math.floor(sx / 8)];
      if (!tile) continue;
      const idx = tile[inTileY * 8 + (sx % 8)];
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      const finalX = dx + box.originShift;
      const finalY = dy + box.originShift + y2;
      if (finalX < -32 || finalX >= 96 || finalY < -32 || finalY >= 96) continue; // generous crop margin
      const rc = coeff > 0 ? { r: blend5(c.r, tint.r, coeff), g: blend5(c.g, tint.g, coeff), b: blend5(c.b, tint.b, coeff) } : c;
      out.set(`${finalX},${finalY}`, rc);
    }
  }
  return out;
}

function diffAgainstOracle(out, png) {
  let diff = 0, opaque = 0;
  for (let y = -32; y < 96; y++) {
    for (let x = -32; x < 96; x++) {
      const c = out.get(`${x},${y}`);
      const px = CORNER.x + x, py = CORNER.y + y;
      if (px < 0 || px >= png.width || py < 0 || py >= png.height) continue;
      const i = (py * png.width + px) * 4;
      const oPix = [png.data[i], png.data[i + 1], png.data[i + 2]];
      if (!c) continue; // only checking pixels WE draw opaque; separately we'll check oracle-opaque-but-we're-blank below
      opaque++;
      if (oPix[0] !== c.r || oPix[1] !== c.g || oPix[2] !== c.b) diff++;
    }
  }
  return { diff, opaque };
}

for (const [mxName, mxFormula] of Object.entries(MX_FORMULAS)) {
  for (const [boxName, box] of Object.entries(BOXES)) {
    let totalDiff = 0, totalOpaque = 0;
    const perTick = [];
    for (let R = 1504; R <= 1543; R++) {
      const T = R - 1;
      const r = ramByTick.get(T) ?? ramByTick.get(1538);
      const y2 = toS16(r.y2);
      const coeff = coeffFor(R);
      const png = loadOracle(R);
      const out = render(front.frame2, front.palette, r.d4, r.d5, y2, coeff, mxFormula, box);
      const { diff, opaque } = diffAgainstOracle(out, png);
      totalDiff += diff;
      totalOpaque += opaque;
      perTick.push(diff);
    }
    console.log(`${mxName} x ${boxName}: totalDiff=${totalDiff} totalOpaque=${totalOpaque}`);
    console.log(`  perTick: ${perTick.join(",")}`);
  }
}

// Detailed dump for direct x undoubled on the worst ticks
console.log("\n--- detail: direct x undoubled ---");
for (const R of [1504, 1505, 1506, 1525, 1526, 1527, 1531]) {
  const T = R - 1;
  const r = ramByTick.get(T) ?? ramByTick.get(1538);
  const y2 = toS16(r.y2);
  const coeff = coeffFor(R);
  const png = loadOracle(R);
  const out = render(front.frame2, front.palette, r.d4, r.d5, y2, coeff, MX_FORMULAS.direct, BOXES.undoubled);
  let diff = 0;
  const samples = [];
  for (let y = -32; y < 96; y++) {
    for (let x = -32; x < 96; x++) {
      const c = out.get(`${x},${y}`);
      const px = CORNER.x + x, py = CORNER.y + y;
      if (px < 0 || px >= png.width || py < 0 || py >= png.height) continue;
      const i = (py * png.width + px) * 4;
      const oPix = [png.data[i], png.data[i + 1], png.data[i + 2]];
      if (!c) continue;
      if (oPix[0] !== c.r || oPix[1] !== c.g || oPix[2] !== c.b) {
        diff++;
        if (samples.length < 6) samples.push([x, y, oPix, [c.r,c.g,c.b]]);
      }
    }
  }
  console.log(`R=${R} d4=${r.d4} d5=${r.d5} y2=${y2} coeff=${coeff} diff=${diff}`, JSON.stringify(samples));
}
