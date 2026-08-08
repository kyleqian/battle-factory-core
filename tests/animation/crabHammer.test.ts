import { describe, expect, it } from "vitest";
import {
  BUBBLE_FIRST_AGE,
  CLEANUP_AGE,
  CONTACT_AGE,
  CRABHAMMER_DISPLAY_LAG,
  CRABHAMMER_FRAME_COUNT,
  CRABHAMMER_OPPONENT_START_FRAME,
  CRABHAMMER_ORIENTATION_FRAME_SHIFT,
  CRABHAMMER_PLAYER_START_FRAME,
  ICE_CRYSTALS_LOAD_AGE,
  MONBG_AGE,
  OFFSET_SLIDE_AGE,
  ORIGINAL_SLIDE_AGE,
  WATER_IMPACT_LOAD_AGE,
  crabHammerAtAge,
} from "../../src/animation/crabHammer.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
} from "../../src/animation/slideMon.ts";
import { shakeMonOffsetAtTick } from "../../src/animation/shakeMon.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCrabHammerView,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER_BACK = {
  targetSide: "opponent",
  targetCenter: { x: 176, y: 42 },
  targetIdleX2: 1,
} as const;
const OPPONENT_FRONT = {
  targetSide: "player",
  targetCenter: { x: 72, y: 88 },
  targetIdleX2: 0,
} as const;

