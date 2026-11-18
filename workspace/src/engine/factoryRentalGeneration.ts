/**
 * Pure Battle Factory initial-rental selection and instance construction.
 *
 * Source order is intentionally visible in `drawLedger`:
 *
 * 1. `GenerateInitialRentalMons` selects all six set ids
 *    (`battle_factory.c:509-601`). Its `while (i != PARTY_SIZE)` has no
 *    attempt cap. Every attempt calls `GetFactoryMonId` exactly once, and
 *    that helper consumes exactly one `Random()` (`:829-866`).
 * 2. The draft screen later constructs the six selectable mons in slot order
 *    (`battle_factory_screen.c:1736-1777`). Each personality attempt is one
 *    `Random32()` (`pokemon.c:2569-2575`), i.e. two ordered `Random()` calls
 *    (`include/random.h:7-16`).
 *
 * 3. A slot whose fixed-IV argument is >= `USE_RANDOM_IVS` (only reachable
 *    through retail's `sFixedIVTable[8]` overread -- see
 *    `getLevel50InitialRentalFixedIv`) then spends two more `Random()` calls
 *    on `CreateBoxMon`'s IV words, immediately after its accepted
 *    personality pair (`pokemon.c:2265-2295`).
 *
 * In the ROM those phases are separated by presentation time, so callers
 * reconciling a live receipt may provide `constructionRngValue`. Omitting it
 * runs the two source loops back-to-back, which is the useful pure-generation
 * contract and does not invent any ambient VBlank draws.
 */

import abilityItemHooksData from "../data/gen/ability-item-hooks.json" with { type: "json" };
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import factoryRoundPolicyData from "../data/gen/factory-round-policy.json" with { type: "json" };
import naturesData from "../data/gen/natures.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import {
  uniformBattleScriptIvs,
  type BattleScriptIvs,
} from "./battleScriptRulesContext.ts";
import {
  type FactoryCorpusPartyInstance,
} from "./factoryCorpusParty.ts";
import { natureFromPersonality, randomU16 } from "./opponentGen.ts";

const SELECTABLE_MONS_COUNT = 6;
const STAGES_PER_CHALLENGE = 7;
/**
 * `ARRAY_COUNT(sFixedIVTable)` (`battle_factory.c:157-166`). The policy
 * artifact carries a ninth `retailOverread` row -- the two `.rodata` bytes
 * the non-BUGFIX `GetFactoryMonFixedIV` reads one past this table -- which is
 * deliberately never reached by plain array indexing.
 */
const DECLARED_FIXED_IV_ROWS = 8;
/**
 * `USE_RANDOM_IVS` (`include/constants/pokemon.h:202`, `MAX_PER_STAT_IVS +
 * 1`): a fixed-IV argument at or above this makes `CreateBoxMon` roll two
 * `Random()` words into a real six-stat spread instead of writing the
 * argument into all six (`pokemon.c:2265-2295`).
 */
export const USE_RANDOM_IVS = 32;
/** `MAX_IV_MASK` (`include/constants/pokemon.h:201`). */
const MAX_IV_MASK = 31;

/**
 * `CreateBoxMon`'s random-IV branch (`pokemon.c:2274-2293`): the first
 * `Random()` word supplies HP/ATK/DEF and the second SPEED/SPATK/SPDEF, five
 * bits each, low bits first.
 */
export function battleScriptIvsFromRandomWords(
  lowWord: number,
  highWord: number,
): BattleScriptIvs {
  return Object.freeze({
    hp: lowWord & MAX_IV_MASK,
    attack: (lowWord >> 5) & MAX_IV_MASK,
    defense: (lowWord >> 10) & MAX_IV_MASK,
    speed: highWord & MAX_IV_MASK,
    spAttack: (highWord >> 5) & MAX_IV_MASK,
    spDefense: (highWord >> 10) & MAX_IV_MASK,
  });
}

