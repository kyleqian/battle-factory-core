import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ERUPTION_HORIZONTAL_SHAKE_CAPTURED_ARGS,
  eruptionHorizontalShakeAtAge,
  eruptionHorizontalShakeTimeline,
} from "../../src/animation/eruptionHorizontalShake.ts";

const profile = {
  orientation: "player-back",
  taskCreationAge: 4,
  endAge: 205,
  platformTaskSlot: 0,
  battlerTaskSlot: 1,
  platformInitialX: 0,
  battlers: [
    { battlerId: 0, side: "player", spriteSlot: 6, x: 72, y: 90, initialX2: 0, initialY2: 0 },
    { battlerId: 1, side: "opponent", spriteSlot: 8, x: 176, y: 42, initialX2: 1, initialY2: 0 },
  ],
  startingAnimationRng: 0x1234_5678,
  gameplayRng: 0x8765_4321,
  resources: {
    tileTag: 10201,
    paletteTag: 10201,
    tileRangeBeforeLoad: [433, 12],
    tileRange: [537, 84],
    paletteSlot: 7,
    loadedAge: 1,
    freedAge: 205,
  },
} as const;

describe("MOVE_ERUPTION AnimTask_HorizontalShake component", () => {
  it("keeps the exact paired source call, callback cadence, OAM lag, and first cleanup pure", () => {
    expect(eruptionHorizontalShakeAtAge(4, profile)).toMatchObject({
      localAge: 0,
      source: {
        offset: 187, pointer: 0x082c_e3c6,
        platformArgs: [5, 8, 60], battlerArgs: [4, 8, 60],
        capturedArgs: ERUPTION_HORIZONTAL_SHAKE_CAPTURED_ARGS,
        firstCallbackAge: 5,
      },
      platformTask: null, battlerTask: null,
      lifecycle: { created: true, active: false, firstInactive: false, callbackRows: 0 },
      battlers: [
        { spriteSlot: 6, x2: 0, displayedOamX2: 0 },
        { spriteSlot: 8, x2: 1, displayedOamX2: 1 },
      ],
    });
    expect(eruptionHorizontalShakeAtAge(5, profile)).toMatchObject({
      localAge: 1,
      platformTask: { slot: 0, callback: "AnimTask_ShakePlatforms", data: [0, 1, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 11] },
      battlerTask: { slot: 1, callback: "AnimTask_ShakeBattlers", data: [0, 1, 0, 60, 0, 0, 0, 0, 0, 6, 8, 0, 0, 2, 11, 11] },
      platform: { sourceX: 0, displayedX: 0 },
      battlers: [
        { spriteSlot: 6, x2: 0, displayedOamX2: 0 },
        { spriteSlot: 8, x2: 1, displayedOamX2: 1 },
      ],
      lifecycle: { active: true, callbackRows: 1, ownedVisualTaskCount: 2 },
    });
    expect(eruptionHorizontalShakeAtAge(6, profile)).toMatchObject({
      platformTask: { data: [0, 0, 1, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 11] },
      battlerTask: { data: [0, 0, 1, 60, 0, 0, 0, 0, 0, 6, 8, 0, 0, 2, 11, 11] },
      platform: { sourceX: 11, displayedX: 0 },
      battlers: [
        { spriteSlot: 6, x2: 6, displayedOamX2: 0 },
        { spriteSlot: 8, x2: 6, displayedOamX2: 1 },
      ],
    });
    expect(eruptionHorizontalShakeAtAge(7, profile)).toMatchObject({
      platform: { sourceX: 11, displayedX: 11 },
      battlers: [
        { spriteSlot: 6, x2: 6, displayedOamX2: 6 },
        { spriteSlot: 8, x2: 6, displayedOamX2: 6 },
      ],
    });
    expect(eruptionHorizontalShakeAtAge(204, profile)).toMatchObject({
      localAge: 200,
      platformTask: { data: [2, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11] },
      battlerTask: { data: [2, 0, 0, 60, 0, 0, 0, 0, 0, 6, 8, 0, 0, 2, 0, 11] },
      platform: { sourceX: -1, displayedX: 1 },
      battlers: [{ x2: 0, displayedOamX2: 1 }, { x2: 0, displayedOamX2: 1 }],
      lifecycle: { active: true, firstInactive: false, callbackRows: 200 },
    });
    expect(eruptionHorizontalShakeAtAge(205, profile)).toMatchObject({
      localAge: 201,
      platformTask: null, battlerTask: null,
      platform: { sourceX: 0, displayedX: -1 },
      battlers: [{ x2: 0 }, { x2: 0 }],
      lifecycle: { active: false, firstInactive: true, destroyed: true, callbackRows: 200, ownedVisualTaskCount: 0 },
      resources: { tileAllocationRetained: false, paletteAllocationRetained: false, passedThroughWithoutTaskAllocation: true },
      rng: { gameplay: 0x8765_4321, animationConsumedByTask: false, gameplayConsumedByTask: false },
    });
    expect(eruptionHorizontalShakeTimeline(profile)).toHaveLength(206);
  });

  it("strictly replays every retained bilateral Scene-ON source, task, geometry, OAM, RNG, resource, and cleanup row", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/eruptionHorizontalShakeAudit.ts",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })) as Record<string, any>;
    expect(audit).toMatchObject({
      schema: "eruption-horizontal-shake-component-audit/v1",
      component: "task:AnimTask_HorizontalShake",
      move: "MOVE_ERUPTION",
      oracleProfile: "battle-scene-on",
      status: "unsupported-unfulfilled-component-audit",
      coverageCredit: false,
      ownership: {
        horizontalShakeOnly: true, launchRocks: false, fallingRocks: false, palette: false,
        audio: false, typedSeam: false, compositor: false, framebuffer: false,
        gameplay: false, rngConsumption: false, controller: false,
      },
      sides: {
        "player-back": {
          sourceWindow: { startFrame: 234, endFrame: 709, frameCount: 476 },
          source: { creationAge: 238, firstCallbackAge: 239, sourceOffset: 187, sourcePointer: 0x082c_e3c6, capturedArgs: [4, 8, 60, 70, 1, 0, 0, 0] },
          tasks: {
            platform: { slot: 0, callback: "AnimTask_ShakePlatforms", rows: 200 },
            battlers: { slot: 1, callback: "AnimTask_ShakeBattlers", rows: 200, spriteSlots: [6, 8] },
            lifecycle: { lastCallbackAge: 438, firstInactiveAge: 439, callbackRows: 200 },
          },
          geometry: { attacker: 0, target: 1, battlers: [
            { battlerId: 0, side: "player", spriteSlot: 6, x: 72, y: 90, initialX2: 0 },
            { battlerId: 1, side: "opponent", spriteSlot: 8, x: 176, y: 42, initialX2: 1 },
          ] },
          resources: { loadedAge: 1, freedAge: 475, paletteSlot: 7, tileRange: [537, 84] },
          checked: { rows: 476, taskRows: 200, taskDataRows: 400, geometryRows: 404, softwareOamRows: 404, hardwareOamPredecessorRows: 475, rngRows: 476, resourceRows: 476 },
        },
        "opponent-front": {
          sourceWindow: { startFrame: 221, endFrame: 714, frameCount: 494 },
          source: { creationAge: 256, firstCallbackAge: 257, sourceOffset: 187, sourcePointer: 0x082c_e3c6, capturedArgs: [4, 8, 60, 70, 1, 0, 0, 0] },
          tasks: {
            platform: { slot: 0, callback: "AnimTask_ShakePlatforms", rows: 200 },
            battlers: { slot: 1, callback: "AnimTask_ShakeBattlers", rows: 200, spriteSlots: [6, 8] },
            lifecycle: { lastCallbackAge: 456, firstInactiveAge: 457, callbackRows: 200 },
          },
          geometry: { attacker: 1, target: 0, battlers: [
            { battlerId: 0, side: "player", spriteSlot: 6, x: 72, y: 80, initialX2: 0 },
            { battlerId: 1, side: "opponent", spriteSlot: 8, x: 176, y: 51, initialX2: 0 },
          ] },
          resources: { loadedAge: 1, freedAge: 493, paletteSlot: 7, tileRange: [537, 84] },
          checked: { rows: 494, taskRows: 200, taskDataRows: 400, geometryRows: 404, softwareOamRows: 404, hardwareOamPredecessorRows: 493, rngRows: 494, resourceRows: 494 },
        },
      },
    });
  });

  it("keeps Eruption exact and the non-exclusive Warm Rock track fulfilled", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_ERUPTION")?.status).toBe("exact");
    expect(coverage.componentTracks.find((track: any) => track.id === "eruption-warm-rock")).toMatchObject({
      fulfilled: true,
      components: ["asset:ANIM_TAG_WARM_ROCK", "sprite:gEruptionFallingRockSpriteTemplate", "task:AnimTask_EruptionLaunchRocks", "task:AnimTask_HorizontalShake", "visualCommand:simple_palette_blend"],
    });
  });
});
