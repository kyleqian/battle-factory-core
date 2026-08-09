import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import {
  createBattleState,
  type BattleDecisionTransitionResult,
  type BattleState,
  type BattleSubmittedDecision,
} from "../src/engine/battleDecisionBoundary.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { PARTY_SELECT_CLOSE_MENU_FRAMES } from "../src/engine/battlePartySelect.ts";
import { createFactoryAiBattleHistory } from "../src/engine/factoryAiLiveDriver.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import {
  battleResolutionCommandDuration,
  createBattleResolutionPresentationRenderView,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { createFreshFactoryBattle } from "../src/engine/factoryBattleStart.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnBattlerConfig,
  type FactoryFullTurnConfig,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type { BattleScriptPartyState } from "../src/engine/battleScriptRulesContext.ts";
import { getFactoryTrainerPresentation } from "../src/engine/factoryTrainerPresentation.ts";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import {
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundPresentation,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  preGenerateFactoryRoundNextOpponent,
  submitFactoryRoundPlayerDecision,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  createPendingFactorySwapPresentation,
} from "../src/engine/factorySwapPresentation.ts";
import {
  POSTWIN_OPPONENT_RENTAL_IDS,
  POSTWIN_SCOUTING_INPUT_READY_DELAYS,
  POSTWIN_SWAP_INPUT_READY_DELAY,
} from "../src/engine/postwin.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  adoptFactoryOpponentSchedule,
  generateFactoryOpponent,
} from "../src/engine/factoryOpponentGeneration.ts";
import { resolveTurn15FlyResolutionAdapter } from "../src/engine/turn15FlyResolutionAdapter.ts";

const RNG_SEED = 4;
const MOVE_TACKLE = 33;
const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number, fixedIv = 31): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function acknowledgeAndAdvance(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
}

function createStartedGeneratedBattle(
  seed: number,
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const state = createFactoryRoundBattleOrchestrator({
    id: `generated-command-seam-${seed}`,
    rngValue: seed,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords: [...playerRecords, record(1), record(2), record(3)],
    },
  });
  return acknowledgeAndAdvance(state);
}

function createStartedGeneratedFlyBattle(): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(44), record(8), record(300)] as const;
  const state = createFactoryRoundBattleOrchestrator({
    id: "generated-scene-off-fly-round",
    rngValue: 0,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords: [...playerRecords, record(1), record(2), record(3)],
    },
  });
  return acknowledgeAndAdvance(state);
}

/**
 * A legal generated-round seed whose ordinary player FIRE_PUNCH applies burn
 * to the generated WAILMER. This is a production round-controller seam, not
 * a battle-number recording: its result is owned by the live kernel and AI.
 */
function createStartedSceneOffStatusIconBurnBattle(): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(149), record(300), record(301)] as const;
  const state = createFactoryRoundBattleOrchestrator({
    id: "scene-off-status-icon-burn",
    rngValue: 3359,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords: [...playerRecords, record(302), record(303), record(304)],
    },
  });
  return acknowledgeAndAdvance(state);
}

function createOpponentLockedFlyPresentationBattle(): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(156, 3), record(149, 3), record(180, 3)] as const;
  const carrier = acknowledgeAndAdvance(createFactoryRoundBattleOrchestrator({
    id: "opponent-locked-action-owner",
    rngValue: 26,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords: [...playerRecords, record(1), record(2), record(3)],
    },
  }));
  expect(carrier.opponentGenerations[0]?.opponents.map(({ setId }) => setId))
    .toEqual([196, 184, 143]);
  const resolution = resolveTurn15FlyResolutionAdapter().chargeResolution;
  const fields = [resolution.field.player, resolution.field.opponent] as const;
  const moveSelectionCursors = Object.freeze([2, 1, 0, 0] as const);
  const battlePresentationBoundaries = Object.freeze(fields.map((field, battler) =>
    Object.freeze({
      battler: battler as 0 | 1,
      partyIndex: field.partyIndex,
      field,
      displayedHp: field.hp,
      displayedStatus1:
        resolution.segments[0]!.beforeRules.rulesContext.battlers[battler]!.status1,
      spriteVisible: true,
      idleEpoch: 0,
      moveCursor: moveSelectionCursors[battler]!,
    })
  )) as FactoryRoundBattleOrchestratorState["battlePresentationBoundaries"];
  return Object.freeze({
    ...carrier,
    battle: resolution.pendingBattle,
    battleCommandPresentation: null,
    battleResolutionPresentation: resolution,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors,
    battlePresentationBoundaries,
    aiHistory: createFactoryAiBattleHistory(
      resolution.pendingBattle.rules.rulesContext,
    ),
    facilityRngCalls:
      carrier.activeBattleCallStart! + resolution.pendingBattle.rng.calls,
  });
}

/**
 * Source-shaped full parties for the retained-owner seam tests. Their active
 * records are legal Factory sets; the high staged HP merely keeps both sides
 * alive long enough to isolate the lock handoff from a faint boundary.
 */
function durableLockedActionParty(activeSetId: number): BattleScriptPartyState {
  const member = (setId: number) => Object.freeze({
    ...createFactoryCorpusPartyMember(record(setId, 3)),
    hp: 5_000,
    maxHP: 5_000,
  });
  return Object.freeze([
    member(activeSetId),
    member(300),
    member(301),
    member(302),
    member(303),
    member(304),
  ]) as unknown as BattleScriptPartyState;
}

/**
 * Starts from a real toxic status but otherwise keeps both legal Factory
 * parties durable. The live end-turn reducer owns the toxic-counter bump and
 * HP write; the staged input does not manufacture either transition.
 */
function createOpponentToxicResolutionHandoffBattle(): FactoryRoundBattleOrchestratorState {
  const toxic = 1 << 7;
  const opponentParty = durableLockedActionParty(184).map((member, index) =>
    index === 0 ? Object.freeze({ ...member, status1: toxic }) : member
  ) as unknown as BattleScriptPartyState;
  const battle = createFreshFactoryBattle({
    requestId: 1,
    rngSeed: 0,
    battleScene: "off",
    playerParty: durableLockedActionParty(8), // Metapod's HARDEN is non-terminal.
    opponentParty,
  });
  if (
    battle.boundary.kind !== "decision-required"
    || battle.boundary.request.kind !== "command"
    || battle.boundary.request.side !== "player"
  ) {
    throw new Error("expected staged toxic battle player command");
  }
  const battleCommandPresentation = createBattleCommandPresentation(
    battle.boundary.request,
    battle.rules.rulesContext,
  );
  const fields = [
    battleCommandPresentation.field.player,
    battleCommandPresentation.field.opponent,
  ] as const;
  const moveSelectionCursors = Object.freeze([0, 0, 0, 0] as const);
  const battlePresentationBoundaries = Object.freeze(fields.map((field, battler) =>
    Object.freeze({
      battler: battler as 0 | 1,
      partyIndex: field.partyIndex,
      field,
      displayedHp: field.hp,
      displayedStatus1: battle.rules.rulesContext.battlers[battler]!.status1,
      spriteVisible: true,
      idleEpoch: 0,
      moveCursor: 0 as const,
    })
  )) as FactoryRoundBattleOrchestratorState["battlePresentationBoundaries"];
  const carrier = createStartedGeneratedBattle(RNG_SEED);
  return Object.freeze({
    ...carrier,
    battle,
    battleCommandPresentation,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors,
    battlePresentationBoundaries,
    aiHistory: createFactoryAiBattleHistory(battle.rules.rulesContext),
    facilityRngCalls: carrier.activeBattleCallStart! + battle.rng.calls,
  });
}

/**
 * Mounts one source-driven turn from legal Factory-set identities in the real
 * generated-round resolution owner. The deliberately durable HP staging keeps
 * the cadence isolated; commands/events still come from the ordinary reducer.
 */
function createStagedOpponentStatusMoveResolutionCarrier(input: Readonly<{
  playerSetId: number;
  playerMoveSlot: 0 | 1 | 2 | 3;
  playerItem?: number;
  opponentSetId: number;
  opponentMoveSlot: 0 | 1 | 2 | 3;
}>): FactoryRoundBattleOrchestratorState {
  const initial = createFreshFactoryBattle({
    requestId: 1,
    rngSeed: 0,
    battleScene: "off",
    playerParty: Object.freeze(durableLockedActionParty(input.playerSetId).map((member, index) =>
      index === 0 && input.playerItem !== undefined
        ? Object.freeze({ ...member, item: input.playerItem })
        : member
    )) as unknown as BattleScriptPartyState,
    opponentParty: durableLockedActionParty(input.opponentSetId),
  });
  const player = submitStagedLockedActionMove(initial, "player", input.playerMoveSlot);
  const opponent = submitStagedLockedActionMove(
    player.transition.state,
    "trainer",
    input.opponentMoveSlot,
  );
  const field = createBattleCommandPresentation(
    player.request,
    initial.rules.rulesContext,
    player.decision.moveSlot,
  ).field;
  const resolution = createBattleResolutionPresentation({
    sourceRequest: player.request,
    sourceDecision: player.decision,
    beforeRules: initial.rules,
    transition: opponent.transition,
    fieldBoundary: field,
    confirmHandoff: { fightDisplayCursor: player.decision.moveSlot, idleBounceElapsed: 0 },
  });
  const carrier = createStartedGeneratedBattle(RNG_SEED);
  const fields = [resolution.field.player, resolution.field.opponent] as const;
  const moveSelectionCursors = Object.freeze([0, 0, 0, 0] as const);
  const battlePresentationBoundaries = Object.freeze(fields.map((displayed, battler) =>
    Object.freeze({
      battler: battler as 0 | 1,
      partyIndex: displayed.partyIndex,
      field: displayed,
      displayedHp: displayed.hp,
      displayedStatus1: initial.rules.rulesContext.battlers[battler]!.status1,
      spriteVisible: true,
      idleEpoch: 0,
      moveCursor: 0 as const,
    })
  )) as FactoryRoundBattleOrchestratorState["battlePresentationBoundaries"];
  return Object.freeze({
    ...carrier,
    battle: resolution.pendingBattle,
    battleCommandPresentation: null,
    battleResolutionPresentation: resolution,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors,
    battlePresentationBoundaries,
    aiHistory: createFactoryAiBattleHistory(resolution.pendingBattle.rules.rulesContext),
    facilityRngCalls: carrier.activeBattleCallStart! + resolution.pendingBattle.rng.calls,
  });
}

