#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptBattlerPositions.ts.
// Expected outputs are created only by executing the canonical TypeScript
// resolver; this script owns bounded input construction and Rust literal
// emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-battler-positions-vectors.mjs

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
  "battle_script_battler_positions_vectors_gen.rs",
);
const resolver = await import(pathToFileURL(path.join(
  workspaceRoot,
  "src",
  "engine",
  "battleScriptBattlerPositions.ts",
)).href);

const BATTLERS_COUNT_DOMAIN = Object.freeze([2, 4]);
const OPERAND_DOMAIN = Object.freeze([
  Object.freeze({
    label: "player_left",
    expression: "B_POSITION_PLAYER_LEFT",
    category: "canonical-player-left",
    branch: "resolve-player-left-through-count-gate",
  }),
  Object.freeze({
    label: "opponent_left",
    expression: "B_POSITION_OPPONENT_LEFT",
    category: "canonical-opponent-left",
    branch: "resolve-opponent-left-through-count-gate",
  }),
  Object.freeze({
    label: "attacker_raw_collision",
    expression: "BS_ATTACKER",
    category: "raw-bs-attacker-collision",
    branch: "resolve-attacker-byte-as-opponent-left-through-count-gate",
  }),
  Object.freeze({
    label: "player_right",
    expression: "B_POSITION_PLAYER_RIGHT",
    category: "unknown-position",
    branch: "unknown-expression-return-null",
  }),
  Object.freeze({
    label: "opponent_right",
    expression: "B_POSITION_OPPONENT_RIGHT",
    category: "unknown-position",
    branch: "unknown-expression-return-null",
  }),
  Object.freeze({
    label: "target_selector",
    expression: "BS_TARGET",
    category: "unknown-selector",
    branch: "unknown-expression-return-null",
  }),
  Object.freeze({
    label: "player1_selector",
    expression: "BS_PLAYER1",
    category: "unknown-selector",
    branch: "unknown-expression-return-null",
  }),
  Object.freeze({
    label: "empty",
    expression: "",
    category: "unknown-raw-string",
    branch: "unknown-expression-return-null",
  }),
  Object.freeze({
    label: "numeric_one",
    expression: "1",
    category: "unknown-raw-string",
    branch: "unknown-expression-return-null",
  }),
  Object.freeze({
    label: "attacker_trailing_space",
    expression: "BS_ATTACKER ",
    category: "unknown-raw-string",
    branch: "unknown-expression-return-null",
  }),
]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-battler-positions-vectors: " + message);
}

function sourceOutcome(battlersCount, expression) {
  const topology = Object.freeze({ battlersCount });
  const context = Object.freeze({
    state: Object.freeze({
      rulesContext: Object.freeze({ battleTopology: topology }),
    }),
  });
  const operand = Object.freeze({ expression });
  const outcome = resolver.resolveSingleBattlePosition(context, operand);
  assert(
    outcome === null || outcome === 0 || outcome === 1,
    "canonical resolver returned unsupported result " + JSON.stringify(outcome),
  );
  return outcome;
}

function expectedForKnownExpression(expression) {
  if (expression === "B_POSITION_PLAYER_LEFT") return 0;
  if (expression === "B_POSITION_OPPONENT_LEFT" || expression === "BS_ATTACKER") return 1;
  return null;
}

const cases = [];
for (const battlersCount of BATTLERS_COUNT_DOMAIN) {
  for (const operand of OPERAND_DOMAIN) {
    const expectedBattler = sourceOutcome(battlersCount, operand.expression);
    const rawPosition = expectedForKnownExpression(operand.expression);
    const expectedAfterGate = rawPosition !== null && rawPosition < battlersCount
      ? rawPosition
      : null;
    assert(
      expectedBattler === expectedAfterGate,
      "canonical result drifted for " + operand.expression + " at battlersCount " + battlersCount,
    );
    cases.push(Object.freeze({
      label: "battlers_count_" + battlersCount + "_" + operand.label,
      battlersCount,
      expression: operand.expression,
      category: operand.category,
      branch: operand.branch,
      expectedBattler,
    }));
  }
}

