/**
 * `B_SCR_OP_TRYINFATUATING` / `Cmd_tryinfatuating`
 * (`battle_script_commands.c:7654-7696`):
 *
 * ```c
 * static void Cmd_tryinfatuating(void)
 * {
 *     // monAttacker/monTarget fetched from the active party slot, not
 *     // gBattleMons directly (see the `personality` field's own doc comment
 *     // in battleScriptRulesContext.ts for why the battler-mirrored fields
 *     // this engine already models are exactly equivalent here).
 *     speciesAttacker = GetMonData(monAttacker, MON_DATA_SPECIES);
 *     personalityAttacker = GetMonData(monAttacker, MON_DATA_PERSONALITY);
 *     speciesTarget = GetMonData(monTarget, MON_DATA_SPECIES);
 *     personalityTarget = GetMonData(monTarget, MON_DATA_PERSONALITY);
 *
 *     if (gBattleMons[gBattlerTarget].ability == ABILITY_OBLIVIOUS)
 *     {
 *         gBattlescriptCurrInstr = BattleScript_ObliviousPreventsAttraction;
 *         gLastUsedAbility = ABILITY_OBLIVIOUS;
 *         RecordAbilityBattle(gBattlerTarget, ABILITY_OBLIVIOUS);
 *     }
 *     else
 *     {
 *         if (GetGenderFromSpeciesAndPersonality(speciesAttacker, personalityAttacker)
 *                 == GetGenderFromSpeciesAndPersonality(speciesTarget, personalityTarget)
 *             || gBattleMons[gBattlerTarget].status2 & STATUS2_INFATUATION
 *             || GetGenderFromSpeciesAndPersonality(speciesAttacker, personalityAttacker) == MON_GENDERLESS
 *             || GetGenderFromSpeciesAndPersonality(speciesTarget, personalityTarget) == MON_GENDERLESS)
 *             gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);
 *         else
 *         {
 *             gBattleMons[gBattlerTarget].status2 |= STATUS2_INFATUATED_WITH(gBattlerAttacker);
 *             gBattlescriptCurrInstr += 5;
 *         }
 *     }
 * }
 * ```
 *
 * Four independent fail reasons collapse to the identical operand-supplied
 * jump target (`BattleScript_ButItFailed` at Attract's one call site) --
 * same-gender, already-infatuated (`STATUS2_INFATUATION` nonzero for ANY
 * source, not just this attacker), attacker genderless, target genderless --
 * so this handler evaluates all four (order is irrelevant; none has a side
 * effect) rather than short-circuiting, matching source's plain `||` chain.
 * Only the Oblivious branch has a distinct (hardcoded, not operand-supplied)
 * destination. `RecordAbilityBattle` is the same untracked AI-history
 * bookkeeping already established to have no reader in this engine's scope
 * (`battleScriptIngrainLeechSeedWrapOpcode.ts`'s `Cmd_jumpifability` doc
 * comment) -- `gLastUsedAbility` is the only observable write, already
 * modeled as `rulesContext.lastUsedAbility`.
 *
 * The success write (`STATUS2_INFATUATED_WITH(gBattlerAttacker)`, i.e.
 * `gBitTable[gBattlerAttacker] << 16`) reuses
 * `statusInfatuatedWithBit` from `battleScriptHitChainOpcode.ts` -- the same
 * formula `Cmd_cleareffectsonfaint`'s clear and
 * `advanceBattleScriptAttackCancelerInLove`'s admission-phase read
 * (`battleScriptActionAdmission.ts`) already key off, so this opcode's write
 * lands in the exact bit the in-love admission phase consults.
 */
import { resolveBattleScriptMonGender } from "./battleScriptGender.ts";
import { recordBattleScriptAbilityReveal } from "./battleScriptAiReveal.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";
import { statusInfatuatedWithBit, withBattler } from "./battleScriptHitChainOpcode.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/abilities.h:16. */
const ABILITY_OBLIVIOUS = 12;

function createTryinfatuatingHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = rulesContext.selectorRoles.attacker;
    const target = rulesContext.selectorRoles.target;
    if (attacker === null || target === null) {
      throw new Error("Cmd_tryinfatuating requires both an attacker and a target role");
    }

    const attackerState = rulesContext.battlers[attacker];
    const targetState = rulesContext.battlers[target];

    if (targetState.ability === ABILITY_OBLIVIOUS) {
      const label = resolveBattleScriptLabel(context.program, "BattleScript_ObliviousPreventsAttraction");
      if (!label) {
        throw new Error("Cmd_tryinfatuating: BattleScript_ObliviousPreventsAttraction is not in the committed program");
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: label.programCounter }),
        {
          rulesContext: recordBattleScriptAbilityReveal(
            Object.freeze({ ...rulesContext, lastUsedAbility: ABILITY_OBLIVIOUS }),
            target,
            ABILITY_OBLIVIOUS,
          ),
        },
      );
    }

    const attackerGender = resolveBattleScriptMonGender(attackerState.species, attackerState.personality);
    const targetGender = resolveBattleScriptMonGender(targetState.species, targetState.personality);
    const alreadyInfatuated = (targetState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION) !== 0;
    const fails = attackerGender === targetGender
      || alreadyInfatuated
      || attackerGender === "genderless"
      || targetGender === "genderless";

    const [ptrOperand] = context.instruction.operands;
    if (fails) {
      const label = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
      if (!label) throw new Error(`Cmd_tryinfatuating: unresolved jump target ${ptrOperand!.expression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: label.programCounter }),
      );
    }

    const nextRulesContext = withBattler(rulesContext, target, {
      status2: (targetState.status2 | statusInfatuatedWithBit(attacker)) >>> 0,
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRulesContext },
    );
  };
}

export function createBattleScriptTryinfatuatingOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_TRYINFATUATING",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_TRYINFATUATING");
  }
  return Object.freeze({ [instruction.opcodeId]: createTryinfatuatingHandler() });
}
