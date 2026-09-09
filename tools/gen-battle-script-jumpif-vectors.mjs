#!/usr/bin/env node
// Canonical TypeScript differential corpus for the jumpifbyte/jumpifhalfword/
// jumpifword compare-and-jump family (M74).
// Run from any cwd with:
// node --experimental-strip-types core-rs/tools/gen-battle-script-jumpif-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const outputPath = path.join(workspaceRoot, "core-rs/crates/factory-core/src/battle_script_jumpif_vectors_gen.rs");
const catalogOutputPath = path.join(workspaceRoot, "core-rs/crates/factory-core/src/battle_script_jumpif_catalog_gen.rs");

const [programModule, machineModule, byteModule, hwordModule, wordModule, rulesModule, setByteModule] =
  await Promise.all([
    import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptProgram.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptMachine.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptJumpifbyteOpcode.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptJumpifhalfwordOpcode.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptJumpifwordOpcode.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptRulesContext.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptSetByte.ts")).href),
  ]);
const movesJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "src/data/gen/moves.json"), "utf8"));

const assert = (condition, message) => {
  if (!condition) throw new Error(`jumpif generator: ${message}`);
};
const frozen = (values) => Object.freeze(values.slice());

const OPCODES = Object.freeze({
  byte: Object.freeze({
    name: "B_SCR_OP_JUMPIFBYTE",
    id: 0x29,
    dispatcher: "Cmd_jumpifbyte",
    valueWidth: 1,
    createHandlers: byteModule.createBattleScriptJumpifbyteOpcodeHandlers,
    pointerField: (expr) => ({
      cMULTISTRING_CHOOSER: "multistringChooser",
      gMoveResultFlags: "moveResultFlags",
      gBattleCommunication: "battleCommunication0",
      "gBattleCommunication + 1": "battleCommunication1",
      gBattleOutcome: "battleOutcome",
      cMISS_TYPE: "missType",
      gCritMultiplier: "critMultiplier",
      sB_ANIM_TURN: "animTurn",
      "sMULTIHIT_STRING + 4": "multiHitStringCounter",
    })[expr] ?? null,
    resolveValue: (expr) => setByteModule.resolveBattleScriptSetByteValue(expr),
    fieldMax: 0xff,
  }),
  halfword: Object.freeze({
    name: "B_SCR_OP_JUMPIFHALFWORD",
    id: 0x2a,
    dispatcher: "Cmd_jumpifhalfword",
    valueWidth: 2,
    createHandlers: hwordModule.createBattleScriptJumpifhalfwordOpcodeHandlers,
    pointerField: (expr) => ({
      gCurrentMove: "currentMove",
      gChosenMove: "chosenMove",
      gBattleWeather: "weather",
    })[expr] ?? null,
    resolveValue: (expr) => {
      const move = movesJson.moves.find((row) => row.move === expr);
      if (move) return move.id;
      if (expr === "B_WEATHER_SUN") return (1 << 5) | (1 << 6);
      return null;
    },
    fieldMax: 0xffff,
  }),
  word: Object.freeze({
    name: "B_SCR_OP_JUMPIFWORD",
    id: 0x2b,
    dispatcher: "Cmd_jumpifword",
    valueWidth: 4,
    createHandlers: wordModule.createBattleScriptJumpifwordOpcodeHandlers,
    pointerField: (expr) => ({
      gBattleTypeFlags: "battleTypeFlags",
      gHitMarker: "hitMarker",
      gBattleMoveDamage: "battleMoveDamage",
    })[expr] ?? null,
    // include/constants/battle.h -- the exact 12-entry JUMPIFWORD_VALUES map
    // plus the "0" literal, hand-copied per the M74 brief (unlike the byte
    // setbyte map / move catalog, this small map is explicitly meant to be
    // transcribed here).
    resolveValue: (expr) => {
      if (expr === "0") return 0;
      const table = {
        BATTLE_TYPE_DOUBLE: 1 << 0,
        BATTLE_TYPE_LINK: 1 << 1,
        BATTLE_TYPE_TRAINER: 1 << 3,
        BATTLE_TYPE_TWO_OPPONENTS: 1 << 15,
        BATTLE_TYPE_RECORDED_LINK: 1 << 25,
        BATTLE_TYPE_ARENA: 1 << 18,
        BATTLE_TYPE_DOME: 1 << 16,
        BATTLE_TYPE_PYRAMID: 1 << 21,
        BATTLE_TYPE_TOWER_LINK_MULTI: 1 << 23,
        HITMARKER_PLAYER_FAINTED: 1 << 22,
        HITMARKER_NO_ATTACKSTRING: 1 << 9,
      };
      const towerBit = 1 << 8, palaceBit = 1 << 17, arenaBit = 1 << 18, factoryBit = 1 << 19, pikeBit = 1 << 20, pyramidBit = 1 << 21;
      table.BATTLE_TYPE_FRONTIER = (towerBit | palaceBit | arenaBit | factoryBit | pikeBit | pyramidBit) >>> 0;
      return Object.prototype.hasOwnProperty.call(table, expr) ? table[expr] >>> 0 : null;
    },
    fieldMax: 0xffffffff,
  }),
});

