// Tier-1 pins for the FIGHT (move-select) submenu's state machine
// (docs/battle-turn-notes.md §11) - open/nav/close, cursor index, JOY_NEW
// gating (no auto-repeat), and the B-close cycle-phase continuation. Pure
// logic/state only, per this run's Tier-1/Tier-2 split - pixel parity lives
// in tools/compare/traces/fight-submenu.json (234/235, one attributed
// anomaly - see docs/battle-menu-notes.md's new section).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
import { TICK0 as SCENE_TICK0, TURN5_SITRUS_MENU_REOPEN_GATE_DELAY } from "../src/engine/battleScene.ts";
import { createInitialState, render, tick, type EngineState } from "../src/engine/core.ts";
import { rockSlideOpponentHp, currentPPForActiveMon } from "../src/engine/battleMenu.ts";
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
      reopenedFromClose: false,
    });
  });

  it("openFightSubmenu sets openElapsed and resets cursor/displayCursor to ROCK_SLIDE", () => {
    const state = openFightSubmenu(847, ONIX_MOVESET);
    expect(state).toEqual({ openElapsed: 847, cursor: 0, displayCursor: 0, closeElapsed: null, confirmElapsed: null, activeMonMoveset: ONIX_MOVESET, reopenedFromClose: false });
  });

  it("openFightSubmenu's optional initialCursor persists the prior turn's own cursor position (S7 slice F, docs/battle-turn-notes.md §13: turn 3's reopen rests on slot 2, DRAGON_BREATH, where turn 2's own confirm left it)", () => {
    const state = openFightSubmenu(3846, ONIX_MOVESET, 2);
    expect(state).toEqual({ openElapsed: 3846, cursor: 2, displayCursor: 2, closeElapsed: null, confirmElapsed: null, activeMonMoveset: ONIX_MOVESET, reopenedFromClose: false });
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
    battleScene: { elapsed: firstTickAbsolute - SCENE_TICK0 - 1, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false },
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

describe("battleMenu: ISSUES #25 - a B-close no longer strands the submenu forever; a fresh A-press reopens it, cursor persisted, at every turn epoch", () => {
  it("turn 1 epoch (pre-confirm): B-close then A before the close redraw settles is still ignored (the gate itself, not just the reopen, is pixel-timed)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // opens at 1887
    for (let i = 0; i < 5; i += 1) state = press(state, []); // reveal at 1892
    state = press(state, ["RIGHT"]); // nav to BIND (cursor 1)
    state = press(state, []); // displayCursor catches up
    state = press(state, ["B"]); // close
    expect(state.battleScene!.fightSubmenu.closeElapsed).not.toBeNull();
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 2; i += 1) state = press(state, []); // one tick short of settled
    state = press(state, ["A"]); // too early - still stranded pre-fix-style
    expect(state.battleScene!.fightSubmenu.openElapsed).not.toBeNull(); // (never actually became null - `closeFightSubmenu` doesn't touch it)
    expect(state.battleScene!.fightSubmenu.closeElapsed).not.toBeNull(); // still "closed, not yet reopenable"
    expect(state.battleScene!.fightSubmenu.cursor).toBe(1); // untouched by the rejected press
  });

  it("turn 1 epoch (pre-confirm): once the close redraw settles, a fresh A REOPENS the submenu with the cursor PERSISTED (not reset to ROCK_SLIDE) and reopenedFromClose=true, without advancing turn1Resolved/turn2Resolved (ISSUES #25's own exact reported scenario)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // opens at 1887
    for (let i = 0; i < 5; i += 1) state = press(state, []); // reveal at 1892
    state = press(state, ["RIGHT"]); // nav to BIND (cursor 1)
    state = press(state, []);
    state = press(state, ["B"]); // close
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []); // settle
    state = press(state, ["A"]); // reopen
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.openElapsed).not.toBeNull();
    expect(sm.closeElapsed).toBeNull();
    expect(sm.confirmElapsed).toBeNull();
    expect(sm.cursor).toBe(1); // persisted at BIND, exactly where the B-close left it
    expect(sm.displayCursor).toBe(1);
    expect(sm.reopenedFromClose).toBe(true);
    expect(state.battleScene!.turn1Resolved).toBe(false); // no turn-epoch flag advanced by this reopen
    expect(state.battleScene!.turn2Resolved).toBe(false);
    expect(state.battleScene!.turn3Resolved).toBe(false);
    expect(state.battleScene!.turn4Resolved).toBe(false);
  });

  it("the reopened submenu is fully interactive again: nav + a second close + a second reopen (close->reopen->nav->close->reopen cycling) keeps persisting the cursor each time", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["B"]); // close at ROCK_SLIDE (cursor 0, never navigated yet)
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []);
    state = press(state, ["A"]); // reopen #1
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    for (let i = 0; i < FIGHT_SUBMENU_OPEN_DELAY; i += 1) state = press(state, []); // this reopen's own settle
    state = press(state, ["DOWN"]); // nav to DRAGON_BREATH (cursor 2)
    expect(state.battleScene!.fightSubmenu.cursor).toBe(2);
    state = press(state, []);
    state = press(state, ["B"]); // close #2, cursor still 2
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []);
    state = press(state, ["A"]); // reopen #2
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.cursor).toBe(2); // persisted across BOTH close/reopen cycles
    expect(sm.reopenedFromClose).toBe(true);
    expect(state.battleScene!.turn1Resolved).toBe(false); // still no epoch flag advanced, after 2 full cycles
  });

  it("turn 3 epoch (post-confirm reopen): the SAME same-turn close/reopen mechanism also works once a turn-epoch reopen has already happened - cursor persists, and turn2Resolved (already true from the epoch reopen itself) is not advanced further by this same-turn cycle", () => {
    let state = stateAtTurn3Reopen(3846);
    state = press(state, ["A"]); // turn-epoch reopen for turn 3, cursor persisted at 2 (DRAGON_BREATH)
    expect(state.battleScene!.turn2Resolved).toBe(true);
    for (let i = 0; i < 5; i += 1) state = press(state, []); // FIGHT_SUBMENU_OPEN_DELAY settle
    state = press(state, ["UP"]); // nav 2(DRAGON_BREATH) -> 0(ROCK_SLIDE)
    state = press(state, []);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    state = press(state, ["B"]); // same-turn close
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []); // settle
    state = press(state, ["A"]); // ISSUES #25's own reopen branch, NOT a turn-epoch branch
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.openElapsed).not.toBeNull();
    expect(sm.closeElapsed).toBeNull();
    expect(sm.cursor).toBe(0); // persisted at ROCK_SLIDE, where the nav+close left it
    expect(sm.reopenedFromClose).toBe(true);
    expect(state.battleScene!.turn2Resolved).toBe(true); // unchanged - already true from the epoch reopen, not re-advanced
    expect(state.battleScene!.turn3Resolved).toBe(false); // NOT advanced by this same-turn cycle
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
        reopenedFromClose: false,
      },
      turn1Resolved: true,
      turn2Resolved: false,
      turn3Resolved: false, turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false
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

