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
  battlePartySelectClosePhase,
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
  type BattleBoundary,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
  type BattlePartyIndex,
  type BattleState,
  type BattleSubmittedDecision,
} from "./battleDecisionBoundary.ts";
import {
  appendBattleResolutionActionContinuation,
  appendBattleResolutionLockedActionContinuation,
  advanceBattleResolutionConfirmHandoff,
  appendBattleResolutionContinuation,
  createBattleResolutionPresentation,
  type BattleResolutionPresentationCommand,
  type BattleResolutionLockedActionIdentity,
  type BattleResolutionPresentationState,
} from "./battleResolutionPresentation.ts";
import {
  createBattleResolutionPresentationRenderView,
  isBattleResolutionButtonMessageReady,
  isBattleResolutionCommandComplete,
  isBattleResolutionNextCommandHandoffComplete,
} from "./battleResolutionPresentationRender.ts";
import {
  advancePartySelect,
  createPartySelectStateFromForcedSwitch,
  partySendOutBattleMenuReady,
  submitPartySelectBattleDecision,
  type PartySelectState,
} from "./partySelect.ts";
import type {
  BattleScriptPartyMemberState,
  BattleScriptPartyState,
} from "./battleScriptRulesContext.ts";
import { deriveBattleResolutionFromTerminalBoundary } from "./battleResolutionAdapter.ts";
import { mapStatus1ToBattleStatus } from "./battleResolutionAdapter.ts";
import {
  createFreshFactoryBattle,
} from "./factoryBattleStart.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";
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
import { factoryTrainerPresentationForOpponent } from "./factoryTrainerPresentation.ts";
import {
  createFactoryBattleStartPresentationCommand,
  type FactoryBattleStartPresentationCommand,
} from "./factoryBattleStartPresentation.ts";
import {
  advanceFactoryBattleStartIntro,
  createFactoryBattleStartIntro,
  settleFactoryBattleStartCommand,
  type FactoryBattleStartIntroState,
} from "./factoryBattleStartIntro.ts";
import {
  GENERATED_BATTLE_INTRO_ROOM_HANDOFF_DELAY,
  generatedBattleStartCommandReady,
} from "./battleScene.ts";
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
  /**
   * Battle 1 may already have its trainer/set schedule selected before the
   * interactive anchor. Adopt that construction result and seed the fresh
   * kernel from the later transition cursor instead of selecting twice.
   */
  adoptedInitialOpponent?: Readonly<{
    generation: FactoryOpponentGenerationResult;
    freshBattleRngValue: number;
    /** Adapter-pinned draws before the fresh battle kernel begins. */
    preCommandRngCalls?: number;
  }>;
  /**
   * A later battle's pre-generated opponent schedule may already be probed
   * (docs/win-battle2-opponent-provenance-receipt.md): set selection is a
   * single real cursor, but personality construction spans 32 frames with
   * interleaved ambient VBlank ticks, so exact personalities need per-mon
   * construction cursors via `adoptFactoryOpponentSchedule`. Adopt that
   * result at the GO ON pre-generation seam instead of re-rolling the three
   * mon personalities back-to-back from one modeled cursor.
   */
  adoptedNextOpponent?: Readonly<{
    generation: FactoryOpponentGenerationResult;
    /** Source challenge battle number this schedule is for (1 = battle 2). */
    battleIndex: number;
  }>;
}>;

