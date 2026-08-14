#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptJumpifnotfirstturnOpcode.ts.
// Expected controls, complete projected outputs, and the exact missing-role
// error are created only by executing the canonical TypeScript opcode handler.
// The emitted Rust control deliberately omits the canonical machine's resolved
// absolute jump program counter.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifnotfirstturn-vectors.mjs

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
  "battle_script_jumpifnotfirstturn_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptJumpifnotfirstturnOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_JUMPIFNOTFIRSTTURN";
const OPCODE_ID = 0x82;
const DISPATCHER = "Cmd_jumpifnotfirstturn";
const ENTRY_LABEL = "BattleScript_EffectFakeOut";
const FAKE_OUT = 252;
const BATTLE_SLOTS = 4;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const IS_FIRST_TURN_DOMAIN = Object.freeze([0, 1, 2]);
const SOURCE_STORAGE_U8_VALUES = 0x100;
const CANONICAL_INVALID_U8_PROBES = Object.freeze([3, 255]);
const NON_ATTACKER_IS_FIRST_TURN = Object.freeze([2, 1, 0, 2]);
const FIRST_TURN_VARIANTS = Object.freeze([
  "NotFirstTurn",
  "Value1",
  "Value2",
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error("gen-battle-script-jumpifnotfirstturn-vectors: " + message);
  }
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), label + " must be one of 0..3, got " + value);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertIsFirstTurn(value, label) {
  assert(
    IS_FIRST_TURN_DOMAIN.includes(value),
    label + " must be a canonical isFirstTurn value in 0..2, got " + value,
  );
}

function freezeProjection(isFirstTurn, attacker) {
  assert(
    Array.isArray(isFirstTurn) && isFirstTurn.length === BATTLE_SLOTS,
    "isFirstTurn must have four cells",
  );
  isFirstTurn.forEach((value, index) => assertIsFirstTurn(value, "isFirstTurn[" + index + "]"));
  assertOptionalBattler(attacker, "attacker role");
  return Object.freeze({
    isFirstTurn: Object.freeze(isFirstTurn.slice()),
    attacker,
  });
}

function canonicalBattler(side, isFirstTurn) {
  return Object.freeze({
    side,
    ability: 0,
    hp: 100,
    maxHP: 100,
    moves: Object.freeze([FAKE_OUT, 0, 0, 0]),
    pp: Object.freeze([10, 0, 0, 0]),
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
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 0,
    attack: 50,
    defense: 50,
    spAttack: 50,
    spDefense: 50,
    level: 50,
    friendship: 0,
    partyIndex: 0,
    isFirstTurn,
  });
}

function canonicalRulesFromRaw(isFirstTurn, attacker) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(ATTACKER_DOMAIN.map((battler) => canonicalBattler(
      battler % 2,
      isFirstTurn[battler],
    ))),
    selectorRoles: Object.freeze({
      attacker,
      target: 1,
      effectBattler: 0,
      fainted: null,
    }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: FAKE_OUT,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });
}

function createCanonicalRules(projection) {
  return canonicalRulesFromRaw(projection.isFirstTurn, projection.attacker);
}

function makeInitialProjection({ attacker, focusBattler, focusIsFirstTurn, salt }) {
  assertOptionalBattler(attacker, "initial attacker");
  assertBattler(focusBattler, "focus battler");
  assertIsFirstTurn(focusIsFirstTurn, "focus isFirstTurn");
  const isFirstTurn = ATTACKER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusIsFirstTurn
      : NON_ATTACKER_IS_FIRST_TURN[(battler + salt) % NON_ATTACKER_IS_FIRST_TURN.length]
  ));
  return freezeProjection(isFirstTurn, attacker);
}

