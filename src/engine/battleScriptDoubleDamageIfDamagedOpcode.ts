/**
 * `B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED` /
 * `Cmd_doubledamagedealtifdamaged` (`battle_script_commands.c`).
 *
 * Revenge reads the current attacker's existing ProtectStruct receipts. A
 * nonzero physical or special receipt only qualifies when its recorded
 * damage owner is the current target. The opcode then changes only the shared
 * damage multiplier; the common hit script owns damage calculation, RNG,
 * messages, and controller work.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";

const doubleDamageIfDamagedHandler:
BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");
  const target = requireBattlerRole(rules, "target");
  const receipt = rules.battlers[attacker];
  const damagedByTarget = (
    receipt.protectPhysicalDmg !== 0
    && receipt.protectPhysicalBattlerId === target
  ) || (
    receipt.protectSpecialDmg !== 0
    && receipt.protectSpecialBattlerId === target
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    damagedByTarget
      ? { rulesContext: Object.freeze({ ...rules, dmgMultiplier: 2 }) }
      : undefined,
  );
};

export function createBattleScriptDoubleDamageIfDamagedOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED requires exactly 1 concrete start, "
      + `got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xd6
    || instruction!.dispatcher !== "Cmd_doubledamagedealtifdamaged"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      "invalid B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED shape at program counter "
      + instruction!.programCounter,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: doubleDamageIfDamagedHandler,
  });
}
