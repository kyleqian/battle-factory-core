#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSetfocusenergyOpcode.ts.
// Expected controls and outputs are created only by executing the canonical
// TypeScript opcode handler; this script owns bounded input construction and
// Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-setfocusenergy-vectors.mjs

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
  "battle_script_setfocusenergy_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSetfocusenergyOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSourceConstants.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETFOCUSENERGY";
const OPCODE_ID = 0x9a;
const DISPATCHER = "Cmd_setfocusenergy";
const ENTRY_LABEL = "BattleScript_EffectFocusEnergy";
const BATTLE_SLOTS = 4;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const U32_MAX = 0xffff_ffff;
const FOCUS_ENERGY_MASK = sourceConstants.BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY;
const MOVE_RESULT_FAILED = sourceConstants.BATTLE_SCRIPT_MOVE_RESULT_FAILED;
const B_MSG_GETTING_PUMPED = opcodeModule.BATTLE_SCRIPT_B_MSG_GETTING_PUMPED;
const B_MSG_FOCUS_ENERGY_FAILED = opcodeModule.BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED;
const STATUS2_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0100_0001,
]);
const MOVE_RESULT_FLAGS_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0100_0001,
]);
const FOCUS_ENERGY_INPUTS = Object.freeze([0, FOCUS_ENERGY_MASK]);
const MOVE_RESULT_FAILED_INPUTS = Object.freeze([0, MOVE_RESULT_FAILED]);
const PRIOR_MULTISTRING_CHOOSER_VALUES = Object.freeze([0x00, 0x01, 0x2a, 0x7f, 0xa5, 0xff]);
const NON_ATTACKER_STATUS2 = Object.freeze([
  0x0100_0000,
  0x0400_0000,
  0x8000_0000,
  0x0000_0001,
]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-setfocusenergy-vectors: " + message);
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

function chooserFor(salt) {
  return PRIOR_MULTISTRING_CHOOSER_VALUES[salt % PRIOR_MULTISTRING_CHOOSER_VALUES.length];
}

function freezeRules(status2, attacker, moveResultFlags, multistringChooser) {
  assert(Array.isArray(status2) && status2.length === BATTLE_SLOTS, "status2 must have four cells");
  status2.forEach((value, index) => assertU32(value, "status2[" + index + "]"));
  assertOptionalBattler(attacker, "attacker role");
  assertU32(moveResultFlags, "moveResultFlags");
  assertU8(multistringChooser, "multistringChooser");
  return Object.freeze({
    battlers: Object.freeze(status2.map((value) => Object.freeze({ status2: value >>> 0 }))),
    moveResultFlags: moveResultFlags >>> 0,
    multistringChooser,
    selectorRoles: Object.freeze({ attacker }),
  });
}

function makeInitialRules({
  attacker,
  focusBattler,
  focusStatus2,
  moveResultFlags,
  multistringChooser,
  salt,
}) {
  assertOptionalBattler(attacker, "initial attacker");
  assertBattler(focusBattler, "initial focus battler");
  assertU32(focusStatus2, "initial focus status2");
  assertU32(moveResultFlags, "initial moveResultFlags");
  assertU8(multistringChooser, "initial multistringChooser");
  const status2 = ATTACKER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusStatus2
      : NON_ATTACKER_STATUS2[(battler + salt) % NON_ATTACKER_STATUS2.length]
  ));
  return freezeRules(status2, attacker, moveResultFlags, multistringChooser);
}

