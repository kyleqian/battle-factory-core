#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptOrwordOpcode.ts.
// Expected outputs, advance controls, direct-handler errors, and registration
// errors are produced only by executing the canonical TypeScript leaf. The
// bounded source/decomp/macro/program evidence below is separately read from
// the pinned reference tree.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-orword-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outputPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_orword_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, opcodeModule, rulesModule, constantsModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptOrwordOpcode.ts",
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

const OPCODE_NAME = "B_SCR_OP_ORWORD";
const OPCODE_ID = 0x35;
const DISPATCHER = "Cmd_orword";
const POINTER = "gHitMarker";
const BATTLE_SLOTS = 4;
const MAX_APPLICATIONS = 3;
const U8_EDGES = Object.freeze([0, 1, 0x80, 0xff]);
const U16_EDGES = Object.freeze([0, 1, 0x8000, 0xffff]);
const I32_EDGES = Object.freeze([-0x8000_0000, -1, 0, 0x7fff_ffff]);
const U32_EDGES = Object.freeze([0, 1, 0x8000_0000, 0xffff_ffff]);
const GENERATED_FILE_MAX_BYTES = 900_000;

const TERM_SPECS = Object.freeze([
  ["HITMARKER_IGNORE_BIDE", "BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE", 182],
  ["HITMARKER_IGNORE_SUBSTITUTE", "BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE", 185],
  ["HITMARKER_ATTACKSTRING_PRINTED", "BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED", 187],
  ["HITMARKER_NO_PPDEDUCT", "BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT", 188],
  ["HITMARKER_IGNORE_ON_AIR", "BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR", 193],
  ["HITMARKER_IGNORE_UNDERGROUND", "BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND", 194],
  ["HITMARKER_IGNORE_UNDERWATER", "BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER", 195],
  ["HITMARKER_PASSIVE_HP_UPDATE", "BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE", 197],
  ["HITMARKER_GRUDGE", "BATTLE_SCRIPT_HITMARKER_GRUDGE", 201],
  ["HITMARKER_ALLOW_NO_PP", "BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP", 200],
  ["HITMARKER_CHARGING", "BATTLE_SCRIPT_HITMARKER_CHARGING", 204],
].map(([expression, exportName, sourceLine]) => Object.freeze({
  expression,
  value: constantsModule[exportName] >>> 0,
  sourceLine,
})));
const TERM_BY_EXPRESSION = new Map(TERM_SPECS.map((term) => [term.expression, term.value]));

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-orword-vectors: " + message);
}

function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + value.toString(16).padStart(2, "0"); }
function hex16(value) { return "0x" + value.toString(16).padStart(4, "0"); }
function hex32(value) { return "0x" + (value >>> 0).toString(16).padStart(8, "0"); }
function rustString(value) { return JSON.stringify(value); }
function optionalU8(value) { return value === null ? "None" : `Some(${hex8(value)})`; }

function resolveExpression(expression) {
  let value = 0;
  for (const rawTerm of expression.split("|")) {
    const bit = TERM_BY_EXPRESSION.get(rawTerm.trim());
    if (bit === undefined) return null;
    value = (value | bit) >>> 0;
  }
  return value >>> 0;
}

function valueCategory(expression) {
  const terms = expression.split("|").length;
  if (terms === 1) return "single-term";
  if (terms === 2) return "compound-two-term";
  if (terms === 3) return "compound-three-term";
  if (terms === 4) return "compound-four-term";
  throw new Error("unsupported source term count " + terms + " for " + expression);
}

