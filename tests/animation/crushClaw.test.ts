import { describe, expect, it } from "vitest";
import {
  BLEND_OFF_AGE,
  LUNGE_FIRST_STEP_AGE,
  SLASH_1_SPAWN_AGE,
  SLASH_2_SPAWN_AGE,
  crushClawAtAge,
} from "../../src/animation/crushClaw.ts";

const PLAYER = { targetCenter: { x: 176, y: 42 } };
const OPPONENT = { targetCenter: { x: 72, y: 88 } };

describe("Move_CRUSH_CLAW source-relative reducer", () => {
  it("is static before the lunge first step", () => {
    expect(crushClawAtAge(0, { ...PLAYER, attackerSide: "player", targetSide: "opponent" }))
      .toMatchObject({ attackerX2: 0, targetX2: 0, blendOn: false });
    expect(crushClawAtAge(12, { ...PLAYER, attackerSide: "player", targetSide: "opponent" }))
      .toMatchObject({ attackerX2: 0, targetX2: 0, slashes: [] });
  });

  it("marches the horizontal lunge out, holds at the peak, and returns", () => {
    const out = (age: number, side: "player" | "opponent") => crushClawAtAge(
      age,
      {
        targetCenter: side === "player" ? PLAYER.targetCenter : OPPONENT.targetCenter,
        attackerSide: side,
        targetSide: side === "player" ? "opponent" : "player",
      },
    ).attackerX2;
    // duration 6, xDelta 4: 4,8,12,16,20,24 then hold then back to 0.
    expect(out(LUNGE_FIRST_STEP_AGE, "player")).toBe(4);
    expect(out(14, "player")).toBe(8);
    expect(out(18, "player")).toBe(24);
    expect(out(19, "player")).toBe(24);
    expect(out(20, "player")).toBe(24);
    expect(out(21, "player")).toBe(20);
    expect(out(26, "player")).toBe(0);
    expect(out(27, "player")).toBe(0);
    expect(out(LUNGE_FIRST_STEP_AGE, "opponent")).toBe(-4);
    expect(out(18, "opponent")).toBe(-24);
    expect(out(21, "opponent")).toBe(-20);
    expect(out(26, "opponent")).toBe(0);
  });

  it("spawns the first claw-slash pair at age 19 and animates it through age 39", () => {
    const slashes = (age: number) => crushClawAtAge(
      age,
      { ...PLAYER, attackerSide: "player", targetSide: "opponent" },
    ).slashes;
    expect(slashes(18)).toEqual([]);
    const first = slashes(SLASH_1_SPAWN_AGE);
    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({
      spawnAge: 19, x: 166, y: 32, animation: 0, animationFrame: 0,
    });
    expect(first[1]).toMatchObject({
      spawnAge: 19, x: 166, y: 52, animation: 0, animationFrame: 0,
    });
    expect(slashes(22)).toEqual(
      slashes(22).map((s) => ({ ...s, animationFrame: 1 })),
    );
    // pair 1 reaches its final frame before the second pair spawns
    expect(slashes(32).every((s) => s.animationFrame === 4)).toBe(true);
    expect(slashes(40).filter((s) => s.animation === 0)).toEqual([]);
  });

  it("spawns the second claw-slash pair at age 33 with animation=1 and x=+10", () => {
    const slashes = (age: number) => crushClawAtAge(
      age,
      { ...PLAYER, attackerSide: "player", targetSide: "opponent" },
    ).slashes;
    expect(slashes(32)).toHaveLength(2); // only pair 1 remains
    const both = slashes(SLASH_2_SPAWN_AGE);
    expect(both).toHaveLength(4);
    const second = both.filter((s) => s.animation === 1);
    expect(second).toHaveLength(2);
    expect(second[0]).toMatchObject({
      spawnAge: 33, x: 186, y: 32, animation: 1, animationFrame: 0,
    });
    expect(second[1]).toMatchObject({
      spawnAge: 33, x: 186, y: 52, animation: 1, animationFrame: 0,
    });
    expect(slashes(53)).toEqual(slashes(53).map((s) => ({ ...s, animationFrame: 4 })));
    expect(slashes(54)).toEqual([]);
  });

  it("toggles the target x2 with ShakeMon2 (2,0,18,1) every two ages from 19 to 53", () => {
    const x2 = (age: number) => crushClawAtAge(
      age,
      { ...PLAYER, attackerSide: "player", targetSide: "opponent" },
    ).targetX2;
    expect(x2(18)).toBe(0);
    expect(x2(19)).toBe(-2);
    expect(x2(20)).toBe(-2);
    expect(x2(21)).toBe(2);
    expect(x2(22)).toBe(2);
    expect(x2(23)).toBe(-2);
    expect(x2(52)).toBe(-2);
    expect(x2(53)).toBe(0);
    expect(x2(60)).toBe(0);
  });

  it("keeps blend/monbg on from the contact body to blendoff and reports the razor-wind sound", () => {
    const at = (age: number) => crushClawAtAge(
      age,
      { ...PLAYER, attackerSide: "player", targetSide: "opponent" },
    );
    expect(at(12)).toMatchObject({ blendOn: false });
    expect(at(13)).toMatchObject({ blendOn: true, monbg: true });
    expect(at(BLEND_OFF_AGE - 1)).toMatchObject({ blendOn: true });
    expect(at(BLEND_OFF_AGE)).toMatchObject({ blendOn: false });
    expect(at(19).soundEvents).toEqual([{ age: 19, song: "SE_M_RAZOR_WIND", pan: 63 }]);
    expect(at(33).soundEvents).toEqual([{ age: 33, song: "SE_M_RAZOR_WIND", pan: 63 }]);
    expect(at(19).soundEvents[0]).toMatchObject({ pan: 63 });
    // target-side player in the mirror orientation pans the other way
    expect(crushClawAtAge(19, {
      ...OPPONENT, attackerSide: "opponent", targetSide: "player",
    }).soundEvents[0]).toMatchObject({ pan: -63 });
  });
});
