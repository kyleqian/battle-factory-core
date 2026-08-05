import type {
  BattlePresentationCommand,
  BattlePresentationCompletion,
} from "./battlePresentation.ts";

export interface FactoryTerminalRecordProfile {
  /** Source-owned save-SE wait from party/status restoration to the prompt. */
  readonly recordPromptDelayFromRestore: number;
  readonly recordPromptTextDelay: number;
  readonly recordPromptInputDelay: number;
  readonly recordScrollTicks: number;
  readonly recordThirdLineDelay: number;
  readonly recordMenuDrawDelay: number;
  readonly recordMenuVisibleDelay: number;
  readonly recordMenuInputDelay: number;
}

export interface FactoryTerminalLossProfile extends FactoryTerminalRecordProfile {
  readonly outcome: "loss";
  readonly blackFirstAge: number;
  readonly fieldFirstAge: number;
  readonly fadeFirstAge: number;
  readonly messageFrameAge: number;
  readonly firstPageTextAge: number;
  readonly firstPageInputReadyAge: number;
  readonly nextPageVisualDelay: number;
  readonly printerHandoffDelay: number;
  readonly statusClearDelayFromSecondRelease: number;
  readonly pages: readonly [
    readonly [string, string],
    readonly [string, string],
    readonly [string, string],
  ];
}

export interface FactoryTerminalRoundWonProfile
  extends FactoryTerminalRecordProfile {
  readonly outcome: "roundWon";
  readonly blackFirstAge: number;
  readonly fieldFirstAge: number;
  readonly fadeFirstAge: number;
  readonly messageFrameAge: number;
  readonly congratulationsTextDelay: number;
  readonly congratulationsInputReadyAge: number;
  readonly awardTextDelay: number;
  readonly awardScrollInputDelay: number;
  readonly awardScrollTicks: number;
  readonly awardThirdLineTextDelay: number;
  readonly awardDefaultInputDelay: number;
  readonly battlePointMutationDelay: number;
  readonly getPointsTextDelay: number;
  readonly fanfareTicks: number;
  readonly exchangeTextDelayFromFanfareEnd: number;
  readonly exchangeInputDelay: number;
  readonly exchangeNextPageVisualDelay: number;
  readonly restoreDelayFromExchangeRelease: number;
  readonly congratulations: readonly [string, string];
  readonly award: readonly [string, string, string];
  readonly getPoints: readonly [string, string];
  readonly exchange: readonly [
    readonly [string, string],
    readonly [string, string],
  ];
  readonly battlePointAward: number;
}

/**
 * Source-relative Scene-OFF loss route from the real post-terminal Lobby
 * warp. Ages are relative to the roundLost publish (dismiss+2), so the
 * shared return-to-field span (rendered by postwin) covers ages 0-113 and
 * this profile's first rendered frame is the Lobby fade-in at age 114 —
 * the real schedule banked dense in ISSUES #73 (fade 114-128, box 141,
 * page-0 "Thank you for participating!" typing 142-169 + cursor 171, the
 * fixture's real A at 301 dismissing it, page-1 return-rentals typing 303+
 * and its real A at 602 dismissing it).
 *
 * The page-0 -> page-1 handoff is the real game's CHAR_PROMPT_CLEAR
 * (text.c RENDER_STATE_CLEAR): the held page survives `nextPageVisualDelay`
 * ticks after the dismiss edge, then FillWindowPixelBuffer wipes the box
 * interior and the next page starts printing the same tick. Page-1's first
 * two characters ("I " of "I will return your POKéMON in exchange") render
 * identically to the empty box frame, which is exactly the oracle's
 * 3-tick clear/reopen look at frames 3535-3537 (empty 3535-3536, first
 * visible glyph "w" at 3537) before the 1-char/tick printer takes over.
 *
 * The page-0 first-glyph age was corrected 143 -> 142 by a dense oracle
 * re-probe over the previously-unverified page-0 span (frames 3374-3403,
 * one tick after the box opens at 3373): the old 143 delayed every page-0
 * typing + cursor frame by one tick. The correction is covered by
 * `tests/factoryTerminalPresentation.test.ts`'s "types page-0's first glyph"
 * pin, red-verified against the old value.
 */
