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
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const MOVE_MEAN_LOOK = 212;
const MOVE_NIGHTMARE = 171;
const STATUS1_SLEEP = 0x7;
const STATUS2_SUBSTITUTE = 1 << 24;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const STATUS2_NIGHTMARE = 1 << 27;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([0, 0, 0, 0] as const),
    pp: changes.pp ?? ([10, 0, 0, 0] as const),
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
    partyIndex: changes.partyIndex ?? 0,
    battlerPreventingEscape: changes.battlerPreventingEscape,
  });
}

function rules(
  move: number,
  target: Partial<BattleScriptRulesBattler> = {},
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, moves: [move, 0, 0, 0], pp: [10, 0, 0, 0] }),
      battler({ side: 1, ...target }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: {
      player: [
        { species: 1, hp: 100, moves: [move, 0, 0, 0], pp: [10, 0, 0, 0] },
        {}, {}, {}, {}, {},
      ],
      opponent: [{ species: 2, hp: 100 }, {}, {}, {}, {}, {}],
    },
    ...changes,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) => operand.expression.startsWith("STRINGID_")
      ? Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze([]),
        })
      : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => 0 as const,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
    resolveByteOperand: () => null,
  });
}

function acknowledge(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

function run(entry: string, source: BattleScriptRulesContext, seed = 7) {
  const execution = createBattleScriptStatusRulesExecution(program, entry, source, seed, ports());
  let state = execution.state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "halted") return result.state;
    expect(result.kind).not.toBe("unsupported");
    state = result.kind === "blocked" ? acknowledge(result.state) : result.state;
  }
  throw new Error(`${entry} did not terminate`);
}

describe("Family-B Cluster 3 Mean Look and Nightmare", () => {
  it("walks Mean Look to END with zero RNG and records the preventer identity", () => {
    const result = run("BattleScript_EffectMeanLook", rules(MOVE_MEAN_LOOK));
    expect(result.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.rulesContext.battlers[1]).toMatchObject({
      status2: STATUS2_ESCAPE_PREVENTION,
      battlerPreventingEscape: 0,
    });
    expect(result.rng.calls).toBe(0);
  });

  it.each([
    ["duplicate", { status2: STATUS2_ESCAPE_PREVENTION }],
    ["Substitute", { status2: STATUS2_SUBSTITUTE, substituteHP: 20 }],
  ])("Mean Look %s guard reaches the committed failure END without changing ownership", (_name, target) => {
    const result = run("BattleScript_EffectMeanLook", rules(MOVE_MEAN_LOOK, target));
    expect(result.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.rulesContext.battlers[1].status2).toBe(target.status2);
    expect(result.rng.calls).toBe(0);
  });

  it("walks Nightmare to END only on a sleeping target, sets 0x08000000, and draws no RNG", () => {
    const result = run("BattleScript_EffectNightmare", rules(MOVE_NIGHTMARE, { status1: 4 }));
    expect(result.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.rulesContext.battlers[1].status2).toBe(STATUS2_NIGHTMARE);
    expect(result.rng.calls).toBe(0);
  });

  it.each([
    ["awake", { status1: 0 }],
    ["duplicate", { status1: 3, status2: STATUS2_NIGHTMARE }],
    ["Substitute", { status1: 3, status2: STATUS2_SUBSTITUTE, substituteHP: 20 }],
  ])("Nightmare %s guard reaches failure END without setting a new bit", (_name, target) => {
    const result = run("BattleScript_EffectNightmare", rules(MOVE_NIGHTMARE, target));
    expect(result.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.rulesContext.battlers[1].status2).toBe("status2" in target ? target.status2 : 0);
    expect(result.rulesContext.battlers[1].status1 & STATUS1_SLEEP).toBe(target.status1);
    expect(result.rng.calls).toBe(0);
  });
});
