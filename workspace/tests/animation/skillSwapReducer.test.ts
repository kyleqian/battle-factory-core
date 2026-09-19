import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  SKILL_SWAP_ORB_TAG,
  skillSwapAtAge,
  skillSwapSourceAtAge,
  type SkillSwapLiveInputs,
} from "../../src/animation/skillSwap.ts";
import {
  sceneOnSkillSwapView,
  type SceneOnSkillSwapPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  skillSwapConfigFor,
  skillSwapInputsFor,
  verifySkillSwapReducer,
} from "../../tools/compare/verifySkillSwapReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_SKILL_SWAP source-relative reducer and narrow Scene-ON seam", () => {
  it("replays all 391 retained bilateral rows twice through the reducer and typed seam", () => {
    const first = verifySkillSwapReducer();
    expect(verifySkillSwapReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": {
        retainedRows: 196,
        reducerRows: 392,
        seamRows: 392,
        reducerSha256: "c31c12477d7c41d1b8e7696f5c68ed0905f2de278d6194417f5b6b3d95da6cb9",
        seamSha256: "c31c12477d7c41d1b8e7696f5c68ed0905f2de278d6194417f5b6b3d95da6cb9",
        framebufferCompared: false,
        coverageCredit: false,
      },
      "opponent-front": {
        retainedRows: 195,
        reducerRows: 390,
        seamRows: 390,
        reducerSha256: "7dd55e4131fb0933c97a15b5db769d102adf4bea1ff8889c620f6c7bdefd450c",
        seamSha256: "7dd55e4131fb0933c97a15b5db769d102adf4bea1ff8889c620f6c7bdefd450c",
        framebufferCompared: false,
        coverageCredit: false,
      },
      bilateral: {
        retainedRows: 391,
        passes: 2,
        reducerRows: 782,
        seamRows: 782,
        reducerSha256: "b5f72b1b4cb988dbae56267f6b432706f36a1154c36be9af7b483b3ce607bbce",
        seamSha256: "b5f72b1b4cb988dbae56267f6b432706f36a1154c36be9af7b483b3ce607bbce",
        framebufferCompared: false,
        coverageCredit: false,
      },
    });
  });

  it("keeps the root/subroutine cursor, two source legs, cadence, latches, and resource cleanup move-owned", () => {
    const player = skillSwapInputsFor("player-back", undefined, 42);
    expect(skillSwapSourceAtAge(0, 195)).toEqual({ owner: "Move_SKILL_SWAP", pointer: 0x082c_e3d8, pointerOffset: 0, active: true, wait: 0 });
    expect(skillSwapSourceAtAge(1, 195)).toMatchObject({ pointerOffset: 3, wait: 1 });
    expect(skillSwapSourceAtAge(4, 195)).toMatchObject({ pointerOffset: 2, wait: 1 });
    expect(skillSwapSourceAtAge(23, 195)).toMatchObject({ pointerOffset: 10, wait: 1 });
    expect(skillSwapSourceAtAge(42, 195)).toMatchObject({ pointerOffset: 42, wait: 16 });
    expect(skillSwapSourceAtAge(60, 195)).toMatchObject({ pointerOffset: 68, wait: 1 });
    expect(skillSwapSourceAtAge(156, 195)).toMatchObject({ pointerOffset: 13, wait: 1 });
    expect(skillSwapSourceAtAge(175, 195)).toMatchObject({ pointerOffset: 18, wait: 1 });
    expect(skillSwapSourceAtAge(195, 195)).toMatchObject({ pointerOffset: 74, active: false, wait: 0 });
    expect(skillSwapAtAge(42, player)).toMatchObject({
      animArgs: [1, 0x7fff, 12, 3, 1, 0, 0, 0],
      tasks: expect.arrayContaining([
        expect.objectContaining({ callback: "AnimTask_SkillSwap_Step", role: "target-orbs", data: expect.arrayContaining([-10, 160, 33, 48, 73]) }),
        expect.objectContaining({ callback: "AnimTask_BlendMonInAndOut_Step", role: "target-blend", data: expect.arrayContaining([273, 0x7fff, 0, 12, 1, 3, 0, 1]) }),
        expect.objectContaining({ callback: "Task_LoopAndPlaySE", data: expect.arrayContaining([217, -64, 24, 2]) }),
      ]),
      orbs: [expect.objectContaining({ slot: 3, matrixNum: 0, x: 160, y: 33, x2: 0, y2: 0, data: [16, 1793, 640, 0, 0, -10, 0x0800, 0] })],
      resources: { loaded: true, tag: SKILL_SWAP_ORB_TAG, tileSlot: player.resources.tileSlot, paletteAllocatorSlot: player.resources.paletteAllocatorSlot },
      displayTransfer: { oam: "preceding-software", matrices: "preceding-software", palette: "preceding-faded" },
    });
    const cleanup = skillSwapAtAge(195, skillSwapInputsFor("player-back", undefined, 195));
    expect(cleanup).toMatchObject({ active: false, tasks: [], orbs: [], resources: { loaded: false, tileSlot: null, paletteAllocatorSlot: null }, cleanup: { firstInactive: true, resourcesReleased: true, ownedTasks: 0, ownedOrbs: 0 } });
  });

  it("materially consumes live species, side/geometry, allocations/order/OAM/matrices, resources, audio, outcome, and presentation RNG without owning gameplay", () => {
    const input = skillSwapInputsFor("player-back", undefined, 42);
    const gameplayRng = Object.freeze({ opaque: "gameplay-rng", value: 0x0bad_c0de });
    const gameplayState = Object.freeze({ opaque: "gameplay-state", turn: 7 });
    const matrices: SkillSwapLiveInputs["softwareMatrices"] = Array.from({ length: 8 }, (_, index) => [256 + index * 17, index, -index, 256 + index * 19] as const);
    const allocations = input.orbAllocations.map((allocation, index) => ({
      ...allocation,
      slot: 32 + index,
      matrixNum: index & 7,
      sourceCreationOrder: 100 + index,
    }));
    const altered: SkillSwapLiveInputs = {
      ...input,
      attackerSide: "opponent",
      targetSide: "player",
      attackerSpecies: "CROBAT",
      targetSpecies: "BLISSEY",
      attackerBounds: { left: 170, right: 220, top: 10, bottom: 66 },
      targetBounds: { left: 10, right: 68, top: 78, bottom: 138 },
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 43, attr: [43, 0xc0a9, 0x6d23], subpriority: 55, matrixNum: 6, matrix: matrices[6]! },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 117, attr: [117, 0xc007, 0x4123], subpriority: 14, matrixNum: 7, matrix: matrices[7]! },
      taskSlots: { fadeToPsychic: 8, psychicBackground: 9, targetOrbs: 10, targetBlend: 11, loopReversal: 12, attackerOrbs: 13, attackerBlend: 14, restoreFade: 15 },
      orbAllocations: allocations,
      orbOam: allocations.map((allocation, index) => ({ slot: allocation.slot, attr: [index + 1, 0xc000 | index, 0x4200 | index] as const, subpriority: 40 + index })),
      spriteOrder: Array.from({ length: 64 }, (_, index) => 63 - index),
      softwareOam: [{ changed: "software-oam" }],
      hardwareOam: [{ changed: "hardware-oam" }],
      softwareMatrices: matrices,
      hardwareMatrices: matrices.slice().reverse(),
      palette: {
        unfaded: Array.from({ length: 512 }, (_, index) => (index * 17) & 0x7fff),
        faded: Array.from({ length: 512 }, (_, index) => (index * 29) & 0x7fff),
        hardware: Array.from({ length: 512 }, (_, index) => (index * 47) & 0x7fff),
      },
      registers: { ...input.registers, callerOwnedRegister: 0x2468 },
      background: { currentVram: { id: "altered-psychic" }, battleVram: { id: "altered-battle" }, psychicVram: { id: "altered-psychic-reference" } },
      resources: { tag: SKILL_SWAP_ORB_TAG, tileSlot: 31, paletteAllocatorSlot: 9, paletteBank: 25, tileRange: [620, 64], allocator: { changed: "allocator" } },
      sharedTaskData: { fadeToPsychic: [1], loopReversal: [2], restoreFade: [3] },
      targetBlendPaletteStart: 401,
      attackerBlendPaletteStart: 417,
      audio: { current: { changed: "audio" }, attackerPan: -63 },
      liveCounts: { visualTasks: 4, soundTasks: 2 },
      animationRng: input.animationRng ^ 0x1234_5678,
      abilityOutcome: { playerAbilityAfterSwap: 17, opponentAbilityAfterSwap: 42 },
      gameplayRng,
      gameplayState,
    };
    const baseline = skillSwapAtAge(42, input);
    const source = skillSwapAtAge(42, altered);
    expect(source).not.toEqual(baseline);
    expect(source).toMatchObject({
      battlers: {
        attacker: { side: "opponent", species: "CROBAT", bounds: altered.attackerBounds, sprite: { slot: 21, matrixNum: 6 } },
        target: { side: "player", species: "BLISSEY", bounds: altered.targetBounds, sprite: { slot: 22, matrixNum: 7 } },
      },
      tasks: expect.arrayContaining([
        expect.objectContaining({ slot: 10, role: "target-orbs", data: expect.arrayContaining([-10, 18, 86, 178, 18]) }),
        expect.objectContaining({ slot: 11, role: "target-blend", data: expect.arrayContaining([401]) }),
        expect.objectContaining({ slot: 12, role: "loop-reversal" }),
      ]),
      orbs: [expect.objectContaining({ slot: 32, matrixNum: 0, matrix: matrices[0], x: 18, y: 86, attr: [1, 0xc000, 0x4200], painterIndex: 31 })],
      resources: { loaded: true, tileSlot: 31, paletteAllocatorSlot: 9, paletteBank: 25, tileRange: [620, 64], allocator: { changed: "allocator" } },
      buffers: { softwareOam: [{ changed: "software-oam" }], hardwareOam: [{ changed: "hardware-oam" }], softwareMatrices: matrices },
      palette: altered.palette,
      registers: { callerOwnedRegister: 0x2468 },
      background: { vram: { id: "altered-psychic" } },
      audio: { live: { changed: "audio" }, events: [{ channel: "SE1", sound: "SE_M_REVERSAL", pan: -63, interval: 24, repeats: 3 }] },
      outcome: altered.abilityOutcome,
      rng: { animation: altered.animationRng, gameplay: gameplayRng, gameplayUnchanged: true },
      gameplay: gameplayState,
    });
    expect(source.painterOrder).not.toEqual(baseline.painterOrder);
    expect(source.rng.animation).not.toEqual(baseline.rng.animation);
    expect(gameplayRng).toEqual({ opaque: "gameplay-rng", value: 0x0bad_c0de });
    expect(gameplayState).toEqual({ opaque: "gameplay-state", turn: 7 });

    const config = skillSwapConfigFor("player-back", undefined, 42);
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, ...animationInputs } = altered;
    const seam = sceneOnSkillSwapView({
      age: 42,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "CROBAT" as never, geometry: { ...config.attacker.geometry, side: "opponent", spriteCorner: { x: 170, y: 10 }, animationCenter: { x: 201, y: 43 }, battlePositionCenter: { x: 201, y: 43 } } },
        target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", spriteCorner: { x: 10, y: 78 }, animationCenter: { x: 39, y: 117 }, battlePositionCenter: { x: 39, y: 117 } } },
        animationInputs,
      },
    } as SceneOnSkillSwapPresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(source);
    expect(attacker.geometry.side).toBe("opponent");
    expect(target.geometry.side).toBe("player");
  });

  it("keeps retained evidence out of production and grants only Skill Swap/its sole track credit", () => {
    const source = readFileSync(resolve(root, "src/animation/skillSwap.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party|reference)[^"']*["']/u);
    expect(source).not.toMatch(/absolute\s*(?:battle\s*)?(?:tick|frame)|framebuffer|controller-frame/iu);
    const data = coverage as Json;
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_SKILL_SWAP"))
      .toMatchObject({ status: "exact" });
    expect(data.componentTracks.find((track: Json) => track.id === "skill-swap-bluegreen-orb"))
      .toMatchObject({ representatives: ["MOVE_SKILL_SWAP"], fulfilled: true });
  });
});
