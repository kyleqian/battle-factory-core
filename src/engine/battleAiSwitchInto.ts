/**
 * Forced-switch ground truth §4 slice 2 (AI side): `GetMostSuitableMonToSwitchInto`
 * (`battle_ai_switch_items.c:629-790`), the pure, RNG-free scoring function
 * `OpponentHandleChoosePokemon` calls synchronously to pick the AI's
 * replacement mon (`docs/forced-switch-ground-truth.md` §1b/§2).
 *
 * Both singles passes are modeled. Pass 2 (`:748-789`) deliberately preserves
 * the source quirks: `AI_CalcDmg` uses the current active battler and global
 * `gCurrentMove` for every candidate, while `TypeCalc` applies the candidate
 * move only for STAB/type scaling; the non-BUGFIX build's `bestDmg` assignment
 * wraps to u8 after each strict-greater comparison. `BATTLE_TYPE_ARENA`/
 * `BATTLE_TYPE_DOUBLE`/multi-battle branches
 * (`:634-660`) are singles-Factory-unreachable and likewise out of scope --
 * this module only models the plain-singles branch (`opposingBattler =
 * BATTLE_OPPOSITE(...)`, `battlerIn1 == battlerIn2 == gActiveBattler`).
 */
import movesData from "../data/gen/moves.json" with { type: "json" };
import typeEffectivenessData from "../data/gen/type-effectiveness.json" with { type: "json" };
import type { TypeEffectivenessEntry } from "./damageCalc.ts";
import type { BattleScriptPartyMemberMoves } from "./battleScriptRulesContext.ts";

type MoveTypeRow = Readonly<{ id: number; type: string; power: number }>;

const MOVES_BY_ID: ReadonlyMap<number, MoveTypeRow> = new Map(
  (movesData.moves as readonly MoveTypeRow[]).map((row) => [row.id, row]),
);
const TYPE_EFFECTIVENESS = typeEffectivenessData.typeEffectiveness as readonly TypeEffectivenessEntry[];

/** TYPE_MUL_NORMAL / TYPE_MUL_NO_EFFECT (include/constants/battle.h). */
const TYPE_MUL_NORMAL = 10;
const TYPE_MUL_NO_EFFECT = 0;
/** PARTY_SIZE (include/constants/pokemon.h). */
const PARTY_SIZE = 6;
const MOVE_NONE = 0;

export type BattleAiSwitchTypes = readonly [string, string];

export type BattleAiSwitchBenchMember = Readonly<{
  species: number;
  hp: number;
  types: BattleAiSwitchTypes;
  moves: BattleScriptPartyMemberMoves;
}>;

export type BattleAiSwitchBench = readonly [
  BattleAiSwitchBenchMember,
  BattleAiSwitchBenchMember,
  BattleAiSwitchBenchMember,
  BattleAiSwitchBenchMember,
  BattleAiSwitchBenchMember,
  BattleAiSwitchBenchMember,
];

export type BattleAiSwitchIntoResult =
  | Readonly<{ kind: "resolved"; partyIndex: number }>
  | Readonly<{ kind: "damage-fallback-needed" }>;

export type BattleAiSwitchDamageFallback = Readonly<{
  /** `AI_CalcDmg(gActiveBattler, opposingBattler)` before candidate `TypeCalc`. */
  baseDamage: number;
  activeTypes: BattleAiSwitchTypes;
  opposingTypes: BattleAiSwitchTypes;
  /** Numeric ABILITY_* value on the opposing active battler. */
  opposingAbility: number;
  /** Source gBattleMons[opposingBattler].status2, for Foresight's immunity skip. */
  opposingStatus2: number;
}>;

const MOVE_STRUGGLE = 165;
const LEVITATE_ID = 26;
/** include/constants/battle.h STATUS2_FORESIGHT. */
const STATUS2_FORESIGHT = 1 << 29;

