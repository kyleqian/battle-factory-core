// Tier-1 pin for the random-play soak driver (tools/soak/randomRoundSoak.ts).
//
// Pins the currently-green soak surface: a seeded random player, driving the
// production play path (createInitialState + tick, real button presses only)
// through draft -> prebattle room -> battle room -> generated battle-start
// intro, reaches battle 1's first interactive action menu without any engine
// throw, for a small fixed seed set. Seeds that crash deeper in the round are
// cataloged in docs/soak-crash-catalog.md, NOT pinned here — as of 2026-08-08
// every soaked seed crashes inside battle 1's resolution presentation, so the
// full-round surface cannot be pinned green yet. When those engine defects
// close, extend this pin toward full rounds.

import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { GbaButton } from "../src/input.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { BattleSubmittedDecision } from "../src/engine/battleDecisionBoundary.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  beginFactoryRoundBattleStartIntro,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  advanceFactoryRoundPresentation,
  submitFactoryRoundPlayerDecision,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  createInitialFactoryCarry,
  type FactoryCarry,
} from "../src/engine/factoryRoundChaining.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import {
  pickWinningFightSlot,
  pickWinningSwitchRow,
  resolveMaxFrames,
  runSeed,
} from "../tools/soak/randomRoundSoakDriver.ts";

