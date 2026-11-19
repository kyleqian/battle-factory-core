// Static-scene renderer for BattleFrontier_BattleFactoryBattleRoom's ENTRY
// window (S6 slice 2a - see battleRoom.ts's module doc for the RAM-probed
// ground truth). Mirrors prebattleRoomRender.ts's tile/sprite compositing
// conventions (docs/prebattle-room-notes.md), consuming the S6-groundwork
// assets (src/assets/gen/battle-room-{tileset,npcs}.json,
// src/data/gen/battle-room-layout.json - extraction-only session, tick-624
// composite-verified 0/38400px, docs/battle-room-notes.md).
//
// Two differences from the pre-battle room's renderer:
// 1. **The camera pans** - every tile-formula-positioned element (the room
//    tiles, the border void columns, the 6 static scientists) is drawn
//    relative to a dynamic origin (initial minus the tick's camPanY -
//    battleRoom.ts's ENTRY_STEPS), not a fixed one.
// 2. **The room (208px) is narrower than the screen (240px)** - the map
//    doesn't cover the horizontal edges at all, so the void margins need
//    the border metatile drawn explicitly (docs/battle-room-notes.md §1:
//    "a near-fully-transparent primary-tileset tile that composites to flat
//    black"). Implemented generically (any out-of-[0,width)/[0,height)
//    block position falls back to the border metatile) rather than
//    hardcoding "left/right only", since the general pokeemerald border
//    mechanism applies to all four directions - this room's own aspect
//    ratio just means only the horizontal case is ever exercised in
//    practice for the on-screen origin range this slice uses.
//
// The decoy's own screen position is NOT tile-formula-derived (see
// battleRoom.ts doc point 5) - it's drawn at the RAM-sampled screen
// coordinates directly (fixed screenX, screenY tracking camPanY 1:1).

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import { fadeColor } from "./fadeRender.ts";
import { BRAIN_MOVEMENT_CLOCK_OFFSET, BRAIN_MOVEMENT_SETTLE_ELAPSED, BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS, NOLAND_IDLE_FRAME, NOLAND_INITIAL_SCREEN_Y, type BattleRoomState, type EntryStep, type MsgboxVisual, battleRoomQuote, brainEntranceMovementSettled, brainSpeechLines, brainSpeechPicture, brainSpeechRows, brainSymbolStep, entryStep, msgboxVisual, nolandStep, opponentStep, scientistTurnFrame } from "./battleRoom.ts";
import { drawMessageBoxFrame, drawMessageBoxFrameFaded, drawMessageBoxText, drawMessageBoxTextFaded, MESSAGE_PALETTE } from "./prebattleRoomRender.ts";
import { measureText, type FontData } from "./font.ts";

import layout from "../data/gen/battle-room-layout.json" with { type: "json" };
import tileset from "../assets/gen/battle-room-tileset.json" with { type: "json" };
import npcs from "../assets/gen/battle-room-npcs.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import downArrowAsset from "../assets/gen/battle-interface-down-arrow.json" with { type: "json" };
import msgboxAssetData from "../assets/gen/prebattle-room-msgbox.json" with { type: "json" };

import { OBJ_EVENT_GFX, type ObjectEventGfxId, facilityTrainerGfxIdForClass } from "./factoryTrainerOverworldGfx.ts";
import { OpaqueDrawMemo } from "./opaqueDrawMemo.ts";

interface TileEntry {
  tile: number;
  hFlip: boolean;
  vFlip: boolean;
  pal: number;
}
interface Metatile {
  layerType: number;
  entries: TileEntry[];
}
interface RoomTileset {
  tiles: Record<string, number[]>;
  palettes: Record<string, RgbColor[]>;
  metatiles: Record<string, Metatile>;
}
interface Block {
  metatileId: number;
  collision: number;
  elevation: number;
}
interface RoomLayout {
  width: number;
  height: number;
  blocks: Block[];
  border: { width: number; height: number; blocks: Block[] };
  initialCameraOriginPx: { x: number; y: number };
  settledCameraOriginPx: { x: number; y: number };
  objects: {
    opponent: { spawnTile: { x: number; y: number }; settleTile: { x: number; y: number }; settleFacing: string };
    scientists: { localId: number; tile: { x: number; y: number }; turn: string }[];
  };
}
interface NpcFrame {
  columns: number;
  rows: number;
  tiles: number[][];
}
interface NpcSprite {
  frames: NpcFrame[];
  palette: RgbColor[];
}

