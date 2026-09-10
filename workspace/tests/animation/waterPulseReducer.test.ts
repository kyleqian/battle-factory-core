import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  WATER_PULSE_BLUE_RING_2_TAG,
  WATER_PULSE_FIRST_INACTIVE_AGE,
  WATER_PULSE_SMALL_BUBBLES_TAG,
  waterPulseAnimationRngAtAge,
  waterPulseAtAge,
  waterPulseSourceAtAge,
  type WaterPulseLiveInputs,
} from "../../src/animation/waterPulse.ts";
import {
  sceneOnWaterPulseView,
  type SceneOnWaterPulsePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

const live = (overrides: Partial<WaterPulseLiveInputs> = {}): WaterPulseLiveInputs => ({
  attackerSide: "player",
  targetSide: "opponent",
  attackerSpecies: "WOBBUFFET",
  targetSpecies: "ONIX",
  attackerCenter: { x: 72, y: 88 },
  targetCenter: { x: 176, y: 42 },
  targetPictureCenter: { x: 176, y: 42 },
  attackerRingOrigin: { x: 72, y: 96 },
  targetRingCenter: { x: 176, y: 42 },
  attackerSpriteSlot: 6,
  targetSpriteSlot: 8,
  attackerSubpriority: 30,
  targetSubpriority: 40,
  targetInitialOffset: { x: 1, y: 0 },
  simplePaletteSpriteSlot: 3,
  smallBubbleSlots: [4, 5, 7, 9, 10],
  ringSlots: [3, 4, 5],
  ringBubbleSlots: [7, 9, 10, 11, 12, 13, 14, 15, 7, 9, 3, 10],
  ringMatrixSlots: [5, 7, 9],
  ringBubbleMatrixSlots: [6, 8, 10, 11, 12, 0, 5, 6, 7, 8, 9, 10],
  smallBubbles: { tileSlot: 6, paletteBank: 7, tileRange: [305, 10] },
  blueRing2: { tileSlot: 7, paletteBank: 8, tileRange: [315, 8] },
  updateMonBgTaskSlot: 1,
  clearMonBgTaskSlot: 0,
  shakeTaskSlot: 0,
  monBg: {
    layer: "bg1", layerId: 8, snapshot: { x: 177, y: 42 }, baseScroll: { x: -145, y: -10 },
    activeCnt: 23554, inactiveCnt: 39937,
  },
  initialMatrixBitmap: 6,
  spriteOrder: [62, 60, 0, 63, 1, 61, 6, 8, 3, 2, 4],
  animationRngSeed: 0x4fd0a6c4,
  ...overrides,
});

describe("MOVE_WATER_PULSE source-age reducer", () => {
  it("replays retained bilateral component rows twice through reducer and the typed seam", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/verifyWaterPulseReducer.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    for (const side of ["player-back", "opponent-front"]) {
      expect(summary[side]).toMatchObject({
        reducerRows: 160,
        seamRows: 160,
        lifecycle: {
          smallBubbles: "22..70", rings: "72..111 / 79..118 / 86..125",
          simplePalette: "10..23 / 136..153", updateMonBg: "7..157",
          clearMonBg: "155..157", shake: "101..134", firstInactive: 159,
        },
        latches: {
          oam: "159/159 predecessor", matrices: "159/159 predecessor",
          palettes: "158/159 predecessor; source age 7 same-row monbg setup",
          bgVram: "8/157/159",
        },
        cleanup: { age: 159, active: false, visualTasks: 0, sprites: 0, framebufferCompared: false },
      });
    }
  });

  it("ports root waits, assets, bubble/ring lifetimes, source RNG, and cleanup", () => {
    expect(waterPulseSourceAtAge(0)).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(waterPulseSourceAtAge(10)).toMatchObject({ pointerOffset: 33, wait: 10 });
    expect(waterPulseSourceAtAge(86)).toMatchObject({ pointerOffset: 206, wait: 13 });
    expect(waterPulseAtAge(1, live()).resources).toMatchObject({
      smallBubbles: { loaded: true, tag: WATER_PULSE_SMALL_BUBBLES_TAG },
      blueRing2: { loaded: false, tag: null },
    });
    expect(waterPulseAtAge(4, live()).resources.blueRing2).toMatchObject({
      loaded: true, tag: WATER_PULSE_BLUE_RING_2_TAG,
    });
    expect(waterPulseAtAge(22, live()).sprites.filter((sprite) => sprite.kind === "small-bubble"))
      .toHaveLength(5);
    expect(waterPulseAtAge(72, live()).sprites).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "blue-ring", slot: 3, data: [1, 176, 42, 40, 15, 1, 0, 0] }),
    ]));
    expect(waterPulseAtAge(86, live()).rng.advances).toBe(3);
    expect(waterPulseAnimationRngAtAge(live().animationRngSeed, 86))
      .toBe(waterPulseAtAge(86, live()).rng.animationAfter);
    expect(waterPulseAtAge(WATER_PULSE_FIRST_INACTIVE_AGE, live())).toMatchObject({
      active: false,
      source: { pointerOffset: 244, wait: 1 },
      sprites: [], tasks: [],
      resources: {
        smallBubbles: { loaded: false, tag: null }, blueRing2: { loaded: false, tag: null },
        allocator: { matrixBitmap: 6, releasedAtFirstInactive: true },
      },
      cleanup: { firstInactive: true, visualTasks: 0, ownedSprites: 0, resourcesReleased: true },
    });
  });

  it("keeps the move-owned transfer, monbg, shake, and palette mechanisms explicit", () => {
    expect(waterPulseAtAge(7, live())).toMatchObject({
      targetOffset: { x: 1, y: 0 },
      displayTransfer: { palettes: "current-faded-monbg-setup" },
      background: { targetVisible: false, softwareScroll: { x: -145, y: -10 } },
    });
    expect(waterPulseAtAge(8, live())).toMatchObject({
      background: { vram: "mon-bg", vramEvent: "load-mon-bg" },
      registers: { transfer: "preceding-mon-bg", hardwareScroll: { x: -145, y: -10 } },
    });
    expect(waterPulseAtAge(101, live())).toMatchObject({
      targetOffset: { x: 0, y: 0 },
      tasks: expect.arrayContaining([expect.objectContaining({
        callback: "AnimTask_ShakeMon_Step", data: expect.arrayContaining([8, 17, 1, 1]),
      })]),
    });
    expect(waterPulseAtAge(103, live()).targetOffset).toEqual({ x: 0, y: 8 });
    expect(waterPulseAtAge(158, live())).toMatchObject({
      background: { vram: "clear-pending" },
      registers: { transfer: "preceding-mon-bg" },
      displayTransfer: { oam: "preceding-software", matrices: "preceding-software", palettes: "preceding-faded" },
    });
  });

  it("is deterministic and materially responds to live geometry, allocator, task, and order controls", () => {
    const first = waterPulseAtAge(101, live());
    expect(waterPulseAtAge(101, live())).toEqual(first);
    const altered = waterPulseAtAge(101, live({
      attackerSpecies: "MAGBY", targetSpecies: "NINETALES",
      attackerCenter: { x: 42, y: 104 }, targetCenter: { x: 198, y: 35 },
      attackerRingOrigin: { x: 40, y: 110 }, targetRingCenter: { x: 198, y: 35 },
      simplePaletteSpriteSlot: 11, ringSlots: [12, 13, 14],
      ringBubbleSlots: [15, 16, 17, 18, 19, 20, 21, 22, 15, 16, 11, 17],
      ringMatrixSlots: [13, 14, 15],
      ringBubbleMatrixSlots: [16, 17, 18, 19, 20, 21, 22, 23, 16, 17, 12, 18],
      updateMonBgTaskSlot: 5, shakeTaskSlot: 6,
      smallBubbles: { tileSlot: 12, paletteBank: 13, tileRange: [412, 10] },
      blueRing2: { tileSlot: 14, paletteBank: 15, tileRange: [422, 8] },
      initialMatrixBitmap: 3, spriteOrder: [9, 6, 4, 1],
    }));
    expect(altered).not.toEqual(first);
    expect(altered.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ slot: 5, callback: "Task_UpdateMonBg" }),
      expect.objectContaining({ slot: 6, callback: "AnimTask_ShakeMon_Step" }),
    ]));
    expect(altered.resources).toMatchObject({
      smallBubbles: { tileSlot: 12, paletteBank: 13 }, blueRing2: { tileSlot: 14, paletteBank: 15 },
    });
  });

  it("routes identical live facts through the narrow typed Scene-ON seam", () => {
    const input = live();
    const { attackerSide: _attackerSide, targetSide: _targetSide,
      attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies,
      attackerCenter: _attackerCenter, targetCenter: _targetCenter, ...animationInputs } = input;
    const state = {
      age: 86,
      config: {
        move: "WATER_PULSE",
        attacker: { species: "WOBBUFFET", geometry: {
          side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: input.attackerCenter,
          battlePositionCenter: input.attackerCenter,
        } },
        target: { species: "ONIX", geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: input.targetCenter,
          battlePositionCenter: input.targetCenter,
        } },
        fieldProfile: { kind: "default" }, animationInputs,
      },
    } as unknown as SceneOnWaterPulsePresentationState;
    const view = sceneOnWaterPulseView(state);
    expect(view).toMatchObject({
      attacker: { species: "WOBBUFFET" }, target: { species: "ONIX" },
      sprites: expect.arrayContaining([expect.objectContaining({ kind: "blue-ring", slot: 3 })]),
    });
  });
});
