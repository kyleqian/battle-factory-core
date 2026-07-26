/**
 * Pure port of `AI_TryToFaint` (`data/battle_ai_scripts.s:2616-2634`,
 * `docs/factory-ai-ground-truth.md` §1.3/§4 item 3). Delegates damage
 * estimation to the kernel's own `damageCalc.ts` pipeline
 * (`calculateBaseDamage`/`applyStab`/`applyTypeEffectiveness` -- the *same*
 * functions the real hit chain uses), crit forced x1 (`Cmd_if_can_faint`,
 * `battle_ai_script_commands.c:1743-1767`, never assumes a crit) and the
 * 85-100% variance replaced by the per-slot `simulatedRNG[i]` value drawn
 * once at setup, not a fresh `Random()` call -- so this script itself draws
 * **at most one** fresh `Random()`: the `if_random_less_than 80` gate inside
 * the can't-faint, exactly-x4-effective branch
 * (`AI_TryToFaint_DoubleSuperEffective`, `:2624-2626`).
 *
 * `get_how_powerful_move_is` (`Cmd_get_how_powerful_move_is`,
 * `battle_ai_script_commands.c:1174-1234`) is ported in full: it estimates
 * damage for every move in the AI's own 4-move moveset (each using ITS OWN
 * `simulatedRNG` slot, same pipeline) and reports whether the considered
 * move is strictly out-damaged by any other -- `MOVE_NOT_MOST_POWERFUL`
 * costs the considered move a flat `-1` (`Score_Minus1`); a tied or
 * strictly-highest damage estimate, or a `power<=1`/ignored-effect move
 * (`MOVE_POWER_OTHER`, the same `sIgnoredPowerfulMoveEffects` list
 * `factoryAiCheckBadMove.ts` already exports), takes no penalty. Draws zero
 * fresh `Random()` -- it reuses the setup-time `simulatedRNG` values, never
 * a new roll.
 */
import {
  IGNORED_POWERFUL_MOVE_EFFECTS,
  MOVES_BY_ID,
  TYPE_EFFECTIVENESS,
  typeMultiplierTenths,
} from "./factoryAiCheckBadMove.ts";
import { advanceRngValue } from "./rng.ts";
import type { BattleRngState } from "./battleDecisionBoundary.ts";
import {
  applyStab,
  applyTypeEffectiveness,
  calculateBaseDamage,
  type StatStages,
} from "./damageCalc.ts";

const U16_MAX = 0xffff;
const MOVE_EXPLOSION_EFFECT = "EFFECT_EXPLOSION";
const MOVE_QUICK_ATTACK_EFFECT = "EFFECT_QUICK_ATTACK";

export type FactoryAiTryToFaintBattler = Readonly<{
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  level: number;
  types: readonly [string, string];
  statStages: StatStages;
}>;

export type FactoryAiTryToFaintTarget = FactoryAiTryToFaintBattler & Readonly<{
  hp: number;
  /** Real (not guessed) ability -- TypeCalc reads live battle state, not an AI_TARGET guess. */
  ability: string;
}>;

export type FactoryAiTryToFaintDraw = Readonly<{
  ordinal: number;
  reason: string;
  kind: "double-super-effective";
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
  succeeded: boolean;
}>;

export type FactoryAiMostPowerful = "most-powerful" | "not-most-powerful" | "power-other";

export type FactoryAiTryToFaintResult = Readonly<{
  kind: "scored";
  rng: BattleRngState;
  draws: readonly FactoryAiTryToFaintDraw[];
  scoreDelta: number;
  canFaint: boolean;
  mostPowerful: FactoryAiMostPowerful | null;
}>;

function nextDraw(
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
  ordinal: number;
  reason: string;
}> {
  const rawRngValue = advanceRngValue(rng.value);
  const after: BattleRngState = Object.freeze({ value: rawRngValue, calls: rng.calls + 1 });
  return Object.freeze({
    ordinal,
    reason,
    before: rng,
    after,
    rawRngValue,
    randomValue: (rawRngValue >>> 16) & U16_MAX,
  });
}

