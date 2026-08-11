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
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "../src/engine/battleScriptSourceConstants.ts";

const ROLLOUT = 205;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) =>
    candidate.opcodeName === "B_SCR_OP_ROLLOUTDAMAGECALCULATION",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([ROLLOUT, 0, 0, 0] as const),
    pp: changes.pp ?? ([20, 0, 0, 0] as const),
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
    statStages: changes.statStages ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_ROCK", "TYPE_BUG"] as const),
    species: changes.species ?? 213,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, ...attackerChanges }),
      battler({ side: 1, species: 242, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: ROLLOUT,
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

function ports(): BattleScriptStatusRulesExternalPorts {
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

function stepRollout(
  rulesContext: BattleScriptRulesContext,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectRollout",
    rulesContext,
    1,
    ports(),
  );
  const state = Object.freeze({
    ...execution.state,
    programCounter: instruction.programCounter,
    callStack: Object.freeze([]),
    scheduler: createBattleScriptSchedulerState(),
    rng: createBattleScriptRngState(1),
    events: Object.freeze([]),
  });
  const result = stepBattleScriptMachine(program, state, execution.handlers);
  if (result.kind !== "advanced") {
    throw new Error(`rollout opcode did not advance: ${result.kind}`);
  }
  return result.state;
}

describe("source-complete ROLLOUTDAMAGECALCULATION registration", () => {
  it("pins the sole operandless 0xb3 instruction and dispatcher", () => {
    expect(program.instructions.filter(
      (candidate) =>
        candidate.opcodeName === "B_SCR_OP_ROLLOUTDAMAGECALCULATION",
    )).toHaveLength(1);
    expect(instruction).toMatchObject({
      opcodeId: 0xb3,
      dispatcher: "Cmd_rolloutdamagecalculation",
      operands: [],
      source: { label: "BattleScript_RolloutHit" },
    });
  });

  it("starts attacker-owned state once, locks the selected move, and uses base power 30", () => {
    const before = rules({}, { lockedMoves: [7, 8, 9, 10] });
    const after = stepRollout(before);
    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext.battlers[0]).toMatchObject({
      rolloutTimer: 4,
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
    });
    expect(after.rulesContext.rolloutTimerStartValues).toEqual([5, 0, 0, 0]);
    expect(after.rulesContext.lockedMoves).toEqual([ROLLOUT, 8, 9, 10]);
    expect(after.rulesContext.dynamicBasePower).toBe(30);
    expect(after.rng).toEqual(createBattleScriptRngState(1));
    expect(after.events).toEqual([]);
  });

  it("applies Defense Curl to the complete five-hit 60/120/240/480/960 ladder and unlocks only after hit five", () => {
    let current = rules({
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL,
    });
    for (const [index, expectedPower] of [60, 120, 240, 480, 960].entries()) {
      const after = stepRollout(current);
      expect(after.rulesContext.dynamicBasePower).toBe(expectedPower);
      expect(after.rulesContext.battlers[0].rolloutTimer).toBe(4 - index);
      expect(after.rulesContext.rolloutTimerStartValues[0]).toBe(5);
      expect(
        after.rulesContext.battlers[0].status2
        & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL,
      ).toBe(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL);
      expect(
        after.rulesContext.battlers[0].status2
        & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
      ).toBe(index === 4 ? 0 : BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS);
      expect(after.rulesContext.lockedMoves[0]).toBe(ROLLOUT);
      current = createBattleScriptRulesContext({
        ...after.rulesContext,
        moveResultFlags: 0,
      });
    }
  });

  it("owns the selected attacker role rather than battler zero", () => {
    const before = rules({}, {
      selectorRoles: { attacker: 2, target: 1, effectBattler: 1 },
      lockedMoves: [1, 2, 3, 4],
    });
    const after = stepRollout(before);
    expect(after.rulesContext.battlers[0]).toBe(before.battlers[0]);
    expect(after.rulesContext.battlers[2]).toMatchObject({
      rolloutTimer: 4,
    });
    expect(after.rulesContext.rolloutTimerStartValues).toEqual([0, 0, 5, 0]);
    expect(after.rulesContext.lockedMoves).toEqual([1, 2, ROLLOUT, 4]);
  });

  it.each([1 << 0, 1 << 3, 1 << 5])(
    "no-effect flag 0x%s cancels and jumps to MoveMissedPause without clearing initial/locked evidence",
    (moveResultFlag) => {
      const status2 = (
        BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
        | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE
        | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR
        | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE
        | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL
      ) >>> 0;
      const before = rules({
        status2,
        status3: BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
        rolloutTimer: 3,
        furyCutterCounter: 9,
      }, {
        moveResultFlags: moveResultFlag,
        dynamicBasePower: 777,
        lockedMoves: [ROLLOUT, 2, 3, 4],
        rolloutTimerStartValues: [5, 6, 7, 8],
      });
      const after = stepRollout(before);
      expect(after.programCounter).toBe(
        resolveBattleScriptLabel(program, "BattleScript_MoveMissedPause")!.programCounter,
      );
      expect(after.rulesContext.battlers[0]).toMatchObject({
        status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL,
        status3: 0,
        rolloutTimer: 0,
        furyCutterCounter: 0,
      });
      expect(after.rulesContext.rolloutTimerStartValues).toEqual([5, 6, 7, 8]);
      expect(after.rulesContext.lockedMoves).toEqual([ROLLOUT, 2, 3, 4]);
      expect(after.rulesContext.dynamicBasePower).toBe(777);
      expect(after.rng.calls).toBe(0);
      expect(after.events).toEqual([]);
    },
  );

  it("rejects an impossible active lock with a zero timer instead of silently restarting it", () => {
    const before = rules({
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
      rolloutTimer: 0,
    }, {
      lockedMoves: [ROLLOUT, 0, 0, 0],
      rolloutTimerStartValues: [5, 0, 0, 0],
    });
    expect(() => stepRollout(before)).toThrow(/zero rolloutTimer/);
  });
});
