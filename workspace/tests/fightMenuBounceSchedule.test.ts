// Tier-1 pin for the route-scoped idle-bounce freeze schedule (ISSUES #81
// remainder 4a, docs/fight-menu-freeze-schedule-probe.md §4(a)).
//
// The oracle's fight-menu bounce applies a ROUTE-DEPENDENT freeze schedule:
// the torment fixture shows a 4-frame fight-opening freeze (app offset +3),
// a +1 fight-menu regime through 766, and a 1-frame reopen-tail freeze
// (offset -1 through the rejection-reopen window). Battle-1's own windows
// pin the app's current all-zero schedule (0-frame opening / 2-frame
// submenu-open / two 1-frame B-close freezes), which must stay unchanged.
//
// The schedule is a phase-keyed offset table on the presentation state
// (`bounceSchedule`), supplied ONLY by the torment staging context
// (`TORMENT_ROUTE_BOUNCE_SCHEDULE`); every other `createBattleCommandPresentation`
// caller keeps the battle-1 default. The +1 fight-menu offset is a
// FIRST-window-only regime: after the rejection reopen the oracle is back on
// the app's clock, so the reopened fight-menu (frame 986) stays at offset 0.

import { describe, expect, it } from "vitest";
import {
  BATTLE_COMMAND_BOUNCE_SCHEDULE_DEFAULT,
  REJECTION_MESSAGE_HOLD_AT,
  TORMENT_ROUTE_BOUNCE_SCHEDULE,
  advanceBattleCommandPresentation,
  battleCommandBounceAgeOffset,
  createBattleCommandPresentation,
  type BattleCommandPresentationState,
} from "../src/engine/battleCommandPresentation.ts";
import { commandMenuBounceY2 } from "../src/engine/battleMenu.ts";
import type { BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";
import {
  createFactoryFullTurnBattleState,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

// Same BUTTERFREE/TORMENT fixture shape as
// tests/factoryTormentSelectionRejectionLive.test.ts.
function tormentBoundary(): Readonly<{
  request: BattleCommandRequest;
  rules: BattleScriptRulesContext;
}> {
  const state = createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 1,
    player: {
      species: 12,
      moveId: 33,
      moves: [33, 16, 0, 0] as const,
      pp: [35, 35, 0, 0] as const,
      attack: 65,
      defense: 70,
      spAttack: 100,
      spDefense: 100,
      speed: 90,
      hp: 135,
      maxHp: 135,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT,
      lastMove: 33,
    },
    trainer: {
      species: 198,
      moveId: 259,
      moves: [259, 259, 259, 259] as const,
      pp: [15, 15, 15, 15] as const,
      attack: 105,
      defense: 62,
      spAttack: 105,
      spDefense: 62,
      speed: 111,
      hp: 135,
      maxHp: 135,
      types: ["TYPE_DARK", "TYPE_FLYING"],
    },
  });
  if (state.boundary.kind !== "decision-required" || state.boundary.request.kind !== "command") {
    throw new Error("torment fixture did not publish a player command request");
  }
  return {
    request: state.boundary.request,
    rules: state.rules.rulesContext,
  };
}

function advance(
  state: BattleCommandPresentationState,
  presses: ReadonlySet<string> = new Set(),
): BattleCommandPresentationState {
  return advanceBattleCommandPresentation(
    state,
    presses as ReadonlySet<"A" | "B" | "RIGHT" | "LEFT" | "UP" | "DOWN">,
  );
}

/**
 * Drives the fixture's frame walk from its frame-734 staged checkpoint
 * (action menu already interactive, `idleBounceElapsed` seeded 7) through
 * the rejection cycle. Returns the state at each pinned frame so the test
 * can check the exact phase, bounce age, and schedule offset.
 */
function tormentFrameWalk(schedule: typeof TORMENT_ROUTE_BOUNCE_SCHEDULE): {
  readonly at: (frame: number) => BattleCommandPresentationState;
} {
  const { request, rules } = tormentBoundary();
  let state: BattleCommandPresentationState = Object.freeze({
    ...createBattleCommandPresentation(request, rules, 0, schedule),
    lifecycle: Object.freeze({ phase: "action-menu" as const, phaseElapsed: 0 }),
    idleBounceElapsed: 7,
  });
  const seen = new Map<number, BattleCommandPresentationState>();
  let frame = 734;
  seen.set(frame, state);
  const press = (next: number, buttons: ReadonlySet<string>): void => {
    state = advance(state, buttons);
    frame += 1;
    if (frame !== next) throw new Error(`press walk drifted: expected frame ${next}, got ${frame}`);
    seen.set(frame, state);
  };
  const idle = (count: number): void => {
    for (let i = 0; i < count; i += 1) {
      state = advance(state);
      frame += 1;
      seen.set(frame, state);
    }
  };
  // 735-736: the fixture's two-frame A press.
  press(735, new Set(["A"]));
  press(736, new Set(["A"]));
  // 737-740: opening freeze remainder + fight menu reveal.
  idle(4); // -> 740
  // 741-766: first fight-menu window.
  idle(26); // -> 766
  // 767-768: two-frame A press into the rejection message.
  press(767, new Set(["A"]));
  press(768, new Set(["A"]));
  // 769-968: hold (button-gated after 66), then 969-970 dismiss.
  idle(968 - 768); // -> 968
  press(969, new Set(["A"]));
  press(970, new Set(["A"]));
  // 971-977: rejection-reopen span (9 frames), 978: reopened fight menu.
  idle(977 - 970); // -> 977
  idle(1); // -> 978
  // 979-986: reopened fight-menu window.
  idle(986 - 978); // -> 986
  return { at: (f) => seen.get(f)! };
}

