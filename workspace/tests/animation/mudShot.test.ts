import { describe, expect, it } from "vitest";
import { mudShotAtAge } from "../../src/animation/mudShot.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMudShotView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_MUD_SHOT source-relative reducer", () => {
  const player = (age: number) => mudShotAtAge(
    age,
    "player",
    { x: 72, y: 98 },
    { x: 176, y: 42 },
  );

  it("creates exactly 22 four-frame BROWN_ORBs in 11 source calls", () => {
    const starts = Array.from({ length: 22 }, (_, index) => 15 + index * 4);
    expect(starts.map((age) => player(age).orbs.some(
      (orb) => orb.spawnIndex === (age - 15) / 4,
    ))).toEqual(Array(22).fill(true));
    expect(player(15).orbs[0]).toMatchObject({
      spawnIndex: 0,
      oamSlot: 3,
      x: 82,
      y: 108,
      x2: 6,
      y2: -2,
      frame: 1,
    });
    expect(player(128).orbs).toEqual([]);
  });

  it("ports both ShakeMon tasks, StartSinAnimTimer, alpha, and cleanup", () => {
    expect(player(7)).toMatchObject({
      tasks: [{ kind: "attacker-shake", slot: 0 }],
      attackerOffset: { x2: 0, y2: 0 },
      alpha: { eva: 12, evb: 8 },
      targetMonbg: true,
    });
    expect(player(9).attackerOffset).toEqual({ x2: 0, y2: 2 });
    expect(player(39).tasks.map((task) => task.kind)).toEqual([
      "attacker-shake", "sin-timer", "target-shake",
    ]);
    expect(player(41).targetOffset).toEqual({ x2: 3, y2: 0 });
    expect(player(129)).toMatchObject({ alpha: null, targetMonbg: false });
    expect(player(144)).toMatchObject({
      active: false,
      brownOrbLoaded: false,
      visualTaskCount: 0,
      orbs: [],
    });
    expect(mudShotAtAge(
      143, "opponent", { x: 176, y: 53 }, { x: 72, y: 88 },
    ).active).toBe(false);
  });

  it("exposes only resolved presentation geometry through the typed seam", () => {
    const state = createSceneOnMovePresentation({
      move: "MUD_SHOT",
      attacker: {
        species: "KRABBY",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 58 },
          animationCenter: { x: 72, y: 98 },
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
      attackerPictureOffset: { x: 72, y: 98 },
      targetPictureOffset: { x: 176, y: 42 },
      fieldProfile: {
        playerHp: 128,
        playerMaxHp: 137,
        opponentHp: 142,
        opponentMaxHp: 142,
      },
    });
    expect(sceneOnMudShotView({ ...state, age: 15 })).toMatchObject({
      age: 15,
      attacker: { species: "KRABBY" },
      target: { species: "ONIX" },
      visualTaskCount: 3,
      soundTaskCount: 1,
      whirlpoolAudio: { pan: -63, flags: 131 },
    });
  });
});
