// The Factory Lobby singles-attendant conversation (lbr-b): A at the
// attendant at (4,7) from (4,8) opens the ROM script
// BattleFrontier_BattleFactoryLobby_EventScript_Attendant (reference
// data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:108-215):
//   welcome (3 pages) -> "Would you like to take the Battle Swap Single
//   challenge?" + CHALLENGE / INFO / EXIT (B = EXIT)
//     INFO      -> the 7-page explanation, back to the question
//     EXIT / B  -> "We look forward to your next visit." -> free roam
//     CHALLENGE -> "Which level ...?" + LV. 50 / OPEN LEVEL / EXIT
//       Open Level: shown, NOT selectable (deliberate divergence, like REST)
//       EXIT / B  -> the farewell
//       LV. 50    -> "Before you begin your challenge, I need to save the
//                    game. Is that okay?" YES/NO (NO / B = the farewell)
//         YES     -> the save dialog (start_menu.c SaveGame: info window,
//                    "Would you like to save the game?", overwrite question,
//                    SAVING..., "<player> saved the game."; NO / B anywhere =
//                    the farewell), "Please step this way.", the door walk
//                    (attendant 3 tiles, player 4), the fade and the warp.
// Every timing constant below is ROM-measured (docs/lbrb-attendant-conversation.md)
// on the battle-scene-off oracle; `age` counts ticks from a page's first glyph.
// The text engine (1 glyph/tick, spaces count, "\n" free) is the same one the
// terminal prompts use.

import { PLAYER_NAME } from "./playerName.ts";

export type AttendantScreenId =
  | "welcome"
  | "ask"
  | "explain"
  | "level"
  | "saveQuestion"
  | "farewell"
  | "saveInfo"
  | "overwrite"
  | "saving"
  | "saved"
  | "step";

export type AttendantMenuKind = "challenge" | "level" | "yesNo";

/** How a page ends: `p` = wait arrow, A clears; `l` = wait arrow, A scrolls; `end` = last page. */
export type AttendantPageEnd = "p" | "l" | "end";

export interface AttendantPage {
  readonly lines: readonly string[];
  readonly end: AttendantPageEnd;
}

export interface AttendantScreenDef {
  readonly pages: readonly AttendantPage[];
  readonly menu: AttendantMenuKind | null;
  /** The save-info window is drawn over the field (save dialog screens). */
  readonly saveWindow: boolean;
  /** Frames the finished message holds before the next screen (saving only). */
  readonly autoHold: number | null;
}

const page = (end: AttendantPageEnd, ...lines: string[]): AttendantPage => Object.freeze({ lines: Object.freeze(lines), end });

export const ATTENDANT_SCREENS: Readonly<Record<AttendantScreenId, AttendantScreenDef>> = Object.freeze({
  welcome: {
    pages: [
      page("p", "Where the intelligence of TRAINERS", "is put to the test!"),
      page("p", "Welcome to the BATTLE FACTORY!"),
      page("end", "I am your guide to the Battle Swap", "Single Tournament."),
    ],
    menu: null,
    saveWindow: false,
    autoHold: null,
  },
  ask: {
    pages: [page("end", "Would you like to take the Battle", "Swap Single challenge?")],
    menu: "challenge",
    saveWindow: false,
    autoHold: null,
  },
  explain: {
    pages: [
      page("l", "The Battle Swap Single Tournament", "is a SINGLE BATTLE competition using"),
      page("p", "is a SINGLE BATTLE competition using", "only rental POKéMON."),
      page("p", "First, you will be loaned three", "POKéMON specifically for this event."),
      page("p", "Using the supplied rental POKéMON,", "you must conduct a SINGLE BATTLE."),
      page("p", "If you win, you are permitted to trade", "one of your rental POKéMON."),
      page("l", "Repeat this cycle of battling and", "trading--if you win seven times in"),
      page("p", "trading--if you win seven times in", "a row, you will earn Battle Points."),
      page("p", "If you want to interrupt your", "challenge, please save the game."),
      page("end", "If you don't save, you will be", "disqualified from your challenge."),
    ],
    menu: null,
    saveWindow: false,
    autoHold: null,
  },
  level: {
    pages: [page("end", "Which level do you wish to challenge?", "Level 50 or Open Level?")],
    menu: "level",
    saveWindow: false,
    autoHold: null,
  },
  saveQuestion: {
    pages: [page("end", "Before you begin your challenge,", "I need to save the game. Is that okay?")],
    menu: "yesNo",
    saveWindow: false,
    autoHold: null,
  },
  farewell: {
    pages: [page("end", "We look forward to your next visit.")],
    menu: null,
    saveWindow: false,
    autoHold: null,
  },
  saveInfo: {
    pages: [page("end", "Would you like to save the game?")],
    menu: "yesNo",
    saveWindow: true,
    autoHold: null,
  },
  overwrite: {
    pages: [page("end", "There is already a saved file.", "Is it okay to overwrite it?")],
    menu: "yesNo",
    saveWindow: true,
    autoHold: null,
  },
  saving: {
    pages: [page("end", "SAVING…", "DON'T TURN OFF THE POWER.")],
    menu: null,
    saveWindow: true,
    // lbr-f: ROM-measured on the lbrd-won-attendant window (docs/lbrf-won-timing.md): 261, not lbr-b's inferred 259.
    autoHold: 261,
  },
  saved: {
    pages: [page("end", `${PLAYER_NAME} saved the game.`)],
    menu: null,
    saveWindow: true,
    autoHold: null,
  },
  step: {
    pages: [page("end", "Please step this way.")],
    menu: null,
    saveWindow: false,
    autoHold: null,
  },
});