function makeProjection({ hitMarker, salt }) {
  assert(U32_EDGES.includes(hitMarker) || (Number.isInteger(hitMarker) && hitMarker >= 0
    && hitMarker <= 0xffff_ffff), "hitMarker must be u32");
  const battlers = freezeArray(Array.from({ length: BATTLE_SLOTS }, (_, battler) => Object.freeze({
    side: (salt + battler) & 1,
    ability: U8_EDGES[(salt + battler) % U8_EDGES.length],
    hp: U16_EDGES[(salt + battler + 1) % U16_EDGES.length],
    maxHP: U16_EDGES[(salt + battler + 2) % U16_EDGES.length],
    moves: freezeArray([57, 33, 45, 98]),
    pp: freezeArray(Array.from({ length: 4 }, (_, position) =>
      U8_EDGES[(salt + battler + position) % U8_EDGES.length])),
    status1: U32_EDGES[(salt + battler) % U32_EDGES.length],
    status2: U32_EDGES[(salt + battler + 1) % U32_EDGES.length],
    status3: U32_EDGES[(salt + battler + 2) % U32_EDGES.length],
    item: U16_EDGES[(salt + battler + 3) % U16_EDGES.length],
    statStages: freezeArray([-6 + ((salt + battler) % 13), 6, -1, 0, 1, 2, 3, 4]),
    partyIndex: (salt + battler) % 6,
  })));
  return Object.freeze({
    battlers,
    attacker: salt % 5 === 4 ? null : salt % BATTLE_SLOTS,
    target: (salt + 1) % BATTLE_SLOTS,
    effectBattler: (salt + 2) % BATTLE_SLOTS,
    fainted: salt % 3 === 0 ? null : (salt + 3) % BATTLE_SLOTS,
    siblings: Object.freeze({
      scriptingBattler: salt % BATTLE_SLOTS,
      battlerWithAbility: (salt + 1) % BATTLE_SLOTS,
      atkCancelerTracker: U8_EDGES[salt % U8_EDGES.length],
      battleOutcome: U8_EDGES[(salt + 1) % U8_EDGES.length],
      currentMove: 57,
      currentMovePosition: salt & 3,
      moveResultFlags: U8_EDGES[(salt + 2) % U8_EDGES.length],
      dmgMultiplier: U8_EDGES[(salt + 3) % U8_EDGES.length],
      critMultiplier: U8_EDGES[salt % U8_EDGES.length],
      moveEffectByte: U8_EDGES[(salt + 1) % U8_EDGES.length],
      missType: U8_EDGES[(salt + 2) % U8_EDGES.length],
      multiHitCounter: U8_EDGES[(salt + 3) % U8_EDGES.length],
      battleMoveDamage: I32_EDGES[salt % I32_EDGES.length],
      painSplitHp: I32_EDGES[(salt + 1) % I32_EDGES.length],
      bideDmg: freezeArray(Array.from({ length: BATTLE_SLOTS }, (_, index) =>
        I32_EDGES[(salt + index) % I32_EDGES.length])),
      lockedMoves: freezeArray(Array.from({ length: BATTLE_SLOTS }, (_, index) =>
        U16_EDGES[(salt + index) % U16_EDGES.length])),
      chosenMovePositions: freezeArray(Array.from({ length: BATTLE_SLOTS }, (_, index) =>
        (salt + index) & 3)),
      sideStatuses: freezeArray([
        U32_EDGES[salt % U32_EDGES.length],
        U32_EDGES[(salt + 1) % U32_EDGES.length],
      ]),
      weather: U32_EDGES[(salt + 2) % U32_EDGES.length],
      weatherTimer: U8_EDGES[(salt + 3) % U8_EDGES.length],
      randomTurnNumber: U16_EDGES[salt % U16_EDGES.length],
    }),
    hitMarker: hitMarker >>> 0,
  });
}

function canonicalBattler(value) {
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: value.hp,
    maxHP: value.maxHP,
    moves: value.moves,
    pp: value.pp,
    status1: value.status1,
    status2: value.status2,
    status3: value.status3,
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
    item: value.item,
    statStages: value.statStages,
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 1,
    attack: 50,
    defense: 51,
    speed: 52,
    spAttack: 53,
    spDefense: 54,
    level: 50,
    friendship: 70,
    partyIndex: value.partyIndex,
  });
}

function canonicalRules(value) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: value.battlers.map(canonicalBattler),
    selectorRoles: Object.freeze({
      attacker: value.attacker,
      target: value.target,
      effectBattler: value.effectBattler,
      fainted: value.fainted,
    }),
    scriptingBattler: value.siblings.scriptingBattler,
    battlerWithAbility: value.siblings.battlerWithAbility,
    atkCancelerTracker: value.siblings.atkCancelerTracker,
    battleOutcome: value.siblings.battleOutcome,
    currentMove: value.siblings.currentMove,
    currentMovePosition: value.siblings.currentMovePosition,
    moveResultFlags: value.siblings.moveResultFlags,
    dmgMultiplier: value.siblings.dmgMultiplier,
    critMultiplier: value.siblings.critMultiplier,
    moveEffectByte: value.siblings.moveEffectByte,
    missType: value.siblings.missType,
    hitMarker: value.hitMarker,
    multiHitCounter: value.siblings.multiHitCounter,
    battleMoveDamage: value.siblings.battleMoveDamage,
    painSplitHp: value.siblings.painSplitHp,
    bideDmg: value.siblings.bideDmg,
    lockedMoves: value.siblings.lockedMoves,
    chosenMovePositions: value.siblings.chosenMovePositions,
    sideStatuses: value.siblings.sideStatuses,
    weather: value.siblings.weather,
    weatherTimer: value.siblings.weatherTimer,
    randomTurnNumber: value.siblings.randomTurnNumber,
  });
}