/** A synthetic EngineState at turn 3's own confirm (cursor 0, ROCK_SLIDE selected by the player, `turn2Resolved=true` - the state `turn3-menu.json`'s own committed trace reaches at tick 3891, right before its idle tail). */
function stateAtTurn3Confirm(): EngineState {
  const initial = createInitialState();
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: 3891 - SCENE_TICK0,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 3846 - SCENE_TICK0,
        cursor: 0,
        displayCursor: 0,
        closeElapsed: null,
        confirmElapsed: 3891 - SCENE_TICK0,
        activeMonMoveset: ONIX_MOVESET,
        reopenedFromClose: false,
      },
      turn1Resolved: true,
      turn2Resolved: true,
      turn3Resolved: false, turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false
    },
  };
}

describe("battleMenu: turn 3's ENDEAVOR resolution (S7 slice G, docs/battle-turn-notes.md §20)", () => {
  it("replaying turn3-menu.json's own committed button script (reopen/UP-nav/confirm) lands turn 3's own confirm at tick 3891, matching TURN3_CONFIRM_PRESS_TICK's own doc", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn3-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState();
    for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
    }
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(3891 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.turn2Resolved).toBe(true);
  });

  it("engine state stays well-formed (turn2Resolved, cursor 0) through the whole ENDEAVOR-again window - a pure smoke/determinism check, pixel parity lives in tools/compare/traces/turn3-endeavor.json", () => {
    let state = stateAtTurn3Confirm();
    for (let i = 0; i < 190; i += 1) state = press(state, []);
    expect(state.battleScene!.turn1Resolved).toBe(true);
    expect(state.battleScene!.turn2Resolved).toBe(true);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    // Replaying the identical idle window twice from the identical start
    // state must produce byte-identical battleScene state - no hidden
    // nondeterminism in the new turn-3 ENDEAVOR draw/dispatch path.
    let replay = stateAtTurn3Confirm();
    for (let i = 0; i < 190; i += 1) replay = press(replay, []);
    expect(replay.battleScene).toEqual(state.battleScene);
  });
});

