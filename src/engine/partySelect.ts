// Forced player-switch party menu state.  Rendering is intentionally kept
// separate: this reducer only owns the button-gated cursor/action sequence.
import type { GbaButton } from "../input.ts";

export type PartySelectCursor = "onix" | "magby";
export interface PartySelectState {
  cursor: PartySelectCursor;
  submenuOpen: boolean;
  sendOutConfirmed: boolean;
}

export const INITIAL_PARTY_SELECT_STATE: PartySelectState = {
  cursor: "onix",
  submenuOpen: false,
  sendOutConfirmed: false,
};

export const PARTY_LIST_INPUT_TICK = 20064;

export function advancePartySelect(state: PartySelectState, t: number, newKeys: ReadonlySet<GbaButton>): PartySelectState {
  if (state.sendOutConfirmed || t < PARTY_LIST_INPUT_TICK) return state;
  if (!state.submenuOpen && newKeys.has("DOWN")) return { ...state, cursor: "magby" };
  if (newKeys.has("A")) {
    return state.submenuOpen ? { ...state, sendOutConfirmed: true } : { ...state, submenuOpen: true };
  }
  return state;
}
