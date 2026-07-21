// Scratch diagnostic (S7 slice R rung c4 prep, bounded-worker probe session):
// pins Onix's own HP-bar drain (RAM 10992 sentinel -> 10993-10999 counter ->
// 11000 done sentinel, per predecessor's tools/probe/dump-battle-bars.py
// re-run) against fresh oracle pixels, tick by tick, using the ALREADY-
// PROVEN encoding (composePlayerHealthboxHpOverlay/calcBarFilledPixels, the
// same functions endeavorOnixHp's own turn-2 fit used, 0/288 mismatches) as
// the candidate generator - not a fresh visual guess.
//
// Usage: node --experimental-strip-types tools/compare/scratch/diag-turn9-hpdrain.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";
import { composePlayerHealthboxHpOverlay, calcBarFilledPixels, pickHpBarBand } from "../../../src/engine/healthboxAssembly.ts";
import battleHealthboxAsset from "../../../src/assets/gen/battle-healthbox.json" with { type: "json" };
import menuHealthboxPlayerAsset from "../../../src/assets/gen/menu-healthbox-player.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn9-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

const HB = menuHealthboxPlayerAsset as { x: number; y: number; width: number; height: number };
const ONIX_MAX_HP = 117;

const assets = {
  hpbar: (battleHealthboxAsset as any).hpbar,
  hpbarAnim: (battleHealthboxAsset as any).hpbarAnim,
  textPalette: (battleHealthboxAsset as any).singlesPlayer.palette,
};

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

const BASE_TICK = 10985; // pre-drain settled tick, hp still 31, per predecessor's ep2 settle (10979) well before this
const captureFrames = range(BASE_TICK, 11006);
trace.captureFrames = captureFrames;

function pngToRgba(png: Buffer): Buffer {
  return PNG.sync.read(png).data;
}

// Compare only the healthbox region (127,74,103,36) between two full-frame RGBA buffers.
function diffInBox(a: Buffer, b: Buffer): number {
  let diffs = 0;
  for (let y = HB.y; y < HB.y + HB.height; y++) {
    for (let x = HB.x; x < HB.x + HB.width; x++) {
      const i = (y * 240 + x) * 4;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diffs++;
    }
  }
  return diffs;
}

// Build a synthetic "expected" full-frame RGBA buffer: baseRgba with the healthbox
// overlay for `hp` blitted on top (composePlayerHealthboxHpOverlay's own local
// canvas, offset by HB.x/HB.y, skipping null cells exactly like drawPlayerHealthboxHpOverlay).
function buildExpected(baseRgba: Buffer, hp: number): Buffer {
  const out = Buffer.from(baseRgba);
  const { width, height, pixels } = composePlayerHealthboxHpOverlay(assets, hp, ONIX_MAX_HP);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const color = pixels[py * width + px];
      if (!color) continue;
      const x = HB.x + px;
      const y = HB.y + py;
      const i = (y * 240 + x) * 4;
      out[i] = color.r;
      out[i + 1] = color.g;
      out[i + 2] = color.b;
      out[i + 3] = 255;
    }
  }
  return out;
}

async function main() {
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks (${BASE_TICK}-11006)...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} not captured`);
    return c;
  };

  const baseRgba = pngToRgba(get(BASE_TICK).png);
  console.log(`base tick ${BASE_TICK}: hp=31 assumed (pre-sentinel, post-episode-2-settle)`);

  // Precompute the pixel signature for each candidate hp (31 down to 24).
  const candidates = range(24, 31);
  const expectedByHp = new Map<number, Buffer>();
  for (const hp of candidates) {
    expectedByHp.set(hp, buildExpected(baseRgba, hp));
    const { filledPixels } = calcBarFilledPixels(hp / ONIX_MAX_HP);
    console.log(`  candidate hp=${hp}: filledPixels=${filledPixels}, band=${pickHpBarBand(filledPixels)}`);
  }

  console.log("\ntick | actual-vs-base(healthbox diff px) | best-matching hp (0 mismatches) | notes");
  for (const t of range(10985, 11006)) {
    const actual = pngToRgba(get(t).png);
    const vsBase = diffInBox(actual, baseRgba);
    let bestHp: number | null = null;
    let bestMismatch = Infinity;
    const mismatches: Record<number, number> = {};
    for (const hp of candidates) {
      const m = diffInBox(actual, expectedByHp.get(hp)!);
      mismatches[hp] = m;
      if (m < bestMismatch) {
        bestMismatch = m;
        bestHp = hp;
      }
    }
    console.log(`${t} | ${vsBase} | hp=${bestHp} (mismatch=${bestMismatch}) | full=${JSON.stringify(mismatches)}`);
  }
}

main();
