import type {
  BattleScriptBattlerId,
  BattleScriptSemanticEventPayload,
} from "./battleScriptEvents.ts";
import {
  createBattleScriptSchedulerState,
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptBlockReason,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandlerContext,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  resolveBattleScriptMoveType,
  wasBattleScriptBattlerUnableToUseMove,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "./battleScriptSourceConstants.ts";

const TYPE_FIRE = 10;
const MOVEEND_DEFROST = 1;
const MOVEEND_ATTACKER_INVISIBLE = 8;
const MOVEEND_ATTACKER_VISIBLE = 9;
const MOVEEND_TARGET_VISIBLE = 10;

function controllerBusyReason(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "controller-busy",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
  });
}

function blockForBusyController(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "block", reason: controllerBusyReason(context) }),
  );
}

function requireRole(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  role: "attacker" | "target",
): BattleScriptBattlerId {
  const battler = context.state.rulesContext.selectorRoles[role];
  if (battler === null) {
    throw new Error(`Cmd_moveend requires a bound gBattler${role === "attacker" ? "Attacker" : "Target"}`);
  }
  return battler;
}

function replaceBattler(
  battlers: BattleScriptRulesBattlers,
  battler: BattleScriptBattlerId,
  next: BattleScriptRulesBattlerState,
): BattleScriptRulesBattlers {
  const mutable = [...battlers] as [
    BattleScriptRulesBattlerState,
    BattleScriptRulesBattlerState,
    BattleScriptRulesBattlerState,
    BattleScriptRulesBattlerState,
  ];
  mutable[battler] = next;
  return Object.freeze(mutable);
}

function advanceState(
  rules: BattleScriptRulesContext,
  battlers: BattleScriptRulesBattlers = rules.battlers,
): BattleScriptRulesContext {
  return Object.freeze({
    ...rules,
    battlers,
    moveendState: rules.moveendState + 1,
  });
}

function controllerScheduler(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  battler: BattleScriptBattlerId,
) {
  const base = createBattleScriptSchedulerState({
    ...context.state.scheduler,
    activeBattler: battler,
  });
  return markBattleScriptControllerPending(base, battler);
}

function continueAtSameInstruction(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "jump",
      programCounter: context.state.programCounter,
    }),
    { rulesContext },
  );
}

function controllerReturn(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  battler: BattleScriptBattlerId,
  rulesContext: BattleScriptRulesContext,
  event: BattleScriptSemanticEventPayload,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "controller-return" }),
    {
      scheduler: controllerScheduler(context, battler),
      rulesContext,
      events: Object.freeze([Object.freeze(event)]),
    },
  );
}

function executeDefrost(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const rules = context.state.rulesContext;
  const attacker = requireRole(context, "attacker");
  const target = requireRole(context, "target");
  const targetState = rules.battlers[target];
  const applies =
    (targetState.status1 & BATTLE_SCRIPT_STATUS1_FREEZE) !== 0
    && targetState.hp !== 0
    && attacker !== target
    && targetState.specialStatus.specialDmg !== 0
    && (rules.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0
    && resolveBattleScriptMoveType(rules.currentMove, rules.dynamicMoveType) === TYPE_FIRE;
  if (!applies) return continueAtSameInstruction(context, advanceState(rules));

  const status1 = (targetState.status1 & ~BATTLE_SCRIPT_STATUS1_FREEZE) >>> 0;
  const nextTarget = Object.freeze({ ...targetState, status1 });
  const rulesContext = advanceState(
    rules,
    replaceBattler(rules.battlers, target, nextTarget),
  );
  const transfer = resolveBattleScriptLabel(
    context.program,
    "BattleScript_DefrostedViaFireMove",
  );
  if (!transfer) {
    throw new Error("committed Battle Script program lacks BattleScript_DefrostedViaFireMove");
  }
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "call-current",
      programCounter: transfer.programCounter,
    }),
    {
      scheduler: controllerScheduler(context, target),
      rulesContext,
      events: Object.freeze([
        Object.freeze({
          kind: "set-battler-status-data",
          battler: target,
          status1,
        }),
      ]),
    },
  );
}

function executeAttackerInvisible(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const rules = context.state.rulesContext;
  const attacker = requireRole(context, "attacker");
  const applies =
    (rules.battlers[attacker].status3 & BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) !== 0
    && (rules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0;
  const rulesContext = advanceState(rules);
  return applies
    ? controllerReturn(context, attacker, rulesContext, {
      kind: "set-battler-sprite-visibility",
      battler: attacker,
      invisible: true,
    })
    : continueAtSameInstruction(context, rulesContext);
}

function executeAttackerVisible(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const rules = context.state.rulesContext;
  const attacker = requireRole(context, "attacker");
  const attackerState = rules.battlers[attacker];
  const applies =
    (rules.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0
    || (attackerState.status3 & BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) === 0
    || wasBattleScriptBattlerUnableToUseMove(rules, attacker);
  if (!applies) return continueAtSameInstruction(context, advanceState(rules));

  const nextAttacker = Object.freeze({
    ...attackerState,
    status3: (attackerState.status3 & ~BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) >>> 0,
    specialStatus: Object.freeze({
      ...attackerState.specialStatus,
      restoredBattlerSprite: 1 as const,
    }),
  });
  const rulesContext = advanceState(
    rules,
    replaceBattler(rules.battlers, attacker, nextAttacker),
  );
  return controllerReturn(context, attacker, rulesContext, {
    kind: "set-battler-sprite-visibility",
    battler: attacker,
    invisible: false,
  });
}

function executeTargetVisible(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const rules = context.state.rulesContext;
  const target = requireRole(context, "target");
  const targetState = rules.battlers[target];
  const applies =
    targetState.specialStatus.restoredBattlerSprite === 0
    && target < rules.battleTopology.battlersCount
    && (targetState.status3 & BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) === 0;
  if (!applies) return continueAtSameInstruction(context, advanceState(rules));

  const nextTarget = Object.freeze({
    ...targetState,
    status3: (targetState.status3 & ~BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) >>> 0,
  });
  const rulesContext = advanceState(
    rules,
    replaceBattler(rules.battlers, target, nextTarget),
  );
  return controllerReturn(context, target, rulesContext, {
    kind: "set-battler-sprite-visibility",
    battler: target,
    invisible: false,
  });
}

/**
 * Executes exactly one controller-owning Cmd_moveend switch case.
 *
 * This is intentionally not an opcode-73 handler: the source do/while loop,
 * end modes, delegates, cleanup, and opcode registration remain outside this
 * dependency step. Controller-return cases retain the opcode PC so replay
 * continues from the next durable moveendState after acknowledgement.
 */
export function executeBattleScriptMoveEndControllerCase(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  // RunBattleScriptCommands does not dispatch any command while a controller
  // exec flag is set. Preserve that global gate before reading live rules.
  if (context.state.scheduler.pendingControllerBattlers.length !== 0) {
    return blockForBusyController(context);
  }
  switch (context.state.rulesContext.moveendState) {
    case MOVEEND_DEFROST:
      return executeDefrost(context);
    case MOVEEND_ATTACKER_INVISIBLE:
      return executeAttackerInvisible(context);
    case MOVEEND_ATTACKER_VISIBLE:
      return executeAttackerVisible(context);
    case MOVEEND_TARGET_VISIBLE:
      return executeTargetVisible(context);
    default:
      throw new Error(
        `controller dependency executor does not own moveend state ${context.state.rulesContext.moveendState}`,
      );
  }
}