export const FACTORY_LOSS_TERMINAL_PROFILE: FactoryTerminalLossProfile =
  Object.freeze({
    outcome: "loss",
    blackFirstAge: 2,
    fieldFirstAge: 114,
    fadeFirstAge: 114,
    messageFrameAge: 141,
    firstPageTextAge: 142,
    firstPageInputReadyAge: 171,
    nextPageVisualDelay: 2,
    printerHandoffDelay: 2,
    statusClearDelayFromSecondRelease: 50,
    recordPromptDelayFromRestore: 172,
    recordPromptTextDelay: 1,
    recordPromptInputDelay: 63,
    recordScrollTicks: 4,
    recordThirdLineDelay: 7,
    recordMenuDrawDelay: 23,
    recordMenuVisibleDelay: 23,
    recordMenuInputDelay: 25,
    pages: Object.freeze([
      Object.freeze(["Thank you for participating!", ""] as const),
      Object.freeze([
        "I will return your POKéMON in exchange",
        "for our rental POKéMON.",
      ] as const),
      Object.freeze([
        "I must also save the event results.",
        "Please wait.",
      ] as const),
    ] as const),
  });

/**
 * Regular Level-50 seventh-win route. Every clock after the initial map
 * handoff is relative to a stored input edge; the roomy staged releases at
 * +300/+1100/+2200 are evidence inputs, not production timeline branches.
 */
export const FACTORY_ROUND_WON_TERMINAL_PROFILE: FactoryTerminalRoundWonProfile =
  Object.freeze({
    outcome: "roundWon",
    blackFirstAge: 2,
    fieldFirstAge: 13,
    fadeFirstAge: 13,
    messageFrameAge: 40,
    congratulationsTextDelay: 41,
    congratulationsInputReadyAge: 102,
    awardTextDelay: 6,
    awardScrollInputDelay: 69,
    awardScrollTicks: 4,
    awardThirdLineTextDelay: 7,
    awardDefaultInputDelay: 41,
    battlePointMutationDelay: 1,
    getPointsTextDelay: 3,
    fanfareTicks: 312,
    exchangeTextDelayFromFanfareEnd: 8,
    exchangeInputDelay: 51,
    exchangeNextPageVisualDelay: 2,
    restoreDelayFromExchangeRelease: 49,
    recordPromptDelayFromRestore: 169,
    recordPromptTextDelay: 1,
    recordPromptInputDelay: 63,
    recordScrollTicks: 4,
    recordThirdLineDelay: 7,
    recordMenuDrawDelay: 22,
    recordMenuVisibleDelay: 23,
    recordMenuInputDelay: 24,
    congratulations: Object.freeze([
      "Congratulations! You’ve won seven",
      "straight Battle Swap matches!",
    ] as const),
    award: Object.freeze([
      "In recognition of your wealth of",
      "knowledge and keen intelligence,",
      "we award you these Battle Point(s).",
    ] as const),
    getPoints: Object.freeze([
      "MEMORY obtained 3 Battle Point(s).",
      "",
    ] as const),
    exchange: Object.freeze([
      Object.freeze([
        "Let me exchange your POKéMON",
        "for our rental POKéMON.",
      ] as const),
      Object.freeze([
        "I need to save the battle data,",
        "so please wait.",
      ] as const),
    ] as const),
    battlePointAward: 3,
  });

