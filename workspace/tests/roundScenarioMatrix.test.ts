import { describe, expect, it } from "vitest";
import type {
  BattleMon,
  BattleParty,
  BattleScenario,
  FactoryTrainerBattleScenario,
  FixtureBattleScenario,
} from "../src/engine/battleScenario.ts";
import {
  advanceRoundController,
  chooseRoundSwap,
  completeBattlePresentation,
  createRoundController,
  resolveRoundBattle,
  type RoundControllerState,
  type SwapDecision,
} from "../src/engine/roundController.ts";

type SwapIndexes = readonly [playerPartyIndex: number, opponentPartyIndex: number];

interface ScenarioMatrixCase {
  readonly name: string;
  readonly kind: "fixture" | "factory";
  readonly draftOrder: readonly [string, string, string];
  readonly selectionInputs?: readonly [number, number, number, number, number, number, number];
  readonly factoryWinStreak?: number;
  readonly initialRngValue: number;
  readonly lossAt: number | null;
  readonly swaps: Readonly<Record<number, SwapIndexes>>;
  readonly expectedOpponentIds: readonly string[];
  /**
   * Factory cases preserve the live trainer-selection RNG at battle
   * resolution, so this is a source-derived endpoint. Fixture cases instead
   * use the controlled 0xa5000000 + battleIndex endpoint below.
   */
  readonly expectedFactoryRng?: number;
  readonly expectedFactoryDraws?: number;
}

function mon(id: string, species = id.toUpperCase()): BattleMon {
  return { id, species, maxHp: 100, hp: 100, status: "none" };
}

function party(ids: readonly [string, string, string]): BattleParty {
  return [mon(ids[0]), mon(ids[1]), mon(ids[2])];
}

function fixtureScenario(testCase: ScenarioMatrixCase): FixtureBattleScenario {
  return {
    id: `matrix-${testCase.name}`,
    playerParty: party(testCase.draftOrder),
    opponentPool: Array.from({ length: 10 }, (_, index) => ({
      id: `fixture-trainer-${index}`,
      trainerName: `FIXTURE ${index}`,
      party: party([
        `fixture-${index}-lead`,
        `fixture-${index}-second`,
        `fixture-${index}-third`,
      ]),
    })),
    opponentSelectionInputs: testCase.selectionInputs!,
    initialRngValue: testCase.initialRngValue,
  };
}

function factoryScenario(testCase: ScenarioMatrixCase): FactoryTrainerBattleScenario {
  return {
    id: `matrix-${testCase.name}`,
    playerParty: party(testCase.draftOrder),
    opponentPool: Array.from({ length: 300 }, (_, trainerId) => ({
      id: `factory-trainer-${trainerId}`,
      trainerId,
      trainerName: `FACTORY ${trainerId}`,
      party: party([
        `factory-${trainerId}-lead`,
        `factory-${trainerId}-second`,
        `factory-${trainerId}-third`,
      ]),
    })),
    initialRngValue: testCase.initialRngValue,
    opponentSelectionStrategy: {
      type: "factoryTrainer",
      factoryWinStreak: testCase.factoryWinStreak!,
    },
  };
}

function acknowledgeAndAdvance(state: RoundControllerState): RoundControllerState {
  const commandId = state.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a pending presentation");
  return advanceRoundController(
    completeBattlePresentation(state, { commandId }),
  );
}

function completeSwapOffer(state: RoundControllerState): RoundControllerState {
  state = acknowledgeAndAdvance(state);
  expect(state.rules.phase).toBe("awaitingSwapDecision");
  const commandId = state.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a swap offer");
  return completeBattlePresentation(state, { commandId });
}

function buildScenario(testCase: ScenarioMatrixCase): BattleScenario {
  return testCase.kind === "fixture"
    ? fixtureScenario(testCase)
    : factoryScenario(testCase);
}