function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map((battler) => Object.freeze({
      side: battler.side,
      ability: battler.ability,
      hp: battler.hp,
      maxHP: battler.maxHP,
      moves: freezeArray(battler.moves),
      pp: freezeArray(battler.pp),
      status1: battler.status1 >>> 0,
      status2: battler.status2 >>> 0,
      status3: battler.status3 >>> 0,
      item: battler.item,
      statStages: freezeArray(battler.statStages),
      partyIndex: battler.partyIndex,
    }))),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    siblings: Object.freeze({
      scriptingBattler: rules.scriptingBattler,
      battlerWithAbility: rules.battlerWithAbility,
      atkCancelerTracker: rules.atkCancelerTracker,
      battleOutcome: rules.battleOutcome,
      currentMove: rules.currentMove,
      currentMovePosition: rules.currentMovePosition,
      moveResultFlags: rules.moveResultFlags,
      dmgMultiplier: rules.dmgMultiplier,
      critMultiplier: rules.critMultiplier,
      moveEffectByte: rules.moveEffectByte,
      missType: rules.missType,
      multiHitCounter: rules.multiHitCounter,
      battleMoveDamage: rules.battleMoveDamage,
      painSplitHp: rules.painSplitHp,
      bideDmg: freezeArray(rules.bideDmg),
      lockedMoves: freezeArray(rules.lockedMoves),
      chosenMovePositions: freezeArray(rules.chosenMovePositions),
      sideStatuses: freezeArray(rules.sideStatuses),
      weather: rules.weather >>> 0,
      weatherTimer: rules.weatherTimer,
      randomTurnNumber: rules.randomTurnNumber,
    }),
    hitMarker: rules.hitMarker >>> 0,
  });
}

function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = freezeArray(
  program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME),
);
assert(canonicalInstructions.length === 43,
  "canonical B_SCR_OP_ORWORD start count drifted to " + canonicalInstructions.length);
assert(canonicalInstructions.every((instruction) => instruction.opcodeId === OPCODE_ID),
  "canonical opcode id drifted");
assert(canonicalInstructions.every((instruction) => instruction.dispatcher === DISPATCHER),
  "canonical dispatcher drifted");
assert(canonicalInstructions.every((instruction) => instruction.operands.length === 2
  && instruction.operands[0]?.widthBytes === 4 && instruction.operands[1]?.widthBytes === 4
  && instruction.operands[0]?.expression === POINTER),
"canonical pointer/value shape drifted");
assert(canonicalInstructions[0]?.programCounter === 2,
  "first source start/program counter drifted");

const handlers = opcodeModule.createBattleScriptOrwordOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical handler was not registered at 0x35");

function syntheticInstruction(spec) {
  const template = canonicalInstructions[0];
  return Object.freeze({
    ...template,
    opcodeName: spec.opcodeName ?? OPCODE_NAME,
    programCounter: spec.programCounter ?? template.programCounter,
    opcodeId: spec.opcodeId ?? OPCODE_ID,
    dispatcher: spec.dispatcher ?? DISPATCHER,
    operands: freezeArray((spec.operands ?? template.operands).map((operand, index) => Object.freeze({
      ...(template.operands[index] ?? template.operands[0]),
      widthBytes: operand.widthBytes,
      expression: operand.expression,
    }))),
  });
}

function instructionSpec(instruction) {
  return Object.freeze({
    opcodeName: instruction.opcodeName,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher,
    operands: freezeArray(instruction.operands.map((operand) => Object.freeze({
      widthBytes: operand.widthBytes,
      expression: operand.expression,
    }))),
  });
}

function invoke(instruction, projection, applications = 1) {
  const initialRules = canonicalRules(projection);
  const initialSnapshot = projectRules(initialRules);
  let currentRules = initialRules;
  const controls = [];
  let error = null;
  for (let application = 0; application < applications; application += 1) {
    const before = projectRules(currentRules);
    const machine = machineModule.createBattleScriptMachine(
      program,
      "BattleScript_EffectHit",
      currentRules,
      (0x0bad_f000 + application) >>> 0,
    );
    const state = Object.freeze({ ...machine, programCounter: instruction.programCounter });
    try {
      const transition = handler({ program, instruction, state });
      assert(transition.control.kind === "advance", "canonical handler did not advance");
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted an event");
      assert(same(projectRules(currentRules), before), "canonical handler mutated input rules");
      controls.push("Advance");
      currentRules = transition.rulesContext;
    } catch (caught) {
      assert(caught instanceof Error, "canonical handler threw non-Error");
      error = caught.message;
      break;
    }
  }
  assert(same(projectRules(initialRules), initialSnapshot), "canonical handler mutated initial rules");
  return Object.freeze({
    expectedRules: error === null ? projectRules(currentRules) : null,
    controls: freezeArray(controls),
    expectedError: error,
  });
}

function branchFor(outcome) {
  return outcome.expectedError === null ? "advance" : "validated-undecodable";
}

const cases = [];
function addCase(label, category, instruction, projection, applications = 1) {
  assert(!cases.some((entry) => entry.label === label), "duplicate behavior label " + label);
  const outcome = invoke(instruction, projection, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    instruction: instructionSpec(instruction),
    initial: projectRules(canonicalRules(projection)),
    expectedRules: outcome.expectedRules,
    controls: outcome.controls,
    expectedError: outcome.expectedError,
  }));
}

let salt = 0;
for (const instruction of canonicalInstructions) {
  addCase(
    "canonical_site_pc_" + instruction.programCounter,
    "canonical-" + valueCategory(instruction.operands[1].expression),
    instruction,
    makeProjection({ hitMarker: U32_EDGES[salt % U32_EDGES.length], salt: salt++ }),
  );
}

