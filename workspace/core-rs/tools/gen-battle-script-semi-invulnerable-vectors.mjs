#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSemiInvulnerableOpcode.ts:
// B_SCR_OP_CLEARSTATUSFROMEFFECT (0x18), B_SCR_OP_SETSEMIINVULNERABLEBIT
// (0xC5), B_SCR_OP_CLEARSEMIINVULNERABLEBIT (0xC6).
//
// Expected values come only from executing the canonical TypeScript
// handlers (through the real registered factory, driven against the real
// committed program's own call sites plus custom programs for registration
// edges and non-committed effect bytes/moves). This generator owns bounded
// input construction and Rust literal emission; it must never reimplement
// the mask table, the current-move switch, or the selector/role semantics.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-semi-invulnerable-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot, "core-rs", "crates", "factory-core", "src",
  "battle_script_semi_invulnerable_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSemiInvulnerableOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const CLEARSTATUS_NAME = "B_SCR_OP_CLEARSTATUSFROMEFFECT";
const CLEARSTATUS_ID = 0x18;
const CLEARSTATUS_DISPATCHER = "Cmd_clearstatusfromeffect";
const SETBIT_NAME = "B_SCR_OP_SETSEMIINVULNERABLEBIT";
const SETBIT_ID = 0xc5;
const SETBIT_DISPATCHER = "Cmd_setsemiinvulnerablebit";
const CLEARBIT_NAME = "B_SCR_OP_CLEARSEMIINVULNERABLEBIT";
const CLEARBIT_ID = 0xc6;
const CLEARBIT_DISPATCHER = "Cmd_clearsemiinvulnerablebit";
const ENTRY_LABEL = "BattleScript_EffectMinimize";
const BATTLERS = [0, 1, 2, 3];

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-semi-invulnerable-vectors: ${message}`);
}
function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function rustString(value) {
  return JSON.stringify(value);
}
function rustU32(value) {
  return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
}

const program = programModule.loadBattleScriptProgram();
const clearstatusSites = program.instructions.filter((i) => i.opcodeName === CLEARSTATUS_NAME);
const setbitSites = program.instructions.filter((i) => i.opcodeName === SETBIT_NAME);
const clearbitSites = program.instructions.filter((i) => i.opcodeName === CLEARBIT_NAME);
assert(clearstatusSites.length === 5, `expected 5 clearstatusfromeffect sites, got ${clearstatusSites.length}`);
assert(setbitSites.length === 1, `expected 1 setsemiinvulnerablebit site, got ${setbitSites.length}`);
assert(clearbitSites.length === 2, `expected 2 clearsemiinvulnerablebit sites, got ${clearbitSites.length}`);
for (const site of clearstatusSites) {
  assert(
    site.opcodeId === CLEARSTATUS_ID && site.dispatcher === CLEARSTATUS_DISPATCHER
      && site.operands.length === 1 && site.operands[0].widthBytes === 1
      && site.operands[0].expression === "BS_ATTACKER",
    `clearstatusfromeffect call site drift at pc ${site.programCounter}`,
  );
}
for (const site of setbitSites) {
  assert(
    site.opcodeId === SETBIT_ID && site.dispatcher === SETBIT_DISPATCHER && site.operands.length === 0,
    `setsemiinvulnerablebit call site drift at pc ${site.programCounter}`,
  );
}
for (const site of clearbitSites) {
  assert(
    site.opcodeId === CLEARBIT_ID && site.dispatcher === CLEARBIT_DISPATCHER && site.operands.length === 0,
    `clearsemiinvulnerablebit call site drift at pc ${site.programCounter}`,
  );
}

const resolveBattler = rulesModule.resolveRulesBattlerForBattleScript;
const clearstatusHandlers = opcodeModule.createBattleScriptClearstatusfromeffectOpcodeHandlers(
  program,
  { resolveBattlerForBattleScript: resolveBattler },
);
const clearstatusHandler = clearstatusHandlers[CLEARSTATUS_ID];
assert(typeof clearstatusHandler === "function", "canonical clearstatusfromeffect handler missing");
const bitHandlers = opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers(program);
const setbitHandler = bitHandlers[SETBIT_ID];
const clearbitHandler = bitHandlers[CLEARBIT_ID];
assert(typeof setbitHandler === "function", "canonical setsemiinvulnerablebit handler missing");
assert(typeof clearbitHandler === "function", "canonical clearsemiinvulnerablebit handler missing");

function battlerState(status1, status2, status3) {
  return Object.freeze({ status1: status1 >>> 0, status2: status2 >>> 0, status3: status3 >>> 0 });
}
function siblingState(seed) {
  return battlerState(seed * 0x1001 + 1, seed * 0x2003 + 2, seed * 0x3005 + 3);
}
function makeRules({ attacker, focus, status1 = 0, status2 = 0, status3 = 0, moveEffectByte = 0, currentMove = 0, salt = 0 }) {
  const battlers = BATTLERS.map((b) => (
    b === focus ? battlerState(status1, status2, status3) : siblingState(salt + b + 1)
  ));
  return Object.freeze({
    battlers: Object.freeze(battlers),
    moveEffectByte,
    currentMove,
    selectorRoles: Object.freeze({ attacker }),
  });
}
function vectorState(rules) {
  return Object.freeze({
    status1: Object.freeze(rules.battlers.map((b) => b.status1 >>> 0)),
    status2: Object.freeze(rules.battlers.map((b) => b.status2 >>> 0)),
    status3: Object.freeze(rules.battlers.map((b) => b.status3 >>> 0)),
    moveEffectByte: rules.moveEffectByte,
    currentMove: rules.currentMove,
    attacker: rules.selectorRoles.attacker,
  });
}

function baseState(rules, seed) {
  return machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, seed);
}

function runClearstatus(instruction, rules, seed) {
  const before = vectorState(rules);
  const state = { ...baseState(rules, seed), programCounter: instruction.programCounter };
  const transition = clearstatusHandler({ program, instruction, state });
  assert(same(vectorState(rules), before), "clearstatusfromeffect handler mutated input rules");
  assert(transition.events.length === 0, "clearstatusfromeffect handler emitted events");
  if (transition.control.kind === "halt") {
    assert(transition.control.reason.kind === "unsupported-branch", `unexpected halt reason ${transition.control.reason.kind}`);
    return { branch: "halt", reason: transition.control.reason, programCounter: instruction.programCounter };
  }
  assert(transition.control.kind === "advance", `unexpected control ${transition.control.kind}`);
  return { branch: "advance", rules: vectorState(transition.rulesContext), programCounter: instruction.programCounter };
}

function runBit(handler, instruction, rules, seed) {
  const before = vectorState(rules);
  const state = { ...baseState(rules, seed), programCounter: instruction.programCounter };
  try {
    const transition = handler({ program, instruction, state });
    assert(transition.control.kind === "advance", `unexpected control ${transition.control.kind}`);
    assert(same(vectorState(rules), before), "bit handler mutated input rules");
    assert(transition.events.length === 0, "bit handler emitted events");
    return { branch: "advance", rules: vectorState(transition.rulesContext), programCounter: instruction.programCounter };
  } catch (error) {
    assert(error instanceof Error, `non-Error throw ${String(error)}`);
    assert(same(vectorState(rules), before), "throwing bit handler mutated input rules");
    return { branch: "missing-attacker-role", message: error.message, programCounter: instruction.programCounter };
  }
}

function withOperands(instruction, operands) {
  return { ...instruction, operands };
}

const cases = [];
function addCase({ label, category, opcode, operandExpression = "BS_ATTACKER", outcome }) {
  assert(/^[a-z0-9_]+$/.test(label), `bad label ${label}`);
  assert(!cases.some((c) => c.label === label), `duplicate label ${label}`);
  cases.push(Object.freeze({
    label, category, opcode, operandExpression,
    programCounter: outcome.programCounter,
    initial: outcome.initial,
    branch: outcome.branch,
    expected: outcome.branch === "advance" ? outcome.rules : null,
    halt: outcome.branch === "halt" ? outcome.reason : null,
    expectedError: outcome.branch === "missing-attacker-role" ? outcome.message : null,
  }));
}

// --- clearstatusfromeffect: all 5 real committed call sites ---
clearstatusSites.forEach((site, index) => {
  const attacker = index % 4;
  const rules = makeRules({
    attacker, focus: attacker,
    status1: 0xffff_ffff, status2: 0xffff_ffff, status3: 0,
    moveEffectByte: 12, currentMove: 0, salt: 100 + index,
  });
  addCase({
    label: `clearstatus_call_site_${index}`,
    category: "clearstatusfromeffect-call-sites",
    opcode: "clearstatusfromeffect",
    outcome: { initial: vectorState(rules), ...runClearstatus(site, rules, 1 + index) },
  });
});

// --- charging matrix: byte 12 clears STATUS2_MULTIPLETURNS, both set and already-clear, every attacker ---
const STATUS2_MULTIPLETURNS = 1 << 12;
for (const attacker of BATTLERS) {
  for (const [tag, status2] of [["set", 0xffff_ffff], ["already_clear", 0xffff_ffff & ~STATUS2_MULTIPLETURNS]]) {
    const rules = makeRules({
      attacker, focus: attacker, status1: 0x1234_5678, status2, status3: 0x1,
      moveEffectByte: 12, currentMove: 0, salt: 200 + attacker * 2,
    });
    addCase({
      label: `clearstatus_charging_a${attacker}_${tag}`,
      category: "clearstatusfromeffect-charging-matrix",
      opcode: "clearstatusfromeffect",
      outcome: { initial: vectorState(rules), ...runClearstatus(clearstatusSites[0], rules, 50 + attacker) },
    });
  }
}

// --- RAGE (30, committed) -> mask 0, status2 no-op, moveEffectByte still resets ---
{
  const rules = makeRules({
    attacker: 1, focus: 1, status1: 0xaaaa_aaaa, status2: 0xbbbb_bbbb, status3: 0,
    moveEffectByte: 30, currentMove: 0, salt: 300,
  });
  addCase({
    label: "clearstatus_rage_mask_zero_status2_noop",
    category: "clearstatusfromeffect-rage",
    opcode: "clearstatusfromeffect",
    outcome: { initial: vectorState(rules), ...runClearstatus(clearstatusSites[0], rules, 60) },
  });
}

// --- custom byte <= 6 (status1 branch, mask 0) ---
{
  const rules = makeRules({
    attacker: 2, focus: 2, status1: 0xcccc_cccc, status2: 0xdddd_dddd, status3: 0,
    moveEffectByte: 1, currentMove: 0, salt: 310,
  });
  addCase({
    label: "clearstatus_primary_branch_custom_byte_one",
    category: "clearstatusfromeffect-primary-branch",
    opcode: "clearstatusfromeffect",
    outcome: { initial: vectorState(rules), ...runClearstatus(clearstatusSites[0], rules, 61) },
  });
}

// --- byte 0 edge (status1 branch, mask 0) ---
{
  const rules = makeRules({
    attacker: 3, focus: 3, status1: 0x1111_1111, status2: 0x2222_2222, status3: 0,
    moveEffectByte: 0, currentMove: 0, salt: 320,
  });
  addCase({
    label: "clearstatus_byte_zero_edge",
    category: "clearstatusfromeffect-byte-zero-edge",
    opcode: "clearstatusfromeffect",
    outcome: { initial: vectorState(rules), ...runClearstatus(clearstatusSites[0], rules, 62) },
  });
}

// --- untouched-sibling boundary ---
{
  const rules = makeRules({
    attacker: 0, focus: 0, status1: 0xffff_ffff, status2: 0xffff_ffff, status3: 0x5555,
    moveEffectByte: 12, currentMove: 0, salt: 330,
  });
  addCase({
    label: "clearstatus_untouched_sibling_boundary",
    category: "clearstatusfromeffect-untouched-sibling",
    opcode: "clearstatusfromeffect",
    outcome: { initial: vectorState(rules), ...runClearstatus(clearstatusSites[0], rules, 63) },
  });
}

// --- selector unavailable (attacker null) -> Halt ---
{
  const rules = makeRules({
    attacker: null, focus: 1, status1: 0xffff_ffff, status2: 0xffff_ffff, status3: 0,
    moveEffectByte: 12, currentMove: 0, salt: 340,
  });
  addCase({
    label: "clearstatus_selector_unavailable_halts",
    category: "clearstatusfromeffect-selector-unavailable",
    opcode: "clearstatusfromeffect",
    outcome: { initial: vectorState(rules), ...runClearstatus(clearstatusSites[0], rules, 64) },
  });
}

// --- missing operand -> "<missing>" rendering (custom instruction, bypasses registration) ---
{
  const rules = makeRules({
    attacker: null, focus: 1, status1: 0xffff_ffff, status2: 0xffff_ffff, status3: 0,
    moveEffectByte: 12, currentMove: 0, salt: 350,
  });
  const noOperandInstruction = withOperands(clearstatusSites[0], []);
  addCase({
    label: "clearstatus_missing_operand_renders_missing",
    category: "clearstatusfromeffect-missing-operand",
    opcode: "clearstatusfromeffect",
    operandExpression: null,
    outcome: { initial: vectorState(rules), ...runClearstatus(noOperandInstruction, rules, 65) },
  });
}

// --- semiinvulnerablebit: set+clear for each of the four moves, and default no-op ---
const MOVE_CASES = [
  ["fly", 19], ["bounce", 340], ["dig", 91], ["dive", 291], ["default_noop", 5],
];
for (const [moveTag, moveId] of MOVE_CASES) {
  for (const [mode, handler, name, site] of [
    ["set", setbitHandler, "setsemiinvulnerablebit", setbitSites[0]],
    ["clear", clearbitHandler, "clearsemiinvulnerablebit", clearbitSites[0]],
  ]) {
    const attacker = (moveId + (mode === "set" ? 0 : 1)) % 4;
    const initialStatus3 = mode === "clear" ? 0xffff_ffff : 0x0000_0000;
    const rules = makeRules({
      attacker, focus: attacker, status1: 0, status2: 0, status3: initialStatus3,
      moveEffectByte: 0, currentMove: moveId, salt: 400 + moveId,
    });
    addCase({
      label: `${name}_${moveTag}`,
      category: `${name}-move-matrix`,
      opcode: name,
      outcome: { initial: vectorState(rules), ...runBit(handler, site, rules, 70 + moveId) },
    });
  }
}

// --- clear-when-bit-not-set idempotence (bit already clear) ---
{
  const rules = makeRules({
    attacker: 0, focus: 0, status1: 0, status2: 0, status3: 0,
    moveEffectByte: 0, currentMove: 19, salt: 500,
  });
  addCase({
    label: "clearsemiinvulnerablebit_idempotent_already_clear",
    category: "clearsemiinvulnerablebit-idempotence",
    opcode: "clearsemiinvulnerablebit",
    outcome: { initial: vectorState(rules), ...runBit(clearbitHandler, clearbitSites[1], rules, 80) },
  });
}

// --- setsemiinvulnerablebit idempotence (bit already set) ---
{
  const rules = makeRules({
    attacker: 0, focus: 0, status1: 0, status2: 0, status3: 1 << 6,
    moveEffectByte: 0, currentMove: 19, salt: 501,
  });
  addCase({
    label: "setsemiinvulnerablebit_idempotent_already_set",
    category: "setsemiinvulnerablebit-idempotence",
    opcode: "setsemiinvulnerablebit",
    outcome: { initial: vectorState(rules), ...runBit(setbitHandler, setbitSites[0], rules, 81) },
  });
}

// --- missing attacker role (shared hit-chain error verbatim) ---
for (const [name, handler, site] of [
  ["setsemiinvulnerablebit", setbitHandler, setbitSites[0]],
  ["clearsemiinvulnerablebit", clearbitHandler, clearbitSites[0]],
]) {
  const rules = makeRules({
    attacker: null, focus: 1, status1: 0, status2: 0, status3: 0,
    moveEffectByte: 0, currentMove: 19, salt: 600,
  });
  addCase({
    label: `${name}_missing_attacker_role`,
    category: `${name}-missing-attacker-role`,
    opcode: name,
    outcome: { initial: vectorState(rules), ...runBit(handler, site, rules, 90) },
  });
}

console.log(`gen-battle-script-semi-invulnerable-vectors: ${cases.length} behavior cases`);

// ---------------------------------------------------------------------
// Registration cases
// ---------------------------------------------------------------------

function op(widthBytes, expression) {
  return { widthBytes, expression };
}
function instr(opcodeName, opcodeId, programCounter, dispatcher, operands) {
  return { opcodeName, opcodeId, programCounter, dispatcher, operands };
}

const registrationCases = [];
function addRegistrationCase(label, opcode, thunk) {
  assert(!registrationCases.some((c) => c.label === label), `duplicate registration label ${label}`);
  try {
    const opcodeId = thunk();
    registrationCases.push({ label, opcode, outcome: "ok", opcodeId, expectedError: null });
  } catch (error) {
    assert(error instanceof Error, `non-Error registration throw ${String(error)}`);
    registrationCases.push({ label, opcode, outcome: "err", opcodeId: null, expectedError: error.message });
  }
}

const goodClearstatus = instr(CLEARSTATUS_NAME, CLEARSTATUS_ID, 10, CLEARSTATUS_DISPATCHER, [op(1, "BS_ATTACKER")]);
addRegistrationCase("clearstatus_success", "clearstatusfromeffect", () => {
  const handlers = opcodeModule.createBattleScriptClearstatusfromeffectOpcodeHandlers(program, {
    resolveBattlerForBattleScript: resolveBattler,
  });
  assert(typeof handlers[CLEARSTATUS_ID] === "function", "real program registration failed");
  return CLEARSTATUS_ID;
});
addRegistrationCase("clearstatus_wrong_count", "clearstatusfromeffect", () => {
  opcodeModule.createBattleScriptClearstatusfromeffectOpcodeHandlers(
    { instructions: Array(4).fill(goodClearstatus) },
    { resolveBattlerForBattleScript: resolveBattler },
  );
  return 0;
});
addRegistrationCase("clearstatus_wrong_dispatcher", "clearstatusfromeffect", () => {
  const bad = { ...goodClearstatus, dispatcher: "Cmd_setminimize" };
  opcodeModule.createBattleScriptClearstatusfromeffectOpcodeHandlers(
    { instructions: [bad, goodClearstatus, goodClearstatus, goodClearstatus, goodClearstatus] },
    { resolveBattlerForBattleScript: resolveBattler },
  );
  return 0;
});
addRegistrationCase("clearstatus_wrong_operand_count", "clearstatusfromeffect", () => {
  const bad = { ...goodClearstatus, operands: [] };
  opcodeModule.createBattleScriptClearstatusfromeffectOpcodeHandlers(
    { instructions: [bad, goodClearstatus, goodClearstatus, goodClearstatus, goodClearstatus] },
    { resolveBattlerForBattleScript: resolveBattler },
  );
  return 0;
});
addRegistrationCase("clearstatus_wrong_operand_width", "clearstatusfromeffect", () => {
  const bad = { ...goodClearstatus, operands: [op(4, "BS_ATTACKER")] };
  opcodeModule.createBattleScriptClearstatusfromeffectOpcodeHandlers(
    { instructions: [bad, goodClearstatus, goodClearstatus, goodClearstatus, goodClearstatus] },
    { resolveBattlerForBattleScript: resolveBattler },
  );
  return 0;
});
addRegistrationCase("clearstatus_wrong_expression", "clearstatusfromeffect", () => {
  const bad = { ...goodClearstatus, operands: [op(1, "BS_TARGET")] };
  opcodeModule.createBattleScriptClearstatusfromeffectOpcodeHandlers(
    { instructions: [bad, goodClearstatus, goodClearstatus, goodClearstatus, goodClearstatus] },
    { resolveBattlerForBattleScript: resolveBattler },
  );
  return 0;
});

const goodSetbit = instr(SETBIT_NAME, SETBIT_ID, 20, SETBIT_DISPATCHER, []);
addRegistrationCase("setbit_success", "setsemiinvulnerablebit", () => {
  const handlers = opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers(program);
  assert(typeof handlers[SETBIT_ID] === "function", "real program registration failed");
  return SETBIT_ID;
});
addRegistrationCase("setbit_wrong_count_zero", "setsemiinvulnerablebit", () => {
  opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers({
    instructions: [...clearbitSites],
  });
  return 0;
});
addRegistrationCase("setbit_wrong_count_two", "setsemiinvulnerablebit", () => {
  opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers({
    instructions: [goodSetbit, goodSetbit, ...clearbitSites],
  });
  return 0;
});
addRegistrationCase("setbit_wrong_dispatcher", "setsemiinvulnerablebit", () => {
  const bad = { ...goodSetbit, dispatcher: "Cmd_setminimize" };
  opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers({
    instructions: [bad, ...clearbitSites],
  });
  return 0;
});
addRegistrationCase("setbit_wrong_operand_count", "setsemiinvulnerablebit", () => {
  const bad = { ...goodSetbit, operands: [op(1, "whatever")] };
  opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers({
    instructions: [bad, ...clearbitSites],
  });
  return 0;
});

const goodClearbit = instr(CLEARBIT_NAME, CLEARBIT_ID, 30, CLEARBIT_DISPATCHER, []);
addRegistrationCase("clearbit_success", "clearsemiinvulnerablebit", () => {
  const handlers = opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers(program);
  assert(typeof handlers[CLEARBIT_ID] === "function", "real program registration failed");
  return CLEARBIT_ID;
});
addRegistrationCase("clearbit_wrong_count_one", "clearsemiinvulnerablebit", () => {
  opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers({
    instructions: [...setbitSites, goodClearbit],
  });
  return 0;
});
addRegistrationCase("clearbit_wrong_count_three", "clearsemiinvulnerablebit", () => {
  opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers({
    instructions: [...setbitSites, goodClearbit, goodClearbit, goodClearbit],
  });
  return 0;
});
addRegistrationCase("clearbit_wrong_dispatcher", "clearsemiinvulnerablebit", () => {
  const bad = { ...goodClearbit, dispatcher: "Cmd_setminimize" };
  opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers({
    instructions: [...setbitSites, bad, goodClearbit],
  });
  return 0;
});
addRegistrationCase("clearbit_wrong_operand_count", "clearsemiinvulnerablebit", () => {
  const bad = { ...goodClearbit, operands: [op(1, "whatever")] };
  opcodeModule.createBattleScriptSemiInvulnerableBitOpcodeHandlers({
    instructions: [...setbitSites, bad, goodClearbit],
  });
  return 0;
});

console.log(`gen-battle-script-semi-invulnerable-vectors: ${registrationCases.length} registration cases`);

assert(cases.length === 33, `behavior case count drifted: ${cases.length}`);
assert(registrationCases.length === 16, `registration case count drifted: ${registrationCases.length}`);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}
const categoryCensus = census(cases, (v) => v.category);
const opcodeCensus = census(cases, (v) => v.opcode);
const branchCensus = census(cases, (v) => v.branch);
const registrationOutcomeCensus = census(registrationCases, (v) => v.outcome);

const corpus = Object.freeze({ cases, registrationCases, categoryCensus, opcodeCensus, branchCensus, registrationOutcomeCensus });
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustBattler(value) {
  return `BattleScriptSemiInvulnerableBattler::Battler${value}`;
}
function rustOptionalBattler(value) {
  return value === null || value === undefined ? "None" : `Some(${rustBattler(value)})`;
}
function rustOptionalU8(value) {
  return value === null || value === undefined ? "None" : `Some(${value})`;
}
function rustOptionalString(value) {
  return value === null || value === undefined ? "None" : `Some(${rustString(value)})`;
}
function rustState(value) {
  return [
    "BattleScriptSemiInvulnerableVectorState {",
    `status1: [${value.status1.map(rustU32).join(", ")}],`,
    `status2: [${value.status2.map(rustU32).join(", ")}],`,
    `status3: [${value.status3.map(rustU32).join(", ")}],`,
    `move_effect_byte: ${value.moveEffectByte},`,
    `current_move: ${value.currentMove},`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) {
  return value === null || value === undefined ? "None" : `Some(${rustState(value)})`;
}
function rustOptionalHalt(value) {
  if (value === null || value === undefined) return "None";
  return [
    "Some(BattleScriptSemiInvulnerableVectorHalt {",
    `program_counter: ${value.programCounter},`,
    `opcode_id: ${value.opcodeId},`,
    `opcode_name: ${rustString(value.opcodeName)},`,
    `source_construct: ${rustString(value.sourceConstruct)},`,
    `source_file: ${rustString(value.sourceFile)},`,
    `source_line: ${value.sourceLine},`,
    "})",
  ].join(" ");
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-semi-invulnerable-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSemiInvulnerableOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_semi_invulnerable::BattleScriptSemiInvulnerableBattler;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SEMI_INVULNERABLE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSemiInvulnerableVectorState {");
lines.push("    pub status1: [u32; 4],");
lines.push("    pub status2: [u32; 4],");
lines.push("    pub status3: [u32; 4],");
lines.push("    pub move_effect_byte: u8,");
lines.push("    pub current_move: u16,");
lines.push("    pub attacker: Option<BattleScriptSemiInvulnerableBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSemiInvulnerableVectorHalt {");
lines.push("    pub program_counter: u32,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub source_construct: &'static str,");
lines.push("    pub source_file: &'static str,");
lines.push("    pub source_line: u32,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSemiInvulnerableVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub opcode: &'static str,");
lines.push("    pub operand_expression: Option<&'static str>,");
lines.push("    pub program_counter: u32,");
lines.push("    pub branch: &'static str,");
lines.push("    pub initial: BattleScriptSemiInvulnerableVectorState,");
lines.push("    pub expected: Option<BattleScriptSemiInvulnerableVectorState>,");
lines.push("    pub halt: Option<BattleScriptSemiInvulnerableVectorHalt>,");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSemiInvulnerableRegistrationCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub opcode: &'static str,");
lines.push("    pub outcome: &'static str,");
lines.push("    pub opcode_id: Option<u8>,");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SEMI_INVULNERABLE_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SEMI_INVULNERABLE_OPCODE_CENSUS: [(&str, usize); ${opcodeCensus.length}] = [`);
for (const [name, count] of opcodeCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SEMI_INVULNERABLE_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SEMI_INVULNERABLE_REGISTRATION_OUTCOME_CENSUS: [(&str, usize); ${registrationOutcomeCensus.length}] = [`);
for (const [name, count] of registrationOutcomeCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SEMI_INVULNERABLE_CASES: [BattleScriptSemiInvulnerableVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSemiInvulnerableVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        opcode: ${rustString(value.opcode)},`);
  lines.push(`        operand_expression: ${rustOptionalString(value.operandExpression)},`);
  lines.push(`        program_counter: ${value.programCounter},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        halt: ${rustOptionalHalt(value.halt)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SEMI_INVULNERABLE_REGISTRATION_CASES: [BattleScriptSemiInvulnerableRegistrationCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSemiInvulnerableRegistrationCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        opcode: ${rustString(value.opcode)},`);
  lines.push(`        outcome: ${rustString(value.outcome)},`);
  lines.push(`        opcode_id: ${rustOptionalU8(value.opcodeId)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");

let formatted = false;
for (const rustfmt of ["rustfmt", path.join(process.env.HOME ?? "", ".cargo", "bin", "rustfmt")]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-semi-invulnerable-vectors: could not find rustfmt");

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
const generatedBytes = fs.statSync(outPath).size;
console.log(`gen-battle-script-semi-invulnerable-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-semi-invulnerable-vectors: ${cases.length} behavior + ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-semi-invulnerable-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-semi-invulnerable-vectors: opcode census ${JSON.stringify(opcodeCensus)}`);
console.log(`gen-battle-script-semi-invulnerable-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-semi-invulnerable-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-semi-invulnerable-vectors: generated sha256 ${generatedHash}, ${generatedBytes} bytes`);
