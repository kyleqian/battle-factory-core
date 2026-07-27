import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();

/**
 * The census's next-ranked blocker after entry 513 (B_SCR_OP_NEGATIVEDAMAGE/
 * TRYSETREST): B_SCR_OP_JUMPIFSTAT + B_SCR_OP_PLAYSTATCHANGEANIMATION,
 * 45 weighted / 5 effects. Each effect's own committed script chains these
 * two new opcodes with already-registered statbuffchange/setstatchanger/
 * setbyte machinery -- these tests walk each one to its own genuine
 * terminal end, per entry 507's standing warning about hidden per-operand
 * barriers.
 */
const TICKLE = 321; // EFFECT_TICKLE, MOVE_TARGET_SELECTED, accuracy 100
const COSMIC_POWER = 322; // EFFECT_COSMIC_POWER, MOVE_TARGET_USER
const BULK_UP = 339; // EFFECT_BULK_UP, MOVE_TARGET_USER
const CALM_MIND = 347; // EFFECT_CALM_MIND, MOVE_TARGET_USER
const DRAGON_DANCE = 349; // EFFECT_DRAGON_DANCE, MOVE_TARGET_USER

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([TICKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([20, 0, 0, 0]),
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
  currentMove: number,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, moves: [currentMove, 0, 0, 0], ...attackerChanges }),
    battler({ side: 1, ...targetChanges }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove,
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
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" || operand.expression === "B_WAIT_TIME_SHORT" ? 1 : null,
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

/** Walks the real committed script from `entryLabel` to genuine completion (or the step budget running out), auto-acking any headless controller-busy block, per the ROADMAP's "a headless runner can auto-acknowledge presentation-only barriers" contract. */
function runToTerminal(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
  budget = 100,
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  let steps = 1;
  while ((result.kind === "advanced" || result.kind === "scheduler-progressed" || result.kind === "blocked") && steps < budget) {
    const nextState = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
    result = stepBattleScriptMachine(program, nextState, execution.handlers);
    steps++;
  }
  return { result, steps };
}

describe("EFFECT_TICKLE (BattleScript_EffectTickle, target-side, two-stat lower): 45 weighted set's own accuracy-checked member", () => {
  it("succeeds end to end: lowers the target's ATK and DEF 6 -> 5 each, exactly one RNG roll (accuracycheck), reaches BattleScript_MoveEnd", () => {
    const rc = context(TICKLE);
    const { result, steps } = runToTerminal("BattleScript_EffectTickle", rc);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error("expected halt");
    // A genuine terminal end -- BattleScript_TickleEnd's own `goto BattleScript_MoveEnd` runs the
    // already-registered opcode-73 dependency ladder all the way to its own `end`, not a stall.
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.battlers[1]!.statStages[1]).toBe(5); // target STAT_ATK 6 -> 5
    expect(result.state.rulesContext.battlers[1]!.statStages[2]).toBe(5); // target STAT_DEF 6 -> 5
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(19); // 20 -> 19
    expect(result.state.rng.calls).toBe(1);
    expect(steps).toBeLessThan(100);
  });

  it("both ATK and DEF already at MIN_STAT_STAGE: fails via BattleScript_CantLowerMultipleStats (STRINGID_STATSWONTDECREASE2), neither jumpifstat gate takes the DoMoveAnim path, no PP change yet at that point", () => {
    const rc = context(TICKLE, {}, {}, { statStages: [6, 0, 0, 6, 6, 6, 6, 6] });
    const { result } = runToTerminal("BattleScript_EffectTickle", rc);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error("expected halt");
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    // orbyte MOVE_RESULT_FAILED already fired by the time this walk reaches its own halt.
    expect(result.state.rulesContext.moveResultFlags & (1 << 5)).toBe(1 << 5);
    expect(result.state.rulesContext.battlers[1]!.statStages[1]).toBe(0); // untouched
    expect(result.state.rulesContext.battlers[1]!.statStages[2]).toBe(0); // untouched
    const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
    expect(messageEvents).toContain("STRINGID_STATSWONTDECREASE2");
  });
});

