/**
 * Production-shaped owner of the generated Factory opponent -> fresh battle
 * -> terminal adapter -> round-controller seam.
 *
 * Presentation remains an acknowledgement protocol owned by roundController.
 * This module only starts a kernel after `battleStart` completes, accepts
 * player decisions at published boundaries, supplies trainer decisions from
 * the live Factory AI, and returns terminal state to `resolveRoundBattle`.
 */

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
    rentsCount: number;
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

export type FactoryRoundBattleOrchestratorConfig = Readonly<{
  id: string;
  rngValue: number;
  factoryWinStreak: number;
  playerTrainerId: number;
  battleTowerLevel50WinStreak: number;
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

export type FactoryRoundBattleOrchestratorState = Readonly<{
  config: FactoryRoundBattleOrchestratorConfig;
  round: RoundControllerState;
  battle: BattleState<FactoryFullTurnDecisionRules> | null;
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
      rentsCount: config.rentals.rentsCount,
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
    round,
    battle: null,
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
  return Object.freeze({
    ...state,
    battle: started,
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
  return Object.freeze({
    ...state,
    round: resolveRoundBattle(state.round, {
      ...adapted,
      playerKernelParty,
      opponentKernelParty,
    }),
    battle: null,
    aiHistory,
    rngSegments: Object.freeze([...state.rngSegments, segment]),
    facilityRngCalls: segment.callEnd,
    activeBattleCallStart: null,
  });
}

function driveTrainerBoundary(
  state: FactoryRoundBattleOrchestratorState,
  battle: BattleState<FactoryFullTurnDecisionRules>,
  history: FactoryAiBattleHistory,
): FactoryRoundBattleOrchestratorState {
  let nextBattle = battle;
  let nextHistory = history;
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
    aiHistory: nextHistory,
    facilityRngCalls: state.activeBattleCallStart! + nextBattle.rng.calls,
  });
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
