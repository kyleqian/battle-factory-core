import { describe, expect, it } from "vitest";
import { ingrainAtAge } from "../../src/animation/ingrain.ts";
import {
  createSceneOnMovePresentation,
  sceneOnIngrainView,
  type SceneOnIngrainConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const playerCenter = { x: 72, y: 80 } as const;
const playerProfile = { attackerSubpriority: 30 } as const;

describe("MOVE_INGRAIN source reducer", () => {
  it("ports its literal script offsets, resource lifetime, root cadence, and cleanup", () => {
    expect(ingrainAtAge(0, playerCenter, playerProfile)).toMatchObject({
      active: true,
      sourceOffset: 0,
      rootsLoaded: false,
      orbsLoaded: false,
      visualSpriteCount: 0,
    });
    expect(ingrainAtAge(7, playerCenter, playerProfile)).toMatchObject({
      sourceOffset: 29,
      rootsLoaded: true,
      orbsLoaded: true,
      sounds: [{ song: "SE_M_SCRATCH", pan: "attacker" }],
      roots: [{
        creationAge: 7,
        duration: 150,
        counter: 2,
        x: 72,
        y: 80,
        x2: 16,
        y2: 26,
        animation: 2,
        animationCommand: 0,
        animationDelay: 5,
        sourceCell: 0,
        hFlip: false,
        invisible: false,
      }],
    });
    expect(ingrainAtAge(43, playerCenter, playerProfile).roots.map((root) => root.subpriority))
      .toEqual([29, 31, 31, 29]);
    expect(ingrainAtAge(146, playerCenter, playerProfile).roots[0])
      .toMatchObject({ counter: 141, invisible: true });
    expect(ingrainAtAge(155, playerCenter, playerProfile).roots[0])
      .toMatchObject({ counter: 150, invisible: false });
    expect(ingrainAtAge(156, playerCenter, playerProfile).roots.map((root) => root.index))
      .toEqual([1, 2, 3]);
    expect(ingrainAtAge(161, playerCenter, playerProfile)).toMatchObject({
      active: true,
      sourceOffset: 175,
      visualSpriteCount: 1,
      roots: [{ index: 3, counter: 120, invisible: false }],
    });
    expect(ingrainAtAge(162, playerCenter, playerProfile)).toMatchObject({
      active: true,
      sourceOffset: 175,
      visualSpriteCount: 0,
      roots: [],
      orbs: [],
    });
    expect(ingrainAtAge(163, playerCenter, playerProfile)).toMatchObject({
      active: false,
      sourceOffset: 176,
      rootsLoaded: false,
      orbsLoaded: false,
      roots: [],
      orbs: [],
      visualSpriteCount: 0,
    });
  });

  it("ports root overflow, orb sine motion, animation cells, audio, and live subpriority", () => {
    expect(ingrainAtAge(7, { x: 176, y: 110 }, playerProfile).roots[0])
      .toMatchObject({ x: 176, y: 126, x2: 16, y2: 26 });
    expect(ingrainAtAge(85, playerCenter, playerProfile).orbs[0])
      .toMatchObject({
        creationAge: 85,
        phase: 2,
        x: 104,
        y: 106,
        x2: -2,
        y2: 2,
        velocityX: -1,
        waveAmplitude: 3,
        subpriority: 27,
        animationCommand: 0,
        animationDelay: 1,
        sourceCell: 3,
      });
    expect(ingrainAtAge(92, playerCenter, playerProfile)).toMatchObject({
      sounds: [{ song: "SE_M_BUBBLE3", pan: "attacker" }],
      orbs: [{ phase: 9, x2: -9, y2: -3, animationCommand: 0, animationDelay: 2 }],
    });
    expect(ingrainAtAge(99, playerCenter, playerProfile).orbs.map((orb) => orb.subpriority))
      .toEqual([27, 27]);
    expect(ingrainAtAge(113, playerCenter, playerProfile).orbs)
      .toMatchObject([
        { phase: 30 },
        { phase: 16 },
        { phase: 2, x: 120, y: 106, x2: -4, y2: 2 },
      ]);
    expect(ingrainAtAge(129, playerCenter, playerProfile).orbs)
      .toMatchObject([{ index: 2, phase: 18 }]);
    expect(ingrainAtAge(130, playerCenter, playerProfile).orbs).toEqual([]);
    expect(ingrainAtAge(99, playerCenter, { attackerSubpriority: 40 }).orbs[0])
      .toMatchObject({ subpriority: 37 });
  });

  it("exposes the generic reducer through the typed Scene-ON seam", () => {
    const config: SceneOnIngrainConfig = {
      move: "INGRAIN",
      attacker: {
        species: "ARON",
        geometry: {
          side: "player",
          spriteCorner: { x: 38, y: 56 },
          animationCenter: { x: 70, y: 88 },
          battlePositionCenter: playerCenter,
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
      animationProfile: playerProfile,
    };
    const stage = createSceneOnMovePresentation(config);
    expect(sceneOnIngrainView({ ...stage, age: 85 })).toMatchObject({
      attacker: { species: "ARON" },
      target: { species: "GROVYLE" },
      roots: expect.any(Array),
      orbs: [{ x: 104, y: 106, subpriority: 27 }],
    });
  });
});
