// cln11: build a staged battler from one `overrides.parties` lab entry (oracle/BATTLE_LAB.md) with the engine's own stat code.
// What the oracle's `_write_party_mon` writes (species, level, nature, six IVs, six EVs, moves + PP Ups, item, abilitySlot, friendship,
// personality) is derived here from src/data/gen + src/engine/stats.ts; anything the staged-battle seam cannot carry throws with the lab / side / field named.
import { readFileSync } from "node:fs";
import abilityItemHooksData from "../../src/data/gen/ability-item-hooks.json" with { type: "json" };
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import speciesStatsData from "../../src/data/gen/species-stats.json" with { type: "json" };
import speciesTypesData from "../../src/data/gen/species-types.json" with { type: "json" };
import type { BattleScriptPartyMemberInput } from "../../src/engine/battleScriptRulesContext.ts";
import type { FactoryFullTurnBattlerConfig } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type { PartySelectLabMember } from "../../src/engine/partySelect.ts";
import { calculateMaxHp, calculateOtherStat, type NatureModifier } from "../../src/engine/stats.ts";

export const LAB_STAT_NAMES = ["hp", "attack", "defense", "speed", "spAttack", "spDefense"] as const;
type LabStat = (typeof LAB_STAT_NAMES)[number];

export interface LabMon {
  readonly species: number;
  readonly moves: readonly number[];
  readonly level?: number;
  readonly nature?: number;
  readonly ivs?: Readonly<Record<string, number>>;
  readonly evs?: Readonly<Record<string, number>>;
  readonly ppUps?: readonly number[];
  readonly item?: number;
  readonly abilitySlot?: number;
  readonly friendship?: number;
  readonly personality?: number;
  readonly gender?: string;
  readonly shiny?: boolean;
}

export interface LabMonContext {
  /** Lab name (for error messages). */
  readonly lab: string;
  /** `player` / `opponent`. */
  readonly side: "player" | "opponent";
  readonly index: number;
  /** The lab's `seed` (drives the oracle's personality search) and request `level` (the per-mon default). */
  readonly seed: number;
  readonly defaultLevel: number;
}

export interface LabBuiltMon {
  readonly config: FactoryFullTurnBattlerConfig;
  readonly member: BattleScriptPartyMemberInput;
  readonly personality: number;
  readonly maxHp: number;
  /** lsf2: the party-menu identity of this mon (a forced selector reads it instead of a rental record). */
  readonly partyMember: PartySelectLabMember;
}

type SpeciesRow = { id: number; name: string; baseHp: number; baseAttack: number; baseDefense: number; baseSpeed: number; baseSpAttack: number; baseSpDefense: number; abilities: readonly [string, string]; genderRatio: number };
const SPECIES_BY_ID = new Map((speciesStatsData as unknown as { species: SpeciesRow[] }).species.map((row) => [row.id, row]));
const TYPES_BY_NAME = new Map((speciesTypesData as unknown as { species: { name: string; types: [string, string] }[] }).species.map((row) => [row.name, row.types]));
const ABILITY_ID_BY_NAME = new Map((abilityItemHooksData as { universes: { abilities: { name: string; id: number }[] } }).universes.abilities.map((row) => [row.name, row.id]));
const BASE_PP_BY_MOVE = new Map((movesData.moves as readonly { id: number; pp: number }[]).map((row) => [row.id, row.pp]));
const NATURES = naturesData.natures as readonly { index: number; attack: NatureModifier; defense: NatureModifier; speed: NatureModifier; spAttack: NatureModifier; spDefense: NatureModifier }[];
const SPECIES_FRIENDSHIP = JSON.parse(readFileSync(new URL("./labSpeciesFriendship.json", import.meta.url), "utf8")) as Readonly<Record<string, number>>;

const MOVE_HIDDEN_POWER = 237;
const MON_GENDERLESS = 0xff;

function gender(personality: number, ratio: number): string {
  if (ratio === MON_GENDERLESS) return "genderless";
  return (personality & 0xff) < ratio ? "female" : "male";
}

/**
 * The oracle's personality (battle_lab.py `_select_personality` + `_apply_custom_parties`): an exact `personality` as given; otherwise the first value from
 * `(seed ^ 0x9E3779B9 * (sideIndex * 3 + index + 1)) & 0xFFFFFFFF` upward whose `% 25` is the nature and whose gender matches. The oracle also rejects shiny
 * values against the record's OT id, which is not known here (shiny ~ 8/65536); a requested `shiny` without an exact personality is therefore unsupported.
 */
export function labPersonality(mon: LabMon, ctx: LabMonContext, nature: number, ratio: number): number {
  if (mon.personality !== undefined) return mon.personality >>> 0;
  const sideIndex = ctx.side === "player" ? 0 : 1;
  const start = Number((BigInt(ctx.seed) ^ (0x9e3779b9n * BigInt(sideIndex * 3 + ctx.index + 1))) & 0xffff_ffffn);
  for (let offset = 0; offset < 0x10000; offset += 1) {
    const candidate = (start + offset) >>> 0;
    if (candidate % 25 === nature && (mon.gender === undefined || gender(candidate, ratio) === mon.gender)) return candidate;
  }
  throw new Error(`lab stage ${ctx.lab}: ${ctx.side}[${ctx.index}] has no personality matching nature ${nature} / gender ${mon.gender}`);
}