export interface FactoryTerminalLossPresentationState {
  readonly commandId: number;
  readonly battleIndex: number;
  readonly profile: FactoryTerminalLossProfile;
  /** Terminal-local age; zero is the staged CB2_LoadMap handoff. */
  readonly age: number;
  readonly firstPageReleaseAge: number | null;
  readonly secondPageReleaseAge: number | null;
  readonly partyRestored: boolean;
  readonly challengeStatus: "lost" | "clear";
  readonly completed: boolean;
  readonly recordPromptReleaseAge: number | null;
  readonly recordMenuCursor: 0 | 1;
  readonly recordChoice: "yes" | "no" | "cancel" | null;
}

export interface FactoryTerminalRoundWonPresentationState {
  readonly commandId: number;
  readonly battleIndex: number;
  readonly profile: FactoryTerminalRoundWonProfile;
  /** Terminal-local age; zero is the staged CB2_LoadMap handoff. */
  readonly age: number;
  readonly congratulationsReleaseAge: number | null;
  readonly awardScrollReleaseAge: number | null;
  readonly awardReleaseAge: number | null;
  readonly battlePointsBeforeAward: number;
  readonly displayedBattlePoints: number;
  readonly fanfareRemaining: number;
  readonly exchangeReleaseAge: number | null;
  readonly partyRestored: boolean;
  readonly challengeStatus: "won" | "clear";
  readonly completed: boolean;
  readonly recordPromptReleaseAge: number | null;
  readonly recordMenuCursor: 0 | 1;
  readonly recordChoice: "yes" | "no" | "cancel" | null;
}

export type FactoryTerminalPresentationState =
  | FactoryTerminalLossPresentationState
  | FactoryTerminalRoundWonPresentationState;

export function isFactoryTerminalRoundWon(
  state: FactoryTerminalPresentationState,
): state is FactoryTerminalRoundWonPresentationState {
  return state.profile.outcome === "roundWon";
}

export function createFactoryTerminalLossPresentation(
  command: Pick<
    Extract<BattlePresentationCommand, { readonly type: "roundLost" }>,
    "type" | "commandId" | "battleIndex"
  >,
): FactoryTerminalLossPresentationState {
  return {
    commandId: command.commandId,
    battleIndex: command.battleIndex,
    profile: FACTORY_LOSS_TERMINAL_PROFILE,
    age: 0,
    firstPageReleaseAge: null,
    secondPageReleaseAge: null,
    partyRestored: false,
    challengeStatus: "lost",
    completed: false,
    recordPromptReleaseAge: null,
    recordMenuCursor: 1,
    recordChoice: null,
  };
}

export function createFactoryTerminalRoundWonPresentation(
  command: Pick<
    Extract<BattlePresentationCommand, { readonly type: "roundCompleted" }>,
    "type" | "commandId" | "battleIndex"
  >,
  battlePointsBeforeAward = 0,
): FactoryTerminalRoundWonPresentationState {
  return {
    commandId: command.commandId,
    battleIndex: command.battleIndex,
    profile: FACTORY_ROUND_WON_TERMINAL_PROFILE,
    age: 0,
    congratulationsReleaseAge: null,
    awardScrollReleaseAge: null,
    awardReleaseAge: null,
    battlePointsBeforeAward,
    displayedBattlePoints: battlePointsBeforeAward,
    fanfareRemaining: 0,
    exchangeReleaseAge: null,
    partyRestored: false,
    challengeStatus: "won",
    completed: false,
    recordPromptReleaseAge: null,
    recordMenuCursor: 1,
    recordChoice: null,
  };
}

export function createFactoryTerminalPresentation(
  command: Extract<
    BattlePresentationCommand,
    { readonly type: "roundLost" | "roundCompleted" }
  >,
): FactoryTerminalPresentationState {
  return command.type === "roundLost"
    ? createFactoryTerminalLossPresentation(command)
    : createFactoryTerminalRoundWonPresentation(command);
}

