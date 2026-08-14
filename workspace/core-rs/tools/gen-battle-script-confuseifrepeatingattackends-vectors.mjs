#!/usr/bin/env node
// Differential corpus for
// src/engine/battleScriptConfuseifrepeatingattackendsOpcode.ts. Expected
// controls and outputs are created only by executing the canonical TypeScript
// opcode handler; this script owns bounded input construction and Rust literal
// emission.
//
// Run from any cwd:
//   node --experimental-strip-types
//   core-rs/tools/gen-battle-script-confuseifrepeatingattackends-vectors.mjs

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
  "battle_script_confuseifrepeatingattackends_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptConfuseifrepeatingattackendsOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSourceConstants.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS";
const OPCODE_ID = 0x8c;
const DISPATCHER = "Cmd_confuseifrepeatingattackends";
const ENTRY_LABEL = "BattleScript_EffectRampage2";
const BATTLE_SLOTS = 4;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const U32_MAX = 0xffff_ffff;
const LOCK_CONFUSE_MASK = sourceConstants.BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE;
const LOCK_CONFUSE_SUB_BIT_COMBINATIONS = Object.freeze([
  0x0000_0000,
  0x0000_0400,
  0x0000_0800,
  0x0000_0c00,
]);
const STATUS2_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0100_0001,
]);
const MOVE_EFFECT_BYTE_DOMAIN = Object.freeze(Array.from({ length: 0x100 }, (_, value) => value));
const MOVE_EFFECT_BYTE_BOUNDARY_DOMAIN = Object.freeze([
  0x00,
  0x01,
  0x34,
  0x35,
  0x40,
  0x75,
  0x80,
  0xff,
]);
const MOVE_EFFECT_THRASH = 53;
const MOVE_EFFECT_AFFECTS_USER = 1 << 6;
const STAGED_MOVE_EFFECT_BYTE = MOVE_EFFECT_THRASH | MOVE_EFFECT_AFFECTS_USER;
const NON_ATTACKER_STATUS2 = Object.freeze([
  0x0100_0000,
  0x0400_0000,
  0x8000_0000,
  0x0000_0001,
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error("gen-battle-script-confuseifrepeatingattackends-vectors: " + message);
  }
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

function assertU8(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= 0xff,
    label + " must be a u8, got " + value,
  );
}

function freezeRules(status2, attacker, moveEffectByte) {
  assert(Array.isArray(status2) && status2.length === BATTLE_SLOTS, "status2 must have four cells");
  status2.forEach((value, index) => assertU32(value, "status2[" + index + "]"));
  assertOptionalBattler(attacker, "attacker role");
  assertU8(moveEffectByte, "moveEffectByte");
  return Object.freeze({
    battlers: Object.freeze(status2.map((value) => Object.freeze({ status2: value >>> 0 }))),
    moveEffectByte,
    selectorRoles: Object.freeze({ attacker }),
  });
}

function makeInitialRules({ attacker, focusBattler, focusStatus2, moveEffectByte, salt }) {
  assertOptionalBattler(attacker, "initial attacker");
  assertBattler(focusBattler, "initial focus battler");
  assertU32(focusStatus2, "initial focus status2");
  assertU8(moveEffectByte, "initial moveEffectByte");
  const status2 = ATTACKER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusStatus2
      : NON_ATTACKER_STATUS2[(battler + salt) % NON_ATTACKER_STATUS2.length]
  ));
  return freezeRules(status2, attacker, moveEffectByte);
}

