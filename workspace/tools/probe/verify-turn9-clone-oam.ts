// ISSUES #32 (worktree PROBE, turn 9 QUICK_ATTACK clone-vs-clone 203px
// residual at renders 10940-10941): re-derives the solved winner/blend rule
// fresh against a live `bin/oracle` capture and fails loudly if real
// hardware ever stops matching. Pixel-only for the blend-formula checks; the
// OAM-buffer-index checks below DO re-assert against committed data (the
// trimmed `tools/probe/turn9-clone-oam-dump.json`, produced by
// `dump-turn9-clone-oam.py` this session) since that file already IS the
// RAM ground truth committed to the repo - no mgba-venv python needed to
// read a JSON file, unlike re-deriving it from scratch.
//
// RAM fact this script's predictions depend on (dump-turn9-clone-oam.py,
// gMain.oamBuffer, RAM ticks 10937-10942 = render 10938-10943): the REAL
// Pidgeotto sprite (slot 5) is `invisible=true` this ENTIRE window and NEVER
// appears anywhere in the 128-entry gMain.oamBuffer (checked every tick) -
// it contributes NOTHING to compositing, contrary to every prior attempt's
// assumption that slot 4 was tied against the real sprite. The actual tie is
// between the TWO clones themselves: slot 4 sits at oamBuffer index 11,
// slot 3's second life at index 12, at BOTH RAM ticks that render the
// residual (10939 -> render 10940, 10940 -> render 10941) - slot 4's LOWER
// index wins unconditionally there (same GBATEK same-priority rule as
// AERIAL_ACE/the hitsplat).
//
// The fix (`docs/turn9-shake-notes.md`'s dated append this session): the
// currently-wired `drawTurn9QuickAttackAnimation` already draws the real
// sprite opaque first (proven correct/necessary by the 8 already-0-diff
// renders in this same window, 10935-10939/10942-10944) - the bug is that it
// then blends slot 3 THEN slot 4 unconditionally in sequence, so wherever
// they overlap, slot 4 ends up blending against slot 3's OWN already-blended
// result (double-blend contamination) instead of against the plain
// post-real framebuffer. The fix: wherever slot 4's own texel is opaque, it
// is the ONLY clone that blends there (slot 3 is fully suppressed at that
// pixel, not just out-drawn) - target2 is whatever's beneath BOTH clones
// (the real sprite's own opaque redraw, or the field where real isn't
// opaque either). Verified pixel-exact across the ENTIRE animated window's
// full sprite footprint (both corners' 64x64 area, 1932/1932 opaque pixels
// at every one of renders 10935-10944), not just the originally-cited bbox.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn9-clone-oam.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import opponentFrontSpritesAsset from "../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import battleBgAsset from "../../src/assets/gen/battle-bg.json" with { type: "json" };
import oamDump from "./turn9-clone-oam-dump.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn9-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

type Rgb = { r: number; g: number; b: number };

const pidgeotto = (opponentFrontSpritesAsset as any).PIDGEOTTO as {
  tileset: { columns: number; rows: number; tiles: (number[] | null)[] };
  palette: Rgb[];
};
const SPRITE_W = pidgeotto.tileset.columns * 8; // 64
const SPRITE_H = pidgeotto.tileset.rows * 8; // 64

function pidgeottoIdxAt(relX: number, relY: number): number | null {
  if (relX < 0 || relX >= SPRITE_W || relY < 0 || relY >= SPRITE_H) return null;
  const tileRow = Math.floor(relY / 8);
  const tileCol = Math.floor(relX / 8);
  const tile = pidgeotto.tileset.tiles[tileRow * pidgeotto.tileset.columns + tileCol];
  if (!tile) return null;
  return tile[(relY % 8) * 8 + (relX % 8)]!;
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
  if (!entry) return null;
  const tile = bg.static.tileset.tiles[entry.tile];
  if (!tile) return null;
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx];
  if (idx === 0) return null;
  return bg.palette[entry.palette][idx];
}

function blend8bit(top: Rgb, bottom: Rgb, eva: number, evb: number): Rgb {
  const b = (t: number, btm: number) => Math.min(255, Math.floor((t * eva + btm * evb) / 16));
  return { r: b(top.r, bottom.r), g: b(top.g, bottom.g), b: b(top.b, bottom.b) };
}

const PIDGEOTTO_CORNER = { x: 144, y: 19 };
const PRESS_TICK = 10871; // TURN9_QUICKATTACK_PRESS_TICK
const CLONE_RENDER_LAG = 1; // TURN9_QUICKATTACK_CLONE_RENDER_LAG
const EVA = 12, EVB = 8; // BLDALPHA=0x080c, RAM-confirmed

