import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_HITMARKER_OBEYS,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import { BATTLE_SCRIPT_STATUS3_MINIMIZED } from "../src/engine/battleScriptSetminimizeOpcode.ts";

const MINIMIZE = 107;
const STOMP = 23;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_SETMINIMIZE",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0, ability: changes.ability ?? 0,
    hp: changes.hp ?? 100, maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([MINIMIZE, 0, 0, 0] as const),
    pp: changes.pp ?? ([20, 0, 0, 0] as const),
    status1: changes.status1 ?? 0, status2: changes.status2 ?? 0, status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0, rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0, truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0, flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0, usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0, usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    statStages: changes.statStages ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const), species: changes.species ?? 1,
    attack: changes.attack ?? 50, defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50, spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50, friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(),
      battler({ side: 1, moves: [STOMP, 0, 0, 0] }),
      battler(), battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: MINIMIZE, currentMovePosition: 0, moveResultFlags: 0,
    dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
    hitMarker: 0, multiHitCounter: 0, ...changes,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true, prepareMessage: () => null,
    prepareSelectionMessage: () => null, prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null, resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null, resolveByteOperand: () => null,
  });
}

function stepOpcode(rulesContext = rules()) {
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectMinimize", rulesContext, 1, ports(),
  );
  const result = stepBattleScriptMachine(program, {
    ...execution.state,
    programCounter: instruction.programCounter,
    callStack: Object.freeze([]),
    scheduler: createBattleScriptSchedulerState(),
    rng: createBattleScriptRngState(1),
    events: Object.freeze([]),
  }, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`setminimize stopped at ${result.kind}`);
  return result.state;
}

describe("source-complete B_SCR_OP_SETMINIMIZE registration", () => {
  it("pins the sole operandless one-byte 0xc7 instruction and source program order", () => {
    expect(program.instructions.filter(
      (candidate) => candidate.opcodeName === "B_SCR_OP_SETMINIMIZE",
    )).toHaveLength(1);
    expect(instruction).toMatchObject({
      opcodeId: 0xc7, dispatcher: "Cmd_setminimize", operands: [],
      source: { label: "BattleScript_EffectMinimize" },
    });
    const entry = resolveBattleScriptLabel(program, "BattleScript_EffectMinimize")!;
    expect(program.instructions.slice(entry.programCounter, entry.programCounter + 4)
      .map(({ opcodeName }) => opcodeName)).toEqual([
        "B_SCR_OP_ATTACKCANCELER", "B_SCR_OP_SETMINIMIZE",
        "B_SCR_OP_SETBYTE", "B_SCR_OP_GOTO",
      ]);
  });

  it("always advances one byte and writes only the selected attacker when HITMARKER_OBEYS is set", () => {
    const before = rules({
      battlers: [
        battler({ status3: 0x8000_0001 }),
        battler({ side: 1 }),
        battler({ status3: 0x40 }),
        battler({ side: 1 }),
      ],
      selectorRoles: { attacker: 2, target: 1, effectBattler: 2 },
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS,
      lockedMoves: [9, 8, 7, 6],
    });
    const after = stepOpcode(before);
    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext.battlers[0]).toBe(before.battlers[0]);
    expect(after.rulesContext.battlers[2].status3).toBe(0x140);
    expect(after.rulesContext.lockedMoves).toEqual([9, 8, 7, 6]);
    expect(after.rulesContext.statChanger).toBe(before.statChanger);
    expect(after.rng).toEqual(createBattleScriptRngState(1));
    expect(after.events).toEqual([]);
  });

  it("advances without mutation when HITMARKER_OBEYS is clear", () => {
    const before = rules({ battlers: [battler({ status3: 0x55 }), battler({ side: 1 }), battler(), battler({ side: 1 })] });
    const after = stepOpcode(before);
    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext).toBe(before);
    expect(after.rng.calls).toBe(0);
  });

  it("the existing Stomp target-status branch consumes the bit through jump/setbyte and sets sDMG_MULTIPLIER=2", () => {
    const entry = resolveBattleScriptLabel(program, "BattleScript_EffectStomp")!;
    expect(program.instructions.slice(entry.programCounter, entry.programCounter + 4)
      .map(({ opcodeName }) => opcodeName)).toEqual([
        "B_SCR_OP_JUMPIFSTATUS3CONDITION", "B_SCR_OP_SETBYTE",
        "B_SCR_OP_GOTO", "B_SCR_OP_JUMPIFABILITYPRESENT",
      ]);
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectStomp", rules({
      battlers: [
        battler({ moves: [STOMP, 0, 0, 0] }),
        battler({ side: 1, status3: BATTLE_SCRIPT_STATUS3_MINIMIZED }),
        battler(), battler({ side: 1 }),
      ],
      currentMove: STOMP,
    }), 1, ports());
    let state = execution.state;
    for (let i = 0; i < 3; i += 1) {
      const result = stepBattleScriptMachine(program, state, execution.handlers);
      if (result.kind !== "advanced") throw new Error(`Stomp branch stopped at ${result.kind}`);
      state = result.state;
      if (state.rulesContext.dmgMultiplier === 2) break;
    }
    expect(state.rulesContext.dmgMultiplier).toBe(2);
    expect(state.rng.calls).toBe(0);
  });

  it("sets the marker before the shared max-evasion failure path and never rolls it back", () => {
    const maxed = rules({
      battlers: [
        battler({ statStages: [6, 6, 6, 6, 6, 6, 6, 12] }),
        battler({ side: 1 }), battler(), battler({ side: 1 }),
      ],
    });
    const execution = createBattleScriptStatusRulesExecution(
      program, "BattleScript_EffectMinimize", maxed, 1, ports(),
    );
    let state = execution.state;
    for (let i = 0; i < 80; i += 1) {
      const result = stepBattleScriptMachine(program, state, execution.handlers);
      if (result.kind === "halted") {
        state = result.state;
        break;
      }
      state = result.kind === "blocked"
        ? result.state.scheduler.pendingControllerBattlers.reduce(
          (current, battler) => acknowledgeBattleScriptMachineController(current, battler),
          result.state,
        )
        : result.state;
    }
    expect(state.rulesContext.battlers[0].status3 & BATTLE_SCRIPT_STATUS3_MINIMIZED)
      .toBe(BATTLE_SCRIPT_STATUS3_MINIMIZED);
    expect(state.rulesContext.battlers[0].statStages[7]).toBe(12);
  });
});
