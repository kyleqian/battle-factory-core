#!/usr/bin/env node
// Differential corpus for B_SCR_OP_COPYARRAY
// (src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts's createCopyarrayHandler,
// reusing battleScriptSetByte.ts's shared byte-universe read/write helpers for
// two of its 12 tuple arms). Expected outputs, controls, and registration
// errors are produced only by executing the canonical TypeScript factory on
// the real committed Battle Script program (and, for the missing-opcode
// registration edge, on that same program with every B_SCR_OP_COPYARRAY
// instruction filtered out).
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-copyarray-vectors.mjs

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
  "battle_script_copyarray_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, rulesModule, wrapModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot, "src", "engine", "battleScriptIngrainLeechSeedWrapOpcode.ts",
  )).href),
]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-copyarray-vectors: " + message);
}

function freezeArray(values) { return Object.freeze(values.slice()); }
function rustString(value) { return JSON.stringify(value); }

const COPYARRAY_OPCODE_NAME = "B_SCR_OP_COPYARRAY";

const program = programModule.loadBattleScriptProgram();

const copyarrayInstructions = freezeArray(
  program.instructions.filter((i) => i.opcodeName === COPYARRAY_OPCODE_NAME),
);
assert(copyarrayInstructions.length === 16, "copyarray call site count drifted to " + copyarrayInstructions.length);
const COPYARRAY_OPCODE_ID = copyarrayInstructions[0].opcodeId;
assert(
  copyarrayInstructions.every((i) => i.opcodeId === COPYARRAY_OPCODE_ID),
  "copyarray sites do not share one opcodeId",
);

const wrapHandlers = wrapModule.createBattleScriptIngrainLeechSeedWrapOpcodeHandlers(program);
const copyarrayHandler = wrapHandlers[COPYARRAY_OPCODE_ID];
assert(typeof copyarrayHandler === "function", "canonical copyarray handler not registered");

function fixedBattler() {
  return Object.freeze({
    side: 0, ability: 1, hp: 100, maxHP: 100, moves: freezeArray([33, 45, 98, 57]),
    pp: freezeArray([35, 10, 15, 20]), status1: 0, status2: 0, status3: 0, item: 0,
    statStages: freezeArray([6, 6, 6, 6, 6, 6, 6, 6]),
    types: freezeArray(["TYPE_NORMAL", "TYPE_NORMAL"]), species: 1, attack: 50, defense: 51,
    speed: 52, spAttack: 53, spDefense: 54, level: 50, friendship: 70, partyIndex: 0,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0,
  });
}

function makeRules(overrides) {
  const {
    attacker = 0, target = 1, effectBattler = 2,
    scriptingBattler = 0, battlerWithAbility = 0,
    battleMoveDamage = 0, hpDealt = 0, painSplitHp = 0, scriptingBideDmg = 0,
    dynamicBasePower = 0, tripleKickPower = 0,
    moveEffectByte = 0, multiHitEffect = 0, multistringChooser = 0, twoTurnStringId = 0,
  } = overrides;
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray([0, 1, 2, 3].map(fixedBattler)),
    selectorRoles: Object.freeze({ attacker, target, effectBattler, fainted: null }),
    scriptingBattler, battlerWithAbility, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: 33, currentMovePosition: 0, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte, missType: 0, hitMarker: 0, multiHitCounter: 0,
    battleMoveDamage, hpDealt, painSplitHp, scriptingBideDmg, dynamicBasePower,
    bideDmg: freezeArray([0, 0, 0, 0]), lockedMoves: freezeArray([0, 0, 0, 0]),
    chosenMovePositions: freezeArray([0, 0, 0, 0]), sideStatuses: freezeArray([0, 0]),
    weather: 0, weatherTimer: 0, randomTurnNumber: 0,
    tripleKickPower, multiHitEffect, multistringChooser, twoTurnStringId,
  });
}

function projectRules(rules) {
  return Object.freeze({
    battleMoveDamage: rules.battleMoveDamage | 0,
    hpDealt: rules.hpDealt | 0,
    painSplitHp: rules.painSplitHp | 0,
    scriptingBideDmg: rules.scriptingBideDmg | 0,
    dynamicBasePower: rules.dynamicBasePower & 0xffff,
    tripleKickPower: rules.tripleKickPower & 0xffff,
    moveEffectByte: rules.moveEffectByte & 0xff,
    multiHitEffect: rules.multiHitEffect & 0xff,
    multistringChooser: rules.multistringChooser & 0xff,
    twoTurnStringId: rules.twoTurnStringId & 0xff,
    scriptingBattler: rules.scriptingBattler & 0xff,
    battlerWithAbility: rules.battlerWithAbility & 0xff,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
  });
}