function vectorState(rules) {
  return Object.freeze({
    status2: Object.freeze(rules.battlers.map((battler) => battler.status2 >>> 0)),
    moveResultFlags: rules.moveResultFlags >>> 0,
    multistringChooser: rules.multistringChooser,
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
  FOCUS_ENERGY_MASK === 0x0010_0000,
  "STATUS2_FOCUS_ENERGY drifted to " + FOCUS_ENERGY_MASK,
);
assert(
  MOVE_RESULT_FAILED === 0x0000_0020,
  "MOVE_RESULT_FAILED drifted to " + MOVE_RESULT_FAILED,
);
assert(B_MSG_GETTING_PUMPED === 0, "B_MSG_GETTING_PUMPED drifted to " + B_MSG_GETTING_PUMPED);
assert(
  B_MSG_FOCUS_ENERGY_FAILED === 1,
  "B_MSG_FOCUS_ENERGY_FAILED drifted to " + B_MSG_FOCUS_ENERGY_FAILED,
);

const handlers = opcodeModule.createBattleScriptSetfocusenergyOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETFOCUSENERGY handler was not registered");

function classifyAndAssertStep(priorRules, transition) {
  const attacker = priorRules.selectorRoles.attacker;
  assert(attacker !== null, "successful canonical handler had no attacker");
  const nextRules = transition.rulesContext;
  const alreadyFocused = (priorRules.battlers[attacker].status2 & FOCUS_ENERGY_MASK) !== 0;
  assert(
    nextRules.selectorRoles === priorRules.selectorRoles,
    "canonical handler replaced selector roles",
  );
  assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");
  assert(Object.isFrozen(nextRules.battlers), "canonical output battlers must be frozen");

  if (alreadyFocused) {
    assert(
      nextRules.battlers === priorRules.battlers,
      "already-focused canonical branch replaced the battler array",
    );
    for (const battler of ATTACKER_DOMAIN) {
      assert(
        nextRules.battlers[battler] === priorRules.battlers[battler],
        "already-focused canonical branch replaced battler " + battler,
      );
    }
    assert(
      nextRules.moveResultFlags === ((priorRules.moveResultFlags | MOVE_RESULT_FAILED) >>> 0),
      "already-focused canonical branch did not OR MOVE_RESULT_FAILED",
    );
    assert(
      nextRules.multistringChooser === B_MSG_FOCUS_ENERGY_FAILED,
      "already-focused canonical branch chose the wrong message",
    );
    return "already-focused-failure";
  }

  assert(
    nextRules.moveResultFlags === priorRules.moveResultFlags,
    "clear canonical branch changed moveResultFlags",
  );
  assert(
    nextRules.multistringChooser === B_MSG_GETTING_PUMPED,
    "clear canonical branch chose the wrong message",
  );
  for (const battler of ATTACKER_DOMAIN) {
    if (battler === attacker) {
      assert(
        nextRules.battlers[battler].status2
          === ((priorRules.battlers[battler].status2 | FOCUS_ENERGY_MASK) >>> 0),
        "clear canonical branch did not OR STATUS2_FOCUS_ENERGY",
      );
    } else {
      assert(
        nextRules.battlers[battler] === priorRules.battlers[battler],
        "clear canonical branch replaced non-attacker battler " + battler,
      );
    }
  }
  return "success";
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
  for (const [focusIndex, status2] of FOCUS_ENERGY_INPUTS.entries()) {
    for (const [flagsIndex, moveResultFlags] of MOVE_RESULT_FAILED_INPUTS.entries()) {
      addCase(
        "attacker_a" + attacker + "_focus_" + (focusIndex === 0 ? "clear" : "set")
          + "_move_result_" + (flagsIndex === 0 ? "clear" : "set"),
        "attacker-focus-move-result-matrix",
        makeInitialRules({
          attacker,
          focusBattler: attacker,
          focusStatus2: status2,
          moveResultFlags,
          multistringChooser: chooserFor(attacker * 8 + focusIndex * 2 + flagsIndex),
          salt: attacker * 11 + focusIndex * 3 + flagsIndex,
        }),
      );
    }
  }
}

const status2EdgeLabels = ["zero", "max", "high_bit", "unrelated_bits"];
for (const attacker of ATTACKER_DOMAIN) {
  for (const [edgeIndex, status2] of STATUS2_EDGE_VALUES.entries()) {
    addCase(
      "status2_edge_a" + attacker + "_" + status2EdgeLabels[edgeIndex],
      "status2-u32-edge-matrix",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus2: status2,
        moveResultFlags: 0x0100_0001,
        multistringChooser: chooserFor(48 + attacker * STATUS2_EDGE_VALUES.length + edgeIndex),
        salt: 60 + attacker * STATUS2_EDGE_VALUES.length + edgeIndex,
      }),
    );
  }
}

const moveResultFlagsEdgeLabels = ["zero", "max", "high_bit", "unrelated_bits"];
for (const attacker of ATTACKER_DOMAIN) {
  for (const [focusIndex, status2] of FOCUS_ENERGY_INPUTS.entries()) {
    for (const [edgeIndex, moveResultFlags] of MOVE_RESULT_FLAGS_EDGE_VALUES.entries()) {
      addCase(
        "move_result_edge_a" + attacker + "_focus_" + (focusIndex === 0 ? "clear" : "set")
          + "_" + moveResultFlagsEdgeLabels[edgeIndex],
        "move-result-flags-u32-edge-matrix",
        makeInitialRules({
          attacker,
          focusBattler: attacker,
          focusStatus2: status2,
          moveResultFlags,
          multistringChooser: chooserFor(
            80 + attacker * FOCUS_ENERGY_INPUTS.length * MOVE_RESULT_FLAGS_EDGE_VALUES.length
              + focusIndex * MOVE_RESULT_FLAGS_EDGE_VALUES.length + edgeIndex,
          ),
          salt: 100 + attacker * FOCUS_ENERGY_INPUTS.length * MOVE_RESULT_FLAGS_EDGE_VALUES.length
            + focusIndex * MOVE_RESULT_FLAGS_EDGE_VALUES.length + edgeIndex,
        }),
      );
    }
  }
}

