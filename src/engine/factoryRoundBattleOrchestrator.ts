/**
 * Production-shaped owner of the generated Factory opponent -> fresh battle
 * -> terminal adapter -> round-controller seam.
 *
 * Round presentation acknowledgements remain owned by roundController. During
 * an active battle, this module also owns the live player command presentation,
 * supplies trainer decisions from the Factory AI, and returns terminal state
 * to `resolveRoundBattle`.
 */

import type { GbaButton } from "../input.ts";
import {
  advanceBattleCommandPresentation,
  cancelBattleCommandPartySelection,
  createBattleCommandPresentation,
  returnBattleCommandPartySelection,
  submitBattleCommandPresentationDecision,
  type BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import {
  advanceBattlePartySelect,
  createBattlePartySelectState,
  type BattlePartySelectState,
} from "./battlePartySelect.ts";
import {
  healFactoryKernelParty,
  type BattleMon,
  type BattleOpponent,
  type BattleParty,
  type FactoryKernelParty,
  type FactoryRentalParty,
  type FactoryRentalRecord,
} from "./battleScenario.ts";
import {
  submitBattleDecision,
  type BattleState,
  type BattleSubmittedDecision,
} from "./battleDecisionBoundary.ts";
import type {
  BattleScriptPartyMemberState,
  BattleScriptPartyState,
} from "./battleScriptRulesContext.ts";
import { deriveBattleResolutionFromTerminalBoundary } from "./battleResolutionAdapter.ts";
import {
  createFreshFactoryBattle,
} from "./factoryBattleStart.ts";
import {
  reduceFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
} from "./factoryBattleScriptFullTurnDecision.ts";
import {
  createFactoryAiBattleHistory,
  submitLiveFactoryAiDecision,
  type FactoryAiBattleHistory,
} from "./factoryAiLiveDriver.ts";
import { createFactoryCorpusPartyMember } from "./factoryCorpusParty.ts";
import {
  generateFactoryOpponent,
  type FactoryOpponentGenerationResult,
} from "./factoryOpponentGeneration.ts";
import {
  generateInitialFactoryRentals,
  type FactoryInitialRentalGenerationResult,
} from "./factoryRentalGeneration.ts";
import {
  advanceRoundController,
  advanceRoundControllerWithGeneratedOpponent,
  chooseRoundSwap,
  completeBattlePresentation,
  createGeneratedFactoryRoundController,
  resolveRoundBattle,
  type RoundControllerState,
  type SwapDecision,
} from "./roundController.ts";
import type { BattlePresentationCompletion } from "./battlePresentation.ts";

const EMPTY_PARTY_MEMBER: BattleScriptPartyMemberState = Object.freeze({
  species: 0,
  isEgg: false,
  abilityNum: 0,
  ivs: Object.freeze({ hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0 }),
  personality: 0,
  experience: 0,
  level: 0,
  friendship: 0,
  maxHP: 0,
  attack: 0,
  defense: 0,
  speed: 0,
  spAttack: 0,
  spDefense: 0,
  hp: 0,
  status1: 0,
  item: 0,
  moves: Object.freeze([0, 0, 0, 0] as const),
  pp: Object.freeze([0, 0, 0, 0] as const),
  ppBonuses: 0,
});

export type FactoryRoundRentalSource =
  | Readonly<{
    type: "generateInitial";
    selectedRentalIndexes: readonly [number, number, number];
  }>
  | Readonly<{
    type: "currentRecords";
    playerRentalRecords: FactoryRentalParty;
    /** Source rentalMons[0..5] used by the first opponent generation. */
    savedRentalRecords: readonly [
      FactoryRentalRecord,
      FactoryRentalRecord,
      FactoryRentalRecord,
      FactoryRentalRecord,
      FactoryRentalRecord,
      FactoryRentalRecord,
    ];
  }>;

export type FactoryFacilityState = Readonly<{
  /** Source factoryRentsCount for the selected battle/level mode. */
  rentsCount: number;
}>;

export type FactoryRoundBattleOrchestratorConfig = Readonly<{
  id: string;
  rngValue: number;
  factoryWinStreak: number;
  playerTrainerId: number;
  battleTowerLevel50WinStreak: number;
  facilityState: FactoryFacilityState;
  rentals: FactoryRoundRentalSource;
}>;

export type FactoryFacilityRngSegment = Readonly<{
  kind: "initial-rentals" | "opponent-generation" | "battle";
  battleIndex: number;
  callStart: number;
  callEnd: number;
  rngBefore: number;
  rngAfter: number;
}>;

export type FactoryBattleMoveSelectionCursors = readonly [
  0 | 1 | 2 | 3,
  0 | 1 | 2 | 3,
  0 | 1 | 2 | 3,
  0 | 1 | 2 | 3,
];

const RESET_MOVE_SELECTION_CURSORS: FactoryBattleMoveSelectionCursors =
  Object.freeze([0, 0, 0, 0]);

export type FactoryRoundBattleOrchestratorState = Readonly<{
  config: FactoryRoundBattleOrchestratorConfig;
  facilityState: FactoryFacilityState;
  /** Source sPerformedRentalSwap: challenge-scoped, persisted once on win 7. */
  performedRentalSwap: boolean;
  round: RoundControllerState;
  battle: BattleState<FactoryFullTurnDecisionRules> | null;
  /** Request-owned player command UI, replaced at each command boundary. */
  battleCommandPresentation: BattleCommandPresentationState | null;
  /** Adjacent voluntary selector while the command UI owns party-handoff. */
  battlePartySelect: BattlePartySelectState | null;
  /** Source gMoveSelectionCursor: controller-owned, not request-owned. */
  moveSelectionCursors: FactoryBattleMoveSelectionCursors;
  aiHistory: FactoryAiBattleHistory | null;
  initialRentalGeneration: FactoryInitialRentalGenerationResult | null;
  opponentGenerations: readonly FactoryOpponentGenerationResult[];
  rngSegments: readonly FactoryFacilityRngSegment[];
  /** Monotonic count across facility generation and every battle cursor. */
  facilityRngCalls: number;
  activeBattleCallStart: number | null;
  nextBattleRequestId: number;
}>;

export class FactoryRoundOrchestratorError extends Error {
  override readonly name = "FactoryRoundOrchestratorError";
}

function fail(message: string): never {
  throw new FactoryRoundOrchestratorError(message);
}

function asKernelParty(records: FactoryRentalParty): FactoryKernelParty {
  return healFactoryKernelParty(records);
}

function asBattleScriptParty(party: FactoryKernelParty): BattleScriptPartyState {
  return Object.freeze([
    party[0],
    party[1],
    party[2],
    EMPTY_PARTY_MEMBER,
    EMPTY_PARTY_MEMBER,
    EMPTY_PARTY_MEMBER,
  ]);
}

function overlayTerminalKernelParty(
  identity: FactoryKernelParty,
  terminal: BattleScriptPartyState,
): FactoryKernelParty {
  return identity.map((member, index) => Object.freeze({
    ...member,
    ...terminal[index]!,
  })) as unknown as FactoryKernelParty;
}

function recordId(record: FactoryRentalRecord): string {
  return `rental-${record.setId}-${record.personality >>> 0}`;
}

function asBattleParty(records: FactoryRentalParty): BattleParty {
  return records.map((record): BattleMon => {
    const member = createFactoryCorpusPartyMember(record);
    return Object.freeze({
      id: recordId(record),
      species: member.speciesName,
      maxHp: member.maxHP,
      hp: member.hp,
      status: "none",
    });
  }) as unknown as BattleParty;
}

function generatedOpponent(result: FactoryOpponentGenerationResult): BattleOpponent {
  const records = result.opponents as FactoryRentalParty;
  return Object.freeze({
    id: `factory-trainer-${result.trainerId}`,
    trainerName: result.trainerName,
    party: asBattleParty(records),
    rentalRecords: records,
  });
}

function selectedInitialRecords(
  result: FactoryInitialRentalGenerationResult,
  indexes: readonly [number, number, number],
): FactoryRentalParty {
  if (new Set(indexes).size !== 3) fail("selectedRentalIndexes must be distinct");
  return indexes.map((index, slot) => {
    if (!Number.isInteger(index) || index < 0 || index >= result.rentals.length) {
      return fail(`selectedRentalIndexes[${slot}] must select one of six rentals`);
    }
    return result.rentals[index]!;
  }) as unknown as FactoryRentalParty;
}

function generationSegment(
  kind: "initial-rentals" | "opponent-generation",
  battleIndex: number,
  callStart: number,
  rngBefore: number,
  rngAfter: number,
  drawCount: number,
): FactoryFacilityRngSegment {
  return Object.freeze({
    kind,
    battleIndex,
    callStart,
    callEnd: callStart + drawCount,
    rngBefore,
    rngAfter,
  });
}

function generateOpponentFor(
  config: FactoryRoundBattleOrchestratorConfig,
  battleIndex: number,
  rngValue: number,
  storedTrainerIds: readonly number[],
  savedRentalRecords: readonly FactoryRentalRecord[],
): FactoryOpponentGenerationResult {
  return generateFactoryOpponent({
    rngValue,
    factoryWinStreak: config.factoryWinStreak + battleIndex,
    battleIndex,
    storedTrainerIds,
    savedRentalSetIds: savedRentalRecords.map((record) => record.setId),
    playerTrainerId: config.playerTrainerId,
    battleTowerLevel50WinStreak: config.battleTowerLevel50WinStreak,
  });
}

export function createFactoryRoundBattleOrchestrator(
  config: FactoryRoundBattleOrchestratorConfig,
): FactoryRoundBattleOrchestratorState {
  if (
    !Number.isSafeInteger(config.facilityState.rentsCount)
    || config.facilityState.rentsCount < 0
    || config.facilityState.rentsCount > 9_999
  ) {
    return fail("facilityState.rentsCount must be an integer in [0, 9999]");
  }
  let rngValue = config.rngValue >>> 0;
  let facilityRngCalls = 0;
  let initialRentalGeneration: FactoryInitialRentalGenerationResult | null = null;
  let playerRentalRecords: FactoryRentalParty;
  let savedRentalRecords: readonly FactoryRentalRecord[];
  const rngSegments: FactoryFacilityRngSegment[] = [];

  if (config.rentals.type === "generateInitial") {
    initialRentalGeneration = generateInitialFactoryRentals({
      rngValue,
      factoryWinStreak: config.factoryWinStreak,
      rentsCount: config.facilityState.rentsCount,
      playerTrainerId: config.playerTrainerId,
    });
    rngSegments.push(generationSegment(
      "initial-rentals",
      0,
      facilityRngCalls,
      rngValue,
      initialRentalGeneration.rngValue,
      initialRentalGeneration.drawLedger.length,
    ));
    facilityRngCalls += initialRentalGeneration.drawLedger.length;
    rngValue = initialRentalGeneration.rngValue;
    playerRentalRecords = selectedInitialRecords(
      initialRentalGeneration,
      config.rentals.selectedRentalIndexes,
    );
    savedRentalRecords = initialRentalGeneration.rentals;
  } else {
    playerRentalRecords = config.rentals.playerRentalRecords;
    savedRentalRecords = config.rentals.savedRentalRecords;
  }

  const firstOpponent = generateOpponentFor(config, 0, rngValue, [], savedRentalRecords);
  rngSegments.push(generationSegment(
    "opponent-generation",
    0,
    facilityRngCalls,
    rngValue,
    firstOpponent.rngValue,
    firstOpponent.drawLedger.length,
  ));
  facilityRngCalls += firstOpponent.drawLedger.length;
  const opponent = generatedOpponent(firstOpponent);
  const round = createGeneratedFactoryRoundController({
    id: config.id,
    playerParty: asBattleParty(playerRentalRecords),
    playerRentalRecords,
    opponent,
    rngValue: firstOpponent.rngValue,
  });

  return Object.freeze({
    config,
    facilityState: Object.freeze({ ...config.facilityState }),
    performedRentalSwap: false,
    round,
    battle: null,
    battleCommandPresentation: null,
    battlePartySelect: null,
    moveSelectionCursors: RESET_MOVE_SELECTION_CURSORS,
    aiHistory: null,
    initialRentalGeneration,
    opponentGenerations: Object.freeze([firstOpponent]),
    rngSegments: Object.freeze(rngSegments),
    facilityRngCalls,
    activeBattleCallStart: null,
    nextBattleRequestId: 1,
  });
}

function startCurrentBattle(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  if (state.round.rules.phase !== "battleActive") {
    return fail("fresh battle start requires the controller's battleActive phase");
  }
  const player = state.round.rules.playerKernelParty;
  const opponentRecords = state.round.rules.currentOpponent.rentalRecords;
  if (player === null || opponentRecords === undefined) {
    return fail("generated Factory battle start requires both full parties");
  }
  const started = createFreshFactoryBattle({
    requestId: state.nextBattleRequestId,
    rngSeed: state.round.rules.rngValue,
    playerParty: asBattleScriptParty(player),
    opponentParty: asBattleScriptParty(asKernelParty(opponentRecords)),
  });
  const callStart = state.facilityRngCalls;
  if (
    started.boundary.kind !== "decision-required"
    || started.boundary.request.kind !== "command"
    || started.boundary.request.side !== "player"
  ) {
    return fail("fresh Factory battle must publish a player command boundary");
  }
  const moveSelectionCursors = RESET_MOVE_SELECTION_CURSORS;
  return Object.freeze({
    ...state,
    battle: started,
    battleCommandPresentation: createBattleCommandPresentation(
      started.boundary.request,
      started.rules.rulesContext,
      moveSelectionCursors[started.boundary.request.battler],
    ),
    battlePartySelect: null,
    moveSelectionCursors,
    aiHistory: createFactoryAiBattleHistory(started.rules.rulesContext),
    facilityRngCalls: callStart + started.rng.calls,
    activeBattleCallStart: callStart,
    nextBattleRequestId: state.nextBattleRequestId + 1,
  });
}

export function completeFactoryRoundPresentation(
  state: FactoryRoundBattleOrchestratorState,
  completion: BattlePresentationCompletion,
): FactoryRoundBattleOrchestratorState {
  return Object.freeze({
    ...state,
    round: completeBattlePresentation(state.round, completion),
  });
}

function nextSavedRentalRecords(
  state: FactoryRoundBattleOrchestratorState,
): readonly FactoryRentalRecord[] {
  const player = state.round.rules.playerRentalRecords;
  const opponent = state.round.rules.currentOpponent.rentalRecords;
  if (player === null || opponent === undefined) {
    return fail("next generated opponent requires both full rental record parties");
  }
  return [...player, ...opponent];
}

export function advanceFactoryRoundPresentation(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  if (state.round.rules.phase === "presentingSwapResult") {
    const battleIndex = state.round.rules.battleIndex + 1;
    const previous = state.opponentGenerations.at(-1)!;
    const rngBefore = state.round.rules.rngValue;
    const generated = generateOpponentFor(
      state.config,
      battleIndex,
      rngBefore,
      previous.storedTrainerIds,
      nextSavedRentalRecords(state),
    );
    const segment = generationSegment(
      "opponent-generation",
      battleIndex,
      state.facilityRngCalls,
      rngBefore,
      generated.rngValue,
      generated.drawLedger.length,
    );
    return Object.freeze({
      ...state,
      round: advanceRoundControllerWithGeneratedOpponent(state.round, {
        opponent: generatedOpponent(generated),
        rngValue: generated.rngValue,
      }),
      opponentGenerations: Object.freeze([...state.opponentGenerations, generated]),
      rngSegments: Object.freeze([...state.rngSegments, segment]),
      facilityRngCalls: segment.callEnd,
    });
  }

  const round = advanceRoundController(state.round);
  const advanced = Object.freeze({ ...state, round });
  return round.rules.phase === "battleActive" ? startCurrentBattle(advanced) : advanced;
}

export function chooseFactoryRoundSwap(
  state: FactoryRoundBattleOrchestratorState,
  decision: SwapDecision,
): FactoryRoundBattleOrchestratorState {
  return Object.freeze({
    ...state,
    round: chooseRoundSwap(state.round, decision),
    performedRentalSwap: state.performedRentalSwap || decision.type === "accept",
  });
}

function finishBattle(
  state: FactoryRoundBattleOrchestratorState,
  battle: BattleState<FactoryFullTurnDecisionRules>,
  aiHistory: FactoryAiBattleHistory,
): FactoryRoundBattleOrchestratorState {
  if (battle.boundary.kind !== "terminal" || state.activeBattleCallStart === null) {
    return fail("finishBattle requires a real terminal boundary");
  }
  const playerIdentity = state.round.rules.playerKernelParty;
  const opponentRecords = state.round.rules.currentOpponent.rentalRecords;
  if (playerIdentity === null || opponentRecords === undefined) {
    return fail("terminal Factory battle requires both full party identities");
  }
  const playerKernelParty = overlayTerminalKernelParty(
    playerIdentity,
    battle.rules.rulesContext.party.player,
  );
  const opponentKernelParty = overlayTerminalKernelParty(
    healFactoryKernelParty(opponentRecords),
    battle.rules.rulesContext.party.opponent,
  );
  const adapted = deriveBattleResolutionFromTerminalBoundary({
    rngValue: battle.rng.value,
    outcome: battle.boundary.outcome,
    rulesContext: battle.rules.rulesContext,
    preBattlePlayerParty: state.round.rules.playerParty,
    preBattleOpponentParty: state.round.rules.currentOpponent.party,
  });
  const segment: FactoryFacilityRngSegment = Object.freeze({
    kind: "battle",
    battleIndex: state.round.rules.battleIndex,
    callStart: state.activeBattleCallStart,
    callEnd: state.activeBattleCallStart + battle.rng.calls,
    rngBefore: state.round.rules.rngValue,
    rngAfter: battle.rng.value,
  });
  const round = resolveRoundBattle(state.round, {
    ...adapted,
    playerKernelParty,
    opponentKernelParty,
  });
  const persistRentalSwap = round.rules.phase === "roundComplete"
    && state.performedRentalSwap;
  return Object.freeze({
    ...state,
    facilityState: persistRentalSwap
      ? Object.freeze({
        rentsCount: Math.min(9_999, state.facilityState.rentsCount + 1),
      })
      : state.facilityState,
    performedRentalSwap: persistRentalSwap ? false : state.performedRentalSwap,
    round,
    battle: null,
    battleCommandPresentation: null,
    battlePartySelect: null,
    aiHistory,
    rngSegments: Object.freeze([...state.rngSegments, segment]),
    facilityRngCalls: segment.callEnd,
    activeBattleCallStart: null,
  });
}

function resetMoveSelectionCursorsForSwitchIns(
  cursors: FactoryBattleMoveSelectionCursors,
  before: BattleState<FactoryFullTurnDecisionRules>,
  after: BattleState<FactoryFullTurnDecisionRules>,
): FactoryBattleMoveSelectionCursors {
  let next: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3]
    | null = null;
  const battlersCount = after.rules.rulesContext.battleTopology.battlersCount;
  for (let battler = 0; battler < battlersCount; battler += 1) {
    if (
      before.rules.rulesContext.battlers[battler]!.partyIndex
      !== after.rules.rulesContext.battlers[battler]!.partyIndex
    ) {
      next ??= [...cursors];
      next[battler] = 0;
    }
  }
  return next === null ? cursors : Object.freeze(next);
}

