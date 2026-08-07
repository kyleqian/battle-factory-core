import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import {
  primaryStatusFromStatus1,
  renderBattlePartySelect,
  type BattlePartySelectState,
} from "../src/engine/battlePartySelect.ts";
import {
  BATTLE_SCRIPT_STATUS1_BURN,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS1_POISON,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
} from "../src/engine/battleScriptSourceConstants.ts";

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
        item: 0,
        status: null,
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
        item: 0,
        status: null,
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
        item: 0,
        status: null,
      }),
    ]) as BattlePartySelectState["rows"],
    cursor: 1 as const,
    rightColumnCursor: 1,
    submenuOpen: false,
    message: "Choose a POKéMON.",
    outcome: null,
    elapsed: 0,
    openElapsed: 0,
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
      item: 0,
      status: null,
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

  it("draws the 8x8 held-item icon at the slot center iff the row holds an item", () => {
    // CreatePartyMonHeldItemSprite (party_menu.c:4021-4038): the generic item
    // glyph at sPartyMenuSpriteCoords `heldItem` (108,28) for slot 1, 8x8,
    // covering the bbox x105-111,y25-31 with the banked palette (index 4 =
    // (255,247,156), index 6 = (247,82,41)).
    const withItem = createFramebuffer();
    renderBattlePartySelect(withItem, {
      ...baseState(),
      rows: Object.freeze([
        baseState().rows[0],
        Object.freeze({ ...baseState().rows[1], item: 200 }),
        baseState().rows[2],
      ]) as BattlePartySelectState["rows"],
    });
    let yellow = 0;
    let orange = 0;
    for (let y = 25; y <= 31; y += 1) for (let x = 105; x <= 111; x += 1) {
      const c = px(withItem, x, y);
      if (c[0] === 255 && c[1] === 247 && c[2] === 156) yellow += 1;
      if (c[0] === 247 && c[1] === 82 && c[2] === 41) orange += 1;
    }
    expect(yellow).toBe(16);
    expect(orange).toBe(8);

    const withoutItem = createFramebuffer();
    renderBattlePartySelect(withoutItem, baseState());
    for (let y = 25; y <= 31; y += 1) for (let x = 105; x <= 111; x += 1) {
      const c = px(withoutItem, x, y);
      expect(c).not.toEqual([255, 247, 156]);
    }
  });

  it("draws the status-icon variant selected by the row's primary status at the slot center", () => {
    // UpdatePartyMonAilmentGfx (party_menu.c:4208-4220): frame = ailment - 1
    // (PSN/PRZ/SLP/FRZ/BRN), sprite invisible for AILMENT_NONE. Slot 1 status
    // center (136,27); the PRZ glyph's palette-6 ink (189,189,24) vs SLP's
    // palette-8 ink (165,165,140) distinguish the variants.
    const renderWith = (status: BattlePartySelectState["rows"][number]["status"]) => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, {
        ...baseState(),
        rows: Object.freeze([
          baseState().rows[0],
          Object.freeze({ ...baseState().rows[1], status }),
          baseState().rows[2],
        ]) as BattlePartySelectState["rows"],
      });
      return fb;
    };
    const countColor = (fb: Uint8Array, color: [number, number, number]): number => {
      let n = 0;
      for (let y = 23; y <= 30; y += 1) for (let x = 126; x <= 145; x += 1) {
        const c = px(fb, x, y);
        if (c[0] === color[0] && c[1] === color[1] && c[2] === color[2]) n += 1;
      }
      return n;
    };
    expect(countColor(renderWith("paralyzed"), [189, 189, 24])).toBeGreaterThan(0);
    expect(countColor(renderWith("paralyzed"), [165, 165, 140])).toBe(0);
    expect(countColor(renderWith("sleep"), [165, 165, 140])).toBeGreaterThan(0);
    expect(countColor(renderWith("sleep"), [189, 189, 24])).toBe(0);
    // AILMENT_NONE renders no status sprite at all.
    expect(countColor(renderWith(null), [189, 189, 24])).toBe(0);
  });

  it("suppresses the Lv50 level line for a statused row (DisplayPartyPokemonLevelCheck)", () => {
    // party_menu.c:2290-2298 only prints the level when the ailment is
    // AILMENT_NONE/PKRS; a statused mon replaces the level line with the
    // status icon. Pixel (141,29) is inside the slot-1 status glyph when
    // suppressed; the level line's "0" left stroke sits at (139,29) with the
    // {LV} ligature (glyph 0x34=52, widths[52]=8) shifting the digits left.
    const renderWith = (status: BattlePartySelectState["rows"][number]["status"]) => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, {
        ...baseState(),
        rows: Object.freeze([
          baseState().rows[0],
          Object.freeze({ ...baseState().rows[1], status }),
          baseState().rows[2],
        ]) as BattlePartySelectState["rows"],
      });
      return fb;
    };
    // Statused row: the level line carries the status glyph, not text ink.
    expect(px(renderWith("paralyzed"), 141, 29)).toEqual([189, 189, 24]);
    expect(px(renderWith("sleep"), 141, 29)).toEqual([165, 165, 140]);
    // Clean row: the Lv50 text prints at the level rect in the card text ink.
    expect(px(renderWith(null), 139, 29)).toEqual([255, 255, 255]);
  });

  it("maps status1 bitmasks onto the status-icon variant names (GetAilmentFromStatus)", () => {
    expect(primaryStatusFromStatus1(BATTLE_SCRIPT_STATUS1_PARALYSIS)).toBe("paralyzed");
    expect(primaryStatusFromStatus1(BATTLE_SCRIPT_STATUS1_SLEEP)).toBe("sleep");
    expect(primaryStatusFromStatus1(BATTLE_SCRIPT_STATUS1_POISON)).toBe("poison");
    expect(primaryStatusFromStatus1(BATTLE_SCRIPT_STATUS1_TOXIC_POISON)).toBe("poison");
    expect(primaryStatusFromStatus1(BATTLE_SCRIPT_STATUS1_BURN)).toBe("burn");
    expect(primaryStatusFromStatus1(BATTLE_SCRIPT_STATUS1_FREEZE)).toBe("frozen");
    expect(primaryStatusFromStatus1(0)).toBeNull();
    expect(primaryStatusFromStatus1(BATTLE_SCRIPT_STATUS1_PARALYSIS | BATTLE_SCRIPT_STATUS1_SLEEP)).toBe("sleep");
  });
});
