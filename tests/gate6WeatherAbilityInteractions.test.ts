import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { computeCastformTypeChange } from "../src/engine/battleScriptTryCastformDataChangeOpcode.ts";
import {
  applyRandomDamageMultiplier,
  applyStab,
  calculateBaseDamage,
  NEUTRAL_STAT_STAGES,
} from "../src/engine/damageCalc.ts";

const program = loadBattleScriptProgram();
const SPECIES_CASTFORM = 385;
const ABILITY_FORECAST = 59;
const ABILITY_CLOUD_NINE = 13;
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_HAIL = 1 << 7;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0]),
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
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
  });
}

function context(weather: number, otherAbility = 0): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        species: SPECIES_CASTFORM,
        ability: ABILITY_FORECAST,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      }),
      battler({ side: 1, ability: otherAbility }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 311,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    weather,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: 1 << 19,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  } satisfies BattleScriptRulesContextInput);
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

function runWeatherBallOpcode(rulesContext: BattleScriptRulesContext): BattleScriptRulesContext {
  const opcodePc = program.instructions.findIndex(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETWEATHERBALLTYPE",
  );
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectWeatherBall",
    rulesContext,
    1,
    externalPorts(),
  );
  const stepped = stepBattleScriptMachine(
    program,
    Object.freeze({ ...execution.state, programCounter: opcodePc }),
    execution.handlers,
  );
  expect(stepped.kind).toBe("advanced");
  return stepped.state.rulesContext;
}

function runTrycastformdatachange(rulesContext: BattleScriptRulesContext): BattleScriptRulesContext {
  const opcodePc = program.instructions.findIndex(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYCASTFORMDATACHANGE",
  );
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_WeatherFormChanges",
    rulesContext,
    1,
    externalPorts(),
  );
  const stepped = stepBattleScriptMachine(
    program,
    Object.freeze({ ...execution.state, programCounter: opcodePc }),
    execution.handlers,
  );
  expect(stepped.kind).toBe("advanced");
  if (stepped.kind !== "advanced") throw new Error("expected trycastformdatachange to advance");
  return stepped.state.rulesContext;
}

describe("Gate-6 R4: Forecast x weather", () => {
  it.each([
    ["clear", 0, 0, ["TYPE_NORMAL", "TYPE_NORMAL"]],
    ["sun", B_WEATHER_SUN, 2, ["TYPE_FIRE", "TYPE_FIRE"]],
    ["rain", B_WEATHER_RAIN, 3, ["TYPE_WATER", "TYPE_WATER"]],
    ["hail", B_WEATHER_HAIL, 4, ["TYPE_ICE", "TYPE_ICE"]],
  ] as const)(
    "%s computes CastformDataTypeChange's exact form/type pair in the same ability pass",
    (_label, weather, form, types) => {
      expect(computeCastformTypeChange(context(weather), context(weather).battlers[0])).toEqual({
        form,
        types,
      });
    },
  );

  it("reverts a weather form to Normal when weather is clear or Cloud Nine suppresses active rain", () => {
    const rainy = context(B_WEATHER_RAIN);
    const waterCastform = Object.freeze({
      ...rainy.battlers[0],
      types: ["TYPE_WATER", "TYPE_WATER"] as const,
    });
    expect(computeCastformTypeChange(context(0), waterCastform)).toEqual({
      form: 1,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    });
    expect(computeCastformTypeChange(context(B_WEATHER_RAIN, ABILITY_CLOUD_NINE), waterCastform)).toEqual({
      form: 1,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    });
  });

  it("a live Forecast Castform subjected to rain through the real trycastformdatachange opcode ends up Water/Water and banks form 2", () => {
    const after = runTrycastformdatachange(context(B_WEATHER_RAIN));
    expect(after.battlers[0].types).toEqual(["TYPE_WATER", "TYPE_WATER"]);
    expect(after.formToChangeInto).toBe(2);
  });
});

