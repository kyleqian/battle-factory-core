import type { BattleMon } from "./battleScenario.ts";

export interface FactorySwapMon extends BattleMon {
  readonly personality: number;
  readonly abilityNum: number;
  readonly friendship: number;
}

export type FactorySwapParty = readonly [
  FactorySwapMon,
  FactorySwapMon,
  FactorySwapMon,
];

export interface FactoryRentalMon {
  readonly monId: number;
  readonly personality: number;
  readonly ivs: number;
  readonly abilityNum: number;
}

export type FactoryRentalRoster = readonly [
  FactoryRentalMon,
  FactoryRentalMon,
  FactoryRentalMon,
  FactoryRentalMon,
  FactoryRentalMon,
  FactoryRentalMon,
];

export type FactorySwapPhase =
  | "playerPicker"
  | "playerOptions"
  | "summaryFade"
  | "summaryReturn"
  | "playerPickerReturn"
  | "enemySwitch"
  | "playerSwitch"
  | "enemyPicker"
  | "acceptPrompt"
  | "acceptReturn"
  | "acceptExit"
  | "quitPrompt"
  | "quitReturn"
  | "quitExit"
  | "duplicateSpecies"
  | "duplicateReturn"
  | "complete";

export type FactorySwapCursor = 0 | 1 | 2 | 3 | 4;

export interface FactorySwapState {
  readonly phase: FactorySwapPhase;
  readonly playerParty: FactorySwapParty;
  readonly enemyParty: FactorySwapParty;
  readonly rentalMons: FactoryRentalRoster;
  readonly cursor: FactorySwapCursor;
  /** Window-copy-visible category cursor, one VBlank behind `cursor`. */
  readonly infoCursor: FactorySwapCursor;
  /** OAM/species-window-visible cursor, one further VBlank behind. */
  readonly displayCursor: FactorySwapCursor;
  /** Final OAM-visible arrow/action highlight, one VBlank behind the species window. */
  readonly arrowCursor: FactorySwapCursor;
  readonly cursorCopyPending: boolean;
  /** Swap_InitActions' live action span: three player balls + CANCEL, or five enemy actions. */
  readonly actionsCount: 4 | 5;
  readonly playerOptionCursor: 0 | 1 | 2;
  /** OAM-visible option cursor, copied one VBlank after the logical cursor. */
  readonly playerOptionDisplayCursor: 0 | 1 | 2;
  readonly playerOptionCursorCopyPending: boolean;
  readonly yesNoCursor: 0 | 1;
  readonly playerMonId: 0 | 1 | 2 | null;
  readonly enemyMonId: 0 | 1 | 2 | null;
  readonly quitReturnPhase: "playerPicker" | "enemyPicker" | null;
  /** Player picker was reconstructed by enemy PKMN FOR SWAP. */
  readonly playerSwitchCompleted: boolean;
  /**
   * Set only when the presentation adapter acknowledges that the current
   * transition/animation has completed. Inputs never age themselves ready.
   */
  readonly inputReady: boolean;
  /** Script-facing `gSpecialVar_Result`; FALSE means a swap was accepted. */
  readonly scriptResult: boolean | null;
  /** True only after Swap_Task_Exit state 1 has copied the selected records. */
  readonly mutationCommitted: boolean;
  readonly result: "accepted" | "keptParty" | null;
}

export type FactorySwapInput =
  | "LEFT"
  | "RIGHT"
  | "UP"
  | "DOWN"
  | "A"
  | "B";

function wrap3(value: number): 0 | 1 | 2 {
  return ((value % 3) + 3) % 3 as 0 | 1 | 2;
}

function move3(value: 0 | 1 | 2, delta: -1 | 1): 0 | 1 | 2 {
  return wrap3(value + delta);
}

function moveAction(
  value: FactorySwapCursor,
  delta: -1 | 1,
  actionsCount: 4 | 5,
): FactorySwapCursor {
  return ((value + delta + actionsCount) % actionsCount) as FactorySwapCursor;
}

export function createFactorySwapState(
  playerParty: FactorySwapParty,
  enemyParty: FactorySwapParty,
  rentalMons: FactoryRentalRoster,
): FactorySwapState {
  return {
    phase: "playerPicker",
    playerParty: playerParty.map((mon) => ({ ...mon })) as unknown as FactorySwapParty,
    enemyParty: enemyParty.map((mon) => ({ ...mon })) as unknown as FactorySwapParty,
    rentalMons: rentalMons.map((mon) => ({ ...mon })) as unknown as FactoryRentalRoster,
    cursor: 0,
    infoCursor: 0,
    displayCursor: 0,
    arrowCursor: 0,
    cursorCopyPending: false,
    actionsCount: 4,
    playerOptionCursor: 0,
    playerOptionDisplayCursor: 0,
    playerOptionCursorCopyPending: false,
    yesNoCursor: 0,
    playerMonId: null,
    enemyMonId: null,
    quitReturnPhase: null,
    playerSwitchCompleted: false,
    inputReady: false,
    scriptResult: null,
    mutationCommitted: false,
    result: null,
  };
}

