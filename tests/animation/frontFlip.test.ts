import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  FRONT_FLIP_ENTRY,
  FRONT_FLIP_FACTORY_FRONT_SPECIES,
  FRONT_FLIP_FRONT_SPECIES,
  FRONT_FLIP_OUTSIDE_FACTORY_FRONT_SPECIES,
  FRONT_FLIP_PIDGEOT_FRONT_PICTURE_PROGRAM,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
  frontFlipFrameAtTick,
  frontFlipWaitAnimEndCallback,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_FRONT_FLIP", () => {
  it("derives PIDGEOT's complete 1/1/0 selector census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_FRONT_FLIP")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["PIDGEOT"]);
    expect(FRONT_FLIP_FRONT_SPECIES).toEqual(generated);
    expect(FRONT_FLIP_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(FRONT_FLIP_FACTORY_FRONT_SPECIES).toEqual(["PIDGEOT"]);
    expect(FRONT_FLIP_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(speciesFrontIdleRestOffset("PIDGEOT")).toEqual({ x2: 0, y2: 0 });
  });

  it("ratchets the generated 62-family front census and all 376 Factory mappings through the seam", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    const factoryMappings = generated.filter(([species]) => factorySpecies.has(species));

    expect(generated).toHaveLength(386);
    expect(new Set(generated.map(([, family]) => family)).size).toBe(62);
    expect(factoryMappings).toHaveLength(376);
    expect(generated.filter(([species]) => speciesFrontIdleRestOffset(species) === null)).toEqual([]);
    expect(factoryMappings.filter(([species]) => speciesFrontIdleRestOffset(species) === null)).toEqual([]);
  });

  it("pins selector 41's direct task setup, no-delay picture program, and dummy handoff", () => {
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(FRONT_FLIP_ENTRY).toEqual({
      selector: "ANIM_FRONT_FLIP",
      sourceId: 41,
      usesAddNewAnim: false,
      taskZeroedDataIndices: [0, 2, 3, 4, 5, 6, 7],
      taskPreservedDataIndices: [1],
      normalFrontDontFlip: true,
      callbackInstalled: "Anim_FrontFlip",
      callbackInvokedByInitializer: false,
      initializerStartsAffine: true,
      initializerInstallsCallback: "FrontFlip_0",
      frontPictureProgramIndex: 1,
      sourceAnimationDelay: 0,
      taskRestoresBattlerAndSpeciesAtSpriteCallbackDummy: true,
      accepted: true,
    });
    expect(FRONT_FLIP_PIDGEOT_FRONT_PICTURE_PROGRAM).toEqual([
      { frame: 1, duration: 20 },
      { frame: 0, duration: 10 },
      { frame: 1, duration: 15 },
      { frame: 0, duration: 1 },
    ]);
    expect(frontFlipWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(frontFlipWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("exhausts all 50 active callbacks with s16 data storage and raw affine rotation", () => {
    for (let tick = 0; tick <= 49; tick += 1) {
      const frame = frontFlipFrameAtTick(tick);
      expect(frame, `callback ${tick}`).not.toBeNull();

      if (tick === 0) {
        expect(frame).toEqual({
          x2: 0,
          y2: 0,
          phase: "Anim_FrontFlip",
          data2Before: 0,
          data2: 0,
          affineRotationShifted: null,
          affineRotationU16: null,
          affineWriteCount: 0,
          xScale: 256,
          yScale: 256,
          startedAffine: true,
          normalFrontDontFlip: true,
          tryFlipXBeforeMotion: false,
          tryFlipXAfterMotion: false,
          tryFlipXCalls: 0,
          resetSpriteAfterAnim: false,
          callback: "FrontFlip_0",
          affineMode: "double",
        });
        continue;
      }

      if (tick <= 16) {
        expect(frame).toEqual({
          x2: tick,
          y2: -tick,
          phase: "FrontFlip_0",
          data2Before: 0,
          data2: 0,
          affineRotationShifted: null,
          affineRotationU16: null,
          affineWriteCount: 0,
          xScale: 256,
          yScale: 256,
          startedAffine: false,
          normalFrontDontFlip: true,
          tryFlipXBeforeMotion: true,
          tryFlipXAfterMotion: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: tick === 16 ? "FrontFlip_1" : "FrontFlip_0",
          affineMode: "double",
        });
        continue;
      }

      if (tick <= 32) {
        const rotationStep = tick - 16;
        const data2 = rotationStep * 16;
        expect(frame).toEqual({
          x2: 16 - rotationStep * 2,
          y2: -16 + rotationStep * 2,
          phase: "FrontFlip_1",
          data2Before: data2 - 16,
          data2,
          affineRotationShifted: data2 << 8,
          affineRotationU16: (data2 << 8) & 0xffff,
          affineWriteCount: 1,
          xScale: 256,
          yScale: 256,
          startedAffine: false,
          normalFrontDontFlip: true,
          tryFlipXBeforeMotion: true,
          tryFlipXAfterMotion: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: "FrontFlip_1",
          affineMode: "double",
        });
        continue;
      }

      if (tick === 33) {
        expect(frame).toEqual({
          x2: -16,
          y2: 16,
          phase: "FrontFlip_1",
          data2Before: 256,
          data2: 0,
          affineRotationShifted: 0,
          affineRotationU16: 0,
          affineWriteCount: 1,
          xScale: 256,
          yScale: 256,
          startedAffine: false,
          normalFrontDontFlip: true,
          tryFlipXBeforeMotion: true,
          tryFlipXAfterMotion: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: "FrontFlip_2",
          affineMode: "double",
        });
        continue;
      }

      const returnStep = tick - 33;
      expect(frame).toEqual({
        x2: -16 + returnStep,
        y2: 16 - returnStep,
        phase: "FrontFlip_2",
        data2Before: 0,
        data2: 0,
        affineRotationShifted: null,
        affineRotationU16: null,
        affineWriteCount: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXBeforeMotion: true,
        tryFlipXAfterMotion: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: tick === 49,
        callback: tick === 49 ? "WaitAnimEnd" : "FrontFlip_2",
        affineMode: tick === 49 ? "normal" : "double",
      });
    }
  });

  it("keeps the terminal frame stable, rejects invalid ticks, and preserves adjacent selector controls", () => {
    const terminal = frontFlipFrameAtTick(49);
    expect(frontFlipFrameAtTick(50)).toEqual(terminal);
    expect(frontFlipFrameAtTick(4096)).toEqual(terminal);
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(frontFlipFrameAtTick(invalid)).toBeNull();
    }

    expect(selectorTables.frontAnimIds.species.PIDGEOTTO).toBe("ANIM_V_STRETCH");
    expect(selectorTables.frontAnimIds.species.PIDGEOT).toBe("ANIM_FRONT_FLIP");
    expect(selectorTables.speciesToBackAnimSet.species.PIDGEOT).toBe("BACK_ANIM_TRIANGLE_DOWN");
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_BACK_FLIP_BIG");
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_TUMBLING_FRONT_FLIP");
    expect(speciesFrontIdleRestOffset("PIDGEOTTO")).toEqual({ x2: 0, y2: 0 });
  });
});
