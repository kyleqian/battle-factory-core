import { describe, expect, it } from "vitest";
import { advancePartySelect, INITIAL_PARTY_SELECT_STATE, PARTY_LIST_INPUT_TICK } from "../src/engine/partySelect.ts";

describe("forced turn-15 party select", () => {
  it("ignores list navigation during the fade and defaults to fainted ONIX", () => {
    expect(advancePartySelect(INITIAL_PARTY_SELECT_STATE, PARTY_LIST_INPUT_TICK - 1, new Set(["DOWN"]))).toEqual(INITIAL_PARTY_SELECT_STATE);
  });

  it("moves DOWN to MAGBY, opens SEND OUT, then confirms it", () => {
    const magby = advancePartySelect(INITIAL_PARTY_SELECT_STATE, PARTY_LIST_INPUT_TICK, new Set(["DOWN"]));
    expect(magby).toEqual({ cursor: "magby", submenuOpen: false, sendOutConfirmed: false });
    const submenu = advancePartySelect(magby, PARTY_LIST_INPUT_TICK + 1, new Set(["A"]));
    expect(submenu).toEqual({ cursor: "magby", submenuOpen: true, sendOutConfirmed: false });
    expect(advancePartySelect(submenu, PARTY_LIST_INPUT_TICK + 2, new Set(["A"])).sendOutConfirmed).toBe(true);
  });
});
