import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ROTATE_UP_SLAM_DOWN_FACTORY_FRONT_SPECIES,
  ROTATE_UP_SLAM_DOWN_FRONT_SPECIES,
  ROTATE_UP_SLAM_DOWN_INITIALIZER,
  ROTATE_UP_SLAM_DOWN_OUTSIDE_FACTORY_FRONT_SPECIES,
  rotateUpSlamDownFrameAtTick,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

function toS16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

describe("ANIM_ROTATE_UP_SLAM_DOWN (selector 47)", () => {
  it("derives exactly the two Factory mappings and no outside mapping", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_ROTATE_UP_SLAM_DOWN")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["VENUSAUR", "GOLEM"]);
    expect(ROTATE_UP_SLAM_DOWN_FRONT_SPECIES).toEqual(generated);
    expect(ROTATE_UP_SLAM_DOWN_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(ROTATE_UP_SLAM_DOWN_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(ROTATE_UP_SLAM_DOWN_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    for (const species of generated) {
      expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
    }
  });

  it("pins the initializer, source-order signed arithmetic, affine state, and flip calls", () => {
    expect(ROTATE_UP_SLAM_DOWN_INITIALIZER).toEqual({
      selector: "ANIM_ROTATE_UP_SLAM_DOWN",
      sourceId: 47,
      centerToCornerVecXBeforeAffine: -32,
      centerToCornerVecXAfterAffine: -64,
      data6: 89,
      data7: 128,
      callbackInstalled: "RotateUpSlamDown_0",
      callbackInvokedByInitializer: false,
      handleStartAffineAnimCalls: 1,
      normalFrontDontFlip: true,
      affineMode: "double",
      accepted: true,
    });

    const first = rotateUpSlamDownFrameAtTick(0);
    expect(first).toMatchObject({
      phase: "RotateUpSlamDown_0",
      x2: toS16(89 + gbaSin(127 + 64, 89)),
      y2: toS16(-gbaSin(127, 89)),
      data0: 0,
      data2Before: 0,
      data2: 0,
      data3Before: 0,
      data3: 0,
      data6: 89,
      data7Before: 128,
      data7: 127,
      centerToCornerVecX: -64,
      affineRotationSigned: -256,
      affineRotationU16: 0xff00,
      affineRotationWrites: [0xff00],
      affineWriteCount: 1,
      xScale: 256,
      yScale: 256,
      initializerCall: "Anim_RotateUpSlamDown",
      callbackInvokedByInitializer: false,
      startedAffine: true,
      normalFrontDontFlip: true,
      tryFlipXBeforeMotion: true,
      tryFlipXAfterMotion: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim: false,
      callback: "RotateUpSlamDown_0",
      affineMode: "double",
    });

    const wide = rotateUpSlamDownFrameAtTick(0, 32767);
    expect(wide).toMatchObject({
      data6: toS16(-Math.trunc((14 * 32767) / 10)),
      x2: toS16(
        toS16(-Math.trunc((14 * 32767) / 10))
          + gbaSin(127 + 64, toS16(-Math.trunc((14 * 32767) / 10))),
      ),
      y2: toS16(-gbaSin(127, toS16(-Math.trunc((14 * 32767) / 10)))),
    });
  });

  it("exhausts every callback phase and its exact source transitions", () => {
    const frames = Array.from({ length: 73 }, (_, tick) => {
      const frame = rotateUpSlamDownFrameAtTick(tick);
      expect(frame, `tick ${tick}`).not.toBeNull();
      return frame!;
    });

    for (let tick = 0; tick < frames.length; tick += 1) {
      const frame = frames[tick]!;
      const expectedPhase = tick <= 7
        ? "RotateUpSlamDown_0"
        : tick <= 28
        ? "RotateUpSlamDown_1"
        : tick <= 32
        ? "RotateUpSlamDown_2"
        : tick === 33
        ? "Anim_VerticalShake"
        : "VerticalShake";
      const expectedCallback = tick <= 6
        ? "RotateUpSlamDown_0"
        : tick <= 27
        ? "RotateUpSlamDown_1"
        : tick <= 31
        ? "RotateUpSlamDown_2"
        : tick === 32
        ? "Anim_VerticalShake"
        : tick <= 71
        ? "VerticalShake"
        : "WaitAnimEnd";
      expect(frame.phase).toBe(expectedPhase);
      expect(frame.callback).toBe(expectedCallback);
      expect(frame.startedAffine).toBe(tick === 0);
      expect(frame.initializerCall).toBe(
        tick === 0 ? "Anim_RotateUpSlamDown" : tick === 33 ? "Anim_VerticalShake" : null,
      );
      expect(frame.callbackInvokedByInitializer).toBe(tick === 33);
      expect(frame.tryFlipXCalls).toBe(
        frame.phase === "RotateUpSlamDown_0" || frame.phase === "RotateUpSlamDown_2" ? 2 : 0,
      );
      expect(frame.affineWriteCount).toBe(
        frame.phase === "RotateUpSlamDown_0" || frame.phase === "RotateUpSlamDown_2"
          ? tick === 32 ? 2 : 1
          : 0,
      );
      expect(frame.affineMode).toBe(tick < 32 ? "double" : "normal");
      expect(frame.resetSpriteAfterAnim).toBe(tick === 32);
      expect(frame.centerToCornerVecX).toBe(tick < 32 ? -64 : -32);
    }

    expect(frames[7]).toMatchObject({
      data7Before: 121,
      data7: 120,
      data3Before: 0,
      data3: 0,
      callback: "RotateUpSlamDown_1",
    });
    expect(frames[8]).toMatchObject({ data3Before: 0, data3: 1 });
    expect(frames[27]).toMatchObject({ data3Before: 19, data3: 20 });
    expect(frames[28]).toMatchObject({
      data3Before: 20,
      data3: 1,
      callback: "RotateUpSlamDown_2",
    });
    expect(frames[29]).toMatchObject({ data7Before: 120, data7: 122 });
    expect(frames[31]).toMatchObject({ data7Before: 124, data7: 126 });
    expect(frames[32]).toMatchObject({
      x2: 0,
      y2: 0,
      data7Before: 126,
      data7: 128,
      data2Before: 0,
      data2: 0,
      affineRotationWrites: [0, 0],
      callback: "Anim_VerticalShake",
      resetSpriteAfterAnim: true,
    });
    expect(frames[33]).toMatchObject({
      data0: 60,
      data2Before: 0,
      data2: 60,
      y2: gbaSin(0, 3),
      callback: "VerticalShake",
    });
    expect(frames[71]).toMatchObject({ data2Before: 2280, data2: 2340 });
    expect(frames[72]).toMatchObject({
      data2Before: 2340,
      data2: 2400,
      y2: 0,
      callback: "WaitAnimEnd",
      resetSpriteAfterAnim: false,
    });
  });

  it("keeps strict invalid, adjacent unsupported, and back-selector routes separate", () => {
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(rotateUpSlamDownFrameAtTick(invalid)).toBeNull();
    }
    expect(rotateUpSlamDownFrameAtTick(0, 0.5)).toBeNull();
    expect(selectorTables.frontAnimIds.species.IGGLYBUFF).toBe("ANIM_SWING_CONCAVE_FAST");
    expect(selectorTables.frontAnimIds.species.LUNATONE).toBe("ANIM_SWING_CONVEX_FAST");
    expect(speciesFrontIdleRestOffset("IGGLYBUFF")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("LUNATONE")).toEqual({ x2: 0, y2: 0 });
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_H_VIBRATE).toEqual([
      "ANIM_H_VIBRATE_FASTEST", "ANIM_H_VIBRATE_FAST", "ANIM_H_VIBRATE",
    ]);
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain(
      "ROTATE_UP_SLAM_DOWN",
    );
  });

  it("keeps the strict terminal and stable terminal byte-for-byte", () => {
    const terminal = rotateUpSlamDownFrameAtTick(72);
    expect(terminal).not.toBeNull();
    expect(rotateUpSlamDownFrameAtTick(73)).toEqual(terminal);
    expect(rotateUpSlamDownFrameAtTick(1000)).toEqual(terminal);
    expect(speciesFrontIdleRestOffset("VENUSAUR")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("GOLEM")).toEqual({ x2: 0, y2: 0 });
  });
});
