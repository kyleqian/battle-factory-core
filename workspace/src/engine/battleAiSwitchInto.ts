/**
 * Forced-switch ground truth §4 slice 2 (AI side): `GetMostSuitableMonToSwitchInto`
 * (`battle_ai_switch_items.c:629-790`), the pure, RNG-free scoring function
 * `OpponentHandleChoosePokemon` calls synchronously to pick the AI's
 * replacement mon (`docs/forced-switch-ground-truth.md` §1b/§2).
 *
 * Both singles passes are modeled. Pass 1's super-effective-move test is
 * `TypeCalc`'s FLAG result, which needs the move's power and the opposing
 * battler's ability / status2 (`docs/parity-mac/opponent-replacement-pass1.md`). Pass 2 (`:748-789`) deliberately preserves
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
import { matchingTypeEffectivenessRows, type TypeEffectivenessEntry } from "./damageCalc.ts";
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

/**
 * fch1: the work `GetMostSuitableMonToSwitchInto` did, for the replacement's CPU-time model (`aiReplacementChoiceExtraFrames`): pass-1 rounds, GetMonData
 * reads of a species / a move (each decrypts the Pokemon substructures), per-candidate type scores, TypeCalc and AI_CalcDmg calls.
 */
export type BattleAiSwitchIntoWork = {
  rounds: number;
  speciesReads: number;
  candidateScores: number;
  moveReads: number;
  typeCalcs: number;
  damageCalcs: number;
  fallback: boolean;
};

/**
 * fch1 (D4 "faithful timing", docs/faithful-timing.md): the frames the ROM script waits on the controller while `OpponentHandleChoosePokemon` runs the
 * scorer, over the base `openpartyscreen` -> `FaintedMonSendOutNew` chain of 6 (docs/aud251-s11-scoreboard-refresh.md "fsc2m" section 3, "fch1"). The
 * cost is CPU time, a frame count that also depends on the frame's phase; fitted to the 32 AI choices of the 24 t2n Scene OFF seeds (ROM 6 .. 10 frames) as
 * round(0.16 * moveReads - 0.3), moveReads = the GetMonData move reads (each decrypts the substructures): 0 when the first type-best candidate
 * has a super-effective move among its first four slots, 1 for a second candidate, 2 .. 4 in the damage fallback.
 */
export const AI_CHOICE_EXTRA_FRAMES_PER_MOVE_READ = 0.16;
export const AI_CHOICE_EXTRA_FRAMES_OFFSET = 0.3;
export function aiReplacementChoiceExtraFrames(work: BattleAiSwitchIntoWork): number {
  return Math.max(0, Math.round(AI_CHOICE_EXTRA_FRAMES_PER_MOVE_READ * work.moveReads - AI_CHOICE_EXTRA_FRAMES_OFFSET));
}