const program = programModule.loadBattleScriptProgram();

function makeBattler(index) {
  return Object.freeze({
    side: index % 2,
    ability: index + 1,
    hp: 100,
    maxHP: 100,
    moves: frozen([1, 2, 3, 4]),
    pp: frozen([10, 10, 10, 10]),
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
    statStages: frozen([6, 6, 6, 6, 6, 6, 6, 6]),
    types: frozen(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 19 + index,
    attack: 50,
    defense: 51,
    spAttack: 52,
    spDefense: 53,
    level: 50,
    friendship: 70,
    partyIndex: index,
  });
}

const BASE_BATTLERS = frozen([0, 1, 2, 3].map(makeBattler));

function canonicalRules(overrides) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: BASE_BATTLERS,
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: overrides.battleOutcome ?? 0,
    currentMove: overrides.currentMove ?? 33,
    currentMovePosition: 0,
    moveResultFlags: overrides.moveResultFlags ?? 0,
    dmgMultiplier: 1,
    critMultiplier: overrides.critMultiplier ?? 1,
    moveEffectByte: 0,
    missType: overrides.missType ?? 0,
    hitMarker: overrides.hitMarker ?? 0,
    multiHitCounter: 0,
    multistringChooser: overrides.multistringChooser ?? 0,
    battleMoveDamage: overrides.battleMoveDamage ?? 0,
    chosenMove: overrides.chosenMove ?? 33,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: overrides.battleTypeFlags ?? 0,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    battleCommunication0: overrides.battleCommunication0 ?? 0,
    battleCommunication1: overrides.battleCommunication1 ?? 0,
    animTurn: overrides.animTurn ?? 0,
    multiHitStringCounter: overrides.multiHitStringCounter ?? 0,
    weather: overrides.weather ?? 0,
  });
}

function rustRules(rules) {
  return Object.freeze({
    multistringChooser: rules.multistringChooser,
    moveResultFlags: rules.moveResultFlags,
    battleCommunication0: rules.battleCommunication0,
    battleCommunication1: rules.battleCommunication1,
    battleOutcome: rules.battleOutcome,
    missType: rules.missType,
    critMultiplier: rules.critMultiplier,
    animTurn: rules.animTurn,
    multiHitStringCounter: rules.multiHitStringCounter,
    currentMove: rules.currentMove,
    chosenMove: rules.chosenMove,
    weather: rules.weather,
    battleTypeFlags: rules.battleTopology.battleTypeFlags,
    hitMarker: rules.hitMarker,
    battleMoveDamage: rules.battleMoveDamage,
  });
}

