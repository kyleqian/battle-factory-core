/**
 * Pure gFacilityTrainerMons -> battle-kernel party construction.
 *
 * Source ownership:
 * - `CreateMonWithEVSpreadNatureOTID` splits MAX_TOTAL_EVS across the set's
 *   flagged stats and accepts only personalities whose `% NUM_NATURES`
 *   matches the set (`pokemon.c:2562-2593`, `:5498-5501`).
 * - Factory parties replace friendship/moves/item after creation
 *   (`battle_tower.c:1870-1883`, `battle_factory.c:440-464`).
 * - fixed IVs are copied to all six stats (`pokemon.c:2265-2273`).
 *
 * Selection/retry/RNG policy deliberately does not live here. Callers supply
 * the already-selected set and its instance identity.
 */

import abilityItemHooksData from "../data/gen/ability-item-hooks.json" with { type: "json" };
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import expTablesData from "../data/gen/exp-tables.json" with { type: "json" };
import movesData from "../data/gen/moves.json" with { type: "json" };
import naturesData from "../data/gen/natures.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import {
  uniformBattleScriptIvs,
  type BattleScriptPartyMemberState,
} from "./battleScriptRulesContext.ts";
import { getMonGender, type MonGender } from "./monGender.ts";
import { natureFromPersonality } from "./opponentGen.ts";
import { calculateHpStat, calculateOtherStat, type NatureModifier } from "./stats.ts";

const FACTORY_LEVEL_50 = 50;
const MAX_TOTAL_EVS = 510;
const SHINY_ODDS = 8;

const STAT_NAMES = ["hp", "attack", "defense", "speed", "spAttack", "spDefense"] as const;
type StatName = (typeof STAT_NAMES)[number];
export type FactoryCorpusEvs = Readonly<Record<StatName, number>>;
export type FactoryCorpusPpUps = readonly [number, number, number, number];

type FrontierMonRow = Readonly<{
  index: number;
  species: string;
  moves: readonly [string, string, string, string];
  itemTableId: number;
  evSpreadStats: readonly string[];
  nature: string;
}>;
type SpeciesRow = Readonly<{
  id: number;
  name: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseSpAttack: number;
  baseSpDefense: number;
  abilities: readonly [string, string];
  genderRatio: number;
}>;
type NatureRow = Readonly<{
  index: number;
  name: string;
  attack: NatureModifier;
  defense: NatureModifier;
  speed: NatureModifier;
  spAttack: NatureModifier;
  spDefense: NatureModifier;
}>;
type MoveRow = Readonly<{ move: string; id: number; pp: number }>;
type HeldItemRow = Readonly<{
  itemTableId: number;
  itemId: number;
  item: string;
  holdEffect: string;
  holdEffectParam: number;
}>;
type SymbolIdRow = Readonly<{ name: string; id: number }>;

const FRONTIER_MONS = (frontierMonsData as unknown as { entries: FrontierMonRow[] }).entries;
const SPECIES_BY_NAME = new Map(
  (speciesStatsData as unknown as { species: SpeciesRow[] }).species.map((row) => [row.name, row]),
);
const NATURES = (naturesData as { natures: NatureRow[] }).natures;
const NATURE_BY_NAME = new Map(NATURES.map((row) => [row.name, row]));
const MOVES_BY_NAME = new Map(
  (movesData as { moves: MoveRow[] }).moves.map((row) => [row.move, row]),
);
const ITEMS_BY_TABLE_ID = new Map(
  (frontierHeldItemsData as { entries: HeldItemRow[] }).entries.map((row) => [row.itemTableId, row]),
);
const ABILITY_ID_BY_NAME = new Map(
  (abilityItemHooksData as { universes: { abilities: SymbolIdRow[] } }).universes.abilities
    .map((row) => [row.name, row.id]),
);
const HOLD_EFFECT_ID_BY_NAME = new Map(
  (abilityItemHooksData as { universes: { holdEffects: SymbolIdRow[] } }).universes.holdEffects
    .map((row) => [row.name, row.id]),
);
const EXP_DATA = expTablesData as {
  growthRates: Record<string, number[]>;
  speciesGrowthRate: Record<string, string>;
};

