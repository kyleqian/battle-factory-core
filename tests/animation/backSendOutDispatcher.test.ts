import { describe, expect, it } from "vitest";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_SEND_OUT_REDUCERS,
  backSendOutFrameAtTick,
} from "../../src/animation/sendOutDispatcher.ts";
import { type SpeciesIdleOffset } from "../../src/animation/speciesIdleAnim.ts";
import {
  type BackSendOutAnimationSelection,
  BACK_ANIM_NATURE_ORDER,
  backCircleCounterclockwiseFrameAtTick,
  backConcaveArcLargeFrameAtTick,
  backConcaveArcSmallFrameAtTick,
  backConvexDoubleArcFrameAtTick,
  backDipRightSideFrameAtTick,
  backGrowFrameAtTick,
  backGrowInStagesFrameAtTick,
  backGrowStutterFrameAtTick,
  backHorizontalRepeatedSpringFrameAtTick,
  backHorizontalShakeFrameAtTick,
  backHorizontalSlideFrameAtTick,
  backHorizontalSpringFrameAtTick,
  backHorizontalStretchFrameAtTick,
  backHorizontalVibrateFrameAtTick,
  backJoltRightFrameAtTick,
  backShakeFlashYellowFrameAtTick,
  backShakeGlowBlueFrameAtTick,
  backShakeGlowGreenFrameAtTick,
  backShakeGlowRedFrameAtTick,
  backShrinkGrowFrameAtTick,
  backShrinkGrowVibrateFrameAtTick,
  backTriangleDownFrameAtTick,
  backVerticalShakeFrameAtTick,
  backVerticalShakeHorizontalSlideFrameAtTick,
  backVerticalShakeLowFrameAtTick,
  backVerticalStretchFrameAtTick,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const speciesToBackAnimSet = selectorTables.speciesToBackAnimSet.species as Readonly<Record<string, string>>;

type BackReducer = (
  species: string,
  natureId: number,
  ticksSinceStart: number,
) => SpeciesIdleOffset | null;

const BACK_ANIM_GROW_IN_STAGES_SELECTOR = "ANIM_GROW_IN_STAGES";
/** natureMod 0 -> ANIM_GROW_TWICE; natureMod 1 -> ANIM_GROW; natureMod 2 -> ANIM_GROW_IN_STAGES. */
const GROW_PLAIN_NATURES = ["NATURE_HARDY", "NATURE_BOLD"] as const;
const GROW_IN_STAGES_NATURE = "NATURE_TIMID" as const;

/**
 * Independent oracle map, built directly from the exported reducers (not from
 * `BACK_SEND_OUT_REDUCERS`), so a misrouting in the dispatcher's own map is
 * caught rather than asserted against itself.
 */
const TEST_BACK_REDUCERS: Readonly<Record<string, BackReducer>> = Object.freeze({
  BACK_ANIM_H_VIBRATE: backHorizontalVibrateFrameAtTick,
  BACK_ANIM_H_SLIDE: backHorizontalSlideFrameAtTick,
  BACK_ANIM_H_SPRING: backHorizontalSpringFrameAtTick,
  BACK_ANIM_H_SPRING_REPEATED: backHorizontalRepeatedSpringFrameAtTick,
  BACK_ANIM_SHRINK_GROW: backShrinkGrowFrameAtTick,
  BACK_ANIM_GROW: backGrowFrameAtTick,
  BACK_ANIM_CIRCLE_COUNTERCLOCKWISE: backCircleCounterclockwiseFrameAtTick,
  BACK_ANIM_H_SHAKE: backHorizontalShakeFrameAtTick,
  BACK_ANIM_V_SHAKE: backVerticalShakeFrameAtTick,
  BACK_ANIM_V_SHAKE_H_SLIDE: backVerticalShakeHorizontalSlideFrameAtTick,
  BACK_ANIM_V_STRETCH: backVerticalStretchFrameAtTick,
  BACK_ANIM_H_STRETCH: backHorizontalStretchFrameAtTick,
  BACK_ANIM_GROW_STUTTER: backGrowStutterFrameAtTick,
  BACK_ANIM_V_SHAKE_LOW: backVerticalShakeLowFrameAtTick,
  BACK_ANIM_TRIANGLE_DOWN: backTriangleDownFrameAtTick,
  BACK_ANIM_CONCAVE_ARC_LARGE: backConcaveArcLargeFrameAtTick,
  BACK_ANIM_CONVEX_DOUBLE_ARC: backConvexDoubleArcFrameAtTick,
  BACK_ANIM_CONCAVE_ARC_SMALL: backConcaveArcSmallFrameAtTick,
  BACK_ANIM_DIP_RIGHT_SIDE: backDipRightSideFrameAtTick,
  BACK_ANIM_SHRINK_GROW_VIBRATE: backShrinkGrowVibrateFrameAtTick,
  BACK_ANIM_JOLT_RIGHT: backJoltRightFrameAtTick,
  BACK_ANIM_SHAKE_FLASH_YELLOW: backShakeFlashYellowFrameAtTick,
  BACK_ANIM_SHAKE_GLOW_RED: backShakeGlowRedFrameAtTick,
  BACK_ANIM_SHAKE_GLOW_GREEN: backShakeGlowGreenFrameAtTick,
  BACK_ANIM_SHAKE_GLOW_BLUE: backShakeGlowBlueFrameAtTick,
});

/** The single selector variant routed to the distinct GrowInStages reducer. */
function reducerForSelection(selection: BackSendOutAnimationSelection): BackReducer {
  if (selection.backAnimSet === "BACK_ANIM_GROW") {
    return selection.selector === BACK_ANIM_GROW_IN_STAGES_SELECTOR
      ? backGrowInStagesFrameAtTick
      : backGrowFrameAtTick;
  }
  const reducer = TEST_BACK_REDUCERS[selection.backAnimSet];
  if (reducer === undefined) throw new Error(`no test reducer for ${selection.backAnimSet}`);
  return reducer;
}

function project(offset: SpeciesIdleOffset | null): SpeciesIdleOffset | null {
  if (offset === null) return null;
  return { x2: offset.x2, y2: offset.y2 };
}

function directReducerResult(
  species: string,
  nature: string,
  ticksSinceStart: number,
): SpeciesIdleOffset | null {
  const natureId = BACK_ANIM_NATURE_ORDER.indexOf(nature);
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection === null) return null;
  return project(reducerForSelection(selection)(species, natureId, ticksSinceStart));
}

