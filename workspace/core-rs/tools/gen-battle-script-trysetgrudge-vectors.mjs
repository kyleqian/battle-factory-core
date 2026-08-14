#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrysetgrudgeOpcode.ts.
// Expected controls, outputs, and errors are created only by executing the
// canonical TypeScript opcode handler; this script owns bounded input
// construction and Rust literal emission. The emitted Rust control deliberately
// omits the canonical machine's resolved absolute jump program counter.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysetgrudge-vectors.mjs

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
  "battle_script_trysetgrudge_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrysetgrudgeOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSourceConstants.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETGRUDGE";
const OPCODE_ID = 0xdc;
const DISPATCHER = "Cmd_trysetgrudge";
const ENTRY_LABEL = "BattleScript_EffectGrudge";
const BATTLE_SLOTS = 4;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const U32_MAX = 0xffff_ffff;
const STATUS3_GRUDGE = sourceConstants.BATTLE_SCRIPT_STATUS3_GRUDGE;
const GRUDGE_INPUTS = Object.freeze([0, STATUS3_GRUDGE]);
const STATUS3_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0100_0001,
  0x0000_3fff,
  0x0000_4000,
  0x0000_4001,
  0xffff_bfff,
]);
const NON_ATTACKER_STATUS3 = Object.freeze([
  0x0100_0000,
  0x0400_0000,
  0x8000_0000,
  0x0000_0001,
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trysetgrudge-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU32(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= U32_MAX,
    `${label} must be a u32, got ${value}`,
  );
}

function freezeRules(status3, attacker) {
  assert(Array.isArray(status3) && status3.length === BATTLE_SLOTS, "status3 must have four cells");
  status3.forEach((value, index) => assertU32(value, `status3[${index}]`));
  assertOptionalBattler(attacker, "attacker role");
  return Object.freeze({
    battlers: Object.freeze(status3.map((value) => Object.freeze({ status3: value >>> 0 }))),
    selectorRoles: Object.freeze({ attacker }),
  });
}

function makeInitialRules({ attacker, focusBattler, focusStatus3, salt }) {
  assertOptionalBattler(attacker, "initial attacker");
  assertBattler(focusBattler, "initial focus battler");
  assertU32(focusStatus3, "initial focus status3");
  const status3 = ATTACKER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusStatus3
      : NON_ATTACKER_STATUS3[(battler + salt) % NON_ATTACKER_STATUS3.length]
  ));
  return freezeRules(status3, attacker);
}

function vectorState(rules) {
  return Object.freeze({
    status3: Object.freeze(rules.battlers.map((battler) => battler.status3 >>> 0)),
    attacker: rules.selectorRoles.attacker,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(
  instructions.length === 1,
  `expected exactly one ${OPCODE_NAME} instruction, got ${instructions.length}`,
);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, `expected opcode ${OPCODE_ID}, got ${instruction.opcodeId}`);
assert(instruction.dispatcher === DISPATCHER, `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`);
assert(instruction.operands.length === 1, "canonical opcode must have one fail-label operand");
assert(instruction.operands[0]?.widthBytes === 4, "canonical fail-label operand must be four bytes");
assert(STATUS3_GRUDGE === 0x0000_4000, `STATUS3_GRUDGE drifted to ${STATUS3_GRUDGE}`);

const handlers = opcodeModule.createBattleScriptTrysetgrudgeOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical TRYSETGRUDGE handler was not registered");

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
      const currentSnapshot = vectorState(currentRules);
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
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      const control = controlFromTransition(transition);
      if (control === "fail-jump") {
        assert(
          transition.rulesContext === currentRules,
          "canonical fail jump changed the complete narrow state",
        );
      } else {
        const attacker = currentRules.selectorRoles.attacker;
        assert(attacker !== null, "canonical advance had no attacker");
        assert(
          transition.rulesContext !== currentRules,
          "canonical advance reused the complete narrow state",
        );
        assert(
          transition.rulesContext.selectorRoles === currentRules.selectorRoles,
          "canonical advance replaced selector roles",
        );
        assert(Object.isFrozen(transition.rulesContext.battlers), "canonical output battlers must be frozen");
        for (const battler of ATTACKER_DOMAIN) {
          if (battler === attacker) {
            assert(
              transition.rulesContext.battlers[battler].status3
                === ((currentRules.battlers[battler].status3 | STATUS3_GRUDGE) >>> 0),
              "canonical advance did not OR STATUS3_GRUDGE into attacker",
            );
          } else {
            assert(
              transition.rulesContext.battlers[battler] === currentRules.battlers[battler],
              `canonical advance replaced non-attacker battler ${battler}`,
            );
          }
        }
      }
      controls.push(control);
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
    return Object.freeze({ expected: null, controls: Object.freeze(controls), error: error.message });
  }
}

