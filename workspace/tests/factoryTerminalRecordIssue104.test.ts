import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { GbaButton } from "../src/input.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { BattleSubmittedDecision } from "../src/engine/battleDecisionBoundary.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import {
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
import {
  advanceFactoryTerminalPresentation,
  createFactoryTerminalLossPresentation,
  factoryTerminalDeclineBoxGoneAge,
  factoryTerminalDeclineEdgeAge,
  factoryTerminalDeclineTextFirstAge,
  factoryTerminalRecordSavedBoxClearAge,
  factoryTerminalRecordSavedMessageActive,
  factoryTerminalRecordSavedTextFirstAge,
  FACTORY_LOSS_TERMINAL_PROFILE,
} from "../src/engine/factoryTerminalPresentation.ts";

// ---------------------------------------------------------------------------
// ISSUES #104: BattleFrontier_BattleFactoryLobby_EventScript_AskRecordBattle
// (reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryLobby/
// scripts.inc:76-94) sends ALL THREE record-prompt answers into the same
// EndRecordBattle farewell. `case 1` (NO) and `case MULTI_B_PRESSED`
// (cancel) both `goto EndRecordBattle` directly -- so cancel needs no stub,
// it was already identical to NO in the real script. `case 0` (YES) calls
// EventScript_RecordBattle -> EventScript_SaveBattle (`frontier_savebattle` +
// msgbox "{PLAYER}'s battle was recorded on the FRONTIER PASS.",
// scripts.inc:87-88, BattleFrontier_BattleTowerBattleRoom/scripts.inc:472-474)
// then falls into the same EndRecordBattle. Standing decision 2026-08-05:
// RECORD is stub-only, so the engine fix arms the same declineFarewellReleaseAge
// edge for YES/cancel as NO (factoryTerminalPresentation.ts's
// advanceFactoryTerminalRecordPrompt) and the core.ts generated-orchestrator
// re-chain gate now fires on any non-null recordChoice, not just "no". The
// YES-branch's own "battle was recorded" message stays un-ground-truthed and
// is deliberately omitted (open remainder).
// ---------------------------------------------------------------------------

const LOSS_COMMAND = { type: "roundLost", commandId: 1, battleIndex: 0 } as const;

function advanceTo(
  state: ReturnType<typeof createFactoryTerminalLossPresentation>,
  age: number,
) {
  while (state.age < age) {
    state = advanceFactoryTerminalPresentation(state, {});
  }
  return state;
}

/**
 * The canonical decline-line schedule pinned in
 * factoryTerminalPresentation.test.ts's own "declinedTerminal" (page-0 A at
 * 301, page-1 A at 602, record question A at 904 -> recordPromptReleaseAge
 * 905). Callers drive the remaining record-menu input from here.
 */
function terminalThroughPages() {
  let terminal = createFactoryTerminalLossPresentation(LOSS_COMMAND);
  terminal = advanceTo(terminal, 301);
  terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
  terminal = advanceTo(terminal, 602);
  terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
  terminal = advanceTo(terminal, 904);
  terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
  expect(terminal.recordPromptReleaseAge).toBe(905);
  return terminal;
}

describe("ISSUES #104: record prompt reducer -- YES/B-cancel continue like NO", () => {
  it("NO (unchanged pin): confirms at age 1757, arms declineFarewellReleaseAge 1757", () => {
    let terminal = terminalThroughPages();
    terminal = advanceTo(terminal, 1756);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    expect(terminal).toMatchObject({
      age: 1757,
      recordMenuCursor: 1,
      recordChoice: "no",
      declineFarewellReleaseAge: 1757,
    });
    expect(factoryTerminalDeclineEdgeAge(terminal)).toBe(1757);
  });

  it("YES: shows EventScript_SaveBattle's own message before falling into the shared farewell", () => {
    let terminal = terminalThroughPages();
    // Move the cursor onto YES well before the confirm tick, so the confirm
    // press still lands on age 1757 -- the same tick offset the NO pin uses.
    terminal = advanceTo(terminal, 930);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedUp: true });
    expect(terminal.recordMenuCursor).toBe(0);
    expect(terminal.recordChoice).toBeNull();
    terminal = advanceTo(terminal, 1756);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    expect(terminal).toMatchObject({
      age: 1757,
      recordMenuCursor: 0,
      recordChoice: "yes",
      declineFarewellReleaseAge: 1757,
      recordSavedDismissAge: null,
    });

    // The "battle was recorded" message (EventScript_SaveBattle's own msgbox,
    // BattleFrontier_BattleTowerLobby/scripts.inc:132-138) is the active page
    // -- not the shared farewell -- right after the confirm, showing the
    // exact source text (`{PLAYER}` -> PLAYER_NAME, "PLAYER" by default; pnm273).
    expect(factoryTerminalRecordSavedMessageActive(terminal)).toBe(true);
    expect(terminal.profile.recordSavedMessage).toEqual([
      "PLAYER’s battle was recorded",
      "on the FRONTIER PASS.",
    ]);
    expect(factoryTerminalRecordSavedBoxClearAge(terminal)).toBe(1757 + 21);
    expect(factoryTerminalRecordSavedTextFirstAge(terminal)).toBe(1757 + 22);

    // A press before the message's own input-ready gate (edge + 70, the
    // "input accepted exactly on the tick the last glyph draws" rule this
    // file's farewell already follows) does nothing -- the message is still
    // the active page.
    let held = advanceTo(terminal, 1825);
    held = advanceFactoryTerminalPresentation(held, { pressedA: true });
    expect(held.recordSavedDismissAge).toBeNull();
    expect(factoryTerminalRecordSavedMessageActive(held)).toBe(true);

    // Dismissing the message re-arms declineFarewellReleaseAge to THIS tick
    // -- the farewell's own (unchanged) typing/dismiss mechanics now drive
    // the real EndRecordBattle text starting here, one message-cycle later
    // than NO/cancel's edge.
    let recorded = advanceTo(held, 1826);
    recorded = advanceFactoryTerminalPresentation(recorded, { pressedA: true });
    expect(recorded).toMatchObject({
      recordSavedDismissAge: 1827,
      declineFarewellReleaseAge: 1827,
    });
    // The dismissed message stays the active page for declineTextClearDelay
    // more ticks (oracle-measured: the farewell's own box-clear, not an
    // instant swap) -- becoming inactive only once the farewell's own box
    // wipes.
    expect(factoryTerminalRecordSavedMessageActive(recorded)).toBe(true);
    const farewellBoxClearAge =
      1827 + FACTORY_LOSS_TERMINAL_PROFILE.declineTextClearDelay;
    let atFarewellBoxClear = advanceTo(recorded, farewellBoxClearAge);
    expect(factoryTerminalRecordSavedMessageActive(atFarewellBoxClear)).toBe(false);
    expect(factoryTerminalDeclineEdgeAge(recorded)).toBe(1827);
    expect(factoryTerminalDeclineTextFirstAge(recorded)).toBe(1827 + 4);

    // Farewell dismiss/box-gone chain uses the SAME declineInputDelay/
    // declineReleaseClearDelay constants NO's own pin uses, just relative to
    // this later (re-armed) edge instead of the original confirm tick.
    let dismissed = advanceTo(recorded, 1865);
    dismissed = advanceFactoryTerminalPresentation(dismissed, { pressedA: true });
    expect(dismissed.declineDismissAge).toBe(1866);
    expect(factoryTerminalDeclineBoxGoneAge(dismissed)).toBe(
      1866 + FACTORY_LOSS_TERMINAL_PROFILE.declineReleaseClearDelay,
    );
  });

  it("B-cancel: same age-1757 decline edge as NO -- the real script's cancel target already equals NO's, so this is not a stub", () => {
    let terminal = terminalThroughPages();
    terminal = advanceTo(terminal, 1756);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedB: true });
    expect(terminal).toMatchObject({
      age: 1757,
      recordMenuCursor: 1,
      recordChoice: "cancel",
      declineFarewellReleaseAge: 1757,
    });
    expect(factoryTerminalDeclineEdgeAge(terminal)).toBe(1757);

    let dismissed = advanceTo(terminal, 1858);
    dismissed = advanceFactoryTerminalPresentation(dismissed, { pressedA: true });
    expect(dismissed.declineDismissAge).toBe(1859);
    expect(factoryTerminalDeclineBoxGoneAge(dismissed)).toBe(
      1859 + FACTORY_LOSS_TERMINAL_PROFILE.declineReleaseClearDelay,
    );
  });
});

