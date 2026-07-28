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
  remainingHpToPower,
} from "../src/engine/battleScriptRemainingHpToPowerOpcode.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

const MOVE_FLAIL = 175;
const MOVE_REVERSAL = 179;
const program = loadBattleScriptProgram();

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 48,
    maxHP: changes.maxHP ?? 48,
    moves: changes.moves ?? Object.freeze([MOVE_FLAIL, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([15, 0, 0, 0]),
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
    protected: changes.protected,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function context(
  move: number,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const battlers = [
    battler({
      side: 0,
      moves: [move, 0, 0, 0],
      types: move === MOVE_REVERSAL
        ? ["TYPE_FIGHTING", "TYPE_FIGHTING"]
        : ["TYPE_NORMAL", "TYPE_NORMAL"],
      ...attackerChanges,
    }),
    battler({ side: 1, hp: 999, maxHP: 999, types: ["TYPE_NORMAL", "TYPE_NORMAL"], ...targetChanges }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
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
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
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
    if (guard > 500) throw new Error("Flail/Reversal step did not converge");
    const nextState = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
    result = stepBattleScriptMachine(program, nextState, handlers);
  }
  return result;
}

function runToTerminal(rules: BattleScriptRulesContext, seed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectFlail",
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
    throw new Error(`Flail/Reversal did not reach its own terminal: ${result.kind}`);
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
      case "play-se":
        return { kind: event.kind, battler: event.battler, songId: event.songId };
      case "health-bar-update":
        return { kind: event.kind, battler: event.battler, healthValue: event.healthValue };
      case "hp-change":
        return { kind: event.kind, battler: event.battler, from: event.from, to: event.to };
      case "set-battler-sprite-visibility":
        return { kind: event.kind, battler: event.battler, invisible: event.invisible };
      default:
        return { kind: event.kind };
    }
  });
}

describe("source-complete REMAININGHPTOPOWER registration", () => {
  it("registers the sole zero-operand source instruction", () => {
    const instructions = program.instructions.filter(
      (instruction) => instruction.opcodeName === "B_SCR_OP_REMAININGHPTOPOWER",
    );
    expect(instructions).toHaveLength(1);
    expect(instructions[0]).toMatchObject({
      dispatcher: "Cmd_remaininghptopower",
      source: { label: "BattleScript_EffectFlail", statementLine: 1346 },
      operands: [],
    });
  });

  it.each([
    [0, 200],
    [1, 200],
    [2, 150],
    [4, 150],
    [5, 100],
    [9, 100],
    [10, 80],
    [16, 80],
    [17, 40],
    [32, 40],
    [33, 20],
    [48, 20],
  ])(
    "at maxHP 48, hp %i maps across every inclusive table boundary to power %i",
    (hp, power) => {
      expect(remainingHpToPower(hp, 48)).toBe(power);
    },
  );

  it("preserves GetScaledHPFraction's living-minimum correction: 1/1000 floors to zero then becomes fraction 1 / power 200", () => {
    expect(remainingHpToPower(1, 1000)).toBe(200);
  });
});

describe("BattleScript_EffectFlail terminal walks", () => {
  it("Flail at full HP uses power 20, damages through the real hit chain, spends PP, accounts RNG/events, and reaches END", () => {
    const state = runToTerminal(context(MOVE_FLAIL, { hp: 48, maxHP: 48 }));
    expect(state.rulesContext.dynamicBasePower).toBe(20);
    expect(state.rulesContext.battlers[0].pp).toEqual([14, 0, 0, 0]);
    expect(state.rulesContext.battlers[1].hp).toBe(987);
    expect(state.rulesContext.hpDealt).toBe(12);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 14 },
      { kind: "animation", animationId: "MOVE_ANIMATION", battler: 0 },
      { kind: "play-se", battler: 1, songId: 13 },
      { kind: "animation", animationId: "HIT_ANIMATION", battler: 1 },
      { kind: "health-bar-update", battler: 1, healthValue: 12 },
      { kind: "hp-change", battler: 1, from: 999, to: 987 },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });

  it("a protected target takes the real miss tail after the power write: PP spent, no HP/damage/RNG side effect", () => {
    const state = runToTerminal(context(
      MOVE_FLAIL,
      { hp: 1, maxHP: 48 },
      { protected: 1 },
      { battleMoveDamage: 7 },
    ));
    expect(state.rulesContext.dynamicBasePower).toBe(200);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(14);
    expect(state.rulesContext.battlers[1].hp).toBe(999);
    expect(state.rulesContext.battleMoveDamage).toBe(7);
    expect(state.rng.calls).toBe(0);
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 14 },
      { kind: "message", messageId: "STRINGID_PKMNPROTECTEDITSELF" },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });

  it("evasion miss keeps target HP intact and consumes only accuracy RNG after the power write", () => {
    const state = runToTerminal(context(
      MOVE_FLAIL,
      { hp: 17, maxHP: 48 },
      { statStages: [6, 6, 6, 6, 6, 6, 6, 12] },
    ));
    expect(state.rulesContext.dynamicBasePower).toBe(40);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(14);
    expect(state.rulesContext.battlers[1].hp).toBe(999);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual(["accuracycheck"]);
  });

  it("minimum-HP power 200 faints the target through tryfaintmon and still reaches the script's END", () => {
    const state = runToTerminal(context(
      MOVE_FLAIL,
      { hp: 1, maxHP: 48 },
      { hp: 5, maxHP: 999 },
    ));
    expect(state.rulesContext.dynamicBasePower).toBe(200);
    expect(state.rulesContext.battlers[1].hp).toBe(0);
    expect(state.rulesContext.hpDealt).toBe(5);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(14);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
  });

  it("a zero-HP attacker still executes Flail's leading source opcode before attackcanceler exits: power 200, no PP/RNG/damage", () => {
    const state = runToTerminal(context(MOVE_FLAIL, { hp: 0, maxHP: 48 }));
    expect(state.rulesContext.dynamicBasePower).toBe(200);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(15);
    expect(state.rulesContext.battlers[1].hp).toBe(999);
    expect(state.rng.calls).toBe(0);
  });
});

describe("BattleScript_EffectFlail shared Reversal terminal walk", () => {
  it("Reversal uses the same HP-band opcode with Fighting typing: power 200, exact damage/HP/PP/RNG/events, genuine END", () => {
    const state = runToTerminal(context(MOVE_REVERSAL, { hp: 1, maxHP: 48 }));
    expect(state.rulesContext.currentMove).toBe(MOVE_REVERSAL);
    expect(state.rulesContext.dynamicBasePower).toBe(200);
    expect(state.rulesContext.battlers[0].pp).toEqual([14, 0, 0, 0]);
    expect(state.rulesContext.battlers[1].hp).toBe(767);
    expect(state.rulesContext.hpDealt).toBe(232);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 14 },
      { kind: "animation", animationId: "MOVE_ANIMATION", battler: 0 },
      { kind: "play-se", battler: 1, songId: 14 },
      { kind: "animation", animationId: "HIT_ANIMATION", battler: 1 },
      { kind: "health-bar-update", battler: 1, healthValue: 232 },
      { kind: "hp-change", battler: 1, from: 999, to: 767 },
      { kind: "message", messageId: "STRINGID_SUPEREFFECTIVE" },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });
});
