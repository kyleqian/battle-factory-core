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
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33; // EFFECT_HIT, power 35, accuracy 95, TYPE_NORMAL
const SLAM = 21; // EFFECT_HIT, power 80, accuracy 75, TYPE_NORMAL

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
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
  });
}

function context(
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
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
    selectorRoles: { attacker, target, effectBattler: target },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: TACKLE,
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
      operand.expression === "STRINGID_USEDMOVE"
        ? Object.freeze({ kind: "message" as const, messageId: "STRINGID_USEDMOVE", substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
    ...overrides,
  });
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

function stepFrom(entryLabel: string, rulesContext: BattleScriptRulesContext, rngSeed = 1, ports = externalPorts()) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  return { execution, result: stepBattleScriptMachine(program, execution.state, execution.handlers) };
}

describe("production accuracycheck (Cmd_accuracycheck) dispatch", () => {
  it("registers B_SCR_OP_ACCURACYCHECK", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_ACCURACYCHECK")!;
    expect(instruction).toBeDefined();
  });

  it("hits: advances to attackstring and consumes exactly one RNG call", () => {
    const rc = context(0);
    const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkString"));
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(0);
  });

  it("misses: jumps to BattleScript_PrintMoveMissed and sets MOVE_RESULT_MISSED", () => {
    const rc = context(0, {}, { currentMove: SLAM });
    const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 2);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1);
    expect(result.state.rulesContext.missType).toBe(0); // B_MSG_MISSED
  });

  it("Protect: jumps to the miss target with zero RNG and B_MSG_PROTECTED", () => {
    const rc = context(0, {}, {}, { protected: 1 });
    const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.missType).toBe(1); // B_MSG_PROTECTED
  });

  it("semi-invulnerable (underground): misses with zero RNG", () => {
    const rc = context(0, {}, {}, { status3: 1 << 7 });
    const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));
    expect(result.state.rng.calls).toBe(0);
  });

  describe("(b) unsupported-branch barriers", () => {
    it("halts on non-ACC_CURR_MOVE call sites (9 exist in the committed program, none on the hit chain)", () => {
      const nonAccCurrMove = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_ACCURACYCHECK" && i.operands[1]?.expression !== "ACC_CURR_MOVE",
      );
      expect(nonAccCurrMove).toBeDefined();
      const rc = context(0);
      const { execution } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      const patched = Object.freeze({ ...execution.state, programCounter: nonAccCurrMove!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "unsupported-branch",
        sourceFile: "battle_script_commands.c",
        sourceLine: 1103,
      });
    });

    it("halts on STATUS3_ALWAYS_HITS (Lock-On, battlerWithSureHit unmodeled)", () => {
      const rc = context(0, {}, {}, { status3: 1 << 3 });
      const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 1052 });
    });

    it("halts when the target holds a nonzero ability on a hit (AbilityBattleEffects absorbing unmodeled)", () => {
      const rc = context(0, {}, {}, { ability: 3 });
      const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 1020 });
    });
  });
});

describe("production attackstring (Cmd_attackstring) dispatch", () => {
  it("registers B_SCR_OP_ATTACKSTRING", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_ATTACKSTRING")!;
    expect(instruction).toBeDefined();
  });

  it("prints the used-move message once and sets HITMARKER_ATTACKSTRING_PRINTED", () => {
    const rc = context(0);
    const { result } = stepFrom("BattleScript_HitFromAtkString", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.some((e) => e.kind === "message" && e.messageId === "STRINGID_USEDMOVE")).toBe(true);
    expect(result.state.rulesContext.hitMarker & (1 << 10)).toBe(1 << 10);
    expect(result.state.scheduler.messageDisplayActive).toBe(false);
  });

  it("skips the message when HITMARKER_NO_ATTACKSTRING is set", () => {
    const rc = context(0, {}, { hitMarker: 1 << 9 });
    const { result } = stepFrom("BattleScript_HitFromAtkString", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
  });

  it("blocks on a busy controller", () => {
    const rc = context(0);
    const ports = externalPorts({ isControllerIdle: () => false });
    const { result } = stepFrom("BattleScript_HitFromAtkString", rc, 1, ports);
    expect(result.kind).toBe("blocked");
  });
});