function branchFor(outcome) {
  return outcome.error === null ? outcome.controls.join("-then-") : "missing-attacker-role";
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

for (const attacker of ATTACKER_DOMAIN) {
  for (const [inputIndex, status3] of GRUDGE_INPUTS.entries()) {
    addCase(
      `attacker_a${attacker}_grudge_${inputIndex === 0 ? "clear" : "set"}`,
      "attacker-grudge-input-matrix",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus3: status3,
        salt: attacker * GRUDGE_INPUTS.length + inputIndex,
      }),
    );
  }
}

const status3EdgeLabels = [
  "zero",
  "max",
  "high_bit",
  "unrelated_bits",
  "below_grudge_bit",
  "grudge_bit",
  "grudge_plus_low_bit",
  "all_except_grudge",
];
for (const attacker of ATTACKER_DOMAIN) {
  for (const [edgeIndex, status3] of STATUS3_EDGE_VALUES.entries()) {
    addCase(
      `status3_edge_a${attacker}_${status3EdgeLabels[edgeIndex]}`,
      "status3-u32-edge-matrix",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus3: status3,
        salt: 40 + attacker * STATUS3_EDGE_VALUES.length + edgeIndex,
      }),
    );
  }
}

addCase(
  "clear_branch_mutates_only_attacker_preserves_siblings",
  "attacker-only-mutation",
  makeInitialRules({
    attacker: 2,
    focusBattler: 2,
    focusStatus3: 0x8000_0101,
    salt: 100,
  }),
);

addCase(
  "already_grudged_fail_jump_preserves_all_status3_without_program_counter",
  "already-grudged-fail-jump-preservation",
  makeInitialRules({
    attacker: 1,
    focusBattler: 1,
    focusStatus3: 0x8000_4101,
    salt: 110,
  }),
);

addCase(
  "missing_attacker_role_precedes_status3_read_and_failure_target_resolution",
  "missing-attacker-role",
  makeInitialRules({
    attacker: null,
    focusBattler: 2,
    focusStatus3: U32_MAX,
    salt: 120,
  }),
);

addCase(
  "repeated_clear_application_advances_then_fail_jumps",
  "repeated-clear-then-fail-jump",
  makeInitialRules({
    attacker: 3,
    focusBattler: 3,
    focusStatus3: 0x8000_0101,
    salt: 130,
  }),
  2,
);

addCase(
  "repeated_already_grudged_fail_jump_is_idempotent",
  "repeated-already-grudged-fail-jump",
  makeInitialRules({
    attacker: 0,
    focusBattler: 0,
    focusStatus3: 0x8000_4101,
    salt: 140,
  }),
  2,
);

