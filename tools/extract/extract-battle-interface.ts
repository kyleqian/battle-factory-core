// Dev-time extractor for the two battle-interface assets the scene-assembly
// window (S6) flagged missing (docs/battle-interface-assets.md):
//
// (1) the party-status-summary BALL ICONS drawn by
//     `CreatePartyStatusSummarySprites` (src/battle_interface.c:1450-1657).
//     Tile source: `gHealthboxElementsGfxTable[HEALTHBOX_GFX_STATUS_BALL]`
//     (src/graphics.c:358-370), which is byte-identical to
//     `ball_display.4bpp`/`.png` (4 states: Full/Empty/Fainted/Statused, per
//     the `HEALTHBOX_GFX_STATUS_BALL*` enum, src/battle_interface.c:107-111).
//     Palette: `sOamData_StatusSummaryBalls`'s sprite template uses
//     `TAG_STATUS_SUMMARY_BALLS_PAL` -> `sStatusSummaryBallsSpritePal` ->
//     `gBattleInterface_BallDisplayPal` (src/battle_interface.c:652,
//     src/graphics.c:356) - `ball_display.png`'s OWN embedded palette really
//     is used at runtime here (unlike the healthbox hpbar/expbar sheets in
//     extract-battle-healthbox.ts, which borrow this same palette but not
//     these tiles) - confirmed byte-exact against a live oracle frame, see
//     the doc.
//
// (2) the "wait for input" cursor drawn by `TextPrinterDrawDownArrow`
//     (src/text.c:787-836) when `gTextFlags.useAlternateDownArrow` is TRUE -
//     which battle_message.c:2997-3000 sets for every battle window except
//     ARENA_WIN_JUDGMENT_TEXT, so the battle msgbox always uses the "dark"
//     variant: `sDarkDownArrowTiles` = `graphics/fonts/down_arrow_alt.png`
//     (src/text.c:72), NOT anything under graphics/battle_interface/ (the
//     step brief's guessed path was wrong; this is the actual loader).
//     This is a plain 8x48 pixel bitmap (6 stacked 8x8 tiles), sampled by
//     `BlitBitmapRectToWindow(..., 0, sDownArrowYCoords[idx], 8, 16, ...)`
//     (src/text.c:819-829) as a raw row-addressable image (srcWidth=8 makes
//     the GBA-tile-addressing math in BlitBitmapRect4Bit degenerate to
//     plain row-major access - verified by hand against blit.c:9-51) - so,
//     unlike every tile-sheet extractor here, this is decoded as a flat
//     pixel-index bitmap, not sliced into discrete tiles. `sDownArrowYCoords
//     = {0,1,2,1}` (src/text.c:75) is the vertical bob: the blit's *source*
//     Y offset cycles through those 4 values, each held for 9 ticks (8-tick
//     countdown + the draw tick itself - see text.c:794-834), a 36-tick
//     period. The rendered pixel values are raw palette indices (1=outline,
//     2=fill) copied straight into the destination window's own tile data -
//     down_arrow_alt.png's OWN embedded palette is irrelevant at runtime
//     (same convention as extract-battle-healthbox.ts's ball/hp/exp bar
//     sheets); the real colors come from whatever 16-color bank the battle
//     msgbox window uses - empirically confirmed to be `gBattleTextboxPalette`
//     bank 0 (`textbox_0.pal`, BG_PLTT_ID(0), src/battle_bg.c:864), already
//     extracted as `battle-window.json`'s `palette[0]` - index1=(255,255,255)
//     white, index2=(255,0,0) red, an exact match for the oracle capture
//     (see the doc). No new palette is written here for this asset; callers
//     reuse battle-window.json's palette[0].
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-interface.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

// --- (1) ball_display.png: party-status-summary ball icons ------------------
{
  const img = decodeIndexedPng(join(REF, "graphics", "battle_interface", "ball_display.png"));
  const { columns, rows, tiles } = sliceTiles(img);
  writeJson(join(ASSETS_GEN, "battle-interface-ball-display.json"), {
    // 4 states, one 8x8 tile each, in gHealthboxElementsGfxTable's declared
    // order (src/battle_interface.c:107-111): Full, Empty, Fainted, Statused.
    states: ["Full", "Empty", "Fainted", "Statused"],
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    palette: img.palette,
  });
}

// --- (2) down_arrow_alt.png: battle msgbox "wait for input" cursor ----------
{
  const img = decodeIndexedPng(join(REF, "graphics", "fonts", "down_arrow_alt.png"));
  const indices: number[][] = [];
  for (let y = 0; y < img.height; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < img.width; x += 1) {
      row.push(img.indices[y * img.width + x]!);
    }
    indices.push(row);
  }
  writeJson(join(ASSETS_GEN, "battle-interface-down-arrow.json"), {
    width: img.width,
    height: img.height,
    // Raw palette indices (0=transparent, 1=outline, 2=fill) - render with
    // battle-window.json's palette[0] slots 1/2, not this PNG's own PLTE
    // (see header note).
    indices,
    // sDownArrowYCoords (src/text.c:75) - the blit's source Y offset per
    // bob phase, each held 9 ticks (36-tick period). Destination rect is a
    // fixed (x, y) for 8x16 px; source row `sourceRowOffsets[phase]` is
    // where that 16-row window starts within this 48-row image.
    sourceRowOffsets: [0, 1, 2, 1],
    blitWidth: 8,
    blitHeight: 16,
  });
}