function invoke(handler, instruction, rules) {
  const before = projectRules(rules);
  const machine = machineModule.createBattleScriptMachine(program, "BattleScript_EffectHit", rules, 0x0bad_f000);
  const state = Object.freeze({ ...machine, programCounter: instruction.programCounter });
  let controlKind = null;
  let error = null;
  let resultProjection = null;
  let haltConstruct = null;
  let haltLine = null;
  try {
    const transition = handler({ program, instruction, state });
    controlKind = transition.control.kind;
    assert(transition.scheduler === state.scheduler, "handler changed scheduler");
    assert(transition.rng === state.rng, "handler consumed RNG");
    assert(transition.events.length === 0, "handler emitted an event");
    if (controlKind === "halt") {
      assert(transition.control.reason.kind === "unsupported-branch", "unexpected halt reason kind");
      haltConstruct = transition.control.reason.sourceConstruct;
      haltLine = transition.control.reason.sourceLine;
      resultProjection = before;
    } else {
      assert(controlKind === "advance", "unexpected control kind " + controlKind);
      resultProjection = projectRules(transition.rulesContext ?? rules);
    }
  } catch (caught) {
    assert(caught instanceof Error, "handler threw non-Error");
    error = caught.message;
  }
  return Object.freeze({ before, controlKind, error, resultProjection, haltConstruct, haltLine });
}

function operandSpec(operand) {
  return operand === undefined || operand === null
    ? null
    : Object.freeze({ widthBytes: operand.widthBytes, expression: operand.expression });
}
function instructionSpec(instruction) {
  return Object.freeze({
    opcodeName: instruction.opcodeName,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher ?? "",
    operands: freezeArray(instruction.operands.map(operandSpec)),
  });
}

// ---------------------------------------------------------------------
// Behavior cases
// ---------------------------------------------------------------------

const behaviorCases = [];
function addBehavior(label, category, instruction, rules) {
  assert(!behaviorCases.some((c) => c.label === label), "duplicate behavior label " + label);
  const outcome = invoke(copyarrayHandler, instruction, rules);
  behaviorCases.push(Object.freeze({
    label, category,
    instruction: instructionSpec(instruction),
    initial: outcome.before,
    controlKind: outcome.controlKind,
    result: outcome.resultProjection,
    error: outcome.error,
    haltConstruct: outcome.haltConstruct,
    haltLine: outcome.haltLine,
  }));
}

function tupleKey(instruction) {
  const [dstOp, srcOp, sizeOp] = instruction.operands;
  return `${sizeOp?.expression}|${dstOp?.expression}|${srcOp?.expression}`;
}

const siteCounters = new Map();
function nextOccurrence(key) {
  const n = siteCounters.get(key) ?? 0;
  siteCounters.set(key, n + 1);
  return n;
}

// Every committed site, driven with distinguishing values per occurrence so
// repeated tuples (both gBattleMoveDamage<-gHpDealt sites, all three
// gEffectBattler sites, ...) are not just copy-pasted.
const TUPLE_MAKERS = new Map([
  ["0x4|gBattleMoveDamage|gHpDealt", (n) => makeRules({ hpDealt: -(51 + n * 11), battleMoveDamage: 909 })],
  ["0x4|gHpDealt|gBattleMoveDamage", (n) => makeRules({ battleMoveDamage: -(37 + n * 13), hpDealt: 808 })],
  ["0x4|gBattleMoveDamage|sPAINSPLIT_HP", () => makeRules({ painSplitHp: 63 })],
  ["0x4|gBattleMoveDamage|sBIDE_DMG", () => makeRules({ scriptingBideDmg: -19 })],
  ["0x2|gDynamicBasePower|sTRIPLE_KICK_POWER", () => makeRules({ tripleKickPower: 0x1234 })],
  ["0x1|cEFFECT_CHOOSER|sMULTIHIT_EFFECT", () => makeRules({ multiHitEffect: 9 })],
  ["0x1|cMULTISTRING_CHOOSER|sTWOTURN_STRINGID", () => makeRules({ twoTurnStringId: 5 })],
  ["0x1|gBattlerTarget|gBattlerAttacker", () => makeRules({ attacker: 2, target: 0 })],
  ["0x1|gBattlerTarget|sBATTLER", () => makeRules({ scriptingBattler: 3, target: 1 })],
  ["0x1|gEffectBattler|gBattlerTarget", (n) => makeRules({ target: [1, 2, 3][n % 3], effectBattler: 0 })],
  ["0x1|sBATTLER|sBATTLER_WITH_ABILITY", () => makeRules({ battlerWithAbility: 2, scriptingBattler: 0 })],
  ["6|gBattleTextBuff1|sMULTIHIT_STRING", () => makeRules({})],
]);

