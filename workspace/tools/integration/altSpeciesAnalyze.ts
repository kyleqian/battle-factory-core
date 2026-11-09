/**
 * Attribute residual rows of an altspecies live-adapter dense comparison.
 * usage: altSpeciesAnalyze.ts <live-fixture.json> <evidence-run-dir> [png-out-dir]
 * Re-renders the production live view for each residual row, reports pixel
 * count, bounding box, source-colour histogram, overlap with the source-derived
 * enemy-shadow mask and the front-idle body columns, and writes a
 * source | live | diff PNG for the first residual row.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { deflateSync } from "node:zlib";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import shadow from "../../src/assets/gen/battle-enemy-shadow.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.subarray(y * w * 3, (y + 1) * w * 3)).copy(raw, y * (w * 3 + 1) + 1); }
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

export function analyze(livePath: string, runDir: string, pngDir?: string) {
  const live = JSON.parse(readFileSync(resolve(root, livePath), "utf8"));
  const source = JSON.parse(readFileSync(resolve(root, live.sourceFixture), "utf8"));
  const fixture = { ...source, ...live } as Fixture;
  const cmp = JSON.parse(readFileSync(join(runDir, "live-comparison.json"), "utf8"));
  const mask = new Set<number>(shadow.mask as number[]);
  const sx = 176 - shadow.width / 2, sy = 40 + 29 - shadow.height / 2;
  const inShadow = (x: number, y: number) => x >= sx && x < sx + shadow.width && y >= sy && y < sy + shadow.height && mask.has((y - sy) * shadow.width + (x - sx));
  const residualRows = [];
  for (const row of cmp.comparisons.filter((r: { residualPixels: number }) => r.residualPixels > 0)) {
    const rgb = readFileSync(join(runDir, "rgb", `${String(row.frame).padStart(5, "0")}.rgb`));
    const rgba = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(rgba, liveView(fixture, row.age));
    let x0 = 999, y0 = 999, x1 = -1, y1 = -1, n = 0, inMask = 0, srcShadowColor = 0;
    const cols = new Map<string, number>();
    const diff = new Uint8Array(240 * 160 * 3);
    for (let p = 0; p < 240 * 160; p++) {
      const x = p % 240, y = (p / 240) | 0;
      const s = [rgb[p * 3]!, rgb[p * 3 + 1]!, rgb[p * 3 + 2]!], l = [rgba[p * 4]!, rgba[p * 4 + 1]!, rgba[p * 4 + 2]!];
      if (s[0] !== l[0] || s[1] !== l[1] || s[2] !== l[2]) {
        n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        if (inShadow(x, y)) inMask++;
        if (s[0] === shadow.color.r && s[1] === shadow.color.g && s[2] === shadow.color.b) srcShadowColor++;
        const k = `src(${s})->live(${l})`; cols.set(k, (cols.get(k) ?? 0) + 1);
        diff.set([255, 0, 255], p * 3);
      } else diff.set([s[0]! >> 2, s[1]! >> 2, s[2]! >> 2], p * 3);
    }
    // Does the live frame, shifted by (dx,dy), reproduce the source inside the residual bbox? (x2/y2 body offsets)
    const shiftFit = (() => {
      let best = { dx: 0, dy: 0, mismatches: Infinity };
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        let bad = 0;
        for (let y = Math.max(0, y0); y <= Math.min(111, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(239, x1); x++) {
          const sx2 = x - dx, sy2 = y - dy;
          if (sx2 < 0 || sx2 > 239 || sy2 < 0 || sy2 > 159) { bad++; continue; }
          const p = y * 240 + x, q = sy2 * 240 + sx2;
          if (rgb[p * 3] !== rgba[q * 4] || rgb[p * 3 + 1] !== rgba[q * 4 + 1] || rgb[p * 3 + 2] !== rgba[q * 4 + 2]) bad++;
        }
        if (bad < best.mismatches) best = { dx, dy, mismatches: bad };
      }
      return best; // live shifted right/down by (dx,dy) best matches source
    })();
    residualRows.push({ shiftFit,
      age: row.age, frame: row.frame, pixels: n, bbox: { x0, y0, x1, y1 }, inEnemyShadowMask: inMask,
      sourceIsShadowColor: srcShadowColor, colorPairs: [...cols].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => ({ pair: k, pixels: v })),
    });
    if (pngDir && residualRows.length === 1) {
      mkdirSync(pngDir, { recursive: true });
      const out = new Uint8Array(240 * 3 * 160 * 3);
      for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
        const p = y * 240 + x;
        out.set([rgb[p * 3]!, rgb[p * 3 + 1]!, rgb[p * 3 + 2]!], (y * 720 + x) * 3);
        out.set([rgba[p * 4]!, rgba[p * 4 + 1]!, rgba[p * 4 + 2]!], (y * 720 + 240 + x) * 3);
        out.set(diff.subarray(p * 3, p * 3 + 3), (y * 720 + 480 + x) * 3);
      }
      writeFileSync(join(pngDir, `first-residual-age${row.age}.png`), png(720, 160, out));
    }
  }
  return { rows: cmp.rows, residualPixels: cmp.residualPixels, digest: cmp.digest, residualRows };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(analyze(process.argv[2]!, process.argv[3]!, process.argv[4]), null, 1));
}