function activeProgram(targetExpr, targetResolves) {
  if (targetResolves) return program;
  const entries = { ...program.labelEntries };
  delete entries[targetExpr];
  return Object.freeze({ ...program, labelEntries: Object.freeze(entries) });
}

function runInstruction(opcodeKey, opcode, instruction, rulesOverrides, targetResolves = true) {
  const rules = canonicalRules(rulesOverrides);
  const handlers = opcode.createHandlers(program);
  const handler = handlers[opcode.id];
  assert(typeof handler === "function", `${opcodeKey}: canonical handler missing`);
  const targetExpr = instruction.operands[3]?.expression;
  const selectedProgram = activeProgram(targetExpr, targetResolves);
  const state = Object.freeze({
    ...machineModule.createBattleScriptMachine(selectedProgram, instruction.source.label, rules, 0x1234),
    programCounter: instruction.programCounter,
  });
  try {
    const transition = handler({ program: selectedProgram, instruction, state });
    return Object.freeze({ rules, transition, error: null });
  } catch (error) {
    assert(error instanceof Error, `non-Error throw ${String(error)}`);
    return Object.freeze({ rules, transition: null, error: error.message });
  }
}

function classify(outcome) {
  if (outcome.error) return "error";
  if (outcome.transition.control.kind === "halt") return "halt";
  return outcome.transition.control.kind; // "advance" | "jump"
}

const cases = [];
function addCase({ label, opcodeKey, category, instruction, rulesOverrides, targetResolves = true }) {
  assert(/^[a-z0-9_]+$/.test(label), `bad label ${label}`);
  assert(!cases.some((entry) => entry.label === label), `duplicate label ${label}`);
  const opcode = OPCODES[opcodeKey];
  const outcome = runInstruction(opcodeKey, opcode, instruction, rulesOverrides, targetResolves);
  const branch = classify(outcome);
  const targetExpr = instruction.operands[3]?.expression;
  const targetEntry = programModule.resolveBattleScriptLabel(program, targetExpr);
  cases.push(Object.freeze({
    label,
    opcodeKey,
    category,
    branch,
    rules: rustRules(outcome.rules),
    operands: frozen(instruction.operands.map((o) => Object.freeze({ widthBytes: o.widthBytes, expression: o.expression }))),
    sourceStatementLine: instruction.source.statementLine,
    programCounter: instruction.programCounter,
    resolvedTargetProgramCounter: targetResolves && targetEntry ? targetEntry.programCounter : null,
    jumpProgramCounter: branch === "jump" ? outcome.transition.control.programCounter : null,
    haltSourceConstruct: branch === "halt" ? outcome.transition.control.reason.sourceConstruct : null,
    haltSourceLine: branch === "halt" ? outcome.transition.control.reason.sourceLine : null,
    errorMessage: outcome.error,
  }));
}

function cloneInstruction(site, overrides = {}) {
  const operands = overrides.operands ?? site.operands;
  return Object.freeze({
    ...site,
    opcodeId: overrides.opcodeId ?? site.opcodeId,
    operands: frozen(operands),
  });
}

// --- Distinct triples from every concrete call site -----------------------
const perOpcodeSites = {};
const perOpcodeTriples = {};
for (const [opcodeKey, opcode] of Object.entries(OPCODES)) {
  const sites = frozen(program.instructions.filter((i) => i.opcodeName === opcode.name));
  perOpcodeSites[opcodeKey] = sites;
  assert(sites.every((s) => s.opcodeId === opcode.id && s.dispatcher === opcode.dispatcher), `${opcodeKey}: opcode/dispatcher drift`);
  const seen = new Map();
  for (const site of sites) {
    const key = `${site.operands[0]?.expression} ${site.operands[1]?.expression} ${site.operands[2]?.expression}`;
    if (!seen.has(key)) seen.set(key, site);
  }
  perOpcodeTriples[opcodeKey] = frozen([...seen.values()]);
}

