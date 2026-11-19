import { describe, expect, it } from "vitest";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";

// FRONTIER_MON_SHEDINJA is Factory set 21 (Naive, nature index 14). CalculateMonStats forces
// newMaxHP = 1 for SPECIES_SHEDINJA; the ROM drive of docs/parity-mac/stages/coverage/R057-beat-up-shedinja.json
// shows 1 HP at the first state where the engine has 88.
describe("Factory set 21 (Shedinja) max HP", () => {
  it("is 1 like CalculateMonStats", () => {
    const member = createFactoryCorpusPartyMember({ setId: 21, personality: 14, fixedIv: 3, abilitySlot: 0, otId: 0 });
    expect(member.species).toBe(303);
    expect(member.maxHP).toBe(1);
    expect(member.hp).toBe(1);
  });
});
