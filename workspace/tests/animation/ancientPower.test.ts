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
  ancientPowerLiveAttackerX2AtAge,
  ancientPowerLiveTargetX2AtAge,
  ancientPowerAtAge,
  ancientPowerRockPainterOrder,
  ancientPowerRockState,
  ancientPowerRocksAtAge,
  ancientPowerShakeAtAge,
} from "../../src/animation/ancientPower.ts";
import { validateAncientPowerProbeSurface } from "../../src/animation/ancientPowerEvidence.ts";

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

  it("derives stable source OAM rank and live ShakeMon2/slide state without displayed-age paint branches", () => {
    const player = { attackerCenter: { x: 72, y: 88 }, attackerBattlePositionCenter: { x: 72, y: 80 }, attackerSide: "player" as const };
    expect(ancientPowerRocksAtAge(10, player).slice().sort((a, b) => a.oamOrder - b.oamOrder).map((rock) => rock.sourceSlot))
      .toEqual([4, 11, 10, 9, 7, 5]);
    expect(ancientPowerRocksAtAge(11, player).slice().sort((a, b) => a.oamOrder - b.oamOrder).map((rock) => rock.sourceSlot))
      .toEqual([10, 4, 11, 9, 7, 5]);
    expect(ancientPowerRockPainterOrder(ancientPowerRocksAtAge(10, player)).map((rock) => rock.sourceSlot))
      .toEqual([5, 7, 9, 10, 11, 4]);
    expect([10, 11, 12, 67, 68].map((age) => ancientPowerLiveAttackerX2AtAge(age, "player")))
      .toEqual([-1, -1, 1, -1, 0]);
    expect([72, 76, 88, 94].map((age) => ancientPowerLiveAttackerX2AtAge(age, "player")))
      .toEqual([4, 16, 13, 0]);
    expect([72, 76, 88, 94].map((age) => ancientPowerLiveAttackerX2AtAge(age, "opponent")))
      .toEqual([-4, -16, -14, -1]);
    expect([77, 78, 79, 86, 87].map(ancientPowerLiveTargetX2AtAge)).toEqual([-3, -3, 3, -3, 0]);
    expect(ancientPowerAtAge(10, player)).toMatchObject({ sourceAttackerX2: -1, sourceTargetX2: 0, attackerX2: 0 });
    expect(ancientPowerAtAge(12, player)).toMatchObject({ sourceBg3Y: -4, bg3vofs: -4, sourceMonBgActive: true });
  });

  it("fails closed when a fresh-probe reducer surface is mutated", () => {
    const expected = {
      attacker: { slot: 6, x: 72, y: 88, x2: -1, y2: 0, invisible: 0 },
      target: { slot: 8, x: 176, y: 42, x2: 1, y2: 0, invisible: 1 },
      battleBg3: { x: 0, y: -4 },
      registers: { bg3hofs: 0, bg3vofs: 508, bldcnt: 0x3f40, bldalpha: 0x080c },
      rockSpriteOrder: [10, 4, 11, 9, 7, 5],
    } as const;
    expect(validateAncientPowerProbeSurface(expected, expected)).toEqual([]);
    expect(validateAncientPowerProbeSurface({ ...expected, attacker: { ...expected.attacker, x2: 1 } }, expected))
      .toContain("attacker.x2");
    expect(validateAncientPowerProbeSurface({ ...expected, registers: { ...expected.registers, bldalpha: 0 } }, expected))
      .toContain("registers.bldalpha");
    expect(validateAncientPowerProbeSurface({ ...expected, rockSpriteOrder: [4, 10, 11, 9, 7, 5] }, expected))
      .toContain("rockSpriteOrder");
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
