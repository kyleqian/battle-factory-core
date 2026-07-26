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
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import { createBattleScriptJumpifbyteOpcodeHandlers } from "../src/engine/battleScriptJumpifbyteOpcode.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;

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
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
  });
}

function context(contextChanges: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [battler({ side: 0 }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
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

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

function findJumpifbytePc(matchOperands: (operands: readonly string[]) => boolean): number {
  const found = program.instructions.find(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_JUMPIFBYTE"
      && matchOperands(instruction.operands.map((operand) => operand.expression)),
  );
  if (!found) throw new Error("no matching B_SCR_OP_JUMPIFBYTE instruction found in the committed program");
  return found.programCounter;
}

function stepAtProgramCounter(pc: number, rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("production jumpifbyte (Cmd_jumpifbyte) dispatch", () => {
  it("registers B_SCR_OP_JUMPIFBYTE", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_JUMPIFBYTE")).toBeDefined();
  });

  describe("the WIN path's own instruction: BattleScript_HandleFaintedMon's checkteamslost gate", () => {
    const pc = findJumpifbytePc(
      (ops) => ops[0] === "CMP_NOT_EQUAL" && ops[1] === "gBattleOutcome" && ops[2] === "0",
    );

    it("battleOutcome still 0: not taken, falls through", () => {
      const { result } = stepAtProgramCounter(pc, context({ battleOutcome: 0 }));
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(pc + 1);
    });

    it("battleOutcome nonzero (WON): taken, jumps to BattleScript_FaintedMonEnd", () => {
      const { result } = stepAtProgramCounter(pc, context({ battleOutcome: 1 }));
      if (result.kind !== "advanced") throw new Error("expected advance");
      const target = program.instructions.find(
        (i) => i.source.label === "BattleScript_FaintedMonEnd" && i.programCounter >= pc,
      );
      expect(target).toBeDefined();
      expect(result.state.programCounter).toBe(target!.programCounter);
    });
  });

  it("CMP_EQUAL against gBattleCommunication + 1 (HandleFaintedMon's own second gate)", () => {
    const pc = findJumpifbytePc(
      (ops) => ops[0] === "CMP_EQUAL" && ops[1] === "gBattleCommunication + 1" && ops[2] === "0",
    );
    const { result } = stepAtProgramCounter(pc, context({ battleCommunication1: 0 }));
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).not.toBe(pc + 1);
  });

  describe("(b) unsupported-branch barriers", () => {
    it("halts on an unmodeled memByte pointer (sBATTLE_STYLE, only reachable off the terminal WIN path)", () => {
      const pc = findJumpifbytePc((ops) => ops[1] === "sBATTLE_STYLE");
      const { result } = stepAtProgramCounter(pc, context());
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("halts on an unmodeled comparison value (MOVE_RESULT_FOE_ENDURED, gMoveResultFlags itself is modeled)", () => {
      // MOVE_RESULT_MISSED/MOVE_RESULT_NO_EFFECT (and two other OR'd combos) resolve as of the
      // EFFECT_ENDEAVOR registration (seam-scout §9.2, battleScriptSetByte.ts's shared value
      // universe) -- BattleScript_DoMultiHit's own MOVE_RESULT_FOE_ENDURED comparand does not.
      const pc = findJumpifbytePc(
        (ops) => ops[1] === "gMoveResultFlags" && ops[2] === "MOVE_RESULT_FOE_ENDURED",
      );
      const { result } = stepAtProgramCounter(pc, context());
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("no longer halts on MOVE_RESULT_MISSED (EFFECT_ENDEAVOR registration widened the shared value universe)", () => {
      const pc = findJumpifbytePc(
        (ops) => ops[1] === "gMoveResultFlags" && ops[2] === "MOVE_RESULT_MISSED",
      );
      const { result } = stepAtProgramCounter(pc, context());
      expect(result.kind).toBe("advanced");
    });

    it("pass-through: the WIN path's own gBattleOutcome gate never trips either barrier", () => {
      const pc = findJumpifbytePc(
        (ops) => ops[0] === "CMP_NOT_EQUAL" && ops[1] === "gBattleOutcome" && ops[2] === "0",
      );
      const { result } = stepAtProgramCounter(pc, context({ battleOutcome: 0 }));
      expect(result.kind).toBe("advanced");
    });
  });

  describe("all six CMP_* comparators (source-complete compare logic)", () => {
    const basePc = findJumpifbytePc(
      (ops) => ops[0] === "CMP_NOT_EQUAL" && ops[1] === "gBattleOutcome" && ops[2] === "0",
    );
    const baseInstruction = program.instructions[basePc]!;

    function variantHandler() {
      const handlers = createBattleScriptJumpifbyteOpcodeHandlers(program);
      return handlers[baseInstruction.opcodeId]!;
    }

    function syntheticInstruction(comparator: string, value: string) {
      return Object.freeze({
        ...baseInstruction,
        operands: Object.freeze([
          Object.freeze({ ...baseInstruction.operands[0]!, expression: comparator }),
          baseInstruction.operands[1]!,
          Object.freeze({ ...baseInstruction.operands[2]!, expression: value }),
          baseInstruction.operands[3]!,
        ]),
      });
    }

    function evaluate(comparator: string, battleOutcome: number, value: string): boolean {
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HandleFaintedMon",
        context({ battleOutcome }),
        1,
        externalPorts(),
      );
      const state = Object.freeze({ ...execution.state, programCounter: basePc });
      const handler = variantHandler();
      const transition = handler({
        program,
        instruction: syntheticInstruction(comparator, value),
        state,
      });
      return transition.control.kind === "jump";
    }

    it("CMP_EQUAL: taken iff equal", () => {
      expect(evaluate("CMP_EQUAL", 2, "2")).toBe(true);
      expect(evaluate("CMP_EQUAL", 2, "1")).toBe(false);
    });
    it("CMP_NOT_EQUAL: taken iff different", () => {
      expect(evaluate("CMP_NOT_EQUAL", 2, "1")).toBe(true);
      expect(evaluate("CMP_NOT_EQUAL", 2, "2")).toBe(false);
    });
    it("CMP_GREATER_THAN: taken iff memByte > value", () => {
      expect(evaluate("CMP_GREATER_THAN", 2, "1")).toBe(true);
      expect(evaluate("CMP_GREATER_THAN", 1, "2")).toBe(false);
      expect(evaluate("CMP_GREATER_THAN", 2, "2")).toBe(false);
    });
    it("CMP_LESS_THAN: taken iff memByte < value", () => {
      expect(evaluate("CMP_LESS_THAN", 1, "2")).toBe(true);
      expect(evaluate("CMP_LESS_THAN", 2, "1")).toBe(false);
      expect(evaluate("CMP_LESS_THAN", 2, "2")).toBe(false);
    });
    it("CMP_COMMON_BITS: taken iff (memByte & value) != 0", () => {
      expect(evaluate("CMP_COMMON_BITS", 2, "2")).toBe(true);
      expect(evaluate("CMP_COMMON_BITS", 1, "2")).toBe(false);
    });
    it("CMP_NO_COMMON_BITS: taken iff (memByte & value) == 0", () => {
      expect(evaluate("CMP_NO_COMMON_BITS", 1, "2")).toBe(true);
      expect(evaluate("CMP_NO_COMMON_BITS", 2, "2")).toBe(false);
    });
  });
});
