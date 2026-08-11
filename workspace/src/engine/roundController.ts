import {
  assertBattleParty,
  cloneBattleParty,
  cloneOpponent,
  healBattleParty,
  healFactoryKernelParty,
  prepareBattleScenario,
  type BattleIndex,
  type FactoryKernelParty,
  type FactoryRentalParty,
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
  readonly playerKernelParty: FactoryKernelParty | null;
  readonly opponentKernelParty: FactoryKernelParty | null;
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
  /** Saved `RentalMon[0..2]` records; null preserves simplified fixtures. */
  readonly playerRentalRecords: FactoryRentalParty | null;
  /** Full three-member build consumed by the next battle kernel. */
  readonly playerKernelParty: FactoryKernelParty | null;
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
  /** Optional full kernel snapshots; omitted by legacy fixture adapters. */
  readonly playerKernelParty?: FactoryKernelParty;
  readonly opponentKernelParty?: FactoryKernelParty;
  /** Explicit battle-core output; presentation never consumes or changes it. */
  readonly rngValue: number;
}

export interface GeneratedFactoryRoundStart {
  readonly id: string;
  readonly playerParty: BattleParty;
  readonly playerRentalRecords: FactoryRentalParty;
  readonly opponent: BattleOpponent;
  /** Cursor after complete opponent construction. */
  readonly rngValue: number;
}

