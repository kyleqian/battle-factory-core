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
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

const MOVE_CURSE = 174;
const STATUS2_SUBSTITUTE = 1 << 24;
const program = loadBattleScriptProgram();

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_CURSE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([10, 0, 0, 0]),
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
    statStages: changes.statStages ?? Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function context(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const battlers = [
    battler({ side: 0, ...attackerChanges }),
    battler({ side: 1, ...targetChanges }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_CURSE,
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

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
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
    resolveHalfwordOperand: (_context, operand) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return 64;
      if (operand.expression === "B_WAIT_TIME_SHORT") return 32;
      return null;
    },
    resolveByteOperand: () => null,
  });
}

function ackAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

function step(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
  handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
) {
  let result = stepBattleScriptMachine(program, state, handlers);
  let guard = 0;
  while (result.kind === "scheduler-progressed" || result.kind === "blocked") {
    guard += 1;
    if (guard > 500) throw new Error("Curse step did not converge");
    const nextState = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
    result = stepBattleScriptMachine(program, nextState, handlers);
  }
  return result;
}

function runToTerminal(rules: BattleScriptRulesContext, seed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectCurse",
    rules,
    seed,
    externalPorts(),
  );
  let result = step(execution.state, execution.handlers);
  let instructions = 0;
  while (result.kind === "advanced" && instructions < 500) {
    instructions += 1;
    result = step(result.state, execution.handlers);
  }
  if (result.kind !== "halted") {
    throw new Error(`Curse did not reach its own terminal: ${result.kind}`);
  }
  expect(result.state.haltReason).toMatchObject({
    kind: "terminal",
    opcodeName: "B_SCR_OP_END",
  });
  return result.state;
}

function eventReceipts(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  return state.events.map((event) => {
    switch (event.kind) {
      case "message":
        return { kind: event.kind, messageId: event.messageId };
      case "set-battler-pp-data":
        return {
          kind: event.kind,
          battler: event.battler,
          movePosition: event.movePosition,
          pp: event.pp,
        };
      case "animation":
        return { kind: event.kind, animationId: event.animationId, battler: event.battler };
      case "stat-stage-change":
        return {
          kind: event.kind,
          battler: event.battler,
          stat: event.stat,
          from: event.from,
          to: event.to,
        };
      case "health-bar-update":
        return {
          kind: event.kind,
          battler: event.battler,
          healthValue: event.healthValue,
        };
      case "hp-change":
        return { kind: event.kind, battler: event.battler, from: event.from, to: event.to };
      case "set-battler-sprite-visibility":
        return {
          kind: event.kind,
          battler: event.battler,
          invisible: event.invisible,
        };
      default:
        return { kind: event.kind };
    }
  });
}

describe("source-complete Curse opcode registrations", () => {
  it("registers the sole concrete JUMPIFTYPE2 and CURSETARGET starts with their exact committed operands", () => {
    const jump = program.instructions.filter((instruction) =>
      instruction.opcodeName === "B_SCR_OP_JUMPIFTYPE2"
    );
    expect(jump).toHaveLength(1);
    expect(jump[0]).toMatchObject({
      dispatcher: "Cmd_jumpiftype2",
      source: { label: "BattleScript_EffectCurse", statementLine: 1483 },
      operands: [
        { widthBytes: 1, expression: "BS_ATTACKER" },
        { widthBytes: 1, expression: "TYPE_GHOST" },
        { widthBytes: 4, expression: "BattleScript_GhostCurse" },
      ],
    });

    const curse = program.instructions.filter((instruction) =>
      instruction.opcodeName === "B_SCR_OP_CURSETARGET"
    );
    expect(curse).toHaveLength(1);
    expect(curse[0]).toMatchObject({
      dispatcher: "Cmd_cursetarget",
      source: { label: "BattleScript_DoGhostCurse", statementLine: 1520 },
      operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }],
    });
  });

  it("JUMPIFTYPE2 checks both type slots: Ghost in slot 2 takes BattleScript_GhostCurse", () => {
    const rules = context({ types: ["TYPE_POISON", "TYPE_GHOST"] });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectCurse",
      rules,
      1,
      externalPorts(),
    );
    const result = stepBattleScriptMachine(program, execution.state, execution.handlers);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_GhostCurse")!.programCounter,
    );
    expect(result.state.rulesContext).toBe(rules);
    expect(result.state.rng.calls).toBe(0);
  });
});