export function acknowledgeFactorySwapPresentation(
  state: FactorySwapState,
): FactorySwapState {
  if (state.phase === "complete" || state.inputReady) return state;
  return { ...state, inputReady: true };
}

export function copyFactorySwapCursor(
  state: FactorySwapState,
): FactorySwapState {
  const infoCursor =
    state.infoCursor === state.cursor ? state.infoCursor : state.cursor;
  const displayCursor =
    state.cursorCopyPending || state.displayCursor === state.cursor
      ? state.displayCursor
      : state.cursor;
  const arrowCursor =
    state.arrowCursor === state.displayCursor
      ? state.arrowCursor
      : state.displayCursor;
  const playerOptionDisplayCursor =
    state.playerOptionCursorCopyPending ||
    state.playerOptionDisplayCursor === state.playerOptionCursor
      ? state.playerOptionDisplayCursor
      : state.playerOptionCursor;
  const cursorCopyPending = false;
  const playerOptionCursorCopyPending = false;
  if (
    infoCursor === state.infoCursor &&
    displayCursor === state.displayCursor &&
    arrowCursor === state.arrowCursor &&
    cursorCopyPending === state.cursorCopyPending &&
    playerOptionDisplayCursor === state.playerOptionDisplayCursor &&
    playerOptionCursorCopyPending === state.playerOptionCursorCopyPending
  ) return state;
  return {
    ...state,
    infoCursor,
    displayCursor,
    arrowCursor,
    cursorCopyPending,
    playerOptionDisplayCursor,
    playerOptionCursorCopyPending,
  };
}

export function factorySwapAlreadyHasSpecies(
  state: FactorySwapState,
  enemyMonId: 0 | 1 | 2 = state.cursor as 0 | 1 | 2,
): boolean {
  if (state.playerMonId === null) return false;
  const species = state.enemyParty[enemyMonId].species;
  return state.playerParty.some(
    (mon, index) => index !== state.playerMonId && mon.species === species,
  );
}

export function applyFactorySwapMutation(state: FactorySwapState): FactorySwapState {
  if (state.playerMonId === null || state.enemyMonId === null) {
    throw new Error("accepted Factory swap requires both selected party indexes");
  }
  const replacement = {
    ...state.enemyParty[state.enemyMonId],
    // BattleMon does not require this field, but retaining it makes the
    // source's explicit SetMonData(MON_DATA_FRIENDSHIP, 0) observable.
    friendship: 0,
  };
  const playerParty = [...state.playerParty] as [
    typeof replacement,
    typeof replacement,
    typeof replacement,
  ];
  playerParty[state.playerMonId] = replacement;
  const offered = state.rentalMons[state.enemyMonId + 3]!;
  const rentalMons = [...state.rentalMons] as FactoryRentalMon[];
  rentalMons[state.playerMonId] = {
    monId: offered.monId,
    ivs: offered.ivs,
    personality: replacement.personality,
    abilityNum: replacement.abilityNum,
  };
  return {
    ...state,
    phase: "complete",
    playerParty,
    rentalMons: rentalMons as unknown as FactoryRentalRoster,
    inputReady: false,
    mutationCommitted: true,
    result: "accepted",
  };
}

/**
 * Swap_Task_Exit state 1's atomic CopySwappedMonData boundary. Unlike the
 * public direct helper above, this keeps the live exit phase active while
 * its palette fade and callback handoff finish.
 */
export function commitFactorySwapMutation(
  state: FactorySwapState,
): FactorySwapState {
  const committed = applyFactorySwapMutation(state);
  return { ...committed, phase: "acceptExit" };
}

/**
 * Presentation-to-round seam.  An accepted swap becomes available at the
 * source CopySwappedMonData boundary; a kept-party exit becomes available at
 * the later CB2_ReturnToFieldContinueScript boundary.  Keeping the latter
 * tied to `complete` preserves the source exit window while allowing the
 * generic round controller to consume both outcomes.
 */
export function factorySwapRoundDecision(
  state: FactorySwapState,
): {
  readonly type: "accept";
  readonly playerPartyIndex: 0 | 1 | 2;
  readonly opponentPartyIndex: 0 | 1 | 2;
} | {
  readonly type: "decline";
} | null {
  if (state.phase === "complete" && state.result === "keptParty") {
    return { type: "decline" };
  }
  if (
    !state.mutationCommitted ||
    state.result !== "accepted" ||
    state.playerMonId === null ||
    state.enemyMonId === null
  ) return null;
  return {
    type: "accept",
    playerPartyIndex: state.playerMonId,
    opponentPartyIndex: state.enemyMonId,
  };
}

