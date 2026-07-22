import { describe, expect, it } from "vitest";
import { advancePartySelect, fullPartyIconFrame, INITIAL_PARTY_SELECT_STATE, onixSelectedHopY2, partyMenuLayers, PARTY_ENTRY_BLACK_START, PARTY_ENTRY_FADE_IN_START, PARTY_ENTRY_FADE_OUT_START, PARTY_ENTRY_SETTLED_START, PARTY_LIST_INPUT_ELAPSED, partySelectEntryPhase } from "../src/engine/partySelect.ts";
import { bgFadeY, objFadeY } from "../src/engine/paletteFade.ts";

describe("forced turn-15 party select", () => {
  it("ignores list navigation during the fade and defaults to fainted ONIX", () => {
    expect(advancePartySelect({ ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 2 }, new Set(["DOWN"]))).toMatchObject({ cursor: "onix" });
  });

  it("uses press-relative entry phase boundaries for both canonical and delayed dismisses", () => {
    expect(PARTY_ENTRY_FADE_OUT_START).toBe(21);
    expect(PARTY_ENTRY_BLACK_START).toBe(36);
    expect(PARTY_ENTRY_FADE_IN_START).toBe(64);
    expect(PARTY_ENTRY_SETTLED_START).toBe(80);
    for (const dismissTick of [19990, 20020]) {
      expect(partySelectEntryPhase(0)).toBe("battleHold");
      expect(partySelectEntryPhase(20)).toBe("battleHold");
      expect(partySelectEntryPhase(21)).toBe("fadingOut");
      expect(partySelectEntryPhase(35)).toBe("fadingOut");
      expect(partySelectEntryPhase(36)).toBe("black");
      expect(partySelectEntryPhase(63)).toBe("black");
      expect(partySelectEntryPhase(64)).toBe("fadingIn");
      expect(partySelectEntryPhase(79)).toBe("fadingIn");
      expect(partySelectEntryPhase(80)).toBe("settled");
      expect(dismissTick + PARTY_ENTRY_SETTLED_START).toBe(dismissTick + 80);
    }
  });

  it("alternates BG then OBJ coefficients on the first entry-fade VBlank", () => {
    const out = { startDelay: 0, startY: 0, targetY: 16 };
    const backIn = { startDelay: 0, startY: 16, targetY: 0 };
    // The phase begins at rendered elapsed 21, so local 0 is exactly the
    // hardware's BG half; OBJ retains the prior coefficient until local 1.
    expect([bgFadeY(0, out), objFadeY(0, out), bgFadeY(1, out), objFadeY(1, out)]).toEqual([2, 0, 2, 2]);
    expect([bgFadeY(0, backIn), objFadeY(0, backIn), bgFadeY(1, backIn), objFadeY(1, backIn)]).toEqual([14, 16, 14, 14]);
  });

  it("moves DOWN to MAGBY, opens SEND OUT, then confirms it", () => {
    const magby = advancePartySelect({ ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 1 }, new Set(["DOWN"]));
    expect(magby).toEqual({ elapsed: PARTY_LIST_INPUT_ELAPSED, cursor: "magby", submenuOpen: false, sendOutConfirmed: false });
    const submenu = advancePartySelect(magby, new Set(["A"]));
    expect(submenu).toEqual({ elapsed: PARTY_LIST_INPUT_ELAPSED + 1, cursor: "magby", submenuOpen: true, sendOutConfirmed: false });
    expect(advancePartySelect(submenu, new Set(["A"])).sendOutConfirmed).toBe(true);
  });

  it("uses the RAM-derived 30/31 ONIX hop and 7/8 full-icon frame cadence", () => {
    expect(onixSelectedHopY2(153)).toBe(-3);
    expect(onixSelectedHopY2(154)).toBe(1);
    expect(onixSelectedHopY2(184)).toBe(1);
    expect(onixSelectedHopY2(185)).toBe(-3);
    expect(fullPartyIconFrame(160)).toBe(1);
    expect(fullPartyIconFrame(167)).toBe(1);
    expect(fullPartyIconFrame(168)).toBe(0);
    // The documented 2-tick global freeze delays the next f1 phase.
    expect(fullPartyIconFrame(220)).toBe(0);
    expect(fullPartyIconFrame(222)).toBe(1);
  });

  it("selects icon-free chrome and source-icon layers from live menu state", () => {
    const onixHop = partyMenuLayers({ ...INITIAL_PARTY_SELECT_STATE, elapsed: 167 });
    expect(onixHop.chromeKey).toBe("listOnixMidHop");
    expect(onixHop.icons[0]).toMatchObject({ species: "ONIX", frame: 0, selected: true, y2: 1 });
    expect(onixHop.icons[1]).toMatchObject({ species: "MAGBY", frame: 1, selected: false, x2: -4 });
    const magbyState = { ...INITIAL_PARTY_SELECT_STATE, elapsed: 205, cursor: "magby" as const };
    const magbyHop = partyMenuLayers(magbyState);
    expect(magbyHop.chromeKey).toBe("listMagbyMidHop");
    expect(magbyHop.icons[1]).toMatchObject({ species: "MAGBY", frame: 1, selected: true, y2: 1 });
    expect(magbyHop.status).toBe("magby");
    expect(partyMenuLayers({ ...magbyState, submenuOpen: true }).chromeKey).toBe("submenu");
  });
});
