/**
 * `B_SCR_OP_TRYSETHELPINGHAND` / `Cmd_trysethelpinghand`
 * (`battle_script_commands.c:9272-9290`).
 *
 * The command first retargets `gBattlerTarget` to the attacker's positional
 * partner, even when a later guard fails. A successful command owns only the
 * partner's per-turn ProtectStruct::helpingHand bit.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  resolveBattleScriptBattlerPartner,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  requireBattlerRole,
  withBattler,
} from "./battleScriptHitChainOpcode.ts";

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xd1
    || instruction.dispatcher !== "Cmd_trysethelpinghand"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      "invalid B_SCR_OP_TRYSETHELPINGHAND shape at program counter "
        + instruction.programCounter,
    );
  }
  return failure.expression;
}

function createTrysethelpinghandHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = resolveBattleScriptBattlerPartner(
      rules.battleTopology,
      attacker,
    ) as BattleScriptBattlerId;
    const retargeted = Object.freeze({
      ...rules,
      selectorRoles: Object.freeze({
        ...rules.selectorRoles,
        target,
      }),
    });
    const succeeds = (
      (
        rules.battleTopology.battleTypeFlags
        & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE
      ) !== 0
      && (rules.absentBattlerFlags & (1 << target)) === 0
      && rules.battlers[attacker].helpingHand !== 1
      && rules.battlers[target].helpingHand !== 1
    );

    if (!succeeds) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) {
        throw new Error(
          `Cmd_trysethelpinghand: unresolved failure target ${failureExpression}`,
        );
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "jump",
          programCounter: failure.programCounter,
        }),
        { rulesContext: retargeted },
      );
    }

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: withBattler(retargeted, target, {
          helpingHand: 1,
        }),
      },
    );
  };
}

export function createBattleScriptTrysethelpinghandOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_TRYSETHELPINGHAND",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_TRYSETHELPINGHAND requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({
    [instructions[0]!.opcodeId]:
      createTrysethelpinghandHandler(program),
  });
}
