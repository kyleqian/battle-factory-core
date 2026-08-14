#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSetDefenseCurlBitOpcode.ts.
// Expected controls and outputs are created only by executing the canonical
// TypeScript opcode handler; this script owns bounded input construction and
// Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-setdefensecurlbit-vectors.mjs

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
  "battle_script_setdefensecurlbit_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSetDefenseCurlBitOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSourceConstants.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETDEFENSECURLBIT";
const OPCODE_ID = 0xbf;
const DISPATCHER = "Cmd_setdefensecurlbit";
const ENTRY_LABEL = "BattleScript_EffectDefenseCurl";
const BATTLE_SLOTS = 4;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const U32_MAX = 0xffff_ffff;
const DEFENSE_CURL_MASK = sourceConstants.BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL;
const STATUS2_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0100_0001,
]);
const DEFENSE_CURL_INPUTS = Object.freeze([0, DEFENSE_CURL_MASK]);
const NON_ATTACKER_STATUS2 = Object.freeze([
  0x0100_0000,
  0x0400_0000,
  0x8000_0000,
  0x0000_0001,
]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-setdefensecurlbit-vectors: " + message);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), label + " must be one of 0..3, got " + value);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU32(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= U32_MAX,
    label + " must be a u32, got " + value,
  );
}

function freezeRules(status2, attacker) {
  assert(Array.isArray(status2) && status2.length === BATTLE_SLOTS, "status2 must have four cells");
  status2.forEach((value, index) => assertU32(value, "status2[" + index + "]"));
  assertOptionalBattler(attacker, "attacker role");
  return Object.freeze({
    battlers: Object.freeze(status2.map((value) => Object.freeze({ status2: value >>> 0 }))),
    selectorRoles: Object.freeze({ attacker }),
  });
}

function makeInitialRules({ attacker, focusBattler, focusStatus2, salt }) {
  assertOptionalBattler(attacker, "initial attacker");
  assertBattler(focusBattler, "initial focus battler");
  assertU32(focusStatus2, "initial focus status2");
  const status2 = ATTACKER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusStatus2
      : NON_ATTACKER_STATUS2[(battler + salt) % NON_ATTACKER_STATUS2.length]
  ));
  return freezeRules(status2, attacker);
}

function vectorState(rules) {
  return Object.freeze({
    status2: Object.freeze(rules.battlers.map((battler) => battler.status2 >>> 0)),
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
  "expected exactly one " + OPCODE_NAME + " instruction, got " + instructions.length,
);
const instruction = instructions[0];
assert(
  instruction.opcodeId === OPCODE_ID,
  "expected opcode " + OPCODE_ID + ", got " + instruction.opcodeId,
);
assert(
  instruction.dispatcher === DISPATCHER,
  "expected dispatcher " + DISPATCHER + ", got " + instruction.dispatcher,
);
assert(instruction.operands.length === 0, "canonical opcode must have no operands");
assert(
  DEFENSE_CURL_MASK === 0x4000_0000,
  "STATUS2_DEFENSE_CURL drifted to " + DEFENSE_CURL_MASK,
);

const handlers = opcodeModule.createBattleScriptSetDefenseCurlBitOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETDEFENSECURLBIT handler was not registered");

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
      assert(transition.control.kind === "advance", "canonical handler did not advance");
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");

      const attacker = currentRules.selectorRoles.attacker;
      assert(attacker !== null, "successful canonical handler had no attacker");
      for (const battler of ATTACKER_DOMAIN) {
        if (battler !== attacker) {
          assert(
            transition.rulesContext.battlers[battler] === currentRules.battlers[battler],
            "canonical handler replaced non-attacker battler " + battler,
          );
        }
      }
      assert(
        transition.rulesContext.selectorRoles === currentRules.selectorRoles,
        "canonical handler replaced selector roles",
      );
      controls.push("advance");
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "canonical handler threw non-Error " + String(error));
    assert(
      sameState(vectorState(initialRules), inputSnapshot),
      "throwing canonical handler mutated input rules",
    );
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  return outcome.error === null ? outcome.controls.join("-then-") : "missing-attacker-role";
}

const cases = [];
function addCase(label, category, initialRules, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid label " + label);
  assert(!cases.some((value) => value.label === label), "duplicate label " + label);
  assert(applications === 1 || applications === 2, label + ": applications must be 1 or 2");
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
  for (const [inputIndex, status2] of DEFENSE_CURL_INPUTS.entries()) {
    addCase(
      "attacker_a" + attacker + "_" + (inputIndex === 0 ? "clear" : "already_set"),
      "attacker-status2-matrix",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus2: status2,
        salt: attacker * 7 + inputIndex,
      }),
    );
  }
}

const edgeLabels = ["zero", "max", "high_bit", "unrelated_bits"];
for (const attacker of ATTACKER_DOMAIN) {
  for (const [edgeIndex, status2] of STATUS2_EDGE_VALUES.entries()) {
    addCase(
      "edge_a" + attacker + "_" + edgeLabels[edgeIndex],
      "u32-status2-edge-matrix",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus2: status2,
        salt: 40 + attacker * STATUS2_EDGE_VALUES.length + edgeIndex,
      }),
    );
  }
}

addCase(
  "missing_attacker_role_precedes_status2_read",
  "missing-attacker-role",
  makeInitialRules({
    attacker: null,
    focusBattler: 2,
    focusStatus2: U32_MAX,
    salt: 96,
  }),
);

addCase(
  "attacker_only_mutation_preserves_siblings_and_unrelated_bits",
  "attacker-only-mutation",
  makeInitialRules({
    attacker: 2,
    focusBattler: 2,
    focusStatus2: 0x8000_0101,
    salt: 120,
  }),
);

