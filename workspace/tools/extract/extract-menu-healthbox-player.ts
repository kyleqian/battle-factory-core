// Dev-time extractor: the PLAYER healthbox's settled interior content (ONIX,
// Lv50, full green HP bar) for the send-out/first-action-menu window
// (docs/battle-menu-notes.md S3 item 6/S7.6.1), harvested the SAME way
// `extract-sendout-healthbox-content.ts` harvested the OPPONENT's own
// content: `composeOpponentHealthbox`'s assembly pipeline (ISSUES #16)
// deliberately stays unwired while a window's pixel work is active, so this
// trace's ONE content (ONIX, no gender symbol, Lv50, full HP, no status)
// is pixel-harvested directly from the oracle's own already-assembled
// framebuffer instead of re-deriving the tile-remap pipeline.
//
// Bounding box (127,74)-(229,109) (x0,y0)-(x1,y1) was found this session by
// diffing two oracle captures of `battle1-menu-dense.json`
// (tools/compare/traces-groundtruth/, the committed S6 ground truth) 76
// ticks apart (1652, well before the box exists, vs 1730, deep in the
// confirmed 1702-1741 static hold - see docs/battle-menu-notes.md's S1
// settle-tick correction) restricted to x>=105 to exclude ONIX's own
// materialize region (x<=104) - one clean rectangular blob, RAM-cross-
// confirmed exact (see BBOX doc comment in battleMenu.ts's
// `PLAYER_HEALTHBOX_SLIDE_START_TICK` for the gSprites[0] probe that pins
// the same corner independently via x2=0 at settle).
//
// A DISTINCT, unrelated blob (a small triangular wedge, x in [100,109],
// y in [96,111]) sits immediately left of this bbox and is NOT part of the
// healthbox - pixel-confirmed (docs/battle-menu-notes.md S7 new item): it is
// ONIX's own ground-shadow, tied to ONIX's still-unmodeled color-fade-to-
// true-color tail (S3 item 5's own named, unresolved blocker), not the
// healthbox slide-in this extractor covers. Deliberately excluded from BBOX.
//
// Regenerate (requires the oracle service up, `bin/oracle info`):
//   node --experimental-strip-types tools/extract/extract-menu-healthbox-player.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { createScratchDir } from "../lib/scratch.ts";

const OUT_PATH = "src/assets/gen/menu-healthbox-player.json";
const DENSE_TRACE = "tools/compare/traces-groundtruth/battle1-menu-dense.json";

// Pixel-derived (see header comment). Settled corner (dx=0): (127,74).
const BBOX = { x0: 127, y0: 74, x1: 229, y1: 109 };
// Deep in the confirmed 1702-1741 static hold (docs/battle-menu-notes.md S1
// correction) - any tick in that range gives byte-identical content.
const SETTLED_TICK = 1730;

const tmpDir = createScratchDir("menu-healthbox-");
try {
  execFileSync("./bin/oracle", ["run", DENSE_TRACE, "-o", tmpDir], { stdio: ["ignore", "ignore", "inherit"] });
  const png = PNG.sync.read(readFileSync(join(tmpDir, `frame-${String(SETTLED_TICK).padStart(5, "0")}.png`)));

  const w = BBOX.x1 - BBOX.x0 + 1;
  const h = BBOX.y1 - BBOX.y0 + 1;
  const pixels: number[] = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const ox = BBOX.x0 + x;
      const oy = BBOX.y0 + y;
      const oi = (oy * 240 + ox) * 4;
      pixels.push(png.data[oi]!, png.data[oi + 1]!, png.data[oi + 2]!);
    }
  }

  writeFileSync(
    OUT_PATH,
    `${JSON.stringify({
      x: BBOX.x0,
      y: BBOX.y0,
      width: w,
      height: h,
      // Flat RGB triples, row-major, opaque (see header comment) - bleed
      // pixels (non-rectangular real content vs. this rectangular harvest)
      // are masked out at draw time, same as the opponent's own harvest
      // (getHealthboxContentMask's precedent, battleScene.ts).
      pixels,
    })}\n`,
  );
  console.log(`wrote ${OUT_PATH} (${w}x${h})`);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