function expectSourceWaitmessageHoldAtFirstAutomaticEdge(
  initial: FactoryRoundBattleOrchestratorState,
  messageId: string,
): void {
  const resolution = initial.battleResolutionPresentation!;
  const commandIndex = resolution.segments[0]!.commands.findIndex((command) =>
    command.type === "message"
    && resolution.segments[0]!.events.some((event) =>
      event.sequence === command.eventSequence
      && event.payload.kind === "message"
      && event.payload.messageId === messageId
    )
  );
  expect(commandIndex).toBeGreaterThanOrEqual(0);
  const command = resolution.segments[0]!.commands[commandIndex]!;
  expect(command).toMatchObject({ type: "message", advance: "automatic" });
  if (command.type !== "message") throw new Error("expected message command");
  const event = resolution.segments[0]!.events.find(({ sequence }) =>
    sequence === command.eventSequence
  )!;
  const following = loadBattleScriptProgram().instructions[
    event.provenance!.programCounter + 1
  ]!;
  expect(following).toMatchObject({
    opcodeName: "B_SCR_OP_WAITMESSAGE",
    operands: [{ expression: "B_WAIT_TIME_LONG" }],
  });
  const sourceWaitDuration = battleResolutionCommandDuration(command, resolution.field);
  expect(command.timing).toMatchObject({ holdFrames: 64 });

  let state = initial;
  for (let budget = 0; budget < 2_000; budget += 1) {
    const live = state.battleResolutionPresentation;
    if (
      live?.lifecycle.phase === "presenting"
      && live.commandIndex === commandIndex
      && live.lifecycle.phaseElapsed === 0
    ) break;
    state = advanceFactoryRoundBattleResolution(state);
  }
  expect(state.battleResolutionPresentation?.commandIndex).toBe(commandIndex);

  // The first formerly-wrong edge was the end of typing: the generic owner
  // retired the banner here instead of entering source's 64-frame waitmessage.
  const typingDuration = sourceWaitDuration - 64;
  for (let age = 0; age < typingDuration; age += 1) {
    state = advanceFactoryRoundBattleResolution(state);
  }
  expect(state.battleResolutionPresentation).toMatchObject({
    commandIndex,
    lifecycle: { phase: "presenting", phaseElapsed: typingDuration },
  });

  for (let age = typingDuration; age < sourceWaitDuration; age += 1) {
    state = advanceFactoryRoundBattleResolution(state);
  }
  expect(state.battleResolutionPresentation?.commandIndex).toBe(commandIndex + 1);
}

function submitStagedLockedActionMove(
  state: BattleState<FactoryFullTurnDecisionRules>,
  side: "player" | "trainer",
  moveSlot: 0 | 1 | 2 | 3,
) {
  if (
    state.boundary.kind !== "decision-required"
    || state.boundary.request.kind !== "command"
    || state.boundary.request.side !== side
  ) {
    throw new Error(`expected staged ${side} command boundary`);
  }
  const request = state.boundary.request;
  const decision = request.legalDecisions.find((candidate) =>
    candidate.kind === "use-move" && candidate.moveSlot === moveSlot,
  );
  if (decision === undefined || decision.kind !== "use-move") {
    throw new Error(`expected legal staged ${side} move slot ${moveSlot}`);
  }
  const transition = submitFactoryFullTurnDecision(state, {
    requestId: request.requestId,
    side,
    decision,
  });
  if (transition.kind !== "decision-required") {
    throw new Error(`staged ${side} move did not reach a continuation boundary`);
  }
  return Object.freeze({ request, decision, transition });
}

/**
 * Enters the public orchestrator at a real source-derived post-charge player
 * request. The carrier's generated round owns only the surrounding Factory
 * controller/AI; the staged battle and resolution are ordinary full-turn
 * kernel receipts, so the retained-owner seam is driven exactly as production
 * drives its subsequent player command.
 */
function createOpponentLockedActionPresentationBattle(input: Readonly<{
  opponentSetId: number;
  opponentMoveSlot: 0 | 1 | 2 | 3;
}>): Readonly<{
  state: FactoryRoundBattleOrchestratorState;
  chargeResolution: ReturnType<typeof createBattleResolutionPresentation>;
}> {
  const initial = createFreshFactoryBattle({
    requestId: 1,
    rngSeed: 0,
    battleScene: "off",
    playerParty: durableLockedActionParty(8), // Metapod's Harden is non-terminal.
    opponentParty: durableLockedActionParty(input.opponentSetId),
  });
  const player = submitStagedLockedActionMove(initial, "player", 0);
  const charge = submitStagedLockedActionMove(
    player.transition.state,
    "trainer",
    input.opponentMoveSlot,
  );
  const chargeResolution = createBattleResolutionPresentation({
    sourceRequest: player.request,
    sourceDecision: player.decision,
    beforeRules: initial.rules,
    transition: charge.transition,
    fieldBoundary: createBattleCommandPresentation(
      player.request,
      initial.rules.rulesContext,
      player.decision.moveSlot,
    ).field,
    confirmHandoff: { fightDisplayCursor: player.decision.moveSlot, idleBounceElapsed: 0 },
  });
  if (
    chargeResolution.pendingBoundary.kind !== "decision-required"
    || chargeResolution.pendingBoundary.request.kind !== "command"
    || chargeResolution.pendingBoundary.request.side !== "player"
  ) {
    throw new Error("staged opponent lock did not publish its intervening player command");
  }
  const carrier = createStartedGeneratedBattle(RNG_SEED);
  const fields = [chargeResolution.field.player, chargeResolution.field.opponent] as const;
  const moveSelectionCursors = Object.freeze([0, 0, 0, 0] as const);
  const battlePresentationBoundaries = Object.freeze(fields.map((field, battler) =>
    Object.freeze({
      battler: battler as 0 | 1,
      partyIndex: field.partyIndex,
      field,
      displayedHp: field.hp,
      displayedStatus1:
        chargeResolution.segments[0]!.beforeRules.rulesContext.battlers[battler]!.status1,
      spriteVisible: true,
      idleEpoch: 0,
      moveCursor: moveSelectionCursors[battler]!,
    })
  )) as FactoryRoundBattleOrchestratorState["battlePresentationBoundaries"];
  return Object.freeze({
    state: Object.freeze({
      ...carrier,
      battle: chargeResolution.pendingBattle,
      battleCommandPresentation: null,
      battleResolutionPresentation: chargeResolution,
      retainedLockedActionPresentationOwner: null,
      battlePartySelect: null,
      battleForcedPartySelect: null,
      moveSelectionCursors,
      battlePresentationBoundaries,
      aiHistory: createFactoryAiBattleHistory(
        chargeResolution.pendingBattle.rules.rulesContext,
      ),
      facilityRngCalls:
        carrier.activeBattleCallStart! + chargeResolution.pendingBattle.rng.calls,
    }),
    chargeResolution,
  });
}

function advanceCommandToPhase(
  state: FactoryRoundBattleOrchestratorState,
  phase: NonNullable<
    FactoryRoundBattleOrchestratorState["battleCommandPresentation"]
  >["lifecycle"]["phase"],
): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (
    let budget = 0;
    budget < 32 && next.battleCommandPresentation?.lifecycle.phase !== phase;
    budget += 1
  ) {
    next = advanceFactoryRoundBattleCommand(next, new Set());
  }
  expect(next.battleCommandPresentation?.lifecycle.phase).toBe(phase);
  return next;
}

function advanceResolutionToNextCommand(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (
    let budget = 0;
    budget < 2_000 && next.battleResolutionPresentation !== null;
    budget += 1
  ) {
    next = advanceFactoryRoundBattleResolution(next);
  }
  expect(next.battleResolutionPresentation).toBeNull();
  expect(next.battleCommandPresentation).not.toBeNull();
  return next;
}

function choosePlayerDecision(
  state: FactoryRoundBattleOrchestratorState,
): BattleSubmittedDecision {
  const boundary = state.battle?.boundary;
  if (boundary?.kind !== "decision-required" || boundary.request.side !== "player") {
    throw new Error("expected a player decision");
  }
  if (boundary.request.kind === "forced-switch") {
    return { kind: "switch", partyIndex: boundary.request.legalPartyIndexes[0]! };
  }
  const active = state.battle!.rules.rulesContext.battlers[0];
  const preferredSlot = active.partyIndex === 1 && active.isFirstTurn === 2 ? 3 : 0;
  return boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move" && decision.moveSlot === preferredSlot,
  ) ?? boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move",
  )!;
}

function driveGeneratedRoundToCompletion(
  seed: number,
  onDecisionSubmitted?: (state: FactoryRoundBattleOrchestratorState) => void,
  chooseSwap: (
    state: FactoryRoundBattleOrchestratorState,
  ) => Parameters<typeof chooseFactoryRoundSwap>[1] = () => ({ type: "decline" }),
  rentsCount = 0,
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
  let state = createFactoryRoundBattleOrchestrator({
    id: `generated-round-carrier-seed-${seed}`,
    rngValue: seed,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords,
    },
  });
  for (
    let budget = 0;
    budget < 1_000
      && state.round.rules.phase !== "roundComplete"
      && state.round.rules.phase !== "roundLost";
    budget += 1
  ) {
    if (state.battle !== null) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
      onDecisionSubmitted?.(state);
      continue;
    }
    if (
      state.round.rules.phase === "presentingBattleStart"
      || state.round.rules.phase === "presentingBattleWin"
      || state.round.rules.phase === "presentingSwapResult"
    ) {
      state = acknowledgeAndAdvance(state);
      continue;
    }
    if (state.round.rules.phase === "awaitingSwapDecision") {
      const commandId = state.round.presentation?.command.commandId;
      if (commandId === undefined) throw new Error("expected swap-offer presentation command");
      state = completeFactoryRoundPresentation(state, { commandId });
      state = chooseFactoryRoundSwap(state, chooseSwap(state));
      continue;
    }
    throw new Error(`unexpected carrier phase ${state.round.rules.phase}`);
  }
  return state;
}

