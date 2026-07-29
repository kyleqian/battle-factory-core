import {
  selectFactoryTrainer,
  type FactoryTrainerDrawLedgerEntry,
} from "./factoryTrainerSchedule.ts";
import {
  createFactoryCorpusParty,
  type FactoryCorpusPartyInstance,
  type FactoryCorpusPartyMemberState,
} from "./factoryCorpusParty.ts";

export const BATTLES_PER_ROUND = 7;

export type BattleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type BattleStatus =
  | "none"
  | "sleep"
  | "poison"
  | "burn"
  | "freeze"
  | "paralysis"
  | "toxic";

export interface BattleMon {
  /** Stable identity for party replacement and battle-result validation. */
  readonly id: string;
  readonly species: string;
  readonly maxHp: number;
  readonly hp: number;
  readonly status: BattleStatus;
}

export type BattleParty = readonly [BattleMon, BattleMon, BattleMon];

/**
 * Source `RentalMon` persistence record, expressed in the names shared by
 * the corpus/rental/opponent generators. Extra generator metadata is retained
 * structurally when records are cloned.
 */
export type FactoryRentalRecord = FactoryCorpusPartyInstance;

export type FactoryRentalParty = readonly [
  FactoryRentalRecord,
  FactoryRentalRecord,
  FactoryRentalRecord,
];

export type FactoryKernelParty = readonly [
  FactoryCorpusPartyMemberState,
  FactoryCorpusPartyMemberState,
  FactoryCorpusPartyMemberState,
];

export interface BattleOpponent {
  readonly id: string;
  readonly trainerName: string;
  readonly party: BattleParty;
  /** Present for generated Factory opponents; absent on simplified fixtures. */
  readonly rentalRecords?: FactoryRentalParty;
}

/**
 * Explicit deterministic fixture ABI retained for tests and staged probes.
 * `opponentSelectionInputs` are already drawn, so this strategy consumes no
 * RNG inside the round controller.
 */
export interface FixtureBattleScenario {
  readonly id: string;
  readonly playerParty: BattleParty;
  /** Optional full-record seam used by generated Factory scenarios. */
  readonly playerRentalRecords?: FactoryRentalParty;
  readonly opponentPool: readonly BattleOpponent[];
  readonly opponentSelectionInputs: readonly number[];
  readonly initialRngValue: number;
  readonly opponentSelectionStrategy?: undefined;
}

export interface FactoryTrainerOpponent extends BattleOpponent {
  /** gBattleFrontierTrainers index selected by the Factory source routine. */
  readonly trainerId: number;
}

/**
 * Source-exact trainer-selection scenario. Opponent parties remain explicit
 * fixtures until the later opponent-mon generation increment; trainer
 * identity and RNG/history behavior are live.
 */
export interface FactoryTrainerBattleScenario {
  readonly id: string;
  readonly playerParty: BattleParty;
  /** Optional full-record seam used by generated Factory scenarios. */
  readonly playerRentalRecords?: FactoryRentalParty;
  readonly opponentPool: readonly FactoryTrainerOpponent[];
  readonly initialRngValue: number;
  readonly opponentSelectionStrategy: {
    readonly type: "factoryTrainer";
    /** Factory streak at battle index 0 (normally a multiple of seven). */
    readonly factoryWinStreak: number;
  };
}

export type BattleScenario = FixtureBattleScenario | FactoryTrainerBattleScenario;

function assertNonempty(value: string, label: string): void {
  if (value.length === 0) throw new Error(`${label} must not be empty`);
}

export function assertBattleMon(mon: BattleMon, label: string): void {
  assertNonempty(mon.id, `${label}.id`);
  assertNonempty(mon.species, `${label}.species`);
  if (!Number.isInteger(mon.maxHp) || mon.maxHp <= 0) {
    throw new Error(`${label}.maxHp must be a positive integer`);
  }
  if (!Number.isInteger(mon.hp) || mon.hp < 0 || mon.hp > mon.maxHp) {
    throw new Error(`${label}.hp must be an integer in [0, maxHp]`);
  }
}

export function assertBattleParty(party: BattleParty, label: string): void {
  if (party.length !== 3) throw new Error(`${label} must contain exactly 3 mons`);
  const ids = new Set<string>();
  party.forEach((mon, index) => {
    assertBattleMon(mon, `${label}[${index}]`);
    if (ids.has(mon.id)) throw new Error(`${label} contains duplicate mon id ${mon.id}`);
    ids.add(mon.id);
  });
}

