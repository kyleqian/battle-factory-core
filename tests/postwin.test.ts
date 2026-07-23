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
import { advanceRngValue } from "../src/engine/rng.ts";
import { opponentSetupExtraRngSteps } from "../src/engine/battleRoom.ts";
import {
  advancePostwin,
  acceptPostwinContinuation,
  acceptPostwinDialoguePage,
  acceptPostwinHealDismiss,
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
  POSTWIN_SECOND_BLACK_AGE,
  postwinHealInputReady,
  postwinHealVisibleChars,
  postwinContinuationInputReady,
  postwinDialogueInputReady,
  postwinDialogueVisibleChars,
  postwinNextVisibleChars,
  postwinPhase,
  postwinRngSteps,
} from "../src/engine/postwin.ts";

describe("S8 Battle-1 postwin transition", () => {
  const outcomeDismiss = 10_000;

  function lossQuoteState(elapsed: number) {
    const state = createInitialState();
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
        turn16Resolved: true,
        turn17KoDismissElapsed: outcomeDismiss - 100,
        turn17OutcomeDismissElapsed: outcomeDismiss,
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
    expect(early.battleScene!.turn17LossDismissElapsed).toBeNull();

    let accepted = tick(
      lossQuoteState(outcomeDismiss + TURN17_LOSS_INPUT_READY_DELAY - 1),
      new Set(["A"]),
    );
    const edge = outcomeDismiss + TURN17_LOSS_INPUT_READY_DELAY;
    expect(accepted.battleScene!.turn17LossDismissElapsed).toBe(edge);
    expect(accepted.postwin).toEqual(INITIAL_POSTWIN_STATE);
    accepted = tick(accepted, new Set(["A"]));
    expect(accepted.battleScene!.turn17LossDismissElapsed).toBe(edge);
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
});