for (const term of TERM_SPECS) {
  addCase(
    "named_term_" + term.expression.toLowerCase().replace("hitmarker_", ""),
    "named-term-parser",
    syntheticInstruction({ operands: [
      { widthBytes: 4, expression: POINTER },
      { widthBytes: 4, expression: term.expression },
    ], programCounter: 0x9000 + salt }),
    makeProjection({ hitMarker: U32_EDGES[salt % U32_EDGES.length], salt: salt++ }),
  );
}

const FULL_COMPOUND = "HITMARKER_IGNORE_BIDE | HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE | HITMARKER_GRUDGE";
const WHITESPACE_COMPOUND = "  HITMARKER_CHARGING | HITMARKER_IGNORE_BIDE | HITMARKER_CHARGING  ";
for (const [label, expression] of [
  ["compound_source_four_terms", FULL_COMPOUND],
  ["compound_trim_and_duplicate_term", WHITESPACE_COMPOUND],
]) {
  addCase(label, "compound-expression-parser", syntheticInstruction({
    operands: [{ widthBytes: 4, expression: POINTER }, { widthBytes: 4, expression }],
    programCounter: 0x9100 + salt,
  }), makeProjection({ hitMarker: U32_EDGES[salt % U32_EDGES.length], salt: salt++ }));
}

for (const marker of U32_EDGES) {
  addCase(
    "prior_hit_marker_" + hex32(marker),
    "prior-hit-marker-u32-edge",
    syntheticInstruction({
      operands: [{ widthBytes: 4, expression: POINTER }, { widthBytes: 4, expression: FULL_COMPOUND }],
      programCounter: 0x9200 + salt,
    }),
    makeProjection({ hitMarker: marker, salt: salt++ }),
  );
}

for (const [label, expression] of [
  ["unknown_single_term", "HITMARKER_NOT_A_REAL_FLAG"],
  ["unknown_compound_tail", "HITMARKER_IGNORE_BIDE | HITMARKER_NOT_A_REAL_FLAG"],
  ["empty_expression", ""],
  ["empty_compound_term", "HITMARKER_IGNORE_BIDE || HITMARKER_GRUDGE"],
]) {
  addCase(label, "unknown-expression-direct-handler", syntheticInstruction({
    operands: [{ widthBytes: 4, expression: POINTER }, { widthBytes: 4, expression }],
    programCounter: 0x9300 + salt,
  }), makeProjection({ hitMarker: U32_EDGES[salt % U32_EDGES.length], salt: salt++ }));
}

addCase(
  "repeat_four_term_compound_is_idempotent",
  "repetitions",
  canonicalInstructions.find((instruction) => instruction.operands[1].expression === FULL_COMPOUND),
  makeProjection({ hitMarker: 0x8000_0001, salt: salt++ }),
  3,
);
addCase(
  "repeat_charging_is_idempotent",
  "repetitions",
  canonicalInstructions.find((instruction) => instruction.operands[1].expression === "HITMARKER_CHARGING"),
  makeProjection({ hitMarker: 0xffff_ffff, salt: salt++ }),
  3,
);

assert(cases.every((entry) => entry.instruction !== undefined), "missing behavior instruction");
assert(cases.length === 66, "behavior case count drifted to " + cases.length);
const observedTerms = new Set(canonicalInstructions.flatMap((instruction) =>
  instruction.operands[1].expression.split("|").map((term) => term.trim())));
assert(observedTerms.size === TERM_SPECS.length
  && TERM_SPECS.every((term) => observedTerms.has(term.expression)),
"canonical sites no longer span every named hitmarker term");

const canonicalSpecs = freezeArray(canonicalInstructions.map(instructionSpec));
function cloneSpec(base, overrides = {}) {
  return Object.freeze({
    opcodeName: overrides.opcodeName ?? base.opcodeName,
    programCounter: overrides.programCounter ?? base.programCounter,
    opcodeId: overrides.opcodeId ?? base.opcodeId,
    dispatcher: overrides.dispatcher ?? base.dispatcher,
    operands: freezeArray((overrides.operands ?? base.operands).map((operand) => Object.freeze({
      widthBytes: operand.widthBytes,
      expression: operand.expression,
    }))),
  });
}
function registrationProgram(specs) {
  return Object.freeze({ ...program, instructions: freezeArray(specs.map(syntheticInstruction)) });
}
function registrationOutcome(specs) {
  try {
    const registered = opcodeModule.createBattleScriptOrwordOpcodeHandlers(registrationProgram(specs));
    return Object.freeze({ bindings: freezeArray(Object.keys(registered).map(Number)), error: null });
  } catch (caught) {
    assert(caught instanceof Error, "registration threw non-Error");
    return Object.freeze({ bindings: freezeArray([]), error: caught.message });
  }
}
const registrationCases = [];
function addRegistrationCase(label, specs) {
  const frozen = freezeArray(specs.map((spec) => cloneSpec(spec)));
  const result = registrationOutcome(frozen);
  registrationCases.push(Object.freeze({
    label,
    instructions: frozen,
    expectedBindings: result.bindings,
    expectedError: result.error,
  }));
}
const noise = cloneSpec(canonicalSpecs[0], { opcodeName: "B_SCR_OP_SETBYTE", opcodeId: 0x2e });
const canonicalWith = (changes) => canonicalSpecs.map((spec, index) => changes.get(index) ?? spec);
addRegistrationCase("canonical_all_43", canonicalSpecs);
addRegistrationCase("noise_before_canonical", [noise, ...canonicalSpecs]);
addRegistrationCase("first_opcode_id_becomes_binding", canonicalWith(new Map([[0,
  cloneSpec(canonicalSpecs[0], { opcodeId: 0xaa })]])));
