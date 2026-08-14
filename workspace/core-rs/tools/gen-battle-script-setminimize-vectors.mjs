#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSetminimizeOpcode.ts.
// Expected outputs are created only by executing the canonical TypeScript
// opcode handler; this script owns bounded input construction and Rust literal
// emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-setminimize-vectors.mjs

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
  "battle_script_setminimize_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesConstants, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSetminimizeOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSourceConstants.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETMINIMIZE";
const OPCODE_ID = 0xc7;
const DISPATCHER = "Cmd_setminimize";
const ENTRY_LABEL = "BattleScript_EffectMinimize";
const BATTLE_SLOTS = 4;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const U32_MAX = 0xffff_ffff;
const OBEYS_MASK = rulesConstants.BATTLE_SCRIPT_HITMARKER_OBEYS;
const MINIMIZED_MASK = sourceConstants.BATTLE_SCRIPT_STATUS3_MINIMIZED;
const MINIMIZED_INPUTS = Object.freeze([0, MINIMIZED_MASK]);
const STATUS3_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0000_0001,
]);
const HIT_MARKER_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0100_0001,
]);
const NON_ATTACKER_STATUS3 = Object.freeze([
  0x0000_0040,
  0x0004_0000,
  0x8000_0000,
  0x0000_0001,
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-setminimize-vectors: ${message}`);
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

function freezeRules(status3, hitMarker, attacker) {
  assert(Array.isArray(status3) && status3.length === BATTLE_SLOTS, "status3 must have four cells");
  status3.forEach((value, index) => assertU32(value, `status3[${index}]`));
  assertU32(hitMarker, "hitMarker");
  assertOptionalBattler(attacker, "attacker role");
  return Object.freeze({
    battlers: Object.freeze(status3.map((value) => Object.freeze({ status3: value >>> 0 }))),
    hitMarker: hitMarker >>> 0,
    selectorRoles: Object.freeze({ attacker }),
  });
}

function makeInitialRules({ attacker, focusStatus3, focusBattler, hitMarker, salt }) {
  assertOptionalBattler(attacker, "initial attacker");
  assertBattler(focusBattler, "initial focus battler");
  assertU32(focusStatus3, "initial focus status3");
  assertU32(hitMarker, "initial hitMarker");
  const status3 = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusStatus3
      : NON_ATTACKER_STATUS3[(battler + salt) % NON_ATTACKER_STATUS3.length]
  ));
  return freezeRules(status3, hitMarker, attacker);
}

function vectorState(rules) {
  return Object.freeze({
    status3: Object.freeze(rules.battlers.map((battler) => battler.status3 >>> 0)),
    hitMarker: rules.hitMarker >>> 0,
    attacker: rules.selectorRoles.attacker,
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
assert(instruction.operands.length === 0, "canonical opcode must have no operands");
assert(OBEYS_MASK === 0x0200_0000, `HITMARKER_OBEYS drifted to ${OBEYS_MASK}`);
assert(
  sourceConstants.BATTLE_SCRIPT_HITMARKER_OBEYS === OBEYS_MASK,
  "rules-context and source-constant HITMARKER_OBEYS values diverged",
);
assert(MINIMIZED_MASK === 0x0000_0100, `STATUS3_MINIMIZED drifted to ${MINIMIZED_MASK}`);

const handlers = opcodeModule.createBattleScriptSetminimizeOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETMINIMIZE handler was not registered");

function sourceOutcome(initialRules, applications) {
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  try {
    for (let application = 0; application < applications; application += 1) {
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

      const obeys = (currentRules.hitMarker & OBEYS_MASK) !== 0;
      if (!obeys) {
        assert(
          transition.rulesContext === currentRules,
          "OBEYS-clear canonical branch replaced the complete rules projection",
        );
      } else {
        const attacker = currentRules.selectorRoles.attacker;
        assert(attacker !== null, "successful OBEYS-set handler had no attacker");
        for (const battler of BATTLER_DOMAIN) {
          if (battler !== attacker) {
            assert(
              transition.rulesContext.battlers[battler] === currentRules.battlers[battler],
              `canonical handler replaced non-attacker battler ${battler}`,
            );
          }
        }
        assert(
          transition.rulesContext.selectorRoles === currentRules.selectorRoles,
          "canonical handler replaced selector roles",
        );
        assert(
          transition.rulesContext.hitMarker === currentRules.hitMarker,
          "canonical handler changed hitMarker",
        );
      }
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({ expected: vectorState(currentRules), error: null });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input rules");
    return Object.freeze({ expected: null, error: error.message });
  }
}

const cases = [];
function addCase(label, category, branch, initialRules, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be 1 or 2`);
  const outcome = sourceOutcome(initialRules, applications);
  if (branch === "missing-attacker-role") {
    assert(outcome.expected === null, `${label}: error branch unexpectedly returned state`);
    assert(typeof outcome.error === "string", `${label}: error branch omitted message`);
  } else {
    assert(outcome.error === null, `${label}: successful branch threw ${outcome.error}`);
    assert(outcome.expected !== null, `${label}: successful branch omitted expected state`);
  }
  cases.push(Object.freeze({
    label,
    category,
    branch,
    applications,
    initial: vectorState(initialRules),
    expected: outcome.expected,
    expectedError: outcome.error,
  }));
}

