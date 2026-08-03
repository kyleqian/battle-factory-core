import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ADD_NEW_ANIM_DEFAULTS,
  speciesFrontIdleRestOffset,
  SWING_CONCAVE_FAST_SHORT_FACTORY_FRONT_SPECIES,
  SWING_CONCAVE_FAST_SHORT_FRONT_SPECIES,
  SWING_CONCAVE_FAST_SHORT_INITIALIZER,
  SWING_CONCAVE_FAST_SHORT_OUTSIDE_FACTORY_FRONT_SPECIES,
  swingConcaveFastShortFrameAtTick,
  swingConcaveFrameAtTick,
  swingConvexFrameAtTick,
  SWING_CONVEX_INITIALIZERS,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_SWING_CONCAVE_FAST_SHORT", () => {
  it("derives the complete 3-mapping census: 2 Factory and 1 outside", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_SWING_CONCAVE_FAST_SHORT")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["SANDSHREW", "KYOGRE", "LATIAS"]);
    expect(SWING_CONCAVE_FAST_SHORT_FRONT_SPECIES).toEqual(generated);
    expect(SWING_CONCAVE_FAST_SHORT_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(SWING_CONCAVE_FAST_SHORT_FACTORY_FRONT_SPECIES).toEqual([
      "SANDSHREW", "LATIAS",
    ]);
    expect(SWING_CONCAVE_FAST_SHORT_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["KYOGRE"]);
    for (const species of generated) {
      expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
    }
  });

  it("pins the source initializer receipt and task-zeroed signed registers", () => {
    expect(ADD_NEW_ANIM_DEFAULTS).toEqual({
      rotation: 0, delay: 0, runs: 1, speed: 0, data: 0,
    });
    expect(SWING_CONCAVE_FAST_SHORT_INITIALIZER).toEqual({
      selector: "ANIM_SWING_CONCAVE_FAST_SHORT",
      sourceId: 45,
      data: 50,
      runs: 1,
      callbackInvokedByInitializer: true,
      callbackInstalled: "SwingConcave",
      normalFrontDontFlip: true,
      affineMode: "double",
      accepted: true,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(swingConcaveFastShortFrameAtTick(0)).toMatchObject({
      data2: 1,
      animData: 50,
      animRuns: 1,
      startedAffine: true,
      normalFrontDontFlip: true,
      tryFlipXCalls: 2,
      callback: "SwingConcave",
      affineMode: "double",
    });
  });

  it("exhausts every active callback's C-truncated index, signed motion, and affine rotation", () => {
    const active = Array.from({ length: 51 }, (_, tick) => {
      const index = Math.trunc((tick * 256) / 50);
      const sine10 = Math.floor((10 * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
      const sine3276 = Math.floor((3276 * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
      const frame = swingConcaveFastShortFrameAtTick(tick);
      expect(frame, `tick ${tick}`).toEqual({
        x2: -sine10 + 0,
        y2: 0,
        data2: tick + 1,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 50,
        index,
        xScale: 256,
        yScale: 256,
        affineRotation: sine3276 + 0,
        startedAffine: tick === 0,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "SwingConcave",
        affineMode: "double",
      });
      return frame!;
    });

    expect(active).toHaveLength(51);
    expect([0, 10, 25, 40, 50].map((tick) => {
      const frame = active[tick]!;
      return [tick, frame.index, frame.x2, frame.affineRotation, frame.data2];
    })).toEqual([
      [0, 0, 0, 0, 1],
      [10, 51, -9, 3109, 11],
      [25, 128, 0, 0, 26],
      [40, 204, 10, -3123, 41],
      [50, 256, 0, 0, 51],
    ]);
  });

  it("uses the strict data2 > 50 terminal, affine identity reset, and stable WaitAnimEnd", () => {
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
    expect(swingConcaveFastShortFrameAtTick(51)).toEqual(terminal);
    expect(swingConcaveFastShortFrameAtTick(52)).toEqual(terminal);
    expect(swingConcaveFastShortFrameAtTick(1000)).toEqual(terminal);
    expect(swingConcaveFastShortFrameAtTick(-1)).toBeNull();
    expect(swingConcaveFastShortFrameAtTick(0.5)).toBeNull();
    expect(swingConcaveFastShortFrameAtTick(Number.NaN)).toBeNull();
    expect(swingConcaveFastShortFrameAtTick(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("keeps adjacent selector controls and opposite rotation independent", () => {
    expect(SWING_CONVEX_INITIALIZERS.fast.accepted).toBe(false);
    expect(SWING_CONVEX_INITIALIZERS.fastShort.accepted).toBe(false);
    expect(selectorTables.frontAnimIds.species.IGGLYBUFF).toBe("ANIM_SWING_CONCAVE_FAST");
    expect(selectorTables.frontAnimIds.species.LUNATONE).toBe("ANIM_SWING_CONVEX_FAST");
    expect(speciesFrontIdleRestOffset("IGGLYBUFF")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("LUNATONE")).toBeNull();
    expect(swingConcaveFrameAtTick(25)).toMatchObject({ animData: 100, affineRotation: 3276 });
    expect(swingConvexFrameAtTick(25)).toMatchObject({ animData: 100, affineRotation: -3276 });
  });
});
