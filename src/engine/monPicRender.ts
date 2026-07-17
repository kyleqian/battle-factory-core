// Renders monPic.ts's ball-open/close reveal: the WIN0 growth box (BG3
// mon-pic-bg blended with BG1/OBJ underneath), the pre/post affine "flash"
// sliver, and the front sprite once fully open.
//
// Blend math verified empirically against the oracle (bin/oracle run, dense
// per-frame captures, pixel-matched to 0 diff across the full open window):
// it runs in 8-bit color space using floor((c1*EVA + c2*EVB) / 16) per
// channel clamped to 255 - NOT 5-bit GBA color space as ISSUES.md #2
// originally guessed from the BLDALPHA register values alone; re-deriving
// in 5-bit space and expanding via (c<<3)|(c>>2) does not match the
// oracle's actual pixels. TGT2 (BLDCNT's BG1+OBJ target) resolves to
// whichever of the 6 rental-ball OBJ sprites is opaque at that pixel, else
// BG1 - balls sit under the window at slots 2/3, so leaving OBJ out of the
// blend source (as an early draft of this fix did) fails on exactly those
// columns.

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import { drawSprite, type SpriteSheet } from "./sprites.ts";
import { drawSpriteFaded, fadeColor } from "./fadeRender.ts";
import type { MonPicVisual } from "./monPic.ts";

import monPicBgData from "../assets/gen/mon-pic-bg.json" with { type: "json" };
import menuBgData from "../assets/gen/menu-bg.json" with { type: "json" };
import pokeballData from "../assets/gen/pokeball.json" with { type: "json" };
import arrowData from "../assets/gen/arrow.json" with { type: "json" };
import frontSpritesData from "../assets/gen/front-sprites.json" with { type: "json" };

interface TileGrid {
  columns: number;
  rows: number;
  tiles: number[][];
}
interface TilemapEntry {
  tile: number;
  hFlip: boolean;
  vFlip: boolean;
  palette: number;
}

const monPicBg = monPicBgData as unknown as {
  tileset: TileGrid;
  palette: RgbColor[];
  tilemap: { width: number; height: number; entries: TilemapEntry[] };
};
const menuBg = menuBgData as unknown as {
  tileset: TileGrid;
  tilemap: { width: number; height: number; entries: TilemapEntry[] };
  subpalettes: RgbColor[][];
};
const pokeball = pokeballData as unknown as { tileset: TileGrid; grayPalette: RgbColor[] };
const arrow = arrowData as unknown as { tileset: TileGrid; palette: RgbColor[] };
const frontSprites = frontSpritesData as unknown as Record<string, { tileset: TileGrid; palette: RgbColor[] }>;

const WINDOW_LEFT = 88;
const WINDOW_RIGHT = 152; // exclusive
const FLASH_COLOR: RgbColor = { r: 214, g: 255, b: 239 };
// Oracle-measured: once blended (see flashBlended below), the flash bar is a
// UNIFORM color across its whole width regardless of what's underneath it
// (balls, gaps, arrow) - not a true per-pixel blend against target2. Exactly
// blend8(FLASH_COLOR, (189,231,247)) - matches every sampled pixel across
// every width/position in both draft-menu.json cycles; not re-derived
// further (see monPic.ts's module comment for the objMode/BLDCNT mechanism).
const FLASH_BLENDED_COLOR: RgbColor = { r: 194, g: 233, b: 226 };
const FLASH_Y = 64;
const FLASH_CENTER_X = 120;
const BLEND_EVA = 11;
const BLEND_EVB = 4;
const BLACK: RgbColor = { r: 0, g: 0, b: 0 };

function sampleTile(grid: TileGrid, tileIndex: number, x: number, y: number, hFlip: boolean, vFlip: boolean): number {
  const tile = grid.tiles[tileIndex];
  if (!tile) return 0;
  const sx = hFlip ? 7 - x : x;
  const sy = vFlip ? 7 - y : y;
  return tile[sy * 8 + sx]!;
}

function bg3Color(x: number, y: number): RgbColor | null {
  const lx = x - WINDOW_LEFT;
  const ly = y - 32;
  const tc = Math.floor(lx / 8);
  const tr = Math.floor(ly / 8);
  if (tc < 0 || tc > 7 || tr < 0 || tr > 7) return null;
  const entry = monPicBg.tilemap.entries[tr * 8 + tc];
  if (!entry) return null;
  const ci = sampleTile(monPicBg.tileset, entry.tile, lx % 8, ly % 8, entry.hFlip, entry.vFlip);
  if (ci === 0) return null;
  return monPicBg.palette[ci] ?? null;
}

function bg1Color(x: number, y: number): RgbColor | null {
  const tc = Math.floor(x / 8);
  const tr = Math.floor(y / 8);
  const entry = menuBg.tilemap.entries[tr * menuBg.tilemap.width + tc];
  if (!entry) return null;
  const ci = sampleTile(menuBg.tileset, entry.tile, x % 8, y % 8, entry.hFlip, entry.vFlip);
  if (ci === 0) return null;
  const subpalette = menuBg.subpalettes[entry.palette] ?? menuBg.subpalettes[0]!;
  return subpalette[ci] ?? null;
}

// The 6 rental balls (CreateSprite(..., 35*i + 32, 64, 1)), 32x32, drawn
// center-anchored - see factoryDraftScreen.ts's identical layout constants.
function ballColor(x: number, y: number): RgbColor | null {
  for (let i = 0; i < 6; i += 1) {
    const ox = 35 * i + 32 - 16;
    const oy = 64 - 16;
    if (x < ox || x >= ox + 32 || y < oy || y >= oy + 32) continue;
    const lx = x - ox;
    const ly = y - oy;
    const tileIndex = Math.floor(ly / 8) * pokeball.tileset.columns + Math.floor(lx / 8);
    const ci = sampleTile(pokeball.tileset, tileIndex, lx % 8, ly % 8, false, false);
    if (ci === 0) continue;
    return pokeball.grayPalette[ci] ?? null;
  }
  return null;
}