type FrontierMonRow = Readonly<{
  index: number;
  species: string;
  itemTableId: number;
  nature: string;
}>;
type HeldItemRow = Readonly<{ itemTableId: number; itemId: number }>;
type SpeciesRow = Readonly<{ name: string; abilities: readonly [string, string] }>;
type NatureRow = Readonly<{ index: number; name: string }>;
type SymbolIdRow = Readonly<{ name: string; id: number }>;
type RentalRange = Readonly<{ start: number; end: number }>;
type FixedIvRow = Readonly<{ regular: number; lastBattle: number }>;
type FactoryRoundPolicy = Readonly<{
  rentalSelection: {
    ranges: { level50: readonly RentalRange[] };
    rentalRankThresholds: readonly number[];
    maximumRentalRank: number;
    fixedIvs: readonly FixedIvRow[];
  };
}>;

const FRONTIER_MONS = (frontierMonsData as unknown as { entries: FrontierMonRow[] }).entries;
const HELD_ITEM_BY_TABLE_ID = new Map(
  (frontierHeldItemsData as unknown as { entries: HeldItemRow[] }).entries
    .map((row) => [row.itemTableId, row.itemId]),
);
const SPECIES_BY_NAME = new Map(
  (speciesStatsData as unknown as { species: SpeciesRow[] }).species
    .map((row) => [row.name, row]),
);
const NATURE_BY_NAME = new Map(
  (naturesData as unknown as { natures: NatureRow[] }).natures
    .map((row) => [row.name, row.index]),
);
const abilityIdsByName = new Map(
  (abilityItemHooksData as unknown as { universes: { abilities: SymbolIdRow[] } })
    .universes.abilities.map((row) => [row.name, row.id]),
);
const POLICY = factoryRoundPolicyData as unknown as FactoryRoundPolicy;

export type FactoryRentalSelectionRejection =
  | "unown"
  | "duplicate-set"
  | "duplicate-species"
  | "duplicate-item";

export type FactoryRentalDrawLedgerEntry = Readonly<{
  /** Zero-based position among all source Random() calls represented here. */
  position: number;
  phase: "set-selection" | "personality" | "random-ivs";
  rentalIndex: number;
  purpose:
    | "set-candidate"
    | "personality-low"
    | "personality-high"
    | "random-ivs-low"
    | "random-ivs-high";
  rngBefore: number;
  rngAfter: number;
  randomU16: number;
  /** Present on selection draws. */
  range?: RentalRange;
  betterRange?: boolean;
  candidateSetId?: number;
  selectionOutcome?: "accepted" | FactoryRentalSelectionRejection;
  /** Present on both words of a completed Random32() personality attempt. */
  personality?: number;
  personalityOutcome?: "accepted" | "wrong-nature";
  /**
   * A `random-ivs` draw populates NEITHER optional group above: the drawn
   * word is its whole payload, and the three 5-bit fields it carries are
   * already decoded into the record's `ivs`.
   */
}>;

export type FactoryInitialRentalRecord = FactoryCorpusPartyInstance & Readonly<{
  otId: number;
  speciesName: string;
  itemId: number;
  nature: number;
  selectionDrawPosition: number;
  personalityDrawPositions: readonly [number, number];
}>;

export type FactoryInitialRentalGenerationResult = Readonly<{
  challengeNum: number;
  rentalRank: number;
  rentals: readonly FactoryInitialRentalRecord[];
  /** Cursor immediately after the six set ids have been accepted. */
  selectionRngValue: number;
  /** Cursor immediately after all six personalities have been accepted. */
  rngValue: number;
  drawLedger: readonly FactoryRentalDrawLedgerEntry[];
}>;

