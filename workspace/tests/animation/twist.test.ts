import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ADD_NEW_ANIM_DEFAULTS,
  speciesFrontIdleRestOffset,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
  twistFrameAtTick,
  TWIST_FACTORY_FRONT_SPECIES,
  TWIST_FRONT_SPECIES,
  TWIST_INITIALIZER,
  TWIST_OUTSIDE_FACTORY_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_TWIST", () => {
  it("derives the exact 5/5/0 generated selector and Factory census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_TWIST")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["SHELLDER", "HORSEA", "STARMIE", "CLAMPERL", "ANORITH"]);
    expect(TWIST_FRONT_SPECIES).toEqual(generated);
    expect(TWIST_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(TWIST_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(TWIST_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    for (const species of generated) {
      expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
    }
  });

  it("pins AddNewAnim defaults, selector-18's one-run initializer, and immediate call ordering", () => {
    expect(ADD_NEW_ANIM_DEFAULTS).toEqual({
      rotation: 0, delay: 0, runs: 1, speed: 0, data: 0,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
      expect.arrayContaining([0, 2, 6]),
    );
    expect(TWIST_INITIALIZER).toEqual({
      selector: "ANIM_TWIST", sourceId: 18, rotation: 512,
      delay: 0, runs: 1, accepted: true,
    });
    expect(twistFrameAtTick(0)).toEqual({
      x2: 0,
      y2: 0,
      data2Before: 0,
      data2: 16,
      data6: 0,
      animRotation: 512,
      animDelayBefore: 0,
      animDelay: 0,
      animRunsBefore: 1,
      animRuns: 1,
      animSpeed: 0,
      animDataBefore: 0,
      animData: 1,
      initializerCallBeforeCallbackInstall: true,
      startedAffine: true,
      affineWriteCount: 1,
      affineWriteRotationSigned: 0,
      affineWriteRotationU16: 0,
      xScale: 256,
      yScale: 256,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim: false,
      callback: "Twist",
      affineMode: "double",
    });
  });

  it("pins every active callback's signed-s16 sine and unsigned-u16 affine write", () => {
    const callbacks = Array.from({ length: 34 }, (_, tick) => twistFrameAtTick(tick)!);
    expect(callbacks).toHaveLength(34);

    // The source's strict `>` check leaves counter 512 as the final motion
    // callback; counter 528 alone writes identity and resets the sprite.
    for (let tick = 0; tick <= 32; tick += 1) {
      const counter = tick * 16;
      const rotationSigned = Math.floor((4096 * GBA_SINE_TABLE_256[counter & 0xff]!) / 256);
      expect(callbacks[tick], `motion callback ${tick}`).toEqual({
        x2: 0,
        y2: 0,
        data2Before: counter,
        data2: counter + 16,
        data6: rotationSigned,
        animRotation: 512,
        animDelayBefore: 0,
        animDelay: 0,
        animRunsBefore: 1,
        animRuns: 1,
        animSpeed: 0,
        animDataBefore: tick === 0 ? 0 : 1,
        animData: 1,
        initializerCallBeforeCallbackInstall: tick === 0,
        startedAffine: tick === 0,
        affineWriteCount: 1,
        affineWriteRotationSigned: rotationSigned,
        affineWriteRotationU16: rotationSigned & 0xffff,
        xScale: 256,
        yScale: 256,
        normalFrontDontFlip: true,
        resetSpriteAfterAnim: false,
        callback: "Twist",
        affineMode: "double",
      });
    }

    const terminal = {
      x2: 0,
      y2: 0,
      data2Before: 528,
      data2: 544,
      data6: 0,
      animRotation: 512,
      animDelayBefore: 0,
      animDelay: 0,
      animRunsBefore: 1,
      animRuns: 1,
      animSpeed: 0,
      animDataBefore: 1,
      animData: 1,
      initializerCallBeforeCallbackInstall: false,
      startedAffine: false,
      affineWriteCount: 1,
      affineWriteRotationSigned: 0,
      affineWriteRotationU16: 0,
      xScale: 256,
      yScale: 256,
      normalFrontDontFlip: true,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    } as const;
    expect(callbacks[33]).toEqual(terminal);
    expect(twistFrameAtTick(34)).toEqual(terminal);
    expect(twistFrameAtTick(1000)).toEqual(terminal);
    expect(twistFrameAtTick(-1)).toBeNull();
    expect(twistFrameAtTick(0.5)).toBeNull();
  });
});
