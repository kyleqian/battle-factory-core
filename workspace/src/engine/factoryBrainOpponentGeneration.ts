/**
 * Pure Battle Factory Frontier Brain (Noland) opponent party generation.
 *
 * `FillFactoryBrainParty` (`battle_factory.c:759-826`) entirely replaces the
 * ordinary `FillFactoryFrontierTrainerParty` fixed-IV/construction path when
 * `trainerId == TRAINER_FRONTIER_BRAIN` (`battle_tower.c:1855-1858`). Two
 * structural differences from `generateFactoryOpponent`
 * (`factoryOpponentGeneration.ts`) are load-bearing, not stylistic:
 *
 * - There is no trainer-selection phase: no `selectFactoryTrainer` call, no
 *   `storedTrainerIds`, no no-repeat-trainer rule. The Brain is always the
 *   same fixed trainer.
 * - Selection and construction are NOT split into two epochs. Each mon's
 *   `GetFactoryMonId` rejection loop and its
 *   `CreateMonWithEVSpreadNatureOTID` personality loop run back to back
 *   inside the same `while (i != FRONTIER_PARTY_SIZE)` iteration, so RNG
 *   draws interleave selection and personality per mon rather than batching
 *   all three selections before any construction (contrast
 *   `GenerateOpponentMons` + the later, separately-cursored
 *   `FillFactoryFrontierTrainerParty`).
 *
 * The five rejection rules also run in a different order than the ordinary
 * opponent's `GenerateOpponentMons` loop: unown, then the (source-real but
 * unreachable) Level-50 high-tier guard, THEN the saved-rental check, then
 * duplicate species, then duplicate item. The saved-rental check itself
 * differs in kind: it is exact `monId` (set id) equality against the
 * player's six `frontier.rentalMons[].monId` slots, not species equality
 * against their species set.
 */

import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import factoryRoundPolicyData from "../data/gen/factory-round-policy.json" with { type: "json" };
import naturesData from "../data/gen/natures.json" with { type: "json" };
import {
  uniformBattleScriptIvs,
  type BattleScriptIvs,
} from "./battleScriptRulesContext.ts";
import {
  createFactoryCorpusPartyMember,
  type FactoryCorpusPartyInstance,
  type FactoryCorpusPartyMemberState,
} from "./factoryCorpusParty.ts";
import {
  battleScriptIvsFromRandomWords,
  getFactoryRentalRange,
  USE_RANDOM_IVS,
} from "./factoryRentalGeneration.ts";
import { factoryRecordLevelField, type FactoryLvlMode } from "./factoryLevelMode.ts";
import { natureFromPersonality, randomU16 } from "./opponentGen.ts";

const FRONTIER_PARTY_SIZE = 3;
const PLAYER_RENTAL_COUNT = 6;
const STAGES_PER_CHALLENGE = 7;
/** `ARRAY_COUNT(sFixedIVTable)` (`battle_factory.c:157-166`). */
const FIXED_IV_TABLE_LENGTH = 8;
/** `FillFactoryBrainParty`'s `GetFactoryMonFixedIV(challengeNum + 2, FALSE)` (`:772`). */
const BRAIN_FIXED_IV_CHALLENGE_OFFSET = 2;

type FrontierMonRow = Readonly<{
  index: number;
  species: string;
  itemTableId: number;
  nature: string;
}>;
type HeldItemRow = Readonly<{ itemTableId: number; itemId: number }>;
type NatureRow = Readonly<{ index: number; name: string }>;
type FixedIvRow = Readonly<{ regular: number; lastBattle: number }>;

const FRONTIER_MONS = (frontierMonsData as unknown as { entries: FrontierMonRow[] }).entries;
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

export type FactoryBrainOpponentSetRejection =
  | "unown"
  | "level50-high-tier"
  | "saved-rental-set-id"
  | "duplicate-species"
  | "duplicate-item";