function typeMultiplierTenths(attackingType: string, defendingType: string): number {
  const entry = TYPE_EFFECTIVENESS.find(
    (candidate) => candidate.attackingType === attackingType && candidate.defendingType === defendingType,
  );
  return entry ? entry.multiplierTenths : TYPE_MUL_NORMAL;
}

/**
 * `ModulateByTypeEffectiveness` (`battle_ai_switch_items.c:605-624`): the
 * real `*var = (*var * mult) / 10` truncating in-out accumulator, checking
 * defType2 only when it differs from defType1. No floor-to-1 protection --
 * that belongs to `Cmd_typecalc`'s own final-damage domain
 * (`damageCalc.ts`'s `applyTypeEffectiveness`), not this AI-scoring one.
 */
function modulateByTypeEffectiveness(
  attackingType: string,
  defendingTypes: BattleAiSwitchTypes,
  runningVar: number,
): number {
  let v = Math.trunc((runningVar * typeMultiplierTenths(attackingType, defendingTypes[0])) / 10);
  if (defendingTypes[1] !== defendingTypes[0]) {
    v = Math.trunc((v * typeMultiplierTenths(attackingType, defendingTypes[1])) / 10);
  }
  return v;
}

/**
 * The two `ModulateByTypeEffectiveness(gBattleMons[opposingBattler].types[N], ...)`
 * calls (`:702-703`) -- unconditionally twice, even when the opposing
 * battler is mono-type (types[0] === types[1]), matching source exactly
 * (the dedup only ever applies to the defender side, never the attacker
 * side here).
 */
function computeTypeMatchupScore(
  opposingTypes: BattleAiSwitchTypes,
  candidateTypes: BattleAiSwitchTypes,
): number {
  let v = TYPE_MUL_NORMAL;
  v = modulateByTypeEffectiveness(opposingTypes[0], candidateTypes, v);
  v = modulateByTypeEffectiveness(opposingTypes[1], candidateTypes, v);
  return v;
}

/** `TypeCalc(move, gActiveBattler, opposingBattler) & MOVE_RESULT_SUPER_EFFECTIVE` (`:723`). */
function moveIsSuperEffectiveAgainst(
  moveId: number,
  opposingTypes: BattleAiSwitchTypes,
  opposingAbility?: number,
  opposingStatus2 = 0,
): boolean {
  if (moveId === MOVE_NONE) return false;
  const move = MOVES_BY_ID.get(moveId);
  if (!move) return false;
  if (opposingAbility === LEVITATE_ID && move.type === "TYPE_GROUND") return false;
  let multiplier = TYPE_MUL_NORMAL;
  const distinctTypes = opposingTypes[0] === opposingTypes[1] ? [opposingTypes[0]] : opposingTypes;
  for (const defendingType of distinctTypes) {
    if (
      (opposingStatus2 & STATUS2_FORESIGHT) !== 0
      && defendingType === "TYPE_GHOST"
      && (move.type === "TYPE_NORMAL" || move.type === "TYPE_FIGHTING")
    ) {
      continue;
    }
    multiplier = Math.trunc((multiplier * typeMultiplierTenths(move.type, defendingType)) / 10);
  }
  return multiplier > TYPE_MUL_NORMAL;
}

/**
 * `TypeCalc(move, gActiveBattler, opposingBattler)`'s damage mutations for
 * pass 2. Levitate sets miss/no-effect flags but intentionally leaves damage
 * at its post-STAB value; Wonder Guard likewise changes flags only, which the
 * selector never reads. Foresight skips only Normal/Fighting -> Ghost
 * immunity entries.
 */