/**
 * Source-relative message-box visual phase for a LOSS terminal page,
 * expressing the page-to-page handoff as the real game's CHAR_PROMPT_CLEAR
 * (text.c RENDER_STATE_CLEAR): after a page's release edge its text stays
 * fully on screen for `nextPageVisualDelay` ticks ("held"), then
 * FillWindowPixelBuffer wipes the interior and the next page starts
 * printing from that same tick ("cleared" — the previous page's text is no
 * longer drawn). Page-1's opening "I " of "I will return your POKéMON in
 * exchange" draws onto the box frame itself, so during its first two
 * printing ticks the box reads empty — exactly the oracle's 3535-3536
 * clear/reopen look ahead of the first visible glyph at 3537.
 */
export type FactoryTerminalPageVisualPhase =
  | "idle"
  | "typing"
  | "held"
  | "cleared";

export function factoryTerminalPageVisualPhase(
  state: FactoryTerminalLossPresentationState,
  page: 0 | 1,
): FactoryTerminalPageVisualPhase {
  if (page === 0) {
    if (state.firstPageReleaseAge === null) {
      return state.age < state.profile.firstPageTextAge ? "idle" : "typing";
    }
    return state.age <
      state.firstPageReleaseAge + state.profile.nextPageVisualDelay
      ? "held"
      : "cleared";
  }
  const firstAge = factoryTerminalPageTextFirstAge(state, 1);
  if (firstAge === null || state.age < firstAge) return "idle";
  if (state.secondPageReleaseAge === null) return "typing";
  return state.age <
    state.secondPageReleaseAge + state.profile.nextPageVisualDelay
    ? "held"
    : "cleared";
}

export function factoryTerminalActivePage(
  state: FactoryTerminalLossPresentationState,
): 0 | 1 | 2 {
  if (
    state.secondPageReleaseAge !== null &&
    state.age >=
      state.secondPageReleaseAge + state.profile.nextPageVisualDelay
  ) return 2;
  if (
    state.firstPageReleaseAge !== null &&
    state.age >=
      state.firstPageReleaseAge + state.profile.nextPageVisualDelay
  ) return 1;
  return 0;
}

export function factoryTerminalPageTextFirstAge(
  state: FactoryTerminalLossPresentationState,
  page: 0 | 1 | 2,
): number | null {
  if (page === 0) return state.profile.firstPageTextAge;
  const release =
    page === 1 ? state.firstPageReleaseAge : state.secondPageReleaseAge;
  return release === null ? null : release + state.profile.nextPageVisualDelay;
}

export function factoryTerminalVisibleChars(
  state: FactoryTerminalLossPresentationState,
): number {
  const page = factoryTerminalActivePage(state);
  const firstAge = factoryTerminalPageTextFirstAge(state, page);
  if (firstAge === null || state.age < firstAge) return 0;
  const [line1, line2] = state.profile.pages[page];
  return Math.min(line1.length + line2.length, state.age - firstAge + 1);
}

export function factoryTerminalPageInputReady(
  state: FactoryTerminalLossPresentationState,
): boolean {
  const page = factoryTerminalActivePage(state);
  if (page === 2) return false;
  if (page === 0) return state.age >= state.profile.firstPageInputReadyAge;
  const firstAge = factoryTerminalPageTextFirstAge(state, 1)!;
  const [line1, line2] = state.profile.pages[1];
  return state.age >=
    firstAge + line1.length + line2.length - 1;
}

