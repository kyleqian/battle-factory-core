// S7 slice R rung (b) prep (turn 10's AERIAL_ACE animation) — mandatory
// first step for whoever picks this up next, same convention as
// tools/probe/verify-turn9-postlunge.ts. Re-derives the pinned facts in
// docs/aerial-ace-notes.md straight from a FRESH `bin/oracle run` (no stale
// PNGs, no trusting the doc's own prose) and fails loudly if the real
// hardware's pixels ever stop matching this session's own findings.
// Pixel-only (no RAM reads — this runs from plain `node`, not the mgba-venv
// python interpreter tools/probe/dump-cuttingslice-vram.py needs); the
// cutting-slice sprite's own x2/y2/tileNum table is RAM-sourced and cross-
// cited in docs/aerial-ace-notes.md, not re-asserted here — this script
// checks the PIXEL-VISIBLE consequences (onset/offset/plateau ticks) a
// render implementation must reproduce.
//
// 2026-07-21 extension (S7 slice R rung (b) groundwork continuation):
// added checks for mechanisms 1-3's own pixel-visible onset lag and
// mechanism 2's shake phase, pinned via a fresh RAM re-probe (tools/probe/
// dump-aerialace-anim.py) - see docs/aerial-ace-notes.md's own dated
// section for the full RAM tables these pixel checks corroborate.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn10-aerialace.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import opponentFrontSpritesAsset from "../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import battleBgAsset from "../../src/assets/gen/battle-bg.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn10-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

// The whole AERIAL_ACE animation window, per docs/aerial-ace-notes.md's own
// fresh full-frame diff pass (flat through 12360, dense 12361-12384, flat
// again from 12385). Plus Mission B's own flicker window (12404-12437,
// worktree PROBE follow-up) — a separate, later span past the main
// animation's own settle.
const WINDOW = [...range(12355, 12389), ...range(12404, 12437)];
trace.captureFrames = WINDOW;

function diffCount(png: Buffer, basePng: Buffer, box?: { x0: number; y0: number; x1: number; y1: number }): number {
  const img = PNG.sync.read(png);
  const base = PNG.sync.read(basePng);
  const { x0, y0, x1, y1 } = box ?? { x0: 0, y0: 0, x1: 240, y1: 160 };
  let diffs = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * 240 + x) * 4;
      if (img.data[i] !== base.data[i] || img.data[i + 1] !== base.data[i + 1] || img.data[i + 2] !== base.data[i + 2]) diffs += 1;
    }
  }
  return diffs;
}

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

