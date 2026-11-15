// lbr-g (ISSUES #221 E1 + E2 + E3): the ROM-measured draw counts per tick of a challenge-ending battle's return to the Lobby
// (docs/lbw1-lobby-wander-evidence.md, lbr-g). Frame deltas come from `sRandCount` on lbra-forfeit-off / lbra-loss-off.
import { describe, expect, it } from "vitest";
import { lobbyLoadExtraRng, lobbyReturnRngSteps } from "../src/engine/battleExitRng.ts";

const span = (from: number, to: number, forfeit: boolean): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => lobbyReturnRngSteps(from + i, forfeit));

describe("lbr-g: Lobby return draw counts", () => {
  it("draws nothing until ReturnFromBattleToOverworld (gMain.inBattle still set), then the Pokerus pair and the save-block move", () => {
    expect(span(1, 42, false).every((n) => n === 0)).toBe(true);
    expect(span(43, 48, false)).toEqual([2, 1, 2, 3, 1, 1]);
    expect(span(43, 48, true)).toEqual([2, 1, 2, 3, 1, 1]);
  });

  it("adds the 2 + 3 Lobby map-load draws on entry + 3 / + 4 (loss: age 105; forfeit returns one tick sooner: 104)", () => {
    expect(span(102, 108, false)).toEqual([1, 1, 1, 3, 4, 1, 1]);
    expect(span(101, 107, true)).toEqual([1, 1, 1, 3, 4, 1, 1]);
  });

  it("owes only the map-load draws when no battle exit precedes the Lobby (retire, staged 7th win)", () => {
    expect([0, 1, 2, 3, 4, 5].map(lobbyLoadExtraRng)).toEqual([0, 0, 0, 2, 3, 0]);
  });
});