export interface GeneratedFactoryRoundOpponent {
  readonly opponent: BattleOpponent;
  /** Cursor after complete opponent construction. */
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
  const playerRentalRecords = prepared.playerRentalRecords;
  const base = {
    scenarioId: prepared.id,
    opponentSchedule: prepared.opponents,
    opponentSelection: prepared.opponentSelection,
    rules: {
      phase: "presentingBattleStart" as const,
      battleIndex: 0 as const,
      playerParty: prepared.playerParty,
      playerRentalRecords,
      playerKernelParty: playerRentalRecords === null
        ? null
        : healFactoryKernelParty(playerRentalRecords),
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
 * Production-shaped constructor used after rental/opponent generation. It
 * preserves `createRoundController`'s fixture ABI while making the generator
 * seam explicit instead of disguising generated parties as a seven-opponent
 * fixture pool.
 */
export function createGeneratedFactoryRoundController(
  input: GeneratedFactoryRoundStart,
): RoundControllerState {
  assertBattleParty(input.playerParty, "playerParty");
  assertBattleParty(input.opponent.party, "opponent.party");
  if (input.opponent.rentalRecords === undefined) {
    return fail("a generated Factory opponent requires full rental records");
  }
  if (!Number.isSafeInteger(input.rngValue) || input.rngValue < 0) {
    return fail("rngValue must be a non-negative safe integer");
  }
  const playerParty = cloneBattleParty(input.playerParty);
  const opponent = cloneOpponent(input.opponent);
  const playerRentalRecords = input.playerRentalRecords.map(
    (record) => ({ ...record }),
  ) as unknown as FactoryRentalParty;
  const base = {
    scenarioId: input.id,
    opponentSchedule: [opponent],
    opponentSelection: { type: "factoryGenerated" as const },
    rules: {
      phase: "presentingBattleStart" as const,
      battleIndex: 0 as const,
      playerParty,
      playerRentalRecords,
      playerKernelParty: healFactoryKernelParty(playerRentalRecords),
      currentOpponent: opponent,
      opponentHistory: [opponent.id],
      rngValue: input.rngValue >>> 0,
      lastBattle: null,
      lastSwap: null,
    },
    nextPresentationCommandId: 1,
  };
  return issueCommand(base, {
    type: "battleStart",
    battleIndex: 0,
    playerParty,
    opponent,
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
  if (state.opponentSelection.type === "factoryGenerated") {
    return fail("generated Factory rounds require a complete generated opponent");
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

function advanceAfterSwapResult(
  state: RoundControllerState,
  selection: {
    readonly opponent: BattleOpponent;
    readonly opponentSchedule: readonly BattleOpponent[];
    readonly opponentSelection: PreparedOpponentSelection;
    readonly rngValue: number;
  },
): RoundControllerState {
  const battleIndex = nextBattleIndex(state.rules.battleIndex);
  const opponent = selection.opponent;
  if (state.rules.opponentHistory.includes(opponent.id)) {
    return fail(`opponent ${opponent.id} would repeat`);
  }
  const playerParty = healBattleParty(state.rules.playerParty);
  const playerKernelParty = state.rules.playerRentalRecords === null
    ? null
    : healFactoryKernelParty(
      state.rules.playerRentalRecords,
      state.rules.playerKernelParty ?? undefined,
    );
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
        playerKernelParty,
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
      return advanceAfterSwapResult(state, selection);
    }
    case "battleActive":
    case "awaitingSwapDecision":
    case "roundLost":
    case "roundComplete":
      return fail(`cannot advance round while phase is ${state.rules.phase}`);
  }
}

/**
 * Adapts rung-8's complete trainer+party result at the exact point where the
 * existing controller admits its next opponent. All index/heal/presentation
 * rules remain in the same controller-owned transition above.
 */
export function advanceRoundControllerWithGeneratedOpponent(
  state: RoundControllerState,
  generated: GeneratedFactoryRoundOpponent,
): RoundControllerState {
  if (state.rules.phase !== "presentingSwapResult") {
    return fail("a generated opponent can only advance presentingSwapResult");
  }
  requireCompletedPresentation(state, "swapResolved");
  if (state.opponentSelection.type !== "factoryGenerated") {
    return fail("generated opponent advance requires a generated Factory round");
  }
  if (generated.opponent.rentalRecords === undefined) {
    return fail("a generated Factory opponent requires full rental records");
  }
  if (!Number.isSafeInteger(generated.rngValue) || generated.rngValue < 0) {
    return fail("generated opponent rngValue must be a non-negative safe integer");
  }
  const opponent = cloneOpponent(generated.opponent);
  return advanceAfterSwapResult(state, {
    opponent,
    opponentSchedule: [...state.opponentSchedule, opponent],
    opponentSelection: state.opponentSelection,
    rngValue: generated.rngValue >>> 0,
  });
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
  const playerKernelParty = resolution.playerKernelParty
    ?? state.rules.playerKernelParty;
  const opponentKernelParty = resolution.opponentKernelParty
    ?? (
      state.rules.currentOpponent.rentalRecords === undefined
        ? null
        : healFactoryKernelParty(state.rules.currentOpponent.rentalRecords)
    );
  const lastBattle: CompletedBattle = {
    outcome: resolution.outcome,
    playerParty,
    opponentParty,
    playerKernelParty,
    opponentKernelParty,
  };
  const rules = {
    ...state.rules,
    playerParty,
    playerKernelParty,
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
  let playerRentalRecords = state.rules.playerRentalRecords;
  let playerKernelParty = state.rules.playerKernelParty;
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
    const opponentRentalRecords = state.rules.currentOpponent.rentalRecords ?? null;
    if ((playerRentalRecords === null) !== (opponentRentalRecords === null)) {
      return fail("a full-record Factory swap requires both player and opponent rental records");
    }
    if (playerRentalRecords !== null && opponentRentalRecords !== null) {
      // CopySwappedMonData persists exactly monId/IVs/personality/abilityNum
      // from the chosen defeated mon (`battle_factory_screen.c:2350-2360`).
      // The generator-facing names are setId/fixedIv/abilitySlot.
      const replacedRecords = [...playerRentalRecords] as [
        FactoryRentalParty[number],
        FactoryRentalParty[number],
        FactoryRentalParty[number],
      ];
      replacedRecords[playerPartyIndex] = {
        ...opponentRentalRecords[opponentPartyIndex]!,
      };
      playerRentalRecords = replacedRecords;

      const opponentKernelParty = lastBattle.opponentKernelParty
        ?? healFactoryKernelParty(opponentRentalRecords);
      const replacementKernelMember = {
        ...opponentKernelParty[opponentPartyIndex]!,
        friendship: 0,
      };
      const replacedKernelParty = [...(playerKernelParty
        ?? healFactoryKernelParty(state.rules.playerRentalRecords!))] as [
          FactoryKernelParty[number],
          FactoryKernelParty[number],
          FactoryKernelParty[number],
        ];
      replacedKernelParty[playerPartyIndex] = replacementKernelMember;
      playerKernelParty = replacedKernelParty;
    }
    storedDecision = { type: "accept", playerPartyIndex, opponentPartyIndex };
  }

  return issueCommand(
    {
      ...state,
      rules: {
        ...state.rules,
        phase: "presentingSwapResult",
        playerParty,
        playerRentalRecords,
        playerKernelParty,
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
