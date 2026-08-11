/**
 * `B_SCR_OP_SETSUBSTITUTE` / `Cmd_setsubstitute`
 * (`battle_script_commands.c:7808-7837`): the sole one-byte, operand-free
 * constructor for Substitute's durable rules state. The later genuine
 * effect-script `healthbarupdate` / `datahpupdate` pair owns the HP debit.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
} from "./battleScriptSourceConstants.ts";

/** battle_message.c:580-584 -- gSubstituteUsedStringIds indices. */
export const BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE = 0;
export const BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED = 1;

function createSetsubstituteHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = rulesContext.selectorRoles.attacker;
    if (attacker === null) throw new Error("Cmd_setsubstitute requires an attacker role");
    const attackerState = rulesContext.battlers[attacker];
    const quarterMaxHp = Math.max(1, Math.floor(attackerState.maxHP / 4));

    if (attackerState.hp <= quarterMaxHp) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({
            ...rulesContext,
            battleMoveDamage: 0,
            multistringChooser: BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED,
          }),
        },
      );
    }

    const battlers = Object.freeze(rulesContext.battlers.map((battler, index) =>
      index === attacker
        ? Object.freeze({
          ...attackerState,
          status2: (
            (attackerState.status2 | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE)
            & ~BATTLE_SCRIPT_STATUS2_WRAPPED_MASK
          ) >>> 0,
          substituteHP: quarterMaxHp,
        })
        : battler
    )) as BattleScriptRulesContext["battlers"];
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rulesContext,
          battlers,
          battleMoveDamage: quarterMaxHp,
          multistringChooser: BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE,
          hitMarker: (rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE) >>> 0,
        }),
      },
    );
  };
}

export function createBattleScriptSetsubstituteOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (candidate) => candidate.opcodeName === "B_SCR_OP_SETSUBSTITUTE",
  );
  if (instructions.length !== 1) {
    throw new Error(`committed Battle Script program must emit one B_SCR_OP_SETSUBSTITUTE, found ${instructions.length}`);
  }
  return Object.freeze({ [instructions[0]!.opcodeId]: createSetsubstituteHandler() });
}
