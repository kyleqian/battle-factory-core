/**
 * ISSUES #165: SetMonMoveAvoidReturn (`battle_factory.c:913-919`) writes a
 * Factory set's MOVE_RETURN as MOVE_FRUSTRATION wherever the source creates a
 * Factory mon from `gFacilityTrainerMons` (player / opponent battle parties
 * `battle_factory.c:461` / `:501` / `:822`, `battle_tower.c:1880`, the draft
 * screen's mons `battle_factory_screen.c:1774`). Raw table readers such as the
 * opponent battle-style hint (`battle_factory.c:672`) still see MOVE_RETURN.
 */
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { healFactoryKernelParty, type FactoryRentalParty } from "../src/engine/battleScenario.ts";
import {
  BATTLE_SCRIPT_EFFECT_FRUSTRATION,
  BATTLE_SCRIPT_EFFECT_RETURN,
  friendshipToDynamicBasePower,
} from "../src/engine/battleScriptFriendshipToDamageOpcode.ts";
import {
  FACTORY_STYLE,
  getFactoryMoveBattleStyle,
  getFactoryOpponentBattleStyle,
} from "../src/engine/factoryCommentary.ts";
import {
  createFactoryCorpusParty,
  createFactoryCorpusPartyMember,
  factoryFacilitySetMoveIds,
  setMonMoveAvoidReturn,
} from "../src/engine/factoryCorpusParty.ts";
import { createFactoryRentalPresentation } from "../src/engine/factoryRentalPresentation.ts";
import { applyFactorySwapMutation, createFactorySwapState } from "../src/engine/factorySwap.ts";

const MOVE_RETURN = 216;
const MOVE_FRUSTRATION = 218;
const LEVEL_50_SETS = frontierMonsData.entries.slice(0, 850);
const NATURE_INDEX = new Map(naturesData.natures.map((row) => [row.name, row.index]));
const MOVES_BY_ID = new Map(movesData.moves.map((row) => [row.id, row]));
const RETURN_SET_IDS = LEVEL_50_SETS
  .filter((set) => set.moves.includes("MOVE_RETURN"))
  .map((set) => set.index);

function record(setId: number) {
  const set = frontierMonsData.entries[setId]!;
  return { setId, personality: NATURE_INDEX.get(set.nature)!, fixedIv: 3, abilitySlot: 0 as const, otId: 0 };
}

