import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ADD_NEW_ANIM_DEFAULTS,
  ROTATE_TO_SIDES_TWICE_FACTORY_FRONT_SPECIES,
  ROTATE_TO_SIDES_TWICE_FRONT_SPECIES,
  ROTATE_TO_SIDES_TWICE_INITIALIZER,
  ROTATE_TO_SIDES_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES,
  rotateToSidesTwiceFrameAtTick,
  speciesFrontIdleRestOffset,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
} from "../../src/animation/speciesIdleAnim.ts";

function gbaSin(index: number, amplitude: number): number {
  return (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;
}

describe("ANIM_ROTATE_TO_SIDES_TWICE (selector 8)", () => {
  it("derives SOLROCK's complete 1/1/0 generated-front census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_ROTATE_TO_SIDES_TWICE")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["SOLROCK"]);
    expect(ROTATE_TO_SIDES_TWICE_FRONT_SPECIES).toEqual(generated);
    expect(ROTATE_TO_SIDES_TWICE_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(ROTATE_TO_SIDES_TWICE_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(ROTATE_TO_SIDES_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(speciesFrontIdleRestOffset("SOLROCK")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins the source initializer, its fresh record defaults, and two flip call sites", () => {
    expect(ADD_NEW_ANIM_DEFAULTS).toEqual({
      rotation: 0, delay: 0, runs: 1, speed: 0, data: 0,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
      expect.arrayContaining([0, 2, 7]),
    );
    expect(ROTATE_TO_SIDES_TWICE_INITIALIZER).toEqual({
      selector: "ANIM_ROTATE_TO_SIDES_TWICE",
      sourceId: 8,
      addNewAnim: true,
      data0: 1,
      rotation: 4,
      delay: 0,
      runs: 2,
      speed: 0,
      data: 0,
      callbackInvokedByInitializer: true,
      callbackInstalled: "RotateToSides",
      normalFrontDontFlip: true,
      accepted: true,
    });

    expect(rotateToSidesTwiceFrameAtTick(0)).toEqual({
      x2: 0,
      y2: 0,
      data0: 1,
      data2Before: 0,
      data2: 1,
      data7Before: 0,
      data7: 4,
      animRotation: 4,
      animDelay: 0,
      animRunsBefore: 2,
      animRuns: 2,
      animSpeed: 0,
      animData: 0,
      sineIndex: 0,
      sineValue: 0,
      affineWrites: [{
        xScale: 256,
        yScale: 256,
        rotationSigned: 0,
        rotationShifted: 0,
        rotationU16: 0,
      }],
      affineWriteCount: 1,
      initializerCallBeforeCallbackInstall: true,
      startedAffine: true,
      normalFrontDontFlip: true,
      tryFlipXBeforeMotion: true,
      tryFlipXAfterAffine: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim: false,
      callback: "RotateToSides",
      affineMode: "double",
    });
  });

  it("exhausts every active data7/trig/OAM-affine write across both source runs", () => {
    const frames = Array.from({ length: 130 }, (_, tick) => {
      const frame = rotateToSidesTwiceFrameAtTick(tick);
      expect(frame, `callback tick ${tick}`).not.toBeNull();
      return frame!;
    });

    for (const [tick, frame] of frames.entries()) {
      const activeRun = tick <= 63 ? 0 : tick >= 65 && tick <= 128 ? 1 : null;
      const activeTick = activeRun === null ? null : tick - activeRun * 65;
      expect(frame).toMatchObject({
        data0: 1,
        animRotation: 4,
        animDelay: 0,
        animSpeed: 0,
        animData: 0,
        normalFrontDontFlip: true,
        tryFlipXBeforeMotion: true,
        tryFlipXAfterAffine: true,
        tryFlipXCalls: 2,
        initializerCallBeforeCallbackInstall: tick === 0,
        startedAffine: tick === 0 || tick === 65,
        affineWriteCount: 1,
      });

      if (activeRun === null) {
        const interRun = tick === 64;
        expect(frame).toEqual(expect.objectContaining({
          x2: 0,
          y2: 0,
          data2Before: 1,
          data2: interRun ? 0 : 1,
          data7Before: 256,
          data7: interRun ? 0 : 256,
          animRunsBefore: interRun ? 2 : 1,
          animRuns: 1,
          sineIndex: null,
          sineValue: null,
          affineWrites: [{
            xScale: 256,
            yScale: 256,
            rotationSigned: 0,
            rotationShifted: 0,
            rotationU16: 0,
          }],
          resetSpriteAfterAnim: !interRun,
          callback: interRun ? "RotateToSides" : "WaitAnimEnd",
          affineMode: interRun ? "double" : "normal",
        }));
        continue;
      }

      expect(activeTick).not.toBeNull();
      const data7Before = activeTick! * 4;
      const sineValue = gbaSin(data7Before, 32);
      const affineRotationU16 = ((sineValue & 0xffff) << 8) & 0xffff;
      expect(frame).toEqual(expect.objectContaining({
        x2: -gbaSin(data7Before, 16) + 0,
        y2: 0,
        data2Before: activeTick === 0 ? 0 : 1,
        data2: 1,
        data7Before,
        data7: data7Before + 4,
        animRunsBefore: activeRun === 0 ? 2 : 1,
        animRuns: activeRun === 0 ? 2 : 1,
        sineIndex: data7Before,
        sineValue,
        affineWrites: [{
          xScale: 256,
          yScale: 256,
          rotationSigned: sineValue,
          rotationShifted: (sineValue & 0xffff) << 8,
          rotationU16: affineRotationU16,
        }],
        resetSpriteAfterAnim: false,
        callback: "RotateToSides",
        affineMode: "double",
      }));
    }

    expect(frames[63]).toMatchObject({
      data7Before: 252,
      data7: 256,
      x2: 2,
      sineValue: -4,
      affineWrites: [{ rotationU16: 0xfc00 }],
    });
    expect(frames[64]).toMatchObject({
      data2Before: 1,
      data2: 0,
      data7Before: 256,
      data7: 0,
      animRunsBefore: 2,
      animRuns: 1,
      sineIndex: null,
      resetSpriteAfterAnim: false,
      callback: "RotateToSides",
      affineMode: "double",
    });
    expect(frames[65]).toMatchObject({
      data2Before: 0,
      data2: 1,
      data7Before: 0,
      data7: 4,
      animRunsBefore: 1,
      animRuns: 1,
      startedAffine: true,
    });
    expect(frames[128]).toMatchObject({ data7Before: 252, data7: 256 });
    expect(frames[129]).toMatchObject({
      data2Before: 1,
      data2: 1,
      data7Before: 256,
      data7: 256,
      animRunsBefore: 1,
      animRuns: 1,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    });
  });

  it("keeps the strict terminal stable, rejects invalid input, and leaves adjacent routes alone", () => {
    const terminal = rotateToSidesTwiceFrameAtTick(129);
    expect(terminal).not.toBeNull();
    expect(rotateToSidesTwiceFrameAtTick(130)).toEqual(terminal);
    expect(rotateToSidesTwiceFrameAtTick(1000)).toEqual(terminal);
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(rotateToSidesTwiceFrameAtTick(invalid)).toBeNull();
    }

    const selectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
    expect(Object.entries(selectors)
      .filter(([, family]) => family === "ANIM_ROTATE_TO_SIDES"))
      .toEqual([]);
    expect(Object.entries(selectors)
      .filter(([, family]) => family === "ANIM_ROTATE_TO_SIDES_FAST"))
      .toEqual([]);
    expect(selectors.SOLROCK).toBe("ANIM_ROTATE_TO_SIDES_TWICE");
    expect(selectors.LUNATONE).toBe("ANIM_SWING_CONVEX_FAST");
    expect(selectors.HARIYAMA).toBe("ANIM_ROTATE_UP_TO_SIDES");
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain("ROTATE_TO_SIDES");
    expect(speciesFrontIdleRestOffset("LUNATONE")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("HARIYAMA")).toEqual({ x2: 0, y2: 0 });
  });
});
