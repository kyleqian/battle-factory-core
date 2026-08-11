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
const SWAGGER = 207; // EFFECT_SWAGGER, target ATK+2 + confuse
const FLATTER = 260; // EFFECT_FLATTER, target SPATK+1 + confuse
const STAT_ATK = 1;
const STAT_SPATK = 4;
const MAX_STAT_STAGE = 12;
const STATUS2_CONFUSION_TURNS_2 = 2; // any nonzero low-3-bits value means "confused"

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([SWAGGER, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([15, 0, 0, 0]),
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
    personality: changes.personality ?? 0,
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
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, moves: [currentMove, 0, 0, 0] }),
    battler({ side: 1, ...targetChanges }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
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

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

const JUMPIFCONFUSEDANDSTATMAXED_INSTRUCTIONS = program.instructions.filter(
  (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED",
);
const SWAGGER_JUMPIFCONFUSEDANDSTATMAXED_PC = JUMPIFCONFUSEDANDSTATMAXED_INSTRUCTIONS
  .find((i) => i.operands[0]?.expression === "STAT_ATK")!.programCounter;
const FLATTER_JUMPIFCONFUSEDANDSTATMAXED_PC = JUMPIFCONFUSEDANDSTATMAXED_INSTRUCTIONS
  .find((i) => i.operands[0]?.expression === "STAT_SPATK")!.programCounter;

/** Lands directly on the committed program's own B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED instruction for the given effect. */
function stepAtJumpifconfusedandstatmaxed(entryLabel: string, programCounter: number, rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, 1, externalPorts());
  const patched = Object.freeze({ ...execution.state, programCounter });
  return stepBattleScriptMachine(program, patched, execution.handlers);
}

describe("production jumpifconfusedandstatmaxed (Cmd_jumpifconfusedandstatmaxed) dispatch", () => {
  it("registers exactly two B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED concrete call sites (Swagger's STAT_ATK, Flatter's STAT_SPATK)", () => {
    expect(JUMPIFCONFUSEDANDSTATMAXED_INSTRUCTIONS).toHaveLength(2);
  });

  it("confused AND stat maxed: jumps to the operand's ptr (BattleScript_ButItFailed for both effects)", () => {
    const rc = context(SWAGGER, { status2: STATUS2_CONFUSION_TURNS_2, statStages: [6, MAX_STAT_STAGE, 6, 6, 6, 6, 6, 6] });
    const result = stepAtJumpifconfusedandstatmaxed("BattleScript_EffectSwagger", SWAGGER_JUMPIFCONFUSEDANDSTATMAXED_PC, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
  });

  it("confused but stat NOT maxed: falls through (advances past the instruction)", () => {
    const rc = context(SWAGGER, { status2: STATUS2_CONFUSION_TURNS_2, statStages: [6, 6, 6, 6, 6, 6, 6, 6] });
    const result = stepAtJumpifconfusedandstatmaxed("BattleScript_EffectSwagger", SWAGGER_JUMPIFCONFUSEDANDSTATMAXED_PC, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(SWAGGER_JUMPIFCONFUSEDANDSTATMAXED_PC + 1);
  });

  it("stat maxed but NOT confused: falls through", () => {
    const rc = context(SWAGGER, { status2: 0, statStages: [6, MAX_STAT_STAGE, 6, 6, 6, 6, 6, 6] });
    const result = stepAtJumpifconfusedandstatmaxed("BattleScript_EffectSwagger", SWAGGER_JUMPIFCONFUSEDANDSTATMAXED_PC, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(SWAGGER_JUMPIFCONFUSEDANDSTATMAXED_PC + 1);
  });

  it("neither confused nor maxed: falls through", () => {
    const rc = context(SWAGGER, {});
    const result = stepAtJumpifconfusedandstatmaxed("BattleScript_EffectSwagger", SWAGGER_JUMPIFCONFUSEDANDSTATMAXED_PC, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(SWAGGER_JUMPIFCONFUSEDANDSTATMAXED_PC + 1);
  });

  it("Flatter's own STAT_SPATK call site: confused AND SPATK maxed jumps identically", () => {
    const rc = context(FLATTER, { status2: STATUS2_CONFUSION_TURNS_2, statStages: [6, 6, 6, 6, MAX_STAT_STAGE, 6, 6, 6] });
    const result = stepAtJumpifconfusedandstatmaxed("BattleScript_EffectFlatter", FLATTER_JUMPIFCONFUSEDANDSTATMAXED_PC, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
  });

  it("draws no RNG in either direction (pure read)", () => {
    const rc = context(SWAGGER, { status2: STATUS2_CONFUSION_TURNS_2, statStages: [6, MAX_STAT_STAGE, 6, 6, 6, 6, 6, 6] });
    const result = stepAtJumpifconfusedandstatmaxed("BattleScript_EffectSwagger", SWAGGER_JUMPIFCONFUSEDANDSTATMAXED_PC, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rng.calls).toBe(0);
  });
});

describe(
  "EFFECT_SWAGGER (BattleScript_EffectSwagger, target ATK+2 + confuse): the census's next-ranked blocker after EFFECT_ATTRACT (B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED, 25 weighted, shared with EFFECT_FLATTER)",
  () => {
    it("succeeds end to end: raises the target's ATK 6 -> 8, sets STATUS2_CONFUSION on the target, exactly two RNG rolls (accuracycheck + confusion-duration), genuine terminal end", () => {
      const rc = context(SWAGGER, {});
      const { result } = runToTerminal("BattleScript_EffectSwagger", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.statStages[STAT_ATK]).toBe(8); // 6 -> 8, STAT_CHANGE_BY_TWO
      expect(result.state.rulesContext.battlers[1]!.status2 & 0x7).not.toBe(0); // STATUS2_CONFUSION turns set
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(14); // 15 -> 14
      expect(result.state.rng.calls).toBe(2);
    });

    it("the jumpifconfusedandstatmaxed edge branch: target already confused AND ATK already at MAX_STAT_STAGE fails end to end via BattleScript_ButItFailed (STRINGID_BUTITFAILED), no stat change, confusion duration untouched, only one RNG roll (accuracycheck; jumpifconfusedandstatmaxed itself draws none)", () => {
      const rc = context(SWAGGER, { status2: STATUS2_CONFUSION_TURNS_2, statStages: [6, MAX_STAT_STAGE, 6, 6, 6, 6, 6, 6] });
      const { result } = runToTerminal("BattleScript_EffectSwagger", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.statStages[STAT_ATK]).toBe(MAX_STAT_STAGE); // untouched
      expect(result.state.rulesContext.battlers[1]!.status2 & 0x7).toBe(STATUS2_CONFUSION_TURNS_2); // untouched
      expect(result.state.rulesContext.moveResultFlags & (1 << 5)).toBe(1 << 5); // MOVE_RESULT_FAILED
      expect(result.state.rng.calls).toBe(1);
      const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
      expect(messageEvents).toContain("STRINGID_BUTITFAILED");
    });

    it("ATK already at MAX_STAT_STAGE but NOT confused: the edge branch does not fire (confused conjunct false), the raise attempt itself still fails via the shared BattleScript_SwaggerTryConfuse/statbuffchange path, but confusion is applied since Own Tempo/Safeguard are absent", () => {
      const rc = context(SWAGGER, { statStages: [6, MAX_STAT_STAGE, 6, 6, 6, 6, 6, 6] });
      const { result } = runToTerminal("BattleScript_EffectSwagger", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.statStages[STAT_ATK]).toBe(MAX_STAT_STAGE); // can't raise further
      expect(result.state.rulesContext.battlers[1]!.status2 & 0x7).not.toBe(0); // still gets confused
    });

    it("target ability Own Tempo: raises ATK but is not confused (SwaggerTryConfuse's own jumpifability gate), no confusion-duration RNG draw", () => {
      const ABILITY_OWN_TEMPO = 20;
      const rc = context(SWAGGER, { ability: ABILITY_OWN_TEMPO });
      const { result } = runToTerminal("BattleScript_EffectSwagger", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.statStages[STAT_ATK]).toBe(8);
      expect(result.state.rulesContext.battlers[1]!.status2 & 0x7).toBe(0); // Own Tempo blocks confusion
      expect(result.state.rng.calls).toBe(1); // accuracycheck only
    });
  },
);

describe(
  "EFFECT_FLATTER (BattleScript_EffectFlatter, target SPATK+1 + confuse): shares B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED with EFFECT_SWAGGER",
  () => {
    it("succeeds end to end: raises the target's SPATK 6 -> 7, sets STATUS2_CONFUSION, exactly two RNG rolls, genuine terminal end", () => {
      const rc = context(FLATTER, {});
      const { result } = runToTerminal("BattleScript_EffectFlatter", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.statStages[STAT_SPATK]).toBe(7); // 6 -> 7, +1 stage
      expect(result.state.rulesContext.battlers[1]!.status2 & 0x7).not.toBe(0);
      expect(result.state.rng.calls).toBe(2);
    });

    it("the jumpifconfusedandstatmaxed edge branch: target already confused AND SPATK already at MAX_STAT_STAGE fails end to end via BattleScript_ButItFailed, no stat change, one RNG roll", () => {
      const rc = context(FLATTER, { status2: STATUS2_CONFUSION_TURNS_2, statStages: [6, 6, 6, 6, MAX_STAT_STAGE, 6, 6, 6] });
      const { result } = runToTerminal("BattleScript_EffectFlatter", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.statStages[STAT_SPATK]).toBe(MAX_STAT_STAGE);
      expect(result.state.rng.calls).toBe(1);
      const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
      expect(messageEvents).toContain("STRINGID_BUTITFAILED");
    });
  },
);