const EV_STAT_BY_FLAG: Readonly<Record<string, StatName>> = Object.freeze({
  F_EV_SPREAD_HP: "hp",
  F_EV_SPREAD_ATTACK: "attack",
  F_EV_SPREAD_DEFENSE: "defense",
  F_EV_SPREAD_SPEED: "speed",
  F_EV_SPREAD_SP_ATTACK: "spAttack",
  F_EV_SPREAD_SP_DEFENSE: "spDefense",
});

export type FactoryCorpusPartyInstance = Readonly<{
  setId: number;
  personality: number;
  fixedIv: number;
  abilitySlot: 0 | 1;
  /**
   * Source OT id used solely for GET_SHINY_VALUE. Factory callers should pass
   * the player's trainer id; zero remains a deterministic convenience for
   * corpus validation and does not affect kernel mechanics.
   */
  otId?: number;
}>;

/**
 * A structural subtype of BattleScriptPartyMemberState. Extra fields retain
 * the complete-party battle-lab inputs and resolved catalog identities so
 * later facility layers never need parallel hand-authored lookup tables.
 */
export type FactoryCorpusPartyMemberState = BattleScriptPartyMemberState & Readonly<{
  setId: number;
  speciesName: string;
  nature: number;
  natureName: string;
  evs: FactoryCorpusEvs;
  ppUps: FactoryCorpusPpUps;
  itemName: string;
  ability: number;
  abilityName: string;
  abilitySlot: 0 | 1;
  holdEffect: number;
  holdEffectName: string;
  holdEffectParam: number;
  gender: MonGender;
  shiny: boolean;
}>;

function requireU32(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`${field} must be a source u32, got ${value}`);
  }
  return value >>> 0;
}

function deriveEvs(set: FrontierMonRow): FactoryCorpusEvs {
  const flaggedCount = set.evSpreadStats.length;
  if (flaggedCount === 0) throw new Error(`Frontier set ${set.index} has an empty EV spread`);
  const evPerStat = Math.floor(MAX_TOTAL_EVS / flaggedCount);
  const evs: Record<StatName, number> = {
    hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0,
  };
  for (const flag of set.evSpreadStats) {
    const stat = EV_STAT_BY_FLAG[flag];
    if (stat === undefined) throw new Error(`Frontier set ${set.index} has unknown EV flag ${flag}`);
    evs[stat] = evPerStat;
  }
  return Object.freeze(evs);
}

function isShiny(otId: number, personality: number): boolean {
  // include/pokemon.h:371 GET_SHINY_VALUE; constants/pokemon.h:94.
  const value = ((otId >>> 16) ^ (otId & 0xffff)
    ^ (personality >>> 16) ^ (personality & 0xffff)) & 0xffff;
  return value < SHINY_ODDS;
}

