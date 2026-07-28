import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";

const ENCORE = 227;
const TACKLE = 33;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find((row) => row.opcodeName === "B_SCR_OP_TRYSETENCORE")!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return {
    side: changes.side ?? 0, ability: 0, hp: 100, maxHP: 100,
    moves: changes.moves ?? [ENCORE, 0, 0, 0], pp: changes.pp ?? [5, 0, 0, 0],
    status1: 0, status2: 0, status3: 0, substituteHP: 0, rolloutTimer: 0,
    furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0, flinchImmobility: 0,
    disabledMove: changes.disabledMove ?? 0, usedDisabledMove: 0, tauntTimer: 0,
    usedTauntedMove: 0, usedImprisonedMove: 0, item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 1, personality: 1, attack: 100, defense: 100, spAttack: 100,
    spDefense: 100, speed: 100, level: 50, friendship: 70, partyIndex: 0,
    encoreTimer: changes.encoreTimer, encoredMove: changes.encoredMove,
    encoredMovePos: changes.encoredMovePos, encoreTimerStartValue: changes.encoreTimerStartValue,
  };
}

const ports: BattleScriptStatusRulesExternalPorts = {
  isControllerIdle: () => true, prepareMessage: () => null,
  prepareSelectionMessage: () => null, prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: (context) => context.state.rulesContext.selectorRoles.attacker,
  resolveBattlerAtPosition: () => null, resolveHalfwordOperand: () => null,
  resolveByteOperand: () => null,
};

function step(lastMove: number, targetChanges: Partial<BattleScriptRulesBattler> = {}, seed = 0x12345678) {
  const rules = createBattleScriptRulesContext({
    battlers: [
      battler(),
      battler({ side: 1, moves: [45, 45, TACKLE, 0], pp: [20, 20, 9, 0], ...targetChanges }),
      battler({ hp: 0 }), battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0, currentMove: ENCORE,
    currentMovePosition: 0, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte: 0, missType: 0, hitMarker: 0, multiHitCounter: 0,
    moveHistory: { lastMoves: [0, lastMove, 0, 0] },
    party: { player: [{ species: 1, hp: 100 }, {}, {}, {}, {}, {}], opponent: [{ species: 1, hp: 100 }, {}, {}, {}, {}, {}] },
    battleTopology: { battlersCount: 2, battleTypeFlags: (1 << 19) | (1 << 3), battlerPositions: [0, 1, 0xff, 0xff] },
  });
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectEncore", rules, seed, ports);
  return stepBattleScriptMachine(program, { ...execution.state, programCounter: instruction.programCounter }, execution.handlers);
}

describe("source-complete B_SCR_OP_TRYSETENCORE registration", () => {
  it("pins opcode, operand, PC, first matching slot, and the exact 3-6 target-owned duration", () => {
    expect(instruction).toMatchObject({ opcodeId: 0xa4, dispatcher: "Cmd_trysetencore", operands: [expect.objectContaining({ widthBytes: 4, expression: "BattleScript_ButItFailed" })] });
    const results = [0, 1, 2, 3].map((low) => step(TACKLE, {}, (low << 16) >>> 0));
    for (const result of results) {
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") continue;
      const target = result.state.rulesContext.battlers[1];
      expect(target.encoredMove).toBe(TACKLE);
      expect(target.encoredMovePos).toBe(2);
      expect(target.encoreTimer).toBeGreaterThanOrEqual(3);
      expect(target.encoreTimer).toBeLessThanOrEqual(6);
      expect(target.encoreTimerStartValue).toBe(target.encoreTimer);
      expect(result.state.programCounter).toBe(instruction.programCounter + 1);
      expect(result.state.rng.calls).toBe(1);
    }
  });

  it.each([
    ["Struggle", 165, {}], ["Encore", ENCORE, {}], ["Mirror Move", 119, {}],
    ["missing", 99, {}], ["zero PP first match", TACKLE, { moves: [TACKLE, TACKLE, 0, 0], pp: [0, 10, 0, 0] }],
    ["already encored", TACKLE, { encoredMove: TACKLE, encoreTimer: 2 }],
  ] as const)("takes the failure pointer with no RNG for %s", (_name, lastMove, changes) => {
    const result = step(lastMove, changes);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") return;
    expect(result.state.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_ButItFailed")!.programCounter);
    expect(result.state.rng.calls).toBe(0);
  });
});
