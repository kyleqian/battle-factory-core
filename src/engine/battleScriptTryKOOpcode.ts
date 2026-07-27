/**
 * `B_SCR_OP_TRYKO` / `Cmd_tryKO` (`battle_script_commands.c:7490-7576`) --
 * `BattleScript_EffectOHKO`'s own accuracy/level formula and damage setter.
 * NOT the standard `accuracycheck` path: OHKO's script uses `accuracycheck`
 * with `NO_ACC_CALC_CHECK_LOCK_ON` (a no-roll bypass, already registered in
 * `battleScriptHitChainOpcode.ts`), then this opcode does its own separate
 * hit/miss determination. Source order, all replicated:
 *
 * 1. Hold-effect resolution (`resolveBattleScriptBattlerHoldEffect`, already
 *    exact for Enigma Berry -- `gPotentialItemEffectBattler` itself is never
 *    read anywhere in this engine, so it is not modeled).
 * 2. Focus Band roll (`:7507`) -- barriered (`gSpecialStatuses[target].
 *    focusBanded` is not modeled anywhere in this engine, same named
 *    subsystem gap `Cmd_adjustnormaldamage`/`Cmd_adjustsetdamage` already
 *    barrier on), gated strictly on the target's resolved holdEffect
 *    actually being Focus Band -- never on the plain path.
 * 3. Sturdy (`:7513`) -- a real, fully modeled block: sets
 *    `MOVE_RESULT_MISSED` + `lastUsedAbility`, then jumps to the FIXED label
 *    `BattleScript_SturdyPreventsOHKO` directly (source assigns
 *    `gBattlescriptCurrInstr` to that label's address outright, not through
 *    the operand pointer -- same "hardcoded jump" shape as `Cmd_
 *    tryinfatuating`'s Oblivious block).
 * 4. `STATUS3_ALWAYS_HITS` (Lock-On/Mind Reader, `:7523`) -- barriered.
 *    `gDisableStructs[target].battlerWithSureHit` is not modeled, and (per
 *    `battleScriptHitChainOpcode.ts`'s own `accuracycheckNoAccCalcCheckLockOn`
 *    finding) no production code path ever sets `STATUS3_ALWAYS_HITS` in the
 *    first place, so this covers both the sure-hit sub-branch (`:7531`) and
 *    its own recompute-fallback `else` in one barrier.
 * 5. The real formula (`:7536-7545`): `chance = moveAccuracy + (attackerLevel
 *    - targetLevel)`; hit iff `(Random() % 100 + 1) < chance` AND
 *    `attackerLevel >= targetLevel` -- the level clause is a hard override,
 *    not just a chance modifier: even a would-be-successful roll misses
 *    (as "unaffected", not "missed") whenever the target out-levels the
 *    attacker. Levels are almost always equal under this engine's Level-50
 *    Factory singles scope, so `chance` reduces to plain `moveAccuracy` in
 *    practice, but the general formula is implemented (not hardcoded to
 *    level 50), matching Tier-1's license to construct arbitrary battle
 *    states. One `Random(` roll always drawn on this branch, regardless of
 *    outcome.
 * 6. Success trichotomy (`:7546-7562`): Endure (`target.endured`, already
 *    modeled by `battleScriptProtectlikeOpcode.ts`) clips to `hp - 1` and
 *    sets `MOVE_RESULT_FOE_ENDURED`; Focus-Band-hung-on is structurally
 *    unreachable here (barriered at step 2 above, unconditionally, whenever
 *    the target holds it); otherwise plain OHKO: damage = target's full
 *    current HP, `MOVE_RESULT_ONE_HIT_KO` set. `gBattlescriptCurrInstr += 5`
 *    (skip the whole 5-byte instruction) -- an `advance`, not a jump.
 * 7. Miss (`:7565-7572`): `MOVE_RESULT_MISSED` set, `multistringChooser`
 *    picks `B_MSG_KO_MISS` (attacker level >= target level, a genuine
 *    unlucky-roll miss) or `B_MSG_KO_UNAFFECTED` (target out-levels
 *    attacker -- the "level too high" fail tail) before jumping to the
 *    operand's fail pointer (`BattleScript_KOFail`).
 */
