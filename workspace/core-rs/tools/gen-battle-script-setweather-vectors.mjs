#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSetWeatherOpcode.ts.
//
// Expected complete narrow projections, controls, scheduler/RNG/event
// invariants, and registration outcomes are created only by executing the
// canonical TypeScript module. This script owns bounded input construction and
// Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-setweather-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_setweather_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSetWeatherOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSourceConstants.ts",
  )).href),
]);

const U8_MAX = 0xff;
const U16_MAX = 0xffff;
const U32_MAX = 0xffff_ffff;
const LOW_WEATHER_DOMAIN = Object.freeze(Array.from({ length: 0x100 }, (_, value) => value));
const HIGH_WEATHER_EDGE_DOMAIN = Object.freeze([
  0x0000_0100,
  0x0001_0000,
  0x0100_0000,
  0x7fff_ff00,
  0x8000_0000,
  0x8000_0080,
  0xffff_ff00,
  0xffff_ffff,
]);
const U8_EDGE_DOMAIN = Object.freeze([0x00, 0x01, 0x02, 0x04, 0x05, 0x7f, 0x80, 0xfe, 0xff]);
const MOVE_RESULT_FLAGS_EDGE_DOMAIN = Object.freeze([
  0x0000_0000,
  0x0000_0001,
  0x0000_007f,
  0x0000_00ff,
  0x7fff_ffff,
  0x8000_0000,
  0x8000_0001,
  0xffff_ffff,
]);

const CONFIGS = Object.freeze([
  Object.freeze({
    key: "rain",
    rust: "Rain",
    opcodeName: "B_SCR_OP_SETRAIN",
    opcodeId: 0x7d,
    dispatcher: "Cmd_setrain",
    entryLabel: "BattleScript_EffectRainDance",
    statementLine: 1748,
    macroLine: 695,
    activeMask: 0x0000_0007,
    temporaryBit: 0x0000_0001,
    successChooser: 0,
  }),
  Object.freeze({
    key: "sunny",
    rust: "Sunny",
    opcodeName: "B_SCR_OP_SETSUNNY",
    opcodeId: 0xbb,
    dispatcher: "Cmd_setsunny",
    entryLabel: "BattleScript_EffectSunnyDay",
    statementLine: 1761,
    macroLine: 973,
    activeMask: 0x0000_0060,
    temporaryBit: 0x0000_0020,
    successChooser: 4,
  }),
  Object.freeze({
    key: "sandstorm",
    rust: "Sandstorm",
    opcodeName: "B_SCR_OP_SETSANDSTORM",
    opcodeId: 0x95,
    dispatcher: "Cmd_setsandstorm",
    entryLabel: "BattleScript_EffectSandstorm",
    statementLine: 1593,
    macroLine: 803,
    activeMask: 0x0000_0018,
    temporaryBit: 0x0000_0008,
    successChooser: 3,
  }),
  Object.freeze({
    key: "hail",
    rust: "Hail",
    opcodeName: "B_SCR_OP_SETHAIL",
    opcodeId: 0xc8,
    dispatcher: "Cmd_sethail",
    entryLabel: "BattleScript_EffectHail",
    statementLine: 2136,
    macroLine: 1031,
    activeMask: 0x0000_0080,
    temporaryBit: 0x0000_0080,
    successChooser: 5,
  }),
]);
const CONFIG_BY_KEY = new Map(CONFIGS.map((config) => [config.key, config]));

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-setweather-vectors: " + message);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U8_MAX, label + " must be a u8, got " + value);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U16_MAX, label + " must be a u16, got " + value);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U32_MAX, label + " must be a u32, got " + value);
}

function assertArray(value, length, label) {
  assert(Array.isArray(value) && value.length === length, label + " must have " + length + " cells");
}

function hex(value, width) {
  return value.toString(16).padStart(width, "0");
}

function kindForKey(key) {
  const config = CONFIG_BY_KEY.get(key);
  assert(config !== undefined, "unknown weather key " + key);
  return config;
}

function freezeU8Array(values, length, label) {
  assertArray(values, length, label);
  values.forEach((value, index) => assertU8(value, label + "[" + index + "]"));
  return Object.freeze([...values]);
}

function freezeU32Array(values, length, label) {
  assertArray(values, length, label);
  values.forEach((value, index) => assertU32(value, label + "[" + index + "]"));
  return Object.freeze(values.map((value) => value >>> 0));
}

function makeSiblings(salt) {
  assert(Number.isInteger(salt) && salt >= 0, "sibling salt must be nonnegative");
  const battlerStatuses = Object.freeze(Array.from({ length: 4 }, (_, battler) => Object.freeze([
    (0x0100_0001 ^ ((salt * 0x0101 + battler * 0x1010) >>> 0)) >>> 0,
    (0x4000_0001 ^ ((salt * 0x1001 + battler * 0x0101) >>> 0)) >>> 0,
    (0x8000_0001 ^ ((salt * 0x0011 + battler * 0x1100) >>> 0)) >>> 0,
  ])));
  return Object.freeze({
    hitMarker: (0x8000_0001 ^ ((salt * 0x0101_0101) >>> 0)) >>> 0,
    randomTurnNumber: (0xffff - salt * 73) & U16_MAX,
    sideStatuses: freezeU32Array([
      (0x0100_0001 ^ ((salt * 0x0111) >>> 0)) >>> 0,
      (0x8000_0001 ^ ((salt * 0x1011) >>> 0)) >>> 0,
    ], 2, "sideStatuses"),
    mistTimers: freezeU8Array([(salt * 17 + 1) & U8_MAX, (salt * 29 + 2) & U8_MAX], 2, "mistTimers"),
    wishCounter: freezeU8Array(Array.from({ length: 4 }, (_, index) => (
      (salt * 7 + index * 31 + 3) & U8_MAX
    )), 4, "wishCounter"),
    futureSightCounter: freezeU8Array(Array.from({ length: 4 }, (_, index) => (
      (salt * 11 + index * 37 + 5) & U8_MAX
    )), 4, "futureSightCounter"),
    battleCommunication0: (salt * 43 + 0xa5) & U8_MAX,
    battlerStatuses,
  });
}

