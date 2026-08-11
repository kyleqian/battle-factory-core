import { describe, expect, it } from "vitest";
import {
  tormentAtAge,
  tormentBubbleSpawnAges,
  tormentAttackerScaleAtAge,
  tormentY2FromScale,
  TORMENT_FIRST_BUBBLE_AGE,
  TORMENT_LAST_TASK_AGE,
  TORMENT_BLEND_FIRST_AGE,
  TORMENT_BLEND_LAST_AGE,
  TORMENT_FIRST_ANGER_AGE,
  TORMENT_SECOND_ANGER_AGE,
} from "../../src/animation/torment.ts";

const ORIGIN = { x: 72, y: 97 };
const TARGET = { x: 176, y: 42 };

describe("tormentAtAge task lifecycle", () => {
  it("runs the step task ages 7-134 and clears at 135", () => {
    expect(tormentAtAge(0, ORIGIN, 48, "opponent", TARGET).visualTaskCount).toBe(0);
    expect(tormentAtAge(TORMENT_FIRST_BUBBLE_AGE, ORIGIN, 48, "opponent", TARGET).visualTaskCount).toBe(1);
    expect(tormentAtAge(TORMENT_LAST_TASK_AGE, ORIGIN, 48, "opponent", TARGET).visualTaskCount).toBe(1);
    expect(tormentAtAge(TORMENT_LAST_TASK_AGE + 1, ORIGIN, 48, "opponent", TARGET).visualTaskCount).toBe(0);
  });

  it("spawns six bubbles at ages 7/32/57/72/87/102 with subpriorities 6..1 and alternating hFlip", () => {
    expect(tormentBubbleSpawnAges()).toEqual([7, 32, 57, 72, 87, 102]);
    const bubbles = tormentAtAge(102, ORIGIN, 48, "opponent", TARGET).bubbles;
    expect(bubbles.map((b) => b.subpriority)).toEqual([6, 5, 4, 3, 2, 1]);
    expect(bubbles.map((b) => b.hFlip)).toEqual([false, true, false, true, false, true]);
  });

  it("places bubbles at X_2 ± 32/26/20 and Y_PIC − 20/20/26/26/32/32", () => {
    const state = tormentAtAge(102, ORIGIN, 48, "opponent", TARGET);
    expect(state.bubbles.map((b) => [b.x, b.y])).toEqual([
      [104, 77], [40, 77], [98, 71], [46, 71], [92, 65], [52, 65],
    ]);
    const front = tormentAtAge(102, { x: 176, y: 51 }, 40, "player", TARGET);
    expect(front.bubbles.map((b) => [b.x, b.y])).toEqual([
      [208, 31], [144, 31], [202, 25], [150, 25], [196, 19], [156, 19],
    ]);
  });

  it("keeps all six bubbles alive through the last task age", () => {
    expect(tormentAtAge(TORMENT_LAST_TASK_AGE, ORIGIN, 48, "opponent", TARGET).bubbles).toHaveLength(6);
    expect(tormentAtAge(TORMENT_LAST_TASK_AGE + 1, ORIGIN, 48, "opponent", TARGET).bubbles).toHaveLength(0);
  });
});

describe("tormentAttackerScaleAtAge wobble", () => {
  it("runs the 12-tick sAffineAnims_Torment series after each bubble", () => {
    const expected = [
      [244, 264], [232, 272], [220, 280], [208, 288],
      [228, 268], [248, 248], [268, 228], [288, 208],
      [280, 220], [272, 232], [264, 244], [256, 256],
    ] as const;
    for (let tick = 1; tick <= 12; tick += 1) {
      const scale = tormentAttackerScaleAtAge(TORMENT_FIRST_BUBBLE_AGE + tick);
      expect([scale.x, scale.y]).toEqual([...expected[tick - 1]!]);
    }
    expect(tormentAttackerScaleAtAge(TORMENT_FIRST_BUBBLE_AGE)).toEqual({ x: 256, y: 256 });
    expect(tormentAttackerScaleAtAge(TORMENT_FIRST_BUBBLE_AGE + 13)).toEqual({ x: 256, y: 256 });
  });

  it("restarts the wobble for the fifth bubble and y2 uses the MURKROW var (48 back / 42 front)", () => {
    const second = tormentAtAge(103, ORIGIN, 48, "opponent", TARGET);
    expect([second.attackerScale.x, second.attackerScale.y]).toEqual([244, 264]);
    expect(second.attackerY2).toBe(1);
    expect(tormentY2FromScale(288, 48)).toBe(3);
    expect(tormentY2FromScale(208, 48)).toBe(-5);
    expect(tormentY2FromScale(288, 42)).toBe(2);
    expect(tormentY2FromScale(208, 42)).toBe(-4);
    expect(tormentY2FromScale(244, 42)).toBe(-1);
  });
});