describe("battleMenu/battleScene: turn 3's ROCK_SLIDE resolution (S7 slice H, docs/battle-turn-notes.md §21)", () => {
  it("the synthetic TURN3_ROCKSLIDE_PRESS_TICK anchor (3687) reuses rockSlideOpponentHp unchanged for Grovyle's own 88->41 drain, matching the RAM-probed schedule exactly", () => {
    const pressTick = 3687; // 4080 - ROCK_SLIDE_TEXT_DELAY(393), battleScene.ts's own TURN3_ROCKSLIDE_PRESS_TICK
    expect(rockSlideOpponentHp(pressTick + 596, pressTick, 88, 41)).toBe(88); // still full, one tick before the drain-start sentinel
    expect(rockSlideOpponentHp(pressTick + 597, pressTick, 88, 41)).toBe(88); // drain-start sentinel tick itself (ROCK_SLIDE_HP_DRAIN_START_DELAY)
    expect(rockSlideOpponentHp(pressTick + 598, pressTick, 88, 41)).toBe(87); // first 1-HP-unit decrement
    expect(rockSlideOpponentHp(pressTick + 644, pressTick, 88, 41)).toBe(41); // pressTick+597+(88-41): drain reaches its settled endpoint
    expect(rockSlideOpponentHp(pressTick + 700, pressTick, 88, 41)).toBe(41); // clamped, well past settle
  });

  it("replaying turn3-rockslide.json's own idle window renders ROCK_SLIDE's kickoff text hard-cutting the message box at tick 4080 (not 4079), text-clearing at 4349, and hard-cutting to the resettled menu at 4356 - the three pixel-confirmed anchors this slice's own doc names", () => {
    let state = stateAtTurn3Confirm();
    // stateAtTurn3Confirm() starts at battleScene.elapsed = 3891 - SCENE_TICK0 (the confirm tick itself); advance to each
    // boundary tick by pressing idle frames the same number of times as the elapsed-tick delta.
    const frameAt = (targetTick: number): Uint8Array => {
      let s = state;
      const target = targetTick - SCENE_TICK0;
      while (s.battleScene!.elapsed < target) s = press(s, []);
      return render(s);
    };
    const before4080 = frameAt(4079);
    const at4080 = frameAt(4080);
    expect(before4080).not.toEqual(at4080); // ROCK_SLIDE's own kickoff text hard-cuts the message box here, not a tick earlier/later

    const before4349 = frameAt(4348);
    const at4349 = frameAt(4349);
    expect(before4349).not.toEqual(at4349); // TURN3_ROCKSLIDE_TEXT_CLEAR_DELAY(662): the message box goes blank

    const before4356 = frameAt(4355);
    const at4356 = frameAt(4356);
    expect(before4356).not.toEqual(at4356); // TURN3_ROCKSLIDE_MENU_REDRAW_DELAY(669): hard cut to the resettled action menu
  });

  it("engine state stays well-formed and deterministic through the whole ROCK_SLIDE window (turn1Resolved/turn2Resolved unchanged, cursor still 0) - pixel parity lives in tools/compare/traces/turn3-rockslide.json", () => {
    let state = stateAtTurn3Confirm();
    for (let i = 0; i < 999; i += 1) state = press(state, []); // 3891 -> 4890, this slice's own committed trace boundary (before tick 4892, turn 4's own input, out of scope)
    expect(state.battleScene!.turn1Resolved).toBe(true);
    expect(state.battleScene!.turn2Resolved).toBe(true);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    let replay = stateAtTurn3Confirm();
    for (let i = 0; i < 999; i += 1) replay = press(replay, []);
    expect(replay.battleScene).toEqual(state.battleScene);
  });
});

