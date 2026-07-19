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
