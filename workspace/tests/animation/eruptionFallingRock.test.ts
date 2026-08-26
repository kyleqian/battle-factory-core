import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  ERUPTION_FALLING_ROCK_DEFAULT_GEOMETRY,
  ERUPTION_FALLING_ROCK_SOURCE_CALLS,
  eruptionFallingRockTimeline,
} from "../../src/animation/eruptionFallingRock.ts";

const profile = {
  creationAge: 4,
  endAge: 113,
  calls: ERUPTION_FALLING_ROCK_SOURCE_CALLS,
  geometry: ERUPTION_FALLING_ROCK_DEFAULT_GEOMETRY,
  allocator: {
    freeSpriteSlots: [3, 4, 5, 7, 9, 10],
    tileTag: 10201,
    paletteTag: 10201,
    tileRange: [537, 84],
    tileRangeBeforeLoad: [305, 16],
    paletteSlot: 7,
    loadedAge: 1,
    freedAge: 113,
  },
  startingAnimationRng: 0x12345678,
} as const;

describe("MOVE_ERUPTION falling-rock sprite component", () => {
  it("replays both complete retained Scene-ON windows through source, state, OAM, resources, and cleanup", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/eruptionFallingRockAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(summary).toMatchObject({
      component: "sprite:gEruptionFallingRockSpriteTemplate",
      move: "MOVE_ERUPTION",
      oracleProfile: "battle-scene-on",
      status: "unsupported-unfulfilled-component-audit",
      coverageCredit: false,
      ownership: { fallingRockSpriteOnly: true, task: false, shake: false, palette: false, audio: false, gameplay: false, rngConsumption: false, framebuffer: false },
      sides: {
        "player-back": {
          sourceWindow: { startFrame: 234, endFrame: 709, frameCount: 476 },
          creation: { age: 215, frame: 449, count: 6, slots: [3, 4, 5, 7, 9, 10], tileOffsets: [0, 16, 32, 48, 0, 16] },
          resources: { loadedAge: 1, freedAge: 475, tileRange: [537, 84], paletteSlot: 7 },
          counts: { spriteRows: 419, transferRows: 475, firstInactiveAge: 324 },
        },
        "opponent-front": {
          sourceWindow: { startFrame: 221, endFrame: 714, frameCount: 494 },
          creation: { age: 233, frame: 454, count: 6, slots: [3, 4, 5, 7, 9, 10], tileOffsets: [0, 16, 32, 48, 0, 16] },
          resources: { loadedAge: 1, freedAge: 493, tileRange: [537, 84], paletteSlot: 7 },
          counts: { spriteRows: 419, transferRows: 493, firstInactiveAge: 342 },
        },
      },
    });
    expect(summary.sides["player-back"].lifecycle).toEqual([
      { slot: 3, sourceOrderIndex: 0, birthAge: 215, destroyAge: 248, lastVisibleAge: 247, tileOffset: 0 },
      { slot: 4, sourceOrderIndex: 1, birthAge: 215, destroyAge: 263, lastVisibleAge: 262, tileOffset: 16 },
      { slot: 5, sourceOrderIndex: 2, birthAge: 215, destroyAge: 275, lastVisibleAge: 274, tileOffset: 32 },
      { slot: 7, sourceOrderIndex: 3, birthAge: 215, destroyAge: 293, lastVisibleAge: 292, tileOffset: 48 },
      { slot: 9, sourceOrderIndex: 4, birthAge: 215, destroyAge: 306, lastVisibleAge: 305, tileOffset: 0 },
      { slot: 10, sourceOrderIndex: 5, birthAge: 215, destroyAge: 324, lastVisibleAge: 323, tileOffset: 16 },
    ]);
    expect(summary.sides["opponent-front"].lifecycle.map((life: any) => [life.slot, life.destroyAge, life.lastVisibleAge])).toEqual([
      [3, 266, 265], [4, 281, 280], [5, 293, 292], [7, 311, 310], [9, 324, 323], [10, 342, 341],
    ]);
  });

  it("keeps the callback's creation-row convention, delayed fall, bounce, and strict destroy age pure", () => {
    const replay = eruptionFallingRockTimeline(profile);
    const frames = replay.frames;
    expect(frames[3]).toMatchObject({ source: null, sprites: [], visual: { activeSprites: 0, createdSprites: 0 }, cleanup: { firstInactive: false, active: false } });
    expect(frames[4]).toMatchObject({
      source: { offset: 153, wait: 22, args: [60, -32, 80, 70, 1, 0, 0, 0] },
      visual: { activeSprites: 6, createdSprites: 6 },
      sprites: [
        { slot: 3, localAge: 0, state: 1, x: 200, y: -24, data: [1, 0, 0, 0, 0, 0, 0, 100], attr: [216, 32952, 31257], displayedInOam: false },
        { slot: 4, localAge: 0, state: 0, y: -32, data: [0, 0, 0, 0, 0, 0, 15, 90], tileOffset: 16 },
        { slot: 5, tileOffset: 32 }, { slot: 7, tileOffset: 48 }, { slot: 9, tileOffset: 0 }, { slot: 10, tileOffset: 16 },
      ],
    });
    expect(frames[5]!.sprites.find((sprite) => sprite.slot === 4)).toMatchObject({ data: [0, 0, 0, 0, 0, 0, 14, 90], y: -32, displayedInOam: true });
    expect(frames[20]!.sprites.find((sprite) => sprite.slot === 3)).toMatchObject({ state: 2, y: 100, y2: 0, data: [2, 0, 0, 0, 0, 0, 0, 100] });
    expect(frames[21]!.sprites.find((sprite) => sprite.slot === 3)).toMatchObject({ state: 2, y2: 0, data: [2, 1, 0, 1, 0, 0, 0, 100] });
    expect(frames[22]!.sprites.find((sprite) => sprite.slot === 3)).toMatchObject({ y2: -3, attr: [81, 32952, 31257], data: [2, 0, 1, 2, 0, 0, 0, 100] });
    expect(frames[113]).toMatchObject({
      source: { offset: 204, pointer: 137159639, wait: 1 },
      sprites: [],
      destroyedSlots: [10],
      resources: { tileRange: [537, 84], tileAllocationRetained: false, paletteAllocationRetained: false },
      cleanup: { firstInactive: true, activeSprites: 0, active: false },
    });
    expect(replay.lifecycle.map((life) => [life.slot, life.destroyAge, life.lastVisibleAge])).toEqual([
      [3, 37, 36], [4, 52, 51], [5, 64, 63], [7, 82, 81], [9, 95, 94], [10, 113, 112],
    ]);
  });
});
