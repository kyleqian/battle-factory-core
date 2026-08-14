#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSetforcedtargetOpcode.ts.
// Expected controls and outputs are created only by executing the canonical
// TypeScript opcode handler; this script owns bounded input construction and
// Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-setforcedtarget-vectors.mjs

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
  "battle_script_setforcedtarget_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSetforcedtargetOpcode.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETFORCEDTARGET";
const OPCODE_ID = 0xca;
const DISPATCHER = "Cmd_setforcedtarget";
const ENTRY_LABEL = "BattleScript_EffectFollowMe";
const BATTLE_SLOTS = 4;
const SIDE_COUNT = 2;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const SIDE_DOMAIN = Object.freeze([0, 1]);
// `BattlerPosition` and `GET_BATTLER_SIDE2` in include/constants/battle.h
// / include/battle.h make ordinary four-battler layout player/opponent/player/opponent.
const CANONICAL_BATTLER_SIDES = Object.freeze([0, 1, 0, 1]);
const U8_EDGE_VALUES = Object.freeze([0, 1, 0x7f, 0xfe, 0xff]);
const FOLLOWME_TIMER_EDGE_VALUES = Object.freeze([0, 1, 0xff]);
const FOLLOWME_TARGET_DOMAIN = ATTACKER_DOMAIN;
const FOLLOWME_TIMER_SET = 1;
const SIDE_TIMER_SIBLING_FIELDS = Object.freeze([
  "reflectTimer",
  "reflectBattlerId",
  "lightscreenTimer",
  "lightscreenBattlerId",
  "safeguardTimer",
  "safeguardBattlerId",
  "mistBattlerId",
  "spikesAmount",
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-setforcedtarget-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertSide(value, label) {
  assert(SIDE_DOMAIN.includes(value), `${label} must be a side 0 or 1, got ${value}`);
}

function assertU8(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= 0xff,
    `${label} must be a u8, got ${value}`,
  );
}

function freezeSideTimer(value, label) {
  assertU8(value.reflectTimer, `${label}.reflectTimer`);
  assertBattler(value.reflectBattlerId, `${label}.reflectBattlerId`);
  assertU8(value.lightscreenTimer, `${label}.lightscreenTimer`);
  assertBattler(value.lightscreenBattlerId, `${label}.lightscreenBattlerId`);
  assertU8(value.safeguardTimer, `${label}.safeguardTimer`);
  assertBattler(value.safeguardBattlerId, `${label}.safeguardBattlerId`);
  assertBattler(value.mistBattlerId, `${label}.mistBattlerId`);
  assertU8(value.followmeTimer, `${label}.followmeTimer`);
  assertBattler(value.followmeTarget, `${label}.followmeTarget`);
  assertU8(value.spikesAmount, `${label}.spikesAmount`);
  return Object.freeze({
    reflectTimer: value.reflectTimer,
    reflectBattlerId: value.reflectBattlerId,
    lightscreenTimer: value.lightscreenTimer,
    lightscreenBattlerId: value.lightscreenBattlerId,
    safeguardTimer: value.safeguardTimer,
    safeguardBattlerId: value.safeguardBattlerId,
    mistBattlerId: value.mistBattlerId,
    followmeTimer: value.followmeTimer,
    followmeTarget: value.followmeTarget,
    spikesAmount: value.spikesAmount,
  });
}

function freezeRules(battlerSides, sideTimers, attacker) {
  assert(
    Array.isArray(battlerSides) && battlerSides.length === BATTLE_SLOTS,
    "battlerSides must have four cells",
  );
  battlerSides.forEach((side, index) => assertSide(side, `battlerSides[${index}]`));
  assert(
    Array.isArray(sideTimers) && sideTimers.length === SIDE_COUNT,
    "sideTimers must have two records",
  );
  assertOptionalBattler(attacker, "attacker role");
  return Object.freeze({
    battlers: Object.freeze(battlerSides.map((side) => Object.freeze({ side }))),
    sideTimers: Object.freeze([
      freezeSideTimer(sideTimers[0], "sideTimers[0]"),
      freezeSideTimer(sideTimers[1], "sideTimers[1]"),
    ]),
    selectorRoles: Object.freeze({ attacker }),
  });
}

function u8Edge(salt) {
  return U8_EDGE_VALUES[salt % U8_EDGE_VALUES.length];
}

function makeSideTimer(salt, followmeTimer, followmeTarget) {
  assertU8(followmeTimer, "initial followmeTimer");
  assertBattler(followmeTarget, "initial followmeTarget");
  return freezeSideTimer({
    reflectTimer: u8Edge(salt),
    reflectBattlerId: ATTACKER_DOMAIN[(salt + 1) % ATTACKER_DOMAIN.length],
    lightscreenTimer: u8Edge(salt + 2),
    lightscreenBattlerId: ATTACKER_DOMAIN[(salt + 3) % ATTACKER_DOMAIN.length],
    safeguardTimer: u8Edge(salt + 4),
    safeguardBattlerId: ATTACKER_DOMAIN[(salt + 5) % ATTACKER_DOMAIN.length],
    mistBattlerId: ATTACKER_DOMAIN[(salt + 6) % ATTACKER_DOMAIN.length],
    followmeTimer,
    followmeTarget,
    spikesAmount: u8Edge(salt + 7),
  }, `generatedSideTimer(${salt})`);
}

function makeInitialRules({ attacker, followmeTimer, followmeTarget, salt }) {
  assertOptionalBattler(attacker, "initial attacker");
  assertU8(followmeTimer, "initial followmeTimer");
  assertBattler(followmeTarget, "initial followmeTarget");
  const attackerSide = attacker === null ? 0 : CANONICAL_BATTLER_SIDES[attacker];
  const timer0 = makeSideTimer(
    salt + 7,
    attackerSide === 0 ? followmeTimer : FOLLOWME_TIMER_EDGE_VALUES[(salt + 1) % FOLLOWME_TIMER_EDGE_VALUES.length],
    attackerSide === 0 ? followmeTarget : ATTACKER_DOMAIN[(salt + 2) % ATTACKER_DOMAIN.length],
  );
  const timer1 = makeSideTimer(
    salt + 19,
    attackerSide === 1 ? followmeTimer : FOLLOWME_TIMER_EDGE_VALUES[(salt + 3) % FOLLOWME_TIMER_EDGE_VALUES.length],
    attackerSide === 1 ? followmeTarget : ATTACKER_DOMAIN[(salt + 4) % ATTACKER_DOMAIN.length],
  );
  return freezeRules(CANONICAL_BATTLER_SIDES, [timer0, timer1], attacker);
}

function boundarySideTimer({
  reflectTimer,
  reflectBattlerId,
  lightscreenTimer,
  lightscreenBattlerId,
  safeguardTimer,
  safeguardBattlerId,
  mistBattlerId,
  followmeTimer,
  followmeTarget,
  spikesAmount,
}) {
  return freezeSideTimer({
    reflectTimer,
    reflectBattlerId,
    lightscreenTimer,
    lightscreenBattlerId,
    safeguardTimer,
    safeguardBattlerId,
    mistBattlerId,
    followmeTimer,
    followmeTarget,
    spikesAmount,
  }, "boundarySideTimer");
}

function makeBoundaryRules(attacker) {
  assertBattler(attacker, "boundary attacker");
  return freezeRules(CANONICAL_BATTLER_SIDES, [
    boundarySideTimer({
      reflectTimer: 0,
      reflectBattlerId: 3,
      lightscreenTimer: 1,
      lightscreenBattlerId: 2,
      safeguardTimer: 0xff,
      safeguardBattlerId: 1,
      mistBattlerId: 0,
      followmeTimer: 0xff,
      followmeTarget: 2,
      spikesAmount: 0xfe,
    }),
    boundarySideTimer({
      reflectTimer: 0xff,
      reflectBattlerId: 0,
      lightscreenTimer: 0xfe,
      lightscreenBattlerId: 1,
      safeguardTimer: 0,
      safeguardBattlerId: 2,
      mistBattlerId: 3,
      followmeTimer: 1,
      followmeTarget: 1,
      spikesAmount: 1,
    }),
  ], attacker);
}

function vectorTimer(timer) {
  return Object.freeze({
    reflectTimer: timer.reflectTimer,
    reflectBattlerId: timer.reflectBattlerId,
    lightscreenTimer: timer.lightscreenTimer,
    lightscreenBattlerId: timer.lightscreenBattlerId,
    safeguardTimer: timer.safeguardTimer,
    safeguardBattlerId: timer.safeguardBattlerId,
    mistBattlerId: timer.mistBattlerId,
    followmeTimer: timer.followmeTimer,
    followmeTarget: timer.followmeTarget,
    spikesAmount: timer.spikesAmount,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlerSides: Object.freeze(rules.battlers.map((battler) => battler.side)),
    sideTimers: Object.freeze(rules.sideTimers.map(vectorTimer)),
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
assert(
  instruction.dispatcher === DISPATCHER,
  `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`,
);
assert(instruction.operands.length === 0, "canonical opcode must have no operands");

const handlers = opcodeModule.createBattleScriptSetforcedtargetOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETFORCEDTARGET handler was not registered");

function assertCanonicalTransition(currentRules, transition) {
  assert(transition.control.kind === "advance", "canonical handler did not advance");
  assert(transition.scheduler !== undefined, "canonical handler omitted scheduler state");
  assert(transition.events.length === 0, "canonical handler emitted events");
  const attacker = currentRules.selectorRoles.attacker;
  assert(attacker !== null, "successful canonical handler had no attacker");
  const side = currentRules.battlers[attacker].side;
  const opposite = side === 0 ? 1 : 0;
  const next = transition.rulesContext;
  assert(next.selectorRoles === currentRules.selectorRoles, "canonical handler replaced selector roles");
  assert(next.battlers === currentRules.battlers, "canonical handler replaced battlers");
  assert(next.sideTimers !== currentRules.sideTimers, "canonical handler did not replace sideTimers");
  assert(
    next.sideTimers[side] !== currentRules.sideTimers[side],
    "canonical handler did not replace acting side timer",
  );
  assert(
    next.sideTimers[opposite] === currentRules.sideTimers[opposite],
    "canonical handler replaced opposite side timer",
  );
  assert(next.sideTimers[side].followmeTimer === FOLLOWME_TIMER_SET, "canonical timer write drifted");
  assert(next.sideTimers[side].followmeTarget === attacker, "canonical target write drifted");
  for (const field of SIDE_TIMER_SIBLING_FIELDS) {
    assert(
      next.sideTimers[side][field] === currentRules.sideTimers[side][field],
      `canonical handler changed acting-side sibling ${field}`,
    );
  }
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
      assertCanonicalTransition(currentRules, transition);
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
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
  const side = CANONICAL_BATTLER_SIDES[attacker];
  for (const followmeTimer of FOLLOWME_TIMER_EDGE_VALUES) {
    for (const followmeTarget of FOLLOWME_TARGET_DOMAIN) {
      addCase(
        `matrix_a${attacker}_side${side}_timer${followmeTimer}_target${followmeTarget}`,
        "attacker-side-followme-matrix",
        makeInitialRules({
          attacker,
          followmeTimer,
          followmeTarget,
          salt: attacker * 101 + followmeTimer * 7 + followmeTarget,
        }),
      );
    }
  }
}

addCase(
  "all_sibling_fields_u8_boundary_player",
  "all-sibling-fields-u8-boundary-preservation",
  makeBoundaryRules(2),
);
addCase(
  "all_sibling_fields_u8_boundary_opponent",
  "all-sibling-fields-u8-boundary-preservation",
  makeBoundaryRules(3),
);

for (const [attacker, priorTarget] of [[0, 2], [2, 0], [1, 3], [3, 1]]) {
  addCase(
    `same_side_partner_a${attacker}_replaces_a${priorTarget}`,
    "same-side-partner-overwrite",
    makeInitialRules({
      attacker,
      followmeTimer: 0xff,
      followmeTarget: priorTarget,
      salt: 600 + attacker * 10 + priorTarget,
    }),
  );
}

addCase(
  "repeated_player_overwrites_and_advances",
  "repeated-application",
  makeInitialRules({ attacker: 2, followmeTimer: 0xff, followmeTarget: 0, salt: 700 }),
  2,
);
addCase(
  "repeated_opponent_overwrites_and_advances",
  "repeated-application",
  makeInitialRules({ attacker: 3, followmeTimer: 0, followmeTarget: 1, salt: 701 }),
  2,
);

addCase(
  "missing_attacker_role_precedes_battler_side_access",
  "missing-attacker-role",
  makeInitialRules({ attacker: null, followmeTimer: 0xff, followmeTarget: 3, salt: 800 }),
);

assert(cases.length === 57, `case count drifted: ${cases.length}`);
for (const attacker of ATTACKER_DOMAIN) {
  for (const followmeTimer of FOLLOWME_TIMER_EDGE_VALUES) {
    for (const followmeTarget of FOLLOWME_TARGET_DOMAIN) {
      assert(
        cases.some((value) =>
          value.category === "attacker-side-followme-matrix"
          && value.initial.attacker === attacker
          && value.initial.sideTimers[CANONICAL_BATTLER_SIDES[attacker]].followmeTimer === followmeTimer
          && value.initial.sideTimers[CANONICAL_BATTLER_SIDES[attacker]].followmeTarget === followmeTarget
        ),
        `matrix omits attacker ${attacker}, timer ${followmeTimer}, target ${followmeTarget}`,
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
  ["side-timer-records", SIDE_COUNT],
  ["side-values", SIDE_DOMAIN.length],
  ["canonical-battler-side-map-cells", CANONICAL_BATTLER_SIDES.length],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["optional-attacker-role-values", ATTACKER_DOMAIN.length + 1],
  ["side-timer-u8-values", 0x100],
  ["side-timer-sibling-u8-edge-values", U8_EDGE_VALUES.length],
  ["side-timer-battler-id-values", ATTACKER_DOMAIN.length],
  ["followme-timer-edge-values", FOLLOWME_TIMER_EDGE_VALUES.length],
  ["followme-target-values", FOLLOWME_TARGET_DOMAIN.length],
  ["followme-timer-write-value", FOLLOWME_TIMER_SET],
  ["application-count-values", 2],
  ["typed-missing-attacker-combinations", 1],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  sideDomain: SIDE_DOMAIN,
  canonicalBattlerSides: CANONICAL_BATTLER_SIDES,
  u8EdgeDomain: U8_EDGE_VALUES,
  followmeTimerEdgeDomain: FOLLOWME_TIMER_EDGE_VALUES,
  followmeTargetDomain: FOLLOWME_TARGET_DOMAIN,
  followmeTimerSet: FOLLOWME_TIMER_SET,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU8(value) {
  return `0x${value.toString(16).padStart(2, "0")}`;
}

function rustBattler(value) {
  return `BattleScriptSetforcedtargetBattler::Battler${value}`;
}

function rustSide(value) {
  return value === 0
    ? "BattleScriptSetforcedtargetSide::Player"
    : "BattleScriptSetforcedtargetSide::Opponent";
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustTimer(value) {
  return [
    "BattleScriptSetforcedtargetSideTimerState {",
    `reflect_timer: ${rustU8(value.reflectTimer)},`,
    `reflect_battler_id: ${rustBattler(value.reflectBattlerId)},`,
    `lightscreen_timer: ${rustU8(value.lightscreenTimer)},`,
    `lightscreen_battler_id: ${rustBattler(value.lightscreenBattlerId)},`,
    `safeguard_timer: ${rustU8(value.safeguardTimer)},`,
    `safeguard_battler_id: ${rustBattler(value.safeguardBattlerId)},`,
    `mist_battler_id: ${rustBattler(value.mistBattlerId)},`,
    `followme_timer: ${rustU8(value.followmeTimer)},`,
    `followme_target: ${rustBattler(value.followmeTarget)},`,
    `spikes_amount: ${rustU8(value.spikesAmount)},`,
    "}",
  ].join(" ");
}

function rustState(value) {
  return [
    "BattleScriptSetforcedtargetVectorState {",
    `battler_sides: [${value.battlerSides.map(rustSide).join(", ")}],`,
    `side_timers: [${value.sideTimers.map(rustTimer).join(", ")}],`,
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

function rustControls(values) {
  assert(values.every((value) => value === "advance"), "unexpected non-advance control");
  return `&[${values.map(() => "BattleScriptSetforcedtargetControl::Advance").join(", ")}]`;
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-setforcedtarget-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetforcedtargetOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_setforcedtarget::{");
lines.push("    BattleScriptSetforcedtargetBattler, BattleScriptSetforcedtargetControl,");
lines.push("    BattleScriptSetforcedtargetSide, BattleScriptSetforcedtargetSideTimerState,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_ATTACKER_DOMAIN: [u8; ${ATTACKER_DOMAIN.length}] = [${ATTACKER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_SIDE_DOMAIN: [u8; ${SIDE_DOMAIN.length}] = [${SIDE_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_CANONICAL_BATTLER_SIDES: [u8; ${CANONICAL_BATTLER_SIDES.length}] = [${CANONICAL_BATTLER_SIDES.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_U8_EDGE_DOMAIN: [u8; ${U8_EDGE_VALUES.length}] = [${U8_EDGE_VALUES.map(rustU8).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_EDGE_DOMAIN: [u8; ${FOLLOWME_TIMER_EDGE_VALUES.length}] = [${FOLLOWME_TIMER_EDGE_VALUES.map(rustU8).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TARGET_DOMAIN: [u8; ${FOLLOWME_TARGET_DOMAIN.length}] = [${FOLLOWME_TARGET_DOMAIN.join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetforcedtargetVectorState {");
lines.push("    pub battler_sides: [BattleScriptSetforcedtargetSide; 4],");
lines.push("    pub side_timers: [BattleScriptSetforcedtargetSideTimerState; 2],");
lines.push("    pub attacker: Option<BattleScriptSetforcedtargetBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetforcedtargetVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSetforcedtargetVectorState,");
lines.push("    pub expected: Option<BattleScriptSetforcedtargetVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSetforcedtargetControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETFORCEDTARGET_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SETFORCEDTARGET_CASES: [BattleScriptSetforcedtargetVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSetforcedtargetVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-setforcedtarget-vectors: could not find rustfmt");

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-battle-script-setforcedtarget-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-setforcedtarget-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-setforcedtarget-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-setforcedtarget-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-setforcedtarget-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-setforcedtarget-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-setforcedtarget-vectors: generated sha256 ${generatedHash}`);
