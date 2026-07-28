export interface ResolvedFakeTearsControllerPresentation {
  readonly kind: "resolved-stat-drop";
  readonly kickoff: Readonly<{
    readonly messageId: "STRINGID_USEDMOVE";
    readonly firstAge: number;
  }>;
  readonly statChange: Readonly<{
    readonly battler: "target";
    readonly stat: "special-defense";
    readonly from: number;
    readonly to: number;
  }>;
  readonly statAnimation: Readonly<{
    readonly animationId: "STATS_CHANGE";
    readonly argument: number;
    readonly firstAge: number;
  }>;
  readonly result: Readonly<{
    readonly messageId: "STRINGID_DEFENDERSSTATFELL";
    readonly firstAge: number;
  }>;
  readonly moveEnd: Readonly<{
    readonly clearAge: number;
  }>;
}

export interface FakeTearsControllerDisplay {
  readonly phase:
    | "kickoff"
    | "source-body"
    | "stat-animation"
    | "result-message"
    | "move-end";
  readonly moveTextVisibleChars: number;
  readonly banner: Readonly<{ eva: number; bg1Y: number }> | null;
  readonly resultTextVisibleChars: number;
  readonly moveEnded: boolean;
}

const STAT_BANNER_TARGET_BLEND = 13;
const STAT_BANNER_HOLD_END_AGE = 149;
const STAT_BANNER_RAMP_DOWN_FIRST_AGE = 150;
const STAT_BANNER_LAST_AGE = 174;
const STAT_BANNER_BG_SCROLL_FIRST_AGE = 92;
const STAT_BANNER_BG_SCROLL_FLOOR = -246;

/**
 * Controller-owned Scene-ON presentation for a resolved Fake Tears drop.
 * Ages are relative to the move source body's first displayed frame. This
 * consumes the already-resolved stat result and command receipts; it never
 * applies a stage, advances a script, or draws RNG.
 */
export function fakeTearsControllerDisplayAtAge(
  age: number,
  input: Readonly<ResolvedFakeTearsControllerPresentation>,
  moveTextLength: number,
  resultTextLength: number,
): FakeTearsControllerDisplay {
  if (
    input.statChange.from - input.statChange.to !== 2
    || input.statAnimation.argument !== 55
  ) {
    throw new Error("Fake Tears presentation requires a resolved sharply-lowered SP. DEF receipt");
  }

  const resultTextVisibleChars =
    age >= input.result.firstAge && age < input.moveEnd.clearAge
      ? Math.min(resultTextLength, age - input.result.firstAge + 1)
      : 0;
  const moveTextVisibleChars =
    age < input.result.firstAge && age >= input.kickoff.firstAge
      ? Math.min(moveTextLength, age - input.kickoff.firstAge + 1)
      : 0;

  let banner: FakeTearsControllerDisplay["banner"] = null;
  if (
    age >= input.statAnimation.firstAge
    && age <= STAT_BANNER_LAST_AGE
  ) {
    const eva = age <= STAT_BANNER_HOLD_END_AGE
      ? Math.min(
          STAT_BANNER_TARGET_BLEND,
          Math.floor((age - input.statAnimation.firstAge) / 2) + 1,
        )
      : Math.max(
          0,
          STAT_BANNER_TARGET_BLEND
            - (Math.floor((age - STAT_BANNER_RAMP_DOWN_FIRST_AGE) / 2) + 1),
        );
    banner = {
      eva,
      bg1Y: Math.max(
        STAT_BANNER_BG_SCROLL_FLOOR,
        -3 * (age - STAT_BANNER_BG_SCROLL_FIRST_AGE),
      ),
    };
  }

  return {
    phase:
      age >= input.moveEnd.clearAge
        ? "move-end"
        : resultTextVisibleChars > 0
          ? "result-message"
          : banner !== null
            ? "stat-animation"
            : age >= 0
              ? "source-body"
              : "kickoff",
    moveTextVisibleChars,
    banner,
    resultTextVisibleChars,
    moveEnded: age >= input.moveEnd.clearAge,
  };
}
