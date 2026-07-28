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
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_HITMARKER_DESTINYBOND,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const DESTINY_BOND = 194;
const TACKLE = 33;
const EXPLOSION = 153;
const program = loadBattleScriptProgram();
const setInstruction = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_SETDESTINYBOND",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? ([DESTINY_BOND, 0, 0, 0] as const),
    pp: changes.pp ?? ([5, 0, 0, 0] as const),
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
    types: changes.types ?? (["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const),
    species: changes.species ?? 202,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    speed: changes.speed ?? 100,
  });
}

function rules(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, ...attackerChanges }),
      battler({ side: 1, ...targetChanges }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: DESTINY_BOND,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    ...changes,
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
    resolveAttackerBattler: () => 0 as const,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
    resolveByteOperand: () => null,
  });
}

function acknowledgePending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runFromState(
  initial: BattleScriptMachineState<BattleScriptRulesContext>,
  handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
) {
  let state = initial;
  for (let guard = 0; guard < 3000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, handlers);
    state = result.kind === "blocked" ? acknowledgePending(result.state) : result.state;
    if (result.kind === "halted") return state;
    expect(result.kind).not.toBe("unsupported");
  }
  throw new Error("Battle Script did not reach a terminal within the guard");
}

describe("B_SCR_OP_SETDESTINYBOND / EFFECT_DESTINY_BOND", () => {
  it("registers the sole source-complete one-byte opcode 0xaa with no operands", () => {
    expect(program.instructions.filter((instruction) =>
      instruction.opcodeName === "B_SCR_OP_SETDESTINYBOND"
    )).toEqual([setInstruction]);
    expect(setInstruction).toMatchObject({
      opcodeId: 0xaa,
      dispatcher: "Cmd_setdestinybond",
      source: { label: "BattleScript_EffectDestinyBond", statementLine: 1338 },
      operands: [],
    });
  });

  it("ORs only the attacker-owned bit, advances once, and emits no event/controller/RNG mutation", () => {
    const source = rules({ status2: 0x0000_0081 }, { status2: 0x1234_5678 });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectDestinyBond",
      source,
      0x1234_5678,
      externalPorts(),
    );
    const state = Object.freeze({ ...execution.state, programCounter: setInstruction.programCounter });
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(setInstruction.programCounter + 1);
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(
      0x0000_0081 | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND,
    );
    expect(result.state.rulesContext.battlers[1]).toBe(source.battlers[1]);
    expect(result.state.rulesContext).toEqual({
      ...source,
      battlers: [
        { ...source.battlers[0], status2: 0x0200_0081 },
        source.battlers[1],
        source.battlers[2],
        source.battlers[3],
      ],
    });
    expect(result.state.scheduler).toBe(state.scheduler);
    expect(result.state.rng).toBe(state.rng);
    expect(result.state.events).toBe(state.events);
  });

  it("walks the genuine effect to its own END with PP 5→4 and the source message/state", () => {
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectDestinyBond",
      rules(),
      919694434,
      externalPorts(),
    );
    const final = runFromState(execution.state, execution.handlers);
    expect(final.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(final.rulesContext.battlers[0]!.pp[0]).toBe(4);
    expect(final.rulesContext.battlers[0]!.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND)
      .toBe(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND);
    expect(final.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 4 }),
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNTRYINGTOTAKEFOE" }),
    ]));
    expect(final.rng.calls).toBe(0);

    const nextActionRules = createBattleScriptRulesContext({
      ...final.rulesContext,
      currentMove: TACKLE,
      atkCancelerTracker: 0,
    });
    const nextAction = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_HitFromAtkCanceler",
      nextActionRules,
      final.rng.value,
      externalPorts(),
    );
    const admitted = stepBattleScriptMachine(program, nextAction.state, nextAction.handlers);
    if (admitted.kind !== "advanced") throw new Error(`next action did not advance: ${admitted.kind}`);
    expect(admitted.state.rulesContext.battlers[0]!.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND)
      .toBe(0);
  });
});