for (const instruction of copyarrayInstructions) {
  const key = tupleKey(instruction);
  const maker = TUPLE_MAKERS.get(key);
  assert(maker, "no rules maker for committed tuple " + key + " at pc " + instruction.programCounter);
  const n = nextOccurrence(key);
  const label = `site_pc${instruction.programCounter}_${key.replace(/[^a-zA-Z0-9]+/g, "_")}`;
  addBehavior(label, "canonical-site", instruction, maker(n));
}

assert(TUPLE_MAKERS.size === 12, "expected exactly 12 distinct committed tuples, got " + TUPLE_MAKERS.size);
for (const [key, count] of siteCounters) {
  if (key === "0x4|gBattleMoveDamage|gHpDealt" || key === "0x1|gEffectBattler|gBattlerTarget") {
    assert(count >= 2, key + " expected multiple committed sites, got " + count);
  }
}

// Role-guard failure edges: reuse the real committed instruction shapes with
// the required role missing.
const gBattlerTargetFromAttackerSite = copyarrayInstructions.find(
  (i) => tupleKey(i) === "0x1|gBattlerTarget|gBattlerAttacker",
);
addBehavior(
  "attacker_role_missing_errors",
  "role-guard-error",
  gBattlerTargetFromAttackerSite,
  makeRules({ attacker: null }),
);

const gEffectBattlerSite = copyarrayInstructions.find((i) => tupleKey(i) === "0x1|gEffectBattler|gBattlerTarget");
addBehavior(
  "target_role_missing_errors",
  "role-guard-error",
  gEffectBattlerSite,
  makeRules({ target: null }),
);

// Pure-advance snapshot proving zero rules mutation for the multihit-string arm.
const multihitStringSite = copyarrayInstructions.find((i) => tupleKey(i) === "6|gBattleTextBuff1|sMULTIHIT_STRING");
addBehavior(
  "multihit_string_pure_advance_zero_mutation",
  "pure-advance",
  multihitStringSite,
  makeRules({ battleMoveDamage: 12345, hpDealt: -6789, scriptingBattler: 3, tripleKickPower: 0xabcd }),
);

// Barrier: custom (non-committed) instructions built by swapping operand
// expressions of a real committed instruction's shape.
function customInstruction(template, operandExprs, pcOffset) {
  return Object.freeze({
    ...template,
    programCounter: template.programCounter + pcOffset,
    operands: freezeArray(operandExprs.map((expression, index) => (
      expression === undefined
        ? undefined
        : Object.freeze({ ...template.operands[index], expression })
    ))),
  });
}
const template = copyarrayInstructions[0];

addBehavior(
  "unknown_tuple_halts",
  "unsupported-operand",
  customInstruction(template, ["gBogusDst", "gBogusSrc", "0x1"], 1),
  makeRules({}),
);
addBehavior(
  "wrong_size_known_pair_halts",
  "unsupported-operand",
  customInstruction(template, ["gBattleMoveDamage", "gHpDealt", "0x2"], 2),
  makeRules({}),
);
addBehavior(
  "missing_operand_formats_as_missing",
  "unsupported-operand",
  customInstruction(template, ["gBattleMoveDamage", undefined, undefined], 3),
  makeRules({}),
);

assert(behaviorCases.length >= 19 && behaviorCases.length <= 32,
  "behavior case count " + behaviorCases.length + " outside the ~19-32 target band");

// ---------------------------------------------------------------------
// Registration cases
// ---------------------------------------------------------------------

