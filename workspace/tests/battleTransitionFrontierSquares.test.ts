// SQUARES / SQUARES_SCROLL's clock, end, handoff and scroll direction (docs/trn225-frontier-transitions.md); the ROM-measured pictures are
// pinned frame by frame by tests/parityMacNolandRoomScenes.test.ts (silver-first-slow draws SQUARES_SCROLL).
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SQUARES_SCROLL_DIRECTIONS, squaresEndTe, squaresIntroHandoffTe, squaresScrollDirectionIndex, squaresState } from "../src/engine/battleTransitionSquares.ts";

const digest = (s: ReturnType<typeof squaresState>) => createHash("sha1").update(s.tile).update(s.pal).digest("hex").slice(0, 10);

describe("Frontier squares transitions", () => {
  it("ends and hands off on the ROM-measured clock", () => {
    expect([squaresEndTe("squares"), squaresIntroHandoffTe("squares")]).toEqual([168, 171]);
    expect([squaresEndTe("squaresScroll"), squaresIntroHandoffTe("squaresScroll")]).toEqual([207, 210]);
  });

  it("takes the scroll direction from the RNG state the task's Init sees (the Noland room's silver-first-slow, ROM-checked)", () => {
    expect(squaresScrollDirectionIndex(3_266_825_530)).toBe(1);
    expect(squaresScrollDirectionIndex(1_341_727_304)).toBe(2);
    expect(squaresScrollDirectionIndex(0)).toBe(2);
  });

  it("replays SQUARES callback by callback: filled bg, the black end on the callback after End", () => {
    const d = SQUARES_SCROLL_DIRECTIONS[1]!;
    const early = squaresState(30, "squares", d);
    expect([digest(early), early.tileset, early.ended]).toEqual(["190894a0de", "filledBg", false]);
    const end = squaresState(91, "squares", d);
    expect([digest(end), end.tileset, end.roomBlack, end.ended]).toEqual(["c982861551", "shrink2", true, true]);
  });

  it("steps the scroll by the task's direction, swapped onto the BG offsets, and zeroes it at the end", () => {
    const s = squaresState(40, "squaresScroll", SQUARES_SCROLL_DIRECTIONS[1]!);
    expect([digest(s), s.scrollV, s.scrollH]).toEqual(["c8b6d9247b", -19, -19]);
    const up = squaresState(40, "squaresScroll", SQUARES_SCROLL_DIRECTIONS[2]!);
    expect([up.scrollV, up.scrollH]).toEqual([19, -19]);
    const late = squaresState(37, "squaresScroll", SQUARES_SCROLL_DIRECTIONS[0]!);
    expect(late.scrollV).toBe(17);
    const end = squaresState(130, "squaresScroll", SQUARES_SCROLL_DIRECTIONS[1]!);
    expect([end.ended, end.scrollV, end.scrollH]).toEqual([true, 0, 0]);
  });
});
