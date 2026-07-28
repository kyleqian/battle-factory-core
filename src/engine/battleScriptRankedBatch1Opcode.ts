/**
 * Source-shaped handlers for ranked single-opcode Batch 1.
 *
 * Every command here is derived directly from battle_script_commands.c:
 * scaledamagebyhealthratio :9379-9389, jumpifarrayequal :3771-3791,
 * magnitudedamagecalculation :8670-8711, maxattackhalvehp :8785-8806,
 * and damagetohalftargethp :7577-7584.
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
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

const STAT_ATK = 1;
const MAX_STAT_STAGE = 12;

export function scaledDamagePower(hp: number, maxHP: number, movePower: number): number {
  return Math.max(1, Math.trunc((hp * movePower) / maxHP));
}

export function magnitudeForRoll(roll: number): Readonly<{ magnitude: number; power: number }> {
  if (roll < 5) return Object.freeze({ magnitude: 4, power: 10 });
  if (roll < 15) return Object.freeze({ magnitude: 5, power: 30 });
  if (roll < 35) return Object.freeze({ magnitude: 6, power: 50 });
  if (roll < 65) return Object.freeze({ magnitude: 7, power: 70 });
  if (roll < 85) return Object.freeze({ magnitude: 8, power: 90 });
  if (roll < 95) return Object.freeze({ magnitude: 9, power: 110 });
  return Object.freeze({ magnitude: 10, power: 150 });
}

export function halfTargetHpDamage(hp: number): number {
  return Math.max(1, Math.trunc(hp / 2));
}

const scaledDamageHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rules = context.state.rulesContext;
  if (rules.dynamicBasePower !== 0) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }
  const attacker = requireBattlerRole(rules, "attacker");
  const mon = rules.battlers[attacker];
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), {
    rulesContext: Object.freeze({
      ...rules,
      dynamicBasePower: scaledDamagePower(mon.hp, mon.maxHP, rules.currentMovePower),
    }),
  });
};

const jumpIfArrayEqualHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const [left, right, size, pointer] = context.instruction.operands;
  if (
    context.instruction.operands.length !== 4
    || left?.expression !== "gBattlerAttacker"
    || right?.expression !== "gBattlerTarget"
    || size?.expression !== "0x1"
    || pointer?.widthBytes !== 4
  ) {
    throw new Error(
      `invalid supported B_SCR_OP_JUMPIFARRAYEQUAL tuple at ${context.state.programCounter}`,
    );
  }
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");
  const target = requireBattlerRole(rules, "target");
  if (attacker !== target) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }
  const label = resolveBattleScriptLabel(context.program, pointer.expression);
  if (!label) throw new Error(`unresolved jumpifarrayequal target ${pointer.expression}`);
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "jump", programCounter: label.programCounter }),
  );
};

const magnitudeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const draw = drawBattleScriptRng(
    context.state.rng,
    context.instruction,
    "magnitudedamagecalculation:table",
  );
  const selected = magnitudeForRoll(draw.randomValue % 100);
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), {
    rng: draw.rng,
    rulesContext: Object.freeze({
      ...context.state.rulesContext,
      dynamicBasePower: selected.power,
      battleTextBuff1ByteNumber: selected.magnitude,
    }),
  });
};

const maxAttackHalveHpHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");
  const mon = rules.battlers[attacker];
  const halfHp = Math.max(1, Math.trunc(mon.maxHP / 2));
  if (mon.statStages[STAT_ATK] >= MAX_STAT_STAGE || mon.hp <= halfHp) {
    const operand = context.instruction.operands[0];
    const label = operand && resolveBattleScriptLabel(context.program, operand.expression);
    if (!label) throw new Error("maxattackhalvehp failure label is unresolved");
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: label.programCounter }),
    );
  }
  const statStages = [...mon.statStages];
  statStages[STAT_ATK] = MAX_STAT_STAGE;
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), {
    rulesContext: Object.freeze({
      ...withBattler(rules, attacker, {
        statStages: Object.freeze(statStages) as typeof mon.statStages,
      }),
      battleMoveDamage: halfHp,
    }),
  });
};

const damageToHalfTargetHpHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rules = context.state.rulesContext;
  const target = requireBattlerRole(rules, "target");
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), {
    rulesContext: Object.freeze({
      ...rules,
      battleMoveDamage: halfTargetHpDamage(rules.battlers[target].hp),
    }),
  });
};

export function createBattleScriptRankedBatch1OpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>> = {};
  const install = (
    name: string,
    dispatcher: string,
    operandCount: number,
    handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>,
  ) => {
    const instructions = program.instructions.filter((item) => item.opcodeName === name);
    if (instructions.length !== 1) {
      throw new Error(`${name} requires exactly 1 concrete start, got ${instructions.length}`);
    }
    const instruction = instructions[0]!;
    if (instruction.dispatcher !== dispatcher || instruction.operands.length !== operandCount) {
      throw new Error(`invalid ${name} shape at program counter ${instruction.programCounter}`);
    }
    handlers[instruction.opcodeId] = handler;
  };
  install("B_SCR_OP_SCALEDAMAGEBYHEALTHRATIO", "Cmd_scaledamagebyhealthratio", 0, scaledDamageHandler);
  install("B_SCR_OP_JUMPIFARRAYEQUAL", "Cmd_jumpifarrayequal", 4, jumpIfArrayEqualHandler);
  install("B_SCR_OP_MAGNITUDEDAMAGECALCULATION", "Cmd_magnitudedamagecalculation", 0, magnitudeHandler);
  install("B_SCR_OP_MAXATTACKHALVEHP", "Cmd_maxattackhalvehp", 1, maxAttackHalveHpHandler);
  install("B_SCR_OP_DAMAGETOHALFTARGETHP", "Cmd_damagetohalftargethp", 0, damageToHalfTargetHpHandler);
  return Object.freeze(handlers);
}