assert(perOpcodeSites.byte.length === 65, `byte call-site count drift: ${perOpcodeSites.byte.length}`);
assert(perOpcodeSites.halfword.length === 15, `halfword call-site count drift: ${perOpcodeSites.halfword.length}`);
assert(perOpcodeSites.word.length === 37, `word call-site count drift: ${perOpcodeSites.word.length}`);

// --- Value catalog: every distinct value-operand expression, resolved -----
const catalog = {};
const extraCatalogEntries = {
  byte: ["SOME_UNKNOWN_LITERAL"],
  halfword: [],
  word: [],
};
for (const [opcodeKey, opcode] of Object.entries(OPCODES)) {
  const exprs = new Set(perOpcodeTriples[opcodeKey].map((s) => s.operands[2].expression));
  for (const extra of extraCatalogEntries[opcodeKey]) exprs.add(extra);
  catalog[opcodeKey] = frozen([...exprs].sort().map((expr) => Object.freeze({ expr, value: opcode.resolveValue(expr) })));
}

// --- Baseline behavior case per distinct triple ----------------------------
let counter = 0;
for (const [opcodeKey, opcode] of Object.entries(OPCODES)) {
  for (const site of perOpcodeTriples[opcodeKey]) {
    counter += 1;
    addCase({
      label: `${opcodeKey}_triple_${counter}`,
      opcodeKey,
      category: "call-site-triple",
      instruction: site,
      rulesOverrides: {},
    });
  }
}

// --- Forced-true sample: pointer field set to the resolved value ----------
for (const [opcodeKey, opcode] of Object.entries(OPCODES)) {
  let sampled = 0;
  for (const site of perOpcodeTriples[opcodeKey]) {
    if (sampled >= 6) break;
    const ptrExpr = site.operands[1].expression;
    const valueExpr = site.operands[2].expression;
    const field = opcode.pointerField(ptrExpr);
    const value = opcode.resolveValue(valueExpr);
    if (field === null || value === null) continue; // unmodeled triple: only one case needed (already emitted above)
    sampled += 1;
    addCase({
      label: `${opcodeKey}_forced_${sampled}`,
      opcodeKey,
      category: "forced-pointer-value",
      instruction: site,
      rulesOverrides: { [field]: value },
    });
  }
}

// --- Synthetic comparator coverage for comparators absent from the committed program ---
function findModeledSite(opcodeKey) {
  const opcode = OPCODES[opcodeKey];
  return perOpcodeTriples[opcodeKey].find((site) => {
    const field = opcode.pointerField(site.operands[1].expression);
    const value = opcode.resolveValue(site.operands[2].expression);
    return field !== null && value !== null;
  });
}
const MISSING_COMPARATORS = {
  halfword: ["CMP_GREATER_THAN", "CMP_LESS_THAN", "CMP_NO_COMMON_BITS"],
  word: ["CMP_NOT_EQUAL", "CMP_GREATER_THAN", "CMP_LESS_THAN"],
};
for (const [opcodeKey, comparators] of Object.entries(MISSING_COMPARATORS)) {
  const base = findModeledSite(opcodeKey);
  for (const comparator of comparators) {
    const operands = base.operands.map((o) => Object.freeze({ ...o }));
    operands[0] = Object.freeze({ ...operands[0], expression: comparator });
    const instruction = cloneInstruction(base, { operands });
    addCase({
      label: `${opcodeKey}_synthetic_${comparator.toLowerCase()}`,
      opcodeKey,
      category: "synthetic-comparator-coverage",
      instruction,
      rulesOverrides: {},
    });
  }
}