const roomLayout = layout as RoomLayout;
const roomTileset = tileset as RoomTileset;
const roomNpcs = npcs as { player: NpcSprite; scientist: NpcSprite; noland: NpcSprite; opponents: Record<string, NpcSprite> };

function drawBlockLayer(fb: Uint8Array, entries: TileEntry[], screenX: number, screenY: number, fadeY: number): void {
  for (let i = 0; i < 4; i += 1) {
    const entry = entries[i]!;
    if (entry.tile === 0 && entry.pal === 0) continue;
    const tile = roomTileset.tiles[String(entry.tile)];
    if (!tile) continue;
    const palette = roomTileset.palettes[String(entry.pal)];
    if (!palette) continue;
    const subX = i % 2;
    const subY = Math.floor(i / 2);
    for (let py = 0; py < 8; py += 1) {
      for (let px = 0; px < 8; px += 1) {
        const sx = entry.hFlip ? 7 - px : px;
        const sy = entry.vFlip ? 7 - py : py;
        const colorIndex = tile[sy * 8 + sx]!;
        if (colorIndex === 0) continue;
        const color = palette[colorIndex];
        if (!color) continue;
        const faded = fadeY > 0 ? fadeColor(color, fadeY) : color;
        setPixel(fb, screenX + subX * 8 + px, screenY + subY * 8 + py, faded.r, faded.g, faded.b);
      }
    }
  }
}

const BORDER_METATILE_ID = roomLayout.border.blocks[0]!.metatileId;

function blockAt(bx: number, by: number): Block {
  if (bx < 0 || bx >= roomLayout.width || by < 0 || by >= roomLayout.height) {
    return { metatileId: BORDER_METATILE_ID, collision: 0, elevation: 0 };
  }
  return roomLayout.blocks[by * roomLayout.width + bx]!;
}

/** Draws every on-screen block (room + border fallback) at the given panning origin. */
/** perf211: the room tiles are a pure function of (origin, fadeY) that only write opaque pixels (opaqueDrawMemo.ts). */
const roomTilesMemo = new OpaqueDrawMemo(8);

function drawRoomTiles(fb: Uint8Array, origin: { x: number; y: number }, fadeY: number): void {
  roomTilesMemo.draw(fb, `${origin.x},${origin.y},${fadeY}`, (target) => paintRoomTiles(target, origin, fadeY));
}

function paintRoomTiles(fb: Uint8Array, origin: { x: number; y: number }, fadeY: number): void {
  const bxMin = Math.floor((0 + origin.x) / 16) - 1;
  const bxMax = Math.floor((240 + origin.x) / 16) + 1;
  const byMin = Math.floor((0 + origin.y) / 16) - 1;
  const byMax = Math.floor((160 + origin.y) / 16) + 1;
  for (let by = byMin; by <= byMax; by += 1) {
    for (let bx = bxMin; bx <= bxMax; bx += 1) {
      const block = blockAt(bx, by);
      const screenX = bx * 16 - origin.x;
      const screenY = by * 16 - origin.y;
      if (screenX + 16 <= 0 || screenX >= 240 || screenY + 16 <= 0 || screenY >= 160) continue;
      const meta = roomTileset.metatiles[String(block.metatileId)];
      if (!meta) continue;
      drawBlockLayer(fb, meta.entries.slice(0, 4), screenX, screenY, fadeY);
      drawBlockLayer(fb, meta.entries.slice(4, 8), screenX, screenY, fadeY);
    }
  }
}

