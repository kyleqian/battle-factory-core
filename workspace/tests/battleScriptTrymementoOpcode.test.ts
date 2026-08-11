import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const MEMENTO = 262;
const STATUS2_SUBSTITUTE = 1 << 24;
const EMPTY: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };
function partySide(hp: number): BattleScriptPartyMemberInput[] {
  return [{ species: 1, isEgg: false, hp }, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
}

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? [MEMENTO, 0, 0, 0],
    pp: changes.pp ?? [10, 0, 0, 0],
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
    types: changes.types ?? ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: changes.species ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  } as BattleScriptRulesBattler);
}

function rules(
  attacker: Partial<BattleScriptRulesBattler> = {},
  target: Partial<BattleScriptRulesBattler> = {},
  missType = 0,
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler(attacker),
      battler({ side: 1, ...target }),
      battler({ hp: 0, species: 0 }),
      battler({ side: 1, hp: 0, species: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MEMENTO,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType,
    hitMarker: 0,
    multiHitCounter: 0,
    party: { player: partySide(attacker.hp ?? 100), opponent: partySide(target.hp ?? 100) },
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (_context, operand) => operand.expression.startsWith("STRINGID_")
    ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
    : null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) => operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
  resolveByteOperand: () => null,
});

function ack(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  let next = state;
  for (const id of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, id);
  }
  return next;
}

function run(
  entry: string,
  rc: BattleScriptRulesContext,
  seed = 0x1234_5678,
  trace: Array<{ opcodeName: string; attackerHp: number }> = [],
) {
  const execution = createBattleScriptStatusRulesExecution(program, entry, rc, seed, ports);
  trace.push({
    opcodeName: program.instructions[execution.state.programCounter]!.opcodeName,
    attackerHp: execution.state.rulesContext.battlers[0].hp,
  });
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 500; steps += 1) {
    trace.push({
      opcodeName: program.instructions[result.state.programCounter]!.opcodeName,
      attackerHp: result.state.rulesContext.battlers[0].hp,
    });
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`${entry} did not reach END: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: expect.stringMatching(/^B_SCR_OP_END/) });
  return result.state;
}

describe("source-complete TRYMEMENTO / EFFECT_MEMENTO", () => {
  it("pins both pointer-bearing opcode starts and their source branches", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_TRYMEMENTO"))
      .toMatchObject([
        { opcodeId: 0xc9, dispatcher: "Cmd_trymemento", operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }] },
        { opcodeId: 0xc9, dispatcher: "Cmd_trymemento", operands: [{ widthBytes: 4, expression: "BattleScript_MementoTargetProtectEnd" }] },
      ]);
  });

  it("success self-faints first, then sharply lowers target Attack and Sp. Attack, then completes both real faint callbacks", () => {
    const trace: Array<{ opcodeName: string; attackerHp: number }> = [];
    const state = run("BattleScript_EffectMemento", rules(), 0x1234_5678, trace);
    expect(state.rulesContext.battlers[0].hp).toBe(0);
    expect(state.rulesContext.party.player[0].hp).toBe(0);
    expect(state.rulesContext.battlers[1].statStages[1]).toBe(4);
    expect(state.rulesContext.battlers[1].statStages[4]).toBe(4);
    const firstStatChange = trace.find(({ opcodeName }) => opcodeName === "B_SCR_OP_STATBUFFCHANGE");
    expect(firstStatChange).toEqual({ opcodeName: "B_SCR_OP_STATBUFFCHANGE", attackerHp: 0 });
    expect(state.rng.calls).toBe(0);
    expect(state.rng.ledger).toEqual([]);
  });

  it("fails only when both target offensive stages are minimum and the target was not protected", () => {
    const minimum = [6, 0, 6, 6, 0, 6, 6, 6] as const;
    const state = run("BattleScript_EffectMemento", rules({}, { statStages: minimum }));
    expect(state.rulesContext.battlers[0].hp).toBe(100);
    expect(state.rulesContext.battlers[1].statStages).toEqual(minimum);
    expect(state.rng.calls).toBe(0);
  });

  it("one non-minimum offensive stage is sufficient: user faints and only that stage drops", () => {
    const state = run(
      "BattleScript_EffectMemento",
      rules({}, { statStages: [6, 0, 6, 6, 1, 6, 6, 6] }),
    );
    expect(state.rulesContext.battlers[0].hp).toBe(0);
    expect(state.rulesContext.battlers[1].statStages[1]).toBe(0);
    expect(state.rulesContext.battlers[1].statStages[4]).toBe(0);
    expect(state.rng.calls).toBe(0);
  });

  it("Substitute is not a try gate: user faints, both target stages stay unchanged, and the no-effect arm reaches END", () => {
    const state = run(
      "BattleScript_EffectMemento",
      rules({}, { status2: STATUS2_SUBSTITUTE, substituteHP: 25 }),
    );
    expect(state.rulesContext.battlers[0].hp).toBe(0);
    expect(state.rulesContext.battlers[1].statStages[1]).toBe(6);
    expect(state.rulesContext.battlers[1].statStages[4]).toBe(6);
    expect(state.rng.calls).toBe(0);
  });

  it("Protect bypasses the minimized-stats failure gate but still self-faints without stat drops", () => {
    const minimum = [6, 0, 6, 6, 0, 6, 6, 6] as const;
    const state = run("BattleScript_EffectMemento", rules({}, { statStages: minimum }, 1));
    expect(state.rulesContext.battlers[0].hp).toBe(0);
    expect(state.rulesContext.battlers[1].statStages).toEqual(minimum);
    expect(state.rng.calls).toBe(0);
  });

  it("terminal interaction uses the existing HandleFaintedMon/checkteamslost owner after the effect script", () => {
    const fainted = run("BattleScript_EffectMemento", rules());
    const staged = Object.freeze({
      ...fainted.rulesContext,
      selectorRoles: Object.freeze({ ...fainted.rulesContext.selectorRoles, fainted: 0 as const }),
      battleOutcome: 0,
    });
    const terminal = run("BattleScript_HandleFaintedMon", staged);
    expect(terminal.rulesContext.battleOutcome).toBe(2);
    expect(terminal.rng.calls).toBe(0);
  });

  it("canonical replay is exact", () => {
    expect(run("BattleScript_EffectMemento", rules()))
      .toEqual(run("BattleScript_EffectMemento", rules()));
  });
});
