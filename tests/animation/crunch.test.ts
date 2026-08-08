import { describe, expect, it } from "vitest";
import {
  CLEAR_AGE,
  FADE_IN_AGE,
  HITSPLAT_1_AGE,
  HITSPLAT_2_AGE,
  MONBG_AGE,
  SETALPHA_AGE,
  SHAKE_1_AGE,
  SHAKE_2_AGE,
  TEETH_1_DESTROY_AGE,
  TEETH_1_SPAWN_AGE,
  TEETH_2_DESTROY_AGE,
  TEETH_2_SPAWN_AGE,
  crunchAtAge,
} from "../../src/animation/crunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCrunchView,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER = { targetCenter: { x: 176, y: 42 } };
const OPPONENT = { targetCenter: { x: 72, y: 88 } };
const GEOM_PLAYER = {
  attackerSide: "player",
  targetSide: "opponent",
  targetCenter: PLAYER.targetCenter,
} as const;
const GEOM_OPPONENT = {
  attackerSide: "opponent",
  targetSide: "player",
  targetCenter: OPPONENT.targetCenter,
} as const;

describe("Move_CRUNCH source-relative reducer", () => {
  it("is static before the fade and monbg switch-on", () => {
    expect(crunchAtAge(0, GEOM_PLAYER)).toMatchObject({
      teeth: [], hitsplats: [], targetY2: 0, monbg: false, blendOn: false,
    });
    expect(crunchAtAge(6, GEOM_PLAYER)).toMatchObject({ monbg: false, targetY2: 0 });
    expect(crunchAtAge(MONBG_AGE, GEOM_PLAYER)).toMatchObject({ monbg: true });
  });

  it("runs the BG_DARK palette fade out, dark hold, and fade back", () => {
    const fadeY = (age: number) => crunchAtAge(age, GEOM_PLAYER).fadeY;
    expect(fadeY(9)).toBe(0);
    expect(fadeY(FADE_IN_AGE)).toBe(0);
    expect(fadeY(FADE_IN_AGE + 1)).toBe(1);
    expect(fadeY(FADE_IN_AGE + 16)).toBe(16);
    expect(fadeY(FADE_IN_AGE + 17)).toBe(16);
    expect(fadeY(FADE_IN_AGE + 18)).toBe(-1);
    expect(fadeY(29)).toBe(16);
    expect(fadeY(30)).toBe(15);
    expect(fadeY(45)).toBe(0);
    expect(fadeY(100)).toBe(0);
  });

  it("marches round-1 teeth from +/-32 to the target center and back", () => {
    const teeth = (age: number) => crunchAtAge(age, GEOM_PLAYER).teeth;
    expect(teeth(TEETH_1_SPAWN_AGE - 1)).toEqual([]);
    const first = teeth(TEETH_1_SPAWN_AGE);
    expect(first).toHaveLength(2);
    // script x=-32,y=-32, animation 1 (45deg rotation), +819 fixed velocity
    expect(first[0]).toMatchObject({
      x: 144, y: 10, x2: 3, y2: 3, animation: 1,
      matrix: { a: 181, b: -181, c: 181, d: 181 },
    });
    expect(first[1]).toMatchObject({
      x: 208, y: 74, x2: -4, y2: -4, animation: 5,
      matrix: { a: -181, b: 181, c: -181, d: -181 },
    });
    // peak reach: +31/+31 and -32/-32 at step 10
    expect(teeth(57)[0]).toMatchObject({ x2: 31, y2: 31 });
    expect(teeth(57)[1]).toMatchObject({ x2: -32, y2: -32 });
    // retract on the way back
    expect(teeth(58)[0]).toMatchObject({ x2: 28, y2: 28 });
    expect(teeth(58)[1]).toMatchObject({ x2: -29, y2: -29 });
    expect(teeth(66)[0]).toMatchObject({ x2: 3, y2: 3 });
    expect(teeth(66)[1]).toMatchObject({ x2: -4, y2: -4 });
    expect(teeth(TEETH_1_DESTROY_AGE)).toEqual([]);
  });

  it("marches round-2 teeth with the mirrored offsets and 135/-45deg rotations", () => {
    const teeth = (age: number) => crunchAtAge(age, GEOM_PLAYER).teeth;
    expect(teeth(TEETH_2_SPAWN_AGE - 1)).toEqual([]);
    const second = teeth(TEETH_2_SPAWN_AGE);
    expect(second).toHaveLength(2);
    // script x=+32,y=-32, animation 7 (-45deg), -819/+819 velocity
    expect(second[0]).toMatchObject({
      x: 208, y: 10, x2: -4, y2: 3, animation: 7,
      matrix: { a: 181, b: 181, c: -181, d: 181 },
    });
    expect(second[1]).toMatchObject({
      x: 144, y: 74, x2: 3, y2: -4, animation: 3,
      matrix: { a: -181, b: -181, c: 181, d: -181 },
    });
    expect(teeth(TEETH_2_DESTROY_AGE)).toEqual([]);
  });

  it("anchors both hitsplats at the target center with the mirrored x offset", () => {
    const hits = (age: number, geom: typeof GEOM_PLAYER | typeof GEOM_OPPONENT) =>
      crunchAtAge(age, geom).hitsplats;
    // opponent-side target keeps the script offset signs
    expect(hits(HITSPLAT_1_AGE, GEOM_PLAYER)).toEqual([
      { x: 168, y: 42, animation: 1 },
    ]);
    expect(hits(HITSPLAT_2_AGE, GEOM_PLAYER)).toEqual([
      { x: 184, y: 42, animation: 1 },
    ]);
    // player-side target mirrors the offset (BODY_SLAM convention)
    expect(hits(HITSPLAT_1_AGE, GEOM_OPPONENT)).toEqual([
      { x: 80, y: 88, animation: 1 },
    ]);
    expect(hits(HITSPLAT_2_AGE, GEOM_OPPONENT)).toEqual([
      { x: 64, y: 88, animation: 1 },
    ]);
    expect(hits(HITSPLAT_1_AGE + 10, GEOM_PLAYER)).toEqual([]);
    expect(hits(HITSPLAT_2_AGE + 10, GEOM_PLAYER)).toEqual([]);
  });

  it("toggles the target y2 with ShakeMon (0,7,5,2) then (0,8,4,2)", () => {
    const y2 = (age: number) => crunchAtAge(age, GEOM_PLAYER).targetY2;
    expect(y2(SHAKE_1_AGE - 1)).toBe(0);
    // 1-frame initial block, then 3-frame blocks every 3 ages
    expect(y2(SHAKE_1_AGE)).toBe(7);
    expect(y2(SHAKE_1_AGE + 1)).toBe(0);
    expect(y2(SHAKE_1_AGE + 4)).toBe(7);
    expect(y2(SHAKE_1_AGE + 7)).toBe(0);
    expect(y2(SHAKE_1_AGE + 10)).toBe(7);
    expect(y2(SHAKE_1_AGE + 13)).toBe(0); // final toggle destroys
    expect(y2(85)).toBe(0);
    expect(y2(SHAKE_2_AGE)).toBe(8);
    expect(y2(SHAKE_2_AGE + 4)).toBe(8);
    expect(y2(SHAKE_2_AGE + 7)).toBe(0);
    expect(y2(SHAKE_2_AGE + 10)).toBe(0); // even num => net-zero final toggle
    expect(y2(100)).toBe(0);
  });

  it("keeps blend/monbg on from setalpha to clearmonbg and reports the bite sounds", () => {
    const at = (age: number) => crunchAtAge(age, GEOM_PLAYER);
    expect(at(SETALPHA_AGE - 1)).toMatchObject({ blendOn: false, monbg: true });
    expect(at(SETALPHA_AGE)).toMatchObject({ blendOn: true });
    expect(at(CLEAR_AGE - 1)).toMatchObject({ blendOn: true, monbg: true });
    expect(at(CLEAR_AGE)).toMatchObject({ blendOn: false, monbg: false });
    expect(at(TEETH_1_SPAWN_AGE).soundEvents).toEqual([
      { age: 48, song: "SE_M_BITE", pan: 63 },
    ]);
    expect(at(TEETH_2_SPAWN_AGE).soundEvents).toEqual([
      { age: 74, song: "SE_M_BITE", pan: 63 },
    ]);
    expect(crunchAtAge(TEETH_1_SPAWN_AGE, GEOM_OPPONENT).soundEvents[0])
      .toMatchObject({ pan: -63 });
  });

  it("mirrors the full body for the opponent-front orientation at the same ages", () => {
    const back = crunchAtAge(TEETH_1_SPAWN_AGE + 9, GEOM_OPPONENT);
    expect(back.teeth[0]).toMatchObject({ x: 40, y: 56, x2: 31, y2: 31 });
    expect(back.teeth[1]).toMatchObject({ x: 104, y: 120, x2: -32, y2: -32 });
    expect(crunchAtAge(HITSPLAT_1_AGE, GEOM_OPPONENT).hitsplats[0]).toMatchObject({ x: 80, y: 88 });
    expect(crunchAtAge(SHAKE_1_AGE + 4, GEOM_OPPONENT)).toMatchObject({ targetY2: 7 });
  });

  it("exposes the same reducer through the Scene-ON presentation seam", () => {
    const state = createSceneOnMovePresentation({
      move: "CRUNCH",
      attacker: {
        species: "HOUNDOUR",
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
          animationCenter: PLAYER.targetCenter,
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
    const view = sceneOnCrunchView({ ...state, age: 60 });
    expect(view).toMatchObject({
      age: 60,
      monbg: true,
      blendOn: true,
      targetY2: 7,
      fadeY: 0,
    });
    expect(view.teeth).toHaveLength(2);
    expect(view.hitsplats).toHaveLength(1);
  });
});
