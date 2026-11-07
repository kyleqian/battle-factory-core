import { describe, expect, it } from "vitest";
import { createFramebuffer, setPixel } from "../src/engine/framebuffer.ts";
import {
  DO_WHAT_WITH_MON_TAIL_CODES,
  PARTY_SELECT_CLOSE_BLACK_HOLD_FRAMES,
  PARTY_SELECT_CLOSE_MENU_FADE_FRAMES,
  PARTY_SELECT_CLOSE_MENU_FRAMES,
  PARTY_SELECT_CLOSE_TOTAL_FRAMES,
  PARTY_SELECT_OPEN_BACK_SPRITE_Y2_START,
  PARTY_SELECT_OPEN_BLACK_HOLD_FRAMES,
  PARTY_SELECT_OPEN_BRIGHT_HOLD_FRAMES,
  PARTY_SELECT_OPEN_FIELD_FADE_FRAMES,
  PARTY_SELECT_OPEN_HEALTHBOX_Y2_START,
  PARTY_SELECT_OPEN_MENU_FADE_FRAMES,
  PARTY_SELECT_OPEN_TOTAL_FRAMES,
  advanceBattlePartySelect,
  battlePartyNoEnergyMessage,
  battlePartySelectClosePhase,
  battlePartySelectOpenPhase,
  createBattlePartySelectState,
  partyMenuAilment,
  primaryStatusFromStatus1,
  partySelectOpenFieldFadeBgY,
  partySelectOpenFieldFadeObjY,
  partySelectOpenMenuFadeBgY,
  partySelectOpenMenuFadeObjY,
  renderBattlePartySelect,
  SUBMENU_OPEN_VISUAL_DELAY,
  type BattlePartySelectState,
  type PartySelectCloseRenderAssets,
} from "../src/engine/battlePartySelect.ts";
import { IDENTITY_BATTLE_PARTY_ORDER, switchPartyOrder } from "../src/engine/battlePartyOrder.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { renderGeneratedBattleCommandPresentation } from "../src/engine/battleScene.ts";
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

/** Idles the menu through its open palette fade: input is ignored until it ends (party_menu.c:1259-1261). */
function settleOpenFade(state: BattlePartySelectState): BattlePartySelectState {
  let next = state;
  for (let i = 0; i < PARTY_SELECT_OPEN_TOTAL_FRAMES; i += 1) next = advanceBattlePartySelect(next, new Set());
  return next;
}

