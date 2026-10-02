#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptChargeSportOpcode.ts.
//
// Expected controls, projected output, ordered errors, and registration are
// produced only by calling the canonical TypeScript factory/handlers. This
// generator owns bounded input construction and Rust literal emission; it
// must not independently implement Charge/Mud Sport/Water Sport behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-chargesport-vectors.mjs

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
  "battle_script_chargesport_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptChargeSportOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const CHARGE_OPCODE_NAME = "B_SCR_OP_SETCHARGE";
const CHARGE_OPCODE_ID = 0xcb;
const CHARGE_DISPATCHER = "Cmd_setcharge";
const CHARGE_ENTRY_LABEL = "BattleScript_EffectCharge";
const SPORT_OPCODE_NAME = "B_SCR_OP_SETTYPEBASEDHALVERS";
const SPORT_OPCODE_ID = 0xe8;
const SPORT_DISPATCHER = "Cmd_settypebasedhalvers";
const SPORT_ENTRY_LABEL = "BattleScript_EffectMudSport";
const FAILURE_POINTER = "BattleScript_ButItFailed";
const UNRESOLVED_POINTER = "BattleScript_RustSportUnresolved";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
// Move ids confirmed against src/data/gen/moves.json: 300 = MUD SPORT
// (EFFECT_MUD_SPORT), 346 = WATER SPORT (EFFECT_WATER_SPORT), 268 = CHARGE
// (EFFECT_CHARGE), 33 = TACKLE (EFFECT_HIT), 0 = "-" (EFFECT_HIT),
// 354 = PSYCHO BOOST (EFFECT_OVERHEAT); 355/65535 are out of the 355-move table.
const MUD_SPORT_MOVE = 300;
const WATER_SPORT_MOVE = 346;
const CHARGE_MOVE = 268;
const TACKLE_MOVE = 33;
const NO_MOVE = 0;
const PSYCHO_BOOST_MOVE = 354;
const OUT_OF_TABLE_MOVE = 355;
const OUT_OF_TABLE_MOVE_MAX = 65535;
const SPORT_MOVES = Object.freeze([
  MUD_SPORT_MOVE,
  WATER_SPORT_MOVE,
  CHARGE_MOVE,
  TACKLE_MOVE,
  NO_MOVE,
  PSYCHO_BOOST_MOVE,
  OUT_OF_TABLE_MOVE,
  OUT_OF_TABLE_MOVE_MAX,
]);
const STATUS3_CHARGED_UP = 1 << 9;
const STATUS3_MUDSPORT = 1 << 16;
const STATUS3_WATERSPORT = 1 << 17;
const CHARGE_STATUS3_VALUES = Object.freeze([0, STATUS3_CHARGED_UP, (STATUS3_CHARGED_UP | STATUS3_MUDSPORT) >>> 0, 0xffff_ffff]);
const CHARGE_TIMER_VALUES = Object.freeze([0, 1, 2, 15]);
const SPORT_STATUS3_VALUES = Object.freeze([
  0,
  STATUS3_MUDSPORT,
  STATUS3_WATERSPORT,
  (STATUS3_MUDSPORT | STATUS3_WATERSPORT) >>> 0,
  0xffff_ffff,
]);
const MULTISTRING_CHOOSER_VALUES = Object.freeze([0, 1, 7]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-chargesport-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLERS.includes(value), `${label} must be a battler id 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xff, `${label} must be u8`);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff, `${label} must be u32`);
}

function battler(side, changes = {}) {
  return Object.freeze({
    side,
    ability: changes.ability ?? 22,
    hp: changes.hp ?? 200,
    maxHP: changes.maxHP ?? 200,
    moves: changes.moves ?? [33, 0, 0, 0],
    pp: changes.pp ?? [20, 0, 0, 0],
    status1: 0,
    status2: 0,
    status3: changes.status3 ?? 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    chargeTimer: changes.chargeTimer ?? 0,
    chargeTimerStartValue: changes.chargeTimerStartValue ?? 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 210,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: 0,
  });
}

// One full four-battler projection: the resolved attacker (if any) carries
// the case's status3/chargeTimer/chargeTimerStartValue; the remaining three
// battlers get a fixed non-interfering "noise" state, proving only the
// resolved cell is ever read or written.
function makeProjection({ attacker, battlerState, currentMove, multistringChooser }) {
  assertOptionalBattler(attacker, "attacker");
  const battlers = BATTLERS.map((index) => {
    if (index === attacker) {
      return battler(index & 1, battlerState);
    }
    return battler(index & 1, { status3: 0x1234_5678, chargeTimer: 3, chargeTimerStartValue: 5 });
  });
  return Object.freeze({ attacker, battlers, currentMove, multistringChooser });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: projection.battlers,
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: 1,
      effectBattler: 1,
      fainted: null,
    }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: projection.currentMove,
    currentMovePosition: 0,
    chosenMove: projection.currentMove,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    multistringChooser: projection.multistringChooser,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: 1 << 19,
      battlerPositions: [0, 1, 0xfe, 0xff],
    },
  });
}

function vectorBattlerState(battlerValue) {
  return Object.freeze({
    status3: battlerValue.status3 >>> 0,
    chargeTimer: battlerValue.chargeTimer,
    chargeTimerStartValue: battlerValue.chargeTimerStartValue,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattlerState)),
    attacker: rules.selectorRoles.attacker,
    currentMove: rules.currentMove,
    multistringChooser: rules.multistringChooser,
  });
}

// Computed straight from the projection, not from a constructed rules
// context: `createBattleScriptRulesContext` itself eagerly resolves
// `currentMove`'s effect (`currentMoveEffect: resolveBattleScriptCurrentMoveEffect(currentMove)`),
// so an out-of-table move throws during context construction, before any
// handler runs. The corpus still needs an "initial" snapshot for those
// cases, so it is derived from the projection inputs directly.
function projectedVectorState(projection) {
  return Object.freeze({
    battlers: Object.freeze(projection.battlers.map(vectorBattlerState)),
    attacker: projection.attacker,
    currentMove: projection.currentMove,
    multistringChooser: projection.multistringChooser,
  });
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalCharge = program.instructions.filter((instruction) => instruction.opcodeName === CHARGE_OPCODE_NAME);
assert(canonicalCharge.length === 1, "canonical Charge singleton drifted");
assert(canonicalCharge[0].opcodeId === CHARGE_OPCODE_ID, "canonical Charge opcode drifted");
assert(canonicalCharge[0].dispatcher === CHARGE_DISPATCHER, "canonical Charge dispatcher drifted");
assert(canonicalCharge[0].operands.length === 0, "canonical Charge operand count drifted");
const CANONICAL_CHARGE_PC = canonicalCharge[0].programCounter;

const canonicalSport = program.instructions.filter((instruction) => instruction.opcodeName === SPORT_OPCODE_NAME);
assert(canonicalSport.length === 1, "canonical sport singleton drifted");
assert(canonicalSport[0].opcodeId === SPORT_OPCODE_ID, "canonical sport opcode drifted");
assert(canonicalSport[0].dispatcher === SPORT_DISPATCHER, "canonical sport dispatcher drifted");
assert(canonicalSport[0].operands.length === 1, "canonical sport operand count drifted");
assert(canonicalSport[0].operands[0].widthBytes === 4, "canonical sport pointer width drifted");
assert(canonicalSport[0].operands[0].expression === FAILURE_POINTER, "canonical sport pointer drifted");
const CANONICAL_SPORT_PC = canonicalSport[0].programCounter;

const resolvedFailure = programModule.resolveBattleScriptLabel(program, FAILURE_POINTER);
assert(resolvedFailure, "failure label must resolve");
const RESOLVED_FAILURE_PC = resolvedFailure.programCounter;
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");

const handlers = opcodeModule.createBattleScriptChargeSportOpcodeHandlers(program);
const chargeHandler = handlers[CHARGE_OPCODE_ID];
const sportHandler = handlers[SPORT_OPCODE_ID];
assert(typeof chargeHandler === "function", "canonical Charge handler did not register");
assert(typeof sportHandler === "function", "canonical sport handler did not register");

function freezeInstructionSpec({
  opcodeName,
  programCounter,
  opcodeId,
  dispatcher,
  operandWidths = [],
  operandExpressions = [],
}) {
  assert(typeof opcodeName === "string", "opcodeName must be a string");
  assertU32(programCounter, "program counter");
  assertU8(opcodeId, "opcode id");
  assert(typeof dispatcher === "string", "dispatcher must be a string");
  assert(operandWidths.length === operandExpressions.length, "operand shapes disagree");
  operandWidths.forEach((width, index) => assertU8(width, `operand width ${index}`));
  operandExpressions.forEach((expression, index) => assert(typeof expression === "string", `operand expression ${index}`));
  return Object.freeze({
    opcodeName,
    programCounter,
    opcodeId,
    dispatcher,
    operandWidths: Object.freeze([...operandWidths]),
    operandExpressions: Object.freeze([...operandExpressions]),
  });
}

function chargeSpec(overrides = {}) {
  return freezeInstructionSpec({
    opcodeName: CHARGE_OPCODE_NAME,
    programCounter: CANONICAL_CHARGE_PC,
    opcodeId: CHARGE_OPCODE_ID,
    dispatcher: CHARGE_DISPATCHER,
    operandWidths: [],
    operandExpressions: [],
    ...overrides,
  });
}

function sportSpec(overrides = {}) {
  return freezeInstructionSpec({
    opcodeName: SPORT_OPCODE_NAME,
    programCounter: CANONICAL_SPORT_PC,
    opcodeId: SPORT_OPCODE_ID,
    dispatcher: SPORT_DISPATCHER,
    operandWidths: [4],
    operandExpressions: [FAILURE_POINTER],
    ...overrides,
  });
}

const CANONICAL_CHARGE_SPEC = chargeSpec();
const CANONICAL_SPORT_SPEC = sportSpec();

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(operands),
  });
}

function vectorInstruction(spec) {
  const operand = spec.operandWidths.length > 0
    ? { widthBytes: spec.operandWidths[0], expression: spec.operandExpressions[0] }
    : undefined;
  const resolved = operand === undefined ? undefined
    : programModule.resolveBattleScriptLabel(program, operand.expression);
  return Object.freeze({
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operandWidths: Object.freeze([...spec.operandWidths]),
    operandExpressions: Object.freeze([...spec.operandExpressions]),
    resolvedFailureExpression: resolved === undefined ? null : operand.expression,
    resolvedFailureProgramCounter: resolved === undefined ? null : resolved.programCounter,
  });
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({
    kind: "jump",
    programCounter: transition.control.programCounter,
  });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

// Invokes the raw registered handler directly (not stepping the whole
// program), mirroring the previous leaf's generator convention.
function sourceOutcome(handler, entryLabel, projection, instructionSpec, salt) {
  const inputSnapshot = projectedVectorState(projection);
  try {
    const initialRules = canonicalRulesFromProjection(projection);
    const state = Object.freeze({
      ...machineModule.createBattleScriptMachine(program, entryLabel, initialRules, (0x2468_ace0 + salt) >>> 0),
    });
    const transition = handler({
      program,
      instruction: instructionFromSpec(instructionSpec),
      state,
    });
    assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
    assert(transition.rng === state.rng, "canonical handler changed RNG");
    assert(transition.events.length === 0, "canonical handler emitted event(s)");
    assert(same(vectorState(initialRules), inputSnapshot), "canonical handler mutated input");
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    const control = controlFromTransition(transition);
    return Object.freeze({
      initial: inputSnapshot,
      expected: vectorState(transition.rulesContext),
      control,
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({
      initial: inputSnapshot,
      expected: null,
      control: null,
      error: error.message,
    });
  }
}

function chargeBranchFor(outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  throw new Error(`unknown canonical Charge error ${outcome.error}`);
}

function sportBranchFor(outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.includes("has no source-derived gBattleMoves effect")) return "unknown-move-effect";
  if (outcome.error.startsWith("Cmd_settypebasedhalvers received effect")) return "unsupported-effect";
  if (outcome.error === "unresolved Mud/Water Sport failure target") return "unresolved-sport-failure-target";
  throw new Error(`unknown canonical sport error ${outcome.error}`);
}

const cases = [];
function addChargeCase(label, category, projection, instructionSpec = CANONICAL_CHARGE_SPEC) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(chargeHandler, CHARGE_ENTRY_LABEL, projection, instructionSpec, cases.length + 11);
  cases.push(Object.freeze({
    opcode: "charge",
    label,
    category,
    branch: chargeBranchFor(outcome),
    initial: outcome.initial,
    instruction: vectorInstruction(instructionSpec),
    expected: outcome.expected,
    control: outcome.control,
    expectedError: outcome.error,
  }));
}
function addSportCase(label, category, projection, instructionSpec = CANONICAL_SPORT_SPEC) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(sportHandler, SPORT_ENTRY_LABEL, projection, instructionSpec, cases.length + 5000);
  cases.push(Object.freeze({
    opcode: "sport",
    label,
    category,
    branch: sportBranchFor(outcome),
    initial: outcome.initial,
    instruction: vectorInstruction(instructionSpec),
    expected: outcome.expected,
    control: outcome.control,
    expectedError: outcome.error,
  }));
}

// Charge: every attacker 0..3 plus missing, crossed with prior status3 and
// prior (equal) charge timer values -- proves the unconditional OR/overwrite
// and the missing-attacker error.
for (const attacker of [...BATTLERS, null]) {
  for (const status3 of CHARGE_STATUS3_VALUES) {
    for (const timer of CHARGE_TIMER_VALUES) {
      addChargeCase(
        `charge_a${attacker === null ? "none" : attacker}_s3_${(status3 >>> 0).toString(16)}_t${timer}`,
        "charge-attacker-status-timer-grid",
        makeProjection({
          attacker,
          battlerState: { status3, chargeTimer: timer, chargeTimerStartValue: timer },
          currentMove: TACKLE_MOVE,
          multistringChooser: 0,
        }),
      );
    }
  }
}

// Sport: currentMove x prior sport status3 x prior multistringChooser, with
// the attacker rotated across the grid for coverage without a full x4 blowup.
let sportGridIndex = 0;
for (const currentMove of SPORT_MOVES) {
  for (const status3 of SPORT_STATUS3_VALUES) {
    for (const multistringChooser of MULTISTRING_CHOOSER_VALUES) {
      const attacker = BATTLERS[sportGridIndex % BATTLERS.length];
      sportGridIndex += 1;
      addSportCase(
        `sport_move${currentMove}_s3_${(status3 >>> 0).toString(16)}_c${multistringChooser}_a${attacker}`,
        "sport-move-status-chooser-grid",
        makeProjection({
          attacker,
          battlerState: { status3, chargeTimer: 0, chargeTimerStartValue: 0 },
          currentMove,
          multistringChooser,
        }),
      );
    }
  }
}

// Sport: explicit attacker sweep (0..3) for both concrete sports, plus a
// missing-attacker case, independent of the grid above.
for (const attacker of BATTLERS) {
  addSportCase(`sport_attacker_sweep_mud_a${attacker}`, "sport-attacker-sweep", makeProjection({
    attacker,
    battlerState: { status3: 0, chargeTimer: 0, chargeTimerStartValue: 0 },
    currentMove: MUD_SPORT_MOVE,
    multistringChooser: 5,
  }));
  addSportCase(`sport_attacker_sweep_water_a${attacker}`, "sport-attacker-sweep", makeProjection({
    attacker,
    battlerState: { status3: 0, chargeTimer: 0, chargeTimerStartValue: 0 },
    currentMove: WATER_SPORT_MOVE,
    multistringChooser: 5,
  }));
}
addSportCase("sport_missing_attacker_role", "missing-attacker-role", makeProjection({
  attacker: null,
  battlerState: { status3: 0, chargeTimer: 0, chargeTimerStartValue: 0 },
  currentMove: MUD_SPORT_MOVE,
  multistringChooser: 0,
}));

// Late label resolution: an already-set sport whose failure pointer is
// unresolved must surface the typed error only on that branch (lazy);
// a fresh-set case with the same unresolved pointer must succeed, proving
// the fresh-set branch never consults the operand.
addSportCase("sport_unresolved_failure_target_when_already_set", "unresolved-sport-failure-target", makeProjection({
  attacker: 0,
  battlerState: { status3: STATUS3_MUDSPORT, chargeTimer: 0, chargeTimerStartValue: 0 },
  currentMove: MUD_SPORT_MOVE,
  multistringChooser: 3,
}), sportSpec({ operandExpressions: [UNRESOLVED_POINTER] }));
addSportCase("sport_unresolved_failure_target_not_reached_on_fresh_set", "late-label-resolution-laziness", makeProjection({
  attacker: 0,
  battlerState: { status3: 0, chargeTimer: 0, chargeTimerStartValue: 0 },
  currentMove: WATER_SPORT_MOVE,
  multistringChooser: 3,
}), sportSpec({ operandExpressions: [UNRESOLVED_POINTER] }));

function sourceRegistration(chargeSpecs, sportSpecs) {
  const instructions = Object.freeze([...chargeSpecs, ...sportSpecs].map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptChargeSportOpcodeHandlers(customProgram);
    const keys = Object.keys(registered).map(Number).sort((a, b) => a - b);
    assert(keys.length === 2, "canonical registration must emit exactly two keys");
    return Object.freeze({ chargeOpcodeId: keys[0], sportOpcodeId: keys[1], error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ chargeOpcodeId: null, sportOpcodeId: null, error: error.message });
  }
}

const registrationCases = [];
function addRegistration(label, chargeSpecs, sportSpecs) {
  const outcome = sourceRegistration(chargeSpecs, sportSpecs);
  registrationCases.push(Object.freeze({
    label,
    chargeInstructions: Object.freeze(chargeSpecs.map(vectorInstruction)),
    sportInstructions: Object.freeze(sportSpecs.map(vectorInstruction)),
    expectedChargeOpcodeId: outcome.chargeOpcodeId,
    expectedSportOpcodeId: outcome.sportOpcodeId,
    expectedError: outcome.error,
  }));
}

addRegistration("canonical_both", [CANONICAL_CHARGE_SPEC], [CANONICAL_SPORT_SPEC]);
addRegistration("zero_charge_starts", [], [CANONICAL_SPORT_SPEC]);
addRegistration("two_charge_starts", [CANONICAL_CHARGE_SPEC, CANONICAL_CHARGE_SPEC], [CANONICAL_SPORT_SPEC]);
addRegistration("charge_with_unexpected_operand", [chargeSpec({ operandWidths: [4], operandExpressions: [FAILURE_POINTER] })], [CANONICAL_SPORT_SPEC]);
addRegistration("charge_wrong_opcode_id", [chargeSpec({ opcodeId: 0xd0 })], [CANONICAL_SPORT_SPEC]);
addRegistration("charge_wrong_dispatcher", [chargeSpec({ dispatcher: "Cmd_other" })], [CANONICAL_SPORT_SPEC]);
addRegistration("zero_sport_starts", [CANONICAL_CHARGE_SPEC], []);
addRegistration("two_sport_starts", [CANONICAL_CHARGE_SPEC], [CANONICAL_SPORT_SPEC, CANONICAL_SPORT_SPEC]);
addRegistration("sport_with_zero_operands", [CANONICAL_CHARGE_SPEC], [sportSpec({ operandWidths: [], operandExpressions: [] })]);
addRegistration("sport_with_one_byte_operand", [CANONICAL_CHARGE_SPEC], [sportSpec({ operandWidths: [1] })]);
addRegistration("sport_wrong_opcode_id", [CANONICAL_CHARGE_SPEC], [sportSpec({ opcodeId: 0xd0 })]);
addRegistration("sport_wrong_dispatcher", [CANONICAL_CHARGE_SPEC], [sportSpec({ dispatcher: "Cmd_other" })]);
addRegistration("sport_wrong_pointer_expression", [CANONICAL_CHARGE_SPEC], [sportSpec({ operandExpressions: ["BattleScript_SomewhereElse"] })]);
addRegistration("both_wrong_reports_charge_first", [chargeSpec({ opcodeId: 0xd0 })], [sportSpec({ dispatcher: "Cmd_other" })]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => `${value.opcode}:${value.branch}`);
const opcodeCensus = census(cases, (value) => value.opcode);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered"
    : value.expectedError.startsWith("invalid B_SCR_OP_SETCHARGE") ? "invalid-charge-shape"
    : "invalid-sport-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["charge-status3-values", CHARGE_STATUS3_VALUES.length],
  ["charge-timer-values", CHARGE_TIMER_VALUES.length],
  ["sport-move-values", SPORT_MOVES.length],
  ["sport-status3-values", SPORT_STATUS3_VALUES.length],
  ["multistring-chooser-values", MULTISTRING_CHOOSER_VALUES.length],
  ["registration-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  chargeStatus3Values: CHARGE_STATUS3_VALUES,
  chargeTimerValues: CHARGE_TIMER_VALUES,
  sportMoves: SPORT_MOVES,
  sportStatus3Values: SPORT_STATUS3_VALUES,
  multistringChooserValues: MULTISTRING_CHOOSER_VALUES,
  domainCensus,
  categoryCensus,
  branchCensus,
  opcodeCensus,
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
function rustU16(value) { return `${value}`; }
function rustU32(value) { return `0x${(value >>> 0).toString(16).padStart(8, "0")}`; }
function rustBattler(value) { return `BattleScriptChargeSportBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustControl(value) {
  return value.kind === "advance" ? "BattleScriptChargeSportControl::Advance"
    : `BattleScriptChargeSportControl::Jump { program_counter: ${value.programCounter} }`;
}
function rustBattlerState(value) {
  return `BattleScriptChargeSportVectorBattlerState { status3: ${rustU32(value.status3)}, charge_timer: ${rustU8(value.chargeTimer)}, charge_timer_start_value: ${rustU8(value.chargeTimerStartValue)} }`;
}
function rustState(value) {
  return [
    "BattleScriptChargeSportVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `current_move: ${rustU16(value.currentMove)},`,
    `multistring_chooser: ${rustU8(value.multistringChooser)},`,
    "}",
  ].join(" ");
}
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptChargeSportOperand { width_bytes: ${rustU8(width)}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedFailureExpression === null ? "None"
    : `Some(BattleScriptChargeSportResolvedLabel { expression: ${rustString(value.resolvedFailureExpression)}, program_counter: ${value.resolvedFailureProgramCounter} })`;
  return `BattleScriptChargeSportInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${rustU8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_failure_target: ${resolved} }`;
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalControl(value) { return value === null ? "None" : `Some(${rustControl(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptionalU8(value) { return value === null ? "None" : `Some(${rustU8(value)})`; }
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-chargesport-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptChargeSportOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_chargesport::{");
lines.push("    BattleScriptChargeSportBattler, BattleScriptChargeSportControl,");
lines.push("    BattleScriptChargeSportInstruction, BattleScriptChargeSportOperand,");
lines.push("    BattleScriptChargeSportResolvedLabel,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_CHARGESPORT_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_CHARGESPORT_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_CHARGESPORT_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_CHARGESPORT_VECTOR_GENERATOR_BYTES: usize = ${generator.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptChargeSportVectorBattlerState { pub status3: u32, pub charge_timer: u8, pub charge_timer_start_value: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptChargeSportVectorState { pub battlers: [BattleScriptChargeSportVectorBattlerState; 4], pub attacker: Option<BattleScriptChargeSportBattler>, pub current_move: u16, pub multistring_chooser: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptChargeSportVectorCase { pub opcode: &'static str, pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptChargeSportVectorState, pub instruction: BattleScriptChargeSportInstruction<'static>, pub expected: Option<BattleScriptChargeSportVectorState>, pub control: Option<BattleScriptChargeSportControl>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptChargeSportRegistrationVectorCase { pub label: &'static str, pub charge_instructions: &'static [BattleScriptChargeSportInstruction<'static>], pub sport_instructions: &'static [BattleScriptChargeSportInstruction<'static>], pub expected_charge_opcode_id: Option<u8>, pub expected_sport_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_CHARGESPORT_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_CHARGESPORT_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_CHARGESPORT_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_CHARGESPORT_OPCODE_CENSUS", opcodeCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_CHARGESPORT_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_CHARGESPORT_CASES: [BattleScriptChargeSportVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptChargeSportVectorCase {");
  lines.push(`        opcode: ${rustString(value.opcode)}, label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        control: ${rustOptionalControl(value.control)}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_CHARGESPORT_REGISTRATION_CASES: [BattleScriptChargeSportRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptChargeSportRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        charge_instructions: &[${value.chargeInstructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        sport_instructions: &[${value.sportInstructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_charge_opcode_id: ${rustOptionalU8(value.expectedChargeOpcodeId)}, expected_sport_opcode_id: ${rustOptionalU8(value.expectedSportOpcodeId)}, expected_error: ${rustOptionalString(value.expectedError)},`);
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
if (!formatted) throw new Error("gen-battle-script-chargesport-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
