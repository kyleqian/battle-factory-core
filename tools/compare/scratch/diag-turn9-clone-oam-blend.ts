// ISSUES #32 (worktree PROBE): turn 9 QUICK_ATTACK clone-vs-clone 203px
// residual at renders 10940-10941. Fresh RAM read (`dump-turn9-clone-oam.py`,
// this session, RAM ticks 10937-10942) found something structurally
// DIFFERENT than every prior attempt assumed: the real Pidgeotto sprite
// (slot 5) is `invisible=true` for this ENTIRE window and NEVER appears in
// `gMain.oamBuffer` at all (confirmed by scanning all 128 entries for a
// match on slot 5's own x/y/tileNum/paletteNum - zero hits, every tick). The
// actual OAM tie at both residual ticks is between the TWO clones
// themselves: slot 4 (index 11) vs slot 3's second life (index 12), BOTH
// `objMode=1` (semi-transparent) - not "clone vs opaque real" like
// AERIAL_ACE/the hitsplat. Slot 4 sits at the lower index at BOTH RAM ticks
// 10939 and 10940 (never flips), so it wins the tie against slot 3
// unconditionally here, same GBATEK rule as ever - but the real sprite
// contributes NOTHING, ever, since it's not in the buffer.
//
// This script tests candidate composites purely from assets (tileset/
// palette + the static BG, never the live/oracle framebuffer) against a
// fresh oracle capture, to find the exact rule.
import { runOracleTrace, type Trace } from "../oracleClient.ts";
import pidgeottoTraceJson from "../traces/turn9-quickattack.json" with { type: "json" };
import opponentFrontSpritesAsset from "../../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import battleBgAsset from "../../../src/assets/gen/battle-bg.json" with { type: "json" };

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

function blend(top: Rgb, bottom: Rgb, eva: number, evb: number): Rgb {
  const b = (t: number, btm: number) => Math.min(255, Math.floor((t * eva + btm * evb) / 16));
  return { r: b(top.r, bottom.r), g: b(top.g, bottom.g), b: b(top.b, bottom.b) };
}

const PIDGEOTTO_CORNER = { x: 144, y: 19 };
const BBOX = process.env.FULL_FOOTPRINT
  ? { x0: 127, y0: 19, x1: 232, y1: 74 } // union of every corner this window ever uses (real/slot3 first life -17..0, slot4 +24) plus the 64x64 sprite size, capped at the ground clip (y=74) since draws below it are intentionally left untouched
  : { x0: 178, y0: 41, x1: 190, y1: 62 }; // inclusive-exclusive per ISSUES #32's own citation

// Direct copies of `turn9QuickAttackSlot3Offset`/`turn9QuickAttackSlot4Offset`
// (src/engine/battleScene.ts) - MUST stay in lockstep with the wired
// per-tick gating, or "Model A" below won't actually reproduce the currently
// wired behavior (a first pass at this script hardcoded both clones as
// always-active across the whole probe window and produced nonsense
// low-single-digit match counts even at renders 10938/10939, which are
// independently already known 0-diff - the bug was in this gating, not the
// candidate formulas).
const PRESS_TICK = 10871; // TURN9_QUICKATTACK_PRESS_TICK
const CLONE_RENDER_LAG = 1; // TURN9_QUICKATTACK_CLONE_RENDER_LAG
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

function colorAt(rgba: Buffer, x: number, y: number): Rgb {
  const o = (y * 240 + x) * 4;
  return { r: rgba[o]!, g: rgba[o + 1]!, b: rgba[o + 2]! };
}
function eq(a: Rgb, b: Rgb): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}
function fmt(c: Rgb): string {
  return `(${c.r},${c.g},${c.b})`;
}