addRegistrationCase("later_opcode_id_is_ignored", canonicalWith(new Map([[1,
  cloneSpec(canonicalSpecs[1], { opcodeId: 0xab })]])));
addRegistrationCase("dispatcher_is_not_registration_validated", canonicalWith(new Map([[0,
  cloneSpec(canonicalSpecs[0], { dispatcher: "Cmd_setbyte" })]])));
addRegistrationCase("wrong_cardinality_42", canonicalSpecs.slice(0, 42));
addRegistrationCase("wrong_cardinality_44", [...canonicalSpecs, canonicalSpecs[0]]);
addRegistrationCase("wrong_cardinality_zero", [noise]);
addRegistrationCase("missing_operand_first", canonicalWith(new Map([[0, cloneSpec(canonicalSpecs[0], {
  programCounter: 0x1001, operands: [],
})]])));
addRegistrationCase("extra_operand_first", canonicalWith(new Map([[0, cloneSpec(canonicalSpecs[0], {
  programCounter: 0x1002, operands: [...canonicalSpecs[0].operands, canonicalSpecs[1].operands[1]],
})]])));
addRegistrationCase("wrong_pointer_width_first", canonicalWith(new Map([[0, cloneSpec(canonicalSpecs[0], {
  programCounter: 0x1003, operands: [{ widthBytes: 2, expression: POINTER }, canonicalSpecs[0].operands[1]],
})]])));
addRegistrationCase("wrong_value_width_first", canonicalWith(new Map([[0, cloneSpec(canonicalSpecs[0], {
  programCounter: 0x1004, operands: [canonicalSpecs[0].operands[0], { widthBytes: 2, expression: canonicalSpecs[0].operands[1].expression }],
})]])));
addRegistrationCase("unknown_pointer_first", canonicalWith(new Map([[0, cloneSpec(canonicalSpecs[0], {
  programCounter: 0x1005, operands: [{ widthBytes: 4, expression: "gBattleOutcome" }, canonicalSpecs[0].operands[1]],
})]])));
addRegistrationCase("unknown_value_first", canonicalWith(new Map([[0, cloneSpec(canonicalSpecs[0], {
  programCounter: 0x1006, operands: [canonicalSpecs[0].operands[0], { widthBytes: 4, expression: "HITMARKER_NOT_A_REAL_FLAG" }],
})]])));
addRegistrationCase("ordered_shape_before_pointer", canonicalWith(new Map([
  [0, cloneSpec(canonicalSpecs[0], { programCounter: 0x1101, operands: [] })],
  [1, cloneSpec(canonicalSpecs[1], { programCounter: 0x1102, operands: [{ widthBytes: 4, expression: "gBattleOutcome" }, canonicalSpecs[1].operands[1]] })],
])));
addRegistrationCase("ordered_pointer_before_value", canonicalWith(new Map([
  [0, cloneSpec(canonicalSpecs[0], { programCounter: 0x1201, operands: [{ widthBytes: 4, expression: "gBattleOutcome" }, canonicalSpecs[0].operands[1]] })],
  [1, cloneSpec(canonicalSpecs[1], { programCounter: 0x1202, operands: [canonicalSpecs[1].operands[0], { widthBytes: 4, expression: "HITMARKER_NOT_A_REAL_FLAG" }] })],
])));
addRegistrationCase("ordered_value_before_later_shape", canonicalWith(new Map([
  [0, cloneSpec(canonicalSpecs[0], { programCounter: 0x1301, operands: [canonicalSpecs[0].operands[0], { widthBytes: 4, expression: "HITMARKER_NOT_A_REAL_FLAG" }] })],
  [1, cloneSpec(canonicalSpecs[1], { programCounter: 0x1302, operands: [] })],
])));
addRegistrationCase("later_shape_after_valid_first", canonicalWith(new Map([[1,
  cloneSpec(canonicalSpecs[1], { programCounter: 0x1402, operands: [] })]])));

function registrationBranch(entry) {
  if (entry.expectedError === null) return "registered";
  if (entry.expectedError.startsWith("B_SCR_OP_ORWORD requires all 43")) return "wrong-cardinality";
  if (entry.expectedError.startsWith("invalid B_SCR_OP_ORWORD shape")) return "invalid-shape";
  if (entry.expectedError.startsWith("unknown B_SCR_OP_ORWORD pointer")) return "unknown-pointer";
  if (entry.expectedError.startsWith("unknown B_SCR_OP_ORWORD value")) return "unknown-value";
  throw new Error("unclassified registration error " + entry.expectedError);
}
assert(registrationCases.length === 18,
  "registration case count drifted to " + registrationCases.length);