addCase(
  "success_mutates_only_attacker_preserves_flags_and_overwrites_chooser",
  "success-attacker-only-mutation",
  makeInitialRules({
    attacker: 2,
    focusBattler: 2,
    focusStatus2: 0x8000_0101,
    moveResultFlags: 0x8100_0041,
    multistringChooser: 0xa5,
    salt: 160,
  }),
);

addCase(
  "already_focused_failure_preserves_battlers_ors_flags_and_overwrites_chooser",
  "already-focused-failure-preservation",
  makeInitialRules({
    attacker: 1,
    focusBattler: 1,
    focusStatus2: 0x8010_0101,
    moveResultFlags: 0x8000_0101,
    multistringChooser: 0x7f,
    salt: 170,
  }),
);

addCase(
  "missing_attacker_role_precedes_status2_move_result_flags_and_chooser_reads",
  "missing-attacker-role",
  makeInitialRules({
    attacker: null,
    focusBattler: 2,
    focusStatus2: U32_MAX,
    moveResultFlags: U32_MAX,
    multistringChooser: 0xff,
    salt: 180,
  }),
);

addCase(
  "repeated_application_success_then_already_focused_failure",
  "repeated-success-then-failure",
  makeInitialRules({
    attacker: 3,
    focusBattler: 3,
    focusStatus2: 0x8000_0101,
    moveResultFlags: 0x0100_0001,
    multistringChooser: 0xa5,
    salt: 190,
  }),
  2,
);

addCase(
  "repeated_already_focused_failure_is_idempotent",
  "repeated-already-focused-failure",
  makeInitialRules({
    attacker: 0,
    focusBattler: 0,
    focusStatus2: 0x8010_0001,
    moveResultFlags: 0x0100_0001,
    multistringChooser: 0x2a,
    salt: 200,
  }),
  2,
);

