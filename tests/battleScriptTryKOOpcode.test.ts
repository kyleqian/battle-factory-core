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
const FISSURE = 90; // EFFECT_OHKO, accuracy 30
const HOLD_EFFECT_FOCUS_BAND_ITEM = 196; // ITEM_FOCUS_BAND (item-hold-effects.json holdEffectId 39)
const ABILITY_STURDY = 5;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 50,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([FISSURE, 0, 0, 0]),
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
    endured: changes.endured,
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
    battlerWithSureHit: changes.battlerWithSureHit,
  } as BattleScriptRulesBattler);
}

function context(
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const target = (attacker ^ 1) as 0 | 1;
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({ side: attacker, ...attackerChanges });
  battlers[target] = battler({ side: target, ...targetChanges });
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker, target, effectBattler: attacker },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: FISSURE,
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

const TRYKO_PC = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_TRYKO",
)!.programCounter;

function stepAtTryKO(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectOHKO", rulesContext, rngSeed, externalPorts());
  const patched = Object.freeze({ ...execution.state, programCounter: TRYKO_PC });
  return stepBattleScriptMachine(program, patched, execution.handlers);
}

describe("production tryKO (Cmd_tryKO) dispatch", () => {
  it("registers B_SCR_OP_TRYKO", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_TRYKO")).toBeDefined();
  });

  it("Sturdy: blocks unconditionally, zero RNG, sets MOVE_RESULT_MISSED + lastUsedAbility, jumps to the fixed BattleScript_SturdyPreventsOHKO label (not the operand ptr)", () => {
    const rc = context(0, {}, { ability: ABILITY_STURDY });
    const result = stepAtTryKO(rc);
    if (result.kind !== "advanced") throw new Error(`expected advance (jump), got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_SturdyPreventsOHKO"));
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1); // MOVE_RESULT_MISSED
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_STURDY);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_STURDY);
    expect(result.state.rng.calls).toBe(0);
  });

  it("Sturdy takes priority over Focus Band -- both an item barrier and Sturdy present would be ambiguous, so verify Sturdy alone (no item) resolves cleanly with zero rolls", () => {
    const rc = context(0, {}, { ability: ABILITY_STURDY, item: 0 });
    const result = stepAtTryKO(rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(0);
  });

  describe("(b) unsupported-branch barriers", () => {
    it("halts on the target holding a Focus Band item (gSpecialStatuses[target].focusBanded unmodeled)", () => {
      const rc = context(0, {}, { item: HOLD_EFFECT_FOCUS_BAND_ITEM });
      const result = stepAtTryKO(rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 7507 });
    });

    it("does not barrier on a plain (no-item) target", () => {
      const rc = context(0, {}, { item: 0 });
      const result = stepAtTryKO(rc);
      expect(result.kind).not.toBe("halted");
    });

    it("matching Lock-On ownership skips the OHKO draw; bit without matching identity still draws", () => {
      const STATUS3_ALWAYS_HITS = (1 << 3) | (1 << 4); // battleScriptSourceConstants.ts BATTLE_SCRIPT_STATUS3_ALWAYS_HITS
      const owned = stepAtTryKO(context(0, {}, {
        status3: STATUS3_ALWAYS_HITS,
        battlerWithSureHit: 0,
      }));
      if (owned.kind !== "advanced") throw new Error("expected advance");
      expect(owned.state.rng.calls).toBe(0);
      const mismatch = stepAtTryKO(context(0, {}, {
        status3: STATUS3_ALWAYS_HITS,
        battlerWithSureHit: 1,
      }));
      if (mismatch.kind !== "advanced") throw new Error("expected advance");
      expect(mismatch.state.rng.calls).toBe(1);
    });
  });

  it("miss (unlucky roll, same level): sets MOVE_RESULT_MISSED, B_MSG_KO_MISS chooser, jumps to the operand fail pointer, exactly 1 RNG roll", () => {
    // FISSURE accuracy 30: with randomValue=99 -> (99%100)+1=100, not < 30 -> miss.
    const rc = context(0, { level: 50 }, { level: 50 });
    const result = stepAtTryKO(rc, 99);
    if (result.kind !== "advanced") throw new Error(`expected advance (jump), got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_KOFail"));
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1);
    expect(result.state.rulesContext.multistringChooser).toBe(0); // B_MSG_KO_MISS
    expect(result.state.rng.calls).toBe(1);
  });

  it("level-too-high fail tail: target out-levels attacker forces a miss regardless of the roll, B_MSG_KO_UNAFFECTED chooser", () => {
    const rc = context(0, { level: 50 }, { level: 60 });
    const result = stepAtTryKO(rc, 3); // seed 3 -> (15%100)+1=16 < 30, a roll that would otherwise succeed at level parity
    if (result.kind !== "advanced") throw new Error(`expected advance (jump), got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_KOFail"));
    expect(result.state.rulesContext.multistringChooser).toBe(1); // B_MSG_KO_UNAFFECTED
    expect(result.state.rng.calls).toBe(1);
  });

  it("success: damage = target's full current HP, MOVE_RESULT_ONE_HIT_KO set, advances (not a jump), 1 RNG roll", () => {
    const rc = context(0, { level: 50 }, { level: 50, hp: 37 });
    const result = stepAtTryKO(rc, 3); // seed 3 -> (15%100)+1=16 < 30 accuracy
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(37);
    expect(result.state.rulesContext.moveResultFlags & (1 << 4)).toBe(1 << 4); // MOVE_RESULT_ONE_HIT_KO
    expect(result.state.rng.calls).toBe(1);
  });

  it("Endure interaction: a successful roll against an endured target clips to hp-1 and sets MOVE_RESULT_FOE_ENDURED instead of ONE_HIT_KO", () => {
    const rc = context(0, { level: 50 }, { level: 50, hp: 37, endured: 1 });
    const result = stepAtTryKO(rc, 3);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(36);
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(1 << 6); // MOVE_RESULT_FOE_ENDURED
    expect(result.state.rulesContext.moveResultFlags & (1 << 4)).toBe(0);
  });
});

describe("EFFECT_OHKO: full committed script walks (ranked-table row 5, 28 weighted)", () => {
  function runToTerminal(rc: BattleScriptRulesContext, rngSeed = 1) {
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectOHKO", rc, rngSeed, externalPorts());
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

  it("succeeds end to end: KOs the target through the real faint machinery (hp -> 0), STRINGID_ONEHITKO printed via resultmessage, exactly 2 RNG rolls (tryKO's own + seteffectwithchance's always-drawn effect-chance roll)", () => {
    const rc = context(0, { level: 50, moves: [FISSURE, 0, 0, 0] as const }, { level: 50, hp: 42 });
    const result = runToTerminal(rc, 3); // seed 3 -> (15%100)+1=16 < 30
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(0);
    expect(result.state.rng.calls).toBe(2);
  });

  it("miss tail end to end via BattleScript_KOFail (STRINGID_ATTACKMISSED), target HP untouched, exactly 1 RNG roll", () => {
    const rc = context(0, { level: 50 }, { level: 50, hp: 42 });
    const result = runToTerminal(rc, 99); // (99%100)+1=100, not < 30
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(42);
    expect(result.state.rng.calls).toBe(1);
  });

  it("level-too-high fail tail end to end via BattleScript_KOFail (STRINGID_PKMNUNAFFECTED), target HP untouched", () => {
    const rc = context(0, { level: 40 }, { level: 60, hp: 42 });
    const result = runToTerminal(rc, 1);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(42);
  });

  it("Sturdy block tail end to end via BattleScript_SturdyPreventsOHKO -> BattleScript_MoveEnd, target HP untouched, zero RNG", () => {
    const rc = context(0, {}, { ability: ABILITY_STURDY, hp: 42 });
    const result = runToTerminal(rc, 1);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(42);
    expect(result.state.rng.calls).toBe(0);
  });
});

describe("production trysetdestinybondtohappen (Cmd_trysetdestinybondtohappen) dispatch", () => {
  const TRYSETDESTINYBONDTOHAPPEN_PC = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN",
  )!.programCounter;

  function stepAtTrysetdestinybondtohappen(rulesContext: BattleScriptRulesContext) {
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectOHKO", rulesContext, 1, externalPorts());
    const patched = Object.freeze({ ...execution.state, programCounter: TRYSETDESTINYBONDTOHAPPEN_PC });
    return stepBattleScriptMachine(program, patched, execution.handlers);
  }

  it("registers B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN")).toBeDefined();
  });

  it("sets HITMARKER_DESTINYBOND on the shared hitMarker when the target carries STATUS2_DESTINY_BOND, opposite sides, no Grudge -- never any battler's own status2", () => {
    const STATUS2_DESTINY_BOND = 1 << 25;
    const rc = context(0, {}, { status2: STATUS2_DESTINY_BOND });
    const result = stepAtTrysetdestinybondtohappen(rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.hitMarker & (1 << 6)).toBe(1 << 6); // HITMARKER_DESTINYBOND
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(0); // attacker's own status2 untouched
  });

  it("no-op when the target has no Destiny Bond status", () => {
    const rc = context(0, {}, { status2: 0 });
    const result = stepAtTrysetdestinybondtohappen(rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.hitMarker).toBe(0);
  });

  it("advances unconditionally, zero RNG", () => {
    const rc = context(0, {});
    const result = stepAtTrysetdestinybondtohappen(rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(0);
  });
});
