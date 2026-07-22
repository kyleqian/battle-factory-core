// Forced player-switch party menu state.  Rendering is intentionally kept
// separate: this reducer only owns the button-gated cursor/action sequence.
import type { GbaButton } from "../input.ts";

export type PartySelectCursor = "onix" | "magby";
export interface PartySelectState {
  /** Frames since the actual faint-message dismiss edge. */
  elapsed: number;
  cursor: PartySelectCursor;
  submenuOpen: boolean;
  sendOutConfirmed: boolean;
}

export const INITIAL_PARTY_SELECT_STATE: PartySelectState = {
  elapsed: 0,
  cursor: "onix",
  submenuOpen: false,
  sendOutConfirmed: false,
};

/** The list is usable only after its press-relative fade-in has settled. */
export const PARTY_LIST_INPUT_ELAPSED = 80;

export function advancePartySelect(state: PartySelectState, newKeys: ReadonlySet<GbaButton>): PartySelectState {
  const next = { ...state, elapsed: state.elapsed + 1 };
  if (next.sendOutConfirmed || next.elapsed < PARTY_LIST_INPUT_ELAPSED) return next;
  if (!next.submenuOpen && newKeys.has("DOWN")) return { ...next, cursor: "magby" };
  if (newKeys.has("A")) {
    return next.submenuOpen ? { ...next, sendOutConfirmed: true } : { ...next, submenuOpen: true };
  }
  return next;
}