function drawNpcFrame(
  fb: Uint8Array,
  npc: NpcSprite,
  frameIndex: number,
  pos: { x: number; y: number },
  hFlip: boolean,
  fadeY: number,
): void {
  const frame = npc.frames[frameIndex]!;
  for (let ty = 0; ty < frame.rows; ty += 1) {
    for (let tx = 0; tx < frame.columns; tx += 1) {
      const srcTx = hFlip ? frame.columns - 1 - tx : tx;
      const tile = frame.tiles[ty * frame.columns + srcTx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const sx = hFlip ? 7 - px : px;
          const colorIndex = tile[py * 8 + sx]!;
          if (colorIndex === 0) continue;
          const color = npc.palette[colorIndex];
          if (!color) continue;
          const faded = fadeY > 0 ? fadeColor(color, fadeY) : color;
          setPixel(fb, pos.x + tx * 8 + px, pos.y + ty * 8 + py, faded.r, faded.g, faded.b);
        }
      }
    }
  }
}

/** docs/prebattle-room-notes.md §2 formula, re-used here for every element that follows the standard camera-tracking convention (room tiles, scientists) - NOT the decoy (battleRoom.ts doc point 5). */
function tileScreenPos(tile: { x: number; y: number }, origin: { x: number; y: number }): { x: number; y: number } {
  return { x: tile.x * 16 - origin.x, y: tile.y * 16 - 16 - origin.y };
}

/** The decoy's fixed screen X and its screen Y at zero pan (battleRoom.ts doc point 5, RAM-sampled). */
/**
 * The decoy walks in exact lockstep with the camera pan (both driven by the
 * same shared waitmovement, docs/battle-room-notes.md "Fake-player / real-
 * player split") - net effect (re-derived from RAM: raw sprite.y decreases
 * 1:1 with the pan while gSpriteCoordOffsetY increases 1:1, and the standard
 * `sprite.y + coordOffsetY - 16` screen formula cancels the two exactly) is
 * that the decoy's own screen position is CONSTANT the whole window, same
 * as the (also screen-fixed) real player elsewhere in this codebase - only
 * its walk-cycle frame changes. Computed once via the same tile formula
 * every other camera-tracked element uses (spawn tile against the initial
 * origin - algebraically identical to settle tile against the settled
 * origin, since both shift by the same 80px).
 */
const INITIAL_ORIGIN = roomLayout.initialCameraOriginPx;
const DECOY_POS = { x: 5, y: 11 } satisfies { x: number; y: number };
const decoyScreenPos = tileScreenPos(DECOY_POS, INITIAL_ORIGIN);
/** The object event's first side walk frame (sAnim_GoEast: frame 7 mirrored), the symbol scene's step's first half (ROM-matched). */
const SYMBOL_STEP_WALK_FRAME = 7;

/** Fixed screen X of the opponent's walk-in column (tile x=7, never changes - `walk_down` is vertical-only, battleRoom.ts finding 2). */
const opponentScreenX = tileScreenPos(roomLayout.objects.opponent.settleTile, INITIAL_ORIGIN).x;

/**
 * S6 slice 2c: the opponent-speech box - literal same box asset/geometry as
 * the pre-battle room's own (docs/battle-room-notes.md §8.1), reusing
 * prebattleRoomRender.ts's drawMessageBoxFrame/drawMessageBoxText verbatim
 * rather than duplicating the tile-compositing logic. Origins pixel-derived
 * (§8.2): both lines share x=16 (tilemapLeft*8), 16px line pitch.
 */
const MSGBOX_LINE1_ORIGIN = { x: 16, y: 121 };
const MSGBOX_LINE2_ORIGIN = { x: 16, y: 137 };

const cursorFont = fontNormalData as unknown as FontData;
const cursorCharmap = new Map<string, number>(
  (charmapData as { entries: [string, number][] }).entries,
);
interface DownArrowAsset {
  indices: number[][];
  blitWidth: number;
  blitHeight: number;
}
const downArrow = downArrowAsset as DownArrowAsset;
/**
 * The glyph's own index 1/2 (border/fill) mapped against the box's own
 * msgbox palette (msgbox.json's own indices - msgboxPalette[2] is this same
 * asset's text-shadow gray, prebattleRoomRender.ts's MESSAGE_PALETTE[1];
 * msgboxPalette[4] is its dedicated red, unused by ordinary message text
 * and dense-compare-caught for this glyph specifically - MESSAGE_PALETTE's
 * own compact 3-entry reindexing doesn't carry it). Index 0 is transparent.
 */
