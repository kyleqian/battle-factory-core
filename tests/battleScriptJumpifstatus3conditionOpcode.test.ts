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
import { createBattleScriptJumpifstatus3conditionOpcodeHandlers } from "../src/engine/battleScriptJumpifstatus3conditionOpcode.ts";

const program = loadBattleScriptProgram();
const MOVE_SURF = 57;
/** include/constants/battle.h:175. */
const STATUS3_UNDERWATER = 1 << 18;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_SURF, 0, 0, 0]),
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
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
  });
}

function context(
  targetStatus3: number,
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0 }),
      battler({ side: 1, status3: targetStatus3 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_SURF,
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

function findPc(sourceLabel: string, matchOperands: (operands: readonly string[]) => boolean): number {
  const found = program.instructions.find(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_JUMPIFSTATUS3CONDITION"
      && instruction.source.label === sourceLabel
      && matchOperands(instruction.operands.map((operand) => operand.expression)),
  );
  if (!found) {
    throw new Error(`no matching B_SCR_OP_JUMPIFSTATUS3CONDITION instruction found in ${sourceLabel}`);
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

describe("production jumpifstatus3condition (Cmd_jumpifstatus3condition) dispatch", () => {
  it("registers B_SCR_OP_JUMPIFSTATUS3CONDITION", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_JUMPIFSTATUS3CONDITION")).toBeDefined();
  });

  describe("BattleScript_EffectHit's own Surf-underwater guard (jumpifnostatus3, condition=TRUE)", () => {
    const pc = findPc("BattleScript_EffectHit", (ops) => ops[1] === "STATUS3_UNDERWATER");

    it("target not underwater: bit clear -> taken, jumps to BattleScript_HitFromAtkCanceler", () => {
      const { result } = stepAtProgramCounter(pc, context(0));
      if (result.kind !== "advanced") throw new Error("expected advance");
      const target = program.instructions.find((i) => i.source.label === "BattleScript_HitFromAtkCanceler");
      expect(target).toBeDefined();
      expect(result.state.programCounter).toBe(target!.programCounter);
    });

    it("target underwater (Dive): bit set -> not taken, falls through to the orword/setbyte underwater sub-script", () => {
      const { result } = stepAtProgramCounter(pc, context(STATUS3_UNDERWATER));
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(pc + 1);
    });
  });

  describe("EFFECT_ROAR's own jumpifstatus3 (condition=FALSE, jump-if-set form)", () => {
    const pc = findPc("BattleScript_EffectRoar", (ops) => ops[1] === "STATUS3_ROOTED");

    it("rooted: bit set -> taken, jumps to BattleScript_PrintMonIsRooted", () => {
      const { result } = stepAtProgramCounter(pc, context(1 << 10));
      if (result.kind !== "advanced") throw new Error("expected advance");
      const target = program.instructions.find((i) => i.source.label === "BattleScript_PrintMonIsRooted");
      expect(target).toBeDefined();
      expect(result.state.programCounter).toBe(target!.programCounter);
    });

    it("not rooted: bit clear -> not taken, falls through", () => {
      const { result } = stepAtProgramCounter(pc, context(0));
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(pc + 1);
    });
  });

  it("registration validates every one of the committed program's 7 concrete starts", () => {
    expect(() => createBattleScriptJumpifstatus3conditionOpcodeHandlers(program)).not.toThrow();
  });
});
