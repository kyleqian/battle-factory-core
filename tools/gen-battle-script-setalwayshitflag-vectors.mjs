#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSetalwayshitflagOpcode.ts.
// Expected outputs are created only by executing the canonical TypeScript
// opcode handler; this script owns bounded input construction and Rust literal
// emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-setalwayshitflag-vectors.mjs

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
  "battle_script_setalwayshitflag_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSetalwayshitflagOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSourceConstants.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETALWAYSHITFLAG";
const OPCODE_ID = 0xa7;
const DISPATCHER = "Cmd_setalwayshitflag";
const BATTLE_SLOTS = 4;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const PACKED_COUNTER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const U32_MAX = 0xffff_ffff;
const ALWAYS_HITS_MASK = sourceConstants.BATTLE_SCRIPT_STATUS3_ALWAYS_HITS;
const ALWAYS_HITS_TURN_2 = opcodeModule.BATTLE_SCRIPT_STATUS3_ALWAYS_HITS_TURN_2;

const UNRELATED_STATUS3_PATTERNS = Object.freeze([
  0x0000_0007,
  0x0000_07e0,
  0x4000_0000,
  0x8000_0000,
]);
const NON_TARGET_STATUS3 = Object.freeze([
  0x0101_0101,
  0x2020_2020,
  0x4040_4040,
  0x8080_8080,
]);
const PAIR_DOMAIN = Object.freeze(
  BATTLER_DOMAIN.flatMap((attacker) => BATTLER_DOMAIN.map((target) => Object.freeze([attacker, target]))),
);
const STATUS3_EDGE_SPECS = Object.freeze([
  Object.freeze({
    label: "u32_zero_counter_0",
    attacker: 0,
    target: 1,
    status3: 0x0000_0000,
    priorSureHit: 0,
    packedCounter: 0,
  }),
  Object.freeze({
    label: "u32_max_counter_3",
    attacker: 1,
    target: 2,
    status3: U32_MAX,
    priorSureHit: 1,
    packedCounter: 3,
  }),
  Object.freeze({
    label: "u32_high_bit_counter_2",
    attacker: 2,
    target: 3,
    status3: 0x8000_0010,
    priorSureHit: 2,
    packedCounter: 2,
  }),
  Object.freeze({
    label: "u32_all_unrelated_bits_counter_0",
    attacker: 3,
    target: 0,
    status3: 0xffff_ffe7,
    priorSureHit: 3,
    packedCounter: 0,
  }),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-setalwayshitflag-vectors: ${message}`);
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

function packedCounterFor(status3) {
  return (status3 & ALWAYS_HITS_MASK) >>> 3;
}

function composeStatus3(unrelatedBits, packedCounter) {
  assertU32(unrelatedBits, "unrelated status3 bits");
  assert(
    (unrelatedBits & ALWAYS_HITS_MASK) === 0,
    `unrelated status3 bits overlap STATUS3_ALWAYS_HITS: ${unrelatedBits}`,
  );
  assert(PACKED_COUNTER_DOMAIN.includes(packedCounter), `invalid packed counter ${packedCounter}`);
  return (unrelatedBits | (packedCounter << 3)) >>> 0;
}

function freezeRules(status3, battlerWithSureHit, attacker, target) {
  assert(Array.isArray(status3) && status3.length === BATTLE_SLOTS, "status3 must have four cells");
  assert(
    Array.isArray(battlerWithSureHit) && battlerWithSureHit.length === BATTLE_SLOTS,
    "battlerWithSureHit must have four cells",
  );
  status3.forEach((value, index) => assertU32(value, `status3[${index}]`));
  battlerWithSureHit.forEach((value, index) => assertBattler(value, `battlerWithSureHit[${index}]`));
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  return Object.freeze({
    battlers: Object.freeze(status3.map((value, index) => Object.freeze({
      status3: value,
      battlerWithSureHit: battlerWithSureHit[index],
    }))),
    selectorRoles: Object.freeze({ attacker, target }),
  });
}

function makeInitialRules({ attacker, target, focusBattler, status3, priorSureHit, salt }) {
  assertOptionalBattler(attacker, "initial attacker");
  assertOptionalBattler(target, "initial target");
  assertBattler(focusBattler, "initial focus battler");
  assertU32(status3, "initial target status3");
  assertBattler(priorSureHit, "initial target sure-hit owner");
  const allStatus3 = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? status3
      : NON_TARGET_STATUS3[(battler + salt) % NON_TARGET_STATUS3.length]
  ));
  const owners = BATTLER_DOMAIN.map((battler) => (salt + battler * 3) % BATTLE_SLOTS);
  owners[focusBattler] = priorSureHit;
  return freezeRules(allStatus3, owners, attacker, target);
}

function vectorState(rules) {
  return Object.freeze({
    status3: Object.freeze(rules.battlers.map((battler) => battler.status3 >>> 0)),
    battlerWithSureHit: Object.freeze(rules.battlers.map((battler) => battler.battlerWithSureHit)),
    attacker: rules.selectorRoles.attacker,
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
assert(instruction.operands.length === 0, "canonical opcode must have no operands");
assert(ALWAYS_HITS_MASK === 0x18, `STATUS3_ALWAYS_HITS drifted to ${ALWAYS_HITS_MASK}`);
assert(ALWAYS_HITS_TURN_2 === 0x10, `STATUS3_ALWAYS_HITS_TURN_2 drifted to ${ALWAYS_HITS_TURN_2}`);
for (const bits of UNRELATED_STATUS3_PATTERNS) {
  assert((bits & ALWAYS_HITS_MASK) === 0, "matrix unrelated status3 pattern overlaps packed field");
}

const handlers = opcodeModule.createBattleScriptSetalwayshitflagOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETALWAYSHITFLAG handler was not registered");

function sourceOutcome(initialRules) {
  const inputSnapshot = vectorState(initialRules);
  const state = machineModule.createBattleScriptMachine(
    program,
    "BattleScript_EffectLockOn",
    initialRules,
    0xa15a_b8e2,
  );
  try {
    const transition = handler({ program, instruction, state });
    assert(transition.control.kind === "advance", "canonical handler did not advance");
    assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
    assert(transition.rng === state.rng, "canonical handler consumed RNG");
    assert(transition.events.length === 0, "canonical handler emitted events");
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");

    const target = initialRules.selectorRoles.target;
    assert(target !== null, "successful canonical handler had no target");
    for (const battler of BATTLER_DOMAIN) {
      if (battler !== target) {
        assert(
          transition.rulesContext.battlers[battler] === initialRules.battlers[battler],
          `canonical handler replaced non-target battler ${battler}`,
        );
      }
    }
    assert(
      transition.rulesContext.selectorRoles === initialRules.selectorRoles,
      "canonical handler replaced selector roles",
    );
    return Object.freeze({ expected: vectorState(transition.rulesContext), error: null });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input rules");
    return Object.freeze({ expected: null, error: error.message });
  }
}

const cases = [];
function addCase(label, category, branch, initialRules) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(initialRules);
  const expectedError = outcome.error;
  if (branch === "set-target-packed-counter-and-owner") {
    assert(expectedError === null, `${label}: successful branch threw ${expectedError}`);
    assert(outcome.expected !== null, `${label}: successful branch omitted expected state`);
  } else {
    assert(outcome.expected === null, `${label}: error branch unexpectedly returned state`);
    assert(typeof expectedError === "string", `${label}: error branch omitted message`);
  }
  cases.push(Object.freeze({
    label,
    category,
    branch,
    initial: vectorState(initialRules),
    expected: outcome.expected,
    expectedError,
  }));
}

for (const attacker of BATTLER_DOMAIN) {
  for (const target of BATTLER_DOMAIN) {
    for (const packedCounter of PACKED_COUNTER_DOMAIN) {
      const unrelatedBits = UNRELATED_STATUS3_PATTERNS[
        (attacker + target + packedCounter) % UNRELATED_STATUS3_PATTERNS.length
      ];
      const status3 = composeStatus3(unrelatedBits, packedCounter);
      const priorSureHit = (attacker + target + packedCounter) % BATTLE_SLOTS;
      addCase(
        `pair_a${attacker}_t${target}_counter_${packedCounter}`,
        "attacker-target-counter-matrix",
        "set-target-packed-counter-and-owner",
        makeInitialRules({
          attacker,
          target,
          focusBattler: target,
          status3,
          priorSureHit,
          salt: attacker * BATTLE_SLOTS * BATTLE_SLOTS + target * BATTLE_SLOTS + packedCounter,
        }),
      );
    }
  }
}

for (const [index, spec] of STATUS3_EDGE_SPECS.entries()) {
  assertU32(spec.status3, `${spec.label} status3`);
  assert(
    packedCounterFor(spec.status3) === spec.packedCounter,
    `${spec.label} packed counter drifted`,
  );
  addCase(
    spec.label,
    "u32-edge-status3",
    "set-target-packed-counter-and-owner",
    makeInitialRules({
      attacker: spec.attacker,
      target: spec.target,
      focusBattler: spec.target,
      status3: spec.status3,
      priorSureHit: spec.priorSureHit,
      salt: 80 + index,
    }),
  );
}

addCase(
  "missing_attacker_role",
  "missing-attacker-role",
  "missing-attacker-role",
  makeInitialRules({
    attacker: null,
    target: 2,
    focusBattler: 2,
    status3: composeStatus3(0x8000_0000, 1),
    priorSureHit: 3,
    salt: 96,
  }),
);
addCase(
  "missing_target_role",
  "missing-target-role",
  "missing-target-role",
  makeInitialRules({
    attacker: 1,
    target: null,
    focusBattler: 3,
    status3: composeStatus3(0x0000_0007, 2),
    priorSureHit: 0,
    salt: 97,
  }),
);
addCase(
  "missing_attacker_before_missing_target_role",
  "missing-attacker-before-target-role",
  "missing-attacker-role",
  makeInitialRules({
    attacker: null,
    target: null,
    focusBattler: 1,
    status3: composeStatus3(0x4000_0000, 3),
    priorSureHit: 2,
    salt: 98,
  }),
);

assert(cases.length === 71, `case count drifted: ${cases.length}`);
for (const [attacker, target] of PAIR_DOMAIN) {
  for (const packedCounter of PACKED_COUNTER_DOMAIN) {
    assert(
      cases.some((value) =>
        value.category === "attacker-target-counter-matrix"
        && value.initial.attacker === attacker
        && value.initial.target === target
        && packedCounterFor(value.initial.status3[target]) === packedCounter
      ),
      `matrix omits attacker ${attacker}, target ${target}, counter ${packedCounter}`,
    );
  }
}
for (const owner of BATTLER_DOMAIN) {
  assert(
    cases.some((value) =>
      value.category === "attacker-target-counter-matrix"
      && value.initial.target !== null
      && value.initial.battlerWithSureHit[value.initial.target] === owner
    ),
    `matrix omits prior battlerWithSureHit owner ${owner}`,
  );
}
for (const spec of STATUS3_EDGE_SPECS) {
  assert(
    cases.some((value) => value.label === spec.label && value.initial.status3[spec.target] === spec.status3),
    `missing status3 edge ${spec.label}`,
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
  ["attacker-role-values", BATTLER_DOMAIN.length],
  ["target-role-values", BATTLER_DOMAIN.length],
  ["attacker-target-pairs", PAIR_DOMAIN.length],
  ["status3-u32-values", U32_MAX + 1],
  ["always-hits-packed-counter-inputs", PACKED_COUNTER_DOMAIN.length],
  ["prior-sure-hit-owner-values", BATTLER_DOMAIN.length],
  ["typed-missing-role-combinations", 3],
]);
const corpus = Object.freeze({
  battlerDomain: BATTLER_DOMAIN,
  attackerTargetPairDomain: PAIR_DOMAIN,
  packedCounterDomain: PACKED_COUNTER_DOMAIN,
  status3EdgeDomain: STATUS3_EDGE_SPECS.map((value) => value.status3),
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
  return `BattleScriptSetalwayshitflagBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustState(value) {
  return [
    "BattleScriptSetalwayshitflagVectorState {",
    `status3: [${value.status3.map(rustU32).join(", ")}],`,
    `battler_with_sure_hit: [${value.battlerWithSureHit.map(rustBattler).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
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
lines.push("// GENERATED by core-rs/tools/gen-battle-script-setalwayshitflag-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetalwayshitflagOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_setalwayshitflag::BattleScriptSetalwayshitflagBattler;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_PAIR_DOMAIN: [(u8, u8); ${PAIR_DOMAIN.length}] = [`);
for (const [attacker, target] of PAIR_DOMAIN) lines.push(`    (${attacker}, ${target}),`);
lines.push("];" );
lines.push(`pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_COUNTER_DOMAIN: [u8; ${PACKED_COUNTER_DOMAIN.length}] = [${PACKED_COUNTER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_STATUS3_EDGE_DOMAIN: [u32; ${STATUS3_EDGE_SPECS.length}] = [${STATUS3_EDGE_SPECS.map((value) => rustU32(value.status3)).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetalwayshitflagVectorState {");
lines.push("    pub status3: [u32; 4],");
lines.push("    pub battler_with_sure_hit: [BattleScriptSetalwayshitflagBattler; 4],");
lines.push("    pub attacker: Option<BattleScriptSetalwayshitflagBattler>,");
lines.push("    pub target: Option<BattleScriptSetalwayshitflagBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetalwayshitflagVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub initial: BattleScriptSetalwayshitflagVectorState,");
lines.push("    pub expected: Option<BattleScriptSetalwayshitflagVectorState>,");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SETALWAYSHITFLAG_CASES: [BattleScriptSetalwayshitflagVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSetalwayshitflagVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
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
if (!formatted) throw new Error("gen-battle-script-setalwayshitflag-vectors: could not find rustfmt");

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-battle-script-setalwayshitflag-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-setalwayshitflag-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-setalwayshitflag-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-setalwayshitflag-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-setalwayshitflag-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-setalwayshitflag-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-setalwayshitflag-vectors: generated sha256 ${generatedHash}`);
