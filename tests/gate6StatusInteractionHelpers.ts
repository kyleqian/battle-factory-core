import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";

export const gate6Program = loadBattleScriptProgram();
export const GATE6_TACKLE = 33;

export function gate6Battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([GATE6_TACKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    protected: changes.protected,
    ppNotAffectedByPressure: changes.ppNotAffectedByPressure,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    endured: changes.endured,
    helpingHand: changes.helpingHand,
    turnOrderNum: changes.turnOrderNum,
    wrappedMove: changes.wrappedMove,
    wrappedBy: changes.wrappedBy,
  });
}

export function gate6Context(
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler>,
  targetChanges: Partial<BattleScriptRulesBattler>,
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const target = (attacker ^ 1) as 0 | 1;
  const battlers = [
    gate6Battler({ side: 0 }),
    gate6Battler({ side: 1 }),
    gate6Battler({ side: 0 }),
    gate6Battler({ side: 1 }),
  ];
  battlers[attacker] = gate6Battler({ side: attacker, ...attackerChanges });
  battlers[target] = gate6Battler({ side: target, ...targetChanges });
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker, target, effectBattler: target },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: GATE6_TACKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: (1 << 3) | (1 << 19),
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    ...contextChanges,
  });
}

export function gate6Ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
            kind: "message" as const,
            messageId: operand.expression,
            substitutions: Object.freeze([]),
          })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG"
      || operand.expression === "B_WAIT_TIME_SHORT"
        ? 1
        : null,
    resolveByteOperand: () => null,
  });
}

function acknowledgeAll(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

export function runGate6ScriptToTerminal(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
) {
  const execution = createBattleScriptStatusRulesExecution(
    gate6Program,
    entryLabel,
    rulesContext,
    rngSeed,
    gate6Ports(),
  );
  let result = stepBattleScriptMachine(
    gate6Program,
    execution.state,
    execution.handlers,
  );
  let steps = 1;
  while (result.kind !== "halted" && steps < 1000) {
    result = stepBattleScriptMachine(
      gate6Program,
      acknowledgeAll(result.state),
      execution.handlers,
    );
    steps++;
  }
  if (result.kind !== "halted") {
    throw new Error(`${entryLabel} did not terminate after ${steps} steps`);
  }
  if (result.state.haltReason?.kind !== "terminal") {
    throw new Error(
      `${entryLabel} halted non-terminally: ${JSON.stringify(result.state.haltReason)}`,
    );
  }
  return result.state;
}
