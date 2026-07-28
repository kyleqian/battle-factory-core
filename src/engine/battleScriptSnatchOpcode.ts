/**
 * Snatch's setter and the two role commands in BattleScript_SnatchedMove.
 *
 * Cmd_trysetsnatch: battle_script_commands.c:9553-9565.
 * Cmd_snatchsetbattlers: battle_script_commands.c:9869-9880.
 * Cmd_swapattackerwithtarget: battle_script_commands.c:5675-5687.
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
import {
  BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET,
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";

const trysetsnatchHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");
  const actingLast = rules.currentTurnActionNumber === rules.battleTopology.battlersCount - 1;
  const attackerState = rules.battlers[attacker];
  const battlers = Object.freeze(rules.battlers.map((battler, index) =>
    index === attacker
      ? Object.freeze({
        ...attackerState,
        ppNotAffectedByPressure: 1 as const,
        ...(actingLast ? {} : { stealMove: 1 as const }),
      })
      : battler
  )) as unknown as BattleScriptRulesBattlers;
  const nextRules = Object.freeze({ ...rules, battlers });

  if (!actingLast) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRules },
    );
  }

  const [failureOperand] = context.instruction.operands;
  const failure = failureOperand?.widthBytes === 4
    ? resolveBattleScriptLabel(context.program, failureOperand.expression)
    : undefined;
  if (!failure || context.instruction.operands.length !== 1) {
    throw new Error(`Cmd_trysetsnatch has an invalid failure pointer at ${context.state.programCounter}`);
  }
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
    { rulesContext: nextRules },
  );
};

const snatchsetbattlersHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rules = context.state.rulesContext;
  const originalAttacker = requireBattlerRole(rules, "attacker");
  const originalTarget = requireBattlerRole(rules, "target");
  const snatcher = rules.scriptingBattler;
  const selfTargeted = originalAttacker === originalTarget;
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...rules,
        selectorRoles: Object.freeze({
          ...rules.selectorRoles,
          attacker: selfTargeted ? snatcher : originalAttacker,
          target: snatcher,
          effectBattler: originalAttacker,
        }),
        scriptingBattler: originalAttacker,
      }),
    },
  );
};

const swapattackerwithtargetHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");
  const target = requireBattlerRole(rules, "target");
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...rules,
        hitMarker: (rules.hitMarker ^ BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET) >>> 0,
        selectorRoles: Object.freeze({ ...rules.selectorRoles, attacker: target, target: attacker }),
      }),
    },
  );
};

export function createBattleScriptSnatchOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const specifications = [
    ["B_SCR_OP_TRYSETSNATCH", 0xe0, "Cmd_trysetsnatch", 1, trysetsnatchHandler],
    ["B_SCR_OP_SNATCHSETBATTLERS", 0xed, "Cmd_snatchsetbattlers", 0, snatchsetbattlersHandler],
    ["B_SCR_OP_SWAPATTACKERWITHTARGET", 0x5f, "Cmd_swapattackerwithtarget", 0, swapattackerwithtargetHandler],
  ] as const;
  const handlers: Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>> = {};
  for (const [opcodeName, opcodeId, dispatcher, operandCount, handler] of specifications) {
    const starts = program.instructions.filter((instruction) => instruction.opcodeName === opcodeName);
    if (
      starts.length < 1
      || starts.some((instruction) =>
        instruction.opcodeId !== opcodeId
        || instruction.dispatcher !== dispatcher
        || instruction.operands.length !== operandCount
      )
    ) {
      throw new Error(`invalid ${opcodeName} committed-program shape`);
    }
    handlers[opcodeId] = handler;
  }
  return Object.freeze(handlers);
}