function sourceLine(source, number) {
  const result = source.split("\n")[number - 1];
  assert(result !== undefined, "missing source line " + number);
  return result;
}
const commandSource = fs.readFileSync(path.join(
  workspaceRoot, "reference", "pokeemerald", "src", "battle_script_commands.c"), "utf8");
const commandIdSource = fs.readFileSync(path.join(
  workspaceRoot, "reference", "pokeemerald", "include", "constants", "battle_script_commands.h"), "utf8");
const macroSource = fs.readFileSync(path.join(
  workspaceRoot, "reference", "pokeemerald", "asm", "macros", "battle_script.inc"), "utf8");
const scriptSource = fs.readFileSync(path.join(
  workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s"), "utf8");
const battleConstants = fs.readFileSync(path.join(
  workspaceRoot, "reference", "pokeemerald", "include", "constants", "battle.h"), "utf8");
assert(sourceLine(commandIdSource, 59).trim() === "B_SCR_OP_ORWORD,", "opcode enum drifted");
assert(sourceLine(commandSource, 384).includes("[B_SCR_OP_ORWORD]                          = Cmd_orword"),
  "dispatch source drifted");
assert(sourceLine(commandSource, 3880) === "static void Cmd_orword(void)", "handler source drifted");
assert(sourceLine(commandSource, 3882).trim() === "u32 *memWord = T2_READ_PTR(gBattlescriptCurrInstr + 1);",
  "pointer read drifted");
assert(sourceLine(commandSource, 3883).trim() === "u32 val = T2_READ_32(gBattlescriptCurrInstr + 5);",
  "value read drifted");
assert(sourceLine(commandSource, 3885).trim() === "*memWord |= val;", "OR write drifted");
assert(sourceLine(commandSource, 3886).trim() === "gBattlescriptCurrInstr += 9;", "advance drifted");
assert(sourceLine(macroSource, 302).trim() === ".macro orword ptr:req, word:req", "macro name drifted");
assert(sourceLine(macroSource, 303).trim() === ".byte B_SCR_OP_ORWORD", "macro opcode drifted");
assert(sourceLine(macroSource, 304).trim() === ".4byte \\ptr", "macro pointer drifted");
assert(sourceLine(macroSource, 305).trim() === ".4byte \\word", "macro value drifted");
for (const term of TERM_SPECS) {
  assert(sourceLine(battleConstants, term.sourceLine).trim().startsWith("#define " + term.expression),
    "term source drifted for " + term.expression);
}
assert((scriptSource.match(/^\torword gHitMarker, /gm) ?? []).length === 43,
  "source program orword count drifted");

const callSiteEvidence = freezeArray(canonicalInstructions.map((instruction) => {
  const [pointer, value] = instruction.operands;
  const entry = programModule.resolveBattleScriptLabel(program, instruction.source.label);
  const resolvedValue = resolveExpression(value.expression);
  assert(entry !== undefined && resolvedValue !== null, "unresolved canonical call site");
  assert(sourceLine(scriptSource, instruction.source.statementLine).trim()
    === "orword gHitMarker, " + value.expression,
  "source program site drifted at " + instruction.source.statementLine);
  return Object.freeze({
    entryLabel: instruction.source.label,
    entryLabelLine: instruction.source.labelLine,
    entryProgramCounter: entry.programCounter,
    statementLine: instruction.source.statementLine,
    invocationMnemonic: instruction.source.invocationMnemonic,
    invocationMacroLine: instruction.source.invocationMacroLine,
    sourceMacro: instruction.source.sourceMacro,
    opcodeMacroLine: instruction.source.sourceMacroLine,
    pointerMacroLine: pointer.sourceMacroLine,
    valueMacroLine: value.sourceMacroLine,
    pointerExpression: pointer.expression,
    valueExpression: value.expression,
    resolvedValue,
    instructionProgramCounter: instruction.programCounter,
    encodedWidthBytes: 1 + pointer.widthBytes + value.widthBytes,
  });
}));

function census(values, property) {
  const counts = new Map();
  for (const value of values) counts.set(value[property], (counts.get(value[property]) ?? 0) + 1);
  return freezeArray([...counts.entries()]);
}
const categoryCensus = census(cases, "category");
const branchCensus = census(cases, "branch");
const registrationBranchCensus = census(
  registrationCases.map((entry) => Object.freeze({ branch: registrationBranch(entry) })), "branch");
const valueCategoryCensus = census(
  canonicalInstructions.map((instruction) => Object.freeze({
    category: valueCategory(instruction.operands[1].expression),
  })), "category");
const termUseCensus = freezeArray(TERM_SPECS.map((term) => [term.expression,
  canonicalInstructions.filter((instruction) => instruction.operands[1].expression
    .split("|").map((part) => part.trim()).includes(term.expression)).length]));
const domainCensus = freezeArray([
  ["concrete-starts", canonicalInstructions.length],
  ["named-hitmarker-terms", TERM_SPECS.length],
  ["u8-edge-values", U8_EDGES.length],
  ["u16-edge-values", U16_EDGES.length],
  ["i32-edge-values", I32_EDGES.length],
  ["u32-edge-values", U32_EDGES.length],
  ["application-count-values", MAX_APPLICATIONS],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  terms: TERM_SPECS,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  valueCategoryCensus,
  termUseCensus,
  callSiteEvidence,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

function rustBattler(value) {
  return `BattleScriptOrwordBattlerState { side: ${hex8(value.side)}, ability: ${hex8(value.ability)}, hp: ${hex16(value.hp)}, max_hp: ${hex16(value.maxHP)}, moves: [${value.moves.map(hex16).join(", ")}], pp: [${value.pp.map(hex8).join(", ")}], status1: ${hex32(value.status1)}, status2: ${hex32(value.status2)}, status3: ${hex32(value.status3)}, item: ${hex16(value.item)}, stat_stages: [${value.statStages.join(", ")}], party_index: ${hex8(value.partyIndex)} }`;
}
function rustRoles(value) {
  return `BattleScriptOrwordRoles { attacker: ${optionalU8(value.attacker)}, target: ${optionalU8(value.target)}, effect_battler: ${optionalU8(value.effectBattler)}, fainted: ${optionalU8(value.fainted)} }`;
}
function rustSiblings(value) {
  return `BattleScriptOrwordSiblings { scripting_battler: ${hex8(value.scriptingBattler)}, battler_with_ability: ${hex8(value.battlerWithAbility)}, atk_canceler_tracker: ${hex8(value.atkCancelerTracker)}, battle_outcome: ${hex8(value.battleOutcome)}, current_move: ${hex16(value.currentMove)}, current_move_position: ${hex8(value.currentMovePosition)}, move_result_flags: ${hex8(value.moveResultFlags)}, dmg_multiplier: ${hex8(value.dmgMultiplier)}, crit_multiplier: ${hex8(value.critMultiplier)}, move_effect_byte: ${hex8(value.moveEffectByte)}, miss_type: ${hex8(value.missType)}, multi_hit_counter: ${hex8(value.multiHitCounter)}, battle_move_damage: ${value.battleMoveDamage}, pain_split_hp: ${value.painSplitHp}, bide_dmg: [${value.bideDmg.join(", ")}], locked_moves: [${value.lockedMoves.map(hex16).join(", ")}], chosen_move_positions: [${value.chosenMovePositions.map(hex8).join(", ")}], side_statuses: [${value.sideStatuses.map(hex32).join(", ")}], weather: ${hex32(value.weather)}, weather_timer: ${hex8(value.weatherTimer)}, random_turn_number: ${hex16(value.randomTurnNumber)} }`;
}
function rustRules(value) {
  return `BattleScriptOrwordRules { battlers: [${value.battlers.map(rustBattler).join(", ")}], selector_roles: ${rustRoles(value)}, siblings: ${rustSiblings(value.siblings)}, hit_marker: ${hex32(value.hitMarker)} }`;
}
function rustOperand(value) {
  return `BattleScriptOrwordOperand { width_bytes: ${value.widthBytes}, expression: ${rustString(value.expression)} }`;
}
function rustInstruction(value) {
  return `BattleScriptOrwordVectorInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${hex8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${value.operands.map(rustOperand).join(", ")}] }`;
}
function rustOptionalRules(value) { return value === null ? "None" : `Some(${rustRules(value)})`; }
function rustOptionalError(value) { return value === null ? "None" : `Some(${rustString(value)})`; }

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-orword-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptOrwordOpcode.ts via Node.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-orword-vectors.mjs.");
lines.push("");
lines.push("use crate::battle_script_orword::*;");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptOrwordVectorInstruction {");
lines.push("    pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str, pub operands: &'static [BattleScriptOrwordOperand<'static>],");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptOrwordVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub applications: u8,");
lines.push("    pub instruction: BattleScriptOrwordVectorInstruction, pub initial_rules: BattleScriptOrwordRules,");
lines.push("    pub expected_rules: Option<BattleScriptOrwordRules>,");
lines.push(`    pub controls: [Option<BattleScriptOrwordControl>; ${MAX_APPLICATIONS}], pub expected_error: Option<&'static str>,`);
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptOrwordRegistrationVectorCase {");
lines.push("    pub label: &'static str, pub instructions: &'static [BattleScriptOrwordVectorInstruction],");
lines.push("    pub expected_bindings: &'static [u8], pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptOrwordTermEvidence { pub expression: &'static str, pub value: u32, pub source_line: u16 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptOrwordCallSiteEvidence {");
lines.push("    pub entry_label: &'static str, pub entry_label_line: u16, pub entry_program_counter: u32, pub statement_line: u16,");
lines.push("    pub invocation_mnemonic: &'static str, pub invocation_macro_line: u16, pub source_macro: &'static str,");
lines.push("    pub opcode_macro_line: u16, pub pointer_macro_line: u16, pub value_macro_line: u16,");
lines.push("    pub pointer_expression: &'static str, pub value_expression: &'static str, pub resolved_value: u32,");
lines.push("    pub instruction_program_counter: u32, pub encoded_width_bytes: u8,");
lines.push("}");
lines.push(`pub const BATTLE_SCRIPT_ORWORD_U32_EDGE_DOMAIN: [u32; ${U32_EDGES.length}] = [${U32_EDGES.map(hex32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ORWORD_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([name, count]) => `(${rustString(name)}, ${count})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ORWORD_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([name, count]) => `(${rustString(name)}, ${count})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ORWORD_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [${branchCensus.map(([name, count]) => `(${rustString(name)}, ${count})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ORWORD_REGISTRATION_BRANCH_CENSUS: [(&str, usize); ${registrationBranchCensus.length}] = [${registrationBranchCensus.map(([name, count]) => `(${rustString(name)}, ${count})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ORWORD_VALUE_CATEGORY_CENSUS: [(&str, usize); ${valueCategoryCensus.length}] = [${valueCategoryCensus.map(([name, count]) => `(${rustString(name)}, ${count})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ORWORD_TERM_USE_CENSUS: [(&str, usize); ${termUseCensus.length}] = [${termUseCensus.map(([name, count]) => `(${rustString(name)}, ${count})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ORWORD_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_ORWORD_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_ORWORD_TERM_EVIDENCE: [BattleScriptOrwordTermEvidence; ${TERM_SPECS.length}] = [`);
for (const term of TERM_SPECS) lines.push(`    BattleScriptOrwordTermEvidence { expression: ${rustString(term.expression)}, value: ${hex32(term.value)}, source_line: ${term.sourceLine} },`);
lines.push("];" );
lines.push(`pub const BATTLE_SCRIPT_ORWORD_CALL_SITE_EVIDENCE: [BattleScriptOrwordCallSiteEvidence; ${callSiteEvidence.length}] = [`);
for (const site of callSiteEvidence) lines.push(`    BattleScriptOrwordCallSiteEvidence { entry_label: ${rustString(site.entryLabel)}, entry_label_line: ${site.entryLabelLine}, entry_program_counter: ${site.entryProgramCounter}, statement_line: ${site.statementLine}, invocation_mnemonic: ${rustString(site.invocationMnemonic)}, invocation_macro_line: ${site.invocationMacroLine}, source_macro: ${rustString(site.sourceMacro)}, opcode_macro_line: ${site.opcodeMacroLine}, pointer_macro_line: ${site.pointerMacroLine}, value_macro_line: ${site.valueMacroLine}, pointer_expression: ${rustString(site.pointerExpression)}, value_expression: ${rustString(site.valueExpression)}, resolved_value: ${hex32(site.resolvedValue)}, instruction_program_counter: ${site.instructionProgramCounter}, encoded_width_bytes: ${site.encodedWidthBytes} },`);
lines.push("];" );
lines.push(`pub static BATTLE_SCRIPT_ORWORD_CASES: [BattleScriptOrwordVectorCase; ${cases.length}] = [`);
for (const entry of cases) {
  const controls = entry.controls.map((control) => `Some(BattleScriptOrwordControl::${control})`);
  while (controls.length < MAX_APPLICATIONS) controls.push("None");
  lines.push("    BattleScriptOrwordVectorCase {");
  lines.push(`        label: ${rustString(entry.label)}, category: ${rustString(entry.category)}, branch: ${rustString(entry.branch)}, applications: ${entry.applications},`);
  lines.push(`        instruction: ${rustInstruction(entry.instruction)},`);
  lines.push(`        initial_rules: ${rustRules(entry.initial)}, expected_rules: ${rustOptionalRules(entry.expectedRules)},`);
  lines.push(`        controls: [${controls.join(", ")}], expected_error: ${rustOptionalError(entry.expectedError)},`);
  lines.push("    },");
}
lines.push("];" );
lines.push(`pub static BATTLE_SCRIPT_ORWORD_REGISTRATION_CASES: [BattleScriptOrwordRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const entry of registrationCases) {
  lines.push("    BattleScriptOrwordRegistrationVectorCase {");
  lines.push(`        label: ${rustString(entry.label)}, instructions: &[${entry.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_bindings: &[${entry.expectedBindings.map(hex8).join(", ")}], expected_error: ${rustOptionalError(entry.expectedError)},`);
  lines.push("    },");
}
lines.push("];" );

fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf8");
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains",
  "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outputPath],
      { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-orword-vectors: could not find rustfmt");
const generated = fs.readFileSync(outputPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES,
  `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`gen-battle-script-orword-vectors: wrote ${path.relative(workspaceRoot, outputPath)}`);
console.log(`gen-battle-script-orword-vectors: ${cases.length} behavior cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-orword-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-orword-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-orword-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
