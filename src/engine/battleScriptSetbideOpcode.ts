/**
 * Bide's `B_SCR_OP_SETBIDE` / `Cmd_setbide`
 * (`battle_script_commands.c:7121-7130`).
 *
 * The source starts the two-turn counter, marks and locks the multi-turn
 * move, and zeros only the attacker's accumulated-damage cell. It
 * intentionally leaves gBideTarget untouched; Cmd_datahpupdate owns that
 * cell once real incoming damage arrives.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";

const STATUS2_BIDE_TURN_2 = 2 << 8;

export function createBattleScriptSetbideOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETBIDE",
  );
  if (instructions.length !== 1) {
    throw new Error(`B_SCR_OP_SETBIDE requires exactly 1 concrete start, got ${instructions.length}`);
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0x8b
    || instruction!.dispatcher !== "Cmd_setbide"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(`invalid B_SCR_OP_SETBIDE shape at program counter ${instruction!.programCounter}`);
  }

  return Object.freeze({
    [instruction!.opcodeId]: (context) => {
      const rules = context.state.rulesContext;
      const attacker = requireBattlerRole(rules, "attacker");
      const battler = rules.battlers[attacker];
      const bideDmg = Object.freeze(
        rules.bideDmg.map((damage, index) => index === attacker ? 0 : damage),
      ) as BattleScriptRulesContext["bideDmg"];
      const lockedMoves = Object.freeze(
        rules.lockedMoves.map((move, index) => index === attacker ? rules.currentMove : move),
      ) as BattleScriptRulesContext["lockedMoves"];
      const nextRules = withBattler(rules, attacker, {
        status2: (
          battler.status2
          | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
          | STATUS2_BIDE_TURN_2
        ) >>> 0,
      });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({
            ...nextRules,
            bideDmg,
            lockedMoves,
          }),
        },
      );
    },
  });
}