function advanceFactoryTerminalLossPresentation(
  state: FactoryTerminalLossPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalLossPresentationState {
  const age = state.age + 1;
  let firstPageReleaseAge = state.firstPageReleaseAge;
  let secondPageReleaseAge = state.secondPageReleaseAge;
  const atNextAge = { ...state, age };
  if (input.pressedA && factoryTerminalPageInputReady(atNextAge)) {
    if (firstPageReleaseAge === null) firstPageReleaseAge = age;
    else if (secondPageReleaseAge === null) secondPageReleaseAge = age;
  }
  const clearAge =
    secondPageReleaseAge === null
      ? Number.POSITIVE_INFINITY
      : secondPageReleaseAge + state.profile.statusClearDelayFromSecondRelease;
  const completed = age >= clearAge;
  const record = advanceFactoryTerminalRecordPrompt(
    { ...state, age, completed },
    age,
    input,
  );
  return {
    ...state,
    age,
    firstPageReleaseAge,
    secondPageReleaseAge,
    partyRestored: completed,
    challengeStatus: completed ? "clear" : "lost",
    completed,
    ...record,
  };
}

export function factoryTerminalRecordMenuVisible(
  state: FactoryTerminalPresentationState,
): boolean {
  return state.recordPromptReleaseAge !== null &&
    state.age >=
      state.recordPromptReleaseAge + state.profile.recordMenuVisibleDelay;
}

export function factoryTerminalRecordMenuDrawn(
  state: FactoryTerminalPresentationState,
): boolean {
  return state.recordPromptReleaseAge !== null &&
    state.age >=
      state.recordPromptReleaseAge + state.profile.recordMenuDrawDelay;
}

export function factoryTerminalRecordMenuInputReady(
  state: FactoryTerminalPresentationState,
): boolean {
  return state.recordPromptReleaseAge !== null &&
    state.age >=
      state.recordPromptReleaseAge + state.profile.recordMenuInputDelay;
}

export function factoryTerminalRoundWonBattlePointMutationAge(
  state: FactoryTerminalRoundWonPresentationState,
): number | null {
  return state.awardReleaseAge === null
    ? null
    : state.awardReleaseAge + state.profile.battlePointMutationDelay;
}

export function factoryTerminalRestoreAge(
  state: FactoryTerminalPresentationState,
): number | null {
  if (isFactoryTerminalRoundWon(state)) {
    return state.exchangeReleaseAge === null
      ? null
      : state.exchangeReleaseAge +
        state.profile.restoreDelayFromExchangeRelease;
  }
  return state.secondPageReleaseAge === null
    ? null
    : state.secondPageReleaseAge +
      state.profile.statusClearDelayFromSecondRelease;
}

export function factoryTerminalRecordPromptFirstAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const restoreAge = factoryTerminalRestoreAge(state);
  return restoreAge === null
    ? null
    : restoreAge + state.profile.recordPromptDelayFromRestore;
}

export function factoryTerminalRecordPromptTextFirstAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const firstAge = factoryTerminalRecordPromptFirstAge(state);
  return firstAge === null
    ? null
    : firstAge + state.profile.recordPromptTextDelay;
}

export function factoryTerminalRecordPromptInputReady(
  state: FactoryTerminalPresentationState,
): boolean {
  const firstAge = factoryTerminalRecordPromptFirstAge(state);
  return firstAge !== null &&
    state.age >= firstAge + state.profile.recordPromptInputDelay;
}

function advanceFactoryTerminalRecordPrompt<
  State extends FactoryTerminalPresentationState,
>(
  state: State,
  age: number,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): Pick<
  State,
  "recordPromptReleaseAge" | "recordMenuCursor" | "recordChoice"
> {
  let recordPromptReleaseAge = state.recordPromptReleaseAge;
  let recordMenuCursor = state.recordMenuCursor;
  let recordChoice = state.recordChoice;
  const atNextAge = { ...state, age };
  if (
    recordPromptReleaseAge === null &&
    factoryTerminalRecordPromptInputReady(atNextAge) &&
    (input.pressedA || input.pressedB)
  ) {
    recordPromptReleaseAge = age;
  } else if (
    recordPromptReleaseAge !== null &&
    recordChoice === null &&
    age >= recordPromptReleaseAge + state.profile.recordMenuInputDelay
  ) {
    if (input.pressedUp) recordMenuCursor = 0;
    else if (input.pressedDown) recordMenuCursor = 1;
    else if (input.pressedB) recordChoice = "cancel";
    else if (input.pressedA) {
      recordChoice = recordMenuCursor === 0 ? "yes" : "no";
    }
  }
  return { recordPromptReleaseAge, recordMenuCursor, recordChoice };
}