const CURSOR_PALETTE: readonly [RgbColor, RgbColor, RgbColor] = [
  { r: 0, g: 0, b: 0 },
  MESSAGE_PALETTE[1]!,
  (msgboxAssetData as { palette: RgbColor[] }).palette[4]!,
];

/**
 * The brain speech's own "waiting for input, more text follows" cursor -
 * same glyph/mechanism as battleScene.ts's drawCursor (see
 * brainSpeechPicture's `arrow` for when it shows), positioned
 * right after the LAST NON-EMPTY line's own last printed glyph, at that
 * line's own fixed Y (dense-compare-caught: coincides with that line's own
 * origin.y, the same window template). Every guard fixture prior to gold's
 * page 2 ("…Oh?", two-line box0/cry/page8/close-pause) only ever exercised
 * a full two-line box, so `line2` was always non-empty whenever the cursor
 * showed; gold's own dense ground truth
 * (docs/noland-brain-intro-gold-ground-truth.md §7'/§9') is the first fixture
 * to pin a cursor-visible box whose second line is empty (`GOLD_FIRST_
 * ENCOUNTER_SPEECH_BOXES[1]`), and the oracle draws the cursor inline after
 * line 1 there, not line 2's own (empty) origin.
 */
function drawBrainSpeechCursor(
  fb: Uint8Array,
  activeLine: string,
  origin: { x: number; y: number },
  yOffset: number,
): void {
  const x = origin.x + measureText(cursorFont, cursorCharmap, activeLine);
  const y = origin.y - yOffset;
  for (let py = 0; py < downArrow.blitHeight; py += 1) {
    for (let px = 0; px < downArrow.blitWidth; px += 1) {
      const index = downArrow.indices[py]?.[px] ?? 0;
      if (index === 0) continue;
      const color = CURSOR_PALETTE[index];
      if (!color) continue;
      setPixel(fb, x + px, y + py, color.r, color.g, color.b);
    }
  }
}

function drawOpponentMsgbox(
  fb: Uint8Array,
  msgbox: MsgboxVisual,
  state: BattleRoomState,
  fadeY = 0,
): void {
  if (!msgbox.visible) return;
  if (fadeY > 0) drawMessageBoxFrameFaded(fb, fadeY);
  else drawMessageBoxFrame(fb);
  if (state.phase === "brainSpeech" || state.phase === "brainSymbol") {
    drawBrainSpeechText(fb, state, fadeY);
    return;
  }
  if (msgbox.chars <= 0) return;
  const [messageLine1, messageLine2] = battleRoomQuote(state);
  const line1 = messageLine1.slice(0, Math.min(msgbox.chars, messageLine1.length));
  drawMessageBoxText(fb, line1, MSGBOX_LINE1_ORIGIN.x, MSGBOX_LINE1_ORIGIN.y);
  let line2 = "";
  if (msgbox.chars > messageLine1.length) {
    line2 = messageLine2.slice(0, msgbox.chars - messageLine1.length);
    drawMessageBoxText(fb, line2, MSGBOX_LINE2_ORIGIN.x, MSGBOX_LINE2_ORIGIN.y);
  }
}

/** Window 0's text area (tilemapTop 15, four tiles): ScrollWindow moves its pixels up and fills the bottom, so a scrolled row is clipped here. */
const MSGBOX_TEXT_CLIP = { min: 120, max: 152 } as const;

