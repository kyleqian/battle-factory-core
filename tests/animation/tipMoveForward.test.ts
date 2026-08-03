import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ADD_NEW_ANIM_DEFAULTS,
  speciesFrontIdleRestOffset,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
  TIP_MOVE_FORWARD_ENTRY,
  TIP_MOVE_FORWARD_FACTORY_FRONT_SPECIES,
  TIP_MOVE_FORWARD_FRONT_SPECIES,
  TIP_MOVE_FORWARD_OUTSIDE_FACTORY_FRONT_SPECIES,
  tipMoveForwardFrameAtTick,
} from "../../src/animation/speciesIdleAnim.ts";

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

describe("ANIM_TIP_MOVE_FORWARD", () => {
  it("derives RELICANTH's complete one-mapping Factory census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_TIP_MOVE_FORWARD")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["RELICANTH"]);
    expect(TIP_MOVE_FORWARD_FRONT_SPECIES).toEqual(generated);
    expect(TIP_MOVE_FORWARD_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(TIP_MOVE_FORWARD_FACTORY_FRONT_SPECIES).toEqual(["RELICANTH"]);
    expect(TIP_MOVE_FORWARD_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(speciesFrontIdleRestOffset("RELICANTH")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins direct task setup while keeping AddNewAnim's unrelated defaults explicit", () => {
    expect(ADD_NEW_ANIM_DEFAULTS).toEqual({
      rotation: 0, delay: 0, runs: 1, speed: 0, data: 0,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(TIP_MOVE_FORWARD_ENTRY).toEqual({
      selector: "ANIM_TIP_MOVE_FORWARD",
      sourceId: 26,
      usesAddNewAnim: false,
      taskZeroedDataIndices: [0, 2, 3, 4, 5, 6, 7],
      taskPreservedDataIndices: [1],
      normalFrontDontFlip: true,
      callbackInstalled: "Anim_TipMoveForward",
      callbackInvokedByInitializer: false,
      taskRestoresBattlerAndSpeciesAtSpriteCallbackDummy: true,
      accepted: true,
    });
  });

  it("exhausts every source callback, C-truncated index, affine write, and x2 write", () => {
    const lastMoveIndex = Math.trunc(((29 - 10) * 128) / 20);
    const lastMoveX2 = -gbaSin(lastMoveIndex, 5) + 0;

    for (let tick = 0; tick <= 36; tick += 1) {
      const frame = tipMoveForwardFrameAtTick(tick);
      expect(frame, `callback ${tick}`).not.toBeNull();
      const terminal = tick === 36;
      const phase = terminal
        ? "terminal"
        : tick < 10
          ? "tip"
          : tick <= 29
            ? "moveForward"
            : "tipBack";
      const index = terminal ? null : Math.trunc(((tick - 10) * 128) / 20);
      const affineRotation = terminal
        ? 0
        : tick < 10
          ? Math.trunc(tick / 2) * 512
          : tick <= 29
            ? 2048
            : Math.trunc((35 - tick) / 2) * 1024;
      const x2 = terminal
        ? 0
        : tick < 10
          ? 0
          : tick <= 29
            ? -gbaSin(index!, 5) + 0
            : lastMoveX2;
      const hasAffineWrite = tick < 10 || tick >= 30;

      expect(frame).toMatchObject({
        x2,
        y2: 0,
        data2Before: tick,
        data2: tick + 1,
        counter: tick,
        index,
        phase,
        affineRotationSigned: affineRotation,
        affineRotationU16: affineRotation,
        affineWriteCount: hasAffineWrite ? 1 : 0,
        xScale: 256,
        yScale: 256,
        wroteX2: tick >= 10 && tick <= 29 || terminal,
        startedAffine: tick === 0,
        normalFrontDontFlip: true,
        tryFlipXBeforeMotion: true,
        tryFlipXAfterMotion: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: terminal,
        callback: terminal ? "WaitAnimEnd" : "Anim_TipMoveForward",
        affineMode: terminal ? "normal" : "double",
      });
      expect(frame!.affineWrites).toEqual(hasAffineWrite ? [{
        xScale: 256,
        yScale: 256,
        rotationSigned: affineRotation,
        rotationU16: affineRotation,
      }] : []);
    }

    expect(tipMoveForwardFrameAtTick(0)).toMatchObject({
      index: -64,
      phase: "tip",
      affineWrites: [{ rotationSigned: 0 }],
    });
    expect(tipMoveForwardFrameAtTick(9)).toMatchObject({
      index: -6,
      affineRotationSigned: 2048,
    });
    expect(tipMoveForwardFrameAtTick(10)).toMatchObject({
      index: 0,
      x2: 0,
      affineRotationSigned: 2048,
      affineWrites: [],
    });
    expect(tipMoveForwardFrameAtTick(29)).toMatchObject({
      index: 121,
      x2: lastMoveX2,
      affineWrites: [],
    });
    expect(tipMoveForwardFrameAtTick(30)).toMatchObject({
      x2: lastMoveX2,
      affineRotationSigned: 2048,
    });
    expect(tipMoveForwardFrameAtTick(35)).toMatchObject({
      affineRotationSigned: 0,
      x2: lastMoveX2,
    });
  });

  it("keeps its terminal stable, rejects invalid input, and preserves adjacent controls", () => {
    const terminal = tipMoveForwardFrameAtTick(36);
    expect(terminal).toEqual({
      x2: 0,
      y2: 0,
      data2Before: 36,
      data2: 37,
      counter: 36,
      index: null,
      phase: "terminal",
      affineRotationSigned: 0,
      affineRotationU16: 0,
      affineWrites: [{ xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0 }],
      affineWriteCount: 1,
      xScale: 256,
      yScale: 256,
      wroteX2: true,
      startedAffine: false,
      normalFrontDontFlip: true,
      tryFlipXBeforeMotion: true,
      tryFlipXAfterMotion: true,
      tryFlipXCalls: 2,
      resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
      affineMode: "normal",
    });
    expect(tipMoveForwardFrameAtTick(37)).toEqual(terminal);
    expect(tipMoveForwardFrameAtTick(1000)).toEqual(terminal);
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(tipMoveForwardFrameAtTick(invalid)).toBeNull();
    }

    expect(selectorTables.frontAnimIds.species.BLASTOISE).toBe("ANIM_V_SHAKE_TWICE");
    expect(speciesFrontIdleRestOffset("BLASTOISE")).toEqual({ x2: 0, y2: 0 });
    expect(Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_H_PIVOT"))
      .toEqual([
        ["WINGULL", "ANIM_H_PIVOT"],
        ["DEOXYS", "ANIM_H_PIVOT"],
      ]);
    expect(speciesFrontIdleRestOffset("WINGULL")).toBeNull();
    expect(speciesFrontIdleRestOffset("DEOXYS")).toBeNull();
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain("ANIM_TIP_MOVE_FORWARD");
  });
});
