import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_AND_LUNGE_FACTORY_FRONT_SPECIES,
  BACK_AND_LUNGE_FRONT_SPECIES,
  BACK_AND_LUNGE_INITIALIZER,
  BACK_AND_LUNGE_OUTSIDE_FACTORY_FRONT_SPECIES,
  backAndLungeFrameAtTick,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_BACK_AND_LUNGE", () => {
  it("derives the complete 2/2/0 selector census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_BACK_AND_LUNGE")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["CHARMELEON", "GROWLITHE"]);
    expect(BACK_AND_LUNGE_FRONT_SPECIES).toEqual(generated);
    expect(BACK_AND_LUNGE_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(BACK_AND_LUNGE_FACTORY_FRONT_SPECIES).toEqual(["CHARMELEON", "GROWLITHE"]);
    expect(BACK_AND_LUNGE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(speciesFrontIdleRestOffset("CHARMELEON")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("GROWLITHE")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins the direct initializer and every source callback edge", () => {
    expect(BACK_AND_LUNGE_INITIALIZER).toEqual({
      selector: "ANIM_BACK_AND_LUNGE",
      sourceId: 37,
      handleStartAffineAnimCalls: 1,
      callbackInvokedByInitializer: false,
      callbackInstalled: "BackAndLunge_0",
      normalFrontDontFlip: true,
      affineMode: "double",
      accepted: true,
    });

    const frames = Array.from({ length: 33 }, (_, tick) => {
      const frame = backAndLungeFrameAtTick(tick);
      expect(frame, `lifecycle tick ${tick}`).not.toBeNull();
      return frame!;
    });

    for (const [tick, frame] of frames.entries()) {
      const phase = tick <= 7 ? "BackAndLunge_0"
        : tick <= 10 ? "BackAndLunge_1"
          : tick <= 12 ? "BackAndLunge_2"
            : tick <= 27 ? "BackAndLunge_3" : "BackAndLunge_4";
      const callback = tick < 7 ? "BackAndLunge_0"
        : tick < 10 ? "BackAndLunge_1"
          : tick < 12 ? "BackAndLunge_2"
            : tick < 27 ? "BackAndLunge_3"
              : tick < 32 ? "BackAndLunge_4" : "WaitAnimEnd";
      expect(frame).toMatchObject({
        phase,
        initializerCalled: tick === 0,
        callbackInvokedByInitializer: false,
        startedAffine: tick === 0,
        normalFrontDontFlip: true,
        tryFlipXBeforeMotion: true,
        tryFlipXAfterMotion: true,
        tryFlipXCalls: 2,
        affineMode: tick === 32 ? "normal" : "double",
        resetSpriteAfterAnim: tick === 32,
        callback,
      });
      expect(frame.affineWriteCount).toBe(
        (tick >= 11 && tick <= 12) || (tick >= 25 && tick <= 27) ? 1 : 0,
      );
    }

    expect(frames[0]).toMatchObject({ x2: 1, data7Before: 0, data7: 0 });
    expect(frames[7]).toMatchObject({ x2: 8, data7Before: 0, data7: 2, callback: "BackAndLunge_1" });
    expect(frames[8]).toMatchObject({ x2: 6, data7Before: 2, data7: 3 });
    expect(frames[10]).toMatchObject({
      x2: -1, data7Before: 4, data7: 5, data5: 1, data6: 2,
      callback: "BackAndLunge_2",
    });
    expect(frames[11]).toMatchObject({
      x2: -6, data2: 0, data5: 2, data6: 2, data7: 6,
      rotationU8: 3, affineRotationShifted: 768, affineRotationU16: 768,
      callback: "BackAndLunge_2",
    });
    expect(frames[12]).toMatchObject({
      x2: -8, data2: 6, data3: 0, data4: 2, data5: 2, data6: 2, data7: 7,
      rotationU8: 6, affineRotationShifted: 1536, affineRotationU16: 1536,
      callback: "BackAndLunge_3",
    });
    expect(frames[13]).toMatchObject({ x2: -6, data3: 1, data4: -2 });
    expect(frames[24]).toMatchObject({ x2: -8, data3: 12, data4: 2, data2: 6 });
    expect(frames[25]).toMatchObject({ data2: 4, affineRotationShifted: 1024 });
    expect(frames[26]).toMatchObject({ data2: 2, affineRotationShifted: 512 });
    expect(frames[27]).toMatchObject({ data2: 0, affineRotationShifted: 0, callback: "BackAndLunge_4" });
    expect(frames[28]).toMatchObject({ x2: -6 });
    expect(frames[31]).toMatchObject({ x2: 0, callback: "BackAndLunge_4" });
    expect(frames[32]).toMatchObject({
      x2: 0, y2: 0, affineRotationShifted: null, resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd", affineMode: "normal",
    });
    expect(backAndLungeFrameAtTick(33)).toEqual(frames[32]);
    expect(backAndLungeFrameAtTick(1000)).toEqual(frames[32]);
    expect(backAndLungeFrameAtTick(-1)).toBeNull();
    expect(backAndLungeFrameAtTick(0.5)).toBeNull();
  });
});
