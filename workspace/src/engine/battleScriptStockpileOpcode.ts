/**
 * Stockpile-family command handlers (`battle_script_commands.c:6850-6922`).
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
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_MOVE_RESULT_MISSED } from "./battleScriptSourceConstants.ts";
import {
  calculateBattleScriptBaseDamageForCurrentMove,
  requireBattlerRole,
  withBattler,
} from "./battleScriptHitChainOpcode.ts";

const B_MSG_PROTECTED = 1;
const B_MSG_STOCKPILED = 0;
const B_MSG_CANT_STOCKPILE = 1;
const B_MSG_SWALLOW_FAILED = 0;
const B_MSG_SWALLOW_FULL_HP = 1;

function requireInstruction(
  instruction: BattleScriptInstruction,
  opcodeId: number,
  dispatcher: string,
  operands: number,
): void {
  if (
    instruction.opcodeId !== opcodeId
    || instruction.dispatcher !== dispatcher
    || instruction.operands.length !== operands
    || (operands === 1 && instruction.operands[0]?.widthBytes !== 4)
  ) {
    throw new Error(
      `invalid ${instruction.opcodeName} shape at program counter ${instruction.programCounter}`,
    );
  }
}

function failureProgramCounter(
  program: BattleScriptProgram,
  context: Parameters<BattleScriptOpcodeHandler<BattleScriptRulesContext>>[0],
): number {
  const expression = context.instruction.operands[0]!.expression;
  const label = resolveBattleScriptLabel(program, expression);
  if (!label) throw new Error(`${context.instruction.dispatcher} unresolved failure target ${expression}`);
  return label.programCounter;
}

const stockpileHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");
  const battler = rules.battlers[attacker];
  if (battler.stockpileCounter === 3) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rules,
          moveResultFlags: (rules.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
          multistringChooser: B_MSG_CANT_STOCKPILE,
        }),
      },
    );
  }
  const stockpileCounter = battler.stockpileCounter + 1;
  const nextRules = withBattler(rules, attacker, { stockpileCounter });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...nextRules,
        battleTextBuff1ByteNumber: stockpileCounter,
        multistringChooser: B_MSG_STOCKPILED,
      }),
    },
  );
};

function stockpileToBaseDamageHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const battler = rules.battlers[attacker];
    const counter = battler.stockpileCounter;
    if (counter === 0) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "jump",
          programCounter: failureProgramCounter(program, context),
        }),
      );
    }

    let nextRules: BattleScriptRulesContext = withBattler(
      rules,
      attacker,
      { stockpileCounter: 0 },
    );
    if (rules.missType !== B_MSG_PROTECTED) {
      let damage = calculateBattleScriptBaseDamageForCurrentMove(rules) * counter;
      if (battler.helpingHand === 1) damage = Math.trunc((damage * 15) / 10);
      nextRules = Object.freeze({
        ...nextRules,
        battleMoveDamage: damage,
        animTurn: counter,
      });
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRules },
    );
  };
}

function stockpileToHpHealHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const battler = rules.battlers[attacker];
    const counter = battler.stockpileCounter;
    if (counter === 0) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "jump",
          programCounter: failureProgramCounter(program, context),
        }),
        {
          rulesContext: Object.freeze({
            ...rules,
            multistringChooser: B_MSG_SWALLOW_FAILED,
          }),
        },
      );
    }

    const targetRoles = Object.freeze({ ...rules.selectorRoles, target: attacker });
    if (battler.hp === battler.maxHP) {
      const cleared = withBattler(rules, attacker, { stockpileCounter: 0 });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "jump",
          programCounter: failureProgramCounter(program, context),
        }),
        {
          rulesContext: Object.freeze({
            ...cleared,
            selectorRoles: targetRoles,
            multistringChooser: B_MSG_SWALLOW_FULL_HP,
          }),
        },
      );
    }

    const heal = Math.max(1, Math.trunc(battler.maxHP / (1 << (3 - counter))));
    const cleared = withBattler(rules, attacker, { stockpileCounter: 0 });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...cleared,
          selectorRoles: targetRoles,
          battleMoveDamage: -heal,
          animTurn: counter,
        }),
      },
    );
  };
}

export function createBattleScriptStockpileOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const find = (
    name: string,
    expectedStarts: number,
    opcodeId: number,
    dispatcher: string,
    operands: number,
  ) => {
    const instructions = program.instructions.filter(({ opcodeName }) => opcodeName === name);
    if (instructions.length !== expectedStarts) {
      throw new Error(
        `${name} requires exactly ${expectedStarts} concrete starts, got ${instructions.length}`,
      );
    }
    for (const instruction of instructions) {
      requireInstruction(instruction, opcodeId, dispatcher, operands);
    }
    return instructions[0]!;
  };
  const stockpile = find("B_SCR_OP_STOCKPILE", 1, 0x85, "Cmd_stockpile", 0);
  const toDamage = find(
    "B_SCR_OP_STOCKPILETOBASEDAMAGE",
    2,
    0x86,
    "Cmd_stockpiletobasedamage",
    1,
  );
  const toHeal = find("B_SCR_OP_STOCKPILETOHPHEAL", 1, 0x87, "Cmd_stockpiletohpheal", 1);
  return Object.freeze({
    [stockpile.opcodeId]: stockpileHandler,
    [toDamage.opcodeId]: stockpileToBaseDamageHandler(program),
    [toHeal.opcodeId]: stockpileToHpHealHandler(program),
  });
}