export type FactoryBrainOpponentDrawLedgerEntry = Readonly<{
  /** Zero-based position among all source Random() calls represented here. */
  position: number;
  phase: "set-selection" | "personality" | "random-ivs";
  purpose:
    | "set-candidate"
    | "personality-low"
    | "personality-high"
    | "random-ivs-low"
    | "random-ivs-high";
  rngBefore: number;
  rngAfter: number;
  randomU16: number;
  opponentIndex: number;
  range?: Readonly<{ start: number; end: number }>;
  candidateSetId?: number;
  selectionOutcome?: "accepted" | FactoryBrainOpponentSetRejection;
  personality?: number;
  personalityOutcome?: "accepted" | "wrong-nature";
}>;

export type FactoryBrainOpponentRecord = FactoryCorpusPartyInstance & Readonly<{
  otId: number;
  speciesName: string;
  itemId: number;
  nature: number;
  selectionDrawPosition: number;
  personalityDrawPositions: readonly [number, number];
  member: FactoryCorpusPartyMemberState;
}>;

export type FactoryBrainOpponentGenerationInput = Readonly<{
  rngValue: number;
  /** Source Factory streak used for the set-id challenge range and fixed-IV row (`battle_factory.c:770-772`). Scope: singles, Level 50. */
  factoryWinStreak: number;
  /**
   * All six of the player's current `frontier.rentalMons[].monId` slots
   * (`:786-792`). Rejection is exact set-id equality, not species equality —
   * the ordinary opponent's `saved-rental-species` rule does not apply here.
   */
  playerRentalSetIds: readonly number[];
  /** `T1_READ_32(playerTrainerId)`, used as the opponent OT id (`:775`). */
  playerTrainerId: number;
  /**
   * `frontier.lvlMode` (src/engine/factoryLevelMode.ts). Absent = Level 50. Open Level: the Open Level rows (`GetFactoryMonId(lvlMode,
   * ...)`, :779), no high-tier guard (`monLevel == FRONTIER_MAX_LEVEL_50`, :783) and level-100 members (`SetFacilityPtrsGetLevel`, :773).
   */
  lvlMode?: FactoryLvlMode;
}>;

