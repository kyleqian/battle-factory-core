// Defect A instrument, step 2: given raw oracle RGB captures already dumped
// by tools/probe/dump-scale-window-oam-scanline.py (peak-scale ticks), diff
// this engine's own render against the oracle pixel-by-pixel and, for each
// mismatch inside the scaled OBJ's doubled window, recompute the SAME
// rx/ry/sx/sy drawSpriteSheetAffineStretch itself would compute, to see
// whether the naive-bbox hypothesis (sx/sy in-bounds when it shouldn't be)
// actually holds at the pixel level.
import { readFileSync } from "node:fs";
import {
  createSceneOnMovePresentation,
} from "../../../src/engine/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";
import { getMonGender } from "../../../src/engine/monGender.ts";

const GENDER_RATIO = { KADABRA: 63, ONIX: 127 };

const move = process.argv[2]; // FUTURE_SIGHT | CONFUSION
const rgbDir = process.argv[3];
const tick = Number(process.argv[4]);
const ox = Number(process.argv[5]); // scaled sprite's non-doubled corner x
const oy = Number(process.argv[6]);
const mx = Number(process.argv[7]); // real RAM matrix a (=xScale)
const my = Number(process.argv[8]); // real RAM matrix d (=yScale)
const w = Number(process.argv[9] ?? 64);
const h = Number(process.argv[10] ?? 64);

const fixturePath = move === "FUTURE_SIGHT"
  ? "tools/compare/fixtures/future-sight-player-kadabra-opponent-onix.json"
  : "tools/compare/fixtures/confusion-player-kadabra-opponent-onix.json";
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

// Need an oracle frame record (hp/personality) - reuse tick 130/160's own
// nearby dense-comparator scratch is unavailable here, so pull minimal
// gender/hp facts straight from bootstrap defaults used by the fixture's own
// portable comparator (Lvl 50 full HP for both, matching the fixture's own
// battle-lab overrides - species-only fields the view needs).
const playerGender = getMonGender(GENDER_RATIO.KADABRA, 0);
const opponentGender = getMonGender(GENDER_RATIO.ONIX, 0);
const stage = createSceneOnMovePresentation({
  move,
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: {
    playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100,
    playerGender: playerGender === "genderless" ? undefined : playerGender,
    opponentGender: opponentGender === "genderless" ? undefined : opponentGender,
  },
});
const age = fixture.appStage.presentationAge + tick - fixture.denseWindow.startFrame;
const engine = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
const app = render(engine);
const oracleRgb = readFileSync(`${rgbDir}/${String(tick).padStart(5, "0")}.rgb`);

const halfW = w / 2;
const halfH = h / 2;
let mismatches = 0;
let printed = 0;
let minX = 240, minY = 160, maxX = -1, maxY = -1;
for (let y = 0; y < 160; y += 1) {
  for (let x = 0; x < 240; x += 1) {
    const pixel = y * 240 + x;
    const ai = pixel * 4;
    const oi = pixel * 3;
    if (app[ai] === oracleRgb[oi] && app[ai + 1] === oracleRgb[oi + 1] && app[ai + 2] === oracleRgb[oi + 2]) continue;
    mismatches += 1;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    const dx = x - ox;
    const dy = y - oy;
    const inDoubledWindow = dx >= -halfW && dx < w + halfW && dy >= -halfH && dy < h + halfH;
    if (printed < 40 && inDoubledWindow) {
      const rx = dx - halfW;
      const ry = dy - halfH;
      const sx = ((rx * mx) >> 8) + halfW;
      const sy = ((ry * my) >> 8) + halfH;
      const inBounds = sx >= 0 && sx < w && sy >= 0 && sy < h;
      console.log(
        `(${x},${y}) app=${app[ai]},${app[ai + 1]},${app[ai + 2]} oracle=${oracleRgb[oi]},${oracleRgb[oi + 1]},${oracleRgb[oi + 2]}`
        + ` dx=${dx} dy=${dy} rx=${rx} ry=${ry} sx=${sx} sy=${sy} inBounds=${inBounds}`,
      );
      printed += 1;
    }
  }
}
console.log(`tick ${tick}: ${mismatches}px mismatched, bbox ${minX},${minY}-${maxX},${maxY}`);