addCase(
  "repeated_application_is_idempotent_and_advances_each_time",
  "repeated-application",
  makeInitialRules({
    attacker: 3,
    focusBattler: 3,
    focusStatus2: 0x0100_0001,
    salt: 130,
  }),
  2,
);

assert(cases.length === 27, "case count drifted: " + cases.length);
for (const attacker of ATTACKER_DOMAIN) {
  for (const status2 of DEFENSE_CURL_INPUTS) {
    assert(
      cases.some((value) =>
        value.category === "attacker-status2-matrix"
        && value.initial.attacker === attacker
        && value.initial.status2[attacker] === status2
      ),
      "matrix omits attacker " + attacker + " status2 " + status2,
    );
  }
  for (const status2 of STATUS2_EDGE_VALUES) {
    assert(
      cases.some((value) =>
        value.category === "u32-status2-edge-matrix"
        && value.initial.attacker === attacker
        && value.initial.status2[attacker] === status2
      ),
      "edge matrix omits attacker " + attacker + " status2 " + status2,
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
  ["status2-u32-values", U32_MAX + 1],
  ["status2-edge-values", STATUS2_EDGE_VALUES.length],
  ["defense-curl-clear-set-inputs", DEFENSE_CURL_INPUTS.length],
  ["application-count-values", 2],
  ["typed-missing-attacker-combinations", 1],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  status2EdgeDomain: STATUS2_EDGE_VALUES,
  defenseCurlInputDomain: DEFENSE_CURL_INPUTS,
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
  return "0x" + value.toString(16).padStart(8, "0");
}

function rustBattler(value) {
  return "BattleScriptSetdefensecurlbitBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustState(value) {
  return [
    "BattleScriptSetdefensecurlbitVectorState {",
    "status2: [" + value.status2.map(rustU32).join(", ") + "],",
    "attacker: " + rustOptionalBattler(value.attacker) + ",",
    "}",
  ].join(" ");
}

function rustOptionalState(value) {
  return value === null ? "None" : "Some(" + rustState(value) + ")";
}

function rustOptionalString(value) {
  return value === null ? "None" : "Some(" + rustString(value) + ")";
}

function rustControls(values) {
  return "&[" + values.map(() => "BattleScriptSetdefensecurlbitControl::Advance").join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-setdefensecurlbit-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetDefenseCurlBitOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_setdefensecurlbit::{");
lines.push("    BattleScriptSetdefensecurlbitBattler, BattleScriptSetdefensecurlbitControl,");
lines.push("};");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_SETDEFENSECURLBIT_VECTOR_CORPUS_SHA256: &str = "
    + rustString(corpusHash)
    + ";",
);
lines.push(
  "pub const BATTLE_SCRIPT_SETDEFENSECURLBIT_ATTACKER_DOMAIN: [u8; "
    + ATTACKER_DOMAIN.length
    + "] = ["
    + ATTACKER_DOMAIN.join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_SETDEFENSECURLBIT_STATUS2_EDGE_DOMAIN: [u32; "
    + STATUS2_EDGE_VALUES.length
    + "] = ["
    + STATUS2_EDGE_VALUES.map(rustU32).join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_SETDEFENSECURLBIT_INPUT_DOMAIN: [u32; "
    + DEFENSE_CURL_INPUTS.length
    + "] = ["
    + DEFENSE_CURL_INPUTS.map(rustU32).join(", ")
    + "];",
);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetdefensecurlbitVectorState {");
lines.push("    pub status2: [u32; 4],");
lines.push("    pub attacker: Option<BattleScriptSetdefensecurlbitBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetdefensecurlbitVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSetdefensecurlbitVectorState,");
lines.push("    pub expected: Option<BattleScriptSetdefensecurlbitVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSetdefensecurlbitControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_SETDEFENSECURLBIT_DOMAIN_CENSUS: [(&str, u64); "
    + domainCensus.length
    + "] = [",
);
for (const [name, count] of domainCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_SETDEFENSECURLBIT_CATEGORY_CENSUS: [(&str, usize); "
    + categoryCensus.length
    + "] = [",
);
for (const [name, count] of categoryCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_SETDEFENSECURLBIT_BRANCH_CENSUS: [(&str, usize); "
    + branchCensus.length
    + "] = [",
);
for (const [name, count] of branchCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub static BATTLE_SCRIPT_SETDEFENSECURLBIT_CASES: [BattleScriptSetdefensecurlbitVectorCase; "
    + cases.length
    + "] = [",
);
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptSetdefensecurlbitVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        applications: " + value.applications + ",");
  lines.push("        initial: " + rustState(value.initial) + ",");
  lines.push("        expected: " + rustOptionalState(value.expected) + ",");
  lines.push("        controls: " + rustControls(value.controls) + ",");
  lines.push("        expected_error: " + rustOptionalString(value.expectedError) + ",");
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
if (!formatted) {
  throw new Error("gen-battle-script-setdefensecurlbit-vectors: could not find rustfmt");
}

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(
  "gen-battle-script-setdefensecurlbit-vectors: wrote "
    + path.relative(workspaceRoot, outPath),
);
console.log("gen-battle-script-setdefensecurlbit-vectors: " + cases.length + " cases");
console.log(
  "gen-battle-script-setdefensecurlbit-vectors: domain census " + JSON.stringify(domainCensus),
);
console.log(
  "gen-battle-script-setdefensecurlbit-vectors: category census " + JSON.stringify(categoryCensus),
);
console.log(
  "gen-battle-script-setdefensecurlbit-vectors: branch census " + JSON.stringify(branchCensus),
);
console.log("gen-battle-script-setdefensecurlbit-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-setdefensecurlbit-vectors: generated sha256 " + generatedHash);
