import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import {
  DO_WHAT_WITH_MON_TAIL_CODES,
  PARTY_SELECT_CLOSE_BLACK_HOLD_FRAMES,
  PARTY_SELECT_CLOSE_MENU_FADE_FRAMES,
  PARTY_SELECT_CLOSE_MENU_FRAMES,
  PARTY_SELECT_CLOSE_TOTAL_FRAMES,
  PARTY_SELECT_OPEN_BLACK_HOLD_FRAMES,
  PARTY_SELECT_OPEN_BRIGHT_HOLD_FRAMES,
  PARTY_SELECT_OPEN_FIELD_FADE_FRAMES,
  PARTY_SELECT_OPEN_MENU_FADE_FRAMES,
  PARTY_SELECT_OPEN_TOTAL_FRAMES,
  advanceBattlePartySelect,
  battlePartyNoEnergyMessage,
  battlePartySelectClosePhase,
  battlePartySelectOpenPhase,
  createBattlePartySelectState,
  partySelectOpenFieldFadeBgY,
  partySelectOpenMenuFadeBgY,
  partySelectOpenMenuFadeObjY,
  renderBattlePartySelect,
  type BattlePartySelectState,
} from "../src/engine/battlePartySelect.ts";
import {
  advanceFactoryRoundPresentation,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv: 31, abilitySlot: (personality & 1) as 0 | 1 };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function liveSelectorParts() {
  const records = [record(664), record(678), record(527)] as const;
  let carrier = createFactoryRoundBattleOrchestrator({
    id: "voluntary-party-render-test",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: 0x12345678,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: records,
      savedRentalRecords: [...records, record(1), record(2), record(3)],
    },
  });
  const commandId = carrier.round.presentation!.command.commandId;
  carrier = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(carrier, { commandId }),
  );
  const battle = carrier.battle!;
  const request = battle.boundary.kind === "decision-required"
    && battle.boundary.request.kind === "command"
    ? battle.boundary.request
    : null;
  if (!request) throw new Error("expected live player command");
  return { request, rulesContext: battle.rules.rulesContext };
}

function liveSelector() {
  const { request, rulesContext } = liveSelectorParts();
  return createBattlePartySelectState(request, rulesContext);
}

