import { describe, expect, it } from "vitest";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";
import { getWhoStrikesFirst, sortBattlersByTurnOrder, type TurnOrderBattler } from "../src/engine/turnOrder.ts";

// Battle 1 turn 1's real, RAM-confirmed speeds (docs/battle-turn-notes.md
// §4: gBattlerByTurnOrder = [1, 0], both moves priority 0, no ties).
const ONIX: TurnOrderBattler = { speed: 76, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };
const GROVYLE: TurnOrderBattler = { speed: 90, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };

describe("getWhoStrikesFirst - battle 1 turn 1 (RAM-pinned, real speeds, no tie)", () => {
  it("Grovyle (90) strikes before Onix (76) - both priority 0", () => {
    // battler1=Onix(0), battler2=Grovyle(1): result 1 means "battler2 strikes
    // first" i.e. swap, matching gBattlerByTurnOrder=[1,0].
    expect(getWhoStrikesFirst(ONIX, GROVYLE, 0)).toBe(1);
  });

  it("sortBattlersByTurnOrder([0,1]) reproduces gBattlerByTurnOrder = [1, 0]", () => {
    const battlers = new Map([
      [0, ONIX],
      [1, GROVYLE],
    ]);
    expect(sortBattlersByTurnOrder([0, 1], battlers)).toEqual([1, 0]);
  });
});

// S7 slice R (docs/turn9-notes.md §4): turn 9 is the first REAL scenario in
// this dossier's 1-9 arc with a nonzero-priority move (QUICK_ATTACK, +1) -
// the priority branch's first real-window exercise, RAM-confirmed
// (`gBattlerAttacker` flips 0->1 at tick 10876, Pidgeotto acts first) and
// pixel-confirmed (the kickoff text reads "Foe PIDGEOTTO used\nQUICK
// ATTACK!" before "ONIX used\nROCK SLIDE!"). Onix's own Speed (76) vs.
// Pidgeotto's (77) already favors Pidgeotto by a plain 1-point margin, so
// this specific matchup doesn't ALSO prove priority overrides a losing
// speed - `getWhoStrikesFirst`'s own synthetic priority-override case above
// already covers that; this pin's job is just to confirm the real turn-9
// battler pair produces the real turn-9 order end to end.
const TURN9_ONIX: TurnOrderBattler = { speed: 76, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 }; // ROCK_SLIDE
const TURN9_PIDGEOTTO: TurnOrderBattler = { speed: 77, speedStage: DEFAULT_STAT_STAGE, movePriority: 1 }; // QUICK_ATTACK

describe("getWhoStrikesFirst - battle 1 turn 9 (RAM-pinned, docs/turn9-notes.md §4: QUICK_ATTACK's +1 priority, first nonzero-priority move this arc)", () => {
  it("Pidgeotto (QUICK_ATTACK, priority 1) strikes before Onix (ROCK_SLIDE, priority 0), matching gBattlerAttacker flipping to 1 first", () => {
    // battler1=Onix(0), battler2=Pidgeotto(1): result 1 means "battler2
    // strikes first" i.e. swap.
    expect(getWhoStrikesFirst(TURN9_ONIX, TURN9_PIDGEOTTO, 0)).toBe(1);
  });

  it("sortBattlersByTurnOrder([0,1]) reproduces the real turn-9 order [1, 0]", () => {
    const battlers = new Map([
      [0, TURN9_ONIX],
      [1, TURN9_PIDGEOTTO],
    ]);
    expect(sortBattlersByTurnOrder([0, 1], battlers)).toEqual([1, 0]);
  });

  it("priority alone (not just this pair's own speed margin) decides it: even with Onix given the FASTER speed, QUICK_ATTACK's priority still goes first", () => {
    const fastOnix: TurnOrderBattler = { ...TURN9_ONIX, speed: 200 };
    expect(getWhoStrikesFirst(fastOnix, TURN9_PIDGEOTTO, 0)).toBe(1);
  });
});

describe("getWhoStrikesFirst - speed-tie Random()&1 tie-break (synthetic, unreachable in battle 1)", () => {
  // docs/turn-resolution-notes.md §6 risk 4: none of battle 1's 9 possible
  // active pairings tie on speed, so this branch needs a direct synthetic
  // unit test rather than an oracle-trace pin.
  const tiedA: TurnOrderBattler = { speed: 100, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };
  const tiedB: TurnOrderBattler = { speed: 100, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };

  it("bit 0 = 0: battler1 strikes first (no swap)", () => {
    // Random() & 1 == 0 -> the `speed1 === speed2 && Random() & 1` guard is
    // false, falls through to `speed1 < speed2` (false, equal) -> result 0.
    expect(getWhoStrikesFirst(tiedA, tiedB, 0)).toBe(0);
    expect(getWhoStrikesFirst(tiedA, tiedB, 0b10)).toBe(0); // any even roll
  });

  it("bit 0 = 1: strikesFirst = 2 (battler2 struck as first, via the coin flip)", () => {
    expect(getWhoStrikesFirst(tiedA, tiedB, 1)).toBe(2);
    expect(getWhoStrikesFirst(tiedA, tiedB, 0b11)).toBe(2); // any odd roll
  });

  it("priority still overrides a speed tie", () => {
    const priority1: TurnOrderBattler = { ...tiedA, movePriority: 1 };
    expect(getWhoStrikesFirst(priority1, tiedB, 1)).toBe(0); // battler1's higher-priority move goes first regardless of the coin flip
  });
});
