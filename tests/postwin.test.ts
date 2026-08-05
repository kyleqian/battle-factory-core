import { describe, expect, it } from "vitest";
import {
  INITIAL_BATTLE_SCENE_STATE,
  TURN17_LOSS_INPUT_READY_DELAY,
  turn17LossDismissEligible,
} from "../src/engine/battleScene.ts";
import {
  BATTLE_IN_BATTLE_FIRST_ELAPSED,
  createInitialState,
  tick,
  type EngineState,
} from "../src/engine/core.ts";
import type { BattleParty } from "../src/engine/battleScenario.ts";
import { getFactoryOpponentCommentary } from "../src/engine/factoryCommentary.ts";
import { generateFactoryOpponent } from "../src/engine/factoryOpponentGeneration.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  advanceRoundController,
  completeBattlePresentation,
  createGeneratedFactoryRoundController,
  resolveRoundBattle,
} from "../src/engine/roundController.ts";
import {
  createBattleTerminalResolutionPresentation,
  storeBattleTerminalPresentationDismiss,
} from "../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import {
  BATTLE_2_SCENE_HANDOFF_ELAPSED,
  INITIAL_BATTLE_2_ROOM_STATE,
  JENSON_MSGBOX_LINE1,
  JENSON_MSGBOX_LINE2,
  MSGBOX_APPEAR_ELAPSED,
  WARP_FADE_TO_ROOM_ELAPSED,
  battleRoomQuote,
  battleRoomQuoteInputReady,
  msgboxPrintCompleteElapsed,
  opponentSetupExtraRngSteps,
} from "../src/engine/battleRoom.ts";
import {
  MESSAGE_CLOSING_TICKS,
  WALK_TICKS,
  walkVisual,
} from "../src/engine/prebattleRoom.ts";
import {
  advancePostwin,
  acceptPostwinContinuation,
  acceptPostwinDialoguePage,
  acceptPostwinHealDismiss,
  acceptPostwinSwapDecline,
  acceptPostwinRightThisWayDismiss,
  createPostwinStateFromOpponentRentalRecords,
  createPostwinStateFromRound,
  INITIAL_POSTWIN_STATE,
  POSTWIN_BATTLE_BLACK_AGE,
  POSTWIN_BATTLE_FADE_FIRST_AGE,
  POSTWIN_BATTLE_ROOM_FADE_OUT_AGE,
  POSTWIN_BATTLE_ROOM_FIRST_AGE,
  POSTWIN_CHALLENGE_BATTLE_WRITE_AGE,
  POSTWIN_COUNTER_ROOM_FIRST_AGE,
  POSTWIN_HEAL_INPUT_READY_AGE,
  POSTWIN_HEALED_PARTY_HP,
  POSTWIN_HEAL_TEXT_SETTLED_AGE,
  POSTWIN_IN_BATTLE_CLEAR_AGE,
  POSTWIN_OPPONENT_RENTALS_WRITE_AGE,
  POSTWIN_OPPONENT_RENTAL_IDS,
  POSTWIN_PARTY_HEAL_DELAY,
  POSTWIN_NEXT_BOX_CLEAR_DELAY,
  POSTWIN_NEXT_TEXT_FIRST_DELAY,
  POSTWIN_NEXT_TEXT_SETTLED_DELAY,
  POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY,
  POSTWIN_CONTINUATION_INPUT_READY_DELAY,
  POSTWIN_SCOUTING_INPUT_READY_DELAYS,
  POSTWIN_SWAP_INPUT_READY_DELAY,
  POSTWIN_SWAP_MENU_VISIBLE_DELAY,
  POSTWIN_RIGHT_THIS_WAY,
  POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY,
  POSTWIN_RIGHT_THIS_WAY_TEXT_FIRST_DELAY,
  POSTWIN_RIGHT_THIS_WAY_TEXT_SETTLED_DELAY,
  POSTWIN_SECOND_BLACK_AGE,
  postwinHealInputReady,
  postwinHealVisibleChars,
  postwinContinuationInputReady,
  postwinDialogueInputReady,
  postwinDialogueVisibleChars,
  postwinNextVisibleChars,
  postwinPhase,
  postwinRightThisWayInputReady,
  postwinRightThisWayVisibleChars,
  postwinRngSteps,
  movePostwinSwapCursor,
} from "../src/engine/postwin.ts";

