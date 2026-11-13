// Draws the Factory Lobby attendant conversation (factoryLobbyAttendant.ts)
// over the free-roam field: the field and sprites come from
// renderFactoryLobbyFreeRoam, then the dialogue box, the multichoice windows
// (script_menu.h MULTI_CHALLENGEINFO / MULTI_LEVEL_MODE at tile (17,6), the
// field YES/NO) and the save-info window (start_menu.c ShowSaveInfoWindow).
import { createFramebuffer } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import { drawText, measureText, type FontData } from "./font.ts";
import {
  drawMessageBoxFrame,
  drawMessageBoxText,
  drawMessageBoxWaitArrow,
  drawStandardWindowFrame,
  drawStandardWindowText,
} from "./prebattleRoomRender.ts";
import {
  ATTENDANT_MENU_ITEMS,
  ATTENDANT_SCREENS,
  ATTENDANT_TIMING,
  attendantGlyphCount,
  attendantMenuAppearAge,
  attendantMenuClearTick,
  attendantPageContinuesScroll,
  type AttendantMenuKind,
  type AttendantScreenId,
  type FactoryLobbyAttendantState,
} from "./factoryLobbyAttendant.ts";
import fontData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import { PLAYER_NAME } from "./playerName.ts";

const font = fontData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);

const ROW1_Y = 121;
const ROW2_Y = 137;
const TEXT_X = 16;
const ARROW_BOB = [0, 1, 2, 1] as const;

export interface AttendantPageView {
  readonly screen: AttendantScreenId;
  readonly page: number;
  readonly age: number;
}

function drawClipped(fb: Uint8Array, text: string, x: number, y: number): void {
  const layer = createFramebuffer();
  drawMessageBoxText(layer, text, x, y);
  for (let py = 120; py < 152; py += 1) {
    for (let px = 8; px < 232; px += 1) {
      const i = (py * 240 + px) * 4;
      if (layer[i + 3] === 0) continue;
      fb[i] = layer[i]!;
      fb[i + 1] = layer[i + 1]!;
      fb[i + 2] = layer[i + 2]!;
      fb[i + 3] = 255;
    }
  }
}

function drawPage(fb: Uint8Array, view: AttendantPageView, withArrow: boolean): void {
  const def = ATTENDANT_SCREENS[view.screen];
  const pageDef = def.pages[view.page]!;
  const lines = pageDef.lines;
  const total = attendantGlyphCount(view.screen, view.page);
  const chars = Math.max(0, Math.min(total, view.age + 1));
  if (attendantPageContinuesScroll(view.screen, view.page)) {
    drawMessageBoxText(fb, lines[0]!, TEXT_X, ROW1_Y);
    if (chars > 0) drawMessageBoxText(fb, lines[1]!.slice(0, chars), TEXT_X, ROW2_Y);
  } else {
    drawMessageBoxText(fb, lines[0]!.slice(0, chars), TEXT_X, ROW1_Y);
    if (lines.length > 1 && chars > lines[0]!.length) {
      drawMessageBoxText(fb, lines[1]!.slice(0, chars - lines[0]!.length), TEXT_X, ROW2_Y);
    }
  }
  if (withArrow && pageDef.end !== "end" && view.age >= total + 1) {
    const phase = Math.floor((view.age - (total + 1)) / ATTENDANT_TIMING.arrowGroupFrames) % 4;
    const last = lines[lines.length - 1]!;
    drawMessageBoxWaitArrow(fb, last, ARROW_BOB[phase]!, lines.length > 1 ? ROW2_Y : ROW1_Y);
  }
}

const MENU_BOX: Readonly<Record<AttendantMenuKind, { x: number; y: number; w: number; h: number }>> = {
  challenge: { x: 136, y: 48, w: 8, h: 6 },
  level: { x: 136, y: 48, w: 9, h: 6 },
  yesNo: { x: 160, y: 64, w: 5, h: 4 },
};

function drawMenu(fb: Uint8Array, kind: AttendantMenuKind, cursor: number): void {
  const box = MENU_BOX[kind];
  drawStandardWindowFrame(fb, box.x, box.y, box.w, box.h);
  ATTENDANT_MENU_ITEMS[kind].forEach((item, index) => {
    drawStandardWindowText(fb, item, box.x + 16, box.y + 9 + index * 16);
  });
  drawStandardWindowText(fb, "▶", box.x + 8, box.y + 9 + cursor * 16);
}

type Palette3 = [RgbColor, RgbColor, RgbColor];
const TEXT_GREEN: Palette3 = [{ r: 0, g: 0, b: 0 }, { r: 33, g: 156, b: 8 }, { r: 148, g: 247, b: 148 }];
const TEXT_GRAY: Palette3 = [{ r: 0, g: 0, b: 0 }, { r: 99, g: 99, b: 99 }, { r: 214, g: 214, b: 206 }];
const TEXT_BLUE: Palette3 = [{ r: 0, g: 0, b: 0 }, { r: 49, g: 82, b: 206 }, { r: 165, g: 198, b: 247 }];

