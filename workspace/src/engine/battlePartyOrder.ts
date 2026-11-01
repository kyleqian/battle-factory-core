// Port of the ROM's battle party order (gBattleStruct->battlerPartyOrders[battler], aliased as gBattlePartyCurrentOrder while a menu or
// SwitchPartyOrder works on it): PARTY_SIZE / 2 bytes, two 4-bit party ids per byte, high nibble first (party_menu.c:231). Entry `slot` names
// the raw party index the in-battle party menu shows at row `slot` (UpdatePartyToBattleOrder); the kernel keeps raw indexes throughout.
import type { BattleKernelSemanticEvent } from "./battleDecisionBoundary.ts";

export const BATTLE_PARTY_ORDER_PARTY_SIZE = 6;
export type BattlePartyCurrentOrder = readonly [number, number, number];

/** BufferBattlePartyOrderBySide, singles branch (party_menu.c:5964-5974, 5995-5997): the active battler's party id first, the rest ascending. */
export function bufferBattlePartyOrderBySide(activePartyIndex: number): BattlePartyCurrentOrder {
  const partyIndexes: number[] = [activePartyIndex];
  for (let i = 0; i < BATTLE_PARTY_ORDER_PARTY_SIZE; i += 1) {
    if (i !== activePartyIndex) partyIndexes.push(i);
  }
  return Object.freeze([0, 1, 2].map((i) => (partyIndexes[i * 2]! << 4) | partyIndexes[i * 2 + 1]!)) as unknown as BattlePartyCurrentOrder;
}

export const IDENTITY_BATTLE_PARTY_ORDER: BattlePartyCurrentOrder = bufferBattlePartyOrderBySide(0);

/** GetPartyIdFromBattleSlot (party_menu.c:6027-6037): the raw party index shown at `slot`. */
export function getPartyIdFromBattleSlot(order: BattlePartyCurrentOrder, slot: number): number {
  const byte = order[slot >> 1]!;
  return (slot & 1) !== 0 ? byte & 0xf : byte >> 4;
}

function setPartyIdAtBattleSlot(order: number[], slot: number, partyId: number): void {
  const index = slot >> 1;
  order[index] = (slot & 1) !== 0 ? (order[index]! & 0xf0) | partyId : (order[index]! & 0xf) | (partyId << 4);
}

/** GetPartyIdFromBattlePartyId (party_menu.c:6058-6076): the slot a raw party index sits in (0 when absent, as the source returns). */
export function getPartyIdFromBattlePartyId(order: BattlePartyCurrentOrder, battlePartyId: number): number {
  let j = 0;
  for (let i = 0; i < order.length; i += 1, j += 1) {
    if ((order[i]! >> 4) !== battlePartyId) {
      j += 1;
      if ((order[i]! & 0xf) === battlePartyId) return j;
    } else {
      return j;
    }
  }
  return 0;
}

/** SwitchPartyMonSlots (party_menu.c:6051-6056). */
function switchPartyMonSlots(order: number[], slot: number, slot2: number): void {
  const frozen = order as unknown as BattlePartyCurrentOrder;
  const partyId = getPartyIdFromBattleSlot(frozen, slot);
  setPartyIdAtBattleSlot(order, slot, getPartyIdFromBattleSlot(frozen, slot2));
  setPartyIdAtBattleSlot(order, slot2, partyId);
}

/** SwitchPartyOrder, singles (battle_main.c:4086-4113): swaps the slot of the battler's current party index with the slot of the mon switched in. */
export function switchPartyOrder(
  order: BattlePartyCurrentOrder,
  battlerPartyIndex: number,
  monToSwitchIntoId: number,
): BattlePartyCurrentOrder {
  const next = [...order];
  const frozen = order;
  switchPartyMonSlots(next, getPartyIdFromBattlePartyId(frozen, battlerPartyIndex), getPartyIdFromBattlePartyId(frozen, monToSwitchIntoId));
  return Object.freeze(next) as unknown as BattlePartyCurrentOrder;
}

/**
 * The ROM calls SwitchPartyOrder at every switchhandleorder / Roar-Whirlwind switch of a battler; the kernel's `switch` event
 * (battleScriptSwitchinOpcode.ts getswitchedmondata) is emitted once per such switch, in order, so folding the player's events keeps the
 * order the ROM holds at any kernel boundary.
 */
export function applyPlayerSwitchEvents(
  order: BattlePartyCurrentOrder,
  events: readonly BattleKernelSemanticEvent[],
): BattlePartyCurrentOrder {
  let next = order;
  for (const event of events) {
    const payload = event.payload;
    if (payload.kind !== "switch" || payload.side !== "player") continue;
    next = switchPartyOrder(next, payload.fromPartyIndex, payload.toPartyIndex);
  }
  return next;
}

/** The raw party indexes of the three menu rows, row 0 first (a Factory party never leaves slots 0..2). */
export type BattlePartyDisplayRows = readonly [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2];

export function battlePartyDisplayRows(order: BattlePartyCurrentOrder): BattlePartyDisplayRows {
  const rows = [0, 1, 2].map((slot) => getPartyIdFromBattleSlot(order, slot));
  if (rows.some((row) => row > 2) || new Set(rows).size !== 3) {
    throw new Error(`battle party order ${order.join(",")} does not permute the three-mon Factory party`);
  }
  return Object.freeze(rows) as unknown as BattlePartyDisplayRows;
}

export function isIdentityBattlePartyOrder(order: BattlePartyCurrentOrder): boolean {
  return order[0] === IDENTITY_BATTLE_PARTY_ORDER[0]
    && order[1] === IDENTITY_BATTLE_PARTY_ORDER[1]
    && order[2] === IDENTITY_BATTLE_PARTY_ORDER[2];
}
