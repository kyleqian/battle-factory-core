import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED,
  BATTLE_SCRIPT_B_MSG_GETTING_PUMPED,
} from "../src/engine/battleScriptSetfocusenergyOpcode.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
} from "../src/engine/battleScriptSourceConstants.ts";

const FOCUS_ENERGY = 116;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_SETFOCUSENERGY",
)!;
const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: () => null,
  resolveByteOperand: () => null,
});

function battler(
  side: 0 | 1,
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side, ability: 0, hp: 100, maxHP: 100,
    moves: [FOCUS_ENERGY, 33, 0, 0] as const, pp: [30, 35, 0, 0] as const,
    status1: 0, status2: 0, status3: 0, substituteHP: 0,
    rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0,
    rechargeTimer: 0, flinchImmobility: 0, disabledMove: 0,
    usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6] as const,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const, species: 66,
    attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed: 100, level: 50, friendship: 70, partyIndex: 0,
    ...changes,
  });
}

function step(attacker: 0 | 1, attackerStatus2: number, moveResultFlags: number) {
  const rules = createBattleScriptRulesContext({
    battlers: [
      battler(0, { status2: attacker === 0 ? attackerStatus2 : 0x11 }),
      battler(1, { status2: attacker === 1 ? attackerStatus2 : 0x22 }),
      battler(0, { hp: 0, status2: 0x44 }),
      battler(1, { hp: 0, status2: 0x88 }),
    ],
    selectorRoles: {
      attacker, target: attacker === 0 ? 1 : 0,
      effectBattler: attacker, fainted: null,
    },
    scriptingBattler: attacker, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: FOCUS_ENERGY, currentMovePosition: 0, moveResultFlags,
    multistringChooser: 77,
    dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
    hitMarker: 0, multiHitCounter: 0,
  });
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectFocusEnergy", rules, 0x1234_5678, ports,
  );
  const before = Object.freeze({
    ...execution.state,
    programCounter: instruction.programCounter,
  });
  const result = stepBattleScriptMachine(program, before, execution.handlers);
  if (result.kind !== "advanced") {
    throw new Error(`setfocusenergy stopped at ${result.kind}`);
  }
  return { rules, before, after: result.state };
}

describe("source-complete B_SCR_OP_SETFOCUSENERGY registration", () => {
  it("registers the sole operand-free one-byte 0x9a instruction in the real effect order", () => {
    expect(program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_SETFOCUSENERGY",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0x9a, dispatcher: "Cmd_setfocusenergy", operands: [],
      source: { label: "BattleScript_EffectFocusEnergy" },
    });
    expect(1 + instruction.operands.reduce(
      (sum, operand) => sum + operand.widthBytes, 0,
    )).toBe(1);
    const entry = resolveBattleScriptLabel(program, "BattleScript_EffectFocusEnergy")!;
    expect(program.instructions.slice(entry.programCounter, entry.programCounter + 10)
      .map(({ opcodeName }) => opcodeName)).toEqual([
        "B_SCR_OP_ATTACKCANCELER", "B_SCR_OP_ATTACKSTRING",
        "B_SCR_OP_PPREDUCE", "B_SCR_OP_JUMPIFSTATUS2",
        "B_SCR_OP_SETFOCUSENERGY", "B_SCR_OP_ATTACKANIMATION",
        "B_SCR_OP_WAITANIMATION", "B_SCR_OP_PRINTFROMTABLE",
        "B_SCR_OP_WAITMESSAGE", "B_SCR_OP_GOTO",
      ]);
  });

  it.each([0, 1] as const)(
    "success writes only attacker %i status2 plus the exact selector",
    (attacker) => {
      const status2 = 0x8000_0005;
      const { rules, before, after } = step(attacker, status2, 0x42);
      expect(after.programCounter).toBe(instruction.programCounter + 1);
      expect(after.rulesContext.battlers[attacker]).toEqual({
        ...rules.battlers[attacker],
        status2: (status2 | BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY) >>> 0,
      });
      expect(after.rulesContext.multistringChooser)
        .toBe(BATTLE_SCRIPT_B_MSG_GETTING_PUMPED);
      expect(after.rulesContext.moveResultFlags).toBe(0x42);
      for (const id of [0, 1, 2, 3]) {
        if (id !== attacker) {
          expect(after.rulesContext.battlers[id]).toBe(rules.battlers[id]);
        }
      }
      expect(after.rng).toBe(before.rng);
      expect(after.scheduler).toBe(before.scheduler);
      expect(after.events).toBe(before.events);
    },
  );

  it.each([0, 1] as const)(
    "defensive duplicate on attacker %i preserves all battlers and ORs only failed plus the exact selector",
    (attacker) => {
      const status2 = BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY | 0x805;
      const { rules, before, after } = step(attacker, status2, 0x82);
      expect(after.programCounter).toBe(instruction.programCounter + 1);
      expect(after.rulesContext.battlers).toBe(rules.battlers);
      expect(after.rulesContext.moveResultFlags)
        .toBe((0x82 | BATTLE_SCRIPT_MOVE_RESULT_FAILED) >>> 0);
      expect(after.rulesContext.multistringChooser)
        .toBe(BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED);
      expect(after.rng).toBe(before.rng);
      expect(after.scheduler).toBe(before.scheduler);
      expect(after.events).toBe(before.events);
    },
  );
});