describe("EFFECT_COSMIC_POWER (BattleScript_EffectCosmicPower, self-target, DEF+SPDEF)", () => {
  it("succeeds end to end: raises the attacker's DEF and SPDEF 6 -> 7 each, zero RNG (no accuracycheck in this script)", () => {
    const rc = context(COSMIC_POWER, {}, { selectorRoles: { attacker: 0, target: 0, effectBattler: 0 } });
    const { result } = runToTerminal("BattleScript_EffectCosmicPower", rc);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error("expected halt");
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.battlers[0]!.statStages[2]).toBe(7); // STAT_DEF
    expect(result.state.rulesContext.battlers[0]!.statStages[5]).toBe(7); // STAT_SPDEF
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(19);
    expect(result.state.rng.calls).toBe(0);
  });
});

describe("EFFECT_BULK_UP (BattleScript_EffectBulkUp, self-target, ATK+DEF)", () => {
  it("succeeds end to end: raises the attacker's ATK and DEF 6 -> 7 each, zero RNG", () => {
    const rc = context(BULK_UP, {}, { selectorRoles: { attacker: 0, target: 0, effectBattler: 0 } });
    const { result } = runToTerminal("BattleScript_EffectBulkUp", rc);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error("expected halt");
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.battlers[0]!.statStages[1]).toBe(7); // STAT_ATK
    expect(result.state.rulesContext.battlers[0]!.statStages[2]).toBe(7); // STAT_DEF
    expect(result.state.rng.calls).toBe(0);
  });

  it("both ATK and DEF already at MAX_STAT_STAGE: fails via the shared BattleScript_CantRaiseMultipleStats (STRINGID_STATSWONTINCREASE2)", () => {
    const rc = context(
      BULK_UP,
      { statStages: [6, 12, 12, 6, 6, 6, 6, 6] },
      { selectorRoles: { attacker: 0, target: 0, effectBattler: 0 } },
    );
    const { result } = runToTerminal("BattleScript_EffectBulkUp", rc);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error("expected halt");
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.battlers[0]!.statStages[1]).toBe(12); // untouched
    expect(result.state.rulesContext.battlers[0]!.statStages[2]).toBe(12); // untouched
    const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
    expect(messageEvents).toContain("STRINGID_STATSWONTINCREASE2");
  });
});

describe("EFFECT_CALM_MIND (BattleScript_EffectCalmMind, self-target, SPATK+SPDEF)", () => {
  it("succeeds end to end: raises the attacker's SPATK and SPDEF 6 -> 7 each, zero RNG", () => {
    const rc = context(CALM_MIND, {}, { selectorRoles: { attacker: 0, target: 0, effectBattler: 0 } });
    const { result } = runToTerminal("BattleScript_EffectCalmMind", rc);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error("expected halt");
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.battlers[0]!.statStages[4]).toBe(7); // STAT_SPATK
    expect(result.state.rulesContext.battlers[0]!.statStages[5]).toBe(7); // STAT_SPDEF
    expect(result.state.rng.calls).toBe(0);
  });
});

describe("EFFECT_DRAGON_DANCE (BattleScript_EffectDragonDance, self-target, ATK+SPEED)", () => {
  it("succeeds end to end: raises the attacker's ATK and SPEED 6 -> 7 each, zero RNG", () => {
    const rc = context(DRAGON_DANCE, {}, { selectorRoles: { attacker: 0, target: 0, effectBattler: 0 } });
    const { result } = runToTerminal("BattleScript_EffectDragonDance", rc);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error("expected halt");
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.battlers[0]!.statStages[1]).toBe(7); // STAT_ATK
    expect(result.state.rulesContext.battlers[0]!.statStages[3]).toBe(7); // STAT_SPEED
    expect(result.state.rng.calls).toBe(0);
  });
});
