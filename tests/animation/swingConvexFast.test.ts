import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ADD_NEW_ANIM_DEFAULTS,
  speciesFrontIdleRestOffset,
  SWING_CONCAVE_FAST_INITIALIZER,
  swingConcaveFastFrameAtTick,
  swingConvexFastFrameAtTick,
  SWING_CONVEX_FAST_FACTORY_FRONT_SPECIES,
  SWING_CONVEX_FAST_FRONT_SPECIES,
  SWING_CONVEX_FAST_INITIALIZER,
  SWING_CONVEX_FAST_OUTSIDE_FACTORY_FRONT_SPECIES,
  SWING_CONVEX_INITIALIZERS,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_SWING_CONVEX_FAST", () => {
  it("derives the complete one-mapping Factory census with no outside mapping", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_SWING_CONVEX_FAST")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["LUNATONE"]);
    expect(SWING_CONVEX_FAST_FRONT_SPECIES).toEqual(generated);
    expect(SWING_CONVEX_FAST_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(SWING_CONVEX_FAST_FACTORY_FRONT_SPECIES).toEqual(["LUNATONE"]);
    expect(SWING_CONVEX_FAST_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(speciesFrontIdleRestOffset("LUNATONE")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins AddNewAnim defaults, selector-14 overrides, and its immediate first callback", () => {
    expect(ADD_NEW_ANIM_DEFAULTS).toEqual({
      rotation: 0, delay: 0, runs: 1, speed: 0, data: 0,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(SWING_CONVEX_FAST_INITIALIZER).toEqual({
      selector: "ANIM_SWING_CONVEX_FAST",
      sourceId: 14,
      data: 50,
      runs: 2,
      callbackInvokedByInitializer: true,
      callbackInstalled: "SwingConvex",
      normalFrontDontFlip: true,
      affineMode: "double",
      accepted: true,
    });
    expect(swingConvexFastFrameAtTick(0)).toEqual({
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
      callback: "SwingConvex",
      affineMode: "double",
    });
  });

  it("exhausts all 103 source calls across both runs with C-truncated opposite-sign affine writes", () => {
    const calls = Array.from({ length: 103 }, (_, tick) => {
      if (tick === 51) {
        return swingConvexFastFrameAtTick(tick);
      }

      const data2Before = tick <= 50 ? tick : tick - 51;
      const runs = tick <= 50 ? 2 : 1;
      const index = Math.trunc((data2Before * 256) / 50);
      const sine10 = Math.floor((10 * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
      const sine3276 = Math.floor((3276 * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
      const convex = swingConvexFastFrameAtTick(tick);
      const concave = swingConcaveFastFrameAtTick(tick);

      if (tick === 102) {
        expect(convex, `terminal call ${tick}`).toEqual({
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
        });
        expect(concave).toMatchObject({
          callback: "WaitAnimEnd",
          affineRotation: 0,
          resetSpriteAfterAnim: true,
        });
        return convex;
      }

      expect(convex, `call ${tick}`).toEqual({
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
        affineRotation: -sine3276 + 0,
        startedAffine: tick === 0,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "SwingConvex",
        affineMode: "double",
      });
      expect(concave, `concave regression ${tick}`).toMatchObject({
        x2: -sine10 + 0,
        affineRotation: sine3276 + 0,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
      });
      expect(convex!.affineRotation).toBe(-concave!.affineRotation + 0);
      return convex;
    });

    expect(calls).toHaveLength(103);
    expect(calls[51]).toEqual({
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
      callback: "SwingConvex",
      affineMode: "double",
    });
    expect(calls[52]).toMatchObject({
      data2: 2,
      animRuns: 1,
      index: 5,
      startedAffine: false,
    });
  });

  it("keeps the terminal stable, rejects invalid input, and preserves adjacent controls", () => {
    const terminal = swingConvexFastFrameAtTick(102);
    expect(swingConvexFastFrameAtTick(103)).toEqual(terminal);
    expect(swingConvexFastFrameAtTick(1000)).toEqual(terminal);
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(swingConvexFastFrameAtTick(invalid)).toBeNull();
    }

    expect(SWING_CONCAVE_FAST_INITIALIZER.accepted).toBe(true);
    expect(SWING_CONVEX_INITIALIZERS.normal.accepted).toBe(true);
    expect(SWING_CONVEX_INITIALIZERS.fast.accepted).toBe(true);
    expect(SWING_CONVEX_INITIALIZERS.fastShort.accepted).toBe(false);
    expect(selectorTables.frontAnimIds.species.IGGLYBUFF).toBe("ANIM_SWING_CONCAVE_FAST");
    expect(selectorTables.frontAnimIds.species.LUNATONE).toBe("ANIM_SWING_CONVEX_FAST");
  });
});