export type FactoryBrainOpponentGenerationResult = Readonly<{
  challengeNum: number;
  /**
   * The `GetFactoryMonFixedIV` ARGUMENT this party was built with, not any
   * member's IV: at challengeNum 6 it is the overread row's 110, which is
   * >= USE_RANDOM_IVS and therefore rolls a spread per member. Each
   * record's own `fixedIv`/`ivs` carry what that member actually got.
   */
  fixedIv: number;
  opponents: readonly [
    FactoryBrainOpponentRecord,
    FactoryBrainOpponentRecord,
    FactoryBrainOpponentRecord,
  ];
  party: readonly [
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
  ];
  /** Cursor immediately after the third opponent's personality is accepted. */
  rngValue: number;
  drawLedger: readonly FactoryBrainOpponentDrawLedgerEntry[];
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
 * `GetFactoryMonFixedIV(challengeNum + 2, FALSE)` through the retail
 * `FillFactoryBrainParty` call site (`battle_factory.c:739-756, 772`). The
 * `+2` offset means challengeNum 6 lands exactly on the retail
 * out-of-bounds `sFixedIVTable[8]` read: `ARRAY_COUNT(sFixedIVTable)` is 8,
 * and the non-BUGFIX clamp (`challengeNum > ARRAY_COUNT(...)`) only
 * triggers when the table argument is STRICTLY greater than 8, so argument
 * 8 falls through to the unclamped, one-past-the-end read. That read is the
 * `.rodata` pair which follows the table, `{regular: 110, lastBattle: 0}`
 * (the policy artifact's ninth `retailOverread` row; ROM-byte receipt in
 * `tests/factoryFixedIvTableRomBytes.test.ts`), and 110 >= USE_RANDOM_IVS
 * makes `CreateBoxMon` roll a random spread per party member. Arguments 9
 * and up (challenge 7+) clamp to row 7 as usual.
 */
export function getLevel50FactoryBrainFixedIv(challengeNum: number): number {
  requireNonnegativeInteger(challengeNum, "challengeNum");
  const ivArg = challengeNum + BRAIN_FIXED_IV_CHALLENGE_OFFSET;
  const ivIndex = ivArg > FIXED_IV_TABLE_LENGTH ? FIXED_IV_TABLE_LENGTH - 1 : ivArg;
  const row = POLICY.rentalSelection.fixedIvs[ivIndex];
  if (row === undefined) {
    throw new Error(
      `retail Factory Brain fixed IV is not portable for challenge ${challengeNum} `
      + `(sFixedIVTable[${ivArg}] is out of bounds)`,
    );
  }
  return row.regular;
}

function freezeLedger(
  ledger: FactoryBrainOpponentDrawLedgerEntry[],
): readonly FactoryBrainOpponentDrawLedgerEntry[] {
  return Object.freeze(ledger.map((entry) => Object.freeze({
    ...entry,
    range: entry.range === undefined ? undefined : Object.freeze({ ...entry.range }),
  })));
}

/**
 * `FillFactoryBrainParty`'s five rejection rules for one `GetFactoryMonId`
 * candidate, in source order (`battle_factory.c:781-808`). This DIFFERS from
 * `GenerateOpponentMons`' order, which checks saved-rental species before
 * the high-tier guard: unown, high-tier, saved-rental set id, duplicate
 * species, duplicate item. Each rejection is after GetFactoryMonId's sole
 * draw and performs no additional Random() call before the next loop
 * iteration.
 */
function brainSetSelectionOutcome(
  setId: number,
  candidate: FrontierMonRow,
  itemId: number,
  playerRentalSetIds: ReadonlySet<number>,
  chosenSpeciesNames: readonly string[],
  chosenItemIds: readonly number[],
  lvlMode: FactoryLvlMode | undefined,
): "accepted" | FactoryBrainOpponentSetRejection {
  if (candidate.species === "SPECIES_UNOWN") {
    return "unown"; // battle_factory.c:781-782
  }
  if (lvlMode !== "open" && setId > POLICY.rentalSelection.highTierLastIndex) {
    // Source-real (`:783-784`) but unreachable: every valid Level-50
    // GetFactoryMonId range tops out at or below 849 (proven in
    // tests/factoryBrainOpponentGeneration.test.ts, matching the sibling
    // proof in factoryOpponentGeneration.test.ts).
    return "level50-high-tier";
  }
  if (playerRentalSetIds.has(setId)) {
    return "saved-rental-set-id"; // battle_factory.c:786-792; exact set-id equality
  }
  if (chosenSpeciesNames.includes(candidate.species)) {
    return "duplicate-species"; // battle_factory.c:794-800
  }
  if (chosenItemIds.some((existing) => existing !== 0 && existing === itemId)) {
    return "duplicate-item"; // battle_factory.c:802-808; ITEM_NONE is exempt
  }
  return "accepted";
}

function heldItemIdOf(candidate: FrontierMonRow): number {
  const itemId = HELD_ITEM_BY_TABLE_ID.get(candidate.itemTableId);
  if (itemId === undefined) {
    throw new Error(`Factory set ${candidate.index} has missing held item ${candidate.itemTableId}`);
  }
  return itemId;
}

/**
 * One accepted member's `CreateMonWithEVSpreadNatureOTID` call
 * (`battle_factory.c:812-818`, `pokemon.c:2562-2593`): the nature-rejection
 * personality loop from `rngValue`, the random-IV words when the fixed-IV
 * argument asks for them, and the derived party member. Shared by the
 * single-cursor generation and the per-member adoption so both build a
 * member with the same code.
 */
function constructBrainMember(
  ledger: FactoryBrainOpponentDrawLedgerEntry[],
  startRngValue: number,
  candidate: FrontierMonRow,
  itemId: number,
  fixedIvArgument: number,
  otId: number,
  opponentIndex: number,
  selectionDrawPosition: number,
  lvlMode: FactoryLvlMode | undefined,
): { readonly record: FactoryBrainOpponentRecord; readonly rngValue: number } {
  let rngValue = startRngValue;
  const setId = candidate.index;
  const targetNature = NATURE_BY_NAME.get(candidate.nature);
  if (targetNature === undefined) {
    throw new Error(`Factory set ${candidate.index} has unknown nature ${candidate.nature}`);
  }

  // CreateMonWithEVSpreadNatureOTID's nature-rejection loop runs
  // immediately, on the same cursor, before the next GetFactoryMonId draw
  // (pokemon.c:2562-2593) — selection and construction are not separate
  // epochs here, unlike the ordinary opponent's room-handoff split.
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
    const shared = { personality, personalityOutcome, opponentIndex } as const;
    ledger.push({
      position: lowPosition,
      phase: "personality",
      purpose: "personality-low",
      rngBefore: lowBefore,
      rngAfter: low.rngValue,
      randomU16: low.value,
      ...shared,
    }, {
      position: highPosition,
      phase: "personality",
      purpose: "personality-high",
      rngBefore: highBefore,
      rngAfter: high.rngValue,
      randomU16: high.value,
      ...shared,
    });
  } while (natureFromPersonality(personality) !== targetNature);

  let ivs: BattleScriptIvs;
  if (fixedIvArgument < USE_RANDOM_IVS) {
    ivs = uniformBattleScriptIvs(fixedIvArgument);
  } else {
    // pokemon.c:2277-2293, immediately after this member's accepted
    // personality pair: the personality is passed in and OT_ID_PRESET
    // reads fixedOtId, so neither costs a draw before these two words.
    const lowIvPosition = ledger.length;
    const lowIvBefore = rngValue;
    const lowIv = randomU16(rngValue);
    rngValue = lowIv.rngValue;
    ledger.push({
      position: lowIvPosition,
      phase: "random-ivs",
      purpose: "random-ivs-low",
      rngBefore: lowIvBefore,
      rngAfter: lowIv.rngValue,
      randomU16: lowIv.value,
      opponentIndex,
    });
    const highIvPosition = ledger.length;
    const highIvBefore = rngValue;
    const highIv = randomU16(rngValue);
    rngValue = highIv.rngValue;
    ledger.push({
      position: highIvPosition,
      phase: "random-ivs",
      purpose: "random-ivs-high",
      rngBefore: highIvBefore,
      rngAfter: highIv.rngValue,
      randomU16: highIv.value,
      opponentIndex,
    });
    ivs = battleScriptIvsFromRandomWords(lowIv.value, highIv.value);
  }

  const instance: FactoryCorpusPartyInstance = {
    setId,
    personality,
    // battle_factory_screen.c:1824's rule: the saved IV byte is the ATK IV.
    fixedIv: ivs.attack,
    ivs,
    // CreateBoxMon derives the ability bit from personality; the corpus
    // adapter collapses this to slot 0 for single-ability species.
    abilitySlot: (personality & 1) as 0 | 1,
    otId,
    ...factoryRecordLevelField(lvlMode),
  };
  const member = createFactoryCorpusPartyMember(instance);
  return {
    record: Object.freeze({
      ...instance,
      abilitySlot: member.abilitySlot,
      otId,
      speciesName: candidate.species,
      itemId,
      nature: targetNature,
      selectionDrawPosition,
      personalityDrawPositions: Object.freeze([lowPosition, highPosition] as const),
      member,
    }),
    rngValue,
  };
}