for (const attacker of BATTLER_DOMAIN) {
  for (const obeys of [false, true]) {
    for (const [inputIndex, status3] of MINIMIZED_INPUTS.entries()) {
      addCase(
        `gate_a${attacker}_${obeys ? "obeys" : "not_obeys"}_${inputIndex === 0 ? "clear" : "already_set"}`,
        "attacker-gate-minimized-matrix",
        obeys ? "set-attacker-minimized" : "obeys-clear-noop",
        makeInitialRules({
          attacker,
          focusBattler: attacker,
          focusStatus3: status3,
          hitMarker: obeys ? OBEYS_MASK : 0,
          salt: attacker * 11 + (obeys ? 5 : 0) + inputIndex,
        }),
      );
    }
  }
}

const edgeLabels = ["zero", "max", "high_bit", "unrelated_bit"];
for (const attacker of BATTLER_DOMAIN) {
  for (const [edgeIndex, status3] of STATUS3_EDGE_VALUES.entries()) {
    addCase(
      `status3_edge_a${attacker}_${edgeLabels[edgeIndex]}`,
      "status3-u32-edge-matrix",
      "set-attacker-minimized",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus3: status3,
        hitMarker: OBEYS_MASK | 0x0000_0040,
        salt: 50 + attacker * STATUS3_EDGE_VALUES.length + edgeIndex,
      }),
    );
  }
}

for (const attacker of BATTLER_DOMAIN) {
  for (const [edgeIndex, hitMarker] of HIT_MARKER_EDGE_VALUES.entries()) {
    const obeys = (hitMarker & OBEYS_MASK) !== 0;
    addCase(
      `hitmarker_edge_a${attacker}_${edgeLabels[edgeIndex]}`,
      "hitmarker-u32-edge-matrix",
      obeys ? "set-attacker-minimized" : "obeys-clear-noop",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus3: 0x4000_0001,
        hitMarker,
        salt: 90 + attacker * HIT_MARKER_EDGE_VALUES.length + edgeIndex,
      }),
    );
  }
}

addCase(
  "missing_attacker_not_obeys_succeeds",
  "missing-attacker-gate-ordering",
  "obeys-clear-noop",
  makeInitialRules({
    attacker: null,
    focusBattler: 2,
    focusStatus3: 0xffff_ffff,
    hitMarker: 0x8000_0001,
    salt: 140,
  }),
);
addCase(
  "missing_attacker_obeys_errors",
  "missing-attacker-gate-ordering",
  "missing-attacker-role",
  makeInitialRules({
    attacker: null,
    focusBattler: 2,
    focusStatus3: 0xffff_ffff,
    hitMarker: (OBEYS_MASK | 0x8000_0001) >>> 0,
    salt: 141,
  }),
);
addCase(
  "repeated_obeys_application_is_idempotent",
  "repeated-application",
  "set-attacker-minimized",
  makeInitialRules({
    attacker: 3,
    focusBattler: 3,
    focusStatus3: 0x8000_0001,
    hitMarker: OBEYS_MASK | 0x4000_0000,
    salt: 150,
  }),
  2,
);

assert(cases.length === 51, `case count drifted: ${cases.length}`);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", BATTLER_DOMAIN.length],
  ["optional-attacker-role-values", BATTLER_DOMAIN.length + 1],
  ["status3-u32-values", U32_MAX + 1],
  ["hitmarker-u32-values", U32_MAX + 1],
  ["status3-edge-values", STATUS3_EDGE_VALUES.length],
  ["hitmarker-edge-values", HIT_MARKER_EDGE_VALUES.length],
  ["obeys-gate-values", 2],
  ["minimized-clear-set-inputs", MINIMIZED_INPUTS.length],
  ["application-count-values", 2],
  ["typed-missing-role-gate-combinations", 2],
]);
const corpus = Object.freeze({
  battlerDomain: BATTLER_DOMAIN,
  status3EdgeDomain: STATUS3_EDGE_VALUES,
  hitMarkerEdgeDomain: HIT_MARKER_EDGE_VALUES,
  minimizedInputDomain: MINIMIZED_INPUTS,
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
  return `BattleScriptSetminimizeBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustState(value) {
  return [
    "BattleScriptSetminimizeVectorState {",
    `status3: [${value.status3.map(rustU32).join(", ")}],`,
    `hit_marker: ${rustU32(value.hitMarker)},`,
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
lines.push("// GENERATED by core-rs/tools/gen-battle-script-setminimize-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetminimizeOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_setminimize::BattleScriptSetminimizeBattler;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETMINIMIZE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SETMINIMIZE_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETMINIMIZE_STATUS3_EDGE_DOMAIN: [u32; ${STATUS3_EDGE_VALUES.length}] = [${STATUS3_EDGE_VALUES.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETMINIMIZE_HIT_MARKER_EDGE_DOMAIN: [u32; ${HIT_MARKER_EDGE_VALUES.length}] = [${HIT_MARKER_EDGE_VALUES.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETMINIMIZE_MINIMIZED_INPUT_DOMAIN: [u32; ${MINIMIZED_INPUTS.length}] = [${MINIMIZED_INPUTS.map(rustU32).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetminimizeVectorState {");
lines.push("    pub status3: [u32; 4],");
lines.push("    pub hit_marker: u32,");
lines.push("    pub attacker: Option<BattleScriptSetminimizeBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetminimizeVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSetminimizeVectorState,");
lines.push("    pub expected: Option<BattleScriptSetminimizeVectorState>,");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETMINIMIZE_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETMINIMIZE_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETMINIMIZE_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SETMINIMIZE_CASES: [BattleScriptSetminimizeVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSetminimizeVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        applications: ${value.applications},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
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
if (!formatted) throw new Error("gen-battle-script-setminimize-vectors: could not find rustfmt");

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-battle-script-setminimize-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-setminimize-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-setminimize-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-setminimize-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-setminimize-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-setminimize-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-setminimize-vectors: generated sha256 ${generatedHash}`);
