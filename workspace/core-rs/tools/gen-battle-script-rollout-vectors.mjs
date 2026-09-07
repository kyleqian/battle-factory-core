#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptRolloutOpcode.ts (plus its
// two projected helpers, cancelBattleScriptMultiTurnMoves and
// requireBattlerRole).
//
// Expected controls, projected output, ordered errors, and registration are
// produced only by calling the canonical TypeScript handler. This generator
// owns bounded input construction and Rust literal emission; it must not
// independently implement Rollout/Ice Ball behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-rollout-vectors.mjs

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
  "battle_script_rolloutdamagecalculation_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRolloutOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_ROLLOUTDAMAGECALCULATION";
const OPCODE_ID = 0xb3;
const DISPATCHER = "Cmd_rolloutdamagecalculation";
const ENTRY_LABEL = "BattleScript_RolloutHit";
const MISSED_PAUSE_LABEL = "BattleScript_MoveMissedPause";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const MOVE_RESULT_NO_EFFECT = rulesModule.BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT;
const STATUS2_UPROAR = (1 << 4) | (1 << 5) | (1 << 6);
const STATUS2_BIDE = (1 << 8) | (1 << 9);
const STATUS2_LOCK_CONFUSE = (1 << 10) | (1 << 11);
const STATUS2_MULTIPLETURNS = 1 << 12;
const STATUS2_DEFENSE_CURL = (1 << 30) >>> 0;
const STATUS2_ALL_CANCEL = (STATUS2_UPROAR | STATUS2_BIDE | STATUS2_LOCK_CONFUSE | STATUS2_MULTIPLETURNS) >>> 0;
const STATUS3_ON_AIR = 1 << 6;
const STATUS3_UNDERGROUND = 1 << 7;
const STATUS3_UNDERWATER = 1 << 18;
const STATUS3_ALL_SEMI_INVULNERABLE = (STATUS3_ON_AIR | STATUS3_UNDERGROUND | STATUS3_UNDERWATER) >>> 0;
const TOPOLOGY = Object.freeze({
  battlersCount: 4,
  battleTypeFlags: (1 | 0x0008_0008) >>> 0,
  battlerPositions: Object.freeze([0, 1, 2, 3]),
});

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-rollout-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLERS.includes(value), `${label} must be a battler id 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical Rollout singleton drifted");
const instruction = canonicalInstructions[0];
assert(instruction.opcodeId === OPCODE_ID, "canonical opcode drifted");
assert(instruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(instruction.operands.length === 0, "canonical Rollout opcode must have no operands");
assert(instruction.source.label === ENTRY_LABEL, "canonical entry drifted");
assert(instruction.source.statementLine === 1605, "canonical statement line drifted");
const missedPause = programModule.resolveBattleScriptLabel(program, MISSED_PAUSE_LABEL);
assert(missedPause, `${MISSED_PAUSE_LABEL} must resolve in the canonical program`);
const programWithoutMissedPause = Object.freeze({
  ...program,
  labelEntries: Object.freeze(Object.fromEntries(
    Object.entries(program.labelEntries).filter(([label]) => label !== MISSED_PAUSE_LABEL),
  )),
});
assert(
  !programModule.resolveBattleScriptLabel(programWithoutMissedPause, MISSED_PAUSE_LABEL),
  "synthetic unresolved MoveMissedPause label unexpectedly resolves",
);
const handlers = opcodeModule.createBattleScriptRolloutOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical Rollout handler did not register");

function noiseU32(index, salt, tag) {
  return ((salt * 0x1001 + index * 0x2f + tag * 0x517) >>> 0);
}
function noiseU8(index, salt, tag) {
  return (salt * 7 + index * 13 + tag * 29) & 0xff;
}
// Source `gDisableStructs[*].rolloutTimer` is a 4-bit bitfield
// (`include/battle.h:87`), so noise values here must stay within 0..15.
function noiseRolloutTimer(index, salt, tag) {
  return (salt * 7 + index * 13 + tag * 29) & 0x0f;
}
function noiseU16(index, salt, tag) {
  return (salt * 11 + index * 37 + tag * 53) & 0xffff;
}

function canonicalBattler(index, projection) {
  const isAttacker = index === projection.attacker;
  const status2 = isAttacker ? projection.attackerStatus2 : noiseU32(index, projection.salt, 1);
  const status3 = isAttacker ? projection.attackerStatus3 : noiseU32(index, projection.salt, 2);
  const rolloutTimer = isAttacker ? projection.attackerRolloutTimer : noiseRolloutTimer(index, projection.salt, 3);
  const furyCutterCounter = isAttacker ? projection.attackerFuryCutterCounter : noiseU8(index, projection.salt, 4);
  return Object.freeze({
    side: index & 1,
    ability: (11 + index * 13 + projection.salt) & 0xff,
    hp: 60 + index * 13,
    maxHP: 80 + index * 13,
    moves: Object.freeze([33, 0, 0, 0]),
    pp: Object.freeze([10, 0, 0, 0]),
    status1: noiseU32(index, projection.salt, 5),
    status2: status2 >>> 0,
    status3: status3 >>> 0,
    substituteHP: 0,
    rolloutTimer,
    furyCutterCounter,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: noiseU16(index, projection.salt, 6),
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    personality: noiseU32(index, projection.salt, 7),
    attack: 100 + index,
    defense: 110 + index,
    spAttack: 120 + index,
    spDefense: 130 + index,
    speed: 140 + index,
    level: 50,
    friendship: 70,
    partyIndex: index,
  });
}

// Builds one complete rules context. `currentMovePower` and
// `dynamicBasePower` are overwritten directly after construction (mirroring
// gen-battle-script-furycutter-vectors.mjs), since currentMovePower is
// normally derived from currentMove through the source move table and this
// leaf needs independent edge-value coverage of the field the handler
// actually reads.
function makeRules({
  attacker,
  target = null,
  moveResultFlags,
  currentMove = 205,
  currentMovePower = 30,
  dynamicBasePower = 0x1234,
  lockedMoves = Object.freeze([9, 9, 9, 9]),
  rolloutTimerStartValues = Object.freeze([7, 7, 7, 7]),
  attackerStatus2 = 0,
  attackerStatus3 = 0,
  attackerRolloutTimer = 0,
  attackerFuryCutterCounter = 0,
  salt,
}) {
  assertOptionalBattler(attacker, "attacker");
  assertOptionalBattler(target, "target");
  const projection = {
    attacker,
    attackerStatus2,
    attackerStatus3,
    attackerRolloutTimer,
    attackerFuryCutterCounter,
    salt,
  };
  const battlers = Object.freeze(BATTLERS.map((index) => canonicalBattler(index, projection)));
  const sourceRules = rulesModule.createBattleScriptRulesContext({
    battlers,
    selectorRoles: Object.freeze({ attacker, target, effectBattler: null, fainted: null }),
    scriptingBattler: (salt + 1) & 3,
    atkCancelerTracker: 7,
    battleOutcome: 2,
    currentMove,
    currentMovePosition: 1,
    moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: (0x9000_0001 ^ ((salt * 0x1111) >>> 0)) >>> 0,
    multiHitCounter: 4,
    lockedMoves,
    rolloutTimerStartValues,
    dynamicBasePower,
    battleTopology: TOPOLOGY,
  });
  return Object.freeze({ ...sourceRules, currentMovePower, moveResultFlags });
}

function vectorBattlerState(battler) {
  return Object.freeze({
    side: battler.side,
    ability: battler.ability,
    hp: battler.hp,
    maxHp: battler.maxHP,
    item: battler.item,
    partyIndex: battler.partyIndex,
    status2: battler.status2 >>> 0,
    status3: battler.status3 >>> 0,
    rolloutTimer: battler.rolloutTimer,
    furyCutterCounter: battler.furyCutterCounter,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattlerState)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    lockedMoves: Object.freeze([...rules.lockedMoves]),
    rolloutTimerStartValues: Object.freeze([...rules.rolloutTimerStartValues]),
    currentMove: rules.currentMove,
    currentMovePower: rules.currentMovePower,
    moveResultFlags: rules.moveResultFlags >>> 0,
    dynamicBasePower: rules.dynamicBasePower,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") {
    assert(
      transition.control.programCounter === missedPause.programCounter,
      "jump must target BattleScript_MoveMissedPause",
    );
    return "move-missed-pause-jump";
  }
  throw new Error(`unexpected canonical control ${JSON.stringify(transition.control)}`);
}

function sourceOutcome(initialRules, moveMissedPauseResolved, salt) {
  const inputSnapshot = vectorState(initialRules);
  try {
    const state = Object.freeze({
      ...machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        initialRules,
        (0x2468_ace0 + salt) >>> 0,
      ),
    });
    const transition = handler({
      program: moveMissedPauseResolved ? program : programWithoutMissedPause,
      instruction,
      state,
    });
    assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
    assert(transition.rng === state.rng, "canonical handler consumed RNG");
    assert(transition.events.length === 0, "canonical handler emitted event(s)");
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input");
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    const control = controlFromTransition(transition);
    return Object.freeze({
      initial: inputSnapshot,
      expected: vectorState(transition.rulesContext),
      rulesContext: transition.rulesContext,
      control,
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input");
    return Object.freeze({
      initial: inputSnapshot,
      expected: null,
      rulesContext: null,
      control: null,
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.control;
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.startsWith("Cmd_rolloutdamagecalculation requires BattleScript_MoveMissedPause")) {
    return "missing-move-missed-pause";
  }
  if (outcome.error.startsWith("Cmd_rolloutdamagecalculation found STATUS2_MULTIPLETURNS")) {
    return "zero-rollout-timer";
  }
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, rulesConfig, moveMissedPauseResolved = true) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const initialRules = "attacker" in rulesConfig && typeof rulesConfig.selectorRoles === "undefined"
    ? makeRules(rulesConfig)
    : rulesConfig;
  const outcome = sourceOutcome(initialRules, moveMissedPauseResolved, cases.length + 101);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    initial: outcome.initial,
    expected: outcome.expected,
    control: outcome.control,
    expectedError: outcome.error,
  }));
  return outcome.rulesContext;
}

// Missing attacker precedes flag/status inspection entirely.
addCase("missing_attacker_role", "missing-attacker-role", {
  attacker: null,
  moveResultFlags: 0,
  salt: 1,
});

// Per-battler success sweep: proves attacker indexing for the success branch.
for (const attacker of BATTLERS) {
  addCase(`attacker_battler_sweep_success_${attacker}`, "attacker-battler-sweep-success", {
    attacker,
    moveResultFlags: 0,
    attackerStatus2: 0,
    attackerRolloutTimer: 0,
    salt: 200 + attacker,
  });
}

// Per-battler no-effect sweep: proves attacker indexing for the cancellation
// branch, including a dirty attacker cell.
for (const attacker of BATTLERS) {
  addCase(`attacker_battler_sweep_no_effect_${attacker}`, "attacker-battler-sweep-no-effect", {
    attacker,
    moveResultFlags: MOVE_RESULT_NO_EFFECT,
    attackerStatus2: STATUS2_ALL_CANCEL,
    attackerStatus3: STATUS3_ALL_SEMI_INVULNERABLE,
    attackerRolloutTimer: 4,
    attackerFuryCutterCounter: 5,
    salt: 210 + attacker,
  });
}

// No-effect cancellation matrix: every NO_EFFECT bit (individually and
// combined) plus a non-mask bit, crossed with representative STATUS2 lock
// combinations, STATUS3 semi-invulnerable combinations, and dirty
// rolloutTimer/furyCutterCounter values (including an already-clean
// attacker). Combos that set STATUS2_MULTIPLETURNS keep a nonzero
// rolloutTimer so the non-mask-bit (success-branch) sweep member of this
// matrix never collides with the dedicated zero-timer premise error case.
const MOVE_RESULT_FLAG_SWEEP = Object.freeze([1 << 0, 1 << 3, 1 << 5, MOVE_RESULT_NO_EFFECT, 1 << 1]);
const STATUS_COMBOS = Object.freeze([
  Object.freeze({ label: "clean", status2: 0, status3: 0, rolloutTimer: 0, furyCutterCounter: 0 }),
  Object.freeze({ label: "uproar", status2: STATUS2_UPROAR, status3: 0, rolloutTimer: 0, furyCutterCounter: 0 }),
  Object.freeze({ label: "bide", status2: STATUS2_BIDE, status3: 0, rolloutTimer: 0, furyCutterCounter: 0 }),
  Object.freeze({ label: "lock_confuse", status2: STATUS2_LOCK_CONFUSE, status3: 0, rolloutTimer: 0, furyCutterCounter: 0 }),
  Object.freeze({ label: "multipleturns", status2: STATUS2_MULTIPLETURNS, status3: 0, rolloutTimer: 3, furyCutterCounter: 0 }),
  Object.freeze({ label: "all_status2", status2: STATUS2_ALL_CANCEL, status3: 0, rolloutTimer: 3, furyCutterCounter: 0 }),
  Object.freeze({ label: "on_air", status2: 0, status3: STATUS3_ON_AIR, rolloutTimer: 0, furyCutterCounter: 0 }),
  Object.freeze({ label: "underground", status2: 0, status3: STATUS3_UNDERGROUND, rolloutTimer: 0, furyCutterCounter: 0 }),
  Object.freeze({ label: "underwater", status2: 0, status3: STATUS3_UNDERWATER, rolloutTimer: 0, furyCutterCounter: 0 }),
  Object.freeze({ label: "all_status3", status2: 0, status3: STATUS3_ALL_SEMI_INVULNERABLE, rolloutTimer: 0, furyCutterCounter: 0 }),
  Object.freeze({ label: "dirty_timer_fury", status2: 0, status3: 0, rolloutTimer: 7, furyCutterCounter: 9 }),
  Object.freeze({ label: "everything", status2: STATUS2_ALL_CANCEL, status3: STATUS3_ALL_SEMI_INVULNERABLE, rolloutTimer: 3, furyCutterCounter: 9 }),
]);
for (const flags of MOVE_RESULT_FLAG_SWEEP) {
  for (const combo of STATUS_COMBOS) {
    addCase(
      `no_effect_matrix_flags${flags}_${combo.label}`,
      "no-effect-cancellation-matrix",
      {
        attacker: 2,
        moveResultFlags: flags,
        attackerStatus2: combo.status2,
        attackerStatus3: combo.status3,
        attackerRolloutTimer: combo.rolloutTimer,
        attackerFuryCutterCounter: combo.furyCutterCounter,
        salt: cases.length + 300,
      },
    );
  }
}

// Late MoveMissedPause resolution: unresolved only bites the no-effect
// branch; the success branch never looks the label up.
addCase("unresolved_move_missed_pause_on_no_effect", "unresolved-move-missed-pause", {
  attacker: 1,
  moveResultFlags: MOVE_RESULT_NO_EFFECT,
  attackerStatus2: STATUS2_MULTIPLETURNS,
  attackerRolloutTimer: 2,
  salt: 900,
}, false);
addCase("unresolved_move_missed_pause_not_reached_on_success", "unresolved-move-missed-pause", {
  attacker: 1,
  moveResultFlags: 0,
  attackerStatus2: 0,
  salt: 901,
}, false);

// Zero-timer premise error: MULTIPLETURNS held with an impossible zero timer.
addCase("zero_rollout_timer_premise_error", "zero-rollout-timer", {
  attacker: 3,
  moveResultFlags: 0,
  attackerStatus2: STATUS2_MULTIPLETURNS,
  attackerRolloutTimer: 0,
  salt: 950,
});

// Full five-hit ladder without Defense Curl: timer walks 5->4->3->2->1->0,
// MULTIPLETURNS held from the first hit until the last hit clears it, power
// escalates 30/60/120/240/480. lockedMoves/rolloutTimerStartValues start
// stale to prove the first hit overwrites them and later hits leave them
// untouched.
{
  let rules = makeRules({
    attacker: 0,
    moveResultFlags: 0,
    attackerStatus2: 0,
    attackerRolloutTimer: 0,
    currentMove: 205,
    currentMovePower: 30,
    dynamicBasePower: 0x1234,
    lockedMoves: Object.freeze([99, 99, 99, 99]),
    rolloutTimerStartValues: Object.freeze([9, 9, 9, 9]),
    salt: 1000,
  });
  for (let hit = 0; hit < 5; hit += 1) {
    rules = addCase(`ladder_no_defense_curl_hit_${hit}`, "five-hit-ladder-no-defense-curl", rules);
  }
}

// Same ladder with Defense Curl held throughout: 60/120/240/480/960.
{
  let rules = makeRules({
    attacker: 0,
    moveResultFlags: 0,
    attackerStatus2: STATUS2_DEFENSE_CURL,
    attackerRolloutTimer: 0,
    currentMove: 205,
    currentMovePower: 30,
    dynamicBasePower: 0x1234,
    lockedMoves: Object.freeze([99, 99, 99, 99]),
    rolloutTimerStartValues: Object.freeze([9, 9, 9, 9]),
    salt: 1100,
  });
  for (let hit = 0; hit < 5; hit += 1) {
    rules = addCase(`ladder_defense_curl_hit_${hit}`, "five-hit-ladder-defense-curl", rules);
  }
}

// Non-firstHit proves lockedMoves/rolloutTimerStartValues stay untouched at
// every index, including the attacker's own stale cell.
addCase("non_first_hit_leaves_locked_moves_and_start_values_untouched", "non-first-hit-preserves-locked-state", {
  attacker: 2,
  moveResultFlags: 0,
  attackerStatus2: STATUS2_MULTIPLETURNS,
  attackerRolloutTimer: 3,
  currentMove: 205,
  currentMovePower: 30,
  lockedMoves: Object.freeze([11, 22, 33, 44]),
  rolloutTimerStartValues: Object.freeze([1, 2, 3, 4]),
  salt: 1200,
});

// currentMovePower edge values with a nonzero prior dynamicBasePower,
// proving unconditional overwrite on the (first-hit) success branch.
for (const power of [0, 1, 30, 250]) {
  addCase(`current_move_power_edge_${power}`, "current-move-power-edge", {
    attacker: 1,
    moveResultFlags: 0,
    attackerStatus2: 0,
    attackerRolloutTimer: 0,
    currentMovePower: power,
    dynamicBasePower: 0xbeef,
    salt: 1300 + power,
  });
}

function instructionSpec({
  opcodeName = OPCODE_NAME,
  programCounter = instruction.programCounter,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandCount = 0,
} = {}) {
  return Object.freeze({ opcodeName, programCounter, opcodeId, dispatcher, operandCount });
}

function materializeInstruction(spec) {
  return Object.freeze({
    ...instruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(Array.from({ length: spec.operandCount }, (_unused, index) => Object.freeze({
      widthBytes: 1,
      expression: String(index),
      sourceMacro: "generated-invalid-shape",
      sourceMacroLine: 0,
      wrapperPath: Object.freeze([]),
    }))),
  });
}

function registrationOutcome(specs) {
  const registrationProgram = Object.freeze({
    ...program,
    instructions: Object.freeze(specs.map(materializeInstruction)),
  });
  try {
    const registrationHandlers = opcodeModule.createBattleScriptRolloutOpcodeHandlers(registrationProgram);
    const candidates = registrationProgram.instructions.filter((candidate) => candidate.opcodeName === OPCODE_NAME);
    assert(candidates.length === 1, "successful registration must select one concrete start");
    const registered = registrationHandlers[candidates[0].opcodeId];
    assert(typeof registered === "function", "valid registration did not return canonical handler");
    return Object.freeze({ opcodeId: candidates[0].opcodeId, error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ opcodeId: null, error: error.message });
  }
}

const registrationCases = [];
function addRegistrationCase(label, specs) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid registration label ${label}`);
  const normalizedSpecs = Object.freeze(specs.map(instructionSpec));
  const outcome = registrationOutcome(normalizedSpecs);
  registrationCases.push(Object.freeze({
    label,
    instructions: normalizedSpecs,
    expectedOpcodeId: outcome.opcodeId,
    expectedError: outcome.error,
  }));
}