function vectorState(rules) {
  return Object.freeze({
    status2: Object.freeze(rules.battlers.map((battler) => battler.status2 >>> 0)),
    moveEffectByte: rules.moveEffectByte,
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
assert(instruction.opcodeId === OPCODE_ID, "expected opcode " + OPCODE_ID + ", got " + instruction.opcodeId);
assert(
  instruction.dispatcher === DISPATCHER,
  "expected dispatcher " + DISPATCHER + ", got " + instruction.dispatcher,
);
assert(instruction.operands.length === 0, "canonical opcode must have no operands");
assert(LOCK_CONFUSE_MASK === 0x0000_0c00, "STATUS2_LOCK_CONFUSE drifted to " + LOCK_CONFUSE_MASK);
assert(MOVE_EFFECT_THRASH === 53, "MOVE_EFFECT_THRASH drifted");
assert(MOVE_EFFECT_AFFECTS_USER === 64, "MOVE_EFFECT_AFFECTS_USER drifted");
assert(STAGED_MOVE_EFFECT_BYTE === 0x75, "Thrash/self staged byte drifted");

const handlers = opcodeModule.createBattleScriptConfuseifrepeatingattackendsOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical CONFUSEIFREPEATINGATTACKENDS handler was not registered");

function classifyAndAssertStep(priorRules, transition) {
  const attacker = priorRules.selectorRoles.attacker;
  assert(attacker !== null, "successful canonical handler had no attacker");
  const nextRules = transition.rulesContext;
  const alreadyLocked = (priorRules.battlers[attacker].status2 & LOCK_CONFUSE_MASK) !== 0;
  assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");
  assert(nextRules.selectorRoles === priorRules.selectorRoles, "canonical handler replaced selector roles");

  if (alreadyLocked) {
    assert(
      nextRules === priorRules,
      "already-locked canonical branch did not preserve the complete rules object",
    );
    assert(nextRules.battlers === priorRules.battlers, "already-locked branch replaced battlers");
    assert(
      nextRules.moveEffectByte === priorRules.moveEffectByte,
      "already-locked branch overwrote moveEffectByte",
    );
    return "preserve-move-effect-byte";
  }

  assert(nextRules !== priorRules, "unlocked canonical branch did not create a replacement rules object");
  assert(nextRules.battlers === priorRules.battlers, "unlocked branch replaced battlers");
  for (const battler of ATTACKER_DOMAIN) {
    assert(
      nextRules.battlers[battler] === priorRules.battlers[battler],
      "unlocked branch replaced battler " + battler,
    );
  }
  assert(
    nextRules.moveEffectByte === STAGED_MOVE_EFFECT_BYTE,
    "unlocked branch did not overwrite moveEffectByte with Thrash/self",
  );
  return "overwrite-move-effect-byte";
}

function sourceOutcome(initialRules, applications) {
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  const branches = [];
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
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
      branches.push(classifyAndAssertStep(currentRules, transition));
      controls.push("advance");
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      branches: Object.freeze(branches),
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
      branches: Object.freeze(branches),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  return outcome.error === null
    ? outcome.branches.join("-then-") + "-advance"
    : "missing-attacker-role";
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
  for (const [lockIndex, status2] of LOCK_CONFUSE_SUB_BIT_COMBINATIONS.entries()) {
    for (const moveEffectByte of MOVE_EFFECT_BYTE_DOMAIN) {
      addCase(
        "lock_l" + lockIndex + "_a" + attacker + "_effect_" + moveEffectByte.toString(16).padStart(2, "0"),
        "attacker-lock-confuse-move-effect-full-domain",
        makeInitialRules({
          attacker,
          focusBattler: attacker,
          focusStatus2: status2,
          moveEffectByte,
          salt: attacker * 0x1000 + lockIndex * 0x100 + moveEffectByte,
        }),
      );
    }
  }
}

for (const attacker of ATTACKER_DOMAIN) {
  for (const [edgeIndex, status2] of STATUS2_EDGE_VALUES.entries()) {
    for (const moveEffectByte of MOVE_EFFECT_BYTE_BOUNDARY_DOMAIN) {
      addCase(
        "status2_edge_e" + edgeIndex + "_a" + attacker + "_effect_" + moveEffectByte.toString(16).padStart(2, "0"),
        "u32-status2-edge-boundary-matrix",
        makeInitialRules({
          attacker,
          focusBattler: attacker,
          focusStatus2: status2,
          moveEffectByte,
          salt: 0x8000 + attacker * 0x100 + edgeIndex * 0x10 + moveEffectByte,
        }),
      );
    }
  }
}

addCase(
  "unlocked_overwrites_full_byte_preserves_packed_status2_and_siblings",
  "unlocked-overwrite-preservation",
  makeInitialRules({
    attacker: 2,
    focusBattler: 2,
    focusStatus2: 0x8000_0101,
    moveEffectByte: 0xff,
    salt: 0x9000,
  }),
);

addCase(
  "locked_preserves_full_byte_packed_status2_and_siblings",
  "locked-preservation",
  makeInitialRules({
    attacker: 1,
    focusBattler: 1,
    focusStatus2: 0x8000_0c01,
    moveEffectByte: 0x00,
    salt: 0x9001,
  }),
);

addCase(
  "missing_attacker_role_precedes_status2_and_move_effect_byte_reads",
  "missing-attacker-role",
  makeInitialRules({
    attacker: null,
    focusBattler: 2,
    focusStatus2: U32_MAX,
    moveEffectByte: 0xff,
    salt: 0x9002,
  }),
);

addCase(
  "repeated_unlocked_overwrite_advances_each_time",
  "repeated-unlocked-overwrite",
  makeInitialRules({
    attacker: 3,
    focusBattler: 3,
    focusStatus2: 0x8000_0101,
    moveEffectByte: 0x00,
    salt: 0x9003,
  }),
  2,
);

addCase(
  "repeated_locked_preservation_advances_each_time",
  "repeated-locked-preservation",
  makeInitialRules({
    attacker: 0,
    focusBattler: 0,
    focusStatus2: 0x8000_0c01,
    moveEffectByte: 0xa5,
    salt: 0x9004,
  }),
  2,
);

assert(cases.length === 4229, "case count drifted: " + cases.length);
for (const attacker of ATTACKER_DOMAIN) {
  for (const status2 of LOCK_CONFUSE_SUB_BIT_COMBINATIONS) {
    for (const moveEffectByte of MOVE_EFFECT_BYTE_DOMAIN) {
      assert(
        cases.some((value) =>
          value.category === "attacker-lock-confuse-move-effect-full-domain"
          && value.initial.attacker === attacker
          && value.initial.status2[attacker] === status2
          && value.initial.moveEffectByte === moveEffectByte
        ),
        "full matrix omits attacker " + attacker + " status2 " + status2
          + " moveEffectByte " + moveEffectByte,
      );
    }
  }
  for (const status2 of STATUS2_EDGE_VALUES) {
    for (const moveEffectByte of MOVE_EFFECT_BYTE_BOUNDARY_DOMAIN) {
      assert(
        cases.some((value) =>
          value.category === "u32-status2-edge-boundary-matrix"
          && value.initial.attacker === attacker
          && value.initial.status2[attacker] === status2
          && value.initial.moveEffectByte === moveEffectByte
        ),
        "u32 edge matrix omits attacker " + attacker + " status2 " + status2
          + " moveEffectByte " + moveEffectByte,
      );
    }
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
  ["status2-lock-confuse-mask", LOCK_CONFUSE_MASK],
  ["status2-lock-confuse-sub-bit-combinations", LOCK_CONFUSE_SUB_BIT_COMBINATIONS.length],
  ["status2-edge-values", STATUS2_EDGE_VALUES.length],
  ["move-effect-byte-u8-values", 0x100],
  ["move-effect-byte-full-domain-probes", MOVE_EFFECT_BYTE_DOMAIN.length],
  ["move-effect-byte-boundary-probes", MOVE_EFFECT_BYTE_BOUNDARY_DOMAIN.length],
  ["application-count-values", 2],
  ["typed-missing-attacker-combinations", 1],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  lockConfuseSubBitCombinations: LOCK_CONFUSE_SUB_BIT_COMBINATIONS,
  status2EdgeDomain: STATUS2_EDGE_VALUES,
  moveEffectByteDomain: MOVE_EFFECT_BYTE_DOMAIN,
  moveEffectByteBoundaryDomain: MOVE_EFFECT_BYTE_BOUNDARY_DOMAIN,
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

function rustU8(value) {
  return "0x" + value.toString(16).padStart(2, "0");
}

function rustBattler(value) {
  return "BattleScriptConfuseifrepeatingattackendsBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustState(value) {
  return [
    "BattleScriptConfuseifrepeatingattackendsVectorState {",
    "status2: [" + value.status2.map(rustU32).join(", ") + "],",
    "move_effect_byte: " + rustU8(value.moveEffectByte) + ",",
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
  return "&[" + values.map(() => "BattleScriptConfuseifrepeatingattackendsControl::Advance").join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-confuseifrepeatingattackends-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptConfuseifrepeatingattackendsOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_confuseifrepeatingattackends::{");
lines.push("    BattleScriptConfuseifrepeatingattackendsBattler, BattleScriptConfuseifrepeatingattackendsControl,");
lines.push("};");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_VECTOR_CORPUS_SHA256: &str = "
    + rustString(corpusHash)
    + ";",
);
lines.push(
  "pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_ATTACKER_DOMAIN: [u8; "
    + ATTACKER_DOMAIN.length
    + "] = ["
    + ATTACKER_DOMAIN.join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_LOCK_CONFUSE_SUB_BIT_COMBINATIONS: [u32; "
    + LOCK_CONFUSE_SUB_BIT_COMBINATIONS.length
    + "] = ["
    + LOCK_CONFUSE_SUB_BIT_COMBINATIONS.map(rustU32).join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_STATUS2_EDGE_DOMAIN: [u32; "
    + STATUS2_EDGE_VALUES.length
    + "] = ["
    + STATUS2_EDGE_VALUES.map(rustU32).join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_MOVE_EFFECT_BYTE_DOMAIN: [u8; "
    + MOVE_EFFECT_BYTE_DOMAIN.length
    + "] = ["
    + MOVE_EFFECT_BYTE_DOMAIN.map(rustU8).join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_MOVE_EFFECT_BYTE_BOUNDARY_DOMAIN: [u8; "
    + MOVE_EFFECT_BYTE_BOUNDARY_DOMAIN.length
    + "] = ["
    + MOVE_EFFECT_BYTE_BOUNDARY_DOMAIN.map(rustU8).join(", ")
    + "];",
);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptConfuseifrepeatingattackendsVectorState {");
lines.push("    pub status2: [u32; 4],");
lines.push("    pub move_effect_byte: u8,");
lines.push("    pub attacker: Option<BattleScriptConfuseifrepeatingattackendsBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptConfuseifrepeatingattackendsVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptConfuseifrepeatingattackendsVectorState,");
lines.push("    pub expected: Option<BattleScriptConfuseifrepeatingattackendsVectorState>,");
lines.push("    pub controls: &'static [BattleScriptConfuseifrepeatingattackendsControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_DOMAIN_CENSUS: [(&str, u64); "
    + domainCensus.length
    + "] = [",
);
for (const [name, count] of domainCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_CATEGORY_CENSUS: [(&str, usize); "
    + categoryCensus.length
    + "] = [",
);
for (const [name, count] of categoryCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_BRANCH_CENSUS: [(&str, usize); "
    + branchCensus.length
    + "] = [",
);
for (const [name, count] of branchCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub static BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_CASES: [BattleScriptConfuseifrepeatingattackendsVectorCase; "
    + cases.length
    + "] = [",
);
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptConfuseifrepeatingattackendsVectorCase {");
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
  throw new Error("gen-battle-script-confuseifrepeatingattackends-vectors: could not find rustfmt");
}

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(
  "gen-battle-script-confuseifrepeatingattackends-vectors: wrote "
    + path.relative(workspaceRoot, outPath),
);
console.log("gen-battle-script-confuseifrepeatingattackends-vectors: " + cases.length + " cases");
console.log(
  "gen-battle-script-confuseifrepeatingattackends-vectors: domain census " + JSON.stringify(domainCensus),
);
console.log(
  "gen-battle-script-confuseifrepeatingattackends-vectors: category census " + JSON.stringify(categoryCensus),
);
console.log(
  "gen-battle-script-confuseifrepeatingattackends-vectors: branch census " + JSON.stringify(branchCensus),
);
console.log("gen-battle-script-confuseifrepeatingattackends-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-confuseifrepeatingattackends-vectors: generated sha256 " + generatedHash);