function stepTwiceFromAttackstring(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HitFromAtkString",
    rulesContext,
    rngSeed,
    externalPorts(),
  );
  const first = stepBattleScriptMachine(program, execution.state, execution.handlers);
  if (first.kind !== "advanced") throw new Error(`expected attackstring to advance, got ${first.kind}`);
  return stepBattleScriptMachine(program, first.state, execution.handlers);
}

describe("production ppreduce (Cmd_ppreduce) dispatch", () => {
  it("registers B_SCR_OP_PPREDUCE", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_PPREDUCE")!;
    expect(instruction).toBeDefined();
  });

  it("deducts one PP and emits a controller PP-sync event", () => {
    const rc = context(0, { pp: [35, 0, 0, 0] });
    const result = stepTwiceFromAttackstring(rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(34);
    expect(result.state.events.some((e) => e.kind === "set-battler-pp-data" && e.pp === 34)).toBe(true);
    expect(result.state.scheduler.pendingControllerBattlers).toContain(0);
  });

  it("does not deduct PP when the slot is already zero", () => {
    const rc = context(0, { pp: [0, 0, 0, 0] });
    const result = stepTwiceFromAttackstring(rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(0);
    expect(result.state.events.some((e) => e.kind === "set-battler-pp-data")).toBe(false);
  });

  it("deducts two PP when the target has Pressure", () => {
    const rc = context(0, { pp: [35, 0, 0, 0] }, {}, { ability: 46 });
    const result = stepTwiceFromAttackstring(rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(33);
  });

  it("does not apply Pressure when ppNotAffectedByPressure is set", () => {
    const rc = context(0, { pp: [35, 0, 0, 0], ppNotAffectedByPressure: 1 }, {}, { ability: 46 });
    const result = stepTwiceFromAttackstring(rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(34);
  });
});

describe("RUNG 1 integration: opcode 0 -> accuracycheck -> attackstring -> ppreduce", () => {
  it("hit turn (Tackle, seed 1): 1 RNG call at accuracycheck, PP-1, halts at the RUNG-2 boundary (critcalc)", () => {
    const rc = context(0);
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_HitFromAtkCanceler",
      rc,
      1,
      externalPorts(),
    );
    const handlers = execution.handlers;
    let result = stepBattleScriptMachine(program, execution.state, handlers); // opcode 0
    if (result.kind !== "advanced") throw new Error(`opcode 0 did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, handlers); // accuracycheck
    if (result.kind !== "advanced") throw new Error(`accuracycheck did not advance: ${result.kind}`);
    expect(result.state.rng.calls).toBe(1);
    result = stepBattleScriptMachine(program, result.state, handlers); // attackstring
    if (result.kind !== "advanced") throw new Error(`attackstring did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, handlers); // ppreduce
    if (result.kind !== "advanced") throw new Error(`ppreduce did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(34);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromCritCalc"));
    const halted = stepBattleScriptMachine(program, result.state, handlers); // critcalc: not yet registered
    expect(halted.kind).toBe("unsupported");
  });

  it("miss turn (Slam, seed 2): 1 RNG call at accuracycheck, PP-1, hands off cleanly to the already-registered pause opcode", () => {
    const rc = context(0, {}, { currentMove: SLAM });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_HitFromAtkCanceler",
      rc,
      2,
      externalPorts(),
    );
    let result = stepBattleScriptMachine(program, execution.state, execution.handlers); // opcode 0
    if (result.kind !== "advanced") throw new Error(`opcode 0 did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, execution.handlers); // accuracycheck (miss)
    if (result.kind !== "advanced") throw new Error(`accuracycheck did not advance: ${result.kind}`);
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));
    result = stepBattleScriptMachine(program, result.state, execution.handlers); // attackstring
    if (result.kind !== "advanced") throw new Error(`attackstring did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, execution.handlers); // ppreduce
    if (result.kind !== "advanced") throw new Error(`ppreduce did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(34);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1);
    expect(result.state.rng.calls).toBe(1); // exactly the ground-truth 1-roll miss pattern
    const next = program.instructions[result.state.programCounter];
    expect(next?.opcodeName).toBe("B_SCR_OP_PAUSE");
  });
});