export type FactoryInitialRentalGenerationInput = Readonly<{
  rngValue: number;
  /** Source factoryWinStreak / FRONTIER_STAGES_PER_CHALLENGE. */
  factoryWinStreak: number;
  /** Source factoryRentsCount for the already-selected battle/level mode. */
  rentsCount: number;
  /** T1_READ_32(gSaveBlock2Ptr->playerTrainerId), used as OT_ID_PRESET. */
  playerTrainerId: number;
  /**
   * Optional source checkpoint at CreateFrontierFactorySelectableMons.
   * When absent, construction starts at selectionRngValue.
   */
  constructionRngValue?: number;
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

/**
 * `GetNumPastRentalsRank` (`battle_factory.c:868-886`): thresholds are
 * `<15, <22, <29, <36, <43, otherwise 5`, on the count read into a `u8`
 * (`u8 rents = factoryRentsCount[battleMode][lvlMode]`, :871): the u16 count
 * wraps at 256 (fix 46, docs/parity-mac/rental-rank-count-byte.md; ROM: 256
 * rents give rank 0, 271 give rank 1).
 */
export function getFactoryRentalRank(rentsCount: number): number {
  requireNonnegativeInteger(rentsCount, "rentsCount");
  const rents = rentsCount & 0xff;
  const thresholdIndex = POLICY.rentalSelection.rentalRankThresholds
    .findIndex((threshold) => rents < threshold);
  return thresholdIndex < 0 ? POLICY.rentalSelection.maximumRentalRank : thresholdIndex;
}

/**
 * `GetFactoryMonId` range selection (`battle_factory.c:829-866`). Challenge
 * 0..6 optionally advances one range for better rentals; challenge >=7 is
 * pinned to range 7 regardless of `useBetterRange`.
 */
export function getLevel50FactoryRentalRange(
  challengeNum: number,
  useBetterRange: boolean,
): RentalRange {
  requireNonnegativeInteger(challengeNum, "challengeNum");
  const rangeIndex = challengeNum < 7
    ? challengeNum + (useBetterRange ? 1 : 0)
    : 7;
  const sourceRange = POLICY.rentalSelection.ranges.level50[rangeIndex]!;
  return Object.freeze({ start: sourceRange.start, end: sourceRange.end });
}

/**
 * Draft-rental fixed IV selection. The better-range slots use
 * `challengeNum + 1`; other slots use `challengeNum`
 * (`battle_factory_screen.c:1757-1771`). The ordinary IV column is selected
 * because this is not an opponent's last battle (`battle_factory.c:739-756`).
 *
 * The clamp is retail's own, from the non-BUGFIX `#else` branch of
 * `GetFactoryMonFixedIV` (`battle_factory.c:739-757`): `if (challengeNum >
 * ARRAY_COUNT(sFixedIVTable)) ivSet = ARRAY_COUNT(sFixedIVTable) - 1; else
 * ivSet = challengeNum;`. The bound check is STRICTLY greater than 8, so IV
 * argument exactly 8 is unclamped and reads `sFixedIVTable[8]` -- one row
 * past the end of the table. That row is the `.rodata` pair which follows
 * it, `{regular: 110, lastBattle: 0}` (the policy artifact's ninth
 * `retailOverread` row; ROM-byte receipt in
 * `tests/factoryFixedIvTableRomBytes.test.ts`), and 110 >= USE_RANDOM_IVS
 * makes `CreateBoxMon` roll a random spread. Arguments 9 and up clamp to
 * row 7. Every challenge therefore has an answer; this never throws.
 */
export function getLevel50InitialRentalFixedIv(
  challengeNum: number,
  useBetterRange: boolean,
): number {
  requireNonnegativeInteger(challengeNum, "challengeNum");
  const ivArgument = challengeNum + (useBetterRange ? 1 : 0);
  const ivIndex = ivArgument > DECLARED_FIXED_IV_ROWS
    ? DECLARED_FIXED_IV_ROWS - 1
    : ivArgument;
  const row = POLICY.rentalSelection.fixedIvs[ivIndex];
  if (row === undefined) {
    throw new Error(
      `initial-rental fixed IV is undefined for challenge ${challengeNum}`
      + `${useBetterRange ? " better range" : ""}`,
    );
  }
  return row.regular;
}

function abilitySlotForPersonality(speciesName: string, personality: number): 0 | 1 {
  const species = SPECIES_BY_NAME.get(speciesName);
  if (species === undefined) throw new Error(`unknown Factory species ${speciesName}`);
  // CreateBoxMon (`pokemon.c:2296-2300`) writes personality bit 0 only when
  // the species has a second ability; a zero second ability leaves slot 0.
  const secondAbilityId = abilityIdsByName.get(species.abilities[1]);
  if (secondAbilityId === undefined) {
    throw new Error(`unknown second ability ${species.abilities[1]} for ${speciesName}`);
  }
  return secondAbilityId === 0 ? 0 : (personality & 1) as 0 | 1;
}

function freezeLedger(
  ledger: FactoryRentalDrawLedgerEntry[],
): readonly FactoryRentalDrawLedgerEntry[] {
  return Object.freeze(ledger.map((entry) => Object.freeze({
    ...entry,
    range: entry.range === undefined ? undefined : Object.freeze({ ...entry.range }),
  })));
}

export function generateInitialFactoryRentals(
  input: FactoryInitialRentalGenerationInput,
): FactoryInitialRentalGenerationResult {
  let rngValue = requireU32(input.rngValue, "rngValue");
  const factoryWinStreak = requireNonnegativeInteger(input.factoryWinStreak, "factoryWinStreak");
  const challengeNum = Math.floor(factoryWinStreak / STAGES_PER_CHALLENGE);
  // Every challenge generates: getLevel50InitialRentalFixedIv carries
  // retail's own clamp, including the `sFixedIVTable[8]` overread that IV
  // argument exactly 8 reads (challenge 8, or challenge 7's better-range
  // slots) -- see that function and ISSUES #118. The pinned reference build
  // defines neither BUGFIX (commented out,
  // reference/pokeemerald/include/config.h:48) nor MODERN (defaults to 0,
  // reference/pokeemerald/Makefile:6), so it takes the unpatched `#else`
  // branch on real hardware and the overread row is the behaviour to port.
  const rentalRank = getFactoryRentalRank(input.rentsCount);
  const otId = requireU32(input.playerTrainerId, "playerTrainerId");
  const ledger: FactoryRentalDrawLedgerEntry[] = [];
  const selected: Array<{
    setId: number;
    speciesName: string;
    itemId: number;
    betterRange: boolean;
    selectionDrawPosition: number;
  }> = [];

  // `currSpecies` is intentionally global to the loop, reproducing the
  // source's unusual stateful species retry exactly (`battle_factory.c:
  // 553-589`). Do not simplify this to a Set: the C can provisionally allow
  // the first same-species candidate, and resets currSpecies only on its
  // same-item rejection path.
  let currSpecies: string | undefined;
  while (selected.length !== SELECTABLE_MONS_COUNT) {
    const rentalIndex = selected.length;
    const betterRange = rentalIndex < rentalRank;
    const range = getLevel50FactoryRentalRange(challengeNum, betterRange);
    const drawPosition = ledger.length;
    const rngBefore = rngValue;
    const draw = randomU16(rngValue);
    rngValue = draw.rngValue;
    const setId = range.start + (draw.value % (range.end - range.start + 1));
    const candidate = FRONTIER_MONS[setId];
    if (candidate === undefined) throw new Error(`generated missing Factory set ${setId}`);
    const itemId = HELD_ITEM_BY_TABLE_ID.get(candidate.itemTableId);
    if (itemId === undefined) throw new Error(`Factory set ${setId} has missing held item ${candidate.itemTableId}`);

    let outcome: "accepted" | FactoryRentalSelectionRejection = "accepted";
    if (candidate.species === "SPECIES_UNOWN") {
      // `battle_factory.c:562-563`; no further draw before the next attempt.
      outcome = "unown";
    } else {
      // Exact set rejection is the first condition in the species loop
      // (`battle_factory.c:565-580`). The rejected attempt has already spent
      // its sole GetFactoryMonId draw.
      for (const existing of selected) {
        if (existing.setId === setId) {
          outcome = "duplicate-set";
          break;
        }
        if (existing.speciesName === candidate.species) {
          if (currSpecies === undefined) currSpecies = candidate.species;
          else {
            outcome = "duplicate-species";
            break;
          }
        }
      }

      // Item rejection runs only after the species loop accepts
      // (`battle_factory.c:582-593`). ITEM_NONE (0) never clashes. A rejected
      // same-species candidate resets currSpecies before the next one.
      if (outcome === "accepted") {
        for (const existing of selected) {
          if (existing.itemId !== 0 && existing.itemId === itemId) {
            if (candidate.species === currSpecies) currSpecies = undefined;
            outcome = "duplicate-item";
            break;
          }
        }
      }
    }

    ledger.push({
      position: drawPosition,
      phase: "set-selection",
      rentalIndex,
      purpose: "set-candidate",
      rngBefore,
      rngAfter: rngValue,
      randomU16: draw.value,
      range,
      betterRange,
      candidateSetId: setId,
      selectionOutcome: outcome,
    });
    if (outcome === "accepted") {
      selected.push({
        setId,
        speciesName: candidate.species,
        itemId,
        betterRange,
        selectionDrawPosition: drawPosition,
      });
    }
  }

  const selectionRngValue = rngValue;
  rngValue = input.constructionRngValue === undefined
    ? selectionRngValue
    : requireU32(input.constructionRngValue, "constructionRngValue");
  const rentals: FactoryInitialRentalRecord[] = [];

  for (let rentalIndex = 0; rentalIndex < selected.length; rentalIndex++) {
    const selection = selected[rentalIndex]!;
    const set = FRONTIER_MONS[selection.setId]!;
    const targetNature = NATURE_BY_NAME.get(set.nature);
    if (targetNature === undefined) throw new Error(`Factory set ${set.index} has unknown nature ${set.nature}`);

    let personality: number;
    let lowPosition: number;
    let highPosition: number;
    do {
      // Random32() is `(Random() | Random() << 16)`: low word first, then
      // high, as independently RAM-pinned by opponentGen.ts.
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
        rentalIndex,
        purpose: "personality-low",
        rngBefore: lowBefore,
        rngAfter: low.rngValue,
        randomU16: low.value,
        ...shared,
      }, {
        position: highPosition,
        phase: "personality",
        rentalIndex,
        purpose: "personality-high",
        rngBefore: highBefore,
        rngAfter: high.rngValue,
        randomU16: high.value,
        ...shared,
      });
    } while (natureFromPersonality(personality) !== targetNature);

    // battle_factory_screen.c:1762-1764: slots below the rental rank use
    // GetFactoryMonFixedIV(challengeNum + 1), the rest challengeNum.
    const fixedIvArgument = getLevel50InitialRentalFixedIv(challengeNum, selection.betterRange);
    let ivs: BattleScriptIvs;
    if (fixedIvArgument < USE_RANDOM_IVS) {
      ivs = uniformBattleScriptIvs(fixedIvArgument);
    } else {
      // pokemon.c:2277-2293. The accepted personality is passed in (no draw)
      // and OT_ID_PRESET reads fixedOtId (no draw), so these two words follow
      // the accepted personality pair immediately in the same stream.
      const lowIvPosition = ledger.length;
      const lowIvBefore = rngValue;
      const lowIv = randomU16(rngValue);
      rngValue = lowIv.rngValue;
      ledger.push({
        position: lowIvPosition,
        phase: "random-ivs",
        rentalIndex,
        purpose: "random-ivs-low",
        rngBefore: lowIvBefore,
        rngAfter: lowIv.rngValue,
        randomU16: lowIv.value,
      });
      const highIvPosition = ledger.length;
      const highIvBefore = rngValue;
      const highIv = randomU16(rngValue);
      rngValue = highIv.rngValue;
      ledger.push({
        position: highIvPosition,
        phase: "random-ivs",
        rentalIndex,
        purpose: "random-ivs-high",
        rngBefore: highIvBefore,
        rngAfter: highIv.rngValue,
        randomU16: highIv.value,
      });
      ivs = battleScriptIvsFromRandomWords(lowIv.value, highIv.value);
    }
    rentals.push(Object.freeze({
      setId: selection.setId,
      personality,
      // battle_factory_screen.c:1824 saves MON_DATA_ATK_IV as RentalMon.ivs.
      fixedIv: ivs.attack,
      ivs,
      abilitySlot: abilitySlotForPersonality(selection.speciesName, personality),
      otId,
      speciesName: selection.speciesName,
      itemId: selection.itemId,
      nature: targetNature,
      selectionDrawPosition: selection.selectionDrawPosition,
      personalityDrawPositions: Object.freeze([lowPosition, highPosition] as const),
    }));
  }

  return Object.freeze({
    challengeNum,
    rentalRank,
    rentals: Object.freeze(rentals),
    selectionRngValue,
    rngValue,
    drawLedger: freezeLedger(ledger),
  });
}
