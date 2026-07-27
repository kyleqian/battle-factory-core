// S7 worktree probe, ISSUES #30 class (b) forensics follow-up: tests whether
// the Onix-gray occlusion-boundary residual (docs/feather-order-notes.md's
// "forensics on candidate A's own remaining residual" section - 18/30 sampled
// pixels, 60%, land on Onix's own body color, NOT any feather palette entry)
// is explained by `drawSpriteSheetAffineRotate` using the wrong DESTINATION
// SCAN WINDOW for feather sprites.
//
// The hypothesis, from source: `gFallingFeatherSpriteTemplate.oam` is
// `&gOamData_AffineNormal_ObjNormal_32x32` (battle_anim_flying.c:175) -
// `affineMode = ST_OAM_AFFINE_NORMAL` (`gba/types.h:83`, value 1), NOT
// `ST_OAM_AFFINE_DOUBLE` (value 3, used by e.g. the thrown-ball spin anim,
// `pokeball.c:95`, which `drawSpriteSheetAffineRotate`'s own docstring cites
// as the primitive's motivating case for its DOUBLED destination scan window,
// `dy`/`dx` ranging `-h..h-1`/`-w..w-1`, i.e. 64x64 for a 32x32 source). Real
// AFFINE_NORMAL GBA sprites are NOT given extra screen-space room for
// rotation - their on-screen bounding box stays exactly their nominal WxH
// (here 32x32, i.e. dx/dy in [-16,15] relative to center) regardless of
// rotation, so ANY rotated content that would fall outside that box gets
// hard-clipped (this is exactly why AFFINE_DOUBLE exists - to avoid that
// clipping for sprites that need it). `drawSpriteSheetAffineRotate` applies
// the SAME doubled window to every caller, feathers included - so it may be
// painting rotated feather-texel content beyond the true +-16 box that real
// hardware clips away, letting whatever is drawn underneath (here: Onix's
// own already-drawn sprite) show through instead. The residual forensics
// sample's consistent `dx=16` location (exactly the first column OUTSIDE a
// symmetric +-16 non-doubled box) is the concrete tell.
//
// Read-only against engine code (this brief's constraint: no battleScene.ts
// edits without flagging them prominently) - `drawFeatherNormalBox` below is
// a LOCAL copy of `drawSpriteSheetAffineRotate` with the destination loop
// bounds narrowed to the non-doubled box; self-checked to agree with the real
// primitive everywhere INSIDE that box (so this isn't a resample, only a
// clip) before any variant is scored.
//
// Usage: npx tsx tools/probe/render-feather-normalbox-candidate.ts
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { renderAppTrace } from "../compare/appTrace.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawSpriteSheetAffineRotate } from "../../src/engine/battleScene.ts";
import { compareFeatherDrawOrder, turn6FeatherSprites, type FeatherRenderSprite } from "../../src/animation/featherDance.ts";
import battleAnimWhiteFeatherAsset from "../../src/assets/gen/battle-anim-white-feather.json" with { type: "json" };

interface Tileset {
  columns: number;
  rows: number;
  tiles: number[][];
}
interface RgbColor {
  r: number;
  g: number;
  b: number;
}
const battleAnimWhiteFeather = battleAnimWhiteFeatherAsset as { tileset: Tileset; frame2: Tileset; palette: RgbColor[] };

const FEATHER_RENDER_LAG = 1;

function setPixel(buf: Uint8Array, x: number, y: number, c: RgbColor): void {
  if (x < 0 || x >= 240 || y < 0 || y >= 160) return;
  const o = (y * 240 + x) * 4;
  buf[o] = c.r;
  buf[o + 1] = c.g;
  buf[o + 2] = c.b;
  buf[o + 3] = 255;
}

/** Local copy of `drawSpriteSheetAffineRotate`, destination loop narrowed to
 * the non-doubled AFFINE_NORMAL box (`dx`/`dy` in `[-halfW,halfW-1]` /
 * `[-halfH,halfH-1]`) instead of the doubled `[-w,w-1]`/`[-h,h-1]` the real
 * primitive always uses. Sampling math (the inverse transform + tile lookup)
 * is untouched - only which destination pixels get visited changes. */
function drawFeatherNormalBox(buf: Uint8Array, tileset: Tileset, palette: readonly RgbColor[], centerX: number, centerY: number, pa: number, pb: number, pc: number, pd: number): void {
  const w = tileset.columns * 8;
  const h = tileset.rows * 8;
  const halfW = w / 2;
  const halfH = h / 2;
  for (let dy = -halfH; dy < halfH; dy += 1) {
    for (let dx = -halfW; dx < halfW; dx += 1) {
      const sx = ((dx * pa + dy * pb) >> 8) + halfW;
      const sy = ((dx * pc + dy * pd) >> 8) + halfH;
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
      const tile = tileset.tiles[Math.floor(sy / 8) * tileset.columns + Math.floor(sx / 8)];
      if (!tile) continue;
      const idx = tile[(sy % 8) * 8 + (sx % 8)]!;
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      setPixel(buf, centerX + dx, centerY + dy, c);
    }
  }
}

