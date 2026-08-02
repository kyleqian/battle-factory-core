import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  circleCCounterclockwiseSlowFrameAtTick,
  CIRCLE_C_CLOCKWISE_SLOW_FACTORY_FRONT_SPECIES,
  CIRCLE_C_CLOCKWISE_SLOW_FRONT_SPECIES,
  CIRCLE_C_CLOCKWISE_SLOW_INITIALIZER,
  CIRCLE_C_CLOCKWISE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_CIRCLE_C_CLOCKWISE_SLOW", () => {
  it("derives exactly the two Factory mappings and no outside mappings", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_CIRCLE_C_CLOCKWISE_SLOW")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["DROWZEE", "SPINARAK"]);
    expect(CIRCLE_C_CLOCKWISE_SLOW_FRONT_SPECIES).toEqual(generated);
    expect(CIRCLE_C_CLOCKWISE_SLOW_FRONT_SPECIES).toHaveLength(2);
    expect(CIRCLE_C_CLOCKWISE_SLOW_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(CIRCLE_C_CLOCKWISE_SLOW_FACTORY_FRONT_SPECIES).toEqual([
      "DROWZEE",
      "SPINARAK",
    ]);
    expect(CIRCLE_C_CLOCKWISE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    for (const species of generated) {
      expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
    }
  });

  it("pins selector 79's AddNewAnim overrides and immediate callback lifecycle", () => {
    expect(CIRCLE_C_CLOCKWISE_SLOW_INITIALIZER).toEqual({
      selector: "ANIM_CIRCLE_C_CLOCKWISE_SLOW",
      sourceId: 79,
      rotation: 512,
      data: 3,
      speed: 12,
      accepted: true,
    });
    expect(circleCCounterclockwiseSlowFrameAtTick(0)).toEqual({
      x2: 0,
      y2: 0,
      data2Before: 0,
      data2: 12,
      index: 192,
      sin: -3,
      cos: 0,
      animRotation: 512,
      animData: 3,
      animSpeed: 12,
      initializerCallBeforeCallbackInstall: true,
      normalFrontDontFlip: true,
      tryFlipXBeforeBranch: true,
      tryFlipXAfterCounterIncrement: true,
      tryFlipXCalls: 2,
      callback: "CircleCounterclockwise",
    });
  });

  it("matches signed GBA Sin/Cos arithmetic at every active counter", () => {
    for (let tick = 0; tick <= 42; tick += 1) {
      const counter = tick * 12;
      const index = (counter + 192) % 256;
      const sin = Math.floor((3 * GBA_SINE_TABLE_256[index]!) / 256);
      const cos = Math.floor((6 * GBA_SINE_TABLE_256[(index + 64) % 256]!) / 256);
      expect(circleCCounterclockwiseSlowFrameAtTick(tick), `tick ${tick}`).toEqual({
        x2: cos === 0 ? 0 : -cos,
        y2: sin + 3,
        data2Before: counter,
        data2: counter + 12,
        index,
        sin,
        cos,
        animRotation: 512,
        animData: 3,
        animSpeed: 12,
        initializerCallBeforeCallbackInstall: tick === 0,
        normalFrontDontFlip: true,
        tryFlipXBeforeBranch: true,
        tryFlipXAfterCounterIncrement: true,
        tryFlipXCalls: 2,
        callback: "CircleCounterclockwise",
      });
    }
  });

  it("uses the strict terminal guard, increments after cleanup, and stays stable", () => {
    const terminal = circleCCounterclockwiseSlowFrameAtTick(43);
    expect(terminal).toEqual({
      x2: 0,
      y2: 0,
      data2Before: 516,
      data2: 528,
      index: null,
      sin: null,
      cos: null,
      animRotation: 512,
      animData: 3,
      animSpeed: 12,
      initializerCallBeforeCallbackInstall: false,
      normalFrontDontFlip: true,
      tryFlipXBeforeBranch: true,
      tryFlipXAfterCounterIncrement: true,
      tryFlipXCalls: 2,
      callback: "WaitAnimEnd",
    });
    expect(circleCCounterclockwiseSlowFrameAtTick(44)).toEqual(terminal);
    expect(circleCCounterclockwiseSlowFrameAtTick(500)).toEqual(terminal);
    expect(circleCCounterclockwiseSlowFrameAtTick(-1)).toBeNull();
    expect(circleCCounterclockwiseSlowFrameAtTick(0.5)).toBeNull();
  });

  it("does not promote the normal or long circle selectors", () => {
    const selectors = Object.values(selectorTables.frontAnimIds.species);
    expect(selectors).not.toContain("ANIM_CIRCLE_C_CLOCKWISE");
    expect(selectors).not.toContain("ANIM_CIRCLE_C_CLOCKWISE_LONG");
  });
});