export function labBaseFriendship(speciesName: string): number {
  const value = SPECIES_FRIENDSHIP[speciesName];
  if (value === undefined) throw new Error(`no base friendship for ${speciesName} (re-run tools/extract/extractSpeciesFriendship.py)`);
  return value;
}

export function buildLabMon(mon: LabMon, ctx: LabMonContext): LabBuiltMon {
  const where = `lab stage ${ctx.lab}: ${ctx.side}[${ctx.index}]`;
  const species = SPECIES_BY_ID.get(mon.species);
  if (species === undefined) throw new Error(`${where} species ${mon.species} is not in species-stats.json`);
  if (mon.shiny === true && mon.personality === undefined) throw new Error(`${where} asks for shiny without an exact personality (the OT id is not known to the stage)`);
  if (mon.moves.includes(MOVE_HIDDEN_POWER)) throw new Error(`${where} has Hidden Power: the staged battler cannot carry the lab's IVs (its type and power come from them)`);
  if (mon.moves.length !== 4) throw new Error(`${where} needs four moves, got ${mon.moves.length}`);

  const level = mon.level ?? ctx.defaultLevel;
  const nature = mon.nature ?? (mon.personality !== undefined ? mon.personality % 25 : 0);
  const natureRow = NATURES[nature];
  if (natureRow === undefined) throw new Error(`${where} nature ${nature} is not in natures.json`);
  const ivs = Object.fromEntries(LAB_STAT_NAMES.map((name) => [name, mon.ivs?.[name] ?? 31])) as Record<LabStat, number>;
  const evs = Object.fromEntries(LAB_STAT_NAMES.map((name) => [name, mon.evs?.[name] ?? 0])) as Record<LabStat, number>;
  const abilitySlot = (mon.abilitySlot ?? 0) as 0 | 1;
  const abilityName = species.abilities[abilitySlot];
  const ability = abilityName === undefined ? undefined : ABILITY_ID_BY_NAME.get(abilityName);
  if (ability === undefined || ability === 0) throw new Error(`${where} abilitySlot ${abilitySlot} is not available for ${species.name}`);
  const types = TYPES_BY_NAME.get(species.name);
  if (types === undefined) throw new Error(`${where} ${species.name} is not in species-types.json`);

  const ppUps = mon.ppUps ?? [0, 0, 0, 0];
  const pp = mon.moves.map((move, i) => {
    if (move === 0) return 0;
    const base = BASE_PP_BY_MOVE.get(move);
    if (base === undefined) throw new Error(`${where} move ${move} is not in moves.json`);
    return base + Math.floor((base * 20 * (ppUps[i] ?? 0)) / 100);
  }) as unknown as readonly [number, number, number, number];
  const moves = mon.moves as unknown as readonly [number, number, number, number];

  const personality = labPersonality(mon, ctx, nature, species.genderRatio);
  const maxHp = calculateMaxHp(species.id, species.baseHp, ivs.hp, evs.hp, level);
  const stat = (base: number, name: Exclude<LabStat, "hp">): number => calculateOtherStat(base, ivs[name], evs[name], level, natureRow[name]);
  const attack = stat(species.baseAttack, "attack");
  const defense = stat(species.baseDefense, "defense");
  const speed = stat(species.baseSpeed, "speed");
  const spAttack = stat(species.baseSpAttack, "spAttack");
  const spDefense = stat(species.baseSpDefense, "spDefense");
  const friendship = mon.friendship ?? labBaseFriendship(species.name);
  const item = mon.item ?? 0;

  const config: FactoryFullTurnBattlerConfig = Object.freeze({
    species: species.id,
    moveId: moves[0],
    moves,
    pp,
    ability,
    abilityNum: abilitySlot,
    personality,
    item,
    friendship,
    level,
    attack, defense, spAttack, spDefense, speed,
    hp: maxHp,
    maxHp,
    types: types as readonly [string, string],
  });
  const member: BattleScriptPartyMemberInput = Object.freeze({
    species: species.id,
    isEgg: false,
    abilityNum: abilitySlot,
    personality,
    level,
    friendship,
    hp: maxHp,
    maxHP: maxHp,
    attack, defense, speed, spAttack, spDefense,
    status1: 0,
    item,
    moves,
    pp,
  });
  const partyMember: PartySelectLabMember = Object.freeze({
    species: species.id,
    speciesName: species.name,
    level,
    personality,
    abilitySlot,
    friendship,
    item,
  });
  return { config, member, personality, maxHp, partyMember };
}

// The fields the hand-written Rattata-era stages approximate (personality 150, friendship 0, PP 20, Run Away on every species, a Splash bench of two Rattata) and the generic stage
// takes from the lab. `labStageEquivalenceView` strips them (and keeps only party slot 0 of each side) so a generic stage can be compared `toEqual` with a hand-written one.
const APPROXIMATED_BY_HAND_STAGES = new Set(["personality", "friendship", "pp", "currentPP", "ability"]);
export function labStageEquivalenceView(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => labStageEquivalenceView(v));
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (APPROXIMATED_BY_HAND_STAGES.has(key)) continue;
    const sides = v as { player?: unknown; opponent?: unknown } | null;
    out[key] = key === "party" && sides !== null && typeof sides === "object" && Array.isArray(sides.player) && Array.isArray(sides.opponent)
      ? { player: labStageEquivalenceView(sides.player.slice(0, 1)), opponent: labStageEquivalenceView(sides.opponent.slice(0, 1)) }
      : labStageEquivalenceView(v);
  }
  return out;
}
