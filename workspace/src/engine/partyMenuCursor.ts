// The party menu's slot cursor for a three-mon singles Factory party, shared
// by the voluntary (battlePartySelect.ts) and forced (partySelect.ts) in-battle
// selectors: party_menu.c's UpdateCurrentPartySelection / sPartyMenuNextSelectionFuncs
// for PARTY_LAYOUT_SINGLE with three mons -- slot 0 is the left column, slots
// 1 and 2 and the CANCEL button the right one; LEFT/RIGHT remember the right
// column's slot, UP/DOWN wrap through CANCEL.
import type { GbaButton } from "../input.ts";

export type PartyMenuCursor = 0 | 1 | 2 | "cancel";
export type PartyMenuRightColumn = 1 | 2;
export type PartyMenuDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface PartyMenuCursorState {
  readonly cursor: PartyMenuCursor;
  readonly rightColumnCursor: PartyMenuRightColumn;
}

export function movePartyMenuCursor(
  state: PartyMenuCursorState,
  direction: PartyMenuDirection,
): PartyMenuCursorState {
  const { cursor } = state;
  if (direction === "UP") {
    if (cursor === 0) return { cursor: "cancel", rightColumnCursor: state.rightColumnCursor };
    if (cursor === "cancel") return { cursor: 2, rightColumnCursor: 2 };
    return { cursor: (cursor - 1) as 0 | 1, rightColumnCursor: cursor === 2 ? 1 : state.rightColumnCursor };
  }
  if (direction === "DOWN") {
    if (cursor === "cancel") return { cursor: 0, rightColumnCursor: state.rightColumnCursor };
    if (cursor === 2) return { cursor: "cancel", rightColumnCursor: 2 };
    return { cursor: (cursor + 1) as 1 | 2, rightColumnCursor: (cursor + 1) as 1 | 2 };
  }
  if (direction === "LEFT" && cursor !== 0 && cursor !== "cancel") {
    return { cursor: 0, rightColumnCursor: cursor };
  }
  if (direction === "RIGHT" && cursor === 0) {
    return { cursor: state.rightColumnCursor, rightColumnCursor: state.rightColumnCursor };
  }
  return { cursor, rightColumnCursor: state.rightColumnCursor };
}

/** The first direction among this frame's new keys, in the menu's own priority order. */
export function partyMenuDirection(newKeys: ReadonlySet<GbaButton>): PartyMenuDirection | undefined {
  return (["UP", "DOWN", "LEFT", "RIGHT"] as const).find((button) => newKeys.has(button));
}
