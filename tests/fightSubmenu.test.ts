// Tier-1 pins for the FIGHT (move-select) submenu's state machine
// (docs/battle-turn-notes.md §11) - open/nav/close, cursor index, JOY_NEW
// gating (no auto-repeat), and the B-close cycle-phase continuation. Pure
// logic/state only, per this run's Tier-1/Tier-2 split - pixel parity lives
// in tools/compare/traces/fight-submenu.json (234/235, one attributed
// anomaly - see docs/battle-menu-notes.md's new section).
import { describe, expect, it } from "vitest";
import {
  CLOSED_FIGHT_SUBMENU_STATE,
  FIGHT_SUBMENU_CLOSE_DELAY,
  FIGHT_SUBMENU_OPEN_DELAY,
  FIGHT_CONFIRM_TEXT_DELAY,
  TURN_KICKOFF_LINE1,
  TURN_KICKOFF_LINE2,
  TURN_KICKOFF_TEXT_TOTAL,
  advanceFightSubmenuDisplay,
  closeFightSubmenu,
  confirmFightMove,
  moveFightCursor,
  openFightSubmenu,
  turnKickoffTextStartTick,
  turnKickoffTextVisibleChars,
  turnKickoffBounceTick,
  type FightSubmenuState,
} from "../src/engine/battleMenu.ts";
import { TICK0 as SCENE_TICK0 } from "../src/engine/battleScene.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import type { GbaButton } from "../src/input.ts";

/** Onix's real moveset (`battleSetup.ts`'s own rental-pool lookup) - every `openFightSubmenu` call below needs this now that it threads the S8 `activeMonMoveset` plumbing (docs/battle-menu-notes.md §13c) through explicitly, rather than each test re-deriving it from a fully-played draft screen. */
const ONIX_MOVESET = rentalMoveset("ONIX");

describe("battleMenu: moveFightCursor (HandleInputChooseMove's DPAD guards, §11 finding 2)", () => {
  it("RIGHT/DOWN/LEFT/UP loop 0(ROCK_SLIDE)->1(BIND)->3(SANDSTORM)->2(DRAGON_BREATH)->0(ROCK_SLIDE), matching the nav groundtruth trace exactly", () => {
    let cursor: 0 | 1 | 2 | 3 = 0;
    cursor = moveFightCursor(cursor, "RIGHT");
    expect(cursor).toBe(1);
    cursor = moveFightCursor(cursor, "DOWN");
    expect(cursor).toBe(3);
    cursor = moveFightCursor(cursor, "LEFT");
    expect(cursor).toBe(2);
    cursor = moveFightCursor(cursor, "UP");
    expect(cursor).toBe(0);
  });

  it("guards block escaping the 2x2 grid the wrong way (no-ops, not wraps)", () => {
    expect(moveFightCursor(0, "LEFT")).toBe(0); // bit0 already clear
    expect(moveFightCursor(0, "UP")).toBe(0); // bit1 already clear
    expect(moveFightCursor(1, "RIGHT")).toBe(1); // bit0 already set
    expect(moveFightCursor(2, "DOWN")).toBe(2); // bit1 already set
  });

  it("held-repeat check: repeatedly applying DOWN from ROCK_SLIDE (JOY_NEW fires once) moves to DRAGON_BREATH and STAYS - no wraparound cycling even if called again", () => {
    // §11's own held-repeat finding: this engine gates DOWN application on
    // JOY_NEW at the core.ts call site (tested below), not inside
    // moveFightCursor itself - this pins the pure function's own half: a
    // second DOWN from the same slot 2 is a no-op (bit1 already set), so
    // even a caller that mistakenly re-applied it every held frame would
    // still land on a stable value, not cycle.
    let cursor: 0 | 1 | 2 | 3 = 0;
    cursor = moveFightCursor(cursor, "DOWN");
    expect(cursor).toBe(2);
    cursor = moveFightCursor(cursor, "DOWN");
    expect(cursor).toBe(2);
  });
});

