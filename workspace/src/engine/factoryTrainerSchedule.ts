import policyData from "../data/gen/factory-round-policy.json" with { type: "json" };
import { randomU16 } from "./opponentGen.ts";
import type { BattleIndex } from "./battleScenario.ts";

interface TrainerRange {
  readonly start: number;
  readonly end: number;
}

const policy = policyData as {
  readonly constants: {
    readonly stagesPerChallenge: number;
    readonly trainerHistory: {
      readonly writeBattleIndexes: readonly number[];
      readonly omitFinalBattleIndex: number;
    };
  };
  readonly trainerSelection: {
    readonly normalRanges: readonly TrainerRange[];
    readonly hardRanges: readonly TrainerRange[];
    readonly hardBattleIndex: number;
    readonly afterChallengeIndex: number;
    readonly afterChallengeRangeIndex: number;
  };
};

export interface FactoryTrainerRandomDraw {
  readonly rngValue: number;
  readonly value: number;
}

/**
 * Explicit Random() port used by trainer selection. The default is the
 * source-exact Gen-3 LCG; tests may inject a scripted port to prove retry
 * behavior without hiding draws behind mutable state.
 */
export interface FactoryTrainerRngPort {
  draw(rngValue: number): FactoryTrainerRandomDraw;
}

export const GBA_FACTORY_TRAINER_RNG: FactoryTrainerRngPort = {
  draw: randomU16,
};

export interface FactoryTrainerDrawLedgerEntry {
  readonly battleIndex: BattleIndex;
  readonly attempt: number;
  readonly challenge: number;
  readonly rangeIndex: number;
  readonly rangeKind: "normal" | "hard";
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly rngBefore: number;
  readonly rngAfter: number;
  readonly raw: number;
  readonly trainerId: number;
  readonly accepted: boolean;
}

export interface FactoryTrainerSelectionResult {
  readonly trainerId: number;
  /** Source save-history state after selection (battle 6 is not written). */
  readonly storedTrainerIds: readonly number[];
  readonly rngValue: number;
  readonly drawCount: number;
  readonly ledger: readonly FactoryTrainerDrawLedgerEntry[];
}

export interface FactoryTrainerScheduleResult {
  readonly trainerIds: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  /** Six entries: GenerateOpponentMons deliberately omits battle index 6. */
  readonly storedTrainerIds: readonly number[];
  readonly rngValue: number;
  readonly drawCount: number;
  readonly ledger: readonly FactoryTrainerDrawLedgerEntry[];
}