function brainGenerationResult(
  challengeNum: number,
  fixedIvArgument: number,
  opponents: FactoryBrainOpponentRecord[],
  rngValue: number,
  ledger: FactoryBrainOpponentDrawLedgerEntry[],
): FactoryBrainOpponentGenerationResult {
  const tuple = opponents as [
    FactoryBrainOpponentRecord,
    FactoryBrainOpponentRecord,
    FactoryBrainOpponentRecord,
  ];
  const party = opponents.map((opponent) => opponent.member) as [
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
  ];
  return Object.freeze({
    challengeNum,
    fixedIv: fixedIvArgument,
    opponents: Object.freeze(tuple),
    party: Object.freeze(party),
    rngValue,
    drawLedger: freezeLedger(ledger),
  });
}

function requirePlayerRentalSetIds(playerRentalSetIds: readonly number[]): ReadonlySet<number> {
  if (playerRentalSetIds.length !== PLAYER_RENTAL_COUNT) {
    throw new Error(`playerRentalSetIds must contain exactly ${PLAYER_RENTAL_COUNT} source records`);
  }
  return new Set(
    playerRentalSetIds.map((setId, index) => setRow(setId, `playerRentalSetIds[${index}]`).index),
  );
}

export function generateFactoryBrainOpponent(
  input: FactoryBrainOpponentGenerationInput,
): FactoryBrainOpponentGenerationResult {
  let rngValue = requireU32(input.rngValue, "rngValue");
  const factoryWinStreak = requireNonnegativeInteger(input.factoryWinStreak, "factoryWinStreak");
  const challengeNum = Math.floor(factoryWinStreak / STAGES_PER_CHALLENGE);
  const otId = requireU32(input.playerTrainerId, "playerTrainerId");
  const playerRentalSetIds = requirePlayerRentalSetIds(input.playerRentalSetIds);
  // The whole party shares one GetFactoryMonFixedIV argument; when that
  // argument is the >= USE_RANDOM_IVS overread row, each member still rolls
  // its OWN spread (CreateBoxMon runs per mon).
  const fixedIvArgument = getLevel50FactoryBrainFixedIv(challengeNum);
  const range = getFactoryRentalRange(challengeNum, false, input.lvlMode);

  const ledger: FactoryBrainOpponentDrawLedgerEntry[] = [];
  const opponents: FactoryBrainOpponentRecord[] = [];
  const chosenSpeciesNames: string[] = [];
  const chosenItemIds: number[] = [];

  while (opponents.length !== FRONTIER_PARTY_SIZE) {
    const opponentIndex = opponents.length;
    const position = ledger.length;
    const rngBefore = rngValue;
    const draw = randomU16(rngValue);
    rngValue = draw.rngValue;
    const setId = range.start + (draw.value % (range.end - range.start + 1));
    const candidate = setRow(setId, "generated set id");
    const itemId = heldItemIdOf(candidate);
    const outcome = brainSetSelectionOutcome(
      setId, candidate, itemId, playerRentalSetIds, chosenSpeciesNames, chosenItemIds, input.lvlMode,
    );

    ledger.push({
      position,
      phase: "set-selection",
      purpose: "set-candidate",
      rngBefore,
      rngAfter: rngValue,
      randomU16: draw.value,
      opponentIndex,
      range,
      candidateSetId: setId,
      selectionOutcome: outcome,
    });
    if (outcome !== "accepted") {
      continue;
    }

    chosenSpeciesNames.push(candidate.species);
    chosenItemIds.push(itemId);
    const constructed = constructBrainMember(
      ledger, rngValue, candidate, itemId, fixedIvArgument, otId, opponentIndex, position, input.lvlMode,
    );
    rngValue = constructed.rngValue;
    opponents.push(constructed.record);
  }

  return brainGenerationResult(challengeNum, fixedIvArgument, opponents, rngValue, ledger);
}

