import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
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
import {
  ROLE_PLAY_ABILITY_NONE,
  ROLE_PLAY_ABILITY_WONDER_GUARD,
} from "../src/engine/battleScriptTrycopyabilityOpcode.ts";

const program = loadBattleScriptProgram();
const ROLE_PLAY = 272;
const ABILITY_LEVITATE = 26;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0, ability: changes.ability ?? 1, hp: changes.hp ?? 100, maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? [ROLE_PLAY, 0, 0, 0], pp: changes.pp ?? [10, 0, 0, 0],
    status1: changes.status1 ?? 0, status2: changes.status2 ?? 0, status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0, rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0, truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0, flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0, usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0, usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0, item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? ["TYPE_NORMAL", "TYPE_NORMAL"], species: changes.species ?? 1,
    attack: changes.attack ?? 100, defense: changes.defense ?? 100, spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100, speed: changes.speed ?? 100, level: changes.level ?? 50,
    friendship: changes.friendship ?? 70, partyIndex: changes.partyIndex ?? 0,
  } as BattleScriptRulesBattler);
}

function rules(targetAbility: number): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [battler({ ability: 1 }), battler({ side: 1, ability: targetAbility }), battler(), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 }, scriptingBattler: 0,
    atkCancelerTracker: 0, battleOutcome: 0, currentMove: ROLE_PLAY, currentMovePosition: 0,
    moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0,
    missType: 0, hitMarker: 0, multiHitCounter: 0, lastUsedAbility: 77,
  });
}

const ABILITY_NAME = new Map([[ABILITY_LEVITATE, "LEVITATE"]]);
const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (context, operand) => operand.expression.startsWith("STRINGID_")
    ? Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze(
        operand.expression === "STRINGID_PKMNCOPIEDFOE"
          ? ["ATTACKER", "TARGET", ABILITY_NAME.get(context.state.rulesContext.lastUsedAbility) ?? "UNKNOWN"]
          : [],
      ),
    })
    : null,
  prepareSelectionMessage: () => null, prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null, resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) => operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
  resolveByteOperand: () => null,
});

function ack(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  let next = state;
  for (const id of state.scheduler.pendingControllerBattlers) next = acknowledgeBattleScriptMachineController(next, id);
  return next;
}

function run(rc: BattleScriptRulesContext, seed = 0x1234_5678) {
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectRolePlay", rc, seed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 300; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`Role Play did not reach END: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

describe("source-complete TRYCOPYABILITY / EFFECT_ROLE_PLAY", () => {
  it("pins the sole pointer-bearing source opcode", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_TRYCOPYABILITY"))
      .toMatchObject([{ opcodeId: 0xd3, dispatcher: "Cmd_trycopyability", operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }] }]);
  });

  it("copies the target ability through the active ability owner, records lastUsedAbility, and emits the typed ability-name message", () => {
    const state = run(rules(ABILITY_LEVITATE));
    expect(state.rulesContext.battlers[0].ability).toBe(ABILITY_LEVITATE);
    expect(state.rulesContext.battlers[1].ability).toBe(ABILITY_LEVITATE);
    expect(state.rulesContext.lastUsedAbility).toBe(ABILITY_LEVITATE);
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "message", messageId: "STRINGID_PKMNCOPIEDFOE",
      substitutions: ["ATTACKER", "TARGET", "LEVITATE"],
    }));
    expect(state.rng.calls).toBe(0);
    expect(state.rng.ledger).toEqual([]);
  });

  it.each([
    ["ABILITY_NONE", ROLE_PLAY_ABILITY_NONE],
    ["ABILITY_WONDER_GUARD", ROLE_PLAY_ABILITY_WONDER_GUARD],
  ])("rejects exactly %s and reaches the ordinary failure END", (_name, ability) => {
    const state = run(rules(ability));
    expect(state.rulesContext.battlers[0].ability).toBe(1);
    // accuracycheck's existing ability-result owner records the target
    // ability before TRYCOPYABILITY takes its failure pointer.
    expect(state.rulesContext.lastUsedAbility).toBe(ability);
    expect(state.rng.calls).toBe(0);
  });

  it("does not exclude an attacker already holding Wonder Guard; source checks only the target", () => {
    const rc = rules(ABILITY_LEVITATE);
    const battlers = rc.battlers.map((mon, index) => index === 0 ? Object.freeze({ ...mon, ability: ROLE_PLAY_ABILITY_WONDER_GUARD }) : mon) as unknown as BattleScriptRulesContext["battlers"];
    const state = run(Object.freeze({ ...rc, battlers: Object.freeze(battlers) }));
    expect(state.rulesContext.battlers[0].ability).toBe(ABILITY_LEVITATE);
    expect(state.rng.calls).toBe(0);
  });

  it("canonical replay is exact", () => {
    expect(run(rules(ABILITY_LEVITATE))).toEqual(run(rules(ABILITY_LEVITATE)));
  });
});