const speciesKeys = Object.keys(speciesToBackAnimSet);
const backSetNames = [...new Set(Object.values(speciesToBackAnimSet))].sort();

/** First (alphabetically) species key whose back set is `set`. */
function speciesForBackSet(set: string): string {
  const species = speciesKeys
    .filter((key) => speciesToBackAnimSet[key] === set)
    .sort();
  expect(species.length, `no species maps to ${set}`).toBeGreaterThan(0);
  return species[0]!;
}

describe("send-out back dispatcher", () => {
  it("exposes all 25 accepted back sets", () => {
    expect(BACK_ANIM_NATURE_ORDER.length).toBe(25);
    expect([...Object.keys(BACK_SEND_OUT_REDUCERS)].sort()).toEqual(backSetNames);
    expect(Object.keys(BACK_SEND_OUT_REDUCERS).length).toBe(25);
  });

  it("routing totality: every species x every nature agrees with its set reducer", () => {
    let routed = 0;
    let nullAtTickZero = 0;
    for (const species of speciesKeys) {
      for (const nature of BACK_ANIM_NATURE_ORDER) {
        const dispatched = backSendOutFrameAtTick(species, nature, 0);
        const expected = directReducerResult(species, nature, 0);
        expect(dispatched, `${species} ${nature}`).toEqual(expected);
        if (dispatched === null) nullAtTickZero += 1;
        else routed += 1;
      }
    }
    expect(routed).toBe(speciesKeys.length * BACK_ANIM_NATURE_ORDER.length - nullAtTickZero);
    expect(nullAtTickZero).toBe(0);
  });

  it("per-set passthrough matches the direct reducer across mid-flight ticks", () => {
    const ticks = [0, 1, 5, 17, 40, 90, 200];
    for (const set of backSetNames) {
      const species = speciesForBackSet(set);
      for (const tick of ticks) {
        const nature = BACK_ANIM_NATURE_ORDER[0]!;
        const dispatched = backSendOutFrameAtTick(species, nature, tick);
        const expected = directReducerResult(species, nature, tick);
        expect(dispatched, `${set} ${species} ${tick}`).toEqual(expected);
      }
    }
  });

  it("GROW dispatches both reducer entry points by selector variant", () => {
    const growSpecies = speciesKeys
      .filter((key) => speciesToBackAnimSet[key] === "BACK_ANIM_GROW")
      .sort();
    expect(growSpecies.length).toBeGreaterThan(0);
    for (const species of growSpecies) {
      for (const nature of GROW_PLAIN_NATURES) {
        const selection = selectBackSendOutAnimation(
          species,
          BACK_ANIM_NATURE_ORDER.indexOf(nature),
        );
        expect(selection?.selector, nature).not.toBe("ANIM_GROW_IN_STAGES");
        for (const tick of [0, 1, 5, 17, 40, 90, 200]) {
          expect(backSendOutFrameAtTick(species, nature, tick)).toEqual(
            directReducerResult(species, nature, tick),
          );
        }
      }
      const selection = selectBackSendOutAnimation(
        species,
        BACK_ANIM_NATURE_ORDER.indexOf(GROW_IN_STAGES_NATURE),
      );
      expect(selection?.selector).toBe("ANIM_GROW_IN_STAGES");
      for (const tick of [0, 1, 5, 17, 40, 90, 200]) {
        expect(backSendOutFrameAtTick(species, GROW_IN_STAGES_NATURE, tick)).toEqual(
          directReducerResult(species, GROW_IN_STAGES_NATURE, tick),
        );
      }
    }
  });

  it("large-tick stability: ShakeGlow colors settle on their terminal frame", () => {
    const shakeGlowSets = [
      "BACK_ANIM_SHAKE_GLOW_RED",
      "BACK_ANIM_SHAKE_GLOW_GREEN",
      "BACK_ANIM_SHAKE_GLOW_BLUE",
    ] as const;
    const settledTicks = new Map<string, number>();
    for (const set of shakeGlowSets) {
      const species = speciesForBackSet(set);
      const nature = BACK_ANIM_NATURE_ORDER[0]!;
      const settledTick = scanSettledTick(species, nature);
      settledTicks.set(set, settledTick);
      expect(backSendOutFrameAtTick(species, nature, 5000)).toEqual(
        backSendOutFrameAtTick(species, nature, settledTick),
      );
    }
    expect([...settledTicks.values()].every((t) => Number.isInteger(t) && t >= 0)).toBe(true);
  });

  it("returns null for unknown species, unknown nature, or invalid ticks", () => {
    expect(backSendOutFrameAtTick("NOT_A_SPECIES", "NATURE_HARDY", 0)).toBeNull();
    expect(backSendOutFrameAtTick("BULBASAUR", "NATURE_BOGUS", 0)).toBeNull();
    expect(backSendOutFrameAtTick("BULBASAUR", "NATURE_HARDY", -1)).toBeNull();
    expect(backSendOutFrameAtTick("BULBASAUR", "NATURE_HARDY", 2.5)).toBeNull();
  });

  it("returns a frozen offset object", () => {
    expect(Object.isFrozen(backSendOutFrameAtTick("BULBASAUR", "NATURE_HARDY", 5))).toBe(true);
    expect(Object.isFrozen(backSendOutFrameAtTick("ONIX", "NATURE_QUIRKY", 5))).toBe(true);
  });
});

/**
 * First tick whose projected offset is unchanged for a 200-tick window — the
 * reducer's own settled terminal frame (reducers break at WaitAnimEnd, so the
 * value never changes again).
 */
function scanSettledTick(species: string, nature: string): number {
  const probe = (t: number) => backSendOutFrameAtTick(species, nature, t);
  for (let tick = 0; tick <= 2000; tick += 1) {
    const value = probe(tick);
    let stable = true;
    for (let window = 1; window <= 200; window += 1) {
      const next = probe(tick + window);
      if (next === null || next.x2 !== value?.x2 || next.y2 !== value?.y2) {
        stable = false;
        break;
      }
    }
    if (stable) return tick;
  }
  throw new Error(`no settled tick within 2000 for ${species} ${nature}`);
}
