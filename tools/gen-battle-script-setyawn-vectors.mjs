#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSetyawnOpcode.ts.
// Expected controls and outputs are created only by executing the canonical
// TypeScript opcode handler; this script owns bounded input construction and
// Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-setyawn-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_setyawn_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSetyawnOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSourceConstants.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETYAWN";
const OPCODE_ID = 0xd7;
const DISPATCHER = "Cmd_setyawn";
const ENTRY_LABEL = "BattleScript_EffectYawn";
const BATTLE_SLOTS = 4;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const U32_MAX = 0xffff_ffff;
const STATUS1_SLEEP = sourceConstants.BATTLE_SCRIPT_STATUS1_SLEEP;
const STATUS1_MEMBERS = Object.freeze([
  Object.freeze({ label: "sleep_bit0", mask: 1 << 0 }),
  Object.freeze({ label: "sleep_bit1", mask: 1 << 1 }),
  Object.freeze({ label: "sleep_bit2", mask: 1 << 2 }),
  Object.freeze({ label: "poison", mask: sourceConstants.BATTLE_SCRIPT_STATUS1_POISON }),
  Object.freeze({ label: "burn", mask: sourceConstants.BATTLE_SCRIPT_STATUS1_BURN }),
  Object.freeze({ label: "freeze", mask: sourceConstants.BATTLE_SCRIPT_STATUS1_FREEZE }),
  Object.freeze({ label: "paralysis", mask: sourceConstants.BATTLE_SCRIPT_STATUS1_PARALYSIS }),
  Object.freeze({ label: "toxic_poison", mask: sourceConstants.BATTLE_SCRIPT_STATUS1_TOXIC_POISON }),
]);
const STATUS1_ANY = STATUS1_MEMBERS.reduce((mask, member) => (mask | member.mask) >>> 0, 0);
const STATUS3_YAWN = sourceConstants.BATTLE_SCRIPT_STATUS3_YAWN;
const STATUS3_YAWN_TURN_2 = sourceConstants.BATTLE_SCRIPT_STATUS3_YAWN_TURN_2;
const YAWN_COUNTER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const YAWN_PACKED_DOMAIN = Object.freeze(
  YAWN_COUNTER_DOMAIN.map((counter) => ((counter << 11) & STATUS3_YAWN) >>> 0),
);
const STATUS1_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0000_0100,
]);
const STATUS3_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0000_0001,
]);
const NON_TARGET_STATUS1 = Object.freeze([
  0x0000_0100,
  0x0000_0800,
  0x8000_0000,
  0x0100_0000,
]);
const NON_TARGET_STATUS3 = Object.freeze([
  0x0000_0001,
  0x0001_0000,
  0x8000_0000,
  0x4000_0000,
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-setyawn-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U32_MAX, `${label} must be a u32, got ${value}`);
}

function freezeRules(status1, status3, target) {
  assert(Array.isArray(status1) && status1.length === BATTLE_SLOTS, "status1 must have four cells");
  assert(Array.isArray(status3) && status3.length === BATTLE_SLOTS, "status3 must have four cells");
  status1.forEach((value, index) => assertU32(value, `status1[${index}]`));
  status3.forEach((value, index) => assertU32(value, `status3[${index}]`));
  assertOptionalBattler(target, "target role");
  return Object.freeze({
    battlers: Object.freeze(BATTLER_DOMAIN.map((battler) => Object.freeze({
      status1: status1[battler] >>> 0,
      status3: status3[battler] >>> 0,
    }))),
    selectorRoles: Object.freeze({ target }),
  });
}

function makeInitialRules({ target, focusBattler, focusStatus1, focusStatus3, salt }) {
  assertOptionalBattler(target, "initial target");
  assertBattler(focusBattler, "initial focus battler");
  assertU32(focusStatus1, "initial focus status1");
  assertU32(focusStatus3, "initial focus status3");
  const status1 = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusStatus1
      : NON_TARGET_STATUS1[(battler + salt) % NON_TARGET_STATUS1.length]
  ));
  const status3 = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusStatus3
      : NON_TARGET_STATUS3[(battler + salt * 3) % NON_TARGET_STATUS3.length]
  ));
  return freezeRules(status1, status3, target);
}

