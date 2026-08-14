#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptNegativedamageOpcode.ts.
// Expected outputs are created only by executing the canonical TypeScript
// opcode handler; this script owns bounded input construction and Rust
// literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-negativedamage-vectors.mjs

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
  "battle_script_negativedamage_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptNegativedamageOpcode.ts")).href),
]);

const I32_MIN = -2_147_483_648;
const I32_MAX = 2_147_483_647;
const NEGATIVEDAMAGE_OPCODE = "B_SCR_OP_NEGATIVEDAMAGE";

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-negativedamage-vectors: " + message);
}

function assertI32(value, label) {
  assert(Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX, `${label} must be a signed i32, got ${value}`);
}

const CASE_SPECS = Object.freeze([
  Object.freeze({ label: "i32_min", hpDealt: I32_MIN, category: "i32-boundaries" }),
  Object.freeze({ label: "i32_min_plus_one", hpDealt: I32_MIN + 1, category: "i32-boundaries" }),
  Object.freeze({ label: "i32_max_minus_one", hpDealt: I32_MAX - 1, category: "i32-boundaries" }),
  Object.freeze({ label: "i32_max", hpDealt: I32_MAX, category: "i32-boundaries" }),
  Object.freeze({ label: "small_negative_three", hpDealt: -3, category: "small-signed-window" }),
  Object.freeze({ label: "small_negative_two", hpDealt: -2, category: "small-signed-window" }),
  Object.freeze({ label: "small_negative_one", hpDealt: -1, category: "small-signed-window" }),
  Object.freeze({ label: "minimum_one_guard_zero", hpDealt: 0, category: "minimum-one-guard" }),
  Object.freeze({ label: "minimum_one_guard_one", hpDealt: 1, category: "minimum-one-guard" }),
  Object.freeze({ label: "small_positive_two", hpDealt: 2, category: "small-signed-window" }),
  Object.freeze({ label: "small_positive_three", hpDealt: 3, category: "small-signed-window" }),
  Object.freeze({ label: "negative_even_four", hpDealt: -4, category: "signed-parity-representatives" }),
  Object.freeze({ label: "negative_odd_five", hpDealt: -5, category: "signed-parity-representatives" }),
  Object.freeze({ label: "negative_even_hundred", hpDealt: -100, category: "signed-parity-representatives" }),
  Object.freeze({ label: "negative_even_1024", hpDealt: -1024, category: "signed-parity-representatives" }),
  Object.freeze({ label: "negative_odd_1025", hpDealt: -1025, category: "signed-parity-representatives" }),
  Object.freeze({ label: "positive_even_four", hpDealt: 4, category: "signed-parity-representatives" }),
  Object.freeze({ label: "positive_even_hundred", hpDealt: 100, category: "signed-parity-representatives" }),
  Object.freeze({ label: "positive_even_1024", hpDealt: 1024, category: "signed-parity-representatives" }),
  Object.freeze({ label: "positive_odd_1025", hpDealt: 1025, category: "signed-parity-representatives" }),
  Object.freeze({ label: "real_drain_five", hpDealt: 5, category: "real-drain-values" }),
  Object.freeze({ label: "real_drain_seven", hpDealt: 7, category: "real-drain-values" }),
  Object.freeze({ label: "real_drain_forty", hpDealt: 40, category: "real-drain-values" }),
  Object.freeze({ label: "real_drain_one_hundred_one", hpDealt: 101, category: "real-drain-values" }),
]);

function branchFor(hpDealt) {
  const floorHalf = Math.floor(hpDealt / 2);
  if (-floorHalf === 0) return "zero-half-minimum-one";
  if (hpDealt < 0) {
    return hpDealt % 2 === 0 ? "negative-even-floor-half" : "negative-odd-floor-half";
  }
  return hpDealt % 2 === 0 ? "nonnegative-even-floor-half" : "nonnegative-odd-floor-half";
}

const program = programModule.loadBattleScriptProgram();
const instruction = program.instructions.find((candidate) => candidate.opcodeName === NEGATIVEDAMAGE_OPCODE);
assert(instruction !== undefined, "committed Battle Script program does not emit " + NEGATIVEDAMAGE_OPCODE);
assert(instruction.operands.length === 0, "canonical NEGATIVEDAMAGE instruction must have zero operands");
const handlers = opcodeModule.createBattleScriptNegativedamageOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical NEGATIVEDAMAGE handler was not registered");

