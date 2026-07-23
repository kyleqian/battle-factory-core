import {
  assertBattleParty,
  cloneBattleParty,
  cloneOpponent,
  healBattleParty,
  prepareBattleScenario,
  type BattleIndex,
  type BattleOpponent,
  type BattleParty,
  type BattleScenario,
  type PreparedOpponentSelection,
} from "./battleScenario.ts";
import { selectFactoryTrainer } from "./factoryTrainerSchedule.ts";
import type {
  BattlePresentationCommand,
  BattlePresentationCompletion,
  PendingBattlePresentation,
} from "./battlePresentation.ts";

export type RoundPhase =
  | "presentingBattleStart"
  | "battleActive"
  | "presentingBattleWin"
  | "awaitingSwapDecision"
  | "presentingSwapResult"
  | "roundLost"
  | "roundComplete";

export interface CompletedBattle {
  readonly outcome: "win" | "loss";
  readonly playerParty: BattleParty;
  readonly opponentParty: BattleParty;
}

export interface SwapDecision {
  readonly type: "decline" | "accept";
  readonly playerPartyIndex?: number;
  readonly opponentPartyIndex?: number;
}

export interface RoundRulesState {
  readonly phase: RoundPhase;
  readonly battleIndex: BattleIndex;
  readonly playerParty: BattleParty;
  readonly currentOpponent: BattleOpponent;
  readonly opponentHistory: readonly string[];
  readonly rngValue: number;
  readonly lastBattle: CompletedBattle | null;
  readonly lastSwap: SwapDecision | null;
}

export interface RoundControllerState {
  readonly scenarioId: string;
  /** Fixture scenarios start complete; Factory scenarios append as trainers are selected. */
  readonly opponentSchedule: readonly BattleOpponent[];
  readonly opponentSelection: PreparedOpponentSelection;
  readonly rules: RoundRulesState;
  readonly presentation: PendingBattlePresentation | null;
  readonly nextPresentationCommandId: number;
}

export interface BattleResolution {
  readonly outcome: "win" | "loss";
  readonly playerParty: BattleParty;
  readonly opponentParty: BattleParty;
  /** Explicit battle-core output; presentation never consumes or changes it. */
  readonly rngValue: number;
}

export class RoundTransitionError extends Error {
  override readonly name = "RoundTransitionError";
}

type NewBattlePresentationCommand =
  BattlePresentationCommand extends infer Command
    ? Command extends BattlePresentationCommand
      ? Omit<Command, "commandId">
      : never
    : never;

function fail(message: string): never {
  throw new RoundTransitionError(message);
}

function issueCommand(
  state: Omit<RoundControllerState, "presentation" | "nextPresentationCommandId"> & {
    readonly nextPresentationCommandId: number;
  },
  command: NewBattlePresentationCommand,
): RoundControllerState {
  const fullCommand = {
    ...command,
    commandId: state.nextPresentationCommandId,
  } as BattlePresentationCommand;
  return {
    ...state,
    presentation: { command: fullCommand, completed: false },
    nextPresentationCommandId: state.nextPresentationCommandId + 1,
  };
}

export function createRoundController(scenario: BattleScenario): RoundControllerState {
  const prepared = prepareBattleScenario(scenario);
  const firstOpponent = prepared.opponents[0];
  const base = {
    scenarioId: prepared.id,
    opponentSchedule: prepared.opponents,
    opponentSelection: prepared.opponentSelection,
    rules: {
      phase: "presentingBattleStart" as const,
      battleIndex: 0 as const,
      playerParty: prepared.playerParty,
      currentOpponent: firstOpponent,
      opponentHistory: [firstOpponent.id],
      rngValue: prepared.initialRngValue,
      lastBattle: null,
      lastSwap: null,
    },
    nextPresentationCommandId: 1,
  };
  return issueCommand(base, {
    type: "battleStart",
    battleIndex: 0,
    playerParty: prepared.playerParty,
    opponent: firstOpponent,
  });
}

/**
 * Records presentation completion only. In particular, this cannot change
 * rules, opponent selection, or RNG. Repeating the same completion is a
 * no-op so asynchronous adapters can safely acknowledge once-or-more.
 */
export function completeBattlePresentation(
  state: RoundControllerState,
  completion: BattlePresentationCompletion,
): RoundControllerState {
  const pending = state.presentation;
  if (pending === null) fail("no presentation command is pending");
  if (completion.commandId !== pending.command.commandId) {
    fail(
      `presentation completion ${completion.commandId} does not match pending command ${pending.command.commandId}`,
    );
  }
  if (pending.completed) return state;
  return {
    ...state,
    presentation: { ...pending, completed: true },
  };
}