function makeProjection({
  weather,
  weatherTimer = 0,
  moveResultFlags = 0,
  multistringChooser = 0,
  salt = 0,
}) {
  assertU32(weather, "weather");
  assertU8(weatherTimer, "weatherTimer");
  assertU32(moveResultFlags, "moveResultFlags");
  assertU8(multistringChooser, "multistringChooser");
  const siblings = makeSiblings(salt);
  return Object.freeze({
    weather: weather >>> 0,
    weatherTimer,
    moveResultFlags: moveResultFlags >>> 0,
    multistringChooser,
    siblings,
  });
}

function canonicalBattler(statuses, index) {
  return Object.freeze({
    side: index & 1,
    ability: (index * 37 + 1) & U8_MAX,
    hp: 100 + index,
    maxHP: 150 + index,
    moves: Object.freeze([33, 45, 98, 259]),
    pp: Object.freeze([35, 25, 20, 15]),
    status1: statuses[0],
    status2: statuses[1],
    status3: statuses[2],
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
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    personality: (0x1234_0000 + index) >>> 0,
    attack: 100 + index,
    defense: 110 + index,
    spAttack: 120 + index,
    spDefense: 130 + index,
    speed: 140 + index,
    level: 50,
    friendship: 70,
    partyIndex: index,
    isFirstTurn: 0,
  });
}

function canonicalRulesFromProjection(projection) {
  const sourceRules = rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(projection.siblings.battlerStatuses.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: 0,
      target: 1,
      effectBattler: 2,
      fainted: 3,
    }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 33,
    currentMovePosition: 0,
    moveResultFlags: projection.moveResultFlags & U8_MAX,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: projection.siblings.hitMarker,
    multiHitCounter: 0,
    multistringChooser: projection.multistringChooser,
    battleCommunication0: projection.siblings.battleCommunication0,
    sideStatuses: projection.siblings.sideStatuses,
    mistTimers: projection.siblings.mistTimers,
    weather: projection.weather,
    randomTurnNumber: projection.siblings.randomTurnNumber,
    weatherTimer: projection.weatherTimer,
    wishCounter: projection.siblings.wishCounter,
    futureSightCounter: projection.siblings.futureSightCounter,
    battleTopology: Object.freeze({
      battlersCount: 2,
      battleTypeFlags: 0,
      battlerPositions: Object.freeze([0, 1, 0xff, 0xff]),
    }),
  });
  // The constructor verifies source-valid input first. Direct opcode
  // invocation then retains the handler's complete unsigned coercion domain
  // for high move-result bit probes, like existing leaf corpora do.
  return Object.freeze({
    ...sourceRules,
    moveResultFlags: projection.moveResultFlags >>> 0,
  });
}