/**
 * `AI_CalcDmg` + `TypeCalc` + the caller's own
 * `* simulatedRNG[slot] / 100` variance step and zero-floor
 * (`Cmd_if_can_faint`/`Cmd_get_how_powerful_move_is`, identical shape both
 * call sites). Levitate-vs-Ground short-circuits `TypeCalc`'s whole type
 * loop (`battle_script_commands.c:1553-1556`) -- the multiplier step is
 * skipped entirely, not zeroed.
 */
function estimateDamage(
  attacker: FactoryAiTryToFaintBattler,
  defender: FactoryAiTryToFaintTarget,
  moveId: number,
  simulatedRngPercent: number,
): number {
  const move = MOVES_BY_ID.get(moveId);
  if (!move) throw new Error(`factory-ai-try-to-faint: unknown move ${moveId}`);

  let damage = calculateBaseDamage({
    attacker: { ...attacker },
    defender: { ...defender },
    movePower: move.power,
    moveType: move.type,
    isCriticalHit: false,
  });
  damage = applyStab(damage, attacker.types, move.type);
  if (!(defender.ability === "ABILITY_LEVITATE" && move.type === "TYPE_GROUND")) {
    damage = applyTypeEffectiveness(damage, move.type, defender.types, TYPE_EFFECTIVENESS).damage;
  }
  damage = Math.trunc((damage * simulatedRngPercent) / 100);
  if (damage === 0) damage = 1;
  return damage;
}

/**
 * `Cmd_if_type_effectiveness AI_EFFECTIVENESS_x4` (`:1515-1554`): the AI's
 * own "effectiveness class" probe, distinct from a real damage estimate --
 * it feeds a fixed baseline (40, `AI_EFFECTIVENESS_x1`) through STAB + the
 * type-effectiveness loop and checks whether the *result* lands on the x4
 * sentinel (160 direct, or 240 which a STAB'd x4 hit collapses to via the
 * source's own magic-number remap). `gMoveResultFlags` is read but never
 * reassigned by this call site in the shipped (non-`BUGFIX`) build
 * (`reference/pokeemerald/include/config.h:48`), so the Levitate/Ground
 * immunity flag TypeCalc sets locally never reaches this check -- the type
 * loop is still skipped for Levitate+Ground (TypeCalc's own short-circuit),
 * it just never reads as x0 here. Neither banked scenario's target has
 * Levitate, so this quirk is inert for all 3 fixtures; ported for fidelity.
 */
function isQuadrupleEffective(
  attackerTypes: readonly [string, string],
  moveType: string,
  defenderTypes: readonly [string, string],
  defenderAbility: string,
): boolean {
  if (defenderAbility === "ABILITY_LEVITATE" && moveType === "TYPE_GROUND") return false;
  const stab = attackerTypes[0] === moveType || attackerTypes[1] === moveType;
  const multiplierTenths = typeMultiplierTenths(moveType, defenderTypes);
  let value = stab ? 60 : 40;
  value = Math.trunc((value * multiplierTenths) / 10);
  if (value === 240) value = 160;
  return value === 160;
}