export const ATTENDANT_MENU_ITEMS: Readonly<Record<AttendantMenuKind, readonly string[]>> = Object.freeze({
  challenge: ["CHALLENGE", "INFO", "EXIT"],
  level: ["LV. 50", "OPEN LEVEL", "EXIT"],
  yesNo: ["YES", "NO"],
});

/** ROM-measured offsets, in ticks from the A press (tick 0) unless noted. */
export const ATTENDANT_TIMING = Object.freeze({
  /** A at the attendant -> the box's first (blank) frame; the first glyph follows. */
  openBoxDelay: 5,
  /** `\p` page turn: first glyph of the next page. */
  pageTurnFirstGlyph: 3,
  /** `\l` scroll: elapsed ticks the lines scroll (4 px each), and the third line's first glyph. */
  scrollTicks: 4,
  scrollThirdLineDelay: 8,
  /** A on a finished final page -> the next message's first glyph. */
  messageToMessageFirstGlyph: 5,
  /** SAVING... -> saved (start_menu.c SaveDoSaveCallback, not a script message): the box is blank 2 frames before the first glyph, not 1. */
  savingToSavedFirstGlyph: 6,
  /** A on a menu / yes-no choice -> menu gone; text cleared; next message's first glyph. */
  menuGoneTick: 2,
  menuChoiceClearTick: Object.freeze({ challenge: 4, level: 4, yesNo: 3 }),
  menuToMessageFirstGlyph: Object.freeze({ challenge: 5, level: 5, yesNo: 4 }),
  /** YES at "I need to save the game" -> the save window's first glyph (the bare field shows between). */
  menuToSaveInfoFirstGlyph: 10,
  /** A on a finished message -> the old text clears (blank box); the next first glyph follows. */
  messageClearTick: 4,
  /** Ticks after the last glyph before the menu appears (per menu kind). */
  menuDelayAfterText: Object.freeze({ challenge: 4, level: 4, yesNo: 3 }),
  /** The save dialog's own YES/NO (drawn with the save-info window) follows the last glyph this fast. */
  saveDialogMenuDelay: 1,
  /** Ticks after the final A that the box closes over the bare field. */
  boxCloseTick: 3,
  /** Menu input is accepted from this many ticks after the menu appears. */
  menuInputDelay: 0,
  /** Frames the bare field shows between the YES and the save window. */
  saveWindowOpenDelay: 10,
  /** Door walk: attendant 3 tiles then player 4 tiles at 16 frames/tile, then the fade and warp. */
  walkFrames: 64,
  fadeFrames: 37,
  /** Arrow blink: 9-frame groups over the 4-entry bob table. */
  arrowGroupFrames: 9,
});

export type AttendantLeadKind = "open" | "turn" | "scroll" | "message" | "menuChoice" | "auto";

