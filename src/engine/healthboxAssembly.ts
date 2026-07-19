// Real content-assembly path for the opponent healthbox (ISSUES #16) - see
// docs/healthbox-assembly-notes.md for the full root-cause dossier and
// RAM/VRAM evidence. This is NOT wired into battleScene.ts this round (the
// brief keeps the pixel-harvested `sendout-healthbox-opponent.json` as the
// shipping render path) - it's the proven-so-far replacement candidate,
// exercised only by tests/healthboxAssembly.test.ts.
//
// Landed, byte-exact (RAM/VRAM-confirmed, see the doc): the base frame (a
// flat blit of the existing `singlesOpponent` sheet - the frame sheet's own
// raster tile order IS the on-screen order, no remap). The HP bar's full-HP
// tile *selection* is also RAM/VRAM-confirmed exact (`HP_BAR_FULL_TILES`,
// see the doc), but NOT its on-screen *placement*: unlike healthboxLeft/
// Right, the healthbar sprite has its own SubspriteTable
// (`sHealthBar_Subsprites_Opponent`, battle_interface.c:491, 3 subsprites
// incl. a lone extra 8x8 one) that this session discovered too late to
// model and verify - a naive flat blit at the bar's own OAM corner
// mismatched the harvested block (see the doc). Left out of the composite
// entirely rather than ship pixels at a placement that's known to be
// wrong. NOT landed at all: name/gender text, level text, partial-fill HP
// bars, status icon overlay - see the doc's "still open" section.
// `composeOpponentHealthbox` throws on any parameter combination that
// would require the unimplemented pieces, rather than silently producing
// wrong pixels for them.

import type { RgbColor } from "./bg.ts";

interface Tileset {
  columns: number;
  rows: number;
  tiles: number[][];
}

interface SheetAsset {
  tileset: Tileset;
  palette: RgbColor[];
}

export interface HealthboxContentParams {
  /** Species/nickname text - only used to gate on the one implemented case (no text drawn yet). */
  name: string;
  level: number;
  gender: "male" | "female" | "none";
  /** 0-1. Only 1 (full HP) is implemented. */
  hpFraction: number;
  /** Only "none" is implemented (no status icon drawn). */
  status: "none" | "sleep" | "poison" | "burn" | "freeze" | "paralysis";
}

/** RAM/VRAM-derived screen-space layout, relative to the healthbox's own corner (12,14) for this trace's opponent slot - see the doc's table. */
const FRAME_ORIGIN = { x: 12, y: 14 };
const FRAME_SIZE = { width: 128, height: 32 };

/**
 * hpbar.png tile indices for a fully-filled green bar: cap (1,2) + 6x
 * fully-filled segment (11) - VRAM-confirmed, MoveBattleBarGraphically's
 * full-HP case (battle_interface.c:2275-2306). Not yet drawn by
 * `composeOpponentHealthbox` (placement isn't verified - see the header
 * comment); exported so the next session doesn't have to re-derive it once
 * the healthbar's own SubspriteTable placement is modeled.
 */
export const HP_BAR_FULL_TILES = [1, 2, 11, 11, 11, 11, 11, 11];

function drawTileset(canvas: (RgbColor | null)[], canvasWidth: number, canvasHeight: number, sheet: SheetAsset, ox: number, oy: number): void {
  const { tileset, palette } = sheet;
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      const tile = tileset.tiles[ty * tileset.columns + tx]!;
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const idx = tile[y * 8 + x]!;
          if (idx === 0) continue; // index0 = transparent, GBA 4bpp convention
          const px = ox + tx * 8 + x;
          const py = oy + ty * 8 + y;
          if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) continue;
          canvas[py * canvasWidth + px] = palette[idx] ?? null;
        }
      }
    }
  }
}

/**
 * Composites the opponent healthbox's own local canvas (origin = the
 * healthbox's own screen corner, `FRAME_SIZE` wide/tall - crop+translate to
 * an absolute screen position at the call site). Returns `null` for pixels
 * this pipeline doesn't (yet) know the color of (unimplemented content
 * regions) rather than guessing - callers must not blit those cells.
 */
export function composeOpponentHealthbox(frame: SheetAsset, params: HealthboxContentParams): { width: number; height: number; pixels: (RgbColor | null)[] } {
  if (params.hpFraction !== 1) {
    throw new Error(`composeOpponentHealthbox: only hpFraction=1 (full HP) is implemented, got ${params.hpFraction}`);
  }
  if (params.status !== "none") {
    throw new Error(`composeOpponentHealthbox: only status="none" is implemented, got ${params.status}`);
  }

  const canvas: (RgbColor | null)[] = new Array(FRAME_SIZE.width * FRAME_SIZE.height).fill(null);
  drawTileset(canvas, FRAME_SIZE.width, FRAME_SIZE.height, frame, 0, 0);
  // params.name/level/gender are accepted (S7 parameterization contract)
  // but not yet rendered, and the HP bar isn't composited at all yet -
  // see docs/healthbox-assembly-notes.md.

  return { width: FRAME_SIZE.width, height: FRAME_SIZE.height, pixels: canvas };
}

export const HEALTHBOX_FRAME_ORIGIN = FRAME_ORIGIN;