// The slot cursor arrow (CreateSprite(..., ball[cursorPos].x, 88, 0)), 16x16,
// drawn on top of the balls - see factoryDraftScreen.ts's identical layout.
function arrowColor(x: number, y: number, cursorCenterX: number): RgbColor | null {
  const ox = cursorCenterX - 8;
  const oy = 88 - 8;
  if (x < ox || x >= ox + 16 || y < oy || y >= oy + 16) return null;
  const lx = x - ox;
  const ly = y - oy;
  const tileIndex = Math.floor(ly / 8) * arrow.tileset.columns + Math.floor(lx / 8);
  const ci = sampleTile(arrow.tileset, tileIndex, lx % 8, ly % 8, false, false);
  if (ci === 0) return null;
  return arrow.palette[ci] ?? null;
}

function target2Color(x: number, y: number, cursorCenterX: number): RgbColor | null {
  return arrowColor(x, y, cursorCenterX) ?? ballColor(x, y) ?? bg1Color(x, y);
}

function blend8(c1: RgbColor, c2: RgbColor | null): RgbColor {
  const b = c2 ?? BLACK;
  return {
    r: Math.min(255, Math.floor((c1.r * BLEND_EVA + b.r * BLEND_EVB) / 16)),
    g: Math.min(255, Math.floor((c1.g * BLEND_EVA + b.g * BLEND_EVB) / 16)),
    b: Math.min(255, Math.floor((c1.b * BLEND_EVA + b.b * BLEND_EVB) / 16)),
  };
}

export function drawMonPic(fb: Uint8Array, visual: MonPicVisual, species: string, cursorCenterX: number): void {
  if (visual.flashWidth > 0) {
    const left = FLASH_CENTER_X - Math.floor(visual.flashWidth / 2);
    // sOam_Select_MonPicBgAnim is objMode=ST_OAM_OBJ_BLEND: once BLDCNT is
    // configured (which happens once, forever, in Task_OpenMonPic's case1 -
    // so every flash after the screen's first-ever open), this sprite
    // alpha-blends against whatever's underneath instead of drawing flat.
    const color = visual.flashBlended ? FLASH_BLENDED_COLOR : FLASH_COLOR;
    for (let i = 0; i < visual.flashWidth; i += 1) {
      setPixel(fb, left + i, FLASH_Y, color.r, color.g, color.b);
    }
  }

  if (visual.window) {
    const { top, bottom } = visual.window;
    for (let y = top; y < bottom; y += 1) {
      for (let x = WINDOW_LEFT; x < WINDOW_RIGHT; x += 1) {
        const bg3 = bg3Color(x, y);
        const t2 = target2Color(x, y, cursorCenterX);
        const color = bg3 ? blend8(bg3, t2) : (t2 ?? BLACK);
        setPixel(fb, x, y, color.r, color.g, color.b);
      }
    }
  }

  if (visual.spriteVisible) {
    const sprite = frontSprites[species];
    if (sprite) {
      drawSprite(fb, { tileset: sprite.tileset } as SpriteSheet, sprite.palette, 120, 64, 8, 8, 0);
    }
  }
}

/**
 * S4 summary-screen entry/exit fade variant of drawMonPic: the WIN0 window's
 * blend8(bg3, target2) mix can't be faded by re-fading the already-composited
 * pixel (BG3 always fades on `bgY`, but target2 is BG1(bgY)-or-OBJ(objY)
 * depending on source per-pixel), so this fades each blend input separately
 * (matching real hardware: BeginNormalPaletteFade rewrites palette RAM, and
 * the blend hardware reads already-faded palette colors) before blending -
 * see paletteFade.ts's module doc for the BG/OBJ tick-lag this implements.
 * y=0 for both reproduces drawMonPic's output exactly.
 */
export function drawMonPicFaded(
  fb: Uint8Array,
  visual: MonPicVisual,
  species: string,
  cursorCenterX: number,
  bgY: number,
  objY: number,
): void {
  if (visual.flashWidth > 0) {
    const left = FLASH_CENTER_X - Math.floor(visual.flashWidth / 2);
    const color = fadeColor(visual.flashBlended ? FLASH_BLENDED_COLOR : FLASH_COLOR, objY);
    for (let i = 0; i < visual.flashWidth; i += 1) {
      setPixel(fb, left + i, FLASH_Y, color.r, color.g, color.b);
    }
  }

  if (visual.window) {
    const { top, bottom } = visual.window;
    for (let y = top; y < bottom; y += 1) {
      for (let x = WINDOW_LEFT; x < WINDOW_RIGHT; x += 1) {
        const bg3 = bg3Color(x, y);
        const arrow = arrowColor(x, y, cursorCenterX);
        const ball = arrow ? null : ballColor(x, y);
        const objSource = arrow ?? ball;
        const t2Raw = objSource ?? bg1Color(x, y);
        const t2 = t2Raw ? fadeColor(t2Raw, objSource ? objY : bgY) : null;
        const color = bg3 ? blend8(fadeColor(bg3, bgY), t2) : (t2 ?? BLACK);
        setPixel(fb, x, y, color.r, color.g, color.b);
      }
    }
  }

  if (visual.spriteVisible) {
    const sprite = frontSprites[species];
    if (sprite) {
      drawSpriteFaded(fb, { tileset: sprite.tileset } as SpriteSheet, sprite.palette, 120, 64, 8, 8, 0, objY);
    }
  }
}
