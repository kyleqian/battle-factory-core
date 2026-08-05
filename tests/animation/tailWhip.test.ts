import { describe, expect, it } from "vitest";
import {
  TAIL_WHIP_FRAME_COUNT,
  tailWhipAtAge,
  tailWhipAttackerOffset,
} from "../../src/animation/tailWhip.ts";
import {
  createSceneOnMovePresentation,
  sceneOnTailWhipView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_TAIL_WHIP source reducer", () => {
  it("transcribes AnimTask_TranslateMonEllipticalRespectSide(12,4,2,3)", () => {
    // Battler x2/y2 passes the task -> software sprite -> OAM pipeline two
    // displays behind the dense-window index, so the reducer's displayed
    // angle is 8 * (age - 1) for ages 2..63.
    expect(tailWhipAttackerOffset(0, "player")).toEqual({ x2: 0, y2: 0 });
    expect(tailWhipAttackerOffset(1, "player")).toEqual({ x2: 0, y2: 0 });
    expect(tailWhipAttackerOffset(2, "player")).toEqual({ x2: 2, y2: 1 });
    expect(tailWhipAttackerOffset(3, "player")).toEqual({ x2: 4, y2: 1 });
    expect(tailWhipAttackerOffset(9, "player")).toEqual({ x2: 12, y2: 4 });
    expect(tailWhipAttackerOffset(17, "player")).toEqual({ x2: 0, y2: 8 });
    // Loop-1 wrap: θ=248 (age 32), then θ wraps to 0 on age 33 -> origin.
    expect(tailWhipAttackerOffset(32, "player")).toEqual({ x2: -3, y2: 1 });
    expect(tailWhipAttackerOffset(33, "player")).toEqual({ x2: 0, y2: 0 });
    // Loop-2 restarts: age 34 displays θ=8 again.
    expect(tailWhipAttackerOffset(34, "player")).toEqual({ x2: 2, y2: 1 });
    expect(tailWhipAttackerOffset(62, "player")).toEqual({ x2: -7, y2: 1 });
    // θ=240 (age 63) is the last displayed offset; the θ=248 wrap resets
    // and destroys the task before any display.
    expect(tailWhipAttackerOffset(63, "player")).toEqual({ x2: -5, y2: 1 });
    expect(tailWhipAttackerOffset(64, "player")).toEqual({ x2: 0, y2: 0 });
    expect(tailWhipAttackerOffset(76, "player")).toEqual({ x2: 0, y2: 0 });
  });

  it("mirrors the ellipse width for the opponent side (RespectSide)", () => {
    expect(tailWhipAttackerOffset(2, "opponent")).toEqual({ x2: -3, y2: 1 });
    expect(tailWhipAttackerOffset(32, "opponent")).toEqual({ x2: 2, y2: 1 });
    expect(tailWhipAttackerOffset(63, "opponent")).toEqual({ x2: 4, y2: 1 });
    expect(tailWhipAttackerOffset(33, "opponent")).toEqual({ x2: 0, y2: 0 });
  });

  it("owns the dense source window through first-inactive cleanup", () => {
    const player = tailWhipAtAge(0, "player");
    expect(player).toMatchObject({
      active: true,
      ellipseLoaded: false,
      attackerX2: 0,
      attackerY2: 0,
      scriptOffset: 0,
    });
    expect(tailWhipAtAge(1, "player")).toMatchObject({
      ellipseLoaded: true,
      attackerX2: 0,
      attackerY2: 0,
      scriptOffset: 23,
    });
    expect(tailWhipAtAge(35, "player")).toMatchObject({
      active: true,
      ellipseLoaded: true,
      scriptOffset: 23,
    });
    expect(tailWhipAtAge(62, "player")).toMatchObject({
      ellipseLoaded: true,
      scriptOffset: 23,
    });
    // Task destroyed at age 63; the script pointer only advances to
    // waitforvisualfinish (offset 24) on the following frame.
    expect(tailWhipAtAge(63, "player")).toMatchObject({
      active: true,
      ellipseLoaded: false,
      attackerX2: -5,
      attackerY2: 1,
      scriptOffset: 23,
    });
    expect(tailWhipAtAge(75, "player")).toMatchObject({
      active: true,
      ellipseLoaded: false,
      scriptOffset: 24,
    });
    expect(tailWhipAtAge(76, "player")).toMatchObject({
      active: false,
      ellipseLoaded: false,
      scriptOffset: 24,
    });
    expect(TAIL_WHIP_FRAME_COUNT).toBe(77);
  });

  it("crosses the typed seam without owning Tail Whip's Defense drop", () => {
    const attacker: SceneOnPresentationBattler = {
      species: "PONYTA",
      geometry: {
        side: "player" as const,
        spriteCorner: { x: 40, y: 57 },
        animationCenter: { x: 72, y: 89 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    };
    const target: SceneOnPresentationBattler = {
      species: "ONIX",
      geometry: {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 },
      },
    };
    const stage = createSceneOnMovePresentation({
      move: "TAIL_WHIP",
      attacker,
      target,
      fieldProfile: {
        playerHp: 143,
        playerMaxHp: 143,
        opponentHp: 117,
        opponentMaxHp: 117,
      },
    });
    const view = sceneOnTailWhipView({ ...stage, age: 35 });
    expect(view.attacker).toBe(attacker);
    expect(view.target).toBe(target);
    expect(view.attackerX2).toBe(tailWhipAtAge(35, "player").attackerX2);
    expect(view.attackerY2).toBe(tailWhipAtAge(35, "player").attackerY2);
  });
});
