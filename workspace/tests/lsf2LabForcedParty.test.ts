// lsf2: a forced party menu can take the three party members from a lab (levels / EVs no rental record can express) instead of the records;
// the production path (records only) keeps its species / max HP check, and no production state carries the lab field.
import { describe, expect, it } from "vitest";
import {
  CANONICAL_FORCED_SWITCH_PARTY,
  CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
  CANONICAL_FORCED_SWITCH_REQUEST,
  createPartySelectStateFromForcedSwitch,
  type PartySelectLabParty,
} from "../src/engine/partySelect.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { APP_STAGES, labBackedStage, labBackedStageOptions, labScenarioPath } from "../tools/compare/appTrace.ts";
import { readFileSync } from "node:fs";

const LAB = "../../battle-lab/pic7-player-faint-send-in-off.json";

describe("createPartySelectStateFromForcedSwitch labParty seam", () => {
  const labParty: PartySelectLabParty = [
    { species: 19, speciesName: "SPECIES_RATTATA", level: 5, personality: 150, abilitySlot: 0, friendship: 70, item: 0 },
    { species: 19, speciesName: "SPECIES_RATTATA", level: 12, personality: 0, abilitySlot: 0, friendship: 70, item: 0 },
    { species: 66, speciesName: "SPECIES_MACHOP", level: 20, personality: 7, abilitySlot: 0, friendship: 70, item: 200 },
  ];
  const party = labParty.map((member, index) => Object.freeze({
    id: `lab${index}`, species: member.speciesName.replace(/^SPECIES_/, ""), maxHp: 20 + index, hp: index === 0 ? 0 : 20 + index, status: "none" as const,
  })) as never;

  it("without labParty a party that is not the records' still throws (production check kept)", () => {
    expect(() => createPartySelectStateFromForcedSwitch(CANONICAL_FORCED_SWITCH_REQUEST, CANONICAL_FORCED_SWITCH_RENTAL_RECORDS, party))
      .toThrow(/does not match rental record species/);
    const sameSpeciesWrongHp = CANONICAL_FORCED_SWITCH_PARTY.map((member) => ({ ...member, maxHp: member.maxHp + 1 })) as never;
    expect(() => createPartySelectStateFromForcedSwitch(CANONICAL_FORCED_SWITCH_REQUEST, CANONICAL_FORCED_SWITCH_RENTAL_RECORDS, sameSpeciesWrongHp))
      .toThrow(/max HP .* does not match rental record max HP/);
  });

  it("an explicit null labParty is the production path", () => {
    expect(createPartySelectStateFromForcedSwitch(
      CANONICAL_FORCED_SWITCH_REQUEST, CANONICAL_FORCED_SWITCH_RENTAL_RECORDS, CANONICAL_FORCED_SWITCH_PARTY, undefined, null, null,
    )).toEqual(createPartySelectStateFromForcedSwitch(CANONICAL_FORCED_SWITCH_REQUEST, CANONICAL_FORCED_SWITCH_RENTAL_RECORDS, CANONICAL_FORCED_SWITCH_PARTY));
  });

  it("with labParty the rows take the lab's identity and the party's live HP", () => {
    const state = createPartySelectStateFromForcedSwitch(
      CANONICAL_FORCED_SWITCH_REQUEST, CANONICAL_FORCED_SWITCH_RENTAL_RECORDS, party, undefined, null, labParty,
    );
    expect(state.party.map((row) => [row.speciesId, row.species, row.level, row.personality, row.item, row.hp, row.maxHp, row.fainted, row.legal])).toEqual([
      [19, "RATTATA", 5, 150, 0, 0, 20, true, false],
      [19, "RATTATA", 12, 0, 0, 21, 21, false, true],
      [66, "MACHOP", 20, 7, 200, 22, 22, false, true],
    ]);
  });
});

describe("lab stage hands its built party to the forced party menu", () => {
  const initial = () => createInitialState({ appRoute: "generated-orchestrator", battleScene: "off" });

  it("labBackedStageOptions carries the three player mons' identities", () => {
    const json = JSON.parse(readFileSync(labScenarioPath(LAB), "utf8"));
    const built = labBackedStageOptions(json, "pic7-player-faint-send-in-off").options.forcedPartyLabParty!;
    expect(built.map((member) => [member.speciesName, member.level])).toEqual([["SPECIES_RATTATA", 12], ["SPECIES_RATTATA", 50], ["SPECIES_RATTATA", 50]]);
  });

  it("the staged lab battle runs past the player's faint to the forced party menu with the lab's rows", () => {
    let state = labBackedStage(LAB, initial());
    let select = state.factoryRoundBattleOrchestrator!.battleForcedPartySelect;
    for (let frame = 0; frame < 4000 && select === null; frame += 1) {
      state = tick(state, frame % 12 === 0 ? ["A"] : []);
      select = state.factoryRoundBattleOrchestrator!.battleForcedPartySelect;
    }
    expect(select).not.toBeNull();
    expect(select!.party.map((row) => [row.partyIndex, row.level, row.maxHp])).toEqual([[0, 12, 32], [1, 50, 105], [2, 50, 105]]);
  });

  it("a hand-written (record-backed) stage carries no lab party", () => {
    const staged = APP_STAGES["fsc1-dig-eq-off"]!(initial()).factoryRoundBattleOrchestrator!;
    expect("forcedPartyLabParty" in staged).toBe(false);
    expect("forcedPartyLabParty" in labBackedStage(LAB, initial()).factoryRoundBattleOrchestrator!).toBe(true);
  });
});
