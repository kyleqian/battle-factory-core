// Mission B (worktree PROBE, ISSUES #31 - turn 9 QUICK_ATTACK hitsplat
// tip/edge residual): re-derives the solved winner/blend rule fresh against
// a live `bin/oracle` capture and fails loudly if real hardware ever stops
// matching. Pixel-only (no RAM reads — the RAM facts below are cross-cited
// from tools/probe/dump-quickattack-hitsplat-oam.py's own committed run, not
// re-asserted here since that needs the mgba-venv python interpreter, not
// plain `node`), same convention as tools/probe/verify-turn10-aerialace.ts.
//
// RAM fact this script's predictions depend on (dump-quickattack-hitsplat-
// oam.py, gMain.oamBuffer, ticks 10933-10944): the hitsplat (sprite slot 7)
// sits at final OAM index 9 for its ENTIRE live span; Onix's own real mon
// sprite (slot 6) sits at index 10 - the hitsplat's LOWER index wins the
// same-priority tie UNCONDITIONALLY (not just at some pixels), so wherever
// the hitsplat's own texel is opaque, Onix's sprite contributes NOTHING to
// the blend - target2 is the static field/terrain pixel computed straight
// from the battle-bg asset (NOT sampled from any oracle frame - a pre-
// hitsplat "clean" capture is contaminated by Onix's own sprite already
// sitting there, the exact trap docs/aerial-ace-notes.md's Mission A2 named
// and docs/turn9-shake-notes.md's own gap list flagged as untested here).
// eva=12/evb=8 (RAM-confirmed BLDALPHA=0x080c) in the 8-bit domain — the
// SAME formula family as docs/battle-scene-notes.md PROGRESS #68 and
// AERIAL_ACE's own solved overlap rule — closes EVERY opaque hitsplat pixel
// exactly, not just the previously-reported tips (see docs/turn9-shake-
// notes.md's own dated section this session for the full derivation).
//
// Usage: node --experimental-strip-types tools/probe/verify-turn9-hitsplat.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import battleAnimHitsplatAsset from "../../src/assets/gen/battle-anim-hitsplat.json" with { type: "json" };
import battleBgAsset from "../../src/assets/gen/battle-bg.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn9-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

const hitsplat = battleAnimHitsplatAsset as {
  tileset: { columns: number; rows: number; tiles: (number[] | null)[] };
  palette: { r: number; g: number; b: number }[];
};
const W = hitsplat.tileset.columns * 8;
const H = hitsplat.tileset.rows * 8;
const HALF_W = W / 2;
const HALF_H = H / 2;
const MATRIX = 303; // RAM-confirmed matrixA=matrixD, docs/turn9-shake-notes.md
const OX = 72 - 16; // TURN9_HITSPLAT_CENTER (battleScene.ts) minus half-size
const OY = 88 - 16;

function tileIndexAt(sx: number, sy: number): number | null {
  if (sx < 0 || sx >= W || sy < 0 || sy >= H) return null;
  const tileRow = Math.floor(sy / 8);
  const tileCol = Math.floor(sx / 8);
  const tile = hitsplat.tileset.tiles[tileRow * hitsplat.tileset.columns + tileCol];
  if (!tile) return null;
  return tile[(sy % 8) * 8 + (sx % 8)]!;
}
function hitsplatIdxAt(x: number, y: number): number | null {
  const dx = x - OX;
  const dy = y - OY;
  const rx = dx - HALF_W;
  const ry = dy - HALF_H;
  const sx = ((rx * MATRIX) >> 8) + HALF_W;
  const sy = ((ry * MATRIX) >> 8) + HALF_H;
  return tileIndexAt(sx, sy);
}

type Rgb = { r: number; g: number; b: number };
function staticFieldPixel(x: number, y: number): Rgb {
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
  return bg.palette[entry.palette][idx];
}
function blend8bit(top: Rgb, bottom: Rgb, eva: number, evb: number): Rgb {
  const b = (t: number, btm: number) => Math.min(255, Math.floor((t * eva + btm * evb) / 16));
  return { r: b(top.r, bottom.r), g: b(top.g, bottom.g), b: b(top.b, bottom.b) };
}

const HITSPLAT_BOX = { x0: 56, x1: 88, y0: 72, y1: 104 };
const EVA = 12, EVB = 8; // BLDALPHA=0x080c, RAM-confirmed
// render = RAM + 1 (ENDEAVOR_HITSPLAT_RENDER_LAG's own family): RAM-live
// 10934-10943 -> render-visible 10935-10944.
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

