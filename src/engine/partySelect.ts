// Forced player-switch party menu state.  Rendering is intentionally kept
// separate: this reducer only owns the button-gated cursor/action sequence.
import type { GbaButton } from "../input.ts";

export type PartySelectCursor = "onix" | "magby";
export type PartyMenuChromeKey = "listOnix" | "listOnixFrame1" | "listOnixMidHop" | "listMagby" | "listMagbyMidHop" | "submenu" | "sendOutExit" | "sendOutExitFrame0";
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
  /** Null until SEND OUT is confirmed; then frames since that input edge. */
  sendOutElapsed: number | null;
}

/**
 * The forced-switch transition is anchored to the A edge that dismisses
 * "ONIX fainted!", never to an absolute battle tick.  The boundaries are
 * oracle-pinned for the canonical trace and repeat unchanged when that A is
 * delayed: 21 held battle frames, 15 fade-out frames, 28 black frames, then
 * 16 fade-in frames before the live party list is usable.
 */
export type PartySelectEntryPhase = "battleHold" | "fadingOut" | "black" | "fadingIn" | "settled";
// `elapsed` is advanced on the first VBlank after the A edge.  The frozen
// source therefore owns rendered elapsed 0..20; rendered elapsed 21 is the
// first palette-update frame (canonical trace 20012, delayed trace +30).
export const PARTY_ENTRY_BATTLE_HOLD_FRAMES = 21;
export const PARTY_ENTRY_FADE_OUT_FRAMES = 15;
export const PARTY_ENTRY_BLACK_FRAMES = 28;
export const PARTY_ENTRY_FADE_IN_FRAMES = 16;
export const PARTY_ENTRY_FADE_OUT_START = PARTY_ENTRY_BATTLE_HOLD_FRAMES;
export const PARTY_ENTRY_BLACK_START = PARTY_ENTRY_FADE_OUT_START + PARTY_ENTRY_FADE_OUT_FRAMES;
export const PARTY_ENTRY_FADE_IN_START = PARTY_ENTRY_BLACK_START + PARTY_ENTRY_BLACK_FRAMES;
export const PARTY_ENTRY_SETTLED_START = PARTY_ENTRY_FADE_IN_START + PARTY_ENTRY_FADE_IN_FRAMES;

export function partySelectEntryPhase(elapsed: number): PartySelectEntryPhase {
  if (elapsed < PARTY_ENTRY_FADE_OUT_START) return "battleHold";
  if (elapsed < PARTY_ENTRY_BLACK_START) return "fadingOut";
  if (elapsed < PARTY_ENTRY_FADE_IN_START) return "black";
  if (elapsed < PARTY_ENTRY_SETTLED_START) return "fadingIn";
  return "settled";
}

export const INITIAL_PARTY_SELECT_STATE: PartySelectState = {
  elapsed: 0,
  cursor: "onix",
  submenuOpen: false,
  sendOutElapsed: null,
};

/**
 * SEND OUT's own transition is separate from menu entry.  The source leaves
 * the confirmed submenu visible for two rendered frames, fades it for 16,
 * then holds generated black until the battle palette's first fade-in step.
 * Every boundary is relative to the confirming A edge (not battle time).
 */
export type PartySendOutPhase = "submenuHold" | "fadingOut" | "black" | "battleFadeIn" | "blankMessage" | "actionMenu";
// The A edge is observed on the following rendered VBlank: elapsed 0 is
// canonical frame 20246 (the last held submenu frame), so the fade itself
// begins at elapsed 1 / canonical 20247.
export const PARTY_SENDOUT_SUBMENU_HOLD_FRAMES = 1;
export const PARTY_SENDOUT_FADE_OUT_FRAMES = 16;
export const PARTY_SENDOUT_BLACK_FRAMES = 39;
export const PARTY_SENDOUT_FADE_OUT_START = PARTY_SENDOUT_SUBMENU_HOLD_FRAMES;
export const PARTY_SENDOUT_BLACK_START = PARTY_SENDOUT_FADE_OUT_START + PARTY_SENDOUT_FADE_OUT_FRAMES;
export const PARTY_SENDOUT_BATTLE_FADE_IN_START = PARTY_SENDOUT_BLACK_START + PARTY_SENDOUT_BLACK_FRAMES;
/** First `Go! MAGBY!` glyph, after the field's palette has settled. */
export const PARTY_SENDOUT_GO_TEXT_START = PARTY_SENDOUT_BATTLE_FADE_IN_START + 28;
export const PARTY_SENDOUT_GO_TEXT = "Go! MAGBY!";

