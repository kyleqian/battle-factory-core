import { describe, expect, it } from "vitest";
import {
  FACADE_BLEND_COEFFICIENT,
  FACADE_BLEND_COLOR_INDEX_COUNT,
  FACADE_BLEND_COLORS,
  FACADE_BLEND_DURATION,
  FACADE_BLEND_LAST_AGE,
  FACADE_DROPLET_BATCH_OFFSETS,
  FACADE_DROPLET_SPAWN_TICKS,
  FACADE_FIRST_TASK_AGE,
  FACADE_SQUISH_LAST_AGE,
  facadeAtAge,
  facadeBlendColorIndexAtAge,
  facadeDropletBatchSpawnAges,
  facadeDropletsAtAge,
  facadeSquishMatrixAtAge,
  facadeSquishSpawnAge,
  facadeSquishY2,
} from "../../src/animation/facade.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFacadeView,
  type SceneOnFacadeConfig,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_FACADE source-relative reducer", () => {
  it("keeps the squish task present ages 4-78 and the blend task ages 4-75 with the restore at 76", () => {
    // Move_FACADE: createvisualtask AnimTask_SquishAndSweatDroplets, 2, ANIM_ATTACKER, 3
    //              createvisualtask AnimTask_FacadeColorBlend, 2, ANIM_ATTACKER, 72
    expect(FACADE_FIRST_TASK_AGE).toBe(4);
    expect(FACADE_SQUISH_LAST_AGE).toBe(78);
    expect(FACADE_BLEND_LAST_AGE).toBe(75);
    expect(FACADE_BLEND_DURATION).toBe(72);
    expect(FACADE_BLEND_COEFFICIENT).toBe(8);
    for (let age = 0; age < 4; age += 1) {
      expect(facadeAtAge(age, { x: 72, y: 80 }, 48).visualTaskCount).toBe(0);
    }
    // Both visual tasks alive 4-75; the blend task's coeff-0 restore + destroy
    // lands on age 76, leaving only the squish task 76-78.
    for (let age = 4; age <= 75; age += 1) {
      expect(facadeAtAge(age, { x: 72, y: 80 }, 48).visualTaskCount).toBe(2);
    }
    for (let age = 76; age <= 78; age += 1) {
      expect(facadeAtAge(age, { x: 72, y: 80 }, 48).visualTaskCount).toBe(1);
    }
    for (let age = 79; age <= 90; age += 1) {
      expect(facadeAtAge(age, { x: 72, y: 80 }, 48).visualTaskCount).toBe(0);
    }
  });

  it("advances the blend color index one per age and wraps 23->0 across the full 72", () => {
    expect(FACADE_BLEND_COLOR_INDEX_COUNT).toBe(24);
    expect(FACADE_BLEND_COLORS).toHaveLength(24);
    expect(facadeBlendColorIndexAtAge(3)).toBeNull();
    expect(facadeBlendColorIndexAtAge(4)).toBe(0);
    expect(facadeBlendColorIndexAtAge(5)).toBe(1);
    expect(facadeBlendColorIndexAtAge(27)).toBe(23);
    expect(facadeBlendColorIndexAtAge(28)).toBe(0); // 23 -> 0 wrap
    expect(facadeBlendColorIndexAtAge(51)).toBe(23);
    expect(facadeBlendColorIndexAtAge(52)).toBe(0);
    expect(facadeBlendColorIndexAtAge(75)).toBe(23);
    expect(facadeBlendColorIndexAtAge(76)).toBeNull(); // coeff-0 restore age
    expect(facadeBlendColorIndexAtAge(78)).toBeNull();
  });

  it("spawns six batches of four droplets at ages 9, 21, 34, 46, 59 and 71", () => {
    expect(facadeDropletBatchSpawnAges()).toEqual([9, 21, 34, 46, 59, 71]);
    for (let squish = 0; squish < 3; squish += 1) {
      expect(facadeSquishSpawnAge(squish as 0 | 1 | 2)).toBe(9 + squish * 25);
      expect(facadeSquishSpawnAge(squish as 0 | 1 | 2) + 12).toBe(
        facadeDropletBatchSpawnAges()[squish * 2 + 1],
      );
    }
    for (const spawnAge of [9, 21, 34, 46, 59, 71]) {
      expect(facadeDropletsAtAge(spawnAge, { x: 72, y: 80 })).toHaveLength(4);
    }
    // No droplets alive between batches (each batch lives exactly 7 ticks).
    expect(facadeDropletsAtAge(8, { x: 72, y: 80 })).toHaveLength(0);
    expect(facadeDropletsAtAge(16, { x: 72, y: 80 })).toHaveLength(0);
  });

  it("places droplets with the source xCoords/yCoords and offsets per tTimer", () => {
    // CreateSweatDroplets(TRUE) at tTimer==6: xOffset 30 / yOffset +20;
    // CreateSweatDroplets(FALSE) at tTimer==18: xOffset 18 / yOffset -20.
    expect(FACADE_DROPLET_SPAWN_TICKS).toEqual([6, 18]);
    expect(FACADE_DROPLET_BATCH_OFFSETS).toEqual([
      { xOffset: 30, yOffset: 20 },
      { xOffset: 18, yOffset: -20 },
    ]);
    const base = { x: 72, y: 80 };
    // Batch 0 spawns at age 9 (lower, +20): xCoords [72-30, 72-34, 72+30, 72+34],
    // yCoords[i&1] = [80+20, 80+26].
    expect(facadeDropletsAtAge(9, base).map((drop) => [drop.index, drop.tick, drop.x, drop.y]))
      .toEqual([
        [0, 0, 42, 100],
        [1, 0, 38, 106],
        [2, 0, 102, 100],
        [3, 0, 106, 106],
      ]);
    // Batch 1 spawns at age 21 (upper, -20): xCoords [72-18, 72-22, 72+18, 72+22].
    expect(facadeDropletsAtAge(21, base).map((drop) => [drop.index, drop.x, drop.y]))
      .toEqual([
        [0, 54, 60],
        [1, 50, 66],
        [2, 90, 60],
        [3, 94, 66],
      ]);
  });

  it("moves droplets with velocX -2 for i<2 else +2 and velocY -1", () => {
    const base = { x: 72, y: 80 };
    // One tick later (age 10) each droplet has moved x by +/-2 and y by -1.
    expect(facadeDropletsAtAge(10, base).map((drop) => [drop.index, drop.tick, drop.x, drop.y]))
      .toEqual([
        [0, 1, 40, 99],
        [1, 1, 36, 105],
        [2, 1, 104, 99],
        [3, 1, 108, 105],
      ]);
    // And two ticks later (age 11) the sign-stable velocities keep compounding.
    expect(facadeDropletsAtAge(11, base).map((drop) => [drop.index, drop.x, drop.y]))
      .toEqual([
        [0, 38, 98],
        [1, 34, 104],
        [2, 106, 98],
        [3, 110, 104],
      ]);
  });

  it("keeps each droplet alive exactly 7 RAM ticks", () => {
    const base = { x: 72, y: 80 };
    for (let tick = 0; tick <= 6; tick += 1) {
      expect(facadeDropletsAtAge(9 + tick, base)).toHaveLength(4);
      expect(facadeDropletsAtAge(9 + tick, base).every((drop) => drop.tick === tick)).toBe(true);
    }
    expect(facadeDropletsAtAge(16, base)).toHaveLength(0); // tick 7 -> destroyed
  });

  it("squishes the attacker through the three 24-frame FRAME cycles with identity resets", () => {
    // gFacadeSquishAffineAnimCmds = FRAME(-16,+16,0,6), FRAME(+16,-16,0,12), FRAME(-16,+16,0,6)
    // Each squish is 24 frames; resets to identity at ages 28 and 53.
    expect(facadeSquishMatrixAtAge(3)).toEqual({ a: 256, d: 256 });
    expect(facadeSquishMatrixAtAge(4)).toEqual({ a: 240, d: 272 });
    expect(facadeSquishMatrixAtAge(9)).toEqual({ a: 160, d: 352 });
    expect(facadeSquishMatrixAtAge(10)).toEqual({ a: 176, d: 336 });
    expect(facadeSquishMatrixAtAge(21)).toEqual({ a: 352, d: 160 });
    expect(facadeSquishMatrixAtAge(22)).toEqual({ a: 336, d: 176 });
    expect(facadeSquishMatrixAtAge(27)).toEqual({ a: 256, d: 256 });
    expect(facadeSquishMatrixAtAge(28)).toEqual({ a: 256, d: 256 });
    expect(facadeSquishMatrixAtAge(29)).toEqual({ a: 240, d: 272 });
    expect(facadeSquishMatrixAtAge(53)).toEqual({ a: 256, d: 256 });
    expect(facadeSquishMatrixAtAge(54)).toEqual({ a: 240, d: 272 });
    expect(facadeSquishMatrixAtAge(78)).toEqual({ a: 256, d: 256 });
    expect(facadeSquishMatrixAtAge(79)).toEqual({ a: 256, d: 256 });
  });

  it("derives the squish y2 from SetBattlerSpriteYOffsetFromYScale", () => {
    // scaledHeight = trunc((48 << 8) / d); y2 = trunc((48 - scaledHeight) / 2).
    expect(facadeSquishY2(3, 48)).toBe(0);
    expect(facadeSquishY2(4, 48)).toBe(1); // d=272 -> scaled 45 -> y2 1
    expect(facadeSquishY2(9, 48)).toBe(7); // d=352 -> scaled 34 -> y2 7
    expect(facadeSquishY2(21, 48)).toBe(-14); // d=160 -> scaled 76 -> y2 -14
    expect(facadeSquishY2(28, 48)).toBe(0);
  });

  it("exposes only immutable presentation geometry through the typed seam", () => {
    const config: SceneOnFacadeConfig = {
      move: "FACADE",
      attacker: {
        species: "AZUMARILL",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 167,
        playerMaxHp: 175,
        opponentHp: 142,
        opponentMaxHp: 142,
        playerGender: "female",
        opponentGender: "male",
      },
      battlerHeight: 48,
    };
    const stage = createSceneOnMovePresentation(config);
    const view = sceneOnFacadeView({ ...stage, age: 10 });
    expect(view).toMatchObject({
      age: 10,
      attacker: { species: "AZUMARILL" },
      target: { species: "ONIX" },
      visualTaskCount: 2,
      blendColorIndex: 6,
      matrix: { a: 176, d: 336 },
    });
    expect(view.droplets).toHaveLength(4);
    expect("damage" in view).toBe(false);
    expect("moves" in view).toBe(false);
  });
});
