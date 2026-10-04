/**
 * Write a source | live | diff PNG (field area, optional integer zoom of a crop box) for one age of a retained run.
 * usage: altSpecies3DiffPng.ts <live-fixture.json> <run-dir> <age> <out.png> [x0 y0 x1 y1 zoom]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgb.subarray(y * w * 3, (y + 1) * w * 3)).copy(raw, y * (w * 3 + 1) + 1);
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const live = JSON.parse(readFileSync(resolve(root, process.argv[2]!), "utf8"));
const fixture = { ...JSON.parse(readFileSync(resolve(root, live.sourceFixture), "utf8")), ...live } as Fixture;
const dir = resolve(root, process.argv[3]!), age = Number(process.argv[4]), outPath = resolve(root, process.argv[5]!);
const [x0, y0, x1, y1, zoom] = process.argv.length > 6 ? process.argv.slice(6, 11).map(Number) as [number, number, number, number, number] : [0, 0, 239, 111, 1];
const cmp = JSON.parse(readFileSync(join(dir, "live-comparison.json"), "utf8"));
const row = cmp.comparisons.find((r: { age: number }) => r.age === age);
const rgb = readFileSync(join(dir, "rgb", `${String(row.frame).padStart(5, "0")}.rgb`));
const o = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(o, liveView(fixture, age));
const w = (x1 - x0 + 1) * zoom, h = (y1 - y0 + 1) * zoom, out = new Uint8Array(w * 3 * 3 * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const sx = x0 + Math.floor(x / zoom), sy = y0 + Math.floor(y / zoom), p = sy * 240 + sx;
  const s = [rgb[p * 3]!, rgb[p * 3 + 1]!, rgb[p * 3 + 2]!], l = [o[p * 4]!, o[p * 4 + 1]!, o[p * 4 + 2]!];
  const bad = s[0] !== l[0] || s[1] !== l[1] || s[2] !== l[2];
  for (let k = 0; k < 3; k++) {
    out[(y * w * 3 + x) * 3 + k] = s[k]!; out[(y * w * 3 + w + x) * 3 + k] = l[k]!;
    out[(y * w * 3 + 2 * w + x) * 3 + k] = bad ? [255, 0, 255][k]! : s[k]! >> 2;
  }
}
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, png(w * 3, h, out));
console.log(JSON.stringify({ age, frame: row.frame, residual: row.residualPixels, out: process.argv[5] }));