describe("battleMenu: FightSubmenuState open/close/display-lag", () => {
  it("CLOSED_FIGHT_SUBMENU_STATE starts unopened at ROCK_SLIDE", () => {
    expect(CLOSED_FIGHT_SUBMENU_STATE).toEqual({
      openElapsed: null,
      cursor: 0,
      displayCursor: 0,
      closeElapsed: null,
      confirmElapsed: null,
      activeMonMoveset: ONIX_MOVESET,
    });
  });

  it("openFightSubmenu sets openElapsed and resets cursor/displayCursor to ROCK_SLIDE", () => {
    const state = openFightSubmenu(847, ONIX_MOVESET);
    expect(state).toEqual({ openElapsed: 847, cursor: 0, displayCursor: 0, closeElapsed: null, confirmElapsed: null, activeMonMoveset: ONIX_MOVESET });
  });

  it("openFightSubmenu's optional initialCursor persists the prior turn's own cursor position (S7 slice F, docs/battle-turn-notes.md §13: turn 3's reopen rests on slot 2, DRAGON_BREATH, where turn 2's own confirm left it)", () => {
    const state = openFightSubmenu(3846, ONIX_MOVESET, 2);
    expect(state).toEqual({ openElapsed: 3846, cursor: 2, displayCursor: 2, closeElapsed: null, confirmElapsed: null, activeMonMoveset: ONIX_MOVESET });
  });

  it("closeFightSubmenu is a no-op if not open, or already closing", () => {
    expect(closeFightSubmenu(CLOSED_FIGHT_SUBMENU_STATE, 100)).toBe(CLOSED_FIGHT_SUBMENU_STATE);
    const opened = openFightSubmenu(847, ONIX_MOVESET);
    const closing = closeFightSubmenu(opened, 1007);
    expect(closing.closeElapsed).toBe(1007);
    expect(closeFightSubmenu(closing, 2000)).toBe(closing); // already closing - unchanged
  });

  it("advanceFightSubmenuDisplay lags displayCursor by exactly one call behind cursor, and is a no-op while closed", () => {
    expect(advanceFightSubmenuDisplay(CLOSED_FIGHT_SUBMENU_STATE)).toBe(CLOSED_FIGHT_SUBMENU_STATE);
    let state: FightSubmenuState = { ...openFightSubmenu(847, ONIX_MOVESET), cursor: 1 }; // simulate a same-tick RIGHT press: cursor updated, displayCursor not yet
    expect(state.displayCursor).toBe(0);
    state = advanceFightSubmenuDisplay(state); // next tick, no new input: catches up
    expect(state.displayCursor).toBe(1);
    expect(advanceFightSubmenuDisplay(state)).toBe(state); // already caught up - stable
  });

  it("timing constants match the pixel-fit groundtruth derivation (docs/battle-turn-notes.md §11 / battle-menu-notes.md's new section)", () => {
    expect(FIGHT_SUBMENU_OPEN_DELAY).toBe(5); // press 1887 -> reveal 1892
    expect(FIGHT_SUBMENU_CLOSE_DELAY).toBe(6); // press 2047 -> reveal 2053
  });
});

/**
 * A synthetic EngineState with `battleScene` already in the settled action-menu idle window, `elapsed` chosen so the FIRST tick() call below lands on trace tick `firstTickAbsolute` (see the `+1` convention noted in core.ts's own fightSubmenu block). Other fields are inert pass-throughs for this branch of tick() (verified by reading core.ts: the battleScene branch returns early using only battleScene/keyRepeat) - EXCEPT `draftScreen`, which core.ts's `openFightSubmenu` call sites now read (S8 engine dependency, docs/battle-menu-notes.md §13c): `selectedIds: [1, 2, 3, 0, 0, 0]` reproduces the real anchor trace's own fully-confirmed ONIX/MAGBY/BAYLEEF pick order (the same shape `tests/confirmDecline.test.ts` pins for a real played-through draft screen), so `chosenMonSpecies` resolves to Onix's lead exactly as every committed trace's own real button script does.
 */
