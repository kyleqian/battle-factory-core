import { describe, expect, it } from "vitest";
import {
  SCREECH_FIRST_INACTIVE_AGE,
  SCREECH_RING_COUNT,
  SCREECH_RING_DURATION,
  SCREECH_RING_FIRST_AGE,
  SCREECH_RING_SPAWN_PERIOD,
  screechEffectAtAge,
} from "../../src/animation/screech.ts";
import {
  createSceneOnMovePresentation,
  sceneOnScreechView,
  type SceneOnScreechConfig,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_SCREECH pure source-age reducer", () => {
  const player = (age: number) => screechEffectAtAge(
    age,
    "player",
    { x: 72, y: 102 },
    { x: 176, y: 42 },
  );
  const opponent = (age: number) => screechEffectAtAge(
    age,
    "opponent",
    { x: 176, y: 49 },
    { x: 72, y: 88 },
  );

  it("ports both literal ScreechRing calls and the growing-ring program", () => {
    expect(SCREECH_RING_COUNT).toBe(2);
    expect(SCREECH_RING_FIRST_AGE).toBe(4);
    expect(SCREECH_RING_SPAWN_PERIOD).toBe(4);
    expect(SCREECH_RING_DURATION).toBe(30);
    expect(player(3).rings).toEqual([]);
    expect(player(4).rings).toEqual([
      expect.objectContaining({
        spawnIndex: 0, x: 88, y: 102, x2: 2, y2: -2, xScale: 1680, yScale: 1680,
      }),
    ]);
    expect(player(8).rings.map((ring) => ring.spawnIndex)).toEqual([0, 1]);
    expect(player(38).rings).toEqual([
      expect.objectContaining({ spawnIndex: 1, x2: 87, y2: -60, xScale: 263, yScale: 263 }),
    ]);
    expect(player(39).rings).toEqual([]);
    expect(opponent(4).rings[0]).toMatchObject({ x: 160, y: 49, x2: -2, y2: 1 });
  });

  it("keeps its own ShakeMon2 creation scanout and SwayMon overwrite local", () => {
    expect([4, 5, 6, 7, 8].map((age) => player(age).attackerOffset.x2))
      .toEqual([-3, -3, 0, 0, 0]);
    expect([4, 5, 6, 7, 8].map((age) => player(age).displayedAttackerOffset.x2))
      .toEqual([0, 3, -3, -3, 0]);
    expect(player(30)).toMatchObject({
      swayTaskActive: true,
      targetOffsetOverwrite: true,
      targetOffset: { x2: 1, y2: 0 },
    });
    expect(player(31).targetOffset).toEqual({ x2: 2, y2: 0 });
    expect(opponent(30).targetOffset).toEqual({ x2: -2, y2: 0 });
    expect(opponent(31).targetOffset).toEqual({ x2: -3, y2: 0 });
    expect(player(61)).toMatchObject({
      swayTaskActive: false,
      targetOffsetOverwrite: true,
      targetOffset: { x2: 0, y2: 0 },
    });
  });

  it("pins source-pointer and first-inactive cleanup edges", () => {
    expect(player(0)).toMatchObject({ sourceOffset: 0, scriptActive: true, active: true });
    expect(player(3).sourceOffset).toBe(3);
    expect(player(4).sourceOffset).toBe(76);
    expect(player(12).sourceOffset).toBe(31);
    expect(player(30).sourceOffset).toBe(49);
    expect(player(SCREECH_FIRST_INACTIVE_AGE)).toMatchObject({
      sourceOffset: 50,
      scriptActive: false,
      active: true,
      rings: [],
    });
    expect(player(SCREECH_FIRST_INACTIVE_AGE + 1).active).toBe(false);
  });

  it("exposes only live sides, species, and geometry through the typed seam", () => {
    const config: SceneOnScreechConfig = {
      move: "SCREECH",
      attacker: {
        species: "ARON",
        geometry: {
          side: "player",
          spriteCorner: { x: 38, y: 56 },
          animationCenter: { x: 70, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "GROVYLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 146, y: 12 },
          animationCenter: { x: 178, y: 44 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 100,
        playerMaxHp: 100,
        opponentHp: 100,
        opponentMaxHp: 100,
      },
    };
    const stage = createSceneOnMovePresentation(config);
    expect(sceneOnScreechView({ ...stage, age: 8 })).toMatchObject({
      attacker: { species: "ARON" },
      target: { species: "GROVYLE" },
      rings: [
        { spawnIndex: 0, x: 86, y: 88 },
        { spawnIndex: 1, x: 86, y: 88 },
      ],
    });
  });
});