function vectorState(rules) {
  return Object.freeze({
    weather: rules.weather >>> 0,
    weatherTimer: rules.weatherTimer,
    moveResultFlags: rules.moveResultFlags >>> 0,
    multistringChooser: rules.multistringChooser,
    siblings: Object.freeze({
      hitMarker: rules.hitMarker >>> 0,
      randomTurnNumber: rules.randomTurnNumber,
      sideStatuses: Object.freeze(rules.sideStatuses.map((value) => value >>> 0)),
      mistTimers: Object.freeze([...rules.mistTimers]),
      wishCounter: Object.freeze([...rules.wishCounter]),
      futureSightCounter: Object.freeze([...rules.futureSightCounter]),
      battleCommunication0: rules.battleCommunication0,
      battlerStatuses: Object.freeze(rules.battlers.map((battler) => Object.freeze([
        battler.status1 >>> 0,
        battler.status2 >>> 0,
        battler.status3 >>> 0,
      ]))),
    }),
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = new Map();
for (const config of CONFIGS) {
  const starts = program.instructions.filter((instruction) => instruction.opcodeName === config.opcodeName);
  assert(
    starts.length === 1,
    "expected exactly one " + config.opcodeName + " instruction, got " + starts.length,
  );
  const instruction = starts[0];
  assert(instruction.opcodeId === config.opcodeId, config.opcodeName + " source opcode id drifted");
  assert(instruction.dispatcher === config.dispatcher, config.opcodeName + " dispatcher drifted");
  assert(instruction.operands.length === 0, config.opcodeName + " must remain operand-free");
  assert(instruction.source.label === config.entryLabel, config.opcodeName + " entry label drifted");
  assert(
    instruction.source.statementLine === config.statementLine,
    config.opcodeName + " effect-script call site drifted",
  );
  assert(
    instruction.source.sourceMacroLine === config.macroLine,
    config.opcodeName + " macro byte emission drifted",
  );
  canonicalInstructions.set(config.key, instruction);
}
assert(
  sourceConstants.BATTLE_SCRIPT_MOVE_RESULT_MISSED === 0x0000_0001,
  "MOVE_RESULT_MISSED drifted",
);

const canonicalHandlers = opcodeModule.createBattleScriptSetWeatherOpcodeHandlers(program);
for (const config of CONFIGS) {
  const instruction = canonicalInstructions.get(config.key);
  assert(
    typeof canonicalHandlers[instruction.opcodeId] === "function",
    config.opcodeName + " canonical handler was not registered",
  );
}

function assertSiblingsPreserved(prior, next) {
  assert(next.battlers === prior.battlers, "canonical weather handler replaced battlers");
  assert(next.selectorRoles === prior.selectorRoles, "canonical weather handler replaced selector roles");
  assert(next.sideStatuses === prior.sideStatuses, "canonical weather handler replaced side statuses");
  assert(next.mistTimers === prior.mistTimers, "canonical weather handler replaced mist timers");
  assert(next.wishCounter === prior.wishCounter, "canonical weather handler replaced wish counters");
  assert(
    next.futureSightCounter === prior.futureSightCounter,
    "canonical weather handler replaced future-sight counters",
  );
  assert(next.hitMarker === prior.hitMarker, "canonical weather handler changed hit marker");
  assert(
    next.randomTurnNumber === prior.randomTurnNumber,
    "canonical weather handler changed random turn number",
  );
  assert(
    next.battleCommunication0 === prior.battleCommunication0,
    "canonical weather handler changed battle communication sibling",
  );
}

function assertCanonicalTransition(config, prior, transition, state) {
  assert(transition.control.kind === "advance", config.opcodeName + " did not Advance");
  assert(transition.scheduler === state.scheduler, config.opcodeName + " changed scheduler state");
  assert(transition.rng === state.rng, config.opcodeName + " consumed RNG");
  assert(transition.events.length === 0, config.opcodeName + " emitted semantic events");
  const next = transition.rulesContext;
  assert(Object.isFrozen(next), config.opcodeName + " output rules are not frozen");
  assertSiblingsPreserved(prior, next);
  const failed = (prior.weather & config.activeMask) !== 0;
  if (failed) {
    assert(next.weather === prior.weather, config.opcodeName + " failure changed weather");
    assert(next.weatherTimer === prior.weatherTimer, config.opcodeName + " failure changed timer");
    assert(
      next.moveResultFlags === ((prior.moveResultFlags | sourceConstants.BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0),
      config.opcodeName + " failure did not OR MOVE_RESULT_MISSED",
    );
    assert(next.multistringChooser === 2, config.opcodeName + " failure chose wrong message");
    return config.key + "-same-weather-failure-advance";
  }
  assert(next.weather === config.temporaryBit, config.opcodeName + " success did not clobber weather");
  assert(next.weatherTimer === 5, config.opcodeName + " success did not set five-turn timer");
  assert(next.moveResultFlags === prior.moveResultFlags, config.opcodeName + " success changed result flags");
  assert(next.multistringChooser === config.successChooser, config.opcodeName + " success chose wrong message");
  return config.key + "-success-advance";
}

function sourceOutcome(initialProjection, operationKeys) {
  assert(Array.isArray(operationKeys) && operationKeys.length >= 1, "operation sequence is empty");
  const inputRules = canonicalRulesFromProjection(initialProjection);
  const inputSnapshot = vectorState(inputRules);
  let currentRules = inputRules;
  const controls = [];
  const branches = [];
  const schedulerUnchanged = [];
  const rngUnchanged = [];
  const eventCounts = [];
  for (const [application, key] of operationKeys.entries()) {
    const config = kindForKey(key);
    const instruction = canonicalInstructions.get(key);
    const state = machineModule.createBattleScriptMachine(
      program,
      config.entryLabel,
      currentRules,
      (0x5e7d_1b0d + application) >>> 0,
    );
    const currentSnapshot = vectorState(currentRules);
    const transition = canonicalHandlers[instruction.opcodeId]({ program, instruction, state });
    branches.push(assertCanonicalTransition(config, currentRules, transition, state));
    schedulerUnchanged.push(transition.scheduler === state.scheduler);
    rngUnchanged.push(transition.rng === state.rng);
    eventCounts.push(transition.events.length);
    assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated input rules");
    controls.push(transition.control.kind);
    currentRules = transition.rulesContext;
  }
  assert(sameState(vectorState(inputRules), inputSnapshot), "canonical sequence mutated initial rules");
  return Object.freeze({
    expected: vectorState(currentRules),
    controls: Object.freeze(controls),
    branches: Object.freeze(branches),
    schedulerUnchanged: Object.freeze(schedulerUnchanged),
    rngUnchanged: Object.freeze(rngUnchanged),
    eventCounts: Object.freeze(eventCounts),
  });
}

const cases = [];
function addCase(label, category, initialProjection, operationKeys) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid label " + label);
  assert(!cases.some((value) => value.label === label), "duplicate label " + label);
  assert(operationKeys.length >= 1 && operationKeys.length <= 6, label + " invalid operation count");
  const initial = vectorState(canonicalRulesFromProjection(initialProjection));
  const outcome = sourceOutcome(initialProjection, operationKeys);
  assert(
    outcome.controls.every((control) => control === "advance"),
    label + " canonical control must always Advance",
  );
  assert(
    outcome.schedulerUnchanged.every(Boolean),
    label + " canonical scheduler invariant failed",
  );
  assert(outcome.rngUnchanged.every(Boolean), label + " canonical RNG invariant failed");
  assert(outcome.eventCounts.every((count) => count === 0), label + " canonical event invariant failed");
  cases.push(Object.freeze({
    label,
    category,
    branch: outcome.branches.join("-then-"),
    operations: Object.freeze([...operationKeys]),
    initial,
    expected: outcome.expected,
    controls: outcome.controls,
    schedulerUnchanged: outcome.schedulerUnchanged,
    rngUnchanged: outcome.rngUnchanged,
    eventCounts: outcome.eventCounts,
  }));
}

let salt = 1;
for (const config of CONFIGS) {
  for (const weather of LOW_WEATHER_DOMAIN) {
    addCase(
      "low_weather_bits_" + config.key + "_" + hex(weather, 2),
      "complete-low-weather-bit-matrix",
      makeProjection({
        weather,
        weatherTimer: (weather * 29 + config.opcodeId) & U8_MAX,
        moveResultFlags: (weather * 17 + config.opcodeId) & U8_MAX,
        multistringChooser: (weather * 43 + config.opcodeId) & U8_MAX,
        salt: salt++,
      }),
      [config.key],
    );
  }
}

for (const config of CONFIGS) {
  for (const weather of HIGH_WEATHER_EDGE_DOMAIN) {
    addCase(
      "high_weather_u32_" + config.key + "_" + hex(weather, 8),
      "representative-high-weather-u32-edges",
      makeProjection({
        weather,
        weatherTimer: (weather ^ config.opcodeId) & U8_MAX,
        moveResultFlags: ((weather >>> 24) ^ config.opcodeId) & U8_MAX,
        multistringChooser: ((weather >>> 16) ^ config.opcodeId) & U8_MAX,
        salt: salt++,
      }),
      [config.key],
    );
  }
}

for (const config of CONFIGS) {
  for (const branch of ["success", "same_weather_failure"]) {
    const weather = branch === "success" ? 0 : config.activeMask;
    for (const weatherTimer of U8_EDGE_DOMAIN) {
      for (const multistringChooser of U8_EDGE_DOMAIN) {
        addCase(
          "timer_chooser_" + branch + "_" + config.key + "_" + hex(weatherTimer, 2)
            + "_" + hex(multistringChooser, 2),
          "prior-timer-chooser-u8-edge-matrix",
          makeProjection({
            weather,
            weatherTimer,
            moveResultFlags: (weatherTimer ^ multistringChooser ^ config.opcodeId) & U8_MAX,
            multistringChooser,
            salt: salt++,
          }),
          [config.key],
        );
      }
    }
  }
}

for (const config of CONFIGS) {
  for (const branch of ["success", "same_weather_failure"]) {
    const weather = branch === "success" ? 0 : config.temporaryBit;
    for (const moveResultFlags of MOVE_RESULT_FLAGS_EDGE_DOMAIN) {
      addCase(
        "move_result_u32_" + branch + "_" + config.key + "_" + hex(moveResultFlags, 8),
        "move-result-flags-u32-edge-matrix",
        makeProjection({
          weather,
          weatherTimer: 0xfe,
          moveResultFlags,
          multistringChooser: 0xa5,
          salt: salt++,
        }),
        [config.key],
      );
    }
  }
}

for (const from of CONFIGS) {
  for (const to of CONFIGS) {
    if (from.key === to.key) continue;
    addCase(
      "cross_weather_replacement_" + from.key + "_to_" + to.key,
      "cross-weather-replacement",
      makeProjection({
        weather: from.activeMask,
        weatherTimer: 0xff,
        moveResultFlags: 0x8000_0040,
        multistringChooser: 0xfe,
        salt: salt++,
      }),
      [to.key],
    );
  }
}

for (const config of CONFIGS) {
  addCase(
    "repeated_success_then_same_weather_failure_" + config.key,
    "repeated-success-then-failure",
    makeProjection({
      weather: 0,
      weatherTimer: 0xff,
      moveResultFlags: 0x8000_0040,
      multistringChooser: 0xfe,
      salt: salt++,
    }),
    [config.key, config.key],
  );
}

for (const [startIndex, start] of CONFIGS.entries()) {
  const alternating = [
    start.key,
    CONFIGS[(startIndex + 1) % CONFIGS.length].key,
    CONFIGS[(startIndex + 2) % CONFIGS.length].key,
    CONFIGS[(startIndex + 3) % CONFIGS.length].key,
    start.key,
    start.key,
  ];
  addCase(
    "alternating_weather_path_then_repeated_" + start.key,
    "alternating-weather-path",
    makeProjection({
      weather: 0x8000_0000,
      weatherTimer: 0x7f,
      moveResultFlags: 0x8000_0040,
      multistringChooser: 0x2a,
      salt: salt++,
    }),
    alternating,
  );
}

function instructionSpec(value) {
  assert(typeof value.opcodeName === "string", "instruction opcode name is not a string");
  assertU32(value.programCounter, "instruction program counter");
  assertU8(value.opcodeId, "instruction opcode id");
  assert(typeof value.dispatcher === "string", "instruction dispatcher is not a string");
  assert(
    Number.isInteger(value.operandCount) && value.operandCount >= 0 && value.operandCount <= 2,
    "instruction operand count out of bounded corpus range",
  );
  return Object.freeze({
    opcodeName: value.opcodeName,
    programCounter: value.programCounter,
    opcodeId: value.opcodeId,
    dispatcher: value.dispatcher,
    operandCount: value.operandCount,
  });
}

function baselineInstructionSpec(config) {
  const instruction = canonicalInstructions.get(config.key);
  return instructionSpec({
    opcodeName: instruction.opcodeName,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher,
    operandCount: instruction.operands.length,
  });
}

function materializeInstruction(spec) {
  const sourceInstruction = canonicalInstructions.get("rain");
  return Object.freeze({
    ...sourceInstruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(Array.from({ length: spec.operandCount }, () => Object.freeze({}))),
  });
}

function handlerBindingsFromCanonicalFactory(registrationProgram, handlers) {
  const probeRules = canonicalRulesFromProjection(makeProjection({
    weather: 0,
    weatherTimer: 0xa5,
    moveResultFlags: 0,
    multistringChooser: 0xfe,
    salt: 0x7e57,
  }));
  const probeInstruction = canonicalInstructions.get("rain");
  const state = machineModule.createBattleScriptMachine(
    program,
    "BattleScript_EffectRainDance",
    probeRules,
    0x1234_5678,
  );
  return Object.freeze(Object.keys(handlers).map(Number).sort((left, right) => left - right).map((opcodeId) => {
    const transition = handlers[opcodeId]({
      program: registrationProgram,
      instruction: probeInstruction,
      state,
    });
    assert(transition.control.kind === "advance", "registered factory handler did not Advance");
    assert(transition.scheduler === state.scheduler, "registered factory handler changed scheduler");
    assert(transition.rng === state.rng, "registered factory handler consumed RNG");
    assert(transition.events.length === 0, "registered factory handler emitted events");
    const config = CONFIGS.find((candidate) => (
      transition.rulesContext.weather === candidate.temporaryBit
      && transition.rulesContext.multistringChooser === candidate.successChooser
    ));
    assert(config !== undefined, "could not identify registered weather handler at id " + opcodeId);
    return Object.freeze({ opcodeId, key: config.key });
  }));
}

function registrationOutcome(specs) {
  const registrationProgram = Object.freeze({
    ...program,
    instructions: Object.freeze(specs.map(materializeInstruction)),
  });
  try {
    const handlers = opcodeModule.createBattleScriptSetWeatherOpcodeHandlers(registrationProgram);
    return Object.freeze({
      bindings: handlerBindingsFromCanonicalFactory(registrationProgram, handlers),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "registration threw non-Error " + String(error));
    return Object.freeze({ bindings: Object.freeze([]), error: error.message });
  }
}

const registrationCases = [];
function addRegistrationCase(label, specs) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid registration label " + label);
  const instructions = Object.freeze(specs.map(instructionSpec));
  const outcome = registrationOutcome(instructions);
  registrationCases.push(Object.freeze({
    label,
    instructions,
    bindings: outcome.bindings,
    expectedError: outcome.error,
  }));
}

const BASELINE_INSTRUCTIONS = Object.freeze(CONFIGS.map(baselineInstructionSpec));
function withSpec(key, changes) {
  const config = kindForKey(key);
  const index = CONFIGS.indexOf(config);
  const next = [...BASELINE_INSTRUCTIONS];
  next[index] = instructionSpec({ ...next[index], ...changes });
  return next;
}

addRegistrationCase("canonical_four_instruction_registration", BASELINE_INSTRUCTIONS);
addRegistrationCase(
  "rain_cardinality_precedes_later_sunny_shape",
  withSpec("sunny", { operandCount: 1 }).filter((spec) => spec.opcodeName !== "B_SCR_OP_SETRAIN"),
);
addRegistrationCase(
  "rain_duplicate_cardinality_precedes_rain_shape",
  [
    instructionSpec({ ...BASELINE_INSTRUCTIONS[0], operandCount: 1 }),
    instructionSpec({ ...BASELINE_INSTRUCTIONS[0], programCounter: 0xface, operandCount: 0 }),
    ...BASELINE_INSTRUCTIONS.slice(1),
  ],
);
addRegistrationCase("rain_zero_operand_shape_after_cardinality", withSpec("rain", { operandCount: 1 }));
addRegistrationCase(
  "sunny_cardinality_after_valid_rain",
  BASELINE_INSTRUCTIONS.filter((spec) => spec.opcodeName !== "B_SCR_OP_SETSUNNY"),
);
addRegistrationCase(
  "sunny_duplicate_cardinality_after_valid_rain",
  [
    BASELINE_INSTRUCTIONS[0],
    BASELINE_INSTRUCTIONS[1],
    instructionSpec({ ...BASELINE_INSTRUCTIONS[1], programCounter: 0xfa01 }),
    ...BASELINE_INSTRUCTIONS.slice(2),
  ],
);
addRegistrationCase("sunny_zero_operand_shape_after_valid_rain", withSpec("sunny", { operandCount: 1 }));
addRegistrationCase(
  "sandstorm_cardinality_after_rain_sunny",
  BASELINE_INSTRUCTIONS.filter((spec) => spec.opcodeName !== "B_SCR_OP_SETSANDSTORM"),
);
addRegistrationCase(
  "sandstorm_duplicate_cardinality_after_rain_sunny",
  [
    ...BASELINE_INSTRUCTIONS.slice(0, 2),
    BASELINE_INSTRUCTIONS[2],
    instructionSpec({ ...BASELINE_INSTRUCTIONS[2], programCounter: 0xfa02 }),
    BASELINE_INSTRUCTIONS[3],
  ],
);
addRegistrationCase(
  "sandstorm_zero_operand_shape_after_rain_sunny",
  withSpec("sandstorm", { operandCount: 1 }),
);
addRegistrationCase(
  "hail_cardinality_after_rain_sunny_sandstorm",
  BASELINE_INSTRUCTIONS.filter((spec) => spec.opcodeName !== "B_SCR_OP_SETHAIL"),
);
addRegistrationCase(
  "hail_duplicate_cardinality_after_rain_sunny_sandstorm",
  [
    ...BASELINE_INSTRUCTIONS,
    instructionSpec({ ...BASELINE_INSTRUCTIONS[3], programCounter: 0xfa03 }),
  ],
);
addRegistrationCase(
  "hail_zero_operand_shape_after_rain_sunny_sandstorm",
  withSpec("hail", { operandCount: 1 }),
);
addRegistrationCase(
  "ids_and_dispatchers_are_not_factory_shape_predicates",
  BASELINE_INSTRUCTIONS.map((spec, index) => instructionSpec({
    ...spec,
    opcodeId: 0x10 + index,
    dispatcher: "Cmd_not_checked_" + index,
  })),
);
addRegistrationCase(
  "unrelated_instruction_shape_is_invisible",
  [
    instructionSpec({
      opcodeName: "B_SCR_OP_NOP",
      programCounter: 0xf001,
      opcodeId: 0x83,
      dispatcher: "Cmd_nop",
      operandCount: 2,
    }),
    ...BASELINE_INSTRUCTIONS,
    instructionSpec({
      opcodeName: "B_SCR_OP_NOP",
      programCounter: 0xf002,
      opcodeId: 0x83,
      dispatcher: "Cmd_nop",
      operandCount: 0,
    }),
  ],
);
addRegistrationCase(
  "all_dynamic_opcode_id_collisions_follow_later_spreads",
  BASELINE_INSTRUCTIONS.map((spec) => instructionSpec({ ...spec, opcodeId: 0x44 })),
);
addRegistrationCase(
  "partial_dynamic_opcode_id_collisions_follow_later_spreads",
  BASELINE_INSTRUCTIONS.map((spec, index) => instructionSpec({
    ...spec,
    opcodeId: index < 2 ? 0x55 : index === 2 ? 0x56 : 0x55,
  })),
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

function registrationBranch(value) {
  if (value.expectedError === null) return "registered";
  if (value.expectedError.includes("requires exactly 1 concrete start")) {
    const opcodeName = value.expectedError.split(" requires")[0];
    return opcodeName + "-cardinality";
  }
  if (value.expectedError.startsWith("invalid ")) {
    const opcodeName = value.expectedError.split(" shape")[0].slice("invalid ".length);
    return opcodeName + "-zero-operand-shape";
  }
  throw new Error("unexpected registration error " + value.expectedError);
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, registrationBranch);
const domainCensus = Object.freeze([
  ["weather-u32-values", U32_MAX + 1],
  ["move-result-flags-u32-values", U32_MAX + 1],
  ["weather-timer-u8-values", U8_MAX + 1],
  ["multistring-chooser-u8-values", U8_MAX + 1],
  ["weather-configurations", CONFIGS.length],
  ["complete-relevant-low-weather-bit-combinations", LOW_WEATHER_DOMAIN.length],
  ["representative-high-weather-u32-probes", HIGH_WEATHER_EDGE_DOMAIN.length],
  ["prior-timer-chooser-edge-probes", U8_EDGE_DOMAIN.length],
  ["move-result-flags-edge-probes", MOVE_RESULT_FLAGS_EDGE_DOMAIN.length],
  ["operation-sequence-length-values", 6],
  ["factory-instruction-families", CONFIGS.length],
  ["factory-registration-cases", registrationCases.length],
]);
const identities = Object.freeze(CONFIGS.map((config) => {
  const instruction = canonicalInstructions.get(config.key);
  return Object.freeze({
    key: config.key,
    opcodeName: instruction.opcodeName,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher,
    entryLabel: instruction.source.label,
    entryProgramCounter: instruction.programCounter,
    statementLine: instruction.source.statementLine,
    macroLine: instruction.source.sourceMacroLine,
    activeMask: config.activeMask,
    temporaryBit: config.temporaryBit,
    successChooser: config.successChooser,
  });
}));
const corpus = Object.freeze({
  identities,
  lowWeatherDomain: LOW_WEATHER_DOMAIN,
  highWeatherEdgeDomain: HIGH_WEATHER_EDGE_DOMAIN,
  u8EdgeDomain: U8_EDGE_DOMAIN,
  moveResultFlagsEdgeDomain: MOVE_RESULT_FLAGS_EDGE_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusText).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU8(value) {
  return "0x" + value.toString(16).padStart(2, "0");
}

function rustU16(value) {
  return "0x" + value.toString(16).padStart(4, "0");
}

function rustU32(value) {
  return "0x" + value.toString(16).padStart(8, "0");
}

function rustKind(key) {
  return "BattleScriptSetweatherKind::" + kindForKey(key).rust;
}

function rustSiblings(value) {
  return "BattleScriptSetweatherVectorSiblings {"
    + " hit_marker: " + rustU32(value.hitMarker) + ","
    + " random_turn_number: " + rustU16(value.randomTurnNumber) + ","
    + " side_statuses: [" + value.sideStatuses.map(rustU32).join(", ") + "],"
    + " mist_timers: [" + value.mistTimers.map(rustU8).join(", ") + "],"
    + " wish_counter: [" + value.wishCounter.map(rustU8).join(", ") + "],"
    + " future_sight_counter: [" + value.futureSightCounter.map(rustU8).join(", ") + "],"
    + " battle_communication0: " + rustU8(value.battleCommunication0) + ","
    + " battler_statuses: ["
    + value.battlerStatuses.map((row) => "[" + row.map(rustU32).join(", ") + "]").join(", ")
    + "],"
    + " }";
}

function rustState(value) {
  return "BattleScriptSetweatherVectorState {"
    + " weather: " + rustU32(value.weather) + ","
    + " weather_timer: " + rustU8(value.weatherTimer) + ","
    + " move_result_flags: " + rustU32(value.moveResultFlags) + ","
    + " multistring_chooser: " + rustU8(value.multistringChooser) + ","
    + " siblings: " + rustSiblings(value.siblings) + ","
    + " }";
}

function rustInstruction(value) {
  return "BattleScriptSetweatherVectorInstruction {"
    + " opcode_name: " + rustString(value.opcodeName) + ","
    + " program_counter: " + rustU32(value.programCounter) + ","
    + " opcode_id: " + rustU8(value.opcodeId) + ","
    + " dispatcher: " + rustString(value.dispatcher) + ","
    + " operand_count: " + value.operandCount + ","
    + " }";
}

function rustBinding(value) {
  return "BattleScriptSetweatherVectorBinding {"
    + " opcode_id: " + rustU8(value.opcodeId) + ","
    + " kind: " + rustKind(value.key) + ","
    + " }";
}

function rustControls(values) {
  return "&[" + values.map(() => "BattleScriptSetweatherControl::Advance").join(", ") + "]";
}

function rustBools(values) {
  return "&[" + values.map((value) => value ? "true" : "false").join(", ") + "]";
}

function rustU8Slice(values) {
  return "&[" + values.map(rustU8).join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-setweather-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetWeatherOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_setweather::{");
lines.push("    BattleScriptSetweatherControl, BattleScriptSetweatherKind,");
lines.push("};");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_VECTOR_CORPUS_SHA256: &str = " + rustString(corpusHash) + ";");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_VECTOR_CORPUS_BYTES: usize = " + Buffer.byteLength(corpusText) + ";");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_LOW_WEATHER_DOMAIN: [u32; " + LOW_WEATHER_DOMAIN.length + "] = [");
for (const value of LOW_WEATHER_DOMAIN) lines.push("    " + rustU32(value) + ",");
lines.push("];");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_HIGH_WEATHER_EDGE_DOMAIN: [u32; " + HIGH_WEATHER_EDGE_DOMAIN.length + "] = ["
  + HIGH_WEATHER_EDGE_DOMAIN.map(rustU32).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_U8_EDGE_DOMAIN: [u8; " + U8_EDGE_DOMAIN.length + "] = ["
  + U8_EDGE_DOMAIN.map(rustU8).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_MOVE_RESULT_FLAGS_EDGE_DOMAIN: [u32; "
  + MOVE_RESULT_FLAGS_EDGE_DOMAIN.length + "] = ["
  + MOVE_RESULT_FLAGS_EDGE_DOMAIN.map(rustU32).join(", ") + "];");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetweatherVectorSiblings {");
lines.push("    pub hit_marker: u32,");
lines.push("    pub random_turn_number: u16,");
lines.push("    pub side_statuses: [u32; 2],");
lines.push("    pub mist_timers: [u8; 2],");
lines.push("    pub wish_counter: [u8; 4],");
lines.push("    pub future_sight_counter: [u8; 4],");
lines.push("    pub battle_communication0: u8,");
lines.push("    pub battler_statuses: [[u32; 3]; 4],");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetweatherVectorState {");
lines.push("    pub weather: u32,");
lines.push("    pub weather_timer: u8,");
lines.push("    pub move_result_flags: u32,");
lines.push("    pub multistring_chooser: u8,");
lines.push("    pub siblings: BattleScriptSetweatherVectorSiblings,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetweatherVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub operations: &'static [BattleScriptSetweatherKind],");
lines.push("    pub initial: BattleScriptSetweatherVectorState,");
lines.push("    pub expected: BattleScriptSetweatherVectorState,");
lines.push("    pub controls: &'static [BattleScriptSetweatherControl],");
lines.push("    pub scheduler_unchanged: &'static [bool],");
lines.push("    pub rng_unchanged: &'static [bool],");
lines.push("    pub event_counts: &'static [u8],");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetweatherCanonicalIdentity {");
lines.push("    pub kind: BattleScriptSetweatherKind,");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub entry_label: &'static str,");
lines.push("    pub entry_program_counter: u32,");
lines.push("    pub statement_line: u32,");
lines.push("    pub macro_line: u32,");
lines.push("    pub active_mask: u32,");
lines.push("    pub temporary_bit: u32,");
lines.push("    pub success_chooser: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetweatherVectorInstruction {");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub program_counter: u32,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub operand_count: usize,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetweatherVectorBinding {");
lines.push("    pub opcode_id: u8,");
lines.push("    pub kind: BattleScriptSetweatherKind,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetweatherRegistrationCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub instructions: &'static [BattleScriptSetweatherVectorInstruction],");
lines.push("    pub expected_bindings: &'static [BattleScriptSetweatherVectorBinding],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_DOMAIN_CENSUS: [(&str, u64); " + domainCensus.length + "] = [");
for (const [name, count] of domainCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_CATEGORY_CENSUS: [(&str, usize); " + categoryCensus.length + "] = [");
for (const [name, count] of categoryCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_BRANCH_CENSUS: [(&str, usize); " + branchCensus.length + "] = [");
for (const [name, count] of branchCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_REGISTRATION_BRANCH_CENSUS: [(&str, usize); "
  + registrationBranchCensus.length + "] = [");
for (const [name, count] of registrationBranchCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETWEATHER_CANONICAL_IDENTITIES: [BattleScriptSetweatherCanonicalIdentity; "
  + identities.length + "] = [");
for (const identity of identities) {
  lines.push("    BattleScriptSetweatherCanonicalIdentity {");
  lines.push("        kind: " + rustKind(identity.key) + ",");
  lines.push("        opcode_name: " + rustString(identity.opcodeName) + ",");
  lines.push("        opcode_id: " + rustU8(identity.opcodeId) + ",");
  lines.push("        dispatcher: " + rustString(identity.dispatcher) + ",");
  lines.push("        entry_label: " + rustString(identity.entryLabel) + ",");
  lines.push("        entry_program_counter: " + rustU32(identity.entryProgramCounter) + ",");
  lines.push("        statement_line: " + identity.statementLine + ",");
  lines.push("        macro_line: " + identity.macroLine + ",");
  lines.push("        active_mask: " + rustU32(identity.activeMask) + ",");
  lines.push("        temporary_bit: " + rustU32(identity.temporaryBit) + ",");
  lines.push("        success_chooser: " + rustU8(identity.successChooser) + ",");
  lines.push("    },");
}
lines.push("];");
lines.push("");
lines.push("pub static BATTLE_SCRIPT_SETWEATHER_CASES: [BattleScriptSetweatherVectorCase; " + cases.length + "] = [");
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptSetweatherVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        operations: &[" + value.operations.map(rustKind).join(", ") + "],");
  lines.push("        initial: " + rustState(value.initial) + ",");
  lines.push("        expected: " + rustState(value.expected) + ",");
  lines.push("        controls: " + rustControls(value.controls) + ",");
  lines.push("        scheduler_unchanged: " + rustBools(value.schedulerUnchanged) + ",");
  lines.push("        rng_unchanged: " + rustBools(value.rngUnchanged) + ",");
  lines.push("        event_counts: " + rustU8Slice(value.eventCounts) + ",");
  lines.push("    },");
}
lines.push("];");
lines.push("");
lines.push("pub static BATTLE_SCRIPT_SETWEATHER_REGISTRATION_CASES: [BattleScriptSetweatherRegistrationCase; "
  + registrationCases.length + "] = [");
for (const value of registrationCases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptSetweatherRegistrationCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        instructions: &[" + value.instructions.map(rustInstruction).join(", ") + "],");
  lines.push("        expected_bindings: &[" + value.bindings.map(rustBinding).join(", ") + "],");
  lines.push("        expected_error: " + (value.expectedError === null
    ? "None"
    : "Some(" + rustString(value.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];");

fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
const rustupBin = path.join(
  process.env.HOME ?? "",
  ".rustup",
  "toolchains",
  "stable-aarch64-apple-darwin",
  "bin",
);
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-setweather-vectors: could not find rustfmt");

const generatedBytes = fs.readFileSync(outPath);
const generatedHash = crypto.createHash("sha256").update(generatedBytes).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");
console.log("gen-battle-script-setweather-vectors: wrote " + path.relative(workspaceRoot, outPath));
console.log("gen-battle-script-setweather-vectors: " + cases.length + " cases");
console.log("gen-battle-script-setweather-vectors: domain census " + JSON.stringify(domainCensus));
console.log("gen-battle-script-setweather-vectors: category census " + JSON.stringify(categoryCensus));
console.log("gen-battle-script-setweather-vectors: branch census " + JSON.stringify(branchCensus));
console.log(
  "gen-battle-script-setweather-vectors: registration branch census "
    + JSON.stringify(registrationBranchCensus),
);
console.log(
  "gen-battle-script-setweather-vectors: corpus sha256 " + corpusHash
    + " bytes " + Buffer.byteLength(corpusText),
);
console.log(
  "gen-battle-script-setweather-vectors: generated sha256 " + generatedHash
    + " bytes " + generatedBytes.length,
);
console.log(
  "gen-battle-script-setweather-vectors: generator sha256 " + generatorHash
    + " bytes " + generatorBytes.length,
);