export type FactoryBrainAdoptedOpponentScheduleInput = Readonly<{
  /** As `FactoryBrainOpponentGenerationInput.factoryWinStreak`. */
  factoryWinStreak: number;
  /** As `FactoryBrainOpponentGenerationInput.playerRentalSetIds`. */
  playerRentalSetIds: readonly number[];
  /** As `FactoryBrainOpponentGenerationInput.playerTrainerId`. */
  playerTrainerId: number;
  /** As `FactoryBrainOpponentGenerationInput.lvlMode`. */
  lvlMode?: FactoryLvlMode;
  /** The three sets `FillFactoryBrainParty` accepted, in party order. */
  setIds: readonly [number, number, number];
  /**
   * Per member, the cursor its `CreateMonWithEVSpreadNatureOTID` personality
   * loop reads from (the accepted `Random32` pair, or an earlier pair of the
   * same loop).
   */
  constructionRngValues: readonly [number, number, number];
}>;

/**
 * Adopt a Brain party the source already rolled (the real-ROM replay seam,
 * `docs/parity-mac/brain-replay-seam.md`): the dice, i.e. the three accepted
 * set ids and each member's personality cursor, are given; everything
 * derived is built by the same code as `generateFactoryBrainOpponent`.
 *
 * Why not one cursor: on hardware `FillFactoryBrainParty` runs for about 28
 * frames with `gMain.inBattle` still clear, so `VBlankIntr`'s own `Random()`
 * (`main.c:365-366`) lands between the function's draws (30 / 31 such calls
 * in the two receipts of `tests/factoryBrainOpponentRomReceipts.test.ts`).
 * The Brain analogue of `adoptFactoryOpponentSchedule`'s per-member
 * construction cursors.
 *
 * Each adopted set must be one the source rules accept at its position
 * (range, then `brainSetSelectionOutcome` against the earlier members), so a
 * set this port would have rejected is an error, not a silent adoption. The
 * returned ledger holds the construction draws only; there is no selection
 * draw to record, and `selectionDrawPosition` is -1 on every member.
 * `rngValue` is the cursor after the third member's construction.
 */