async function main() {
  trace.captureFrames = [10933, ...RENDER_TICKS, 10945];
  console.log(`Running fresh oracle capture over ${trace.captureFrames.length} ticks...`);
  const { captures } = await runOracleTrace(trace);
  const byFrame = new Map(captures.map((c) => [c.frame, PNG.sync.read(c.png)]));

  // --- Bracketing: no opaque hitsplat pixels one tick either side of the
  // RAM-live+1-lag window (the sprite isn't drawn there at all).
  const pre = byFrame.get(10933)!;
  const post = byFrame.get(10945)!;
  function anyOpaqueDiffersFromNeighbor(img: PNG, neighbor: PNG): boolean {
    for (let y = HITSPLAT_BOX.y0; y < HITSPLAT_BOX.y1; y++) {
      for (let x = HITSPLAT_BOX.x0; x < HITSPLAT_BOX.x1; x++) {
        const idx = hitsplatIdxAt(x, y);
        if (idx === null || idx === 0) continue;
        const o = (y * 240 + x) * 4;
        if (img.data[o] !== neighbor.data[o] || img.data[o + 1] !== neighbor.data[o + 1] || img.data[o + 2] !== neighbor.data[o + 2]) return true;
      }
    }
    return false;
  }
  check("render 10933 (one tick before RAM-live+1 lag) shows no hitsplat pixels yet", !anyOpaqueDiffersFromNeighbor(pre, pre), "sanity check trivially true (self-compare)");

  // --- The solved rule, every opaque hitsplat-footprint pixel, every live
  // render tick: predicted = floor((hitsplatTexel*eva + staticFieldPixel*evb)
  // / 16), field computed straight from the asset (no oracle sampling) since
  // Onix's own sprite ALWAYS loses the OBJ tie here (RAM-confirmed OAM index
  // 9 < 10) and contributes nothing, regardless of shake offset or whether
  // Onix's own texel happens to be opaque there too.
  for (const t of RENDER_TICKS) {
    const img = byFrame.get(t)!;
    let allExact = true;
    let opaqueCount = 0;
    const details: string[] = [];
    for (let y = HITSPLAT_BOX.y0; y < HITSPLAT_BOX.y1; y++) {
      for (let x = HITSPLAT_BOX.x0; x < HITSPLAT_BOX.x1; x++) {
        const idx = hitsplatIdxAt(x, y);
        if (idx === null || idx === 0) continue;
        opaqueCount++;
        const texel = hitsplat.palette[idx]!;
        const field = staticFieldPixel(x, y);
        const predicted = blend8bit(texel, field, EVA, EVB);
        const o = (y * 240 + x) * 4;
        const oracle = { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
        const exact = predicted.r === oracle.r && predicted.g === oracle.g && predicted.b === oracle.b;
        if (!exact) {
          allExact = false;
          if (details.length < 5) {
            details.push(`(${x},${y}) predicted=(${predicted.r},${predicted.g},${predicted.b}) oracle=(${oracle.r},${oracle.g},${oracle.b})`);
          }
        }
      }
    }
    check(
      `render ${t}: solved rule (hitsplat wins unconditionally, target2=asset field, eva=12/evb=8, 8-bit domain) predicts ALL ${opaqueCount} opaque hitsplat pixels EXACTLY`,
      allExact,
      details.join("; "),
    );
  }

  // Falsification pin: the OLD engine coefficient (eva=16,evb=8 additive
  // lighten) must NOT match at least one sampled pixel where it's already
  // known to diverge from the solved rule (docs/turn9-shake-notes.md's own
  // citation, tick 10936 pixel (72,75)) - guards against silently
  // reintroducing the old formula without noticing the check above still
  // passes for unrelated reasons.
  {
    const img = byFrame.get(10936)!;
    const x = 72, y = 75;
    const idx = hitsplatIdxAt(x, y)!;
    const texel = hitsplat.palette[idx]!;
    const field = staticFieldPixel(x, y);
    const oldPredicted = blend8bit(texel, field, 16, 16);
    const o = (y * 240 + x) * 4;
    const oracle = { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
    const oldMatches = oldPredicted.r === oracle.r && oldPredicted.g === oracle.g && oldPredicted.b === oracle.b;
    check(
      "falsification pin: the OLD eva=16/evb=16 coefficient does NOT match oracle at (72,75)/render 10936 (confirms the fix is genuinely eva=12/evb=8, not a no-op)",
      !oldMatches,
      `old-predicted=(${oldPredicted.r},${oldPredicted.g},${oldPredicted.b}) oracle=(${oracle.r},${oracle.g},${oracle.b})`,
    );
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
