/**
 * The census battle of a seed (fop1, docs/fop1-first-opponent-order.md "The census keeps its battles").
 *
 * The animation / timing census (generatedCommandAnimationReplay.ts and its siblings, the route searches, and the tests that pin their
 * routes) indexes ordinary legal Factory battles by (seed, streak). Until fop1 each was built with the orchestrator's `generateInitial`
 * round, whose deal drew the six rentals (set ids, then personalities) and rolled the first opponent from the cursor after them. The
 * census fixtures, route pins and the ROM receipts measured on those battles are keyed by them. fop1 moved a real deal's first opponent
 * to the ROM's order (set ids, opponent, personalities: src/engine's `generateFactoryRoundDeal`), which re-rolls the battle of every
 * seed. The census keeps its catalogue instead: the same six rentals from the seed (`generateInitialFactoryRentals`, set ids then
 * personalities), then the round built from those records with the cursor after them, where the orchestrator rolls the first opponent
 * exactly as the old deal did. Same parties, same RNG, same battle; but not the deal a player gets from that seed, and not a claim about
 * it (the deal's order is pinned by tests/fop1FirstOpponentOrder.test.ts on production paths).
 *
 * Differences from the old `generateInitial` state, none of them read by a battle: `initialRentalGeneration` is null (use `rentals`
 * below), the rentals' draws are not in `rngSegments` / `facilityRngCalls` (they start at the opponent's roll), and `config.rentals` is
 * `currentRecords`.
 */
import type { FactoryRentalParty, FactoryRentalRecord } from "../../src/engine/battleScenario.ts";
import {
  generateInitialFactoryRentals,
  type FactoryInitialRentalGenerationResult,
} from "../../src/engine/factoryRentalGeneration.ts";
import type { FactoryRoundBattleOrchestratorConfig } from "../../src/engine/factoryRoundBattleOrchestrator.ts";

export const CENSUS_PLAYER_TRAINER_ID = 416_049_562;

export type CensusDealInput = Readonly<{
  seed: number;
  factoryWinStreak?: number;
  rentsCount?: number;
  playerTrainerId?: number;
  selectedRentalIndexes?: readonly [number, number, number];
  /** opl: "open" = an Open Level census battle (src/engine/factoryLevelMode.ts); absent = Level 50 (unchanged). */
  lvlMode?: "50" | "open";
}>;

/** The census seed's six rentals: `generateInitialFactoryRentals` from the seed (set ids, then personalities back to back). */
export function censusRentals(input: CensusDealInput): FactoryInitialRentalGenerationResult {
  return generateInitialFactoryRentals({
    rngValue: input.seed,
    factoryWinStreak: input.factoryWinStreak ?? 0,
    rentsCount: input.rentsCount ?? 0,
    playerTrainerId: input.playerTrainerId ?? CENSUS_PLAYER_TRAINER_ID,
    ...(input.lvlMode === "open" ? { lvlMode: "open" as const } : {}),
  });
}

/**
 * The `rngValue` and `rentals` of the census seed's round config: the selected three and the six as current records, the cursor after
 * the six personalities (the orchestrator rolls the first opponent from it). Spread it over a config in place of
 * `rngValue: seed, rentals: { type: "generateInitial", selectedRentalIndexes }`.
 */
export function censusDeal(input: CensusDealInput): Pick<FactoryRoundBattleOrchestratorConfig, "rngValue" | "rentals"> {
  const generation = censusRentals(input);
  const selected = input.selectedRentalIndexes ?? [0, 1, 2];
  if (new Set(selected).size !== 3 || selected.some((index) => !Number.isInteger(index) || index < 0 || index > 5)) {
    throw new Error(`census deal: selectedRentalIndexes must be three distinct slots 0..5, got ${selected.join(",")}`);
  }
  const records = generation.rentals as unknown as readonly FactoryRentalRecord[];
  return Object.freeze({
    rngValue: generation.rngValue,
    rentals: Object.freeze({
      type: "currentRecords" as const,
      playerRentalRecords: selected.map((index) => records[index]!) as unknown as FactoryRentalParty,
      savedRentalRecords: records as unknown as readonly [
        FactoryRentalRecord, FactoryRentalRecord, FactoryRentalRecord,
        FactoryRentalRecord, FactoryRentalRecord, FactoryRentalRecord,
      ],
    }),
  });
}
