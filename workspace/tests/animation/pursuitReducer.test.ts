import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  PURSUIT_FIRST_INACTIVE_AGE,
  pursuitAtAge,
  type PursuitLiveInputs,
} from "../../src/animation/pursuit.ts";
import {
  sceneOnPursuitView,
  type SceneOnPursuitPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  pursuitConfigFor,
  pursuitInputsFor,
  verifyPursuitReducer,
} from "../../tools/compare/verifyPursuitReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_PURSUIT source-relative reducer and narrow Scene-ON seam", () => {
  it("replays all 309 retained normal and switch-interception rows twice", () => {
    const first = verifyPursuitReducer();
    expect(verifyPursuitReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 103, reducerRows: 206, seamRows: 206, reducerSha256: "9b66c7cacd25faca475b2ceb10d992adff6669dc6447c61ecddcdf8f0a9c6385", seamSha256: "9b66c7cacd25faca475b2ceb10d992adff6669dc6447c61ecddcdf8f0a9c6385", framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 103, reducerRows: 206, seamRows: 206, reducerSha256: "c77afcea6a141c2b6daeaae264903e9a2e51af34611443e26863cf1c6f6c7f15", seamSha256: "c77afcea6a141c2b6daeaae264903e9a2e51af34611443e26863cf1c6f6c7f15", framebufferCompared: false, coverageCredit: false },
      "switchout-opponent-front": { retainedRows: 103, reducerRows: 206, seamRows: 206, reducerSha256: "9c4b3b9856e7f690a06eedfb421e2ffff62c89274b83ed2e045d1a74d8de01e8", seamSha256: "9c4b3b9856e7f690a06eedfb421e2ffff62c89274b83ed2e045d1a74d8de01e8", framebufferCompared: false, coverageCredit: false },
      allWindows: { retainedRows: 309, passes: 2, reducerRows: 618, seamRows: 618, reducerSha256: "aae5bf5e4da117ba6fa0b3a2984d3a4ea1dc6e37cdc5c8fe6cb4b41d71965f97", seamSha256: "aae5bf5e4da117ba6fa0b3a2984d3a4ea1dc6e37cdc5c8fe6cb4b41d71965f97", framebufferCompared: false, coverageCredit: false },
    });
  });

  it("keeps the root, selected affine branch, power shake, latches, and cleanup source-owned", () => {
    const normal = pursuitInputsFor("opponent-front", undefined, 47);
    const switchout = pursuitInputsFor("switchout-opponent-front", undefined, 47);
    expect(pursuitAtAge(0, normal)).toMatchObject({
      active: true,
      source: { pointer: 0x082c_a980, pointerOffset: 0, wait: 0, branch: "normal" },
      resources: { impactLoaded: false },
      displayTransfer: { oam: "initial", matrices: "initial", palette: "initial", monbgHofs: "initial" },
    });
    expect(pursuitAtAge(4, normal)).toMatchObject({
      source: { pointerOffset: 5, wait: 1 },
      tasks: [expect.objectContaining({ callback: "Task_UpdateMonBg", data: expect.arrayContaining([6, 72, 91, -40, -59, 1, 0]) })],
      monbg: { active: true, update: true, clear: false, layer: "bg2" },
      displayTransfer: { palette: "same-row-monbg", monbgHofs: "initial" },
    });
    expect(pursuitAtAge(47, normal)).toMatchObject({
      source: { pointerOffset: 22, wait: 1, branch: "normal" },
      animArgs: [0, 1, 6, 1, 0, 0, 0, 0],
      impact: { affineAnimation: 2, matrix: [372, 0, 0, 372], slot: 3, matrixSlot: 0, x: 72, y: 99 },
      tasks: expect.arrayContaining([
        expect.objectContaining({ callback: "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step", data: [1, 1, 6, 0, 0, 0, 0, 6, 0, 0, 1, 0, 0, 2, 1, 3] }),
      ]),
      shake: { targetOffset: { x: 0, y: 0 }, sourceScroll: { x: -40, y: -59 } },
      audio: { events: [{ channel: "SE1", sound: "SE_M_COMET_PUNCH", pan: -63 }] },
      displayTransfer: { oam: "preceding-software", matrices: "preceding-software", palette: "preceding-faded", directBlendRegisters: "current-source" },
    });
    expect(pursuitAtAge(48, normal).shake).toEqual({ targetOffset: { x: 2, y: 0 }, sourceScroll: { x: -42, y: -59 } });
    expect(pursuitAtAge(56, normal)).toMatchObject({
      impact: { callback: "DestroyAnimSprite" },
      shake: { targetOffset: { x: 2, y: 0 } },
    });
    expect(pursuitAtAge(57, normal)).toMatchObject({ impact: null, shake: { targetOffset: { x: 2, y: 0 } } });
    expect(pursuitAtAge(58, normal)).toMatchObject({ impact: null, shake: { targetOffset: { x: 0, y: 0 } } });
    expect(pursuitAtAge(59, normal)).toMatchObject({
      source: { pointerOffset: 28, wait: -1 },
      tasks: expect.arrayContaining([expect.objectContaining({ callback: "Task_ClearMonBg", data: expect.arrayContaining([0, 1, 0]) })]),
    });
    expect(pursuitAtAge(63, normal)).toMatchObject({ source: { pointerOffset: 29, wait: 1 }, background: { phase: "restoring-battle" } });
    expect(pursuitAtAge(82, normal).background.phase).toBe("battle");
    expect(pursuitAtAge(PURSUIT_FIRST_INACTIVE_AGE, normal)).toMatchObject({
      active: false,
      source: { pointerOffset: 30, wait: 0 },
      tasks: [],
      impact: null,
      resources: { impactLoaded: false, paletteSlot: null, tileSlot: null },
      cleanup: { firstInactive: true, resourcesReleased: true, ownedTasks: 0, ownedSprites: 0 },
    });
    expect(pursuitAtAge(47, switchout)).toMatchObject({
      source: { branch: "switchout" },
      impact: { affineAnimation: 1, matrix: [303, 0, 0, 303], slot: 5, matrixSlot: 2 },
      resources: { paletteSlot: 6, tileSlot: 5 },
    });
  });

  it("materially consumes live side/species/geometry, selected IMPACT allocation, shared buffers, audio, and presentation RNG without owning gameplay", () => {
    const input = pursuitInputsFor("opponent-front", undefined, 47);
    const gameplayRng = Object.freeze({ opaque: "gameplay-rng", value: 0x0bad_c0de });
    const gameplayState = Object.freeze({ opaque: "gameplay-state", turn: 7 });
    const order = Array.from({ length: 64 }, (_, slot) => 63 - slot);
    const altered: PursuitLiveInputs = {
      ...input,
      attackerSide: "player",
      targetSide: "opponent",
      attackerSpecies: "CROBAT",
      targetSpecies: "BLISSEY",
      attackerCenter: { x: 202, y: 46 },
      targetCenter: { x: 37, y: 116 },
      targetImpactCenter: { x: 37, y: 116 },
      branch: "switchout",
      attackerSpriteSlot: 21,
      targetSpriteSlot: 22,
      targetInitialOffset: { x: 3, y: -1 },
      taskSlots: { fadeToDark: 8, monbg: 9, shake: 10, clearMonbg: 11, restoreBattle: 12 },
      impact: { slot: 29, matrixSlot: 6, attr: [116, 0xc0a9, 0x6d23], subpriority: 54, paletteSlot: 14, tileSlot: 91, allocator: { allocation: "switch-ui-history" } },
      monbg: { layer: "bg1", spriteX: 37, spriteY: 116, bgX: -173, bgY: -24, inBg2: false, battlerId: 1 },
      spriteOrder: order,
      buffers: {
        softwareOam: Array.from({ length: 128 }, (_, slot) => ({ slot, source: "software" })),
        hardwareOam: Array.from({ length: 128 }, (_, slot) => ({ slot, source: "hardware" })),
        softwareMatrices: Array.from({ length: 32 }, (_, slot) => [256 + slot, slot, -slot, 256 + slot] as const),
        hardwareMatrices: Array.from({ length: 32 }, (_, slot) => [384 - slot, -slot, slot, 384 - slot] as const),
      },
      palette: {
        unfaded: Array.from({ length: 512 }, (_, slot) => (slot * 17) & 0x7fff),
        faded: Array.from({ length: 512 }, (_, slot) => (slot * 29) & 0x7fff),
        hardware: Array.from({ length: 512 }, (_, slot) => (slot * 47) & 0x7fff),
      },
      registers: { callerOwnedRegister: 0x2468, bldcnt: 0x3f40, bldalpha: 0x080c },
      background: { currentVram: { id: "altered-dark" }, battleVram: { id: "altered-battle" }, darkVram: { id: "altered-dark-reference" } },
      sharedTaskData: { fadeToDark: Array.from({ length: 16 }, (_, slot) => slot + 1), restoreBattle: Array.from({ length: 16 }, (_, slot) => slot + 17) },
      audio: { current: { output: "altered-audio" }, targetPan: 61 },
      liveCounts: { visualTasks: 4, soundTasks: 2, matrixBitmap: 0x41 },
      movePower: 96,
      moveDamage: 144,
      animationRng: 0x1234_5678,
      gameplayRng,
      gameplayState,
    };
    const baseline = pursuitAtAge(47, input);
    const source = pursuitAtAge(47, altered);
    expect(source).not.toEqual(baseline);
    expect(source).toMatchObject({
      battlers: {
        attacker: { side: "player", species: "CROBAT", center: { x: 202, y: 46 }, spriteSlot: 21 },
        target: { side: "opponent", species: "BLISSEY", center: { x: 37, y: 116 }, spriteSlot: 22 },
      },
      impact: { branch: "switchout", affineAnimation: 1, matrix: [303, 0, 0, 303], slot: 29, matrixSlot: 6, attr: [116, 0xc0a9, 0x6d23], painterIndex: 34, x: 37, y: 116 },
      tasks: expect.arrayContaining([
        expect.objectContaining({ slot: 10, callback: "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step", data: expect.arrayContaining([22, 3, -1, 4, 4, 8]) }),
      ]),
      resources: { impactLoaded: true, paletteSlot: 14, paletteBank: 30, tileSlot: 91, matrixBitmap: 0x41, allocator: { allocation: "switch-ui-history" } },
      buffers: altered.buffers,
      palette: altered.palette,
      registers: altered.registers,
      background: { vram: { id: "altered-dark" } },
      audio: { live: { output: "altered-audio" }, events: [{ channel: "SE1", sound: "SE_M_COMET_PUNCH", pan: 61 }] },
      rng: { animation: 0x1234_5678, gameplay: gameplayRng, gameplayUnchanged: true },
      gameplay: gameplayState,
    });
    expect(pursuitAtAge(48, altered).shake).toEqual({ targetOffset: { x: 7, y: -1 }, sourceScroll: { x: -180, y: -23 } });
    expect(source.painterOrder).not.toEqual(baseline.painterOrder);
    expect(gameplayRng).toEqual({ opaque: "gameplay-rng", value: 0x0bad_c0de });
    expect(gameplayState).toEqual({ opaque: "gameplay-state", turn: 7 });

    const config = pursuitConfigFor("opponent-front", undefined, 47);
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, attackerCenter: _attackerCenter, targetCenter: _targetCenter, targetImpactCenter: _targetImpactCenter, ...animationInputs } = altered;
    const seam = sceneOnPursuitView({
      age: 47,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "CROBAT" as never, geometry: { ...config.attacker.geometry, side: "player", spriteCorner: { x: 170, y: 14 }, animationCenter: altered.attackerCenter, battlePositionCenter: altered.attackerCenter } },
        target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "opponent", spriteCorner: { x: 8, y: 82 }, animationCenter: altered.targetCenter, battlePositionCenter: altered.targetCenter } },
        animationInputs,
      },
    } as SceneOnPursuitPresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(source);
    expect(attacker.geometry.side).toBe("player");
    expect(target.geometry.side).toBe("opponent");
  });

  it("keeps retained evidence out of production and leaves Pursuit unsupported/unfulfilled", () => {
    const source = readFileSync(resolve(root, "src/animation/pursuit.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party|reference)[^"']*["']/u);
    expect(source).not.toMatch(/absolute\s*(?:battle\s*)?(?:tick|frame)|framebuffer|controller-frame/iu);
    const data = coverage as Json;
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_PURSUIT")).toBeUndefined();
    expect(data.componentTracks.find((entry: Json) => entry.id === "pursuit-dark-background-power-shake"))
      .toMatchObject({ representatives: ["MOVE_PURSUIT"], fulfilled: false });
  });
});
