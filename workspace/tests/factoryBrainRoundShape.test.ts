/**
 * Noland rung 2c: proves the Frontier Brain fires exactly at the seventh
 * battle of a REAL round shape through the full orchestrator/round-controller
 * win path — six real generated-battle wins (battleIndex 0..5), then the
 * pre-generation seam at the post-win/scouting transition schedules
 * battleIndex 6. Rung 2 (`factoryRoundBattleOrchestrator.test.ts`'s "Noland
 * rung 2" describe block) proved the same wiring at battleIndex 1 with a
 * synthetic mid-round starting streak (one real win, not six) to keep that
 * step's RNG-cursor-handoff assertion fast; this file closes that noted
 * deviation by driving the genuine six-real-win round shape instead.
 */
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { BattleSubmittedDecision } from "../src/engine/battleDecisionBoundary.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { TRAINER_FRONTIER_BRAIN } from "../src/engine/factoryAiMaskSelection.ts";
import { getFactoryFrontierBrainStatus } from "../src/engine/frontierBrainStatus.ts";
import {
  advanceFactoryRoundPresentation,
  beginFactoryRoundBattleStartIntro,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  factoryRoundOutcomeForResolution,
  preGenerateFactoryRoundNextOpponent,
  submitFactoryRoundPlayerDecision,
  type FactoryRoundBattleOrchestratorConfig,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  advanceRoundController,
  completeBattlePresentation,
  resolveRoundBattle,
} from "../src/engine/roundController.ts";

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

// Mirrors `choosePlayerDecision` in `factoryRoundBattleOrchestrator.test.ts`:
// a "move slot 0" policy that the pinned round-shape seeds below win with
// reliably against six consecutive ordinary Factory opponents.
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

function roundConfig(
  id: string,
  seed: number,
  factoryWinStreak: number,
  factorySymbolsCount: 0 | 1 | 2,
): FactoryRoundBattleOrchestratorConfig {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
  return {
    id,
    rngValue: seed,
    factoryWinStreak,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords,
    },
    factorySymbolsCount,
  };
}

/**
 * Drives real generated battles, declining every swap offer, until battle 5
 * (the sixth real win) resolves — stopping the instant `presentingBattleWin`
 * is reached at battleIndex 5, before the round loop's lazy
 * `AskSwapMon`-seam generation would otherwise spend battleIndex 6's RNG
 * receipt at swap resolution. Reusing this stop point (rather than
 * `driveGeneratedRoundToCompletion`'s run-to-`roundComplete` shape) is what
 * lets every case below call `preGenerateFactoryRoundNextOpponent` itself and
 * inspect the seventh-battle schedule before it publishes.
 */
function driveToSixthWin(
  config: FactoryRoundBattleOrchestratorConfig,
): FactoryRoundBattleOrchestratorState {
  let state = createFactoryRoundBattleOrchestrator(config);
  const atSixthWin = (current: FactoryRoundBattleOrchestratorState) =>
    current.round.rules.phase === "presentingBattleWin" && current.round.rules.battleIndex === 5;

  for (let budget = 0; budget < 2_000 && !atSixthWin(state); budget += 1) {
    if (state.round.rules.phase === "roundLost") {
      throw new Error("round-shape seed lost before the sixth win; pick a different seed");
    }
    if (state.battle !== null) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
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
    throw new Error(`unexpected round-shape phase ${state.round.rules.phase}`);
  }
  if (!atSixthWin(state)) throw new Error("did not reach the sixth win within budget");
  return state;
}

function assertOrdinaryThroughBattle5(
  state: FactoryRoundBattleOrchestratorState,
  enteringStreak: number,
  symbolsCount: 0 | 1 | 2,
): void {
  for (let battleIndex = 0; battleIndex <= 5; battleIndex += 1) {
    expect(state.opponentGenerations[battleIndex]!.kind).toBe("ordinary");
    expect(getFactoryFrontierBrainStatus({
      battleMode: "singles",
      winStreak: enteringStreak + battleIndex,
      symbolsCount,
    })).toBe("not-ready");
  }
}