describe("Gate-6 R4: Weather Ball x weather", () => {
  it.each([
    ["clear", 0, 1, 0x80],
    ["rain", B_WEATHER_RAIN, 2, 0x80 | 11],
    ["sandstorm", B_WEATHER_SANDSTORM, 2, 0x80 | 5],
    ["sun", B_WEATHER_SUN, 2, 0x80 | 10],
    ["hail", B_WEATHER_HAIL, 2, 0x80 | 15],
  ])(
    "%s selects the exact dynamic type and source damage multiplier",
    (_label, weather, dmgMultiplier, dynamicMoveType) => {
      const after = runWeatherBallOpcode(context(weather));
      expect(after.dmgMultiplier).toBe(dmgMultiplier);
      expect(after.dynamicMoveType).toBe(dynamicMoveType);
    },
  );

  it("Cloud Nine suppresses both Weather Ball writes without clearing rain itself", () => {
    const before = context(B_WEATHER_RAIN, ABILITY_CLOUD_NINE);
    const after = runWeatherBallOpcode(before);
    expect(after.weather).toBe(B_WEATHER_RAIN);
    expect(after.dmgMultiplier).toBe(1);
    expect(after.dynamicMoveType).toBe(0);
  });

  it("pins R4's source-derived clear/rain damage before the seed-specific 85-100% roll -- the rain Water types follow from the executed Forecast form change, not a hand-set pair", () => {
    const attacker = {
      attack: 99,
      defense: 90,
      spAttack: 67,
      spDefense: 122,
      level: 50,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      statStages: { ...NEUTRAL_STAT_STAGES },
    };
    const defender = {
      attack: 27,
      defense: 30,
      spAttack: 95,
      spDefense: 155,
      level: 50,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      statStages: { ...NEUTRAL_STAT_STAGES },
    };
    // The rain Water/Water STAB types are produced by running the real
    // trycastformdatachange opcode on a Normal Castform under active rain
    // (R4's same-turn Forecast pass), then read back from the battler state.
    const rainCastform = runTrycastformdatachange(context(B_WEATHER_RAIN)).battlers[0];
    expect(rainCastform.types).toEqual(["TYPE_WATER", "TYPE_WATER"]);
    const clearBase = calculateBaseDamage({
      attacker,
      defender,
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    });
    const rainBase = calculateBaseDamage({
      attacker: { ...attacker, types: rainCastform.types },
      defender,
      movePower: 50,
      moveType: "TYPE_WATER",
      isCriticalHit: false,
      weather: B_WEATHER_RAIN,
    });
    // Gen III's type split makes clear-weather Normal Weather Ball physical:
    // Castform's Attack 99 and Blissey's Defense 30 produce 74 before STAB.
    expect(clearBase).toBe(74);
    expect(applyStab(clearBase, attacker.types, "TYPE_NORMAL")).toBe(111);
    expect(rainBase).toBe(15);
    expect(applyStab(rainBase * 2, rainCastform.types, "TYPE_WATER")).toBe(45);
    expect(new Set(Array.from({ length: 16 }, (_, roll) =>
      applyRandomDamageMultiplier(111, roll)))).toEqual(
      new Set([94, 95, 96, 97, 98, 99, 101, 102, 103, 104, 105, 106, 107, 108, 109, 111]),
    );
    expect(new Set(Array.from({ length: 16 }, (_, roll) =>
      applyRandomDamageMultiplier(45, roll)))).toEqual(new Set([38, 39, 40, 41, 42, 43, 44, 45]));
  });

  it.each([
    ["seed 1", 52_212, 106, 43],
    ["seed 324508639", 33_692, 97, 39],
  ])(
    "%s's shared damage roll resolves the paired clear/rain exact deltas",
    (_label, randomOutput, clearDamage, rainDamage) => {
      expect(applyRandomDamageMultiplier(111, randomOutput)).toBe(clearDamage);
      expect(applyRandomDamageMultiplier(45, randomOutput)).toBe(rainDamage);
    },
  );
});
