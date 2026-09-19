import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  PSYWAVE_BLUE_RING_TAG,
  PSYWAVE_FIRST_INACTIVE_AGE,
  psywaveAtAge,
  psywaveSourceAtAge,
  type PsywaveLiveInputs,
} from "../../src/animation/psywave.ts";
import {
  sceneOnPsywaveView,
  type SceneOnPsywavePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  psywaveConfigFor,
  psywaveInputsFor,
  verifyPsywaveReducer,
} from "../../tools/compare/verifyPsywaveReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_PSYWAVE source-relative reducer and narrow Scene-ON seam", () => {
  it("replays all 410 retained bilateral rows twice through the reducer and typed seam", () => {
    const first = verifyPsywaveReducer();
    expect(verifyPsywaveReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": {
        retainedRows: 205,
        reducerRows: 410,
        seamRows: 410,
        reducerSha256: "cc397b813a0321f8424aabef4fe1209fb7cea1d4afa482c35f1760f5da55423f",
        seamSha256: "cc397b813a0321f8424aabef4fe1209fb7cea1d4afa482c35f1760f5da55423f",
        framebufferCompared: false,
        coverageCredit: false,
      },
      "opponent-front": {
        retainedRows: 205,
        reducerRows: 410,
        seamRows: 410,
        reducerSha256: "21bb2fe8d561fa97895df267681b891b74ba0b6a39e68b7867db731df35f4ca9",
        seamSha256: "21bb2fe8d561fa97895df267681b891b74ba0b6a39e68b7867db731df35f4ca9",
        framebufferCompared: false,
        coverageCredit: false,
      },
      bilateral: {
        retainedRows: 410,
        passes: 2,
        reducerRows: 820,
        seamRows: 820,
        reducerSha256: "01f8cdd2bdaaa835bb4b532d33a7ffddcfb514d73afdcb4587dd0303b0b40308",
        seamSha256: "01f8cdd2bdaaa835bb4b532d33a7ffddcfb514d73afdcb4587dd0303b0b40308",
        framebufferCompared: false,
        coverageCredit: false,
      },
    });
  });

  it("keeps the root/subroutine cursor, twelve sine rings, task schedule, latches, and cleanup source-owned", () => {
    const input = psywaveInputsFor("player-back", undefined, 42);
    expect(psywaveSourceAtAge(0)).toEqual({ owner: "Move_PSYWAVE", segment: "root", pointer: 0x082d_3212, pointerOffset: 0, active: true, wait: 0 });
    expect(psywaveSourceAtAge(1)).toMatchObject({ segment: "root", pointerOffset: 3, wait: 1 });
    expect(psywaveSourceAtAge(4)).toMatchObject({ segment: "set-psychic-background", pointer: 0x082d_7cd3, pointerOffset: 2, wait: 1 });
    expect(psywaveSourceAtAge(23)).toMatchObject({ segment: "set-psychic-background", pointerOffset: 10, wait: 1 });
    expect(psywaveSourceAtAge(42)).toMatchObject({ segment: "psywave-rings", pointerOffset: 116, wait: 4 });
    expect(psywaveSourceAtAge(48)).toMatchObject({ segment: "psywave-rings", pointerOffset: 133, wait: 4 });
    expect(psywaveSourceAtAge(114)).toMatchObject({ segment: "root", pointerOffset: 90, wait: 1 });
    expect(psywaveSourceAtAge(162)).toMatchObject({ segment: "root", pointerOffset: 93, wait: 1 });
    expect(psywaveSourceAtAge(165)).toMatchObject({ segment: "unset-psychic-background", pointerOffset: 1, wait: 1 });
    expect(psywaveSourceAtAge(184)).toMatchObject({ segment: "unset-psychic-background", pointerOffset: 6, wait: 1 });
    expect(psywaveSourceAtAge(PSYWAVE_FIRST_INACTIVE_AGE)).toMatchObject({ segment: "root", pointerOffset: 98, active: false, wait: 0 });
    expect(psywaveAtAge(42, input)).toMatchObject({
      animArgs: [10, 10, 0, 16, 9, 0, 10, 3],
      battlers: { attacker: { ringOrigin: { x: 82, y: 108 } } },
      tasks: expect.arrayContaining([
        expect.objectContaining({ callback: "AnimTask_RunSinAnimTimer", data: expect.arrayContaining([99]) }),
        expect.objectContaining({ callback: "SoundTask_LoopSEAdjustPanning_Step", data: expect.arrayContaining([203, -64, 63, 2, 8, 0, 10, 0, 0, 0, 0, -60, 1]) }),
      ]),
      rings: [expect.objectContaining({ slot: 3, matrixNum: 0, x: 82, y: 108, x2: 6, y2: -2, data: [28, 802, 563, 1604, 1126, 1792, 3584, 16] })],
      resources: { loaded: true, tag: PSYWAVE_BLUE_RING_TAG },
      displayTransfer: { oam: "preceding-software", matrices: "preceding-software", palette: "preceding-faded", registers: "current-source" },
    });
    expect(psywaveAtAge(66, psywaveInputsFor("player-back", undefined, 66))).toMatchObject({
      animArgs: [10, 10, 0, 16, 12, 32351, 10, 75],
      tasks: expect.arrayContaining([expect.objectContaining({ callback: "AnimTask_BlendColorCycleLoop", role: "target-palette-cycle" })]),
      rings: expect.arrayContaining([expect.objectContaining({ sourceCreationOrder: 4, data: expect.arrayContaining([28]) })]),
    });
    expect(psywaveAtAge(141, psywaveInputsFor("player-back", undefined, 141))).toMatchObject({
      animArgs: [10, 10, 0, 16, 12, 32351, 10, 44],
      rings: [],
      tasks: expect.not.arrayContaining([expect.objectContaining({ callback: "AnimTask_RunSinAnimTimer" })]),
    });
    expect(psywaveAtAge(PSYWAVE_FIRST_INACTIVE_AGE, psywaveInputsFor("player-back", undefined, PSYWAVE_FIRST_INACTIVE_AGE))).toMatchObject({
      active: false,
      tasks: [],
      rings: [],
      resources: { loaded: false, tileSlot: null, paletteSlot: null, paletteBank: null },
      cleanup: { firstInactive: true, resourcesReleased: true, ownedTasks: 0, ownedRings: 0 },
    });
  });

  it("materially consumes live side/species/geometry/art, allocation/order/palette, audio, and presentation RNG without owning gameplay", () => {
    const age = 72;
    const input = psywaveInputsFor("player-back", undefined, age);
    const gameplayRng = Object.freeze({ opaque: "gameplay-rng", value: 0x0bad_c0de });
    const gameplayState = Object.freeze({ opaque: "gameplay-state", turn: 7 });
    const allocations = input.ringAllocations.map((allocation) => ({
      ...allocation,
      slot: 32 + allocation.sourceCreationOrder,
      matrixNum: (allocation.sourceCreationOrder + 5) & 31,
    }));
    const matrices = Array.from({ length: 32 }, (_, index) => [256 + index * 13, index, -index, 256 + index * 17] as const);
    const baseline = psywaveAtAge(age, input);
    const altered: PsywaveLiveInputs = {
      ...input,
      attackerSide: "opponent",
      targetSide: "player",
      attackerSpecies: "CROBAT",
      targetSpecies: "BLISSEY",
      attackerPictureCenter: { x: 202, y: 46 },
      targetPictureCenter: { x: 37, y: 124 },
      attackerAnimationCenter: { x: 202, y: 38 },
      targetAnimationCenter: { x: 37, y: 116 },
      attackerArt: { slot: 21, attr: [38, 0xc0a9, 0x6d23], subpriority: 55, matrixNum: 6, matrix: matrices[6]! },
      targetArt: { slot: 22, attr: [116, 0xc007, 0xd123], subpriority: 14, matrixNum: 7, matrix: matrices[7]! },
      taskSlots: { fadeToPsychic: 8, psychicBackground: 9, sinTimer: 10, loopSound: 11, paletteCycle: 12, restoreBattle: 13 },
      ringAllocations: allocations,
      ringOam: baseline.rings.map((ring, index) => ({ slot: allocations[ring.sourceCreationOrder]!.slot, attr: [index + 1, 0xc000 | index, 0x4300 | index] as const, subpriority: 40 + index })),
      spriteOrder: Array.from({ length: 64 }, (_, index) => 63 - index),
      buffers: {
        softwareOam: Array.from({ length: 128 }, (_, index) => ({ index, source: "altered-software" })),
        hardwareOam: Array.from({ length: 128 }, (_, index) => ({ index, source: "altered-hardware" })),
        softwareMatrices: matrices,
        hardwareMatrices: matrices.slice().reverse(),
      },
      palette: {
        unfaded: Array.from({ length: 512 }, (_, index) => (index * 17) & 0x7fff),
        faded: Array.from({ length: 512 }, (_, index) => (index * 29) & 0x7fff),
        hardware: Array.from({ length: 512 }, (_, index) => (index * 47) & 0x7fff),
      },
      targetPaletteBank: 29,
      registers: { callerOwnedRegister: 0x2468, bldcnt: 0x3f40, bldalpha: 0x080c },
      background: { currentVram: { id: "altered-psychic" }, battleVram: { id: "altered-battle" }, psychicVram: { id: "altered-psychic-reference" } },
      resources: { tag: PSYWAVE_BLUE_RING_TAG, tileSlot: 91, paletteSlot: 14, paletteBank: 30, tileRange: [620, 64], allocator: { allocation: "altered-ui-history" } },
      sharedTaskData: { fadeToPsychic: Array.from({ length: 16 }, (_, index) => index + 1), paletteCycle: Array.from({ length: 16 }, (_, index) => index + 17), restoreBattle: Array.from({ length: 16 }, (_, index) => index + 33) },
      audio: { current: { output: "altered-audio" }, attackerPan: 61, targetPan: -61 },
      liveCounts: { visualTasks: 7, soundTasks: 2, matrixBitmap: 0x1f },
      animationRng: 0x1234_5678,
      gameplayRng,
      gameplayState,
    };
    const source = psywaveAtAge(age, altered);
    expect(source).not.toEqual(baseline);
    expect(source).toMatchObject({
      battlers: {
        attacker: { side: "opponent", species: "CROBAT", animationCenter: { x: 202, y: 38 }, pictureCenter: { x: 202, y: 46 }, ringOrigin: { x: 192, y: 56 }, art: { slot: 21, matrixNum: 6 } },
        target: { side: "player", species: "BLISSEY", animationCenter: { x: 37, y: 116 }, pictureCenter: { x: 37, y: 124 }, art: { slot: 22, matrixNum: 7 } },
      },
      tasks: expect.arrayContaining([
        expect.objectContaining({ slot: 10, callback: "AnimTask_RunSinAnimTimer" }),
        expect.objectContaining({ slot: 11, callback: "SoundTask_LoopSEAdjustPanning_Step", data: expect.arrayContaining([203, 61, -61, -2]) }),
        expect.objectContaining({ slot: 12, callback: "AnimTask_BlendColorCycleLoop", data: altered.sharedTaskData.paletteCycle }),
      ]),
      rings: expect.arrayContaining([expect.objectContaining({ slot: 37, matrixNum: 10, matrix: matrices[10], x: 192, y: 56 })]),
      paletteBanks: { target: 29, blueRing: 30 },
      resources: { loaded: true, tileSlot: 91, paletteSlot: 14, paletteBank: 30, matrixBitmap: 0x1f, allocator: { allocation: "altered-ui-history" } },
      painterOrder: altered.spriteOrder,
      buffers: altered.buffers,
      palette: altered.palette,
      registers: altered.registers,
      background: { vram: { id: "altered-psychic" } },
      audio: { live: { output: "altered-audio" } },
      rng: { animation: 0x1234_5678, gameplay: gameplayRng, gameplayUnchanged: true },
      gameplay: gameplayState,
    });
    expect(source.painterOrder).not.toEqual(baseline.painterOrder);
    expect(source.palette).not.toEqual(baseline.palette);
    expect(gameplayRng).toEqual({ opaque: "gameplay-rng", value: 0x0bad_c0de });
    expect(gameplayState).toEqual({ opaque: "gameplay-state", turn: 7 });

    const config = psywaveConfigFor("player-back", undefined, age);
    const {
      attackerSide: _attackerSide,
      targetSide: _targetSide,
      attackerSpecies: _attackerSpecies,
      targetSpecies: _targetSpecies,
      attackerPictureCenter: _attackerPictureCenter,
      targetPictureCenter: _targetPictureCenter,
      attackerAnimationCenter: _attackerAnimationCenter,
      targetAnimationCenter: _targetAnimationCenter,
      ...animationInputs
    } = altered;
    const seam = sceneOnPsywaveView({
      age,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "CROBAT" as never, geometry: { ...config.attacker.geometry, side: "opponent", spriteCorner: { x: 170, y: 6 }, animationCenter: altered.attackerAnimationCenter, battlePositionCenter: altered.attackerPictureCenter } },
        target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", spriteCorner: { x: 8, y: 84 }, animationCenter: altered.targetAnimationCenter, battlePositionCenter: altered.targetPictureCenter } },
        animationInputs,
      },
    } as SceneOnPsywavePresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(source);
    expect(attacker.geometry.side).toBe("opponent");
    expect(target.geometry.side).toBe("player");
    const alteredControlDigest = createHash("sha256")
      .update(JSON.stringify({ reducer: source, seam: seamState, gameplayRng, gameplayState }))
      .digest("hex");
    expect(alteredControlDigest).toBe("031045c09740da93f41393616ff4ae5310c1132562ae362f61338a7677cc2787");
  });

  it("keeps retained evidence out of production and preserves Psywave as unsupported/no-credit", () => {
    const source = readFileSync(resolve(root, "src/animation/psywave.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party|reference)[^"']*["']/u);
    expect(source).not.toMatch(/absolute\s*(?:battle\s*)?(?:tick|frame)|framebuffer|controller-frame/iu);
    const data = coverage as Json;
    expect(data.entries.some((entry: Json) => entry.move === "MOVE_PSYWAVE")).toBe(false);
    const loopPanningTrack = data.componentTracks.find((entry: Json) => entry.id === "loop-se-adjust-panning");
    expect(loopPanningTrack).not.toHaveProperty("fulfilled");
    expect(loopPanningTrack.goal).toContain("PSYWAVE needs");
  });
});
