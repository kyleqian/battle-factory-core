// dl1: how much would a tighter pixel encoding save? Compares, for the two battle sprite sheets (brotli q11, whole-table):
//   json        the shipped JSON text
//   packed4bpp  tiles flattened to 4-bit pixels (2 per byte), palettes as 15-bit words, one binary blob per sheet
//   packed+xor  front sheet only: frame2 stored as (frame2 xor tileset) before packing
// Usage: node tools/bundle/packExperiment.mjs
import { readFileSync } from "node:fs";
import { brotliCompressSync, constants } from "node:zlib";

const br = (b) => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 } }).length;
const kib = (n) => `${(n / 1024).toFixed(0)} KiB`;
const pack = (tileset, base) => {
  const px = tileset.tiles.flat();
  const ref = base ? base.tiles.flat() : null;
  const out = Buffer.alloc(px.length >> 1);
  for (let i = 0; i < px.length; i += 2) out[i >> 1] = ((px[i] ^ (ref?.[i] ?? 0)) & 15) | (((px[i + 1] ^ (ref?.[i + 1] ?? 0)) & 15) << 4);
  return out;
};
const pal = (p) => Buffer.from(p.flatMap(({ r, g, b }) => { const w = (r >> 3) | ((g >> 3) << 5) | ((b >> 3) << 10); return [w & 255, w >> 8]; }));
for (const side of ["front", "back"]) {
  const file = side === "front" ? "src/assets/gen/battle-opponent-front-sprites.json" : "src/assets/gen/battle-back-sprites.json";
  const text = readFileSync(file);
  const sheet = JSON.parse(text);
  const keys = Object.keys(sheet);
  const plain = Buffer.concat(keys.flatMap((k) => [pack(sheet[k].tileset), ...(sheet[k].frame2 ? [pack(sheet[k].frame2)] : []), pal(sheet[k].palette)]));
  const xor = side === "front" ? Buffer.concat(keys.flatMap((k) => [pack(sheet[k].tileset), pack(sheet[k].frame2, sheet[k].tileset), pal(sheet[k].palette)])) : null;
  const exact = keys.every((k) => sheet[k].tileset.tiles.every((t) => t.every((v) => v >= 0 && v < 16)));
  console.log(`${side}: ${keys.length} species, all pixels 0..15: ${exact}; json raw ${kib(text.length)} br ${kib(br(text))} | packed raw ${kib(plain.length)} br ${kib(br(plain))}${xor ? ` | packed+xor raw ${kib(xor.length)} br ${kib(br(xor))}` : ""}`);
}

// Variant: raster order (image rows) instead of tile order, 4bpp, plus one byte per pixel (no nibble packing) for comparison.
const raster = (ts) => {
  const w = ts.columns * 8, out = Buffer.alloc(w * ts.rows * 8);
  ts.tiles.forEach((t, i) => { const tx = (i % ts.columns) * 8, ty = Math.floor(i / ts.columns) * 8; for (let p = 0; p < 64; p++) out[(ty + (p >> 3)) * w + tx + (p & 7)] = t[p]; });
  return out;
};
const nib = (b) => { const o = Buffer.alloc(b.length >> 1); for (let i = 0; i < b.length; i += 2) o[i >> 1] = b[i] | (b[i + 1] << 4); return o; };
for (const side of ["front", "back"]) {
  const sheet = JSON.parse(readFileSync(side === "front" ? "src/assets/gen/battle-opponent-front-sprites.json" : "src/assets/gen/battle-back-sprites.json"));
  const keys = Object.keys(sheet);
  const parts = (f) => Buffer.concat(keys.flatMap((k) => [f(sheet[k].tileset), ...(sheet[k].frame2 ? [f(sheet[k].frame2)] : []), pal(sheet[k].palette)]));
  console.log(`${side}: raster 8bpp br ${kib(br(parts(raster)))} | raster 4bpp br ${kib(br(parts((t) => nib(raster(t)))))}`);
}