// ---------------------------------------------------------------------------
// tick()-level pin: a real generated-orchestrator round-end reaches
// pendingGeneratedRound !== null after YES/cancel, mirroring
// factoryRoundChaining.test.ts's own "driveTerminalToNextDraft" NO-only
// driver/carrier helpers (duplicated here in trimmed form -- this file is
// scoped away from that one).
// ---------------------------------------------------------------------------

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
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
  let state = createFactoryRoundBattleOrchestrator({
    id: `factory-terminal-issue104-carrier-${seed}`,
    rngValue: seed,
    factoryWinStreak: carry.factoryWinStreak,
    playerTrainerId: carry.playerTrainerId,
    battleTowerLevel50WinStreak: 0,
    factorySymbolsCount: carry.factorySymbolsCount,
    facilityState: { rentsCount: carry.rentsCount },
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

function stateAtDecidedRound(
  round: FactoryRoundBattleOrchestratorState,
  carry: FactoryCarry,
): EngineState {
  return {
    ...createInitialState(),
    factoryCarry: carry,
    factoryRoundBattleOrchestrator: round,
  };
}

/**
 * tick()s an EngineState parked at a decided round's terminal, answering the
 * record prompt with `choice` instead of always taking the default NO.
 * "yes" needs one extra UP press once the record menu accepts input (default
 * cursor is NO); "cancel" needs a single B once it does; "no" just mashes A
 * throughout, matching factoryRoundChaining.test.ts's own NO-only driver.
 */
function driveTerminalAnswering(
  state: EngineState,
  choice: "yes" | "no" | "cancel",
  maxTicks = 3_000,
): EngineState {
  let s = state;
  const A: ReadonlySet<GbaButton> = new Set(["A"]);
  const UP: ReadonlySet<GbaButton> = new Set(["UP"]);
  const B: ReadonlySet<GbaButton> = new Set(["B"]);
  const NONE: ReadonlySet<GbaButton> = new Set();
  let cursorMoved = choice !== "yes";
  let choiceSent = false;
  for (let i = 0; i < maxTicks; i += 1) {
    if (s.pendingGeneratedRound !== null) return s;
    const terminal = s.factoryTerminal;
    const readyForChoice =
      terminal !== null &&
      terminal.recordChoice === null &&
      terminal.recordPromptReleaseAge !== null &&
      terminal.age >= terminal.recordPromptReleaseAge + terminal.profile.recordMenuInputDelay;
    let buttons: ReadonlySet<GbaButton> = i % 2 === 0 ? A : NONE;
    if (readyForChoice && !choiceSent) {
      if (!cursorMoved) {
        buttons = UP;
        cursorMoved = true;
      } else {
        buttons = choice === "cancel" ? B : A;
        choiceSent = true;
      }
    }
    s = tick(s, buttons);
  }
  throw new Error(`terminal did not chain into the next draft within ${maxTicks} ticks (choice=${choice})`);
}

describe("ISSUES #104 (tick()-level): the generated-orchestrator re-chain also fires on YES/cancel", () => {
  it("YES re-chains into a fresh generated draft, same as NO", () => {
    const carry = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry, 17);
    expect(round1.round.rules.phase).toBe("roundComplete");

    const chained = driveTerminalAnswering(stateAtDecidedRound(round1, carry), "yes");
    expect(chained.pendingGeneratedRound).not.toBeNull();
    expect(chained.factoryTerminal).toBeNull();
    expect(chained.factoryRoundBattleOrchestrator).toBeNull();
    expect(chained.lobbyFreeRoam).toBeNull();
  });

  it("B-cancel re-chains into a fresh generated draft, same as NO", () => {
    const carry = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry, 17);

    const chained = driveTerminalAnswering(stateAtDecidedRound(round1, carry), "cancel");
    expect(chained.pendingGeneratedRound).not.toBeNull();
    expect(chained.factoryTerminal).toBeNull();
    expect(chained.factoryRoundBattleOrchestrator).toBeNull();
    expect(chained.lobbyFreeRoam).toBeNull();
  });
});
