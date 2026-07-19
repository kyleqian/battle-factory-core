import fs from "node:fs";
import { PNG } from "pngjs";

const grovyle = JSON.parse(fs.readFileSync("src/assets/gen/battle-opponent-front-sprites.json", "utf8")).GROVYLE;
const statAnim = JSON.parse(fs.readFileSync("src/assets/gen/stat-anim-banner.json", "utf8"));

const GROVYLE_CORNER = { x: 144, y: 12 };
const period = statAnim.tilemaps.increase.height * 8;

function sampleBg(tilemap, tileset, palette, mapX, mapY, hflipOverride, vflipOverride) {
  const wrappedX = ((mapX % period) + period) % period;
  const wrappedY = ((mapY % period) + period) % period;
  const tileCol = Math.floor(wrappedX / 8);
  const tileRow = Math.floor(wrappedY / 8);
  const inTileX = wrappedX % 8;
  const inTileY = wrappedY % 8;
  const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
  if (!entry) return null;
  const tile = tileset.tiles[entry.tile];
  if (!tile) return null;
  const hf = hflipOverride ?? entry.hFlip;
  const vf = vflipOverride ?? entry.vFlip;
  const sx = hf ? 7 - inTileX : inTileX;
  const sy = vf ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx];
  if (idx === 0) return null;
  return palette[idx];
}

function blendChannel(c1, c2, eva, evb) {
  return Math.min(255, Math.floor((c1 * eva + c2 * evb) / 16));
}

function loadPng(path) {
  const buf = fs.readFileSync(path);
  return PNG.sync.read(buf);
}

const tick = Number(process.argv[2] ?? 2140);
const oracle = loadPng(`tools/compare/out/latest/oracle-0${tick}.png`);

const pressTick = 1919;
const start = pressTick + 208;
function statsBannerEva(t) {
  const d = t - start;
  if (d <= 4) return 0;
  if (d <= 22) return Math.min(10, Math.floor((d - 5) / 2) + 1);
  if (d <= 44) return 10;
  return Math.max(0, 10 - (Math.floor((d - 45) / 2) + 1));
}
const eva = statsBannerEva(tick);
const evb = 16 - eva;

// mask: grovyle opaque tile pixels, WITH the true unblended target2 color
// (Grovyle's own real palette-mapped color, not app's own possibly-wrong output).
const mask = [];
for (let ty = 0; ty < grovyle.tileset.rows; ty++) {
  for (let tx = 0; tx < grovyle.tileset.columns; tx++) {
    const tile = grovyle.tileset.tiles[ty * grovyle.tileset.columns + tx];
    if (!tile) continue;
    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < 8; px++) {
        const paletteIdx = tile[py * 8 + px];
        if (paletteIdx === 0) continue;
        const x = GROVYLE_CORNER.x + tx * 8 + px;
        const y = GROVYLE_CORNER.y + ty * 8 + py;
        if (x < 0 || x >= 240 || y < 0 || y >= 160) continue;
        const c = grovyle.palette[paletteIdx];
        mask.push([x, y, c]);
      }
    }
  }
}

function pngPixel(png, x, y) {
  const idx = (png.width * y + x) << 2;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]];
}

function countMatches(bg1Y, useDecrease, hflipOverride, vflipOverride) {
  let matches = 0;
  const tilemap = useDecrease ? statAnim.tilemaps.decrease : statAnim.tilemaps.increase;
  for (const [x, y, tgt2] of mask) {
    const bg1c = sampleBg(tilemap, statAnim.tileset, statAnim.palettes.evasion, x, y + bg1Y, hflipOverride, vflipOverride);
    const oc = pngPixel(oracle, x, y);
    const predicted = !bg1c ? [tgt2.r, tgt2.g, tgt2.b] : [blendChannel(bg1c.r, tgt2.r, eva, evb), blendChannel(bg1c.g, tgt2.g, eva, evb), blendChannel(bg1c.b, tgt2.b, eva, evb)];
    if (predicted[0] === oc[0] && predicted[1] === oc[1] && predicted[2] === oc[2]) matches++;
  }
  return matches;
}

console.log("mask size", mask.length, "eva", eva);
for (const useDecrease of [false, true]) {
  for (const hflipOverride of [undefined, false, true]) {
    for (const vflipOverride of [undefined, false, true]) {
      let best = null;
      for (let bg1Y = -260; bg1Y <= 260; bg1Y++) {
        const m = countMatches(bg1Y, useDecrease, hflipOverride, vflipOverride);
        if (!best || m > best.m) best = { m, bg1Y };
      }
      console.log({ useDecrease, hflipOverride, vflipOverride, ...best, pct: (best.m / mask.length).toFixed(3) });
    }
  }
}
