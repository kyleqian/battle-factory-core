import { describe, expect, it } from "vitest";
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

const program = loadBattleScriptProgram();
const WEATHER_BALL = 311;
const ABILITY_CLOUD_NINE = 13;
const ABILITY_AIR_LOCK = 77;
const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
const B_WEATHER_RAIN_PERMANENT = 1 << 2;
const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;
const B_WEATHER_SANDSTORM_PERMANENT = 1 << 4;
const B_WEATHER_SUN_TEMPORARY = 1 << 5;
const B_WEATHER_SUN_PERMANENT = 1 << 6;
const B_WEATHER_HAIL = 1 << 7;

function battler(
  side: 0 | 1,
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: changes.ability ?? 1,
    hp: changes.hp ?? 500,
    maxHP: changes.maxHP ?? 500,
    moves: changes.moves ?? [WEATHER_BALL, 0, 0, 0],
    pp: changes.pp ?? [10, 0, 0, 0],
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 1,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: 0,
  } as BattleScriptRulesBattler);
}

function rules(
  weather: number,
  suppressingAbility = 0,
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0),
      battler(1, { ability: suppressingAbility || 1 }),
      battler(0),
      battler(1),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: WEATHER_BALL,
    currentMovePosition: 0,
    chosenMove: WEATHER_BALL,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    weather,
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (_context, operand) => Object.freeze({
    kind: "message" as const,
    messageId: operand.expression,
    substitutions: Object.freeze([]),
  }),
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
  resolveByteOperand: () => null,
});

function ack(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

function run(context: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectWeatherBall",
    context,
    1,
    ports,
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 500; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`Weather Ball did not halt: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({
    kind: "terminal",
    opcodeName: "B_SCR_OP_END",
  });
  return result.state;
}

describe("source-complete B_SCR_OP_SETWEATHERBALLTYPE / EFFECT_WEATHER_BALL", () => {
  it("pins the sole operand-free source opcode", () => {
    expect(program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_SETWEATHERBALLTYPE",
    )).toMatchObject([{
      opcodeId: 0xe9,
      dispatcher: "Cmd_setweatherballtype",
      operands: [],
      source: { label: "BattleScript_EffectWeatherBall" },
    }]);
  });

  it.each([
    ["clear", 0, 0, 0x80, 1],
    ["rain temporary", B_WEATHER_RAIN_TEMPORARY, 11, 0x8b, 2],
    ["rain permanent", B_WEATHER_RAIN_PERMANENT, 11, 0x8b, 2],
    ["sand temporary", B_WEATHER_SANDSTORM_TEMPORARY, 5, 0x85, 2],
    ["sand permanent", B_WEATHER_SANDSTORM_PERMANENT, 5, 0x85, 2],
    ["sun temporary", B_WEATHER_SUN_TEMPORARY, 10, 0x8a, 2],
    ["sun permanent", B_WEATHER_SUN_PERMANENT, 10, 0x8a, 2],
    ["hail", B_WEATHER_HAIL, 15, 0x8f, 2],
  ])(
    "walks %s through the ordinary hit chain to END with exact dynamic type, power multiplier, and RNG ledger",
    (_label, weather, expectedType, expectedDynamicType, expectedMultiplier) => {
      const state = run(rules(weather));
      expect(state.rulesContext.dynamicMoveType).toBe(expectedDynamicType);
      expect(state.rulesContext.dmgMultiplier).toBe(expectedMultiplier);
      expect(state.rulesContext.moveHistory.lastHitByType[1]).toBe(expectedType);
      expect(state.rulesContext.battlers[0].pp[0]).toBe(9);
      expect(state.rng.ledger).toMatchObject([
        { call: 1, reason: "accuracycheck", randomValue: 16838 },
        { call: 2, reason: "critcalc", randomValue: 44065 },
        { call: 3, reason: "adjustnormaldamage", randomValue: 53998 },
        { call: 4, reason: "seteffectwithchance", randomValue: 8119 },
      ]);
    },
  );

  it.each([
    ["Cloud Nine", ABILITY_CLOUD_NINE],
    ["Air Lock", ABILITY_AIR_LOCK],
  ])("%s on a live battler suppresses both weather writes but not the ordinary hit", (_name, ability) => {
    const state = run(rules(B_WEATHER_RAIN_TEMPORARY, ability));
    expect(state.rulesContext.dynamicMoveType).toBe(0);
    expect(state.rulesContext.dmgMultiplier).toBe(1);
    expect(state.rulesContext.moveHistory.lastHitByType[1]).toBe(0);
    expect(state.rng.ledger.map(({ reason }) => reason)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
  });

  it("does not let a fainted suppressor disable weather and canonical replay is exact", () => {
    const input = createBattleScriptRulesContext({
      ...rules(B_WEATHER_RAIN_TEMPORARY),
      battlers: [
        battler(0),
        battler(1),
        battler(0, { ability: ABILITY_CLOUD_NINE, hp: 0 }),
        battler(1),
      ],
    });
    const first = run(input);
    const replay = run(input);
    expect(first.rulesContext.dynamicMoveType).toBe(0x8b);
    expect(replay).toEqual(first);
  });
});