function vectorState(rules) {
  return Object.freeze({
    status1: Object.freeze(rules.battlers.map((battler) => battler.status1 >>> 0)),
    status3: Object.freeze(rules.battlers.map((battler) => battler.status3 >>> 0)),
    target: rules.selectorRoles.target,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === 1, `expected exactly one ${OPCODE_NAME} instruction, got ${instructions.length}`);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, `expected opcode ${OPCODE_ID}, got ${instruction.opcodeId}`);
assert(instruction.dispatcher === DISPATCHER, `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`);
assert(instruction.operands.length === 1, "canonical opcode must have one fail-label operand");
assert(STATUS1_SLEEP === 0x0000_0007, `STATUS1_SLEEP drifted to ${STATUS1_SLEEP}`);
assert(STATUS1_ANY === 0x0000_00ff, `STATUS1_ANY drifted to ${STATUS1_ANY}`);
assert(STATUS3_YAWN === 0x0000_1800, `STATUS3_YAWN drifted to ${STATUS3_YAWN}`);
assert(STATUS3_YAWN_TURN_2 === 0x0000_1000, `STATUS3_YAWN_TURN(2) drifted to ${STATUS3_YAWN_TURN_2}`);
assert(
  JSON.stringify(YAWN_PACKED_DOMAIN) === JSON.stringify([0x0000_0000, 0x0000_0800, 0x0000_1000, 0x0000_1800]),
  `packed Yawn domain drifted to ${JSON.stringify(YAWN_PACKED_DOMAIN)}`,
);

const handlers = opcodeModule.createBattleScriptSetyawnOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETYAWN handler was not registered");

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "fail-jump";
  throw new Error(`canonical handler returned unsupported control ${transition.control.kind}`);
}

function sourceOutcome(initialRules, applications) {
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const state = machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        currentRules,
        (0x5e7d_1b0d + application) >>> 0,
      );
      const transition = handler({ program, instruction, state });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      controls.push(controlFromTransition(transition));
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input rules");
    return Object.freeze({ expected: null, controls: Object.freeze([]), error: error.message });
  }
}

function branchFor(outcome) {
  return outcome.error === null ? outcome.controls.join("-then-") : "missing-target-role";
}