export function advanceFactoryTerminalRoundWonPresentation(
  state: FactoryTerminalRoundWonPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalRoundWonPresentationState {
  const age = state.age + 1;
  const pressed = input.pressedA || input.pressedB;
  let congratulationsReleaseAge = state.congratulationsReleaseAge;
  let awardScrollReleaseAge = state.awardScrollReleaseAge;
  let awardReleaseAge = state.awardReleaseAge;
  let exchangeReleaseAge = state.exchangeReleaseAge;

  if (
    pressed &&
    congratulationsReleaseAge === null &&
    age >= state.profile.congratulationsInputReadyAge
  ) {
    congratulationsReleaseAge = age;
  } else if (
    pressed &&
    congratulationsReleaseAge !== null &&
    awardScrollReleaseAge === null &&
    age >= congratulationsReleaseAge + state.profile.awardScrollInputDelay
  ) {
    awardScrollReleaseAge = age;
  } else if (
    pressed &&
    awardScrollReleaseAge !== null &&
    awardReleaseAge === null &&
    age >= awardScrollReleaseAge + state.profile.awardDefaultInputDelay
  ) {
    awardReleaseAge = age;
  }

  const mutationAge = awardReleaseAge === null
    ? null
    : awardReleaseAge + state.profile.battlePointMutationDelay;
  const displayedBattlePoints =
    mutationAge !== null && age >= mutationAge
      ? Math.min(
        9999,
        state.battlePointsBeforeAward + state.profile.battlePointAward,
      )
      : state.battlePointsBeforeAward;
  const fanfareRemaining =
    mutationAge === null || age < mutationAge
      ? 0
      : Math.max(0, state.profile.fanfareTicks - (age - mutationAge));
  const fanfareEndAge = mutationAge === null
    ? null
    : mutationAge + state.profile.fanfareTicks;
  const exchangeTextFirstAge = fanfareEndAge === null
    ? null
    : fanfareEndAge + state.profile.exchangeTextDelayFromFanfareEnd;
  if (
    pressed &&
    exchangeReleaseAge === null &&
    exchangeTextFirstAge !== null &&
    age >= exchangeTextFirstAge + state.profile.exchangeInputDelay
  ) {
    exchangeReleaseAge = age;
  }
  const restoreAge = exchangeReleaseAge === null
    ? null
    : exchangeReleaseAge + state.profile.restoreDelayFromExchangeRelease;
  const completed = restoreAge !== null && age >= restoreAge;
  const record = advanceFactoryTerminalRecordPrompt(
    { ...state, age, exchangeReleaseAge, completed },
    age,
    input,
  );

  return {
    ...state,
    age,
    congratulationsReleaseAge,
    awardScrollReleaseAge,
    awardReleaseAge,
    displayedBattlePoints,
    fanfareRemaining,
    exchangeReleaseAge,
    partyRestored: completed,
    challengeStatus: completed ? "clear" : "won",
    completed,
    ...record,
  };
}

export function advanceFactoryTerminalPresentation(
  state: FactoryTerminalLossPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalLossPresentationState;
export function advanceFactoryTerminalPresentation(
  state: FactoryTerminalRoundWonPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalRoundWonPresentationState;
export function advanceFactoryTerminalPresentation(
  state: FactoryTerminalPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalPresentationState;
export function advanceFactoryTerminalPresentation(
  state: FactoryTerminalPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalPresentationState {
  return isFactoryTerminalRoundWon(state)
    ? advanceFactoryTerminalRoundWonPresentation(state, input)
    : advanceFactoryTerminalLossPresentation(state, input);
}

export function factoryTerminalCompletion(
  state: FactoryTerminalPresentationState,
): BattlePresentationCompletion | null {
  return state.completed ? { commandId: state.commandId } : null;
}