// Direct copies of `turn9QuickAttackSlot3Offset`/`turn9QuickAttackSlot4Offset`
// (src/engine/battleScene.ts) - real's own lunge is long over by this window
// (TURN9_QUICKATTACK_LUNGE_TABLE has only 6 entries, done by RAM 10933), so
// real is always at offset (0,0) here.
function slot3OffsetAt(t: number): { x2: number; y2: number } | null {
  const n = t - CLONE_RENDER_LAG - PRESS_TICK;
  if (n >= 58 && n <= 64) return { x2: -17, y2: 2 };
  if (n >= 68 && n <= 74) return { x2: 0, y2: 0 };
  return null;
}
function slot4OffsetAt(t: number): { x2: number; y2: number } | null {
  const n = t - CLONE_RENDER_LAG - PRESS_TICK;
  if (n >= 63 && n <= 69) return { x2: 24, y2: 6 };
  return null;
}

// Full union footprint every corner in this window ever occupies (real's
// resting (0,0), slot 3's first life (-17,2), slot 4's (24,6)), capped at
// the ground clip (TURN9_QUICKATTACK_LUNGE_GROUND_CLIP_Y=74) since draws
// below it are intentionally left untouched by the lunge/clone machinery.
const FOOTPRINT_BOX = { x0: 127, x1: 232, y0: 19, y1: 74 };
const RENDER_TICKS = [10935, 10936, 10937, 10938, 10939, 10940, 10941, 10942, 10943, 10944];

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

/** The fixed rule: real drawn opaque first; slot 4 wins any tie against slot 3 unconditionally (blends over whatever's beneath, real-or-field); slot 3 only shows/blends where slot 4 is NOT also opaque there. */
function predict(x: number, y: number, t: number): Rgb | null {
  const field = staticFieldPixel(x, y) ?? { r: 0, g: 0, b: 0 };
  const realIdx = pidgeottoIdxAt(x - PIDGEOTTO_CORNER.x, y - PIDGEOTTO_CORNER.y);
  const realOpaque = realIdx !== null && realIdx !== 0;
  const baseAfterReal = realOpaque ? pidgeotto.palette[realIdx!]! : field;

  const slot3Offset = slot3OffsetAt(t);
  const slot4Offset = slot4OffsetAt(t);
  const slot3Idx = slot3Offset ? pidgeottoIdxAt(x - (PIDGEOTTO_CORNER.x + slot3Offset.x2), y - (PIDGEOTTO_CORNER.y + slot3Offset.y2)) : null;
  const slot4Idx = slot4Offset ? pidgeottoIdxAt(x - (PIDGEOTTO_CORNER.x + slot4Offset.x2), y - (PIDGEOTTO_CORNER.y + slot4Offset.y2)) : null;
  const slot3Opaque = slot3Idx !== null && slot3Idx !== 0;
  const slot4Opaque = slot4Idx !== null && slot4Idx !== 0;

  if (!slot3Opaque && !slot4Opaque) return realOpaque ? baseAfterReal : null; // not part of this animation's footprint at all
  if (slot4Opaque) return blend8bit(pidgeotto.palette[slot4Idx!]!, baseAfterReal, EVA, EVB);
  return blend8bit(pidgeotto.palette[slot3Idx!]!, baseAfterReal, EVA, EVB);
}

/** The CURRENTLY WIRED (buggy) behavior, for the falsification pin: real opaque, then slot 3 blended over it (if active), then slot 4 blended over THAT (if active) - unconditional sequential blending, no suppression. */
function predictWired(x: number, y: number, t: number): Rgb | null {
  const field = staticFieldPixel(x, y) ?? { r: 0, g: 0, b: 0 };
  const realIdx = pidgeottoIdxAt(x - PIDGEOTTO_CORNER.x, y - PIDGEOTTO_CORNER.y);
  const realOpaque = realIdx !== null && realIdx !== 0;
  let fb = realOpaque ? pidgeotto.palette[realIdx!]! : field;
  const anyActive = slot3OffsetAt(t) !== null || slot4OffsetAt(t) !== null;
  if (!anyActive) return null;

  const slot3Offset = slot3OffsetAt(t);
  const slot4Offset = slot4OffsetAt(t);
  const slot3Idx = slot3Offset ? pidgeottoIdxAt(x - (PIDGEOTTO_CORNER.x + slot3Offset.x2), y - (PIDGEOTTO_CORNER.y + slot3Offset.y2)) : null;
  const slot4Idx = slot4Offset ? pidgeottoIdxAt(x - (PIDGEOTTO_CORNER.x + slot4Offset.x2), y - (PIDGEOTTO_CORNER.y + slot4Offset.y2)) : null;
  if (slot3Idx !== null && slot3Idx !== 0) fb = blend8bit(pidgeotto.palette[slot3Idx]!, fb, EVA, EVB);
  if (slot4Idx !== null && slot4Idx !== 0) fb = blend8bit(pidgeotto.palette[slot4Idx]!, fb, EVA, EVB);
  return fb;
}

