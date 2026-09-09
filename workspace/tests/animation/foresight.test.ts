import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnForesightView,
  type SceneOnForesightConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const input = {
  targetBounds: { left: 148, right: 204, top: 10, bottom: 73, rightTop: 11 },
  targetPictureOffset: { x: 176, y: 42 },
  targetSpriteSlot: 8, glassSpriteSlot: 3, blendTaskSlot: 0,
  updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0, spriteOrder: Array.from({ length: 64 }, (_, i) => i),
  glassPaletteBank: 7, glassTileSlot: 6, matrixBitmap: 6,
  monbg: { layer: "bg1" as const, spriteX: 177, spriteY: 42, bgX: -145, bgY: -10, inBg2: false, battlerId: 1 as const },
};

function config(overrides: Partial<typeof input> = {}): SceneOnForesightConfig {
  return {
    move: "FORESIGHT",
    attacker: { species: "MACHOKE", geometry: { side: "player", spriteCorner: { x: 40, y: 58 }, animationCenter: { x: 72, y: 89 }, battlePositionCenter: { x: 72, y: 80 } } },
    target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
    fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100, playerGender: "male", opponentGender: "male" },
    animationInputs: { ...input, ...overrides },
  };
}

describe("MOVE_FORESIGHT source-relative reducer and seam", () => {
  it("keeps the source pointer, callback legs, hardware transfer, and cleanup relative to age", () => {
    const stage = createSceneOnMovePresentation(config());
    const at = (age: number) => sceneOnForesightView({ ...stage, age });
    expect(at(0).source).toMatchObject({ offset: 0, wait: 0 });
    expect(at(7).glass).toMatchObject({ x: 176, y: 42, x2: 0, y2: 0, hFlip: true, visible: true });
    expect(at(19).glass).toMatchObject({ x2: 24, y2: 27 });
    expect(at(20).glass).toMatchObject({ x: 200, y: 69, data: expect.arrayContaining([2, 1]) });
    expect(at(79).glass).toMatchObject({ x: 152, y: 6, data: expect.arrayContaining([24, 4]) });
    expect(at(104).glass).toMatchObject({ x: 200, y: 69, data: expect.arrayContaining([0, 5]) });
    expect(at(144).glass).toMatchObject({ visible: false });
    expect(at(114).blendTask?.data[2]).toBe(0);
    expect(at(137).blendTask?.data[2]).toBe(12);
    expect(at(160).blendTask?.data[2]).toBe(1);
    expect(at(162).clearMonBgTask?.callback).toBe("Task_ClearMonBg");
    expect(at(166)).toMatchObject({ active: false, firstInactiveCleanup: true, resources: { glassLoaded: false } });
  });

  it("uses live target geometry and allocation inputs", () => {
    const stage = createSceneOnMovePresentation(config({
      targetBounds: { left: 130, right: 194, top: 20, bottom: 84, rightTop: 21 },
      targetPictureOffset: { x: 162, y: 53 }, glassSpriteSlot: 9, glassPaletteBank: 12, glassTileSlot: 15,
    }));
    const view = sceneOnForesightView({ ...stage, age: 20 });
    expect(view.glass).toMatchObject({ slot: 9, x: 190, y: 80 });
    expect(view.resources).toMatchObject({ glassPaletteBank: 12, glassTileSlot: 15 });
  });
});
