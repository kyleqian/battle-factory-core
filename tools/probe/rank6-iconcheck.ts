// For each slot icon, collect the oracle's colors at the app's non-transparent
// icon-tile pixels and report which source icon palette they belong to.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const OUT = process.argv[2] ?? "tools/compare/out/rank6-a";
const FRAME = Number(process.argv[3] ?? 2150);
const pad = String(FRAME).padStart(5, "0");
const oracle = PNG.sync.read(readFileSync(join(OUT, `oracle-${pad}.png`))).data;
const icons = JSON.parse(readFileSync("src/assets/gen/party-mon-icons.json", "utf8"));
const pal0 = [[98,156,131],[131,131,115],[189,189,189],[255,255,255],[189,164,65],[246,246,41],[213,98,65],[246,148,41],[139,123,255],[98,74,205],[238,115,156],[255,180,164],[164,197,255],[106,172,156],[98,98,90],[65,65,65]];
const pal1 = [[98,156,131],[115,115,115],[189,189,189],[255,255,255],[123,156,74],[156,205,74],[148,246,74],[238,115,156],[246,148,246],[189,164,90],[246,230,41],[246,246,172],[213,213,106],[230,74,41],[98,98,90],[65,65,65]];
const pal2 = [[98,156,131],[123,123,123],[189,189,180],[255,255,255],[115,115,205],[164,172,246],[180,131,90],[238,197,139],[197,172,41],[246,246,41],[246,98,82],[148,123,205],[197,164,205],[189,41,156],[98,98,90],[65,65,65]];
const inPal = (pal: number[][], rgb: [number, number, number]) => {
  for (let i = 0; i < pal.length; i++) {
    const [r, g, b] = pal[i]!;
    if (Math.abs(r - rgb[0]) <= 1 && Math.abs(g - rgb[1]) <= 1 && Math.abs(b - rgb[2]) <= 1) return i;
  }
  return -1;
};
const centers = [{ x: 16, y: 40 }, { x: 104, y: 18 }, { x: 104, y: 42 }];
for (let slot = 0; slot < 3; slot++) {
  const icon = icons["SPECIES_RATTATA"];
  const { x: cx, y: cy } = centers[slot]!;
  const counts = { pal0: 0, pal1: 0, pal2: 0, other: new Map<string, number>() };
  let opaque = 0;
  for (let ty = 0; ty < icon.frame0.rows; ty++) {
    for (let tx = 0; tx < icon.frame0.columns; tx++) {
      const tile = icon.frame0.tiles[ty * icon.frame0.columns + tx]!;
      for (let py = 0; py < 8; py++) for (let px = 0; px < 8; px++) {
        const idx = tile[py * 8 + px]!;
        if (idx === 0) continue;
        opaque++;
        const x = cx - 16 + tx * 8 + px;
        const y = cy - 16 + ty * 8 + py;
        const o = (y * 240 + x) * 4;
        const rgb: [number, number, number] = [oracle[o]!, oracle[o + 1]!, oracle[o + 2]!];
        if (inPal(pal0, rgb) >= 0) counts.pal0++;
        else if (inPal(pal1, rgb) >= 0) counts.pal1++;
        else if (inPal(pal2, rgb) >= 0) counts.pal2++;
        else {
          const k = rgb.join(",");
          counts.other.set(k, (counts.other.get(k) ?? 0) + 1);
        }
      }
    }
  }
  console.log(`slot ${slot}: oracle colors at app-icon non-transparent px (${opaque} px): pal0=${counts.pal0} pal1=${counts.pal1} pal2=${counts.pal2} other=${[...counts.other.values()].reduce((s, n) => s + n, 0)}`);
  if (counts.other.size) {
    console.log(`  other colors: ${[...counts.other.entries()].sort((p, q) => q[1] - p[1]).slice(0, 8).map(([c, n]) => `(${c})x${n}`).join(" ")}`);
  }
}
