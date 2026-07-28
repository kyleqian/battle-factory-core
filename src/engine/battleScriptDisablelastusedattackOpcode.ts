/**
 * `B_SCR_OP_DISABLELASTUSEDATTACK` / `Cmd_disablelastusedattack`
 * (`battle_script_commands.c:7992-8016`). Disable belongs to the target
 * battler and identifies a move id, not a slot. The first matching slot owns
 * the PP predicate, including duplicate move ids.
 */
import {
  drawBattleScriptRng,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type {
  BattleScriptRulesBattlers,
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

function createHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [failurePointer] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 1
      || failurePointer?.widthBytes !== 4
    ) {
      throw new Error(
        "Cmd_disablelastusedattack requires exactly one four-byte failure pointer",
      );
    }
    const rules = context.state.rulesContext;
    const target = rules.selectorRoles.target;
    if (target === null) {
      throw new Error("Cmd_disablelastusedattack requires a target role");
    }
    const targetState = rules.battlers[target];
    const lastMove = rules.moveHistory.lastMoves[target]!;
    const matchingSlot = targetState.moves.findIndex((move) => move === lastMove);
    if (
      targetState.disabledMove !== 0
      || matchingSlot === -1
      || targetState.pp[matchingSlot] === 0
    ) {
      const failure = resolveBattleScriptLabel(program, failurePointer.expression);
      if (!failure) {
        throw new Error(
          `Cmd_disablelastusedattack unresolved failure target ${failurePointer.expression}`,
        );
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      );
    }

    const drawn = drawBattleScriptRng(
      context.state.rng,
      context.instruction,
      "Disable duration ((Random() & 3) + 2)",
    );
    const duration = (drawn.randomValue & 3) + 2;
    const battlers = rules.battlers.map((battler, index) =>
      index === target
        ? Object.freeze({
          ...battler,
          disabledMove: targetState.moves[matchingSlot]!,
          disableTimer: duration,
          disableTimerStartValue: duration,
        })
        : battler
    ) as unknown as BattleScriptRulesBattlers;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rules,
          battlers: Object.freeze(battlers),
        }),
        rng: drawn.rng,
      },
    );
  };
}

export function createBattleScriptDisablelastusedattackOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_DISABLELASTUSEDATTACK",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `expected one B_SCR_OP_DISABLELASTUSEDATTACK, got ${instructions.length}`,
    );
  }
  const instruction = instructions[0]!;
  if (
    instruction.opcodeId !== 0xa3
    || instruction.dispatcher !== "Cmd_disablelastusedattack"
    || instruction.operands.length !== 1
    || instruction.operands[0]!.widthBytes !== 4
  ) {
    throw new Error("invalid B_SCR_OP_DISABLELASTUSEDATTACK encoding");
  }
  return Object.freeze({ [instruction.opcodeId]: createHandler(program) });
}
