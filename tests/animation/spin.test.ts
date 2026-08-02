import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ADD_NEW_ANIM_DEFAULTS,
  speciesFrontIdleRestOffset,
  spinFrameAtTick,
  SPIN_FACTORY_FRONT_SPECIES,
  SPIN_FRONT_SPECIES,
  SPIN_INITIALIZER,
  SPIN_OUTSIDE_FACTORY_FRONT_SPECIES,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
} from "../../src/animation/speciesIdleAnim.ts";

function s16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

describe("ANIM_SPIN", () => {
  it("derives exactly SPHEAL's 1/1/0 selector and Factory census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_SPIN")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["SPHEAL"]);
    expect(SPIN_FRONT_SPECIES).toEqual(generated);
    expect(SPIN_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(SPIN_FACTORY_FRONT_SPECIES).toEqual(["SPHEAL"]);
    expect(SPIN_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(speciesFrontIdleRestOffset("SPHEAL")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins AddNewAnim defaults, selector-83 overrides, and immediate affine start", () => {
    expect(ADD_NEW_ANIM_DEFAULTS).toEqual({
      rotation: 0, delay: 0, runs: 1, speed: 0, data: 0,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
      expect.arrayContaining([0, 2, 6]),
    );
    expect(SPIN_INITIALIZER).toEqual({
      selector: "ANIM_SPIN", sourceId: 83, delay: 60, data: 30, accepted: true,
    });
    expect(spinFrameAtTick(0)).toEqual({
      x2: 0,
      y2: 0,
      data2Before: 0,
      data2: 1,
      data6: 0,
      animDelay: 60,
      animData: 30,
      rotationStep: 2184,
      initializerCallBeforeCallbackInstall: true,
      startedAffine: true,
      affineWriteRotationSigned: 0,
      affineWriteRotationU16: 0,
      xScale: 256,
      yScale: 256,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim: false,
      callback: "Spin",
      affineMode: "double",
    });
  });

  it("pins every active tick through signed s16 and unsigned affine rotation", () => {
    const active = Array.from({ length: 61 }, (_, tick) => {
      const rotationSigned = s16(2184 * tick);
      const frame = spinFrameAtTick(tick)!;
      expect(frame, `active tick ${tick}`).toEqual({
        x2: 0,
        y2: 0,
        data2Before: tick,
        data2: tick + 1,
        data6: rotationSigned,
        animDelay: 60,
        animData: 30,
        rotationStep: 2184,
        initializerCallBeforeCallbackInstall: tick === 0,
        startedAffine: tick === 0,
        affineWriteRotationSigned: rotationSigned,
        affineWriteRotationU16: rotationSigned & 0xffff,
        xScale: 256,
        yScale: 256,
        normalFrontDontFlip: true,
        resetSpriteAfterAnim: false,
        callback: "Spin",
        affineMode: "double",
      });
      return frame;
    });

    expect(active).toHaveLength(61);
    expect([0, 15, 16, 30, 31, 45, 60].map((tick) => {
      const frame = active[tick]!;
      return [tick, frame.data6, frame.affineWriteRotationU16, frame.data2];
    })).toEqual([
      [0, 0, 0, 1],
      [15, 32760, 32760, 16],
      [16, -30592, 34944, 17],
      [30, -16, 65520, 31],
      [31, 2168, 2168, 32],
      [45, 32744, 32744, 46],
      [60, -32, 65504, 61],
    ]);
  });

  it("uses tick 61's strict identity/reset handoff and stable WaitAnimEnd state", () => {
    const terminal = {
      x2: 0,
      y2: 0,
      data2Before: 61,
      data2: 62,
      data6: -32,
      animDelay: 60,
      animData: 30,
      rotationStep: 2184,
      initializerCallBeforeCallbackInstall: false,
      startedAffine: false,
      affineWriteRotationSigned: 0,
      affineWriteRotationU16: 0,
      xScale: 256,
      yScale: 256,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    } as const;
    expect(spinFrameAtTick(60)).toMatchObject({
      data2Before: 60, data2: 61, data6: -32, callback: "Spin", affineMode: "double",
    });
    expect(spinFrameAtTick(61)).toEqual(terminal);
    expect(spinFrameAtTick(62)).toEqual(terminal);
    expect(spinFrameAtTick(1000)).toEqual(terminal);
    expect(spinFrameAtTick(-1)).toBeNull();
    expect(spinFrameAtTick(0.5)).toBeNull();
  });

  it("does not widen the unused long-spin or adjacent tumbling selector", () => {
    const selectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
    expect(Object.values(selectors).filter((family) => family === "ANIM_SPIN_LONG")).toEqual([]);
    expect(Object.entries(selectors)
      .filter(([, family]) => family === "ANIM_TUMBLING_FRONT_FLIP_TWICE"))
      .toEqual([["MAGNEMITE", "ANIM_TUMBLING_FRONT_FLIP_TWICE"]]);
    expect(speciesFrontIdleRestOffset("MAGNEMITE")).toBeNull();
  });
});