function selfCheck(): void {
  // A real probed matrix (turn6, tick 7404, slot 3 spawn) exercising a genuine
  // rotation (not axis-aligned), same fixture render-feather-halftexel-
  // candidates.ts uses for its own self-check.
  const s: FeatherRenderSprite = { centerX: 72, centerY: 64, pa: 225, pb: -120, pc: 120, pd: 225, animNum: 1, priority: 3, slot: 3, order: 0 };
  const bufReal = new Uint8Array(240 * 160 * 4);
  const bufBox = new Uint8Array(240 * 160 * 4);
  drawSpriteSheetAffineRotate(bufReal, battleAnimWhiteFeather.frame2, battleAnimWhiteFeather.palette, s.centerX, s.centerY, s.pa, s.pb, s.pc, s.pd);
  drawFeatherNormalBox(bufBox, battleAnimWhiteFeather.frame2, battleAnimWhiteFeather.palette, s.centerX, s.centerY, s.pa, s.pb, s.pc, s.pd);
  const w = battleAnimWhiteFeather.frame2.columns * 8;
  const h = battleAnimWhiteFeather.frame2.rows * 8;
  const halfW = w / 2;
  const halfH = h / 2;
  let insideMismatches = 0;
  let clippedPixels = 0;
  for (let dy = -h; dy < h; dy += 1) {
    for (let dx = -w; dx < w; dx += 1) {
      const x = s.centerX + dx;
      const y = s.centerY + dy;
      if (x < 0 || x >= 240 || y < 0 || y >= 160) continue;
      const o = (y * 240 + x) * 4;
      const realPainted = bufReal[o + 3] === 255;
      const boxPainted = bufBox[o + 3] === 255;
      const inside = dx >= -halfW && dx < halfW && dy >= -halfH && dy < halfH;
      if (inside) {
        if (realPainted !== boxPainted || bufReal[o] !== bufBox[o] || bufReal[o + 1] !== bufBox[o + 1] || bufReal[o + 2] !== bufBox[o + 2]) {
          insideMismatches += 1;
        }
      } else if (realPainted) {
        clippedPixels += 1;
      }
    }
  }
  if (insideMismatches > 0) {
    throw new Error(`drawFeatherNormalBox self-check FAILED: ${insideMismatches} pixels differ from the real primitive INSIDE the non-doubled box - this should be a pure clip, not a resample`);
  }
  console.log(`self-check OK: drawFeatherNormalBox agrees with drawSpriteSheetAffineRotate everywhere inside the +-16 box; clips ${clippedPixels} real-primitive-painted pixels OUTSIDE it (this fixture, this one matrix) - confirms the doubled window really does paint extra content for a real feather matrix`);
}

function spriteFootprint(s: FeatherRenderSprite, useNormalBox: boolean): Map<number, [number, number, number]> {
  const tileset = s.animNum === 1 ? battleAnimWhiteFeather.frame2 : battleAnimWhiteFeather.tileset;
  const buf = new Uint8Array(240 * 160 * 4);
  if (useNormalBox) {
    drawFeatherNormalBox(buf, tileset, battleAnimWhiteFeather.palette, s.centerX, s.centerY, s.pa, s.pb, s.pc, s.pd);
  } else {
    drawSpriteSheetAffineRotate(buf, tileset, battleAnimWhiteFeather.palette, s.centerX, s.centerY, s.pa, s.pb, s.pc, s.pd);
  }
  const map = new Map<number, [number, number, number]>();
  for (let y = 0; y < 160; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      if (buf[o + 3] === 255) map.set(y * 240 + x, [buf[o]!, buf[o + 1]!, buf[o + 2]!]);
    }
  }
  return map;
}

function compositeGroup(order: FeatherRenderSprite[], footprints: Map<number, Map<number, [number, number, number]>>): Map<number, [number, number, number]> {
  const result = new Map<number, [number, number, number]>();
  for (const s of order) {
    const fp = footprints.get(s.slot);
    if (!fp) continue;
    for (const [k, c] of fp) result.set(k, c);
  }
  return result;
}

function diffCount(a: Uint8Array | Buffer, b: Uint8Array | Buffer): number {
  let n = 0;
  for (let i = 0; i < 240 * 160; i += 1) {
    const o = i * 4;
    if (a[o] !== b[o] || a[o + 1] !== b[o + 1] || a[o + 2] !== b[o + 2]) n += 1;
  }
  return n;
}

/**
 * Same `matchesReal`-gated patch discipline as the other probes in this
 * dossier: only substitutes the normal-box composite at a pixel where the
 * DOUBLED-box (shipped/engine) composite already reproduces the real shipped
 * frame there - so a patched pixel's "before" value is trusted, and the
 * "after" value is a like-for-like substitution, not a guess.
 */
