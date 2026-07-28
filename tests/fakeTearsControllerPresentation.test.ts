import { describe, expect, it } from "vitest";
import {
  fakeTearsControllerDisplayAtAge,
  type ResolvedFakeTearsControllerPresentation,
} from "../src/engine/fakeTearsControllerPresentation.ts";

const receipt = Object.freeze({
  kind: "resolved-stat-drop",
  kickoff: { messageId: "STRINGID_USEDMOVE", firstAge: -31 },
  statChange: {
    battler: "target",
    stat: "special-defense",
    from: 6,
    to: 4,
  },
  statAnimation: {
    animationId: "STATS_CHANGE",
    argument: 55,
    firstAge: 94,
  },
  result: {
    messageId: "STRINGID_DEFENDERSSTATFELL",
    firstAge: 179,
  },
  moveEnd: { clearAge: 284 },
} as const satisfies ResolvedFakeTearsControllerPresentation);

describe("Fake Tears resolved controller presentation", () => {
  it("types every controller receipt without owning the move outcome", () => {
    expect(receipt).toMatchObject({
      statChange: { stat: "special-defense", from: 6, to: 4 },
      statAnimation: { animationId: "STATS_CHANGE", argument: 55 },
      result: { messageId: "STRINGID_DEFENDERSSTATFELL" },
    });
  });

  it("advances kickoff, stat banner, result printer, and move-end by relative age", () => {
    expect(fakeTearsControllerDisplayAtAge(-31, receipt, 24, 34))
      .toMatchObject({ phase: "kickoff", moveTextVisibleChars: 1 });
    expect(fakeTearsControllerDisplayAtAge(94, receipt, 24, 34))
      .toMatchObject({
        phase: "stat-animation",
        banner: { eva: 1, bg1Y: -6 },
      });
    expect(fakeTearsControllerDisplayAtAge(118, receipt, 24, 34).banner)
      .toEqual({ eva: 13, bg1Y: -78 });
    expect(fakeTearsControllerDisplayAtAge(150, receipt, 24, 34).banner)
      .toEqual({ eva: 12, bg1Y: -174 });
    expect(fakeTearsControllerDisplayAtAge(174, receipt, 24, 34).banner)
      .toEqual({ eva: 0, bg1Y: -246 });
    expect(fakeTearsControllerDisplayAtAge(179, receipt, 24, 34))
      .toMatchObject({ phase: "result-message", resultTextVisibleChars: 1 });
    expect(fakeTearsControllerDisplayAtAge(212, receipt, 24, 34))
      .toMatchObject({ resultTextVisibleChars: 34, moveEnded: false });
    expect(fakeTearsControllerDisplayAtAge(284, receipt, 24, 34))
      .toMatchObject({
        phase: "move-end",
        resultTextVisibleChars: 0,
        moveEnded: true,
      });
  });

  it("rejects an unresolved or incorrectly encoded stat-animation receipt", () => {
    expect(() => fakeTearsControllerDisplayAtAge(
      94,
      { ...receipt, statAnimation: { ...receipt.statAnimation, argument: 19 } },
      24,
      34,
    )).toThrow(/resolved sharply-lowered SP. DEF receipt/);
  });
});
