import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { verifyPetalDanceReducer } from "../../tools/compare/verifyPetalDanceReducer.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPetalDanceView,
  type SceneOnPetalDanceConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const order = Array.from({ length: 64 }, (_, index) => index);
const flowerSteps = [
  { x: 0, y: 90 }, { x: 0, y: 80 }, { x: 0, y: 80 },
  { x: 0, y: 90 }, { x: 0, y: 80 }, { x: 0, y: 80 },
  { x: 0, y: 90 }, { x: 0, y: 80 }, { x: 0, y: 80 },
  { x: 0, y: 60 }, { x: 0, y: 60 }, { x: 0, y: 96 }, { x: 0, y: 96 },
] as const;

function petalDanceConfig(): SceneOnPetalDanceConfig {
  return {
    move: "PETAL_DANCE",
    attacker: { species: "GLOOM", geometry: { side: "player",
      spriteCorner: { x: 40, y: 58 }, animationCenter: { x: 72, y: 90 },
      battlePositionCenter: { x: 72, y: 80 } } },
    target: { species: "ONIX", geometry: { side: "opponent",
      spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 },
      battlePositionCenter: { x: 176, y: 42 } } },
    fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100,
      opponentMaxHp: 100, playerGender: "female", opponentGender: "male" },
    animationInputs: {
      attackerPictureOrigin: { x: 72, y: 98 }, flowerFixedPointSteps: flowerSteps,
      flowerSpriteSlots: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      flowerMatrixNum: 0, attackerSpriteSlot: 6, targetSpriteSlot: 8,
      attackerInitialOffset: { x: 0, y: 0 }, targetInitialOffset: { x: 1, y: 0 },
      attackerSubpriority: 30, ellipseTaskSlot: 0, shakeTaskSlot: 0,
      updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0,
      offsetSlideSpriteSlot: 3, originalSlideSpriteSlot: 3, hitSplatSpriteSlot: 4,
      hitSplatMatrixSlot: 0, dummySpriteOrigin: { x: 176, y: 42 },
      slideSubpriority: 28, hitSplatSubpriority: 27, baseMatrixBitmap: 6,
      spriteOrder: order,
      monbg: { layer: "bg1", spriteSlot: 8, spriteX: 177, spriteY: 42,
        bgX: -145, bgY: -10, inBg2: false, battlerId: 1 },
    },
  };
}

describe("MOVE_PETAL_DANCE source-age reducer and typed Scene-ON seam", () => {
  it("replays all retained bilateral component rows twice through first cleanup", () => {
    const expected = {
      "player-back": {
        reducerRows: 244, seamRows: 244,
        lifecycle: { bigFlowers: 3, smallFlowers: 10, ellipse: "10..199",
          shake: "206..219", slideOffset: "201..206", hitSplat: "206..214",
          slideOriginal: "231..237", monbg: "7..241", clearMonbg: "239..241" },
        latches: { oam: "243/243 predecessor", matrices: "243/243 predecessor",
          palette: "242/243 predecessor; age 7 same-row monbg" },
        cleanup: { age: 243, active: false, framebufferCompared: false },
      },
      "opponent-front": {
        reducerRows: 244, seamRows: 244,
        lifecycle: { bigFlowers: 3, smallFlowers: 10, ellipse: "10..199",
          shake: "206..219", slideOffset: "201..206", hitSplat: "206..214",
          slideOriginal: "231..237", monbg: "7..241", clearMonbg: "239..241" },
        latches: { oam: "243/243 predecessor", matrices: "243/243 predecessor",
          palette: "242/243 predecessor; age 7 same-row monbg" },
        cleanup: { age: 243, active: false, framebufferCompared: false },
      },
    };
    expect(verifyPetalDanceReducer()).toEqual(expected);
    expect(verifyPetalDanceReducer()).toEqual(expected);
  });

  it("consumes live species, geometry, allocation, matrix, and painter order without a compositor", () => {
    const canonical = petalDanceConfig();
    const changed: SceneOnPetalDanceConfig = {
      ...canonical,
      attacker: { species: "IVYSAUR", geometry: { side: "player",
        spriteCorner: { x: 52, y: 54 }, animationCenter: { x: 84, y: 86 },
        battlePositionCenter: { x: 84, y: 76 } } },
      target: { species: "RELICANTH", geometry: { side: "opponent",
        spriteCorner: { x: 116, y: 22 }, animationCenter: { x: 148, y: 54 },
        battlePositionCenter: { x: 148, y: 54 } } },
      animationInputs: {
        ...canonical.animationInputs,
        attackerPictureOrigin: { x: 84, y: 94 },
        flowerSpriteSlots: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
        flowerMatrixNum: 4, attackerSpriteSlot: 2, targetSpriteSlot: 18,
        attackerInitialOffset: { x: 2, y: 1 }, targetInitialOffset: { x: 3, y: 0 },
        attackerSubpriority: 34, ellipseTaskSlot: 4, shakeTaskSlot: 3,
        updateMonBgTaskSlot: 5, clearMonBgTaskSlot: 2,
        offsetSlideSpriteSlot: 32, originalSlideSpriteSlot: 32, hitSplatSpriteSlot: 33,
        hitSplatMatrixSlot: 4, dummySpriteOrigin: { x: 148, y: 54 },
        slideSubpriority: 24, hitSplatSubpriority: 23, baseMatrixBitmap: 2,
        spriteOrder: [...order].reverse(),
        monbg: { layer: "bg1", spriteSlot: 18, spriteX: 148, spriteY: 54,
          bgX: -96, bgY: -24, inBg2: false, battlerId: 1 },
      },
    };
    const baseline = createSceneOnMovePresentation(canonical);
    const altered = createSceneOnMovePresentation(changed);
    const baselineFlowers = sceneOnPetalDanceView({ ...baseline, age: 10 });
    const alteredFlowers = sceneOnPetalDanceView({ ...altered, age: 10 });
    const baselineHit = sceneOnPetalDanceView({ ...baseline, age: 206 });
    const alteredHit = sceneOnPetalDanceView({ ...altered, age: 206 });
    expect(alteredFlowers.battlers).not.toEqual(baselineFlowers.battlers);
    expect(alteredFlowers.sprites).not.toEqual(baselineFlowers.sprites);
    expect(alteredFlowers.painterSlots).not.toEqual(baselineFlowers.painterSlots);
    expect(alteredFlowers.tasks).not.toEqual(baselineFlowers.tasks);
    expect(alteredHit.resources.matrixBitmap).not.toBe(baselineHit.resources.matrixBitmap);
    expect(alteredHit.battlerOffsets).not.toEqual(baselineHit.battlerOffsets);
    expect(sceneOnPetalDanceView({ ...baseline, age: 243 })).toMatchObject({
      active: false, firstInactiveCleanup: true, sprites: [], tasks: [],
      resources: { flowerLoaded: false, impactLoaded: false },
    });
    expect(baselineFlowers).not.toHaveProperty("framebuffer");
  });

  it("retains the reducer checkpoint after Petal Dance's independent promotion", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_PETAL_DANCE")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual(["MOVE_DESTINY_BOND"]);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(244);
  });
});
