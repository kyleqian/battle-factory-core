import { describe, expect, it } from "vitest";
import {
  FACTORY_BATTLE_MODE_DOUBLES,
  FACTORY_BATTLE_MODE_SINGLES,
  FACTORY_LEVEL_MODE_50,
  FACTORY_LEVEL_MODE_OPEN,
  FACTORY_LEVEL_MODE_TENT,
  TRAINER_FRONTIER_BRAIN,
  selectFactoryAiMask,
  type FactoryAiMaskSelectionInput,
} from "../src/engine/factoryAiMaskSelection.ts";

const ORDINARY_TRAINER = 299;

function select(changes: Partial<FactoryAiMaskSelectionInput> = {}) {
  return selectFactoryAiMask({
    levelMode: FACTORY_LEVEL_MODE_50,
    battleMode: FACTORY_BATTLE_MODE_SINGLES,
    factoryWinStreak: 0,
    trainerOpponentId: ORDINARY_TRAINER,
    ...changes,
  });
}

describe("GetAiScriptsInBattleFactory mask selection", () => {
  it("gives Tent precedence over the Frontier Brain and does not calculate an indexed challenge", () => {
    const result = select({
      levelMode: FACTORY_LEVEL_MODE_TENT,
      factoryWinStreak: 0xffff,
      trainerOpponentId: TRAINER_FRONTIER_BRAIN,
    });

    expect(result).toMatchObject({
      mask: 0,
      receipt: {
        challengeNumber: null,
        inputs: { isFrontierBrain: true },
        branch: { order: 0, id: "tent", condition: "lvlMode == FRONTIER_LVL_TENT", mask: 0, flags: [] },
        evaluations: [{ order: 0, id: "tent", matched: true }],
      },
    });
  });

  it("gives the Frontier Brain precedence over every ordinary challenge band", () => {
    for (const factoryWinStreak of [0, 7, 14, 21, 28, 0xffff]) {
      const result = select({ factoryWinStreak, trainerOpponentId: TRAINER_FRONTIER_BRAIN });
      expect(result.mask).toBe(7);
      expect(result.receipt.branch.id).toBe("frontierBrain");
      expect(result.receipt.evaluations).toEqual([
        { order: 0, id: "tent", matched: false },
        { order: 1, id: "frontierBrain", matched: true },
      ]);
    }
  });

  it.each([
    { challenge: 0, streak: 0, mask: 0, branch: "challengeBelow2" },
    { challenge: 0, streak: 6, mask: 0, branch: "challengeBelow2" },
    { challenge: 1, streak: 7, mask: 0, branch: "challengeBelow2" },
    { challenge: 1, streak: 13, mask: 0, branch: "challengeBelow2" },
    { challenge: 2, streak: 14, mask: 1, branch: "challengeBelow4" },
    { challenge: 2, streak: 20, mask: 1, branch: "challengeBelow4" },
    { challenge: 3, streak: 21, mask: 1, branch: "challengeBelow4" },
    { challenge: 3, streak: 27, mask: 1, branch: "challengeBelow4" },
    { challenge: 4, streak: 28, mask: 7, branch: "challengeAtLeast4" },
    { challenge: 9362, streak: 0xffff, mask: 7, branch: "challengeAtLeast4" },
  ] as const)("maps streak $streak to ordinary challenge $challenge and mask $mask", ({ challenge, streak, mask, branch }) => {
    const result = select({ factoryWinStreak: streak });
    expect(result.mask).toBe(mask);
    expect(result.receipt.challengeNumber).toBe(challenge);
    expect(result.receipt.branch.id).toBe(branch);
    expect(result.receipt.frontierStagesPerChallenge).toBe(7);
    expect(result.receipt.evaluations.at(-1)).toEqual({
      order: result.receipt.branch.order,
      id: branch,
      matched: true,
    });
  });

  it("returns generated branch metadata after evaluating all five source branches in order", () => {
    const result = select({ factoryWinStreak: 28 });

    expect(result.receipt.evaluations).toEqual([
      { order: 0, id: "tent", matched: false },
      { order: 1, id: "frontierBrain", matched: false },
      { order: 2, id: "challengeBelow2", matched: false },
      { order: 3, id: "challengeBelow4", matched: false },
      { order: 4, id: "challengeAtLeast4", matched: true },
    ]);
    expect(result.receipt.branch).toMatchObject({
      order: 4,
      id: "challengeAtLeast4",
      condition: "else",
      flags: ["AI_SCRIPT_CHECK_BAD_MOVE", "AI_SCRIPT_TRY_TO_FAINT", "AI_SCRIPT_CHECK_VIABILITY"],
      mask: 7,
    });
    expect(select({ factoryWinStreak: 14 }).receipt.branch.flags).toEqual(["AI_SCRIPT_CHECK_BAD_MOVE"]);
  });

  it.each([FACTORY_LEVEL_MODE_50, FACTORY_LEVEL_MODE_OPEN] as const)(
    "uses the same source bands in level mode %s",
    (levelMode) => {
      expect(select({ levelMode, factoryWinStreak: 0 }).mask).toBe(0);
      expect(select({ levelMode, factoryWinStreak: 14 }).mask).toBe(1);
      expect(select({ levelMode, factoryWinStreak: 28 }).mask).toBe(7);
    },
  );

  it.each([FACTORY_BATTLE_MODE_SINGLES, FACTORY_BATTLE_MODE_DOUBLES] as const)(
    "accepts battle-mode index edge %s without using ambient streak state",
    (battleMode) => {
      const result = select({ battleMode, factoryWinStreak: 14 });
      expect(result.mask).toBe(1);
      expect(result.receipt.inputs.battleMode).toBe(battleMode);
    },
  );

  it.each([
    ["levelMode", -1], ["levelMode", 3], ["levelMode", 0.5],
    ["battleMode", -1], ["battleMode", 2], ["battleMode", 0.5],
    ["factoryWinStreak", -1], ["factoryWinStreak", 0x1_0000], ["factoryWinStreak", 1.5],
    ["trainerOpponentId", -1], ["trainerOpponentId", 0x1_0000], ["trainerOpponentId", 1.5],
    ["factoryWinStreak", Number.NaN], ["factoryWinStreak", Number.POSITIVE_INFINITY],
  ] as const)("rejects invalid %s value %s", (field, value) => {
    expect(() => select({ [field]: value })).toThrow(RangeError);
  });

  it("preserves caller inputs and returns deterministic deeply frozen receipts", () => {
    const input = {
      levelMode: FACTORY_LEVEL_MODE_OPEN,
      battleMode: FACTORY_BATTLE_MODE_DOUBLES,
      factoryWinStreak: 21,
      trainerOpponentId: ORDINARY_TRAINER,
    };
    const snapshot = structuredClone(input);

    const first = selectFactoryAiMask(input);
    const second = selectFactoryAiMask(input);

    expect(input).toEqual(snapshot);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.receipt.inputs).toEqual({ ...snapshot, isFrontierBrain: false });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.inputs)).toBe(true);
    expect(Object.isFrozen(first.receipt.evaluations)).toBe(true);
    expect(first.receipt.evaluations.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(first.receipt.branch)).toBe(true);
    expect(Object.isFrozen(first.receipt.branch.flags)).toBe(true);
  });
});