function commandPresentationForBoundary(
  battle: BattleState<FactoryFullTurnDecisionRules>,
  cursors: FactoryBattleMoveSelectionCursors,
): BattleCommandPresentationState | null {
  if (
    battle.boundary.kind !== "decision-required"
    || battle.boundary.request.kind !== "command"
    || battle.boundary.request.side !== "player"
  ) return null;
  return createBattleCommandPresentation(
    battle.boundary.request,
    battle.rules.rulesContext,
    cursors[battle.boundary.request.battler],
  );
}

function driveTrainerBoundary(
  state: FactoryRoundBattleOrchestratorState,
  battle: BattleState<FactoryFullTurnDecisionRules>,
  history: FactoryAiBattleHistory,
): FactoryRoundBattleOrchestratorState {
  let nextBattle = battle;
  let nextHistory = history;
  let moveSelectionCursors = state.battle === null
    ? state.moveSelectionCursors
    : resetMoveSelectionCursorsForSwitchIns(
      state.moveSelectionCursors,
      state.battle,
      nextBattle,
    );
  while (
    nextBattle.boundary.kind === "decision-required"
    && nextBattle.boundary.request.kind === "command"
    && nextBattle.boundary.request.side === "trainer"
  ) {
    const ai = submitLiveFactoryAiDecision(
      nextBattle,
      nextHistory,
      {
        factoryWinStreak: state.config.factoryWinStreak + state.round.rules.battleIndex,
        trainerOpponentId: state.opponentGenerations.at(-1)!.trainerId,
      },
      reduceFactoryFullTurnDecision,
    );
    moveSelectionCursors = resetMoveSelectionCursorsForSwitchIns(
      moveSelectionCursors,
      nextBattle,
      ai.transition.state,
    );
    nextBattle = ai.transition.state;
    nextHistory = ai.history;
  }
  if (nextBattle.boundary.kind === "machine-barrier") {
    return fail(`battle kernel reached ${JSON.stringify({
      ...nextBattle.boundary.barrier,
      activePartyIndexes: nextBattle.rules.rulesContext.battlers.slice(0, 2)
        .map((battler) => battler.partyIndex),
      playerHp: nextBattle.rules.rulesContext.party.player.slice(0, 3).map((member) => member.hp),
      opponentHp: nextBattle.rules.rulesContext.party.opponent.slice(0, 3).map((member) => member.hp),
    })}`);
  }
  if (nextBattle.boundary.kind === "terminal") {
    return finishBattle(state, nextBattle, nextHistory);
  }
  if (
    nextBattle.boundary.kind !== "decision-required"
    || nextBattle.boundary.request.side !== "player"
  ) {
    return fail("battle stopped outside a player, trainer, terminal, or barrier boundary");
  }
  return Object.freeze({
    ...state,
    battle: nextBattle,
    battleCommandPresentation: commandPresentationForBoundary(
      nextBattle,
      moveSelectionCursors,
    ),
    battlePartySelect: null,
    moveSelectionCursors,
    aiHistory: nextHistory,
    facilityRngCalls: state.activeBattleCallStart! + nextBattle.rng.calls,
  });
}

