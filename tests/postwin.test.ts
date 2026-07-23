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
  INITIAL_POSTWIN_STATE,
  POSTWIN_BATTLE_BLACK_AGE,
  POSTWIN_BATTLE_FADE_FIRST_AGE,
  POSTWIN_BATTLE_ROOM_FADE_OUT_AGE,
  POSTWIN_BATTLE_ROOM_FIRST_AGE,
  POSTWIN_CHALLENGE_BATTLE_WRITE_AGE,
  POSTWIN_COUNTER_ROOM_FIRST_AGE,
  POSTWIN_HEAL_INPUT_READY_AGE,
  POSTWIN_HEAL_TEXT_SETTLED_AGE,
  POSTWIN_IN_BATTLE_CLEAR_AGE,
  POSTWIN_OPPONENT_RENTALS_WRITE_AGE,
  POSTWIN_OPPONENT_RENTAL_IDS,
  POSTWIN_SECOND_BLACK_AGE,
  postwinHealInputReady,
  postwinHealVisibleChars,
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
});
