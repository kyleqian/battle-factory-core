import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  speciesFrontIdleRestOffset,
  verticalSlideWobbleFrameAtTick,
  verticalSlideWobbleSmallFrameAtTick,
  VERTICAL_SLIDE_WOBBLE_INITIALIZERS,
  V_SLIDE_WOBBLE_SMALL_FACTORY_FRONT_SPECIES,
  V_SLIDE_WOBBLE_SMALL_FRONT_SPECIES,
  V_SLIDE_WOBBLE_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_V_SLIDE_WOBBLE_SMALL", () => {
  it("derives exactly the four Factory mappings and no outside mappings", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_V_SLIDE_WOBBLE_SMALL")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["OMANYTE", "LANTURN", "JUMPLUFF", "CLAYDOL"]);
    expect(V_SLIDE_WOBBLE_SMALL_FRONT_SPECIES).toEqual(generated);
    expect(V_SLIDE_WOBBLE_SMALL_FRONT_SPECIES).toHaveLength(4);
    expect(V_SLIDE_WOBBLE_SMALL_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(V_SLIDE_WOBBLE_SMALL_FACTORY_FRONT_SPECIES).toHaveLength(4);
    expect(V_SLIDE_WOBBLE_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    for (const species of generated) {
      expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
    }
  });

  it("pins selector 81's amplitude-5 immediate call before callback installation", () => {
    expect(VERTICAL_SLIDE_WOBBLE_INITIALIZERS).toEqual({
      normal: { selector: "ANIM_V_SLIDE_WOBBLE", sourceId: 28, data0: 10, accepted: true },
      small: { selector: "ANIM_V_SLIDE_WOBBLE_SMALL", sourceId: 81, data0: 5, accepted: true },
    });
    expect(verticalSlideWobbleSmallFrameAtTick(0)).toEqual({
      x2: 0,
      y2: 0,
      data0: 5,
      data2: 1,
      index: 0,
      varBeforeMask: 0,
      wobbleIndex: 0,
      rotationSigned: 0,
      affineRotation: 0,
      xScale: 256,
      yScale: 256,
      initializerCallBeforeCallbackInstall: true,
      startedAffine: true,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim: false,
      callback: "VerticalSlideWobble",
      affineMode: "double",
    });
    expect(verticalSlideWobbleFrameAtTick(0)).toMatchObject({
      data0: 10,
      initializerCallBeforeCallbackInstall: true,
      startedAffine: true,
    });
  });

  it("pins all 101 active callbacks' C-truncated indices and GBA affine writes", () => {
    const active = Array.from({ length: 101 }, (_, tick) => {
      const frame = verticalSlideWobbleSmallFrameAtTick(tick)!;
      const index = Math.trunc((tick * 256) / 100);
      const varBeforeMask = Math.trunc((tick * 512) / 100);
      const wobbleIndex = varBeforeMask & 0xff;
      const y2 = Math.floor((5 * GBA_SINE_TABLE_256[index & 0xff]!) / 256) + 0;
      const rotationSigned = Math.floor(
        (3276 * GBA_SINE_TABLE_256[wobbleIndex]!) / 256,
      );
      expect(frame, `tick ${tick}`).toEqual({
        x2: 0,
        y2,
        data0: 5,
        data2: tick + 1,
        index,
        varBeforeMask,
        wobbleIndex,
        rotationSigned,
        affineRotation: rotationSigned & 0xffff,
        xScale: 256,
        yScale: 256,
        initializerCallBeforeCallbackInstall: tick === 0,
        startedAffine: tick === 0,
        normalFrontDontFlip: true,
        resetSpriteAfterAnim: false,
        callback: "VerticalSlideWobble",
        affineMode: "double",
      });
      return frame;
    });

    expect(active).toHaveLength(101);
    expect([0, 25, 50, 75, 100].map((tick) => {
      const frame = active[tick]!;
      return [
        tick, frame.index, frame.varBeforeMask, frame.wobbleIndex,
        frame.y2, frame.rotationSigned, frame.affineRotation, frame.data2,
      ];
    })).toEqual([
      [0, 0, 0, 0, 0, 0, 0, 1],
      [25, 64, 128, 128, 5, 0, 0, 26],
      [50, 128, 256, 0, 0, 0, 0, 51],
      [75, 192, 384, 128, -5, 0, 0, 76],
      [100, 256, 512, 0, 0, 0, 0, 101],
    ]);
    const negativeRotation = active.find((frame) => frame.rotationSigned < 0)!;
    expect(negativeRotation.affineRotation).toBe(negativeRotation.rotationSigned + 0x10000);
  });

  it("uses the strict terminal tick 101 identity/reset/WaitAnimEnd and remains stable", () => {
    const terminal = {
      x2: 0,
      y2: 0,
      data0: 5,
      data2: 102,
      index: null,
      varBeforeMask: null,
      wobbleIndex: null,
      rotationSigned: 0,
      affineRotation: 0,
      xScale: 256,
      yScale: 256,
      initializerCallBeforeCallbackInstall: false,
      startedAffine: false,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    } as const;
    expect(verticalSlideWobbleSmallFrameAtTick(101)).toEqual(terminal);
    expect(verticalSlideWobbleSmallFrameAtTick(102)).toEqual(terminal);
    expect(verticalSlideWobbleSmallFrameAtTick(1000)).toEqual(terminal);
    expect(verticalSlideWobbleSmallFrameAtTick(-1)).toBeNull();
    expect(verticalSlideWobbleSmallFrameAtTick(0.5)).toBeNull();
  });
});
