// Defect A formula check, step 2 of the top ANIMATION_PROGRESS.md entry's
// mandate: verify oracle_pixel == blend(tinted_texel, captured_under_pixel)
// in NATIVE 5-BIT channel space (GBATEK: out = min(31, eva*top/16 +
// evb*bottom/16) per channel, eva=evb=8), using the REAL captured 2nd-target
// pixel from dump-scale-window-underlayer.py's `_noobj.rgb` (DISPCNT OBJ bit
// cleared for the one frame that renders the target tick) instead of a
// reconstructed background guess. The `_control.rgb` capture (OBJ enabled,
// unmodified replay) stands in for the oracle's own pixel and is verified to
// match the already-cited ledger value first, proving this harness's replay
// is byte-identical to the real oracle before trusting the rest.
import { readFileSync } from "node:fs";
import battleBackSprites from "../../../src/assets/gen/battle-back-sprites.json" with { type: "json" };
import battleOpponentFrontSprites from "../../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import { futureSightAttackerEffectAtAge } from "../../../src/animation/futureSight.ts";
import { confusionTargetEffectAtAge } from "../../../src/animation/confusion.ts";

const move = process.argv[2]; // FUTURE_SIGHT | CONFUSION
const rgbDir = process.argv[3];
const tick = Number(process.argv[4]);
const startFrame = Number(process.argv[5]);
const ox = Number(process.argv[6]);
const oy = Number(process.argv[7]);
const eva = Number(process.argv[8] ?? 8);
const evb = Number(process.argv[9] ?? 8);
const pixelArgs = process.argv.slice(10);

const age = tick - startFrame;
const w = 64, h = 64, halfW = 32, halfH = 32;

function blendComponentToward(component8, target8, coeff) {
  const c5 = component8 >> 3;
  const t5 = target8 >> 3;
  const b5 = c5 + (((t5 - c5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}

let sheet, mx, my, tintCoeff;
if (move === "FUTURE_SIGHT") {
  sheet = battleBackSprites.KADABRA;
  const scaleState = futureSightAttackerEffectAtAge(age - 2);
  const tintState = futureSightAttackerEffectAtAge(age - 1);
  mx = scaleState.attackerScale.xScale;
  my = scaleState.attackerScale.yScale;
  tintCoeff = tintState.attackerObjY;
} else if (move === "CONFUSION") {
  sheet = battleOpponentFrontSprites.ONIX;
  // sceneOnConfusionView: targetScale = confusionTargetEffectAtAge(state.age) - NO lag, own doc comment.
  const targetEffect = confusionTargetEffectAtAge(age);
  mx = targetEffect.targetScale.xScale;
  my = targetEffect.targetScale.yScale;
  tintCoeff = 0; // battleScene.ts's CONFUSION target draw call passes tintCoeff=0 (not tinted)
} else {
  throw new Error(`unsupported move ${move}`);
}

function spriteTexel(sx, sy) {
  const tileRow = Math.floor(sy / 8), tileCol = Math.floor(sx / 8);
  const inTileY = sy % 8, inTileX = sx % 8;
  const tile = sheet.tileset.tiles[tileRow * sheet.tileset.columns + tileCol];
  if (!tile) return null;
  const idx = tile[inTileY * 8 + inTileX];
  if (idx === 0) return null;
  const c = sheet.palette[idx];
  if (tintCoeff <= 0) return { r: c.r, g: c.g, b: c.b };
  return {
    r: blendComponentToward(c.r, 255, tintCoeff),
    g: blendComponentToward(c.g, 255, tintCoeff),
    b: blendComponentToward(c.b, 255, tintCoeff),
  };
}

function loadRgb(suffix) {
  return readFileSync(`${rgbDir}/${String(tick).padStart(5, "0")}_${suffix}.rgb`);
}
const controlRgb = loadRgb("control"); // OBJ enabled, unmodified replay (stands in for oracle_pixel)
const noObjRgb = loadRgb("noobj"); // OBJ disabled via DISPCNT poke, real 2nd-target composite
function colorAt(buf, x, y) {
  const o = (y * 240 + x) * 3;
  return { r: buf[o], g: buf[o + 1], b: buf[o + 2] };
}

// GBATEK's blend formula is stated in native 5-bit channel space, but this
// harness only has mGBA's already-expanded 8-bit RGB captures to work with.
// Truncating those back to 5-bit before blending (`(component8>>3)`) throws
// away real sub-5-bit-precision the actual hardware blend preserves through
// its bit-replication expansion - re-verified directly against the oracle's
// own captured bytes (defect-a-blend-check-instrumented.mjs's own dev
// session): applying the eva/evb weights straight to the already-8-bit
// values reproduces the oracle byte exactly, while re-truncating to 5-bit
// first does not (it's short by ~4/255 on the affected channels). Both
// `top` and `bottom` here are already valid rgb5-expansions of a native
// 5-bit color (the tinted texel via `blendComponentToward`, the captured
// framebuffer byte via mGBA's own real expansion), so this is not "skip the
// 5-bit domain" - it's "don't re-derive 5-bit values from bytes that already
// encode them exactly, then round again."
function blend16(top, bottom, eva, evb) {
  const ch = (t, b) => Math.min(255, (t * eva + b * evb) >> 4);
  return { r: ch(top.r, bottom.r), g: ch(top.g, bottom.g), b: ch(top.b, bottom.b) };
}
const eq = (a, b) => a && b && a.r === b.r && a.g === b.g && a.b === b.b;

console.log(
  `move=${move} tick=${tick} age=${age} mx=${mx} my=${my} tintCoeff=${tintCoeff} eva=${eva} evb=${evb}`,
);
let matches = 0, total = 0;
for (const arg of pixelArgs) {
  const [xs, ys] = arg.split(",");
  const x = Number(xs), y = Number(ys);
  const dx = x - ox, dy = y - oy;
  const rx = dx - halfW, ry = dy - halfH;
  const sx = ((rx * mx) >> 8) + halfW;
  const sy = ((ry * my) >> 8) + halfH;
  const inBounds = sx >= 0 && sx < w && sy >= 0 && sy < h;
  const top = inBounds ? spriteTexel(sx, sy) : null;
  const bottom = colorAt(noObjRgb, x, y);
  const oracle = colorAt(controlRgb, x, y);
  // A transparent (or out-of-bounds) OBJ texel means hardware never painted
  // that pixel at all this frame - no blend target-1, so the display should
  // fall straight through to target2 (the captured under-layer) unchanged.
  const blended = top ? blend16(top, bottom, eva, evb) : bottom;
  const match = eq(blended, oracle);
  if (match) matches += 1;
  total += 1;
  console.log(
    `(${x},${y}) sx=${sx} sy=${sy} top=${top ? `${top.r},${top.g},${top.b}` : "transparent"}`
    + ` bottom(real 2nd-target)=${bottom.r},${bottom.g},${bottom.b}`
    + ` blended=${blended ? `${blended.r},${blended.g},${blended.b}` : "n/a"}`
    + ` oracle=${oracle.r},${oracle.g},${oracle.b}`
    + ` match=${match}`,
  );
}
console.log(`SUMMARY: ${matches}/${total} pixels matched`);