/**
 * Rung C pin: proves `beginFactoryRoundBattleStartIntro` constructs the real
 * battle-start command for the scheduled Brain battle, carrying NOLAND's
 * source-cited identity (docs/noland-brain-staging-design.md §2.3,
 * re-verified against reference/pokeemerald), and that the existing
 * `frontierBrain` status plumbing ({status: silver/gold}) on
 * `currentOpponent` stays consistent with the command that was just built
 * from that very opponent.
 */
function assertBrainBattleStartCommand(
  state: FactoryRoundBattleOrchestratorState,
  status: "silver" | "gold",
): void {
  expect(state.round.rules.phase).toBe("presentingBattleStart");
  expect(state.round.rules.currentOpponent.frontierBrain).toMatchObject({ status });

  const started = beginFactoryRoundBattleStartIntro(state);
  const command = started.battleStartIntro!.command;
  expect(command.battleIndex).toBe(6);
  expect(command.opponentTrainer).toMatchObject({
    trainerId: TRAINER_FRONTIER_BRAIN,
    name: "NOLAND",
    trainerClass: "TRAINER_CLASS_FACTORY_HEAD",
    className: "FACTORY HEAD",
    trainerPicIndex: 86,
    trainerPic: "TRAINER_PIC_FACTORY_HEAD_NOLAND",
  });
  // The battle-start command is trainer-identity-only; the silver/gold
  // status itself keeps living on `currentOpponent.frontierBrain`, unchanged
  // by constructing the intro.
  expect(started.round.rules.currentOpponent.frontierBrain).toMatchObject({ status });
}

/**
 * Step 2 (round-controller BP/symbol outputs): resolves the pending Brain
 * battle-start command straight to its outcome through the same public
 * `resolveRoundBattle` seam the loss case below uses (scripting a real
 * kernel win/loss against a generated Brain party is out of scope here),
 * then confirms `factoryRoundOutcomeForResolution` -- the same function
 * `finishBattle` calls to populate `state.roundOutcome` on a real terminal
 * boundary -- reports the audit doc's §1a/§3 BP/symbol result.
 */
function assertBrainRoundOutcome(
  state: FactoryRoundBattleOrchestratorState,
  outcome: "win" | "loss",
  expected: ReturnType<typeof factoryRoundOutcomeForResolution>,
): void {
  const start = state.round.presentation?.command;
  if (start?.type !== "battleStart") throw new Error("expected a pending battle-start command");
  let round = advanceRoundController(
    completeBattlePresentation(state.round, { commandId: start.commandId }),
  );
  round = resolveRoundBattle(round, {
    outcome,
    playerParty: round.rules.playerParty,
    opponentParty: round.rules.currentOpponent.party,
    rngValue: round.rules.rngValue,
  });
  expect(round.rules.phase).toBe(outcome === "win" ? "roundComplete" : "roundLost");
  expect(factoryRoundOutcomeForResolution(
    state.config,
    round.rules.battleIndex,
    outcome,
    round.rules.currentOpponent.frontierBrain,
  )).toEqual(expected);
}