function vectorState(rules) {
  return Object.freeze({
    isFirstTurn: Object.freeze(rules.battlers.map((battler) => battler.isFirstTurn)),
    attacker: rules.selectorRoles.attacker,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

for (const value of IS_FIRST_TURN_DOMAIN) {
  const rules = canonicalRulesFromRaw([value, 0, 1, 2], 0);
  assert(
    rules.battlers[0].isFirstTurn === value,
    "canonical constructor did not retain isFirstTurn " + value,
  );
}
for (const value of CANONICAL_INVALID_U8_PROBES) {
  let message = null;
  try {
    canonicalRulesFromRaw([value, 0, 1, 2], 0);
  } catch (error) {
    assert(error instanceof Error, "canonical validation threw a non-Error");
    message = error.message;
  }
  assert(
    message === "battlers[0].isFirstTurn must be an unsigned integer <= 2, got " + value,
    "canonical isFirstTurn validation drifted for " + value + ": " + String(message),
  );
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(
  instructions.length === 1,
  "expected exactly one " + OPCODE_NAME + " instruction, got " + instructions.length,
);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, "expected opcode " + OPCODE_ID + ", got " + instruction.opcodeId);
assert(
  instruction.dispatcher === DISPATCHER,
  "expected dispatcher " + DISPATCHER + ", got " + instruction.dispatcher,
);
assert(instruction.operands.length === 1, "canonical opcode must have one failure-label operand");
assert(
  instruction.operands[0]?.widthBytes === 4,
  "canonical failure-label operand must be four bytes",
);

const handlers = opcodeModule.createBattleScriptJumpifnotfirstturnOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical JUMPIFNOTFIRSTTURN handler was not registered");

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "fail-jump";
  throw new Error("canonical handler returned unsupported control " + transition.control.kind);
}

function sourceOutcome(initialProjection, applications) {
  const initialRules = createCanonicalRules(initialProjection);
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
      assert(
        transition.rulesContext === currentRules,
        "canonical handler changed the complete rules context",
      );
      assert(
        sameState(vectorState(currentRules), currentSnapshot),
        "canonical handler mutated current rules",
      );
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      assert(Object.isFrozen(transition.rulesContext.battlers), "canonical output battlers must be frozen");
      controls.push(controlFromTransition(transition));
      currentRules = transition.rulesContext;
    }
    assert(currentRules === initialRules, "canonical leaf replaced the complete initial rules context");
    assert(
      sameState(vectorState(initialRules), inputSnapshot),
      "canonical handler mutated initial rules",
    );
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "canonical handler threw non-Error " + String(error));
    assert(
      sameState(vectorState(initialRules), inputSnapshot),
      "throwing canonical handler mutated initial rules",
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
function addCase(label, category, initialProjection, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid label " + label);
  assert(!cases.some((value) => value.label === label), "duplicate label " + label);
  assert(
    applications === 1 || applications === 2,
    label + ": applications must be one or two",
  );
  const outcome = sourceOutcome(initialProjection, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    initial: vectorState(createCanonicalRules(initialProjection)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

for (const attacker of ATTACKER_DOMAIN) {
  for (const isFirstTurn of IS_FIRST_TURN_DOMAIN) {
    addCase(
      "attacker_a" + attacker + "_is_first_turn_" + isFirstTurn,
      "attacker-is-first-turn-matrix",
      makeInitialProjection({
        attacker,
        focusBattler: attacker,
        focusIsFirstTurn: isFirstTurn,
        salt: attacker * IS_FIRST_TURN_DOMAIN.length + isFirstTurn,
      }),
    );
  }
}

for (const [index, isFirstTurn] of [2, 0, 1, 2].entries()) {
  addCase(
    "siblings_preserved_attacker_a" + index,
    "complete-state-sibling-preservation",
    makeInitialProjection({
      attacker: index,
      focusBattler: index,
      focusIsFirstTurn: isFirstTurn,
      salt: 100 + index,
    }),
  );
}

addCase(
  "missing_attacker_role_precedes_is_first_turn_read",
  "missing-attacker-role",
  makeInitialProjection({
    attacker: null,
    focusBattler: 2,
    focusIsFirstTurn: 2,
    salt: 200,
  }),
);

for (const isFirstTurn of IS_FIRST_TURN_DOMAIN) {
  addCase(
    "repeated_is_first_turn_" + isFirstTurn,
    "repeated-paths",
    makeInitialProjection({
      attacker: 3,
      focusBattler: 3,
      focusIsFirstTurn: isFirstTurn,
      salt: 300 + isFirstTurn,
    }),
    2,
  );
}

assert(cases.length === 20, "case count drifted: " + cases.length);
for (const attacker of ATTACKER_DOMAIN) {
  for (const isFirstTurn of IS_FIRST_TURN_DOMAIN) {
    assert(
      cases.some((value) => (
        value.category === "attacker-is-first-turn-matrix"
        && value.initial.attacker === attacker
        && value.initial.isFirstTurn[attacker] === isFirstTurn
      )),
      "matrix omits attacker " + attacker + " isFirstTurn " + isFirstTurn,
    );
  }
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) {
    counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  }
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["optional-attacker-role-values", ATTACKER_DOMAIN.length + 1],
  ["source-is-first-turn-storage-u8-values", SOURCE_STORAGE_U8_VALUES],
  ["source-lifecycle-is-first-turn-values", IS_FIRST_TURN_DOMAIN.length],
  ["canonical-is-first-turn-values", IS_FIRST_TURN_DOMAIN.length],
  ["canonical-invalid-u8-probes", CANONICAL_INVALID_U8_PROBES.length],
  ["control-branch-values", 2],
  ["application-count-values", 2],
  ["typed-missing-attacker-combinations", 1],
  ["absolute-failure-program-counter-fields-in-projection", 0],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  isFirstTurnDomain: IS_FIRST_TURN_DOMAIN,
  sourceStorageU8Values: SOURCE_STORAGE_U8_VALUES,
  canonicalInvalidU8Probes: CANONICAL_INVALID_U8_PROBES,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustBattler(value) {
  return "BattleScriptJumpifnotfirstturnBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustFirstTurn(value) {
  return "BattleScriptJumpifnotfirstturnIsFirstTurn::" + FIRST_TURN_VARIANTS[value];
}

function rustControl(value) {
  return value === "advance"
    ? "BattleScriptJumpifnotfirstturnControl::Advance"
    : "BattleScriptJumpifnotfirstturnControl::FailJump";
}

function rustControls(values) {
  return "&[" + values.map(rustControl).join(", ") + "]";
}

function rustState(value) {
  return [
    "BattleScriptJumpifnotfirstturnVectorState {",
    "is_first_turn: [" + value.isFirstTurn.map(rustFirstTurn).join(", ") + "],",
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

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-jumpifnotfirstturn-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptJumpifnotfirstturnOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_jumpifnotfirstturn::{");
lines.push("    BattleScriptJumpifnotfirstturnBattler, BattleScriptJumpifnotfirstturnControl,");
lines.push("    BattleScriptJumpifnotfirstturnIsFirstTurn,");
lines.push("};");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_VECTOR_CORPUS_SHA256: &str = "
    + rustString(corpusHash)
    + ";",
);
lines.push(
  "pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_ATTACKER_DOMAIN: [u8; "
    + ATTACKER_DOMAIN.length
    + "] = ["
    + ATTACKER_DOMAIN.join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_IS_FIRST_TURN_DOMAIN: [u8; "
    + IS_FIRST_TURN_DOMAIN.length
    + "] = ["
    + IS_FIRST_TURN_DOMAIN.join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CANONICAL_INVALID_U8_PROBES: [u8; "
    + CANONICAL_INVALID_U8_PROBES.length
    + "] = ["
    + CANONICAL_INVALID_U8_PROBES.join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_SOURCE_STORAGE_U8_VALUES: u16 = "
    + SOURCE_STORAGE_U8_VALUES
    + ";",
);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifnotfirstturnVectorState {");
lines.push("    pub is_first_turn: [BattleScriptJumpifnotfirstturnIsFirstTurn; 4],");
lines.push("    pub attacker: Option<BattleScriptJumpifnotfirstturnBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifnotfirstturnVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptJumpifnotfirstturnVectorState,");
lines.push("    pub expected: Option<BattleScriptJumpifnotfirstturnVectorState>,");
lines.push("    pub controls: &'static [BattleScriptJumpifnotfirstturnControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_DOMAIN_CENSUS: [(&str, u64); "
    + domainCensus.length
    + "] = [",
);
for (const [name, count] of domainCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CATEGORY_CENSUS: [(&str, usize); "
    + categoryCensus.length
    + "] = [",
);
for (const [name, count] of categoryCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BRANCH_CENSUS: [(&str, usize); "
    + branchCensus.length
    + "] = [",
);
for (const [name, count] of branchCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub static BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CASES: [BattleScriptJumpifnotfirstturnVectorCase; "
    + cases.length
    + "] = [",
);
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptJumpifnotfirstturnVectorCase {");
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
  throw new Error("gen-battle-script-jumpifnotfirstturn-vectors: could not find rustfmt");
}

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(
  "gen-battle-script-jumpifnotfirstturn-vectors: wrote " + path.relative(workspaceRoot, outPath),
);
console.log("gen-battle-script-jumpifnotfirstturn-vectors: " + cases.length + " cases");
console.log(
  "gen-battle-script-jumpifnotfirstturn-vectors: domain census " + JSON.stringify(domainCensus),
);
console.log(
  "gen-battle-script-jumpifnotfirstturn-vectors: category census " + JSON.stringify(categoryCensus),
);
console.log(
  "gen-battle-script-jumpifnotfirstturn-vectors: branch census " + JSON.stringify(branchCensus),
);
console.log("gen-battle-script-jumpifnotfirstturn-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-jumpifnotfirstturn-vectors: generated sha256 " + generatedHash);