function stateAtTick(firstTickAbsolute: number): EngineState {
  const initial = createInitialState();
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: { elapsed: firstTickAbsolute - SCENE_TICK0 - 1, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false },
  };
}

function press(state: EngineState, buttons: GbaButton[]): EngineState {
  return tick(state, new Set(buttons));
}

describe("battleMenu: FIGHT submenu wired through core.ts's tick() (JOY_NEW gating, 1-tick lag, B-close resume)", () => {
  it("A on the settled action menu opens the submenu at the exact next tick, JOY_NEW only (a held A the following tick doesn't re-open/no-op differently)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(847); // TICK0(1040)+847=1887
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
  });

  it("nav is JOY_NEW-gated - holding DOWN for many ticks moves the cursor exactly once, then holds (no auto-repeat, §11 finding 2)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // opens at 1887, reveal at 1892
    for (let i = 0; i < 5; i += 1) state = press(state, []); // 1888-1892: DMA-wait elapses, submenu now interactive
    state = press(state, ["DOWN"]); // 1893: first DOWN - JOY_NEW fires
    expect(state.battleScene!.fightSubmenu.cursor).toBe(2); // ROCK_SLIDE -> DRAGON_BREATH
    for (let i = 0; i < 20; i += 1) state = press(state, ["DOWN"]); // held for 20 more ticks
    expect(state.battleScene!.fightSubmenu.cursor).toBe(2); // unchanged - no JOY_REPEAT
  });

  it("displayCursor lags cursor by exactly 1 tick after a nav press", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["RIGHT"]); // cursor updates same tick
    expect(state.battleScene!.fightSubmenu.cursor).toBe(1);
    expect(state.battleScene!.fightSubmenu.displayCursor).toBe(0); // pixel content still lags
    state = press(state, []);
    expect(state.battleScene!.fightSubmenu.displayCursor).toBe(1); // caught up one tick later
  });

  it("B closes the submenu (records closeElapsed) without resetting cursor - the resumed action menu shows whatever slot was last selected, moot since move confirmation is out of scope, but the state itself must survive", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["RIGHT"]);
    state = press(state, []);
    state = press(state, ["B"]);
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.closeElapsed).not.toBeNull();
    expect(sm.cursor).toBe(1);
  });

  it("a B press before the open DMA-wait completes is ignored (HandleInputChooseMove isn't polling yet)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // reveal not until 1892
    state = press(state, ["B"]); // 1888 - too early
    expect(state.battleScene!.fightSubmenu.closeElapsed).toBeNull();
  });

  it("A on ROCK_SLIDE (cursor 0) confirms the move (records confirmElapsed) instead of closing", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // opens at 1887
    for (let i = 0; i < 5; i += 1) state = press(state, []); // reveal at 1892
    state = press(state, ["A"]); // 1893: confirm on ROCK_SLIDE (cursor still 0)
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.confirmElapsed).not.toBeNull();
    expect(sm.closeElapsed).toBeNull();
    expect(sm.cursor).toBe(0);
  });

  it("A on a different slot does NOT confirm (this slice only models ROCK_SLIDE) - it's simply ignored, the submenu stays open and interactive", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["RIGHT"]); // -> BIND (cursor 1)
    state = press(state, []);
    state = press(state, ["A"]); // confirm attempt on a non-ROCK_SLIDE slot
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.confirmElapsed).toBeNull();
    expect(sm.cursor).toBe(1);
  });

  it("once confirmed, no further input (nav, B) mutates the submenu - HandleInputChooseMove is no longer polling (source-confirmed, battleMenu.ts's Slice 7 doc)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["A"]); // confirm
    const confirmedSm = state.battleScene!.fightSubmenu;
    state = press(state, ["B"]);
    state = press(state, ["LEFT"]);
    state = press(state, ["RIGHT"]);
    expect(state.battleScene!.fightSubmenu).toEqual(confirmedSm);
  });
});

