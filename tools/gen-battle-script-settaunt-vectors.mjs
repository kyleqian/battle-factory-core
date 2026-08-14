#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSettauntOpcode.ts.
// Expected controls and outputs are created only by executing the canonical
// TypeScript opcode handler; this script owns bounded input construction and
// Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-settaunt-vectors.mjs

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
  "battle_script_settaunt_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSettauntOpcode.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETTAUNT";
const OPCODE_ID = 0xd0;
const DISPATCHER = "Cmd_settaunt";
const ENTRY_LABEL = "BattleScript_EffectTaunt";
const BATTLE_SLOTS = 4;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const TAUNT_TIMER_DOMAIN = Object.freeze(Array.from({ length: 16 }, (_, value) => value));
const TAUNT_TIMER_BOUNDARY_DOMAIN = Object.freeze([0, 1]);
const TAUNT_TIMER_EDGE_DOMAIN = Object.freeze([0, 1, 15]);
const TAUNT_TIMER_SET = 2;
const NON_TARGET_TAUNT_TIMERS = Object.freeze([3, 5, 9, 13]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-settaunt-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertTauntTimer(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= 0x0f,
    `${label} must be a four-bit unsigned timer, got ${value}`,
  );
}

function freezeRules(tauntTimers, target) {
  assert(Array.isArray(tauntTimers) && tauntTimers.length === BATTLE_SLOTS, "tauntTimers must have four cells");
  tauntTimers.forEach((value, index) => assertTauntTimer(value, `tauntTimers[${index}]`));
  assertOptionalBattler(target, "target role");
  return Object.freeze({
    battlers: Object.freeze(tauntTimers.map((tauntTimer) => Object.freeze({ tauntTimer }))),
    selectorRoles: Object.freeze({ target }),
  });
}

function makeInitialRules({ target, focusBattler, focusTauntTimer, salt }) {
  assertOptionalBattler(target, "initial target");
  assertBattler(focusBattler, "initial focus battler");
  assertTauntTimer(focusTauntTimer, "initial focus tauntTimer");
  const tauntTimers = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusTauntTimer
      : NON_TARGET_TAUNT_TIMERS[(battler + salt) % NON_TARGET_TAUNT_TIMERS.length]
  ));
  return freezeRules(tauntTimers, target);
}

