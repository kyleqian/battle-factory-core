/**
 * Forced-switch ground truth §4 slice 2 (AI side): `GetMostSuitableMonToSwitchInto`
 * (`battle_ai_switch_items.c:629-790`), the pure, RNG-free scoring function
 * `OpponentHandleChoosePokemon` calls synchronously to pick the AI's
 * replacement mon (`docs/forced-switch-ground-truth.md` §1b/§2).
 *
 * Scope: pass 1 only (`:690-746`, the type-matchup + super-effective-move
 * gate) -- the live-proven MACHOP-over-PIDGEY ledger (§2a) resolves entirely
 * within pass 1. Pass 2 (`:748-789`, the `AI_CalcDmg` raw-damage fallback
 * used only when NO bench mon clears pass 1's gate) is a deliberate, named
 * (b) barrier: it needs a materially larger port (stat stages, full damage
 * calc under AI's fixed-roll convention) that no fixture on this rung
 * exercises. `BATTLE_TYPE_ARENA`/`BATTLE_TYPE_DOUBLE`/multi-battle branches
 * (`:634-660`) are singles-Factory-unreachable and likewise out of scope --
 * this module only models the plain-singles branch (`opposingBattler =
 * BATTLE_OPPOSITE(...)`, `battlerIn1 == battlerIn2 == gActiveBattler`).
 */
import movesData from "../data/gen/moves.json" with { type: "json" };
import typeEffectivenessData from "../data/gen/type-effectiveness.json" with { type: "json" };
import type { TypeEffectivenessEntry } from "./damageCalc.ts";
import type { BattleScriptPartyMemberMoves } from "./battleScriptRulesContext.ts";

type MoveTypeRow = Readonly<{ id: number; type: string }>;

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
function moveIsSuperEffectiveAgainst(moveId: number, opposingTypes: BattleAiSwitchTypes): boolean {
  if (moveId === MOVE_NONE) return false;
  const move = MOVES_BY_ID.get(moveId);
  if (!move) return false;
  const multiplier = modulateByTypeEffectiveness(move.type, opposingTypes, TYPE_MUL_NORMAL);
  return multiplier > TYPE_MUL_NORMAL;
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
    if (bestMon.moves.some((moveId) => moveIsSuperEffectiveAgainst(moveId, opposingTypes))) {
      return Object.freeze({ kind: "resolved", partyIndex: bestMonId });
    }
    invalid.add(bestMonId);
  }
  return Object.freeze({ kind: "damage-fallback-needed" });
}
