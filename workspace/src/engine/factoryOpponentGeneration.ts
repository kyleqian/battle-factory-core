/**
 * Pure Level-50 Battle Factory opponent selection and construction.
 *
 * Source order is intentionally represented one Random() call at a time:
 *
 * 1. `GenerateOpponentMons` chooses a trainer, retrying every trainer already
 *    fought in this challenge (`battle_factory.c:316-329`).
 * 2. The same call chooses three set ids from the challenge range, rejecting
 *    Unown, species present in all six saved rental records, Level-50
 *    high-tier ids, and duplicate opponent species/items (`:331-375`).
 * 3. `FillFactoryFrontierTrainerParty` later constructs those three saved
 *    set ids in slot order (`battle_tower.c:1824-1884`). Each nature-matching
 *    personality attempt is one low-word-first Random32(), or two Random()
 *    calls (`pokemon.c:2562-2593`, `include/random.h:7-16`).
 *
 * The selected trainer's ordinary Battle Frontier `monSet` is deliberately
 * not consulted. Factory `GenerateOpponentMons` samples `GetFactoryMonId`
 * directly; `FillFactoryFrontierTrainerParty` consumes `gFrontierTempParty`.
 */

import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import frontierTrainersData from "../data/gen/battle-frontier-trainers.json" with { type: "json" };
import factoryRoundPolicyData from "../data/gen/factory-round-policy.json" with { type: "json" };
import naturesData from "../data/gen/natures.json" with { type: "json" };
import {
  createFactoryCorpusPartyMember,
  type FactoryCorpusPartyInstance,
  type FactoryCorpusPartyMemberState,
} from "./factoryCorpusParty.ts";
import {
  selectFactoryTrainer,
  type FactoryTrainerDrawLedgerEntry,
} from "./factoryTrainerSchedule.ts";
import {
  getLevel50FactoryRentalRange,
} from "./factoryRentalGeneration.ts";
import { natureFromPersonality, randomU16 } from "./opponentGen.ts";

const FRONTIER_PARTY_SIZE = 3;
const SAVED_RENTAL_COUNT = 6;
const STAGES_PER_CHALLENGE = 7;

type FrontierMonRow = Readonly<{
  index: number;
  species: string;
  itemTableId: number;
  nature: string;
}>;
type HeldItemRow = Readonly<{ itemTableId: number; itemId: number }>;
type NatureRow = Readonly<{ index: number; name: string }>;
type TrainerRow = Readonly<{
  id: number;
  sourceId: string;
  name: string;
}>;
type FixedIvRow = Readonly<{ regular: number; lastBattle: number }>;

const FRONTIER_MONS = (frontierMonsData as unknown as { entries: FrontierMonRow[] }).entries;
const TRAINERS = (frontierTrainersData as unknown as { entries: TrainerRow[] }).entries;
const HELD_ITEM_BY_TABLE_ID = new Map(
  (frontierHeldItemsData as unknown as { entries: HeldItemRow[] }).entries
    .map((row) => [row.itemTableId, row.itemId]),
);
const NATURE_BY_NAME = new Map(
  (naturesData as unknown as { natures: NatureRow[] }).natures
    .map((row) => [row.name, row.index]),
);
const POLICY = factoryRoundPolicyData as unknown as {
  rentalSelection: {
    highTierLastIndex: number;
    fixedIvs: readonly FixedIvRow[];
  };
};

export type FactoryOpponentSetRejection =
  | "unown"
  | "saved-rental-species"
  | "level50-high-tier"
  | "duplicate-species"
  | "duplicate-item";

export type FactoryOpponentDrawLedgerEntry = Readonly<{
  /** Zero-based position among all source Random() calls represented here. */
  position: number;
  phase: "trainer-selection" | "set-selection" | "personality";
  purpose: "trainer-candidate" | "set-candidate" | "personality-low" | "personality-high";
  rngBefore: number;
  rngAfter: number;
  randomU16: number;
  battleIndex: number;
  attempt?: number;
  trainerId?: number;
  trainerOutcome?: "accepted" | "previously-fought";
  opponentIndex?: number;
  range?: Readonly<{ start: number; end: number }>;
  candidateSetId?: number;
  selectionOutcome?: "accepted" | FactoryOpponentSetRejection;
  personality?: number;
  personalityOutcome?: "accepted" | "wrong-nature";
}>;

export type FactoryOpponentRecord = FactoryCorpusPartyInstance & Readonly<{
  otId: number;
  speciesName: string;
  itemId: number;
  nature: number;
  selectionDrawPosition: number;
  personalityDrawPositions: readonly [number, number];
  member: FactoryCorpusPartyMemberState;
}>;

