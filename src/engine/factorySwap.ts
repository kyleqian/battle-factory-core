import type { BattleParty } from "./battleScenario.ts";

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
  | "enemyPicker"
  | "acceptPrompt"
  | "duplicateSpecies"
  | "complete";

export interface FactorySwapState {
  readonly phase: FactorySwapPhase;
  readonly playerParty: BattleParty;
  readonly enemyParty: BattleParty;
  readonly rentalMons: FactoryRentalRoster;
  readonly cursor: 0 | 1 | 2;
  readonly displayCursor: 0 | 1 | 2;
  readonly playerOptionCursor: 0 | 1 | 2;
  readonly yesNoCursor: 0 | 1;
  readonly playerMonId: 0 | 1 | 2 | null;
  readonly enemyMonId: 0 | 1 | 2 | null;
  /**
   * Set only when the presentation adapter acknowledges that the current
   * transition/animation has completed. Inputs never age themselves ready.
   */
  readonly inputReady: boolean;
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

export function createFactorySwapState(
  playerParty: BattleParty,
  enemyParty: BattleParty,
  rentalMons: FactoryRentalRoster,
): FactorySwapState {
  return {
    phase: "playerPicker",
    playerParty: playerParty.map((mon) => ({ ...mon })) as unknown as BattleParty,
    enemyParty: enemyParty.map((mon) => ({ ...mon })) as unknown as BattleParty,
    rentalMons: rentalMons.map((mon) => ({ ...mon })) as unknown as FactoryRentalRoster,
    cursor: 0,
    displayCursor: 0,
    playerOptionCursor: 0,
    yesNoCursor: 0,
    playerMonId: null,
    enemyMonId: null,
    inputReady: false,
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
  if (state.displayCursor === state.cursor) return state;
  return { ...state, displayCursor: state.cursor };
}

export function factorySwapAlreadyHasSpecies(
  state: FactorySwapState,
  enemyMonId: 0 | 1 | 2 = state.cursor,
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
    personality: offered.personality,
    abilityNum: offered.abilityNum,
  };
  return {
    ...state,
    phase: "complete",
    playerParty,
    rentalMons: rentalMons as unknown as FactoryRentalRoster,
    inputReady: false,
    result: "accepted",
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
      if (input === "LEFT" || input === "RIGHT") {
        const cursor = move3(state.cursor, input === "LEFT" ? -1 : 1);
        return { ...state, cursor };
      }
      if (input === "B") {
        return {
          ...state,
          phase: "complete",
          inputReady: false,
          result: "keptParty",
        };
      }
      if (input !== "A") return state;
      if (state.phase === "playerPicker") {
        return {
          ...state,
          phase: "playerOptions",
          playerOptionCursor: 0,
          inputReady: false,
        };
      }
      if (factorySwapAlreadyHasSpecies(state)) {
        return { ...state, phase: "duplicateSpecies", inputReady: false };
      }
      return {
        ...state,
        phase: "acceptPrompt",
        enemyMonId: state.cursor,
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
        };
      }
      if (input === "B" || (input === "A" && state.playerOptionCursor === 2)) {
        return { ...state, phase: "playerPicker", inputReady: false };
      }
      if (input !== "A") return state;
      if (state.playerOptionCursor === 0) {
        // SUMMARY owns its own screen; returning preserves the picker choice.
        return { ...state, inputReady: false };
      }
      return {
        ...state,
        phase: "enemyPicker",
        playerMonId: state.cursor,
        cursor: 0,
        displayCursor: 0,
        inputReady: false,
      };
    }
    case "acceptPrompt": {
      if (input === "UP" || input === "DOWN") {
        return { ...state, yesNoCursor: state.yesNoCursor === 0 ? 1 : 0 };
      }
      if (input === "B" || (input === "A" && state.yesNoCursor === 1)) {
        return {
          ...state,
          phase: "enemyPicker",
          enemyMonId: null,
          inputReady: false,
        };
      }
      return input === "A" ? applyFactorySwapMutation(state) : state;
    }
    case "duplicateSpecies":
      return input === "A" || input === "B"
        ? { ...state, phase: "enemyPicker", inputReady: false }
        : state;
  }
}
