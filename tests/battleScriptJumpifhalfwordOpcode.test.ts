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
import { createBattleScriptJumpifhalfwordOpcodeHandlers } from "../src/engine/battleScriptJumpifhalfwordOpcode.ts";

const program = loadBattleScriptProgram();
/** src/data/gen/moves.json. */
const MOVE_SURF = 57;
const MOVE_TACKLE = 33;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_TACKLE, 0, 0, 0]),
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
    currentMove: MOVE_TACKLE,
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
      battlerPositions: [0, 1, 2, 3],
    },
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

function findJumpifhalfwordPc(
  sourceLabel: string,
  matchOperands: (operands: readonly string[]) => boolean,
): number {
  const found = program.instructions.find(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_JUMPIFHALFWORD"
      && instruction.source.label === sourceLabel
      && matchOperands(instruction.operands.map((operand) => operand.expression)),
  );
  if (!found) {
    throw new Error(`no matching B_SCR_OP_JUMPIFHALFWORD instruction found in ${sourceLabel}`);
  }
  return found.programCounter;
}

function stepAtProgramCounter(pc: number, rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectHit",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("production jumpifhalfword (Cmd_jumpifhalfword) dispatch", () => {
  it("registers B_SCR_OP_JUMPIFHALFWORD", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_JUMPIFHALFWORD")).toBeDefined();
  });

  describe("BattleScript_EffectHit's own Surf guard (the census's chokepoint)", () => {
    const pc = findJumpifhalfwordPc(
      "BattleScript_EffectHit",
      (ops) => ops[0] === "CMP_NOT_EQUAL" && ops[1] === "gCurrentMove" && ops[2] === "MOVE_SURF",
    );

    it("non-Surf move: taken, jumps straight to BattleScript_HitFromAtkCanceler", () => {
      const { result } = stepAtProgramCounter(pc, context({ currentMove: MOVE_TACKLE }));
      if (result.kind !== "advanced") throw new Error("expected advance");
      const target = program.instructions.find((i) => i.source.label === "BattleScript_HitFromAtkCanceler");
      expect(target).toBeDefined();
      expect(result.state.programCounter).toBe(target!.programCounter);
    });

    it("Surf: not taken, falls through to the underwater status3 check", () => {
      const { result } = stepAtProgramCounter(pc, context({ currentMove: MOVE_SURF }));
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(pc + 1);
    });
  });

  describe("(b) unsupported-branch barrier", () => {
    it("halts on an unmodeled memHword pointer (gChosenMove, BattleScript_MultiHitLoop's own Sleep Talk check)", () => {
      const pc = findJumpifhalfwordPc("BattleScript_MultiHitLoop", (ops) => ops[1] === "gChosenMove");
      const { result } = stepAtProgramCounter(pc, context());
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("halts on an unmodeled memHword pointer (gBattleWeather, EFFECT_SOLAR_BEAM's own first-turn check)", () => {
      const pc = findJumpifhalfwordPc("BattleScript_EffectSolarBeam", (ops) => ops[1] === "gBattleWeather");
      const { result } = stepAtProgramCounter(pc, context());
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("pass-through: BattleScript_EffectHit's own Surf guard never trips the barrier", () => {
      const pc = findJumpifhalfwordPc(
        "BattleScript_EffectHit",
        (ops) => ops[0] === "CMP_NOT_EQUAL" && ops[1] === "gCurrentMove" && ops[2] === "MOVE_SURF",
      );
      const { result } = stepAtProgramCounter(pc, context({ currentMove: MOVE_TACKLE }));
      expect(result.kind).toBe("advanced");
    });
  });

  describe("all six CMP_* comparators (source-complete compare logic)", () => {
    const basePc = findJumpifhalfwordPc(
      "BattleScript_EffectHit",
      (ops) => ops[0] === "CMP_NOT_EQUAL" && ops[1] === "gCurrentMove" && ops[2] === "MOVE_SURF",
    );
    const baseInstruction = program.instructions[basePc]!;

    function variantHandler() {
      const handlers = createBattleScriptJumpifhalfwordOpcodeHandlers(program);
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

    function evaluate(comparator: string, currentMove: number, value: string): boolean {
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_EffectHit",
        context({ currentMove }),
        1,
        externalPorts(),
      );
      const state = Object.freeze({ ...execution.state, programCounter: basePc });
      const handler = variantHandler();
      const transition = handler({ program, instruction: syntheticInstruction(comparator, value), state });
      return transition.control.kind === "jump";
    }

    it("CMP_EQUAL: taken iff equal", () => {
      expect(evaluate("CMP_EQUAL", MOVE_SURF, "MOVE_SURF")).toBe(true);
      expect(evaluate("CMP_EQUAL", MOVE_TACKLE, "MOVE_SURF")).toBe(false);
    });
    it("CMP_NOT_EQUAL: taken iff different", () => {
      expect(evaluate("CMP_NOT_EQUAL", MOVE_TACKLE, "MOVE_SURF")).toBe(true);
      expect(evaluate("CMP_NOT_EQUAL", MOVE_SURF, "MOVE_SURF")).toBe(false);
    });
    it("CMP_GREATER_THAN: taken iff memHword > value", () => {
      expect(evaluate("CMP_GREATER_THAN", MOVE_SURF, "MOVE_TACKLE")).toBe(true);
      expect(evaluate("CMP_GREATER_THAN", MOVE_TACKLE, "MOVE_SURF")).toBe(false);
    });
    it("CMP_LESS_THAN: taken iff memHword < value", () => {
      expect(evaluate("CMP_LESS_THAN", MOVE_TACKLE, "MOVE_SURF")).toBe(true);
      expect(evaluate("CMP_LESS_THAN", MOVE_SURF, "MOVE_TACKLE")).toBe(false);
    });
    it("CMP_COMMON_BITS: taken iff any shared bit", () => {
      expect(evaluate("CMP_COMMON_BITS", MOVE_SURF, "MOVE_SURF")).toBe(true);
      expect(evaluate("CMP_COMMON_BITS", 0, "MOVE_SURF")).toBe(false);
    });
    it("CMP_NO_COMMON_BITS: taken iff no shared bit", () => {
      expect(evaluate("CMP_NO_COMMON_BITS", 0, "MOVE_SURF")).toBe(true);
      expect(evaluate("CMP_NO_COMMON_BITS", MOVE_SURF, "MOVE_SURF")).toBe(false);
    });
  });
});