/** `Cmd_get_how_powerful_move_is` (`:1174-1234`). */
function computeMostPowerful(
  attacker: FactoryAiTryToFaintBattler,
  defender: FactoryAiTryToFaintTarget,
  moveset: readonly [number, number, number, number],
  simulatedRng: readonly [number, number, number, number],
  movesetIndex: 0 | 1 | 2 | 3,
): FactoryAiMostPowerful {
  const consideredMoveId = moveset[movesetIndex];
  const consideredMove = MOVES_BY_ID.get(consideredMoveId);
  if (!consideredMove) throw new Error(`factory-ai-try-to-faint: unknown move ${consideredMoveId}`);
  const consideredEligible = consideredMove.power > 1
    && !IGNORED_POWERFUL_MOVE_EFFECTS.has(consideredMove.effect);
  if (!consideredEligible) return "power-other";

  const moveDmgs: number[] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i += 1) {
    const moveId = moveset[i]!;
    const move = moveId === 0 ? undefined : MOVES_BY_ID.get(moveId);
    const eligible = move !== undefined && move.power > 1 && !IGNORED_POWERFUL_MOVE_EFFECTS.has(move.effect);
    moveDmgs[i] = eligible ? estimateDamage(attacker, defender, moveId, simulatedRng[i]!) : 0;
  }
  const consideredDamage = moveDmgs[movesetIndex]!;
  const hasStrictlyGreater = moveDmgs.some((damage) => damage > consideredDamage);
  return hasStrictlyGreater ? "not-most-powerful" : "most-powerful";
}

/**
 * `AI_TryToFaint` for one move slot (`:2616-2634`). `moveset`/`simulatedRng`
 * are the AI battler's own full 4-slot moveset and setup draws (source needs
 * the whole moveset for `get_how_powerful_move_is`'s cross-comparison, not
 * just the considered slot).
 */
export function runTryToFaint(input: Readonly<{
  rng: BattleRngState;
  moveId: number;
  movesetIndex: 0 | 1 | 2 | 3;
  moveset: readonly [number, number, number, number];
  simulatedRng: readonly [number, number, number, number];
  attacker: FactoryAiTryToFaintBattler;
  target: FactoryAiTryToFaintTarget;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): FactoryAiTryToFaintResult {
  const move = MOVES_BY_ID.get(input.moveId);
  if (!move) throw new Error(`factory-ai-try-to-faint: unknown move ${input.moveId}`);

  let canFaint = false;
  if (move.power >= 2) {
    const estimatedDamage = estimateDamage(
      input.attacker,
      input.target,
      input.moveId,
      input.simulatedRng[input.movesetIndex],
    );
    canFaint = input.target.hp <= estimatedDamage;
  }

  if (canFaint) {
    // AI_TryToFaint_TryToEncourageQuickAttack (:2628-2634): Explosion gets no
    // bonus (it's already the AI's own last resort), Quick Attack stacks both
    // `score +2` and the fallthrough `score +4` (a real +6), everything else
    // gets the flat +4.
    let scoreDelta = 4;
    if (move.effect === MOVE_EXPLOSION_EFFECT) scoreDelta = 0;
    else if (move.effect === MOVE_QUICK_ATTACK_EFFECT) scoreDelta = 6;
    return Object.freeze({
      kind: "scored",
      rng: input.rng,
      draws: Object.freeze([]),
      scoreDelta,
      canFaint: true,
      mostPowerful: null,
    });
  }

  const mostPowerful = computeMostPowerful(
    input.attacker,
    input.target,
    input.moveset,
    input.simulatedRng,
    input.movesetIndex,
  );
  let scoreDelta = mostPowerful === "not-most-powerful" ? -1 : 0;

  let rng = input.rng;
  const draws: FactoryAiTryToFaintDraw[] = [];
  if (isQuadrupleEffective(input.attacker.types, move.type, input.target.types, input.target.ability)) {
    const draw = nextDraw(rng, input.drawOrdinalStart, `${input.reasonPrefix}-double-super-effective`);
    rng = draw.after;
    // if_random_less_than 80, AI_TryToFaint_End (:2624): the JUMP (roll < 80,
    // ~31.25% of rolls) skips the bonus; falling through (roll >= 80) is what
    // grants +2 (battle_ai_script_commands.c:663-670).
    const succeeded = draw.randomValue % 256 >= 80;
    draws.push(Object.freeze({ ...draw, kind: "double-super-effective", succeeded }));
    if (succeeded) scoreDelta += 2;
  }

  return Object.freeze({
    kind: "scored",
    rng,
    draws: Object.freeze(draws),
    scoreDelta,
    canFaint: false,
    mostPowerful,
  });
}
