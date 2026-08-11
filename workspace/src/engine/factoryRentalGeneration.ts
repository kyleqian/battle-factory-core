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
  type FactoryCorpusPartyInstance,
} from "./factoryCorpusParty.ts";
import { natureFromPersonality, randomU16 } from "./opponentGen.ts";

const SELECTABLE_MONS_COUNT = 6;
const STAGES_PER_CHALLENGE = 7;

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
  phase: "set-selection" | "personality";
  rentalIndex: number;
  purpose: "set-candidate" | "personality-low" | "personality-high";
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
 * `<15, <22, <29, <36, <43, otherwise 5`.
 */
export function getFactoryRentalRank(rentsCount: number): number {
  requireNonnegativeInteger(rentsCount, "rentsCount");
  const thresholdIndex = POLICY.rentalSelection.rentalRankThresholds
    .findIndex((threshold) => rentsCount < threshold);
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
 * This rung deliberately supports the source-defined Level-50 range rows
 * through challenge 7. Later out-of-bounds retail behavior is not portable.
 */
export function getLevel50InitialRentalFixedIv(
  challengeNum: number,
  useBetterRange: boolean,
): number {
  requireNonnegativeInteger(challengeNum, "challengeNum");
  const ivIndex = challengeNum + (useBetterRange ? 1 : 0);
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
  // See getLevel50InitialRentalFixedIv: avoid pretending the retail OOB read
  // for challenge 8+ is a stable rule.
  if (challengeNum > 7) {
    throw new Error(`Level-50 initial rental generation supports source challenges 0..7, got ${challengeNum}`);
  }
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

    const fixedIv = getLevel50InitialRentalFixedIv(challengeNum, selection.betterRange);
    rentals.push(Object.freeze({
      setId: selection.setId,
      personality,
      fixedIv,
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