async function main() {
  console.log(`Running fresh oracle capture over ${WINDOW.length} ticks...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };

  const base = get(12355).png; // pre-window baseline (docs/aerial-ace-notes.md: flat through 12360)
  const diff = (t: number, box?: { x0: number; y0: number; x1: number; y1: number }) => diffCount(get(t).png, base, box);

  // --- Window bracketing: flat before, dense during, flat again after ---
  for (const t of [12356, 12357, 12358, 12359, 12360]) {
    check(`pre-window tick ${t} is flat (0 diff vs 12355 baseline)`, diff(t) === 0, `got ${diff(t)}`);
  }
  check("first visible pixel change is render 12361, NOT 12360 (fresh finding, corrects the naive render=RAM+1 assumption for this window's own onset)", diff(12360) === 0 && diff(12361) > 0, `12360=${diff(12360)}, 12361=${diff(12361)}`);
  for (const t of [12385, 12386, 12387, 12388, 12389]) {
    check(`post-window tick ${t} settled flat again (0 diff vs 12355 baseline)`, diff(t) === 0, `got ${diff(t)}`);
  }

  // --- Mechanism 4 (background palette-blend pulse): the RE-BISECTED
  // plateau window, narrower than §40's own cited task-active span. Full BG
  // band (y:0-111, excludes the message-box strip) must show a near-full-band
  // darken (>=75% of 26880px) at 12368-12370 ONLY, not at the ticks
  // immediately either side. ---
  const BG_BAND = { x0: 0, y0: 0, x1: 240, y1: 112 };
  const BG_TOTAL = 240 * 112;
  for (const t of [12368, 12369, 12370]) {
    const d = diff(t, BG_BAND);
    check(`palette-pulse plateau at ${t}: >=75% of the BG band differs from baseline`, d >= BG_TOTAL * 0.75, `got ${d}/${BG_TOTAL} (${((d / BG_TOTAL) * 100).toFixed(1)}%)`);
  }
  for (const t of [12367, 12371]) {
    const d = diff(t, BG_BAND);
    check(`palette-pulse NOT at plateau at ${t} (narrower window than §40's cited 12367-12375)`, d < BG_TOTAL * 0.5, `got ${d}/${BG_TOTAL} (${((d / BG_TOTAL) * 100).toFixed(1)}%)`);
  }

  // --- Mechanism 5 (cutting-slice sprite): destroyed/gone by 12384 - the
  // sprite's own footprint region (a generous bbox covering its whole
  // diagonal travel, x:40-150 y:50-125 per docs/aerial-ace-notes.md's own
  // x2/y2 table) must be back to baseline outside Onix's own still-shaking
  // real-sprite box (44-99,49-111, mechanism 2, NOT modeled by this
  // groundwork step) - so this check only covers the slice-only extension
  // past Onix's own box, x:99-150.
  const SLICE_ONLY_BAND = { x0: 99, y0: 49, x1: 150, y1: 125 };
  check("slice sprite fully gone by 12384 (its own footprint past Onix's own box is back to baseline)", diff(12384, SLICE_ONLY_BAND) === 0, `got ${diff(12384, SLICE_ONLY_BAND)}`);

  // --- 2026-07-21 additions (S7 slice R rung (b) groundwork continuation:
  // mechanisms 1-3 fresh RAM re-derivation, docs/aerial-ace-notes.md's own
  // dated section below). Fresh RAM probe (tools/probe/dump-aerialace-anim.py)
  // pinned mechanisms 1/3 (Pidgeotto's lunge, slot 5; the two trace clones,
  // slots 4/7) as RAM-active starting the SAME RAM tick 12360 mechanism 5
  // (the slice) is created on - yet Pidgeotto's own on-screen territory
  // (x>=150, his base x=176) shows ZERO pixel diff at render 12361 (the
  // slice's own already-proven +1-lag debut tick), only gaining pixels at
  // render 12362 - a genuine, PNG-evidenced +2 lag for mechanisms 1/3 from
  // their own RAM-active start, one tick later than mechanism 5's, NOT
  // root-caused this session (flagged in the doc's own gap accounting). ---
  const PIDGEOTTO_TERRITORY = { x0: 150, y0: 0, x1: 240, y1: 160 };
  check(
    "the 71px render-12361 onset patch is confined to the slice sprite's own footprint - zero diff in Pidgeotto's own territory (x>=150), evidence it's mechanism 5 alone, not mechanisms 1/3",
    diff(12361, PIDGEOTTO_TERRITORY) === 0,
    `got ${diff(12361, PIDGEOTTO_TERRITORY)}`,
  );
  check(
    "mechanisms 1/3 (lunge + clones) first visible pixel is render 12362, NOT 12361 - a +2 lag from their own RAM-active start (12360), one tick later than mechanism 5's own already-pinned +1 lag",
    diff(12362, PIDGEOTTO_TERRITORY) > 0,
    `got ${diff(12362, PIDGEOTTO_TERRITORY)}`,
  );

  // Mechanism 2 (Onix's shake, slot 6): fresh RAM re-probe CONFIRMED §40's
  // own y2 square-wave window exactly (RAM 12369-12384, 3,3,0,0 x4 cycles,
  // no correction needed) - render=RAM+1 fits the alternating pattern
  // (unlike mechanisms 1/3's own +2 lag above): render 12374 (y2=3, "ON")
  // must show MORE diff than render 12376 (y2=0, "OFF") within Onix's own
  // footprint box, corroborating the phase alignment pixel-side.
  const ONIX_BOX = { x0: 44, y0: 49, x1: 99, y1: 111 };
  const onixOnDiff = diff(12374, ONIX_BOX);
  const onixOffDiff = diff(12376, ONIX_BOX);
  check(
    "Onix's shake alternates ON/OFF in Onix's own box (render 12374 'y2=3 ON' diff > render 12376 'y2=0 OFF' diff), confirming the RAM-confirmed 3,3,0,0 square wave's render-side phase",
    onixOnDiff > onixOffDiff,
    `12374=${onixOnDiff}, 12376=${onixOffDiff}`,
  );

  // --- 2026-07-21 Mission A extension (worktree PROBE step, docs/aerial-ace-
  // notes.md's "rung (b) residual" section): the independent 203px residual
  // at render 12370+ (bbox (178,41)-(190,62), real sprite settled at (0,0)
  // vs slot 7's clone at offset (24,6)) is confirmed to sit in a region
  // where BOTH the real sprite's own texel AND slot 7's clone texel (sampled
  // from the SAME committed tileset, at their own respective offsets) are
  // OPAQUE at the identical absolute screen pixel — a genuine simultaneous
  // two-OBJ overlap, not a position/offset bug. This check is pure asset
  // data (no oracle capture) — see the doc's own dossier section for the
  // pixel-classification evidence that falsifies "real always wins opaque,
  // drawn last" as the resolution rule for these pixels.
  const PIDGEOTTO_CORNER = { x: 144, y: 19 };
  const pidgeotto = (opponentFrontSpritesAsset as Record<string, { tileset: { rows: number; columns: number; tiles: (number[] | null)[] } }>).PIDGEOTTO!;
  function texelAt(localX: number, localY: number): number | undefined {
    const tx = Math.floor(localX / 8);
    const ty = Math.floor(localY / 8);
    if (tx < 0 || ty < 0 || tx >= pidgeotto.tileset.columns || ty >= pidgeotto.tileset.rows) return undefined;
    const tile = pidgeotto.tileset.tiles[ty * pidgeotto.tileset.columns + tx];
    if (!tile) return 0;
    return tile[localY % 8 * 8 + (localX % 8)];
  }
  const OVERLAP_SAMPLE_PIXELS: readonly [number, number][] = [
    [181, 41], [182, 41], [180, 42], [183, 44], [186, 44], [187, 44],
  ];
  const bothOpaque = OVERLAP_SAMPLE_PIXELS.every(([x, y]) => {
    const realIdx = texelAt(x - PIDGEOTTO_CORNER.x, y - PIDGEOTTO_CORNER.y);
    const cloneIdx = texelAt(x - PIDGEOTTO_CORNER.x - 24, y - PIDGEOTTO_CORNER.y - 6);
    return !!realIdx && !!cloneIdx;
  });
  check(
    "the 203px residual's own bbox sits where BOTH the real sprite's texel AND slot 7's clone texel are opaque at the same screen pixel (true two-OBJ overlap, not a position bug)",
    bothOpaque,
    `sampled pixels' real/clone texel opacity: ${JSON.stringify(
      OVERLAP_SAMPLE_PIXELS.map(([x, y]) => [
        texelAt(x - PIDGEOTTO_CORNER.x, y - PIDGEOTTO_CORNER.y),
        texelAt(x - PIDGEOTTO_CORNER.x - 24, y - PIDGEOTTO_CORNER.y - 6),
      ]),
    )}`,
  );

  // "real always wins opaque, drawn last" (the current engine rule) predicts
  // the oracle's own pixel at (181,41) at render 12371 (darken long since
  // restored, real sprite settled at (0,0)) should be EXACTLY Pidgeotto's
  // own plain palette color #5 (231,181,74) - the real sprite's own texel
  // there. Real hardware shows something else entirely (a much paler
  // color), falsifying that rule for true-overlap pixels - the replacement
  // rule is a NAMED, OPEN gap (see the dossier), not guessed here.
  const px181x41 = get(12371).png;
  const img181 = PNG.sync.read(px181x41);
  const o = (41 * 240 + 181) * 4;
  const sample = { r: img181.data[o]!, g: img181.data[o + 1]!, b: img181.data[o + 2]! };
  const REAL_PLAIN_COLOR_IDX5 = { r: 231, g: 181, b: 74 };
  const closeToRealPlain =
    Math.abs(sample.r - REAL_PLAIN_COLOR_IDX5.r) <= 4 &&
    Math.abs(sample.g - REAL_PLAIN_COLOR_IDX5.g) <= 4 &&
    Math.abs(sample.b - REAL_PLAIN_COLOR_IDX5.b) <= 4;
  check(
    "render 12371 pixel (181,41): oracle's real color is NOT Pidgeotto's own plain undarkened palette entry #5, falsifying 'real always wins opaque, drawn last' at true real+clone overlap pixels",
    !closeToRealPlain,
    `oracle=(${sample.r},${sample.g},${sample.b}), real-plain-idx5=(${REAL_PLAIN_COLOR_IDX5.r},${REAL_PLAIN_COLOR_IDX5.g},${REAL_PLAIN_COLOR_IDX5.b})`,
  );

  // --- 2026-07-21 Mission A2 (worktree PROBE follow-up): the winner/blend
  // rule is now SOLVED for the plain (non-darken) overlap window, RAM-pinned
  // by reading the ACTUAL final OAM buffer (`gMain.oamBuffer`, tools/probe/
  // dump-aerialace-oam.py — NOT gSprites[]): slot 7 (the clone at offset
  // (24,6)) sits at final OAM index 10, the real sprite (slot 5) at 11 (or
  // 12, depending on tick) — STABLE across the ENTIRE overlap window
  // (12367-12373), never flips. Lower OAM index wins ties on real hardware
  // (GBATEK: same-priority sprites, lower OAM number displayed on top), so
  // the clone wins wherever ITS texel is opaque; the real sprite, having
  // lost the OBJ-layer contest outright, contributes NOTHING (GBA/mGBA's
  // OBJ layer outputs exactly one color per pixel — a losing same-layer
  // sprite can never be blend target 2) — target2 is the static FIELD pixel
  // underneath. predicted = floor((winnerTexel_8bit*eva + target2_8bit*evb)
  // / 16), eva=12/evb=8 (BLDALPHA=0x080c, RAM-confirmed), saturating at 255
  // — the same 8-bit-domain formula docs/battle-scene-notes.md's own
  // PROGRESS #68 pinned for BG alpha blend. Verified EXACT (0 tolerance) at
  // 6 sample pixels across renders 12371-12373 (see docs/aerial-ace-notes.md
  // for the full derivation and the darken-plateau's own remaining gap).
  const PIDGEOTTO_FIELD_CORNER = { x: 144, y: 19 }; // slot 5's offset (0,0) corner throughout this window
  const CLONE7_OFFSET = { x: 24, y: 6 };
  const EVA = 12, EVB = 8;
  function blend8bit(top: { r: number; g: number; b: number }, bottom: { r: number; g: number; b: number }, eva: number, evb: number) {
    const b = (t: number, btm: number) => Math.min(255, Math.floor((t * eva + btm * evb) / 16));
    return { r: b(top.r, bottom.r), g: b(top.g, bottom.g), b: b(top.b, bottom.b) };
  }
  const bgAsset = battleBgAsset as any;
  function staticFieldPixel(x: number, y: number): { r: number; g: number; b: number } {
    const tilemap = bgAsset.static.tilemap;
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
    const tile = bgAsset.static.tileset.tiles[entry.tile];
    const sx = entry.hFlip ? 7 - inTileX : inTileX;
    const sy = entry.vFlip ? 7 - inTileY : inTileY;
    const idx = tile[sy * 8 + sx];
    return bgAsset.palette[entry.palette][idx];
  }
  const SOLVED_RULE_SAMPLES: readonly [number, number][] = [
    [181, 41], [182, 41], [180, 42], [183, 44], [186, 44], [187, 44],
  ];
  for (const tick of [12371, 12372, 12373]) {
    const img = PNG.sync.read(get(tick).png);
    let allExact = true;
    const details: string[] = [];
    for (const [x, y] of SOLVED_RULE_SAMPLES) {
      const cloneLocal = { x: x - PIDGEOTTO_FIELD_CORNER.x - CLONE7_OFFSET.x, y: y - PIDGEOTTO_FIELD_CORNER.y - CLONE7_OFFSET.y };
      const cloneIdx = texelAt(cloneLocal.x, cloneLocal.y);
      if (!cloneIdx) continue; // clone transparent here — not a blend case, real wins outright, not this rule's claim
      const winnerTexel = pidgeotto.palette[cloneIdx]!;
      const target2 = staticFieldPixel(x, y);
      const predicted = blend8bit(winnerTexel, target2, EVA, EVB);
      const o2 = (y * 240 + x) * 4;
      const oracleRgb = { r: img.data[o2]!, g: img.data[o2 + 1]!, b: img.data[o2 + 2]! };
      const exact = predicted.r === oracleRgb.r && predicted.g === oracleRgb.g && predicted.b === oracleRgb.b;
      if (!exact) allExact = false;
      details.push(`(${x},${y}) predicted=(${predicted.r},${predicted.g},${predicted.b}) oracle=(${oracleRgb.r},${oracleRgb.g},${oracleRgb.b}) ${exact ? "OK" : "MISMATCH"}`);
    }
    check(
      `render ${tick}: solved winner-is-clone blend rule predicts every sample pixel EXACTLY (clone OAM idx 10 < real's 11/12, target2=field, floor((texel*12+field*8)/16))`,
      allExact,
      details.join("; "),
    );
  }
  // --- 2026-07-21 Mission A (worktree PROBE follow-up #2, docs/aerial-ace-
  // notes.md's "darken-plateau residual, NOT closed" section): the darken
  // window (render 12368-12370) closes with the SAME winner/blend rule as
  // the plain window above, once the darken step itself is corrected. The
  // prior session's `BlendPalette(plain, BLACK, 10)` re-derivation was off
  // by a few units/channel because it darkened the already-8-bit-EXPANDED
  // asset color; a fresh RAM read of the actual post-darken bytes
  // (tools/probe/dump-aerialace-darken-palette.py, gPlttBufferFaded for
  // Pidgeotto's OBJ bank 1 + BG hardware bank 2) proved the real hardware
  // darkens in the native 5-BIT BGR555 domain, THEN expands to 8-bit — a
  // distinct bit-domain bug, not a coefficient-fit problem (coefficient 10
  // was already correct). Since every asset color here is an exact 5-bit
  // expansion, `>>3` recovers the source 5-bit value losslessly, so this
  // closes with a FORMULA-ONLY fix (no RAM table needed at engine time):
  // darken5(c,coeff) = expand(to5bit(c) + ((0-to5bit(c))*coeff)>>4).
  // Verified exact (0 tolerance) against BOTH the RAM-read bytes directly
  // AND this formula-only reproduction, 6 sample pixels x 3 ticks = 18/18
  // (tools/compare/scratch/aerialace-darken-solve.ts, this session).
  function to5bit(v8: number): number {
    return v8 >> 3;
  }
  function from5bit(v5: number): number {
    return (v5 << 3) | (v5 >> 2);
  }
  function darken5(c: { r: number; g: number; b: number }, coeff: number) {
    const d = (ch: number) => {
      const v5 = to5bit(ch);
      return from5bit(v5 + (((0 - v5) * coeff) >> 4));
    };
    return { r: d(c.r), g: d(c.g), b: d(c.b) };
  }
  const DARKEN_SAMPLES: readonly [number, number][] = [
    [181, 41], [182, 41], [180, 42], [183, 44], [186, 44], [187, 44],
  ];
  for (const tick of [12368, 12369, 12370]) {
    const img = PNG.sync.read(get(tick).png);
    let allExact = true;
    const details: string[] = [];
    for (const [x, y] of DARKEN_SAMPLES) {
      const cloneLocal = { x: x - PIDGEOTTO_FIELD_CORNER.x - CLONE7_OFFSET.x, y: y - PIDGEOTTO_FIELD_CORNER.y - CLONE7_OFFSET.y };
      const cloneIdx = texelAt(cloneLocal.x, cloneLocal.y);
      if (!cloneIdx) continue;
      const winnerTexel = darken5(pidgeotto.palette[cloneIdx]!, 10);
      const plainField = staticFieldPixel(x, y);
      const target2 = darken5(plainField, 10);
      const predicted = blend8bit(winnerTexel, target2, EVA, EVB);
      const o2 = (y * 240 + x) * 4;
      const oracleRgb = { r: img.data[o2]!, g: img.data[o2 + 1]!, b: img.data[o2 + 2]! };
      const exact = predicted.r === oracleRgb.r && predicted.g === oracleRgb.g && predicted.b === oracleRgb.b;
      if (!exact) allExact = false;
      details.push(`(${x},${y}) predicted=(${predicted.r},${predicted.g},${predicted.b}) oracle=(${oracleRgb.r},${oracleRgb.g},${oracleRgb.b}) ${exact ? "OK" : "MISMATCH"}`);
    }
    check(
      `render ${tick} (darken plateau): solved rule + 5-bit-domain darken predicts every sample pixel EXACTLY, formula-only (clone wins, both texel+field darkened in native 5-bit space then expanded, then blended eva=12/evb=8)`,
      allExact,
      details.join("; "),
    );
  }
  // --- 2026-07-21 Mission B (worktree PROBE follow-up): the 12371-12437
  // flicker window. RAM-probed (tools/probe/dump-aerialace-anim.py, RAM
  // 12371-12437, reused verbatim): Onix's real sprite (slot 6, battler 0 —
  // this run's OWN player mon, taking the hit) toggles `invisible` in 4
  // blocks of 4-invisible/4-visible (period 8), RAM 12407-12434, delay 102
  // from press (12305) — the EXACT SAME shape (RENDER_LAG=1, PERIOD=8,
  // ON_TICKS=4, TOTAL_TICKS=32) as the already-wired `turn9Ep2OnixInvisible`
  // (battleScene.ts:7858-7867) — a REUSE verdict, not a new mechanism: only
  // the anchor delay (102 vs turn 9's 87) differs, both hang off their own
  // turn's pressTick. This is NOT mechanism 2's shake (`invisible` stays
  // wide-true 12357-12385 there, per the doc's own prior section) — this is
  // a later, separate, genuinely-toggling flicker, confirmed pixel-side
  // below with its own local baseline (12404, well after mechanism 2's own
  // window closes at 12386).
  const FLICKER_ONIX_BOX = { x0: 44, y0: 49, x1: 99, y1: 111 };
  const flickerBase = get(12404).png;
  const flickerDiff = (t: number) => diffCount(get(t).png, flickerBase, FLICKER_ONIX_BOX);
  for (const t of [12405, 12406, 12407]) {
    check(`Onix box flat vs the 12404 baseline at render ${t} (pre-flicker)`, flickerDiff(t) === 0, `got ${flickerDiff(t)}`);
  }
  for (const t of [12408, 12409, 12410, 12411]) {
    check(`Onix box differs at render ${t} — flicker block 1 ON (RAM 12407-12410, +1 render lag)`, flickerDiff(t) > 0, `got ${flickerDiff(t)}`);
  }
  for (const t of [12412, 12413, 12414, 12415]) {
    check(`Onix box flat again at render ${t} — flicker block 1 OFF gap`, flickerDiff(t) === 0, `got ${flickerDiff(t)}`);
  }
  for (const t of [12416, 12417, 12418, 12419]) {
    check(`Onix box differs at render ${t} — flicker block 2 ON`, flickerDiff(t) > 0, `got ${flickerDiff(t)}`);
  }
  for (const t of [12432, 12433, 12434, 12435]) {
    check(`Onix box differs at render ${t} — flicker block 4 ON (RAM 12431-12434, +1 render lag; the 4th block a naive 5-tick-short probe would miss, same lesson as turn9Ep2OnixInvisible's own history)`, flickerDiff(t) > 0, `got ${flickerDiff(t)}`);
  }
  for (const t of [12436, 12437]) {
    check(`Onix box flat again at render ${t} — flicker fully done after 4 blocks (TOTAL_TICKS=32, RAM 12435 already back to visible)`, flickerDiff(t) === 0, `got ${flickerDiff(t)}`);
  }

  console.log(`\n${WINDOW.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