const renderedAge = (state: BattleCommandPresentationState): number =>
  state.idleBounceElapsed + battleCommandBounceAgeOffset(state);

describe("route-scoped idle-bounce freeze schedule (ISSUES #81 remainder 4a)", () => {
  it("the torment schedule's per-phase offsets land every pinned phase-boundary frame on the oracle pose", () => {
    const walk = tormentFrameWalk(TORMENT_ROUTE_BOUNCE_SCHEDULE);

    // 736 fight-opening: app age 8, +3 -> 11 = oracle pose (1,0).
    const opening = walk.at(736);
    expect(opening.lifecycle.phase).toBe("fight-opening");
    expect(opening.idleBounceElapsed).toBe(8);
    expect(battleCommandBounceAgeOffset(opening)).toBe(3);
    expect(commandMenuBounceY2(renderedAge(opening))).toEqual({ onixY2: 1, healthboxY2: 0 });

    // 740 fight-menu reveal: +1 flips nothing (pose-stable at age 11->12).
    const reveal = walk.at(740);
    expect(reveal.lifecycle.phase).toBe("fight-menu");
    expect(battleCommandBounceAgeOffset(reveal)).toBe(1);
    expect(commandMenuBounceY2(renderedAge(reveal))).toEqual(
      commandMenuBounceY2(reveal.idleBounceElapsed),
    );

    // 766 fight-menu: app age 37, +1 -> 38 = oracle pose (0,0).
    const lastOpenFrame = walk.at(766);
    expect(lastOpenFrame.idleBounceElapsed).toBe(37);
    expect(battleCommandBounceAgeOffset(lastOpenFrame)).toBe(1);
    expect(commandMenuBounceY2(renderedAge(lastOpenFrame))).toEqual({ onixY2: 0, healthboxY2: 0 });

    // 967 rejection-message: offset 0 (these frames are green today).
    const message = walk.at(967);
    expect(message.lifecycle.phase).toBe("rejection-message");
    expect(battleCommandBounceAgeOffset(message)).toBe(0);
    expect(renderedAge(message)).toBe(message.idleBounceElapsed);

    // 977 rejection-reopen: app age 248, -1 -> 247 = oracle pose (1,1).
    const reopen = walk.at(977);
    expect(reopen.lifecycle.phase).toBe("rejection-reopen");
    expect(reopen.idleBounceElapsed).toBe(248);
    expect(battleCommandBounceAgeOffset(reopen)).toBe(-1);
    expect(commandMenuBounceY2(renderedAge(reopen))).toEqual({ onixY2: 1, healthboxY2: 1 });

    // 986 reopened fight-menu: the +1 regime must NOT apply here -- offset 0
    // (app age 257 -> oracle pose (0,1)); +1 would render age 258's (0,0).
    const reopened = walk.at(986);
    expect(reopened.lifecycle.phase).toBe("fight-menu");
    expect(reopened.bounceFightMenuReopened).toBe(true);
    expect(reopened.idleBounceElapsed).toBe(257);
    expect(battleCommandBounceAgeOffset(reopened)).toBe(0);
    expect(commandMenuBounceY2(renderedAge(reopened))).toEqual({ onixY2: 0, healthboxY2: 1 });
    expect(commandMenuBounceY2(258)).toEqual({ onixY2: 0, healthboxY2: 0 }); // +1 would break 986
  });

  it("the battle-1 default schedule leaves every phase at offset 0, including after the reopen", () => {
    const walk = tormentFrameWalk(BATTLE_COMMAND_BOUNCE_SCHEDULE_DEFAULT);
    for (const frame of [734, 736, 740, 766, 967, 977, 978, 986] as const) {
      const state = walk.at(frame);
      expect(
        battleCommandBounceAgeOffset(state),
        `frame ${frame} (${state.lifecycle.phase})`,
      ).toBe(0);
      expect(renderedAge(state)).toBe(state.idleBounceElapsed);
    }
  });

  it("the schedule is empty by default on every createBattleCommandPresentation", () => {
    const { request, rules } = tormentBoundary();
    const presentation = createBattleCommandPresentation(request, rules);
    expect(presentation.bounceSchedule).toEqual(BATTLE_COMMAND_BOUNCE_SCHEDULE_DEFAULT);
    expect(presentation.bounceFightMenuReopened).toBe(false);
    expect(TORMENT_ROUTE_BOUNCE_SCHEDULE.phaseOffsets).toEqual({
      "fight-opening": 3,
      "fight-menu": 1,
      "rejection-reopen": -1,
    });
  });

  it("REJECTION_MESSAGE_HOLD_AT is below 968 so the fixture's 969 dismiss reaches the reopen span", () => {
    expect(REJECTION_MESSAGE_HOLD_AT).toBe(66);
  });
});