describe("S8 Battle-1 postwin transition", () => {
  const outcomeDismiss = 10_000;

  function lossQuoteState(elapsed: number) {
    const state = createInitialState();
    const terminalResolution = storeBattleTerminalPresentationDismiss(
      storeBattleTerminalPresentationDismiss(
        createBattleTerminalResolutionPresentation({
          pendingBoundary: Object.freeze({
            kind: "terminal",
            outcome: "player-win",
          }),
          resultLines: ["Player defeated", "BUG CATCHER DESTIN!"],
          opponentLossLines: ["PLEASE I NEED", "SOME WATER"],
          confirmElapsed: 2,
          menuRedrawElapsed: 1,
        }),
        "faint",
        outcomeDismiss - 100,
      ),
      "result",
      outcomeDismiss,
    );
    return {
      ...state,
      draftScreen: {
        ...state.draftScreen,
        selectedIds: [1, 2, 3, 0, 0, 0],
      },
      rngMode: "frontierBattle" as const,
      battleScene: {
        ...INITIAL_BATTLE_SCENE_STATE,
        elapsed,
        fightSubmenu: {
          ...INITIAL_BATTLE_SCENE_STATE.fightSubmenu,
          openElapsed: 1,
          confirmElapsed: 2,
        },
        terminalResolution,
      },
    };
  }

  it("gates and stores the no-cursor loss-quote edge once, relative to the prior dismiss", () => {
    expect(turn17LossDismissEligible(
      outcomeDismiss + TURN17_LOSS_INPUT_READY_DELAY - 1,
      outcomeDismiss,
    )).toBe(false);
    expect(turn17LossDismissEligible(
      outcomeDismiss + TURN17_LOSS_INPUT_READY_DELAY,
      outcomeDismiss,
    )).toBe(true);

    const early = tick(
      lossQuoteState(outcomeDismiss + TURN17_LOSS_INPUT_READY_DELAY - 2),
      new Set(["A"]),
    );
    expect(early.postwin).toBeNull();
    expect(early.battleScene!.terminalResolution!.lossDismissElapsed).toBeNull();

    let accepted = tick(
      lossQuoteState(outcomeDismiss + TURN17_LOSS_INPUT_READY_DELAY - 1),
      new Set(["A"]),
    );
    const edge = outcomeDismiss + TURN17_LOSS_INPUT_READY_DELAY;
    expect(accepted.battleScene!.terminalResolution!.lossDismissElapsed).toBe(edge);
    expect(accepted.postwin).toEqual(INITIAL_POSTWIN_STATE);
    accepted = tick(accepted, new Set(["A"]));
    expect(accepted.battleScene!.terminalResolution!.lossDismissElapsed).toBe(edge);
  });

  it("uses the generated opponent held by the round controller for scouting", () => {
    const generated = generateFactoryOpponent({
      rngValue: 3,
      factoryWinStreak: 0,
      battleIndex: 0,
      storedTrainerIds: [],
      savedRentalSetIds: [110, 155, 140, 168, 197, 147],
      playerTrainerId: 0x1234_5678,
      battleTowerLevel50WinStreak: 0,
    });
    const battleParty = (prefix: string): BattleParty =>
      generated.party.map((member, index) => ({
        id: `${prefix}-${index}`,
        species: member.speciesName,
        maxHp: member.maxHP,
        hp: member.hp,
        status: "none" as const,
      })) as unknown as BattleParty;
    const roundController = createGeneratedFactoryRoundController({
      id: "generated-commentary-presentation",
      playerParty: battleParty("player"),
      playerRentalRecords: generated.opponents,
      opponent: {
        id: "generated-opponent",
        trainerName: generated.trainerName,
        party: battleParty("opponent"),
        rentalRecords: generated.opponents,
      },
      rngValue: generated.rngValue,
    });
    const accepted = tick({
      ...lossQuoteState(outcomeDismiss + TURN17_LOSS_INPUT_READY_DELAY - 1),
      roundController,
    }, new Set(["A"]));
    const expected = getFactoryOpponentCommentary(generated.party);
    const staged = createPostwinStateFromOpponentRentalRecords(generated.opponents);

    expect(accepted.postwin?.scoutingLines.slice(1, 3)).toEqual([
      expected.favoriteTypeLines,
      expected.battleStyleLines,
    ]);
    expect(accepted.postwin).toEqual(staged);
    expect(accepted.postwin?.scoutingLines.slice(1, 3)).not.toEqual(
      INITIAL_POSTWIN_STATE.scoutingLines.slice(1, 3),
    );
  });

  it("keeps the canonical rental-record stage equal to the frozen postwin state", () => {
    expect(createPostwinStateFromOpponentRentalRecords([
      { setId: 153, personality: 24, fixedIv: 3, abilitySlot: 0 },
      { setId: 179, personality: 19, fixedIv: 3, abilitySlot: 1 },
      { setId: 181, personality: 6, fixedIv: 3, abilitySlot: 0 },
    ])).toEqual(INITIAL_POSTWIN_STATE);
  });

  it("freezes every generated postwin row from one noncanonical typed win snapshot", () => {
    const generated = generateFactoryOpponent({
      rngValue: 3,
      factoryWinStreak: 0,
      battleIndex: 0,
      storedTrainerIds: [],
      savedRentalSetIds: [110, 155, 140, 168, 197, 147],
      playerTrainerId: 0x1234_5678,
      battleTowerLevel50WinStreak: 0,
    });
    const battleParty = (prefix: string): BattleParty =>
      generated.party.map((member, index) => ({
        id: `${prefix}-${index}`,
        species: member.speciesName,
        maxHp: member.maxHP,
        hp: member.hp,
        status: "none" as const,
      })) as unknown as BattleParty;
    let round = createGeneratedFactoryRoundController({
      id: "generated-postwin-state-only",
      playerParty: battleParty("player"),
      playerRentalRecords: generated.opponents,
      opponent: {
        id: "generated-postwin-opponent",
        trainerName: generated.trainerName,
        party: battleParty("opponent"),
        rentalRecords: generated.opponents,
      },
      rngValue: generated.rngValue,
    });
    round = completeBattlePresentation(round, {
      commandId: round.presentation!.command.commandId,
    });
    round = advanceRoundController(round);
    const terminalPlayerParty = round.rules.playerParty.map(
      (member, index) => ({
        ...member,
        hp: [11, 22, 33][index]!,
      }),
    ) as unknown as BattleParty;
    round = resolveRoundBattle(round, {
      outcome: "win",
      playerParty: terminalPlayerParty,
      opponentParty: round.rules.currentOpponent.party,
      rngValue: round.rules.rngValue,
    });
    const beforeRules = round.rules;
    const state = createPostwinStateFromRound(
      round,
      {} as unknown as BattleResolutionPresentationRenderView,
    );
    const opponentSetIds = generated.opponents.map(({ setId }) => setId);
    const commentary = getFactoryOpponentCommentary(generated.party);

    expect(opponentSetIds).not.toEqual(POSTWIN_OPPONENT_RENTAL_IDS);
    expect(state).toMatchObject({
      challengeBattleNum: 0,
      challengeBattleNumAfterWrite: 1,
      opponentRentalMonIds: opponentSetIds,
      opponentRentalMonIdsAfterWrite: opponentSetIds,
      playerPartyHp: [11, 22, 33],
      healedPlayerPartyHp: terminalPlayerParty.map(({ maxHp }) => maxHp),
    });
    expect(state.scoutingLines.slice(1, 3)).toEqual([
      commentary.favoriteTypeLines,
      commentary.battleStyleLines,
    ]);

    let advanced = state;
    while (advanced.elapsed < POSTWIN_OPPONENT_RENTALS_WRITE_AGE) {
      advanced = advancePostwin(advanced);
    }
    expect(advanced.challengeBattleNum).toBe(1);
    expect(advanced.opponentRentalMonIds).toEqual(opponentSetIds);
    expect(round.rules).toBe(beforeRules);

    advanced = {
      ...advanced,
      healDismissElapsed: advanced.elapsed,
    };
    for (let i = 0; i < POSTWIN_PARTY_HEAL_DELAY; i += 1) {
      advanced = advancePostwin(advanced);
    }
    expect(advanced.playerPartyHp).toEqual(
      terminalPlayerParty.map(({ maxHp }) => maxHp),
    );
    expect(round.rules).toBe(beforeRules);
  });

  it("keeps every visual ownership boundary relative to the stored edge", () => {
    expect(postwinPhase(POSTWIN_BATTLE_FADE_FIRST_AGE - 1)).toBe("battleHold");
    expect(postwinPhase(POSTWIN_BATTLE_FADE_FIRST_AGE)).toBe("battleFade");
    expect(postwinPhase(POSTWIN_BATTLE_BLACK_AGE)).toBe("blackAfterBattle");
    expect(postwinPhase(POSTWIN_BATTLE_ROOM_FIRST_AGE)).toBe("battleRoom");
    expect(postwinPhase(POSTWIN_BATTLE_ROOM_FADE_OUT_AGE)).toBe("battleRoom");
    expect(postwinPhase(POSTWIN_SECOND_BLACK_AGE)).toBe("blackBeforeCounter");
    expect(postwinPhase(POSTWIN_COUNTER_ROOM_FIRST_AGE)).toBe("counterRoom");
  });

  it("clears inBattle at +43 and resumes the VBlank LCG on that same tick", () => {
    const seed = 0x823d181b;
    const state = {
      ...createInitialState(),
      rngMode: "frontierBattle" as const,
      rngValue: seed,
      battleScene: INITIAL_BATTLE_SCENE_STATE,
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: POSTWIN_IN_BATTLE_CLEAR_AGE - 1,
      },
    };
    const next = tick(state, new Set());
    expect(next.postwin!.elapsed).toBe(POSTWIN_IN_BATTLE_CLEAR_AGE);
    expect(next.rngMode).toBe("vblank");
    expect(next.battleScene).toBeNull();
    expect(next.rngValue).toBe(advanceRngValue(advanceRngValue(seed)));
    expect(postwinRngSteps(42)).toBe(0);
    expect(postwinRngSteps(43)).toBe(2);
    expect(postwinRngSteps(44)).toBe(1);
    expect(postwinRngSteps(45)).toBe(2);
    expect(postwinRngSteps(46)).toBe(3);
    expect(postwinRngSteps(105)).toBe(3);
    expect(postwinRngSteps(106)).toBe(4);
  });

  it("keeps VBlank ownership through battle setup, adds source-relative opponent draws, then freezes at CB2_InitBattleInternal", () => {
    expect(opponentSetupExtraRngSteps({ phase: "settled", elapsed: 0 })).toBe(56);
    expect(opponentSetupExtraRngSteps({ phase: "settled", elapsed: 11 })).toBe(32);
    expect(opponentSetupExtraRngSteps({ phase: "settled", elapsed: 18 })).toBe(190);
    expect(opponentSetupExtraRngSteps({ phase: "settled", elapsed: 26 })).toBe(1);
    expect(opponentSetupExtraRngSteps({ phase: "settled", elapsed: 27 })).toBe(0);

    const seed = 0x12345678;
    let state: EngineState = {
      ...createInitialState(),
      battleScene: {
        ...INITIAL_BATTLE_SCENE_STATE,
        elapsed: BATTLE_IN_BATTLE_FIRST_ELAPSED - 2,
      },
    };
    state = tick(state, new Set());
    expect(state.battleScene!.elapsed).toBe(BATTLE_IN_BATTLE_FIRST_ELAPSED - 1);
    expect(state.rngMode).toBe("vblank");
    state = { ...state, rngValue: seed };
    state = tick(state, new Set());
    expect(state.battleScene!.elapsed).toBe(BATTLE_IN_BATTLE_FIRST_ELAPSED);
    expect(state.rngValue).toBe(advanceRngValue(seed));
    expect(state.rngMode).toBe("frontierBattle");
    state = tick(state, new Set());
    expect(state.rngValue).toBe(advanceRngValue(seed));
  });

  it("applies the RAM-pinned challenge/opponent bookkeeping at relative ages", () => {
    let state = INITIAL_POSTWIN_STATE;
    for (let age = 1; age < POSTWIN_CHALLENGE_BATTLE_WRITE_AGE; age += 1) {
      state = advancePostwin(state);
    }
    expect(state.challengeBattleNum).toBe(0);
    state = advancePostwin(state);
    expect(state.challengeBattleNum).toBe(1);

    while (state.elapsed < POSTWIN_OPPONENT_RENTALS_WRITE_AGE - 1) {
      state = advancePostwin(state);
    }
    expect(state.opponentRentalMonIds).toEqual([153, 179, 181]);
    state = advancePostwin(state);
    expect(state.opponentRentalMonIds).toEqual(POSTWIN_OPPONENT_RENTAL_IDS);
  });

  it("pins heal typing, final-glyph settle, and the later true input-ready boundary", () => {
    expect(POSTWIN_HEAL_TEXT_SETTLED_AGE).toBe(191);
    expect(postwinHealVisibleChars(139)).toBe(0);
    expect(postwinHealVisibleChars(140)).toBe(1);
    expect(postwinHealVisibleChars(POSTWIN_HEAL_TEXT_SETTLED_AGE))
      .toBe(52);
    expect(postwinHealInputReady(POSTWIN_HEAL_INPUT_READY_AGE - 1)).toBe(false);
    expect(postwinHealInputReady(POSTWIN_HEAL_INPUT_READY_AGE)).toBe(true);
    expect(POSTWIN_HEAL_INPUT_READY_AGE).toBe(194);
  });

  it("treats the long heal hold as a genuine one-shot input gate and stores any accepted edge", () => {
    const earlyBase = {
      ...createInitialState(),
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: POSTWIN_HEAL_INPUT_READY_AGE - 2,
      },
    };
    const early = tick(earlyBase, new Set(["A"]));
    expect(early.postwin!.elapsed).toBe(POSTWIN_HEAL_INPUT_READY_AGE - 1);
    expect(early.postwin!.healDismissElapsed).toBeNull();

    const firstAccepted = tick({
      ...early,
      keyRepeat: createInitialState().keyRepeat,
    }, new Set(["A"]));
    expect(firstAccepted.postwin!.healDismissElapsed)
      .toBe(POSTWIN_HEAL_INPUT_READY_AGE);

    const delayedAge = 2_000;
    const delayed = tick({
      ...createInitialState(),
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: delayedAge - 1,
      },
    }, new Set(["A"]));
    expect(delayed.postwin!.healDismissElapsed).toBe(delayedAge);
    const heldAgain = tick(delayed, new Set(["A"]));
    expect(heldAgain.postwin!.healDismissElapsed).toBe(delayedAge);
  });

  it("heals the party at dismiss+163 while preserving VBlank RNG ownership", () => {
    const dismissAge = 500;
    const before = {
      ...INITIAL_POSTWIN_STATE,
      elapsed: dismissAge + POSTWIN_PARTY_HEAL_DELAY - 1,
      healDismissElapsed: dismissAge,
    };
    expect(before.playerPartyHp).toEqual([0, 27, 153]);
    const healed = advancePostwin(before);
    expect(healed.elapsed).toBe(dismissAge + POSTWIN_PARTY_HEAL_DELAY);
    expect(healed.playerPartyHp).toEqual(POSTWIN_HEALED_PARTY_HP);

    const seed = 0x10203040;
    const engine = tick({
      ...createInitialState(),
      rngMode: "vblank",
      rngValue: seed,
      postwin: before,
    }, new Set());
    expect(engine.rngMode).toBe("vblank");
    expect(engine.rngValue).toBe(advanceRngValue(seed));
    expect(postwinRngSteps(engine.postwin!.elapsed)).toBe(1);
  });

  it("keeps box clear, prompt typing, menu visibility, and input readiness relative to the stored heal edge", () => {
    const dismissAge = 2_000;
    const at = (delay: number) => ({
      ...acceptPostwinHealDismiss({
        ...INITIAL_POSTWIN_STATE,
        elapsed: dismissAge,
      }),
      elapsed: dismissAge + delay,
    });

    expect(POSTWIN_NEXT_BOX_CLEAR_DELAY).toBe(166);
    expect(postwinNextVisibleChars(at(POSTWIN_NEXT_BOX_CLEAR_DELAY))).toBe(0);
    expect(postwinNextVisibleChars(at(POSTWIN_NEXT_TEXT_FIRST_DELAY))).toBe(1);
    expect(postwinNextVisibleChars(at(POSTWIN_NEXT_TEXT_SETTLED_DELAY))).toBe(36);
    expect(at(POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY - 1).continuationCursorPos)
      .toBeNull();
    expect(postwinContinuationInputReady(
      at(POSTWIN_CONTINUATION_INPUT_READY_DELAY - 1),
    )).toBe(false);
    expect(postwinContinuationInputReady(
      at(POSTWIN_CONTINUATION_INPUT_READY_DELAY),
    )).toBe(true);

    const menuShown = advancePostwin({
      ...at(POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY - 1),
      continuationCursorPos: null,
    });
    expect(menuShown.continuationCursorPos).toBe(0);
  });

  it("accepts GO ON only at the stored menu edge, including arbitrary delayed confirmation", () => {
    const healEdge = 2_000;
    const ready = healEdge + POSTWIN_CONTINUATION_INPUT_READY_DELAY;
    const menuState = {
      ...INITIAL_POSTWIN_STATE,
      elapsed: ready - 1,
      healDismissElapsed: healEdge,
      continuationCursorPos: 0 as const,
    };
    expect(acceptPostwinContinuation(menuState)).toBe(menuState);

    const accepted = tick({
      ...createInitialState(),
      postwin: menuState,
    }, new Set(["A"])).postwin!;
    expect(accepted.elapsed).toBe(ready);
    expect(accepted.continuationConfirmElapsed).toBe(ready);
    expect(accepted.dialoguePage).toBe(1);
    expect(accepted.dialoguePageEdgeElapsed).toBe(ready);

    const delayedReady = ready + 500;
    const delayed = tick({
      ...createInitialState(),
      postwin: {
        ...menuState,
        elapsed: delayedReady - 1,
      },
    }, new Set(["A"])).postwin!;
    expect(delayed.continuationConfirmElapsed).toBe(delayedReady);
    expect(delayed.dialoguePageEdgeElapsed).toBe(delayedReady);
  });

  it("pins each scouting page's final-glyph handoff and true A boundary relative to its own stored edge", () => {
    for (let page = 1; page <= 3; page += 1) {
      const edge = 10_000 + page * 1_000;
      const readyDelay = POSTWIN_SCOUTING_INPUT_READY_DELAYS[page - 1]!;
      const at = (delay: number) => ({
        ...INITIAL_POSTWIN_STATE,
        elapsed: edge + delay,
        continuationConfirmElapsed: page === 1 ? edge : edge - 500,
        dialoguePage: page as 1 | 2 | 3,
        dialoguePageEdgeElapsed: edge,
      });
      expect(postwinDialogueVisibleChars(at(3))).toBe(0);
      expect(postwinDialogueVisibleChars(at(4))).toBe(1);
      expect(postwinDialogueInputReady(at(readyDelay - 1))).toBe(false);
      expect(acceptPostwinDialoguePage(at(readyDelay - 1)))
        .toEqual(at(readyDelay - 1));
      expect(postwinDialogueInputReady(at(readyDelay))).toBe(true);
      const accepted = acceptPostwinDialoguePage(at(readyDelay));
      expect(accepted.dialoguePage).toBe(page + 1);
      expect(accepted.dialoguePageEdgeElapsed).toBe(edge + readyDelay);
    }
  });

  it("separates swap-offer menu visibility from its later input-ready boundary", () => {
    const edge = 20_000;
    const at = (delay: number) => ({
      ...INITIAL_POSTWIN_STATE,
      elapsed: edge + delay,
      continuationConfirmElapsed: edge - 1_000,
      dialoguePage: 4 as const,
      dialoguePageEdgeElapsed: edge,
      swapCursorPos: null,
    });
    expect(POSTWIN_SWAP_MENU_VISIBLE_DELAY).toBe(66);
    expect(POSTWIN_SWAP_INPUT_READY_DELAY).toBe(70);
    expect(postwinDialogueInputReady(at(POSTWIN_SWAP_MENU_VISIBLE_DELAY)))
      .toBe(false);
    expect(postwinDialogueInputReady(at(POSTWIN_SWAP_INPUT_READY_DELAY - 1)))
      .toBe(false);
    expect(postwinDialogueInputReady(at(POSTWIN_SWAP_INPUT_READY_DELAY)))
      .toBe(true);
    const visible = advancePostwin(at(POSTWIN_SWAP_MENU_VISIBLE_DELAY - 1));
    expect(visible.swapCursorPos).toBe(0);
    expect(visible.swapCursorDisplayPos).toBe(0);
  });

  it("rejects early swap DOWN/A, accepts delayed NO, and copies its cursor one VBlank later", () => {
    const edge = 20_000;
    const at = (delay: number) => ({
      ...INITIAL_POSTWIN_STATE,
      elapsed: edge + delay,
      continuationConfirmElapsed: edge - 1_000,
      dialoguePage: 4 as const,
      dialoguePageEdgeElapsed: edge,
      swapCursorPos: 0 as const,
      swapCursorDisplayPos: 0 as const,
    });
    const early = at(POSTWIN_SWAP_INPUT_READY_DELAY - 1);
    expect(movePostwinSwapCursor(early, 1)).toBe(early);
    expect(acceptPostwinSwapDecline({ ...early, swapCursorPos: 1 })).toEqual({
      ...early,
      swapCursorPos: 1,
    });

    const delayedAge = edge + POSTWIN_SWAP_INPUT_READY_DELAY + 500;
    const delayed = {
      ...at(POSTWIN_SWAP_INPUT_READY_DELAY),
      elapsed: delayedAge,
    };
    const moved = movePostwinSwapCursor(delayed, 1);
    expect(moved.swapCursorPos).toBe(1);
    expect(moved.swapCursorDisplayPos).toBe(0);
    expect(moved.swapCursorMoveElapsed).toBe(delayedAge);
    const copied = advancePostwin(moved);
    expect(copied.swapCursorDisplayPos).toBe(1);

    const declined = acceptPostwinSwapDecline({
      ...copied,
      elapsed: delayedAge + 30,
    });
    expect(declined.swapDeclineElapsed).toBe(delayedAge + 30);
    expect(acceptPostwinSwapDecline({
      ...declined,
      elapsed: delayedAge + 31,
    }).swapDeclineElapsed).toBe(delayedAge + 30);
  });

  it("pins the decline message's final glyph and true held input boundary to the stored NO edge", () => {
    const declineEdge = 30_000;
    const at = (delay: number) => ({
      ...INITIAL_POSTWIN_STATE,
      elapsed: declineEdge + delay,
      dialoguePage: 4 as const,
      dialoguePageEdgeElapsed: declineEdge - 1_000,
      swapCursorPos: 1 as const,
      swapCursorDisplayPos: 1 as const,
      swapDeclineElapsed: declineEdge,
    });
    expect(POSTWIN_RIGHT_THIS_WAY_TEXT_FIRST_DELAY).toBe(4);
    expect(POSTWIN_RIGHT_THIS_WAY_TEXT_SETTLED_DELAY).toBe(26);
    expect(POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY).toBe(28);
    expect(postwinRightThisWayVisibleChars(at(3))).toBe(0);
    expect(postwinRightThisWayVisibleChars(at(4))).toBe(1);
    expect(postwinRightThisWayVisibleChars(
      at(POSTWIN_RIGHT_THIS_WAY_TEXT_SETTLED_DELAY),
    )).toBe(POSTWIN_RIGHT_THIS_WAY.length);
    expect(postwinRightThisWayInputReady(
      at(POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY - 1),
    )).toBe(false);
    expect(postwinRightThisWayInputReady(
      at(POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY),
    )).toBe(true);
  });

  it("keeps ordinary VBlank RNG ownership and healed party state across NO and the held message", () => {
    const seed = 0xa1b2c3d4;
    const state = {
      ...createInitialState(),
      rngMode: "vblank" as const,
      rngValue: seed,
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: 6_029,
        playerPartyHp: POSTWIN_HEALED_PARTY_HP,
        dialoguePage: 4 as const,
        dialoguePageEdgeElapsed: 5_600,
        swapCursorPos: 1 as const,
        swapCursorDisplayPos: 1 as const,
      },
    };
    const declined = tick(state, new Set(["A"]));
    expect(declined.postwin!.swapDeclineElapsed).toBe(6_030);
    expect(declined.postwin!.playerPartyHp).toEqual(POSTWIN_HEALED_PARTY_HP);
    expect(declined.rngMode).toBe("vblank");
    expect(declined.rngValue).toBe(advanceRngValue(seed));
    expect(postwinRngSteps(6_030)).toBe(1);

    const held = tick(declined, new Set());
    expect(held.postwin!.swapDeclineElapsed).toBe(6_030);
    expect(held.postwin!.playerPartyHp).toEqual(POSTWIN_HEALED_PARTY_HP);
    expect(held.rngValue).toBe(advanceRngValue(advanceRngValue(seed)));
    expect(postwinRngSteps(held.postwin!.elapsed)).toBe(1);
  });

  it("rejects the tick before the guide-message gate, stores arbitrary accepted/delayed edges, and starts the shared walk clock", () => {
    const declineEdge = 1_000;
    const guideState = (elapsed: number): EngineState => ({
      ...createInitialState(),
      rngMode: "vblank",
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed,
        healDismissElapsed: 1,
        playerPartyHp: POSTWIN_HEALED_PARTY_HP,
        dialoguePage: 4,
        dialoguePageEdgeElapsed: 900,
        swapCursorPos: 1,
        swapCursorDisplayPos: 1,
        swapDeclineElapsed: declineEdge,
      },
    });

    const early = tick(
      guideState(declineEdge + POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY - 1),
      new Set(["A"]),
    );
    expect(early.postwin!.rightThisWayDismissElapsed).toBeNull();
    expect(early.prebattleRoom).toBeNull();

    const accepted = tick(
      guideState(declineEdge + POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY),
      new Set(["A"]),
    );
    expect(accepted.postwin!.rightThisWayDismissElapsed)
      .toBe(declineEdge + POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY + 1);
    expect(accepted.prebattleRoom)
      .toEqual({ phase: "messageClosing", elapsed: 0 });

    const delayedBase = declineEdge + 200;
    const delayed = tick(guideState(delayedBase), new Set(["A"]));
    expect(delayed.postwin!.rightThisWayDismissElapsed).toBe(delayedBase + 1);
    expect(acceptPostwinRightThisWayDismiss({
      ...delayed.postwin!,
      elapsed: delayedBase + 20,
    }).rightThisWayDismissElapsed).toBe(delayedBase + 1);
  });

  it("reuses relative close/walk/warp/room clocks and settles on JENSON's input-ready quote", () => {
    const declineEdge = 4_000;
    let state = tick({
      ...createInitialState(),
      rngMode: "vblank",
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: declineEdge + POSTWIN_RIGHT_THIS_WAY_INPUT_READY_DELAY,
        healDismissElapsed: 1,
        playerPartyHp: POSTWIN_HEALED_PARTY_HP,
        dialoguePage: 4,
        dialoguePageEdgeElapsed: declineEdge - 100,
        swapCursorPos: 1,
        swapCursorDisplayPos: 1,
        swapDeclineElapsed: declineEdge,
      },
    }, new Set(["A"]));
    const dismissEdge = state.postwin!.rightThisWayDismissElapsed!;

    for (let i = 1; i < MESSAGE_CLOSING_TICKS; i += 1) {
      state = tick(state, new Set());
    }
    expect(state.prebattleRoom).toEqual({ phase: "messageClosing", elapsed: 1 });
    state = tick(state, new Set());
    expect(state.prebattleRoom).toEqual({ phase: "walking", elapsed: 0 });

    for (let i = 0; i < WALK_TICKS; i += 1) state = tick(state, new Set());
    expect(state.prebattleRoom).toEqual({ phase: "warpFade", elapsed: 0 });
    for (let i = 0; i < WARP_FADE_TO_ROOM_ELAPSED; i += 1) {
      state = tick(state, new Set());
    }
    expect(state.prebattleRoom).toBeNull();
    expect(state.battleRoom).toEqual({
      phase: "entering",
      elapsed: 0,
      encounter: "jenson",
    });

    expect(battleRoomQuote(state.battleRoom!))
      .toEqual([JENSON_MSGBOX_LINE1, JENSON_MSGBOX_LINE2]);
    expect(msgboxPrintCompleteElapsed(state.battleRoom!))
      .toBe(MSGBOX_APPEAR_ELAPSED + 32);
    const quoteReady = msgboxPrintCompleteElapsed(state.battleRoom!);
    for (let i = 0; i < quoteReady; i += 1) state = tick(state, new Set(["A"]));
    expect(state.battleRoom).toEqual({
      phase: "msgboxIdle",
      elapsed: 0,
      encounter: "jenson",
    });
    expect(state.postwin!.rightThisWayDismissElapsed).toBe(dismissEdge);
  });

  it("pins the return-path attendant animation alternation and relative warp RNG bursts", () => {
    expect(walkVisual(0).attendantFrame).toBe(7);
    expect(walkVisual(0, true).attendantFrame).toBe(8);
    expect(walkVisual(16).attendantFrame).toBe(8);
    expect(walkVisual(16, true).attendantFrame).toBe(7);
    expect(walkVisual(32).attendantFrame).toBe(5);
    expect(walkVisual(32, true).attendantFrame).toBe(6);
    expect(walkVisual(48).attendantFrame).toBe(6);
    expect(walkVisual(48, true).attendantFrame).toBe(5);
    expect(walkVisual(64, true).attendantVisible).toBe(false);

    const edge = 12_000;
    expect(postwinRngSteps(edge + 108, null, edge)).toBe(1);
    expect(postwinRngSteps(edge + 109, null, edge)).toBe(3);
    expect(postwinRngSteps(edge + 110, null, edge)).toBe(4);
    expect(postwinRngSteps(edge + 111, null, edge)).toBe(1);
  });

  it("keeps VBlank ownership and applies the GO ON source burst relative to the accepted edge", () => {
    const edge = 10_000;
    expect(postwinRngSteps(edge, edge)).toBe(1);
    expect(postwinRngSteps(edge + 1, edge)).toBe(5);
    expect(postwinRngSteps(edge + 2, edge)).toBe(1);

    const seed = 0x91a2b3c4;
    const next = tick({
      ...createInitialState(),
      rngMode: "vblank",
      rngValue: seed,
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: edge,
        healDismissElapsed: 1,
        continuationCursorPos: 0,
        continuationConfirmElapsed: edge,
        dialoguePage: 1,
        dialoguePageEdgeElapsed: edge,
      },
    }, new Set());
    let expected = seed;
    for (let i = 0; i < 5; i += 1) expected = advanceRngValue(expected);
    expect(next.rngMode).toBe("vblank");
    expect(next.rngValue).toBe(expected);
  });

  it("rejects the early JENSON quote edge, accepts the first ready and delayed edges, and preserves encounter identity", () => {
    expect(battleRoomQuoteInputReady({
      ...INITIAL_BATTLE_2_ROOM_STATE,
      phase: "msgboxIdle",
      elapsed: 1,
    })).toBe(false);
    expect(battleRoomQuoteInputReady({
      ...INITIAL_BATTLE_2_ROOM_STATE,
      phase: "msgboxIdle",
      elapsed: 2,
    })).toBe(true);

    const base: EngineState = {
      ...createInitialState(),
      draftScreen: {
        ...createInitialState().draftScreen,
        selectedIds: [1, 2, 3, 0, 0, 0],
      },
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: 10_000,
        playerPartyHp: POSTWIN_HEALED_PARTY_HP,
        rightThisWayDismissElapsed: 9_000,
      },
    };
    const early = tick({
      ...base,
      battleRoom: { ...INITIAL_BATTLE_2_ROOM_STATE, phase: "msgboxIdle", elapsed: 1 },
    }, new Set(["A"]));
    expect(early.battleRoom).toEqual({
      ...INITIAL_BATTLE_2_ROOM_STATE,
      phase: "msgboxIdle",
      elapsed: 2,
    });

    for (const elapsed of [2, 500]) {
      const accepted = tick({
        ...base,
        battleRoom: { ...INITIAL_BATTLE_2_ROOM_STATE, phase: "msgboxIdle", elapsed },
      }, new Set(["A"]));
      expect(accepted.battleRoom).toEqual({
        ...INITIAL_BATTLE_2_ROOM_STATE,
        phase: "msgboxClosing",
        elapsed: 0,
      });
    }
  });

  it("pins JENSON's rejection loops and carries genuine Battle 2 identity, healed party, and ONIX moves through the setup handoff", () => {
    const steps = (elapsed: number) => opponentSetupExtraRngSteps({
      ...INITIAL_BATTLE_2_ROOM_STATE,
      phase: "settled",
      elapsed,
    });
    expect([steps(0), steps(8), steps(15), steps(23)])
      .toEqual([50, 22, 4, 1]);
    expect(steps(1)).toBe(0);
    expect(BATTLE_2_SCENE_HANDOFF_ELAPSED).toBe(209);

    let state: EngineState = {
      ...createInitialState(),
      draftScreen: {
        ...createInitialState().draftScreen,
        selectedIds: [1, 2, 3, 0, 0, 0],
      },
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: 20_000,
        playerPartyHp: POSTWIN_HEALED_PARTY_HP,
        rightThisWayDismissElapsed: 19_000,
      },
      battleRoom: {
        ...INITIAL_BATTLE_2_ROOM_STATE,
        phase: "settled",
        elapsed: 0,
      },
    };
    for (let i = 0; i < BATTLE_2_SCENE_HANDOFF_ELAPSED; i += 1) {
      state = tick(state, new Set());
    }
    expect(state.postwin).toBeNull();
    expect(state.battleRoom).toBeNull();
    expect(state.battleScene?.encounter).toBe("jenson");
    expect(state.battleSetup).toMatchObject({
      battleNumber: 2,
      encounter: "jenson",
      trainerClass: "FISHERMAN",
      trainerName: "JENSON",
      opponentLead: "KABUTO",
      playerParty: ["ONIX", "MAGBY", "BAYLEEF"],
      playerPartyHp: [117, 138, 153],
    });
    expect(state.battleSetup?.activeMonMoveset.moveIds)
      .toEqual([157, 20, 225, 201]);
    expect(state.battleScene?.fightSubmenu.activeMonMoveset.moveIds)
      .toEqual([157, 20, 225, 201]);
  });
});
