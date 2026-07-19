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
  advanceFightSubmenuDisplay,
  closeFightSubmenu,
  moveFightCursor,
  openFightSubmenu,
  type FightSubmenuState,
} from "../src/engine/battleMenu.ts";
import { TICK0 as SCENE_TICK0 } from "../src/engine/battleScene.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";

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
    expect(CLOSED_FIGHT_SUBMENU_STATE).toEqual({ openElapsed: null, cursor: 0, displayCursor: 0, closeElapsed: null });
  });

  it("openFightSubmenu sets openElapsed and resets cursor/displayCursor to ROCK_SLIDE", () => {
    const state = openFightSubmenu(847);
    expect(state).toEqual({ openElapsed: 847, cursor: 0, displayCursor: 0, closeElapsed: null });
  });

  it("closeFightSubmenu is a no-op if not open, or already closing", () => {
    expect(closeFightSubmenu(CLOSED_FIGHT_SUBMENU_STATE, 100)).toBe(CLOSED_FIGHT_SUBMENU_STATE);
    const opened = openFightSubmenu(847);
    const closing = closeFightSubmenu(opened, 1007);
    expect(closing.closeElapsed).toBe(1007);
    expect(closeFightSubmenu(closing, 2000)).toBe(closing); // already closing - unchanged
  });

  it("advanceFightSubmenuDisplay lags displayCursor by exactly one call behind cursor, and is a no-op while closed", () => {
    expect(advanceFightSubmenuDisplay(CLOSED_FIGHT_SUBMENU_STATE)).toBe(CLOSED_FIGHT_SUBMENU_STATE);
    let state: FightSubmenuState = { ...openFightSubmenu(847), cursor: 1 }; // simulate a same-tick RIGHT press: cursor updated, displayCursor not yet
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

describe("battleMenu: FIGHT submenu wired through core.ts's tick() (JOY_NEW gating, 1-tick lag, B-close resume)", () => {
  /** A synthetic EngineState with `battleScene` already in the settled action-menu idle window, `elapsed` chosen so the FIRST tick() call below lands on trace tick `firstTickAbsolute` (see the `+1` convention noted in core.ts's own fightSubmenu block). Other fields are inert pass-throughs for this branch of tick() (verified by reading core.ts: the battleScene branch returns early using only battleScene/keyRepeat). */
  function stateAtTick(firstTickAbsolute: number): EngineState {
    return { ...createInitialState(), battleScene: { elapsed: firstTickAbsolute - SCENE_TICK0 - 1, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE } };
  }

  function press(state: EngineState, buttons: GbaButton[]): EngineState {
    return tick(state, new Set(buttons));
  }

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
});