/** Builds one legal Level-50 Factory member without touching engine state. */
export function createFactoryCorpusPartyMember(
  instance: FactoryCorpusPartyInstance,
): FactoryCorpusPartyMemberState {
  if (!Number.isSafeInteger(instance.setId) || instance.setId < 0 || instance.setId >= FRONTIER_MONS.length) {
    throw new Error(`Frontier set id must be in 0..${FRONTIER_MONS.length - 1}, got ${instance.setId}`);
  }
  const personality = requireU32(instance.personality, "personality");
  const otId = requireU32(instance.otId ?? 0, "otId");
  const set = FRONTIER_MONS[instance.setId]!;
  const species = SPECIES_BY_NAME.get(set.species);
  const setNature = NATURE_BY_NAME.get(set.nature);
  if (species === undefined) throw new Error(`Frontier set ${set.index} has unknown species ${set.species}`);
  if (setNature === undefined) throw new Error(`Frontier set ${set.index} has unknown nature ${set.nature}`);

  // GetNatureFromPersonality (pokemon.c:5498-5501), after the source
  // rejection loop has selected a personality for this set's nature.
  const nature = natureFromPersonality(personality);
  if (nature !== setNature.index) {
    throw new Error(
      `Frontier set ${set.index} requires nature ${setNature.index}, personality ${personality} derives ${nature}`,
    );
  }

  const ivs = uniformBattleScriptIvs(instance.fixedIv);
  const evs = deriveEvs(set);
  const moves = set.moves.map((name) => {
    const row = MOVES_BY_NAME.get(name);
    if (row === undefined) throw new Error(`Frontier set ${set.index} has unknown move ${name}`);
    return row.id;
  }) as unknown as readonly [number, number, number, number];
  // Facility sets carry no PP Ups. SetMonMoveSlot writes base PP and leaves
  // the freshly zeroed packed bonus byte untouched (pokemon.c:2974-2978).
  const ppUps = Object.freeze([0, 0, 0, 0] as const);
  const pp = set.moves.map((name) => MOVES_BY_NAME.get(name)!.pp) as unknown as readonly [
    number, number, number, number,
  ];
  const item = ITEMS_BY_TABLE_ID.get(set.itemTableId);
  if (item === undefined) throw new Error(`Frontier set ${set.index} has unknown item table id ${set.itemTableId}`);
  const holdEffect = HOLD_EFFECT_ID_BY_NAME.get(item.holdEffect);
  if (holdEffect === undefined) throw new Error(`Frontier item ${item.item} has unknown hold effect ${item.holdEffect}`);

  // CreateBoxMon only uses personality bit 0 for a genuine second ability
  // (pokemon.c:2296-2300). Single-ability species always serialize slot 0.
  const abilitySlot: 0 | 1 = species.abilities[1] === "ABILITY_NONE" ? 0 : instance.abilitySlot;
  const abilityName = species.abilities[abilitySlot]!;
  const ability = ABILITY_ID_BY_NAME.get(abilityName);
  if (ability === undefined) throw new Error(`Species ${species.name} has unknown ability ${abilityName}`);

  const growthRate = EXP_DATA.speciesGrowthRate[species.name];
  const experience = growthRate === undefined ? undefined : EXP_DATA.growthRates[growthRate]?.[FACTORY_LEVEL_50];
  if (experience === undefined) throw new Error(`Species ${species.name} has no Level-50 experience entry`);

  const maxHP = calculateHpStat(species.baseHp, ivs.hp, evs.hp, FACTORY_LEVEL_50);
  const attack = calculateOtherStat(
    species.baseAttack, ivs.attack, evs.attack, FACTORY_LEVEL_50, setNature.attack,
  );
  const defense = calculateOtherStat(
    species.baseDefense, ivs.defense, evs.defense, FACTORY_LEVEL_50, setNature.defense,
  );
  const speed = calculateOtherStat(
    species.baseSpeed, ivs.speed, evs.speed, FACTORY_LEVEL_50, setNature.speed,
  );
  const spAttack = calculateOtherStat(
    species.baseSpAttack, ivs.spAttack, evs.spAttack, FACTORY_LEVEL_50, setNature.spAttack,
  );
  const spDefense = calculateOtherStat(
    species.baseSpDefense, ivs.spDefense, evs.spDefense, FACTORY_LEVEL_50, setNature.spDefense,
  );

  return Object.freeze({
    setId: set.index,
    species: species.id,
    speciesName: species.name,
    isEgg: false,
    abilityNum: abilitySlot,
    abilitySlot,
    ability,
    abilityName,
    ivs,
    personality,
    experience,
    level: FACTORY_LEVEL_50,
    friendship: 0,
    maxHP,
    attack,
    defense,
    speed,
    spAttack,
    spDefense,
    hp: maxHP,
    status1: 0,
    item: item.itemId,
    itemName: item.item,
    holdEffect,
    holdEffectName: item.holdEffect,
    holdEffectParam: item.holdEffectParam,
    moves: Object.freeze(moves),
    pp: Object.freeze(pp),
    ppBonuses: 0,
    ppUps,
    nature,
    natureName: setNature.name,
    evs,
    gender: getMonGender(species.genderRatio, personality),
    shiny: isShiny(otId, personality),
  });
}

/** Builds the three slots used by the Level-50 singles Factory contract. */
export function createFactoryCorpusParty(
  instances: readonly [
    FactoryCorpusPartyInstance,
    FactoryCorpusPartyInstance,
    FactoryCorpusPartyInstance,
  ],
): readonly [
  FactoryCorpusPartyMemberState,
  FactoryCorpusPartyMemberState,
  FactoryCorpusPartyMemberState,
] {
  return Object.freeze(instances.map(createFactoryCorpusPartyMember)) as unknown as readonly [
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
    FactoryCorpusPartyMemberState,
  ];
}
