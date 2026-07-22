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

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn10-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

// The whole AERIAL_ACE animation window, per docs/aerial-ace-notes.md's own
// fresh full-frame diff pass (flat through 12360, dense 12361-12384, flat
// again from 12385).
const WINDOW = range(12355, 12389);
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

  console.log(`\n${WINDOW.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