function typeCalcCandidateDamage(
  moveId: number,
  fallback: BattleAiSwitchDamageFallback,
): number {
  const move = MOVES_BY_ID.get(moveId);
  if (!move || moveId === MOVE_STRUGGLE) return fallback.baseDamage;

  let damage = fallback.baseDamage;
  if (fallback.activeTypes[0] === move.type || fallback.activeTypes[1] === move.type) {
    damage = Math.trunc((damage * 15) / 10);
  }
  if (fallback.opposingAbility === LEVITATE_ID && move.type === "TYPE_GROUND") {
    return damage;
  }

  const distinctDefendingTypes = fallback.opposingTypes[0] === fallback.opposingTypes[1]
    ? [fallback.opposingTypes[0]]
    : fallback.opposingTypes;
  for (const defendingType of distinctDefendingTypes) {
    const foresightSkipsImmunity =
      (fallback.opposingStatus2 & STATUS2_FORESIGHT) !== 0
      && defendingType === "TYPE_GHOST"
      && (move.type === "TYPE_NORMAL" || move.type === "TYPE_FIGHTING");
    if (foresightSkipsImmunity) continue;
    const multiplier = typeMultiplierTenths(move.type, defendingType);
    damage = Math.trunc((damage * multiplier) / 10);
    if (damage === 0 && multiplier !== 0) damage = 1;
  }
  return damage;
}

/**
 * `GetMostSuitableMonToSwitchInto`'s pass-1 `while (invalidMons != (1 <<
 * PARTY_SIZE) - 1)` loop (`:690-746`), singles-only (`battlerIn1 ==
 * battlerIn2 == gActiveBattler`, so the only exclusion beyond
 * species/hp/already-invalid is the active battler's own current party
 * slot). Returns `damage-fallback-needed` when no bench mon ever clears
 * both gates -- pass 2's own scope, a named barrier at the opcode layer.
 */
export function getMostSuitableMonToSwitchInto(
  bench: BattleAiSwitchBench,
  activePartyIndex: number,
  opposingTypes: BattleAiSwitchTypes,
  damageFallback?: BattleAiSwitchDamageFallback,
): BattleAiSwitchIntoResult {
  const invalid = new Set<number>();
  while (invalid.size !== PARTY_SIZE) {
    let bestDmg = TYPE_MUL_NO_EFFECT;
    let bestMonId = -1;
    for (let i = 0; i < PARTY_SIZE; i += 1) {
      const member = bench[i]!;
      if (
        member.species !== 0
        && member.hp !== 0
        && !invalid.has(i)
        && i !== activePartyIndex
      ) {
        const typeDmg = computeTypeMatchupScore(opposingTypes, member.types);
        // Possible source bug, preserved faithfully (battle_ai_switch_items.c:713-715):
        // this picks the type that takes the MOST damage from the opponent, not the least.
        if (bestDmg < typeDmg) {
          bestDmg = typeDmg;
          bestMonId = i;
        }
      } else {
        invalid.add(i);
      }
    }

    if (bestMonId === -1) {
      for (let i = 0; i < PARTY_SIZE; i += 1) invalid.add(i);
      break;
    }

    const bestMon = bench[bestMonId]!;
    if (bestMon.moves.some((moveId) => moveIsSuperEffectiveAgainst(
      moveId,
      opposingTypes,
      damageFallback?.opposingAbility,
      damageFallback?.opposingStatus2,
    ))) {
      return Object.freeze({ kind: "resolved", partyIndex: bestMonId });
    }
    invalid.add(bestMonId);
  }
  if (!damageFallback) return Object.freeze({ kind: "damage-fallback-needed" });

  // Pinned non-BUGFIX source declares bestDmg as u8. The comparison promotes
  // it, but a successful assignment truncates the signed damage back to u8.
  let bestDmg = 0;
  let bestMonId = PARTY_SIZE;
  for (let i = 0; i < PARTY_SIZE; i += 1) {
    const member = bench[i]!;
    if (member.species === 0 || member.hp === 0 || i === activePartyIndex) continue;
    for (let j = 0; j < member.moves.length; j += 1) {
      const moveId = member.moves[j]!;
      const move = MOVES_BY_ID.get(moveId);
      let damage = 0;
      if (moveId !== MOVE_NONE && move?.power !== 1) {
        damage = typeCalcCandidateDamage(moveId, damageFallback);
      }
      if (bestDmg < damage) {
        bestDmg = damage & 0xff;
        bestMonId = i;
      }
    }
  }
  return Object.freeze({ kind: "resolved", partyIndex: bestMonId });
}