const registrationCases = [];
function addRegistration(label, run) {
  let error = null;
  let opcodeId = null;
  try {
    opcodeId = run();
  } catch (caught) {
    assert(caught instanceof Error, "registration threw non-Error for " + label);
    error = caught.message;
  }
  registrationCases.push(Object.freeze({ label, error, opcodeId }));
}

addRegistration("missing_opcode", () => {
  const custom = Object.freeze({
    ...program,
    instructions: program.instructions.filter((i) => i.opcodeName !== COPYARRAY_OPCODE_NAME),
  });
  wrapModule.createBattleScriptIngrainLeechSeedWrapOpcodeHandlers(custom);
  return "unexpectedly-registered";
});
addRegistration("canonical_all_16", () => {
  return String(COPYARRAY_OPCODE_ID in wrapHandlers);
});

assert(registrationCases.length === 2, "registration case count drifted to " + registrationCases.length);

// ---------------------------------------------------------------------
// Source/decomp evidence
// ---------------------------------------------------------------------

function sourceLine(source, number) {
  const result = source.split("\n")[number - 1];
  assert(result !== undefined, "missing source line " + number);
  return result;
}
const commandSource = fs.readFileSync(path.join(
  workspaceRoot, "reference", "pokeemerald", "src", "battle_script_commands.c"), "utf8");
