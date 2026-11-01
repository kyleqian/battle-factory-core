import { describe, expect, it } from "vitest";
import {
  applyPlayerSwitchEvents,
  battlePartyDisplayRows,
  bufferBattlePartyOrderBySide,
  getPartyIdFromBattlePartyId,
  getPartyIdFromBattleSlot,
  IDENTITY_BATTLE_PARTY_ORDER,
  isIdentityBattlePartyOrder,
  switchPartyOrder,
} from "../src/engine/battlePartyOrder.ts";
import { advancePartySelect, CANONICAL_FORCED_SWITCH_PARTY, CANONICAL_FORCED_SWITCH_RENTAL_RECORDS, createPartySelectStateFromForcedSwitch, PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect.ts";
import { createBattleForcedSwitchRequest, type BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { battlePartySelectStateForForcedParty } from "../src/engine/battlePartySelect.ts";
import { drawTurn15PartySelectList } from "../src/engine/battleScene.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";

const rows = (order: Parameters<typeof battlePartyDisplayRows>[0]) => [...battlePartyDisplayRows(order)];
const switchEvent = (side: "player" | "opponent", fromPartyIndex: number, toPartyIndex: number, sequence = 0) =>
  ({ sequence, payload: { kind: "switch", side, fromPartyIndex, toPartyIndex } }) as unknown as BattleKernelSemanticEvent;

describe("battle party order port (party_menu.c BufferBattlePartyOrderBySide / battle_main.c SwitchPartyOrder)", () => {
  it("packs the singles start order as high-nibble-first bytes, active mon first, the rest ascending", () => {
    expect([...bufferBattlePartyOrderBySide(0)]).toEqual([0x01, 0x23, 0x45]);
    expect([...bufferBattlePartyOrderBySide(1)]).toEqual([0x10, 0x23, 0x45]);
    expect([...bufferBattlePartyOrderBySide(2)]).toEqual([0x20, 0x13, 0x45]);
    expect(isIdentityBattlePartyOrder(IDENTITY_BATTLE_PARTY_ORDER)).toBe(true);
  });

  it("GetPartyIdFromBattleSlot / GetPartyIdFromBattlePartyId are inverse and the latter returns 0 when absent", () => {
    const order = bufferBattlePartyOrderBySide(2);
    expect([0, 1, 2, 3].map((slot) => getPartyIdFromBattleSlot(order, slot))).toEqual([2, 0, 1, 3]);
    expect([0, 1, 2, 3].map((id) => getPartyIdFromBattlePartyId(order, id))).toEqual([1, 2, 0, 3]);
    expect(getPartyIdFromBattlePartyId(order, 9)).toBe(0);
  });

  it("swaps the active slot with the incoming mon's slot (the incoming mon lands at row 0)", () => {
    const first = switchPartyOrder(IDENTITY_BATTLE_PARTY_ORDER, 0, 2);
    expect(rows(first)).toEqual([2, 1, 0]);
    const second = switchPartyOrder(first, 2, 1);
    expect(rows(second)).toEqual([1, 2, 0]);
    const third = switchPartyOrder(second, 1, 0);
    expect(rows(third)).toEqual([0, 2, 1]);
    expect(rows(IDENTITY_BATTLE_PARTY_ORDER)).toEqual([0, 1, 2]);
  });

  it("is a pure function: the input order is untouched", () => {
    const before = [...IDENTITY_BATTLE_PARTY_ORDER];
    switchPartyOrder(IDENTITY_BATTLE_PARTY_ORDER, 0, 1);
    expect([...IDENTITY_BATTLE_PARTY_ORDER]).toEqual(before);
  });

  it("folds only the player's switch events, per event (a voluntary switch plus a Roar in one receipt is two swaps)", () => {
    const events = [switchEvent("opponent", 0, 1, 1), switchEvent("player", 0, 1, 2), switchEvent("player", 1, 2, 3)];
    expect(rows(applyPlayerSwitchEvents(IDENTITY_BATTLE_PARTY_ORDER, events))).toEqual([2, 0, 1]);
    expect(rows(switchPartyOrder(IDENTITY_BATTLE_PARTY_ORDER, 0, 2))).toEqual([2, 1, 0]);
    expect(applyPlayerSwitchEvents(IDENTITY_BATTLE_PARTY_ORDER, [switchEvent("opponent", 0, 1)])).toBe(IDENTITY_BATTLE_PARTY_ORDER);
  });

  it("rejects an order that does not permute the three-mon Factory party", () => {
    expect(() => battlePartyDisplayRows(bufferBattlePartyOrderBySide(4))).toThrow(/permute/);
  });
});

describe("forced selector under a non-identity battle order", () => {
  const request = createBattleForcedSwitchRequest({
    kind: "forced-switch", requestId: 9, side: "player", battler: 0, faintedPartyIndex: 2, legalPartyIndexes: [0, 1],
  });
  const party = CANONICAL_FORCED_SWITCH_PARTY.map((member, index) => index === 2 ? { ...member, hp: 0 } : index === 0 ? { ...member, hp: 40 } : member) as unknown as typeof CANONICAL_FORCED_SWITCH_PARTY;
  const order = switchPartyOrder(IDENTITY_BATTLE_PARTY_ORDER, 0, 2);
  const state = { ...createPartySelectStateFromForcedSwitch(request, CANONICAL_FORCED_SWITCH_RENTAL_RECORDS, party, order), elapsed: PARTY_LIST_INPUT_ELAPSED - 1 };

  it("shows the fainted mon at row 0 and the others after it, each row keeping its raw party index and flags", () => {
    expect(state.cursor).toBe(0);
    expect(state.party.map((member) => [member.partyIndex, member.fainted, member.legal])).toEqual([[2, true, false], [1, false, true], [0, false, true]]);
    expect(battlePartySelectStateForForcedParty(state).rows.map((row) => [row.partyIndex, row.slot, row.active])).toEqual([[2, 0, true], [1, 1, false], [0, 2, false]]);
  });

  it("maps the cursor row back to the raw party index on submit", () => {
    const down = advancePartySelect(state, new Set(["DOWN"]));
    expect(down.cursor).toBe(1);
    const open = advancePartySelect(down, new Set(["A"]));
    const confirmed = advancePartySelect(open, new Set(["A"]));
    expect(confirmed.sendOutElapsed).toBe(0);
    const refused = advancePartySelect(advancePartySelect(state, new Set(["A"])), new Set(["A"]));
    expect(refused.message).toContain("has no energy");
  });

  it("never takes the harvested anchor chrome for a permuted roster", () => {
    const routed = createFramebuffer();
    drawTurn15PartySelectList(routed, { ...state, elapsed: PARTY_LIST_INPUT_ELAPSED + 40 });
    const composed = createFramebuffer();
    const settled = { ...state, elapsed: PARTY_LIST_INPUT_ELAPSED + 40 };
    const projection = battlePartySelectStateForForcedParty(settled);
    expect(projection.rows[0]!.partyIndex).toBe(2);
    expect(Buffer.from(routed).equals(Buffer.from(composed))).toBe(false);
  });
});