export type FactoryFacilityRngSegment = Readonly<{
  kind:
    | "initial-rentals"
    | "opponent-generation"
    | "opponent-selection"
    | "opponent-construction"
    | "battle";
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

export type FactoryBattlePresentationBattlerBoundary = Readonly<{
  battler: 0 | 1;
  partyIndex: BattlePartyIndex;
  field: BattleCommandPresentationState["field"]["player"];
  displayedHp: number;
  displayedStatus1: number;
  spriteVisible: boolean;
  idleEpoch: number;
  moveCursor: 0 | 1 | 2 | 3;
}>;

export type FactoryBattlePresentationBoundaries = readonly [
  FactoryBattlePresentationBattlerBoundary,
  FactoryBattlePresentationBattlerBoundary,
];

export type FactoryBattleDriveReceipt = Readonly<{
  battle: BattleState<FactoryFullTurnDecisionRules>;
  history: FactoryAiBattleHistory;
  events: readonly BattleKernelSemanticEvent[];
  boundary: BattleBoundary;
}>;

export type FactoryRetainedLockedActionPresentationOwner = Readonly<{
  action: BattleResolutionLockedActionIdentity;
  resolution: BattleResolutionPresentationState;
}>;

export type FactoryRoundBattleOrchestratorState = Readonly<{
  config: FactoryRoundBattleOrchestratorConfig;
  facilityState: FactoryFacilityState;
  /** Source sPerformedRentalSwap: challenge-scoped, persisted once on win 7. */
  performedRentalSwap: boolean;
  round: RoundControllerState;
  /** Frozen generated intro, installed only by the live room handoff. */
  battleStartIntro: FactoryBattleStartIntroState | null;
  battle: BattleState<FactoryFullTurnDecisionRules> | null;
  /** Request-owned player command UI, replaced at each command boundary. */
  battleCommandPresentation: BattleCommandPresentationState | null;
  /** Submitted command lifecycle, retained until its visible resolution ends. */
  battleResolutionPresentation: BattleResolutionPresentationState | null;
  /**
   * An opposing locked action may outlive its charge presentation while the
   * player owns a real intervening command request. Its battler/move/slot
   * identity reclaims the immutable resolution after that command submits.
   */
  retainedLockedActionPresentationOwner:
    FactoryRetainedLockedActionPresentationOwner | null;
  /** Adjacent voluntary selector while the command UI owns party-handoff. */
  battlePartySelect: BattlePartySelectState | null;
  /** Request-owned forced selector, created only on faint-message dismissal. */
  battleForcedPartySelect: PartySelectState | null;
  /** Source gMoveSelectionCursor: controller-owned, not request-owned. */
  moveSelectionCursors: FactoryBattleMoveSelectionCursors;
  /** Singles controller display/cursor state persisted across request boundaries. */
  battlePresentationBoundaries: FactoryBattlePresentationBoundaries | null;
  aiHistory: FactoryAiBattleHistory | null;
  initialRentalGeneration: FactoryInitialRentalGenerationResult | null;
  opponentGenerations: readonly FactoryOpponentGenerationResult[];
  /**
   * Source `AskSwapMon` ownership: `factory_generateopponentmons` runs before
   * the opponent type/style commentary and before the swap offer
   * (`pre-battle-room scripts.inc:137-149`), so the round controller
   * pre-generates battleIndex+1 at the post-win/scouting transition and
   * publishes it only when the swap resolves. Null until that transition and
   * cleared by publication; the segment for it is recorded at pre-generation
   * so the RNG receipt stays gapless. Simplified rounds that never
   * pre-generate still generate at swap resolution (see
   * `advanceFactoryRoundPresentation`).
   */
  pendingNextOpponent: FactoryOpponentGenerationResult | null;
  rngSegments: readonly FactoryFacilityRngSegment[];
  /** Monotonic count across facility generation and every battle cursor. */
  facilityRngCalls: number;
  activeBattleCallStart: number | null;
  /** One-shot adapter input, cleared as soon as the adopted battle starts. */
  pendingBattlePreCommandRngCalls: number;
  nextBattleRequestId: number;
}>;

export class FactoryRoundOrchestratorError extends Error {
  override readonly name = "FactoryRoundOrchestratorError";
}

/**
 * Freezes the generated presentation inputs while the round controller owns
 * a battle-start command. Simplified fixture rounds cannot enter this owner.
 */
export function factoryBattleStartPresentationForState(
  state: FactoryRoundBattleOrchestratorState,
): FactoryBattleStartPresentationCommand | null {
  const pending = state.round.presentation?.command;
  if (pending?.type !== "battleStart") return null;
  const playerParty = state.round.rules.playerKernelParty;
  const opponentRecords = pending.opponent.rentalRecords;
  const opponentTrainer = factoryTrainerPresentationForOpponent(pending.opponent);
  if (
    playerParty === null
    || opponentRecords === undefined
    || opponentTrainer === null
  ) {
    return fail("generated Factory battle-start presentation requires complete generated state");
  }
  return createFactoryBattleStartPresentationCommand({
    commandId: pending.commandId,
    battleIndex: pending.battleIndex,
    opponentTrainer,
    playerParty,
    opponentParty: asKernelParty(opponentRecords),
  });
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

/**
 * Carries the battle's own party writes (HP, status1, held item, PP -- the
 * only persistent fields the real game's `gPlayerParty`/`gEnemyParty` entries
 * mutate via the controller REQUEST_* write-backs, per the emit-site census
 * in `battle_script_commands.c`/`battle_util.c`: every `EmitSetMonData` call
 * writes only `REQUEST_HP/STATUS/HELDITEM/PP*`; the sole general exception is
 * Sketch's `REQUEST_MOVES_PP_BATTLE` (moves+PP), which no Factory-legal
 * Level-50 rental set carries, and Transform/Mimic rewrite only the in-battle
 * `gBattleMons`, never the party) back onto the rental identity. Identity
 * fields (species, personality, IVs, ability slot, moves, ppBonuses) are
 * therefore never battle-mutable on the Factory route and must stay the
 * records' own values: overlaying them from the terminal party would import a
 * scaffold/placeholder battler's identity into the kernel party, which
 * `healFactoryKernelParty`'s source-derived identity guard then rejects at
 * the next swap/advance (ISSUES #73, WIN swap-offer NO decision).
 */
function overlayTerminalKernelParty(
  identity: FactoryKernelParty,
  terminal: BattleScriptPartyState,
): FactoryKernelParty {
  return identity.map((member, index) => Object.freeze({
    ...member,
    hp: terminal[index]!.hp,
    status1: terminal[index]!.status1,
    item: terminal[index]!.item,
    pp: terminal[index]!.pp,
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
  kind: Exclude<FactoryFacilityRngSegment["kind"], "battle">,
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

  const adopted = config.adoptedInitialOpponent;
  const firstOpponent = adopted?.generation
    ?? generateOpponentFor(config, 0, rngValue, [], savedRentalRecords);
  if (adopted === undefined) {
    rngSegments.push(generationSegment(
      "opponent-generation",
      0,
      facilityRngCalls,
      rngValue,
      firstOpponent.rngValue,
      firstOpponent.drawLedger.length,
    ));
    facilityRngCalls += firstOpponent.drawLedger.length;
  } else {
    const selection = firstOpponent.drawLedger.filter(({ phase }) => phase !== "personality");
    rngSegments.push(generationSegment(
      "opponent-selection",
      0,
      facilityRngCalls,
      selection[0]!.rngBefore,
      firstOpponent.selectionRngValue,
      selection.length,
    ));
    facilityRngCalls += selection.length;
    for (let opponentIndex = 0; opponentIndex < 3; opponentIndex += 1) {
      const construction = firstOpponent.drawLedger.filter(
        (draw) => draw.phase === "personality" && draw.opponentIndex === opponentIndex,
      );
      rngSegments.push(generationSegment(
        "opponent-construction",
        0,
        facilityRngCalls,
        construction[0]!.rngBefore,
        construction.at(-1)!.rngAfter,
        construction.length,
      ));
      facilityRngCalls += construction.length;
    }
  }
  const opponent = generatedOpponent(firstOpponent);
  rngValue = adopted?.freshBattleRngValue ?? firstOpponent.rngValue;
  const round = createGeneratedFactoryRoundController({
    id: config.id,
    playerParty: asBattleParty(playerRentalRecords),
    playerRentalRecords,
    opponent,
    rngValue,
  });

  return Object.freeze({
    config,
    facilityState: Object.freeze({ ...config.facilityState }),
    performedRentalSwap: false,
    round,
    battleStartIntro: null,
    battle: null,
    battleCommandPresentation: null,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors: RESET_MOVE_SELECTION_CURSORS,
    battlePresentationBoundaries: null,
    aiHistory: null,
    initialRentalGeneration,
    opponentGenerations: Object.freeze([firstOpponent]),
    pendingNextOpponent: null,
    rngSegments: Object.freeze(rngSegments),
    facilityRngCalls,
    activeBattleCallStart: null,
    pendingBattlePreCommandRngCalls: adopted?.preCommandRngCalls ?? 0,
    nextBattleRequestId: 1,
  });
}

/**
 * Installs the pending round command's frozen intro at the real room seam.
 * Dev-stage command fixtures may continue to acknowledge battleStart directly.
 */
export function beginFactoryRoundBattleStartIntro(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  if (state.battleStartIntro !== null || state.battle !== null) {
    return fail("Factory battle-start intro requires an unstarted battle");
  }
  const command = factoryBattleStartPresentationForState(state);
  if (command === null) {
    return fail("Factory battle-start intro requires a pending battleStart command");
  }
  // Route-level fact, not a species/trainer/trace-name check: only the
  // interactive draft anchor adopts its Battle 1 opponent schedule
  // pre-selected (config.adoptedInitialOpponent, factoryAnchorSession.ts);
  // every other caller (dev-stage fixtures, and any later live battle within
  // the same session) generates its opponent fresh at this battleIndex.
  const isCanonicalAnchorIntro =
    state.config.adoptedInitialOpponent !== undefined && command.battleIndex === 0;
  return Object.freeze({
    ...state,
    battleStartIntro: Object.freeze({
      ...createFactoryBattleStartIntro(command, isCanonicalAnchorIntro),
      elapsed: -GENERATED_BATTLE_INTRO_ROOM_HANDOFF_DELAY,
    }),
  });
}

/**
 * Owns the live A edge through command readiness. Only that boundary
 * acknowledges battleStart, creates the fresh kernel, and settles its exact
 * typed command field into the already-proven action-menu lifecycle.
 */
export function advanceFactoryRoundBattleStartIntro(
  state: FactoryRoundBattleOrchestratorState,
  newKeys: ReadonlySet<GbaButton>,
): FactoryRoundBattleOrchestratorState {
  if (state.battleStartIntro === null) {
    return fail("Factory battle-start intro input requires an installed intro");
  }
  const intro = advanceFactoryBattleStartIntro(
    state.battleStartIntro,
    newKeys,
  );
  // The source PAUSE_UNTIL_PRESS callback accepts the edge before its
  // BeginBattleIntro presentation task advances on the following callback.
  if (
    state.battleStartIntro.acknowledgedElapsed === null
    && intro.acknowledgedElapsed !== null
  ) {
    return Object.freeze({
      ...state,
      battleStartIntro: Object.freeze({
        ...intro,
        elapsed: state.battleStartIntro.elapsed,
      }),
    });
  }
  if (!generatedBattleStartCommandReady(intro)) {
    return Object.freeze({ ...state, battleStartIntro: intro });
  }
  const commandId = state.round.presentation?.command.commandId;
  if (
    state.round.presentation?.command.type !== "battleStart"
    || commandId !== intro.command.commandId
  ) {
    return fail("Factory battle-start intro lost its pending round command");
  }
  const started = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
  if (started.battleCommandPresentation === null) {
    return fail("Factory battle-start intro did not publish a fresh command");
  }
  return Object.freeze({
    ...started,
    battleStartIntro: null,
    battleCommandPresentation: settleFactoryBattleStartCommand(
      intro,
      started.battleCommandPresentation,
    ),
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
    // The production Factory round route is the Battle Scene OFF contract.
    // Standalone fresh-kernel callers choose their own explicit option.
    battleScene: "off",
    preCommandRngCalls: state.pendingBattlePreCommandRngCalls,
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
  const battleCommandPresentation = createBattleCommandPresentation(
    started.boundary.request,
    started.rules.rulesContext,
    moveSelectionCursors[started.boundary.request.battler],
  );
  return Object.freeze({
    ...state,
    battle: started,
    battleCommandPresentation,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors,
    battlePresentationBoundaries: createBattlePresentationBoundaries(
      battleCommandPresentation,
      started,
      moveSelectionCursors,
    ),
    aiHistory: createFactoryAiBattleHistory(started.rules.rulesContext),
    facilityRngCalls: callStart + started.rng.calls,
    activeBattleCallStart: callStart,
    pendingBattlePreCommandRngCalls: 0,
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

/**
 * Source `AskSwapMon` seam (`pre-battle-room scripts.inc:137-149`): the ROM
 * calls `factory_generateopponentmons` before the opponent type/style
 * commentary and before the swap offer, and only publishes the pending
 * opponent after the swap resolves. This pre-generates battleIndex+1 from the
 * post-battle cursor at the post-win/scouting transition (the accepted GO ON
 * continuation), consuming the same RNG receipt the swap-resolved advance
 * would otherwise spend, so the ledger stays gapless and the defeated
 * opponent's party/records remain the swap screen's enemy pool. Idempotent:
 * a second call returns the same state, so repeated GO ON handling can never
 * double-generate. Any round not sitting on an uncompleted `battleWon` (a
 * staged canonical postwin, a mid-battle round, or an already-published
 * pending opponent) is returned unchanged.
 */
export function preGenerateFactoryRoundNextOpponent(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  if (state.pendingNextOpponent !== null) return state;
  const pending = state.round.presentation;
  if (
    state.round.rules.phase !== "presentingBattleWin"
    || pending === null
    || pending.command.type !== "battleWon"
    || pending.completed
  ) {
    return state;
  }
  const battleIndex = state.round.rules.battleIndex + 1;
  if (battleIndex > 6) {
    return fail("a seventh win has no next opponent to pre-generate");
  }
  const previous = state.opponentGenerations.at(-1)!;
  const rngBefore = state.round.rules.rngValue;
  const adoptedNext = state.config.adoptedNextOpponent;
  const generated = adoptedNext !== undefined && adoptedNext.battleIndex === battleIndex
    ? adoptedNext.generation
    : generateOpponentFor(
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
    pendingNextOpponent: generated,
    rngSegments: Object.freeze([...state.rngSegments, segment]),
    facilityRngCalls: segment.callEnd,
  });
}

export function advanceFactoryRoundPresentation(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  if (state.round.rules.phase === "presentingSwapResult") {
    const pending = state.pendingNextOpponent;
    if (pending !== null) {
      // The source-equivalent pre-generation already spent this segment's
      // RNG receipt at the post-win/scouting transition; publishing here
      // must not re-roll the opponent or append a second receipt.
      return Object.freeze({
        ...state,
        round: advanceRoundControllerWithGeneratedOpponent(state.round, {
          opponent: generatedOpponent(pending),
          rngValue: pending.rngValue,
        }),
        opponentGenerations: Object.freeze([...state.opponentGenerations, pending]),
        pendingNextOpponent: null,
      });
    }
    // Simplified rounds that never pre-generate (fixture stages, direct
    // swap-decision tests) still roll at swap resolution, byte-for-byte the
    // same cursor/spend as a pre-generation would have recorded.
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
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    battlePresentationBoundaries: null,
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

function createBattlePresentationBoundaries(
  presentation: BattleCommandPresentationState,
  battle: BattleState<FactoryFullTurnDecisionRules>,
  cursors: FactoryBattleMoveSelectionCursors,
  previous: FactoryBattlePresentationBoundaries | null = null,
): FactoryBattlePresentationBoundaries {
  const fields = [presentation.field.player, presentation.field.opponent] as const;
  return Object.freeze(fields.map((field, battler) => {
    const active = battle.rules.rulesContext.battlers[battler]!;
    const prior = previous?.[battler];
    const switched = prior !== undefined && prior.partyIndex !== field.partyIndex;
    return Object.freeze({
      battler: battler as 0 | 1,
      partyIndex: field.partyIndex,
      field,
      displayedHp: field.hp,
      displayedStatus1: active.status1,
      spriteVisible: prior === undefined || switched ? true : prior.spriteVisible,
      idleEpoch: prior === undefined || switched ? 0 : prior.idleEpoch,
      moveCursor: switched ? 0 : cursors[battler]!,
    });
  })) as unknown as FactoryBattlePresentationBoundaries;
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

function appendDriveEvents(
  events: readonly BattleKernelSemanticEvent[],
  appended: readonly BattleKernelSemanticEvent[],
): readonly BattleKernelSemanticEvent[] {
  let previous = events.at(-1)?.sequence ?? -1;
  for (const event of appended) {
    if (!Number.isSafeInteger(event.sequence) || event.sequence <= previous) {
      return fail(
        `trainer drive event sequence ${event.sequence} is not strictly increasing after ${previous}`,
      );
    }
    previous = event.sequence;
  }
  return Object.freeze([...events, ...appended]);
}

function driveTrainerBoundary(
  state: FactoryRoundBattleOrchestratorState,
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  history: FactoryAiBattleHistory,
  options: Readonly<{ stopAtFollowupTrainerBoundary?: boolean }> = {},
): FactoryBattleDriveReceipt {
  let nextBattle = transition.state;
  let nextHistory = history;
  let events = appendDriveEvents([], transition.events);
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
    events = appendDriveEvents(events, ai.transition.events);
    nextBattle = ai.transition.state;
    nextHistory = ai.history;
    // A player multi-turn lock is source-published as another trainer
    // command after the first trainer action. Keep each actual reducer pass
    // as its own presentation segment instead of flattening it into the
    // charge receipt; the later generic continuation owns the next pass.
    if (
      options.stopAtFollowupTrainerBoundary === true
      && nextBattle.boundary.kind === "decision-required"
      && nextBattle.boundary.request.kind === "command"
      && nextBattle.boundary.request.side === "trainer"
    ) break;
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
  const stoppedAtFollowupTrainerBoundary =
    options.stopAtFollowupTrainerBoundary === true
    && nextBattle.boundary.kind === "decision-required"
    && nextBattle.boundary.request.kind === "command"
    && nextBattle.boundary.request.side === "trainer";
  if (
    nextBattle.boundary.kind !== "terminal"
    && !stoppedAtFollowupTrainerBoundary
    && (
      nextBattle.boundary.kind !== "decision-required"
      || nextBattle.boundary.request.side !== "player"
    )
  ) {
    return fail("battle stopped outside a player, trainer, terminal, or barrier boundary");
  }
  return Object.freeze({
    battle: nextBattle,
    history: nextHistory,
    events,
    boundary: nextBattle.boundary,
  });
}

function installDriveReceiptImmediately(
  state: FactoryRoundBattleOrchestratorState,
  receipt: FactoryBattleDriveReceipt,
): FactoryRoundBattleOrchestratorState {
  if (receipt.boundary.kind === "terminal") {
    return finishBattle(state, receipt.battle, receipt.history);
  }
  const moveSelectionCursors = state.battle === null
    ? state.moveSelectionCursors
    : resetMoveSelectionCursorsForSwitchIns(
      state.moveSelectionCursors,
      state.battle,
      receipt.battle,
    );
  const battleCommandPresentation = commandPresentationForBoundary(
    receipt.battle,
    moveSelectionCursors,
  );
  return Object.freeze({
    ...state,
    battle: receipt.battle,
    battleCommandPresentation,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors,
    battlePresentationBoundaries: battleCommandPresentation === null
      ? state.battlePresentationBoundaries
      : createBattlePresentationBoundaries(
        battleCommandPresentation,
        receipt.battle,
        moveSelectionCursors,
        state.battlePresentationBoundaries,
      ),
    aiHistory: receipt.history,
    facilityRngCalls: state.activeBattleCallStart! + receipt.battle.rng.calls,
  });
}

function transitionFromDriveReceipt(
  receipt: FactoryBattleDriveReceipt,
): BattleDecisionTransitionResult<FactoryFullTurnDecisionRules> {
  if (receipt.boundary.kind === "decision-required") {
    return Object.freeze({
      kind: "decision-required",
      state: receipt.battle,
      events: receipt.events,
      nextRequest: receipt.boundary.request,
    });
  }
  if (receipt.boundary.kind === "machine-barrier") {
    return Object.freeze({
      kind: "machine-barrier",
      state: receipt.battle,
      events: receipt.events,
      barrier: receipt.boundary.barrier,
    });
  }
  return Object.freeze({
    kind: "terminal",
    state: receipt.battle,
    events: receipt.events,
    outcome: receipt.boundary.outcome,
  });
}

function transitionAtPublishedTrainerBoundary(
  battle: BattleState<FactoryFullTurnDecisionRules>,
): BattleDecisionTransitionResult<FactoryFullTurnDecisionRules> {
  if (
    battle.boundary.kind !== "decision-required"
    || battle.boundary.request.kind !== "command"
    || battle.boundary.request.side !== "trainer"
  ) {
    return fail("automatic action continuation requires a published trainer command boundary");
  }
  // No semantic event is minted here. `driveTrainerBoundary` starts at this
  // real reducer boundary and appends only the live Factory-AI submission's
  // untouched receipt.
  return Object.freeze({
    kind: "decision-required" as const,
    state: battle,
    events: Object.freeze([]),
    nextRequest: battle.boundary.request,
  });
}

function applyReceiptPpToBoundaries(
  boundaries: FactoryBattlePresentationBoundaries,
  events: readonly BattleKernelSemanticEvent[],
): FactoryBattlePresentationBoundaries {
  let next = boundaries;
  for (const event of events) {
    const payload = event.payload;
    if (payload.kind !== "set-battler-pp-data") continue;
    if (payload.battler !== 0 && payload.battler !== 1) {
      return fail(`Slice 3 cannot store PP for non-singles battler ${payload.battler}`);
    }
    const boundary = next[payload.battler];
    const currentPP = [...boundary.field.currentPP] as [number, number, number, number];
    currentPP[payload.movePosition] = payload.pp;
    const replacement = Object.freeze({
      ...boundary,
      field: Object.freeze({
        ...boundary.field,
        currentPP: Object.freeze(currentPP),
      }),
    });
    next = Object.freeze(next.map((candidate, battler) =>
      battler === payload.battler ? replacement : candidate
    )) as unknown as FactoryBattlePresentationBoundaries;
  }
  return next;
}

function beginCommandResolution(
  state: FactoryRoundBattleOrchestratorState,
  presentation: BattleCommandPresentationState,
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  history: FactoryAiBattleHistory,
): FactoryRoundBattleOrchestratorState {
  if (state.battle === null || presentation.pendingDecision === null) {
    return fail("command resolution requires a submitted live battle decision");
  }
  if (state.battlePresentationBoundaries === null) {
    return fail("command resolution requires controller battler boundaries");
  }
  const receipt = driveTrainerBoundary(state, transition, history, {
    stopAtFollowupTrainerBoundary: true,
  });
  const retained = state.retainedLockedActionPresentationOwner;
  const drivenTransition = transitionFromDriveReceipt(receipt);
  let resolution: BattleResolutionPresentationState;
  if (retained === null) {
    resolution = createBattleResolutionPresentation({
      sourceRequest: presentation.request,
      sourceDecision: presentation.pendingDecision,
      beforeRules: state.battle.rules,
      transition: drivenTransition,
      fieldBoundary: presentation.field,
      confirmHandoff: Object.freeze({
        fightDisplayCursor: presentation.fightDisplayCursor,
        idleBounceElapsed: presentation.idleBounceElapsed,
      }),
      opponentTrainer: factoryTrainerPresentationForOpponent(
        state.round.rules.currentOpponent,
      ),
    });
  } else {
    if (
      retained.resolution.pendingBattle !== state.battle
      || retained.resolution.pendingBoundary.kind !== "decision-required"
      || retained.resolution.pendingBoundary.request.kind !== "command"
      || retained.resolution.pendingBoundary.request.requestId
        !== presentation.request.requestId
      || retained.resolution.pendingBoundary.request.side
        !== presentation.request.side
      || retained.resolution.pendingBoundary.request.battler
        !== presentation.request.battler
    ) {
      return fail("retained locked action owner does not match the intervening command");
    }
    const rules = state.battle.rules.rulesContext;
    const action = retained.action;
    const activeLock = rules.battlers[action.battler]!.status2 & (
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
      | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
    );
    if (
      activeLock === 0
      || rules.lockedMoves[action.battler] !== action.currentMove
      || rules.chosenMovePositions[action.battler] !== action.currentMovePosition
    ) {
      return fail("retained locked action identity no longer matches the kernel");
    }
    resolution = appendBattleResolutionLockedActionContinuation({
      resolution: retained.resolution,
      transition: drivenTransition,
      fieldBoundary: presentation.field,
      lockedAction: action,
    });
  }
  return Object.freeze({
    ...state,
    battle: receipt.battle,
    battleCommandPresentation: null,
    battleResolutionPresentation: resolution,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    battlePresentationBoundaries: applyReceiptPpToBoundaries(
      state.battlePresentationBoundaries,
      receipt.events,
    ),
    aiHistory: receipt.history,
    facilityRngCalls: state.activeBattleCallStart! + receipt.battle.rng.calls,
  });
}

function withResolutionLifecycle(
  state: BattleResolutionPresentationState,
  commandIndex: number,
  phase: BattleResolutionPresentationState["lifecycle"]["phase"],
  phaseElapsed: number,
): BattleResolutionPresentationState {
  return Object.freeze({
    ...state,
    commandIndex,
    lifecycle: Object.freeze({ phase, phaseElapsed }),
    // ISSUES #78 residual (1): the ball-fade clock advances exactly one tick
    // per resolution frame (the confirm-handoff phase bumps its own clock in
    // `advanceBattleResolutionConfirmHandoff`; every presenting frame lands
    // here). The `presenting-switch-in` forced path drives this clock from
    // the party-select send-out elapsed instead of 1:1 -- harmless, because
    // the fade projection is only ever active inside the voluntary-switch
    // recall/send-in windows, which never use that phase.
    fadeTick: state.fadeTick + 1,
  });
}

function completedResolutionPhase(
  resolution: BattleResolutionPresentationState,
): "next-command-handoff" | "terminal-handoff" {
  return resolution.pendingBoundary.kind === "terminal"
    ? "terminal-handoff"
    : "next-command-handoff";
}

function boundaryFieldAt(
  field: BattleResolutionPresentationState["field"],
  battler: 0 | 1,
) {
  return battler === 0 ? field.player : field.opponent;
}

function commitCompletedResolutionCommand(
  boundaries: FactoryBattlePresentationBoundaries,
  resolution: BattleResolutionPresentationState,
  command: BattleResolutionPresentationCommand,
): FactoryBattlePresentationBoundaries {
  const displayed = createBattleResolutionPresentationRenderView(resolution).field;
  return Object.freeze(boundaries.map((boundary, battler) => Object.freeze({
    ...boundary,
    field: boundaryFieldAt(displayed, battler as 0 | 1),
    displayedHp: boundaryFieldAt(displayed, battler as 0 | 1).hp,
    displayedStatus1:
      command.type === "status-icon" && command.battler === battler
        ? command.status1
        : boundary.displayedStatus1,
    partyIndex:
      command.type === "switch-in" && command.battler === battler
        ? command.toPartyIndex
        : boundary.partyIndex,
    spriteVisible:
      command.type === "faint" && command.battler === battler
        ? false
        : command.type === "switch-in" && command.battler === battler
          ? true
          : command.type === "sprite-visibility" && command.battler === battler
            ? command.visible
          : boundary.spriteVisible,
    idleEpoch:
      command.type === "switch-in" && command.battler === battler
        ? 0
        : boundary.idleEpoch,
    moveCursor:
      command.type === "switch-in" && command.battler === battler
        ? 0
        : boundary.moveCursor,
  }))) as unknown as FactoryBattlePresentationBoundaries;
}

function forcedPartyForResolution(
  state: FactoryRoundBattleOrchestratorState,
  resolution: BattleResolutionPresentationState,
): BattleParty {
  const identities = state.round.rules.playerParty;
  const live = resolution.pendingBattle.rules.rulesContext.party.player;
  return Object.freeze(identities.map((identity, index) => Object.freeze({
    ...identity,
    hp: live[index]!.hp,
    maxHp: live[index]!.maxHP,
    status: mapStatus1ToBattleStatus(live[index]!.status1),
  }))) as BattleParty;
}

function createForcedPartySelect(
  state: FactoryRoundBattleOrchestratorState,
  resolution: BattleResolutionPresentationState,
): PartySelectState {
  const request = resolution.forcedRequest;
  const records = state.round.rules.playerRentalRecords;
  if (request === null || records === null) {
    return fail("forced-party handoff requires a genuine request and rental records");
  }
  return createPartySelectStateFromForcedSwitch(
    request,
    records,
    forcedPartyForResolution(state, resolution),
  );
}

function settledCommandForResolutionHandoff(
  battle: BattleState<FactoryFullTurnDecisionRules>,
  cursors: FactoryBattleMoveSelectionCursors,
  boundaries: FactoryBattlePresentationBoundaries,
): Readonly<{
  presentation: BattleCommandPresentationState;
  boundaries: FactoryBattlePresentationBoundaries;
}> {
  const entering = commandPresentationForBoundary(battle, cursors);
  if (entering === null) {
    return fail("Slice 3 resolution completed without a player command boundary");
  }
  const fields = [entering.field.player, entering.field.opponent] as const;
  for (const [battler, field] of fields.entries()) {
    const boundary = boundaries[battler]!;
    const active = battle.rules.rulesContext.battlers[battler]!;
    if (
      boundary.partyIndex !== field.partyIndex
      || boundary.displayedHp !== field.hp
      || boundary.displayedStatus1 !== active.status1
    ) {
      return fail(
        `resolution handoff battler ${battler} display does not match the genuine next boundary`,
      );
    }
  }
  const presentation = Object.freeze({
    ...entering,
    spriteVisibility: Object.freeze({
      player: boundaries[0]!.spriteVisible,
      opponent: boundaries[1]!.spriteVisible,
    }),
    lifecycle: Object.freeze({ phase: "action-menu" as const, phaseElapsed: 0 }),
  });
  return Object.freeze({
    presentation,
    boundaries: createBattlePresentationBoundaries(
      presentation,
      battle,
      cursors,
      boundaries,
    ),
  });
}

function retainedLockedActionOwnerAtCommandBoundary(
  resolution: BattleResolutionPresentationState,
): FactoryRetainedLockedActionPresentationOwner | null {
  const pending = resolution.pendingBoundary;
  if (
    pending.kind !== "decision-required"
    || pending.request.kind !== "command"
  ) return null;
  const rules = resolution.pendingBattle.rules.rulesContext;
  for (const battler of [0, 1] as const) {
    if (battler === pending.request.battler) continue;
    const statusLock = rules.battlers[battler]!.status2 & (
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
      | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
    );
    const currentMove = rules.lockedMoves[battler]!;
    const currentMovePosition = rules.chosenMovePositions[battler]!;
    if (statusLock === 0 || currentMove === 0) continue;
    if (
      !Number.isInteger(currentMovePosition)
      || currentMovePosition < 0
      || currentMovePosition > 3
    ) {
      return fail(`locked battler ${battler} has invalid move position ${currentMovePosition}`);
    }
    return Object.freeze({
      action: Object.freeze({
        battler,
        currentMove,
        currentMovePosition: currentMovePosition as 0 | 1 | 2 | 3,
      }),
      resolution,
    });
  }
  return null;
}

/**
 * Advances only the controller-owned Scene-OFF resolution clock. The pending
 * kernel boundary remains immutable, and the next command UI does not exist
 * until the six displayed blank handoff frames have completed.
 */
export function advanceFactoryRoundBattleResolution(
  state: FactoryRoundBattleOrchestratorState,
  newKeys: ReadonlySet<GbaButton> = new Set(),
): FactoryRoundBattleOrchestratorState {
  const resolution = state.battleResolutionPresentation;
  const boundaries = state.battlePresentationBoundaries;
  if (resolution === null || boundaries === null) {
    return fail("battle-resolution advance requires an active display boundary");
  }
  if (resolution.lifecycle.phase === "confirm-handoff") {
    return Object.freeze({
      ...state,
      battleResolutionPresentation:
        advanceBattleResolutionConfirmHandoff(resolution),
    });
  }
  if (resolution.lifecycle.phase === "presenting") {
    const segment = resolution.segments[resolution.segmentIndex];
    if (!segment) return fail(`resolution has no segment ${resolution.segmentIndex}`);
    const command = segment.commands[resolution.commandIndex];
    if (command === undefined) {
      return Object.freeze({
        ...state,
        battleResolutionPresentation: withResolutionLifecycle(
          resolution,
          resolution.commandIndex,
          completedResolutionPhase(resolution),
          0,
        ),
      });
    }
    if (
      command.type === "message"
      && command.advance === "button"
      && isBattleResolutionButtonMessageReady(resolution)
    ) {
      if (newKeys.has("A")) {
        if (resolution.forcedRequest === null) {
          const nextCommandIndex = resolution.commandIndex + 1;
          const nextResolution = withResolutionLifecycle(
            resolution,
            nextCommandIndex,
            nextCommandIndex >= segment.commands.length
              ? completedResolutionPhase(resolution)
              : "presenting",
            0,
          );
          return Object.freeze({
            ...state,
            battleResolutionPresentation: nextResolution,
            battlePresentationBoundaries: commitCompletedResolutionCommand(
              boundaries,
              nextResolution,
              command,
            ),
          });
        }
        return Object.freeze({
          ...state,
          battleResolutionPresentation: withResolutionLifecycle(
            resolution,
            resolution.commandIndex,
            "forced-party-handoff",
            resolution.lifecycle.phaseElapsed,
          ),
          battleForcedPartySelect: createForcedPartySelect(state, resolution),
        });
      }
      return Object.freeze({
        ...state,
        battleResolutionPresentation: withResolutionLifecycle(
          resolution,
          resolution.commandIndex,
          "awaiting-message-dismiss",
          resolution.lifecycle.phaseElapsed,
        ),
      });
    }
    if (!isBattleResolutionCommandComplete(resolution)) {
      return Object.freeze({
        ...state,
        battleResolutionPresentation: withResolutionLifecycle(
          resolution,
          resolution.commandIndex,
          "presenting",
          resolution.lifecycle.phaseElapsed + 1,
        ),
      });
    }
    const nextCommandIndex = resolution.commandIndex + 1;
    const nextResolution = withResolutionLifecycle(
      resolution,
      nextCommandIndex,
      nextCommandIndex >= segment.commands.length
        ? completedResolutionPhase(resolution)
        : "presenting",
      0,
    );
    return Object.freeze({
      ...state,
      battleResolutionPresentation: nextResolution,
      battlePresentationBoundaries: commitCompletedResolutionCommand(
        boundaries,
        nextResolution,
        command,
      ),
    });
  }
  if (resolution.lifecycle.phase === "awaiting-message-dismiss") {
    if (!newKeys.has("A")) {
      return Object.freeze({
        ...state,
        battleResolutionPresentation: withResolutionLifecycle(
          resolution,
          resolution.commandIndex,
          "awaiting-message-dismiss",
          resolution.lifecycle.phaseElapsed + 1,
        ),
      });
    }
    if (resolution.forcedRequest === null) {
      const segment = resolution.segments[resolution.segmentIndex]!;
      const command = segment.commands[resolution.commandIndex]!;
      const nextCommandIndex = resolution.commandIndex + 1;
      const nextResolution = withResolutionLifecycle(
        resolution,
        nextCommandIndex,
        nextCommandIndex >= segment.commands.length
          ? completedResolutionPhase(resolution)
          : "presenting",
        0,
      );
      return Object.freeze({
        ...state,
        battleResolutionPresentation: nextResolution,
        battlePresentationBoundaries: commitCompletedResolutionCommand(
          boundaries,
          nextResolution,
          command,
        ),
      });
    }
    return Object.freeze({
      ...state,
      battleResolutionPresentation: withResolutionLifecycle(
        resolution,
        resolution.commandIndex,
        "forced-party-handoff",
        resolution.lifecycle.phaseElapsed,
      ),
      battleForcedPartySelect: createForcedPartySelect(state, resolution),
    });
  }
  if (resolution.lifecycle.phase === "forced-party-handoff") {
    const selector = state.battleForcedPartySelect;
    if (selector === null) {
      return fail("forced-party handoff has no request-owned selector");
    }
    if (selector.sendOutElapsed !== null) {
      const history = state.aiHistory;
      if (history === null) {
        return fail("forced-party continuation requires live AI history");
      }
      const submitted = submitPartySelectBattleDecision(
        resolution.pendingBattle,
        selector,
        reduceFactoryFullTurnDecision,
      );
      if (submitted === null) {
        return fail("confirmed forced-party selector did not submit a decision");
      }
      const receipt = driveTrainerBoundary(state, submitted, history);
      const appended = appendBattleResolutionContinuation({
        resolution,
        transition: transitionFromDriveReceipt(receipt),
        fieldBoundary:
          createBattleResolutionPresentationRenderView(resolution).field,
      });
      return Object.freeze({
        ...state,
        battle: receipt.battle,
        battleResolutionPresentation: appended,
        moveSelectionCursors: resetMoveSelectionCursorsForSwitchIns(
          state.moveSelectionCursors,
          resolution.pendingBattle,
          receipt.battle,
        ),
        aiHistory: receipt.history,
        facilityRngCalls:
          state.activeBattleCallStart! + receipt.battle.rng.calls,
      });
    }
    return Object.freeze({
      ...state,
      battleForcedPartySelect: advancePartySelect(selector, newKeys),
    });
  }
  if (resolution.lifecycle.phase === "presenting-switch-in") {
    const selector = state.battleForcedPartySelect;
    if (selector?.sendOutElapsed === null || selector === null) {
      return fail("switch-in presentation requires a confirmed forced selector");
    }
    const advancedSelector = advancePartySelect(selector, new Set());
    const elapsed = advancedSelector.sendOutElapsed;
    if (elapsed === null) {
      return fail("switch-in presentation lost its confirmation clock");
    }
    const advancedResolution = withResolutionLifecycle(
      resolution,
      resolution.commandIndex,
      "presenting-switch-in",
      elapsed,
    );
    if (!partySendOutBattleMenuReady(elapsed)) {
      return Object.freeze({
        ...state,
        battleResolutionPresentation: advancedResolution,
        battleForcedPartySelect: advancedSelector,
      });
    }
    const switchCommand = resolution.segments[resolution.segmentIndex]!.commands
      .find((command) => command.type === "switch-in");
    if (switchCommand?.type !== "switch-in") {
      return fail("switch-in lifecycle has no typed switch command");
    }
    const active = resolution.pendingBattle.rules.rulesContext
      .battlers[switchCommand.battler]!;
    const committedBoundaries = Object.freeze(boundaries.map((boundary) =>
      boundary.battler === switchCommand.battler
        ? Object.freeze({
            ...boundary,
            partyIndex: switchCommand.toPartyIndex,
            field: switchCommand.incoming,
            displayedHp: switchCommand.incoming.hp,
            displayedStatus1: active.status1,
            spriteVisible: true,
            idleEpoch: 0,
            moveCursor: 0,
          })
        : boundary
    )) as unknown as FactoryBattlePresentationBoundaries;
    const handoff = settledCommandForResolutionHandoff(
      resolution.pendingBattle,
      state.moveSelectionCursors,
      committedBoundaries,
    );
    return Object.freeze({
      ...state,
      battle: resolution.pendingBattle,
      battleCommandPresentation: handoff.presentation,
      battleResolutionPresentation: null,
      battleForcedPartySelect: null,
      battlePresentationBoundaries: handoff.boundaries,
    });
  }
  if (resolution.lifecycle.phase === "terminal-handoff") {
    if (resolution.pendingBoundary.kind !== "terminal") {
      return fail("terminal presentation handoff requires an immutable terminal boundary");
    }
    if (
      resolution.pendingBattle !== state.battle
      || resolution.pendingBattle.boundary !== resolution.pendingBoundary
    ) {
      return fail("terminal presentation handoff lost its retained battle boundary");
    }
    if (state.aiHistory === null) {
      return fail("terminal presentation handoff requires live AI history");
    }
    return finishBattle(
      state,
      resolution.pendingBattle,
      state.aiHistory,
    );
  }
  if (resolution.lifecycle.phase !== "next-command-handoff") {
    return fail(`cannot advance resolution phase ${resolution.lifecycle.phase}`);
  }
  const advanced = withResolutionLifecycle(
    resolution,
    resolution.commandIndex,
    "next-command-handoff",
    resolution.lifecycle.phaseElapsed + 1,
  );
  if (!isBattleResolutionNextCommandHandoffComplete(advanced)) {
    return Object.freeze({
      ...state,
      battleResolutionPresentation: advanced,
    });
  }
  if (
    resolution.pendingBoundary.kind === "decision-required"
    && resolution.pendingBoundary.request.kind === "command"
    && resolution.pendingBoundary.request.side === "trainer"
  ) {
    if (state.battle !== resolution.pendingBattle) {
      return fail("automatic action continuation lost its retained battle boundary");
    }
    if (state.aiHistory === null) {
      return fail("automatic action continuation requires live AI history");
    }
    const receipt = driveTrainerBoundary(
      state,
      transitionAtPublishedTrainerBoundary(resolution.pendingBattle),
      state.aiHistory,
      { stopAtFollowupTrainerBoundary: true },
    );
    const appended = appendBattleResolutionActionContinuation({
      resolution: advanced,
      transition: transitionFromDriveReceipt(receipt),
      fieldBoundary: createBattleResolutionPresentationRenderView(advanced).field,
    });
    return Object.freeze({
      ...state,
      battle: receipt.battle,
      battleResolutionPresentation: appended,
      battlePresentationBoundaries: applyReceiptPpToBoundaries(
        boundaries,
        receipt.events,
      ),
      moveSelectionCursors: resetMoveSelectionCursorsForSwitchIns(
        state.moveSelectionCursors,
        resolution.pendingBattle,
        receipt.battle,
      ),
      aiHistory: receipt.history,
      facilityRngCalls: state.activeBattleCallStart! + receipt.battle.rng.calls,
    });
  }
  const handoff = settledCommandForResolutionHandoff(
    resolution.pendingBattle,
    state.moveSelectionCursors,
    boundaries,
  );
  return Object.freeze({
    ...state,
    battle: resolution.pendingBattle,
    battleCommandPresentation: handoff.presentation,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner:
      retainedLockedActionOwnerAtCommandBoundary(advanced),
    battlePresentationBoundaries: handoff.boundaries,
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
    // ISSUES #78 close cadence: after the SEND OUT confirm (fixture 963) the
    // real party menu stays on screen through its fade-out (1019-1034) before
    // the field idles 1035-1043 and the recall printstring lands at 1044
    // (docs/mid-battle-switch-presentation-ground-truth.md §2). Hold the
    // settled selector through the menu-hold/menu-fade span, then clear it and
    // route the voluntary switch through the resolution presentation, whose
    // null-handoff confirm phase owns the field-hold frames before the recall
    // message. The party-menu fade pixels themselves are ISSUES #80 scope, so
    // the settled frame is held and cut; the frame budget is the acceptance.
    if (
      selector.closeElapsed !== null
      && battlePartySelectClosePhase(selector.closeElapsed) !== "field-hold"
      && battlePartySelectClosePhase(selector.closeElapsed) !== "done"
    ) {
      return Object.freeze({ ...state, battlePartySelect: selector });
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
    const cleared = Object.freeze({ ...state, battlePartySelect: null });
    return beginCommandResolution(cleared, returned, transition, history);
  }
  const advanced = advanceBattleCommandPresentation(presentation, newKeys);
  const moveSelectionCursors = Object.freeze(
    state.moveSelectionCursors.map((cursor, battler) =>
      battler === advanced.request.battler ? advanced.fightCursor : cursor),
  ) as FactoryBattleMoveSelectionCursors;
  const battlePresentationBoundaries = state.battlePresentationBoundaries === null
    ? null
    : Object.freeze(state.battlePresentationBoundaries.map((boundary) =>
      boundary.battler === advanced.request.battler
        ? Object.freeze({
            ...boundary,
            idleEpoch: boundary.idleEpoch + 1,
            moveCursor: advanced.fightCursor,
          })
        : boundary
    )) as unknown as FactoryBattlePresentationBoundaries;
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
        battlePresentationBoundaries,
      });
    }
    return Object.freeze({
      ...state,
      battleCommandPresentation: advanced,
      moveSelectionCursors,
      battlePresentationBoundaries,
    });
  }
  const submitting = Object.freeze({
    ...state,
    moveSelectionCursors,
    battlePresentationBoundaries,
  });
  return advanced.pendingDecision?.kind === "use-move"
    ? beginCommandResolution(submitting, advanced, transition, history)
    : installDriveReceiptImmediately(
        submitting,
        driveTrainerBoundary(submitting, transition, history),
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
  return installDriveReceiptImmediately(
    state,
    driveTrainerBoundary(state, transition, history),
  );
}
