import { describe, expect, it } from "vitest";
import {
  METAL_SOUND_WAVE_COUNT,
  METAL_SOUND_WAVE_DURATION,
  METAL_SOUND_WAVE_FIRST_AGE,
  METAL_SOUND_WAVE_LAST_AGE,
  METAL_SOUND_WAVE_SPAWN_PERIOD,
  metalSoundEffectAtAge,
} from "../../src/animation/metalSound.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMetalSoundView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_METAL_SOUND source-relative reducer", () => {
  const player = (age: number) => metalSoundEffectAtAge(
    age,
    "player",
    { x: 72, y: 104 },
    { x: 176, y: 42 },
  );
  const opponent = (age: number) => metalSoundEffectAtAge(
    age,
    "opponent",
    { x: 176, y: 60 },
    { x: 72, y: 88 },
  );

  it("ports the four source MetalSoundRings calls and affine program", () => {
    expect(METAL_SOUND_WAVE_COUNT).toBe(4);
    expect(METAL_SOUND_WAVE_SPAWN_PERIOD).toBe(4);
    expect(METAL_SOUND_WAVE_DURATION).toBe(30);
    expect(METAL_SOUND_WAVE_FIRST_AGE).toBe(7);
    expect(METAL_SOUND_WAVE_LAST_AGE).toBe(49);
    expect([7, 11, 15, 19].map((age) => player(age).waves[0]?.spawnIndex))
      .toEqual([0, 0, 0, 0]);
    expect(player(19).waves.map((wave) => wave.spawnIndex)).toEqual([0, 1, 2, 3]);
    expect(player(19).waves.at(-1)).toMatchObject({
      x: 88,
      y: 104,
      x2: 2,
      y2: -2,
      xScale: 1680,
      yScale: 1680,
    });
    expect(player(49).waves.at(-1)).toMatchObject({
      x2: 87,
      y2: -61,
      xScale: 263,
      yScale: 263,
    });
    expect(opponent(19).waves.at(-1)).toMatchObject({ x: 160, x2: -2, y2: 0 });
  });

  it("keeps the short move-owned ShakeMon2 creation anchor local", () => {
    expect([6, 7, 8, 9, 20, 21, 22].map((age) => player(age).attackerOffset.x2))
      .toEqual([0, -2, -2, 2, -2, 0, 0]);
    expect(player(7).shakeTaskActive).toBe(true);
    expect(player(21).shakeTaskActive).toBe(false);
    expect(player(51).waves).toEqual([]);
  });

  it("exposes only source-relative presentation through the Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "METAL_SOUND",
      attacker: {
        species: "ARON",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 65 },
          animationCenter: { x: 72, y: 104 },
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
        playerHp: 125,
        playerMaxHp: 125,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnMetalSoundView({ ...stage, age: 19 })).toMatchObject({
      age: 19,
      attacker: { species: "ARON" },
      target: { species: "ONIX" },
      waves: [{ spawnIndex: 0 }, { spawnIndex: 1 }, { spawnIndex: 2 }, { spawnIndex: 3 }],
    });
  });
});