assert(cases.length === 69, "case count drifted: " + cases.length);
for (const attacker of ATTACKER_DOMAIN) {
  for (const status2 of FOCUS_ENERGY_INPUTS) {
    for (const moveResultFlags of MOVE_RESULT_FAILED_INPUTS) {
      assert(
        cases.some((value) =>
          value.category === "attacker-focus-move-result-matrix"
          && value.initial.attacker === attacker
          && value.initial.status2[attacker] === status2
          && value.initial.moveResultFlags === moveResultFlags
        ),
        "matrix omits attacker " + attacker + " status2 " + status2
          + " moveResultFlags " + moveResultFlags,
      );
    }
  }
  for (const status2 of STATUS2_EDGE_VALUES) {
    assert(
      cases.some((value) =>
        value.category === "status2-u32-edge-matrix"
        && value.initial.attacker === attacker
        && value.initial.status2[attacker] === status2
      ),
      "status2 edge matrix omits attacker " + attacker + " status2 " + status2,
    );
  }
  for (const status2 of FOCUS_ENERGY_INPUTS) {
    for (const moveResultFlags of MOVE_RESULT_FLAGS_EDGE_VALUES) {
      assert(
        cases.some((value) =>
          value.category === "move-result-flags-u32-edge-matrix"
          && value.initial.attacker === attacker
          && value.initial.status2[attacker] === status2
          && value.initial.moveResultFlags === moveResultFlags
        ),
        "move-result edge matrix omits attacker " + attacker + " status2 " + status2
          + " moveResultFlags " + moveResultFlags,
      );
    }
  }
}
for (const branch of ["success-advance", "already-focused-failure-advance"]) {
  const observedChoosers = new Set(
    cases
      .filter((value) => value.branch === branch)
      .map((value) => value.initial.multistringChooser),
  );
  assert(
    PRIOR_MULTISTRING_CHOOSER_VALUES.every((value) => observedChoosers.has(value)),
    branch + " does not cover every prior multistring chooser probe",
  );
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
  ["status2-focus-clear-set-inputs", FOCUS_ENERGY_INPUTS.length],
  ["status2-edge-values", STATUS2_EDGE_VALUES.length],
  ["move-result-flags-u32-values", U32_MAX + 1],
  ["move-result-failed-clear-set-inputs", MOVE_RESULT_FAILED_INPUTS.length],
  ["move-result-flags-edge-values", MOVE_RESULT_FLAGS_EDGE_VALUES.length],
  ["multistring-chooser-u8-values", 0x100],
  ["prior-multistring-chooser-probes", PRIOR_MULTISTRING_CHOOSER_VALUES.length],
  ["application-count-values", 2],
  ["typed-missing-attacker-combinations", 1],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  status2EdgeDomain: STATUS2_EDGE_VALUES,
  focusEnergyInputDomain: FOCUS_ENERGY_INPUTS,
  moveResultFlagsEdgeDomain: MOVE_RESULT_FLAGS_EDGE_VALUES,
  moveResultFailedInputDomain: MOVE_RESULT_FAILED_INPUTS,
  priorMultistringChooserDomain: PRIOR_MULTISTRING_CHOOSER_VALUES,
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
  return "BattleScriptSetfocusenergyBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustState(value) {
  return [
    "BattleScriptSetfocusenergyVectorState {",
    "status2: [" + value.status2.map(rustU32).join(", ") + "],",
    "move_result_flags: " + rustU32(value.moveResultFlags) + ",",
    "multistring_chooser: " + rustU8(value.multistringChooser) + ",",
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
  return "&[" + values.map(() => "BattleScriptSetfocusenergyControl::Advance").join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-setfocusenergy-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetfocusenergyOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_setfocusenergy::{");
lines.push("    BattleScriptSetfocusenergyBattler, BattleScriptSetfocusenergyControl,");
lines.push("};");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_VECTOR_CORPUS_SHA256: &str = "
    + rustString(corpusHash)
    + ";",
);
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_ATTACKER_DOMAIN: [u8; "
    + ATTACKER_DOMAIN.length
    + "] = ["
    + ATTACKER_DOMAIN.join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_STATUS2_EDGE_DOMAIN: [u32; "
    + STATUS2_EDGE_VALUES.length
    + "] = ["
    + STATUS2_EDGE_VALUES.map(rustU32).join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_INPUT_DOMAIN: [u32; "
    + FOCUS_ENERGY_INPUTS.length
    + "] = ["
    + FOCUS_ENERGY_INPUTS.map(rustU32).join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_MOVE_RESULT_FLAGS_EDGE_DOMAIN: [u32; "
    + MOVE_RESULT_FLAGS_EDGE_VALUES.length
    + "] = ["
    + MOVE_RESULT_FLAGS_EDGE_VALUES.map(rustU32).join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_MOVE_RESULT_FAILED_INPUT_DOMAIN: [u32; "
    + MOVE_RESULT_FAILED_INPUTS.length
    + "] = ["
    + MOVE_RESULT_FAILED_INPUTS.map(rustU32).join(", ")
    + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_PRIOR_MULTISTRING_CHOOSER_DOMAIN: [u8; "
    + PRIOR_MULTISTRING_CHOOSER_VALUES.length
    + "] = ["
    + PRIOR_MULTISTRING_CHOOSER_VALUES.map(rustU8).join(", ")
    + "];",
);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetfocusenergyVectorState {");
lines.push("    pub status2: [u32; 4],");
lines.push("    pub move_result_flags: u32,");
lines.push("    pub multistring_chooser: u8,");
lines.push("    pub attacker: Option<BattleScriptSetfocusenergyBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetfocusenergyVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSetfocusenergyVectorState,");
lines.push("    pub expected: Option<BattleScriptSetfocusenergyVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSetfocusenergyControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_DOMAIN_CENSUS: [(&str, u64); "
    + domainCensus.length
    + "] = [",
);
for (const [name, count] of domainCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_CATEGORY_CENSUS: [(&str, usize); "
    + categoryCensus.length
    + "] = [",
);
for (const [name, count] of categoryCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_SETFOCUSENERGY_BRANCH_CENSUS: [(&str, usize); "
    + branchCensus.length
    + "] = [",
);
for (const [name, count] of branchCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub static BATTLE_SCRIPT_SETFOCUSENERGY_CASES: [BattleScriptSetfocusenergyVectorCase; "
    + cases.length
    + "] = [",
);
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptSetfocusenergyVectorCase {");
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
  throw new Error("gen-battle-script-setfocusenergy-vectors: could not find rustfmt");
}

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(
  "gen-battle-script-setfocusenergy-vectors: wrote "
    + path.relative(workspaceRoot, outPath),
);
console.log("gen-battle-script-setfocusenergy-vectors: " + cases.length + " cases");
console.log(
  "gen-battle-script-setfocusenergy-vectors: domain census " + JSON.stringify(domainCensus),
);
console.log(
  "gen-battle-script-setfocusenergy-vectors: category census " + JSON.stringify(categoryCensus),
);
console.log(
  "gen-battle-script-setfocusenergy-vectors: branch census " + JSON.stringify(branchCensus),
);
console.log("gen-battle-script-setfocusenergy-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-setfocusenergy-vectors: generated sha256 " + generatedHash);