/** Noland's speech box: the picture's two rows (scrolled up by `scroll` pixels) and the down arrow after the current line. */
function drawBrainSpeechText(fb: Uint8Array, state: BattleRoomState, fadeY = 0): void {
  const picture = brainSpeechPicture(state);
  const [row0, row1] = brainSpeechRows(state, picture);
  if (fadeY > 0) {
    // a warp's fade-out (the symbol scene's last box under BeginNormalPaletteFade): no scroll or arrow is ever up then
    drawMessageBoxTextFaded(fb, row0, MSGBOX_LINE1_ORIGIN.x, MSGBOX_LINE1_ORIGIN.y, fadeY);
    drawMessageBoxTextFaded(fb, row1, MSGBOX_LINE2_ORIGIN.x, MSGBOX_LINE2_ORIGIN.y, fadeY);
    return;
  }
  drawMessageBoxText(fb, row0, MSGBOX_LINE1_ORIGIN.x, MSGBOX_LINE1_ORIGIN.y - picture.scroll, MSGBOX_TEXT_CLIP);
  drawMessageBoxText(fb, row1, MSGBOX_LINE2_ORIGIN.x, MSGBOX_LINE2_ORIGIN.y - picture.scroll, MSGBOX_TEXT_CLIP);
  if (picture.arrow === null) return;
  const row = brainSpeechLines(state)[picture.line]?.row ?? 0;
  drawBrainSpeechCursor(fb, row === 0 ? row0 : row1, row === 0 ? MSGBOX_LINE1_ORIGIN : MSGBOX_LINE2_ORIGIN, picture.arrow);
}

/**
 * Walk-in sheet for a generated opponent's resolved OBJ_EVENT_GFX id
 * (factoryTrainerOverworldGfx.ts, ported from SetBattleFacilityTrainerGfxId
 * battle_tower.c:1161-1251). Every OBJ_EVENT_GFX id the tower tables can
 * produce is extracted to its own sheet (battle-room-npcs.json's `opponents`
 * record, produced by tools/extract/extract-battle-room.ts from the reference
 * object-event pic tables + OBJ_EVENT_PAL_TAG palettes); nothing is left
 * unextracted. The generic BUG_CATCHER sheet remains a deterministic
 * defensive fallback for ids that don't (yet) have a mapping - the asset
 * debt listed in earlier sessions (HIKER, TUBER_M, MAN_3, RICH_BOY, MANIAC,
 * RUNNING_TRIATHLETE_M/F, BLACK_BELT, MAN_5, CAMPER, PSYCHIC_M, GENTLEMAN,
 * SCHOOL_KID_M, POKEFAN_M/F, EXPERT_M/F, YOUNGSTER, CYCLING_TRIATHLETE_M/F,
 * NINJA_BOY, SAILOR, MAN_4, WOMAN_2, WOMAN_5, HEX_MANIAC, BEAUTY, LASS,
 * TUBER_F, BOY_1, plus PICNICKER) is fully burned down.
 */
export const GENERIC_OPPONENT_SHEET = "BUG_CATCHER";

