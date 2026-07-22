import { describe, expect, it } from "vitest";
import { advancePartySelect, fullPartyIconFrame, INITIAL_PARTY_SELECT_STATE, onixSelectedHopY2, partyMenuLayers, partySendOutPhase, PARTY_ENTRY_BLACK_START, PARTY_ENTRY_FADE_IN_START, PARTY_ENTRY_FADE_OUT_START, PARTY_ENTRY_SETTLED_START, PARTY_LIST_INPUT_ELAPSED, PARTY_SENDOUT_BATTLE_FADE_IN_START, PARTY_SENDOUT_BLACK_START, PARTY_SENDOUT_FADE_OUT_START, partySelectEntryPhase } from "../src/engine/partySelect.ts";
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
    expect(magby).toEqual({ elapsed: PARTY_LIST_INPUT_ELAPSED, cursor: "magby", submenuOpen: false, sendOutElapsed: null });
    const submenu = advancePartySelect(magby, new Set(["A"]));
    expect(submenu).toEqual({ elapsed: PARTY_LIST_INPUT_ELAPSED + 1, cursor: "magby", submenuOpen: true, sendOutElapsed: null });
    expect(advancePartySelect(submenu, new Set(["A"])).sendOutElapsed).toBe(0);
  });

  it("keeps the SEND OUT exit clock relative to its own confirmation edge", () => {
    expect(PARTY_SENDOUT_FADE_OUT_START).toBe(1);
    expect(PARTY_SENDOUT_BLACK_START).toBe(17);
    expect(PARTY_SENDOUT_BATTLE_FADE_IN_START).toBe(56);
    expect(partySendOutPhase(0)).toBe("submenuHold");
    expect(partySendOutPhase(1)).toBe("fadingOut");
    expect(partySendOutPhase(16)).toBe("fadingOut");
    expect(partySendOutPhase(17)).toBe("black");
    expect(partySendOutPhase(55)).toBe("black");
    expect(partySendOutPhase(56)).toBe("battleFadeIn");
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

  it("uses the frame-1 icon-free layer once the entry-time OBJ copy becomes visible", () => {
    // Direct oracle VRAM probe: after the dismiss-edge-relative construction,
    // BAYLEEF's source frame-1 bytes own rendered elapsed 70..77 (canonical
    // 20061..20068; delayed trace shifts the same window by +30). Frame 1
    // has transparent texels where frame 0 was opaque, so it must pair with
    // its matching icon-free chrome rather than exposing the frame-0 erase.
    for (const elapsed of [70, 77]) {
      const layers = partyMenuLayers({ ...INITIAL_PARTY_SELECT_STATE, elapsed });
      expect(layers.chromeKey).toBe("listOnixFrame1");
      expect(layers.icons.slice(1)).toEqual([
        expect.objectContaining({ species: "MAGBY", frame: 1 }),
        expect.objectContaining({ species: "BAYLEEF", frame: 1 }),
      ]);
    }
    expect(partyMenuLayers({ ...INITIAL_PARTY_SELECT_STATE, elapsed: 78 }).chromeKey).toBe("listOnix");
  });
});
