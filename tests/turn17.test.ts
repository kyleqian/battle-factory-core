import { describe, expect, it } from "vitest";
import {
  TURN17_FAINT_ATTACK_ANIMATION_AGE,
  TURN17_FAINT_ATTACK_CRIT_ROLL_AGE,
  TURN17_FAINT_ATTACK_DAMAGE_ROLL_AGE,
  TURN17_FAINT_ATTACK_CURRENT_MOVE_AGE,
  TURN17_MURKROW_OWNS_AGE,
  turn17DispatchState,
} from "../src/engine/turn17.ts";
import {
  INITIAL_BATTLE_SCENE_STATE,
  TURN17_FIRE_PUNCH_CONFIRM_TO_EPOCH_DELAY,
  TURN17_FIRST_OUTCOME_RENDER_DELAY,
  TURN17_OUTCOME_FLIP_DELAY,
  advanceBattleScene,
  turn17FirePunchAge,
  turn17KoDismissEligible,
  turn17PostDismissState,
} from "../src/engine/battleScene.ts";
import {
  TURN17_FIRE_PUNCH_RESOLUTION,
} from "../src/engine/firePunch.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { CLOSED_FIGHT_SUBMENU_STATE } from "../src/engine/battleMenu.ts";

describe("turn 17 confirmation-relative dispatch", () => {
  it("pins MURKROW-first ownership and currentMove writes", () => {
    expect(turn17DispatchState(TURN17_MURKROW_OWNS_AGE - 1)).toMatchObject({
      attacker: "MAGBY",
      currentMove: null,
    });
    expect(turn17DispatchState(TURN17_MURKROW_OWNS_AGE).attacker).toBe("MURKROW");
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_CURRENT_MOVE_AGE).currentMove).toBe("FAINT_ATTACK");
  });

  it("pins the no-accuracy RNG shape, no-crit result, and source/RAM 52 damage", () => {
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_CRIT_ROLL_AGE - 1).rngCallsConsumed).toBe(0);
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_CRIT_ROLL_AGE)).toMatchObject({
      criticalHit: false,
      rngCallsConsumed: 1,
      rngValue: 1936653909,
    });
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_DAMAGE_ROLL_AGE)).toMatchObject({
      damage: 52,
      rngCallsConsumed: 2,
      rngValue: 1115590820,
    });
  });

  it("stops pre-animation ownership one tick before age 52", () => {
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_ANIMATION_AGE - 1).animationOwned).toBe(false);
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_ANIMATION_AGE).animationOwned).toBe(true);
  });
});

describe("turn 17 faint hold and outcome latency", () => {
  const confirmElapsed = 10_000;
  const cursorAge = TURN17_FIRE_PUNCH_RESOLUTION.faint!.cursorStartAge;
  const eligibleElapsed =
    confirmElapsed + TURN17_FIRE_PUNCH_CONFIRM_TO_EPOCH_DELAY + cursorAge;

  function battleStateAt(elapsed: number): ReturnType<typeof createInitialState> {
    const state = createInitialState();
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
        turn5Resolved: true,
        turn6Resolved: true,
        turn7Resolved: true,
        turn8Resolved: true,
        turn9Resolved: true,
        turn10Resolved: true,
        turn11Resolved: true,
        turn12Resolved: true,
        turn13Resolved: true,
        turn14Resolved: true,
        turn16Resolved: true,
        turn17MenuRedrawElapsed: confirmElapsed - 100,
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
    expect(early.battleScene!.turn17KoDismissElapsed).toBeNull();

    let idle = battleStateAt(eligibleElapsed + 500);
    for (let i = 0; i < 40; i += 1) idle = tick(idle, new Set());
    expect(idle.battleScene!.turn17KoDismissElapsed).toBeNull();
  });

  it("registers the eligible A edge once, at that edge's relative elapsed", () => {
    let state = tick(battleStateAt(eligibleElapsed - 1), new Set(["A"]));
    expect(state.battleScene!.turn17KoDismissElapsed).toBe(eligibleElapsed);
    state = tick(state, new Set());
    state = tick(state, new Set(["A"]));
    expect(state.battleScene!.turn17KoDismissElapsed).toBe(eligibleElapsed);
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
      turn17KoDismissElapsed: 100,
      battleOutcome: 0 as const,
    };
    const after = advanceBattleScene(before);
    expect(after.elapsed).toBe(117);
    expect(after.battleOutcome).toBe(1);
  });
});
