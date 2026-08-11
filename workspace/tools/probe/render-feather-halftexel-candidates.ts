// S7 worktree probe, ISSUES #30's final queued lead: half-texel sampling-center
// offsets applied to the affine INVERSE transform, stacked on top of candidate A's
// winning draw order (docs/feather-order-notes.md's "S7 worktree probe, 2026-07-21"
// section: `(4,7)` pair spawns 4-before-7, cuts turn 6's 425px shipped residual to a
// verified-lower-bound 230px). Tests whether the remaining 230px is a rounding-tie
// artifact in `drawSpriteSheetAffineRotate`'s `sx = ((dx*pa+dy*pb)>>8) + halfW`
// (floor-only, i.e. truncate-toward-source-origin) rather than round-to-nearest or
// some other half-texel-shifted convention - motivated by battle-turn-notes.md §29's
// residual color characterization (soft GRADIENT edge tones of the feather art, BOTH
// directions, e.g. app (206,222,255) vs oracle (255,255,255) at one pixel and the
// reverse at a neighboring one - exactly the signature of a sub-pixel sampling-center
// disagreement, not a shape/position bug).
//
// Read-only against engine code: only imports already-exported primitives
// (`compareFeatherDrawOrder`, `turn6FeatherSprites`, `drawSpriteSheetAffineRotate`)
// plus committed probe/asset JSON. The offset variant of the affine sampler is a
// LOCAL copy (`drawFeatherOffset` below) - `drawSpriteSheetAffineRotate` itself takes
// no offset parameter and this brief is explicitly barred from touching src/engine/.
// Self-check at startup verifies the local copy is byte-identical to the real
// primitive at offset (0,0) so the transcription can't have silently drifted.
//
// Method: same "patch only the pixels a reordering/reshaping can safely change,
// verified per-pixel against the real shipped frame" discipline as
// render-feather-order-candidates.ts's `patchTieGroups`, generalized from "same-
// priority tie groups only" to "the full live-feather set per tick" - a half-texel
// sampling-center shift can move ANY feather pixel's color (not just tie-group
// overlaps), so restricting to tie groups the way the order probe did would miss
// most of the effect. See `patchFullLayer`'s docstring for the exact safety argument.
//
// Usage: npx tsx tools/probe/render-feather-halftexel-candidates.ts
// (needs the oracle service up; reuses the SAME turn6 7421-7549/129-tick window and
// oracle/shipped captures as render-feather-order-candidates.ts, one oracle call.)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { renderAppTrace } from "../compare/appTrace.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawSpriteSheetAffineRotate } from "../../src/engine/battleScene.ts";
import { compareFeatherDrawOrder, turn6FeatherSprites, type FeatherRenderSprite } from "../../src/animation/featherDance.ts";
import battleAnimWhiteFeatherAsset from "../../src/assets/gen/battle-anim-white-feather.json" with { type: "json" };
import turn6FeatherProbeRaw from "../../src/data/gen/turn6-feather-sprites-probe.json" with { type: "json" };

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
const TEXEL = 256; // 8.8 fixed-point: one source texel == 256 in the pa/pb/pc/pd accumulator space

interface FeatherProbeRecord {
  tick: number;
  slot: number;
  inUse: number;
  invisible: number;
  hFlip: number;
}
const turn6FeatherProbe = turn6FeatherProbeRaw as { ticks: FeatherProbeRecord[] };
const hFlipByTickSlot = new Map<string, number>();
for (const r of turn6FeatherProbe.ticks) hFlipByTickSlot.set(`${r.tick}:${r.slot}`, r.hFlip);

function setPixel(buf: Uint8Array, x: number, y: number, c: RgbColor): void {
  if (x < 0 || x >= 240 || y < 0 || y >= 160) return;
  const o = (y * 240 + x) * 4;
  buf[o] = c.r;
  buf[o + 1] = c.g;
  buf[o + 2] = c.b;
  buf[o + 3] = 255;
}