const cases = [];
function addCase(label, category, initialRules, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be 1 or 2`);
  const outcome = sourceOutcome(initialRules, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    initial: vectorState(initialRules),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

for (const target of BATTLER_DOMAIN) {
  for (const [counterIndex, counter] of YAWN_COUNTER_DOMAIN.entries()) {
    addCase(
      `counter_t${target}_${counter}`,
      "target-yawn-counter-matrix",
      makeInitialRules({
        target,
        focusBattler: target,
        focusStatus1: 0x0000_0000,
        focusStatus3: (YAWN_PACKED_DOMAIN[counterIndex]
          | (target === 0 ? 0x0000_0001 : 0x8000_0000)) >>> 0,
        salt: target * 11 + counter,
      }),
    );
  }
}

for (const target of BATTLER_DOMAIN) {
  for (const member of STATUS1_MEMBERS) {
    addCase(
      `status1_any_t${target}_${member.label}`,
      "target-status1-any-member-matrix",
      makeInitialRules({
        target,
        focusBattler: target,
        focusStatus1: member.mask,
        focusStatus3: target === 2 ? 0x8000_0000 : 0x0000_0001,
        salt: target * 17 + member.mask,
      }),
    );
  }
}

const edgeLabels = ["zero", "max", "high_bit", "unrelated_bit"];
for (const target of BATTLER_DOMAIN) {
  for (const [edgeIndex, status1] of STATUS1_EDGE_VALUES.entries()) {
    addCase(
      `status1_edge_t${target}_${edgeLabels[edgeIndex]}`,
      "status1-u32-edge-matrix",
      makeInitialRules({
        target,
        focusBattler: target,
        focusStatus1: status1,
        focusStatus3: 0x4000_0001,
        salt: 100 + target * STATUS1_EDGE_VALUES.length + edgeIndex,
      }),
    );
  }
}

for (const target of BATTLER_DOMAIN) {
  for (const [edgeIndex, status3] of STATUS3_EDGE_VALUES.entries()) {
    addCase(
      `status3_edge_t${target}_${edgeLabels[edgeIndex]}`,
      "status3-u32-edge-matrix",
      makeInitialRules({
        target,
        focusBattler: target,
        focusStatus1: 0x0000_0000,
        focusStatus3: status3,
        salt: 140 + target * STATUS3_EDGE_VALUES.length + edgeIndex,
      }),
    );
  }
}

for (const target of BATTLER_DOMAIN) {
  addCase(
    `or_yawn_only_t${target}`,
    "or-short-circuit-combinations",
    makeInitialRules({
      target,
      focusBattler: target,
      focusStatus1: 0x0000_0100,
      focusStatus3: (YAWN_PACKED_DOMAIN[1] | 0x8000_0000) >>> 0,
      salt: 180 + target * 3,
    }),
  );
  addCase(
    `or_status1_only_t${target}`,
    "or-short-circuit-combinations",
    makeInitialRules({
      target,
      focusBattler: target,
      focusStatus1: STATUS1_MEMBERS[(target + 3) % STATUS1_MEMBERS.length].mask,
      focusStatus3: 0x4000_0001,
      salt: 181 + target * 3,
    }),
  );
  addCase(
    `or_both_t${target}`,
    "or-short-circuit-combinations",
    makeInitialRules({
      target,
      focusBattler: target,
      focusStatus1: (STATUS1_MEMBERS[target].mask | STATUS1_MEMBERS[(target + 4) % STATUS1_MEMBERS.length].mask) >>> 0,
      focusStatus3: YAWN_PACKED_DOMAIN[2] | 0x0000_0001,
      salt: 182 + target * 3,
    }),
  );
}

addCase(
  "missing_target_precedes_status_checks",
  "missing-target-role",
  makeInitialRules({
    target: null,
    focusBattler: 2,
    focusStatus1: U32_MAX,
    focusStatus3: U32_MAX,
    salt: 240,
  }),
);

addCase(
  "target_only_mutation_preserves_unrelated_bits",
  "target-only-mutation",
  makeInitialRules({
    target: 2,
    focusBattler: 2,
    focusStatus1: 0x8000_0100,
    focusStatus3: 0x8000_0001,
    salt: 250,
  }),
);

addCase(
  "repeated_success_then_fail",
  "repeated-application",
  makeInitialRules({
    target: 3,
    focusBattler: 3,
    focusStatus1: 0x0000_0100,
    focusStatus3: 0x8000_0001,
    salt: 260,
  }),
  2,
);
addCase(
  "repeated_fail_remains_unchanged",
  "repeated-application",
  makeInitialRules({
    target: 1,
    focusBattler: 1,
    focusStatus1: STATUS1_MEMBERS[0].mask,
    focusStatus3: 0x8000_0001,
    salt: 261,
  }),
  2,
);

assert(cases.length === 96, `case count drifted: ${cases.length}`);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["target-role-values", BATTLER_DOMAIN.length],
  ["optional-target-role-values", BATTLER_DOMAIN.length + 1],
  ["status1-u32-values", U32_MAX + 1],
  ["status3-u32-values", U32_MAX + 1],
  ["status1-any-member-values", STATUS1_MEMBERS.length],
  ["status1-any-mask", STATUS1_ANY],
  ["status1-edge-values", STATUS1_EDGE_VALUES.length],
  ["status3-edge-values", STATUS3_EDGE_VALUES.length],
  ["yawn-counter-values", YAWN_COUNTER_DOMAIN.length],
  ["yawn-packed-field-values", YAWN_PACKED_DOMAIN.length],
  ["application-count-values", 2],
  ["typed-missing-target-combinations", 1],
]);
const corpus = Object.freeze({
  battlerDomain: BATTLER_DOMAIN,
  status1AnyMembers: STATUS1_MEMBERS,
  status1EdgeDomain: STATUS1_EDGE_VALUES,
  status3EdgeDomain: STATUS3_EDGE_VALUES,
  yawnCounterDomain: YAWN_COUNTER_DOMAIN,
  yawnPackedDomain: YAWN_PACKED_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU32(value) {
  return `0x${value.toString(16).padStart(8, "0")}`;
}

function rustBattler(value) {
  return `BattleScriptSetyawnBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustControl(value) {
  return value === "advance"
    ? "BattleScriptSetyawnControl::Advance"
    : "BattleScriptSetyawnControl::FailJump";
}

function rustControls(values) {
  return `&[${values.map(rustControl).join(", ")}]`;
}

function rustState(value) {
  return [
    "BattleScriptSetyawnVectorState {",
    `status1: [${value.status1.map(rustU32).join(", ")}],`,
    `status3: [${value.status3.map(rustU32).join(", ")}],`,
    `target: ${rustOptionalBattler(value.target)},`,
    "}",
  ].join(" ");
}

function rustOptionalState(value) {
  return value === null ? "None" : `Some(${rustState(value)})`;
}

function rustOptionalString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-setyawn-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetyawnOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_setyawn::{BattleScriptSetyawnBattler, BattleScriptSetyawnControl};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_STATUS1_EDGE_DOMAIN: [u32; ${STATUS1_EDGE_VALUES.length}] = [${STATUS1_EDGE_VALUES.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_STATUS3_EDGE_DOMAIN: [u32; ${STATUS3_EDGE_VALUES.length}] = [${STATUS3_EDGE_VALUES.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_YAWN_COUNTER_DOMAIN: [u8; ${YAWN_COUNTER_DOMAIN.length}] = [${YAWN_COUNTER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_YAWN_PACKED_DOMAIN: [u32; ${YAWN_PACKED_DOMAIN.length}] = [${YAWN_PACKED_DOMAIN.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_STATUS1_ANY_MEMBER_DOMAIN: [u32; ${STATUS1_MEMBERS.length}] = [${STATUS1_MEMBERS.map((member) => rustU32(member.mask)).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetyawnVectorState {");
lines.push("    pub status1: [u32; 4],");
lines.push("    pub status3: [u32; 4],");
lines.push("    pub target: Option<BattleScriptSetyawnBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetyawnVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSetyawnVectorState,");
lines.push("    pub expected: Option<BattleScriptSetyawnVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSetyawnControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETYAWN_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SETYAWN_CASES: [BattleScriptSetyawnVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSetyawnVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        applications: ${value.applications},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        controls: ${rustControls(value.controls)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
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
if (!formatted) throw new Error("gen-battle-script-setyawn-vectors: could not find rustfmt");

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-battle-script-setyawn-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-setyawn-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-setyawn-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-setyawn-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-setyawn-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-setyawn-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-setyawn-vectors: generated sha256 ${generatedHash}`);