describe("tormentAtAge anger marks and target blend", () => {
  it("runs BlendMonInAndOut ages 136-154 (coeff 1..10 then 9..1)", () => {
    expect(tormentAtAge(TORMENT_BLEND_FIRST_AGE - 1, ORIGIN, 48, "opponent", TARGET).blendCoeff).toBe(0);
    expect(tormentAtAge(TORMENT_BLEND_FIRST_AGE, ORIGIN, 48, "opponent", TARGET).blendCoeff).toBe(1);
    expect(tormentAtAge(TORMENT_BLEND_FIRST_AGE + 9, ORIGIN, 48, "opponent", TARGET).blendCoeff).toBe(10);
    expect(tormentAtAge(TORMENT_BLEND_FIRST_AGE + 10, ORIGIN, 48, "opponent", TARGET).blendCoeff).toBe(9);
    expect(tormentAtAge(TORMENT_BLEND_LAST_AGE, ORIGIN, 48, "opponent", TARGET).blendCoeff).toBe(1);
    expect(tormentAtAge(TORMENT_BLEND_LAST_AGE + 1, ORIGIN, 48, "opponent", TARGET).blendCoeff).toBe(0);
  });

  it("spawns anger marks ages 136 and 158 at ±20 on the target picture", () => {
    const first = tormentAtAge(TORMENT_FIRST_ANGER_AGE, ORIGIN, 48, "opponent", TARGET);
    expect(first.angerMarks.map((m) => [m.x, m.y])).toEqual([[196, 14]]);
    const both = tormentAtAge(TORMENT_SECOND_ANGER_AGE, ORIGIN, 48, "opponent", TARGET);
    expect(both.angerMarks.map((m) => [m.x, m.y])).toEqual([[156, 14]]);
    const playerTarget = tormentAtAge(TORMENT_FIRST_ANGER_AGE, ORIGIN, 48, "player", { x: 72, y: 88 });
    expect(playerTarget.angerMarks.map((m) => [m.x, m.y])).toEqual([[52, 60]]);
  });

  it("counts the blend task and anger marks in visualTaskCount", () => {
    expect(tormentAtAge(TORMENT_BLEND_FIRST_AGE, ORIGIN, 48, "opponent", TARGET).visualTaskCount).toBe(2);
    expect(tormentAtAge(TORMENT_FIRST_ANGER_AGE + 17, ORIGIN, 48, "opponent", TARGET).visualTaskCount).toBe(1);
    expect(tormentAtAge(TORMENT_SECOND_ANGER_AGE, ORIGIN, 48, "opponent", TARGET).visualTaskCount).toBe(1);
    expect(tormentAtAge(TORMENT_SECOND_ANGER_AGE + 17, ORIGIN, 48, "opponent", TARGET).visualTaskCount).toBe(0);
  });

  it("grows each bubble 0,1,2,3 then holds the full cloud, and the state-4 replay (reversed) displays from 127", () => {
    const origin = { x: 72, y: 97 };
    expect(tormentAtAge(7, origin, 48, "opponent", TARGET).bubbles[0]!.frame).toBe(0);
    expect(tormentAtAge(9, origin, 48, "opponent", TARGET).bubbles[0]!.frame).toBe(1);
    expect(tormentAtAge(11, origin, 48, "opponent", TARGET).bubbles[0]!.frame).toBe(2);
    expect(tormentAtAge(13, origin, 48, "opponent", TARGET).bubbles[0]!.frame).toBe(3);
    expect(tormentAtAge(126, origin, 48, "opponent", TARGET).bubbles[0]!.frame).toBe(3);
    expect(tormentAtAge(127, origin, 48, "opponent", TARGET).bubbles[0]!.frame).toBe(2);
    expect(tormentAtAge(129, origin, 48, "opponent", TARGET).bubbles[0]!.frame).toBe(1);
    expect(tormentAtAge(131, origin, 48, "opponent", TARGET).bubbles[0]!.frame).toBe(0);
  });
});
