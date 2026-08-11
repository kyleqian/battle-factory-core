import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const RECOVER = 105; // EFFECT_RESTORE_HP
const SOFTBOILED = 135; // EFFECT_SOFTBOILED

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 50,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([RECOVER, 0, 0, 0]),
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
  });
}

function context(
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  move = RECOVER,
): BattleScriptRulesContext {
  const target = attacker; // self-target moves: decision setup already points target at attacker
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({ side: attacker, ...attackerChanges });
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker, target, effectBattler: attacker },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
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

function externalPorts(
  overrides: Partial<BattleScriptStatusRulesExternalPorts> = {},
): BattleScriptStatusRulesExternalPorts {
  const B_WAIT_TIME_LONG = 64;
  const B_WAIT_TIME_SHORT = 32;
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return B_WAIT_TIME_LONG;
      if (operand.expression === "B_WAIT_TIME_SHORT") return B_WAIT_TIME_SHORT;
      return null;
    },
    resolveByteOperand: () => null,
    ...overrides,
  });
}

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

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

const TRYHEALHALFHEALTH_PCS = program.instructions
  .filter((instruction) => instruction.opcodeName === "B_SCR_OP_TRYHEALHALFHEALTH")
  .map((instruction) => instruction.programCounter);

function stepAtTryhealhalfhealth(rulesContext: BattleScriptRulesContext, label: string, pcIndex: number) {
  const execution = createBattleScriptStatusRulesExecution(program, label, rulesContext, 1, externalPorts());
  const patched = Object.freeze({ ...execution.state, programCounter: TRYHEALHALFHEALTH_PCS[pcIndex]! });
  return stepBattleScriptMachine(program, patched, execution.handlers);
}

describe("production tryhealhalfhealth (Cmd_tryhealhalfhealth) dispatch", () => {
  it("registers B_SCR_OP_TRYHEALHALFHEALTH at both concrete call sites", () => {
    expect(TRYHEALHALFHEALTH_PCS).toHaveLength(2);
  });

  it("BS_ATTACKER operand (BattleScript_EffectRestoreHp): reassigns target to attacker, halves maxHP (floor), negates", () => {
    const rc = context(0, { hp: 40, maxHP: 101 });
    const result = stepAtTryhealhalfhealth(rc, "BattleScript_EffectRestoreHp", 0);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.selectorRoles.target).toBe(0);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-50); // floor(101/2)
    expect(result.state.rng.calls).toBe(0);
  });

  it("BS_ATTACKER: 1-HP-max target still heals 1 (min-1 clamp), full HP jumps to fail pointer, damage still written", () => {
    const rc = context(0, { hp: 1, maxHP: 1 });
    const result = stepAtTryhealhalfhealth(rc, "BattleScript_EffectRestoreHp", 0);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_AlreadyAtFullHp"));
    expect(result.state.rulesContext.battleMoveDamage).toBe(-1);
  });

  it("BS_TARGET operand (BattleScript_EffectSoftboiled): does not reassign the target role", () => {
    const rc = context(0, { hp: 40, maxHP: 100 }, {}, SOFTBOILED);
    const result = stepAtTryhealhalfhealth(rc, "BattleScript_EffectSoftboiled", 1);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.selectorRoles.target).toBe(0);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-50);
  });
});

describe("EFFECT_RESTORE_HP / EFFECT_SOFTBOILED: full committed script walks (ranked-table row 4, 29 weighted)", () => {
  function runToTerminal(rc: BattleScriptRulesContext, label: string, rngSeed = 1) {
    const execution = createBattleScriptStatusRulesExecution(program, label, rc, rngSeed, externalPorts());
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

  it("EFFECT_RESTORE_HP succeeds end to end: heals floor(maxHP/2), no RNG, STRINGID_PKMNREGAINEDHEALTH, terminal end", () => {
    const rc = context(0, { hp: 10, maxHP: 100 });
    const result = runToTerminal(rc, "BattleScript_EffectRestoreHp");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(60); // 10 + floor(100/2)
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.moveendState).toBeDefined();
  });

  it("EFFECT_RESTORE_HP fails at full HP end to end via BattleScript_AlreadyAtFullHp (STRINGID_PKMNHPFULL), HP untouched", () => {
    const rc = context(0, { hp: 100, maxHP: 100 });
    const result = runToTerminal(rc, "BattleScript_EffectRestoreHp");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(100);
  });

  it("EFFECT_SOFTBOILED succeeds end to end via the shared BattleScript_PresentHealTarget tail (real script divergence from RestoreHp: RestoreHp prints its own STRINGID_PKMNREGAINEDHEALTH tail directly off BS_ATTACKER at battle_scripts_1.s:676-685, never sharing a label; Softboiled instead falls through into BattleScript_PresentHealTarget at :2031-2034, the same shared label Rest's own success path re-enters via BS_TARGET) -- heals floor(maxHP/2), no RNG, terminal end", () => {
    const rc = context(0, { hp: 10, maxHP: 100 }, {}, SOFTBOILED);
    const result = runToTerminal(rc, "BattleScript_EffectSoftboiled");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(60);
    expect(result.state.rng.calls).toBe(0);
  });

  it("EFFECT_SOFTBOILED fails at full HP end to end via the same BattleScript_AlreadyAtFullHp tail", () => {
    const rc = context(0, { hp: 100, maxHP: 100 }, {}, SOFTBOILED);
    const result = runToTerminal(rc, "BattleScript_EffectSoftboiled");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(100);
  });
});