describe("battleMenu/battleScene: turn 4's FIGHT-submenu reopen (S7 slice I, docs/battle-turn-notes.md §13/§22)", () => {
  it("replaying turn4-menu.json's own committed button script (reopen, NO nav needed, confirm) lands turn 4's own confirm at tick 4925, cursor persisted at 0 (ROCK_SLIDE, unchanged since turn 3), turn3Resolved flips true", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn4-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState();
    for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
    }
    // 4893, not 4892: the "last frame of the 2-frame hold" convention every
    // other CONFIRM/OPEN press tick in this dossier already uses (`newKeys`
    // fires on the FIRST held frame, but `battleScene.elapsed+1` at THAT
    // tick's own `tick()` call lands one tick later in trace-tick terms -
    // same lag `TURN1/2/3_CONFIRM_PRESS_TICK`'s own docs describe).
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(4893 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(4925 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.turn1Resolved).toBe(true);
    expect(state.battleScene!.turn2Resolved).toBe(true);
    expect(state.battleScene!.turn3Resolved).toBe(true);
  });

  it("the turn-3-resolved reopen gate stays closed before TURN3_ROCKSLIDE_REOPEN_GATE_DELAY(465) has elapsed past turn 3's own real confirm (3891) - an early A press is simply dropped (fightSubmenu keeps turn 3's own already-confirmed state, no fresh openFightSubmenu call), matching turns 1/2/3's own reopen-gate precedent", () => {
    let state = stateAtTurn3Confirm();
    const confirmElapsedBefore = state.battleScene!.fightSubmenu.confirmElapsed;
    // Advance only 100 ticks (well short of the real gate delay, 465) then
    // try to reopen - the gate must still be closed, so this A is a no-op.
    for (let i = 0; i < 100; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.turn3Resolved).toBe(false);
    // A no-op press leaves the PRIOR (turn 3's own already-confirmed)
    // fightSubmenu state entirely untouched - confirmElapsed stays set
    // (a fresh reopen would reset it to null via `openFightSubmenu`).
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(confirmElapsedBefore);
  });

  it("currentPPForActiveMon: ROCK_SLIDE (slot 0) reads 8/10 once turn3Resolved (used turns 1 AND 3), independent of turn2Resolved's own slot-2 DRAGON_BREATH decrement", () => {
    const moveset = rentalMoveset("ONIX");
    expect(currentPPForActiveMon(moveset, true, true, true)[0]).toBe(moveset.maxPP[0] - 2);
    expect(currentPPForActiveMon(moveset, true, true, true)[0]).toBe(8);
    // Sanity: turn1Resolved alone (pre-turn-3) still reads 9/10, matching
    // every earlier turn's own pinned behavior - this test doesn't regress it.
    expect(currentPPForActiveMon(moveset, true, false, false)[0]).toBe(9);
  });

  it("engine state stays well-formed and deterministic through the reopen/confirm-registration window - pixel parity lives in tools/compare/traces/turn4-menu.json (44/44, 0 diff)", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn4-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    function replay(): EngineState {
      let state = createInitialState();
      for (const seg of trace.segments) {
        for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
      }
      return state;
    }
    expect(replay().battleScene).toEqual(replay().battleScene);
  });
});

