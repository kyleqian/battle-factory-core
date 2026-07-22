// Forced player-switch party menu state.  Rendering is intentionally kept
// separate: this reducer only owns the button-gated cursor/action sequence.
import type { GbaButton } from "../input.ts";

export type PartySelectCursor = "onix" | "magby";
export type PartyMenuChromeKey = "listOnix" | "listOnixMidHop" | "listMagby" | "listMagbyMidHop" | "submenu";
export type PartyMenuIconLayer = {
  species: "ONIX" | "MAGBY" | "BAYLEEF";
  frame: 0 | 1;
  selected: boolean;
  y2: -3 | 1 | -4 | 0;
  x2: -4 | 0;
};
export interface PartyMenuLayers {
  chromeKey: PartyMenuChromeKey;
  icons: readonly PartyMenuIconLayer[];
  /** The selected MAGBY position needs its distinct extracted status OBJ. */
  status: "normal" | "magby";
}
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

// RAM-derived from `dump-party-icon-bounce.py`, documented in
// docs/party-menu-notes.md.  The normal full-HP icon animation has a
// 7/8-frame cadence (the trailing JUMP stretches one half by a frame); both
// full-HP icons share the two-frame cadence while ONIX's fainted animNum=4
// keeps bitmap frame 0.  The two-frame 20205-20207 global pause is expressed
// relative to party-menu entry, so delayed dismiss traces keep the same OAM.
const FULL_ICON_FRAME1_START = 160;
const FULL_ICON_PERIOD = 15;
const FULL_ICON_FRAME1_HOLD = 8;
const PARTY_ICON_GLOBAL_STALL_START = 214;
const PARTY_ICON_GLOBAL_STALL_FRAMES = 2;

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/** Bitmap frame for MAGBY/BAYLEEF at this menu-relative render tick. */
export function fullPartyIconFrame(elapsed: number): 0 | 1 {
  const runningElapsed = elapsed - (elapsed >= PARTY_ICON_GLOBAL_STALL_START + PARTY_ICON_GLOBAL_STALL_FRAMES ? PARTY_ICON_GLOBAL_STALL_FRAMES : 0);
  return mod(runningElapsed - FULL_ICON_FRAME1_START, FULL_ICON_PERIOD) < FULL_ICON_FRAME1_HOLD ? 1 : 0;
}

/** ONIX animNum=4's selected y2 bounce: -3 for 30 frames, +1 for 31. */
export function onixSelectedHopY2(elapsed: number): -3 | 1 {
  return mod(elapsed - 154, 61) < 31 ? 1 : -3;
}

/**
 * The renderer consumes this state-derived layer list, never trace ticks or
 * captured icon pixels.  The five icon-free chrome variants are only panel/
 * text/palette snapshots; every OBJ texel is drawn below from ROM extraction.
 */
export function partyMenuLayers(state: PartySelectState): PartyMenuLayers {
  const fullFrame = fullPartyIconFrame(state.elapsed);
  if (state.submenuOpen) {
    return {
      chromeKey: "submenu",
      icons: [
        { species: "ONIX", frame: 0, selected: false, x2: 0, y2: -4 },
        { species: "MAGBY", frame: 1, selected: true, x2: 0, y2: 1 },
        { species: "BAYLEEF", frame: 1, selected: false, x2: -4, y2: 0 },
      ],
      status: "magby",
    };
  }
  if (state.cursor === "onix") {
    const y2 = onixSelectedHopY2(state.elapsed);
    return {
      chromeKey: y2 === 1 && fullFrame === 1 ? "listOnixMidHop" : "listOnix",
      icons: [
        { species: "ONIX", frame: 0, selected: true, x2: 0, y2 },
        { species: "MAGBY", frame: fullFrame, selected: false, x2: -4, y2: 0 },
        { species: "BAYLEEF", frame: fullFrame, selected: false, x2: -4, y2: 0 },
      ],
      status: "normal",
    };
  }
  const y2: -3 | 1 = fullFrame === 1 ? 1 : -3;
  return {
    chromeKey: fullFrame === 1 ? "listMagbyMidHop" : "listMagby",
    icons: [
      { species: "ONIX", frame: 0, selected: false, x2: 0, y2: -4 },
      { species: "MAGBY", frame: fullFrame, selected: true, x2: 0, y2 },
      { species: "BAYLEEF", frame: fullFrame, selected: false, x2: -4, y2: 0 },
    ],
    status: fullFrame === 1 ? "magby" : "normal",
  };
}

export function advancePartySelect(state: PartySelectState, newKeys: ReadonlySet<GbaButton>): PartySelectState {
  const next = { ...state, elapsed: state.elapsed + 1 };
  if (next.sendOutConfirmed || next.elapsed < PARTY_LIST_INPUT_ELAPSED) return next;
  if (!next.submenuOpen && newKeys.has("DOWN")) return { ...next, cursor: "magby" };
  if (newKeys.has("A")) {
    return next.submenuOpen ? { ...next, sendOutConfirmed: true } : { ...next, submenuOpen: true };
  }
  return next;
}