const OPPONENT_SHEET_BY_GFX: Record<number, string> = {
  [OBJ_EVENT_GFX.NINJA_BOY]: "NINJA_BOY",
  [OBJ_EVENT_GFX.BOY_1]: "BOY_1",
  [OBJ_EVENT_GFX.GIRL_3]: "GIRL_3",
  [OBJ_EVENT_GFX.RICH_BOY]: "RICH_BOY",
  [OBJ_EVENT_GFX.POKEFAN_F]: "POKEFAN_F",
  [OBJ_EVENT_GFX.WOMAN_2]: "WOMAN_2",
  [OBJ_EVENT_GFX.EXPERT_M]: "EXPERT_M",
  [OBJ_EVENT_GFX.EXPERT_F]: "EXPERT_F",
  [OBJ_EVENT_GFX.POKEFAN_M]: "POKEFAN_M",
  [OBJ_EVENT_GFX.CAMPER]: "CAMPER",
  [OBJ_EVENT_GFX.PICNICKER]: "PICNICKER",
  [OBJ_EVENT_GFX.MAN_3]: "MAN_3",
  [OBJ_EVENT_GFX.WOMAN_5]: "WOMAN_5",
  [OBJ_EVENT_GFX.YOUNGSTER]: "YOUNGSTER",
  [OBJ_EVENT_GFX.BUG_CATCHER]: "BUG_CATCHER",
  [OBJ_EVENT_GFX.PSYCHIC_M]: "PSYCHIC_M",
  [OBJ_EVENT_GFX.SCHOOL_KID_M]: "SCHOOL_KID_M",
  [OBJ_EVENT_GFX.MANIAC]: "MANIAC",
  [OBJ_EVENT_GFX.HEX_MANIAC]: "HEX_MANIAC",
  [OBJ_EVENT_GFX.BLACK_BELT]: "BLACK_BELT",
  [OBJ_EVENT_GFX.BEAUTY]: "BEAUTY",
  [OBJ_EVENT_GFX.LASS]: "LASS",
  [OBJ_EVENT_GFX.GENTLEMAN]: "GENTLEMAN",
  [OBJ_EVENT_GFX.SAILOR]: "SAILOR",
  [OBJ_EVENT_GFX.FISHERMAN]: "FISHERMAN",
  [OBJ_EVENT_GFX.RUNNING_TRIATHLETE_M]: "RUNNING_TRIATHLETE_M",
  [OBJ_EVENT_GFX.RUNNING_TRIATHLETE_F]: "RUNNING_TRIATHLETE_F",
  [OBJ_EVENT_GFX.TUBER_F]: "TUBER_F",
  [OBJ_EVENT_GFX.TUBER_M]: "TUBER_M",
  [OBJ_EVENT_GFX.HIKER]: "HIKER",
  [OBJ_EVENT_GFX.CYCLING_TRIATHLETE_M]: "CYCLING_TRIATHLETE_M",
  [OBJ_EVENT_GFX.CYCLING_TRIATHLETE_F]: "CYCLING_TRIATHLETE_F",
  [OBJ_EVENT_GFX.MAN_4]: "MAN_4",
  [OBJ_EVENT_GFX.MAN_5]: "MAN_5",
};

/** The sheet name an OBJ_EVENT_GFX id resolves to (GENERIC_OPPONENT_SHEET when unmapped). */
export function opponentSheetNameForGfx(gfxId: ObjectEventGfxId): string {
  return OPPONENT_SHEET_BY_GFX[gfxId] ?? GENERIC_OPPONENT_SHEET;
}

function opponentSheetForGfx(gfxId: ObjectEventGfxId): NpcSprite {
  return roomNpcs.opponents[opponentSheetNameForGfx(gfxId)] ?? roomNpcs.opponents[GENERIC_OPPONENT_SHEET]!;
}
export { opponentSheetForGfx };

/**
 * Renders the battle-room ENTRY window's scene at a given camera pan amount
 * (0 = initial/warp-landing origin, 80 = settled), decoy frame/facing, and
 * optional BG/OBJ fade coefficients (paletteFade.ts convention - 0 = no
 * fade, matching every other faded-render function in this codebase).
 * `elapsed` (S6 slice 2b) additionally drives the scientists' turn-in-place
 * and the opponent's walk-in, both settled/no-op for elapsed <=103 (the
 * slice 2a ENTRY window) - see battleRoom.ts's scientistTurnFrame/
 * opponentStep for the oracle-pinned per-tick schedule. `msgbox` (S6 slice
 * 2c) draws the opponent-speech box on top of everything else, once visible
 * - see battleRoom.ts's msgboxVisual for the per-phase derivation.
 */
export function renderBattleRoomEntryScene(
  fb: Uint8Array,
  step: EntryStep,
  elapsed: number,
  bgFadeY = 0,
  objFadeY = 0,
  msgbox: MsgboxVisual = { visible: false, chars: 0 },
  state: BattleRoomState = INITIAL_RENDER_STATE,
): void {
  const origin = { x: roomLayout.initialCameraOriginPx.x, y: roomLayout.initialCameraOriginPx.y - step.camPanY };
  drawRoomTiles(fb, origin, bgFadeY);
  const turn = scientistTurnFrame(elapsed);
  for (const scientist of roomLayout.objects.scientists) {
    const pos = tileScreenPos(scientist.tile, origin);
    const hFlip = turn.turned && scientist.turn === "east";
    drawNpcFrame(fb, roomNpcs.scientist, turn.frame, pos, hFlip, objFadeY);
  }
  drawNpcFrame(fb, roomNpcs.player, step.decoyFrame, decoyScreenPos, step.decoyHFlip, objFadeY);
  const opponent = opponentStep(elapsed);
  if (opponent.visible) {
    // trainerPresentation takes precedence: the generated battle-2 room
    // carries BOTH the legacy "jenson" encounter label and the generated
    // trainer identity (core.ts seeds INITIAL_BATTLE_2_ROOM_STATE +
    // trainerPresentation), and the identity's class must drive the sheet.
    const npc = state.trainerPresentation !== undefined
      ? opponentSheetForGfx(facilityTrainerGfxIdForClass(state.trainerPresentation.facilityClassId))
      : state.encounter === "jenson"
        ? roomNpcs.opponents.FISHERMAN
        : roomNpcs.opponents[GENERIC_OPPONENT_SHEET]!;
    drawNpcFrame(fb, npc, opponent.frame, { x: opponentScreenX, y: opponent.screenY }, false, objFadeY);
  }
  drawOpponentMsgbox(fb, msgbox, state);
}