function saveWindowText(fb: Uint8Array, text: string, x: number, y: number, palette: Palette3): void {
  drawText(fb, font, charmap, text, x, y, palette, { fg: 1, bg: 0, shadow: 2 });
}

function drawSaveWindow(fb: Uint8Array): void {
  drawStandardWindowFrame(fb, 0, 0, 14, 10);
  const right = (text: string, y: number): void =>
    saveWindowText(fb, text, 8 + 112 - measureText(font, charmap, text), y, TEXT_BLUE);
  saveWindowText(fb, "BATTLE FRONTIER", 8, 9, TEXT_GREEN);
  saveWindowText(fb, "PLAYER", 8, 25, TEXT_GRAY);
  right(PLAYER_NAME, 25);
  saveWindowText(fb, "BADGES", 8, 41, TEXT_GRAY);
  right("8", 41);
  saveWindowText(fb, "POKéDEX", 8, 57, TEXT_GRAY);
  right("386", 57);
  saveWindowText(fb, "TIME", 8, 73, TEXT_GRAY);
  right("999:59", 73);
}

/**
 * Draw the conversation on top of `fb` (the free-roam field). Returns false
 * when nothing of the conversation is on screen this frame (bare field).
 */
export function drawFactoryLobbyAttendant(fb: Uint8Array, state: FactoryLobbyAttendantState): void {
  const def = ATTENDANT_SCREENS[state.screen];
  const lead = state.lead;
  if (lead === null) {
    if (def.saveWindow) drawSaveWindow(fb);
    drawMessageBoxFrame(fb);
    const view = { screen: state.screen, page: state.page, age: state.age };
    drawPage(fb, view, true);
    const appear = attendantMenuAppearAge(state.screen);
    if (def.menu !== null && state.page === def.pages.length - 1 && appear !== null && state.age >= appear) {
      drawMenu(fb, def.menu, state.cursor);
    }
    return;
  }
  const prev = lead.prevScreen === null ? null : ATTENDANT_SCREENS[lead.prevScreen];
  const prevView = lead.prevScreen === null
    ? null
    : { screen: lead.prevScreen, page: lead.prevPage, age: lead.prevAge + lead.tick };
  switch (lead.kind) {
    case "open": {
      if (state.age < -1) return;
      drawMessageBoxFrame(fb);
      return;
    }
    case "turn": {
      drawMessageBoxFrame(fb);
      drawPage(fb, prevView!, true);
      return;
    }
    case "scroll": {
      drawMessageBoxFrame(fb);
      const pv = prevView!;
      if (lead.tick <= 1) {
        drawPage(fb, pv, true);
        return;
      }
      const elapsed = lead.tick - 2;
      const scroll = Math.min(ATTENDANT_TIMING.scrollTicks, elapsed) * 4;
      const pageDef = ATTENDANT_SCREENS[pv.screen].pages[pv.page]!;
      const nextLines = ATTENDANT_SCREENS[state.screen].pages[state.page]!.lines;
      if (elapsed < ATTENDANT_TIMING.scrollTicks) drawClipped(fb, pageDef.lines[pageDef.lines.length - 2] ?? "", TEXT_X, ROW1_Y - scroll);
      drawClipped(fb, pageDef.lines[pageDef.lines.length - 1]!, TEXT_X, ROW2_Y - scroll);
      const chars = Math.max(0, state.age + 1);
      if (chars > 0) drawClipped(fb, nextLines[nextLines.length - 1]!.slice(0, chars), TEXT_X, ROW2_Y);
      return;
    }
    case "message":
    case "auto": {
      if (prev?.saveWindow && lead.tick < ATTENDANT_TIMING.messageClearTick) drawSaveWindow(fb);
      if (def.saveWindow && lead.tick >= ATTENDANT_TIMING.messageClearTick) drawSaveWindow(fb);
      drawMessageBoxFrame(fb);
      if (lead.tick < ATTENDANT_TIMING.messageClearTick) drawPage(fb, prevView!, false);
      return;
    }
    case "menuChoice": {
      const opensWindow = def.saveWindow && !(prev?.saveWindow ?? false);
      const closesWindow = !def.saveWindow && (prev?.saveWindow ?? false);
      const clearTick = attendantMenuClearTick(prev!.menu!, state.screen);
      if (opensWindow && lead.tick >= clearTick) {
        if (state.age < -1) return;
        drawSaveWindow(fb);
        drawMessageBoxFrame(fb);
        return;
      }
      if (closesWindow && lead.tick >= ATTENDANT_TIMING.menuGoneTick && lead.tick < clearTick) return;
      if ((def.saveWindow && !opensWindow) || (closesWindow && lead.tick < clearTick)) drawSaveWindow(fb);
      drawMessageBoxFrame(fb);
      if (lead.tick < clearTick) {
        drawPage(fb, prevView!, false);
        if (lead.tick < ATTENDANT_TIMING.menuGoneTick && lead.prevMenu !== null) drawMenu(fb, lead.prevMenu, lead.prevCursor);
      }
      return;
    }
  }
}