// Silver: entering factoryWinStreak 14 (challenge index 2), symbols 0 —
// battleIndex 6's effective streak is 20, the silver threshold.
//
// The two seeds are curated only for "the move-slot-0 policy wins all six
// ordinary battles"; every assertion below is structural (which battleIndex
// is the brain, and the cursor handoff), not seed-valued. Re-scanned for
// ISSUES #128 (silver 4 -> 1, gold 2 -> 8): recording battle-start
// Intimidate/Trace onto aiObservedAbilityIds[0] removes the AI's
// `get_ability` draws against two-ability player mons, which shifts every
// trajectory riding the shared RNG cursor, and the old seeds now lose before
// the sixth win. `driveToSixthWin`'s own "pick a different seed" throw is the
// designed remedy.
//
// Re-scanned again 2026-08-25 (silver 1 -> 2; gold 8 is still viable) for the
// four end-turn source fixes: TurnValuesCleanUp(FALSE)'s isFirstTurn decay
// (ISSUES #130) makes Fake Out fail from turn 2 and gates Speed Boost on the
// switch-in turn, the end-turn STATUS2_FLINCHED clear (#133) stops a shadowed
// flinch costing a second turn, the field loop is case-major (#132), and
// ENDTURN_ORDER re-sorts per turn with a speed-tie draw (#131). Seed 1 now
// loses before the sixth win, so `driveToSixthWin` throws its designed
// "pick a different seed" -- taking the lowest seed that still wins six
// ordinary battles under BOTH symbol counts (scanned 1..40) rather than
// re-pinning any assertion to a now-arbitrary value.
//
// ISSUES #140 (GetMoveTarget's MOVE_TARGET_SELECTED draw loop on
// HandleAction_UseMove's four re-target branches) moved every seed's
// trajectory again and seed 2 now loses before the sixth win, so the same
// rule re-applies: SILVER_SEED 2 -> 6, again the lowest seed in 1..40 that
// wins six ordinary battles under BOTH symbol counts. ROM receipt:
// tools/probe/receipts/issue140-getmovetarget-off.json.
// aip262 (live AI view fills usablePartyMons: Roar / Baton Pass / Explosion / Memento now score on the real bench counts): SILVER_SEED 6 -> 4, again the
// lowest seed in 1..40 that wins six ordinary battles under BOTH symbol counts.
const SILVER_SEED = 4;
const SILVER_STREAK = 14;
// Gold: entering factoryWinStreak 35 (challenge index 5), symbols 1 —
// battleIndex 6's effective streak is 41, the gold threshold.
// aiv271 (AI damage sims take the real CalculateBaseDamage terms: held-item / species / status / pinch / weather, so the AI now picks the move the ROM picks):
// GOLD_SEED 8 -> 24, the lowest seed in 1..40 whose move-slot-0 policy still wins six ordinary battles (seeds 1..23 lose before the sixth win).
// parity-mac fix 29 (docs/parity-mac/perish-song-after-outcome.md): seed 24's third battle ends with Perish Song taking the last Pokemon of BOTH sides in one
// turn. The game calls that a draw, which ends the challenge (sEndTurnFuncsTable[B_OUTCOME_DREW] = HandleEndTurn_BattleLost); the engine used to stop at the
// opponent's faint and call it a win. GOLD_SEED 24 -> 14, the lowest seed in 1..40 whose move-slot-0 policy wins six ordinary battles on the fixed engine.
const GOLD_SEED = 14;
const GOLD_STREAK = 35;

