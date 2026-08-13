import { describe, expect, it } from "vitest";
import animationComponents from "../../src/data/gen/battle-animation-components.json" with { type: "json" };
import {
  ANCIENT_POWER_ATTACKER_SHAKE,
  ANCIENT_POWER_COMPONENTS,
  ANCIENT_POWER_ROCKS,
  ANCIENT_POWER_SLIDE_TO_OFFSET_AGE,
  ANCIENT_POWER_SLIDE_TO_ORIGINAL_AGE,
  ANCIENT_POWER_SOURCE_SET_ID,
  ANCIENT_POWER_TARGET_SHAKE,
  ancientPowerRockState,
  ancientPowerRocksAtAge,
  ancientPowerShakeAtAge,
} from "../../src/animation/ancientPower.ts";

describe("MOVE_ANCIENT_POWER source body", () => {
  it("pins the ten source rock calls and their three measured spawn groups", () => {
    expect(ANCIENT_POWER_SOURCE_SET_ID).toBe(75);
    expect(ANCIENT_POWER_ROCKS).toHaveLength(10);
    expect(ANCIENT_POWER_ROCKS.slice(0, 6).every((rock) => rock.spawnAge === 10)).toBe(true);
    expect(ANCIENT_POWER_ROCKS.slice(6, 8).every((rock) => rock.spawnAge === 22)).toBe(true);
    expect(ANCIENT_POWER_ROCKS.slice(8).every((rock) => rock.spawnAge === 34)).toBe(true);
    expect(ANCIENT_POWER_ROCKS.map(({ xOffset, terminalY, duration, animNum }) =>
      [xOffset, terminalY, duration, animNum],
    )).toEqual([
      [20, -48, 50, 2], [0, -38, 25, 5], [32, -28, 40, 3],
      [-20, -48, 50, 2], [20, -28, 60, 1], [0, -28, 30, 4],
      [15, -48, 25, 5], [-10, -42, 30, 4], [0, -42, 25, 5], [-25, -48, 30, 4],
    ]);
  });

  it("ports AnimRaiseSprite from attacker geometry with opponent-side mirroring", () => {
    const player = { attackerCenter: { x: 72, y: 88 }, attackerBattlePositionCenter: { x: 72, y: 80 }, attackerSide: "player" as const };
    const opponent = { attackerCenter: { x: 176, y: 52 }, attackerBattlePositionCenter: { x: 176, y: 40 }, attackerSide: "opponent" as const };
    expect(ancientPowerRockState(0, 10, player)).toMatchObject({ centerX: 92, centerY: 112, y2: 0 });
    expect(ancientPowerRockState(0, 11, player)).toMatchObject({ centerX: 92, centerY: 112, y2: -1 });
    expect(ancientPowerRockState(1, 10, opponent)).toMatchObject({ centerX: 176, centerY: 72, y2: -1 });
    expect(ancientPowerRockState(2, 10, opponent)).toMatchObject({ centerX: 144, centerY: 72, y2: 0 });
    expect(ancientPowerRocksAtAge(9, player)).toHaveLength(0);
    expect(ancientPowerRocksAtAge(22, player)).toHaveLength(8);
  });

  it("keeps the two ShakeMon2 call sites independent", () => {
    expect(ANCIENT_POWER_ATTACKER_SHAKE).toMatchObject({ creationAge: 10, xOffset: 1, numTimes: 30, frameDelay: 1 });
    expect(ANCIENT_POWER_TARGET_SHAKE).toMatchObject({ creationAge: 77, xOffset: 3, numTimes: 6, frameDelay: 1 });
    expect(ancientPowerShakeAtAge(10, ANCIENT_POWER_ATTACKER_SHAKE)).toEqual({ x2: 0, y2: 0 });
    expect(ancientPowerShakeAtAge(11, ANCIENT_POWER_ATTACKER_SHAKE)).toEqual({ x2: 1, y2: 0 });
    expect(ancientPowerShakeAtAge(78, ANCIENT_POWER_TARGET_SHAKE)).toEqual({ x2: 3, y2: 0 });
    expect(ANCIENT_POWER_SLIDE_TO_OFFSET_AGE).toBe(73);
    expect(ANCIENT_POWER_SLIDE_TO_ORIGINAL_AGE).toBe(89);
  });

  it("equals the complete generated Ancient Power component graph in source order", () => {
    const expected = [
      "asset:ANIM_TAG_IMPACT",
      "asset:ANIM_TAG_ROCKS",
      "sprite:gAncientPowerRockSpriteTemplate",
      "sprite:gSlideMonToOffsetSpriteTemplate",
      "sprite:gSlideMonToOriginalPosSpriteTemplate",
      "task:AnimTask_ShakeMon2",
      "visualCommand:blendoff",
      "visualCommand:clearmonbg",
      "visualCommand:create_basic_hitsplat_sprite",
      "visualCommand:monbg",
      "visualCommand:setalpha",
      "visualCommand:shake_mon_or_platform",
    ];
    const generated = animationComponents.moves.find((move) =>
      move.move === "MOVE_ANCIENT_POWER",
    );
    expect(generated).toBeDefined();
    expect(generated?.componentIds).toEqual(expected);
    expect(ANCIENT_POWER_COMPONENTS).toEqual(expected);
    expect(ANCIENT_POWER_COMPONENTS).toEqual(generated?.componentIds);
  });
});
