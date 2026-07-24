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
  pressedA: boolean,
): FactoryTerminalPresentationState {
  const age = state.age + 1;
  let firstPageReleaseAge = state.firstPageReleaseAge;
  let secondPageReleaseAge = state.secondPageReleaseAge;
  const atNextAge = { ...state, age };
  if (pressedA && factoryTerminalPageInputReady(atNextAge)) {
    if (firstPageReleaseAge === null) firstPageReleaseAge = age;
    else if (secondPageReleaseAge === null) secondPageReleaseAge = age;
  }
  const clearAge =
    secondPageReleaseAge === null
      ? Number.POSITIVE_INFINITY
      : secondPageReleaseAge + state.profile.statusClearDelayFromSecondRelease;
  const completed = age >= clearAge;
  return {
    ...state,
    age,
    firstPageReleaseAge,
    secondPageReleaseAge,
    partyRestored: completed,
    challengeStatus: completed ? "clear" : "lost",
    completed,
  };
}

export function factoryTerminalCompletion(
  state: FactoryTerminalPresentationState,
): BattlePresentationCompletion | null {
  return state.completed ? { commandId: state.commandId } : null;
}