const PIN_SEEDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function strongRouteRecord(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function createSevenWinLiveState(): EngineState {
  const playerRentalRecords = [
    strongRouteRecord(664),
    strongRouteRecord(678),
    strongRouteRecord(527),
  ] as const;
  const orchestrator = beginFactoryRoundBattleStartIntro(
    createFactoryRoundBattleOrchestrator({
      id: "seven-win-live-seam-seed-21",
      rngValue: 21,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords,
        savedRentalRecords: [
          ...playerRentalRecords,
          strongRouteRecord(1),
          strongRouteRecord(2),
          strongRouteRecord(3),
        ],
      },
    }),
  );
  return {
    ...createInitialState(),
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.round.rules.rngValue,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator-level round carrier (mirrors factoryRoundChaining.test.ts's
// own driveGeneratedRoundToCompletion/driveTerminalToNextDraft/
// stateAtDecidedRound helpers) -- reused below to reach a chained-then-lost
// run: round 1 wins (the known-strong 664/678/527 trio) carrying the streak
// to 7, then round 2 loses (arbitrary generated rentals, same recipe as that
// file's "(c)" case), the cheapest deterministic way to exercise the exact
// scenario where the old carriedWinStreak snapshot lies.
// ---------------------------------------------------------------------------

function acknowledgeAndAdvance(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
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
  const active = state.battle!.rules.rulesContext.battlers[0]!;
  const preferredSlot = active.partyIndex === 1 && active.isFirstTurn === 2 ? 3 : 0;
  return boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move" && decision.moveSlot === preferredSlot,
  ) ?? boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move",
  )!;
}

function driveGeneratedRoundToCompletion(
  carry: FactoryCarry,
  seed: number,
  // "strong" (the known-reliable 664/678/527 trio) drives a win; "weak"
  // rents whatever the live generator pulls into slots 0/1/2 -- not tuned to
  // win, used below to reach a scripted roundLost regardless of carry.
  partyStrength: "strong" | "weak" = "strong",
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [strongRouteRecord(664), strongRouteRecord(678), strongRouteRecord(527)] as const;
  const savedRentalRecords = [
    ...playerRecords,
    strongRouteRecord(1),
    strongRouteRecord(2),
    strongRouteRecord(3),
  ] as const;
  let state = createFactoryRoundBattleOrchestrator({
    id: `random-round-soak-depth-carrier-${seed}`,
    rngValue: seed,
    factoryWinStreak: carry.factoryWinStreak,
    playerTrainerId: carry.playerTrainerId,
    battleTowerLevel50WinStreak: 0,
    factorySymbolsCount: carry.factorySymbolsCount,
    facilityState: { rentsCount: carry.rentsCount },
    rentals: partyStrength === "strong"
      ? { type: "currentRecords", playerRentalRecords: playerRecords, savedRentalRecords }
      : { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
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
    throw new Error(`unexpected carrier phase ${state.round.rules.phase}`);
  }
  return state;
}

/** tick()s a decided round's terminal forward, holding A every other frame
 * (the record menu's cursor stays at its default NO), until it chains into
 * the next generated draft. */
function driveTerminalToNextDraft(state: EngineState, maxTicks = 3_000): EngineState {
  let s = state;
  const A: ReadonlySet<GbaButton> = new Set(["A"]);
  const NONE: ReadonlySet<GbaButton> = new Set();
  for (let i = 0; i < maxTicks; i += 1) {
    if (s.pendingGeneratedRound !== null) return s;
    s = tick(s, i % 2 === 0 ? A : NONE);
  }
  throw new Error(`terminal did not chain into the next draft within ${maxTicks} ticks`);
}

function stateAtDecidedRound(
  round: FactoryRoundBattleOrchestratorState,
  carry: FactoryCarry,
): EngineState {
  return { ...createInitialState(), factoryCarry: carry, factoryRoundBattleOrchestrator: round };
}

describe("random round soak driver (green milestone pin)", () => {
  it("reaches battle 1's first action menu crash-free for the pinned seeds", () => {
    for (const seed of PIN_SEEDS) {
      const result = runSeed(seed, {
        maxFrames: 6_000,
        renderEvery: 8,
        stopAtFirstActionMenu: true,
      });
      expect(result, `seed ${seed}: ${result.errorMessage ?? result.hangSurface ?? ""}`)
        .toMatchObject({
          seed,
          outcome: "OK",
          endState: "milestone:first-action-menu",
          battle: 1,
        });
      // The whole draft->intro route runs ~1.4-1.6k frames; a blowout here
      // means the driver lost its way (a driver bug, not an engine bug).
      expect(result.frames).toBeLessThan(4_000);
    }
  });

  it("also reaches the milestone under the vanilla policy", () => {
    const result = runSeed(11, {
      maxFrames: 6_000,
      renderEvery: 8,
      policy: "vanilla",
      stopAtFirstActionMenu: true,
    });
    expect(result).toMatchObject({
      outcome: "OK",
      endState: "milestone:first-action-menu",
    });
  });

  it("is deterministic per seed", () => {
    const first = runSeed(3, { maxFrames: 6_000, stopAtFirstActionMenu: true });
    const second = runSeed(3, { maxFrames: 6_000, stopAtFirstActionMenu: true });
    expect(second.frames).toBe(first.frames);
    expect(second.outcome).toBe(first.outcome);
    expect(second.lastActions).toEqual(first.lastActions);
  });

  it("also reaches the milestone under the winning policy", () => {
    const result = runSeed(12, {
      maxFrames: 6_000,
      renderEvery: 8,
      policy: "winning",
      stopAtFirstActionMenu: true,
    });
    expect(result).toMatchObject({
      outcome: "OK",
      endState: "milestone:first-action-menu",
    });
  });

  it("is deterministic per seed under the winning policy", () => {
    // A deeper run than the milestone determinism pin above: the winning
    // policy's two overrides (fight-move power ranking, voluntary-switch
    // decline) both live well past battle 1's first action menu, so this
    // exercises them across a whole round's worth of ticks.
    const options = {
      maxFrames: 600_000,
      renderEvery: 0,
      policy: "winning" as const,
      stopAtFirstRoundDecision: true,
    } as const;
    const first = runSeed(12, options);
    const second = runSeed(12, options);
    expect(second).toEqual(first);
  });

  it("earns all seven generated wins through the live tick/render and terminal seams", () => {
    const options = {
      maxFrames: 200_000,
      renderEvery: 16,
      testPolicy: "strong-route" as const,
      stateFactory: createSevenWinLiveState,
      collectDiagnostics: true,
      // This pin cares only about THIS round's own 7-win mechanics, not
      // in-session chaining (factoryRoundChaining.ts): strong-route always
      // wins, so without this the terminal's default-NO decline (PROGRESS
      // ~1271) would keep chaining into fresh rounds indefinitely.
      stopAtFirstRoundDecision: true,
    };
    const first = runSeed(21, options);
    const second = runSeed(21, options);

    expect(first).toMatchObject({
      outcome: "OK",
      endState: "roundComplete",
      // ISSUES #93's fix (factoryRoundBattleOrchestrator.ts) stopped handing
      // a forced-switch resolution off to the party selector at the fainted
      // battler's own message -- real Cmd_moveend item effects (this seed's
      // own trailing commands) now present in full first, matching source's
      // actual HandleFaintedMonActions ordering. That is strictly more
      // frames/render calls per forced switch this seed hits.
      //
      // ISSUES #95's fix (battleResolutionPresentation.ts) then moved these
      // counters again: an attack animation may no longer pair with a hit
      // animation from a LATER script execution, so this seed's non-damaging
      // moves stopped publishing bogus multi-frame move-animation commands
      // built from an unrelated end-of-turn tick's hit. The strong-route
      // policy reads presentation state, so the seed's own move choices --
      // and with them the battle/turn counters below -- are a genuine new
      // trajectory, not a driver regression. It still earns all seven wins,
      // and both settled re-runs stay deterministic
      // (`expect(second).toEqual(first)` below).
      //
      // ISSUES #99's driver fix (randomRoundSoakDriver.ts's onPostwin) then
      // moved these counters a third time: strong-route is a non-exploring
      // policy (same `explores` semantics as vanilla), so it always declines
      // the swap offer -- but the pre-fix bug made every non-exploring
      // policy accept every swap by accident (the frozen continuation-menu
      // branch pressed A on the swap menu's default YES cursor). Fixed, this
      // seed now genuinely declines every swap and skips the swap screen's
      // extra frames entirely, settling into a shorter, different trajectory.
      //
      // ISSUES #115's fix (battleResolutionPresentation.ts) then moved these
      // counters a fourth time: a post-switch-in message now names the
      // battler slot's CURRENT occupant instead of a stale pre-switch
      // snapshot, and the typewriter print duration depends on the printed
      // name's own length -- a genuinely different (correct) string, not a
      // driver regression.
      frames: 40_563,
      battle: 7,
      turn: 5,
      diagnostics: {
        roundPhase: "roundComplete",
        battleIndex: 6,
        lastBattleOutcome: "win",
        opponentGenerationCount: 7,
        battleRngSegmentCount: 7,
        terminalOutcome: "roundWon",
        terminalRecordMenuInputReadyReached: true,
        terminalRecordChoice: null,
        renderCalls: 2_956,
      },
    });
    expect(second).toEqual(first);
  });

  it("ISSUES #85: keeps the genuine switched-in HP at a later damage-command start", () => {
    // Seed 0 voluntarily switches BUTTERFREE -> BAYLEEF on turn 8, then
    // MURKROW's same-turn FLY drains BAYLEEF 153 -> 66. The parent replayed
    // the settled 66-HP command field as the switch-in's initial display and
    // crashed while committing the preceding hit command at frame 4697.
    const result = runSeed(0, { maxFrames: 4_698, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /battle resolution HP command starts at .* displayed/,
    );
    expect(result.frames).toBeGreaterThan(4_697);
  });

  it("ISSUES #85: resets the display ledger when a healthy active replaces a statused one", () => {
    // Seed 6 reaches Pidgeotto after the previously active opponent carried
    // burn display state. The parent retained that old status across the
    // switch and failed the genuine next-command handoff at frame 6632.
    // The same family formerly recurred after the forced-send-out seam at
    // frame 7797, so keep this focused pin beyond both handoffs.
    const result = runSeed(6, { maxFrames: 7_798, renderEvery: 0 });
    expect(result.errorMessage).not.toBe(
      "resolution handoff battler 1 display does not match the genuine next boundary",
    );
    expect(result.frames).toBeGreaterThan(7_797);
  });

  it("ISSUES #86: commits every typed switch-in in one forced continuation", () => {
    // Seed 45's forced selection resumes through both the player's chosen
    // replacement and the opponent's automatic replacement. The source
    // receipt contains a complete switch transition for each battler; the
    // display ledger must consume both before the forced-send-out handoff.
    const result = runSeed(45, { maxFrames: 6_621, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /forced-switch-in battler 1 changed party without a completed switch transition/,
    );
    expect(result.frames).toBeGreaterThan(6_620);
  });

  it("ISSUES #86: waits for the requested battler's faint message before forced selection", () => {
    // Seed 16's turn has two faint receipts in source order: player QUILAVA
    // KOs opponent PHANPY, the automatic opponent 1 -> 2 switch completes,
    // then sandstorm KOs QUILAVA and requests the player's forced switch.
    // The earlier opponent faint dismissal must not steal the later player's
    // forced-selector handoff and strand the typed opponent switch command.
    const result = runSeed(16, { maxFrames: 28_562, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /forced-switch-in battler 1 changed party without a completed switch transition/,
    );
    expect(result.frames).toBeGreaterThan(28_561);
  });

  it("ISSUES #86: a later faint resets stale forced-switch choice ownership", () => {
    // Seed 14 completes one player forced switch on turn 18. On turn 19 the
    // new active faints; source ChooseMonToSendOut resets monToSwitchIntoId
    // before opening a fresh selector instead of reusing the previous slot.
    const result = runSeed(14, { maxFrames: 9_485, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /switch-in message has no preceding switch\/post-switch field/,
    );
    expect(result.frames).toBeGreaterThan(9_484);
  });

  it("ISSUES #88: a locked multi-turn battler that faints before its continuation falls back to a fresh resolution", () => {
    // Seed 0's chained round 2 (only reachable now that terminal-decline
    // chains into a fresh generated round, PROGRESS ~1271) has its opponent
    // charge a two-turn move on turn 4, setting STATUS2_MULTIPLETURNS. The
    // player's faster turn-5 move then KOs that same battler before its
    // continuation can print — FaintClearSetData (battle_main.c:3272) zeroes
    // status2 on faint, so the locked continuation genuinely never fires.
    // The parent treated the missing receipt as a broken invariant and threw;
    // it must now fall back to a fresh resolution identity instead.
    const result = runSeed(0, { policy: "vanilla", maxFrames: 32_000, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /locked action continuation receipt has no immutable matching action snapshot/,
    );
    expect(result.frames).toBeGreaterThan(31_771);
  });

  it("ISSUES #89: seed 27's mid-turn Baton Pass openpartyscreen halt resumes through the forced party selector", () => {
    // Seed 27 (full policy) selects Baton Pass mid-turn and used to crash at
    // round 1 battle 1 turn 10, frame 30798, on an unimplemented
    // BattleScript_EffectBatonPass / B_SCR_OP_OPENPARTYSCREEN machine-barrier
    // (driveTrainerBoundary had no handling for a player-side mid-action
    // openpartyscreen halt). It's now a resumable player-choice halt that
    // hands off to the forced party selector instead of hard-failing, so the
    // whole round plays out to a genuine finish. Pin the meaningful outcome
    // shape (progressed past the old crash point, no throw, real endState),
    // not the exact settling frame/turn — those drift with unrelated
    // downstream RNG-consumption changes. `stopAtFirstRoundDecision` snapshots
    // THIS round's own decided outcome regardless of what the terminal does
    // afterward — this seed's terminal happens to dead-end on ISSUES #104
    // (ISSUES #104 driver fix, PROGRESS ~1367), an unrelated open defect this
    // pin has no stake in; without the flag the honest driver now reports
    // that dead-end as HANG instead of this seed's own genuine roundLost.
    const result = runSeed(27, {
      maxFrames: 80_000,
      renderEvery: 0,
      stopAtFirstRoundDecision: true,
    });
    expect(result.errorMessage ?? "").not.toMatch(/openpartyscreen|machine-barrier/i);
    expect(result.frames).toBeGreaterThan(30_798);
    expect(result).toMatchObject({ outcome: "OK", endState: "roundLost" });
  });

  // ISSUES #86's original concern (a forced replacement's terminal weather
  // continuation) was pinned at seed 27 battle 4 turn 16: MURKROW forced in
  // at 4 HP, then the same genuine reducer receipt runs sandstorm damage,
  // faints MURKROW, and returns a terminal trainer-win boundary without
  // demanding an intervening player command. The #89 fix changes seed 27's
  // RNG-consumption trajectory from turn 10 onward (Baton Pass's switch no
  // longer crashes, so it now actually happens and consumes RNG); post-fix,
  // seed 27 loses in battle 1 itself (confirmed via runSeed(27, {maxFrames:
  // 80_000, collectDiagnostics: true}) -> battleIndex 0, never reaches
  // battle 4) and never revisits the documented scenario. A bounded search
  // for a fresh repro of the same mechanism — an instrumented sweep of
  // seeds 0:350 (full policy) and 0:150 (vanilla) through the production
  // soak driver, plus seeds 0:3200 through a second, decision-level harness
  // (driveGeneratedRoundToCompletion-style: deterministic first-legal-move/
  // first-legal-switch policy, no rendering), all checking the exact source
  // condition (a forced-switch segment with commands after the last typed
  // switch-in whose overall receipt is a terminal boundary) — found no
  // fresh occurrence in ~3,700 seed/policy trials. The underlying fix itself
  // (advanceFactoryRoundBattleResolution's nextCommandIndex resume branch,
  // factoryRoundBattleOrchestrator.ts ~2090-2114) is untouched and still
  // guarded by the three sibling ISSUES #86 pins above (seeds 45/16/14, each
  // exercising the same "commands after switch-in" resume path for a
  // non-terminal continuation); only the terminal-specific variant lost its
  // natural repro. Left unpinned rather than fabricating a synthetic/injected
  // state the game could never actually reach — see PROGRESS.md for the
  // search performed and this as an explicit open follow-up.

  it("ISSUES #92: winning gets a larger default frame budget than full/vanilla", () => {
    // "winning" chains multiple complete rounds back-to-back (its
    // continuation roll keeps re-entering GO ON), so per-seed frame cost
    // stacks across rounds and can legitimately exceed a single round's
    // budget without stalling. docs/soak-winning-sweep-2026-08-16.md (seeds
    // 0:60) found seed 49 HANGing at the old flat 600_000 default despite
    // settling cleanly at frame 693,051 given more room; docs/
    // soak-winning-sweep-2026-08-16-part2.md (seeds 60:120) confirmed no
    // seed needs more than that. "full"/"vanilla" soak a single round, so
    // ISSUES #90's 600_000 stays their default.
    expect(resolveMaxFrames("full")).toBe(600_000);
    expect(resolveMaxFrames("vanilla")).toBe(600_000);
    expect(resolveMaxFrames("winning")).toBe(1_000_000);
    expect(resolveMaxFrames("winning")).toBeGreaterThan(693_051);
    // An explicit maxFrames always overrides the policy default.
    expect(resolveMaxFrames("winning", 42)).toBe(42);
    expect(resolveMaxFrames("full", 42)).toBe(42);
  });
});

describe("real max-depth tracking (Milestone M-A step 1)", () => {
  it("maxCarriedWinStreak/maxBattleDepth survive a later loss where the old carriedWinStreak snapshot resets to 0", () => {
    // Round 1 wins with the scripted-strong trio, carrying the streak to 7.
    const carry0 = createInitialFactoryCarry(0x89ab_cdef);
    const round1 = driveGeneratedRoundToCompletion(carry0, 17);
    expect(round1.round.rules.phase).toBe("roundComplete");
    const chained1 = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry0));
    const carry1 = chained1.factoryCarry;
    expect(carry1.factoryWinStreak).toBe(7);

    // Round 2 (carry-in 7) loses with an unscripted, arbitrary-strength
    // party -- same recipe as factoryRoundChaining.test.ts's "(c)" case.
    const round2Lost = driveGeneratedRoundToCompletion(carry1, 17, "weak");
    expect(round2Lost.round.rules.phase).toBe("roundLost");
    const initialState = stateAtDecidedRound(round2Lost, carry1);

    // Let the soak driver run forward from that decided round2 loss: within
    // a couple thousand frames the default policy declines the record menu
    // and the run re-chains into a fresh round 3 (carry reset to 0 on the
    // loss), so by the time diagnostics are captured, the OLD snapshot field
    // has already forgotten the streak-7 depth this run actually reached.
    const result = runSeed(999, {
      maxFrames: 2_000,
      renderEvery: 0,
      policy: "vanilla",
      stateFactory: () => initialState,
      collectDiagnostics: true,
    });

    expect(result.diagnostics?.carriedWinStreak).toBe(0);
    expect(result.maxCarriedWinStreak).toBeGreaterThanOrEqual(7);
    expect(result.maxBattleDepth).toBeGreaterThanOrEqual(7);
  });
});

describe("ISSUES #99 (soak driver swap-offer misroute) — swap offer answered by its own branch", () => {
  // Regression pin for the fix in randomRoundSoakDriver.ts's onPostwin:
  // the continuation-menu branch used to stay "live" (continuationCursorPos
  // !== null) forever after GO ON was confirmed, so its A presses answered
  // the dialoguePage-4 swap offer instead of the swap-offer branch below it
  // -- vanilla accepted every swap despite its own "declined" doc comment,
  // and full/winning accepted ~85% instead of a 50/50 roll.
  it("vanilla policy always declines the swap offer and never enters the swap screen", () => {
    const notes: string[] = [];
    // Seed 0 wins battle 1 and reaches the swap-offer menu by frame ~28,645
    // under this policy's always-GO-ON continuation; capped well short of
    // vanilla's 600,000-frame default full-round budget.
    runSeed(0, {
      policy: "vanilla",
      maxFrames: 32_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    const swapOfferNotes = notes.filter((note) => note.startsWith("swap offer:"));
    expect(swapOfferNotes.length).toBeGreaterThan(0);
    expect(swapOfferNotes.every((note) => note === "swap offer: NO")).toBe(true);
    expect(notes.some((note) => note.startsWith("swap screen:"))).toBe(false);
  });

  it("winning policy's swap-offer menu is reached and logs its own decision", () => {
    const notes: string[] = [];
    runSeed(0, {
      policy: "winning",
      maxFrames: 15_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    expect(notes.some((note) => note.startsWith("swap offer:"))).toBe(true);
  });

  it("both YES and NO swap-offer decisions occur across a small fixed seed set (full policy)", () => {
    // Moved from "winning" to "full" by M-B step 2 part B, rung 1: "winning"
    // now always declines (see the describe block below), so "full" is the
    // policy that still exercises both branches of this menu.
    const swapOfferNotes: string[] = [];
    for (let seed = 0; seed < 7; seed += 1) {
      runSeed(seed, {
        policy: "full",
        maxFrames: 20_000,
        renderEvery: 0,
        onNote: (entry) => {
          if (entry.what.startsWith("swap offer:")) swapOfferNotes.push(entry.what);
        },
      });
    }
    expect(swapOfferNotes).toContain("swap offer: YES");
    expect(swapOfferNotes).toContain("swap offer: NO");
  });
});

describe("Milestone M-B step 2: effectiveness-aware winning policy", () => {
  it("(a) picks the type-effectiveness winner over raw higher power (SURF resisted vs VINE_WHIP super-effective+STAB)", () => {
    // SURF (Water, power 95) vs a Water defender: resisted 0.5x, no STAB
    // (attacker is Grass) -> score 47.5. VINE_WHIP (Grass, power 35) vs the
    // same Water defender: super-effective 2x and STAB (attacker is Grass)
    // -> score 105. The lower-power, on-type move should win.
    const slot = pickWinningFightSlot({
      legalSlots: [true, true, false, false],
      moveIds: [57, 22, 0, 0], // MOVE_SURF, MOVE_VINE_WHIP
      attackerTypes: ["TYPE_GRASS", "TYPE_GRASS"],
      defenderTypes: ["TYPE_WATER", "TYPE_WATER"],
    });
    expect(slot).toBe(1);
  });

  it("(b) falls back to highest-power/lowest-slot when every legal move scores 0 (immune or non-damaging)", () => {
    // GROWL (Normal, power 0) is non-damaging -> score 0. TACKLE (Normal,
    // power 35) and HYPER_BEAM (Normal, power 150) are both immune (0x)
    // against a Ghost defender -> score 0. Every legal slot scores 0, so
    // the fallback rule (highest power, ties to the lower slot) applies:
    // HYPER_BEAM's 150 beats TACKLE's 35 and GROWL's 0.
    const slot = pickWinningFightSlot({
      legalSlots: [true, true, true, false],
      moveIds: [45, 33, 63, 0], // MOVE_GROWL, MOVE_TACKLE, MOVE_HYPER_BEAM
      attackerTypes: ["TYPE_NORMAL", "TYPE_NORMAL"],
      defenderTypes: ["TYPE_GHOST", "TYPE_GHOST"],
    });
    expect(slot).toBe(2);
  });

  it("(c) leaves \"full\" byte-identical for two seeds (winning-only change)", () => {
    const options = {
      maxFrames: 600_000,
      renderEvery: 0,
      policy: "full" as const,
      stopAtFirstRoundDecision: true,
    };
    // Recorded on the pre-change tree (this milestone's step 2 commit).
    expect(runSeed(0, options)).toMatchObject({
      frames: 11955,
      outcome: "OK",
      endState: "roundLost",
      maxBattleDepth: 0,
      battle: 1,
      turn: 20,
    });
    expect(runSeed(1, options)).toMatchObject({
      frames: 14345,
      outcome: "OK",
      endState: "roundLost",
      maxBattleDepth: 0,
      battle: 1,
      turn: 29,
    });
  });

  it("(c) leaves \"vanilla\" byte-identical for two seeds (winning-only change)", () => {
    const options = {
      maxFrames: 600_000,
      renderEvery: 0,
      policy: "vanilla" as const,
      stopAtFirstRoundDecision: true,
    };
    // Recorded on the pre-change tree (this milestone's step 2 commit).
    expect(runSeed(0, options)).toMatchObject({
      frames: 8499,
      outcome: "OK",
      endState: "roundLost",
      maxBattleDepth: 0,
      battle: 1,
      turn: 16,
    });
    // ISSUES #104 (engine half, fixed): the old 16970 pin was a grace-expiry
    // artifact -- seed 1's random terminal presses landed on the record
    // prompt's YES/cancel answer, which used to dead-end forever (no
    // declineFarewellReleaseAge, no re-chain), so the driver's 9000-frame
    // grace window ran out before the snapshot ever refreshed past the
    // dead-end tick. Now that YES/cancel arm the same continuation as NO
    // (factoryTerminalPresentation.ts's advanceFactoryTerminalRecordPrompt),
    // the round genuinely re-chains right after the answer is given, so the
    // frozen last-pre-chain snapshot lands much earlier, at the real frame.
    expect(runSeed(1, options)).toMatchObject({
      frames: 8550,
      outcome: "OK",
      endState: "roundLost",
      maxBattleDepth: 0,
      battle: 1,
      turn: 16,
    });
  });
});

describe("Milestone M-B step 2 part B, rung 1: winning declines every swap offer", () => {
  it("never enters the swap screen and every swap-offer note reads NO", () => {
    const notes: string[] = [];
    // Seed 0 reaches the swap-offer menu under "winning" well within 20,000
    // frames (the pre-fix ISSUES #99 pin above confirms this for seed 0).
    runSeed(0, {
      policy: "winning",
      maxFrames: 20_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    const swapOfferNotes = notes.filter((note) => note.startsWith("swap offer:"));
    expect(swapOfferNotes.length).toBeGreaterThan(0);
    expect(swapOfferNotes.every((note) => note === "swap offer: NO")).toBe(true);
    expect(notes.some((note) => note.startsWith("swap screen:"))).toBe(false);
  });
});

describe("Milestone M-B step 2 part C (tightened by part C2): winning switches out of a truly-walled matchup", () => {
  // MOVE_TACKLE (Normal, power 35) is 0x-immune against a Ghost defender;
  // MOVE_LICK (Ghost, power 20) is 2x super-effective (with STAB) against
  // that same Ghost defender -- confirmed against this repo's own
  // type-effectiveness table, mirroring how the part 2a pins above prove
  // the analogous Water/Grass combo. MOVE_SURF (Water, power 95) is only
  // 0.5x resisted (NOT immune) against a Water defender -- part C2's
  // tightening: a merely resisted active no longer counts as walled.
  const GHOST: readonly [string, string] = ["TYPE_GHOST", "TYPE_GHOST"];
  const WATER: readonly [string, string] = ["TYPE_WATER", "TYPE_WATER"];
  const GRASS: readonly [string, string] = ["TYPE_GRASS", "TYPE_GRASS"];
  const walledActive = { activeMoveIds: [33, 0, 0, 0], activeLegalSlots: [true, false, false, false] };
  const qualifyingBench = [
    { row: 1 as const, fainted: false, active: false, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
  ];

  it("(a) resisted-only active (0.5x, not immune) -> NO switch, even with a qualifying bench", () => {
    const row = pickWinningSwitchRow({
      activeMoveIds: [57, 0, 0, 0], // MOVE_SURF, 0.5x resisted vs Water -- not walled since part C2
      activeLegalSlots: [true, false, false, false],
      defenderTypes: WATER,
      bench: [
        { row: 1 as const, fainted: false, active: false, moveIds: [22, 0, 0, 0], types: GRASS, hp: 100, maxHp: 100 },
      ],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });

  it("(b) all-immune active + qualifying bench at 80% HP -> switch", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [{ ...qualifyingBench[0]!, hp: 80 }],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBe(1);
  });

  it("(c) same all-immune active + qualifying bench but at 30% HP -> no switch", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [{ ...qualifyingBench[0]!, hp: 30 }],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });

  it("bench at exactly 50% HP still switches (inclusive boundary)", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [{ ...qualifyingBench[0]!, hp: 50 }],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBe(1);
  });

  it("active has a >= 1x move (not walled) -> null even with a qualifying bench", () => {
    const row = pickWinningSwitchRow({
      activeMoveIds: [33, 0, 0, 0], // MOVE_TACKLE, neutral 1x vs Water
      activeLegalSlots: [true, false, false, false],
      defenderTypes: WATER,
      bench: qualifyingBench,
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });

  it("only one healthy party member remains -> null", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: qualifyingBench,
      healthyCount: 1,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });

  it("already switched against this opponent this battle -> null (no ping-pong)", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: qualifyingBench,
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: true,
    });
    expect(row).toBeNull();
  });

  it("picks the best-scoring qualifying row, ties to the lower row regardless of bench order", () => {
    // Row 2 and row 1 both carry LICK -> the same 20 x 2 x 1.5(STAB) = 60
    // score. Row 2 is listed FIRST in `bench` to prove the tie-break is
    // an explicit lower-row rule, not an artifact of iteration order.
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [
        { row: 2 as const, fainted: false, active: false, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
        { row: 1 as const, fainted: false, active: false, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
      ],
      healthyCount: 3,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBe(1);
  });

  it("skips fainted and active bench candidates even when they'd qualify", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [
        { row: 0 as const, fainted: false, active: true, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
        { row: 1 as const, fainted: true, active: false, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
      ],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });
});

describe("ISSUES #104 (driver): continuous-play outcome semantics retuned -- OK = frame budget reached while progressing, HANG = no progress for stallFrames", () => {
  // The engine half (fd30ee13) made the terminal record prompt's YES and
  // B-cancel answers continue exactly like NO, so a decided round now
  // ALWAYS re-chains into a fresh draft almost immediately -- the old
  // per-round grace timer's own expiry-HANG branch (PROGRESS ~1367's
  // seeds 328/34 pins, now retargeted below) is dead: master's own
  // consequence is that a continuous-play run never stops on its own
  // (`lobbyFreeRoam` is unreachable under the generated-orchestrator
  // route), so every seed used to run to `maxFrames` and get reported HANG
  // even while actively, honestly playing the whole time. Generic stall
  // detection (any of round identity, `battleIndex`, the player's turn
  // counter, the input-owning surface, or the decided-round phase going
  // `stallFrames` frames without moving) replaces it.
  it("(a) stall detection fires on the first frame with zero progress, and does not false-positive at the default window", () => {
    // stallFrames: 1 is the cheapest exact trip: frame 1 always "progresses"
    // (the surface baseline starts empty), so frame 2 -- the first frame
    // whose progress signals are unchanged from frame 1 -- is caught
    // immediately, deterministically, regardless of seed/policy.
    const stalled = runSeed(0, {
      policy: "winning",
      stallFrames: 1,
      maxFrames: 5_000,
      renderEvery: 0,
    });
    expect(stalled.outcome).toBe("HANG");
    expect(stalled.hangSurface).toBeTruthy();
    expect(stalled.frames).toBeLessThanOrEqual(3);

    // Positive control: the same seed at the DEFAULT stall window
    // (30_000) never gets close to stalling within a much smaller budget --
    // ordinary draft/battle/postwin play moves at least one progress
    // signal many times a second.
    const control = runSeed(0, {
      policy: "winning",
      maxFrames: 10_000,
      renderEvery: 0,
    });
    expect(control.outcome).not.toBe("HANG");
  });

  it("(b) a winning seed genuinely chains through >= 2 full round wins (carry >= 14), reported OK once --max-rounds is reached", () => {
    // Seed 34 winning: PROGRESS ~1367 found this seed reaches carry 14 --
    // TWO chained round wins, i.e. two separate decide -> continue ->
    // re-chain cycles -- well before its own eventual terminal dead-end
    // (now fixed). `maxRounds: 3` is a cheap, deterministic bound: it stops
    // right after the 3rd round decision instead of running to a multi-
    // hundred-thousand-frame budget, and is comfortably past the 2 wins
    // needed to prove carry >= 14 was genuinely reached, not just claimed.
    const result = runSeed(34, {
      policy: "winning",
      maxRounds: 3,
      renderEvery: 0,
    });
    expect(result.outcome).toBe("OK");
    expect(result.endState).toBe("max-rounds");
    expect(result.maxCarriedWinStreak).toBeGreaterThanOrEqual(14);
  });
});
