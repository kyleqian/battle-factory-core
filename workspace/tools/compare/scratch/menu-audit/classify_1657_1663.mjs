import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

// Classify the 1657-1662 residual (docs/battle-menu-notes.md §3 item 5's
// still-open tail) against openFinal's own tile content at the player ball's
// settled position, per PROGRESS #104's "Next" hypothesis - the same missing
// 3rd ball frame §7.25 found for the opponent (LoadBallGfx DMAs open.png over
// the "blank" ANIMCMD_FRAME(8,5) slot, shared code path for both battlers).
const DIR = "/tmp/probe-1650-1666-out";
function load(kind, tick) {
  return PNG.sync.read(readFileSync(`${DIR}/${kind}-${String(tick).padStart(5, "0")}.png`));
}

const ballOpen = JSON.parse(readFileSync("src/assets/gen/battle-anim-ball-open.json", "utf8"));
const palette = ballOpen.palette;
const tileset = ballOpen.tileset; // 4 rows x 2 cols: rows 0-1 = open, rows 2-3 = openFinal

const TOP_LEFT = { x: 64, y: 107 }; // BALL_OPEN_TOP_LEFT (battleMenu.ts)
const VISIBLE_BOTTOM = 112; // PLAYER_BALL_OPEN_VISIBLE_BOTTOM

function openFinalPixel(x, y) {
  // rows 2-3 relative to full tileset -> local tile row 0-1
  const lx = x - TOP_LEFT.x;
  const ly = y - TOP_LEFT.y;
  if (lx < 0 || lx >= 16 || ly < 0 || ly >= 16) return null;
  const tx = Math.floor(lx / 8);
  const ty = Math.floor(ly / 8) + 2; // offset into openFinal rows
  const tile = tileset.tiles[ty * tileset.columns + tx];
  if (!tile) return null;
  const idx = tile[(ly % 8) * 8 + (lx % 8)];
  if (idx === 0) return null;
  return palette[idx];
}

for (let tick = 1657; tick <= 1663; tick++) {
  const app = load("app", tick);
  const oracle = load("oracle", tick);
  let total = 0, matchOpenFinal = 0, other = 0;
  const otherSamples = [];
  for (let y = 0; y < VISIBLE_BOTTOM + 4; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      const ar = app.data[i], ag = app.data[i + 1], ab = app.data[i + 2];
      const or_ = oracle.data[i], og = oracle.data[i + 1], ob = oracle.data[i + 2];
      if (ar === or_ && ag === og && ab === ob) continue;
      total++;
      const of = openFinalPixel(x, y);
      const oracleMatchesOpenFinal = of && of.r === or_ && of.g === og && of.b === ob;
      const appIsBlank = ar === app.data[0] && false; // placeholder, unused
      if (oracleMatchesOpenFinal) {
        matchOpenFinal++;
      } else {
        other++;
        if (otherSamples.length < 12) {
          otherSamples.push({ x, y, app: [ar, ag, ab], oracle: [or_, og, ob], openFinalTile: of ? [of.r, of.g, of.b] : null, clipped: y >= VISIBLE_BOTTOM });
        }
      }
    }
  }
  console.log(`tick ${tick}: total=${total} matchOpenFinal=${matchOpenFinal} other=${other}`);
  for (const s of otherSamples) console.log("  ", JSON.stringify(s));
}
