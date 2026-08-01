import { describe, expect, it } from "vitest";
import {
  INITIAL_BATTLE_SCENE_STATE,
  TURN17_FIRE_PUNCH_CONFIRM_TO_EPOCH_DELAY,
  TURN17_FIRST_OUTCOME_RENDER_DELAY,
  TURN17_FIRST_TRAINER_RENDER_DELAY,
  TURN17_LOSS_TEXT_START_DELAY,
  TURN17_LOSS_TEXT_TOTAL,
  TURN17_LOSS_INPUT_READY_DELAY,
  TURN17_OUTCOME_CURSOR_START_DELAY,
  TURN17_OUTCOME_INPUT_READY_DELAY,
  TURN17_OUTCOME_TEXT_TOTAL,
  TURN17_OUTCOME_FLIP_DELAY,
  TURN17_TRAINER_SLIDE_SETTLE_DELAY,
  advanceBattleScene,
  turn17FirePunchAge,
  turn17KoDismissEligible,
  turn17OutcomeDismissEligible,
  turn17OutcomeMessageState,
  turn17PostDismissState,
  turn17TrainerLossState,
} from "../src/engine/battleScene.ts";
import {
  TURN17_FIRE_PUNCH_RESOLUTION,
} from "../src/animation/firePunch.ts";
import { CANONICAL_OPPONENT_FLY_RESOLUTION } from "../src/engine/turn15FlyResolutionAdapter.ts";
import { resolveTurn13CompletedResolutionNextCommandHandoff } from "../src/engine/turn13ResolutionAdapter.ts";
import { resolveTurn5CompletedResolutionNextCommandHandoff } from "../src/engine/turn5ResolutionAdapter.ts";
import { resolveTurn6CompletedResolutionNextCommandHandoff } from "../src/engine/turn6ResolutionAdapter.ts";
import { resolveTurn7CompletedResolutionNextCommandHandoff } from "../src/engine/turn7ResolutionAdapter.ts";
import { resolveTurn8CompletedResolutionNextCommandHandoff } from "../src/engine/turn8ResolutionAdapter.ts";
import { resolveTurn9CompletedResolutionNextCommandHandoff } from "../src/engine/turn9ResolutionAdapter.ts";
import { resolveTurn10CompletedResolutionNextCommandHandoff } from "../src/engine/turn10ResolutionAdapter.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { CLOSED_FIGHT_SUBMENU_STATE } from "../src/engine/battleMenu.ts";
import {
  createBattleTerminalResolutionPresentation,
  storeBattleTerminalPresentationDismiss,
} from "../src/engine/battleResolutionPresentation.ts";