assert(cases.length === BATTLERS_COUNT_DOMAIN.length * OPERAND_DOMAIN.length, "case product drifted");
for (const battlersCount of BATTLERS_COUNT_DOMAIN) {
  for (const operand of OPERAND_DOMAIN) {
    assert(
      cases.some((value) => value.battlersCount === battlersCount && value.expression === operand.expression),
      "missing battlersCount/expression pair",
    );
  }
}
assert(
  cases.filter((value) => value.expression === "BS_ATTACKER").every((value) => value.expectedBattler === 1),
  "BS_ATTACKER raw-byte collision must resolve to opponent-left",
);
assert(
  cases.filter((value) => value.branch === "unknown-expression-return-null").every((value) => value.expectedBattler === null),
  "unknown expressions must resolve to null",
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const battlerResultCensus = census(cases, (value) => value.expectedBattler === null ? "null" : String(value.expectedBattler));
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["typed-battlers-count-values", BATTLERS_COUNT_DOMAIN.length],
  ["known-position-expressions", 3],
  ["unknown-expression-samples", OPERAND_DOMAIN.length - 3],
]);
const corpus = Object.freeze({
  battlersCountDomain: BATTLERS_COUNT_DOMAIN,
  operandDomain: OPERAND_DOMAIN.map((value) => Object.freeze({
    expression: value.expression,
    category: value.category,
    branch: value.branch,
  })),
  domainCensus,
  battlerResultCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustCount(value) {
  return value === 2
    ? "BattleScriptBattlersCount::Singles"
    : "BattleScriptBattlersCount::Doubles";
}

function rustOptionalU8(value) {
  return value === null ? "None" : "Some(" + value + ")";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-battler-positions-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptBattlerPositions.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_battler_positions::BattleScriptBattlersCount;");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_BATTLER_POSITION_VECTOR_CORPUS_SHA256: &str = " + rustString(corpusHash) + ";");
lines.push("pub const BATTLE_SCRIPT_BATTLER_POSITION_BATTLERS_COUNT_DOMAIN: [u8; " + BATTLERS_COUNT_DOMAIN.length + "] = [" + BATTLERS_COUNT_DOMAIN.join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_BATTLER_POSITION_EXPRESSION_DOMAIN: [&str; " + OPERAND_DOMAIN.length + "] = [");
for (const operand of OPERAND_DOMAIN) lines.push("    " + rustString(operand.expression) + ",");
lines.push("];" );
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptBattlerPositionVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub battlers_count: BattleScriptBattlersCount,");
lines.push("    pub expression: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub expected_battler: Option<u8>,");
lines.push("}");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_BATTLER_POSITION_DOMAIN_CENSUS: [(&str, usize); " + domainCensus.length + "] = [");
for (const [name, count] of domainCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push("pub const BATTLE_SCRIPT_BATTLER_POSITION_RESULT_CENSUS: [(&str, usize); " + battlerResultCensus.length + "] = [");
for (const [name, count] of battlerResultCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push("pub const BATTLE_SCRIPT_BATTLER_POSITION_CATEGORY_CENSUS: [(&str, usize); " + categoryCensus.length + "] = [");
for (const [name, count] of categoryCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push("pub const BATTLE_SCRIPT_BATTLER_POSITION_BRANCH_CENSUS: [(&str, usize); " + branchCensus.length + "] = [");
for (const [name, count] of branchCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push("pub static BATTLE_SCRIPT_BATTLER_POSITION_CASES: [BattleScriptBattlerPositionVectorCase; " + cases.length + "] = [");
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptBattlerPositionVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        battlers_count: " + rustCount(value.battlersCount) + ",");
  lines.push("        expression: " + rustString(value.expression) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        expected_battler: " + rustOptionalU8(value.expectedBattler) + ",");
  lines.push("    },");
}
lines.push("];" );

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
  throw new Error("gen-battle-script-battler-positions-vectors: could not find rustfmt");
}

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log("gen-battle-script-battler-positions-vectors: wrote " + path.relative(workspaceRoot, outPath));
console.log("gen-battle-script-battler-positions-vectors: " + cases.length + " cases");
console.log("gen-battle-script-battler-positions-vectors: domain census " + JSON.stringify(domainCensus));
console.log("gen-battle-script-battler-positions-vectors: result census " + JSON.stringify(battlerResultCensus));
console.log("gen-battle-script-battler-positions-vectors: category census " + JSON.stringify(categoryCensus));
console.log("gen-battle-script-battler-positions-vectors: branch census " + JSON.stringify(branchCensus));
console.log("gen-battle-script-battler-positions-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-battler-positions-vectors: generated sha256 " + generatedHash);