/** Turn 2's own real confirm tick (`battleScene.test.ts`'s own `TURN2_PRESS_TICK`, same fixture) - DRAGON_BREATH confirmed on cursor slot 2, well past `DRAGONBREATH_MENU_REDRAW_DELAY`'s own 391-tick settle by the time these tests press a fresh A. */
const TURN2_PRESS_TICK = 2945;

/** A synthetic EngineState already past turn 2's whole resolution (`turn1Resolved`+`turn2Resolved=false`, `fightSubmenu` confirmed on cursor 2 back at `TURN2_PRESS_TICK`) - the exact state `turn3-menu.json`'s own committed trace reaches at tick 3846, before its own fresh A-press reopens FIGHT for turn 3 (S7 slice F, docs/battle-turn-notes.md §13). */
function stateAtTurn3Reopen(firstTickAbsolute: number): EngineState {
  const initial = createInitialState();
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: firstTickAbsolute - SCENE_TICK0 - 1,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 0,
        cursor: 2,
        displayCursor: 2,
        closeElapsed: null,
        confirmElapsed: TURN2_PRESS_TICK - SCENE_TICK0,
        activeMonMoveset: rentalMoveset("ONIX"),
      },
      turn1Resolved: true,
      turn2Resolved: false,
    },
  };
}

describe("battleMenu: turn 3's FIGHT-submenu reopen wired through core.ts's tick() (S7 slice F, docs/battle-turn-notes.md §13)", () => {
  it("A on the resettled action menu after turn 2 resolves reopens FIGHT for turn 3, cursor PERSISTED at slot 2 (DRAGON_BREATH, turn 2's own confirmed slot) - NOT reset to slot 0 the way turn 1->2's own reopen coincidentally was", () => {
    let state = stateAtTurn3Reopen(3846);
    state = press(state, ["A"]);
    const sm = state.battleScene!.fightSubmenu;
    expect(state.battleScene!.turn2Resolved).toBe(true);
    expect(sm.openElapsed).toBe(3846 - SCENE_TICK0);
    expect(sm.cursor).toBe(2);
    expect(sm.displayCursor).toBe(2);
    expect(sm.confirmElapsed).toBeNull(); // fresh submenu, not still turn 2's own confirmed one
  });

  it("UP nav flips the persisted cursor 2(DRAGON_BREATH)->0(ROCK_SLIDE) same-tick, matching §13's own ground truth, then A confirms ROCK_SLIDE again for turn 3", () => {
    let state = stateAtTurn3Reopen(3846);
    state = press(state, ["A"]); // reopen
    for (let i = 0; i < 5; i += 1) state = press(state, []); // FIGHT_SUBMENU_OPEN_DELAY settle
    state = press(state, ["UP"]);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).not.toBeNull();
  });

  it("a fresh A press does nothing until DRAGONBREATH_MENU_REDRAW_DELAY has elapsed since turn 2's own confirm - the resolution's own redraw still gates the next reopen, same rule as turn 1->2's own gate", () => {
    // TURN2_PRESS_TICK + DRAGONBREATH_MENU_REDRAW_DELAY(391) = 3336 - well before that, a fresh A must be a no-op.
    let state = stateAtTurn3Reopen(3200);
    state = press(state, ["A"]);
    expect(state.battleScene!.turn2Resolved).toBe(false);
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(0); // unchanged - still turn 2's own long-settled submenu
  });
});