async function main() {
  const trace = pidgeottoTraceJson as Trace;
  const captureFrames = process.env.FULL_FOOTPRINT
    ? [10935, 10936, 10937, 10938, 10939, 10940, 10941, 10942, 10943, 10944]
    : [10938, 10939, 10940, 10941, 10942];
  const result = await runOracleTrace({ segments: trace.segments, captureFrames });

  for (const cap of result.captures) {
    const t = cap.frame;
    const slot3Offset = slot3OffsetAt(t);
    const slot4Offset = slot4OffsetAt(t);
    const slot3Active = slot3Offset !== null;
    const slot4Active = slot4Offset !== null;
    const slot3Corner = slot3Active ? { x: PIDGEOTTO_CORNER.x + slot3Offset.x2, y: PIDGEOTTO_CORNER.y + slot3Offset.y2 } : null;
    const slot4Corner = slot4Active ? { x: PIDGEOTTO_CORNER.x + slot4Offset.x2, y: PIDGEOTTO_CORNER.y + slot4Offset.y2 } : null;
    console.log(`render ${t}: slot3Active=${slot3Active}${slot3Offset ? ` offset=(${slot3Offset.x2},${slot3Offset.y2})` : ""}  slot4Active=${slot4Active}${slot4Offset ? ` offset=(${slot4Offset.x2},${slot4Offset.y2})` : ""}`);

    const counts: Record<string, number> = { A_selfBlendReal: 0, B_winnerVsField: 0, C_winnerVsNestedLoser: 0, D_loserWinsVsField: 0, total: 0 };
    const mismatchesB: string[] = [];
    const mismatchesA: string[] = [];
    const mismatchesF: string[] = [];

    for (let y = BBOX.y0; y < BBOX.y1; y += 1) {
      for (let x = BBOX.x0; x < BBOX.x1; x += 1) {
        const oracle = colorAt(cap.rgba, x, y);
        const field = staticFieldPixel(x, y) ?? { r: 0, g: 0, b: 0 };

        const slot3Idx = slot3Corner ? pidgeottoIdxAt(x - slot3Corner.x, y - slot3Corner.y) : null;
        const slot4Idx = slot4Corner ? pidgeottoIdxAt(x - slot4Corner.x, y - slot4Corner.y) : null;
        const slot3Opaque = slot3Idx !== null && slot3Idx !== 0;
        const slot4Opaque = slot4Idx !== null && slot4Idx !== 0;
        // "real" is drawn (opaque) at the FIXED (0,0) corner whenever this
        // function runs at all (lunge is null throughout this window) -
        // independent of slot3's own corner, which only coincides with
        // real's during slot3's SECOND life.
        const realIdx = pidgeottoIdxAt(x - PIDGEOTTO_CORNER.x, y - PIDGEOTTO_CORNER.y);
        const realOpaque = realIdx !== null && realIdx !== 0;
        if (!slot3Opaque && !slot4Opaque && !realOpaque) continue; // outside every footprint - not part of the residual
        counts.total += 1;

        const texel3 = slot3Opaque ? pidgeotto.palette[slot3Idx!]! : null;
        const texel4 = slot4Opaque ? pidgeotto.palette[slot4Idx!]! : null;
        const texelReal = realOpaque ? pidgeotto.palette[realIdx!]! : null;

        // Model A: the CURRENTLY WIRED behavior, faithfully replaying
        // `drawTurn9QuickAttackAnimation`'s own draw order - real opaque
        // first (fixed corner), slot3 blended over it (only where slot3 is
        // actually active THIS tick, at slot3's own corner), slot4 blended
        // over that last (only where active, at slot4's own corner).
        let fbA: Rgb = field;
        if (realOpaque) fbA = texelReal!;
        if (slot3Active && slot3Opaque) fbA = blend(texel3!, fbA, 12, 8);
        if (slot4Active && slot4Opaque) fbA = blend(texel4!, fbA, 12, 8);
        if (eq(fbA, oracle)) counts.A_selfBlendReal += 1;
        else mismatchesA.push(`(${x},${y}) oracle=${fmt(oracle)} modelA=${fmt(fbA)}`);

        // Model B: slot4 wins the tie unconditionally (RAM-proven, lower
        // oamBuffer index at both ticks), real contributes nothing (absent
        // from oamBuffer entirely), slot3 only shows where slot4 does not
        // cover it - BOTH blend against the plain static field alone.
        const modelB = slot4Opaque ? blend(texel4!, field, 12, 8) : slot3Opaque ? blend(texel3!, field, 12, 8) : field;
        if (eq(modelB, oracle)) counts.B_winnerVsField += 1;
        else mismatchesB.push(`(${x},${y}) oracle=${fmt(oracle)} modelB=${fmt(modelB)} field=${fmt(field)} texel3=${texel3 ? fmt(texel3) : "-"} texel4=${texel4 ? fmt(texel4) : "-"}`);

        // Model C: slot4 wins, but blends against slot3's OWN composited
        // (already-blended-against-field) result wherever slot3 ALSO
        // occupies that pixel (nested single-blend-per-visible-layer, in
        // case the hardware's per-pixel "target2" is the next VISIBLE
        // layer down, not the plain field, when two OBJs truly overlap).
        const slot3Composited = slot3Opaque ? blend(texel3!, field, 12, 8) : field;
        const modelC = slot4Opaque ? blend(texel4!, slot3Composited, 12, 8) : slot3Composited;
        if (eq(modelC, oracle)) counts.C_winnerVsNestedLoser += 1;

        // Model D: sanity check with the winner/loser roles swapped (slot3
        // wins instead of slot4), vs field alone - falsification check in
        // case the OAM index reading direction is inverted from what we
        // assumed.
        const modelD = slot3Opaque ? blend(texel3!, field, 12, 8) : slot4Opaque ? blend(texel4!, field, 12, 8) : field;
        if (eq(modelD, oracle)) counts.D_loserWinsVsField += 1;

        // Model F: real drawn opaque first (exactly as currently wired,
        // proven necessary/correct by the 8 already-0-diff renders) - then
        // ONLY the OAM-tie WINNER (slot4, lower index, wins unconditionally
        // per the fresh RAM read) blends over the POST-REAL framebuffer
        // wherever its own texel is opaque; the loser (slot3) is fully
        // SUPPRESSED (does not blend at all) at any pixel slot4 also
        // covers, win-or-lose decided per-pixel by slot4's own opacity, not
        // by a static footprint-overlap test.
        const baseAfterReal = realOpaque ? texelReal! : field;
        const modelF = slot4Opaque ? blend(texel4!, baseAfterReal, 12, 8) : slot3Opaque ? blend(texel3!, baseAfterReal, 12, 8) : baseAfterReal;
        if (eq(modelF, oracle)) counts.F_winnerVsPostReal = (counts.F_winnerVsPostReal ?? 0) + 1;
        else mismatchesF.push(`(${x},${y}) oracle=${fmt(oracle)} modelF=${fmt(modelF)} real=${texelReal ? fmt(texelReal) : "-"} texel3=${texel3 ? fmt(texel3) : "-"} texel4=${texel4 ? fmt(texel4) : "-"}`);
      }
    }

    console.log(`render ${t}: opaque-pixels=${counts.total}  A(wired)=${counts.A_selfBlendReal}  B(slot4-vs-field)=${counts.B_winnerVsField}  C(slot4-vs-nested-slot3)=${counts.C_winnerVsNestedLoser}  D(slot3-vs-field)=${counts.D_loserWinsVsField}  F(winner-vs-post-real, loser-suppressed)=${counts.F_winnerVsPostReal ?? 0}`);
    if (t === 10940 || t === 10941) {
      console.log(`  probe pixel (181,41) oracle=${fmt(colorAt(cap.rgba, 181, 41))}`);
    }
    if (counts.B_winnerVsField !== counts.total && (t === 10940 || t === 10941)) {
      console.log(`  first few Model B mismatches at render ${t}:`);
      for (const m of mismatchesB.slice(0, 8)) console.log(`    ${m}`);
    }
    if (counts.A_selfBlendReal !== counts.total) {
      console.log(`  first few Model A mismatches at render ${t} (sanity check vs known-0-diff ticks):`);
      for (const m of mismatchesA.slice(0, 8)) console.log(`    ${m}`);
    }
    if ((counts.F_winnerVsPostReal ?? 0) !== counts.total) {
      console.log(`  first few Model F mismatches at render ${t}:`);
      for (const m of mismatchesF.slice(0, 12)) console.log(`    ${m}`);
    }
  }
}

main();
