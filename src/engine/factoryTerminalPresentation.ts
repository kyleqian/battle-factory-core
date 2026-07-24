import type {
  BattlePresentationCommand,
  BattlePresentationCompletion,
} from "./battlePresentation.ts";

export interface FactoryTerminalLossProfile {
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
  /** Shared AskRecordBattle message begins after the save-SE wait. */
  readonly recordPromptFirstAge: number;
  readonly recordPromptTextFirstAge: number;
  readonly recordPromptInputReadyAge: number;
  readonly recordScrollTicks: number;
  readonly recordThirdLineDelay: number;
  readonly recordMenuDrawDelay: number;
  readonly recordMenuInputDelay: number;
  readonly pages: readonly [
    readonly [string, string],
    readonly [string, string],
    readonly [string, string],
  ];
}

/** Source-relative Scene-OFF loss route from the staged lobby CB2_LoadMap seam. */
export const FACTORY_LOSS_TERMINAL_PROFILE: FactoryTerminalLossProfile =
  Object.freeze({
    outcome: "loss",
    blackFirstAge: 2,
    fieldFirstAge: 13,
    fadeFirstAge: 13,
    messageFrameAge: 40,
    firstPageTextAge: 41,
    firstPageInputReadyAge: 68,
    nextPageVisualDelay: 2,
    printerHandoffDelay: 2,
    statusClearDelayFromSecondRelease: 50,
    recordPromptFirstAge: 382,
    recordPromptTextFirstAge: 383,
    recordPromptInputReadyAge: 445,
    recordScrollTicks: 4,
    recordThirdLineDelay: 7,
    recordMenuDrawDelay: 23,
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

export interface FactoryTerminalPresentationState {
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

export function createFactoryTerminalLossPresentation(
  command: Pick<
    Extract<BattlePresentationCommand, { readonly type: "roundLost" }>,
    "type" | "commandId" | "battleIndex"
  >,
): FactoryTerminalPresentationState {
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

export function factoryTerminalActivePage(
  state: FactoryTerminalPresentationState,
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
  state: FactoryTerminalPresentationState,
  page: 0 | 1 | 2,
): number | null {
  if (page === 0) return state.profile.firstPageTextAge;
  const release =
    page === 1 ? state.firstPageReleaseAge : state.secondPageReleaseAge;
  return release === null ? null : release + state.profile.nextPageVisualDelay;
}

export function factoryTerminalVisibleChars(
  state: FactoryTerminalPresentationState,
): number {
  const page = factoryTerminalActivePage(state);
  const firstAge = factoryTerminalPageTextFirstAge(state, page);
  if (firstAge === null || state.age < firstAge) return 0;
  const [line1, line2] = state.profile.pages[page];
  return Math.min(line1.length + line2.length, state.age - firstAge + 1);
}

export function factoryTerminalPageInputReady(
  state: FactoryTerminalPresentationState,
): boolean {
  const page = factoryTerminalActivePage(state);
  if (page === 2) return false;
  if (page === 0) return state.age >= state.profile.firstPageInputReadyAge;
  const firstAge = factoryTerminalPageTextFirstAge(state, 1)!;
  const [line1, line2] = state.profile.pages[1];
  return state.age >=
    firstAge + line1.length + line2.length - 1;
}

export function advanceFactoryTerminalPresentation(
  state: FactoryTerminalPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalPresentationState {
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
  let recordPromptReleaseAge = state.recordPromptReleaseAge;
  let recordMenuCursor = state.recordMenuCursor;
  let recordChoice = state.recordChoice;
  if (
    recordPromptReleaseAge === null &&
    age >= state.profile.recordPromptInputReadyAge &&
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
  return {
    ...state,
    age,
    firstPageReleaseAge,
    secondPageReleaseAge,
    partyRestored: completed,
    challengeStatus: completed ? "clear" : "lost",
    completed,
    recordPromptReleaseAge,
    recordMenuCursor,
    recordChoice,
  };
}

export function factoryTerminalRecordMenuVisible(
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

export function factoryTerminalCompletion(
  state: FactoryTerminalPresentationState,
): BattlePresentationCompletion | null {
  return state.completed ? { commandId: state.commandId } : null;
}