describe("ISSUES #165: Factory parties turn Return into Frustration", () => {
  it("the Level-50 corpus lists Return on exactly these sets", () => {
    expect(RETURN_SET_IDS).toEqual([26, 28, 107, 288, 306, 355, 459, 534, 567, 747, 827]);
  });

  it("setMonMoveAvoidReturn maps only MOVE_RETURN", () => {
    expect(setMonMoveAvoidReturn(MOVE_RETURN)).toBe(MOVE_FRUSTRATION);
    for (const { id } of movesData.moves) {
      if (id !== MOVE_RETURN) expect(setMonMoveAvoidReturn(id)).toBe(id);
    }
  });

  it("every Return set builds with Frustration in Return's slot, friendship 0 and Frustration's PP", () => {
    for (const setId of RETURN_SET_IDS) {
      const raw = factoryFacilitySetMoveIds(setId);
      const member = createFactoryCorpusPartyMember(record(setId));
      expect(member.moves, `set ${setId}`).toEqual(raw.map((id) => (id === MOVE_RETURN ? MOVE_FRUSTRATION : id)));
      expect(member.moves).not.toContain(MOVE_RETURN);
      expect(member.friendship).toBe(0);
      expect(member.pp).toEqual(member.moves.map((id) => MOVES_BY_ID.get(id)!.pp));
    }
  });

  it("control: every non-Return set's moves and PP are the raw table's", () => {
    for (const set of LEVEL_50_SETS) {
      if (RETURN_SET_IDS.includes(set.index)) continue;
      const member = createFactoryCorpusPartyMember(record(set.index));
      expect(member.moves, `set ${set.index}`).toEqual(factoryFacilitySetMoveIds(set.index));
      expect(member.pp).toEqual(set.moves.map((name) => movesData.moves.find((row) => row.move === name)!.pp));
    }
  });

  it("battle-start kernel parties (player and opponent records) carry Frustration", () => {
    // TOGEPI 26 (slot 0), MARILL 28 (slot 3), control TYROGUE 15.
    const party: FactoryRentalParty = [record(26), record(28), record(15)];
    const kernel = healFactoryKernelParty(party);
    expect(kernel[0]!.moves[0]).toBe(MOVE_FRUSTRATION);
    expect(kernel[1]!.moves[3]).toBe(MOVE_FRUSTRATION);
    expect(kernel[2]!.moves).toEqual(factoryFacilitySetMoveIds(15));
    expect(kernel.every((member) => member.friendship === 0)).toBe(true);
  });

  it("swap path: a swapped-in Return set re-enters the next battle's party as Frustration", () => {
    const playerRecords: FactoryRentalParty = [record(15), record(291), record(1)];
    const opponentRecords: FactoryRentalParty = [record(459), record(2), record(3)];
    const toBattleMon = (r: FactoryRentalParty[number]) => {
      const member = createFactoryCorpusPartyMember(r);
      return {
        id: `rental-${r.setId}`, species: member.speciesName, hp: member.hp, maxHp: member.maxHP,
        status: "none" as const, personality: member.personality, abilityNum: member.abilitySlot,
        friendship: member.friendship,
      };
    };
    const rentalMons = [...playerRecords, ...opponentRecords].map((r) => ({
      monId: r.setId, personality: r.personality, ivs: r.fixedIv, abilityNum: r.abilitySlot,
    }));
    const state = {
      ...createFactorySwapState(
        playerRecords.map(toBattleMon) as never,
        opponentRecords.map(toBattleMon) as never,
        rentalMons as never,
      ),
      playerMonId: 1,
      enemyMonId: 0,
    };
    const swapped = applyFactorySwapMutation(state as never);
    expect(swapped.rentalMons[1]!.monId).toBe(459);
    const nextRecords = swapped.rentalMons.slice(0, 3).map((mon) => ({
      setId: mon.monId, personality: mon.personality, fixedIv: mon.ivs, abilitySlot: mon.abilityNum as 0 | 1, otId: 0,
    })) as unknown as FactoryRentalParty;
    const kernel = healFactoryKernelParty(nextRecords);
    expect(kernel[1]!.moves[0]).toBe(MOVE_FRUSTRATION);
    expect(kernel[1]!.friendship).toBe(0);
  });

  it("draft SUMMARY data (CreateFrontierFactorySelectableMons) shows FRUSTRATION", () => {
    const togepi = createFactoryRentalPresentation(record(26));
    expect(togepi.moves.map((move) => move.name)).toEqual(["FRUSTRATION", "YAWN", "WISH", "SWEET KISS"]);
    expect(togepi.moves[0]!.currentPp).toBe(20);
    const control = createFactoryRentalPresentation(record(15));
    expect(control.moves.map((move) => move.id)).toEqual([...factoryFacilitySetMoveIds(15)]);
  });

  it("raw table readers keep Return: the opponent battle-style hint reads gFacilityTrainerMons", () => {
    expect(factoryFacilitySetMoveIds(26)[0]).toBe(MOVE_RETURN);
    // Neither move belongs to a style list, so the tally is unchanged either way.
    expect(getFactoryMoveBattleStyle(MOVE_RETURN)).toBe(FACTORY_STYLE.NONE);
    expect(getFactoryMoveBattleStyle(MOVE_FRUSTRATION)).toBe(FACTORY_STYLE.NONE);
    // A member that carries its set id is tallied from the raw table, not from its party moves.
    const party = createFactoryCorpusParty([record(26), record(355), record(534)]);
    const tally = getFactoryOpponentBattleStyle(party);
    const decoyMoves = [1, 1, 1, 1] as const;
    const decoy = getFactoryOpponentBattleStyle(
      party.map((member) => ({ speciesName: member.speciesName, moves: decoyMoves, setId: member.setId })) as never,
    );
    expect(decoy.points).toEqual(tally.points);
    const rawTally = getFactoryOpponentBattleStyle(
      [26, 355, 534].map((setId) => ({ speciesName: "x", moves: factoryFacilitySetMoveIds(setId) })) as never,
    );
    expect(tally.points).toEqual(rawTally.points);
  });

  it("kernel damage: Frustration at the Factory's friendship 0 has power 102 (Return's would be 0 -> table power 1)", () => {
    const member = createFactoryCorpusPartyMember(record(459));
    expect(MOVES_BY_ID.get(member.moves[0])!.effect).toBe("EFFECT_FRUSTRATION");
    expect(friendshipToDynamicBasePower(BATTLE_SCRIPT_EFFECT_FRUSTRATION, member.friendship)).toBe(102);
    expect(friendshipToDynamicBasePower(BATTLE_SCRIPT_EFFECT_RETURN, member.friendship)).toBe(0);
  });
});
