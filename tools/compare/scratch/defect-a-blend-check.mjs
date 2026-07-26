// Defect A: the texel brute-force (defect-a-texel-search.mjs) found ZERO
// matches for every sampled interior mismatch, even sweeping the full
// KADABRA palette. RAM (dump-scale-window-oam-scanline.py) shows the
// attacker OBJ's objMode flips from 0 (NORMAL) to 1 (BLEND/semi-transparent)
// at the exact tick the scale task starts (114) - matching the script's own
// `createvisualtask AnimTask_ScaleMonAndRestore, 5, -4, -4, 15, ANIM_ATTACKER,
// 1` (arg4=1=ST_OAM_OBJ_BLEND, battle_anim_mon_movement.c:826). objMode=1
// FORCES the OBJ to be a 1st-target for alpha blending (GBATEK), regardless
// of BLDCNT's own OBJ-select bit. dump-monbg-scale-window.py's own BLDCNT/
// BLDALPHA read (16192/2056) decodes to mode=1 (alpha blend), target2=ALL
// layers, eva=8,evb=8 (a flat 50/50 blend). This script tests whether
// blending the engine's own tinted sprite texel 50/50 against the
// background pixel already in the framebuffer reproduces the oracle's
// observed color - i.e. whether drawSpriteSheetAffineStretch's missing
// alpha-blend step (not a coordinate/rounding bug) is defect A's real cause.
import { readFileSync } from "node:fs";
import battleBackSprites from "../../../src/assets/gen/battle-back-sprites.json" with { type: "json" };
import battleAnimPsychicBgAsset from "../../../src/assets/gen/battle-anim-psychic-bg.json" with { type: "json" };
import battleBgAsset from "../../../src/assets/gen/battle-bg.json" with { type: "json" };
import { drawTileBg } from "../../../src/engine/bg.ts";
import { mgbaDarkenColor } from "../../../src/engine/gbaPpu.ts";
import {
  futureSightAttackerEffectAtAge,
  futureSightBgPaletteRowAtAge,
  futureSightBgBldyAtAge,
  futureSightBgIsPsychic,
} from "../../../src/engine/futureSight.ts";

const rgbDir = process.argv[2];
const tick = Number(process.argv[3]);
const startFrame = Number(process.argv[4] ?? 77);
const ox = Number(process.argv[5] ?? 40);
const oy = Number(process.argv[6] ?? 56);
const eva = Number(process.argv[7] ?? 8);
const evb = Number(process.argv[8] ?? 8);
const pixelArgs = process.argv.slice(9);

const age = tick - startFrame;
const scaleState = futureSightAttackerEffectAtAge(age - 2);
const tintState = futureSightAttackerEffectAtAge(age - 1);
const tintCoeff = tintState.attackerObjY;
const mx = scaleState.attackerScale.xScale;
const my = scaleState.attackerScale.yScale;

const w = 64, h = 64, halfW = 32, halfH = 32;

function blendComponentToward(component8, target8, coeff) {
  const c5 = component8 >> 3;
  const t5 = target8 >> 3;
  const b5 = c5 + (((t5 - c5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}

const { tileset, palette } = battleBackSprites.KADABRA;
function spriteTexel(sx, sy) {
  const tileRow = Math.floor(sy / 8), tileCol = Math.floor(sx / 8);
  const inTileY = sy % 8, inTileX = sx % 8;
  const tile = tileset.tiles[tileRow * tileset.columns + tileCol];
  if (!tile) return null;
  const idx = tile[inTileY * 8 + inTileX];
  if (idx === 0) return null;
  const c = palette[idx];
  return {
    r: blendComponentToward(c.r, 255, tintCoeff),
    g: blendComponentToward(c.g, 255, tintCoeff),
    b: blendComponentToward(c.b, 255, tintCoeff),
  };
}

function gpuDarken(pal, bldy) {
  return pal.map((color) => {
    const packed = mgbaDarkenColor(color.r | (color.g << 8) | (color.b << 16), bldy);
    return { r: packed & 0xff, g: (packed >>> 8) & 0xff, b: (packed >>> 16) & 0xff };
  });
}

// Render just the background layer (psychic swirl or default), same call
// shape as battleScene.ts's FUTURE_SIGHT case, onto a fresh framebuffer -
// this is the "target2" pixel the real OBJ's blend would sample.
const fb = new Uint8Array(240 * 160 * 4);
const isPsychic = futureSightBgIsPsychic(age);
if (isPsychic) {
  const bgPsychic = battleAnimPsychicBgAsset;
  drawTileBg(fb, {
    tileset: bgPsychic.tileset,
    tilemap: bgPsychic.tilemap,
    subpalettes: [gpuDarken(bgPsychic.palette, futureSightBgBldyAtAge(age))],
  });
} else {
  drawTileBg(fb, {
    tileset: battleBgAsset.static.tileset,
    tilemap: battleBgAsset.static.tilemap,
    subpalettes: battleBgAsset.palette.map((p) => gpuDarken(p, futureSightBgBldyAtAge(age))),
  });
}

function bgPixelAt(x, y) {
  const i = (y * 240 + x) * 4;
  return { r: fb[i], g: fb[i + 1], b: fb[i + 2] };
}

function blend16(top, bottom, eva, evb) {
  const ch = (t, b) => Math.min(31, ((t >> 3) * eva + (b >> 3) * evb) >> 4);
  const r5 = ch(top.r, bottom.r), g5 = ch(top.g, bottom.g), b5 = ch(top.b, bottom.b);
  return { r: (r5 << 3) | (r5 >> 2), g: (g5 << 3) | (g5 >> 2), b: (b5 << 3) | (b5 >> 2) };
}

const oracleRgb = readFileSync(`${rgbDir}/${String(tick).padStart(5, "0")}.rgb`);
function oracleColorAt(x, y) {
  const o = (y * 240 + x) * 3;
  return { r: oracleRgb[o], g: oracleRgb[o + 1], b: oracleRgb[o + 2] };
}
const eq = (a, b) => a && b && a.r === b.r && a.g === b.g && a.b === b.b;

console.log(`tick=${tick} age=${age} isPsychic=${isPsychic} mx=${mx} my=${my} tintCoeff=${tintCoeff} eva=${eva} evb=${evb}`);
for (const arg of pixelArgs) {
  const [xs, ys] = arg.split(",");
  const x = Number(xs), y = Number(ys);
  const dx = x - ox, dy = y - oy;
  const rx = dx - halfW, ry = dy - halfH;
  const sx = ((rx * mx) >> 8) + halfW;
  const sy = ((ry * my) >> 8) + halfH;
  const inBounds = sx >= 0 && sx < w && sy >= 0 && sy < h;
  const top = inBounds ? spriteTexel(sx, sy) : null;
  const bottom = bgPixelAt(x, y);
  const oracle = oracleColorAt(x, y);
  const blended = top ? blend16(top, bottom, eva, evb) : null;
  console.log(
    `(${x},${y}) sx=${sx} sy=${sy} top=${top ? `${top.r},${top.g},${top.b}` : "transparent"}`
    + ` bottom=${bottom.r},${bottom.g},${bottom.b}`
    + ` blended=${blended ? `${blended.r},${blended.g},${blended.b}` : "n/a"}`
    + ` oracle=${oracle.r},${oracle.g},${oracle.b}`
    + ` match=${eq(blended, oracle)}`,
  );
}