/**
 * Advances the live request-owned player command UI. A completed move choice
 * crosses the same submitBattleDecision bridge as every other battle client;
 * the resulting trainer boundaries remain automatically driven.
 */
export function advanceFactoryRoundBattleCommand(
  state: FactoryRoundBattleOrchestratorState,
  newKeys: ReadonlySet<GbaButton>,
): FactoryRoundBattleOrchestratorState {
  const battle = state.battle;
  const presentation = state.battleCommandPresentation;
  const history = state.aiHistory;
  if (battle === null || presentation === null || history === null) {
    return fail("battle-command input requires a published player command presentation");
  }
  if (state.battlePartySelect !== null) {
    const selector = advanceBattlePartySelect(state.battlePartySelect, newKeys);
    if (selector.outcome === null) {
      return Object.freeze({ ...state, battlePartySelect: selector });
    }
    if (selector.outcome.kind === "cancel") {
      return Object.freeze({
        ...state,
        battleCommandPresentation: cancelBattleCommandPartySelection(presentation),
        battlePartySelect: null,
      });
    }
    const returned = returnBattleCommandPartySelection(
      presentation,
      selector.outcome.partyIndex,
    );
    const transition = submitBattleCommandPresentationDecision(
      battle,
      returned,
      reduceFactoryFullTurnDecision,
    );
    if (transition === null) {
      return fail("legal voluntary party selection did not submit");
    }
    return driveTrainerBoundary(
      Object.freeze({ ...state, battlePartySelect: null }),
      transition.state,
      history,
    );
  }
  const advanced = advanceBattleCommandPresentation(presentation, newKeys);
  const moveSelectionCursors = Object.freeze(
    state.moveSelectionCursors.map((cursor, battler) =>
      battler === advanced.request.battler ? advanced.fightCursor : cursor),
  ) as FactoryBattleMoveSelectionCursors;
  const transition = submitBattleCommandPresentationDecision(
    battle,
    advanced,
    reduceFactoryFullTurnDecision,
  );
  if (transition === null) {
    if (
      advanced.lifecycle.phase === "party-handoff"
      && presentation.lifecycle.phase !== "party-handoff"
    ) {
      return Object.freeze({
        ...state,
        battleCommandPresentation: advanced,
        battlePartySelect: createBattlePartySelectState(
          advanced.request,
          battle.rules.rulesContext,
        ),
        moveSelectionCursors,
      });
    }
    return Object.freeze({
      ...state,
      battleCommandPresentation: advanced,
      moveSelectionCursors,
    });
  }
  return driveTrainerBoundary(
    Object.freeze({ ...state, moveSelectionCursors }),
    transition.state,
    history,
  );
}

export function submitFactoryRoundPlayerDecision(
  state: FactoryRoundBattleOrchestratorState,
  decision: BattleSubmittedDecision,
): FactoryRoundBattleOrchestratorState {
  const battle = state.battle;
  const history = state.aiHistory;
  if (
    battle === null
    || history === null
    || battle.boundary.kind !== "decision-required"
    || battle.boundary.request.side !== "player"
  ) {
    return fail("player decisions require a published player battle boundary");
  }
  const transition = submitBattleDecision(
    battle,
    {
      requestId: battle.boundary.request.requestId,
      side: "player",
      decision,
    },
    reduceFactoryFullTurnDecision,
  );
  return driveTrainerBoundary(state, transition.state, history);
}