describe("EFFECT_CURSE committed script: non-Ghost branch", () => {
  it("walks to genuine END with exact -1 Speed/+1 Attack/+1 Defense, PP, events, and zero RNG", () => {
    const state = runToTerminal(context({
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    }));
    expect(state.rulesContext.battlers[0].hp).toBe(100);
    expect(state.rulesContext.battlers[0].status2).toBe(0);
    expect(state.rulesContext.battlers[0].statStages).toEqual([6, 7, 7, 5, 6, 6, 6, 6]);
    expect(state.rulesContext.battlers[0].pp).toEqual([9, 0, 0, 0]);
    expect(state.rulesContext.selectorRoles.target).toBe(0);
    expect(state.rng).toMatchObject({ value: 1, calls: 0, ledger: [] });
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 },
      { kind: "animation", animationId: "MOVE_ANIMATION", battler: 0 },
      { kind: "stat-stage-change", battler: 0, stat: "speed", from: 6, to: 5 },
      { kind: "message", messageId: "STRINGID_DEFENDERSSTATFELL" },
      { kind: "stat-stage-change", battler: 0, stat: "attack", from: 6, to: 7 },
      { kind: "message", messageId: "STRINGID_DEFENDERSSTATROSE" },
      { kind: "stat-stage-change", battler: 0, stat: "defense", from: 6, to: 7 },
      { kind: "message", messageId: "STRINGID_DEFENDERSSTATROSE" },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
    ]);
  });

  it("fails only at the source boundary Speed=min, Attack=max, Defense=max; PP is still spent and no stage changes occur", () => {
    const state = runToTerminal(context({
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      statStages: [6, 12, 12, 0, 6, 6, 6, 6],
    }));
    expect(state.rulesContext.battlers[0].statStages).toEqual([6, 12, 12, 0, 6, 6, 6, 6]);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(9);
    expect(state.rng.calls).toBe(0);
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 },
      { kind: "message", messageId: "STRINGID_BUTITFAILED" },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });
});

describe("EFFECT_CURSE committed script: Ghost branch", () => {
  it("sets only the target's CURSED bit, deals floor(maxHP/2) to the user, and reaches genuine END with exact events/PP/zero RNG", () => {
    const state = runToTerminal(context(
      { types: ["TYPE_GHOST", "TYPE_POISON"], hp: 101, maxHP: 101 },
      { status2: 1 << 3 },
    ));
    expect(state.rulesContext.battlers[0].hp).toBe(51);
    expect(state.rulesContext.battlers[0].status2).toBe(0);
    expect(state.rulesContext.battlers[0].statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(state.rulesContext.battlers[0].pp).toEqual([9, 0, 0, 0]);
    expect(state.rulesContext.battlers[1].status2).toBe(
      ((1 << 3) | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED) >>> 0,
    );
    expect(state.rulesContext.battleMoveDamage).toBe(50);
    expect(state.rulesContext.hpDealt).toBe(50);
    expect(state.rng).toMatchObject({ value: 1, calls: 0, ledger: [] });
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 },
      { kind: "animation", animationId: "MOVE_ANIMATION", battler: 0 },
      { kind: "health-bar-update", battler: 0, healthValue: 50 },
      { kind: "hp-change", battler: 0, from: 101, to: 51 },
      { kind: "message", messageId: "STRINGID_PKMNLAIDCURSE" },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });

  it("already-cursed target takes the real CURSETARGET fail pointer after PP loss: no HP/status/stage mutation and no RNG", () => {
    const cursed = BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED;
    const state = runToTerminal(context(
      { types: ["TYPE_GHOST", "TYPE_GHOST"], hp: 100, maxHP: 100 },
      { status2: cursed },
      { battleMoveDamage: 7 },
    ));
    expect(state.rulesContext.battlers[0].hp).toBe(100);
    expect(state.rulesContext.battlers[1].status2).toBe(cursed);
    expect(state.rulesContext.battlers[0].statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(state.rulesContext.battleMoveDamage).toBe(7);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(9);
    expect(state.rng.calls).toBe(0);
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 },
      { kind: "message", messageId: "STRINGID_BUTITFAILED" },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });

  it("Substitute fails before CURSETARGET: target remains uncursed, user HP unchanged, PP spent, zero RNG", () => {
    const state = runToTerminal(context(
      { types: ["TYPE_GHOST", "TYPE_POISON"], hp: 100, maxHP: 100 },
      { status2: STATUS2_SUBSTITUTE, substituteHP: 25 },
    ));
    expect(state.rulesContext.battlers[0].hp).toBe(100);
    expect(state.rulesContext.battlers[1].status2).toBe(STATUS2_SUBSTITUTE);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(9);
    expect(state.rng.calls).toBe(0);
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 },
      { kind: "message", messageId: "STRINGID_BUTITFAILED" },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });

  it("attacker==target takes the real VARIOUS_GET_MOVE_TARGET singles loop: seed 1 rejects self then selects foe in exactly two draws", () => {
    const state = runToTerminal(context(
      { types: ["TYPE_GHOST", "TYPE_POISON"], hp: 100, maxHP: 100 },
      {},
      { selectorRoles: { attacker: 0, target: 0, effectBattler: 0 } },
    ));
    expect(state.rulesContext.selectorRoles.target).toBe(1);
    expect(state.rulesContext.battlers[1].status2).toBe(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED);
    expect(state.rulesContext.battlers[0].hp).toBe(50);
    expect(state.rng.calls).toBe(2);
    expect(state.rng.value).toBe(0xac2115d3);
    expect(state.rng.ledger.map((entry) => ({
      call: entry.call,
      reason: entry.reason,
      randomValue: entry.randomValue,
    }))).toEqual([
      { call: 1, reason: "GetMoveTarget(MOVE_TARGET_SELECTED)", randomValue: 16838 },
      { call: 2, reason: "GetMoveTarget(MOVE_TARGET_SELECTED)", randomValue: 44065 },
    ]);
  });
});