function assertUint32(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${label} must be a uint32`);
  }
}

function assertBattleIndex(value: number): asserts value is BattleIndex {
  if (!Number.isInteger(value) || value < 0 || value >= policy.constants.stagesPerChallenge) {
    throw new Error(
      `battleIndex must be an integer in [0, ${policy.constants.stagesPerChallenge - 1}]`,
    );
  }
}

function trainerRange(
  factoryWinStreak: number,
  battleIndex: BattleIndex,
): {
  readonly challenge: number;
  readonly rangeIndex: number;
  readonly rangeKind: "normal" | "hard";
  readonly range: TrainerRange;
} {
  if (!Number.isSafeInteger(factoryWinStreak) || factoryWinStreak < 0) {
    throw new Error("factoryWinStreak must be a non-negative safe integer");
  }
  const challenge = Math.floor(factoryWinStreak / policy.constants.stagesPerChallenge);
  if (challenge > policy.trainerSelection.afterChallengeIndex) {
    const rangeIndex = policy.trainerSelection.afterChallengeRangeIndex;
    return {
      challenge,
      rangeIndex,
      rangeKind: "normal",
      range: policy.trainerSelection.normalRanges[rangeIndex]!,
    };
  }
  const rangeKind =
    battleIndex === policy.trainerSelection.hardBattleIndex ? "hard" : "normal";
  const ranges = rangeKind === "hard"
    ? policy.trainerSelection.hardRanges
    : policy.trainerSelection.normalRanges;
  return { challenge, rangeIndex: challenge, rangeKind, range: ranges[challenge]! };
}

/**
 * Ports GetRandomScaledFrontierTrainerId plus GenerateOpponentMons' trainer
 * retry/history loop. Every attempt calls Random() exactly once, including
 * rejected duplicates. Only indexes 0..5 are written to save history.
 */
export function selectFactoryTrainer(
  factoryWinStreak: number,
  battleIndexValue: number,
  storedTrainerIds: readonly number[],
  rngValue: number,
  rngPort: FactoryTrainerRngPort = GBA_FACTORY_TRAINER_RNG,
): FactoryTrainerSelectionResult {
  assertBattleIndex(battleIndexValue);
  assertUint32(rngValue, "rngValue");
  if (storedTrainerIds.length < battleIndexValue) {
    throw new Error(
      `storedTrainerIds must contain the ${battleIndexValue} prior battle selections`,
    );
  }
  const battleIndex = battleIndexValue;
  const activeHistory = storedTrainerIds.slice(0, battleIndex);
  const selectedRange = trainerRange(factoryWinStreak, battleIndex);
  const rangeSize = selectedRange.range.end - selectedRange.range.start + 1;
  const ledger: FactoryTrainerDrawLedgerEntry[] = [];
  let state = rngValue >>> 0;
  let trainerId: number;

  do {
    const rngBefore = state;
    const draw = rngPort.draw(state);
    assertUint32(draw.rngValue, "rngPort.draw(...).rngValue");
    if (!Number.isInteger(draw.value) || draw.value < 0 || draw.value > 0xffff) {
      throw new Error("rngPort.draw(...).value must be a uint16");
    }
    state = draw.rngValue >>> 0;
    trainerId = selectedRange.range.start + (draw.value % rangeSize);
    ledger.push({
      battleIndex,
      attempt: ledger.length + 1,
      challenge: selectedRange.challenge,
      rangeIndex: selectedRange.rangeIndex,
      rangeKind: selectedRange.rangeKind,
      rangeStart: selectedRange.range.start,
      rangeEnd: selectedRange.range.end,
      rngBefore,
      rngAfter: state,
      raw: draw.value,
      trainerId,
      accepted: !activeHistory.includes(trainerId),
    });
  } while (activeHistory.includes(trainerId));

  const shouldStore =
    battleIndex !== policy.constants.trainerHistory.omitFinalBattleIndex &&
    policy.constants.trainerHistory.writeBattleIndexes.includes(battleIndex);
  return {
    trainerId,
    storedTrainerIds: shouldStore
      ? [...storedTrainerIds.slice(0, battleIndex), trainerId]
      : [...storedTrainerIds],
    rngValue: state,
    drawCount: ledger.length,
    ledger,
  };
}

/** Generates the seven regular Factory trainers back-to-back from one seed. */
export function generateFactoryTrainerSchedule(
  factoryWinStreak: number,
  rngValue: number,
  rngPort: FactoryTrainerRngPort = GBA_FACTORY_TRAINER_RNG,
): FactoryTrainerScheduleResult {
  const trainerIds: number[] = [];
  const ledger: FactoryTrainerDrawLedgerEntry[] = [];
  let storedTrainerIds: readonly number[] = [];
  let state = rngValue;

  for (let battleIndex = 0; battleIndex < policy.constants.stagesPerChallenge; battleIndex += 1) {
    const selection = selectFactoryTrainer(
      factoryWinStreak,
      battleIndex,
      storedTrainerIds,
      state,
      rngPort,
    );
    trainerIds.push(selection.trainerId);
    storedTrainerIds = selection.storedTrainerIds;
    state = selection.rngValue;
    ledger.push(...selection.ledger);
  }

  return {
    trainerIds: trainerIds as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ],
    storedTrainerIds,
    rngValue: state,
    drawCount: ledger.length,
    ledger,
  };
}