/**
 * The forced-switch ball is a player Poké Ball, not a Brendan sprite.  Its
 * software slot is allocated two VBlanks before it first owns a displayed
 * texel; these boundaries are deliberately confirmation-relative so the
 * delayed SEND OUT trace reuses the same schedule.
 */
export const PARTY_SENDOUT_BALL_VISIBLE_START = PARTY_SENDOUT_BATTLE_FADE_IN_START + 43;
export const PARTY_SENDOUT_BALL_SPIN_START = PARTY_SENDOUT_BALL_VISIBLE_START + 8;
export const PARTY_SENDOUT_BALL_LAST_VISIBLE = PARTY_SENDOUT_BALL_VISIBLE_START + 43;
/** First displayed VBlank owned by MAGBY's release task and particles. */
export const PARTY_SENDOUT_RELEASE_VISIBLE_START = PARTY_SENDOUT_BALL_LAST_VISIBLE + 3;
/** Populated player-healthbox slide, using StartHealthboxSlideIn's 23 poses. */
export const PARTY_SENDOUT_HEALTHBOX_VISIBLE_START = PARTY_SENDOUT_RELEASE_VISIBLE_START + 16;
export const PARTY_SENDOUT_HEALTHBOX_SLIDE_START = PARTY_SENDOUT_HEALTHBOX_VISIBLE_START + 1;
export const PARTY_SENDOUT_HEALTHBOX_SLIDE_SPAN = 22;
export const PARTY_SENDOUT_HEALTHBOX_START_DX = 110;
export const PARTY_SENDOUT_HEALTHBOX_STEP = 5;
/**
 * The completed send-out clears its text for six rendered VBlanks, then
 * atomically hands control to the normal action menu.  Both boundaries are
 * measured from the SEND OUT confirmation edge: canonical elapsed 305 is
 * frame 20551 and delayed-confirm elapsed 305 is frame 20581.
 */
export const PARTY_SENDOUT_BLANK_MESSAGE_START = 305;
export const PARTY_SENDOUT_ACTION_MENU_START = PARTY_SENDOUT_BLANK_MESSAGE_START + 6;
/** True once the ordinary battle action controller owns input again. */
export function partySendOutBattleMenuReady(elapsed: number): boolean {
  return elapsed >= PARTY_SENDOUT_ACTION_MENU_START;
}
/** Re-anchor the freshly-created action-menu bounce task onto its original generator. */
export function partySendOutMenuBounceTick(elapsed: number): number {
  return elapsed - PARTY_SENDOUT_ACTION_MENU_START + 1748;
}

export type PartySendOutBallPhase = "none" | "closed" | "spin" | "landed";

/** Visible-only ownership; MAGBY and the particle system start after this rung. */
export function partySendOutBallPhase(elapsed: number): PartySendOutBallPhase {
  if (elapsed < PARTY_SENDOUT_BALL_VISIBLE_START) return "none";
  if (elapsed < PARTY_SENDOUT_BALL_SPIN_START) return "closed";
  if (elapsed <= PARTY_SENDOUT_BALL_LAST_VISIBLE) return "spin";
  return "landed";
}

/**
 * Relative clock shared by the released battler, its clean open-particle
 * burst, and the normal-palette fade.  Keeping this downstream of
 * `sendOutElapsed` makes delayed confirmation replay the same mechanism.
 */
export function partySendOutReleaseLogicalTick(elapsed: number): number | null {
  if (elapsed < PARTY_SENDOUT_RELEASE_VISIBLE_START) return null;
  return elapsed - PARTY_SENDOUT_RELEASE_VISIBLE_START;
}