const CASES: readonly ScenarioMatrixCase[] = [
  {
    name: "ordered draft, zero-index fixture schedule, seven declines",
    kind: "fixture",
    draftOrder: ["rental-a", "rental-b", "rental-c"],
    selectionInputs: [0, 0, 0, 0, 0, 0, 0],
    initialRngValue: 0x01020304,
    lossAt: null,
    swaps: {},
    expectedOpponentIds: [0, 1, 2, 3, 4, 5, 6].map((id) => `fixture-trainer-${id}`),
  },
  {
    name: "reverse draft, repeated raw input, opening accepted swap",
    kind: "fixture",
    draftOrder: ["rental-c", "rental-b", "rental-a"],
    selectionInputs: [9, 9, 9, 9, 9, 9, 9],
    initialRngValue: 0x11121314,
    lossAt: null,
    swaps: { 0: [0, 2] },
    expectedOpponentIds: [9, 0, 2, 4, 6, 8, 3].map((id) => `fixture-trainer-${id}`),
  },
  {
    name: "rotated draft, mixed fixture schedule, two accepted swaps",
    kind: "fixture",
    draftOrder: ["rental-b", "rental-c", "rental-a"],
    selectionInputs: [3, 1, 4, 1, 5, 9, 2],
    initialRngValue: 0x21222324,
    lossAt: null,
    swaps: { 1: [2, 0], 4: [1, 1] },
    expectedOpponentIds: [3, 1, 6, 2, 9, 8, 5].map((id) => `fixture-trainer-${id}`),
  },
  {
    name: "alternate draft loses at opening battle",
    kind: "fixture",
    draftOrder: ["rental-d", "rental-a", "rental-c"],
    selectionInputs: [6, 5, 4, 3, 2, 1, 0],
    initialRngValue: 0x31323334,
    lossAt: 0,
    swaps: {},
    expectedOpponentIds: ["fixture-trainer-6"],
  },
  {
    name: "accepted lead replacement then loss at battle index 2",
    kind: "fixture",
    draftOrder: ["rental-e", "rental-b", "rental-d"],
    selectionInputs: [3, 1, 4, 1, 5, 9, 2],
    initialRngValue: 0x41424344,
    lossAt: 2,
    swaps: { 0: [0, 1] },
    expectedOpponentIds: [3, 1, 6].map((id) => `fixture-trainer-${id}`),
  },
  {
    name: "two replacements then loss at battle index 4",
    kind: "fixture",
    draftOrder: ["rental-f", "rental-e", "rental-a"],
    selectionInputs: [6, 5, 4, 3, 2, 1, 0],
    initialRngValue: 0x51525354,
    lossAt: 4,
    swaps: { 1: [1, 2], 3: [2, 0] },
    expectedOpponentIds: [6, 5, 4, 3, 2].map((id) => `fixture-trainer-${id}`),
  },
  {
    name: "six healed advances then loss at battle index 6",
    kind: "fixture",
    draftOrder: ["rental-g", "rental-c", "rental-f"],
    selectionInputs: [0, 0, 0, 0, 0, 0, 0],
    initialRngValue: 0x61626364,
    lossAt: 6,
    swaps: {},
    expectedOpponentIds: [0, 1, 2, 3, 4, 5, 6].map((id) => `fixture-trainer-${id}`),
  },
  {
    name: "large controlled inputs and three swaps complete the round",
    kind: "fixture",
    draftOrder: ["rental-h", "rental-g", "rental-b"],
    selectionInputs: [100, 200, 300, 400, 500, 600, 700],
    initialRngValue: 0x71727374,
    lossAt: null,
    swaps: { 0: [2, 2], 2: [0, 0], 5: [1, 1] },
    expectedOpponentIds: [0, 3, 6, 2, 5, 1, 4].map((id) => `fixture-trainer-${id}`),
  },
  {
    name: "source schedule challenge 0 reaches seventh win",
    kind: "factory",
    draftOrder: ["rental-onix", "rental-magby", "rental-bayleef"],
    factoryWinStreak: 0,
    initialRngValue: 0x12345678,
    lossAt: null,
    swaps: { 2: [1, 2] },
    expectedOpponentIds: [29, 26, 90, 88, 60, 67, 112].map((id) => `factory-trainer-${id}`),
    expectedFactoryRng: 2443977505,
    expectedFactoryDraws: 7,
  },
  {
    name: "source schedule challenge 1 retries and loses at index 3",
    kind: "factory",
    draftOrder: ["rental-bayleef", "rental-onix", "rental-magby"],
    factoryWinStreak: 7,
    initialRngValue: 0x0badc0de,
    lossAt: 3,
    swaps: { 1: [0, 1] },
    expectedOpponentIds: [115, 108, 83, 117].map((id) => `factory-trainer-${id}`),
    expectedFactoryRng: 1250277229,
    expectedFactoryDraws: 5,
  },
  {
    name: "source schedule challenge 2 loses after five advances",
    kind: "factory",
    draftOrder: ["rental-magby", "rental-bayleef", "rental-onix"],
    factoryWinStreak: 14,
    initialRngValue: 0x89abcdef,
    lossAt: 5,
    swaps: { 0: [2, 0], 4: [0, 2] },
    expectedOpponentIds: [107, 113, 116, 121, 128, 108].map((id) => `factory-trainer-${id}`),
    expectedFactoryRng: 608709733,
    expectedFactoryDraws: 6,
  },
  {
    name: "source schedule post-table range loses at index 1",
    kind: "factory",
    draftOrder: ["rental-k", "rental-j", "rental-i"],
    factoryWinStreak: 49,
    initialRngValue: 0x10203040,
    lossAt: 1,
    swaps: { 0: [1, 2] },
    expectedOpponentIds: [248, 272].map((id) => `factory-trainer-${id}`),
    expectedFactoryRng: 3963143594,
    expectedFactoryDraws: 2,
  },
];