function vectorState(rules) {
  return Object.freeze({
    tauntTimer: Object.freeze(rules.battlers.map((battler) => battler.tauntTimer)),
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
assert(instruction.operands[0]?.widthBytes === 4, "canonical fail-label operand must be four bytes");

const handlers = opcodeModule.createBattleScriptSettauntOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETTAUNT handler was not registered");

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
      const control = controlFromTransition(transition);
      if (control === "fail-jump") {
        assert(
          transition.rulesContext === currentRules,
          "canonical fail jump changed the complete narrow state",
        );
      } else {
        const target = currentRules.selectorRoles.target;
        assert(target !== null, "canonical advance had no target");
        assert(
          transition.rulesContext.selectorRoles === currentRules.selectorRoles,
          "canonical advance replaced selector roles",
        );
        for (const battler of BATTLER_DOMAIN) {
          if (battler !== target) {
            assert(
              transition.rulesContext.battlers[battler] === currentRules.battlers[battler],
              `canonical advance replaced non-target battler ${battler}`,
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
  for (const tauntTimer of TAUNT_TIMER_DOMAIN) {
    addCase(
      `timer_t${target}_${tauntTimer}`,
      "target-taunt-timer-matrix",
      makeInitialRules({
        target,
        focusBattler: target,
        focusTauntTimer: tauntTimer,
        salt: target * TAUNT_TIMER_DOMAIN.length + tauntTimer,
      }),
    );
  }
}

for (const [boundaryIndex, tauntTimer] of TAUNT_TIMER_BOUNDARY_DOMAIN.entries()) {
  addCase(
    `boundary_${boundaryIndex === 0 ? "zero" : "one"}`,
    "zero-nonzero-boundary",
    makeInitialRules({
      target: 0,
      focusBattler: 0,
      focusTauntTimer: tauntTimer,
      salt: 80 + boundaryIndex,
    }),
  );
}

addCase(
  "missing_target_role_precedes_timer_read",
  "missing-target-role",
  makeInitialRules({
    target: null,
    focusBattler: 2,
    focusTauntTimer: 15,
    salt: 100,
  }),
);

addCase(
  "target_only_mutation_preserves_siblings",
  "target-only-mutation",
  makeInitialRules({
    target: 2,
    focusBattler: 2,
    focusTauntTimer: 0,
    salt: 120,
  }),
);

addCase(
  "repeated_success_then_fail",
  "repeated-application",
  makeInitialRules({
    target: 3,
    focusBattler: 3,
    focusTauntTimer: 0,
    salt: 140,
  }),
  2,
);
addCase(
  "repeated_fail_remains_unchanged",
  "repeated-application",
  makeInitialRules({
    target: 1,
    focusBattler: 1,
    focusTauntTimer: 15,
    salt: 141,
  }),
  2,
);

assert(cases.length === 70, `case count drifted: ${cases.length}`);
for (const target of BATTLER_DOMAIN) {
  for (const tauntTimer of TAUNT_TIMER_DOMAIN) {
    assert(
      cases.some((value) =>
        value.category === "target-taunt-timer-matrix"
        && value.initial.target === target
        && value.initial.tauntTimer[target] === tauntTimer
      ),
      `timer matrix omits target ${target} tauntTimer ${tauntTimer}`,
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
  ["target-role-values", BATTLER_DOMAIN.length],
  ["optional-target-role-values", BATTLER_DOMAIN.length + 1],
  ["taunt-timer-values", TAUNT_TIMER_DOMAIN.length],
  ["taunt-timer-boundary-values", TAUNT_TIMER_BOUNDARY_DOMAIN.length],
  ["taunt-timer-edge-values", TAUNT_TIMER_EDGE_DOMAIN.length],
  ["taunt-timer-write-value", TAUNT_TIMER_SET],
  ["application-count-values", 2],
  ["typed-missing-target-combinations", 1],
]);
const corpus = Object.freeze({
  battlerDomain: BATTLER_DOMAIN,
  tauntTimerDomain: TAUNT_TIMER_DOMAIN,
  tauntTimerBoundaryDomain: TAUNT_TIMER_BOUNDARY_DOMAIN,
  tauntTimerEdgeDomain: TAUNT_TIMER_EDGE_DOMAIN,
  tauntTimerWriteValue: TAUNT_TIMER_SET,
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
  return `BattleScriptSettauntBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustControl(value) {
  return value === "advance"
    ? "BattleScriptSettauntControl::Advance"
    : "BattleScriptSettauntControl::FailJump";
}

function rustControls(values) {
  return `&[${values.map(rustControl).join(", ")}]`;
}

function rustState(value) {
  return [
    "BattleScriptSettauntVectorState {",
    `taunt_timer: [${value.tauntTimer.join(", ")}],`,
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
lines.push("// GENERATED by core-rs/tools/gen-battle-script-settaunt-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSettauntOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_settaunt::{BattleScriptSettauntBattler, BattleScriptSettauntControl};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETTAUNT_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SETTAUNT_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETTAUNT_TIMER_DOMAIN: [u8; ${TAUNT_TIMER_DOMAIN.length}] = [${TAUNT_TIMER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETTAUNT_TIMER_BOUNDARY_DOMAIN: [u8; ${TAUNT_TIMER_BOUNDARY_DOMAIN.length}] = [${TAUNT_TIMER_BOUNDARY_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETTAUNT_TIMER_EDGE_DOMAIN: [u8; ${TAUNT_TIMER_EDGE_DOMAIN.length}] = [${TAUNT_TIMER_EDGE_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETTAUNT_TIMER_WRITE_VALUE: u8 = ${TAUNT_TIMER_SET};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSettauntVectorState {");
lines.push("    pub taunt_timer: [u8; 4],");
lines.push("    pub target: Option<BattleScriptSettauntBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSettauntVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSettauntVectorState,");
lines.push("    pub expected: Option<BattleScriptSettauntVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSettauntControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETTAUNT_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETTAUNT_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETTAUNT_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SETTAUNT_CASES: [BattleScriptSettauntVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSettauntVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-settaunt-vectors: could not find rustfmt");

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-battle-script-settaunt-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-settaunt-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-settaunt-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-settaunt-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-settaunt-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-settaunt-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-settaunt-vectors: generated sha256 ${generatedHash}`);
