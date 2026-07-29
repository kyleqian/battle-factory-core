import { describe, expect, it } from "vitest";
import { hydroPumpAtAge } from "../../src/animation/hydroPump.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHydroPumpView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_HYDRO_PUMP source-relative reducer", () => {
  const player = (age: number) => hydroPumpAtAge(
    age,
    "player",
    { x: 72, y: 88 },
    { x: 176, y: 42 },
  );

  it("ports all 44 WATER_ORBs and 12 Water Impact splats", () => {
    expect(Array.from({ length: 22 }, (_, group) =>
      player(18 + group * 3).orbs.filter(
        (orb) => Math.floor(orb.spawnIndex / 2) === group,
      ).length
    )).toEqual(Array(22).fill(2));
    expect([36, 48, 60, 72, 84, 90].map(
      (age, group) => player(age).splats.filter(
        (splat) => Math.floor(splat.spawnIndex / 2) === group,
      ).length,
    )).toEqual(Array(6).fill(2));
    expect(player(18).orbs[0]).toMatchObject({
      spawnIndex: 0,
      oamSlot: 3,
      x: 82,
      y: 98,
      frame: 1,
    });
    expect(player(110).orbs).toEqual([]);
    expect(player(100).splats).toEqual([]);
    expect(player(35).particleOamSlotsBackToFront.slice(-4)).toEqual([
      9, 11, 13, 15,
    ]);
  });

  it("ports tasks, blend, audio, tags, and first inactive cleanup", () => {
    expect(player(10)).toMatchObject({
      tasks: [{ kind: "attacker-shake", slot: 0 }],
      alpha: { eva: 12, evb: 8 },
      targetMonbg: true,
    });
    expect(player(36).tasks.map((task) => task.kind)).toEqual([
      "attacker-shake", "sin-timer", "target-shake",
    ]);
    expect(player(18).hydroPumpAudio).toEqual({ pan: -62, flags: 131 });
    expect(player(81).hydroPumpAudio).toEqual({ pan: 63, flags: 131 });
    expect(player(82).hydroPumpAudio).toEqual({ pan: 63, flags: 128 });
    expect(player(138).hydroPumpAudio).toEqual({ pan: 63, flags: 128 });
    expect(player(118)).toMatchObject({ alpha: null, targetMonbg: false });
    expect(player(140)).toMatchObject({
      active: false,
      waterOrbLoaded: false,
      waterImpactLoaded: false,
      visualTaskCount: 0,
    });
  });

  it("exposes resolved geometry through the typed Scene-ON seam", () => {
    const state = createSceneOnMovePresentation({
      move: "HYDRO_PUMP",
      attacker: {
        species: "MASQUERAIN",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 48 },
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
      attackerPictureOffset: { x: 72, y: 88 },
      targetPictureOffset: { x: 176, y: 42 },
      fieldProfile: {
        playerHp: 139,
        playerMaxHp: 145,
        opponentHp: 142,
        opponentMaxHp: 142,
      },
    });
    expect(sceneOnHydroPumpView({ ...state, age: 36 })).toMatchObject({
      attacker: { species: "MASQUERAIN" },
      target: { species: "ONIX" },
      visualTaskCount: 19,
      soundTaskCount: 1,
      splats: [{ spawnIndex: 0 }, { spawnIndex: 1 }],
    });
  });
});