function requireCompletedPresentation(
  state: RoundControllerState,
  expectedType: BattlePresentationCommand["type"],
): PendingBattlePresentation {
  const pending = state.presentation;
  if (pending === null || pending.command.type !== expectedType) {
    fail(`expected pending ${expectedType} presentation`);
  }
  if (!pending.completed) fail(`${expectedType} presentation is not complete`);
  return pending;
}

function nextBattleIndex(index: BattleIndex): BattleIndex {
  if (index >= 6) fail("there is no battle after index 6");
  return (index + 1) as BattleIndex;
}

function selectNextOpponent(
  state: RoundControllerState,
  battleIndex: BattleIndex,
): {
  readonly opponent: BattleOpponent;
  readonly opponentSchedule: readonly BattleOpponent[];
  readonly opponentSelection: PreparedOpponentSelection;
  readonly rngValue: number;
} {
  if (state.opponentSelection.type === "fixture") {
    const opponent = state.opponentSchedule[battleIndex];
    if (opponent === undefined) fail(`fixture has no opponent for battle index ${battleIndex}`);
    return {
      opponent,
      opponentSchedule: state.opponentSchedule,
      opponentSelection: state.opponentSelection,
      rngValue: state.rules.rngValue,
    };
  }

  const strategy = state.opponentSelection;
  const selection = selectFactoryTrainer(
    strategy.factoryWinStreak + battleIndex,
    battleIndex,
    strategy.storedTrainerIds,
    state.rules.rngValue,
  );
  const selectedFixture = strategy.opponentPool.find(
    (opponent) => opponent.trainerId === selection.trainerId,
  );
  if (selectedFixture === undefined) {
    return fail(
      `opponentPool has no fixture for selected Factory trainer ${selection.trainerId}`,
    );
  }
  const opponent = cloneOpponent(selectedFixture);
  return {
    opponent,
    opponentSchedule: [...state.opponentSchedule, opponent],
    opponentSelection: {
      ...strategy,
      storedTrainerIds: selection.storedTrainerIds,
      ledger: [...strategy.ledger, ...selection.ledger],
    },
    rngValue: selection.rngValue,
  };
}

/**
 * Advances only after the adapter has acknowledged the pending command.
 * Core mutations remain explicit here rather than occurring in the
 * completion callback.
 */
export function advanceRoundController(state: RoundControllerState): RoundControllerState {
  switch (state.rules.phase) {
    case "presentingBattleStart": {
      requireCompletedPresentation(state, "battleStart");
      return {
        ...state,
        rules: { ...state.rules, phase: "battleActive" },
        presentation: null,
      };
    }
    case "presentingBattleWin": {
      requireCompletedPresentation(state, "battleWon");
      const lastBattle = state.rules.lastBattle;
      if (lastBattle === null || lastBattle.outcome !== "win") {
        return fail("winning battle result is missing");
      }
      return issueCommand(
        {
          ...state,
          rules: { ...state.rules, phase: "awaitingSwapDecision" },
        },
        {
          type: "swapOffer",
          battleIndex: state.rules.battleIndex,
          playerParty: state.rules.playerParty,
          opponentParty: lastBattle.opponentParty,
        },
      );
    }
    case "presentingSwapResult": {
      requireCompletedPresentation(state, "swapResolved");
      const battleIndex = nextBattleIndex(state.rules.battleIndex);
      const selection = selectNextOpponent(state, battleIndex);
      const opponent = selection.opponent;
      if (state.rules.opponentHistory.includes(opponent.id)) {
        return fail(`opponent ${opponent.id} would repeat`);
      }
      const playerParty = healBattleParty(state.rules.playerParty);
      return issueCommand(
        {
          ...state,
          opponentSchedule: selection.opponentSchedule,
          opponentSelection: selection.opponentSelection,
          rules: {
            ...state.rules,
            phase: "presentingBattleStart",
            battleIndex,
            playerParty,
            currentOpponent: opponent,
            opponentHistory: [...state.rules.opponentHistory, opponent.id],
            rngValue: selection.rngValue,
            lastBattle: null,
          },
        },
        {
          type: "battleStart",
          battleIndex,
          playerParty,
          opponent,
        },
      );
    }
    case "battleActive":
    case "awaitingSwapDecision":
    case "roundLost":
    case "roundComplete":
      return fail(`cannot advance round while phase is ${state.rules.phase}`);
  }
}

