import { describe, expect, it } from "vitest";
import {
  shadowPunchAttackerX2,
  shadowPunchBackgroundBldy,
  shadowPunchBackgroundIsGhost,
  shadowPunchClonePriority,
  shadowPunchClonesAtAge,
} from "../src/engine/shadowPunch.ts";

// Ground truth: tools/probe/dump-shadowpunch-full.py, both attacker
// orientations, staged FRONTIER_MON_HAUNTER_1-vs-ONIX (mechanicLab
// overrides.parties). Fixture A: player-side HAUNTER (spriteId=6,
// moveSpeed=+8, task's own first RAM-observable tick = RAM 126). Fixture B:
// opponent-side HAUNTER (spriteId=8, moveSpeed=-8, first tick = RAM 130).
const FIXTURE_A = { spriteId: 6, moveSpeed: 8 } as const;
const FIXTURE_B = { spriteId: 8, moveSpeed: -8 } as const;

// [age]: [attackerX2, sorted clone x2s]
const EXPECTED_A: ReadonlyArray<readonly [number, readonly number[]]> = [
  [0, [-6]],
  [1, [-6, 2]],
  [2, [-6, 2, 10]],
  [3, [-6, 2, 10, 18]],
  [4, [-6, 2, 10, 18, 26]],
  [5, [-6, 2, 10, 18, 26, 34]],
  [6, [-6, 2, 10, 18, 26, 26, 34]],
  [7, [-6, 2, 10, 18, 18, 26, 26, 34]],
  [8, [2, 10, 10, 18, 18, 26, 26, 34]],
  [9, [10, 10, 18, 18, 26, 26, 34]],
  [10, [10, 18, 18, 26, 26, 34]],
  [11, [10, 18, 26, 26, 34]],
  [12, [10, 18, 26, 34]],
  [13, [10, 18, 26]],
  [14, [10, 18]],
  [15, [10]],
  [16, []],
];
const EXPECTED_A_ATTACKER_X2 = [2, 10, 18, 26, 34, 26, 18, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const EXPECTED_B: ReadonlyArray<readonly [number, readonly number[]]> = [
  [0, [-8]],
  [1, [-16, -8]],
  [2, [-24, -16, -8]],
  [3, [-32, -24, -16, -8]],
  [4, [-40, -32, -24, -16, -8]],
  [5, [-48, -40, -32, -24, -16, -8]],
  [6, [-48, -40, -40, -32, -24, -16, -8]],
  [7, [-48, -40, -40, -32, -32, -24, -16, -8]],
  [8, [-48, -40, -40, -32, -32, -24, -24, -16]],
  [9, [-48, -40, -40, -32, -32, -24, -24]],
  [10, [-48, -40, -40, -32, -32, -24]],
  [11, [-48, -40, -40, -32, -24]],
  [12, [-48, -40, -32, -24]],
  [13, [-40, -32, -24]],
  [14, [-32, -24]],
  [15, [-24]],
  [16, []],
];
const EXPECTED_B_ATTACKER_X2 = [-16, -24, -32, -40, -48, -40, -32, -24, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function sortedCloneX2s(age: number, spriteId: number, moveSpeed: number): number[] {
  return shadowPunchClonesAtAge(age, spriteId, moveSpeed).map((c) => c.x2).sort((a, b) => a - b);
}

describe("shadowPunch AnimTask_AttackerPunchWithTrace port", () => {
  it("matches the RAM-probed attacker x2 and clone positions, player-side attacker (fixture A)", () => {
    for (let age = 0; age <= 16; age += 1) {
      expect(shadowPunchAttackerX2(age, FIXTURE_A.spriteId, FIXTURE_A.moveSpeed)).toBe(
        EXPECTED_A_ATTACKER_X2[age],
      );
      const [, expectedClones] = EXPECTED_A[age]!;
      expect(sortedCloneX2s(age, FIXTURE_A.spriteId, FIXTURE_A.moveSpeed)).toEqual(expectedClones);
    }
  });

  it("matches the RAM-probed attacker x2 and clone positions, opponent-side attacker (fixture B)", () => {
    for (let age = 0; age <= 16; age += 1) {
      expect(shadowPunchAttackerX2(age, FIXTURE_B.spriteId, FIXTURE_B.moveSpeed)).toBe(
        EXPECTED_B_ATTACKER_X2[age],
      );
      const [, expectedClones] = EXPECTED_B[age]!;
      expect(sortedCloneX2s(age, FIXTURE_B.spriteId, FIXTURE_B.moveSpeed)).toEqual(expectedClones);
    }
  });

  it("is zero/empty before the task starts and settled after every clone has expired", () => {
    expect(shadowPunchAttackerX2(-1, FIXTURE_A.spriteId, FIXTURE_A.moveSpeed)).toBe(0);
    expect(shadowPunchClonesAtAge(-1, FIXTURE_A.spriteId, FIXTURE_A.moveSpeed)).toEqual([]);
    expect(shadowPunchClonesAtAge(17, FIXTURE_A.spriteId, FIXTURE_A.moveSpeed)).toEqual([]);
    expect(shadowPunchClonesAtAge(100, FIXTURE_A.spriteId, FIXTURE_A.moveSpeed)).toEqual([]);
  });

  it("picks trace priority from the attacker's own subpriority (RAM-confirmed both ways)", () => {
    expect(shadowPunchClonePriority(30)).toBe(3); // fixture A: player-side battler 0
    expect(shadowPunchClonePriority(40)).toBe(2); // fixture B: opponent-side battler 0
    expect(shadowPunchClonePriority(20)).toBe(2);
  });

  it("matches the RAM-probed fadetobg/restorebg BLDY ramp at every sampled anchor", () => {
    expect(shadowPunchBackgroundBldy(0)).toBe(0);
    expect(shadowPunchBackgroundBldy(16)).toBe(16);
    expect(shadowPunchBackgroundBldy(20)).toBe(16);
    expect(shadowPunchBackgroundBldy(21)).toBe(15);
    expect(shadowPunchBackgroundBldy(36)).toBe(0);
    expect(shadowPunchBackgroundBldy(61)).toBe(0);
    expect(shadowPunchBackgroundBldy(62)).toBe(1);
    expect(shadowPunchBackgroundBldy(63)).toBe(1);
    expect(shadowPunchBackgroundBldy(64)).toBe(1);
    expect(shadowPunchBackgroundBldy(65)).toBe(2);
    expect(shadowPunchBackgroundBldy(79)).toBe(16);
    expect(shadowPunchBackgroundBldy(83)).toBe(16);
    expect(shadowPunchBackgroundBldy(84)).toBe(15);
    expect(shadowPunchBackgroundBldy(99)).toBe(0);
    expect(shadowPunchBackgroundBldy(200)).toBe(0);
  });

  it("swaps to the BG_GHOST background once the fade-out completes and back once restorebg's own fade-out completes", () => {
    expect(shadowPunchBackgroundIsGhost(15)).toBe(false);
    expect(shadowPunchBackgroundIsGhost(16)).toBe(true);
    expect(shadowPunchBackgroundIsGhost(78)).toBe(true);
    expect(shadowPunchBackgroundIsGhost(79)).toBe(false);
  });
});
