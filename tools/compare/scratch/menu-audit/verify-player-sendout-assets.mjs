// Scratch verification for PROGRESS #94 (worktree lane): cross-checks the
// already-extracted (opponent-window-verified) send-out assets -
// src/assets/gen/battle-anim-particles.json, battle-anim-ball-open.json,
// src/data/gen/battle-anim-tables.json - against the PLAYER send-out window
// (docs/battle-menu-notes.md, ~ticks 1646-1690) to confirm they apply
// unchanged, per the audit documented in docs/battle-anim-assets.md's new
// "PLAYER-side audit" section.
//
// Prerequisite (not committed - regenerate on demand):
//   mkdir -p /tmp/menu-dense-out
//   bin/oracle run tools/compare/traces-groundtruth/battle1-menu-dense.json -o /tmp/menu-dense-out/
// Run with: node tools/compare/scratch/menu-audit/verify-player-sendout-assets.mjs

import { PNG } from "pngjs";
import { readFileSync } from "node:fs";

const FRAME_DIR = "/tmp/menu-dense-out";
function loadPng(tick) {
  return PNG.sync.read(readFileSync(`${FRAME_DIR}/frame-${String(tick).padStart(5, "0")}.png`));
}

function buildBitmap(tiles, cols, rows, palette) {
  const w = cols * 8, h = rows * 8;
  const px = new Array(w * h).fill(null); // null = palette index 0 = transparent
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const tile = tiles[ty * cols + tx];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const idx = tile[y * 8 + x];
          if (idx !== 0) px[(ty * 8 + y) * w + (tx * 8 + x)] = palette[idx];
        }
      }
    }
  }
  return { w, h, px };
}

function bruteForceSearch(png, bmp, xRange, yRange) {
  let best = { err: Infinity, x: -1, y: -1, matched: 0, total: 0 };
  for (let oy = yRange[0]; oy <= yRange[1] - bmp.h; oy++) {
    for (let ox = xRange[0]; ox <= xRange[1] - bmp.w; ox++) {
      let err = 0, matched = 0, total = 0;
      for (let y = 0; y < bmp.h; y++) {
        for (let x = 0; x < bmp.w; x++) {
          const c = bmp.px[y * bmp.w + x];
          if (c === null) continue;
          total++;
          const i = ((oy + y) * png.width + (ox + x)) * 4;
          const d2 = (png.data[i] - c.r) ** 2 + (png.data[i + 1] - c.g) ** 2 + (png.data[i + 2] - c.b) ** 2;
          if (d2 === 0) matched++;
          err += d2;
        }
      }
      if (err < best.err) best = { err, x: ox, y: oy, matched, total };
    }
  }
  return best;
}

// --- 1. Closed ball frame (summary-ball.json frame 0) tracks the throw arc ---
const summaryBall = JSON.parse(readFileSync("src/assets/gen/summary-ball.json", "utf8"));
const closedBmp = buildBitmap(summaryBall.tileset.tiles.slice(0, 4), summaryBall.tileset.columns, 2, summaryBall.palette);
console.log("--- (1) closed ball frame, ticks 1607-1614, full screen ---");
for (let tick = 1607; tick <= 1614; tick++) {
  const b = bruteForceSearch(loadPng(tick), closedBmp, [0, 240], [0, 160]);
  console.log(`tick ${tick}: ${b.matched}/${b.total} @ (${b.x},${b.y})`);
}

// --- 2. Materialize fade color (battle-anim-tables.json ballOpenFadeColor) ---
const tables = JSON.parse(readFileSync("src/data/gen/battle-anim-tables.json", "utf8"));
const { r, g, b } = tables.ballOpenFadeColor.rgb8;
console.log(`\n--- (2) exact fade-color (${r},${g},${b}) px count + bbox, ticks 1648-1678 ---`);
for (let tick = 1648; tick <= 1678; tick++) {
  const png = loadPng(tick);
  let n = 0, minX = 999, maxX = -1;
  for (let y = 40; y < 120; y++) {
    for (let x = 30; x < 110; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i] === r && png.data[i + 1] === g && png.data[i + 2] === b) {
        n++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  console.log(`tick ${tick}: px=${n}${n > 0 ? ` width=${maxX - minX + 1}` : ""}`);
}

// --- 3. Particle tiles (battle-anim-particles.json) ---
const particles = JSON.parse(readFileSync("src/assets/gen/battle-anim-particles.json", "utf8"));
function tileBitmap(tileIdx) {
  const tile = particles.tileset.tiles[tileIdx];
  const px = new Array(64).fill(null);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const idx = tile[y * 8 + x];
    if (idx !== 0) px[y * 8 + x] = particles.palette[idx];
  }
  return { w: 8, h: 8, px };
}
const pTiles = [0, 1, 2].map(tileBitmap);
console.log("\n--- (3) particle tiles 0/1/2 exact-match search, ticks 1658-1665, x[20,140] y[30,140] ---");
for (let tick = 1658; tick <= 1665; tick++) {
  const png = loadPng(tick);
  const results = pTiles.map((t) => bruteForceSearch(png, t, [20, 140], [30, 140]));
  console.log(`tick ${tick}: ` + results.map((r, i) => `tile${i} ${r.matched}/${r.total}`).join("  "));
}

// --- 4. Ball-open frame (battle-anim-ball-open.json) - occlusion check ---
const ballOpen = JSON.parse(readFileSync("src/assets/gen/battle-anim-ball-open.json", "utf8"));
const openBmp = buildBitmap(ballOpen.tileset.tiles.slice(0, 4), ballOpen.tileset.columns, 2, ballOpen.palette);
console.log("\n--- (4) ball-open frame best match, ticks 1648-1656, x[30,110] y[60,120] (expect partial - see doc) ---");
for (let tick = 1648; tick <= 1656; tick++) {
  const b = bruteForceSearch(loadPng(tick), openBmp, [30, 110], [60, 120]);
  console.log(`tick ${tick}: ${b.matched}/${b.total} @ (${b.x},${b.y})`);
}