describe("turn 17 faint hold and outcome latency", () => {
  const confirmElapsed = 10_000;
  const cursorAge = TURN17_FIRE_PUNCH_RESOLUTION.faint!.cursorStartAge;
  const eligibleElapsed =
    confirmElapsed + TURN17_FIRE_PUNCH_CONFIRM_TO_EPOCH_DELAY + cursorAge;

  function battleStateAt(elapsed: number): ReturnType<typeof createInitialState> {
    const state = createInitialState();
    const terminalResolution = createBattleTerminalResolutionPresentation({
      pendingBoundary: Object.freeze({
        kind: "terminal",
        outcome: "player-win",
      }),
      resultLines: ["Player defeated", "BUG CATCHER DESTIN!"],
      opponentLossLines: ["PLEASE I NEED", "SOME WATER"],
      confirmElapsed,
      menuRedrawElapsed: confirmElapsed - 100,
    });
    return {
      ...state,
      battleScene: {
        ...INITIAL_BATTLE_SCENE_STATE,
        elapsed,
        sendOutPressElapsed: 380,
        turn1Resolved: true,
        turn2Resolved: true,
        turn3Resolved: true,
        turn4Resolved: true,
        turn5NextCommandHandoff: resolveTurn5CompletedResolutionNextCommandHandoff(),
        turn6NextCommandHandoff: resolveTurn6CompletedResolutionNextCommandHandoff(),
        turn7NextCommandHandoff: resolveTurn7CompletedResolutionNextCommandHandoff(),
        turn8NextCommandHandoff: resolveTurn8CompletedResolutionNextCommandHandoff(),
        turn9NextCommandHandoff: resolveTurn9CompletedResolutionNextCommandHandoff(),
        turn10NextCommandHandoff: resolveTurn10CompletedResolutionNextCommandHandoff(),
        turn11Resolved: true,
        turn12Resolved: true,
        turn13NextCommandHandoff: resolveTurn13CompletedResolutionNextCommandHandoff(),
        resolutionOwner: Object.freeze({
          resolution: CANONICAL_OPPONENT_FLY_RESOLUTION.strikeResolution,
          forcedPartySelect: null,
          followingPresentation: null,
        }),
        terminalResolution,
        fightSubmenu: {
          ...CLOSED_FIGHT_SUBMENU_STATE,
          openElapsed: confirmElapsed - 30,
          confirmElapsed,
        },
      },
    };
  }

  it("opens the input gate at the faint cursor epoch, all relative to confirmation", () => {
    expect(turn17FirePunchAge(eligibleElapsed - 1, confirmElapsed)).toBe(cursorAge - 1);
    expect(turn17KoDismissEligible(eligibleElapsed - 1, confirmElapsed)).toBe(false);
    expect(turn17KoDismissEligible(eligibleElapsed, confirmElapsed)).toBe(true);
    expect(turn17KoDismissEligible(eligibleElapsed + 500, confirmElapsed)).toBe(true);
  });

  it("drops an early A edge and never auto-dismisses on idle", () => {
    const early = tick(battleStateAt(eligibleElapsed - 2), new Set(["A"]));
    expect(early.battleScene!.terminalResolution!.faintDismissElapsed).toBeNull();

    let idle = battleStateAt(eligibleElapsed + 500);
    for (let i = 0; i < 40; i += 1) idle = tick(idle, new Set());
    expect(idle.battleScene!.terminalResolution!.faintDismissElapsed).toBeNull();
  });

  it("registers the eligible A edge once, at that edge's relative elapsed", () => {
    let state = tick(battleStateAt(eligibleElapsed - 1), new Set(["A"]));
    expect(state.battleScene!.terminalResolution!.faintDismissElapsed).toBe(eligibleElapsed);
    state = tick(state, new Set());
    state = tick(state, new Set(["A"]));
    expect(state.battleScene!.terminalResolution!.faintDismissElapsed).toBe(eligibleElapsed);
  });

  it("flips WIN at dismiss+17 but keeps the old-render boundary through +25", () => {
    expect(TURN17_OUTCOME_FLIP_DELAY).toBe(17);
    expect(TURN17_FIRST_OUTCOME_RENDER_DELAY).toBe(26);
    expect(turn17PostDismissState(116, 100)).toEqual({
      age: 16,
      battleOutcome: 0,
      firstOutcomeRender: false,
    });
    expect(turn17PostDismissState(117, 100)).toEqual({
      age: 17,
      battleOutcome: 1,
      firstOutcomeRender: false,
    });
    expect(turn17PostDismissState(125, 100)!.firstOutcomeRender).toBe(false);
    expect(turn17PostDismissState(126, 100)!.firstOutcomeRender).toBe(true);
  });

  it("advances the explicit outcome state at the same relative +17 boundary", () => {
    const before = {
      ...INITIAL_BATTLE_SCENE_STATE,
      elapsed: 116,
      terminalResolution: storeBattleTerminalPresentationDismiss(
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
        100,
      ),
      battleOutcome: 0 as const,
    };
    const after = advanceBattleScene(before);
    expect(after.elapsed).toBe(117);
    expect(after.battleOutcome).toBe(1);
  });

  it("types one glyph per controller tick, settles, then opens the second input gate", () => {
    const faintDismiss = 100;
    expect(turn17OutcomeMessageState(125, faintDismiss, null)).toBeNull();
    expect(turn17OutcomeMessageState(126, faintDismiss, null)).toMatchObject({
      visibleChars: 1,
      inputReady: false,
    });
    expect(turn17OutcomeMessageState(159, faintDismiss, null)).toMatchObject({
      visibleChars: TURN17_OUTCOME_TEXT_TOTAL,
      inputReady: true,
    });
    expect(TURN17_OUTCOME_INPUT_READY_DELAY).toBe(59);
    expect(TURN17_OUTCOME_CURSOR_START_DELAY).toBe(61);
    expect(turn17OutcomeDismissEligible(158, faintDismiss)).toBe(false);
    expect(turn17OutcomeDismissEligible(159, faintDismiss)).toBe(true);
    expect(turn17OutcomeMessageState(169, faintDismiss + 10, null))
      .toEqual(turn17OutcomeMessageState(159, faintDismiss, null));
  });

  it("rejects an early second A and holds indefinitely without input", () => {
    const faintDismiss = eligibleElapsed - 400;
    const base: ReturnType<typeof createInitialState> = {
      ...battleStateAt(faintDismiss + TURN17_OUTCOME_INPUT_READY_DELAY - 2),
      battleScene: {
        ...battleStateAt(faintDismiss + TURN17_OUTCOME_INPUT_READY_DELAY - 2).battleScene!,
        terminalResolution: storeBattleTerminalPresentationDismiss(
          battleStateAt(faintDismiss + TURN17_OUTCOME_INPUT_READY_DELAY - 2)
            .battleScene!.terminalResolution!,
          "faint",
          faintDismiss,
        ),
      },
    };
    const early = tick(base, new Set(["A"]));
    expect(early.battleScene!.terminalResolution!.resultDismissElapsed).toBeNull();

    let idle: ReturnType<typeof createInitialState> = {
      ...base,
      battleScene: {
        ...base.battleScene!,
        elapsed: faintDismiss + TURN17_OUTCOME_INPUT_READY_DELAY + 500,
      },
    };
    for (let i = 0; i < 40; i += 1) idle = tick(idle, new Set());
    expect(idle.battleScene!.terminalResolution!.resultDismissElapsed).toBeNull();
  });

  it("registers the real second A once and freezes that outcome pose", () => {
    const faintDismiss = eligibleElapsed - 400;
    let state: ReturnType<typeof createInitialState> = {
      ...battleStateAt(faintDismiss + TURN17_OUTCOME_INPUT_READY_DELAY - 1),
      battleScene: {
        ...battleStateAt(faintDismiss + TURN17_OUTCOME_INPUT_READY_DELAY - 1).battleScene!,
        terminalResolution: storeBattleTerminalPresentationDismiss(
          battleStateAt(faintDismiss + TURN17_OUTCOME_INPUT_READY_DELAY - 1)
            .battleScene!.terminalResolution!,
          "faint",
          faintDismiss,
        ),
      },
    };
    state = tick(state, new Set(["A"]));
    const outcomeDismiss = faintDismiss + TURN17_OUTCOME_INPUT_READY_DELAY;
    expect(state.battleScene!.terminalResolution!.resultDismissElapsed).toBe(outcomeDismiss);
    state = tick(state, new Set());
    state = tick(state, new Set(["A"]));
    expect(state.battleScene!.terminalResolution!.resultDismissElapsed).toBe(outcomeDismiss);

    const frozen = turn17OutcomeMessageState(
      outcomeDismiss + 20,
      faintDismiss,
      outcomeDismiss,
    )!;
    expect(frozen.displayAge).toBe(TURN17_OUTCOME_INPUT_READY_DELAY);
    expect(frozen.visibleChars).toBe(TURN17_OUTCOME_TEXT_TOTAL);
  });

  it("keeps the old outcome framebuffer through +27 and exposes the trainer boundary at +28", () => {
    expect(TURN17_FIRST_TRAINER_RENDER_DELAY).toBe(28);
    const faintDismiss = 100;
    const outcomeDismiss = 500;
    expect(turn17OutcomeMessageState(527, faintDismiss, outcomeDismiss))
      .toMatchObject({ trainerTransitionReady: false, displayAge: 400 });
    expect(turn17OutcomeMessageState(528, faintDismiss, outcomeDismiss))
      .toMatchObject({ trainerTransitionReady: true, displayAge: 400 });

    const delayed = turn17OutcomeMessageState(538, faintDismiss, outcomeDismiss + 10)!;
    expect(delayed.trainerTransitionReady).toBe(true);
    expect(turn17OutcomeMessageState(537, faintDismiss, outcomeDismiss + 10)!
      .trainerTransitionReady).toBe(false);
  });

  it("ports the source trainer slide, three-frame settled pause, and quote cadence", () => {
    const edge = 500;
    expect(TURN17_TRAINER_SLIDE_SETTLE_DELAY).toBe(53);
    expect(TURN17_LOSS_TEXT_START_DELAY).toBe(56);
    expect(turn17TrainerLossState(edge + 27, edge)).toBeNull();
    expect(turn17TrainerLossState(edge + 28, edge)).toMatchObject({
      trainerX: 226,
      visibleChars: 0,
    });
    expect(turn17TrainerLossState(edge + 53, edge)).toMatchObject({
      trainerX: 176,
      visibleChars: 0,
    });
    expect(turn17TrainerLossState(edge + 54, edge)).toMatchObject({
      trainerX: 176,
      visibleChars: 0,
    });
    expect(turn17TrainerLossState(edge + 55, edge)).toMatchObject({
      trainerX: 176,
      visibleChars: 0,
    });
    expect(turn17TrainerLossState(edge + 56, edge)).toMatchObject({
      trainerX: 176,
      visibleChars: 1,
    });
    expect(turn17TrainerLossState(edge + 56 + TURN17_LOSS_TEXT_TOTAL - 1, edge))
      .toMatchObject({
        visibleChars: TURN17_LOSS_TEXT_TOTAL,
        inputReady: false,
        cursorVisible: false,
      });
    expect(TURN17_LOSS_INPUT_READY_DELAY).toBe(79);
    expect(turn17TrainerLossState(edge + TURN17_LOSS_INPUT_READY_DELAY, edge))
      .toMatchObject({ inputReady: true, cursorVisible: false });
  });

  it("shifts every trainer/quote edge with the real stored dismiss and holds without a cursor", () => {
    const edge = 700;
    const shift = 11;
    for (const age of [27, 28, 53, 54, 55, 56, 78, 79, 400]) {
      expect(turn17TrainerLossState(edge + age, edge))
        .toEqual(turn17TrainerLossState(edge + shift + age, edge + shift));
    }
    expect(turn17TrainerLossState(edge + 77, edge)).toMatchObject({
      inputReady: false,
      cursorVisible: false,
    });
    const settled = turn17TrainerLossState(edge + 79, edge);
    expect(settled).toMatchObject({
      visibleChars: TURN17_LOSS_TEXT_TOTAL,
      inputReady: true,
      cursorVisible: false,
    });
    expect(turn17TrainerLossState(edge + 400, edge)).toEqual({
      ...settled,
      age: 400,
    });
  });
});