describe("generated Factory round battle orchestrator (Gate-5 rung 11)", () => {
  it.each([
    ["TORMENT", 2, "STRINGID_PKMNSUBJECTEDTOTORMENT"],
    ["TAUNT", 3, "STRINGID_PKMNFELLFORTAUNT"],
  ] as const)(
    "ISSUES #84(2): opponent MURKROW's %s result banner enters source's waitmessage hold",
    (_move, opponentMoveSlot, messageId) => {
      expectSourceWaitmessageHoldAtFirstAutomaticEdge(
        createStagedOpponentStatusMoveResolutionCarrier({
          playerSetId: 153, // legal BUTTERFREE rental
          playerMoveSlot: 1, // PSYBEAM
          opponentSetId: 184, // legal MURKROW rental
          opponentMoveSlot,
        }),
        messageId,
      );
    },
  );

  it("ISSUES #84(4): opponent TOXIC's status banner enters source's waitmessage hold after the status/controller receipt", () => {
    const state = createStagedOpponentStatusMoveResolutionCarrier({
      playerSetId: 153, // legal BUTTERFREE rental
      playerMoveSlot: 1, // PSYBEAM
      playerItem: 0, // mechanicLab-legal no-item variant: keep poison visible.
      opponentSetId: 134, // legal CLAMPERL rental
      opponentMoveSlot: 1, // TOXIC
    });
    const commands = state.battleResolutionPresentation!.segments[0]!.commands;
    const messageLines = commands
      .filter((command) => command.type === "message")
      .map((command) => command.lines.join(" / "));
    if (!messageLines.includes("BUTTERFREE is badly / poisoned!")) {
      throw new Error(`missing TOXIC result banner: ${JSON.stringify(messageLines)}`);
    }
    const messageIndex = commands.findIndex((command) =>
      command.type === "message"
      && command.lines.join(" ").includes("badly poisoned")
    );
    expect(messageIndex).toBeGreaterThan(0);
    expect(commands.slice(0, messageIndex).some((command) => command.type === "status"))
      .toBe(true);
    expectSourceWaitmessageHoldAtFirstAutomaticEdge(
      state,
      "STRINGID_PKMNBADLYPOISONED",
    );
  });

  it("selects Battle Scene OFF at the generated fresh-battle seam without changing facility state", () => {
    const state = createStartedGeneratedBattle(RNG_SEED);
    expect(state.battle?.rules.rulesContext.hitMarker).toBe(
      BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
    );
    expect(state.facilityState).toEqual({ rentsCount: 0 });
    expect(state.battle?.boundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", side: "player", battler: 0 },
    });
  });

  it("ISSUES #39: Scene-OFF burn keeps the live status logical until its generic status-icon controller receipt", () => {
    let state = createStartedSceneOffStatusIconBurnBattle();
    expect(state.round.rules.currentOpponent.rentalRecords?.map(({ setId }) => setId))
      .toEqual([170, 122, 133]);
    expect(state.battle?.rules.rulesContext.hitMarker).toBe(
      BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
    );

    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceCommandToPhase(state, "fight-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));

    const resolution = state.battleResolutionPresentation;
    if (resolution === null) throw new Error("expected the live burn resolution");
    const events = resolution.segments[0]!.events;
    const rawStatusEventIndex = events.findIndex(({ payload }) =>
      payload.kind === "set-battler-status-data"
      && payload.battler === 1
      && payload.status1 === (1 << 4)
    );
    const burnTextEventIndex = events.findIndex(({ payload }, index) =>
      index > rawStatusEventIndex
      && payload.kind === "message"
      && payload.messageId === "STRINGID_PKMNWASBURNED"
    );
    const statusIconEventIndex = events.findIndex(({ payload }, index) =>
      index > burnTextEventIndex
      && payload.kind === "status-icon-update"
      && payload.battler === 1
      && payload.status1 === (1 << 4)
      && payload.status2 === 0
    );
    expect(rawStatusEventIndex).toBeGreaterThanOrEqual(0);
    expect(burnTextEventIndex).toBeGreaterThan(rawStatusEventIndex);
    expect(statusIconEventIndex).toBeGreaterThan(burnTextEventIndex);
    expect(events.some(({ payload }) => payload.kind === "status-animation")).toBe(false);

    const commands = resolution.segments[0]!.commands;
    const rawStatusCommandIndex = commands.findIndex((command) =>
      command.type === "status" && command.eventSequence === events[rawStatusEventIndex]!.sequence
    );
    const burnMessageCommandIndex = commands.findIndex((command) =>
      command.type === "message" && command.eventSequence === events[burnTextEventIndex]!.sequence
    );
    const statusIconCommandIndex = commands.findIndex((command) =>
      command.type === "status-icon" && command.eventSequence === events[statusIconEventIndex]!.sequence
    );
    expect(rawStatusCommandIndex).toBeGreaterThanOrEqual(0);
    expect(burnMessageCommandIndex).toBeGreaterThan(rawStatusCommandIndex);
    expect(statusIconCommandIndex).toBeGreaterThan(burnMessageCommandIndex);
    expect(commands[burnMessageCommandIndex]).toMatchObject({
      type: "message",
      lines: ["Foe WAILMER was burned!"],
    });
    expect(commands[statusIconCommandIndex]).toMatchObject({
      type: "status-icon",
      battler: 1,
      status1: 1 << 4,
      status2: 0,
      timing: { minimumFrames: 1 },
    });

    for (
      let budget = 0;
      budget < 2_000
        && (
          state.battleResolutionPresentation?.lifecycle.phase !== "presenting"
          || state.battleResolutionPresentation.commandIndex !== rawStatusCommandIndex
        );
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    expect(state.battleResolutionPresentation?.commandIndex).toBe(rawStatusCommandIndex);
    expect(state.battle?.rules.rulesContext.battlers[1].status1).toBe(1 << 4);
    expect(state.battlePresentationBoundaries?.[1].displayedStatus1).toBe(0);

    for (
      let budget = 0;
      budget < 128 && state.battleResolutionPresentation?.commandIndex === rawStatusCommandIndex;
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    expect(state.battleResolutionPresentation?.commandIndex).toBe(rawStatusCommandIndex + 1);
    expect(state.battlePresentationBoundaries?.[1].displayedStatus1).toBe(0);

    for (
      let budget = 0;
      budget < 512 && state.battleResolutionPresentation?.commandIndex !== statusIconCommandIndex;
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    expect(state.battleResolutionPresentation?.commandIndex).toBe(statusIconCommandIndex);
    expect(state.battlePresentationBoundaries?.[1].displayedStatus1).toBe(0);

    for (
      let budget = 0;
      budget < 16 && state.battleResolutionPresentation?.commandIndex === statusIconCommandIndex;
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    expect(state.battleResolutionPresentation?.commandIndex).toBe(statusIconCommandIndex + 1);
    expect(state.battlePresentationBoundaries?.[1].displayedStatus1).toBe(1 << 4);

    state = advanceResolutionToNextCommand(state);
    expect(state.battleCommandPresentation?.request).toMatchObject({
      kind: "command",
      requestId: 3,
      side: "player",
      battler: 0,
    });
    expect(state.battlePresentationBoundaries?.[1].displayedStatus1)
      .toBe(state.battle?.rules.rulesContext.battlers[1].status1);
  });

  it("ISSUES #84(5): hands a toxic-damaged opponent's genuine updated snapshot to the next public command", () => {
    let state = createOpponentToxicResolutionHandoffBattle();
    const before = state.battleCommandPresentation!.field.opponent;

    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceCommandToPhase(state, "fight-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));

    const resolution = state.battleResolutionPresentation;
    if (resolution === null) throw new Error("expected toxic-damage resolution");
    const active = resolution.pendingBattle.rules.rulesContext.battlers[1]!;
    expect(active.partyIndex).toBe(before.partyIndex);
    expect(active.hp).toBeLessThan(before.hp);
    expect(active.status1 & 0xff).toBe(1 << 7);
    expect(active.status1).toBe((1 << 7) | (1 << 8));
    expect(resolution.pendingBattle.rules.rulesContext.party.opponent[0]!.status1)
      .toBe(active.status1); // source syncs the counter; the icon remains PSN.
    expect(resolution.segments.flatMap(({ events }) => events).some(({ payload }) =>
      payload.kind === "hp-change"
      && payload.battler === 1
      && payload.from === before.hp
      && payload.to === active.hp
    )).toBe(true);

    for (
      let budget = 0;
      budget < 2_000
        && state.battleResolutionPresentation?.lifecycle.phase !== "next-command-handoff";
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    expect(state.battlePresentationBoundaries?.[1]).toMatchObject({
      partyIndex: active.partyIndex,
      displayedHp: active.hp,
      displayedStatus1: 1 << 7,
    });

    const opponentBoundary = state.battlePresentationBoundaries![1];
    const inconsistent = Object.freeze({
      ...state,
      battlePresentationBoundaries: Object.freeze([
        state.battlePresentationBoundaries![0],
        Object.freeze({
          ...opponentBoundary,
          displayedHp: opponentBoundary.displayedHp + 1,
        }),
      ]) as FactoryRoundBattleOrchestratorState["battlePresentationBoundaries"],
    });
    expect(() => {
      let next = inconsistent;
      for (let frame = 0; frame < 8; frame += 1) {
        next = advanceFactoryRoundBattleResolution(next);
      }
    }).toThrowError(
      "resolution handoff battler 1 display does not match the genuine next boundary",
    );

    state = advanceResolutionToNextCommand(state);
    expect(state.battleCommandPresentation?.field.opponent).toMatchObject({
      partyIndex: active.partyIndex,
      hp: active.hp,
      status: "poison",
    });
  });

  it("drives an unmodified generated FLY round receipt through charge, lock, restoration, and the next player command", () => {
    let state = createStartedGeneratedFlyBattle();
    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceCommandToPhase(state, "fight-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));

    const chargeResolution = state.battleResolutionPresentation;
    if (chargeResolution === null) throw new Error("expected the generated FLY resolution");
    const chargeEvents = chargeResolution.segments[0]!.events;
    const hidden = chargeEvents.findIndex(({ payload }) =>
      payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 0
      && payload.invisible
    );
    const interveningOpponentMove = chargeEvents.findIndex(({ payload }, index) =>
      index > hidden
      && payload.kind === "message"
      && payload.messageId === "STRINGID_USEDMOVE"
      && payload.actionSnapshot?.attacker === 1
    );
    expect(state.battle?.rules.rulesContext.hitMarker).toBe(
      BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
    );
    expect(hidden).toBeGreaterThanOrEqual(0);
    expect(interveningOpponentMove).toBeGreaterThan(hidden);
    expect(chargeResolution.pendingBoundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", requestId: 3, side: "trainer", battler: 1 },
    });

    for (
      let budget = 0;
      budget < 2_000
        && state.battleResolutionPresentation?.segments.length !== 2;
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    const resolution = state.battleResolutionPresentation;
    if (resolution === null || resolution.segments.length !== 2) {
      throw new Error("expected the locked FLY continuation presentation segment");
    }
    const lockedEvents = resolution.segments[1]!.events;
    const lockedPlayerMove = lockedEvents.findIndex(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_USEDMOVE"
      && payload.actionSnapshot?.attacker === 0
      && payload.actionSnapshot.currentMove === 19
    );
    const restored = lockedEvents.findIndex(({ payload }, index) =>
      index > lockedPlayerMove
      && payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 0
      && !payload.invisible
    );
    expect(resolution.segments[1]!.events[0]!.sequence).toBeGreaterThan(
      resolution.segments[0]!.events.at(-1)!.sequence,
    );
    expect(lockedPlayerMove).toBeGreaterThanOrEqual(0);
    expect(restored).toBeGreaterThan(lockedPlayerMove);
    const lockedPayload = lockedEvents[lockedPlayerMove]!.payload;
    if (lockedPayload.kind !== "message") throw new Error("locked FLY receipt did not narrow");
    expect(lockedPayload.actionSnapshot).toEqual({
      attacker: 0,
      currentMove: 19,
      currentMovePosition: 0,
    });
    expect(lockedEvents.slice(lockedPlayerMove + 1).some(({ payload }) =>
      payload.kind === "set-battler-pp-data" && payload.battler === 0
    )).toBe(false);
    expect(resolution.pendingBoundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", requestId: 4, side: "player", battler: 0 },
    });

    const commands = resolution.segments[1]!.commands;
    const lockedCommand = commands.findIndex((command) =>
      command.type === "message"
      && command.lines[0] === "TAILLOW used"
      && command.lines[1] === "FLY!"
    );
    const restoredCommand = commands.findIndex((command, index) =>
      index > lockedCommand
      && command.type === "sprite-visibility"
      && command.battler === 0
      && command.visible
    );
    expect(lockedCommand).toBeGreaterThanOrEqual(0);
    expect(restoredCommand).toBeGreaterThan(lockedCommand);
    expect(createBattleResolutionPresentationRenderView(Object.freeze({
      ...resolution,
      segmentIndex: 1,
      commandIndex: lockedCommand,
      lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
      confirmHandoff: null,
    })).visibility.player.sprite).toBe(false);
    expect(createBattleResolutionPresentationRenderView(Object.freeze({
      ...resolution,
      segmentIndex: 1,
      commandIndex: restoredCommand,
      lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
      confirmHandoff: null,
    })).visibility.player.sprite).toBe(true);

    for (
      let budget = 0;
      budget < 2_000 && state.battleResolutionPresentation !== null;
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    expect(state.battleResolutionPresentation).toBeNull();
    expect(state.battleCommandPresentation?.request).toMatchObject({
      kind: "command", requestId: 4, side: "player", battler: 0,
    });
    expect(state.facilityState).toEqual({ rentsCount: 0 });
  });

  it("retains an opponent locked-action owner across its genuine intervening command and hands the forced request to PartySelectState", () => {
    let state = createOpponentLockedFlyPresentationBattle();
    const chargeResolution = state.battleResolutionPresentation!;
    const chargeSegment = chargeResolution.segments[0]!;
    const opponentPpAfterCharge =
      chargeResolution.pendingBattle.rules.rulesContext.battlers[1]!.pp[1];

    state = advanceResolutionToNextCommand(state);
    const interveningRequest = state.battleCommandPresentation!.request;
    const owner = state.retainedLockedActionPresentationOwner;
    expect(interveningRequest).toEqual(chargeResolution.pendingBoundary.kind === "decision-required"
      ? chargeResolution.pendingBoundary.request
      : null);
    expect(interveningRequest).toMatchObject({
      kind: "command", requestId: 3, side: "player", battler: 0,
    });
    expect(owner).toMatchObject({
      action: { battler: 1, currentMove: 19, currentMovePosition: 1 },
    });
    expect(owner?.resolution.resolutionId).toBe(chargeResolution.resolutionId);
    expect(owner?.resolution.segments[0]).toBe(chargeSegment);
    expect(owner?.resolution.pendingBattle).toBe(chargeResolution.pendingBattle);
    expect(state.battlePresentationBoundaries?.[1].spriteVisible).toBe(false);

    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceCommandToPhase(state, "fight-menu");
    expect(state.retainedLockedActionPresentationOwner).toBe(owner);
    expect(state.battleCommandPresentation?.request).toEqual(interveningRequest);
    expect(state.battleCommandPresentation?.fightCursor).toBe(2);
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));

    const strikeResolution = state.battleResolutionPresentation;
    if (strikeResolution === null) throw new Error("expected retained locked strike");
    expect(state.retainedLockedActionPresentationOwner).toBeNull();
    expect(strikeResolution.resolutionId).toBe(chargeResolution.resolutionId);
    expect(strikeResolution.resolutionId.requestId)
      .not.toBe(interveningRequest.requestId);
    expect(strikeResolution.segments).toHaveLength(2);
    expect(strikeResolution.segments[0]).toBe(chargeSegment);
    expect(Object.isFrozen(strikeResolution.segments)).toBe(true);
    expect(Object.isFrozen(strikeResolution.segments[0])).toBe(true);
    const strikeEvents = strikeResolution.segments[1]!.events;
    const strike = strikeEvents.findIndex(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_USEDMOVE"
      && payload.actionSnapshot?.attacker === 1
    );
    const restored = strikeEvents.findIndex(({ payload }, index) =>
      index > strike
      && payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 1
      && !payload.invisible
    );
    expect(strikeEvents[strike]?.payload).toMatchObject({
      actionSnapshot: { attacker: 1, currentMove: 19, currentMovePosition: 1 },
    });
    expect(restored).toBeGreaterThan(strike);
    expect(strikeEvents.some(({ payload }) =>
      payload.kind === "set-battler-pp-data" && payload.battler === 1
    )).toBe(false);
    expect(state.battle?.rules.rulesContext.battlers[1]!.pp[1])
      .toBe(opponentPpAfterCharge);
    const forcedRequest = strikeResolution.forcedRequest;
    expect(forcedRequest).toMatchObject({
      kind: "forced-switch",
      requestId: 4,
      side: "player",
      battler: 0,
      faintedPartyIndex: 0,
      legalPartyIndexes: [1, 2],
    });

    for (
      let budget = 0;
      budget < 2_000 && state.battleForcedPartySelect === null;
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state, new Set(["A"]));
    }
    expect(state.battleForcedPartySelect?.request).toEqual(forcedRequest);
    expect(state.battleResolutionPresentation?.lifecycle.phase)
      .toBe("forced-party-handoff");
    for (
      let budget = 0;
      budget < 400 && state.battleForcedPartySelect!.elapsed < 140;
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    state = advanceFactoryRoundBattleResolution(state, new Set(["DOWN"]));
    state = advanceFactoryRoundBattleResolution(state, new Set(["A"]));
    expect(state.battleForcedPartySelect?.submenuOpen).toBe(true);
    state = advanceFactoryRoundBattleResolution(state, new Set(["A"]));
    expect(state.battleForcedPartySelect?.sendOutElapsed).toBe(0);
    state = advanceFactoryRoundBattleResolution(state);
    expect(state.battleResolutionPresentation?.lifecycle.phase)
      .toBe("presenting-switch-in");
    expect(state.battleResolutionPresentation?.segments).toHaveLength(3);
    expect(state.battleResolutionPresentation?.forcedRequest).toBeNull();

    for (
      let budget = 0;
      budget < 2_000 && state.battleCommandPresentation === null;
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    expect(state.battleCommandPresentation?.request).toMatchObject({
      kind: "command", side: "player", battler: 0,
    });
    expect(state.battle?.rules.rulesContext.battlers[0].partyIndex).toBe(1);
    expect(state.battleForcedPartySelect).toBeNull();
  });

  it("reclaims an opponent recharge owner from its immutable must-recharge snapshot without a second PP write", () => {
    const staged = createOpponentLockedActionPresentationBattle({
      // Aerodactyl's legal Factory set has HYPER_BEAM in source slot 0.
      opponentSetId: 531,
      opponentMoveSlot: 0,
    });
    let state = staged.state;
    const chargeSegment = staged.chargeResolution.segments[0]!;
    const opponentPpAfterCharge =
      staged.chargeResolution.pendingBattle.rules.rulesContext.battlers[1]!.pp[0];

    state = advanceResolutionToNextCommand(state);
    const interveningRequest = state.battleCommandPresentation!.request;
    expect(interveningRequest).toMatchObject({
      kind: "command", requestId: 3, side: "player", battler: 0,
    });
    expect(state.retainedLockedActionPresentationOwner).toMatchObject({
      action: { battler: 1, currentMove: 63, currentMovePosition: 0 },
    });

    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceCommandToPhase(state, "fight-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));

    const resolution = state.battleResolutionPresentation;
    if (resolution === null) throw new Error("expected retained recharge resolution");
    expect(resolution.resolutionId).toBe(staged.chargeResolution.resolutionId);
    expect(resolution.resolutionId.requestId).not.toBe(interveningRequest.requestId);
    expect(resolution.segments).toHaveLength(2);
    expect(resolution.segments[0]).toBe(chargeSegment);
    expect(Object.isFrozen(resolution.segments)).toBe(true);
    const recharge = resolution.segments[1]!.events.find(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_PKMNMUSTRECHARGE"
      && payload.actionSnapshot?.attacker === 1
      && payload.actionSnapshot.currentMove === 63
      && payload.actionSnapshot.currentMovePosition === 0,
    );
    if (recharge?.payload.kind !== "message") {
      throw new Error("expected immutable opponent recharge receipt");
    }
    expect(Object.isFrozen(recharge.payload.actionSnapshot)).toBe(true);
    expect(resolution.segments[1]!.events.some(({ payload }) =>
      payload.kind === "set-battler-pp-data" && payload.battler === 1
    )).toBe(false);
    expect(state.battle?.rules.rulesContext.battlers[1]!.pp[0]).toBe(opponentPpAfterCharge);
    expect(resolution.pendingBoundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", requestId: 4, side: "player", battler: 0 },
    });
    expect(state.facilityRngCalls).toBe(
      state.activeBattleCallStart! + state.battle!.rng.calls,
    );

    state = advanceResolutionToNextCommand(state);
    expect(state.battleCommandPresentation?.request).toMatchObject({
      kind: "command", requestId: 4, side: "player", battler: 0,
    });
    expect(state.retainedLockedActionPresentationOwner).toBeNull();
  });

  it("reclaims an opponent Bide owner from its non-USEDMOVE action snapshot and returns the next real command", () => {
    const staged = createOpponentLockedActionPresentationBattle({
      // Seedot's legal Factory set has BIDE in source slot 1.
      opponentSetId: 18,
      opponentMoveSlot: 1,
    });
    let state = staged.state;
    const chargeSegment = staged.chargeResolution.segments[0]!;
    const opponentPpAfterCharge =
      staged.chargeResolution.pendingBattle.rules.rulesContext.battlers[1]!.pp[1];

    state = advanceResolutionToNextCommand(state);
    const interveningRequest = state.battleCommandPresentation!.request;
    expect(interveningRequest).toMatchObject({
      kind: "command", requestId: 3, side: "player", battler: 0,
    });
    expect(state.retainedLockedActionPresentationOwner).toMatchObject({
      action: { battler: 1, currentMove: 117, currentMovePosition: 1 },
    });

    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceCommandToPhase(state, "fight-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));

    const resolution = state.battleResolutionPresentation;
    if (resolution === null) throw new Error("expected retained Bide resolution");
    expect(resolution.resolutionId).toBe(staged.chargeResolution.resolutionId);
    expect(resolution.resolutionId.requestId).not.toBe(interveningRequest.requestId);
    expect(resolution.segments).toHaveLength(2);
    expect(resolution.segments[0]).toBe(chargeSegment);
    const bideMessages = resolution.segments[1]!.events.filter(({ payload }) =>
      payload.kind === "message" && payload.actionSnapshot?.attacker === 1,
    );
    expect(bideMessages).toHaveLength(1);
    expect(bideMessages[0]?.payload).toMatchObject({
      kind: "message",
      messageId: "STRINGID_PKMNSTORINGENERGY",
      actionSnapshot: { attacker: 1, currentMove: 117, currentMovePosition: 1 },
    });
    const bidePayload = bideMessages[0]!.payload;
    if (bidePayload.kind !== "message") throw new Error("expected Bide message receipt");
    expect(Object.isFrozen(bidePayload.actionSnapshot)).toBe(true);
    expect(resolution.segments[1]!.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_USEDMOVE"
      && payload.actionSnapshot?.attacker === 1
    )).toBe(false);
    expect(resolution.segments[1]!.events.some(({ payload }) =>
      payload.kind === "set-battler-pp-data" && payload.battler === 1
    )).toBe(false);
    expect(state.battle?.rules.rulesContext.battlers[1]!.pp[1]).toBe(opponentPpAfterCharge);
    expect(resolution.pendingBoundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", requestId: 4, side: "player", battler: 0 },
    });
    expect(state.facilityRngCalls).toBe(
      state.activeBattleCallStart! + state.battle!.rng.calls,
    );

    state = advanceResolutionToNextCommand(state);
    expect(state.battleCommandPresentation?.request).toMatchObject({
      kind: "command", requestId: 4, side: "player", battler: 0,
    });
    expect(state.retainedLockedActionPresentationOwner).toMatchObject({
      action: { battler: 1, currentMove: 117, currentMovePosition: 1 },
    });
  });

  it("cancels POKéMON back to the same action request and cursor", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    state = advanceCommandToPhase(state, "action-menu");
    const requestId = state.battleCommandPresentation!.request.requestId;
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
    expect(state.battleCommandPresentation?.actionCursor).toBe(2);
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    expect(state.battleCommandPresentation?.lifecycle.phase).toBe("party-handoff");
    expect(state.battlePartySelect).not.toBeNull();
    state = advanceFactoryRoundBattleCommand(state, new Set(["B"]));
    expect(state.battlePartySelect).toBeNull();
    expect(state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(state.battleCommandPresentation?.actionCursor).toBe(2);
    expect(state.battleCommandPresentation?.request.requestId).toBe(requestId);
  });

  it("returns the exact legal voluntary row to the ordinary switch submission through the close cadence", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
    expect(state.battlePartySelect?.cursor).toBe(2);
    expect(state.battlePartySelect?.rows[2].legal).toBe(true);
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    expect(state.battlePartySelect?.outcome).toEqual({
      kind: "select",
      partyIndex: 2,
    });
    // ISSUES #78 close cadence: the settled party menu stays on screen through
    // the real menu-close span before the switch crosses the ordinary
    // submission bridge (docs/mid-battle-switch-presentation-ground-truth.md
    // §2 -- the recall printstring is not what closes the menu).
    for (
      let tick = 0;
      tick < PARTY_SELECT_CLOSE_MENU_FRAMES - 1;
      tick += 1
    ) {
      state = advanceFactoryRoundBattleCommand(state, new Set());
      expect(state.battlePartySelect).not.toBeNull();
    }
    state = advanceFactoryRoundBattleCommand(state, new Set());
    expect(state.battlePartySelect).toBeNull();
    expect(state.battleResolutionPresentation).not.toBeNull();
    // The resolution owns the whole switch turn; its pending battle has the
    // switched-in mon live at party index 2.
    expect(state.battleResolutionPresentation!.pendingBattle
      .rules.rulesContext.battlers[0].partyIndex).toBe(2);
    expect(state.battle?.rules.rulesContext.battlers[0].partyIndex).toBe(2);
  });

  it("routes a live request through FIGHT slot 3 and seeds the next request from the controller-owned cursor", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    const firstBoundary = state.battle?.boundary;
    if (
      firstBoundary?.kind !== "decision-required"
      || firstBoundary.request.kind !== "command"
    ) {
      throw new Error("expected a live player command boundary");
    }
    expect(state.battleCommandPresentation?.request).toEqual(firstBoundary.request);
    expect(state.battleCommandPresentation?.field.player.moveIds)
      .toEqual(state.battle?.rules.rulesContext.battlers[0].moves);

    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"] as const));
    state = advanceCommandToPhase(state, "fight-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["RIGHT"] as const));
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"] as const));
    expect(state.battleCommandPresentation?.fightCursor).toBe(3);

    state = advanceFactoryRoundBattleCommand(state, new Set(["A"] as const));
    const resolution = state.battleResolutionPresentation;
    expect(state.battleCommandPresentation).toBeNull();
    expect(resolution?.resolutionId.requestId).toBe(firstBoundary.request.requestId);
    expect(resolution?.sourceDecision).toEqual({
      kind: "use-move",
      moveSlot: 3,
      targetBattler: 1,
    });
    expect(resolution?.pendingBoundary).toBe(resolution?.pendingBattle.boundary);
    const eventSequences = resolution?.segments[0]?.events.map(({ sequence }) => sequence) ?? [];
    expect(eventSequences).toEqual(eventSequences.map(
      (_, index) => eventSequences[0]! + index,
    ));
    expect(resolution?.segments[0]?.events.filter(
      ({ payload }) =>
        payload.kind === "message" && payload.messageId === "STRINGID_USEDMOVE",
    )).toHaveLength(2);
    expect(state.moveSelectionCursors[0]).toBe(3);
    expect(state.battlePresentationBoundaries?.[0].moveCursor).toBe(3);
    expect(state.battlePresentationBoundaries?.[0].displayedHp)
      .toBe(resolution?.field.player.hp);
    expect(state.battlePresentationBoundaries?.[1].displayedHp)
      .toBe(resolution?.field.opponent.hp);
    expect(state.battlePresentationBoundaries?.map(({ field }) => field.currentPP))
      .toEqual(state.battle?.rules.rulesContext.battlers.slice(0, 2).map(
        ({ pp }) => pp,
      ));
    const engine = {
      ...createInitialState(),
      factoryRoundBattleOrchestrator: state,
    };
    expect(render(engine)).toHaveLength(240 * 160 * 4);
    const afterOneHandoffCallback = tick(
      engine,
      new Set(),
    ).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    expect(afterOneHandoffCallback?.lifecycle).toEqual({
      phase: "confirm-handoff",
      phaseElapsed: 0,
    });
    expect(afterOneHandoffCallback?.confirmHandoff).toMatchObject({
      stage: "selection-accepted",
      fightDisplayCursor: 3,
      idleBounceElapsed: resolution!.confirmHandoff!.idleBounceElapsed + 1,
    });

    const retainedBoundary = state.battlePresentationBoundaries;
    state = advanceResolutionToNextCommand(state);
    expect(state.battleCommandPresentation?.request)
      .toEqual(resolution?.pendingBattle.boundary.kind === "decision-required"
        ? resolution.pendingBattle.boundary.request
        : undefined);
    expect(state.battleCommandPresentation?.request.requestId)
      .not.toBe(firstBoundary.request.requestId);
    expect(state.battleCommandPresentation?.lifecycle).toEqual({
      phase: "action-menu",
      phaseElapsed: 0,
    });
    expect(state.battleCommandPresentation?.fightCursor).toBe(3);
    expect(state.battleCommandPresentation?.fightDisplayCursor).toBe(3);
    expect(state.battlePresentationBoundaries?.[0].idleEpoch)
      .toBe(retainedBoundary?.[0].idleEpoch);
    expect(state.battlePresentationBoundaries?.map((boundary) => ({
      partyIndex: boundary.partyIndex,
      displayedHp: boundary.displayedHp,
    }))).toEqual(state.battle?.rules.rulesContext.battlers.slice(0, 2).map(
      (battler) => ({
        partyIndex: battler.partyIndex,
        displayedHp: battler.hp,
      }),
    ));
  });

  it("retains a terminal boundary through the final faint message, then hands its immutable outcome to the round owner", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    let terminalDecision: BattleSubmittedDecision | null = null;
    for (let budget = 0; budget < 80 && terminalDecision === null; budget += 1) {
      const decision = choosePlayerDecision(state);
      const preview = submitFactoryRoundPlayerDecision(state, decision);
      if (preview.battle === null) {
        terminalDecision = decision;
        break;
      }
      state = preview;
    }
    expect(terminalDecision?.kind).toBe("use-move");
    if (terminalDecision?.kind !== "use-move") {
      throw new Error("expected the generated battle's terminal player move");
    }

    state = advanceCommandToPhase(state, "action-menu");
    expect(state.battleCommandPresentation?.actionCursor).toBe(0);
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceCommandToPhase(state, "fight-menu");
    const target = terminalDecision.moveSlot;
    const current = state.battleCommandPresentation!.fightCursor;
    if (current % 2 !== target % 2) {
      state = advanceFactoryRoundBattleCommand(state, new Set(["RIGHT"]));
    }
    if (Math.floor(state.battleCommandPresentation!.fightCursor / 2)
      !== Math.floor(target / 2)) {
      state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
    }
    expect(state.battleCommandPresentation?.fightCursor).toBe(target);
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));

    const retainedBattle = state.battleResolutionPresentation?.pendingBattle;
    const retainedBoundary = state.battleResolutionPresentation?.pendingBoundary;
    expect(retainedBoundary?.kind).toBe("terminal");
    expect(retainedBattle?.boundary).toBe(retainedBoundary);
    expect(state.battle).toBe(retainedBattle);
    expect(state.round.rules.phase).toBe("battleActive");

    for (
      let budget = 0;
      budget < 2_000
        && state.battleResolutionPresentation?.lifecycle.phase !== "terminal-handoff";
      budget += 1
    ) {
      state = advanceFactoryRoundBattleResolution(state, new Set(["A"]));
    }
    expect(state.battleResolutionPresentation?.lifecycle.phase)
      .toBe("terminal-handoff");
    expect(state.battleResolutionPresentation?.pendingBattle).toBe(retainedBattle);
    expect(state.battleResolutionPresentation?.pendingBoundary).toBe(retainedBoundary);
    expect(state.round.rules.phase).toBe("battleActive");

    let engine = tick({
      ...createInitialState({ appRoute: "generated-orchestrator" }),
      factoryRoundBattleOrchestrator: state,
      rngMode: "frontierBattle",
      rngValue: state.battle!.rng.value,
    }, new Set());
    state = engine.factoryRoundBattleOrchestrator!;
    expect(state.battle).toBeNull();
    expect(state.battleResolutionPresentation).toBeNull();
    expect(state.round.rules.phase).toBe("presentingBattleWin");
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    expect(state.retainedLockedActionPresentationOwner).toBeNull();
    const opponentSetIds =
      state.round.rules.currentOpponent.rentalRecords!.map(({ setId }) => setId);
    expect(opponentSetIds).not.toEqual(POSTWIN_OPPONENT_RENTAL_IDS);
    expect(engine.postwin).toMatchObject({
      challengeBattleNum: 0,
      challengeBattleNumAfterWrite: 1,
      opponentRentalMonIds: opponentSetIds,
      opponentRentalMonIdsAfterWrite: opponentSetIds,
      playerPartyHp:
        state.round.rules.lastBattle!.playerParty.map(({ hp }) => hp),
      healedPlayerPartyHp:
        state.round.rules.lastBattle!.playerParty.map(({ maxHp }) => maxHp),
    });

    const page3Edge = 10_000;
    engine = {
      ...engine,
      postwin: {
        ...engine.postwin!,
        elapsed: page3Edge,
        healDismissElapsed: 1,
        continuationCursorPos: 0,
        continuationConfirmElapsed: 2,
        dialoguePage: 3,
        dialoguePageEdgeElapsed:
          page3Edge - POSTWIN_SCOUTING_INPUT_READY_DELAYS[2],
      },
    };
    const beforeCompletionRules =
      engine.factoryRoundBattleOrchestrator!.round.rules;
    engine = tick(engine, new Set());
    expect(engine.factoryRoundBattleOrchestrator!.round.rules)
      .toBe(beforeCompletionRules);
    expect(engine.factoryRoundBattleOrchestrator!.round.presentation?.command.type)
      .toBe("battleWon");

    engine = tick(engine, new Set(["A"]));
    const swapOfferRound = engine.factoryRoundBattleOrchestrator!.round;
    expect(swapOfferRound.rules.phase).toBe("awaitingSwapDecision");
    expect(swapOfferRound.presentation).toMatchObject({
      completed: false,
      command: {
        type: "swapOffer",
        playerParty: state.round.rules.lastBattle!.playerParty,
        opponentParty: state.round.rules.lastBattle!.opponentParty,
      },
    });
    expect(engine.roundController).toBeNull();

    const swapOfferEdge = 20_000;
    engine = {
      ...engine,
      postwin: {
        ...engine.postwin!,
        elapsed: swapOfferEdge,
        dialoguePage: 4,
        dialoguePageEdgeElapsed:
          swapOfferEdge - POSTWIN_SWAP_INPUT_READY_DELAY,
        swapCursorPos: 0,
        swapCursorDisplayPos: 0,
      },
    };
    const expectedSwap = createPendingFactorySwapPresentation(swapOfferRound);
    engine = tick(engine, new Set());
    engine = tick(engine, new Set(["A"]));
    expect(engine.factorySwap).toEqual(expectedSwap);
    expect(engine.factoryRoundBattleOrchestrator!.round).toBe(swapOfferRound);
    expect(engine.factorySwap!.controller).toMatchObject({
      playerParty: expectedSwap!.controller.playerParty,
      enemyParty: expectedSwap!.controller.enemyParty,
      rentalMons: expectedSwap!.controller.rentalMons,
    });
  });

  it("resets the persistent cursor when a live player switch-in changes the active party slot", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"] as const));
    state = advanceCommandToPhase(state, "fight-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["RIGHT"] as const));
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"] as const));
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"] as const));
    state = advanceResolutionToNextCommand(state);
    expect(state.battleCommandPresentation?.fightCursor).toBe(3);

    const beforePartyIndex = state.battle?.rules.rulesContext.battlers[0].partyIndex;
    const switchDecision = state.battleCommandPresentation?.request.legalDecisions.find(
      (decision) => decision.kind === "switch",
    );
    if (switchDecision?.kind !== "switch") throw new Error("expected a legal switch");
    const trainerBoundaryBeforeSwitch = state.battlePresentationBoundaries?.[1];
    state = submitFactoryRoundPlayerDecision(state, switchDecision);

    expect(state.battle?.rules.rulesContext.battlers[0].partyIndex).not.toBe(beforePartyIndex);
    expect(state.moveSelectionCursors[0]).toBe(0);
    expect(state.battleCommandPresentation?.fightCursor).toBe(0);
    expect(state.battleCommandPresentation?.fightDisplayCursor).toBe(0);
    expect(state.battlePresentationBoundaries?.[0]).toMatchObject({
      partyIndex: state.battle?.rules.rulesContext.battlers[0].partyIndex,
      idleEpoch: 0,
      moveCursor: 0,
      spriteVisible: true,
    });
    expect({
      partyIndex: state.battlePresentationBoundaries?.[1].partyIndex,
      idleEpoch: state.battlePresentationBoundaries?.[1].idleEpoch,
      moveCursor: state.battlePresentationBoundaries?.[1].moveCursor,
      spriteVisible: state.battlePresentationBoundaries?.[1].spriteVisible,
    }).toEqual({
      partyIndex: trainerBoundaryBeforeSwitch?.partyIndex,
      idleEpoch: trainerBoundaryBeforeSwitch?.idleEpoch,
      moveCursor: trainerBoundaryBeforeSwitch?.moveCursor,
      spriteVisible: trainerBoundaryBeforeSwitch?.spriteVisible,
    });
  });

  it("persists accepted swaps exactly once on completion and never on loss", () => {
    const accepted = driveGeneratedRoundToCompletion(
      17,
      undefined,
      (state) => state.round.rules.battleIndex < 2
        ? { type: "accept", playerPartyIndex: 2, opponentPartyIndex: 0 }
        : { type: "decline" },
      14,
    );
    expect(accepted.round.rules.phase).toBe("roundComplete");
    expect(accepted.facilityState.rentsCount).toBe(15);
    expect(accepted.performedRentalSwap).toBe(false);
    const completion = {
      commandId: accepted.round.presentation!.command.commandId,
    };
    const acknowledged = completeFactoryRoundPresentation(
      accepted,
      completion,
    );
    const acknowledgedAgain = completeFactoryRoundPresentation(
      acknowledged,
      completion,
    );
    expect(acknowledged.facilityState.rentsCount).toBe(15);
    expect(acknowledgedAgain.facilityState.rentsCount).toBe(15);

    const declined = driveGeneratedRoundToCompletion(17, undefined, undefined, 14);
    expect(declined.round.rules.phase).toBe("roundComplete");
    expect(declined.facilityState.rentsCount).toBe(14);

    const lostAfterSwap = driveGeneratedRoundToCompletion(
      6,
      undefined,
      (state) => state.round.rules.battleIndex === 0
        ? { type: "accept", playerPartyIndex: 2, opponentPartyIndex: 0 }
        : { type: "decline" },
      14,
    );
    expect(lostAfterSwap.round.rules.phase).toBe("roundLost");
    expect(lostAfterSwap.round.rules.battleIndex).toBe(1);
    expect(lostAfterSwap.performedRentalSwap).toBe(true);
    expect(lostAfterSwap.facilityState.rentsCount).toBe(14);
    const lostAcknowledged = completeFactoryRoundPresentation(
      lostAfterSwap,
      {
        commandId:
          lostAfterSwap.round.presentation!.command.commandId,
      },
    );
    expect(lostAcknowledged.facilityState.rentsCount).toBe(14);

    const createNextChallenge = (
      previous: FactoryRoundBattleOrchestratorState,
      id: string,
    ) => createFactoryRoundBattleOrchestrator({
      id,
      rngValue: 0x1234_5678,
      factoryWinStreak: 7,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: previous.facilityState,
      rentals: {
        type: "generateInitial",
        selectedRentalIndexes: [0, 1, 2],
      },
    });
    const acceptedNext = createNextChallenge(accepted, "accepted-next-challenge");
    const declinedNext = createNextChallenge(declined, "declined-next-challenge");

    // GetNumPastRentalsRank's first band is <15. Crossing 14 -> 15 makes
    // exactly rental slot 0 use the next-better source range.
    expect(acceptedNext.initialRentalGeneration?.rentalRank).toBe(1);
    expect(declinedNext.initialRentalGeneration?.rentalRank).toBe(0);
    expect(acceptedNext.initialRentalGeneration?.rentals[0]?.setId).not.toBe(
      declinedNext.initialRentalGeneration?.rentals[0]?.setId,
    );
  });

  it("starts challenge 2 generation from challenge 1's uninterrupted orchestrator cursor", () => {
    const completed = driveGeneratedRoundToCompletion(
      17,
      undefined,
      (state) => state.round.rules.battleIndex < 2
        ? { type: "accept", playerPartyIndex: 2, opponentPartyIndex: 0 }
        : { type: "decline" },
      14,
    );
    const next = createFactoryRoundBattleOrchestrator({
      id: "continuous-cursor-next-challenge",
      rngValue: completed.round.rules.rngValue,
      factoryWinStreak: 7,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: completed.facilityState,
      rentals: {
        type: "generateInitial",
        selectedRentalIndexes: [0, 1, 2],
      },
    });

    // The ROM's Random() cursor is one continuous global. This orchestrator
    // does not model inter-challenge frame advances, so these are exact
    // orchestrator-contract cursors, not a claim about a frame-exact ROM
    // cursor between the two challenges.
    expect(completed.round.rules.rngValue).toBe(514721516);
    expect(next.initialRentalGeneration?.rentalRank).toBe(1);
    expect(next.rngSegments).toEqual([
      {
        kind: "initial-rentals",
        battleIndex: 0,
        callStart: 0,
        callEnd: 204,
        rngBefore: 514721516,
        rngAfter: 2855210072,
      },
      {
        kind: "opponent-generation",
        battleIndex: 0,
        callStart: 204,
        callEnd: 487,
        rngBefore: 2855210072,
        rngAfter: 782337733,
      },
    ]);
    expect(next.initialRentalGeneration?.rentals.map((rental) => rental.setId))
      .toEqual([278, 213, 206, 205, 212, 246]);
    expect(next.opponentGenerations[0]).toMatchObject({
      trainerId: 99,
      opponents: [
        { setId: 224 },
        { setId: 243 },
        { setId: 236 },
      ],
    });
    expect(next.facilityRngCalls).toBe(487);
    expect(next.round.rules.rngValue).toBe(782337733);
  });

  it("owns battle 0 win through decline and battle 1's fresh command on one RNG cursor", () => {
    // This is the rung-11 "current full rental records" entry path. The three
    // selected Level-50 records are intentionally strong against challenge-0
    // generated opponents; the other records reproduce rentalMons[3..5] for
    // GenerateOpponentMons' six-species exclusion.
    const playerRecords = [record(664), record(678), record(527)] as const;
    const savedRentalRecords = [
      ...playerRecords,
      record(1),
      record(2),
      record(3),
    ] as const;
    let state = createFactoryRoundBattleOrchestrator({
      id: "generated-round-rung-11",
      rngValue: RNG_SEED,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords,
      },
    });

    expect(state.round.opponentSelection.type).toBe("factoryGenerated");
    expect(state.round.rules.phase).toBe("presentingBattleStart");
    expect(state.battle).toBeNull();
    expect(state.opponentGenerations).toHaveLength(1);
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("battleActive");
    expect(state.battle?.boundary.kind).toBe("decision-required");
    expect(state.battle?.boundary.kind === "decision-required"
      && state.battle.boundary.request.side).toBe("player");

    for (let budget = 0; budget < 60 && state.battle !== null; budget += 1) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
    }

    expect(state.battle).toBeNull();
    expect(state.round.rules.phase).toBe("presentingBattleWin");
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    expect(state.round.rules.lastBattle?.opponentParty.map((member) => member.hp))
      .toEqual([0, 0, 0]);

    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("awaitingSwapDecision");
    const swapOfferId = state.round.presentation?.command.commandId;
    if (swapOfferId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: swapOfferId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    state = acknowledgeAndAdvance(state);

    expect(state.round.rules.battleIndex).toBe(1);
    expect(state.round.rules.phase).toBe("presentingBattleStart");
    expect(state.battle).toBeNull();
    expect(state.opponentGenerations).toHaveLength(2);
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("battleActive");
    expect(state.battle?.boundary.kind).toBe("decision-required");
    expect(state.battle?.boundary.kind === "decision-required"
      && state.battle.boundary.request.side).toBe("player");

    // Generator ledgers retain their exact Random() receipts, and the
    // orchestrator's segments pin the uninterrupted cursor/order across
    // generation -> draw A/B -> battle -> next generation -> draw A/B.
    expect(state.rngSegments.map((segment) => ({
      kind: segment.kind,
      battleIndex: segment.battleIndex,
      callStart: segment.callStart,
      callEnd: segment.callEnd,
      rngBefore: segment.rngBefore,
      rngAfter: segment.rngAfter,
    }))).toEqual([
      {
        kind: "opponent-generation",
        battleIndex: 0,
        callStart: 0,
        callEnd: 152,
        rngBefore: 4,
        rngAfter: 2423399196,
      },
      {
        kind: "battle",
        battleIndex: 0,
        callStart: 152,
        callEnd: 311,
        rngBefore: 2423399196,
        rngAfter: 4032903885,
      },
      {
        kind: "opponent-generation",
        battleIndex: 1,
        callStart: 311,
        callEnd: 525,
        rngBefore: 4032903885,
        rngAfter: 3788765155,
      },
    ]);
    expect(state.opponentGenerations.map((generation) => ({
      trainerId: generation.trainerId,
      setIds: generation.opponents.map((opponent) => opponent.setId),
      draws: generation.drawLedger.length,
    }))).toEqual([
      { trainerId: 17, setIds: [122, 118, 110], draws: 152 },
      { trainerId: 90, setIds: [132, 187, 127], draws: 214 },
    ]);
    for (let index = 1; index < state.rngSegments.length; index += 1) {
      expect(state.rngSegments[index]!.callStart).toBe(state.rngSegments[index - 1]!.callEnd);
      expect(state.rngSegments[index]!.rngBefore).toBe(state.rngSegments[index - 1]!.rngAfter);
    }
    for (const generation of state.opponentGenerations) {
      generation.drawLedger.forEach((draw, index) => {
        expect(draw.position).toBe(index);
        expect(draw.rngAfter).toBe(advanceRngValue(draw.rngBefore));
        if (index > 0) expect(draw.rngBefore).toBe(generation.drawLedger[index - 1]!.rngAfter);
      });
    }
    expect(state.battle!.rng).toEqual({ calls: 2, value: 4029920645 });
    expect(state.facilityRngCalls).toBe(527);
  });

  /**
   * Drives a fresh generated round to the source `AskSwapMon` boundary: the
   * battle is won and the round sits on an uncompleted `battleWon` while the
   * defeated opponent is still current.
   */
  function driveGeneratedRoundToWin(
    seed: number,
  ): FactoryRoundBattleOrchestratorState {
    const playerRecords = [record(664), record(678), record(527)] as const;
    const savedRentalRecords = [
      ...playerRecords,
      record(1),
      record(2),
      record(3),
    ] as const;
    let state = createFactoryRoundBattleOrchestrator({
      id: `generated-round-pregen-win-${seed}`,
      rngValue: seed,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords,
      },
    });
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("battleActive");
    for (let budget = 0; budget < 60 && state.battle !== null; budget += 1) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
    }
    expect(state.battle).toBeNull();
    expect(state.round.rules.phase).toBe("presentingBattleWin");
    expect(state.round.presentation?.command.type).toBe("battleWon");
    return state;
  }

  it("pre-generates battleIndex+1 at the post-win/scouting transition, not at swap resolution", () => {
    let state = driveGeneratedRoundToWin(RNG_SEED);
    const postBattleRng = state.round.rules.rngValue;
    const defeatedOpponentId = state.round.rules.currentOpponent.id;
    const segmentCountBefore = state.rngSegments.length;
    expect(state.pendingNextOpponent).toBeNull();

    // Source `AskSwapMon` (`pre-battle-room scripts.inc:137-149`) runs
    // factory_generateopponentmons before the type/style commentary and the
    // swap offer, so pre-generation is an orchestrator action at this
    // post-win/scouting boundary, not a side effect of swap resolution.
    state = preGenerateFactoryRoundNextOpponent(state);
    expect(state.pendingNextOpponent).not.toBeNull();
    const preGeneratedTrainerId = state.pendingNextOpponent!.trainerId;
    // The round has not advanced: the defeated opponent is still current, so
    // an optional swap keeps the defeated party as its enemy pool.
    expect(state.round.rules.phase).toBe("presentingBattleWin");
    expect(state.round.rules.battleIndex).toBe(0);
    expect(state.round.rules.currentOpponent.id).toBe(defeatedOpponentId);
    expect(state.opponentGenerations).toHaveLength(1);
    expect(state.rngSegments).toHaveLength(segmentCountBefore + 1);
    const preSegment = state.rngSegments.at(-1)!;
    expect(preSegment.kind).toBe("opponent-generation");
    expect(preSegment.battleIndex).toBe(1);
    expect(preSegment.rngBefore).toBe(postBattleRng);

    // Swap resolution only publishes the pending opponent; it rolls nothing.
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("awaitingSwapDecision");
    const offerId = state.round.presentation?.command.commandId;
    if (offerId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: offerId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    state = acknowledgeAndAdvance(state);

    expect(state.round.rules.battleIndex).toBe(1);
    expect(state.round.rules.phase).toBe("presentingBattleStart");
    expect(state.round.rules.currentOpponent.id)
      .toBe(`factory-trainer-${preGeneratedTrainerId}`);
    expect(state.opponentGenerations).toHaveLength(2);
    expect(state.opponentGenerations[1]!.trainerId).toBe(preGeneratedTrainerId);
    expect(state.pendingNextOpponent).toBeNull();
    // One uninterrupted RNG receipt: recorded at pre-generation, unchanged by
    // publication.
    expect(state.rngSegments).toHaveLength(segmentCountBefore + 1);
    expect(state.facilityRngCalls).toBe(preSegment.callEnd);
  });

  it("is idempotent and never double-generates across repeated or late pre-generation calls", () => {
    let state = driveGeneratedRoundToWin(RNG_SEED);
    state = preGenerateFactoryRoundNextOpponent(state);
    const pending = state.pendingNextOpponent;
    const segmentCount = state.rngSegments.length;
    const calls = state.facilityRngCalls;

    // Re-entering the scouting transition cannot roll a second opponent or
    // append a second receipt.
    state = preGenerateFactoryRoundNextOpponent(state);
    expect(state.pendingNextOpponent).toBe(pending);
    expect(state.rngSegments).toHaveLength(segmentCount);
    expect(state.facilityRngCalls).toBe(calls);

    // Publishing after swap resolution rolls nothing new either.
    state = acknowledgeAndAdvance(state);
    const offerId = state.round.presentation?.command.commandId;
    if (offerId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: offerId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    state = acknowledgeAndAdvance(state);
    expect(state.opponentGenerations).toHaveLength(2);
    expect(state.rngSegments).toHaveLength(segmentCount);
    expect(state.facilityRngCalls).toBe(calls);
    expect(state.opponentGenerations[1]!.trainerId).toBe(pending!.trainerId);
  });

  it("retains the defeated opponent party for the optional swap and publishes the pre-generated opponent on accept", () => {
    let state = driveGeneratedRoundToWin(RNG_SEED);
    state = preGenerateFactoryRoundNextOpponent(state);
    const preGeneratedTrainerId = state.pendingNextOpponent!.trainerId;
    const defeatedEnemyFirstSpecies = state.round.rules.currentOpponent
      .party[0]!.species.replace("SPECIES_", "");
    const defeatedEnemySetId =
      state.round.rules.currentOpponent.rentalRecords![1]!.setId;
    const acceptedPlayerSetId = state.round.rules.playerRentalRecords![0]!.setId;

    state = acknowledgeAndAdvance(state);
    const offerId = state.round.presentation?.command.commandId;
    if (offerId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: offerId });
    const swap = createPendingFactorySwapPresentation(state.round);
    expect(swap).not.toBeNull();
    // The swap screen's enemy pool is the defeated party, not the already
    // pre-generated next opponent.
    expect(swap!.controller.enemyParty[0]!.species).toBe(defeatedEnemyFirstSpecies);

    state = chooseFactoryRoundSwap(state, {
      type: "accept",
      playerPartyIndex: 0,
      opponentPartyIndex: 1,
    });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    expect(state.round.rules.playerRentalRecords![0]!.setId)
      .toBe(defeatedEnemySetId);
    expect(state.round.rules.playerRentalRecords![0]!.setId)
      .not.toBe(acceptedPlayerSetId);
    state = acknowledgeAndAdvance(state);

    expect(state.round.rules.battleIndex).toBe(1);
    expect(state.round.rules.currentOpponent.id)
      .toBe(`factory-trainer-${preGeneratedTrainerId}`);
    // The accept's party mutation did not re-roll the pre-generated opponent.
    expect(state.opponentGenerations[1]!.trainerId).toBe(preGeneratedTrainerId);
    expect(state.pendingNextOpponent).toBeNull();
    expect(state.rngSegments).toHaveLength(3);
  });

  it("seed 17 completes seven generated wins with multi-candidate trainer replacements on one cursor", () => {
    const playerRecords = [record(664), record(678), record(527)] as const;
    const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
    let state = createFactoryRoundBattleOrchestrator({
      id: "generated-round-rung-12-seed-17",
      rngValue: 17,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords,
      },
    });
    let firstReplacement: {
      callsBefore: number;
      callsAfter: number;
      rngBefore: number;
      rngAfter: number;
      nextSide: string;
    } | null = null;

    for (let budget = 0; budget < 1_000 && state.round.rules.phase !== "roundComplete"; budget += 1) {
      if (state.battle !== null) {
        const partyIndexBefore = state.battle.rules.rulesContext.battlers[1].partyIndex;
        const callsBefore = state.battle.rng.calls;
        const rngBefore = state.battle.rng.value;
        state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
        if (
          firstReplacement === null
          && state.battle !== null
          && state.battle.rules.rulesContext.battlers[1].partyIndex !== partyIndexBefore
        ) {
          firstReplacement = {
            callsBefore,
            callsAfter: state.battle.rng.calls,
            rngBefore,
            rngAfter: state.battle.rng.value,
            nextSide: state.battle.boundary.kind === "decision-required"
              ? state.battle.boundary.request.side
              : state.battle.boundary.kind,
          };
        }
        continue;
      }
      if (
        state.round.rules.phase === "presentingBattleStart"
        || state.round.rules.phase === "presentingBattleWin"
        || state.round.rules.phase === "presentingSwapResult"
      ) {
        state = acknowledgeAndAdvance(state);
        continue;
      }
      if (state.round.rules.phase === "awaitingSwapDecision") {
        const commandId = state.round.presentation?.command.commandId;
        if (commandId === undefined) throw new Error("expected swap-offer presentation command");
        state = completeFactoryRoundPresentation(state, { commandId });
        state = chooseFactoryRoundSwap(state, { type: "decline" });
        continue;
      }
      throw new Error(`unexpected rung-12 phase ${state.round.rules.phase}`);
    }

    expect(state.round.rules.phase).toBe("roundComplete");
    expect(state.round.rules.battleIndex).toBe(6);
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    expect(state.retainedLockedActionPresentationOwner).toBeNull();
    expect(state.opponentGenerations).toHaveLength(7);
    expect(state.rngSegments.filter((segment) => segment.kind === "battle")).toHaveLength(7);
    // ShouldSwitch's new draws shift later battle/generation streams:
    // entry-685 cursor 1787 + 226 = 2013.
    expect(state.facilityRngCalls).toBe(2013);
    expect(firstReplacement).toEqual({
      callsBefore: 2,
      callsAfter: 16,
      rngBefore: 312997333,
      rngAfter: 713294723,
      nextSide: "player",
    });
    let cursor = firstReplacement!.rngBefore;
    for (let call = firstReplacement!.callsBefore; call < firstReplacement!.callsAfter; call += 1) {
      cursor = advanceRngValue(cursor);
    }
    expect(cursor).toBe(firstReplacement!.rngAfter);
    for (let index = 1; index < state.rngSegments.length; index += 1) {
      expect(state.rngSegments[index]!.callStart).toBe(state.rngSegments[index - 1]!.callEnd);
      expect(state.rngSegments[index]!.rngBefore).toBe(state.rngSegments[index - 1]!.rngAfter);
    }
  });

  it("seed 21's ordinary generated Sandstorm turn reaches forced replacement and completes seven wins", () => {
    let sandstormForcedSwitch: FactoryRoundBattleOrchestratorState | null = null;
    const state = driveGeneratedRoundToCompletion(21, (next) => {
      const boundary = next.battle?.boundary;
      const player = next.battle?.rules.rulesContext.battlers[0];
      const opponent = next.battle?.rules.rulesContext.battlers[1];
      if (
        sandstormForcedSwitch === null
        && next.round.rules.battleIndex === 0
        && boundary?.kind === "decision-required"
        && boundary.request.side === "player"
        && boundary.request.kind === "forced-switch"
        && player?.species === 210
        && opponent?.species === 98
      ) {
        sandstormForcedSwitch = next;
      }
    });

    expect(sandstormForcedSwitch).not.toBeNull();
    expect(sandstormForcedSwitch!.battle!.rules.rulesContext.battlers[0].hp).toBe(0);
    expect(sandstormForcedSwitch!.battle!.rules.rulesContext.battlers[1].hp).toBe(116);
    expect(state.round.rules.phase).toBe("roundComplete");
    expect(state.round.rules.battleIndex).toBe(6);
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    expect(state.rngSegments.filter((segment) => segment.kind === "battle")).toHaveLength(7);
    expect(state.facilityRngCalls).toBe(1911);
  });

  it.each([
    // Each comment is the entry-685 cursor plus its complete downstream
    // ShouldSwitch-induced trajectory delta, not merely the direct precheck
    // draw count: later generation, move, damage, and turn lengths may change.
    [4, 2415, "roundComplete", 6, "win"], // 1517 + 898
    [5, 2156, "roundComplete", 6, "win"], // 1688 + 468
    [6, 791, "roundLost", 1, "loss"],
    [7, 1337, "roundComplete", 6, "win"], // 1827 - 490
    [8, 1922, "roundComplete", 6, "win"], // 2089 - 167
    [11, 2012, "roundComplete", 6, "win"], // 1970 + 42
    [13, 2415, "roundComplete", 6, "win"], // 2224 + 191
    [14, 1946, "roundComplete", 6, "win"], // 2325 - 379
    [15, 1602, "roundComplete", 6, "win"], // 2036 - 434
    [16, 1878, "roundComplete", 6, "win"], // 1660 + 218
    [18, 2143, "roundComplete", 6, "win"], // 2478 - 335
    [19, 1691, "roundComplete", 6, "win"], // 1842 - 151
    [20, 2326, "roundComplete", 6, "win"], // 2140 + 186
    [21, 1911, "roundComplete", 6, "win"], // unchanged after divergence reconverges
    [22, 1389, "roundComplete", 6, "win"], // 1377 + 12
    [23, 2114, "roundComplete", 6, "win"], // 1436 + 678
    [24, 1751, "roundComplete", 6, "win"], // 1690 + 61
    [26, 1680, "roundComplete", 6, "win"], // 1556 + 124
    [29, 1869, "roundComplete", 6, "win"], // 1543 + 326
    [30, 1825, "roundComplete", 6, "win"], // 1558 + 267
  ])("seed %i pins the post-ShouldSwitch round census", (
    seed,
    calls,
    phase,
    battleIndex,
    outcome,
  ) => {
    const state = driveGeneratedRoundToCompletion(seed);
    expect({
      phase: state.round.rules.phase,
      battleIndex: state.round.rules.battleIndex,
      outcome: state.round.rules.lastBattle?.outcome,
      battles: state.rngSegments.filter((segment) => segment.kind === "battle").length,
      calls: state.facilityRngCalls,
      playerHp: state.round.rules.lastBattle?.playerParty.map((member) => member.hp),
      opponentHp: state.round.rules.lastBattle?.opponentParty.map((member) => member.hp),
    }).toEqual({
      phase,
      battleIndex,
      outcome,
      battles: battleIndex + 1,
      calls,
      playerHp: seed === 6 ? [0, 0, 0] : expect.any(Array),
      opponentHp: seed === 6 ? [0, 0, 126] : expect.any(Array),
    });
  });

  it("keeps rental identity when a scaffold terminal party is overlaid, so the swap decline can still advance", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    expect(state.battle).not.toBeNull();
    const playerRecords = state.round.rules.playerRentalRecords!;
    const originalKernelParty = state.round.rules.playerKernelParty!;

    // A terminal battle whose player party is a *placeholder* (DUSCLOPS,
    // personality 0xff, uniform IV 3) deliberately NOT the round's rental
    // identity (sets 664/678/527, nature-derived personalities, IV 31) --
    // exactly the win-terminal-window scaffold's shape
    // (tools/compare/appTrace.ts). The real game never mutates
    // personality/IVs/species during a battle, so the overlay must keep the
    // records' identity and carry only HP/status/item/PP.
    const scaffoldPlayer: FactoryFullTurnBattlerConfig = Object.freeze({
      species: 362, // DUSCLOPS
      personality: 0xff,
      moveId: MOVE_TACKLE,
      moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
      pp: [35, 35, 35, 35] as const,
      ability: 0,
      item: 0,
      friendship: 0,
      attack: 60,
      defense: 60,
      spAttack: 60,
      spDefense: 60,
      speed: 60,
      hp: 115,
      maxHp: 115,
      types: ["TYPE_GHOST", "TYPE_GHOST"] as const,
    });
    const scaffoldTrainer: FactoryFullTurnBattlerConfig = Object.freeze({
      species: 198, // MURKROW
      moveId: MOVE_TACKLE,
      moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
      pp: [35, 35, 35, 35] as const,
      ability: 0,
      item: 0,
      friendship: 0,
      attack: 60,
      defense: 60,
      spAttack: 60,
      spDefense: 60,
      speed: 60,
      hp: 0,
      maxHp: 200,
      types: ["TYPE_DARK", "TYPE_FLYING"] as const,
    });
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: scaffoldPlayer,
      trainer: scaffoldTrainer,
    });
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required" || initial.boundary.request.kind !== "command") {
      throw new Error("scaffold has no source command");
    }
    const terminalBattle = Object.freeze({
      ...createBattleState({
        rules: initial.rules,
        rngSeed: 9,
        request: initial.boundary.request,
      }),
      boundary: Object.freeze({ kind: "terminal" as const, outcome: "player-win" as const }),
    });
    const transition = Object.freeze({
      kind: "terminal" as const,
      state: terminalBattle,
      events: Object.freeze([]),
      outcome: "player-win" as const,
    }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
    const command = createBattleCommandPresentation(initial.boundary.request, initial.rules.rulesContext, 0);
    const resolution = Object.freeze({
      ...createBattleResolutionPresentation({
        sourceRequest: initial.boundary.request,
        sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
        beforeRules: initial.rules,
        transition,
        fieldBoundary: command.field,
        confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
        opponentTrainer: getFactoryTrainerPresentation(50),
      }),
      lifecycle: Object.freeze({ phase: "terminal-handoff" as const, phaseElapsed: 0 }),
      confirmHandoff: null,
    });

    state = Object.freeze({
      ...state,
      battle: terminalBattle,
      battleResolutionPresentation: resolution,
    });
    state = advanceFactoryRoundBattleResolution(state);
    expect(state.battle).toBeNull();
    expect(state.round.rules.phase).toBe("presentingBattleWin");
    const kernel = state.round.rules.playerKernelParty!;
    expect(kernel[0]!.personality).toBe(playerRecords[0]!.personality);
    expect(kernel[0]!.setId).toBe(playerRecords[0]!.setId);
    expect(kernel[0]!.ivs.attack).toBe(playerRecords[0]!.fixedIv);
    expect(kernel[0]!.hp).toBe(115);
    expect(kernel[0]!.status1).toBe(0);
    expect(kernel).toEqual(originalKernelParty.map((member, index) => ({
      ...member,
      hp: terminalBattle.rules.rulesContext.party.player[index]!.hp,
      status1: terminalBattle.rules.rulesContext.party.player[index]!.status1,
      item: terminalBattle.rules.rulesContext.party.player[index]!.item,
      pp: terminalBattle.rules.rulesContext.party.player[index]!.pp,
    })));

    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("awaitingSwapDecision");
    const swapOfferId = state.round.presentation?.command.commandId;
    if (swapOfferId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: swapOfferId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.battleIndex).toBe(1);
    expect(state.round.rules.phase).toBe("presentingBattleStart");
  });

  it("adopts the probed battle-2 opponent schedule (trainer 9 LILIANA) at the GO ON pre-generation seam", () => {
    // ISSUES #55 receipt (`docs/win-battle2-opponent-provenance-receipt.md`):
    // the ROM's battle-2 opponent on the WIN GO ON route is set-selected
    // single-frame from pre-call cursor 0x7399E3AE, but its personalities are
    // constructed 32 frames later under per-mon cursors, so exact
    // personalities require the adopted per-mon schedule.
    const selection = generateFactoryOpponent({
      rngValue: 0x7399e3ae,
      factoryWinStreak: 1,
      battleIndex: 1,
      storedTrainerIds: [50] as const,
      savedRentalSetIds: [156, 149, 180, 188, 184, 135] as const,
      playerTrainerId: 416_049_562,
      battleTowerLevel50WinStreak: 0,
    });
    const adoptedNext = adoptFactoryOpponentSchedule({
      factoryWinStreak: 1,
      battleIndex: 1,
      storedTrainerIds: [50] as const,
      savedRentalSetIds: [156, 149, 180, 188, 184, 135] as const,
      playerTrainerId: 416_049_562,
      battleTowerLevel50WinStreak: 0,
      trainerId: 9,
      setIds: [169, 170, 130] as const,
      selectionDrawLedger: selection.drawLedger.filter((draw) => draw.phase !== "personality"),
      constructionRngValues: [0x2f959df4, 0xbd6f8138, 0xde320f3a] as const,
    });

    const playerRecords = [record(666), record(570), record(378)] as const;
    let state = createFactoryRoundBattleOrchestrator({
      id: "win-terminal-window-off-provenance",
      rngValue: 4,
      factoryWinStreak: 0,
      playerTrainerId: 416_049_562,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords: [
          record(156),
          record(149),
          record(180),
          record(188),
          record(184),
          record(135),
        ],
      },
      adoptedNextOpponent: { generation: adoptedNext, battleIndex: 1 },
    });
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("battleActive");
    for (let budget = 0; budget < 60 && state.battle !== null; budget += 1) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
    }
    expect(state.round.rules.phase).toBe("presentingBattleWin");

    state = preGenerateFactoryRoundNextOpponent(state);
    const pending = state.pendingNextOpponent;
    expect(pending).not.toBeNull();
    expect(pending!.trainerId).toBe(9);
    expect(pending!.trainerName).toBe("LILIANA");
    expect(pending!.opponents.map((o) => o.setId).join(",")).toBe("169,170,130");
    expect(pending!.opponents.map((o) => o.speciesName).join(","))
      .toBe("SPECIES_KADABRA,SPECIES_WAILMER,SPECIES_NUZLEAF");
    expect(pending!.opponents.map((o) => o.itemId).join(",")).toBe("214,221,142");
    expect(pending!.opponents.map((o) => o.personality)).toEqual([
      0x801d2ed7, 0x0ffc69a4, 0x1ae16fda,
    ]);
    expect(pending!.selectionRngValue).toBe(0x50f04e72);

    const segment = state.rngSegments.at(-1)!;
    expect(segment.kind).toBe("opponent-generation");
    expect(segment.battleIndex).toBe(1);
    expect(segment.rngBefore).toBe(state.round.rules.rngValue);
  });
});
