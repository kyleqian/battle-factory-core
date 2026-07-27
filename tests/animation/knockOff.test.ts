import { describe, expect, it } from "vitest";
import { knockOffBodyAtAge } from "../../src/animation/knockOff.ts";

describe("MOVE_KNOCK_OFF source-relative body", () => {
  it("composes the player lunge, strike, slide, and target shake epochs", () => {
    expect(Array.from({ length: 11 }, (_, age) =>
      knockOffBodyAtAge(age, "player", "opponent").attackerOffset.x2
    )).toEqual([0, 6, 12, 18, 24, 24, 24, 18, 12, 6, 0]);
    expect(knockOffBodyAtAge(4, "player", "opponent").strike).toEqual({
      angle: 192,
      sheetFrame: 0,
      mirrored: false,
    });
    expect(knockOffBodyAtAge(11, "player", "opponent").strike).toEqual({
      angle: 13,
      sheetFrame: 1,
      mirrored: false,
    });
    expect(knockOffBodyAtAge(12, "player", "opponent")).toMatchObject({
      attackerOffset: { x2: -4, y2: 3 },
      palette: { color: "white", coeff: 10 },
      hitsplatVisible: true,
    });
    expect(knockOffBodyAtAge(15, "player", "opponent").targetOffset)
      .toEqual({ x2: 0, y2: -3 });
    expect(knockOffBodyAtAge(26, "player", "opponent")).toMatchObject({
      attackerOffset: { x2: 0, y2: 10 },
      targetOffset: { x2: 0, y2: 0 },
      strike: null,
      palette: null,
      hitsplatVisible: false,
    });
  });

  it("mirrors only the source-declared side-sensitive mechanisms", () => {
    expect(knockOffBodyAtAge(4, "opponent", "player")).toMatchObject({
      attackerOffset: { x2: -24, y2: 0 },
      strike: { angle: 192, mirrored: true },
    });
    expect(knockOffBodyAtAge(12, "opponent", "player").attackerOffset)
      .toEqual({ x2: 4, y2: 3 });
    expect(knockOffBodyAtAge(20, "opponent", "player").attackerOffset)
      .toEqual({ x2: 10, y2: 10 });
  });
});
