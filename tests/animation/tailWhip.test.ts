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
    // The dense window's first active frame is the loopsewithpan display
    // (no task yet); the creation frame (age 1) already shows the first
    // scheduled step θ=8, so the displayed angle is 8 * age for ages 1..62.
    expect(tailWhipAttackerOffset(0, "player")).toEqual({ x2: 0, y2: 0 });
    expect(tailWhipAttackerOffset(1, "player")).toEqual({ x2: 2, y2: 1 });
    expect(tailWhipAttackerOffset(2, "player")).toEqual({ x2: 4, y2: 1 });
    expect(tailWhipAttackerOffset(8, "player")).toEqual({ x2: 12, y2: 4 });
    expect(tailWhipAttackerOffset(16, "player")).toEqual({ x2: 0, y2: 8 });
    // Loop-1 wrap: θ=248 (age 31), then θ wraps to 0 on age 32 -> origin.
    expect(tailWhipAttackerOffset(31, "player")).toEqual({ x2: -3, y2: 1 });
    expect(tailWhipAttackerOffset(32, "player")).toEqual({ x2: 0, y2: 0 });
    // Loop-2 restarts: age 33 displays θ=8 again.
    expect(tailWhipAttackerOffset(33, "player")).toEqual({ x2: 2, y2: 1 });
    expect(tailWhipAttackerOffset(61, "player")).toEqual({ x2: -7, y2: 1 });
    // The final θ=240 (age 62) is the last displayed offset; the θ=248 wrap
    // frame (age 63) resets and destroys the task before any display.
    expect(tailWhipAttackerOffset(62, "player")).toEqual({ x2: -5, y2: 1 });
    expect(tailWhipAttackerOffset(63, "player")).toEqual({ x2: 0, y2: 0 });
    expect(tailWhipAttackerOffset(76, "player")).toEqual({ x2: 0, y2: 0 });
  });

  it("mirrors the ellipse width for the opponent side (RespectSide)", () => {
    expect(tailWhipAttackerOffset(1, "opponent")).toEqual({ x2: -3, y2: 1 });
    expect(tailWhipAttackerOffset(31, "opponent")).toEqual({ x2: 2, y2: 1 });
    expect(tailWhipAttackerOffset(62, "opponent")).toEqual({ x2: 4, y2: 1 });
    expect(tailWhipAttackerOffset(32, "opponent")).toEqual({ x2: 0, y2: 0 });
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
      attackerX2: 2,
      attackerY2: 1,
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
      attackerX2: 0,
      attackerY2: 0,
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
