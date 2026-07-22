import { describe, expect, it } from "vitest";
import { advancePartySelect, fullPartyIconFrame, INITIAL_PARTY_SELECT_STATE, onixSelectedHopY2, partyMenuLayers, PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect.ts";

describe("forced turn-15 party select", () => {
  it("ignores list navigation during the fade and defaults to fainted ONIX", () => {
    expect(advancePartySelect({ ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 2 }, new Set(["DOWN"]))).toMatchObject({ cursor: "onix" });
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