export interface AttendantLead {
  readonly kind: AttendantLeadKind;
  /** Ticks since the press / edge. */
  readonly tick: number;
  readonly prevScreen: AttendantScreenId | null;
  readonly prevPage: number;
  readonly prevAge: number;
  readonly prevCursor: number;
  readonly prevMenu: AttendantMenuKind | null;
}

export type AttendantPhase = "talk" | "closing" | "walk" | "fade";

export interface FactoryLobbyAttendantState {
  /** Engine frame of the opening A: the ROM script freezes the field's NPCs (the wandering woman) from here. */
  readonly startFrame: number;
  readonly phase: AttendantPhase;
  readonly screen: AttendantScreenId;
  readonly page: number;
  /** Ticks since this page's first glyph (negative while a lead-in plays). */
  readonly age: number;
  readonly lead: AttendantLead | null;
  readonly cursor: number;
  /** A cursor move the ROM draws one frame later (level / YES-NO menus); applied on the next tick. */
  readonly pendingCursor?: number;
  /** Menu choices already shown (INFO returns to the question). */
  readonly closingTick: number;
  readonly closingTo: "freeRoam" | "walk";
  /** Walk / fade ticks. */
  readonly phaseTick: number;
  /** Set when the conversation ends back in free roam (core clears the state). */
  readonly done: "freeRoam" | "draft" | null;
  /** lbr-c: the ROM save dialog has begun (its window drew its first frame). Stays set for the rest of the conversation. */
  readonly saveDialogStarted: boolean;
}

export interface AttendantInput {
  readonly a: boolean;
  readonly b: boolean;
  readonly up: boolean;
  readonly down: boolean;
}

/** A page that follows a `\l` scroll prints only its last line; the first is the scrolled-up previous line. */
export function attendantPageContinuesScroll(screen: AttendantScreenId, pageIndex: number): boolean {
  return pageIndex > 0 && ATTENDANT_SCREENS[screen].pages[pageIndex - 1]!.end === "l";
}

export function attendantGlyphCount(screen: AttendantScreenId, pageIndex: number): number {
  const lines = ATTENDANT_SCREENS[screen].pages[pageIndex]!.lines;
  if (attendantPageContinuesScroll(screen, pageIndex)) return lines[lines.length - 1]!.length;
  return lines.reduce((n, line) => n + line.length, 0);
}

/** Age (from the first glyph) of the page's last glyph. */
export function attendantLastGlyphAge(screen: AttendantScreenId, pageIndex: number): number {
  return attendantGlyphCount(screen, pageIndex) - 1;
}

export function attendantMenuAppearAge(screen: AttendantScreenId): number | null {
  const def = ATTENDANT_SCREENS[screen];
  if (def.menu === null) return null;
  const delay = def.saveWindow ? ATTENDANT_TIMING.saveDialogMenuDelay : ATTENDANT_TIMING.menuDelayAfterText[def.menu];
  return attendantLastGlyphAge(screen, def.pages.length - 1) + delay;
}

function startScreen(
  state: FactoryLobbyAttendantState,
  screen: AttendantScreenId,
  kind: AttendantLeadKind,
  leadTotal: number,
  cursor = 0,
): FactoryLobbyAttendantState {
  const prevDef = ATTENDANT_SCREENS[state.screen];
  return Object.freeze({
    ...state,
    screen,
    page: 0,
    age: -leadTotal + 1,
    cursor,
    lead: Object.freeze({
      kind,
      tick: 1,
      prevScreen: state.screen,
      prevPage: state.page,
      prevAge: state.age,
      prevCursor: state.cursor,
      prevMenu: prevDef.menu !== null && state.age >= (attendantMenuAppearAge(state.screen) ?? Infinity) ? prevDef.menu : null,
    }),
  });
}

export function createFactoryLobbyAttendantState(startFrame: number): FactoryLobbyAttendantState {
  return Object.freeze({
    startFrame,
    phase: "talk",
    screen: "welcome",
    page: 0,
    age: -ATTENDANT_TIMING.openBoxDelay,
    lead: Object.freeze({
      kind: "open",
      tick: 0,
      prevScreen: null,
      prevPage: 0,
      prevAge: 0,
      prevCursor: 0,
      prevMenu: null,
    }),
    cursor: 0,
    closingTick: 0,
    closingTo: "freeRoam",
    phaseTick: 0,
    done: null,
    saveDialogStarted: false,
  });
}

