/**
 * `B_SCR_OP_TRYHEALHALFHEALTH` / `Cmd_tryhealhalfhealth` (`battle_script_
 * commands.c:6615-6629`) -- `BattleScript_EffectRestoreHp`/`BattleScript_
 * EffectSoftboiled`'s shared HP-halving setter. Two concrete call sites
 * (`data/battle_scripts_1.s:676,2031`), both handled: `BattleScript_
 * EffectRestoreHp` passes `BS_ATTACKER` (source unconditionally reassigns
 * `gBattlerTarget = gBattlerAttacker` on this branch, so the move always
 * heals its own user regardless of whatever role the target selector held
 * coming in); `BattleScript_EffectSoftboiled` passes `BS_TARGET` (no
 * reassignment at all -- source trusts `gBattlerTarget` is already the user,
 * which holds because both effects are `MOVE_TARGET_USER` and this engine's
 * own decision setup already points `target` at `attacker` for that move
 * target class, same as every other self-target script). `gBattleMoveDamage`
 * is always written (even on the full-HP fail branch, matching source's own
 * unconditional order): `floor(maxHP / 2)`, clamped to a minimum of 1 before
 * negation, so a 1-HP-max target still heals (im)possible 1 HP rather than 0.
 * Zero `Random(` calls; zero barriers -- both branches are fully implemented.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

function requireBattlerRole(
  rulesContext: BattleScriptRulesContext,
  role: "attacker" | "target",
) {
  const value = rulesContext.selectorRoles[role];
  if (value === null) throw new Error(`Cmd_tryhealhalfhealth requires a ${role} role`);
  return value;
}

function createTryhealhalfhealthHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const battlerOperand = context.instruction.operands[1]?.expression;

    let targetId;
    let selectorRoles = rulesContext.selectorRoles;
    if (battlerOperand === "BS_ATTACKER") {
      const attacker = requireBattlerRole(rulesContext, "attacker");
      targetId = attacker;
      selectorRoles = Object.freeze({ ...rulesContext.selectorRoles, target: attacker });
    } else if (battlerOperand === "BS_TARGET") {
      targetId = requireBattlerRole(rulesContext, "target");
    } else {
      throw new Error(
        `Cmd_tryhealhalfhealth: unexpected battler operand ${battlerOperand ?? "<missing>"} -- `
          + "the committed program's only two call sites use BS_ATTACKER/BS_TARGET",
      );
    }

    const targetState = rulesContext.battlers[targetId];
    let halved = Math.floor(targetState.maxHP / 2);
    if (halved === 0) halved = 1;
    const battleMoveDamage = -halved;
    const baseRulesContext = Object.freeze({ ...rulesContext, selectorRoles, battleMoveDamage });

    if (targetState.hp === targetState.maxHP) {
      const [failOperand] = context.instruction.operands;
      const label = resolveBattleScriptLabel(context.program, failOperand!.expression);
      if (!label) throw new Error(`Cmd_tryhealhalfhealth: unresolved jump target ${failOperand!.expression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: label.programCounter }),
        { rulesContext: baseRulesContext },
      );
    }

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: baseRulesContext },
    );
  };
}

export function createBattleScriptTryhealhalfhealthOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_TRYHEALHALFHEALTH",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_TRYHEALHALFHEALTH");
  }
  return Object.freeze({ [instruction.opcodeId]: createTryhealhalfhealthHandler() });
}
