/**
 * `B_SCR_OP_SETDESTINYBOND` / `Cmd_setdestinybond`
 * (`battle_script_commands.c:8279-8283`): the sole one-byte, operand-free
 * instruction ORs `STATUS2_DESTINY_BOND` into the attacking battler's own
 * status2 and advances. The bit's action lifetime is owned by
 * `advanceBattleScriptAttackCancelerFlags`, matching
 * `ClearFuryCutterDestinyBondGrudge(gBattlerAttacker)`.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";

function createSetdestinybondHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = rulesContext.selectorRoles.attacker;
    if (attacker === null) throw new Error("Cmd_setdestinybond requires an attacker role");
    const attackerState = rulesContext.battlers[attacker];
    const battlers = Object.freeze(rulesContext.battlers.map((battler, index) =>
      index === attacker
        ? Object.freeze({
          ...attackerState,
          status2: (
            attackerState.status2
            | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND
          ) >>> 0,
        })
        : battler
    )) as BattleScriptRulesContext["battlers"];
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rulesContext, battlers }) },
    );
  };
}

export function createBattleScriptSetdestinybondOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (candidate) => candidate.opcodeName === "B_SCR_OP_SETDESTINYBOND",
  );
  if (instructions.length !== 1) {
    throw new Error(`committed Battle Script program must emit one B_SCR_OP_SETDESTINYBOND, found ${instructions.length}`);
  }
  return Object.freeze({ [instructions[0]!.opcodeId]: createSetdestinybondHandler() });
}
