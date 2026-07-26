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
import { createBattleScriptJumpifwordOpcodeHandlers } from "../src/engine/battleScriptJumpifwordOpcode.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;
/** include/constants/battle.h. */
const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FRONTIER =
  (1 << 8) | (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19) | (1 << 20) | (1 << 21);

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
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER,
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

/**
 * `jumpifbattletype BATTLE_TYPE_TRAINER`/`BATTLE_TYPE_FRONTIER` gates recur
 * across many move scripts (Frustration/Return power, trainer-only
 * effects...), so an unscoped operand match can land on the wrong call site.
 * `sourceLabel` scopes the search to the block this rung actually cares
 * about (each `::`-labeled block in data/battle_scripts_1.s is its own
 * concreteCatalog block, per battleScriptProgram.ts's compileProgram).
 */
function findJumpifwordPc(
  sourceLabel: string,
  matchOperands: (operands: readonly string[]) => boolean,
): number {
  const found = program.instructions.find(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_JUMPIFWORD"
      && instruction.source.label === sourceLabel
      && matchOperands(instruction.operands.map((operand) => operand.expression)),
  );
  if (!found) {
    throw new Error(`no matching B_SCR_OP_JUMPIFWORD instruction found in ${sourceLabel}`);
  }
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

describe("production jumpifword (Cmd_jumpifword) dispatch", () => {
  it("registers B_SCR_OP_JUMPIFWORD", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_JUMPIFWORD")).toBeDefined();
  });

  describe("BattleScript_HandleFaintedMon's own jumpifbattletype BATTLE_TYPE_TRAINER gate", () => {
    const pc = findJumpifwordPc(
      "BattleScript_HandleFaintedMon",
      (ops) => ops[0] === "CMP_COMMON_BITS" && ops[1] === "gBattleTypeFlags" && ops[2] === "BATTLE_TYPE_TRAINER",
    );

    it("Factory (TRAINER|FRONTIER): taken, jumps to BattleScript_FaintedMonTryChoose", () => {
      const { result } = stepAtProgramCounter(
        pc,
        context({
          battleTopology: {
            battlersCount: 2,
            battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER,
            battlerPositions: [0, 1, 2, 3],
          },
        }),
      );
      if (result.kind !== "advanced") throw new Error("expected advance");
      const target = program.instructions.find((i) => i.source.label === "BattleScript_FaintedMonTryChoose");
      expect(target).toBeDefined();
      expect(result.state.programCounter).toBe(target!.programCounter);
    });

    it("not a trainer battle: not taken, falls through", () => {
      const { result } = stepAtProgramCounter(
        pc,
        context({
          battleTopology: { battlersCount: 2, battleTypeFlags: 0, battlerPositions: [0, 1, 2, 3] },
        }),
      );
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(pc + 1);
    });
  });

  describe("FaintedMonTryChoose's own jumpifbattletype BATTLE_TYPE_FRONTIER gate", () => {
    const pc = findJumpifwordPc(
      "BattleScript_FaintedMonTryChoose",
      (ops) => ops[0] === "CMP_COMMON_BITS" && ops[1] === "gBattleTypeFlags" && ops[2] === "BATTLE_TYPE_FRONTIER",
    );

    it("Factory: taken, jumps to BattleScript_FaintedMonSendOutNew", () => {
      const { result } = stepAtProgramCounter(
        pc,
        context({
          battleTopology: {
            battlersCount: 2,
            battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER,
            battlerPositions: [0, 1, 2, 3],
          },
        }),
      );
      if (result.kind !== "advanced") throw new Error("expected advance");
      const target = program.instructions.find((i) => i.source.label === "BattleScript_FaintedMonSendOutNew");
      expect(target).toBeDefined();
      expect(result.state.programCounter).toBe(target!.programCounter);
    });
  });

  describe(
    "BattleScript_DamagingWeatherLoop's own jumpifword CMP_EQUAL, gBattleMoveDamage, 0, ... "
      + "(screens/weather registration slice 5, docs/screens-weather-ground-truth.md §1c -- "
      + "widened from an unsupported-branch barrier to a real, modeled compare)",
    () => {
      const pc = findJumpifwordPc("BattleScript_DamagingWeatherLoop", (ops) => ops[1] === "gBattleMoveDamage");

      it("taken: jumps to BattleScript_DamagingWeatherLoopIncrement when gBattleMoveDamage == 0", () => {
        const { result } = stepAtProgramCounter(pc, context({ battleMoveDamage: 0 }));
        if (result.kind !== "advanced") throw new Error("expected advance");
        const target = program.instructions.find((i) => i.source.label === "BattleScript_DamagingWeatherLoopIncrement");
        expect(target).toBeDefined();
        expect(result.state.programCounter).toBe(target!.programCounter);
      });

      it("not taken: falls through when gBattleMoveDamage != 0 (real chip damage this tick)", () => {
        const { result } = stepAtProgramCounter(pc, context({ battleMoveDamage: 6 }));
        if (result.kind !== "advanced") throw new Error("expected advance");
        expect(result.state.programCounter).toBe(pc + 1);
      });
    },
  );

  describe("(b) unsupported-branch barrier", () => {
    it("halts on an unmodeled comparison value (HITMARKER_NO_ATTACKSTRING, gHitMarker itself is modeled)", () => {
      const pc = findJumpifwordPc("BattleScript_EffectRazorWind", (ops) => ops[2] === "HITMARKER_NO_ATTACKSTRING");
      const { result } = stepAtProgramCounter(pc, context());
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("pass-through: the Factory-path TRAINER gate never trips the barrier", () => {
      const pc = findJumpifwordPc(
        "BattleScript_HandleFaintedMon",
        (ops) => ops[0] === "CMP_COMMON_BITS" && ops[1] === "gBattleTypeFlags" && ops[2] === "BATTLE_TYPE_TRAINER",
      );
      const { result } = stepAtProgramCounter(
        pc,
        context({
          battleTopology: {
            battlersCount: 2,
            battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER,
            battlerPositions: [0, 1, 2, 3],
          },
        }),
      );
      expect(result.kind).toBe("advanced");
    });
  });

  describe("all six CMP_* comparators (source-complete compare logic)", () => {
    const basePc = findJumpifwordPc(
      "BattleScript_HandleFaintedMon",
      (ops) => ops[0] === "CMP_COMMON_BITS" && ops[1] === "gBattleTypeFlags" && ops[2] === "BATTLE_TYPE_TRAINER",
    );
    const baseInstruction = program.instructions[basePc]!;

    function variantHandler() {
      const handlers = createBattleScriptJumpifwordOpcodeHandlers(program);
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

    function evaluate(comparator: string, battleTypeFlags: number, value: string): boolean {
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HandleFaintedMon",
        context({ battleTopology: { battlersCount: 2, battleTypeFlags, battlerPositions: [0, 1, 2, 3] } }),
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
      expect(evaluate("CMP_EQUAL", 8, "BATTLE_TYPE_TRAINER")).toBe(true);
      expect(evaluate("CMP_EQUAL", 16, "BATTLE_TYPE_TRAINER")).toBe(false);
    });
    it("CMP_NOT_EQUAL: taken iff different", () => {
      expect(evaluate("CMP_NOT_EQUAL", 16, "BATTLE_TYPE_TRAINER")).toBe(true);
      expect(evaluate("CMP_NOT_EQUAL", 8, "BATTLE_TYPE_TRAINER")).toBe(false);
    });
    it("CMP_GREATER_THAN: taken iff memWord > value", () => {
      expect(evaluate("CMP_GREATER_THAN", 16, "BATTLE_TYPE_TRAINER")).toBe(true);
      expect(evaluate("CMP_GREATER_THAN", 8, "BATTLE_TYPE_TRAINER")).toBe(false);
    });
    it("CMP_LESS_THAN: taken iff memWord < value", () => {
      expect(evaluate("CMP_LESS_THAN", 2, "BATTLE_TYPE_TRAINER")).toBe(true);
      expect(evaluate("CMP_LESS_THAN", 8, "BATTLE_TYPE_TRAINER")).toBe(false);
    });
    it("CMP_COMMON_BITS: taken iff any shared bit", () => {
      expect(evaluate("CMP_COMMON_BITS", BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER, "BATTLE_TYPE_TRAINER")).toBe(true);
      expect(evaluate("CMP_COMMON_BITS", BATTLE_TYPE_FRONTIER, "BATTLE_TYPE_TRAINER")).toBe(false);
    });
    it("CMP_NO_COMMON_BITS: taken iff no shared bit", () => {
      expect(evaluate("CMP_NO_COMMON_BITS", BATTLE_TYPE_FRONTIER, "BATTLE_TYPE_TRAINER")).toBe(true);
      expect(evaluate("CMP_NO_COMMON_BITS", BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER, "BATTLE_TYPE_TRAINER")).toBe(false);
    });
  });
});