// --- Direct-handler validation: unknown comparator, shape errors ----------
for (const [opcodeKey, opcode] of Object.entries(OPCODES)) {
  const base = perOpcodeSites[opcodeKey][0];
  {
    const operands = base.operands.map((o) => Object.freeze({ ...o }));
    operands[0] = Object.freeze({ ...operands[0], expression: "CMP_BOGUS" });
    addCase({
      label: `${opcodeKey}_unknown_comparator`,
      opcodeKey,
      category: "direct-handler-validation",
      instruction: cloneInstruction(base, { operands: frozen(operands) }),
      rulesOverrides: {},
    });
  }
  {
    const operands = base.operands.slice(0, 3);
    addCase({
      label: `${opcodeKey}_wrong_operand_count`,
      opcodeKey,
      category: "direct-handler-validation",
      instruction: cloneInstruction(base, { operands: frozen(operands) }),
      rulesOverrides: {},
    });
  }
  {
    const operands = base.operands.map((o) => Object.freeze({ ...o }));
    operands[2] = Object.freeze({ ...operands[2], widthBytes: operands[2].widthBytes + 1 });
    addCase({
      label: `${opcodeKey}_wrong_value_width`,
      opcodeKey,
      category: "direct-handler-validation",
      instruction: cloneInstruction(base, { operands: frozen(operands) }),
      rulesOverrides: {},
    });
  }
  {
    const operands = base.operands.map((o) => Object.freeze({ ...o }));
    operands[1] = Object.freeze({ ...operands[1], widthBytes: 2 });
    addCase({
      label: `${opcodeKey}_wrong_pointer_width`,
      opcodeKey,
      category: "direct-handler-validation",
      instruction: cloneInstruction(base, { operands: frozen(operands) }),
      rulesOverrides: {},
    });
  }
}

// --- Unresolved jump target: taken branch errors, not-taken branch is lazy ---
{
  const opcodeKey = "byte";
  const site = findModeledSite(opcodeKey);
  const field = OPCODES[opcodeKey].pointerField(site.operands[1].expression);
  const value = OPCODES[opcodeKey].resolveValue(site.operands[2].expression);
  addCase({
    label: "byte_unresolved_target_on_taken_branch",
    opcodeKey,
    category: "lazy-target-resolution",
    instruction: site,
    rulesOverrides: { [field]: value },
    targetResolves: false,
  });
  addCase({
    label: "byte_unresolved_target_skipped_on_not_taken_branch",
    opcodeKey,
    category: "lazy-target-resolution",
    instruction: site,
    rulesOverrides: { [field]: value + 1 },
    targetResolves: false,
  });
}

// --- Registration: first-match, no shape validation, missing-opcode error ---
const registrationCases = [];
for (const [opcodeKey, opcode] of Object.entries(OPCODES)) {
  const handlers = opcode.createHandlers(program);
  const boundOpcodeIds = Object.keys(handlers).map(Number);
  assert(boundOpcodeIds.length === 1 && boundOpcodeIds[0] === opcode.id, `${opcodeKey}: registration id drift`);
  registrationCases.push(Object.freeze({ label: `${opcodeKey}_registers_from_real_program`, opcodeKey, present: true, expectedOpcodeId: opcode.id }));

  let threw = null;
  try {
    opcode.createHandlers(Object.freeze({ ...program, instructions: frozen([]) }));
  } catch (error) {
    threw = error.message;
  }
  assert(threw === `committed Battle Script program does not emit ${opcode.name}`, `${opcodeKey}: missing-opcode message drift: ${threw}`);
  registrationCases.push(Object.freeze({ label: `${opcodeKey}_missing_opcode_errors`, opcodeKey, present: false, expectedOpcodeId: null }));
}

