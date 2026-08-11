/**
 * Complete, source-derived presentation payload for one Factory rental.
 *
 * The persistent `FactoryRentalRecord` is intentionally compact. This
 * adapter expands it once at the draft boundary so every summary page reads
 * the same live identity instead of reconstructing a rental from a canonical
 * recording plus a slot number.
 */

import {
  createFactoryCorpusPartyMember,
  type FactoryCorpusPartyInstance,
} from "./factoryCorpusParty.ts";
import type { MonGender } from "./monGender.ts";

import draftPoolHeaderData from "../data/gen/draft-pool-header.json" with { type: "json" };
import summaryInfoData from "../data/gen/summary-info.json" with { type: "json" };
import movesData from "../data/gen/moves.json" with { type: "json" };
import itemNamesData from "../data/gen/item-names.json" with { type: "json" };
import expTablesData from "../data/gen/exp-tables.json" with { type: "json" };
import speciesTypesData from "../data/gen/species-types.json" with { type: "json" };

type FactorySpeciesHeader = Readonly<{
  species: string;
  name: string;
  category: string;
}>;

type SummarySpeciesInfo = Readonly<{
  species: string;
  dexNumber: number;
  types: readonly string[];
  genderRatio: number;
}>;

type SummaryAbilityInfo = Readonly<{
  name: string;
  description: string;
}>;

export type FactoryRentalMovePresentation = Readonly<{
  move: string;
  id: number;
  name: string;
  type: string;
  currentPp: number;
  maxPp: number;
  power: number;
  accuracy: number;
  description: string;
  contest: Readonly<{
    category: string;
    appeal: number;
    jam: number;
    effect: string;
    description: string;
  }>;
}>;

export type FactoryRentalPresentation = Readonly<{
  /** Exact compact record received from GenerateInitialRentalMons. */
  source: FactoryCorpusPartyInstance;
  species: string;
  name: string;
  category: string;
  dexNumber: number | null;
  types: readonly string[];
  personality: number;
  level: number;
  nature: string;
  gender: MonGender;
  ability: Readonly<{
    ability: string;
    name: string | null;
    description: string | null;
  }>;
  item: Readonly<{
    item: string;
    name: string;
  }>;
  moves: readonly [
    FactoryRentalMovePresentation,
    FactoryRentalMovePresentation,
    FactoryRentalMovePresentation,
    FactoryRentalMovePresentation,
  ];
  stats: Readonly<{
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    spAttack: number;
    spDefense: number;
  }>;
  experience: number;
  nextLevelExperience: number;
  /**
   * Battle Factory summaries suppress OT/ID windows in
   * PrintMonOTName/PrintMonOTID. The numeric identity is retained for front
   * palette/shiny ownership; the two source-rendered strings are therefore
   * explicitly absent rather than fabricated.
   */
  ot: Readonly<{
    id: number;
    nameText: null;
    idText: null;
  }>;
  /** Species key passed to CreateMonSprite/front-pic asset selection. */
  frontPicSpecies: string;
}>;

const SPECIES_HEADERS = new Map(
  (draftPoolHeaderData as { speciesHeaders: FactorySpeciesHeader[] }).speciesHeaders
    .map((header) => [header.species, header]),
);
const SPECIES_INFO = new Map(
  (summaryInfoData as { species: SummarySpeciesInfo[] }).species
    .map((info) => [info.species, info]),
);
const SPECIES_TYPES = new Map(
  (speciesTypesData as { species: Array<{ name: string; types: string[] }> }).species
    .map(({ name, types }) => [name, types]),
);
const ABILITIES =
  (summaryInfoData as { abilities: Record<string, SummaryAbilityInfo> }).abilities;
const MOVES_BY_ID = new Map(
  (movesData as {
    moves: Array<{
      move: string;
      id: number;
      name: string;
      type: string;
      pp: number;
      power: number;
      accuracy: number;
      description: string;
      contest: FactoryRentalMovePresentation["contest"];
    }>;
  }).moves.map((move) => [move.id, move]),
);
const ITEM_NAMES = new Map(
  (itemNamesData as { items: Array<{ item: string; name: string }> }).items
    .map(({ item, name }) => [item, name]),
);
const EXP_TABLES = expTablesData as {
  growthRates: Record<string, number[]>;
  speciesGrowthRate: Record<string, string>;
};

export function createFactoryRentalPresentation(
  source: FactoryCorpusPartyInstance,
): FactoryRentalPresentation {
  const member = createFactoryCorpusPartyMember(source);
  const header = SPECIES_HEADERS.get(member.speciesName);
  const speciesInfo = SPECIES_INFO.get(member.speciesName);
  const speciesTypes = speciesInfo?.types ?? SPECIES_TYPES.get(member.speciesName);
  const ability = ABILITIES[member.abilityName];
  const itemName = ITEM_NAMES.get(member.itemName);
  const growthRate = EXP_TABLES.speciesGrowthRate[member.speciesName];
  const growth = growthRate === undefined
    ? undefined
    : EXP_TABLES.growthRates[growthRate];
  if (!header) throw new Error(`Factory rental has no species header for ${member.speciesName}`);
  if (!speciesTypes) throw new Error(`Factory rental has no type info for ${member.speciesName}`);
  if (!itemName) throw new Error(`Factory rental has no display name for ${member.itemName}`);
  if (!growth) throw new Error(`Factory rental has no experience table for ${member.speciesName}`);

  const presentedMoves = member.moves.map((moveId, index) => {
    const move = MOVES_BY_ID.get(moveId);
    if (!move) throw new Error(`Factory rental has no summary move info for id ${moveId}`);
    return Object.freeze({
      ...move,
      currentPp: member.pp[index]!,
      maxPp: move.pp,
    });
  }) as unknown as FactoryRentalPresentation["moves"];

  return Object.freeze({
    source: Object.freeze({ ...source }),
    species: member.speciesName,
    name: header.name,
    category: header.category,
    dexNumber: speciesInfo?.dexNumber ?? null,
    types: Object.freeze([...speciesTypes]),
    personality: member.personality,
    level: member.level,
    nature: member.natureName.replace("NATURE_", ""),
    gender: member.gender,
    ability: Object.freeze({
      ability: member.abilityName,
      name: ability?.name ?? null,
      description: ability?.description ?? null,
    }),
    item: Object.freeze({ item: member.itemName, name: itemName }),
    moves: Object.freeze(presentedMoves),
    stats: Object.freeze({
      hp: member.hp,
      maxHp: member.maxHP,
      attack: member.attack,
      defense: member.defense,
      speed: member.speed,
      spAttack: member.spAttack,
      spDefense: member.spDefense,
    }),
    experience: member.experience,
    nextLevelExperience:
      member.level >= 100 ? 0 : growth[member.level + 1]! - member.experience,
    ot: Object.freeze({
      id: source.otId ?? 0,
      nameText: null,
      idText: null,
    }),
    frontPicSpecies: header.name,
  });
}
