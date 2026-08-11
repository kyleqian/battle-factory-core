// Scratch diagnostic (S7 slice R rung c4 prep): pins the exact per-tick
// visible-char count for turn 9's "It's not very effective.." message,
// reusing the SAME proven rendering primitives as every prior turn's
// kickoff/effectiveness text (drawTileBg(battleWindow) for the static box,
// drawText(font, charmap) for the glyph run, drawMessageTextLines's own
// line1/line2-split convention) - not a fresh visual guess.
//
// Usage: node --experimental-strip-types tools/compare/scratch/diag-turn9-msgtext.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";
import { drawText, type FontData } from "../../../src/engine/font.ts";
import battleWindowAsset from "../../../src/assets/gen/battle-window.json" with { type: "json" };
import fontNormalData from "../../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../../src/data/gen/charmap.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn9-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const battleWindow = battleWindowAsset as { tileset: any; tilemap: any; palette: any[][] };
const MESSAGE_PALETTE = battleWindow.palette[0]!;
const MESSAGE_TEXT_COLORS = { fg: 1, bg: 15, shadow: 6 };
const LINE1_ORIGIN = { x: 16, y: 121 };
const LINE2_ORIGIN = { x: 16, y: 137 };
// CORRECTED (this session, direct pixel evidence): unlike TURN6_ATKFELL's
// genuine 2-line message, "It's not very effective…" fits entirely on ONE
// line (line2 stays blank throughout) - same shape as TURN6_SUPER_EFFECTIVE_
// LINE's own single-line rendering. The predecessor doc's "It's not\nvery
// effective.." transcription was a misread (no line2 ink observed at ANY
// tick 11005-11035, `rightmostInk` scan below).
const LINE1 = "It’s not very effective…";
const LINE2 = "";
const TOTAL = LINE1.length + LINE2.length;

function setPixel(fb: Buffer, x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || y < 0 || x >= 240 || y >= 160) return;
  const i = (y * 240 + x) * 4;
  fb[i] = r;
  fb[i + 1] = g;
  fb[i + 2] = b;
  fb[i + 3] = 255;
}

function drawTileBg(fb: Buffer): void {
  const { tileset, tilemap, palette } = battleWindow;
  for (let screenY = 0; screenY < 160; screenY++) {
    const tileRow = Math.floor(screenY / 8);
    const inTileY = screenY % 8;
    for (let screenX = 0; screenX < 240; screenX++) {
      const tileCol = Math.floor(screenX / 8);
      const inTileX = screenX % 8;
      const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
      if (!entry) continue;
      const tile = tileset.tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - inTileX : inTileX;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const idx = tile[sy * 8 + sx]!;
      if (idx === 0) continue;
      const c = palette[entry.palette]?.[idx];
      if (!c) continue;
      setPixel(fb, screenX, screenY, c.r, c.g, c.b);
    }
  }
}

function drawMessageTextLines(fb: Buffer, chars: number): void {
  if (chars <= 0) return;
  const l1 = LINE1.slice(0, Math.min(chars, LINE1.length));
  drawText(fb as unknown as Uint8Array, font, charmap, l1, LINE1_ORIGIN.x, LINE1_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  if (chars > LINE1.length) {
    const l2 = LINE2.slice(0, chars - LINE1.length);
    drawText(fb as unknown as Uint8Array, font, charmap, l2, LINE2_ORIGIN.x, LINE2_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  }
}

function buildCandidate(chars: number): Buffer {
  const fb = Buffer.alloc(240 * 160 * 4);
  drawTileBg(fb);
  drawMessageTextLines(fb, chars);
  return fb;
}

// Box-region-only diff (y=112..160, matching the dossier's own "box-region"
// convention for message-box comparisons) so healthbar/sprite churn above
// never confounds this.
function diffInBoxRegion(a: Buffer, b: Buffer): number {
  let diffs = 0;
  for (let y = 112; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diffs++;
    }
  }
  return diffs;
}

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

async function main() {
  const ticks = range(11003, 11032);
  trace.captureFrames = ticks;
  console.log(`Running fresh oracle capture over ${ticks.length} ticks (11003-11032)...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} not captured`);
    return PNG.sync.read(c.png).data as unknown as Buffer;
  };

  const candidates = range(0, TOTAL);
  const built = candidates.map((n) => buildCandidate(n));

  console.log(`LINE1=${JSON.stringify(LINE1)} (${LINE1.length}), LINE2=${JSON.stringify(LINE2)} (${LINE2.length}), TOTAL=${TOTAL}`);
  console.log("\ntick | best n (0-mismatch exact) | all-candidate mismatch map (only <5 shown)");
  for (const t of ticks) {
    const actual = get(t);
    let bestN = -1;
    let bestMismatch = Infinity;
    const closeMap: Record<number, number> = {};
    for (const n of candidates) {
      const m = diffInBoxRegion(actual, built[n]!);
      if (m < 5) closeMap[n] = m;
      if (m < bestMismatch) {
        bestMismatch = m;
        bestN = n;
      }
    }
    console.log(`${t} | n=${bestN} (mismatch=${bestMismatch}) | ${JSON.stringify(closeMap)}`);
  }
}

main();

// (debug appended separately below via a different invocation path if needed)
