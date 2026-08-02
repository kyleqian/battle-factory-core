import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ADD_NEW_ANIM_DEFAULTS,
  speciesFrontIdleRestOffset,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
  tumblingFrontFlipTwiceFrameAtTick,
  TUMBLING_FRONT_FLIP_TWICE_FACTORY_FRONT_SPECIES,
  TUMBLING_FRONT_FLIP_TWICE_FRONT_SPECIES,
  TUMBLING_FRONT_FLIP_TWICE_INITIALIZER,
  TUMBLING_FRONT_FLIP_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_TUMBLING_FRONT_FLIP_TWICE", () => {
  it("derives exactly MAGNEMITE's 1/1/0 selector and Factory census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_TUMBLING_FRONT_FLIP_TWICE")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["MAGNEMITE"]);
    expect(TUMBLING_FRONT_FLIP_TWICE_FRONT_SPECIES).toEqual(generated);
    expect(TUMBLING_FRONT_FLIP_TWICE_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(TUMBLING_FRONT_FLIP_TWICE_FACTORY_FRONT_SPECIES).toEqual(["MAGNEMITE"]);
    expect(TUMBLING_FRONT_FLIP_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(speciesFrontIdleRestOffset("MAGNEMITE")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins AddNewAnim defaults, selector-84 overrides, and tick-zero setup", () => {
    expect(ADD_NEW_ANIM_DEFAULTS).toEqual({
      rotation: 0, delay: 0, runs: 1, speed: 0, data: 0,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
      expect.arrayContaining([0, 2, 6]),
    );
    expect(TUMBLING_FRONT_FLIP_TWICE_INITIALIZER).toEqual({
      selector: "ANIM_TUMBLING_FRONT_FLIP_TWICE",
      sourceId: 84,
      rotation: 0,
      delay: 0,
      runs: 2,
      speed: 1,
      data: 0,
      accepted: true,
    });
    expect(tumblingFrontFlipTwiceFrameAtTick(0)).toEqual({
      x2: -2,
      y2: -1,
      data2Before: 0,
      data2: 1,
      data3Before: 0,
      data3: -1,
      data4Before: 0,
      data4: -1,
      data5Before: 0,
      data5: 0,
      data6Before: 0,
      data6: 8,
      data7Before: 0,
      data7: 1,
      animRotation: 0,
      animDelayBefore: 0,
      animDelay: 0,
      animRunsBefore: 2,
      animRuns: 2,
      animSpeed: 1,
      animData: 0,
      boundary: null,
      affineRotationShifted: 2048,
      affineRotationU16: 2048,
      affineWriteCount: 1,
      initializerCallBeforeCallbackInstall: true,
      startedAffine: true,
      normalFrontDontFlip: true,
      tryFlipXBeforeMotion: true,
      tryFlipXAfterAffine: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim: false,
      callback: "TumblingFrontFlip",
      affineMode: "double",
    });
  });

  it("covers every active, six-crossing, delay, repeat, terminal, and stable-wait callback", () => {
    const frames = Array.from({ length: 138 }, (_, tick) => {
      const frame = tumblingFrontFlipTwiceFrameAtTick(tick);
      expect(frame, `callback tick ${tick}`).not.toBeNull();
      return frame!;
    });

    const boundaries = new Map<number, "x" | "y">([
      [7, "x"], [15, "y"], [23, "x"], [39, "x"], [47, "y"], [55, "x"],
    ]);
    for (const [tick, frame] of frames.entries()) {
      const firstRun = tick <= 63;
      const delayCallback = tick >= 64 && tick <= 73;
      const secondRun = tick >= 74;
      const runTick = firstRun ? tick : secondRun ? tick - 74 : null;

      expect(frame, `lifecycle tick ${tick}`).toMatchObject({
        animRotation: 0,
        animSpeed: 1,
        animData: 0,
        normalFrontDontFlip: true,
        callback: tick === 137 ? "WaitAnimEnd" : "TumblingFrontFlip",
        affineMode: tick === 137 ? "normal" : "double",
        resetSpriteAfterAnim: tick === 137,
      });
      expect(frame.initializerCallBeforeCallbackInstall).toBe(tick === 0);
      expect(frame.startedAffine).toBe(tick === 0);
      expect(frame.tryFlipXBeforeMotion).toBe(!delayCallback);
      expect(frame.tryFlipXAfterAffine).toBe(!delayCallback);
      expect(frame.tryFlipXCalls).toBe(delayCallback ? 0 : 2);
      expect(frame.affineWriteCount).toBe(delayCallback ? 0 : 1);
      expect(frame.boundary).toBe(runTick === null ? null : (boundaries.get(runTick) ?? null));

      if (delayCallback) {
        const delayBefore = 10 - (tick - 64);
        expect(frame).toMatchObject({
          x2: 0, y2: 0,
          data2Before: 1, data2: 1,
          data3Before: -1, data3: -1,
          data4Before: -1, data4: -1,
          data5Before: 0, data5: 0,
          data6Before: 0, data6: 0,
          data7Before: 1, data7: 1,
          animDelayBefore: delayBefore,
          animDelay: delayBefore - 1,
          animRunsBefore: 1, animRuns: 1,
          affineRotationShifted: null,
          affineRotationU16: null,
        });
        continue;
      }

      expect(runTick).not.toBeNull();
      expect(frame.animRunsBefore).toBe(firstRun ? 2 : 1);
      expect(frame.animRuns).toBe(firstRun && tick !== 63 ? 2 : 1);
      expect(frame.animDelayBefore).toBe(0);
      expect(frame.animDelay).toBe(firstRun && tick === 63 ? 10 : 0);
      expect(frame.data2Before).toBe(firstRun && tick === 0 ? 0 : 1);
      expect(frame.data2).toBe(1);
      expect(frame.data7Before).toBe(firstRun && tick === 0 ? 0 : 1);
      expect(frame.data7).toBe(1);
      expect(frame.affineRotationShifted).toBe(frame.data6 << 8);
      expect(frame.affineRotationU16).toBe((frame.data6 << 8) & 0xffff);
      expect(frame.x2).toBeGreaterThanOrEqual(-16);
      expect(frame.x2).toBeLessThanOrEqual(16);
      expect(frame.y2).toBeGreaterThanOrEqual(-16);
      expect(frame.y2).toBeLessThanOrEqual(16);
    }

    expect(frames[63]).toMatchObject({
      x2: 0, y2: 0,
      data5Before: 6, data5: 0,
      data6Before: 504, data6: 0,
      animRunsBefore: 2, animRuns: 1,
      animDelayBefore: 0, animDelay: 10,
      callback: "TumblingFrontFlip",
      affineRotationShifted: 0, affineRotationU16: 0,
    });
    expect(frames[64]).toMatchObject({
      animDelayBefore: 10, animDelay: 9, tryFlipXCalls: 0, affineWriteCount: 0,
    });
    expect(frames[73]).toMatchObject({
      animDelayBefore: 1, animDelay: 0, tryFlipXCalls: 0, affineWriteCount: 0,
    });
    expect(frames[74]).toMatchObject({
      x2: -2, y2: -1,
      data3Before: -1, data3: -1, data4Before: -1, data4: -1,
      data5Before: 0, data5: 0, data6Before: 0, data6: 8,
      animRunsBefore: 1, animRuns: 1, initializerCallBeforeCallbackInstall: false,
    });
    expect(frames[137]).toEqual({
      ...frames[137],
      x2: 0,
      y2: 0,
      data5Before: 6,
      data5: 6,
      data6Before: 504,
      data6: 512,
      affineRotationShifted: 131072,
      affineRotationU16: 0,
      affineWriteCount: 1,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    });

    expect(tumblingFrontFlipTwiceFrameAtTick(138)).toEqual(frames[137]);
    expect(tumblingFrontFlipTwiceFrameAtTick(1000)).toEqual(frames[137]);
    expect(tumblingFrontFlipTwiceFrameAtTick(-1)).toBeNull();
    expect(tumblingFrontFlipTwiceFrameAtTick(0.5)).toBeNull();
  });

  it("keeps the unused single flip, selector 85, and back routes unsupported", () => {
    const selectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
    expect(Object.entries(selectors)
      .filter(([, family]) => family === "ANIM_TUMBLING_FRONT_FLIP"))
      .toEqual([]);
    expect(Object.entries(selectors)
      .filter(([, family]) => family === "ANIM_DEEP_V_SQUISH_AND_BOUNCE_TWICE"))
      .toEqual([]);
    expect(speciesFrontIdleRestOffset("MAGNETON")).not.toBeNull();
    expect(speciesFrontIdleRestOffset("MAGNEMITE")).toEqual({ x2: 0, y2: 0 });
  });
});
