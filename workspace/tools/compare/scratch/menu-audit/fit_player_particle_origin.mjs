// Brute-force fit for the PLAYER-side particle burst's origin
// (battleScene.ts's PLAYER_PARTICLE_ORIGIN, docs/battle-menu-notes.md §3 item 5).
//
// At trace tick 1653 (logical tick 0) exactly ONE particle is visible
// (spawn index 0, age 0, radius 0 - no dx/dy offset), isolated with nothing
// else overlapping - so its tile's top-left corner can be found by brute
// force against a clean oracle capture, the same technique
// onix_materialize_bruteforce.mjs used for the materialize accumulator/corner.
//
// Prereq: `npm run compare -- tools/compare/scratch/menu-audit/particle-range.json /tmp/particle-range-out`
// (or any scratch trace covering ticks ~1649-1663 built from
// battle1-menu-dense.json's own segments) to populate oracle-01653.png.
//
// Result: (68,106) scores 13/14 opaque pixels exact (next-best candidate
// scores 3/14) - the one non-matching pixel (tile row 6, col 5, screen
// (73,112)) is the same y>=PLAYER_BALL_OPEN_VISIBLE_BOTTOM terrain
// occlusion already established for the ball's own open pose, not a
// derivation error.

import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const DIR = "/tmp/particle-range-out";
const oracle = PNG.sync.read(readFileSync(`${DIR}/oracle-01653.png`));

const particles = JSON.parse(readFileSync("src/assets/gen/battle-anim-particles.json", "utf8"));
const { tileset, palette, regularBallAnim } = particles;
const frame0 = regularBallAnim[0]; // logical tick 0's only active particle

function tilePixel(tileIndex, px, py, hFlip) {
  const sx = hFlip ? 7 - px : px;
  const idx = tileset.tiles[tileIndex][py * 8 + sx];
  if (idx === 0) return null;
  const c = palette[idx];
  return [c.r, c.g, c.b];
}

function sample(png, x, y) {
  const i = (y * 240 + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
}

let best = null;
for (let oy = 95; oy <= 120; oy++) {
  for (let ox = 55; ox <= 90; ox++) {
    let matches = 0;
    let total = 0;
    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < 8; px++) {
        const c = tilePixel(frame0.tile, px, py, frame0.hFlip);
        if (!c) continue;
        total++;
        const [r, g, b] = sample(oracle, ox + px, oy + py);
        if (r === c[0] && g === c[1] && b === c[2]) matches++;
      }
    }
    if (total > 0 && (best === null || matches > best.matches)) best = { ox, oy, matches, total };
  }
}
console.log("best fit @1653 (top-left):", best);