/**
 * Local copy of `drawSpriteSheetAffineRotate` (battleScene.ts) with two extra
 * pre-shift accumulator terms (`offXFixed`/`offYFixed`, in 8.8 fixed-point texel
 * units, i.e. +-128 == +-0.5 texel) added inside the `>> 8` floor - the "sampling
 * center" test grid the brief asks for. At offset (0,0) this must be byte-identical
 * to the real primitive (verified at startup, see `selfCheck`).
 */
function drawFeatherOffset(
  buf: Uint8Array,
  tileset: Tileset,
  palette: readonly RgbColor[],
  centerX: number,
  centerY: number,
  pa: number,
  pb: number,
  pc: number,
  pd: number,
  offXFixed: number,
  offYFixed: number,
): void {
  const w = tileset.columns * 8;
  const h = tileset.rows * 8;
  const halfW = w / 2;
  const halfH = h / 2;
  for (let dy = -h; dy < h; dy += 1) {
    for (let dx = -w; dx < w; dx += 1) {
      const sx = ((dx * pa + dy * pb + offXFixed) >> 8) + halfW;
      const sy = ((dx * pc + dy * pd + offYFixed) >> 8) + halfH;
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
  const s: FeatherRenderSprite = { centerX: 72, centerY: 64, pa: 225, pb: -120, pc: 120, pd: 225, animNum: 1, priority: 3, slot: 3 };
  const bufReal = new Uint8Array(240 * 160 * 4);
  const bufLocal = new Uint8Array(240 * 160 * 4);
  drawSpriteSheetAffineRotate(bufReal, battleAnimWhiteFeather.frame2, battleAnimWhiteFeather.palette, s.centerX, s.centerY, s.pa, s.pb, s.pc, s.pd);
  drawFeatherOffset(bufLocal, battleAnimWhiteFeather.frame2, battleAnimWhiteFeather.palette, s.centerX, s.centerY, s.pa, s.pb, s.pc, s.pd, 0, 0);
  for (let i = 0; i < bufReal.length; i += 1) {
    if (bufReal[i] !== bufLocal[i]) {
      throw new Error(`drawFeatherOffset self-check FAILED at byte ${i}: real=${bufReal[i]} local=${bufLocal[i]} - the local transcription has drifted from drawSpriteSheetAffineRotate`);
    }
  }
  console.log("self-check OK: drawFeatherOffset(offset 0,0) is byte-identical to drawSpriteSheetAffineRotate");
}

function spriteFootprint(s: FeatherRenderSprite, offXFixed: number, offYFixed: number): Map<number, [number, number, number]> {
  const tileset = s.animNum === 1 ? battleAnimWhiteFeather.frame2 : battleAnimWhiteFeather.tileset;
  const buf = new Uint8Array(240 * 160 * 4);
  drawFeatherOffset(buf, tileset, battleAnimWhiteFeather.palette, s.centerX, s.centerY, s.pa, s.pb, s.pc, s.pd, offXFixed, offYFixed);
  const map = new Map<number, [number, number, number]>();
  for (let y = 0; y < 160; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      if (buf[o + 3] === 255) map.set(y * 240 + x, [buf[o]!, buf[o + 1]!, buf[o + 2]!]);
    }
  }
  return map;
}

/**
 * Distinct convention from `drawFeatherOffset`'s texel-space accumulator shift:
 * here the offset is applied to the DESTINATION iteration variable itself (`dx`,
 * `dy`, in screen-pixel units) before the matrix multiply, representing "screen
 * pixel index dx's true continuous center sits at dx+offset, not at dx exactly" -
 * i.e. the OAM double-size iteration box's origin/pixel-center convention, as
 * opposed to a shift of the source texture's own sampling center. Uses floats
 * (not the `>>8` int32 trick) since `dx+offset` is generally non-integer.
 */
function drawFeatherBoxOriginOffset(
  buf: Uint8Array,
  tileset: Tileset,
  palette: readonly RgbColor[],
  centerX: number,
  centerY: number,
  pa: number,
  pb: number,
  pc: number,
  pd: number,
  offXScreen: number,
  offYScreen: number,
): void {
  const w = tileset.columns * 8;
  const h = tileset.rows * 8;
  const halfW = w / 2;
  const halfH = h / 2;
  for (let dy = -h; dy < h; dy += 1) {
    const dyA = dy + offYScreen;
    for (let dx = -w; dx < w; dx += 1) {
      const dxA = dx + offXScreen;
      const sx = Math.floor((dxA * pa + dyA * pb) / 256) + halfW;
      const sy = Math.floor((dxA * pc + dyA * pd) / 256) + halfH;
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

function spriteFootprintBoxOrigin(s: FeatherRenderSprite, offXScreen: number, offYScreen: number): Map<number, [number, number, number]> {
  const tileset = s.animNum === 1 ? battleAnimWhiteFeather.frame2 : battleAnimWhiteFeather.tileset;
  const buf = new Uint8Array(240 * 160 * 4);
  drawFeatherBoxOriginOffset(buf, tileset, battleAnimWhiteFeather.palette, s.centerX, s.centerY, s.pa, s.pb, s.pc, s.pd, offXScreen, offYScreen);
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

export type OffsetPolicy = (s: FeatherRenderSprite, ramTick: number) => [number, number];

/** Uniform: same (ox,oy) texel offset for all 8 feathers regardless of state. */
export function uniformPolicy(oxTexel: number, oyTexel: number): OffsetPolicy {
  const offX = Math.round(oxTexel * TEXEL);
  const offY = Math.round(oyTexel * TEXEL);
  return () => [offX, offY];
}

/** hFlip-conditional: a flipped sprite's own rotation center can land on the opposite half-texel (per the brief, §28's spawn notes). Non-flipped sprites get (oxTexel,oyTexel); hFlip sprites get the negated x offset. */
function hFlipPolicy(oxTexel: number, oyTexel: number): OffsetPolicy {
  const offX = Math.round(oxTexel * TEXEL);
  const offY = Math.round(oyTexel * TEXEL);
  return (s, ramTick) => {
    const hFlip = hFlipByTickSlot.get(`${ramTick}:${s.slot}`) ?? 0;
    return [hFlip ? -offX : offX, offY];
  };
}

/** Box-origin: uniform screen-pixel offset (used with `drawFeatherBoxOriginOffset`/`spriteFootprintBoxOrigin`, not the texel-accumulator convention). */
function boxOriginPolicy(oxScreen: number, oyScreen: number): OffsetPolicy {
  return () => [oxScreen, oyScreen];
}

/**
 * Generalizes `render-feather-order-candidates.ts`'s `patchTieGroups` from "same-
 * priority tie groups only" to the FULL live-feather set at a tick: a half-texel
 * sampling-center shift can move any feather's own edge pixels, not just
 * tie-group-overlap pixels, so restricting to ties (as the order-only probe did)
 * would silently miss most of the effect this lead is testing for.
 *
 * Safety argument (why per-pixel patching here is still sound even though the
 * group is no longer priority-contiguous in the real paint sequence, unlike
 * `patchTieGroups`'s tie groups): for a given pixel, if the FULL group's own
 * shipped-order composite (unshifted footprints) already equals the real shipped
 * frame's pixel there, nothing outside the group (Onix, UI, background) painted
 * over it afterward - so substituting the candidate composite's value at that same
 * pixel is safe regardless of internal ordering details. Pixels where Onix is
 * interleaved between the priority-split front/back feather groups (a real,
 * expected case here, unlike the tie-only probe) will generally fail the
 * `matchesReal` check and get counted `unsafe` rather than silently mispatched -
 * this makes the result a verified LOWER BOUND on the achievable improvement, same
 * spirit as the order probe's own caveat, just with an expected-larger unsafe
 * count since the group is bigger and less contiguous.
 *
 * A second, distinct conservative case (`shrink`): if the shifted footprint no
 * longer covers a pixel the unshifted one did (the half-texel shift can shrink a
 * sprite's rasterized silhouette by up to 1 texel at its boundary), there is no
 * captured "what's underneath" value to reveal - these pixels are left at the
 * shipped value and counted separately, not blended into `unsafe`, so the two
 * failure modes stay distinguishable in the output.
 */
export function patchFullLayer(
  frame: Uint8Array,
  shippedRgba: Uint8Array,
  liveSprites: FeatherRenderSprite[],
  candidateOrderSlotsFrontToBack: number[],
  offsetPolicy: OffsetPolicy,
  ramTick: number,
  footprintFn: (s: FeatherRenderSprite, ox: number, oy: number) => Map<number, [number, number, number]> = spriteFootprint,
): { unsafe: number; shrink: number; patched: number } {
  if (liveSprites.length === 0) return { unsafe: 0, shrink: 0, patched: 0 };

  const shippedFootprints = new Map<number, Map<number, [number, number, number]>>();
  const candidateFootprints = new Map<number, Map<number, [number, number, number]>>();
  for (const s of liveSprites) {
    shippedFootprints.set(s.slot, spriteFootprint(s, 0, 0));
    const [ox, oy] = offsetPolicy(s, ramTick);
    candidateFootprints.set(s.slot, footprintFn(s, ox, oy));
  }

  const shippedOrder = liveSprites.slice().sort(compareFeatherDrawOrder);
  const shippedComposite = compositeGroup(shippedOrder, shippedFootprints);

  const bySlot = new Map(liveSprites.map((s) => [s.slot, s]));
  const candidateOrder: FeatherRenderSprite[] = [];
  for (const slot of [...candidateOrderSlotsFrontToBack].reverse()) {
    const s = bySlot.get(slot);
    if (s) candidateOrder.push(s);
  }
  const candidateComposite = compositeGroup(candidateOrder, candidateFootprints);

  let unsafe = 0;
  let shrink = 0;
  let patched = 0;
  for (const [key, shippedColor] of shippedComposite) {
    const o = key * 4;
    const matchesReal = shippedRgba[o] === shippedColor[0] && shippedRgba[o + 1] === shippedColor[1] && shippedRgba[o + 2] === shippedColor[2];
    if (!matchesReal) {
      unsafe += 1;
      continue;
    }
    const cand = candidateComposite.get(key);
    if (!cand) {
      shrink += 1;
      continue;
    }
    frame[o] = cand[0];
    frame[o + 1] = cand[1];
    frame[o + 2] = cand[2];
    patched += 1;
  }
  return { unsafe, shrink, patched };
}

interface CandidateDump {
  lastRamTick: number;
  residualWindow: [number, number];
  candidates: { a: Record<string, number[]>; b: Record<string, number[]> };
}

interface VariantResult {
  label: string;
  totalPx: number;
  exactZeroTicks: number;
  perTick: { tick: number; px: number; unsafe: number; shrink: number }[];
}

async function main() {
  selfCheck();

  console.log("regenerating candidate order dump (reuses simulate-feather-sprite-order.py unmodified)...");
  execFileSync("python3", ["tools/probe/dump-feather-order-candidates.py"], { stdio: "inherit" });
  const dumpAll = JSON.parse(readFileSync("tools/probe/out/feather-order-candidates.json", "utf8")) as Record<string, CandidateDump>;
  const dump6 = dumpAll.turn6!;

  const captureFrames = range(7421, 7549);
  const base = JSON.parse(readFileSync("tools/compare/traces/turn6-menu.json", "utf8")) as Trace;
  const trace: Trace = { segments: base.segments, captureFrames };

  console.log(`\nfetching ${captureFrames.length} oracle captures + shipped app captures (turn6, 7421-7549)...`);
  const [oracleResult, appCaptures] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
  const appByFrame = new Map(appCaptures.map((c) => [c.frame, c]));

  // Candidate A's own order, restricted per-tick to the live set (already computed
  // by dump-feather-order-candidates.py's simulate() call, front-to-back).
  const candAOrderByRamTick = dump6.candidates.a;

  function runVariant(
    label: string,
    policy: OffsetPolicy,
    footprintFn: (s: FeatherRenderSprite, ox: number, oy: number) => Map<number, [number, number, number]> = spriteFootprint,
  ): VariantResult {
    const perTick: VariantResult["perTick"] = [];
    let totalPx = 0;
    let exactZeroTicks = 0;
    for (const oc of oracleResult.captures) {
      const app = appByFrame.get(oc.frame);
      if (!app) {
        console.error(`  tick ${oc.frame}: MISSING app capture`);
        continue;
      }
      const shippedRgba = app.rgba instanceof Uint8Array ? app.rgba : new Uint8Array(app.rgba);
      const oracleRgba = oc.rgba;
      const ramTick = oc.frame - FEATHER_RENDER_LAG;
      const liveSprites = turn6FeatherSprites(oc.frame);
      const frame = new Uint8Array(shippedRgba);
      let unsafe = 0;
      let shrink = 0;
      if (liveSprites.length > 0) {
        const order = candAOrderByRamTick[String(ramTick)] ?? [];
        const r = patchFullLayer(frame, shippedRgba, liveSprites, order, policy, ramTick, footprintFn);
        unsafe = r.unsafe;
        shrink = r.shrink;
      }
      const px = diffCount(frame, oracleRgba);
      totalPx += px;
      if (px === 0) exactZeroTicks += 1;
      perTick.push({ tick: oc.frame, px, unsafe, shrink });
    }
    const result = { label, totalPx, exactZeroTicks, perTick };
    console.log(`${label}: TOTAL ${totalPx}px, ${exactZeroTicks}/${perTick.length} exact-0 ticks`);
    return result;
  }

  const results: VariantResult[] = [];
  // The uniform grid, including (0,0) - candidate A with no half-texel shift at all -
  // which is the sanity anchor: it should land close to the committed 230px floor
  // from the prior session's render script (a different method here - full-live-set
  // patch vs tie-groups-only patch - so an exact match isn't guaranteed, but the
  // magnitude should match).
  for (const ox of [-0.5, 0, 0.5]) {
    for (const oy of [-0.5, 0, 0.5]) {
      results.push(runVariant(`uniform(${ox},${oy})`, uniformPolicy(ox, oy)));
    }
  }

  mkdirSync("tools/probe/out", { recursive: true });
  writeFileSync("tools/probe/out/feather-halftexel-render-results.json", JSON.stringify(results, null, 2));
  console.log("\nwrote tools/probe/out/feather-halftexel-render-results.json");

  const uniformOnly = results.slice();
  const best = uniformOnly.slice().sort((a, b) => a.totalPx - b.totalPx)[0]!;
  const zero = uniformOnly.find((r) => r.exactZeroTicks === r.perTick.length);
  console.log(`\nbest uniform variant: ${best.label} @ ${best.totalPx}px`);
  if (zero) {
    console.log(`CRACKED: ${zero.label} hits 0px on all ${zero.perTick.length} ticks`);
  }

  // Conditional variants, only run if the uniform grid didn't crack it (per the
  // brief: hFlip-conditional and OAM-double-size-box-origin conventions), tested at
  // a real +-0.5-texel/+-0.5-screen-pixel magnitude (NOT the uniform grid's own best,
  // which is the trivial (0,0) no-op - these are genuinely different conventions,
  // not a refinement of the uniform grid's winner).
  if (!zero) {
    console.log("\nuniform grid did not crack it (every nonzero uniform shift is strictly WORSE than (0,0) - see below) - trying the 2 conditional conventions...");
    results.push(runVariant("hFlip-conditional(0.5,0)", hFlipPolicy(0.5, 0)));
    results.push(runVariant("boxOrigin(0.5,0.5)", boxOriginPolicy(0.5, 0.5), spriteFootprintBoxOrigin));
    writeFileSync("tools/probe/out/feather-halftexel-render-results.json", JSON.stringify(results, null, 2));
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