export function adoptFactoryBrainOpponentSchedule(
  input: FactoryBrainAdoptedOpponentScheduleInput,
): FactoryBrainOpponentGenerationResult {
  const factoryWinStreak = requireNonnegativeInteger(input.factoryWinStreak, "factoryWinStreak");
  const challengeNum = Math.floor(factoryWinStreak / STAGES_PER_CHALLENGE);
  const otId = requireU32(input.playerTrainerId, "playerTrainerId");
  const playerRentalSetIds = requirePlayerRentalSetIds(input.playerRentalSetIds);
  const fixedIvArgument = getLevel50FactoryBrainFixedIv(challengeNum);
  const range = getFactoryRentalRange(challengeNum, false, input.lvlMode);
  if (input.setIds.length !== FRONTIER_PARTY_SIZE || input.constructionRngValues.length !== FRONTIER_PARTY_SIZE) {
    throw new Error(`an adopted Brain schedule needs exactly ${FRONTIER_PARTY_SIZE} set ids and construction cursors`);
  }

  const ledger: FactoryBrainOpponentDrawLedgerEntry[] = [];
  const opponents: FactoryBrainOpponentRecord[] = [];
  const chosenSpeciesNames: string[] = [];
  const chosenItemIds: number[] = [];
  let rngValue = 0;

  for (let opponentIndex = 0; opponentIndex < FRONTIER_PARTY_SIZE; opponentIndex += 1) {
    const setId = input.setIds[opponentIndex]!;
    const candidate = setRow(setId, `setIds[${opponentIndex}]`);
    if (setId < range.start || setId > range.end) {
      throw new Error(
        `adopted Brain set ${setId} is outside the challenge ${challengeNum} `
        + `GetFactoryMonId range ${range.start}..${range.end}`,
      );
    }
    const itemId = heldItemIdOf(candidate);
    const outcome = brainSetSelectionOutcome(
      setId, candidate, itemId, playerRentalSetIds, chosenSpeciesNames, chosenItemIds, input.lvlMode,
    );
    if (outcome !== "accepted") {
      throw new Error(`adopted Brain set ${setId} (member ${opponentIndex}) is one the source rules reject: ${outcome}`);
    }
    chosenSpeciesNames.push(candidate.species);
    chosenItemIds.push(itemId);
    const constructed = constructBrainMember(
      ledger,
      requireU32(input.constructionRngValues[opponentIndex]!, `constructionRngValues[${opponentIndex}]`),
      candidate, itemId, fixedIvArgument, otId, opponentIndex, -1, input.lvlMode,
    );
    rngValue = constructed.rngValue;
    opponents.push(constructed.record);
  }

  return brainGenerationResult(challengeNum, fixedIvArgument, opponents, rngValue, ledger);
}