function assertSamePartyIdentity(
  actual: BattleParty,
  expected: BattleParty,
  label: string,
): void {
  assertBattleParty(actual, label);
  for (let index = 0; index < actual.length; index += 1) {
    if (
      actual[index]!.id !== expected[index]!.id ||
      actual[index]!.species !== expected[index]!.species ||
      actual[index]!.maxHp !== expected[index]!.maxHp
    ) {
      fail(`${label}[${index}] does not match the active battle identity`);
    }
  }
}

export function resolveRoundBattle(
  state: RoundControllerState,
  resolution: BattleResolution,
): RoundControllerState {
  if (state.rules.phase !== "battleActive" || state.presentation !== null) {
    return fail("a battle can only resolve from battleActive");
  }
  assertSamePartyIdentity(
    resolution.playerParty,
    state.rules.playerParty,
    "resolution.playerParty",
  );
  assertSamePartyIdentity(
    resolution.opponentParty,
    state.rules.currentOpponent.party,
    "resolution.opponentParty",
  );
  if (!Number.isSafeInteger(resolution.rngValue) || resolution.rngValue < 0) {
    return fail("resolution.rngValue must be a non-negative safe integer");
  }

  const playerParty = cloneBattleParty(resolution.playerParty);
  const opponentParty = cloneBattleParty(resolution.opponentParty);
  const lastBattle: CompletedBattle = {
    outcome: resolution.outcome,
    playerParty,
    opponentParty,
  };
  const rules = {
    ...state.rules,
    playerParty,
    rngValue: resolution.rngValue >>> 0,
    lastBattle,
    lastSwap: null,
  };

  if (resolution.outcome === "loss") {
    return issueCommand(
      { ...state, rules: { ...rules, phase: "roundLost" } },
      {
        type: "roundLost",
        battleIndex: rules.battleIndex,
        playerParty,
        opponent: rules.currentOpponent,
      },
    );
  }
  if (rules.battleIndex === 6) {
    return issueCommand(
      { ...state, rules: { ...rules, phase: "roundComplete" } },
      {
        type: "roundCompleted",
        battleIndex: rules.battleIndex,
        playerParty,
      },
    );
  }
  return issueCommand(
    { ...state, rules: { ...rules, phase: "presentingBattleWin" } },
    {
      type: "battleWon",
      battleIndex: rules.battleIndex,
      playerParty,
      opponentParty,
    },
  );
}

function assertPartyIndex(value: number | undefined, label: string): number {
  if (!Number.isInteger(value) || value === undefined || value < 0 || value > 2) {
    return fail(`${label} must be an integer in [0, 2]`);
  }
  return value;
}

export function chooseRoundSwap(
  state: RoundControllerState,
  decision: SwapDecision,
): RoundControllerState {
  if (state.rules.phase !== "awaitingSwapDecision") {
    return fail("a swap can only be chosen while awaitingSwapDecision");
  }
  requireCompletedPresentation(state, "swapOffer");
  const lastBattle = state.rules.lastBattle;
  if (lastBattle === null || lastBattle.outcome !== "win") {
    return fail("a winning battle result is required for a swap");
  }

  let playerParty = state.rules.playerParty;
  let storedDecision: SwapDecision = { type: "decline" };
  if (decision.type === "accept") {
    const playerPartyIndex = assertPartyIndex(
      decision.playerPartyIndex,
      "playerPartyIndex",
    );
    const opponentPartyIndex = assertPartyIndex(
      decision.opponentPartyIndex,
      "opponentPartyIndex",
    );
    const replacement = { ...lastBattle.opponentParty[opponentPartyIndex]! };
    const replaced = [...playerParty] as [typeof replacement, typeof replacement, typeof replacement];
    replaced[playerPartyIndex] = replacement;
    playerParty = replaced;
    storedDecision = { type: "accept", playerPartyIndex, opponentPartyIndex };
  }

  return issueCommand(
    {
      ...state,
      rules: {
        ...state.rules,
        phase: "presentingSwapResult",
        playerParty,
        lastSwap: storedDecision,
      },
    },
    {
      type: "swapResolved",
      battleIndex: state.rules.battleIndex,
      accepted: storedDecision.type === "accept",
      playerParty,
    },
  );
}