const INITIAL_RENDER_STATE: BattleRoomState = { phase: "entering", elapsed: 0 };

/**
 * Walk-up build step B1: renders the Frontier-Brain BattleRoom entrance
 * branch (battleRoom.ts's `brain*` phases) - Noland already visible at
 * (7,9) from the first frame (no hidden-then-walked-in ordinary-opponent
 * path runs), the "Get a move on!" box appears BEFORE any movement, and
 * only once dismissed does Noland's own walk run simultaneously with the
 * decoy/scientists (see battleRoom.ts's module doc for the full mechanism
 * and its "not independently RAM-probed this session" caveat). No camera
 * pan happens until `brainMoving` - the room/Noland/scientists all render
 * at the static initial origin through `brainEntering`/`brainMsgboxIdle`/
 * `brainMsgboxClosing`, since `entryStep`/`scientistTurnFrame`/`nolandStep`
 * all naturally hold their `elapsed=0` values there.
 */
export function renderBattleRoomBrainEntranceScene(
  fb: Uint8Array,
  state: BattleRoomState,
  bgFadeY = 0,
  objFadeY = 0,
): void {
  // Walk-up build step B2: the speech phases (brainSpeech/-Idle/-Closing/
  // -Settled) all continue holding the exact same settled scene brainSettled
  // itself renders - only the message box content changes - so they share
  // brainSettled's own "settled" pose branch below (brainEntranceMovementSettled).
  const settled = brainEntranceMovementSettled(state.phase);
  // Walk-up build step B1c mid-ramp fix (162/256 -> dense-verified via
  // tools/probe/probe-factory-brain-silver-entrance-movement-ram.py's
  // extended OAM/coordOffset fields + a whole-frame pixel cross-correlation
  // of the entrance-03 fixture, see battleRoom.ts's module doc below for the
  // full evidence): entryStep's shared table has exactly ONE flat (camPanY=0)
  // tick at historicElapsed 22 before it starts ramping at 23 - but RAM shows
  // THIS window's real pan stays flat for TWO ticks after the
  // brainMsgboxClosing->brainMoving transition (state.elapsed 0 AND 1 both
  // RAM-measure camPanY=0; the ramp's first real +1px tick is state.elapsed
  // 2, not 1). So `state.elapsed` runs one tick AHEAD of the shared
  // entryStep/scientistTurnFrame/nolandStep clock while brainMoving is in
  // progress - feed them state.elapsed-1, not state.elapsed (BRAIN_MOVEMENT_
  // CLOCK_OFFSET's own +22 already lands the corrected clock on the right
  // table row: historicElapsed 21/22/23 at state.elapsed 0/1/2 exactly
  // reproduce RAM's flat/flat/camPanY=1 shape). The settled/pre-phase
  // branches below need no such correction - settled already feeds a
  // comfortably-clamped constant (both entryStep and scientistTurnFrame
  // saturate well before it either way) and the pre-phase branch's forced
  // elapsed=0 already renders the correct (still-flat) pose.
  // Single-tick boundary family, pair B (docs/single-tick-boundary-family-
  // probe.md): BRAIN_MOVEMENT_SETTLE_ELAPSED's phase transition fires one
  // tick before its own historicElapsed=108 clamp would naturally arrive
  // (the transition predates the B1c `-1` fix above and was never re-
  // derived - re-deriving it instead was tried and reverted, see the
  // probe doc's RESOLVED section: it re-bases every later phase's own
  // elapsed clock). So brainSettled's own FIRST render tick (elapsed 0)
  // needs the same `-1` lag brainMoving's own movementElapsed already
  // uses, rendering scientistTurnFrame's still-transient historicElapsed
  // 107 instead of jumping straight to the settled clamp's 108 - RAM/
  // oracle-confirmed (entryStep/nolandStep are already saturated by 107,
  // so this affects only the scientists' picture frame, nothing else).
  const movementElapsed = state.phase === "brainMoving"
    ? state.elapsed - 1
    : state.phase === "brainSettled" && state.elapsed === 0
      ? BRAIN_MOVEMENT_SETTLE_ELAPSED - 1
      : settled
        ? BRAIN_MOVEMENT_SETTLE_ELAPSED
        : 0;
  // BRAIN_MOVEMENT_CLOCK_OFFSET re-bases this window's own elapsed clock
  // (0 = closemessage dismiss) onto entryStep/scientistTurnFrame's shared
  // RAM-tick clock (S6 slice 2a/2b) - see that constant's own doc.
  const historicElapsed = movementElapsed + BRAIN_MOVEMENT_CLOCK_OFFSET;
  const step = entryStep(historicElapsed);
  const origin = { x: roomLayout.initialCameraOriginPx.x, y: roomLayout.initialCameraOriginPx.y - step.camPanY };
  drawRoomTiles(fb, origin, bgFadeY);
  const turn = scientistTurnFrame(historicElapsed);
  for (const scientist of roomLayout.objects.scientists) {
    const pos = tileScreenPos(scientist.tile, origin);
    const hFlip = turn.turned && scientist.turn === "east";
    drawNpcFrame(fb, roomNpcs.scientist, turn.frame, pos, hFlip, objFadeY);
  }
  // The symbol scene's step (Movement_PlayerApproachNoland, walk_right): the fake player one tile right, the walk frame for its first half
  // (the side walk frame, mirrored east, as ENTRY_STEPS' walk north shows its walk frame then the standing one).
  const symbolStep = brainSymbolStep(state);
  const decoyPos = symbolStep.offsetX === 0 ? decoyScreenPos : { x: decoyScreenPos.x + symbolStep.offsetX, y: decoyScreenPos.y };
  drawNpcFrame(fb, roomNpcs.player, symbolStep.walking ? SYMBOL_STEP_WALK_FRAME : step.decoyFrame, decoyPos, symbolStep.walking ? true : step.decoyHFlip, objFadeY);
  // Noland's own walk (nolandStep) only starts once "brainMoving" begins -
  // before that he holds his resting player-facing pose (NOLAND_IDLE_FRAME),
  // not the decoy's own north-facing idle frame reused during the walk
  // itself (see NOLAND_IDLE_FRAME's own doc). Same CLOSE WIPE window as the
  // escort box's own hold (battleRoom.ts's BRAIN_MSGBOX_CLOSE_WIPE_MOVING_
  // HOLD_TICKS doc): `brainMoving`'s own first two elapsed ticks are still
  // RAM-flat (camPanY unchanged, B1c's own finding), and pixel-probed this
  // step (factory-brain-silver-walkup-entrance-03-off.json, trace frames
  // 319-320) Noland still holds his idle pose there too, not decoyFrame -
  // he only switches once the room visibly starts moving.
  const noland = (state.phase === "brainMoving"
      && state.elapsed >= BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS)
      || settled
    ? nolandStep(historicElapsed)
    : { frame: NOLAND_IDLE_FRAME, hFlip: false, screenY: NOLAND_INITIAL_SCREEN_Y };
  drawNpcFrame(fb, roomNpcs.noland, noland.frame, { x: opponentScreenX, y: noland.screenY }, noland.hFlip, objFadeY);
  drawOpponentMsgbox(fb, msgboxVisual(state), state, bgFadeY);
}
