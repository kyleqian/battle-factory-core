/**
 * Source-/RAM-pinned adapter for the canonical Battle Factory draft anchor.
 *
 * Battle 1's trainer and set ids were selected before the snapshot. The live
 * room path supplies only the later per-mon construction cursors and the
 * post-transition cursor used by the fresh battle.
 */

import type {
  FactoryRentalParty,
  FactoryRentalRecord,
} from "./battleScenario.ts";
import {
  adoptFactoryOpponentSchedule,
  type FactoryOpponentDrawLedgerEntry,
} from "./factoryOpponentGeneration.ts";
import {
  createFactoryRoundBattleOrchestrator,
  factoryBattleStartPresentationForState,
  type FactoryRoundBattleOrchestratorState,
} from "./factoryRoundBattleOrchestrator.ts";
import {
  CANONICAL_DESTIN_PRESENTATION,
  factoryTrainerPresentationForOpponent,
  type FactoryTrainerPresentation,
} from "./factoryTrainerPresentation.ts";

export const ANCHOR_FACTORY_METADATA = Object.freeze({
  factoryWinStreak: 0,
  battleTowerLevel50WinStreak: 0,
  rentsCount: 0,
  playerTrainerId: 416_049_562,
});

export const ANCHOR_BATTLE_1_SELECTION_RNG_VALUE = 1_172_530_733;
export const ANCHOR_BATTLE_1_SELECTION_END_RNG_VALUE = 3_145_421_632;
export const ANCHOR_BATTLE_1_SET_IDS = Object.freeze([188, 184, 135] as const);
export const ANCHOR_SAVED_RENTAL_SET_IDS = Object.freeze(
  [156, 149, 180, 153, 179, 181] as const,
);
export const ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES = Object.freeze(
  [2_074_070_560, 3_372_555_893, 1_792_028_978] as const,
);
export const ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE = 2_288_692_129;
/**
 * Battle Scene OFF RAM at the generated-route battle handoff (frame 1062 of
 * interactive-haunter-shadow-punch-off.json). From this cursor the ROM makes
 * 27 ordinary pre-command draws before BattleStartClearSetData's Random()
 * (`battle_main.c:3140`), then TryDoEventsBeforeFirstTurn makes the turn-one
 * draw (`battle_main.c:3923`). This is semantic RAM state, not presentation
 * timing; the app's approximate overworld VBlank cursor is not a substitute.
 */
export const ANCHOR_BATTLE_1_BATTLE_INIT_RNG_VALUE = 4_087_349_631;
export const ANCHOR_BATTLE_1_PRE_COMMAND_RNG_CALLS = 27;
export const ANCHOR_BATTLE_1_PERSONALITIES = Object.freeze(
  [1_094_072_807, 3_475_344_024, 3_971_699_699] as const,
);

const RANGE = Object.freeze({ start: 110, end: 199 });
const ANCHOR_SELECTION_LEDGER: readonly FactoryOpponentDrawLedgerEntry[] =
  Object.freeze([
    Object.freeze({
      position: 0, phase: "trainer-selection", purpose: "trainer-candidate",
      rngBefore: 1_172_530_733, rngAfter: 2_126_682_012, randomU16: 32_450,
      battleIndex: 0, attempt: 1, trainerId: 50, trainerOutcome: "accepted",
    }),
    Object.freeze({
      position: 1, phase: "set-selection", purpose: "set-candidate",
      rngBefore: 2_126_682_012, rngAfter: 565_474_783, randomU16: 8_628,
      battleIndex: 0, opponentIndex: 0, range: RANGE,
      candidateSetId: 188, selectionOutcome: "accepted",
    }),
    Object.freeze({
      position: 2, phase: "set-selection", purpose: "set-candidate",
      rngBefore: 565_474_783, rngAfter: 523_928_166, randomU16: 7_994,
      battleIndex: 0, opponentIndex: 1, range: RANGE,
      candidateSetId: 184, selectionOutcome: "accepted",
    }),
    Object.freeze({
      position: 3, phase: "set-selection", purpose: "set-candidate",
      rngBefore: 523_928_166, rngAfter: 3_767_073_249, randomU16: 57_480,
      battleIndex: 0, opponentIndex: 2, range: RANGE,
      candidateSetId: 170, selectionOutcome: "duplicate-item",
    }),
    Object.freeze({
      position: 4, phase: "set-selection", purpose: "set-candidate",
      rngBefore: 3_767_073_249, rngAfter: 3_145_421_632, randomU16: 47_995,
      battleIndex: 0, opponentIndex: 2, range: RANGE,
      candidateSetId: 135, selectionOutcome: "accepted",
    }),
  ]);

