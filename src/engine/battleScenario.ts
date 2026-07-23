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

export interface BattleOpponent {
  readonly id: string;
  readonly trainerName: string;
  readonly party: BattleParty;
}

/**
 * A deterministic round fixture. `opponentSelectionInputs` are already-drawn
 * inputs (from a seeded generator, source-derived fixture, or test); selecting
 * an opponent consumes no RNG inside the round controller.
 */
export interface BattleScenario {
  readonly id: string;
  readonly playerParty: BattleParty;
  readonly opponentPool: readonly BattleOpponent[];
  readonly opponentSelectionInputs: readonly number[];
  readonly initialRngValue: number;
}

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

function cloneOpponent(opponent: BattleOpponent): BattleOpponent {
  return { ...opponent, party: cloneBattleParty(opponent.party) };
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

export function prepareBattleScenario(scenario: BattleScenario): {
  readonly id: string;
  readonly playerParty: BattleParty;
  readonly opponents: ReturnType<typeof selectRoundOpponents>;
  readonly initialRngValue: number;
} {
  assertNonempty(scenario.id, "scenario.id");
  assertBattleParty(scenario.playerParty, "scenario.playerParty");
  if (!Number.isSafeInteger(scenario.initialRngValue) || scenario.initialRngValue < 0) {
    throw new Error("scenario.initialRngValue must be a non-negative safe integer");
  }
  return {
    id: scenario.id,
    playerParty: cloneBattleParty(scenario.playerParty),
    opponents: selectRoundOpponents(
      scenario.opponentPool,
      scenario.opponentSelectionInputs,
    ),
    initialRngValue: scenario.initialRngValue >>> 0,
  };
}

export function healBattleParty(party: BattleParty): BattleParty {
  return party.map((mon) => ({
    ...mon,
    hp: mon.maxHp,
    status: "none" as const,
  })) as unknown as BattleParty;
}