describe("Frontier Brain round shape: real seven-battle rounds (Noland rung 2c)", () => {
  it("silver round: battles 0..5 are ordinary, battleIndex 6 is the silver brain with a real RNG-cursor handoff", () => {
    let state = driveToSixthWin(
      roundConfig("brain-round-shape-silver", SILVER_SEED, SILVER_STREAK, 0),
    );
    assertOrdinaryThroughBattle5(state, SILVER_STREAK, 0);

    const preWinRng = state.round.rules.rngValue;
    const playerSetIds = state.round.rules.playerRentalRecords!.map((r) => r.setId);

    // Fix 45 (docs/parity-mac/brain-party-after-swap.md): no GO ON roll for the Head; the source rolls his party at the battle's start,
    // after the swap, so the engine rolls it at the swap's resolution.
    state = preGenerateFactoryRoundNextOpponent(state);
    expect(state.pendingNextOpponent).toBeNull();
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("awaitingSwapDecision");
    const offerId = state.round.presentation?.command.commandId;
    if (offerId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: offerId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    state = acknowledgeAndAdvance(state);
    const pending = state.opponentGenerations.at(-1)!;
    expect(pending!.kind).toBe("frontier-brain");
    if (pending!.kind !== "frontier-brain") throw new Error("unreachable: asserted above");
    expect(pending!.status).toBe("silver");
    expect(pending!.trainerId).toBe(TRAINER_FRONTIER_BRAIN);
    expect(pending!.generation.challengeNum).toBe(2);
    expect(pending!.generation.fixedIv).toBe(15);

    // storedTrainerIds carries through untouched: the brain is never folded
    // into the ordinary no-repeat-trainer history.
    expect(pending!.storedTrainerIds).toEqual(state.opponentGenerations[5]!.storedTrainerIds);
    expect(pending!.storedTrainerIds).not.toContain(TRAINER_FRONTIER_BRAIN);

    // RNG cursor continuity: the generation seam picks up exactly where
    // battle 5's own resolution left the cursor, not a hand-derived constant.
    const segment = state.rngSegments.at(-1)!;
    expect(segment.kind).toBe("opponent-generation");
    expect(segment.battleIndex).toBe(6);
    expect(segment.rngBefore).toBe(preWinRng);
    expect(pending!.generation.drawLedger[0]!.rngBefore).toBe(preWinRng);

    // Structural party rules against the round's own current rentals.
    const brainOpponents = pending!.generation.opponents;
    for (const opponent of brainOpponents) {
      expect(playerSetIds).not.toContain(opponent.setId);
      expect(opponent.fixedIv).toBe(pending!.generation.fixedIv);
    }
    expect(new Set(brainOpponents.map((o) => o.speciesName)).size).toBe(3);
    expect(new Set(brainOpponents.map((o) => o.itemId)).size).toBe(3);


    expect(state.round.rules.battleIndex).toBe(6);
    expect(state.round.rules.currentOpponent.id).toBe(`factory-trainer-${TRAINER_FRONTIER_BRAIN}`);
    expect(state.round.rules.currentOpponent.frontierBrain).toMatchObject({ status: "silver" });
    assertBrainBattleStartCommand(state, "silver");
    assertBrainRoundOutcome(state, "win", {
      battlePointsAwarded: 14,
      symbolGranted: true,
      newSymbolsCount: 1,
    });
  });

  it("the same silver round with factorySymbolsCount 1 schedules an ordinary opponent at battleIndex 6", () => {
    const state = driveToSixthWin(
      roundConfig("brain-round-shape-silver-symbols-1", SILVER_SEED, SILVER_STREAK, 1),
    );
    assertOrdinaryThroughBattle5(state, SILVER_STREAK, 1);

    const generated = preGenerateFactoryRoundNextOpponent(state);
    const pending = generated.pendingNextOpponent;
    expect(pending).not.toBeNull();
    expect(pending!.kind).toBe("ordinary");
    expect(getFactoryFrontierBrainStatus({
      battleMode: "singles",
      winStreak: SILVER_STREAK + 6,
      symbolsCount: 1,
    })).toBe("not-ready");
  });

  it("gold round: battles 0..5 are ordinary, battleIndex 6 is the gold brain", () => {
    let state = driveToSixthWin(
      roundConfig("brain-round-shape-gold", GOLD_SEED, GOLD_STREAK, 1),
    );
    assertOrdinaryThroughBattle5(state, GOLD_STREAK, 1);

    const preWinRng = state.round.rules.rngValue;
    const playerSetIds = state.round.rules.playerRentalRecords!.map((r) => r.setId);

    // Fix 45 (docs/parity-mac/brain-party-after-swap.md): no GO ON roll for the Head; the source rolls his party at the battle's start,
    // after the swap, so the engine rolls it at the swap's resolution.
    state = preGenerateFactoryRoundNextOpponent(state);
    expect(state.pendingNextOpponent).toBeNull();
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("awaitingSwapDecision");
    const offerId = state.round.presentation?.command.commandId;
    if (offerId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: offerId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    state = acknowledgeAndAdvance(state);
    const pending = state.opponentGenerations.at(-1)!;
    expect(pending!.kind).toBe("frontier-brain");
    if (pending!.kind !== "frontier-brain") throw new Error("unreachable: asserted above");
    expect(pending!.status).toBe("gold");
    expect(pending!.trainerId).toBe(TRAINER_FRONTIER_BRAIN);
    expect(pending!.generation.challengeNum).toBe(5);
    expect(pending!.generation.fixedIv).toBe(31);

    expect(pending!.storedTrainerIds).toEqual(state.opponentGenerations[5]!.storedTrainerIds);
    expect(pending!.storedTrainerIds).not.toContain(TRAINER_FRONTIER_BRAIN);

    const segment = state.rngSegments.at(-1)!;
    expect(segment.kind).toBe("opponent-generation");
    expect(segment.battleIndex).toBe(6);
    expect(segment.rngBefore).toBe(preWinRng);
    expect(pending!.generation.drawLedger[0]!.rngBefore).toBe(preWinRng);

    const brainOpponents = pending!.generation.opponents;
    for (const opponent of brainOpponents) {
      expect(playerSetIds).not.toContain(opponent.setId);
      expect(opponent.fixedIv).toBe(pending!.generation.fixedIv);
    }
    expect(new Set(brainOpponents.map((o) => o.speciesName)).size).toBe(3);
    expect(new Set(brainOpponents.map((o) => o.itemId)).size).toBe(3);


    expect(state.round.rules.battleIndex).toBe(6);
    expect(state.round.rules.currentOpponent.id).toBe(`factory-trainer-${TRAINER_FRONTIER_BRAIN}`);
    expect(state.round.rules.currentOpponent.frontierBrain).toMatchObject({ status: "gold" });
    assertBrainBattleStartCommand(state, "gold");
    assertBrainRoundOutcome(state, "win", {
      battlePointsAwarded: 15,
      symbolGranted: true,
      newSymbolsCount: 2,
    });
  });

  // No existing test exercised a LOSS at the Brain's own battleIndex 6 --
  // every other round-shape test only proves the WIN path. Resolves the
  // battle through the same public `resolveRoundBattle` seam
  // `tools/compare/factoryRoundIntroGeneralizationStage.ts`'s `advanceProofWin`
  // uses for wins (`completeBattlePresentation` + `advanceRoundController` to
  // reach `battleActive`, then `resolveRoundBattle` with the real outcome),
  // swapped to "loss" instead of scripting out an actual battle loss.
  it("losing to the silver Frontier Brain at battleIndex 6 reports roundLost with frontierBrain status intact", () => {
    let state = driveToSixthWin(
      roundConfig("brain-round-shape-silver-loss", SILVER_SEED, SILVER_STREAK, 0),
    );
    state = preGenerateFactoryRoundNextOpponent(state);
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("awaitingSwapDecision");
    const offerId = state.round.presentation?.command.commandId;
    if (offerId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: offerId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    state = acknowledgeAndAdvance(state);

    expect(state.round.rules.battleIndex).toBe(6);
    expect(state.round.rules.currentOpponent.id).toBe(`factory-trainer-${TRAINER_FRONTIER_BRAIN}`);
    expect(state.round.rules.currentOpponent.frontierBrain).toMatchObject({ status: "silver" });
    expect(state.round.rules.phase).toBe("presentingBattleStart");

    const start = state.round.presentation?.command;
    if (start?.type !== "battleStart") {
      throw new Error("expected a pending battle-start command");
    }
    let round = advanceRoundController(
      completeBattlePresentation(state.round, { commandId: start.commandId }),
    );
    round = resolveRoundBattle(round, {
      outcome: "loss",
      playerParty: round.rules.playerParty,
      opponentParty: round.rules.currentOpponent.party,
      rngValue: round.rules.rngValue,
    });

    expect(round.rules.phase).toBe("roundLost");
    const command = round.presentation?.command;
    if (command?.type !== "roundLost") throw new Error("expected a roundLost command");
    expect(command.battleIndex).toBe(6);
    expect(command.opponent.id).toBe(`factory-trainer-${TRAINER_FRONTIER_BRAIN}`);
    // frontierBrain end-to-end: carried by the emitted roundLost command's
    // own opponent snapshot, not just the round's live rules state.
    expect(command.opponent.frontierBrain).toMatchObject({ status: "silver" });
    expect(round.rules.currentOpponent.frontierBrain).toMatchObject({ status: "silver" });

    // Step 2's round-controller output on the negative path: a Brain loss
    // is identical to an ordinary loss (audit doc §2) -- no BP, no symbol,
    // symbol count untouched.
    expect(factoryRoundOutcomeForResolution(
      state.config,
      round.rules.battleIndex,
      "loss",
      round.rules.currentOpponent.frontierBrain,
    )).toEqual({ battlePointsAwarded: 0, symbolGranted: false, newSymbolsCount: 0 });
  });
});