export function handleFactorySwapInput(
  state: FactorySwapState,
  input: FactorySwapInput,
): FactorySwapState {
  if (!state.inputReady || state.phase === "complete") return state;

  switch (state.phase) {
    case "playerPicker":
    case "enemyPicker": {
      if (
        input === "LEFT" ||
        input === "RIGHT" ||
        input === "UP" ||
        input === "DOWN"
      ) {
        const cursor =
          input === "LEFT" || input === "RIGHT"
            ? moveAction(state.cursor, input === "LEFT" ? -1 : 1, state.actionsCount)
            : input === "DOWN"
              ? state.cursor < 3
                ? 3
                : moveAction(state.cursor, 1, state.actionsCount)
              : state.cursor < 3
                ? state.actionsCount - 1 as FactorySwapCursor
                : moveAction(state.cursor, -1, state.actionsCount);
        return { ...state, cursor, cursorCopyPending: true };
      }
      if (input === "B") {
        return {
          ...state,
          phase: "quitPrompt",
          inputReady: false,
          yesNoCursor: 0,
          quitReturnPhase: state.phase,
        };
      }
      if (input !== "A") return state;
      if (
        (state.phase === "playerPicker" && state.cursor === 3) ||
        (state.phase === "enemyPicker" && state.cursor === 4)
      ) {
        return {
          ...state,
          phase: "quitPrompt",
          inputReady: false,
          yesNoCursor: 0,
          quitReturnPhase: state.phase,
        };
      }
      if (state.phase === "enemyPicker" && state.cursor === 3) {
        return {
          ...state,
          phase: "playerSwitch",
          inputReady: false,
        };
      }
      if (state.cursor >= 3) return state;
      if (state.phase === "playerPicker") {
        return {
          ...state,
          phase: "playerOptions",
          playerOptionCursor: 0,
          playerOptionDisplayCursor: 0,
          playerOptionCursorCopyPending: false,
          inputReady: false,
        };
      }
      if (factorySwapAlreadyHasSpecies(state)) {
        return { ...state, phase: "duplicateSpecies", inputReady: false };
      }
      return {
        ...state,
        phase: "acceptPrompt",
        enemyMonId: state.cursor as 0 | 1 | 2,
        yesNoCursor: 0,
        inputReady: false,
      };
    }
    case "playerOptions": {
      if (input === "UP" || input === "DOWN") {
        return {
          ...state,
          playerOptionCursor: move3(
            state.playerOptionCursor,
            input === "UP" ? -1 : 1,
          ),
          playerOptionCursorCopyPending: true,
        };
      }
      if (input === "B" || (input === "A" && state.playerOptionCursor === 2)) {
        return { ...state, phase: "playerPickerReturn", inputReady: false };
      }
      if (input !== "A") return state;
      if (state.playerOptionCursor === 0) {
        return { ...state, phase: "summaryFade", inputReady: false };
      }
      return {
        ...state,
        phase: "enemySwitch",
        playerMonId: state.cursor as 0 | 1 | 2,
        cursor: 0,
        infoCursor: 0,
        displayCursor: 0,
        arrowCursor: 0,
        cursorCopyPending: false,
        inputReady: false,
      };
    }
    case "summaryFade":
    case "summaryReturn":
    case "playerPickerReturn":
    case "enemySwitch":
    case "playerSwitch":
    case "duplicateReturn":
    case "acceptReturn":
    case "acceptExit":
    case "quitReturn":
    case "quitExit":
      return state;
    case "acceptPrompt": {
      if (input === "UP" || input === "DOWN") {
        return { ...state, yesNoCursor: state.yesNoCursor === 0 ? 1 : 0 };
      }
      if (input === "B" || (input === "A" && state.yesNoCursor === 1)) {
        return {
          ...state,
          phase: "acceptReturn",
          inputReady: false,
        };
      }
      return input === "A"
        ? { ...state, phase: "acceptExit", inputReady: false }
        : state;
    }
    case "quitPrompt": {
      if (input === "UP" || input === "DOWN") {
        return { ...state, yesNoCursor: state.yesNoCursor === 0 ? 1 : 0 };
      }
      if (input === "A" && state.yesNoCursor === 0) {
        return {
          ...state,
          phase: "quitExit",
          inputReady: false,
        };
      }
      if (input === "A" || input === "B") {
        return {
          ...state,
          phase: "quitReturn",
          inputReady: false,
        };
      }
      return state;
    }
    case "duplicateSpecies":
      return input === "A" || input === "B"
        ? { ...state, phase: "duplicateReturn", inputReady: false }
        : state;
  }
}
