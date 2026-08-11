import { describe, expect, it } from "vitest";
import {
  CLEAR_AGE,
  FIST_1_AGE,
  FIST_2_AGE,
  FIST_3_AGE,
  HITSPLAT_1_AGE,
  HITSPLAT_2_AGE,
  HITSPLAT_3_AGE,
  LUNGE_DESTROY_AGE,
  MONBG_AGE,
  SETALPHA_AGE,
  SHAKE_FIRST_AGE,
  SLIDE_OFFSET_FIRST_AGE,
  SLIDE_ORIGIN_FIRST_AGE,
  counterAtAge,
} from "../../src/animation/counter.ts";
import { slideMonToOffsetAtTick } from "../../src/animation/slideMon.ts";
import { shakeMonOffsetAtTick } from "../../src/animation/shakeMon.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCounterView,
} from "../../src/animation/sceneOnPresentation.ts";

const GEOM_PLAYER = {
  attackerSide: "player",
  attackerCenter: { x: 72, y: 85 },
  targetSide: "opponent",
  targetCenter: { x: 176, y: 42 },
} as const;
const GEOM_OPPONENT = {
  attackerSide: "opponent",
  attackerCenter: { x: 176, y: 45 },
  targetSide: "player",
  targetCenter: { x: 72, y: 88 },
} as const;

