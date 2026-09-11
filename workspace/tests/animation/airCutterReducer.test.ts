import { describe, expect, it } from "vitest";
import {
  AIR_CUTTER_FIRST_INACTIVE_AGE,
  airCutterAtAge,
  type AirCutterLiveInputs,
} from "../../src/animation/airCutter.ts";
import {
  sceneOnAirCutterView,
  type SceneOnAirCutterPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import { verifyAirCutterReducer } from "../../tools/compare/verifyAirCutterReducer.ts";

const live = (overrides: Partial<AirCutterLiveInputs> = {}): AirCutterLiveInputs => ({
  attackerSide: "player", targetSide: "opponent", attackerSpecies: "GOLBAT", targetSpecies: "CHANSEY",
  attackerCenter: { x: 72, y: 80 }, targetCenter: { x: 176, y: 40 },
  attackerSprite: { slot: 6, subpriority: 30, matrixNum: 1, matrix: [256, 0, 0, 256] },
  targetSprite: { slot: 8, subpriority: 40, matrixNum: 2, matrix: [256, 0, 0, 256] },
  waveSpriteSlots: [3, 4, 5], sliceSpriteSlot: 3,
  taskSlots: { projectile: 0, targetShake: 0, partnerShake: 2, updateMonBg: 1, clearMonBg: 0 },
  resources: {
    airWave: { paletteBank: 7, tileSlot: 6, tileRange: [305, 8] },
    cut: { paletteBank: 8, tileSlot: 7, tileRange: [313, 64] },
    impact: { paletteBank: 9, tileSlot: 12, tileRange: [453, 16] },
  },
  matrixBitmap: 6, spriteOrder: [62, 60, 0, 63, 1, 61, 6, 8, 2, 3, 4, 5],
  monbg: { layer: "bg1", center: { x: 176, y: 49 }, bgX: -144, bgY: -17 },
  ...overrides,
});

describe("MOVE_AIR_CUTTER source-relative reducer and typed seam", () => {
  it("replays all 224 retained component rows twice through reducer and seam", () => {
    const first = verifyAirCutterReducer();
    expect(verifyAirCutterReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": expect.objectContaining({ reducerRows: 224, seamRows: 224, retainedRows: 112, framebufferCompared: false, coverageCredit: false }),
      "opponent-front": expect.objectContaining({ reducerRows: 224, seamRows: 224, retainedRows: 112, framebufferCompared: false, coverageCredit: false }),
      bilateral: { retainedRows: 224, passes: 2, reducerRows: 448, seamRows: 448, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("ports task-wave births, source callback phases, slice, ShakeMon2, and cleanup", () => {
    expect(airCutterAtAge(17, live())).toMatchObject({
      source: { pointerOffset: 35, active: true },
      sprites: [{ kind: "air-wave", slot: 3, x: 72, y: 80, x2: 0, y2: 0, callback: "AnimAirWaveProjectile" }],
      tasks: expect.arrayContaining([expect.objectContaining({ callback: "AirCutterProjectileStep1" })]),
      audio: [{ sound: "SE_M_BLIZZARD2", pan: -63 }],
    });
    expect(airCutterAtAge(23, live()).sprites.filter((sprite) => sprite.kind === "air-wave")).toHaveLength(3);
    expect(airCutterAtAge(76, live()).sprites).toEqual([
      expect.objectContaining({ kind: "air-cutter-slice", slot: 3, x: 216, y: 8, x2: -4, y2: 4 }),
    ]);
    expect([83, 84, 85, 86, 95, 96, 97].map((age) => airCutterAtAge(age, live()).battlers.target.offset.x))
      .toEqual([-2, -2, 2, 2, -2, -2, 0]);
    expect(airCutterAtAge(AIR_CUTTER_FIRST_INACTIVE_AGE, live())).toMatchObject({
      active: false,
      sprites: [], tasks: [], cleanup: { firstInactive: true, visualTasks: 0, ownedSprites: 0, resourcesReleased: true },
    });
  });

  it("is deterministic and materially consumes live species, geometry, allocator, matrix, task, resource, and painter controls", () => {
    const first = airCutterAtAge(76, live());
    expect(airCutterAtAge(76, live())).toEqual(first);
    const altered = airCutterAtAge(76, live({
      attackerSpecies: "CROBAT", targetSpecies: "BLISSEY",
      attackerCenter: { x: 36, y: 98 }, targetCenter: { x: 202, y: 34 },
      attackerSprite: { slot: 11, subpriority: 55, matrixNum: 6, matrix: [220, 24, -24, 220] },
      targetSprite: { slot: 13, subpriority: 47, matrixNum: 7, matrix: [240, 0, 0, 240] },
      waveSpriteSlots: [14, 15, 16], sliceSpriteSlot: 17,
      taskSlots: { projectile: 4, targetShake: 5, partnerShake: 6, updateMonBg: 7, clearMonBg: 8 },
      resources: {
        airWave: { paletteBank: 10, tileSlot: 21, tileRange: [601, 8] },
        cut: { paletteBank: 11, tileSlot: 22, tileRange: [609, 64] },
        impact: { paletteBank: 12, tileSlot: 23, tileRange: [673, 16] },
      },
      matrixBitmap: 0x95, spriteOrder: [17, 11, 13, 14, 15, 16],
      monbg: { layer: "bg2", center: { x: 202, y: 45 }, bgX: -40, bgY: -59 },
    }));
    expect(altered).not.toEqual(first);
    expect(altered).toMatchObject({
      battlers: { attacker: { species: "CROBAT", slot: 11, matrixNum: 6 }, target: { species: "BLISSEY", slot: 13, matrixNum: 7 } },
      sprites: [expect.objectContaining({ kind: "air-cutter-slice", slot: 17, x: 242, y: 2, subpriority: 53 })],
      resources: { airWave: { paletteBank: 10, tileSlot: 21 }, allocator: { matrixBitmap: 0x95, matrixSlots: [6, 7, 0] } },
      painterOrder: [17],
    });
  });

  it("routes the same live facts through the narrow semantic Scene-ON seam", () => {
    const input = live();
    const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerCenter, targetCenter, ...animationInputs } = input;
    const state = {
      age: 76,
      config: {
        move: "AIR_CUTTER",
        attacker: { species: attackerSpecies, geometry: { side: attackerSide, spriteCorner: attackerCenter, animationCenter: attackerCenter, battlePositionCenter: attackerCenter } },
        target: { species: targetSpecies, geometry: { side: targetSide, spriteCorner: targetCenter, animationCenter: targetCenter, battlePositionCenter: targetCenter } },
        fieldProfile: { kind: "default" },
        animationInputs,
      },
    } as unknown as SceneOnAirCutterPresentationState;
    expect(sceneOnAirCutterView(state)).toMatchObject({
      attacker: { species: "GOLBAT" }, target: { species: "CHANSEY" },
      sprites: [{ kind: "air-cutter-slice", x: 216, y: 8 }],
    });
  });
});
