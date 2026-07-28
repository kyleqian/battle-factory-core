import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerBide } from "../src/engine/battleScriptActionAdmission.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_MOVE_BIDE,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const BIDE = 117;
const TACKLE = 33;
const EMBER = 52;
const SEED = 1;
const SOURCE_PC = 0x0800_1234;

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (_context, operand) =>
    operand.expression.startsWith("STRINGID_")
      ? Object.freeze({
        kind: "message" as const,
        messageId: operand.expression,
        substitutions: Object.freeze([]),
      })
      : null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
  resolveByteOperand: () => null,
});

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 200,
    maxHP: changes.maxHP ?? 200,
    moves: changes.moves ?? ([BIDE, 0, 0, 0] as const),
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
    item: changes.item ?? 0,
    statStages: changes.statStages ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function initialRules(): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0),
      battler(1, { moves: [TACKLE, EMBER, 0, 0], pp: [35, 25, 0, 0] }),
      battler(0),
      battler(1),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: BIDE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    bideDmg: [91, 8, 7, 6],
    bideTarget: [3, 2, 1, 0],
    lockedMoves: [9, 8, 7, 6],
  });
}

function ackAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runToTerminal(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = SEED,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 1; result.kind !== "halted" && steps < 500; steps += 1) {
    result = stepBattleScriptMachine(program, ackAllPending(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`${entryLabel} did not reach END: ${result.kind}`);
  if (result.state.haltReason?.kind === "unsupported-branch") {
    throw new Error(`${entryLabel} unsupported: ${JSON.stringify(result.state.haltReason)}`);
  }
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

function applyIncomingDamage(
  rules: BattleScriptRulesContext,
  move: number,
  damage: number,
): BattleScriptRulesContext {
  const dataHpUpdate = program.instructions.find(
    ({ opcodeName, operands }) =>
      opcodeName === "B_SCR_OP_DATAHPUPDATE" && operands[0]?.expression === "BS_TARGET",
  )!;
  const incoming = Object.freeze({
    ...rules,
    selectorRoles: Object.freeze({ attacker: 1 as const, target: 0 as const, effectBattler: 0 as const, fainted: null }),
    scriptingBattler: 1 as const,
    atkCancelerTracker: 0,
    currentMove: move,
    currentMovePosition: move === TACKLE ? 0 : 1,
    battleMoveDamage: damage,
    hitMarker: 0,
  });
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectHit", incoming, SEED, ports);
  const state = Object.freeze({ ...execution.state, programCounter: dataHpUpdate.programCounter });
  const result = stepBattleScriptMachine(program, state, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`datahpupdate did not advance: ${result.kind}`);
  return result.state.rulesContext;
}

function atBideCanceler(rules: BattleScriptRulesContext): BattleScriptRulesContext {
  return Object.freeze({
    ...rules,
    selectorRoles: Object.freeze({ attacker: 0 as const, target: 1 as const, effectBattler: 1 as const, fainted: null }),
    scriptingBattler: 0,
    atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE,
    currentMove: BIDE,
    currentMovePosition: 0,
  });
}

describe("source-complete B_SCR_OP_SETBIDE / EFFECT_BIDE", () => {
  it("pins the sole operand-free source opcode", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_SETBIDE"))
      .toMatchObject([{
        opcodeId: 0x8b,
        dispatcher: "Cmd_setbide",
        operands: [],
        source: { label: "BattleScript_EffectBide" },
      }]);
  });

  it("walks setup to END with the exact initial counter, lock, and zero state and no RNG", () => {
    const source = initialRules();
    const state = runToTerminal("BattleScript_EffectBide", source);
    expect(state.rulesContext.battlers[0].status2).toBe(
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
        | (2 << 8),
    );
    expect(state.rulesContext.lockedMoves).toEqual([BIDE, 8, 7, 6]);
    expect(state.rulesContext.bideDmg).toEqual([0, 8, 7, 6]);
    expect(state.rulesContext.bideTarget).toBe(source.bideTarget);
    expect(state.rng.calls).toBe(0);
    expect(state.rng.ledger).toEqual([]);
  });

  it("feeds physical and special incoming damage into the existing storage/release reducer, restores the saved target, and executes release to END", () => {
    const setup = runToTerminal("BattleScript_EffectBide", initialRules());
    const afterPhysical = applyIncomingDamage(setup.rulesContext, TACKLE, 17);
    expect(afterPhysical.bideDmg[0]).toBe(17);
    expect(afterPhysical.bideTarget[0]).toBe(1);
    expect(afterPhysical.battlers[0].specialStatus.physicalDmg).toBe(17);

    const storing = advanceBattleScriptAttackCancelerBide(
      atBideCanceler(afterPhysical),
      SOURCE_PC,
      setup.rng.value,
    );
    if (storing.kind !== "advance") throw new Error("expected Bide storage handoff");
    expect(storing).toMatchObject({
      reason: "storing-energy",
      receipt: { script: { targetLabel: "BattleScript_BideStoringEnergy" } },
    });
    const storedScript = runToTerminal("BattleScript_BideStoringEnergy", storing.rulesContext, storing.rngValue);
    expect(storedScript.rng.calls).toBe(0);

    const afterSpecial = applyIncomingDamage(storedScript.rulesContext, EMBER, 23);
    expect(afterSpecial.bideDmg[0]).toBe(40);
    expect(afterSpecial.bideTarget[0]).toBe(1);
    expect(afterSpecial.battlers[0].specialStatus.specialDmg).toBe(23);

    const release = advanceBattleScriptAttackCancelerBide(
      atBideCanceler(afterSpecial),
      SOURCE_PC,
      storedScript.rng.value,
    );
    if (release.kind !== "advance") throw new Error("expected Bide release handoff");
    expect(release).toMatchObject({
      reason: "released-attack",
      rulesContext: {
        currentMove: BATTLE_SCRIPT_MOVE_BIDE,
        scriptingBideDmg: 80,
        selectorRoles: { target: 1 },
      },
      receipt: {
        target: { kind: "restore-saved", savedTarget: 1, after: 1 },
        script: { targetLabel: "BattleScript_BideAttack" },
        rng: { callsConsumed: 0 },
      },
    });
    const released = runToTerminal("BattleScript_BideAttack", release.rulesContext, release.rngValue);
    expect(released.rulesContext.battlers[1].hp).toBe(120);
    expect(
      released.rulesContext.battlers[0].status2
        & (BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS),
    ).toBe(0);
    expect(released.rng.ledger).toMatchObject([{
      call: 1,
      reason: "accuracycheck",
      randomValue: 16838,
    }]);
  });

  it("executes the no-energy release script to END, clears the lock status, and draws no RNG", () => {
    const setup = runToTerminal("BattleScript_EffectBide", initialRules());
    const storing = advanceBattleScriptAttackCancelerBide(
      atBideCanceler(setup.rulesContext),
      SOURCE_PC,
      setup.rng.value,
    );
    if (storing.kind !== "advance") throw new Error("expected Bide storage handoff");
    const stored = runToTerminal("BattleScript_BideStoringEnergy", storing.rulesContext, storing.rngValue);
    const release = advanceBattleScriptAttackCancelerBide(
      atBideCanceler(stored.rulesContext),
      SOURCE_PC,
      stored.rng.value,
    );
    if (release.kind !== "advance") throw new Error("expected no-energy handoff");
    expect(release).toMatchObject({
      reason: "released-with-no-energy",
      receipt: { script: { targetLabel: "BattleScript_BideNoEnergyToAttack" } },
    });
    const failed = runToTerminal("BattleScript_BideNoEnergyToAttack", release.rulesContext, release.rngValue);
    expect(
      failed.rulesContext.battlers[0].status2
        & (BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS),
    ).toBe(0);
    expect(failed.rulesContext.battlers[1].hp).toBe(200);
    expect(failed.rng.calls).toBe(0);
    expect(failed.rng.ledger).toEqual([]);
  });

  it("canonical replay is exact, including the release accuracy ledger", () => {
    const setup = runToTerminal("BattleScript_EffectBide", initialRules());
    const damaged = applyIncomingDamage(setup.rulesContext, TACKLE, 11);
    const store = advanceBattleScriptAttackCancelerBide(
      atBideCanceler(damaged),
      SOURCE_PC,
      setup.rng.value,
    );
    if (store.kind !== "advance") throw new Error("expected store");
    const stored = runToTerminal("BattleScript_BideStoringEnergy", store.rulesContext, store.rngValue);
    const release = advanceBattleScriptAttackCancelerBide(
      atBideCanceler(stored.rulesContext),
      SOURCE_PC,
      stored.rng.value,
    );
    if (release.kind !== "advance") throw new Error("expected release");
    const first = runToTerminal("BattleScript_BideAttack", release.rulesContext, release.rngValue);
    const replay = runToTerminal("BattleScript_BideAttack", release.rulesContext, release.rngValue);
    expect(replay).toEqual(first);
    expect(first.rng.ledger).toMatchObject([{
      call: 1,
      reason: "accuracycheck",
      randomValue: 16838,
    }]);
  });
});