async function main() {
  trace.captureFrames = RENDER_TICKS;
  console.log(`Running fresh oracle capture over ${trace.captureFrames.length} ticks...`);
  const { captures } = await runOracleTrace(trace);
  const byFrame = new Map(captures.map((c) => [c.frame, PNG.sync.read(c.png)]));

  // --- OAM buffer order, re-asserted against the committed RAM dump (not a
  // fresh RAM read - that needs the mgba-venv python interpreter - but a
  // genuine programmatic check against the committed ground truth, not just
  // a prose citation).
  const dumpTicks = (oamDump as any).ticks as Array<{ tick: number; sprites: Record<string, { oamBufferIndex: number | null; invisible: boolean }> }>;
  for (const ramTick of [10939, 10940]) {
    const row = dumpTicks.find((r) => r.tick === ramTick)!;
    const slot3Index = row.sprites["3"]!.oamBufferIndex;
    const slot4Index = row.sprites["4"]!.oamBufferIndex;
    const slot5Invisible = row.sprites["5"]!.invisible;
    const slot5Index = row.sprites["5"]!.oamBufferIndex;
    check(
      `RAM tick ${ramTick}: slot 4 (index ${slot4Index}) wins its OAM tie over slot 3 (index ${slot3Index}) - lower index`,
      typeof slot4Index === "number" && typeof slot3Index === "number" && slot4Index < slot3Index,
      `slot3Index=${slot3Index} slot4Index=${slot4Index}`,
    );
    check(
      `RAM tick ${ramTick}: the real sprite (slot 5) is invisible and absent from gMain.oamBuffer entirely (contributes nothing)`,
      slot5Invisible === true && slot5Index === null,
      `invisible=${slot5Invisible} oamBufferIndex=${slot5Index}`,
    );
  }

  // --- The solved rule, every opaque pixel in the full union footprint,
  // every render tick in the animated window (not just the originally-cited
  // bbox).
  for (const t of RENDER_TICKS) {
    const img = byFrame.get(t)!;
    let allExact = true;
    let opaqueCount = 0;
    const details: string[] = [];
    for (let y = FOOTPRINT_BOX.y0; y < FOOTPRINT_BOX.y1; y++) {
      for (let x = FOOTPRINT_BOX.x0; x < FOOTPRINT_BOX.x1; x++) {
        const predicted = predict(x, y, t);
        if (predicted === null) continue;
        opaqueCount++;
        const o = (y * 240 + x) * 4;
        const oracle = { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
        const exact = predicted.r === oracle.r && predicted.g === oracle.g && predicted.b === oracle.b;
        if (!exact) {
          allExact = false;
          if (details.length < 5) details.push(`(${x},${y}) predicted=(${predicted.r},${predicted.g},${predicted.b}) oracle=(${oracle.r},${oracle.g},${oracle.b})`);
        }
      }
    }
    check(`render ${t}: fixed rule (slot 4 wins unconditionally, suppresses slot 3, blends against real-or-field) predicts ALL ${opaqueCount} footprint pixels EXACTLY`, allExact, details.join("; "));
  }

  // --- Named probe pixels, per-tick, at the two specifically-cited residual
  // renders (ISSUES #32's own bbox (178,41)-(190,62), smoking-gun check).
  const PROBE_PIXELS = [
    { x: 181, y: 41 },
    { x: 186, y: 41 },
    { x: 183, y: 42 },
  ];
  for (const t of [10940, 10941]) {
    const img = byFrame.get(t)!;
    for (const { x, y } of PROBE_PIXELS) {
      const predicted = predict(x, y, t)!;
      const o = (y * 240 + x) * 4;
      const oracle = { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
      check(
        `render ${t} probe pixel (${x},${y}): predicted=(${predicted.r},${predicted.g},${predicted.b}) matches oracle`,
        predicted.r === oracle.r && predicted.g === oracle.g && predicted.b === oracle.b,
        `oracle=(${oracle.r},${oracle.g},${oracle.b})`,
      );
    }
  }

  // --- Falsification pin: the CURRENTLY WIRED sequential-blend behavior
  // must NOT match oracle at the smoking-gun pixel (confirms the fix is a
  // genuine behavior change, not a no-op restatement of the existing code).
  {
    const t = 10940, x = 181, y = 41;
    const img = byFrame.get(t)!;
    const wired = predictWired(x, y, t)!;
    const o = (y * 240 + x) * 4;
    const oracle = { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
    const wiredMatches = wired.r === oracle.r && wired.g === oracle.g && wired.b === oracle.b;
    check(
      `falsification pin: the CURRENTLY WIRED sequential-blend (real, then slot3, then slot4, unconditionally) does NOT match oracle at (${x},${y})/render ${t}`,
      !wiredMatches,
      `wired-predicted=(${wired.r},${wired.g},${wired.b}) oracle=(${oracle.r},${oracle.g},${oracle.b})`,
    );
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