/** Is the finished page/menu ready to take A / B (the conversation is not mid-lead-in, mid-typing or auto-holding)? */
export function attendantAcceptsInput(state: FactoryLobbyAttendantState): boolean {
  if (state.phase !== "talk" || state.lead !== null) return false;
  const def = ATTENDANT_SCREENS[state.screen];
  const last = def.pages.length - 1;
  const typed = attendantLastGlyphAge(state.screen, state.page);
  if (def.menu !== null && state.page === last) return state.age >= (attendantMenuAppearAge(state.screen) ?? Infinity);
  if (def.autoHold !== null) return false;
  return state.age > typed;
}

/** Tick of the post-choice lead at which the old page clears; a YES/NO declined to the farewell clears one frame later. */
export function attendantMenuClearTick(prevMenu: AttendantMenuKind, next: AttendantScreenId): number {
  return ATTENDANT_TIMING.menuChoiceClearTick[prevMenu] + (next === "farewell" && prevMenu === "yesNo" ? 1 : 0);
}

function menuChoice(state: FactoryLobbyAttendantState, def: AttendantScreenDef, input: AttendantInput): FactoryLobbyAttendantState {
  if (state.pendingCursor !== undefined) {
    state = Object.freeze({ ...state, cursor: state.pendingCursor, pendingCursor: undefined });
  }
  const items = ATTENDANT_MENU_ITEMS[def.menu!];
  const decide = (screen: AttendantScreenId | "walk" | "exit", cursor = 0): FactoryLobbyAttendantState => {
    if (screen === "exit") return closeBox(state, "freeRoam");
    if (screen === "walk") return closeBox(state, "walk");
    const lead = screen === "saveInfo"
      ? ATTENDANT_TIMING.menuToSaveInfoFirstGlyph
      : ATTENDANT_TIMING.menuToMessageFirstGlyph[def.menu!] + (screen === "farewell" && def.menu === "yesNo" ? 1 : 0);
    return startScreen(state, screen, "menuChoice", lead, cursor);
  };
  if (input.up || input.down) {
    // lbb1: none of the attendant's menus wraps: the three-entry multichoices run Menu_ProcessInputNoWrap (script_menu.c:143-146, tDoWrap
    // only above three entries), MSGBOX_YESNO and the save dialog's YES/NO Menu_ProcessInputNoWrapClearOnChoose (menu.c): a press at an
    // end leaves the cursor (and plays nothing, lobbySounds.ts).
    const delta = input.down ? 1 : -1;
    const cursor = Math.min(items.length - 1, Math.max(0, state.cursor + delta));
    if (cursor === state.cursor) return state;
    if (def.menu !== "challenge") return Object.freeze({ ...state, pendingCursor: cursor });
    return Object.freeze({ ...state, cursor });
  }
  const b = input.b;
  if (!input.a && !b) return state;
  switch (state.screen) {
    case "ask":
      if (b || state.cursor === 2) return decide("farewell");
      if (state.cursor === 0) return decide("level");
      return decide("explain");
    case "level":
      if (b || state.cursor === 2) return decide("farewell");
      if (state.cursor === 1) return state; // Open Level: not modelled, A is a no-op
      return decide("saveQuestion");
    case "saveQuestion":
      if (b || state.cursor === 1) return decide("farewell");
      return decide("saveInfo");
    case "saveInfo":
      if (b || state.cursor === 1) return decide("farewell");
      return decide("overwrite");
    case "overwrite":
      if (b || state.cursor === 1) return decide("farewell");
      return decide("saving");
    default:
      return state;
  }
}

/**
 * lbw8: the ROM's `releaseall` runs on the frame before this conversation's `done` tick: the Lobby NPCs resume (and draw RNG) on the tick that
 * brings `closingTick` to `boxCloseTick - 1` and on the `done` tick (ROM `sGlobalScriptContextStatus` -> 2 one frame before the app's `done`,
 * all seven farewell routes of lbrb-*). Walking to the draft keeps the lock.
 */
export function isFactoryLobbyAttendantNpcsReleased(state: FactoryLobbyAttendantState): boolean {
  return state.phase === "closing" && state.closingTo === "freeRoam" && state.closingTick >= ATTENDANT_TIMING.boxCloseTick - 1;
}