function liveSelector() {
  const { request, rulesContext } = liveSelectorParts();
  return settleOpenFade(createBattlePartySelectState(request, rulesContext));
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

  it("lists rows in the ROM's battle order after a 0 -> 2 switch and maps the cursor row back to the raw party index", () => {
    const { request, rulesContext } = liveSelectorParts();
    const switched = Object.freeze({
      ...rulesContext,
      battlers: Object.freeze([
        Object.freeze({ ...rulesContext.battlers[0]!, partyIndex: 2 }),
        rulesContext.battlers[1]!,
        rulesContext.battlers[2]!,
        rulesContext.battlers[3]!,
      ]) as typeof rulesContext.battlers,
    });
    const order = switchPartyOrder(IDENTITY_BATTLE_PARTY_ORDER, 0, 2);
    const state = settleOpenFade(createBattlePartySelectState(request, switched, order));
    expect(state.cursor).toBe(0);
    expect(state.rows.map((row) => [row.partyIndex, row.slot, row.active])).toEqual([[2, 0, true], [1, 1, false], [0, 2, false]]);
    expect(state.rows.map((row) => row.speciesKey)).toEqual(["SPECIES_MACHAMP", "SPECIES_HARIYAMA", "SPECIES_GRANBULL"]);
    const down = advanceBattlePartySelect(state, new Set(["DOWN", "DOWN"] as const));
    expect(down.cursor).toBe(1);
    let selected = advanceBattlePartySelect(advanceBattlePartySelect(down, new Set(["A"])), new Set(["A"]));
    for (let i = 0; i < 4 && selected.outcome === null; i += 1) selected = advanceBattlePartySelect(selected, new Set(["A"]));
    expect(selected.outcome).toEqual({ kind: "select", partyIndex: 1 });
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

  it("GetMonAilment: 0 HP is FNT before any status; PSN/PRZ/SLP/FRZ/BRN follow in the ROM's order (ISSUES #190)", () => {
    // party_menu.c:1909-1936. status1 bits: SLP 0-2, PSN 3, BRN 4, FRZ 5, PAR 6, TOXIC 7.
    expect(primaryStatusFromStatus1(0)).toBeNull();
    expect(primaryStatusFromStatus1(1 << 3)).toBe("poison");
    expect(primaryStatusFromStatus1(1 << 7)).toBe("poison");
    expect(primaryStatusFromStatus1(1 << 6)).toBe("paralyzed");
    expect(primaryStatusFromStatus1(2)).toBe("sleep");
    expect(primaryStatusFromStatus1(1 << 5)).toBe("frozen");
    expect(primaryStatusFromStatus1(1 << 4)).toBe("burn");
    expect(partyMenuAilment(10, primaryStatusFromStatus1(1 << 4))).toBe("burn");
    expect(partyMenuAilment(0, primaryStatusFromStatus1(1 << 4))).toBe("faint");
    expect(partyMenuAilment(0, null)).toBe("faint");
    expect(partyMenuAilment(1, null)).toBeNull();
  });

  it("prints the level for AILMENT_NONE and draws the status icon in its place for every other ailment, FNT included (ISSUES #190)", () => {
    // DisplayPartyPokemonLevelCheck (party_menu.c:2300-2313) + SetPartyMonAilmentGfx
    // (4203-4220): the 32x8 icon sits at sPartyMenuSpriteCoords' status center.
    const base = liveSelector();
    const renderWith = (status: Parameters<typeof partyMenuAilment>[1], hp: number) => {
      const rows = base.rows.map((row, i) => (i === 2 ? { ...row, hp, status: partyMenuAilment(hp, status) } : row)) as unknown as BattlePartySelectState["rows"];
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, { ...base, rows });
      return fb;
    };
    const px = (fb: Uint8Array, x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return `${fb[i]},${fb[i + 1]},${fb[i + 2]}`;
    };
    const levelInk = [[130, 51], [132, 51]] as const;
    const none = renderWith(null, 100);
    expect(levelInk.map(([x, y]) => px(none, x, y))).toEqual(["255,255,255", "255,255,255"]);
    const icons = new Map<string, string>();
    for (const [name, status] of [["poison", "poison"], ["paralyzed", "paralyzed"], ["sleep", "sleep"], ["frozen", "frozen"], ["burn", "burn"], ["faint", null]] as const) {
      const fb = renderWith(status, name === "faint" ? 0 : 100);
      // Level text gone: the ligature's white strokes are no longer there.
      expect(levelInk.map(([x, y]) => px(fb, x, y)), name).not.toEqual(["255,255,255", "255,255,255"]);
      let differing = 0;
      const key: string[] = [];
      for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
        if (px(fb, x, y) !== px(none, x, y)) { differing += 1; key.push(px(fb, x, y)); }
      }
      expect(differing, name).toBeGreaterThan(0);
      icons.set(name, key.join("|"));
    }
    expect(new Set(icons.values()).size).toBe(6);
  });

  it("closes the SHIFT submenu on the confirm edge, one frame after it lands (ISSUES #80 slice 6 + submenu bind)", () => {
    // docs/fade-layer-forensics.md §10(e): the confirm A lands while the
    // submenu is open; the real menu keeps the submenu window rendered through
    // the confirm tick (oracle frame 963, closeElapsed 0) and drops it on the
    // next frame (oracle frame 964 = settled menu, no submenu window). So
    // submenuOpen stays true at closeElapsed 0 and is flipped by the render's
    // submenuVisible gate from closeElapsed 1.
    let state = liveSelector();
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    state = advanceBattlePartySelect(state, new Set(["A"]));
    expect(state.submenuOpen).toBe(true);
    state = advanceBattlePartySelect(state, new Set(["A"]));
    expect(state.outcome).toMatchObject({ kind: "select", partyIndex: 1 });
    expect(state.submenuOpen).toBe(true);
    expect(state.closeElapsed).toBe(0);
    state = advanceBattlePartySelect(state, new Set());
    expect(state.submenuOpen).toBe(true);
    expect(state.closeElapsed).toBe(1);
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

  it("blends the open window's field fade-out at the per-layer (y_bg, y_obj) pair and the menu fade-in at the §2 per-layer coefficients (ISSUES #80 open remainder (b) + Class A)", () => {
    // Field fade-out §6(b): y_bg(e) = min(16, 2*max(0,floor((e-1)/2))) and the
    // OBJ layer one blend step behind, y_obj(e) = min(16, 2*max(0,floor((e-2)/2)))
    // -- (2,0) at e=3, (2,2) at e=4, (4,2) at e=5, ... (16,14) at e=17, (16,16)
    // at e=18. Menu fade-in §2, m = e-46: y_bg(m)=14-2*floor(m/2),
    // y_obj(m)=16-2*floor((m+1)/2) -- (14,16) at m=0, (14,14) at m=1,
    // (12,14) at m=2, ... (0,2) at m=14, (0,0) at m=15.
    expect(partySelectOpenFieldFadeBgY(3)).toBe(2);
    expect(partySelectOpenFieldFadeObjY(3)).toBe(0);
    expect(partySelectOpenFieldFadeBgY(4)).toBe(2);
    expect(partySelectOpenFieldFadeObjY(4)).toBe(2);
    expect(partySelectOpenFieldFadeBgY(5)).toBe(4);
    expect(partySelectOpenFieldFadeObjY(5)).toBe(2);
    expect(partySelectOpenFieldFadeBgY(6)).toBe(4);
    expect(partySelectOpenFieldFadeObjY(6)).toBe(4);
    expect(partySelectOpenFieldFadeBgY(17)).toBe(16);
    expect(partySelectOpenFieldFadeObjY(17)).toBe(14);
    expect(partySelectOpenFieldFadeBgY(18)).toBe(16);
    expect(partySelectOpenFieldFadeObjY(18)).toBe(16);
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

  it("blends the settled battle scene's BG at y_bg and its OBJ layer at y_obj through the open field fade-out (ISSUES #80 Class A)", () => {
    // The open fade-out scene (oracle 766-781) is the settled action-menu
    // battle scene. Its OBJ layer is one blend step behind the BG on the even
    // `e` frames (766/768/.../780), so a whole-frame blend cannot be right
    // there. Fake assets draw a BG pixel (white) and an OBJ pixel (pokeball
    // red) so the two layers are distinguishable; `drawBattleSceneObjOnly`
    // reproduces just the OBJ pixel. Reference colors match the §1/§6 tables:
    // white at y=2 = (222,222,222), red at y=0 = (181,66,0), red at y=2 =
    // (156,57,0) (docs/fade-layer-forensics.md §6(b)).
    const base = liveSelector();
    const BG_PX = [10, 10] as const;
    const OBJ_PX = [10, 20] as const;
    const assets: PartySelectCloseRenderAssets = {
      drawField: () => {},
      drawBattleScene(fb: Uint8Array): void {
        setPixel(fb, BG_PX[0], BG_PX[1], 255, 255, 255);
        setPixel(fb, OBJ_PX[0], OBJ_PX[1], 181, 66, 0);
      },
      drawBattleSceneObjOnly(fb: Uint8Array): void {
        setPixel(fb, OBJ_PX[0], OBJ_PX[1], 181, 66, 0);
      },
    };
    const px = (fb: Uint8Array, x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    const renderAt = (openElapsed: number) => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, { ...base, openElapsed }, assets);
      return { bg: px(fb, BG_PX[0], BG_PX[1]), obj: px(fb, OBJ_PX[0], OBJ_PX[1]) };
    };
    // e=3 (frame 766): BG at y_bg=2, OBJ untouched at y_obj=0.
    expect(renderAt(3)).toEqual({ bg: [222, 222, 222], obj: [181, 66, 0] });
    // e=4 (frame 767): both layers at y=2 (whole-frame blend path).
    expect(renderAt(4)).toEqual({ bg: [222, 222, 222], obj: [156, 57, 0] });
    // e=5 (frame 768): BG at y_bg=4, OBJ one step behind at y_obj=2.
    expect(renderAt(5)).toEqual({ bg: [189, 189, 189], obj: [156, 57, 0] });
    // e=6 (frame 769): both layers at y=4.
    expect(renderAt(6)).toEqual({ bg: [189, 189, 189], obj: [132, 49, 0] });
  });

  it("draws the player healthbox one row lower from openElapsed 7 and the player back sprite one row higher from openElapsed 16 (ISSUES #80 Class B)", () => {
    // docs/fade-layer-forensics.md §9 (RAM probe): the healthbox sprite's real
    // `y2` steps 0→1 at oracle frame 770 (openElapsed 7) and the back sprite's
    // real `y2` steps 1→0 at frame 779 (openElapsed 16). Both are draw-origin
    // offsets gated on `openElapsed` inside the open scene draw, so each
    // sprite's own edges/bevel/slanted corner move with it. Rendered at the
    // settled (unfaded) scene: the shifted render's content at row Y+1 (healthbox)
    // / row Y-1 (back sprite) equals the unshifted render's content at row Y.
    const { request, rulesContext } = liveSelectorParts();
    const presentation = createBattleCommandPresentation(request, rulesContext);
    const actionMenu = Object.freeze({
      ...presentation,
      lifecycle: Object.freeze({
        phase: "action-menu",
        phaseElapsed: presentation.lifecycle.phaseElapsed,
      }),
    });
    const renderAt = (openElapsed: number): Uint8Array => {
      const fb = createFramebuffer();
      renderGeneratedBattleCommandPresentation(fb, actionMenu, "all", openElapsed);
      return fb;
    };
    const px = (fb: Uint8Array, x: number, y: number): readonly [number, number, number] => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    expect(PARTY_SELECT_OPEN_HEALTHBOX_Y2_START).toBe(7);
    expect(PARTY_SELECT_OPEN_BACK_SPRITE_Y2_START).toBe(16);
    // Healthbox top-frame row: at openElapsed 6 it sits at row 74; at 7 it is
    // drawn one row lower -- row 74 shows the floor above it and row 75 shows
    // the frame row 74 had.
    expect(px(renderAt(6), 139, 74)).toEqual([123, 148, 132]);
    expect(px(renderAt(7), 139, 75)).toEqual([123, 148, 132]);
    expect(px(renderAt(7), 139, 74)).not.toEqual([123, 148, 132]);
    // Back sprite ear tip: at openElapsed 15 the sprite's first body row is at
    // 59; at 16 it is drawn one row higher -- the ear-tip pixel now sits at 58.
    expect(px(renderAt(15), 86, 58)).toEqual([247, 247, 255]);
    expect(px(renderAt(16), 86, 58)).not.toEqual([247, 247, 255]);
    expect(px(renderAt(16), 86, 58)).toEqual(px(renderAt(15), 86, 59));
  });

  it("increments openElapsed alongside elapsed and renders a field-fade-out open frame black-free when assets are absent (ISSUES #80 open remainder (b))", () => {
    // The openElapsed clock mirrors closeElapsed: starts at 0 on creation and
    // advances every tick. Rendering without assets (forced snapshots) must
    // keep drawing the settled menu, never the open animation.
    const base = liveSelector();
    expect(base.openElapsed).toBe(PARTY_SELECT_OPEN_TOTAL_FRAMES);
    const advanced = advanceBattlePartySelect(base, new Set());
    expect(advanced.elapsed).toBe(base.elapsed + 1);
    expect(advanced.openElapsed).toBe(base.openElapsed + 1);
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, { ...base, openElapsed: 10 });
    // No assets supplied: the settled menu renders (open animation skipped).
    const px = (x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    expect(px(190, 140)).toEqual([181, 66, 0]);
  });

  it("ignores every key until the open palette fade finishes (Task_HandleChooseMonInput needs !gPaletteFade.active, party_menu.c:1259-1261)", () => {
    const { request, rulesContext } = liveSelectorParts();
    let state = createBattlePartySelectState(request, rulesContext);
    const fresh = state;
    for (let i = 0; i < PARTY_SELECT_OPEN_TOTAL_FRAMES; i += 1) {
      for (const key of ["DOWN", "UP", "A", "B", "RIGHT"] as const) {
        const pressed = advanceBattlePartySelect(state, new Set([key]));
        expect(pressed.cursor).toBe(fresh.cursor);
        expect(pressed.submenuOpen).toBe(false);
        expect(pressed.outcome).toBeNull();
      }
      state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    }
    expect(state.openElapsed).toBe(PARTY_SELECT_OPEN_TOTAL_FRAMES);
    expect(state.cursor).toBe(fresh.cursor);
    expect(advanceBattlePartySelect(state, new Set(["UP"])).cursor).toBe("cancel");
  });

  it("keeps a refusal message up until the printer is done and a press lands (TextPrinterWait, text.c:884-899)", () => {
    let state = liveSelector();
    const active = state.rows.findIndex((row) => row.active) as 0 | 1 | 2;
    while (state.cursor !== active) state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    state = advanceBattlePartySelect(state, new Set(["A"]));
    state = advanceBattlePartySelect(state, new Set(["A"]));
    const message = state.message!;
    expect(message).not.toBeNull();
    const printed = message.replaceAll("\n", "").length;
    for (let i = 0; i < printed; i += 1) {
      state = advanceBattlePartySelect(state, new Set([i % 2 === 0 ? "A" : "B"]));
      expect(state.message).toBe(message);
    }
    state = advanceBattlePartySelect(state, new Set(["B"]));
    for (let i = 0; i < 3; i += 1) {
      state = advanceBattlePartySelect(state, new Set());
      expect(state.message).toBe(message);
    }
    state = advanceBattlePartySelect(state, new Set());
    expect(state.message).toBeNull();
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

  it("refuses SHIFT on the active battler's own row with 'is already in battle!' instead of a silent no-op (TrySwitchInPokemon)", () => {
    let state = liveSelector();
    const active = state.rows.findIndex((row) => row.active) as 0 | 1 | 2;
    expect(state.rows[active].legal).toBe(false);
    expect(state.rows[active].fainted).toBe(false);
    while (state.cursor !== active) state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    state = advanceBattlePartySelect(state, new Set(["A"]));
    expect(state.submenuOpen).toBe(true);
    state = advanceBattlePartySelect(state, new Set(["A"]));
    const name = state.rows[active].name;
    expect(state).toMatchObject({ submenuOpen: false, outcome: null, message: `${name} is already\nin battle!` });
    // TextPrinterWait ignores A until the last glyph is out, then the window clears 4 frames after the accepted press.
    expect(advanceBattlePartySelect(state, new Set(["A"]))).toMatchObject({ message: `${name} is already\nin battle!` });
    for (let i = 0; i < 40; i += 1) state = advanceBattlePartySelect(state, new Set());
    state = advanceBattlePartySelect(state, new Set(["A"]));
    for (let i = 0; i < 4; i += 1) state = advanceBattlePartySelect(state, new Set());
    expect(state).toMatchObject({ message: null, cursor: active, outcome: null });
  });

  it("right-aligns the current HP in a three-character field (DisplayPartyPokemonHP, STR_CONV_MODE_RIGHT_ALIGN 3): one slash, never two", () => {
    // Slot 1's card: hp text origin (198,20), max HP "/137" at (213,20); FONT_SMALL digits, the slash and CHAR_SPACER are 5 px.
    const base = liveSelector();
    const withHp = (hp: number) => ({ ...base, rows: base.rows.map((row, i) => (i === 1 ? { ...row, hp, maxHP: 137 } : row)) as unknown as typeof base.rows });
    const render = (hp: number) => { const fb = createFramebuffer(); renderBattlePartySelect(fb, withHp(hp)); return fb; };
    // Glyph ink rows 23..30 (the HP bar sits above, rows 18-21, and its fill changes with the HP).
    const block = (fb: Uint8Array, x0: number, x1: number) => {
      const out: number[] = [];
      for (let y = 23; y < 32; y += 1) for (let x = x0; x < x1; x += 1) { const o = (y * 240 + x) * 4; out.push(fb[o]!, fb[o + 1]!, fb[o + 2]!); }
      return out;
    };
    const full = render(137), two = render(40), one = render(4);
    // The slash column (+15..+19) is the same whatever the digit count: the current HP's "/" lands on the max HP's "/".
    expect(block(two, 213, 218)).toEqual(block(full, 213, 218));
    expect(block(one, 213, 218)).toEqual(block(full, 213, 218));
    // "40" sits at +5..+14 and "4" at +10..+14: the "4" of "40" equals the "4" of "4" shifted right by one cell.
    expect(block(two, 203, 208)).toEqual(block(one, 208, 213));
    // The padding cells are blank (no white ink): +0..+4 for "40", +0..+9 for "4".
    const hasInk = (fb: Uint8Array, x0: number, x1: number) => block(fb, x0, x1).some((v, i) => i % 3 === 0 && v === 255 && block(fb, x0, x1)[i + 1] === 255 && block(fb, x0, x1)[i + 2] === 255);
    expect(hasInk(two, 198, 203)).toBe(false);
    expect(hasInk(one, 198, 208)).toBe(false);
    expect(hasInk(full, 198, 203)).toBe(true);
    expect(hasInk(two, 203, 213)).toBe(true);
  });

  it("highlights the CANCEL button while the cursor is on it (AnimatePartySlot PARTY_SIZE+1: bank 2 + the open ball) and prints no marker in the prompt box", () => {
    const base = liveSelector();
    const idle = createFramebuffer();
    renderBattlePartySelect(idle, base);
    const onCancel = createFramebuffer();
    renderBattlePartySelect(onCancel, { ...base, cursor: "cancel" });
    const px = (fb: Uint8Array, x: number, y: number) => { const o = (y * 240 + x) * 4; return [fb[o], fb[o + 1], fb[o + 2]]; };
    // Interior (colour 15) and frame (colour 1) take bank 2's colours; the checkerboard rows stay.
    expect(px(idle, 210, 140)).toEqual([115, 90, 181]);
    expect(px(onCancel, 210, 140)).toEqual([165, 115, 247]);
    expect(px(idle, 220, 136)).toEqual([74, 74, 99]);
    expect(px(onCancel, 220, 136)).toEqual([255, 115, 49]);
    expect(px(onCancel, 184, 134)).toEqual(px(idle, 184, 134));
    // The ball shows its open frame: the 16x16 ball footprint differs from the closed one.
    const ball = (fb: Uint8Array) => { const out: number[] = []; for (let y = 136; y < 152; y += 1) for (let x = 186; x < 202; x += 1) out.push(...px(fb, x, y) as number[]); return out; };
    expect(ball(onCancel)).not.toEqual(ball(idle));
    // Nothing is printed under the "Choose a POKéMON." box: the former "▶ CANCEL" marker region (x 168-200, y 145-156) is unchanged.
    const region = (fb: Uint8Array) => { const out: number[] = []; for (let y = 145; y < 157; y += 1) for (let x = 168; x < 184; x += 1) out.push(...px(fb, x, y) as number[]); return out; };
    expect(region(onCancel)).toEqual(region(idle));
  });

  it("colours a fainted box orange-brown, the fainted cursor slot pink, the living cursor slot light blue (LoadPartyBoxPalette, GetPartyBoxPaletteFlags)", () => {
    const base = liveSelector();
    const faintedRow1 = { ...base, rows: base.rows.map((row, i) => (i === 1 ? { ...row, hp: 0, fainted: true } : row)) as unknown as typeof base.rows };
    const colorsIn = (fb: Uint8Array, x0: number, y0: number, x1: number, y1: number) => {
      const seen = new Set<string>();
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { const o = (y * 240 + x) * 4; seen.add(`${fb[o]},${fb[o + 1]},${fb[o + 2]}`); }
      return seen;
    };
    // Slot 1's wide box: x 96..239, y 8..31 (the wide box tiles use palette colours 4 and 5; 6 is the main box's).
    const unselected = createFramebuffer();
    renderBattlePartySelect(unselected, faintedRow1);
    const box = colorsIn(unselected, 96, 8, 240, 32);
    expect(box.has("214,165,33") && box.has("198,107,16")).toBe(true);
    expect(box.has("181,255,165") || box.has("123,222,132")).toBe(false);
    const selected = createFramebuffer();
    renderBattlePartySelect(selected, { ...faintedRow1, cursor: 1 });
    const selBox = colorsIn(selected, 96, 8, 240, 32);
    expect(selBox.has("255,214,222") && selBox.has("255,189,148")).toBe(true);
    expect(selBox.has("173,239,255") || selBox.has("214,165,33")).toBe(false);
    const living = createFramebuffer();
    renderBattlePartySelect(living, { ...base, cursor: 2 });
    const livingBox = colorsIn(living, 96, 32, 240, 56);
    expect(livingBox.has("173,239,255") && livingBox.has("123,214,239")).toBe(true);
    expect(livingBox.has("214,165,33") || livingBox.has("255,214,222")).toBe(false);
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
    expect(renderAt141({ submenuOpen: true, submenuOpened: true, submenuOpenElapsed: SUBMENU_OPEN_VISUAL_DELAY })).toEqual([74, 74, 107]);
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
    expect(ballAt({ submenuOpen: true, submenuOpened: true, submenuOpenElapsed: SUBMENU_OPEN_VISUAL_DELAY })).not.toEqual([181, 66, 0]);
    // Close started: the submenu window closes and the CANCEL button returns.
    expect(ballAt({ submenuOpen: false, closeElapsed: 0, submenuOpened: true })).toEqual([181, 66, 0]);
  });

  it("holds the pre-open state 3 frames after the A-press and pops the submenu on the third frame (ISSUES #80 open edge)", () => {
    // docs/fade-layer-forensics.md §10(d): the A-press edge sets `submenuOpen`
    // (the state rendered at oracle frame 923), but frames 923-925 still show
    // the pre-open state -- wide "Choose a POKéMON." window + CANCEL button --
    // and the full SHIFT/SUMMARY/CANCEL window + swapped 16x2 message window
    // land together at frame 926 (`submenuOpenElapsed` 3). So the submenu
    // visuals must be absent at `submenuOpenElapsed` 0/1/2 and present at 3.
    const at141 = (elapsed: number): readonly [number, number, number] => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, {
        ...liveSelector(),
        submenuOpen: true,
        submenuOpened: true,
        submenuOpenElapsed: elapsed,
      });
      const i = (140 * 240 + 141) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    const ballAt = (elapsed: number): readonly [number, number, number] => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, {
        ...liveSelector(),
        submenuOpen: true,
        submenuOpened: true,
        submenuOpenElapsed: elapsed,
      });
      const i = (140 * 240 + 190) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    const frameAt = (elapsed: number): readonly [number, number, number] => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, {
        ...liveSelector(),
        submenuOpen: true,
        submenuOpened: true,
        submenuOpenElapsed: elapsed,
      });
      const i = (110 * 240 + 145) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    // Pre-open hold: 21x2 wide-window interior white at (141,140), CANCEL
    // pokeball red at (190,140), no action-window frame outline at (145,110).
    for (const elapsed of [0, 1, 2]) {
      expect(at141(elapsed)).toEqual([255, 255, 255]);
      expect(ballAt(elapsed)).toEqual([181, 66, 0]);
      expect(frameAt(elapsed)).not.toEqual([41, 49, 49]);
    }
    // Third frame after the A-press: 16x2 swapped-window bevel at (141,140),
    // submenu window replaces the CANCEL button, action-window frame outline
    // present.
    expect(SUBMENU_OPEN_VISUAL_DELAY).toBe(3);
    expect(at141(SUBMENU_OPEN_VISUAL_DELAY)).toEqual([74, 74, 107]);
    expect(ballAt(SUBMENU_OPEN_VISUAL_DELAY)).not.toEqual([181, 66, 0]);
    expect(frameAt(SUBMENU_OPEN_VISUAL_DELAY)).toEqual([41, 49, 49]);
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
    renderBattlePartySelect(fb, { ...liveSelector(), submenuOpen: true, submenuOpened: true, submenuOpenElapsed: SUBMENU_OPEN_VISUAL_DELAY });
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