assert(cases.length === 45, `case count drifted: ${cases.length}`);
for (const attacker of ATTACKER_DOMAIN) {
  for (const status3 of GRUDGE_INPUTS) {
    assert(
      cases.some((value) =>
        value.category === "attacker-grudge-input-matrix"
        && value.initial.attacker === attacker
        && value.initial.status3[attacker] === status3
      ),
      `Grudge input matrix omits attacker ${attacker} status3 ${status3}`,
    );
  }
  for (const status3 of STATUS3_EDGE_VALUES) {
    assert(
      cases.some((value) =>
        value.category === "status3-u32-edge-matrix"
        && value.initial.attacker === attacker
        && value.initial.status3[attacker] === status3
      ),
      `status3 edge matrix omits attacker ${attacker} status3 ${status3}`,
    );
  }
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["optional-attacker-role-values", ATTACKER_DOMAIN.length + 1],
  ["status3-u32-values", U32_MAX + 1],
  ["status3-grudge-clear-set-inputs", GRUDGE_INPUTS.length],
  ["status3-u32-edge-values", STATUS3_EDGE_VALUES.length],
  ["control-branch-values", 2],
  ["application-count-values", 2],
  ["typed-missing-attacker-combinations", 1],
  ["absolute-program-counter-fields-in-projection", 0],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  status3GrudgeMask: STATUS3_GRUDGE,
  grudgeInputDomain: GRUDGE_INPUTS,
  status3EdgeDomain: STATUS3_EDGE_VALUES,
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
  return `BattleScriptTrysetgrudgeBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustControl(value) {
  return value === "advance"
    ? "BattleScriptTrysetgrudgeControl::Advance"
    : "BattleScriptTrysetgrudgeControl::FailJump";
}

function rustControls(values) {
  return `&[${values.map(rustControl).join(", ")}]`;
}

function rustState(value) {
  return [
    "BattleScriptTrysetgrudgeVectorState {",
    `status3: [${value.status3.map(rustU32).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
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
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysetgrudge-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrysetgrudgeOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysetgrudge::{");
lines.push("    BattleScriptTrysetgrudgeBattler, BattleScriptTrysetgrudgeControl,");
lines.push("};");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_TRYSETGRUDGE_VECTOR_CORPUS_SHA256: &str = "
    + rustString(corpusHash)
    + ";",
);
lines.push(
  "pub const BATTLE_SCRIPT_TRYSETGRUDGE_ATTACKER_DOMAIN: [u8; "
    + ATTACKER_DOMAIN.length
    + "] = ["
    + ATTACKER_DOMAIN.join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_TRYSETGRUDGE_GRUDGE_INPUT_DOMAIN: [u32; "
    + GRUDGE_INPUTS.length
    + "] = ["
    + GRUDGE_INPUTS.map(rustU32).join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_TRYSETGRUDGE_STATUS3_EDGE_DOMAIN: [u32; "
    + STATUS3_EDGE_VALUES.length
    + "] = ["
    + STATUS3_EDGE_VALUES.map(rustU32).join(", ")
    + "];",
);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetgrudgeVectorState {");
lines.push("    pub status3: [u32; 4],");
lines.push("    pub attacker: Option<BattleScriptTrysetgrudgeBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetgrudgeVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptTrysetgrudgeVectorState,");
lines.push("    pub expected: Option<BattleScriptTrysetgrudgeVectorState>,");
lines.push("    pub controls: &'static [BattleScriptTrysetgrudgeControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_TRYSETGRUDGE_DOMAIN_CENSUS: [(&str, u64); "
    + domainCensus.length
    + "] = [",
);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_TRYSETGRUDGE_CATEGORY_CENSUS: [(&str, usize); "
    + categoryCensus.length
    + "] = [",
);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_TRYSETGRUDGE_BRANCH_CENSUS: [(&str, usize); "
    + branchCensus.length
    + "] = [",
);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(
  "pub static BATTLE_SCRIPT_TRYSETGRUDGE_CASES: [BattleScriptTrysetgrudgeVectorCase; "
    + cases.length
    + "] = [",
);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetgrudgeVectorCase {");
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
lines.push("];" );

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
if (!formatted) throw new Error("gen-battle-script-trysetgrudge-vectors: could not find rustfmt");

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(
  `gen-battle-script-trysetgrudge-vectors: wrote ${path.relative(workspaceRoot, outPath)}`,
);
console.log(`gen-battle-script-trysetgrudge-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-trysetgrudge-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-trysetgrudge-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-trysetgrudge-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-trysetgrudge-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-trysetgrudge-vectors: generated sha256 ${generatedHash}`);
