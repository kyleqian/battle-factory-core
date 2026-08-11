import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  HORIZONTAL_PIVOT_ENTRY,
  H_PIVOT_FACTORY_FRONT_SPECIES,
  H_PIVOT_FRONT_SPECIES,
  H_PIVOT_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalPivotFrameAtTick,
  speciesFrontIdleRestOffset,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
} from "../../src/animation/speciesIdleAnim.ts";

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

function toU16(value: number): number {
  return value & 0xffff;
}

describe("ANIM_H_PIVOT", () => {
  it("derives the complete WINGULL/DEOXYS selector census and Factory split", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_H_PIVOT")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["WINGULL", "DEOXYS"]);
    expect(H_PIVOT_FRONT_SPECIES).toEqual(generated);
    expect(H_PIVOT_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(H_PIVOT_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => !factorySpecies.has(species)),
    );
    expect(H_PIVOT_FACTORY_FRONT_SPECIES).toEqual(["WINGULL"]);
    expect(H_PIVOT_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["DEOXYS"]);
    expect(speciesFrontIdleRestOffset("WINGULL")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("DEOXYS")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins direct task installation, preserved data1, and no callback-local flip path", () => {
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(HORIZONTAL_PIVOT_ENTRY).toEqual({
      selector: "ANIM_H_PIVOT",
      sourceId: 27,
      usesAddNewAnim: false,
      taskZeroedDataIndices: [0, 2, 3, 4, 5, 6, 7],
      taskPreservedDataIndices: [1],
      normalFrontDontFlip: true,
      callbackInstalled: "Anim_HorizontalPivot",
      callbackInvokedByInitializer: false,
      tryFlipXCalls: 0,
      taskRestoresBattlerAndSpeciesAtSpriteCallbackDummy: true,
      accepted: true,
    });
  });

  it("exhausts all 101 active callbacks with source s16/C-truncated sine and affine writes", () => {
    const active = Array.from({ length: 101 }, (_, tick) => {
      const index = Math.trunc((tick * 256) / 100);
      const ySine = gbaSin(index, 10);
      const affineRotationSigned = gbaSin(index, 3276);
      const frame = horizontalPivotFrameAtTick(tick);
      expect(frame, `callback ${tick}`).toEqual({
        x2: 0,
        y2: ySine,
        data2Before: tick,
        data2: tick + 1,
        index,
        ySine,
        affineRotationSigned,
        affineRotationU16: toU16(affineRotationSigned),
        affineWrites: [{
          xScale: 256,
          yScale: 256,
          rotationSigned: affineRotationSigned,
          rotationU16: toU16(affineRotationSigned),
        }],
        affineWriteCount: 1,
        xScale: 256,
        yScale: 256,
        wroteY2: true,
        startedAffine: tick === 0,
        normalFrontDontFlip: true,
        tryFlipXCalls: 0,
        resetSpriteAfterAnim: false,
        callback: "Anim_HorizontalPivot",
        affineMode: "double",
      });
      return frame;
    });

    expect(active).toHaveLength(101);
    expect(horizontalPivotFrameAtTick(0)).toMatchObject({
      index: 0,
      y2: 0,
      affineRotationSigned: 0,
      startedAffine: true,
    });
    expect(horizontalPivotFrameAtTick(25)).toMatchObject({
      index: 64,
      y2: 10,
      affineRotationSigned: 3276,
    });
    expect(horizontalPivotFrameAtTick(50)).toMatchObject({
      index: 128,
      y2: 0,
      affineRotationSigned: 0,
    });
    expect(horizontalPivotFrameAtTick(75)).toMatchObject({
      index: 192,
      y2: -10,
      affineRotationSigned: -3276,
      affineRotationU16: 62260,
    });
    expect(horizontalPivotFrameAtTick(100)).toMatchObject({
      index: 256,
      y2: 0,
      affineRotationSigned: 0,
    });
  });

  it("uses strict terminal callback 101, then holds a stable wait receipt and leaves adjacent controls explicit", () => {
    const terminal = horizontalPivotFrameAtTick(101);
    expect(terminal).toEqual({
      x2: 0,
      y2: 0,
      data2Before: 101,
      data2: 102,
      index: null,
      ySine: 0,
      affineRotationSigned: 0,
      affineRotationU16: 0,
      affineWrites: [{ xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0 }],
      affineWriteCount: 1,
      xScale: 256,
      yScale: 256,
      wroteY2: true,
      startedAffine: false,
      normalFrontDontFlip: true,
      tryFlipXCalls: 0,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    });
    expect(horizontalPivotFrameAtTick(102)).toEqual(terminal);
    expect(horizontalPivotFrameAtTick(4096)).toEqual(terminal);
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(horizontalPivotFrameAtTick(invalid)).toBeNull();
    }

    expect(selectorTables.frontAnimIds.species.RELICANTH).toBe("ANIM_TIP_MOVE_FORWARD");
    expect(speciesFrontIdleRestOffset("RELICANTH")).toEqual({ x2: 0, y2: 0 });
    expect(selectorTables.frontAnimIds.species.CHIMECHO).toBe("ANIM_H_SLIDE_WOBBLE");
    expect(speciesFrontIdleRestOffset("CHIMECHO")).toEqual({ x2: 0, y2: 0 });
    expect(selectorTables.frontAnimIds.species.MILOTIC).toBe("ANIM_GLOW_BLUE");
    expect(speciesFrontIdleRestOffset("MILOTIC")).toEqual({ x2: 0, y2: 0 });
    expect(selectorTables.frontAnimIds.species.PIDGEOT).toBe("ANIM_FRONT_FLIP");
    expect(speciesFrontIdleRestOffset("PIDGEOT")).toEqual({ x2: 0, y2: 0 });
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain("ANIM_H_PIVOT");
  });
});