function cloneMon(mon: BattleMon): BattleMon {
  return { ...mon };
}

export function cloneBattleParty(party: BattleParty): BattleParty {
  return [cloneMon(party[0]), cloneMon(party[1]), cloneMon(party[2])];
}

export function cloneFactoryRentalParty(records: FactoryRentalParty): FactoryRentalParty {
  return records.map((record) => ({ ...record })) as unknown as FactoryRentalParty;
}

function ppUpsFromPackedBonuses(ppBonuses: number): readonly [number, number, number, number] {
  return [0, 1, 2, 3].map(
    (moveIndex) => (ppBonuses >>> (moveIndex * 2)) & 3,
  ) as unknown as readonly [number, number, number, number];
}

/**
 * Rebuilds the source party payload from saved rental identity, then applies
 * `HealPlayerParty` and `RestorePlayerPartyHeldItems`.
 *
 * Real Factory records start with zero PP Ups, but preserving a staged
 * member's packed PP-bonus byte makes the source `CalculatePPWithBonus`
 * arithmetic explicit instead of accidentally treating current PP as max PP.
 */
export function healFactoryKernelParty(
  records: FactoryRentalParty,
  current?: FactoryKernelParty,
): FactoryKernelParty {
  const canonical = createFactoryCorpusParty(records);
  return canonical.map((member, index) => {
    const currentMember = current?.[index];
    if (
      currentMember !== undefined
      && (
        currentMember.setId !== member.setId
        || currentMember.personality !== member.personality
        || currentMember.ivs.attack !== records[index]!.fixedIv
        || currentMember.abilitySlot !== member.abilitySlot
      )
    ) {
      throw new Error(`current Factory kernel party slot ${index} does not match its rental record`);
    }
    const ppBonuses = currentMember?.ppBonuses ?? member.ppBonuses;
    const ppUps = ppUpsFromPackedBonuses(ppBonuses);
    const pp = member.pp.map((basePp, moveIndex) => (
      basePp + Math.floor(basePp * 20 * ppUps[moveIndex]! / 100)
    )) as unknown as readonly [number, number, number, number];
    return Object.freeze({
      ...member,
      hp: member.maxHP,
      status1: 0,
      item: member.item,
      pp,
      ppBonuses,
      ppUps,
    });
  }) as unknown as FactoryKernelParty;
}

export function cloneOpponent(opponent: BattleOpponent): BattleOpponent {
  return {
    ...opponent,
    party: cloneBattleParty(opponent.party),
    rentalRecords: opponent.rentalRecords === undefined
      ? undefined
      : cloneFactoryRentalParty(opponent.rentalRecords),
  };
}

function assertOpponentPool(opponentPool: readonly BattleOpponent[]): void {
  const poolIds = new Set<string>();
  opponentPool.forEach((opponent, index) => {
    assertNonempty(opponent.id, `opponentPool[${index}].id`);
    assertNonempty(opponent.trainerName, `opponentPool[${index}].trainerName`);
    assertBattleParty(opponent.party, `opponentPool[${index}].party`);
    if (poolIds.has(opponent.id)) {
      throw new Error(`opponentPool contains duplicate opponent id ${opponent.id}`);
    }
    poolIds.add(opponent.id);
  });
}

/**
 * Selects exactly seven distinct opponents. At each battle the input indexes
 * the remaining eligible pool, so a repeated raw input never repeats a
 * trainer. This is deterministic and deliberately independent of RNG state.
 */
export function selectRoundOpponents(
  opponentPool: readonly BattleOpponent[],
  selectionInputs: readonly number[],
): readonly [
  BattleOpponent,
  BattleOpponent,
  BattleOpponent,
  BattleOpponent,
  BattleOpponent,
  BattleOpponent,
  BattleOpponent,
] {
  if (opponentPool.length < BATTLES_PER_ROUND) {
    throw new Error(`opponentPool must contain at least ${BATTLES_PER_ROUND} opponents`);
  }
  if (selectionInputs.length !== BATTLES_PER_ROUND) {
    throw new Error(`opponentSelectionInputs must contain exactly ${BATTLES_PER_ROUND} values`);
  }

  assertOpponentPool(opponentPool);

  const remaining = opponentPool.map(cloneOpponent);
  const selected: BattleOpponent[] = [];
  for (const [battleIndex, input] of selectionInputs.entries()) {
    if (!Number.isSafeInteger(input) || input < 0) {
      throw new Error(`opponentSelectionInputs[${battleIndex}] must be a non-negative safe integer`);
    }
    const remainingIndex = input % remaining.length;
    selected.push(remaining.splice(remainingIndex, 1)[0]!);
  }

  return selected as [
    BattleOpponent,
    BattleOpponent,
    BattleOpponent,
    BattleOpponent,
    BattleOpponent,
    BattleOpponent,
    BattleOpponent,
  ];
}

