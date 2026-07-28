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
const RECYCLE = 278;
const SITRUS_BERRY = 142;
const LEFTOVERS = 200;
const EMPTY: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0, ability: changes.ability ?? 1, hp: changes.hp ?? 100, maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? [RECYCLE, 0, 0, 0], pp: changes.pp ?? [10, 0, 0, 0],
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

function party(item: number): BattleScriptPartyMemberInput[] {
  return [{ species: 1, isEgg: false, hp: 100, item }, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
}

function rules(usedItem: number, heldItem = 0): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [battler({ item: heldItem }), battler({ side: 1 }), battler(), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 0, effectBattler: 0 }, scriptingBattler: 0,
    atkCancelerTracker: 0, battleOutcome: 0, currentMove: RECYCLE, currentMovePosition: 0,
    moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0,
    missType: 0, hitMarker: 0, multiHitCounter: 0, lastUsedItem: 77,
    usedHeldItems: [usedItem, 9, 8, 7],
    party: { player: party(heldItem), opponent: party(0) },
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (context, operand) => operand.expression.startsWith("STRINGID_")
    ? Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze(operand.expression === "STRINGID_XFOUNDONEY"
        ? ["ATTACKER", `ITEM_${context.state.rulesContext.lastUsedItem}`]
        : []),
    }) : null,
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
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectRecycle", rc, seed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 300; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`Recycle did not reach END: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

describe("source-complete TRYRECYCLEITEM / EFFECT_RECYCLE", () => {
  it("pins the sole pointer-bearing source opcode", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_TRYRECYCLEITEM"))
      .toMatchObject([{ opcodeId: 0xea, dispatcher: "Cmd_tryrecycleitem", operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }] }]);
  });

  it("restores the consumed item, clears only the attacker's record, syncs party/controller state, and names the item", () => {
    const state = run(rules(SITRUS_BERRY));
    expect(state.rulesContext.battlers[0].item).toBe(SITRUS_BERRY);
    expect(state.rulesContext.party.player[0].item).toBe(SITRUS_BERRY);
    expect(state.rulesContext.usedHeldItems).toEqual([0, 9, 8, 7]);
    expect(state.rulesContext.lastUsedItem).toBe(SITRUS_BERRY);
    expect(state.events).toContainEqual(expect.objectContaining({ kind: "set-battler-item", battler: 0, item: SITRUS_BERRY }));
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "message", messageId: "STRINGID_XFOUNDONEY", substitutions: ["ATTACKER", `ITEM_${SITRUS_BERRY}`],
    }));
    expect(state.rng.calls).toBe(0);
    expect(state.rng.ledger).toEqual([]);
  });

  it("fails with no recorded consumed item and preserves the whole item ledger", () => {
    const state = run(rules(0));
    expect(state.rulesContext.battlers[0].item).toBe(0);
    expect(state.rulesContext.usedHeldItems).toEqual([0, 9, 8, 7]);
    expect(state.rulesContext.lastUsedItem).toBe(77);
    expect(state.rng.calls).toBe(0);
  });

  it("fails while already holding an item without consuming the recorded item", () => {
    const state = run(rules(SITRUS_BERRY, LEFTOVERS));
    expect(state.rulesContext.battlers[0].item).toBe(LEFTOVERS);
    expect(state.rulesContext.party.player[0].item).toBe(LEFTOVERS);
    expect(state.rulesContext.usedHeldItems).toEqual([SITRUS_BERRY, 9, 8, 7]);
    expect(state.rulesContext.lastUsedItem).toBe(77);
    expect(state.rng.calls).toBe(0);
  });

  it("canonical replay is exact", () => {
    expect(run(rules(SITRUS_BERRY))).toEqual(run(rules(SITRUS_BERRY)));
  });
});