// --- Censuses ---------------------------------------------------------------
function census(values, key) {
  const result = new Map();
  for (const value of values) result.set(value[key], (result.get(value[key]) ?? 0) + 1);
  return frozen([...result.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
const callSiteCensus = frozen(Object.entries(OPCODES).map(([key, opcode]) => [opcode.name, perOpcodeSites[key].length]));
const distinctTripleCensus = frozen(Object.entries(OPCODES).map(([key, opcode]) => [opcode.name, perOpcodeTriples[key].length]));
const categoryCensus = census(cases, "category");
const branchCensus = census(cases, "branch");
const opcodeCensus = census(cases, "opcodeKey");

const corpus = Object.freeze({ callSiteCensus, distinctTripleCensus, categoryCensus, branchCensus, opcodeCensus, cases, registrationCases, catalog });
const corpusText = JSON.stringify(corpus);
const corpusSha = crypto.createHash("sha256").update(corpusText).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorSha = crypto.createHash("sha256").update(generatorBytes).digest("hex");

// --- Rust codegen ------------------------------------------------------------
const rs = JSON.stringify;
const optU8 = (v) => (v === null ? "None" : `Some(${v})`);
const optU32 = (v) => (v === null ? "None" : `Some(${v})`);
const optStr = (v) => (v === null ? "None" : `Some(${rs(v)})`);
const optI64 = (v) => (v === null ? "None" : `Some(${v}i64)`);

function catalogLines(opcodeKey) {
  const entries = catalog[opcodeKey];
  const constName = `BATTLE_SCRIPT_JUMPIF${opcodeKey.toUpperCase()}_VALUE_CATALOG`;
  const rows = entries.map((e) => `(${rs(e.expr)}, ${optI64(e.value)})`).join(", ");
  return [
    `pub const ${constName}: [(&str, Option<i64>); ${entries.length}] = [${rows}];`,
  ];
}

const catalogLinesAll = [
  "// GENERATED by core-rs/tools/gen-battle-script-jumpif-vectors.mjs; do not edit.",
  "// Source: executing canonical src/engine/battleScriptSetByte.ts's resolveBattleScriptSetByteValue",
  "// (byte), src/data/gen/moves.json plus B_WEATHER_SUN (halfword), and the hand-copied",
  "// JUMPIFWORD_VALUES map from src/engine/battleScriptJumpifwordOpcode.ts (word), over every",
  "// distinct value-operand expression the committed program's call sites use.",
  "// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpif-vectors.mjs.",
  ...catalogLines("byte"),
  ...catalogLines("halfword"),
  ...catalogLines("word"),
  "",
];
fs.writeFileSync(catalogOutputPath, catalogLinesAll.join("\n"));

function rustRulesLit(r) {
  return `BattleScriptJumpifRules { multistring_chooser: ${r.multistringChooser}, move_result_flags: ${r.moveResultFlags}, battle_communication0: ${r.battleCommunication0}, battle_communication1: ${r.battleCommunication1}, battle_outcome: ${r.battleOutcome}, miss_type: ${r.missType}, crit_multiplier: ${r.critMultiplier}, anim_turn: ${r.animTurn}, multi_hit_string_counter: ${r.multiHitStringCounter}, current_move: ${r.currentMove}, chosen_move: ${r.chosenMove}, weather: ${r.weather}, battle_type_flags: ${r.battleTypeFlags}, hit_marker: ${r.hitMarker}, battle_move_damage: ${r.battleMoveDamage} }`;
}
function rustOperandsLit(operands) {
  return `&[${operands.map((o) => `BattleScriptJumpifVectorOperand { width_bytes: ${o.widthBytes}, expression: ${rs(o.expression)} }`).join(", ")}]`;
}

const lines = [
  "// GENERATED by core-rs/tools/gen-battle-script-jumpif-vectors.mjs; do not edit.",
  "// Source: executing canonical src/engine/battleScriptJumpif{byte,halfword,word}Opcode.ts via node.",
  "// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpif-vectors.mjs.",
  "use crate::battle_script_jumpif::BattleScriptJumpifRules;",
  `pub const BATTLE_SCRIPT_JUMPIF_VECTOR_CORPUS_SHA256: &str = ${rs(corpusSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIF_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`,
  `pub const BATTLE_SCRIPT_JUMPIF_VECTOR_GENERATOR_SHA256: &str = ${rs(generatorSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIF_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`,
  `pub const BATTLE_SCRIPT_JUMPIF_CALL_SITE_CENSUS: [(&str, usize); ${callSiteCensus.length}] = [${callSiteCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIF_DISTINCT_TRIPLE_CENSUS: [(&str, usize); ${distinctTripleCensus.length}] = [${distinctTripleCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIF_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIF_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [${branchCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIF_OPCODE_CENSUS: [(&str, usize); ${opcodeCensus.length}] = [${opcodeCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifVectorOperand { pub width_bytes: u8, pub expression: &'static str }",
  "#[derive(Debug, Clone, PartialEq, Eq)] pub struct BattleScriptJumpifVectorCase { pub label: &'static str, pub opcode: &'static str, pub category: &'static str, pub branch: &'static str, pub rules: BattleScriptJumpifRules, pub operands: &'static [BattleScriptJumpifVectorOperand], pub source_statement_line: u32, pub program_counter: u32, pub resolved_target_program_counter: Option<u32>, pub jump_program_counter: Option<u32>, pub halt_source_construct: Option<&'static str>, pub halt_source_line: Option<u32>, pub error_message: Option<&'static str> }",
  `pub static BATTLE_SCRIPT_JUMPIF_CASES: [BattleScriptJumpifVectorCase; ${cases.length}] = [`,
];
for (const value of cases) {
  lines.push(`BattleScriptJumpifVectorCase { label: ${rs(value.label)}, opcode: ${rs(value.opcodeKey)}, category: ${rs(value.category)}, branch: ${rs(value.branch)}, rules: ${rustRulesLit(value.rules)}, operands: ${rustOperandsLit(value.operands)}, source_statement_line: ${value.sourceStatementLine}, program_counter: ${value.programCounter}, resolved_target_program_counter: ${optU32(value.resolvedTargetProgramCounter)}, jump_program_counter: ${optU32(value.jumpProgramCounter)}, halt_source_construct: ${optStr(value.haltSourceConstruct)}, halt_source_line: ${optU32(value.haltSourceLine)}, error_message: ${optStr(value.errorMessage)} },`);
}
lines.push(
  "];",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifRegistrationVectorCase { pub label: &'static str, pub opcode: &'static str, pub present: bool, pub expected_opcode_id: Option<u8> }",
  `pub static BATTLE_SCRIPT_JUMPIF_REGISTRATION_CASES: [BattleScriptJumpifRegistrationVectorCase; ${registrationCases.length}] = [`,
);
for (const value of registrationCases) {
  lines.push(`BattleScriptJumpifRegistrationVectorCase { label: ${rs(value.label)}, opcode: ${rs(value.opcodeKey)}, present: ${value.present}, expected_opcode_id: ${optU8(value.expectedOpcodeId)} },`);
}
lines.push("];", "");

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);

const rustupBin = path.join(process.env.HOME ?? "", ".rustup/toolchains/stable-aarch64-apple-darwin/bin");
function formatFile(target) {
  let formatted = false;
  for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
    try {
      execFileSync(rustfmt, ["--edition", "2021", "--config-path", path.join(workspaceRoot, "core-rs"), target], { stdio: "inherit" });
      formatted = true;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  assert(formatted, "could not find rustfmt");
}
formatFile(outputPath);
formatFile(catalogOutputPath);

const generatedBytes = fs.readFileSync(outputPath);
const generatedSha = crypto.createHash("sha256").update(generatedBytes).digest("hex");
const catalogBytes = fs.readFileSync(catalogOutputPath);
const catalogSha = crypto.createHash("sha256").update(catalogBytes).digest("hex");
process.stdout.write(
  `wrote ${path.relative(workspaceRoot, outputPath)}: ${cases.length} behavior cases, ${registrationCases.length} registration cases, ${generatedBytes.length} bytes, corpus ${corpusSha}, generated ${generatedSha}\n`
  + `wrote ${path.relative(workspaceRoot, catalogOutputPath)}: ${catalogBytes.length} bytes, sha256 ${catalogSha}\n`
  + `call sites: ${JSON.stringify(callSiteCensus)}\n`
  + `distinct triples: ${JSON.stringify(distinctTripleCensus)}\n`
  + `branch census: ${JSON.stringify(branchCensus)}\n`,
);
