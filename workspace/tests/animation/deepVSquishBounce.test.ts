import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  DEEP_V_SQUISH_AND_BOUNCE_FACTORY_FRONT_SPECIES,
  DEEP_V_SQUISH_AND_BOUNCE_FRONT_SPECIES,
  DEEP_V_SQUISH_AND_BOUNCE_INITIALIZER,
  DEEP_V_SQUISH_AND_BOUNCE_OUTSIDE_FACTORY_FRONT_SPECIES,
  deepVerticalSquishBounceFrameAtTick,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

function toS16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

describe("ANIM_DEEP_V_SQUISH_AND_BOUNCE (selector 48)", () => {
  it("derives exactly the two Factory mappings and no outside mapping", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_DEEP_V_SQUISH_AND_BOUNCE")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["MUK", "WOBBUFFET"]);
    expect(DEEP_V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toEqual(generated);
    expect(DEEP_V_SQUISH_AND_BOUNCE_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(DEEP_V_SQUISH_AND_BOUNCE_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(DEEP_V_SQUISH_AND_BOUNCE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    for (const species of generated) {
      expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
    }
  });

  it("pins AddNewAnim defaults, immediate callback ordering, and every source phase", () => {
    expect(DEEP_V_SQUISH_AND_BOUNCE_INITIALIZER).toEqual({
      selector: "ANIM_DEEP_V_SQUISH_AND_BOUNCE",
      sourceId: 48,
      addNewAnim: true,
      delay: 0,
      runs: 1,
      rotation: 4,
      callbackInvokedByInitializer: true,
      callbackInstalled: "DeepVerticalSquishBounce",
      handleStartAffineAnimOnData2Zero: true,
      normalFrontDontFlip: true,
      tryFlipXCalls: 0,
      affineMode: "double",
      accepted: true,
    });

    const frames = Array.from({ length: 65 }, (_, tick) => {
      const frame = deepVerticalSquishBounceFrameAtTick(tick);
      expect(frame, `lifecycle tick ${tick}`).not.toBeNull();
      return frame!;
    });

    expect(frames.slice(0, 33).every((frame) => frame.phase === "DeepVerticalSquishBounce_0"))
      .toBe(true);
    expect(frames.slice(33).every((frame) => frame.phase === "DeepVerticalSquishBounce_1"))
      .toBe(true);

    for (const [tick, frame] of frames.entries()) {
      const phase0 = tick <= 32;
      const data4Before = tick === 0
        ? 0
        : tick <= 32
        ? tick * 4
        : (tick - 32) * 4;
      const data5Before = phase0 ? 0 : 1;
      const expectedData4 = tick === 32 || tick === 64
        ? tick === 32 ? 4 : 132
        : data4Before + 4;
      const expectedData7 = phase0
        ? toS16(gbaSin(data4Before, 256))
        : toS16(gbaSin(data4Before, 32));
      const expectedY2 = phase0
        ? toS16(gbaSin(data4Before, 16))
        : toS16(-gbaSin(data4Before, 8));
      const expectedData6 = phase0
        ? toS16(gbaSin(data4Before, 32))
        : toS16(gbaSin(data4Before, 128));
      const expectedXScale = phase0
        ? toS16(256 - expectedData6)
        : toS16(256 + expectedData6);
      const expectedYScale = phase0
        ? toS16(256 + expectedData7)
        : toS16(256 - expectedData7);

      expect(frame).toMatchObject({
        phase: phase0 ? "DeepVerticalSquishBounce_0" : "DeepVerticalSquishBounce_1",
        data0: 1,
        delayBefore: 0,
        delay: 0,
        runsBefore: 1,
        runs: 1,
        rotation: 4,
        data2Before: tick === 0 ? 0 : 1,
        data2: 1,
        data3Before: 0,
        data3: 0,
        data4Before,
        data4: expectedData4,
        data5Before,
        data5: phase0 ? tick === 32 ? 1 : 0 : 1,
        data6Before: tick === 0 ? 0 : frames[tick - 1]!.data6,
        data6: expectedData6,
        data7Before: tick === 0 ? 0 : frames[tick - 1]!.data7,
        data7: expectedData7,
        x2: 0,
        y2: expectedY2,
        xScale: tick === 64 ? 256 : expectedXScale,
        yScale: tick === 64 ? 256 : expectedYScale,
        initializerCalled: tick === 0,
        callbackInvokedByInitializer: true,
        startedAffine: tick === 0,
        normalFrontDontFlip: true,
        tryFlipXCalls: 0,
        resetSpriteAfterAnim: tick === 64,
        callback: tick === 64 ? "WaitAnimEnd" : "DeepVerticalSquishBounce",
        affineMode: tick === 64 ? "normal" : "double",
        affineWriteCount: tick === 64 ? 2 : 1,
      });
      expect(frame.affineWrites[0]).toEqual({
        xScale: tick === 64 ? 256 : expectedXScale,
        yScale: tick === 64 ? 256 : expectedYScale,
        rotationSigned: 0,
        rotationU16: 0,
      });
      expect(frame.affineWrites.at(-1)).toEqual({
        xScale: tick === 64 ? 256 : expectedXScale,
        yScale: tick === 64 ? 256 : expectedYScale,
        rotationSigned: 0,
        rotationU16: 0,
      });
    }

    expect(frames[1]).toMatchObject({ data4Before: 4, data4: 8, data7: 25, y2: 1, data6: 3 });
    expect(frames[16]).toMatchObject({
      data4Before: 64, data4: 68, data7: 256, y2: 16, data6: 32,
      xScale: 224, yScale: 512,
    });
    expect(frames[32]).toMatchObject({
      data4Before: 128,
      data4: 4,
      data5Before: 0,
      data5: 1,
      xScale: 256,
      yScale: 256,
      affineMode: "double",
    });
    expect(frames[33]).toMatchObject({ data4Before: 4, data4: 8, data5Before: 1, data7: 3, data6: 12 });
    expect(frames[48]).toMatchObject({
      data4Before: 64, data4: 68, y2: -8, data6: 128, data7: 32,
      xScale: 384, yScale: 224,
    });
    expect(frames[63]).toMatchObject({ data4Before: 124, data4: 128, data6: 12, data7: 3 });
    expect(frames[64]).toMatchObject({
      data4Before: 128,
      data4: 132,
      data5Before: 1,
      data5: 1,
      data6: 0,
      data7: 0,
      y2: 0,
      affineWrites: [
        { xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0 },
        { xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0 },
      ],
    });
  });

  it("keeps the strict terminal stable and rejects invalid or adjacent routes", () => {
    const terminal = deepVerticalSquishBounceFrameAtTick(64);
    expect(terminal).not.toBeNull();
    expect(deepVerticalSquishBounceFrameAtTick(65)).toEqual(terminal);
    expect(deepVerticalSquishBounceFrameAtTick(1000)).toEqual(terminal);
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(deepVerticalSquishBounceFrameAtTick(invalid)).toBeNull();
    }

    const selectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
    expect(Object.entries(selectors)
      .filter(([, family]) => family === "ANIM_DEEP_V_SQUISH_AND_BOUNCE_TWICE"))
      .toEqual([]);
    expect(selectors.VENUSAUR).toBe("ANIM_ROTATE_UP_SLAM_DOWN");
    expect(selectors.MUK).toBe("ANIM_DEEP_V_SQUISH_AND_BOUNCE");
    expect(selectors.WOBBUFFET).toBe("ANIM_DEEP_V_SQUISH_AND_BOUNCE");
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain(
      "DEEP_V_SQUISH_AND_BOUNCE",
    );
    expect(speciesFrontIdleRestOffset("MAGNETON")).toEqual({ x2: 0, y2: 0 });
  });
});