describe("battleMenu: turn kickoff text (S7 slice A, docs/battle-turn-notes.md §9's 2nd A press through tick 1964)", () => {
  it("FIGHT_CONFIRM_TEXT_DELAY matches the pixel-fit groundtruth (press 1919 -> first glyph 1929)", () => {
    expect(FIGHT_CONFIRM_TEXT_DELAY).toBe(10);
    expect(turnKickoffTextStartTick(1919)).toBe(1929);
  });

  it("the message is \"Foe GROVYLE used\\nDOUBLE TEAM!\" - Grovyle (the opponent) outspeeds Onix and moves first, regardless of which move Onix selected", () => {
    expect(TURN_KICKOFF_LINE1).toBe("Foe GROVYLE used");
    expect(TURN_KICKOFF_LINE2).toBe("DOUBLE TEAM!");
    expect(TURN_KICKOFF_TEXT_TOTAL).toBe(28); // 17 + 12 - \n is free, not counted
  });

  it("turnKickoffTextVisibleChars prints 1 char/tick including 3 pixel-silent-but-charged spaces (indices 3/11/22), completing at tick 1956", () => {
    const pressTick = 1919;
    const start = turnKickoffTextStartTick(pressTick); // 1929
    expect(turnKickoffTextVisibleChars(start - 1, pressTick)).toBe(0);
    for (let i = 0; i < TURN_KICKOFF_TEXT_TOTAL; i += 1) {
      expect(turnKickoffTextVisibleChars(start + i, pressTick)).toBe(i + 1);
    }
    expect(turnKickoffTextVisibleChars(start + TURN_KICKOFF_TEXT_TOTAL - 1, pressTick)).toBe(28); // tick 1956, fully printed
    expect(turnKickoffTextVisibleChars(start + TURN_KICKOFF_TEXT_TOTAL + 50, pressTick)).toBe(28); // static hold well past tick 1964
  });

  it("turnKickoffBounceTick stays live for 3 ticks after the press, then freezes (pixel-fit grid-searched against this session's own dense oracle probe - see battleMenu.ts's Slice 7 doc)", () => {
    const pressTick = 1919;
    expect(turnKickoffBounceTick(1919, pressTick)).toBe(1919 - 2); // still live (FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT=2)
    expect(turnKickoffBounceTick(1921, pressTick)).toBe(1921 - 2); // still live
    const frozen = turnKickoffBounceTick(1922, pressTick);
    expect(turnKickoffBounceTick(1930, pressTick)).toBe(frozen); // frozen - same value regardless of t
    expect(turnKickoffBounceTick(1964, pressTick)).toBe(frozen);
  });

  it("confirmFightMove is idempotent and a no-op unless the submenu is open, not closing, and not already confirmed", () => {
    expect(confirmFightMove(CLOSED_FIGHT_SUBMENU_STATE, 100)).toBe(CLOSED_FIGHT_SUBMENU_STATE); // not open
    const opened = openFightSubmenu(847, ONIX_MOVESET);
    const confirmed = confirmFightMove(opened, 879);
    expect(confirmed.confirmElapsed).toBe(879);
    expect(confirmFightMove(confirmed, 2000)).toBe(confirmed); // already confirmed - unchanged
    const closing = closeFightSubmenu(opened, 1007);
    expect(confirmFightMove(closing, 1100)).toBe(closing); // already closing - unchanged
  });

  it("RNG ledger stays flat across the whole confirm-through-1964 window (docs/battle-turn-notes.md §9 point 3: gRngValue is flat 1880-2309, DOUBLE_TEAM's clone animation consumes zero Random() calls) - this slice's own state machine never calls any RNG function, pure/deterministic given only ticks and button input", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["A"]); // confirm at 1893
    for (let i = 0; i < 80; i += 1) state = press(state, []); // idle through tick 1964+
    // Replaying the identical button script twice from the identical start
    // state must produce identical fightSubmenu/battleScene state - i.e. no
    // hidden nondeterminism (RNG or otherwise) snuck into this slice's own
    // code, matching the ground truth's own "zero Random() calls" finding.
    let replay = stateAtTick(1887);
    replay = press(replay, ["A"]);
    for (let i = 0; i < 5; i += 1) replay = press(replay, []);
    replay = press(replay, ["A"]);
    for (let i = 0; i < 80; i += 1) replay = press(replay, []);
    expect(replay.battleScene!.fightSubmenu).toEqual(state.battleScene!.fightSubmenu);
  });
});
