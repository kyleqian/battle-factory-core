/**
 * `B_SCR_OP_JUMPIFNODAMAGE` / `Cmd_jumpifnodamage`
 * (`battle_script_commands.c:9148-9154`).
 *
 * The command reads the current attacker's `ProtectStruct` damage receipts,
 * not the similarly named `SpecialStatus` copies. A nonzero physical OR
 * special receipt falls through by the instruction's full five-byte width;
 * only two zero receipts jump through the encoded little-endian pointer.
 *
 * The committed program has one concrete use: Focus Punch jumps directly to
 * `BattleScript_HitFromAccCheck` when its user was not damaged earlier in the
 * turn. The receipts are written by the generic `Cmd_datahpupdate` handler and
 * reset for the next turn by `TurnValuesCleanUp(FALSE)`'s existing
 * `clearProtectStructsForNextTurn` owner.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

const EXPECTED_OPCODE_ID = 0xcf;
const EXPECTED_LABEL = "BattleScript_EffectFocusPunch";
const EXPECTED_STATEMENT_LINE = 2262;
const EXPECTED_TARGET = "BattleScript_HitFromAccCheck";

function createJumpifnodamageHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const attackerState = rules.battlers[attacker];
    if (
      attackerState.protectPhysicalDmg !== 0
      || attackerState.protectSpecialDmg !== 0
    ) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
      );
    }
    const [targetOperand] = context.instruction.operands;
    const target = resolveBattleScriptLabel(
      context.program,
      targetOperand!.expression,
    );
    if (!target) {
      throw new Error(
        `Cmd_jumpifnodamage: unresolved jump target ${targetOperand!.expression}`,
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

export function createBattleScriptJumpifnodamageOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFNODAMAGE",
  );
  if (starts.length !== 1) {
    throw new Error(
      `B_SCR_OP_JUMPIFNODAMAGE requires exactly 1 concrete start, got ${starts.length}`,
    );
  }
  const [instruction] = starts;
  const [targetOperand] = instruction!.operands;
  if (
    instruction!.opcodeId !== EXPECTED_OPCODE_ID
    || instruction!.dispatcher !== "Cmd_jumpifnodamage"
    || instruction!.source.label !== EXPECTED_LABEL
    || instruction!.source.statementLine !== EXPECTED_STATEMENT_LINE
    || instruction!.operands.length !== 1
    || targetOperand?.widthBytes !== 4
    || targetOperand.expression !== EXPECTED_TARGET
    || !resolveBattleScriptLabel(program, targetOperand.expression)
  ) {
    throw new Error(
      `invalid B_SCR_OP_JUMPIFNODAMAGE shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: createJumpifnodamageHandler(),
  });
}
