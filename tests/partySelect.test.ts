import { describe, expect, it } from "vitest";
import { advancePartySelect, INITIAL_PARTY_SELECT_STATE, PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect.ts";

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
});