describe("Move_CRABHAMMER source-relative RAM reducer", () => {
  it("pins both clean 105-frame windows and their measured orientation shift", () => {
    expect(CRABHAMMER_FRAME_COUNT).toBe(105);
    expect(CRABHAMMER_PLAYER_START_FRAME).toBe(212);
    expect(CRABHAMMER_OPPONENT_START_FRAME).toBe(302);
    expect(CRABHAMMER_ORIENTATION_FRAME_SHIFT).toBe(90);
    expect(crabHammerAtAge(0, PLAYER_BACK).active).toBe(true);
    expect(crabHammerAtAge(103, PLAYER_BACK).active).toBe(true);
    expect(crabHammerAtAge(104, PLAYER_BACK)).toMatchObject({
      active: false,
      assetsLoaded: { iceCrystals: false, waterImpact: false },
      targetMonbg: false,
      alpha: null,
      visualTaskCount: 0,
      soundTaskCount: 0,
      scriptOffset: 249,
    });
  });

  it("tracks the independent asset loads, monbg/alpha ownership, and initial water splat", () => {
    expect(crabHammerAtAge(ICE_CRYSTALS_LOAD_AGE - 1, PLAYER_BACK).assetsLoaded)
      .toEqual({ iceCrystals: false, waterImpact: false });
    expect(crabHammerAtAge(ICE_CRYSTALS_LOAD_AGE, PLAYER_BACK).assetsLoaded)
      .toEqual({ iceCrystals: true, waterImpact: false });
    expect(crabHammerAtAge(WATER_IMPACT_LOAD_AGE, PLAYER_BACK).assetsLoaded)
      .toEqual({ iceCrystals: true, waterImpact: true });
    expect(crabHammerAtAge(MONBG_AGE - 1, PLAYER_BACK)).toMatchObject({
      targetMonbg: false,
      targetX2: 1,
      alpha: null,
    });
    expect(crabHammerAtAge(CONTACT_AGE, PLAYER_BACK)).toMatchObject({
      targetMonbg: true,
      alpha: { eva: 12, evb: 8 },
      waterHitsplat: {
        slot: 3,
        subpriority: 26,
        x: 176,
        y: 42,
        matrix: { a: 256, b: 0, c: 0, d: 256 },
        callback: "AnimHitSplatBasic",
      },
    });
    expect(crabHammerAtAge(18, OPPONENT_FRONT).waterHitsplat)
      .toMatchObject({ subpriority: 36, callback: "DestroyAnimSprite", x: 72, y: 88 });
    expect(crabHammerAtAge(19, PLAYER_BACK).waterHitsplat).toBeNull();
    expect(crabHammerAtAge(CLEANUP_AGE, PLAYER_BACK)).toMatchObject({
      targetMonbg: false,
      alpha: null,
    });
  });

  it("reuses both shared slide ports for the target move and return", () => {
    const at = (age: number) => crabHammerAtAge(age, PLAYER_BACK);
    expect(at(OFFSET_SLIDE_AGE - 1).targetX2).toBe(1);
    expect(at(OFFSET_SLIDE_AGE)).toMatchObject({
      targetX2: 6,
      slides: [{ kind: "to-offset", slot: 5, subpriority: 28 }],
    });
    expect(at(OFFSET_SLIDE_AGE + 3).targetX2).toBe(24);
    expect(at(ORIGINAL_SLIDE_AGE - 1).targetX2).toBe(24);
    expect(at(ORIGINAL_SLIDE_AGE)).toMatchObject({
      targetX2: 18,
      slides: [{ kind: "to-original", slot: 3, subpriority: 28 }],
    });
    expect(at(ORIGINAL_SLIDE_AGE + 3).targetX2).toBe(0);
    for (let age = OFFSET_SLIDE_AGE; age <= OFFSET_SLIDE_AGE + 3; age += 1) {
      expect(at(age).targetX2).toBe(slideMonToOffsetAtTick({
        battlerSide: "opponent",
        targetXOffset: -24,
        targetYOffset: 0,
        mirrorVertical: false,
        durationTicks: 4,
      }, age - OFFSET_SLIDE_AGE).x2);
    }
    for (let age = ORIGINAL_SLIDE_AGE; age <= ORIGINAL_SLIDE_AGE + 3; age += 1) {
      expect(at(age).targetX2).toBe(slideMonToOriginalPosAtTick({
        currentX2: 24,
        currentY2: 0,
        axisSnapMode: 0,
        durationTicks: 4,
      }, age - ORIGINAL_SLIDE_AGE).x2);
    }
    expect(crabHammerAtAge(OFFSET_SLIDE_AGE, OPPONENT_FRONT).targetX2).toBe(-6);
    expect(crabHammerAtAge(OFFSET_SLIDE_AGE + 3, OPPONENT_FRONT).targetX2).toBe(-24);
    expect(crabHammerAtAge(ORIGINAL_SLIDE_AGE, OPPONENT_FRONT).targetX2).toBe(-18);
  });

  it("creates all eight measured bubble pairs six ages apart with their real slot reuse", () => {
    const starts = [37, 43, 49, 55, 61, 67, 73, 79];
    const slots = [3, 4, 5, 7, 3, 4, 5, 7];
    for (const [index, age] of starts.entries()) {
      const bubble = crabHammerAtAge(age, PLAYER_BACK).bubbles.find(
        (entry) => entry.spawnIndex === index,
      );
      expect(bubble).toMatchObject({
        oamSlot: slots[index],
        subpriority: 28,
        data0: 11,
        data1: 48,
        remaining: 19,
      });
      expect(crabHammerAtAge(age, OPPONENT_FRONT).bubbles.find(
        (entry) => entry.spawnIndex === index,
      )).toMatchObject({ oamSlot: slots[index], subpriority: 38 });
    }
    expect(crabHammerAtAge(BUBBLE_FIRST_AGE, PLAYER_BACK).bubbles[0])
      .toMatchObject({ x: 186, y: 52, x2: 1, y2: 0 });
    expect(crabHammerAtAge(BUBBLE_FIRST_AGE, OPPONENT_FRONT).bubbles[0])
      .toMatchObject({ x: 62, y: 98, x2: 1, y2: 0 });
    expect(crabHammerAtAge(98, PLAYER_BACK).bubbles).toHaveLength(1);
    expect(crabHammerAtAge(99, PLAYER_BACK).bubbles).toEqual([]);
  });

  it("reuses the shared ShakeMon timeline without inventing a task-wide latch", () => {
    const at = (age: number) => crabHammerAtAge(age, PLAYER_BACK);
    expect(at(BUBBLE_FIRST_AGE)).toMatchObject({
      shakeTask: { slot: 2, tick: 1 },
      targetY2: 0,
    });
    expect(at(BUBBLE_FIRST_AGE + 2).targetY2).toBe(4);
    expect(at(BUBBLE_FIRST_AGE + 4).targetY2).toBe(0);
    for (let age = BUBBLE_FIRST_AGE; age <= 50; age += 1) {
      expect(at(age).targetY2).toBe(shakeMonOffsetAtTick(0, 4, 8, 1, age - 36).y2);
    }
    expect(at(51).shakeTask).toBeNull();
    expect(at(51).targetY2).toBe(0);
  });

  it("pins the complex palette's first blend, neutral reset, and RAM/display receipt", () => {
    expect(crabHammerAtAge(OFFSET_SLIDE_AGE, PLAYER_BACK).complexPaletteBlend)
      .toEqual({ slot: 4, subpriority: 28, selector: 31, active: true, color: 0x7ead, coefficient: 10 });
    expect(crabHammerAtAge(15, PLAYER_BACK).complexPaletteBlend)
      .toMatchObject({ color: 0x7ead, coefficient: 10 });
    expect(crabHammerAtAge(16, PLAYER_BACK).complexPaletteBlend)
      .toMatchObject({ color: null, coefficient: 0 });
    expect(crabHammerAtAge(20, OPPONENT_FRONT).complexPaletteBlend)
      .toMatchObject({ subpriority: 38, active: true, color: null, coefficient: 0 });
    expect(crabHammerAtAge(21, PLAYER_BACK).complexPaletteBlend).toBeNull();
    expect(CRABHAMMER_DISPLAY_LAG).toEqual({
      waterHitsplat: 1,
      slideToOffset: 1,
      slideToOriginal: 1,
      smallBubblePair: 1,
      shakeMon: 1,
      complexPaletteFirstWrite: 1,
      complexPaletteClearWrite: 1,
      monbg: "ram-only",
      setalpha: "ram-only",
      clearmonbgAndBlendoff: "ram-only",
    });
  });

  it("exposes the reducer through the typed Scene-ON presentation seam only", () => {
    const state = createSceneOnMovePresentation({
      move: "CRABHAMMER",
      attacker: {
        species: "KRABBY",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 53 },
          animationCenter: { x: 72, y: 85 },
          battlePositionCenter: { x: 72, y: 78 },
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
        playerHp: 142,
        playerMaxHp: 142,
        opponentHp: 117,
        opponentMaxHp: 137,
      },
      targetIdleX2: 1,
    });
    expect(sceneOnCrabHammerView({ ...state, age: 37 })).toMatchObject({
      age: 37,
      targetX2: 0,
      targetY2: 0,
      bubbles: [{ x: 186, y: 52, oamSlot: 3 }],
      shakeTask: { slot: 2, tick: 1 },
    });
  });
});
