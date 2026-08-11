/**
 * `B_SCR_OP_TRYWISH` / `Cmd_trywish` (`battle_script_commands.c:9292-9325`).
 *
 * The six-byte instruction carries a one-byte mode followed by a script
 * pointer. Mode 0 installs a two-turn Wish on the attacker's positional
 * battler slot and remembers that slot's current party index. Mode 1 prepares
 * the remembered mon identity and half-max-HP negative damage for the target,
 * then takes the full-HP branch or advances into the genuine heal script.
 */
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
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

function requireRole(
  rulesContext: BattleScriptRulesContext,
  role: "attacker" | "target",
): BattleScriptBattlerId {
  const battler = rulesContext.selectorRoles[role];
  if (battler === null) throw new Error(`Cmd_trywish requires a ${role} role`);
  return battler;
}

function requireOperands(instruction: BattleScriptInstruction): Readonly<{
  selector: "0" | "1";
  jumpExpression: string;
}> {
  const [selector, jump] = instruction.operands;
  if (
    instruction.operands.length !== 2
    || selector?.widthBytes !== 1
    || (selector.expression !== "0" && selector.expression !== "1")
    || jump?.widthBytes !== 4
  ) {
    throw new Error("Cmd_trywish requires one selector byte (0/1) and one four-byte script pointer");
  }
  return Object.freeze({
    selector: selector.expression,
    jumpExpression: jump.expression,
  });
}

function jumpTarget(program: BattleScriptProgram, expression: string): number {
  const target = resolveBattleScriptLabel(program, expression);
  if (!target) throw new Error(`Cmd_trywish: unresolved jump target ${expression}`);
  return target.programCounter;
}

function createTrywishHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const { selector, jumpExpression } = requireOperands(context.instruction);
    const rulesContext = context.state.rulesContext;

    if (selector === "0") {
      const attacker = requireRole(rulesContext, "attacker");
      if (rulesContext.wishCounter[attacker] !== 0) {
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "jump", programCounter: jumpTarget(program, jumpExpression) }),
        );
      }
      const wishCounter = [...rulesContext.wishCounter] as [number, number, number, number];
      const wishMonId = [...rulesContext.wishMonId] as [number, number, number, number];
      wishCounter[attacker] = 2;
      wishMonId[attacker] = rulesContext.battlers[attacker].partyIndex;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({
            ...rulesContext,
            wishCounter: Object.freeze(wishCounter),
            wishMonId: Object.freeze(wishMonId),
          }),
        },
      );
    }

    const target = requireRole(rulesContext, "target");
    const targetState = rulesContext.battlers[target];
    const heal = Math.max(1, Math.floor(targetState.maxHP / 2));
    const preparedRules = Object.freeze({
      ...rulesContext,
      battleMoveDamage: -heal,
      battleTextBuff1MonNick: Object.freeze({
        battler: target,
        partyIndex: rulesContext.wishMonId[target],
      }),
    });
    if (targetState.hp === targetState.maxHP) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: jumpTarget(program, jumpExpression) }),
        { rulesContext: preparedRules },
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: preparedRules },
    );
  };
}

export function createBattleScriptTrywishOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (candidate) => candidate.opcodeName === "B_SCR_OP_TRYWISH",
  );
  if (instructions.length !== 2) {
    throw new Error(`committed Battle Script program must emit two B_SCR_OP_TRYWISH instructions, found ${instructions.length}`);
  }
  const opcodeId = instructions[0]!.opcodeId;
  if (opcodeId !== 0xd4 || instructions.some((instruction) => instruction.opcodeId !== opcodeId)) {
    throw new Error("committed B_SCR_OP_TRYWISH instructions must share source opcode 0xd4");
  }
  return Object.freeze({ [opcodeId]: createTrywishHandler(program) });
}