function stateAtTurn4Confirm(): EngineState {
  const initial = createInitialState();
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: 4925 - SCENE_TICK0,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 4893 - SCENE_TICK0,
        cursor: 0,
        displayCursor: 0,
        closeElapsed: null,
        confirmElapsed: 4925 - SCENE_TICK0,
        activeMonMoveset: ONIX_MOVESET,
        reopenedFromClose: false,
      },
      turn1Resolved: true,
      turn2Resolved: true,
      turn3Resolved: true,
      turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false
    },
  };
}

function stateAtTurn5Confirm(): EngineState {
  const initial = createInitialState();
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: 5959 - SCENE_TICK0,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 5927 - SCENE_TICK0,
        cursor: 0,
        displayCursor: 0,
        closeElapsed: null,
        confirmElapsed: 5959 - SCENE_TICK0,
        activeMonMoveset: ONIX_MOVESET,
        reopenedFromClose: false,
      },
      turn1Resolved: true,
      turn2Resolved: true,
      turn3Resolved: true,
      turn4Resolved: true, turn5KoDismissElapsed: null, turn5Resolved: false
    },
  };
}

describe("battleMenu/battleScene: turn 5's FIGHT-submenu reopen (S7 slice J, docs/battle-turn-notes.md §13/§23)", () => {
  it("replaying turn5-menu.json's own committed button script (reopen, NO nav needed, confirm) lands turn 5's own confirm at tick 5959, cursor persisted at 0 (ROCK_SLIDE, unchanged since turn 3), turn4Resolved flips true", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn5-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState();
    for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
    }
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(5927 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(5959 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.turn1Resolved).toBe(true);
    expect(state.battleScene!.turn2Resolved).toBe(true);
    expect(state.battleScene!.turn3Resolved).toBe(true);
    expect(state.battleScene!.turn4Resolved).toBe(true);
  });

  it("the turn-4-resolved reopen gate stays closed before TURN4_ROCKSLIDE_MENU_REDRAW_DELAY(661) has elapsed past turn 4's own real confirm (4925) - an early A press is simply dropped, matching turns 1/2/3/4's own reopen-gate precedent", () => {
    let state = stateAtTurn4Confirm();
    const confirmElapsedBefore = state.battleScene!.fightSubmenu.confirmElapsed;
    for (let i = 0; i < 100; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.turn4Resolved).toBe(false);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(confirmElapsedBefore);
  });

  it("currentPPForActiveMon: ROCK_SLIDE (slot 0) reads 7/10 once turn4Resolved (used turns 1, 3 AND 4), independent of turn2Resolved's own slot-2 DRAGON_BREATH decrement", () => {
    const moveset = rentalMoveset("ONIX");
    expect(currentPPForActiveMon(moveset, true, true, true, true)[0]).toBe(moveset.maxPP[0] - 3);
    expect(currentPPForActiveMon(moveset, true, true, true, true)[0]).toBe(7);
    // Sanity: turn3Resolved alone (pre-turn-5) still reads 8/10, matching
    // slice I's own pinned behavior - this test doesn't regress it.
    expect(currentPPForActiveMon(moveset, true, true, true, false)[0]).toBe(8);
  });

  it("engine state stays well-formed and deterministic through the reopen/confirm-registration window - pixel parity lives in tools/compare/traces/turn5-menu.json (42/42, 0 diff; tick 5927's own former residual RESOLVED, see docs/battle-turn-notes.md §23)", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn5-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    function replay(): EngineState {
      let state = createInitialState();
      for (const seg of trace.segments) {
        for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
      }
      return state;
    }
    expect(replay().battleScene).toEqual(replay().battleScene);
  });

  it("engine state stays well-formed (turn4Resolved, cursor 0) through the whole ENDEAVOR-again window - a pure smoke/determinism check, pixel parity lives in tools/compare/traces/turn5-endeavor.json (254/254, 0 diff)", () => {
    let state = stateAtTurn5Confirm();
    for (let i = 0; i < 254; i += 1) state = press(state, []);
    expect(state.battleScene!.turn4Resolved).toBe(true);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    let replay = stateAtTurn5Confirm();
    for (let i = 0; i < 254; i += 1) replay = press(replay, []);
    expect(replay.battleScene).toEqual(state.battleScene);
  });
});