describe("S9 deterministic seven-battle scenario matrix (menu detours are not exposed by the frozen RoundController API)", () => {
  it.each(CASES)("$name", (testCase) => {
    const scenario = buildScenario(testCase);
    const scenarioBefore = structuredClone(scenario);
    let state = acknowledgeAndAdvance(createRoundController(scenario));
    const seenOpponentIds: string[] = [];
    let acceptedPartyIds = [...testCase.draftOrder];

    const terminalIndex = testCase.lossAt ?? 6;
    for (let battleIndex = 0; battleIndex <= terminalIndex; battleIndex += 1) {
      expect(state.rules.phase).toBe("battleActive");
      expect(state.rules.battleIndex).toBe(battleIndex);
      expect(state.rules.currentOpponent.id).toBe(testCase.expectedOpponentIds[battleIndex]);
      seenOpponentIds.push(state.rules.currentOpponent.id);

      // Every post-win advance heals both damaged rentals and fainted swaps.
      expect(state.rules.playerParty).toEqual(
        state.rules.playerParty.map((member) => ({
          ...member,
          hp: member.maxHp,
          status: "none",
        })),
      );
      expect(state.rules.playerParty.map((member) => member.id)).toEqual(acceptedPartyIds);

      const isLoss = testCase.lossAt === battleIndex;
      const playerParty = state.rules.playerParty.map((member, index) => ({
        ...member,
        hp: 20 + battleIndex + index,
        status: index === battleIndex % 3 ? "paralysis" as const : member.status,
      })) as unknown as BattleParty;
      const opponentParty = state.rules.currentOpponent.party.map((member, index) => ({
        ...member,
        hp: 0,
        status: index === 1 ? "poison" as const : member.status,
      })) as unknown as BattleParty;
      const resolution = {
        outcome: isLoss ? "loss" as const : "win" as const,
        playerParty,
        opponentParty,
        rngValue: testCase.kind === "factory"
          ? state.rules.rngValue
          : (0xa5000000 + battleIndex) >>> 0,
      };
      const resolutionBefore = structuredClone(resolution);
      state = resolveRoundBattle(state, resolution);
      expect(resolution).toEqual(resolutionBefore);

      if (isLoss || battleIndex === 6) break;

      state = completeSwapOffer(state);
      const swap = testCase.swaps[battleIndex];
      const decision: SwapDecision = swap === undefined
        ? { type: "decline" }
        : {
          type: "accept",
          playerPartyIndex: swap[0],
          opponentPartyIndex: swap[1],
        };
      state = chooseRoundSwap(state, decision);
      if (swap === undefined) {
        expect(state.rules.lastSwap).toEqual({ type: "decline" });
      } else {
        const replacement = opponentParty[swap[1]]!;
        acceptedPartyIds[swap[0]] = replacement.id;
        expect(state.rules.lastSwap).toEqual({
          type: "accept",
          playerPartyIndex: swap[0],
          opponentPartyIndex: swap[1],
        });
        expect(state.rules.playerParty[swap[0]]).toEqual(replacement);
      }

      state = acknowledgeAndAdvance(state);
      expect(state.presentation?.command.type).toBe("battleStart");
      state = acknowledgeAndAdvance(state);
    }

    expect(scenario).toEqual(scenarioBefore);
    expect(seenOpponentIds).toEqual(testCase.expectedOpponentIds);
    expect(state.rules.opponentHistory).toEqual(seenOpponentIds);
    expect(new Set(seenOpponentIds).size).toBe(seenOpponentIds.length);
    expect(state.rules.playerParty.map((member) => member.id)).toEqual(acceptedPartyIds);
    expect(state.rules.battleIndex).toBe(terminalIndex);

    if (testCase.lossAt === null) {
      expect(state.rules.phase).toBe("roundComplete");
      expect(state.presentation?.command.type).toBe("roundCompleted");
    } else {
      expect(state.rules.phase).toBe("roundLost");
      expect(state.presentation?.command.type).toBe("roundLost");
    }

    if (testCase.kind === "factory") {
      expect(state.rules.rngValue).toBe(testCase.expectedFactoryRng);
      expect(state.opponentSelection).toMatchObject({ type: "factoryTrainer" });
      if (state.opponentSelection.type !== "factoryTrainer") {
        throw new Error("expected Factory trainer selection");
      }
      expect(state.opponentSelection.ledger).toHaveLength(testCase.expectedFactoryDraws!);
      expect(state.opponentSelection.ledger.at(-1)?.rngAfter).toBe(
        testCase.expectedFactoryRng,
      );
    } else {
      expect(state.rules.rngValue).toBe((0xa5000000 + terminalIndex) >>> 0);
      expect(state.opponentSelection).toEqual({ type: "fixture" });
    }
  });
});
