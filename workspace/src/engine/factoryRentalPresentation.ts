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
import { expandRomGlyphCodes } from "./font.ts";

import draftPoolHeaderData from "../data/gen/draft-pool-header.json" with { type: "json" };
import summaryInfoData from "../data/gen/summary-info.json" with { type: "json" };
import movesData from "../data/gen/moves.json" with { type: "json" };
import itemNamesData from "../data/gen/item-names.json" with { type: "json" };
import expTablesData from "../data/gen/exp-tables.json" with { type: "json" };
import speciesTypesData from "../data/gen/species-types.json" with { type: "json" };
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };

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

/** GetMonAilment's icon variants (gStatusGfx_Icons frames, the party-menu status-icon keys): FNT first, PKRS draws nothing. */
export type SummaryAilment = "poison" | "paralyzed" | "sleep" | "frozen" | "burn" | "faint";

/**
 * The live gPlayerParty values an in-battle summary (sum241) lays over a rental record: HP, held item, moves and PP are all
 * controller-synced party fields (REQUEST_HELDITEM_BATTLE, REQUEST_MOVES_PP_BATTLE, datahpupdate), the ailment is
 * GetMonAilment over HP + status1.
 */
export type LiveBattleMemberView = Readonly<{
  hp: number;
  maxHP: number;
  item: number;
  moves: readonly number[];
  pp: readonly number[];
  ailment: SummaryAilment | null;
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
  /**
   * Species key passed to CreateMonSprite/front-pic asset selection: the SPECIES_* constant without its prefix
   * ("FARFETCHD", "MR_MIME", "NIDORAN_F"), which is how battle-opponent-front-sprites.json and summary-front-animation.json
   * are keyed. It was the display name until spn242, which left FARFETCH'D, MR. MIME and NIDORAN♀/♂ without a portrait.
   */
  frontPicSpecies: string;
  /**
   * GetMonAilment result: the summary's status icon (CreateSetStatusSprite, 64,152), its STATUS label window and the
   * sStatusSlidingWindow strip draw only for a non-null ailment. Absent / null for every draft rental (always healthy).
   */
  ailment?: SummaryAilment | null;
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
/** Held-item id -> ITEM_* key, for the live held item an in-battle summary shows (every Frontier item the party can hold or steal). */
const ITEMS_BY_ID = new Map(
  (frontierHeldItemsData as { entries: Array<{ itemId: number; item: string }> }).entries
    .map((entry) => [entry.itemId, entry.item]),
);
const ITEM_NAMES = new Map(
  (itemNamesData as { items: Array<{ item: string; name: string }> }).items
    // item_names: "{POKEBLOCK} CASE" is the one name spelled with a named glyph run (pkm1, docs/pkm1-pkmn-glyphs.md).
    .map(({ item, name }) => [item, expandRomGlyphCodes(name)]),
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
    frontPicSpecies: member.speciesName.replace(/^SPECIES_/, ""),
  });
}

/**
 * PrintHeldItemName (pokemon_summary_screen.c): ITEM_NONE prints gText_None ("NONE"); any other item its CopyItemName.
 */
function presentedItem(itemId: number): FactoryRentalPresentation["item"] {
  if (itemId === 0) return Object.freeze({ item: "ITEM_NONE", name: "NONE" });
  const item = ITEMS_BY_ID.get(itemId);
  const name = item === undefined ? undefined : ITEM_NAMES.get(item);
  if (item === undefined || name === undefined) throw new Error(`Factory rental has no display name for item id ${itemId}`);
  return Object.freeze({ item, name });
}

/**
 * The rental's presentation with the live battle party laid over it (sum241): current HP, held item, moves with their current
 * PP, and the ailment. Identity, nature, ability, stats and experience stay the record's (Factory mons never level).
 */
export function withLiveBattleMember(
  presentation: FactoryRentalPresentation,
  live: LiveBattleMemberView,
): FactoryRentalPresentation {
  const moves = live.moves.map((moveId, index) => {
    const move = MOVES_BY_ID.get(moveId);
    if (!move) throw new Error(`Factory rental has no summary move info for id ${moveId}`);
    return Object.freeze({ ...move, currentPp: live.pp[index] ?? 0, maxPp: move.pp });
  }) as unknown as FactoryRentalPresentation["moves"];
  return Object.freeze({
    ...presentation,
    item: presentedItem(live.item),
    moves: Object.freeze(moves),
    stats: Object.freeze({ ...presentation.stats, hp: live.hp, maxHp: live.maxHP }),
    ailment: live.ailment,
  });
}