function stateAtTurn5SitrusConfirm(): EngineState {
  const initial = createInitialState();
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: 5959 - SCENE_TICK0,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 5927 - SCENE_TICK0,
        cursor: 0,
        displayCursor: 0,
        closeElapsed: null,
        confirmElapsed: 5959 - SCENE_TICK0,
        activeMonMoveset: ONIX_MOVESET,
        reopenedFromClose: false,
      },
      turn1Resolved: true,
      turn2Resolved: true,
      turn3Resolved: true,
      turn4Resolved: true, turn5KoDismissElapsed: 6561 - SCENE_TICK0, turn5Resolved: false
    },
  };
}

describe("battleMenu/battleScene: turn 6's FIGHT-submenu reopen (S7 slice N rung (a), docs/turn6-notes.md §5)", () => {
  it("replaying turn6-menu.json's own committed button script (reopen, NO nav needed, confirm) lands turn 6's own confirm at tick 7345, cursor persisted at 0 (ROCK_SLIDE, unchanged since turn 3), turn5Resolved flips true", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn6-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState();
    for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
    }
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(7313 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(7345 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.turn1Resolved).toBe(true);
    expect(state.battleScene!.turn2Resolved).toBe(true);
    expect(state.battleScene!.turn3Resolved).toBe(true);
    expect(state.battleScene!.turn4Resolved).toBe(true);
    expect(state.battleScene!.turn5Resolved).toBe(true);
  });

  it("the turn-5-resolved reopen gate stays closed before TURN5_SITRUS_MENU_REOPEN_GATE_DELAY has elapsed past turn 5's own real confirm (5959) - an early A press is simply dropped, matching turns 1-5's own reopen-gate precedent", () => {
    let state = stateAtTurn5SitrusConfirm();
    const confirmElapsedBefore = state.battleScene!.fightSubmenu.confirmElapsed;
    for (let i = 0; i < 100; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.turn5Resolved).toBe(false);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(confirmElapsedBefore);
  });

  it("the reopen gate opens exactly at TURN5_SITRUS_MENU_REOPEN_GATE_DELAY past turn 5's own confirm - idling to the eligible tick then pressing A reopens FIGHT for turn 6", () => {
    let state = stateAtTurn5SitrusConfirm();
    for (let i = 0; i < TURN5_SITRUS_MENU_REOPEN_GATE_DELAY; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.turn5Resolved).toBe(true);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBeNull();
  });

  it("currentPPForActiveMon: ROCK_SLIDE (slot 0) reads 6/10 once turn5Resolved (used turns 1, 3, 4 AND 5), independent of turn2Resolved's own slot-2 DRAGON_BREATH decrement", () => {
    const moveset = rentalMoveset("ONIX");
    expect(currentPPForActiveMon(moveset, true, true, true, true, true)[0]).toBe(moveset.maxPP[0] - 4);
    expect(currentPPForActiveMon(moveset, true, true, true, true, true)[0]).toBe(6);
    // Sanity: turn4Resolved alone (pre-turn-6) still reads 7/10, matching
    // slice J's own pinned behavior - this test doesn't regress it.
    expect(currentPPForActiveMon(moveset, true, true, true, true, false)[0]).toBe(7);
  });

  it("engine state stays well-formed and deterministic through the reopen/confirm-registration window - pixel parity lives in tools/compare/traces/turn6-menu.json (33/33, 0 diff, 11 named single-tick bounce-extremum residuals excluded, docs/battle-turn-notes.md's new §27)", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn6-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    function replay(): EngineState {
      let state = createInitialState();
      for (const seg of trace.segments) {
        for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
      }
      return state;
    }
    expect(replay().battleScene).toEqual(replay().battleScene);
  });
});
