#!/usr/bin/env node
// Differential corpus for B_SCR_OP_ADDBYTE (src/engine/battleScriptDamagingWeatherOpcode.ts's
// createAddbyteHandler, reusing battleScriptSetByte.ts's shared catalog/read/write
// helpers). Expected outputs, controls, and registration errors are produced
// only by executing the canonical TypeScript factory on the real committed
// Battle Script program (and, for the missing-opcode registration edge, on
// that same program with every B_SCR_OP_ADDBYTE instruction filtered out).
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-addbyte-vectors.mjs

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
  "battle_script_addbyte_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, rulesModule, setByteModule, damagingWeatherModule] =
  await Promise.all([
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSetByte.ts")).href),
    import(pathToFileURL(path.join(
      workspaceRoot, "src", "engine", "battleScriptDamagingWeatherOpcode.ts",
    )).href),
  ]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-addbyte-vectors: " + message);
}

function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + (value & 0xff).toString(16).padStart(2, "0"); }
function rustString(value) { return JSON.stringify(value); }

const ADDBYTE_OPCODE_NAME = "B_SCR_OP_ADDBYTE";
const ADDBYTE_OPCODE_ID = 0x2f;

const stubPorts = Object.freeze({
  isControllerIdle: () => true,
  resolveBattlerForBattleScript: () => null,
});

const program = programModule.loadBattleScriptProgram();

const addbyteInstructions = freezeArray(
  program.instructions.filter((i) => i.opcodeName === ADDBYTE_OPCODE_NAME),
);
assert(addbyteInstructions.length === 9, "addbyte call site count drifted to " + addbyteInstructions.length);

const damagingWeatherHandlers = damagingWeatherModule.createBattleScriptDamagingWeatherOpcodeHandlers(
  program, stubPorts,
);
const addbyteHandler = damagingWeatherHandlers[ADDBYTE_OPCODE_ID];
assert(typeof addbyteHandler === "function", "canonical addbyte handler not registered at 0x2F");

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
    target = 1, scriptingBattler = 0, battleMoveDamage = 0, tripleKickPower = 0,
    multiHitStringCounter = 0, battleCommunication0 = 0, battleCommunication1 = 0,
    moveEffectByte = 0, multistringChooser = 0, statChanger = 0, twoTurnStringId = 0,
  } = overrides;
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray([0, 1, 2, 3].map(fixedBattler)),
    selectorRoles: Object.freeze({ attacker: 0, target, effectBattler: 2, fainted: null }),
    scriptingBattler, battlerWithAbility: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: 33, currentMovePosition: 0, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte, missType: 0, hitMarker: 0, multiHitCounter: 0, battleMoveDamage, painSplitHp: 0,
    bideDmg: freezeArray([0, 0, 0, 0]), lockedMoves: freezeArray([0, 0, 0, 0]),
    chosenMovePositions: freezeArray([0, 0, 0, 0]), sideStatuses: freezeArray([0, 0]),
    weather: 0, weatherTimer: 0, randomTurnNumber: 0,
    tripleKickPower, multiHitStringCounter, battleCommunication0, battleCommunication1,
    multistringChooser, statChanger, twoTurnStringId,
  });
}

function projectRules(rules) {
  return Object.freeze({
    battleCommunication0: rules.battleCommunication0 & 0xff,
    battleCommunication1: rules.battleCommunication1 & 0xff,
    battleMoveDamage: rules.battleMoveDamage | 0,
    moveEffectByte: rules.moveEffectByte & 0xff,
    multistringChooser: rules.multistringChooser & 0xff,
    target: rules.selectorRoles.target,
    scriptingBattler: rules.scriptingBattler & 0xff,
    statChanger: rules.statChanger & 0xff,
    tripleKickPower: rules.tripleKickPower & 0xffff,
    twoTurnStringId: rules.twoTurnStringId & 0xff,
    multiHitStringCounter: rules.multiHitStringCounter & 0xff,
  });
}

function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

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
  return Object.freeze({ widthBytes: operand.widthBytes, expression: operand.expression });
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

function siteByPc(pc) {
  const found = addbyteInstructions.find((i) => i.programCounter === pc);
  assert(found, "expected committed addbyte site at pc " + pc);
  return found;
}

// ---------------------------------------------------------------------
// Behavior cases
// ---------------------------------------------------------------------

