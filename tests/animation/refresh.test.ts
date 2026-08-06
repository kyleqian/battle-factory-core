import { describe, expect, it } from "vitest";
import {
  REFRESH_BLEND_START_AGE,
  REFRESH_FRAME_COUNT,
  REFRESH_GRANTING_STAR_STARTS,
  REFRESH_MASK_LAST_AGE,
  REFRESH_RING_LAST_AGE,
  refreshAtAge,
  refreshBlendCoeffAtAge,
  refreshDisplayedBlendCoeffAtAge,
} from "../../src/animation/refresh.ts";
import { SYNTHESIS_GRANTING_STAR_DURATION } from "../../src/animation/synthesis.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRefreshView,
  type SceneOnRefreshConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const playerCenter = { x: 72, y: 99 };
const opponentCenter = { x: 176, y: 42 };

describe("MOVE_REFRESH source-relative reducer", () => {
  it("ports the StatusClearedEffect scrolling BG1 mask through its display window", () => {
    const maskAt = (age: number) => refreshAtAge(
      age, "player", playerCenter,
    ).mask;
    expect(maskAt(6)).toEqual({ active: false, scrollY: 0, eva: 0, evb: 16 });
    expect(maskAt(7)).toEqual({ active: true, scrollY: 0, eva: 0, evb: 16 });
    expect(maskAt(9)).toEqual({ active: true, scrollY: 1, eva: 0, evb: 16 });
    expect(maskAt(10)).toEqual({ active: true, scrollY: 3, eva: 0, evb: 16 });
    expect(maskAt(60)).toMatchObject({ scrollY: 84, eva: 10, evb: 6 });
    expect(maskAt(98)).toMatchObject({ scrollY: 146, eva: 0, evb: 16 });
    expect(maskAt(99)).toEqual({ active: true, scrollY: 146, eva: 0, evb: 16 });
    expect(maskAt(100)).toEqual({ active: false, scrollY: 0, eva: 0, evb: 16 });
    expect(REFRESH_MASK_LAST_AGE).toBe(99);
  });

  it("spawns both GrantingStars on the delay-8 interpreter boundary and mirrors only x", () => {
    const player = (age: number) => refreshAtAge(
      age, "player", playerCenter,
    ).stars;
    expect(player(100)).toEqual([]);
    expect(player(101)).toEqual([
      { spawnIndex: 0, oamSlot: 3, x: 57, y: 99, frame: 0 },
    ]);
    expect(player(111)).toEqual([
      { spawnIndex: 0, oamSlot: 3, x: 57, y: 100, frame: 1 },
      { spawnIndex: 1, oamSlot: 4, x: 84, y: 94, frame: 0 },
    ]);
    expect(player(171).map((star) => star.spawnIndex)).toEqual([1]);
    expect(player(172)).toEqual([]);
    const opponent = refreshAtAge(111, "opponent", opponentCenter).stars;
    expect(opponent[0]!.x - opponentCenter.x).toBe(-(57 - playerCenter.x));
    expect(opponent[0]!.y - opponentCenter.y).toBe(100 - playerCenter.y);
    expect(REFRESH_GRANTING_STAR_STARTS).toEqual([101, 111]);
    expect(SYNTHESIS_GRANTING_STAR_DURATION).toBe(60);
  });

  it("fades BG banks on five-frame steps and the attacking OBJ bank one frame later", () => {
    expect(REFRESH_BLEND_START_AGE).toBe(173);
    expect(refreshBlendCoeffAtAge(172, "bg")).toBe(0);
    expect(refreshBlendCoeffAtAge(173, "bg")).toBe(10);
    expect(refreshBlendCoeffAtAge(177, "bg")).toBe(8);
    expect(refreshBlendCoeffAtAge(198, "bg")).toBe(0);
    expect(refreshBlendCoeffAtAge(173, "attacker")).toBe(10);
    expect(refreshBlendCoeffAtAge(178, "attacker")).toBe(8);
    expect(refreshBlendCoeffAtAge(199, "attacker")).toBe(0);
  });

  it("latches the displayed palette blend with BG immediacy and OBJ one-frame lag", () => {
    expect(refreshDisplayedBlendCoeffAtAge(172, "bg")).toBe(0);
    expect(refreshDisplayedBlendCoeffAtAge(173, "bg")).toBe(10);
    expect(refreshDisplayedBlendCoeffAtAge(177, "bg")).toBe(10);
    expect(refreshDisplayedBlendCoeffAtAge(178, "bg")).toBe(8);
    expect(refreshDisplayedBlendCoeffAtAge(198, "bg")).toBe(0);
    expect(refreshDisplayedBlendCoeffAtAge(173, "attacker")).toBe(0);
    expect(refreshDisplayedBlendCoeffAtAge(174, "attacker")).toBe(10);
    expect(refreshDisplayedBlendCoeffAtAge(179, "attacker")).toBe(8);
    expect(refreshDisplayedBlendCoeffAtAge(199, "attacker")).toBe(0);
  });

  it("replays the MILK_DRINK thin-ring expansion and clean teardown", () => {
    const ringAt = (age: number) => refreshAtAge(
      age, "player", playerCenter,
    ).ring;
    expect(ringAt(172)).toBeNull();
    expect(ringAt(173)).toEqual({ x: 72, y: 99, matrixScale: 2048 });
    expect(ringAt(202)).toMatchObject({ matrixScale: 132 });
    expect(ringAt(203)).toMatchObject({ matrixScale: 132 });
    expect(ringAt(204)).toBeNull();
    expect(REFRESH_RING_LAST_AGE).toBe(203);
  });

  it("tracks visual entities through first inactive cleanup", () => {
    expect(REFRESH_FRAME_COUNT).toBe(209);
    expect(refreshAtAge(0, "player", playerCenter)).toMatchObject({
      active: true,
      visualTaskCount: 0,
      stars: [],
      ring: null,
    });
    expect(refreshAtAge(60, "player", playerCenter).visualTaskCount).toBe(1);
    expect(refreshAtAge(120, "player", playerCenter).visualTaskCount).toBe(2);
    expect(refreshAtAge(180, "player", playerCenter).visualTaskCount).toBe(2);
    expect(refreshAtAge(207, "player", playerCenter)).toMatchObject({
      active: true,
      stars: [],
      ring: null,
    });
    expect(refreshAtAge(208, "player", playerCenter).active).toBe(false);
  });

  it("exposes only immutable presentation geometry through the typed seam", () => {
    const config: SceneOnRefreshConfig = {
      move: "REFRESH",
      attacker: {
        species: "CHANSEY",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 59 },
          animationCenter: playerCenter,
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: opponentCenter,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 325,
        playerMaxHp: 325,
        opponentHp: 142,
        opponentMaxHp: 142,
        playerGender: "female",
        opponentGender: "male",
      },
    };
    const stage = createSceneOnMovePresentation(config);
    const view = sceneOnRefreshView({ ...stage, age: 111 });
    expect(view).toMatchObject({
      age: 111,
      attacker: { species: "CHANSEY" },
      target: { species: "ONIX" },
      active: true,
    });
    expect(view.stars).toEqual([
      { spawnIndex: 0, oamSlot: 3, x: 57, y: 100, frame: 1 },
      { spawnIndex: 1, oamSlot: 4, x: 84, y: 94, frame: 0 },
    ]);
    expect("cured" in view).toBe(false);
    expect("damage" in view).toBe(false);
  });
});
