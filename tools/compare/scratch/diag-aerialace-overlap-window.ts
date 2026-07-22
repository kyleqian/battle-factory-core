// Scratch diagnostic (S7 engine step, PART 1): figure out why frames
// 12368/12369 still show a 436px/729px residual after wiring the
// clone-wins-over-field rule. Reuses the already-captured PNGs in
// tools/compare/out/latest (app-*.png / oracle-*.png) from the last
// `npm run compare` run, plus the same asset-only helpers the dossier's
// own solve scripts used.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import opponentFrontSpritesAsset from "../../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import battleBgAsset from "../../../src/assets/gen/battle-bg.json" with { type: "json" };

type Rgb = { r: number; g: number; b: number };
function fmt(c: Rgb | null): string {
  return c ? `(${c.r},${c.g},${c.b})` : "null";
}
function blendComponentToward(component8: number, target8: number, coeff: number): number {
  const c5 = component8 >> 3;
  const t5 = target8 >> 3;
  const b5 = c5 + (((t5 - c5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}
function darken(c: Rgb, coeff: number): Rgb {
  return { r: blendComponentToward(c.r, 0, coeff), g: blendComponentToward(c.g, 0, coeff), b: blendComponentToward(c.b, 0, coeff) };
}
function blend8bit(top: Rgb, bottom: Rgb, eva: number, evb: number): Rgb {
  const b = (t: number, btm: number) => Math.min(255, Math.floor((t * eva + btm * evb) / 16));
  return { r: b(top.r, bottom.r), g: b(top.g, bottom.g), b: b(top.b, bottom.b) };
}

const pidgeotto = (opponentFrontSpritesAsset as any).PIDGEOTTO;
const pidgeottoPalette: Rgb[] = pidgeotto.palette;
function texelIdx(localX: number, localY: number): number | undefined {
  const tx = Math.floor(localX / 8);
  const ty = Math.floor(localY / 8);
  if (tx < 0 || ty < 0 || tx >= pidgeotto.tileset.columns || ty >= pidgeotto.tileset.rows) return undefined;
  const tile = pidgeotto.tileset.tiles[ty * pidgeotto.tileset.columns + tx];
  if (!tile) return 0;
  return tile[(localY % 8) * 8 + (localX % 8)];
}

function staticFieldPixel(x: number, y: number): Rgb | null {
  const bg = battleBgAsset as any;
  const tilemap = bg.static.tilemap;
  const inTileY = ((y % 8) + 8) % 8;
  const blockWidth = tilemap.width * 8;
  const period = blockWidth * 2;
  const wrappedX = ((x % period) + period) % period;
  const block = wrappedX >= blockWidth ? 1 : 0;
  const localX = wrappedX % blockWidth;
  const tileRow = Math.floor(y / 8) + block * 32;
  const tileCol = Math.floor(localX / 8);
  const inTileX = localX % 8;
  const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
  const tile = bg.static.tileset.tiles[entry.tile];
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx];
  if (idx === 0) return null;
  return bg.palette[entry.palette][idx];
}

const REAL_CORNER = { x: 144, y: 19 };
const SLOT4_CORNER = { x: 144 - 17, y: 19 + 2 };
const SLOT7_CORNER = { x: 144 + 24, y: 19 + 6 };
const GROUND_CLIP_Y = 74;
const EVA = 12, EVB = 8;

function pixelAt(img: PNG, x: number, y: number): Rgb {
  const o = (y * 240 + x) * 4;
  return { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
}

for (const frame of [12368, 12369, 12370, 12371]) {
  const doDarken = frame >= 12368 && frame <= 12370;
  const app = PNG.sync.read(readFileSync(`tools/compare/out/latest/app-${frame}.png`));
  const oracle = PNG.sync.read(readFileSync(`tools/compare/out/latest/oracle-${frame}.png`));
  console.log(`\n=== frame ${frame} (darken=${doDarken}) ===`);
  let shown = 0;
  for (let y = 0; y < 160 && shown < 20; y += 1) {
    for (let x = 0; x < 240 && shown < 20; x += 1) {
      const a = pixelAt(app, x, y);
      const o = pixelAt(oracle, x, y);
      if (a.r === o.r && a.g === o.g && a.b === o.b) continue;
      shown += 1;
      const realIdx = texelIdx(x - REAL_CORNER.x, y - REAL_CORNER.y);
      const slot4Idx = texelIdx(x - SLOT4_CORNER.x, y - SLOT4_CORNER.y);
      const slot7Idx = texelIdx(x - SLOT7_CORNER.x, y - SLOT7_CORNER.y);
      const field = staticFieldPixel(x, y);
      const fieldD = field ? darken(field, 10) : null;
      let clonePred: Rgb | null = null;
      if (slot7Idx && field) {
        const texel = pidgeottoPalette[slot7Idx]!;
        const texelD = doDarken ? darken(texel, 10) : texel;
        const target2 = doDarken ? fieldD! : field;
        clonePred = blend8bit(texelD, target2, EVA, EVB);
      }
      const realRaw = realIdx ? pidgeottoPalette[realIdx] ?? null : null;
      const realDark = realRaw ? darken(realRaw, 10) : null;
      const slot4Raw = slot4Idx ? pidgeottoPalette[slot4Idx] ?? null : null;
      const slot4Dark = slot4Raw ? darken(slot4Raw, 10) : null;
      console.log(
        `(${x},${y}) app=${fmt(a)} oracle=${fmt(o)} realIdx=${realIdx}(${fmt(doDarken ? realDark : realRaw)}) slot4Idx=${slot4Idx}(${fmt(doDarken ? slot4Dark : slot4Raw)}) slot7Idx=${slot7Idx} ` +
          `belowClip=${y >= GROUND_CLIP_Y} clonePred=${fmt(clonePred)}`,
      );
    }
  }
}