export type BattleAiSwitchDamageFallback = Readonly<{
  /**
   * `AI_CalcDmg(gActiveBattler, opposingBattler)` before candidate `TypeCalc`.
   * A thunk is evaluated once, and only when pass 2 is reached (C calls
   * `AI_CalcDmg` inside the pass-2 loop only, `:778`), so a caller can hand
   * over the whole opposing-battler context up front: pass 1's `TypeCalc`
   * needs `opposingAbility` / `opposingStatus2` too.
   */
  baseDamage: number | (() => number);
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
 * `ModulateByTypeEffectiveness` (`battle_ai_switch_items.c:605-627`): the
 * real `*var = (*var * mult) / 10` truncating in-out accumulator, checking
 * defType2 only when it differs from defType1. The loop walks
 * `gTypeEffectiveness` and applies each matching ROW as it comes, so the
 * steps run in TABLE order, not in type1-then-type2 order, and the u8
 * truncation depends on that order: Rock into Bug/Fighting meets
 * `ROCK, FIGHTING, x0.5` (battle_main.c:422) before `ROCK, BUG, x2` (:425),
 * 5 -> 2 -> 4, where type order gives 5 -> 10 -> 5 (ROM seed 1414,
 * docs/parity-mac/replacement-type-score-table-order.md). The TYPE_FORESIGHT
 * marker row is skipped and the rows after it still apply (`:611-615`). No
 * floor-to-1 protection -- that belongs to `Cmd_typecalc`'s own final-damage
 * domain (`damageCalc.ts`'s `applyTypeEffectiveness`), not this AI-scoring one.
 */
function modulateByTypeEffectiveness(
  attackingType: string,
  defendingTypes: BattleAiSwitchTypes,
  runningVar: number,
): number {
  let v = runningVar;
  for (const row of matchingTypeEffectivenessRows(attackingType, defendingTypes, TYPE_EFFECTIVENESS)) {
    v = Math.trunc((v * row.multiplierTenths) / 10);
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

/**
 * `TypeCalc(move, gActiveBattler, opposingBattler) & MOVE_RESULT_SUPER_EFFECTIVE`
 * (`battle_ai_switch_items.c:733`). `TypeCalc` (`battle_script_commands.c:1536-1591`)
 * returns 0 for MOVE_STRUGGLE, sets only MISSED | DOESNT_AFFECT_FOE for a
 * Ground move into Levitate (`:1554`), and its `ModulateDmgByType2` raises
 * MOVE_RESULT_SUPER_EFFECTIVE only `if (gBattleMoves[move].power ...)`
 * (`:1525`): a status move of a super-effective TYPE (Sand-Attack into Rock,
 * Will-O-Wisp into Steel, Rain Dance into Rock) is never "a super effective
 * move". Variable-power moves carry power 1 and do count (Counter into Rock).
 */
function moveIsSuperEffectiveAgainst(
  moveId: number,
  opposingTypes: BattleAiSwitchTypes,
  opposingAbility?: number,
  opposingStatus2 = 0,
): boolean {
  if (moveId === MOVE_NONE || moveId === MOVE_STRUGGLE) return false;
  const move = MOVES_BY_ID.get(moveId);
  if (!move) return false;
  if (move.power === 0) return false;
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
  baseDamage: number,
): number {
  const move = MOVES_BY_ID.get(moveId);
  if (!move || moveId === MOVE_STRUGGLE) return baseDamage;

  let damage = baseDamage;
  if (fallback.activeTypes[0] === move.type || fallback.activeTypes[1] === move.type) {
    damage = Math.trunc((damage * 15) / 10);
  }
  if (fallback.opposingAbility === LEVITATE_ID && move.type === "TYPE_GROUND") {
    return damage;
  }

  const hasForesight = (fallback.opposingStatus2 & STATUS2_FORESIGHT) !== 0;
  for (const row of matchingTypeEffectivenessRows(move.type, fallback.opposingTypes, TYPE_EFFECTIVENESS, hasForesight)) {
    damage = Math.trunc((damage * row.multiplierTenths) / 10);
    if (damage === 0 && row.multiplierTenths !== 0) damage = 1;
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
  work: BattleAiSwitchIntoWork | undefined = undefined,
): BattleAiSwitchIntoResult {
  const invalid = new Set<number>();
  while (invalid.size !== PARTY_SIZE) {
    if (work) work.rounds += 1;
    let bestDmg = TYPE_MUL_NO_EFFECT;
    let bestMonId = -1;
    for (let i = 0; i < PARTY_SIZE; i += 1) {
      const member = bench[i]!;
      if (work) work.speciesReads += 1;
      if (
        member.species !== 0
        && member.hp !== 0
        && !invalid.has(i)
        && i !== activePartyIndex
      ) {
        if (work) work.candidateScores += 1;
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
    if (bestMon.moves.some((moveId) => {
      if (work) {
        work.moveReads += 1;
        if (moveId !== MOVE_NONE) work.typeCalcs += 1;
      }
      return moveIsSuperEffectiveAgainst(
        moveId,
        opposingTypes,
        damageFallback?.opposingAbility,
        damageFallback?.opposingStatus2,
      );
    })) {
      return Object.freeze({ kind: "resolved", partyIndex: bestMonId });
    }
    invalid.add(bestMonId);
  }
  if (!damageFallback) return Object.freeze({ kind: "damage-fallback-needed" });
  if (work) work.fallback = true;

  // Pinned non-BUGFIX source declares bestDmg as u8. The comparison promotes
  // it, but a successful assignment truncates the signed damage back to u8.
  let bestDmg = 0;
  let bestMonId = PARTY_SIZE;
  let baseDamage: number | null = null;
  for (let i = 0; i < PARTY_SIZE; i += 1) {
    const member = bench[i]!;
    if (work) work.speciesReads += 1;
    if (member.species === 0 || member.hp === 0 || i === activePartyIndex) continue;
    for (let j = 0; j < member.moves.length; j += 1) {
      const moveId = member.moves[j]!;
      const move = MOVES_BY_ID.get(moveId);
      let damage = 0;
      if (work) work.moveReads += 1;
      if (moveId !== MOVE_NONE && move?.power !== 1) {
        if (work) {
          work.damageCalcs += 1;
          work.typeCalcs += 1;
        }
        // AI_CalcDmg reads only the active battler and gCurrentMove, so every call returns the same value.
        baseDamage ??= typeof damageFallback.baseDamage === "function"
          ? damageFallback.baseDamage()
          : damageFallback.baseDamage;
        damage = typeCalcCandidateDamage(moveId, damageFallback, baseDamage);
      }
      if (bestDmg < damage) {
        bestDmg = damage & 0xff;
        bestMonId = i;
      }
    }
  }
  return Object.freeze({ kind: "resolved", partyIndex: bestMonId });
}