function sourceOutcome(hpDealt) {
  const rulesContext = Object.freeze({ hpDealt });
  const state = machineModule.createBattleScriptMachine(
    program,
    "BattleScript_EffectAbsorb",
    rulesContext,
    0,
  );
  const transition = handler({ program, instruction, state });
  assert(transition.control.kind === "advance", "canonical handler did not advance");
  assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
  assert(transition.rng === state.rng, "canonical handler consumed RNG");
  const output = transition.rulesContext.battleMoveDamage;
  assertI32(output, "canonical battleMoveDamage");
  return output;
}

const seenInputs = new Set();
const cases = CASE_SPECS.map((spec) => {
  assertI32(spec.hpDealt, spec.label + " hpDealt");
  assert(!seenInputs.has(spec.hpDealt), "duplicate hpDealt input " + spec.hpDealt);
  seenInputs.add(spec.hpDealt);
  return Object.freeze({
    label: spec.label,
    category: spec.category,
    branch: branchFor(spec.hpDealt),
    hpDealt: spec.hpDealt,
    expectedBattleMoveDamage: sourceOutcome(spec.hpDealt),
  });
});

const requiredSmallWindow = [-3, -2, -1, 0, 1, 2, 3];
for (const hpDealt of requiredSmallWindow) {
  assert(seenInputs.has(hpDealt), "missing required -3..3 input " + hpDealt);
}
for (const hpDealt of [I32_MIN, I32_MAX]) {
  assert(seenInputs.has(hpDealt), "missing i32 endpoint " + hpDealt);
}
for (const hpDealt of [-5, -4, 4, 5]) {
  const value = cases.find((candidate) => candidate.hpDealt === hpDealt);
  assert(value !== undefined, "missing signed odd/even representative " + hpDealt);
}
for (const hpDealt of [5, 7, 40, 101]) {
  const value = cases.find((candidate) => candidate.hpDealt === hpDealt);
  assert(value?.category === "real-drain-values", "missing real drain representative " + hpDealt);
}

const inputDomain = [...seenInputs].sort((left, right) => left - right);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["canonical-signed-i32", 4_294_967_296],
  ["i32-boundary-inputs", 4],
  ["small-signed-window-inputs", 7],
  ["minimum-one-guard-inputs", 2],
  ["signed-parity-representative-inputs", 9],
  ["real-drain-inputs", 4],
]);
const corpus = Object.freeze({
  inputDomain,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-negativedamage-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptNegativedamageOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_NEGATIVEDAMAGE_VECTOR_CORPUS_SHA256: &str = " + rustString(corpusHash) + ";");
lines.push("pub const BATTLE_SCRIPT_NEGATIVEDAMAGE_INPUT_DOMAIN: [i32; " + inputDomain.length + "] = [" + inputDomain.join(", ") + "];" );
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptNegativedamageVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub hp_dealt: i32,");
lines.push("    pub expected_battle_move_damage: i32,");
lines.push("}");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_NEGATIVEDAMAGE_DOMAIN_CENSUS: [(&str, u64); " + domainCensus.length + "] = [");
for (const [name, count] of domainCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push("pub const BATTLE_SCRIPT_NEGATIVEDAMAGE_CATEGORY_CENSUS: [(&str, usize); " + categoryCensus.length + "] = [");
for (const [name, count] of categoryCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push("pub const BATTLE_SCRIPT_NEGATIVEDAMAGE_BRANCH_CENSUS: [(&str, usize); " + branchCensus.length + "] = [");
for (const [name, count] of branchCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push("pub static BATTLE_SCRIPT_NEGATIVEDAMAGE_CASES: [BattleScriptNegativedamageVectorCase; " + cases.length + "] = [");
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptNegativedamageVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        hp_dealt: " + value.hpDealt + ",");
  lines.push("        expected_battle_move_damage: " + value.expectedBattleMoveDamage + ",");
  lines.push("    },");
}
lines.push("];");

fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
let rustfmt = "rustfmt";
try {
  rustfmt = execFileSync("rustup", ["which", "rustfmt"], { encoding: "utf8" }).trim();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log("gen-battle-script-negativedamage-vectors: wrote " + path.relative(workspaceRoot, outPath));
console.log("gen-battle-script-negativedamage-vectors: " + cases.length + " cases");
console.log("gen-battle-script-negativedamage-vectors: input domain " + JSON.stringify(inputDomain));
console.log("gen-battle-script-negativedamage-vectors: domain census " + JSON.stringify(domainCensus));
console.log("gen-battle-script-negativedamage-vectors: category census " + JSON.stringify(categoryCensus));
console.log("gen-battle-script-negativedamage-vectors: branch census " + JSON.stringify(branchCensus));
console.log("gen-battle-script-negativedamage-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-negativedamage-vectors: generated sha256 " + generatedHash);