const scriptSource = fs.readFileSync(path.join(
  workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s"), "utf8");
assert(sourceLine(commandSource, 3837).trim() === "static void Cmd_copyarray(void)", "copyarray handler line drifted");
const copySiteCount = (scriptSource.match(/^\t(copyarray|copybyte|copyhword|copyword) /gm) ?? []).length;
assert(copySiteCount === 16, "copyarray/sugar program count drifted to " + copySiteCount);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(value[key], (counts.get(value[key]) ?? 0) + 1);
  return freezeArray([...counts.entries()]);
}
const behaviorCategoryCensus = census(behaviorCases, "category");
const behaviorControlCensus = census(
  behaviorCases.map((c) => Object.freeze({ controlKind: c.controlKind ?? "error" })),
  "controlKind",
);
const registrationOutcomeCensus = census(
  registrationCases.map((c) => Object.freeze({ outcome: c.error === null ? "registered" : "error" })),
  "outcome",
);
const domainCensus = freezeArray([
  ["copyarray-concrete-starts", copyarrayInstructions.length],
  ["distinct-tuples", TUPLE_MAKERS.size],
  ["behavior-cases", behaviorCases.length],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({
  domainCensus, behaviorCategoryCensus, behaviorControlCensus, registrationOutcomeCensus,
  behaviorCases, registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

// ---------------------------------------------------------------------
// Rust emission
// ---------------------------------------------------------------------

function rustOperand(op) {
  return op === null
    ? "None"
    : `Some(CopyarrayOperand { width_bytes: ${op.widthBytes}, expression: ${rustString(op.expression)} })`;
}
function rustInstruction(instr) {
  return `CopyarrayInstruction { opcode_name: ${rustString(instr.opcodeName)}, program_counter: ${instr.programCounter}, opcode_id: 0x${instr.opcodeId.toString(16)}, dispatcher: ${rustString(instr.dispatcher)}, operands: &[${instr.operands.map(rustOperand).join(", ")}] }`;
}
function rustOptI32(value) { return value === null || value === undefined ? "None" : `Some(${value | 0})`; }
function rustRules(rules) {
  return `CopyarrayVectorRules { battle_move_damage: ${rules.battleMoveDamage | 0}, hp_dealt: ${rules.hpDealt | 0}, pain_split_hp: ${rules.painSplitHp | 0}, scripting_bide_dmg: ${rules.scriptingBideDmg | 0}, dynamic_base_power: ${rules.dynamicBasePower}, triple_kick_power: ${rules.tripleKickPower}, move_effect_byte: ${rules.moveEffectByte}, multi_hit_effect: ${rules.multiHitEffect}, multistring_chooser: ${rules.multistringChooser}, two_turn_stringid: ${rules.twoTurnStringId}, scripting_battler: ${rules.scriptingBattler}, battler_with_ability: ${rules.battlerWithAbility}, attacker: ${rustOptI32(rules.attacker)}, target: ${rustOptI32(rules.target)}, effect_battler: ${rustOptI32(rules.effectBattler)} }`;
}
function rustOptionStr(value) { return value === null || value === undefined ? "None" : `Some(${rustString(value)})`; }
function rustOptionU32(value) { return value === null || value === undefined ? "None" : `Some(${value})`; }

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-copyarray-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts via Node.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-copyarray-vectors.mjs.");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CopyarrayOperand { pub width_bytes: u8, pub expression: &'static str }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CopyarrayInstruction {");
lines.push("    pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str, pub operands: &'static [Option<CopyarrayOperand>],");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CopyarrayVectorRules {");
lines.push("    pub battle_move_damage: i32, pub hp_dealt: i32, pub pain_split_hp: i32,");
lines.push("    pub scripting_bide_dmg: i32, pub dynamic_base_power: u16, pub triple_kick_power: u16,");
lines.push("    pub move_effect_byte: u8, pub multi_hit_effect: u8, pub multistring_chooser: u8,");
lines.push("    pub two_turn_stringid: u8, pub scripting_battler: u8, pub battler_with_ability: u8,");
lines.push("    pub attacker: Option<i32>, pub target: Option<i32>, pub effect_battler: Option<i32>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CopyarrayBehaviorVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str,");
lines.push("    pub instruction: CopyarrayInstruction, pub initial: CopyarrayVectorRules,");
lines.push("    pub control_kind: &'static str, pub result: Option<CopyarrayVectorRules>,");
lines.push("    pub error: Option<&'static str>, pub halt_construct: Option<&'static str>,");
lines.push("    pub halt_line: Option<u32>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CopyarrayRegistrationVectorCase {");
lines.push("    pub label: &'static str, pub error: Option<&'static str>,");
lines.push("    pub opcode_id: Option<&'static str>,");
lines.push("}");
lines.push(`pub const BATTLE_SCRIPT_COPYARRAY_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_COPYARRAY_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_COPYARRAY_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_COPYARRAY_CATEGORY_CENSUS: [(&str, usize); ${behaviorCategoryCensus.length}] = [${behaviorCategoryCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_COPYARRAY_CONTROL_CENSUS: [(&str, usize); ${behaviorControlCensus.length}] = [${behaviorControlCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_COPYARRAY_REGISTRATION_OUTCOME_CENSUS: [(&str, usize); ${registrationOutcomeCensus.length}] = [${registrationOutcomeCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub static BATTLE_SCRIPT_COPYARRAY_BEHAVIOR_CASES: [CopyarrayBehaviorVectorCase; ${behaviorCases.length}] = [`);
for (const c of behaviorCases) {
  lines.push("    CopyarrayBehaviorVectorCase {");
  lines.push(`        label: ${rustString(c.label)}, category: ${rustString(c.category)},`);
  lines.push(`        instruction: ${rustInstruction(c.instruction)},`);
  lines.push(`        initial: ${rustRules(c.initial)},`);
  lines.push(`        control_kind: ${rustString(c.controlKind ?? "error")},`);
  lines.push(`        result: ${c.result === null ? "None" : `Some(${rustRules(c.result)})`},`);
  lines.push(`        error: ${rustOptionStr(c.error)}, halt_construct: ${rustOptionStr(c.haltConstruct)},`);
  lines.push(`        halt_line: ${rustOptionU32(c.haltLine)},`);
  lines.push("    },");
}
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_COPYARRAY_REGISTRATION_CASES: [CopyarrayRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const c of registrationCases) {
  lines.push("    CopyarrayRegistrationVectorCase {");
  lines.push(`        label: ${rustString(c.label)}, error: ${rustOptionStr(c.error)},`);
  lines.push(`        opcode_id: ${c.opcodeId === null ? "None" : `Some(${rustString(String(c.opcodeId))})`},`);
  lines.push("    },");
}
lines.push("];");

fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf8");
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "1.97.1-x86_64-unknown-linux-gnu", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outputPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-copyarray-vectors: could not find rustfmt");
const generated = fs.readFileSync(outputPath);
console.log(`gen-battle-script-copyarray-vectors: wrote ${path.relative(workspaceRoot, outputPath)}`);
console.log(`gen-battle-script-copyarray-vectors: ${behaviorCases.length} behavior cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-copyarray-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-copyarray-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-copyarray-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