import {
  drawBattleScriptRng,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";
import {
  resolveBattleScriptBattlerHoldEffect,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_MOVE_RESULT_ONE_HIT_KO,
  BATTLE_SCRIPT_STATUS3_ALWAYS_HITS,
} from "./battleScriptSourceConstants.ts";
import { HOLD_EFFECT_ID_FOCUS_BAND, unsupportedBranch } from "./battleScriptHitChainOpcode.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };

/** include/constants/abilities.h:9. */
const ABILITY_STURDY = 5;
/** gBattleCommunication[MULTISTRING_CHOOSER] choices for gKOFailedStringIds (battle_string_ids.h:492-493). */
const B_MSG_KO_MISS = 0;
const B_MSG_KO_UNAFFECTED = 1;

type MoveAccuracyRow = Readonly<{ id: number; accuracy: number }>;
const MOVE_ACCURACY_BY_ID = new Map<number, number>(
  (movesData.moves as readonly MoveAccuracyRow[]).map((row) => [row.id, row.accuracy]),
);

function requireMoveAccuracy(move: number): number {
  const accuracy = MOVE_ACCURACY_BY_ID.get(move);
  if (accuracy === undefined) throw new Error(`Cmd_tryKO: move ${move} has no source-derived gBattleMoves row`);
  return accuracy;
}

function requireBattlerRole(
  rulesContext: BattleScriptRulesContext,
  role: "attacker" | "target",
) {
  const value = rulesContext.selectorRoles[role];
  if (value === null) throw new Error(`Cmd_tryKO requires a ${role} role`);
  return value;
}

function createTryKOHandler(program: BattleScriptProgram): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = requireBattlerRole(rulesContext, "attacker");
    const target = requireBattlerRole(rulesContext, "target");
    const attackerBattler = rulesContext.battlers[attacker];
    const targetBattler = rulesContext.battlers[target];

    const holdEffect = resolveBattleScriptBattlerHoldEffect(rulesContext, target);
    if (holdEffect === HOLD_EFFECT_ID_FOCUS_BAND) {
      return unsupportedBranch(
        context,
        "Cmd_tryKO's HOLD_EFFECT_FOCUS_BAND roll needs gSpecialStatuses[target].focusBanded, which this "
          + "engine does not model yet (same barrier Cmd_adjustnormaldamage/Cmd_adjustsetdamage already carry)",
        "battle_script_commands.c",
        7507,
      );
    }

    if (targetBattler.ability === ABILITY_STURDY) {
      const label = resolveBattleScriptLabel(program, "BattleScript_SturdyPreventsOHKO");
      if (!label) throw new Error("Cmd_tryKO: committed program has no label BattleScript_SturdyPreventsOHKO");
      const nextRulesContext = Object.freeze({
        ...rulesContext,
        moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
        lastUsedAbility: ABILITY_STURDY,
      });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: label.programCounter }),
        { rulesContext: nextRulesContext },
      );
    }

    if ((targetBattler.status3 & BATTLE_SCRIPT_STATUS3_ALWAYS_HITS) !== 0) {
      return unsupportedBranch(
        context,
        "Cmd_tryKO's STATUS3_ALWAYS_HITS Lock-On/Mind-Reader branch needs gDisableStructs[target]."
          + "battlerWithSureHit, which this engine does not model yet (no production code sets "
          + "STATUS3_ALWAYS_HITS in the first place, per accuracycheck's own established finding)",
        "battle_script_commands.c",
        7531,
      );
    }

    const moveAccuracy = requireMoveAccuracy(rulesContext.currentMove);
    const { rng, randomValue } = drawBattleScriptRng(context.state.rng, context.instruction, "tryko");
    const chanceValue = moveAccuracy + (attackerBattler.level - targetBattler.level);
    const hit = (randomValue % 100) + 1 < chanceValue && attackerBattler.level >= targetBattler.level;

    if (hit) {
      let battleMoveDamage: number;
      let moveResultFlags = rulesContext.moveResultFlags;
      if (targetBattler.endured === 1) {
        battleMoveDamage = targetBattler.hp - 1;
        moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED) >>> 0;
      } else {
        battleMoveDamage = targetBattler.hp;
        moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_ONE_HIT_KO) >>> 0;
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: Object.freeze({ ...rulesContext, battleMoveDamage, moveResultFlags }), rng },
      );
    }

    const [failOperand] = context.instruction.operands;
    const label = resolveBattleScriptLabel(program, failOperand!.expression);
    if (!label) throw new Error(`Cmd_tryKO: unresolved jump target ${failOperand!.expression}`);
    const multistringChooser = attackerBattler.level >= targetBattler.level ? B_MSG_KO_MISS : B_MSG_KO_UNAFFECTED;
    const nextRulesContext = Object.freeze({
      ...rulesContext,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
      multistringChooser,
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: label.programCounter }),
      { rulesContext: nextRulesContext, rng },
    );
  };
}

export function createBattleScriptTryKOOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_TRYKO",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_TRYKO");
  }
  return Object.freeze({ [instruction.opcodeId]: createTryKOHandler(program) });
}