describe("voluntary battle party selector", () => {
  it("opens on slot 0, never the active battler's slot (OpenPartyMenuInBattle keepCursorPos=FALSE)", () => {
    // docs/party-menu-rank6-ground-truth.md §2: OpenPartyMenuInBattle
    // (party_menu.c:5774-5779) -> InitPartyMenu(keepCursorPos=FALSE) forces
    // gPartyMenu.slotId = 0 (party_menu.c:524-525), so a party menu opened
    // while the active battler sits on slot 1 still opens the cursor on
    // slot 0 (regression: cursor was activePartyIndex). The forced route's
    // fainted-mon default stays its own pin (partySelect.test.ts).
    const { request, rulesContext } = liveSelectorParts();
    const activeOnSlotOne = Object.freeze({
      ...rulesContext,
      battlers: Object.freeze([
        Object.freeze({ ...rulesContext.battlers[0]!, partyIndex: 1 }),
        rulesContext.battlers[1]!,
        rulesContext.battlers[2]!,
        rulesContext.battlers[3]!,
      ]) as typeof rulesContext.battlers,
    });
    const state = createBattlePartySelectState(request, activeOnSlotOne);
    expect(state.cursor).toBe(0);
    expect(state.rows[0].active).toBe(false);
    expect(state.rows[1].active).toBe(true);
  });

  it("constructs and renders all rows from live noncanonical records and SPECIES_* icons", () => {
    const state = liveSelector();
    expect(state.rows.map((row) => row.speciesKey)).toEqual([
      "SPECIES_GRANBULL",
      "SPECIES_HARIYAMA",
      "SPECIES_MACHAMP",
    ]);
    expect(state.rows.map((row) => row.name)).toEqual(["GRANBULL", "HARIYAMA", "MACHAMP"]);
    expect(state.rows.every((row) => row.maxHP > 0 && row.level === 50)).toBe(true);

    const fb = createFramebuffer();
    renderBattlePartySelect(fb, state);
    const iconRegion = fb.slice((2 * 240 + 0) * 4, (58 * 240 + 144) * 4);
    expect(iconRegion.some((channel) => channel !== 0 && channel !== 255)).toBe(true);
  });

  it("draws the banked pokeball sprite and CANCEL text at the oracle's measured window (ISSUES #80 slice 5)", () => {
    // docs/party-menu-rank6-ground-truth.md §6 addendum: the CANCEL pokeball
    // button window overpaints the baked bg box at x184-237 y134-153. Pins one
    // ball-red pixel and one CANCEL white-ink pixel at oracle-measured spots.
    const state = liveSelector();
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, state);
    const px = (x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    // Ball red (181,66,0) at (190,140); the sprite blits pixel-0 transparent.
    expect(px(190, 140)).toEqual([181, 66, 0]);
    // CANCEL ink white (255,255,255) at (206,141) (sFontColorTable[0] LIGHT_GRAY).
    expect(px(206, 141)).toEqual([255, 255, 255]);
  });

  it("shows the OPEN pokeball frame on the cursor slot and CLOSED elsewhere, following navigation (ISSUES #80 settled band)", () => {
    // AnimatePartySlot (party_menu.c:861-865): the cursor slot gets anim 1
    // (open, sheet rows [32,64)) and every other slot anim 0 (closed).
    // Marker pixels (measured from the oracle match): slot 0's ball at (9,22)
    // and slot 1's at (95,13) are open-orange (247,181,123) on the cursor slot
    // and closed-red (181,66,0) otherwise.
    let state = liveSelector();
    const render = () => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, state);
      const px = (x: number, y: number) => {
        const i = (y * 240 + x) * 4;
        return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
      };
      return { slot0: px(9, 22), slot1: px(95, 13) };
    };
    expect(state.cursor).toBe(0);
    expect(render()).toEqual({ slot0: [247, 181, 123], slot1: [181, 66, 0] });
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe(1);
    expect(render()).toEqual({ slot0: [181, 66, 0], slot1: [247, 181, 123] });
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe("cancel");
    expect(render()).toEqual({ slot0: [181, 66, 0], slot1: [181, 66, 0] });
  });

  it("prints the level line with the ROM's {LV} ligature glyph (0x34=52), not L+v (ISSUES #80 settled band)", () => {
    // gText_LevelSymbol = "{LV}" + digits via DisplayPartyPokemonLevel
    // (party_menu.c:2316-2320). The charmap's `LV = 34` is HEX (charmap.txt:
    // 45), so the ligature is FONT_SMALL glyph 52 (widths[52]=8, cell (4,3) of
    // latin_small.png: the "Lv" ligature). Slot 2's level line (origin
    // (126,44), ink y48-55): the ligature's two "v" strokes are white ink at
    // (130,51) and (132,51). The wrong glyph 34 (decimal) put a lone "v" at
    // x126-130 (shadow at (130,51)) and L+v printed the pair 3px too wide.
    const state = liveSelector();
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, state);
    const px = (x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    expect(px(130, 51)).toEqual([255, 255, 255]);
    expect(px(132, 51)).toEqual([255, 255, 255]);
  });

  it("closes the SEND OUT submenu on the confirm edge (ISSUES #80 slice 6)", () => {
    // docs/party-menu-rank6-ground-truth.md §7: the confirm A lands while the
    // submenu is open; the real menu closes the submenu and starts the fade on
    // the same edge (oracle frame 964 = settled menu, no submenu window).
    let state = liveSelector();
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    state = advanceBattlePartySelect(state, new Set(["A"]));
    expect(state.submenuOpen).toBe(true);
    state = advanceBattlePartySelect(state, new Set(["A"]));
    expect(state.outcome).toMatchObject({ kind: "select", partyIndex: 1 });
    expect(state.submenuOpen).toBe(false);
    expect(state.closeElapsed).toBe(0);
  });

  it("blends the settled menu to black on a mid-fade close frame and holds black (ISSUES #80 slice 6)", () => {
    // Measured close schedule (docs/party-menu-rank6-ground-truth.md §7):
    // menu fade-out 965-978 (standard fade-to-black, y=2..14 held 2 frames),
    // then full black 979-1018. closeElapsed 4 -> the y=4 blend frame; the
    // CANCEL text shadow (115,115,115) at (220,145) becomes blendComponentToBlack
    // (5-bit 14, y=4) = (82,82,82). closeElapsed 30 is inside the black hold.
    const base = liveSelector();
    const px = (fb: Uint8Array, x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    const midFade: BattlePartySelectState = { ...base, closeElapsed: 4 };
    const fadeFb = createFramebuffer();
    renderBattlePartySelect(fadeFb, midFade);
    expect(px(fadeFb, 220, 145)).toEqual([82, 82, 82]);
    const blackHold: BattlePartySelectState = { ...base, closeElapsed: 30 };
    const blackFb = createFramebuffer();
    renderBattlePartySelect(blackFb, blackHold);
    expect(px(blackFb, 220, 145)).toEqual([0, 0, 0]);
    expect(px(blackFb, 4, 4)).toEqual([0, 0, 0]);
    expect(px(blackFb, 236, 156)).toEqual([0, 0, 0]);
  });

  it("blends BG at y_bg and OBJ at y_obj = (closeElapsed-1)&~1 through the close fade (ISSUES #80 open remainder (a))", () => {
    // docs/fade-layer-forensics.md §1: y_bg = closeElapsed & ~1, y_obj =
    // (closeElapsed - 1) & ~1 (the OBJ layer trails the BG by exactly one
    // blend step, objPaletteToggle). Reference pixels: BG CANCEL-window
    // interior (204,140) base (115,90,181); OBJ pokeball red (193,138) base
    // (181,66,0). Expected values are blendComponentToBlack of the base at
    // the table's y.
    const base = liveSelector();
    const px = (fb: Uint8Array, x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    const close = (closeElapsed: number) => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, { ...base, closeElapsed });
      return { bg: px(fb, 204, 140), obj: px(fb, 193, 138) };
    };
    // closeElapsed 2 (frame 965): BG y=2 (99,74,156), OBJ still y=0 (untouched).
    expect(close(2)).toEqual({ bg: [99, 74, 156], obj: [181, 66, 0] });
    // closeElapsed 3 (frame 966): BG y=2, OBJ y=2 (156,57,0).
    expect(close(3)).toEqual({ bg: [99, 74, 156], obj: [156, 57, 0] });
    // closeElapsed 16 (frame 979): BG y=16 (fully black), OBJ one step behind
    // at y=14 (16,8,0) -- the 1559-px OBJ-tail discriminator frame.
    expect(close(16)).toEqual({ bg: [0, 0, 0], obj: [16, 8, 0] });
    // closeElapsed 17 (frame 980): black-hold, both layers black.
    expect(close(17)).toEqual({ bg: [0, 0, 0], obj: [0, 0, 0] });
  });

  it("extends the menu-fade phase by one frame: closeElapsed 16 fades, 17 is the black hold (ISSUES #80 open remainder (a))", () => {
    // The fade now runs closeElapsed 2-16 (frames 965-979) and the black hold
    // starts one frame later at 17 (frame 980), so the total close span (and
    // the 1019-1034 field reveal) is unchanged.
    expect(battlePartySelectClosePhase(1)).toBe("menu-hold");
    expect(battlePartySelectClosePhase(2)).toBe("menu-fade");
    expect(battlePartySelectClosePhase(16)).toBe("menu-fade");
    expect(battlePartySelectClosePhase(17)).toBe("black-hold");
    expect(battlePartySelectClosePhase(55)).toBe("black-hold");
    expect(battlePartySelectClosePhase(56)).toBe("field-reveal");
    expect(PARTY_SELECT_CLOSE_MENU_FADE_FRAMES).toBe(15);
    expect(PARTY_SELECT_CLOSE_BLACK_HOLD_FRAMES).toBe(39);
    expect(PARTY_SELECT_CLOSE_MENU_FRAMES).toBe(72);
    expect(PARTY_SELECT_CLOSE_TOTAL_FRAMES).toBe(81);
  });

  it("maps the open phases to the measured openElapsed boundaries (ISSUES #80 open remainder (b))", () => {
    // docs/fade-layer-forensics.md §6(g): bright-hold 0-2 (frames 763-765),
    // field-fade-out 3-18 (766-781), black-hold 19-45 (782-808),
    // menu-fade-in 46-61 (809-824), done 62+ (825+).
    expect(battlePartySelectOpenPhase(0)).toBe("bright-hold");
    expect(battlePartySelectOpenPhase(2)).toBe("bright-hold");
    expect(battlePartySelectOpenPhase(3)).toBe("field-fade-out");
    expect(battlePartySelectOpenPhase(18)).toBe("field-fade-out");
    expect(battlePartySelectOpenPhase(19)).toBe("black-hold");
    expect(battlePartySelectOpenPhase(45)).toBe("black-hold");
    expect(battlePartySelectOpenPhase(46)).toBe("menu-fade-in");
    expect(battlePartySelectOpenPhase(61)).toBe("menu-fade-in");
    expect(battlePartySelectOpenPhase(62)).toBe("done");
    expect(PARTY_SELECT_OPEN_BRIGHT_HOLD_FRAMES).toBe(3);
    expect(PARTY_SELECT_OPEN_FIELD_FADE_FRAMES).toBe(16);
    expect(PARTY_SELECT_OPEN_BLACK_HOLD_FRAMES).toBe(27);
    expect(PARTY_SELECT_OPEN_MENU_FADE_FRAMES).toBe(16);
    expect(PARTY_SELECT_OPEN_TOTAL_FRAMES).toBe(62);
  });

  it("blends the open window's field fade-out at y_bg and the menu fade-in at the §2 per-layer coefficients (ISSUES #80 open remainder (b))", () => {
    // Field fade-out §6(b): y_bg(e) = min(16, 2*max(0,floor((e-1)/2))) --
    // (2,0) at e=3, (2,2) at e=4, (4,2) at e=5, ... (16,14) at e=17, (16,16)
    // at e=18. Menu fade-in §2, m = e-46: y_bg(m)=14-2*floor(m/2),
    // y_obj(m)=16-2*floor((m+1)/2) -- (14,16) at m=0, (14,14) at m=1,
    // (12,14) at m=2, ... (0,2) at m=14, (0,0) at m=15.
    expect(partySelectOpenFieldFadeBgY(3)).toBe(2);
    expect(partySelectOpenFieldFadeBgY(4)).toBe(2);
    expect(partySelectOpenFieldFadeBgY(5)).toBe(4);
    expect(partySelectOpenFieldFadeBgY(17)).toBe(16);
    expect(partySelectOpenFieldFadeBgY(18)).toBe(16);
    expect(partySelectOpenMenuFadeBgY(0)).toBe(14);
    expect(partySelectOpenMenuFadeObjY(0)).toBe(16);
    expect(partySelectOpenMenuFadeBgY(1)).toBe(14);
    expect(partySelectOpenMenuFadeObjY(1)).toBe(14);
    expect(partySelectOpenMenuFadeBgY(2)).toBe(12);
    expect(partySelectOpenMenuFadeObjY(2)).toBe(14);
    expect(partySelectOpenMenuFadeBgY(14)).toBe(0);
    expect(partySelectOpenMenuFadeObjY(14)).toBe(2);
    expect(partySelectOpenMenuFadeBgY(15)).toBe(0);
    expect(partySelectOpenMenuFadeObjY(15)).toBe(0);
  });

  it("increments openElapsed alongside elapsed and renders a field-fade-out open frame black-free when assets are absent (ISSUES #80 open remainder (b))", () => {
    // The openElapsed clock mirrors closeElapsed: starts at 0 on creation and
    // advances every tick. Rendering without assets (forced snapshots) must
    // keep drawing the settled menu, never the open animation.
    const base = liveSelector();
    expect(base.openElapsed).toBe(0);
    const advanced = advanceBattlePartySelect(base, new Set());
    expect(advanced.elapsed).toBe(1);
    expect(advanced.openElapsed).toBe(1);
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, { ...base, openElapsed: 10 });
    // No assets supplied: the settled menu renders (open animation skipped).
    const px = (x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    expect(px(190, 140)).toEqual([181, 66, 0]);
  });

  it("follows the source single-layout cursor edges, including Cancel", () => {
    let state = liveSelector();
    state = advanceBattlePartySelect(state, new Set(["UP"]));
    expect(state.cursor).toBe("cancel");
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe(0);
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe(1);
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe(2);
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe("cancel");
    state = advanceBattlePartySelect(state, new Set(["UP"]));
    expect(state.cursor).toBe(2);
    state = advanceBattlePartySelect(state, new Set(["LEFT"]));
    expect(state.cursor).toBe(0);
    state = advanceBattlePartySelect(state, new Set(["RIGHT"]));
    expect(state.cursor).toBe(2);
  });

  it("swaps the message window to the 16x2 sDoWhatWithMonMsgWindowTemplate on the submenu-open edge and keeps it through the close (ISSUES #80 (c))", () => {
    // docs/fade-layer-forensics.md §7(b): sDoWhatWithMonMsgWindowTemplate
    // (data/party_menu.h:430-439) is 16x2 -> px (8,136)-(136,152) with the
    // frame bevel at x141, while the settled sDefaultPartyMsgWindowTemplate is
    // 21x2 with the frame out to x182 (x141 is still its interior). The swap
    // stays live through the close fade (the confirm edge sets closeElapsed,
    // which keeps the swapped message window while the submenu window closes).
    const renderAt141 = (over: Partial<BattlePartySelectState>): readonly [number, number, number] => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, { ...liveSelector(), ...over });
      const i = (140 * 240 + 141) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    // Settled: (141,140) is the 21x2 interior's white.
    expect(renderAt141({})).toEqual([255, 255, 255]);
    // Submenu open: (141,140) is the 16x2 frame's dark-purple bevel.
    expect(renderAt141({ submenuOpen: true, submenuOpened: true })).toEqual([74, 74, 107]);
    // Close started (submenu window closed, message window still swapped).
    expect(renderAt141({ submenuOpen: false, closeElapsed: 0, submenuOpened: true })).toEqual([74, 74, 107]);
  });

  it("suppresses the CANCEL pokeball window while the submenu covers it and restores it on the close (ISSUES #80 (c))", () => {
    const ballAt = (over: Partial<BattlePartySelectState>): readonly [number, number, number] => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, { ...liveSelector(), ...over });
      const i = (140 * 240 + 190) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    // Settled: the CANCEL pokeball red is at (190,140).
    expect(ballAt({})).toEqual([181, 66, 0]);
    // Submenu open: the SEND OUT submenu window replaces the CANCEL button.
    expect(ballAt({ submenuOpen: true, submenuOpened: true })).not.toEqual([181, 66, 0]);
    // Close started: the submenu window closes and the CANCEL button returns.
    expect(ballAt({ submenuOpen: false, closeElapsed: 0, submenuOpened: true })).toEqual([181, 66, 0]);
  });

  it("renders the {PKMN} tail with the ROM's ligature glyph codes 83/84/172 (ISSUES #80 (c))", () => {
    // gText_DoWhatWithPokemon = "Do what with this {PKMN}?" (strings.c:434).
    // The charmap encodes {PKMN} as the two ligature glyph bytes 0x53/0x54 and
    // the trailing "?" as 0xAC (172) -- NOT a nickname splice
    // (docs/fade-layer-forensics.md §7(c), supervisor-resolved).
    expect(DO_WHAT_WITH_MON_TAIL_CODES).toEqual([83, 84, 172]);
    // The swapped message's tail ink matches the oracle's measured 164 px at
    // x100-121 y138-152 (docs/fade-layer-forensics.md §7(c)).
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, { ...liveSelector(), submenuOpen: true, submenuOpened: true });
    let ink = 0;
    for (let y = 138; y <= 152; y += 1) for (let x = 100; x <= 121; x += 1) {
      const i = (y * 240 + x) * 4;
      const c = [fb[i]!, fb[i + 1]!, fb[i + 2]!];
      if ((c[0] === 214 && c[1] === 214 && c[2] === 206) || (c[0] === 99 && c[1] === 99 && c[2] === 99)) ink += 1;
    }
    expect(ink).toBe(164);
  });

  it("prints the source fainted-row refusal and remains in the selector", () => {
    const base = liveSelector();
    const faintedRow = Object.freeze({
      ...base.rows[1],
      hp: 0,
      fainted: true,
      legal: false,
    });
    let state: BattlePartySelectState = {
      ...base,
      rows: Object.freeze([base.rows[0], faintedRow, base.rows[2]]) as typeof base.rows,
      cursor: 1 as const,
    };
    state = advanceBattlePartySelect(state, new Set(["A"]));
    state = advanceBattlePartySelect(state, new Set(["A"]));
    expect(state.message).toBe("HARIYAMA has no energy\nleft to battle!");
    expect(state.message).toBe(battlePartyNoEnergyMessage(faintedRow));
    expect(state.outcome).toBeNull();
    expect(state.submenuOpen).toBe(false);
    expect(advanceBattlePartySelect(state, new Set()).message).toBe(state.message);
  });
});