export type FactoryOpponentGenerationInput = Readonly<{
  rngValue: number;
  /** Source Factory streak used for trainer and set-id challenge ranges. */
  factoryWinStreak: number;
  /** Source current challenge battle number, 0 through 6. */
  battleIndex: number;
  /** Source trainerIds history; entries 0..battleIndex-1 are compared. */
  storedTrainerIds: readonly number[];
  /**
   * All six source rentalMons set ids. Initially these are the selectable
   * rentals; later they are the current player three plus the prior foe three.
   */
  savedRentalSetIds: readonly number[];
  /** T1_READ_32(playerTrainerId), used by the source as the opponent OT id. */
  playerTrainerId: number;
  /**
   * Retail bug input: FillFactoryFrontierTrainerParty reads the Battle
   * Tower's Level-50 streak, not the Factory streak, when choosing fixed IVs
   * (`battle_tower.c:1832-1847` without BUGFIX).
   */
  battleTowerLevel50WinStreak: number;
  /**
   * Optional cursor at FillFactoryFrontierTrainerParty. In the ROM, room and
   * battle presentation can separate set selection from construction.
   */
  constructionRngValue?: number;
}>;

export type FactoryOpponentGenerationResult = Readonly<{
  challengeNum: number;
  trainerId: number;
  trainerSourceId: string;
  trainerName: string;
  storedTrainerIds: readonly number[];
  fixedIv: number;
  opponents: readonly [
    FactoryOpponentRecord,
    FactoryOpponentRecord,
    FactoryOpponentRecord,
  ];
  party: readonly [
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
  ];
  /** Cursor immediately after trainer and three set ids are accepted. */
  selectionRngValue: number;
  /** Cursor immediately after all three personalities are accepted. */
  rngValue: number;
  drawLedger: readonly FactoryOpponentDrawLedgerEntry[];
}>;

export type FactoryAdoptedOpponentScheduleInput = Readonly<{
  factoryWinStreak: number;
  battleIndex: number;
  storedTrainerIds: readonly number[];
  savedRentalSetIds: readonly number[];
  playerTrainerId: number;
  battleTowerLevel50WinStreak: number;
  trainerId: number;
  setIds: readonly [number, number, number];
  selectionDrawLedger: readonly FactoryOpponentDrawLedgerEntry[];
  /** Live source cursors immediately before each mon's personality loop. */
  constructionRngValues: readonly [number, number, number];
}>;

function requireU32(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`${field} must be a source u32, got ${value}`);
  }
  return value >>> 0;
}

function requireNonnegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a nonnegative integer, got ${value}`);
  }
  return value;
}

function setRow(setId: number, field: string): FrontierMonRow {
  if (!Number.isSafeInteger(setId) || setId < 0 || setId >= FRONTIER_MONS.length) {
    throw new Error(`${field} must be a Frontier set id, got ${setId}`);
  }
  return FRONTIER_MONS[setId]!;
}

/**
 * `GetFactoryMonFixedIV` through the retail
 * `FillFactoryFrontierTrainerParty` call site (`battle_factory.c:739-756`,
 * `battle_tower.c:1832-1847`). Challenge 8's out-of-bounds retail read is
 * intentionally rejected instead of pretending it is portable data.
 */
export function getLevel50FactoryOpponentFixedIv(
  battleTowerLevel50WinStreak: number,
  battleIndex: number,
): number {
  requireNonnegativeInteger(battleTowerLevel50WinStreak, "battleTowerLevel50WinStreak");
  if (!Number.isInteger(battleIndex) || battleIndex < 0 || battleIndex >= STAGES_PER_CHALLENGE) {
    throw new Error(`battleIndex must be an integer in [0, ${STAGES_PER_CHALLENGE - 1}]`);
  }
  const towerChallengeNum = Math.floor(battleTowerLevel50WinStreak / STAGES_PER_CHALLENGE);
  const row = POLICY.rentalSelection.fixedIvs[towerChallengeNum];
  if (row === undefined) {
    throw new Error(
      `retail Factory opponent fixed IV is not portable for Battle Tower challenge ${towerChallengeNum}`,
    );
  }
  return battleIndex === STAGES_PER_CHALLENGE - 1 ? row.lastBattle : row.regular;
}

function pushTrainerLedger(
  target: FactoryOpponentDrawLedgerEntry[],
  source: readonly FactoryTrainerDrawLedgerEntry[],
): void {
  for (const draw of source) {
    target.push({
      position: target.length,
      phase: "trainer-selection",
      purpose: "trainer-candidate",
      rngBefore: draw.rngBefore,
      rngAfter: draw.rngAfter,
      randomU16: draw.raw,
      battleIndex: draw.battleIndex,
      attempt: draw.attempt,
      trainerId: draw.trainerId,
      trainerOutcome: draw.accepted ? "accepted" : "previously-fought",
    });
  }
}

function freezeLedger(
  ledger: FactoryOpponentDrawLedgerEntry[],
): readonly FactoryOpponentDrawLedgerEntry[] {
  return Object.freeze(ledger.map((entry) => Object.freeze({
    ...entry,
    range: entry.range === undefined ? undefined : Object.freeze({ ...entry.range }),
  })));
}

/**
 * Adopt a preselected source schedule and run only the later personality
 * construction epoch. This is the Battle-1 anchor path: selection happened
 * before the draft snapshot, so replaying it at the room handoff would spend
 * those draws twice.
 */
export function adoptFactoryOpponentSchedule(
  input: FactoryAdoptedOpponentScheduleInput,
): FactoryOpponentGenerationResult {
  const factoryWinStreak = requireNonnegativeInteger(input.factoryWinStreak, "factoryWinStreak");
  const challengeNum = Math.floor(factoryWinStreak / STAGES_PER_CHALLENGE);
  const otId = requireU32(input.playerTrainerId, "playerTrainerId");
  if (input.savedRentalSetIds.length !== SAVED_RENTAL_COUNT) {
    throw new Error(`savedRentalSetIds must contain exactly ${SAVED_RENTAL_COUNT} source records`);
  }
  const trainer = TRAINERS[input.trainerId];
  if (trainer === undefined || trainer.id !== input.trainerId) {
    throw new Error(`adopted schedule selected missing Battle Frontier trainer ${input.trainerId}`);
  }
  const selectionLedger = input.selectionDrawLedger.map((entry, position) => {
    if (
      entry.position !== position
      || entry.phase === "personality"
      || entry.rngAfter !== advanceRngValueForValidation(entry.rngBefore)
      || entry.randomU16 !== entry.rngAfter >>> 16
      || (position > 0 && entry.rngBefore !== input.selectionDrawLedger[position - 1]!.rngAfter)
    ) {
      throw new Error(`invalid adopted selection draw ${position}`);
    }
    return { ...entry, range: entry.range === undefined ? undefined : { ...entry.range } };
  });
  const acceptedTrainer = selectionLedger.filter(
    (entry) => entry.phase === "trainer-selection" && entry.trainerOutcome === "accepted",
  );
  const acceptedSets = selectionLedger.filter(
    (entry) => entry.phase === "set-selection" && entry.selectionOutcome === "accepted",
  );
  if (
    acceptedTrainer.length !== 1
    || acceptedTrainer[0]!.trainerId !== input.trainerId
    || acceptedSets.length !== FRONTIER_PARTY_SIZE
    || acceptedSets.some((entry, index) => entry.candidateSetId !== input.setIds[index])
  ) {
    throw new Error("adopted trainer/set schedule does not match its pinned selection ledger");
  }
  const storedTrainerIds = [...input.storedTrainerIds, input.trainerId];
  const fixedIv = getLevel50FactoryOpponentFixedIv(
    input.battleTowerLevel50WinStreak,
    input.battleIndex,
  );
  const ledger: FactoryOpponentDrawLedgerEntry[] = [...selectionLedger];
  const opponents: FactoryOpponentRecord[] = [];

  for (let opponentIndex = 0; opponentIndex < FRONTIER_PARTY_SIZE; opponentIndex += 1) {
    const set = setRow(input.setIds[opponentIndex]!, `setIds[${opponentIndex}]`);
    const targetNature = NATURE_BY_NAME.get(set.nature);
    const itemId = HELD_ITEM_BY_TABLE_ID.get(set.itemTableId);
    if (targetNature === undefined || itemId === undefined) {
      throw new Error(`adopted Factory set ${set.index} has incomplete source data`);
    }
    let rngValue = requireU32(
      input.constructionRngValues[opponentIndex]!,
      `constructionRngValues[${opponentIndex}]`,
    );
    let personality = 0;
    let lowPosition = 0;
    let highPosition = 0;
    do {
      lowPosition = ledger.length;
      const lowBefore = rngValue;
      const low = randomU16(rngValue);
      rngValue = low.rngValue;
      highPosition = lowPosition + 1;
      const highBefore = rngValue;
      const high = randomU16(rngValue);
      rngValue = high.rngValue;
      personality = (low.value | (high.value << 16)) >>> 0;
      const personalityOutcome = natureFromPersonality(personality) === targetNature
        ? "accepted"
        : "wrong-nature";
      ledger.push({
        position: lowPosition, phase: "personality", purpose: "personality-low",
        rngBefore: lowBefore, rngAfter: low.rngValue, randomU16: low.value,
        battleIndex: input.battleIndex, opponentIndex, personality, personalityOutcome,
      }, {
        position: highPosition, phase: "personality", purpose: "personality-high",
        rngBefore: highBefore, rngAfter: high.rngValue, randomU16: high.value,
        battleIndex: input.battleIndex, opponentIndex, personality, personalityOutcome,
      });
    } while (natureFromPersonality(personality) !== targetNature);

    const instance: FactoryCorpusPartyInstance = {
      setId: set.index,
      personality,
      fixedIv,
      abilitySlot: (personality & 1) as 0 | 1,
      otId,
    };
    const member = createFactoryCorpusPartyMember(instance);
    opponents.push(Object.freeze({
      ...instance,
      abilitySlot: member.abilitySlot,
      otId,
      speciesName: set.species,
      itemId,
      nature: targetNature,
      selectionDrawPosition: acceptedSets[opponentIndex]!.position,
      personalityDrawPositions: Object.freeze([lowPosition, highPosition] as const),
      member,
    }));
  }
  const tuple = opponents as [
    FactoryOpponentRecord,
    FactoryOpponentRecord,
    FactoryOpponentRecord,
  ];
  const party = opponents.map(({ member }) => member) as [
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
  ];
  return Object.freeze({
    challengeNum,
    trainerId: trainer.id,
    trainerSourceId: trainer.sourceId,
    trainerName: trainer.name,
    storedTrainerIds: Object.freeze(storedTrainerIds),
    fixedIv,
    opponents: Object.freeze(tuple),
    party: Object.freeze(party),
    selectionRngValue: selectionLedger.at(-1)!.rngAfter,
    rngValue: ledger.at(-1)!.rngAfter,
    drawLedger: freezeLedger(ledger),
  });
}

function advanceRngValueForValidation(rngValue: number): number {
  return randomU16(rngValue).rngValue;
}

export function generateFactoryOpponent(
  input: FactoryOpponentGenerationInput,
): FactoryOpponentGenerationResult {
  let rngValue = requireU32(input.rngValue, "rngValue");
  const factoryWinStreak = requireNonnegativeInteger(input.factoryWinStreak, "factoryWinStreak");
  const challengeNum = Math.floor(factoryWinStreak / STAGES_PER_CHALLENGE);
  const otId = requireU32(input.playerTrainerId, "playerTrainerId");
  if (input.savedRentalSetIds.length !== SAVED_RENTAL_COUNT) {
    throw new Error(`savedRentalSetIds must contain exactly ${SAVED_RENTAL_COUNT} source records`);
  }
  const savedRentalSpecies = new Set(
    input.savedRentalSetIds.map((setId, index) => setRow(setId, `savedRentalSetIds[${index}]`).species),
  );
  const fixedIv = getLevel50FactoryOpponentFixedIv(
    input.battleTowerLevel50WinStreak,
    input.battleIndex,
  );
  const ledger: FactoryOpponentDrawLedgerEntry[] = [];

  const trainerSelection = selectFactoryTrainer(
    factoryWinStreak,
    input.battleIndex,
    input.storedTrainerIds,
    rngValue,
  );
  pushTrainerLedger(ledger, trainerSelection.ledger);
  rngValue = trainerSelection.rngValue;
  const trainer = TRAINERS[trainerSelection.trainerId];
  if (trainer === undefined) {
    throw new Error(`selected missing Battle Frontier trainer ${trainerSelection.trainerId}`);
  }

  const selected: Array<{
    setId: number;
    speciesName: string;
    itemId: number;
    selectionDrawPosition: number;
  }> = [];
  const range = getLevel50FactoryRentalRange(challengeNum, false);
  while (selected.length !== FRONTIER_PARTY_SIZE) {
    const opponentIndex = selected.length;
    const position = ledger.length;
    const rngBefore = rngValue;
    const draw = randomU16(rngValue);
    rngValue = draw.rngValue;
    const setId = range.start + (draw.value % (range.end - range.start + 1));
    const candidate = setRow(setId, "generated set id");
    const itemId = HELD_ITEM_BY_TABLE_ID.get(candidate.itemTableId);
    if (itemId === undefined) {
      throw new Error(`Factory set ${setId} has missing held item ${candidate.itemTableId}`);
    }

    let outcome: "accepted" | FactoryOpponentSetRejection = "accepted";
    // Each rejection is after GetFactoryMonId's sole draw and performs no
    // additional Random() call before the next loop iteration.
    if (candidate.species === "SPECIES_UNOWN") {
      outcome = "unown"; // battle_factory.c:336-338
    } else if (savedRentalSpecies.has(candidate.species)) {
      outcome = "saved-rental-species"; // battle_factory.c:340-347
    } else if (setId > POLICY.rentalSelection.highTierLastIndex) {
      // This guard is source-real (`:349-351`) but unreachable for valid
      // Level-50 GetFactoryMonId ranges, whose maximum is the same 849.
      outcome = "level50-high-tier";
    } else if (selected.some((existing) => existing.speciesName === candidate.species)) {
      outcome = "duplicate-species"; // battle_factory.c:353-360
    } else if (
      selected.some((existing) => existing.itemId !== 0 && existing.itemId === itemId)
    ) {
      outcome = "duplicate-item"; // battle_factory.c:362-369; ITEM_NONE is exempt
    }

    ledger.push({
      position,
      phase: "set-selection",
      purpose: "set-candidate",
      rngBefore,
      rngAfter: rngValue,
      randomU16: draw.value,
      battleIndex: input.battleIndex,
      opponentIndex,
      range,
      candidateSetId: setId,
      selectionOutcome: outcome,
    });
    if (outcome === "accepted") {
      selected.push({
        setId,
        speciesName: candidate.species,
        itemId,
        selectionDrawPosition: position,
      });
    }
  }

  const selectionRngValue = rngValue;
  rngValue = input.constructionRngValue === undefined
    ? selectionRngValue
    : requireU32(input.constructionRngValue, "constructionRngValue");
  const opponents: FactoryOpponentRecord[] = [];

  for (let opponentIndex = 0; opponentIndex < selected.length; opponentIndex += 1) {
    const selection = selected[opponentIndex]!;
    const set = setRow(selection.setId, "selected set id");
    const targetNature = NATURE_BY_NAME.get(set.nature);
    if (targetNature === undefined) {
      throw new Error(`Factory set ${set.index} has unknown nature ${set.nature}`);
    }

    let personality: number;
    let lowPosition: number;
    let highPosition: number;
    do {
      lowPosition = ledger.length;
      const lowBefore = rngValue;
      const low = randomU16(rngValue);
      rngValue = low.rngValue;
      highPosition = lowPosition + 1;
      const highBefore = rngValue;
      const high = randomU16(rngValue);
      rngValue = high.rngValue;
      personality = (low.value | (high.value << 16)) >>> 0;
      const personalityOutcome = natureFromPersonality(personality) === targetNature
        ? "accepted"
        : "wrong-nature";
      const shared = { personality, personalityOutcome } as const;
      ledger.push({
        position: lowPosition,
        phase: "personality",
        purpose: "personality-low",
        rngBefore: lowBefore,
        rngAfter: low.rngValue,
        randomU16: low.value,
        battleIndex: input.battleIndex,
        opponentIndex,
        ...shared,
      }, {
        position: highPosition,
        phase: "personality",
        purpose: "personality-high",
        rngBefore: highBefore,
        rngAfter: high.rngValue,
        randomU16: high.value,
        battleIndex: input.battleIndex,
        opponentIndex,
        ...shared,
      });
    } while (natureFromPersonality(personality) !== targetNature);

    const instance: FactoryCorpusPartyInstance = {
      setId: selection.setId,
      personality,
      fixedIv,
      // CreateBoxMon derives the ability bit from personality; the rung-5
      // adapter collapses this to slot 0 for single-ability species.
      abilitySlot: (personality & 1) as 0 | 1,
      otId,
    };
    const member = createFactoryCorpusPartyMember(instance);
    opponents.push(Object.freeze({
      ...instance,
      abilitySlot: member.abilitySlot,
      otId,
      speciesName: selection.speciesName,
      itemId: selection.itemId,
      nature: targetNature,
      selectionDrawPosition: selection.selectionDrawPosition,
      personalityDrawPositions: Object.freeze([lowPosition, highPosition] as const),
      member,
    }));
  }

  const tuple = opponents as [
    FactoryOpponentRecord,
    FactoryOpponentRecord,
    FactoryOpponentRecord,
  ];
  const party = opponents.map((opponent) => opponent.member) as [
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
  ];
  return Object.freeze({
    challengeNum,
    trainerId: trainer.id,
    trainerSourceId: trainer.sourceId,
    trainerName: trainer.name,
    storedTrainerIds: Object.freeze([...trainerSelection.storedTrainerIds]),
    fixedIv,
    opponents: Object.freeze(tuple),
    party: Object.freeze(party),
    selectionRngValue,
    rngValue,
    drawLedger: freezeLedger(ledger),
  });
}