describe("Cmd_tryfaintmon Destiny Bond avenging path", () => {
  it("executes passive attacker HP update, attacker faint, then original target faint exactly once each", () => {
    const source = rules(
      { hp: 87, maxHP: 100, status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND },
      { hp: 0 },
      { hitMarker: BATTLE_SCRIPT_HITMARKER_DESTINYBOND },
    );
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectHit",
      source,
      1,
      externalPorts(),
    );
    const tryFaint = program.instructions.find((instruction) =>
      instruction.opcodeName === "B_SCR_OP_TRYFAINTMON"
      && instruction.source.label === "BattleScript_HitFromAtkAnimation"
    )!;
    const initial = Object.freeze({ ...execution.state, programCounter: tryFaint.programCounter });
    const scheduled = stepBattleScriptMachine(program, initial, execution.handlers);
    if (scheduled.kind !== "advanced") throw new Error(`tryfaintmon did not schedule: ${scheduled.kind}`);
    expect(scheduled.state.callStack).toEqual([
      tryFaint.programCounter + 1,
      resolveBattleScriptLabel(program, "BattleScript_FaintTarget")!.programCounter,
    ]);
    expect(scheduled.state.programCounter)
      .toBe(resolveBattleScriptLabel(program, "BattleScript_DestinyBondTakesLife")!.programCounter);
    expect(scheduled.state.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_DESTINYBOND).toBe(0);
    expect(scheduled.state.rulesContext.battleMoveDamage).toBe(87);

    const final = runFromState(scheduled.state, execution.handlers);
    expect(final.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(final.callStack).toEqual([]);
    expect(final.rulesContext.battlers[0]!.hp).toBe(0);
    expect(final.rulesContext.battlers[1]!.hp).toBe(0);
    expect(final.events.filter((event) => event.kind === "hp-change")).toEqual([
      expect.objectContaining({ kind: "hp-change", battler: 0, from: 87, to: 0 }),
    ]);
    expect(final.events.filter((event) => event.kind === "faint-animation").map((event) => event.battler))
      .toEqual([0, 1]);
    expect(final.events.filter((event) => event.kind === "play-faint-cry").map((event) => event.battler))
      .toEqual([0, 1]);
    expect(final.events.filter((event) => event.kind === "message").map((event) => event.messageId))
      .toEqual(expect.arrayContaining([
        "STRINGID_PKMNTOOKFOE",
        "STRINGID_ATTACKERFAINTED",
        "STRINGID_TARGETFAINTED",
      ]));
    expect(final.rng.calls).toBe(0);
  });

  it("ordinary no-bond target faint keeps the single original faint-script frame", () => {
    const source = rules({}, { hp: 0 });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectHit",
      source,
      1,
      externalPorts(),
    );
    const tryFaint = program.instructions.find((instruction) =>
      instruction.opcodeName === "B_SCR_OP_TRYFAINTMON"
      && instruction.source.label === "BattleScript_HitFromAtkAnimation"
    )!;
    const result = stepBattleScriptMachine(
      program,
      Object.freeze({ ...execution.state, programCounter: tryFaint.programCounter }),
      execution.handlers,
    );
    if (result.kind !== "advanced") throw new Error(`tryfaintmon did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_FaintTarget")!.programCounter);
    expect(result.state.callStack).toEqual([tryFaint.programCounter + 1]);
    expect(result.state.rulesContext.battleMoveDamage).toBe(source.battleMoveDamage);
  });
});

describe("generic full-turn Destiny Bond integration", () => {
  it("runs faster Wobbuffet Destiny Bond then slower Snorlax Explosion to the real terminal boundary", () => {
    const config: FactoryFullTurnConfig = {
      requestId: 1,
      rngSeed: 919694434,
      player: {
        species: 202,
        moveId: DESTINY_BOND,
        moves: [DESTINY_BOND, 0, 0, 0],
        pp: [5, 0, 0, 0],
        attack: 50,
        defense: 58,
        spAttack: 50,
        spDefense: 58,
        speed: 100,
        hp: 265,
        maxHp: 265,
        types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
      },
      trainer: {
        species: 143,
        moveId: EXPLOSION,
        moves: [EXPLOSION, EXPLOSION, EXPLOSION, EXPLOSION],
        pp: [5, 5, 5, 5],
        attack: 140,
        defense: 100,
        spAttack: 65,
        spDefense: 110,
        speed: 50,
        hp: 235,
        maxHp: 235,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
    };
    const initial = createFactoryFullTurnBattleState(config);
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error(`expected trainer decision, got ${afterPlayer.kind}`);
    const terminal = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    expect(terminal.kind).toBe("terminal");
    if (terminal.kind !== "terminal") throw new Error(`expected terminal, got ${terminal.kind}`);
    const rulesContext = terminal.state.rules.rulesContext;
    expect(rulesContext.battlers[0]!.hp).toBe(0);
    expect(rulesContext.battlers[1]!.hp).toBe(0);
    expect(rulesContext.battlers[0]!.pp[0]).toBe(4);
    expect(rulesContext.battlers[1]!.pp[0]).toBe(4);
    expect(rulesContext.battlers[0]!.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND).toBe(0);
    expect(terminal.events.filter(({ payload }) => payload.kind === "faint-animation")).toHaveLength(2);
  });
});