const behaviorCases = [];
function addBehavior(label, category, instruction, rules) {
  assert(!behaviorCases.some((c) => c.label === label), "duplicate behavior label " + label);
  const outcome = invoke(addbyteHandler, instruction, rules);
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

// multi-hit string counter: both committed sites, one plain increment, one wrap.
addBehavior("mh_site_636_normal", "canonical-site", siteByPc(310),
  makeRules({ multiHitStringCounter: 5 }));
addBehavior("mh_site_1400_wrap", "canonical-site-wrap", siteByPc(913),
  makeRules({ multiHitStringCounter: 0xff }));

// sTRIPLE_KICK_POWER,10: carry-into-&0xff wrap AND high-lane isolation in one case.
addBehavior("triple_kick_site_1399_carry_isolation", "canonical-site-carry", siteByPc(912),
  makeRules({ tripleKickPower: (0xab << 8) | 0xfa }));

// sBATTLER,1: both committed sites -- one normal, one rejected-write error.
addBehavior("sbattler_site_1580_normal", "canonical-site", siteByPc(1064),
  makeRules({ scriptingBattler: 0 }));
addBehavior("sbattler_site_1580_reject", "write-rejected", siteByPc(1064),
  makeRules({ scriptingBattler: 3 }));
addBehavior("sbattler_site_4003_normal", "canonical-site", siteByPc(2900),
  makeRules({ scriptingBattler: 2 }));

// gBattlerTarget,1: both committed sites -- normal, missing-role write-sets-role, reject.
addBehavior("target_site_2594_normal", "canonical-site", siteByPc(1859),
  makeRules({ target: 1 }));
addBehavior("target_site_2594_reject", "write-rejected", siteByPc(1859),
  makeRules({ target: 3 }));
addBehavior("target_site_4040_missing_role", "canonical-site-missing-role", siteByPc(2926),
  makeRules({ target: null }));
addBehavior("target_site_4040_normal", "canonical-site", siteByPc(2926),
  makeRules({ target: 0 }));

// gBattleCommunication,1 / +1,1: normal, wrap, independence.
addBehavior("comm0_site_3220_wrap", "canonical-site-wrap", siteByPc(2346),
  makeRules({ battleCommunication0: 0xff, battleCommunication1: 7 }));
addBehavior("comm1_site_4442_independence", "canonical-site", siteByPc(3203),
  makeRules({ battleCommunication0: 9, battleCommunication1: 5 }));

assert(addbyteInstructions.every((i) => behaviorCases.some((c) =>
  c.instruction.programCounter === i.programCounter)), "not every committed addbyte site was exercised");

// Custom (non-committed) instructions exercising the rest of the pointer
// universe and the halt boundary. Built from a real committed instruction's
// shape with only the two operand expressions swapped -- everything else
// about the surrounding program stays real and committed.
function customInstruction(template, pointerExpr, byteExpr, pcOffset) {
  return Object.freeze({
    ...template,
    programCounter: template.programCounter + pcOffset,
    operands: freezeArray([
      Object.freeze({ ...template.operands[0], expression: pointerExpr }),
      Object.freeze({ ...template.operands[1], expression: byteExpr }),
    ]),
  });
}
const template = addbyteInstructions[0];

addBehavior("gbattlemovedamage_lane0_sign_preserve", "custom-lane", customInstruction(template, "gBattleMoveDamage", "1", 1),
  makeRules({ battleMoveDamage: 5 }));
addBehavior("gbattlemovedamage_lane1", "custom-lane", customInstruction(template, "gBattleMoveDamage + 1", "1", 2),
  makeRules({ battleMoveDamage: 0x0000_0000 }));
addBehavior("gbattlemovedamage_lane2", "custom-lane", customInstruction(template, "gBattleMoveDamage + 2", "1", 3),
  makeRules({ battleMoveDamage: 0x0000_0000 }));
addBehavior("gbattlemovedamage_lane3_sign_flip", "custom-lane-sign-flip", customInstruction(template, "gBattleMoveDamage + 3", "1", 4),
  makeRules({ battleMoveDamage: 0x7f00_0000 }));
addBehavior("triple_kick_power_high_lane", "custom-lane", customInstruction(template, "sTRIPLE_KICK_POWER + 1", "1", 5),
  makeRules({ tripleKickPower: 0x0001 }));
addBehavior("ceffect_chooser_write", "custom-pointer", customInstruction(template, "cEFFECT_CHOOSER", "1", 6),
  makeRules({ moveEffectByte: 0 }));
addBehavior("cmultistring_chooser_write", "custom-pointer", customInstruction(template, "cMULTISTRING_CHOOSER", "2", 7),
  makeRules({ multistringChooser: 0 }));
addBehavior("sstatchanger_write", "custom-pointer", customInstruction(template, "sSTATCHANGER", "10", 8),
  makeRules({ statChanger: 0 }));
addBehavior("stwoturn_stringid_write", "custom-pointer", customInstruction(template, "sTWOTURN_STRINGID", "1", 9),
  makeRules({ twoTurnStringId: 0 }));
addBehavior("unknown_pointer_halts", "unsupported-operand", customInstruction(template, "gBogusPointer", "1", 10),
  makeRules({}));
addBehavior("unknown_byte_expression_halts", "unsupported-operand", customInstruction(template, "gBattleCommunication", "17", 11),
  makeRules({ battleCommunication0: 3 }));

assert(behaviorCases.length >= 22 && behaviorCases.length <= 30,
  "behavior case count " + behaviorCases.length + " outside the ~22-30 target band");

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
    instructions: program.instructions.filter((i) => i.opcodeName !== ADDBYTE_OPCODE_NAME),
  });
  damagingWeatherModule.createBattleScriptDamagingWeatherOpcodeHandlers(custom, stubPorts);
  return "unexpectedly-registered";
});
addRegistration("canonical_all_9", () => {
  return String(ADDBYTE_OPCODE_ID in damagingWeatherHandlers);
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
assert(sourceLine(commandSource, 3823).trim() === "static void Cmd_addbyte(void)", "addbyte handler line drifted");
assert((scriptSource.match(/^\taddbyte /gm) ?? []).length === 9, "addbyte program count drifted");

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
  ["addbyte-concrete-starts", addbyteInstructions.length],
  ["setbyte-pointer-universe", setByteModule.BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.length],
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
  return `AddbyteOperand { width_bytes: ${op.widthBytes}, expression: ${rustString(op.expression)} }`;
}
function rustInstruction(instr) {
  return `AddbyteInstruction { opcode_name: ${rustString(instr.opcodeName)}, program_counter: ${instr.programCounter}, opcode_id: ${hex8(instr.opcodeId)}, dispatcher: ${rustString(instr.dispatcher)}, operands: &[${instr.operands.map(rustOperand).join(", ")}] }`;
}
function rustOptI32(value) { return value === null ? "None" : `Some(${value | 0})`; }
function rustRules(rules) {
  return `AddbyteVectorRules { battle_communication0: ${hex8(rules.battleCommunication0)}, battle_communication1: ${hex8(rules.battleCommunication1)}, battle_move_damage: ${rules.battleMoveDamage | 0}, move_effect_byte: ${hex8(rules.moveEffectByte)}, multistring_chooser: ${hex8(rules.multistringChooser)}, target: ${rustOptI32(rules.target)}, scripting_battler: ${hex8(rules.scriptingBattler)}, stat_changer: ${hex8(rules.statChanger)}, triple_kick_power: ${rules.tripleKickPower}, two_turn_stringid: ${hex8(rules.twoTurnStringId)}, multi_hit_string_counter: ${hex8(rules.multiHitStringCounter)} }`;
}
function rustOptionStr(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptionU32(value) { return value === null ? "None" : `Some(${value})`; }

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-addbyte-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptDamagingWeatherOpcode.ts and");
lines.push("//! battleScriptSetByte.ts via Node.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-addbyte-vectors.mjs.");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AddbyteOperand { pub width_bytes: u8, pub expression: &'static str }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AddbyteInstruction {");
lines.push("    pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str, pub operands: &'static [AddbyteOperand],");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AddbyteVectorRules {");
lines.push("    pub battle_communication0: u8, pub battle_communication1: u8, pub battle_move_damage: i32,");
lines.push("    pub move_effect_byte: u8, pub multistring_chooser: u8, pub target: Option<i32>,");
lines.push("    pub scripting_battler: u8, pub stat_changer: u8, pub triple_kick_power: u16,");
lines.push("    pub two_turn_stringid: u8, pub multi_hit_string_counter: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AddbyteBehaviorVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str,");
lines.push("    pub instruction: AddbyteInstruction, pub initial: AddbyteVectorRules,");
lines.push("    pub control_kind: &'static str, pub result: Option<AddbyteVectorRules>,");
lines.push("    pub error: Option<&'static str>, pub halt_construct: Option<&'static str>,");
lines.push("    pub halt_line: Option<u32>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AddbyteRegistrationVectorCase {");
lines.push("    pub label: &'static str, pub error: Option<&'static str>,");
lines.push("    pub opcode_id: Option<&'static str>,");
lines.push("}");
lines.push(`pub const BATTLE_SCRIPT_ADDBYTE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_ADDBYTE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_ADDBYTE_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ADDBYTE_CATEGORY_CENSUS: [(&str, usize); ${behaviorCategoryCensus.length}] = [${behaviorCategoryCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ADDBYTE_CONTROL_CENSUS: [(&str, usize); ${behaviorControlCensus.length}] = [${behaviorControlCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ADDBYTE_REGISTRATION_OUTCOME_CENSUS: [(&str, usize); ${registrationOutcomeCensus.length}] = [${registrationOutcomeCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub static BATTLE_SCRIPT_ADDBYTE_BEHAVIOR_CASES: [AddbyteBehaviorVectorCase; ${behaviorCases.length}] = [`);
for (const c of behaviorCases) {
  lines.push("    AddbyteBehaviorVectorCase {");
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
lines.push(`pub static BATTLE_SCRIPT_ADDBYTE_REGISTRATION_CASES: [AddbyteRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const c of registrationCases) {
  lines.push("    AddbyteRegistrationVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-addbyte-vectors: could not find rustfmt");
const generated = fs.readFileSync(outputPath);
console.log(`gen-battle-script-addbyte-vectors: wrote ${path.relative(workspaceRoot, outputPath)}`);
console.log(`gen-battle-script-addbyte-vectors: ${behaviorCases.length} behavior cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-addbyte-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-addbyte-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-addbyte-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