export type FactoryAnchorSessionInput = Readonly<{
  playerRentalRecords: FactoryRentalParty;
  savedRentalRecords: readonly FactoryRentalRecord[];
  roomTrainer: FactoryTrainerPresentation;
  constructionRngValues: readonly [number, number, number];
  freshBattleRngValue: number;
}>;

export function createFactoryAnchorSession(
  input: FactoryAnchorSessionInput,
): FactoryRoundBattleOrchestratorState {
  if (
    input.savedRentalRecords.length !== 6
    || input.savedRentalRecords.some(
      (record, index) => record.setId !== ANCHOR_SAVED_RENTAL_SET_IDS[index],
    )
  ) {
    throw new Error("anchor session saved rentals do not match the source/RAM schedule");
  }
  if (
    input.playerRentalRecords.some(
      (record) => record.otId !== ANCHOR_FACTORY_METADATA.playerTrainerId,
    )
  ) {
    throw new Error("anchor drafted party does not share the pinned player trainer id");
  }
  if (input.roomTrainer.trainerId !== CANONICAL_DESTIN_PRESENTATION.trainerId) {
    throw new Error(
      `anchor room trainer ${input.roomTrainer.trainerId} does not match generated opponent 50`,
    );
  }
  const generation = adoptFactoryOpponentSchedule({
    factoryWinStreak: ANCHOR_FACTORY_METADATA.factoryWinStreak,
    battleIndex: 0,
    storedTrainerIds: [],
    savedRentalSetIds: ANCHOR_SAVED_RENTAL_SET_IDS,
    playerTrainerId: ANCHOR_FACTORY_METADATA.playerTrainerId,
    battleTowerLevel50WinStreak:
      ANCHOR_FACTORY_METADATA.battleTowerLevel50WinStreak,
    trainerId: 50,
    setIds: ANCHOR_BATTLE_1_SET_IDS,
    selectionDrawLedger: ANCHOR_SELECTION_LEDGER,
    constructionRngValues: input.constructionRngValues,
  });
  const state = createFactoryRoundBattleOrchestrator({
    id: "interactive-anchor-factory-round",
    rngValue: ANCHOR_BATTLE_1_SELECTION_RNG_VALUE,
    factoryWinStreak: ANCHOR_FACTORY_METADATA.factoryWinStreak,
    playerTrainerId: ANCHOR_FACTORY_METADATA.playerTrainerId,
    battleTowerLevel50WinStreak:
      ANCHOR_FACTORY_METADATA.battleTowerLevel50WinStreak,
    facilityState: { rentsCount: ANCHOR_FACTORY_METADATA.rentsCount },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: input.playerRentalRecords,
      savedRentalRecords: input.savedRentalRecords as [
        FactoryRentalRecord, FactoryRentalRecord, FactoryRentalRecord,
        FactoryRentalRecord, FactoryRentalRecord, FactoryRentalRecord,
      ],
    },
    adoptedInitialOpponent: {
      generation,
      freshBattleRngValue: input.freshBattleRngValue,
      preCommandRngCalls: ANCHOR_BATTLE_1_PRE_COMMAND_RNG_CALLS,
    },
  });
  const roundTrainer = factoryTrainerPresentationForOpponent(
    state.round.rules.currentOpponent,
  );
  const introTrainer = factoryBattleStartPresentationForState(state)?.opponentTrainer;
  if (
    roundTrainer === null
    || roundTrainer.trainerId !== input.roomTrainer.trainerId
    || introTrainer?.trainerId !== input.roomTrainer.trainerId
    || generation.trainerId !== input.roomTrainer.trainerId
  ) {
    throw new Error("anchor room, intro, AI/round, and kernel trainer identities diverged");
  }
  return state;
}
