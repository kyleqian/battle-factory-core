import { describe, expect, it } from "vitest";
import {
  leafBladeAtAge,
  leafBladeDisplayedOamOrderAtAge,
  leafBladeDisplayedTargetX2AtAge,
} from "../../src/animation/leafBlade.ts";
import {
  createSceneOnMovePresentation,
  sceneOnLeafBladeView,
  type SceneOnLeafBladeConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const TARGET = {
  pictureOffset: { x: 176, y: 42 },
  width: 56,
  height: 64,
  subpriority: 40,
} as const;

const player = (age: number) => leafBladeAtAge(
  age,
  "player",
  "opponent",
  TARGET,
);

describe("MOVE_LEAF_BLADE source-relative reducer", () => {
  it("ports the seven source arc states and their five-tick pause counter", () => {
    expect(player(7)).toMatchObject({
      taskState: 0,
      taskChildCount: 1,
      sprites: [
        { kind: "blade", animation: 0, x: 218, y: 3, subpriority: 39 },
        { kind: "trail", animation: 0, x: 226, y: -8, invisible: false },
      ],
    });
    expect(player(16).sprites[0]).toMatchObject({ x: 138, y: 83 });
    expect(player(17)).toMatchObject({ taskState: 0xff, taskChildCount: 11 });
    expect(player(22).taskState).toBe(0xff);
    expect(player(23).taskState).toBe(1);
    expect(player(24).sprites[0]).toMatchObject({
      kind: "blade",
      animation: 1,
      x: 138,
      y: 83,
      subpriority: 41,
    });
    expect(player(25).taskState).toBe(2);
    expect(player(115).taskState).toBe(12);
    expect(player(125).sprites.every((sprite) => sprite.kind === "trail")).toBe(true);
    expect(player(142)).toMatchObject({ taskState: 13, taskChildCount: 1 });
    expect(player(143)).toMatchObject({ taskState: null, taskChildCount: 0 });
  });

  it("derives every blinking trail from its callback counters", () => {
    const first = (age: number) => player(age).sprites.find((sprite) =>
      sprite.kind === "trail" && sprite.spawnIndex === 0
    );
    expect(first(7)).toMatchObject({ blinkCounter: 0, blinkCycles: 0, invisible: false });
    expect(first(8)).toMatchObject({ blinkCounter: 1, blinkCycles: 0, invisible: false });
    expect(first(9)).toMatchObject({ blinkCounter: 0, blinkCycles: 1, invisible: true });
    expect(first(23)).toMatchObject({ blinkCycles: 8, invisible: false });
    expect(first(24)).toMatchObject({ blinkCounter: 1, blinkCycles: 8 });
    expect(first(25)).toBeUndefined();
  });

  it("ports the script shakes, audio, monbg, cross impact, and cleanup", () => {
    expect(player(11)).toMatchObject({
      scriptOffset: 38,
      shakeTaskActive: true,
      targetOffset: { x2: -2, y2: 0 },
      visualTaskCount: 2,
      soundEvents: [{ song: "SE_M_CUT", pan: 63, player: "SE1" }],
    });
    expect(player(63).soundEvents[0]?.song).toBe("SE_M_CUT");
    expect(player(115).soundEvents[0]?.song).toBe("SE_M_CUT");
    expect(player(144)).toMatchObject({ targetMonbg: true, updateMonBgTaskActive: true });
    expect(player(147).alpha).toEqual({ eva: 12, evb: 8 });
    expect(player(161)).toMatchObject({
      scriptOffset: 126,
      shakeTaskActive: true,
      targetOffset: { x2: -8, y2: 0 },
      crossImpact: { x: 176, y: 42, remaining: 35 },
      visualTaskCount: 2,
      soundEvents: [{ song: "SE_M_LEER", pan: 63, player: "SE1" }],
    });
    expect(player(197).crossImpact).toMatchObject({
      remaining: 0,
      callback: "DestroyAnimSprite",
    });
    expect(player(199)).toMatchObject({
      alpha: null,
      clearMonBgTaskActive: true,
      updateMonBgTaskActive: true,
    });
    expect(player(223)).toMatchObject({
      active: false,
      assetsLoaded: { leaf: false, crossImpact: false },
      visualTaskCount: 0,
    });
  });

  it("ports Leaf Blade's measured split display latches and stable OAM sort", () => {
    expect([11, 12, 13, 161, 162, 163, 164, 195, 196].map((age) =>
      leafBladeDisplayedTargetX2AtAge(age, "opponent")
    )).toEqual([1, 2, -2, 0, -8, -8, 8, -8, 0]);
    const order = leafBladeDisplayedOamOrderAtAge(44, "player", "opponent", TARGET);
    expect(order.indexOf(3)).toBeLessThan(order.indexOf(16));
    expect(order.slice(0, 2)).toEqual([5, 7]);
  });

  it("keeps side geometry and target-panned audio inside the typed seam", () => {
    const stage = createSceneOnMovePresentation<SceneOnLeafBladeConfig>({
      move: "LEAF_BLADE",
      attacker: {
        species: "SCEPTILE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 8 },
          animationCenter: { x: 176, y: 40 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      targetProfile: {
        pictureOffset: { x: 72, y: 88 },
        width: 56,
        height: 64,
        subpriority: 40,
      },
      fieldProfile: {
        playerHp: 110,
        playerMaxHp: 110,
        opponentHp: 145,
        opponentMaxHp: 145,
      },
    });
    expect(sceneOnLeafBladeView({ ...stage, age: 7 })).toMatchObject({
      attacker: { species: "SCEPTILE" },
      target: { species: "ONIX" },
      sprites: [
        { kind: "blade", x: 47, y: 110 },
        { kind: "trail", x: 40, y: 120 },
      ],
    });
    expect(sceneOnLeafBladeView({ ...stage, age: 161 }).soundEvents).toEqual([
      { song: "SE_M_LEER", pan: -63, player: "SE1" },
    ]);
    expect(() => sceneOnLeafBladeView({
      ...stage,
      config: { ...stage.config, move: "CROSS_CHOP" },
    } as never)).toThrow("expected LEAF_BLADE");
  });
});