function closeBox(state: FactoryLobbyAttendantState, to: "freeRoam" | "walk"): FactoryLobbyAttendantState {
  return Object.freeze({ ...state, phase: "closing", closingTick: 1, closingTo: to });
}

/** Advance one tick; `done` is set on the tick the conversation hands back. */
export function advanceFactoryLobbyAttendant(
  state: FactoryLobbyAttendantState,
  input: AttendantInput,
): FactoryLobbyAttendantState {
  if (state.phase === "closing") {
    const closingTick = state.closingTick + 1;
    if (closingTick < ATTENDANT_TIMING.boxCloseTick) return Object.freeze({ ...state, closingTick });
    if (state.closingTo === "freeRoam") return Object.freeze({ ...state, closingTick, done: "freeRoam" });
    return Object.freeze({ ...state, closingTick, phase: "walk", phaseTick: 0 });
  }
  if (state.phase === "walk") {
    const phaseTick = state.phaseTick + 1;
    if (phaseTick < ATTENDANT_TIMING.walkFrames) return Object.freeze({ ...state, phaseTick });
    return Object.freeze({ ...state, phase: "fade", phaseTick: 0 });
  }
  if (state.phase === "fade") {
    const phaseTick = state.phaseTick + 1;
    if (phaseTick < ATTENDANT_TIMING.fadeFrames) return Object.freeze({ ...state, phaseTick });
    return Object.freeze({ ...state, phaseTick, done: "draft" });
  }

  const def = ATTENDANT_SCREENS[state.screen];
  // Lead-in: the previous visual plays out, then this screen's first glyph is age 0.
  if (state.lead !== null) {
    const age = state.age + 1;
    const lead = age >= 0 ? null : Object.freeze({ ...state.lead, tick: state.lead.tick + 1 });
    return Object.freeze({
      ...state,
      age,
      lead,
      saveDialogStarted: state.saveDialogStarted || (lead === null && state.screen === "saveInfo"),
    });
  }
  const age = state.age + 1;
  const ticked: FactoryLobbyAttendantState = Object.freeze({ ...state, age });
  if (!attendantAcceptsInput(state)) {
    if (def.autoHold !== null && state.page === def.pages.length - 1) {
      const typed = attendantLastGlyphAge(state.screen, state.page);
      if (age === typed + def.autoHold) return startScreen(ticked, "saved", "auto", ATTENDANT_TIMING.savingToSavedFirstGlyph);
    }
    return ticked;
  }
  const lastPage = state.page === def.pages.length - 1;
  if (def.menu !== null && lastPage) return menuChoice(ticked, def, input);
  if (!input.a && !input.b) return ticked;
  const pageDef = def.pages[state.page]!;
  if (pageDef.end === "p") {
    return Object.freeze({
      ...ticked,
      page: state.page + 1,
      age: -ATTENDANT_TIMING.pageTurnFirstGlyph + 1,
      lead: Object.freeze({
        kind: "turn" as const,
        tick: 1,
        prevScreen: state.screen,
        prevPage: state.page,
        prevAge: state.age,
        prevCursor: 0,
        prevMenu: null,
      }),
    });
  }
  if (pageDef.end === "l") {
    return Object.freeze({
      ...ticked,
      page: state.page + 1,
      age: -ATTENDANT_TIMING.scrollThirdLineDelay + 1,
      lead: Object.freeze({
        kind: "scroll" as const,
        tick: 1,
        prevScreen: state.screen,
        prevPage: state.page,
        prevAge: state.age,
        prevCursor: 0,
        prevMenu: null,
      }),
    });
  }
  // Last page of a message.
  switch (state.screen) {
    case "welcome":
      return startScreen(ticked, "ask", "message", ATTENDANT_TIMING.messageToMessageFirstGlyph);
    case "explain":
      return startScreen(ticked, "ask", "message", ATTENDANT_TIMING.messageToMessageFirstGlyph);
    case "farewell":
      return closeBox(ticked, "freeRoam");
    case "saved":
      return startScreen(ticked, "step", "message", ATTENDANT_TIMING.messageToMessageFirstGlyph);
    case "step":
      return closeBox(ticked, "walk");
    default:
      return ticked;
  }
}
