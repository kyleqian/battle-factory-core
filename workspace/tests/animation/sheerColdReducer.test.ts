import { describe, expect, it } from "vitest";
import {
  SHEER_COLD_FIRST_INACTIVE_AGE_BY_TARGET,
  sheerColdAtAge,
  sheerColdSourceAtAge,
  type SheerColdLiveInputs,
} from "../../src/animation/sheerCold.ts";
import {
  sceneOnSheerColdView,
  type SceneOnSheerColdPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import { verifySheerColdReducer } from "../../tools/compare/verifySheerColdReducer.ts";

const live = (overrides: Partial<SheerColdLiveInputs> = {}): SheerColdLiveInputs => ({
  attackerSide: "player", targetSide: "opponent", attackerSpecies: "DEWGONG", targetSpecies: "CHANSEY",
  targetAnimationCenter: { x: 176, y: 49 }, targetBattlePositionCenter: { x: 176, y: 49 },
  attackerSprite: { slot: 6, subpriority: 30, matrixNum: 1, matrix: [256, 0, 0, 256] },
  targetSprite: { slot: 8, subpriority: 40, matrixNum: 2, matrix: [256, 0, 0, 256] },
  cubeSpriteSlot: 3,
  taskSlots: { fadeToBg: 0, cube: 1, updateMonBg: 2, sound: 3, clearMonBg: 4, restoreBg: 5 },
  resources: { iceCube: { paletteBank: 7, tileSlot: 6, tileRange: [305, 9] } },
  matrixBitmap: 6,
  spriteOrder: [62, 60, 0, 63, 1, 61, 6, 8, 2, 4, 3, 21],
  painterSprites: [
    { slot: 0, subpriority: 1, oamPriority: 0, y: 88 },
    { slot: 1, subpriority: 1, oamPriority: 0, y: 30 },
    { slot: 2, subpriority: 200, oamPriority: 3, y: 69 },
    { slot: 6, subpriority: 30, oamPriority: 2, y: 85 },
    { slot: 8, subpriority: 40, oamPriority: 2, y: 49 },
    { slot: 60, subpriority: 0, oamPriority: 0, y: 30 },
    { slot: 61, subpriority: 1, oamPriority: 0, y: 30 },
    { slot: 62, subpriority: 0, oamPriority: 0, y: 88 },
    { slot: 63, subpriority: 1, oamPriority: 0, y: 88 },
  ],
  monbg: { layer: "bg1", scroll: { x: -144, y: -17 } },
  background: { bg1Cnt: 39936, bg2Cnt: 24064 },
  animationRng: 0x12345678, gameplayRng: 0x87654321,
  ...overrides,
});

describe("MOVE_SHEER_COLD source-relative reducer and typed Scene-ON seam", () => {
  it("replays every retained player-back and opponent-front row twice", () => {
    const first = verifySheerColdReducer();
    expect(verifySheerColdReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": expect.objectContaining({ retainedRows: 192, reducerRows: 384, seamRows: 384, framebufferCompared: false, coverageCredit: false }),
      "opponent-front": expect.objectContaining({ retainedRows: 191, reducerRows: 382, seamRows: 382, framebufferCompared: false, coverageCredit: false }),
      bilateral: { retainedRows: 383, passes: 2, reducerRows: 766, seamRows: 766, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("ports the source cursor, alpha ramp, palette rotations, tasks, cube pieces, and first inactive cleanup", () => {
    const input = live();
    expect(sheerColdSourceAtAge(0, input)).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(sheerColdSourceAtAge(45, input)).toMatchObject({ pointerOffset: 30, wait: 1 });
    expect(sheerColdAtAge(45, input)).toMatchObject({
      registers: { bldalpha: 4096 },
      sprites: [{ slot: 3, x: 144, y: 13 }],
      subsprites: { software: expect.arrayContaining([expect.objectContaining({ width: 32, tileOffset: 0 })]) },
      tasks: expect.arrayContaining([expect.objectContaining({ callback: "AnimTask_FrozenIceCube_Step1", slot: 1 })]),
    });
    expect(sheerColdAtAge(62, input).audio).toEqual([{ age: 62, sound: "SE_M_HAIL", pan: 63 }]);
    expect(sheerColdAtAge(54, input).registers.bldalpha).toBe(1801);
    expect(sheerColdAtAge(100, input).palette.cubeRotation).toBe(6);
    expect(sheerColdAtAge(148, input)).toMatchObject({
      tasks: expect.arrayContaining([expect.objectContaining({ callback: "AnimTask_FrozenIceCube_Step4" })]),
      subsprites: { hardware: expect.arrayContaining([expect.objectContaining({ tileOffset: 128 })]) },
    });
    const inactive = sheerColdAtAge(SHEER_COLD_FIRST_INACTIVE_AGE_BY_TARGET.opponent, input);
    expect(inactive).toMatchObject({ active: false, sprites: [], tasks: [], cleanup: { firstInactive: true, visualTasks: 0, soundTasks: 0, ownedSprites: 0, resourcesReleased: true } });
  });

  it("materially follows live species, sides, geometry, allocation, matrix, task, sprite, and painter controls", () => {
    const canonical = sheerColdAtAge(45, live());
    const altered = sheerColdAtAge(45, live({
      attackerSide: "opponent", targetSide: "player", attackerSpecies: "CROBAT", targetSpecies: "BLISSEY",
      targetAnimationCenter: { x: 202, y: 45 }, targetBattlePositionCenter: { x: 202, y: 34 },
      attackerSprite: { slot: 11, subpriority: 55, matrixNum: 6, matrix: [220, 24, -24, 220] },
      targetSprite: { slot: 13, subpriority: 47, matrixNum: 7, matrix: [240, 0, 0, 240] },
      cubeSpriteSlot: 17,
      taskSlots: { fadeToBg: 8, cube: 9, updateMonBg: 10, sound: 11, clearMonBg: 12, restoreBg: 13 },
      resources: { iceCube: { paletteBank: 10, tileSlot: 21, tileRange: [601, 9] } },
      matrixBitmap: 0x95,
      spriteOrder: [17, 11, 13, 14, 15, 16],
      monbg: { layer: "bg2", scroll: { x: -40, y: -59 } },
    }));
    expect(altered).not.toEqual(canonical);
    expect(altered).toMatchObject({
      battlers: { attacker: { side: "opponent", species: "CROBAT", sprite: { slot: 11, matrixNum: 6 } }, target: { side: "player", species: "BLISSEY", sprite: { slot: 13, matrixNum: 7 } } },
      sprites: [expect.objectContaining({ slot: 17, x: 170, y: 9 })],
      tasks: expect.arrayContaining([expect.objectContaining({ slot: 9 }), expect.objectContaining({ slot: 11 })]),
      resources: { iceCube: { paletteBank: 10, tileSlot: 21 }, allocator: { matrixBitmap: 0x95 } },
      painterOrder: [17, 11, 13, 14, 15, 16],
    });
  });

  it("routes the same live facts through the narrow typed Scene-ON seam", () => {
    const input = live();
    const { attackerSide, targetSide, attackerSpecies, targetSpecies, targetAnimationCenter, targetBattlePositionCenter, ...animationInputs } = input;
    const state = {
      age: 54,
      config: {
        move: "SHEER_COLD",
        attacker: { species: attackerSpecies, geometry: { side: attackerSide, spriteCorner: { x: 40, y: 53 }, animationCenter: { x: 72, y: 85 }, battlePositionCenter: { x: 72, y: 85 } } },
        target: { species: targetSpecies, geometry: { side: targetSide, spriteCorner: { x: 144, y: 13 }, animationCenter: targetAnimationCenter, battlePositionCenter: targetBattlePositionCenter } },
        fieldProfile: { kind: "default" }, animationInputs,
      },
    } as unknown as SceneOnSheerColdPresentationState;
    expect(sceneOnSheerColdView(state)).toMatchObject({
      attacker: { species: "DEWGONG" }, target: { species: "CHANSEY" },
      sprites: [{ kind: "frozen-ice-cube", slot: 3, x: 144, y: 13 }],
      registers: { bldalpha: 1801 },
    });
  });
});