describe("Move_COUNTER source-relative reducer", () => {
  it("is static through the loadspritegfx prefix and starts monbg/setalpha", () => {
    expect(counterAtAge(0, GEOM_PLAYER)).toMatchObject({
      attackerX2: 0, attackerY2: 0, fists: [], hitsplats: [], targetX2: 0,
      targetInvisible: false, blendOn: false, soundEvents: [],
    });
    expect(counterAtAge(6, GEOM_PLAYER)).toMatchObject({
      targetInvisible: false, blendOn: false,
    });
    expect(counterAtAge(MONBG_AGE, GEOM_PLAYER)).toMatchObject({
      targetInvisible: true, blendOn: false,
    });
    expect(counterAtAge(SETALPHA_AGE, GEOM_PLAYER)).toMatchObject({
      targetInvisible: true, blendOn: true,
    });
    expect(counterAtAge(SETALPHA_AGE, GEOM_PLAYER).soundEvents).toEqual([
      { age: 10, song: "SE_M_VITAL_THROW", pan: -64 },
    ]);
  });

  it("runs the 18/6/1/4 elliptical lunge over phases 16..240 and destroys at 24", () => {
    const at = (age: number) => counterAtAge(age, GEOM_PLAYER);
    expect(at(9)).toMatchObject({ attackerX2: 0, attackerY2: 0 });
    // phase 16/32/48/64/... verified against the probe's x2/y2 sequence
    expect(at(10)).toMatchObject({ attackerX2: 6, attackerY2: 1 });
    expect(at(11)).toMatchObject({ attackerX2: 12, attackerY2: 2 });
    expect(at(12)).toMatchObject({ attackerX2: 16, attackerY2: 4 });
    expect(at(13)).toMatchObject({ attackerX2: 18, attackerY2: 6 });
    expect(at(17)).toMatchObject({ attackerX2: 0, attackerY2: 12 });
    expect(at(21)).toMatchObject({ attackerX2: -18, attackerY2: 6 });
    expect(at(23)).toMatchObject({ attackerX2: -13, attackerY2: 2 });
    // the phase-240 wrap is the self-destroy tick (x2=y2=0)
    expect(at(LUNGE_DESTROY_AGE)).toMatchObject({ attackerX2: 0, attackerY2: 0 });
  });

  it("mirrors the lunge width for an opponent-side attacker", () => {
    const at = (age: number) => counterAtAge(age, GEOM_OPPONENT);
    // negated amplitude floors toward -inf: -sin(16,18) = floor(-1746/256) = -7
    expect(at(10)).toMatchObject({ attackerX2: -7, attackerY2: 1 });
    expect(at(11)).toMatchObject({ attackerX2: -13, attackerY2: 2 });
    expect(at(13)).toMatchObject({ attackerX2: -18, attackerY2: 6 });
    expect(at(21)).toMatchObject({ attackerX2: 18, attackerY2: 6 });
    expect(at(23)).toMatchObject({ attackerX2: 12, attackerY2: 2 });
  });

  it("drives the attacker x2 through the shared slide-to-offset ramp and hold", () => {
    const at = (age: number) => counterAtAge(age, GEOM_PLAYER);
    expect(at(SLIDE_OFFSET_FIRST_AGE - 1)).toMatchObject({ attackerX2: 0 });
    expect(at(SLIDE_OFFSET_FIRST_AGE)).toMatchObject({ attackerX2: 5 });
    expect(at(27)).toMatchObject({ attackerX2: 15 });
    expect(at(29)).toMatchObject({ attackerX2: 20 });
    expect(at(40)).toMatchObject({ attackerX2: 20 }); // held until the return slide
    for (let age = SLIDE_OFFSET_FIRST_AGE; age < SLIDE_OFFSET_FIRST_AGE + 4; age += 1) {
      const tick = age - SLIDE_OFFSET_FIRST_AGE;
      expect(at(age).attackerX2).toBe(
        slideMonToOffsetAtTick(
          { battlerSide: "player", targetXOffset: 20, targetYOffset: 0, mirrorVertical: false, durationTicks: 4 },
          tick,
        ).x2,
      );
    }
    // opponent-side attacker mirrors to -20
    expect(counterAtAge(40, GEOM_OPPONENT)).toMatchObject({ attackerX2: -20 });
  });

  it("returns the attacker to its origin through the shared slide-to-original port", () => {
    const at = (age: number) => counterAtAge(age, GEOM_PLAYER);
    expect(at(SLIDE_ORIGIN_FIRST_AGE - 1)).toMatchObject({ attackerX2: 20 });
    expect(at(SLIDE_ORIGIN_FIRST_AGE)).toMatchObject({ attackerX2: 16 });
    expect(at(59)).toMatchObject({ attackerX2: 8 });
    expect(at(61)).toMatchObject({ attackerX2: 0 });
    expect(at(62)).toMatchObject({ attackerX2: 0 });
    expect(counterAtAge(SLIDE_ORIGIN_FIRST_AGE, GEOM_OPPONENT))
      .toMatchObject({ attackerX2: -16 });
    expect(counterAtAge(61, GEOM_OPPONENT)).toMatchObject({ attackerX2: 0 });
  });

  it("spawns the three fist/hitsplat triplets at the mirrored target-relative anchors", () => {
    const at = (age: number) => counterAtAge(age, GEOM_PLAYER);
    expect(at(HITSPLAT_1_AGE - 1)).toMatchObject({ hitsplats: [] });
    expect(at(HITSPLAT_1_AGE)).toMatchObject({
      hitsplats: [{ x: 161, y: 60 }],
      soundEvents: [{ age: 31, song: "SE_M_VITAL_THROW2", pan: 63 }],
    });
    // hitsplat lifetime is 9 ages (spawn+8 still alive), so triplets overlap
    expect(at(HITSPLAT_1_AGE + 9)).toMatchObject({
      hitsplats: [{ x: 176, y: 38 }], // h1 gone at 40, h2 alive until 47
    });
    expect(at(HITSPLAT_2_AGE)).toMatchObject({
      hitsplats: [
        { x: 161, y: 60 },
        { x: 176, y: 38 },
      ],
    });
    expect(at(HITSPLAT_3_AGE)).toMatchObject({
      hitsplats: [
        { x: 176, y: 38 },
        { x: 191, y: 51 },
      ],
    });
    expect(at(HITSPLAT_3_AGE + 9)).toMatchObject({ hitsplats: [] });
    expect(at(FIST_1_AGE)).toMatchObject({ fists: [{ x: 161, y: 60 }] });
    // 9-age lifetime (the SetCallbackToStoredInData6 hop) means fists overlap
    expect(at(FIST_2_AGE)).toMatchObject({
      fists: [
        { x: 161, y: 60 },
        { x: 176, y: 38 },
      ],
    });
    expect(at(FIST_3_AGE)).toMatchObject({
      fists: [
        { x: 176, y: 38 },
        { x: 191, y: 51 },
      ],
    });
    expect(at(FIST_3_AGE + 9)).toMatchObject({ fists: [] });
    // player-side target (opponent-front) mirrors the x offsets
    expect(counterAtAge(HITSPLAT_1_AGE, GEOM_OPPONENT)).toMatchObject({
      hitsplats: [{ x: 87, y: 106 }],
    });
    expect(counterAtAge(HITSPLAT_2_AGE, GEOM_OPPONENT)).toMatchObject({
      hitsplats: [
        { x: 87, y: 106 },
        { x: 72, y: 84 },
      ],
    });
    expect(counterAtAge(HITSPLAT_3_AGE, GEOM_OPPONENT)).toMatchObject({
      hitsplats: [
        { x: 72, y: 84 },
        { x: 57, y: 97 },
      ],
    });
    expect(counterAtAge(FIST_1_AGE, GEOM_OPPONENT)).toMatchObject({
      fists: [{ x: 87, y: 106 }],
    });
  });

  it("toggles the target x2 with the shared ShakeMon (5,0,25,1) sequence", () => {
    const x2 = (age: number) => counterAtAge(age, GEOM_PLAYER).targetX2;
    expect(x2(SHAKE_FIRST_AGE - 1)).toBe(0);
    expect(x2(SHAKE_FIRST_AGE)).toBe(0); // creation write is the same-frame transient
    expect(x2(SHAKE_FIRST_AGE + 2)).toBe(5);
    expect(x2(SHAKE_FIRST_AGE + 3)).toBe(5);
    expect(x2(SHAKE_FIRST_AGE + 4)).toBe(0);
    expect(x2(80)).toBe(5);
    expect(x2(81)).toBe(5);
    expect(x2(82)).toBe(0); // final toggle restores 0 and destroys
    for (let age = SHAKE_FIRST_AGE; age <= 82; age += 1) {
      expect(x2(age)).toBe(
        shakeMonOffsetAtTick(5, 0, 25, 1, age - 33).x2,
      );
    }
  });

  it("keeps blend/monbg on from setalpha to clearmonbg and reports the throw2 sounds", () => {
    const at = (age: number) => counterAtAge(age, GEOM_PLAYER);
    expect(at(SETALPHA_AGE - 1)).toMatchObject({ targetInvisible: true, blendOn: false });
    expect(at(CLEAR_AGE - 1)).toMatchObject({ targetInvisible: true, blendOn: true });
    expect(at(CLEAR_AGE)).toMatchObject({ targetInvisible: false, blendOn: false });
    expect(at(HITSPLAT_2_AGE).soundEvents).toEqual([
      { age: 39, song: "SE_M_VITAL_THROW2", pan: 63 },
    ]);
    expect(at(HITSPLAT_3_AGE).soundEvents).toEqual([
      { age: 47, song: "SE_M_VITAL_THROW2", pan: 63 },
    ]);
    expect(counterAtAge(HITSPLAT_1_AGE, GEOM_OPPONENT).soundEvents[0])
      .toMatchObject({ pan: -63 });
    expect(counterAtAge(SETALPHA_AGE, GEOM_OPPONENT).soundEvents[0])
      .toMatchObject({ pan: 63 });
  });

  it("exposes the same reducer through the Scene-ON presentation seam", () => {
    const state = createSceneOnMovePresentation({
      move: "COUNTER",
      attacker: {
        species: "HITMONTOP",
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
          animationCenter: GEOM_PLAYER.targetCenter,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 167,
        playerMaxHp: 175,
        opponentHp: 142,
        opponentMaxHp: 142,
      },
    });
    const view = sceneOnCounterView({ ...state, age: 53 });
    expect(view).toMatchObject({
      age: 53,
      attackerX2: 20,
      attackerY2: 0,
      targetInvisible: true,
      blendOn: true,
      targetX2: 5,
    });
    expect(view.hitsplats).toHaveLength(1);
    expect(view.fists).toHaveLength(1);
  });
});