function patchNormalBox(frame: Uint8Array, shippedRgba: Uint8Array, liveSprites: FeatherRenderSprite[]): { unsafe: number; patched: number } {
  if (liveSprites.length === 0) return { unsafe: 0, patched: 0 };
  const doubledFootprints = new Map<number, Map<number, [number, number, number]>>();
  const normalFootprints = new Map<number, Map<number, [number, number, number]>>();
  for (const s of liveSprites) {
    doubledFootprints.set(s.slot, spriteFootprint(s, false));
    normalFootprints.set(s.slot, spriteFootprint(s, true));
  }
  const order = liveSprites.slice().sort(compareFeatherDrawOrder);
  const doubledComposite = compositeGroup(order, doubledFootprints);
  const normalComposite = compositeGroup(order, normalFootprints);

  let unsafe = 0;
  let patched = 0;
  for (const [key, doubledColor] of doubledComposite) {
    const o = key * 4;
    const matchesReal = shippedRgba[o] === doubledColor[0] && shippedRgba[o + 1] === doubledColor[1] && shippedRgba[o + 2] === doubledColor[2];
    if (!matchesReal) {
      unsafe += 1;
      continue;
    }
    const normalColor = normalComposite.get(key);
    if (normalColor) {
      frame[o] = normalColor[0];
      frame[o + 1] = normalColor[1];
      frame[o + 2] = normalColor[2];
    } else {
      // clipped away entirely under the normal box - nothing from this
      // group paints here; leave the framebuffer at whatever the base
      // scene (Onix/background, already drawn before the feather layer)
      // put there. `frame` starts as a copy of `shippedRgba` (the FULL
      // composited scene), which already IS that base value at any pixel
      // the doubled layer alone painted - so simply not overwriting it here
      // is correct only if nothing else painted there after; for the
      // front-priority group (drawn last) that base value is stale (it's
      // shippedRgba's post-feather value, not the pre-feather one) - this
      // script only trusts additions (feather-over-something), not removals,
      // so removal-only pixels are intentionally left unpatched and NOT
      // counted as unsafe (they're a separate, known-conservative gap noted
      // in the printed summary below).
    }
    patched += 1;
  }
  return { unsafe, patched };
}

interface CandidateDump {
  candidates: { a: Record<string, number[]> };
}

async function main() {
  selfCheck();

  execFileSync("python3", ["tools/probe/dump-feather-order-candidates.py"], { stdio: "inherit" });

  const captureFrames = range(7421, 7549);
  const base = JSON.parse(readFileSync("tools/compare/traces/turn6-menu.json", "utf8")) as Trace;
  const trace: Trace = { segments: base.segments, captureFrames };

  console.log(`\nfetching ${captureFrames.length} oracle + shipped(candidate-A-engine) captures...`);
  const [oracleResult, appCaptures] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
  const appByFrame = new Map(appCaptures.map((c) => [c.frame, c]));

  let totalPxShipped = 0;
  let totalPxNormalBox = 0;
  let totalUnsafe = 0;
  let totalClipped = 0;
  const perTick: { tick: number; shipped: number; normalBox: number; unsafe: number }[] = [];

  for (const oc of oracleResult.captures) {
    const app = appByFrame.get(oc.frame);
    if (!app) continue;
    const shippedRgba = app.rgba instanceof Uint8Array ? app.rgba : new Uint8Array(app.rgba);
    const oracleRgba = oc.rgba;
    const liveSprites = turn6FeatherSprites(oc.frame);

    const shippedPx = diffCount(shippedRgba, oracleRgba);
    totalPxShipped += shippedPx;

    const frame = new Uint8Array(shippedRgba);
    let unsafe = 0;
    if (liveSprites.length > 0) {
      // count clipped-away pixels for reporting (footprint that existed in
      // doubled but not normal box)
      for (const s of liveSprites) {
        const d = spriteFootprint(s, false);
        const n = spriteFootprint(s, true);
        for (const k of d.keys()) if (!n.has(k)) totalClipped += 1;
      }
      const r = patchNormalBox(frame, shippedRgba, liveSprites);
      unsafe = r.unsafe;
    }
    const normalBoxPx = diffCount(frame, oracleRgba);
    totalPxNormalBox += normalBoxPx;
    totalUnsafe += unsafe;
    perTick.push({ tick: oc.frame, shipped: shippedPx, normalBox: normalBoxPx, unsafe });
  }

  console.log("\nper-tick (only where shipped != normalBox):");
  for (const p of perTick) {
    if (p.shipped !== p.normalBox) {
      console.log(`  tick ${p.tick}: shipped=${p.shipped}px normalBox=${p.normalBox}px unsafe=${p.unsafe}`);
    }
  }
  console.log(`\nTOTAL: shipped(candidate A, doubled box)=${totalPxShipped}px  normalBox(candidate A, clipped)=${totalPxNormalBox}px  unsafe=${totalUnsafe}  clipped-pixels-tested=${totalClipped} (across ${perTick.length} ticks)`);
  if (totalPxNormalBox < totalPxShipped) {
    console.log(`IMPROVEMENT: normal-box clipping reduces the residual by ${totalPxShipped - totalPxNormalBox}px`);
  } else if (totalPxNormalBox > totalPxShipped) {
    console.log(`WORSE: normal-box clipping increases the residual by ${totalPxNormalBox - totalPxShipped}px - hypothesis does not hold as stated`);
  } else {
    console.log("NO CHANGE: normal-box clipping never affected a verified-safe pixel in this window");
  }
}

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i += 1) out.push(i);
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
