import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ADD_NEW_ANIM_DEFAULTS,
  speciesFrontIdleRestOffset,
  SWING_CONCAVE_FAST_FACTORY_FRONT_SPECIES,
  SWING_CONCAVE_FAST_FRONT_SPECIES,
  SWING_CONCAVE_FAST_INITIALIZER,
  SWING_CONCAVE_FAST_OUTSIDE_FACTORY_FRONT_SPECIES,
  SWING_CONCAVE_FAST_SHORT_INITIALIZER,
  swingConcaveFastFrameAtTick,
  swingConcaveFastShortFrameAtTick,
  swingConcaveFrameAtTick,
  SWING_CONVEX_INITIALIZERS,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_SWING_CONCAVE_FAST", () => {
  it("derives the complete one-mapping Factory census with no outside mapping", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_SWING_CONCAVE_FAST")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["IGGLYBUFF"]);
    expect(SWING_CONCAVE_FAST_FRONT_SPECIES).toEqual(generated);
    expect(SWING_CONCAVE_FAST_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(SWING_CONCAVE_FAST_FACTORY_FRONT_SPECIES).toEqual(["IGGLYBUFF"]);
    expect(SWING_CONCAVE_FAST_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(speciesFrontIdleRestOffset("IGGLYBUFF")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins AddNewAnim defaults, selector-12 overrides, and its immediate first callback", () => {
    expect(ADD_NEW_ANIM_DEFAULTS).toEqual({
      rotation: 0, delay: 0, runs: 1, speed: 0, data: 0,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(SWING_CONCAVE_FAST_INITIALIZER).toEqual({
      selector: "ANIM_SWING_CONCAVE_FAST",
      sourceId: 12,
      data: 50,
      runs: 2,
      callbackInvokedByInitializer: true,
      callbackInstalled: "SwingConcave",
      normalFrontDontFlip: true,
      affineMode: "double",
      accepted: true,
    });
    expect(swingConcaveFastFrameAtTick(0)).toEqual({
      x2: 0,
      y2: 0,
      data2: 1,
      animRotation: 0,
      animDelay: 0,
      animRuns: 2,
      animSpeed: 0,
      animData: 50,
      index: 0,
      xScale: 256,
      yScale: 256,
      affineRotation: 0,
      startedAffine: true,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim: false,
      callback: "SwingConcave",
      affineMode: "double",
    });
  });

  it("exhausts both source-order runs, including the no-delay inter-run reset", () => {
    const expectActive = (tick: number, data2Before: number, runs: number, startedAffine: boolean) => {
      const index = Math.trunc((data2Before * 256) / 50);
      const sine10 = Math.floor((10 * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
      const sine3276 = Math.floor((3276 * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
      expect(swingConcaveFastFrameAtTick(tick), `tick ${tick}`).toEqual({
        x2: -sine10 + 0,
        y2: 0,
        data2: data2Before + 1,
        animRotation: 0,
        animDelay: 0,
        animRuns: runs,
        animSpeed: 0,
        animData: 50,
        index,
        xScale: 256,
        yScale: 256,
        affineRotation: sine3276 + 0,
        startedAffine,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "SwingConcave",
        affineMode: "double",
      });
    };

    for (let tick = 0; tick <= 50; tick += 1) {
      expectActive(tick, tick, 2, tick === 0);
    }

    expect(swingConcaveFastFrameAtTick(51)).toEqual({
      x2: 0,
      y2: 0,
      data2: 1,
      animRotation: 0,
      animDelay: 0,
      animRuns: 1,
      animSpeed: 0,
      animData: 50,
      index: null,
      xScale: 256,
      yScale: 256,
      affineRotation: 0,
      startedAffine: false,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim: false,
      callback: "SwingConcave",
      affineMode: "double",
    });

    for (let tick = 52; tick <= 101; tick += 1) {
      expectActive(tick, tick - 51, 1, false);
    }
  });

  it("uses the second strict terminal for identity/reset/WaitAnimEnd and stays stable", () => {
    const terminal = {
      x2: 0,
      y2: 0,
      data2: 52,
      animRotation: 0,
      animDelay: 0,
      animRuns: 1,
      animSpeed: 0,
      animData: 50,
      index: null,
      xScale: 256,
      yScale: 256,
      affineRotation: 0,
      startedAffine: false,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    } as const;
    expect(swingConcaveFastFrameAtTick(102)).toEqual(terminal);
    expect(swingConcaveFastFrameAtTick(103)).toEqual(terminal);
    expect(swingConcaveFastFrameAtTick(1000)).toEqual(terminal);
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(swingConcaveFastFrameAtTick(invalid)).toBeNull();
    }
  });

  it("keeps accepted concave siblings and unsupported convex-fast control separate", () => {
    expect(swingConcaveFrameAtTick(25)).toMatchObject({
      animData: 100,
      animRuns: 1,
      affineRotation: 3276,
    });
    expect(swingConcaveFastShortFrameAtTick(25)).toMatchObject({
      animData: 50,
      animRuns: 1,
      affineRotation: 0,
    });
    expect(SWING_CONCAVE_FAST_SHORT_INITIALIZER.accepted).toBe(true);
    expect(SWING_CONVEX_INITIALIZERS.fast.accepted).toBe(false);
    expect(selectorTables.frontAnimIds.species.LUNATONE).toBe("ANIM_SWING_CONVEX_FAST");
    expect(speciesFrontIdleRestOffset("LUNATONE")).toBeNull();
  });
});
