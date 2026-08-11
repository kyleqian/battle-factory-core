import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

/** `B_SCR_OP_JUMPIFNOTFIRSTTURN` -- ranked-table row (EFFECT_FAKE_OUT, 15 weighted). */
const FAKE_OUT = 252;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([FAKE_OUT, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([10, 0, 0, 0]),
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
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
    isFirstTurn: changes.isFirstTurn ?? 0,
  });
}

function context(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, ...attackerChanges }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: FAKE_OUT,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    ...contextChanges,
  });
}

const program = loadBattleScriptProgram();

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  const B_WAIT_TIME_LONG = 64;
  const B_WAIT_TIME_SHORT = 32;
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_ctx, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_ctx, operand) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return B_WAIT_TIME_LONG;
      if (operand.expression === "B_WAIT_TIME_SHORT") return B_WAIT_TIME_SHORT;
      return null;
    },
    resolveByteOperand: () => null,
  });
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

const JUMPIFNOTFIRSTTURN_PC = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFNOTFIRSTTURN",
)!.programCounter;

function stepAtJumpifnotfirstturn(rc: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectFakeOut", rc, 1, externalPorts());
  const patched = Object.freeze({ ...execution.state, programCounter: JUMPIFNOTFIRSTTURN_PC });
  return stepBattleScriptMachine(program, patched, execution.handlers);
}

describe("production jumpifnotfirstturn (Cmd_jumpifnotfirstturn) dispatch", () => {
  it("registers B_SCR_OP_JUMPIFNOTFIRSTTURN at its one concrete call site", () => {
    expect(program.instructions.filter((i) => i.opcodeName === "B_SCR_OP_JUMPIFNOTFIRSTTURN")).toHaveLength(1);
  });

  it("isFirstTurn == 2 (just switched in): advances past the fail ptr", () => {
    const rc = context({ isFirstTurn: 2 });
    const result = stepAtJumpifnotfirstturn(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(JUMPIFNOTFIRSTTURN_PC + 1);
  });

  it("isFirstTurn == 1 (still truthy, one TurnValuesCleanUp decrement in): advances", () => {
    const rc = context({ isFirstTurn: 1 });
    const result = stepAtJumpifnotfirstturn(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(JUMPIFNOTFIRSTTURN_PC + 1);
  });

  it("isFirstTurn == 0 (not first turn): jumps to BattleScript_FailedFromAtkString", () => {
    const rc = context({ isFirstTurn: 0 });
    const result = stepAtJumpifnotfirstturn(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
  });
});

describe("EFFECT_FAKE_OUT: full committed script walks (ranked-table row, 15 weighted)", () => {
  function ackAllPending(
    state: BattleScriptMachineState<BattleScriptRulesContext>,
  ): BattleScriptMachineState<BattleScriptRulesContext> {
    let next = state;
    for (const battlerId of state.scheduler.pendingControllerBattlers) {
      next = acknowledgeBattleScriptMachineController(next, battlerId);
    }
    return next;
  }

  function step(
    state: BattleScriptMachineState<BattleScriptRulesContext>,
    handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
  ) {
    let result = stepBattleScriptMachine(program, state, handlers);
    let guard = 0;
    while (result.kind === "scheduler-progressed" || result.kind === "blocked") {
      guard += 1;
      if (guard > 200) throw new Error("step() did not converge");
      const nextState = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
      result = stepBattleScriptMachine(program, nextState, handlers);
    }
    return result;
  }

  function runToTerminal(rc: BattleScriptRulesContext, rngSeed: number) {
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectFakeOut", rc, rngSeed, externalPorts());
    let result = step(execution.state, execution.handlers);
    let steps = 0;
    while (result.kind === "advanced" && steps < 80) {
      steps += 1;
      result = step(result.state, execution.handlers);
    }
    if (result.kind !== "halted") throw new Error(`script did not reach its own end: ${result.kind}`);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    return result;
  }

  it(
    "first-turn success: setmoveeffect MOVE_EFFECT_FLINCH|MOVE_EFFECT_CERTAIN composes through the real "
      + "seteffectwithchance machinery -- target flinches (status2 bit set), lands damage, terminal end. "
      + "MOVE_EFFECT_CERTAIN takes seteffectwithchance's certain branch (battle_script_commands.c:2912-2917), "
      + "which applies the effect directly with no percent-chance Random() roll at all -- unlike the "
      + "non-certain tail every other hit-chain walk in this engine pins at 4, Fake Out's guaranteed flinch "
      + "draws only accuracycheck+critcalc+adjustnormaldamage = 3",
    () => {
      const rc = context({ isFirstTurn: 2 });
      const result = runToTerminal(rc, 1);
      expect(result.state.rulesContext.battlers[1]!.hp).toBeLessThan(100); // Fake Out landed on the target
      const STATUS2_FLINCHED = 1 << 3; // include/constants/battle.h:131
      expect(result.state.rulesContext.battlers[1]!.status2 & STATUS2_FLINCHED).toBe(STATUS2_FLINCHED);
      expect(result.state.rng.calls).toBe(3);
    },
  );

  it("not-first-turn fail tail: jumps straight to the ButItFailed tail via FailedFromAtkString, HP untouched, MOVE_RESULT_FAILED set, terminal end, zero RNG", () => {
    const rc = context({ isFirstTurn: 0 });
    const result = runToTerminal(rc, 1);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(100); // never reached the hit chain
    const MOVE_RESULT_FAILED = 1 << 5; // include/constants/battle.h:225
    expect(result.state.rulesContext.moveResultFlags & MOVE_RESULT_FAILED).toBe(MOVE_RESULT_FAILED);
    expect(result.state.rng.calls).toBe(0);
  });
});