addRegistrationCase("canonical", [instructionSpec()]);
addRegistrationCase("no_concrete_start", []);
addRegistrationCase("two_concrete_starts", [instructionSpec(), instructionSpec()]);
addRegistrationCase("wrong_opcode", [instructionSpec({ opcodeId: 0xb4 })]);
addRegistrationCase("wrong_dispatcher", [instructionSpec({ dispatcher: "Cmd_furycuttercalc" })]);
addRegistrationCase("unexpected_operand", [instructionSpec({ operandCount: 1 })]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered" : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["move-result-flag-sweep-values", MOVE_RESULT_FLAG_SWEEP.length],
  ["status-combos", STATUS_COMBOS.length],
  ["registration-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generator = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generator).digest("hex");

function rustString(value) { return JSON.stringify(value); }
function rustU8(value) { return `0x${value.toString(16).padStart(2, "0")}`; }
function rustU16(value) { return `0x${value.toString(16).padStart(4, "0")}`; }
function rustU32(value) { return `0x${(value >>> 0).toString(16).padStart(8, "0")}`; }
function rustBattler(value) { return `BattleScriptRolloutBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustControl(value) {
  return value === "advance" ? "BattleScriptRolloutControl::Advance"
    : "BattleScriptRolloutControl::MoveMissedPauseJump";
}
function rustBattlerState(value) {
  return `BattleScriptRolloutVectorBattlerState { side: ${rustU8(value.side)}, ability: ${rustU8(value.ability)}, hp: ${value.hp}, max_hp: ${value.maxHp}, item: ${rustU16(value.item)}, party_index: ${rustU8(value.partyIndex)}, status2: ${rustU32(value.status2)}, status3: ${rustU32(value.status3)}, rollout_timer: ${rustU8(value.rolloutTimer)}, fury_cutter_counter: ${rustU8(value.furyCutterCounter)} }`;
}
function rustU16Array4(values) { return `[${values.map(rustU16).join(", ")}]`; }
function rustU8Array4(values) { return `[${values.map(rustU8).join(", ")}]`; }
function rustState(value) {
  return [
    "BattleScriptRolloutVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `locked_moves: ${rustU16Array4(value.lockedMoves)},`,
    `rollout_timer_start_values: ${rustU8Array4(value.rolloutTimerStartValues)},`,
    `current_move: ${rustU16(value.currentMove)},`,
    `current_move_power: ${rustU16(value.currentMovePower)},`,
    `move_result_flags: ${rustU32(value.moveResultFlags)},`,
    `dynamic_base_power: ${rustU32(value.dynamicBasePower)},`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalControl(value) { return value === null ? "None" : `Some(${rustControl(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustInstructionSpec(value) {
  return `BattleScriptRolloutVectorInstructionSpec { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${rustU8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operand_count: ${value.operandCount} }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-rollout-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptRolloutOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_rolloutdamagecalculation::{");
lines.push("    BattleScriptRolloutBattler, BattleScriptRolloutControl,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_ROLLOUT_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_ROLLOUT_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_ROLLOUT_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_ROLLOUT_VECTOR_GENERATOR_BYTES: usize = ${generator.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRolloutVectorBattlerState { pub side: u8, pub ability: u8, pub hp: u16, pub max_hp: u16, pub item: u16, pub party_index: u8, pub status2: u32, pub status3: u32, pub rollout_timer: u8, pub fury_cutter_counter: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRolloutVectorState { pub battlers: [BattleScriptRolloutVectorBattlerState; 4], pub attacker: Option<BattleScriptRolloutBattler>, pub target: Option<BattleScriptRolloutBattler>, pub locked_moves: [u16; 4], pub rollout_timer_start_values: [u8; 4], pub current_move: u16, pub current_move_power: u16, pub move_result_flags: u32, pub dynamic_base_power: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRolloutVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptRolloutVectorState, pub expected: Option<BattleScriptRolloutVectorState>, pub control: Option<BattleScriptRolloutControl>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRolloutVectorInstructionSpec { pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8, pub dispatcher: &'static str, pub operand_count: usize }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRolloutRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptRolloutVectorInstructionSpec], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ROLLOUT_DOMAIN_CENSUS", domainCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ROLLOUT_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ROLLOUT_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ROLLOUT_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_ROLLOUT_CASES: [BattleScriptRolloutVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptRolloutVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        control: ${rustOptionalControl(value.control)}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_ROLLOUT_REGISTRATION_CASES: [BattleScriptRolloutRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptRolloutRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map(rustInstructionSpec).join(", ")}],`);
  lines.push(`        expected_opcode_id: ${value.expectedOpcodeId === null ? "None" : `Some(${rustU8(value.expectedOpcodeId)})`}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
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
if (!formatted) throw new Error("gen-battle-script-rollout-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
