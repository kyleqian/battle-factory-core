/**
 * `B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN` / `Cmd_trysetdestinybondtohappen`
 * (`battle_script_commands.c:8296-8300`) -- a bare wrapper around
 * `TrySetDestinyBondToHappen()` (`:8285-8294`) plus an unconditional
 * `gBattlescriptCurrInstr++` (no operands at all, `asm/macros/battle_script.
 * inc:901-903`). `BattleScript_EffectOHKO`'s only concrete call site
 * (`data/battle_scripts_1.s:770`), placed right after `tryKO` succeeds:
 * OHKO's own `accuracycheck` uses the `NO_ACC_CALC_CHECK_LOCK_ON` bypass,
 * which never reaches `JumpIfMoveFailed` (the only other call site of this
 * same helper, folded into `battleScriptHitChainOpcode.ts`'s `accuracycheck`
 * success path), so OHKO's script calls it explicitly instead. Reuses
 * `applyTrySetDestinyBondToHappen` -- the exact same implementation as the
 * accuracycheck call site, so both are provably consistent. Zero `Random(`
 * calls; zero barriers.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { applyTrySetDestinyBondToHappen } from "./battleScriptHitChainOpcode.ts";

function requireBattlerRole(
  rulesContext: BattleScriptRulesContext,
  role: "attacker" | "target",
) {
  const value = rulesContext.selectorRoles[role];
  if (value === null) throw new Error(`Cmd_trysetdestinybondtohappen requires a ${role} role`);
  return value;
}

function createTrysetdestinybondtohappenHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = requireBattlerRole(rulesContext, "attacker");
    const target = requireBattlerRole(rulesContext, "target");
    const nextRulesContext = applyTrySetDestinyBondToHappen(rulesContext, attacker, target);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRulesContext },
    );
  };
}

export function createBattleScriptTrysetdestinybondtohappenOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN");
  }
  return Object.freeze({ [instruction.opcodeId]: createTrysetdestinybondtohappenHandler() });
}
