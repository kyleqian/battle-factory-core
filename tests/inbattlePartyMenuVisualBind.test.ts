import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import {
  renderBattlePartySelect,
  type BattlePartySelectState,
} from "../src/engine/battlePartySelect.ts";

function px(fb: Uint8Array, x: number, y: number): [number, number, number] {
  const o = (y * 240 + x) * 4;
  return [fb[o], fb[o + 1], fb[o + 2]];
}

function baseState(
  overrides: Partial<BattlePartySelectState["rows"][number]> = {},
): BattlePartySelectState {
  return Object.freeze({
    requestId: 1,
    rows: Object.freeze([
      Object.freeze({
        partyIndex: 0 as const,
        species: 19,
        speciesKey: "SPECIES_RATTATA",
        name: "RATTATA",
        level: 50,
        hp: 105,
        maxHP: 105,
        fainted: false,
        active: true,
        legal: false,
        gender: "male",
        ...overrides,
      }),
      Object.freeze({
        partyIndex: 1 as const,
        species: 19,
        speciesKey: "SPECIES_RATTATA",
        name: "RATTATA",
        level: 50,
        hp: 105,
        maxHP: 105,
        fainted: false,
        active: false,
        legal: true,
        gender: "female",
      }),
      Object.freeze({
        partyIndex: 2 as const,
        species: 19,
        speciesKey: "SPECIES_RATTATA",
        name: "RATTATA",
        level: 50,
        hp: 105,
        maxHP: 105,
        fainted: false,
        active: false,
        legal: true,
        gender: "female",
      }),
    ]) as BattlePartySelectState["rows"],
    cursor: 1 as const,
    rightColumnCursor: 1,
    submenuOpen: false,
    message: "Choose a POKéMON.",
    outcome: null,
    elapsed: 0,
    selectedSinceElapsed: 30,
    closeElapsed: null,
  });
}

describe("in-battle party menu visual binds (ISSUES #80)", () => {
  it("draws the graphical HP bar at the sPartyBoxInfoRects positions with the source fill colors", () => {
    // Right-column HP bar rel (88,10,48x3) -> px (184,18); left (24,35,48x3) -> (32,59).
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, baseState());
    // Full HP: sHPBarGreenPalIds light (115,255,173) over dark (90,214,132).
    expect(px(fb, 184, 18)).toEqual([90, 214, 132]);
    expect(px(fb, 184, 19)).toEqual([115, 255, 173]);
    expect(px(fb, 231, 19)).toEqual([115, 255, 173]);
    expect(px(fb, 32, 59)).toEqual([90, 214, 132]);
    expect(px(fb, 79, 60)).toEqual([115, 255, 173]);

    // 52/105 = fraction 23 (>20%, <=50%) -> yellow family on a right-column card.
    const lowRow: BattlePartySelectState["rows"][number] = Object.freeze({
      partyIndex: 1 as const,
      species: 19,
      speciesKey: "SPECIES_RATTATA",
      name: "RATTATA",
      level: 50,
      hp: 52,
      maxHP: 105,
      fainted: false,
      active: false,
      legal: true,
      gender: "female",
    });
    const lowFb = createFramebuffer();
    renderBattlePartySelect(lowFb, {
      ...baseState(),
      rows: Object.freeze([baseState().rows[0], lowRow, baseState().rows[2]]) as BattlePartySelectState["rows"],
    });
    expect(px(lowFb, 184, 18)).toEqual([206, 173, 8]);
    expect(px(lowFb, 184, 19)).toEqual([255, 231, 57]);
    // The unfilled remainder keeps the slot tilemap's empty-bar colors.
    expect(px(lowFb, 184 + 23, 19)).not.toEqual([255, 231, 57]);
  });

  it("draws the gender glyph at the source position with the oracle-verified colors", () => {
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, baseState());
    // Female glyph cellOffsetY 4 at right-column gender (62,12) rel -> (158,24).
    expect(px(fb, 158, 25)).toEqual([255, 156, 148]);
    expect(px(fb, 159, 29)).toEqual([255, 156, 148]);
    // Male shadow ink on the left column (64,20) rel -> glyph at (72,48).
    expect(px(fb, 75, 48)).toEqual([0, 99, 148]);
  });

  it("moves the HP text onto the HP-number box and keeps level at the real position", () => {
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, baseState());
    // HP numbers are white on the card's HP-number box (right column HP rel (102,12)).
    const textRow = Array.from({ length: 60 }, (_, i) => px(fb, 190 + i, 25));
    expect(textRow.some((c) => c[0] === 255 && c[1] === 255 && c[2] === 255)).toBe(true);
    // Level "Lv50" stays at the level rect (30,12) rel -> px (126,20).
    const levelRow = Array.from({ length: 30 }, (_, i) => px(fb, 122 + i, 24));
    expect(levelRow.some((c) => c[0] !== 0 || c[1] !== 0 || c[2] !== 0)).toBe(true);
  });

  it("draws the WIN_MSG party-menu window at the real geometry with the olive frame", () => {
    // sDefaultPartyMsgWindowTemplate (1,17) 21x2: outer frame (0,128)-(184,160).
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, baseState());
    // Frame corner color 0 = the party-menu olive.
    expect(px(fb, 0, 128)).toEqual([140, 156, 41]);
    // Frame left-edge bevel (frame1 tile idx 1).
    expect(px(fb, 1, 140)).toEqual([41, 49, 49]);
    // Interior fill is white.
    expect(px(fb, 100, 140)).toEqual([255, 255, 255]);
    // "Choose a POKéMON." is drawn inside the window (fg dark gray ink).
    const windowText = Array.from({ length: 60 }, (_, i) => px(fb, 8 + i, 144));
    expect(windowText.some((c) => c[0] === 99 && c[1] === 99 && c[2] === 99)).toBe(true);
  });
});
