import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  PSYCH_UP_FIRST_INACTIVE_AGE,
  psychUpAtAge,
  psychUpSourceAtAge,
  type PsychUpLiveInputs,
} from "../../src/animation/psychUp.ts";
import {
  psychUpConfigFor,
  psychUpInputsFor,
  verifyPsychUpReducer,
} from "../../tools/compare/verifyPsychUpReducer.ts";
import {
  sceneOnPsychUpView,
  type SceneOnPsychUpPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_PSYCH_UP source-relative reducer and narrow Scene-ON seam", () => {
  it("replays every retained bilateral semantic row twice through reducer and typed seam", () => {
    const first = verifyPsychUpReducer();
    expect(verifyPsychUpReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 179, reducerRows: 358, seamRows: 358, cleanup: 178, framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 179, reducerRows: 358, seamRows: 358, cleanup: 178, framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 358, passes: 2, reducerRows: 716, seamRows: 716, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("keeps the complete root, task bodies, latches, RNG split, and cleanup source-relative", () => {
    const player = psychUpInputsFor("player-back");
    expect(psychUpSourceAtAge(0)).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(psychUpSourceAtAge(1)).toMatchObject({ pointerOffset: 3, wait: 1 });
    expect(psychUpSourceAtAge(4)).toMatchObject({ pointerOffset: 5, wait: 1 });
    expect(psychUpSourceAtAge(7)).toMatchObject({ pointerOffset: 67, wait: 127 });
    expect(psychUpSourceAtAge(136)).toMatchObject({ pointerOffset: 69, wait: 4 });
    expect(psychUpSourceAtAge(142)).toMatchObject({ pointerOffset: 109, wait: 30 });
    expect(psychUpSourceAtAge(174)).toMatchObject({ pointerOffset: 113, wait: 1 });
    expect(psychUpSourceAtAge(PSYCH_UP_FIRST_INACTIVE_AGE)).toMatchObject({ pointerOffset: 113, active: false });
    expect(psychUpAtAge(7, player)).toMatchObject({
      animArgs: [0, 5, 2560, 8, 0, 0, 0, 0],
      spiral: { template: "gPsychUpSpiralSpriteTemplate", callback: "AnimSpriteOnMonPos", affine: "gSpriteAffineAnimTable_PsychUpSpiral", cell: 0 },
      displayTransfer: { oam: "preceding-software", matrices: "preceding-software", palette: "preceding-faded", selectedBgScroll: "preceding-software" },
      resources: { spiral: { loaded: true }, allocator: { spiralMatrixAllocated: true } },
      audio: { looping: { sound: "SE_M_PSYBEAM2", pan: -64, interval: 5, requestedPlays: 10 } },
    });
    expect(psychUpAtAge(4, player).displayTransfer.palette).toBe("same-row-monbg-setup");
    expect(psychUpAtAge(143, player).displayTransfer.matrices).toBe("scale-start-hold");
    expect(psychUpAtAge(144, player)).toMatchObject({
      animArgs: [2, 2, 10, 0, 1023, 0, 0, 0],
      displayTransfer: { matrices: "two-source-rows-scale" },
      battlers: { attacker: { sprite: { matrix: [241, 0, 0, 241] } } },
      audio: { oneShot: null },
    });
    expect(psychUpAtAge(142, player).audio.oneShot).toEqual({ sound: "SE_M_PSYBEAM", pan: -64 });
    expect(psychUpAtAge(175, player).rng.sourceDraws).toBe(175);
    expect(psychUpAtAge(176, player).rng.sourceDraws).toBe(175);
    expect(psychUpAtAge(178, player).rng.sourceDraws).toBe(176);
    expect(psychUpAtAge(178, player)).toMatchObject({ active: false, tasks: [], spiral: null, resources: { spiral: { loaded: false }, allocator: { matrixBitmap: 6 } }, cleanup: { firstInactive: true, visualTasks: 0, soundTasks: 0, resourcesReleased: true } });
  });

  it("takes material live identity, side, geometry, allocation, matrix, painter, resource, and RNG controls through the seam", () => {
    const input = psychUpInputsFor("player-back");
    const altered: PsychUpLiveInputs = {
      ...input,
      attackerSide: "opponent", targetSide: "player", attackerSpecies: "CROBAT", targetSpecies: "BLISSEY",
      attackerPictureOrigin: { x: 201, y: 43 }, targetPictureOrigin: { x: 39, y: 117 },
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 43, subpriority: 55, oamPriority: 3, matrixNum: 6, matrix: [192, 16, -16, 192], attr: [43, 0xc0a9, 0x6d23] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 117, subpriority: 14, oamPriority: 1, matrixNum: 7, matrix: [224, 0, 0, 224], attr: [117, 0xc007, 0x4123] },
      taskSlots: { blendCycle: 4, updateMonBg: 5, loopSound: 6, sway: 7, scale: 6, attackerPalette: 7, clearMonBg: 4 },
      spiral: { slot: 30, matrixSlot: 5, subpriority: 53, attr2: 0x6d23, painterInsertionIndex: 20 }, scaleMatrixSlot: 6,
      spriteOrder: input.spriteOrder.slice().reverse(), matrixBitmap: 0xd5,
      matrixSlots: input.matrixSlots.map((matrix, index) => index === 5 ? [192, 16, -16, 192] : index === 6 ? [224, 0, 0, 224] : matrix),
      resource: { tag: 50196, tileSlot: 31, paletteBank: 11, tileRange: [620, 64] },
      monBg: { layer: "bg1", battlerId: 1, copyPaletteBank: 8, baseScroll: { x: -144, y: -6 }, initialBgCnt: 0x1c00, monBgCnt: 0x5c02, initialHardwareScroll: { x: 0, y: 3 } },
      palettes: { ...input.palettes, attackerBank: 17, attackerPaletteSelectorHigh: 2, resourcePalette: input.palettes.resourcePalette.slice().reverse() },
      registers: { bldcnt: 0x5a, bldalpha: 0x44, bldy: 0x22 }, animationRngSeed: 0x12345678, gameplayRng: { opaque: "gameplay-owned" },
    };
    const baseline = psychUpAtAge(142, input), source = psychUpAtAge(142, altered);
    expect(source).toMatchObject({
      battlers: { attacker: { side: "opponent", species: "CROBAT", sprite: { slot: 21, matrixNum: 6 } }, target: { side: "player", species: "BLISSEY", sprite: { slot: 22 } } },
      spiral: null,
      background: { layer: "bg1", softwareScroll: { x: -144, y: -6 } },
      resources: { spiral: { tag: 50196, allocation: { paletteBank: 11, tileSlot: 31 } }, allocator: { matrixBitmap: 0xd5, scaleMatrixAllocated: true } },
      rng: { gameplay: { opaque: "gameplay-owned" }, gameplayUnchanged: true },
    });
    expect(source).not.toEqual(baseline);
    expect(psychUpAtAge(7, altered).spiral).toMatchObject({ slot: 30, x: 201, y: 43, matrixNum: 5, subpriority: 53 });
    expect(psychUpAtAge(7, altered).painterOrder).not.toEqual(psychUpAtAge(7, input).painterOrder);
    const config = psychUpConfigFor("player-back");
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, ...animationInputs } = altered;
    const seam = sceneOnPsychUpView({ age: 142, config: {
      ...config,
      attacker: { ...config.attacker, species: "CROBAT" as never, geometry: { ...config.attacker.geometry, side: "opponent", animationCenter: altered.attackerPictureOrigin, battlePositionCenter: { x: 201, y: 43 } } },
      target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", animationCenter: altered.targetPictureOrigin, battlePositionCenter: { x: 39, y: 117 } } },
      animationInputs,
    } } as SceneOnPsychUpPresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(source);
    expect(attacker.geometry.animationCenter).toEqual({ x: 201, y: 43 });
    expect(target.geometry.animationCenter).toEqual({ x: 39, y: 117 });
  });

  it("keeps the reducer evidence-free and grants no sibling transfer credit", () => {
    const source = readFileSync(resolve(root, "src/animation/psychUp.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    const data = coverage as Json;
    expect(data.entries).toHaveLength(254);
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_PSYCH_UP")).toMatchObject({ status: "exact" });
    expect(data.queue).toEqual([]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "psych-up-spiral-palette-cycle")).toMatchObject({ representatives: ["MOVE_PSYCH_UP"], fulfilled: true, goal: expect.stringContaining("MOVE_PSYCH_UP alone") });
  });
});