export interface PreparedFixtureSelection {
  readonly type: "fixture";
}

export interface PreparedFactoryTrainerSelection {
  readonly type: "factoryTrainer";
  readonly factoryWinStreak: number;
  readonly opponentPool: readonly FactoryTrainerOpponent[];
  readonly storedTrainerIds: readonly number[];
  readonly ledger: readonly FactoryTrainerDrawLedgerEntry[];
}

export type PreparedOpponentSelection =
  | PreparedFixtureSelection
  | PreparedFactoryTrainerSelection;

export function prepareBattleScenario(scenario: BattleScenario): {
  readonly id: string;
  readonly playerParty: BattleParty;
  readonly playerRentalRecords: FactoryRentalParty | null;
  readonly opponents: readonly BattleOpponent[];
  readonly initialRngValue: number;
  readonly opponentSelection: PreparedOpponentSelection;
} {
  assertNonempty(scenario.id, "scenario.id");
  assertBattleParty(scenario.playerParty, "scenario.playerParty");
  if (!Number.isSafeInteger(scenario.initialRngValue) || scenario.initialRngValue < 0) {
    throw new Error("scenario.initialRngValue must be a non-negative safe integer");
  }
  if (scenario.opponentSelectionStrategy === undefined) {
    return {
      id: scenario.id,
      playerParty: cloneBattleParty(scenario.playerParty),
      playerRentalRecords: scenario.playerRentalRecords === undefined
        ? null
        : cloneFactoryRentalParty(scenario.playerRentalRecords),
      opponents: selectRoundOpponents(
        scenario.opponentPool,
        scenario.opponentSelectionInputs,
      ),
      initialRngValue: scenario.initialRngValue >>> 0,
      opponentSelection: { type: "fixture" },
    };
  }

  assertOpponentPool(scenario.opponentPool);
  const trainerIds = new Set<number>();
  const opponentPool = scenario.opponentPool.map((opponent, index) => {
    if (!Number.isInteger(opponent.trainerId) || opponent.trainerId < 0) {
      throw new Error(`opponentPool[${index}].trainerId must be a non-negative integer`);
    }
    if (trainerIds.has(opponent.trainerId)) {
      throw new Error(`opponentPool contains duplicate trainerId ${opponent.trainerId}`);
    }
    trainerIds.add(opponent.trainerId);
    return { ...cloneOpponent(opponent), trainerId: opponent.trainerId };
  });
  const firstSelection = selectFactoryTrainer(
    scenario.opponentSelectionStrategy.factoryWinStreak,
    0,
    [],
    scenario.initialRngValue,
  );
  const firstOpponent = opponentPool.find(
    (opponent) => opponent.trainerId === firstSelection.trainerId,
  );
  if (firstOpponent === undefined) {
    throw new Error(
      `opponentPool has no fixture for selected Factory trainer ${firstSelection.trainerId}`,
    );
  }
  return {
    id: scenario.id,
    playerParty: cloneBattleParty(scenario.playerParty),
    playerRentalRecords: scenario.playerRentalRecords === undefined
      ? null
      : cloneFactoryRentalParty(scenario.playerRentalRecords),
    opponents: [firstOpponent],
    initialRngValue: firstSelection.rngValue,
    opponentSelection: {
      type: "factoryTrainer",
      factoryWinStreak: scenario.opponentSelectionStrategy.factoryWinStreak,
      opponentPool,
      storedTrainerIds: firstSelection.storedTrainerIds,
      ledger: firstSelection.ledger,
    },
  };
}

export function healBattleParty(party: BattleParty): BattleParty {
  return party.map((mon) => ({
    ...mon,
    hp: mon.maxHp,
    status: "none" as const,
  })) as unknown as BattleParty;
}
