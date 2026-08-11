import { describe, expect, it } from "vitest";
import {
  SELF_DESTRUCT_EXPLOSION_INTERVAL,
  SELF_DESTRUCT_EXPLOSION_OFFSETS,
  selfDestructAtAge,
} from "../../src/animation/selfDestruct.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSelfDestructView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_SELF_DESTRUCT source-relative reducer", () => {
  const player = (age: number) =>
    selfDestructAtAge(age, "player", { x: 72, y: 88 });
  const opponent = (age: number) =>
    selfDestructAtAge(age, "opponent", { x: 176, y: 40 });

  it("ports both literal SelfDestructExplode calls and four 5-frame cells", () => {
    expect(SELF_DESTRUCT_EXPLOSION_INTERVAL).toBe(8);
    expect(SELF_DESTRUCT_EXPLOSION_OFFSETS).toHaveLength(10);
    expect(player(0).explosions).toEqual([
      { spawnIndex: 0, age: 0, x: 72, y: 88, frame: 0 },
    ]);
    expect(player(8).explosions.map((sprite) => sprite.spawnIndex))
      .toEqual([0, 1]);
    expect(player(3).explosions[0]?.frame).toBe(0);
    expect(player(4).explosions[0]?.frame).toBe(1);
    expect(player(19).explosions[0]?.frame).toBe(3);
    expect(player(20).explosions.some((sprite) => sprite.spawnIndex === 0))
      .toBe(false);
    expect(player(72).explosions.some((sprite) => sprite.spawnIndex === 9))
      .toBe(true);
    expect(player(91).explosions).toHaveLength(1);
    expect(player(92).explosions).toHaveLength(0);
  });

  it("mirrors attacker-relative x geometry in the opponent orientation", () => {
    expect(player(8).explosions[1]).toMatchObject({ x: 96, y: 64 });
    expect(opponent(8).explosions[1]).toMatchObject({ x: 152, y: 16 });
    expect(player(16).explosions.at(-1)).toMatchObject({ x: 56, y: 104 });
    expect(opponent(16).explosions.at(-1)).toMatchObject({ x: 192, y: 56 });
  });

  it("composes the existing exact ShakeMon2 and both palette ramps", () => {
    expect([0, 1, 2, 3, 74, 75, 76].map((age) => player(age).battlerX2))
      .toEqual([-6, -6, 6, 6, 0, 0, 0]);
    expect([0, 1, 2, 17, 18, 94, 95, 96, 109, 110, 111].map(
      (age) => player(age).attackerPaletteY,
    )).toEqual([0, 0, 1, 8, 9, 9, 8, 8, 1, 1, 0]);
  });

  it("exposes the complete body through the relative Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "SELF_DESTRUCT",
      attacker: {
        species: "SUDOWOODO",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "SHUCKLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 17 },
          animationCenter: { x: 176, y: 49 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 0,
        playerMaxHp: 177,
        opponentHp: 95,
        opponentMaxHp: 95,
      },
    });
    expect(sceneOnSelfDestructView({ ...stage, age: 72 })).toMatchObject({
      age: 72,
      battlerX2: -6,
      attackerPaletteY: 9,
      explosions: expect.arrayContaining([
        expect.objectContaining({ spawnIndex: 9, x: 88, y: 96 }),
      ]),
    });
  });
});