/** SEND-OUT-relative player-healthbox x2, or null before first visibility. */
export function partySendOutHealthboxDx(elapsed: number): number | null {
  // Creation/population occurs on VISIBLE_START while the objects remain
  // wholly offscreen; x2=110 reaches the display on the next VBlank.
  if (elapsed < PARTY_SENDOUT_HEALTHBOX_SLIDE_START) return null;
  const age = elapsed - PARTY_SENDOUT_HEALTHBOX_SLIDE_START;
  if (age >= PARTY_SENDOUT_HEALTHBOX_SLIDE_SPAN) return 0;
  return PARTY_SENDOUT_HEALTHBOX_START_DX - PARTY_SENDOUT_HEALTHBOX_STEP * age;
}

/**
 * The battle field begins at BLDY=15 and brightens one coefficient per
 * rendered VBlank.  This is deliberately separate from the party fade:
 * it is anchored to SEND OUT's confirmation edge and uses the transferred
 * field PPU state as its palette source.
 */
export function partySendOutBattleFadeBldy(elapsed: number): number {
  return Math.max(0, 15 - Math.max(0, elapsed - PARTY_SENDOUT_BATTLE_FADE_IN_START));
}

/** FAST text speed: one charged character per VBlank, including the space. */
export function partySendOutGoTextVisibleChars(elapsed: number): number {
  return Math.max(0, Math.min(PARTY_SENDOUT_GO_TEXT.length, elapsed - PARTY_SENDOUT_GO_TEXT_START + 1));
}

export function partySendOutPhase(elapsed: number): PartySendOutPhase {
  if (elapsed < PARTY_SENDOUT_FADE_OUT_START) return "submenuHold";
  if (elapsed < PARTY_SENDOUT_BLACK_START) return "fadingOut";
  if (elapsed < PARTY_SENDOUT_BATTLE_FADE_IN_START) return "black";
  if (elapsed < PARTY_SENDOUT_BLANK_MESSAGE_START) return "battleFadeIn";
  if (elapsed < PARTY_SENDOUT_ACTION_MENU_START) return "blankMessage";
  return "actionMenu";
}

/** The list is usable only after its press-relative fade-in has settled. */
export const PARTY_LIST_INPUT_ELAPSED = PARTY_ENTRY_SETTLED_START;

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
  // `Task_HandleChooseMonInput` removes the SEND OUT window on the first
  // fade VBlank but leaves the party rows and their live OBJ icons in place.
  // The exit chrome is source-erased like the settled variants; it is not a
  // transition screenshot and is still fed through the palette fade below.
  if (state.sendOutElapsed !== null && state.sendOutElapsed >= PARTY_SENDOUT_FADE_OUT_START) {
    const y2: -3 | 1 = fullFrame === 1 ? 1 : -3;
    return {
      chromeKey: fullFrame === 1 ? "sendOutExit" : "sendOutExitFrame0",
      icons: [
        { species: "ONIX", frame: 0, selected: false, x2: 0, y2: -4 },
        { species: "MAGBY", frame: fullFrame, selected: true, x2: 0, y2 },
        { species: "BAYLEEF", frame: fullFrame, selected: false, x2: -4, y2: 0 },
      ],
      status: fullFrame === 1 ? "magby" : "normal",
    };
  }
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
      // The persisted chrome is deliberately icon-free only at the source
      // frame it was harvested from.  During entry, UpdateMonIconFrame's
      // queued copy reaches OBJ VRAM one VBlank after its command advance:
      // the first visible BAYLEEF/MAGBY frame is frame 1, so use the
      // matching, still press-relative chrome layer rather than exposing a
      // frame-0 erase sentinel through frame-1 transparency.
      chromeKey: y2 === 1 && fullFrame === 1 ? "listOnixMidHop" : fullFrame === 1 ? "listOnixFrame1" : "listOnix",
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
  const next = {
    ...state,
    elapsed: state.elapsed + 1,
    sendOutElapsed: state.sendOutElapsed === null ? null : state.sendOutElapsed + 1,
  };
  if (next.sendOutElapsed !== null || next.elapsed < PARTY_LIST_INPUT_ELAPSED) return next;
  if (!next.submenuOpen && newKeys.has("DOWN")) return { ...next, cursor: "magby" };
  if (newKeys.has("A")) {
    return next.submenuOpen ? { ...next, sendOutElapsed: 0 } : { ...next, submenuOpen: true };
  }
  return next;
}
