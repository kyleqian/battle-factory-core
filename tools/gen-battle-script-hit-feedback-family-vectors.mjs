#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_HITANIMATION (0x5C) /
// B_SCR_OP_EFFECTIVENESSSOUND (0x0E) pair.
//
// Expected outcomes come only from executing the canonical TypeScript
// `hitanimationOpcodeHandler` / `createEffectivenesssoundOpcodeHandler`
// (src/engine/battleScriptHitChainOpcode.ts) driven by the canonical
// production `externalPorts()` closure
// (src/engine/factoryBattleScriptFullTurnDecision.ts, private -- exposed via
// a scratch copy, never edited in place) for effectivenesssound's
// isControllerIdle port. This generator owns bounded input construction and
// Rust literal emission; it must not independently implement either ladder.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-hit-feedback-family-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot, "core-rs", "crates", "factory-core", "src", "battle_script_hit_feedback_family_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-hit-feedback-family-vectors: " + message);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + (value & 0xff).toString(16).padStart(2, "0"); }
function hex32(value) { return "0x" + (value >>> 0).toString(16).padStart(8, "0"); }
function battlerVariant(value) { return `BattleScriptHitFeedbackBattler::Battler${value}`; }
function rustString(value) { return JSON.stringify(value); }

const HITANIMATION_OPCODE_NAME = "B_SCR_OP_HITANIMATION";
const HITANIMATION_OPCODE_ID = 0x5c;
const EFFECTIVENESSSOUND_OPCODE_NAME = "B_SCR_OP_EFFECTIVENESSSOUND";
const EFFECTIVENESSSOUND_OPCODE_ID = 0x0e;

const MOVE_RESULT_MISSED = 1 << 0;
const MOVE_RESULT_SUPER_EFFECTIVE = 1 << 1;
const MOVE_RESULT_NOT_VERY_EFFECTIVE = 1 << 2;
const MOVE_RESULT_DOESNT_AFFECT_FOE = 1 << 3;
const MOVE_RESULT_FAILED = 1 << 5;
const MOVE_RESULT_NO_EFFECT = (1 << 0) | (1 << 3) | (1 << 5);
const HITMARKER_IGNORE_SUBSTITUTE = 1 << 8;
const STATUS2_SUBSTITUTE = 0x0100_0000;

const [programModule, machineModule, hitChainModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptHitChainOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

/**
 * Reads the canonical module, changes only the private `externalPorts`
 * declaration in a freshly allocated scratch copy, and imports that copy.
 * Copied verbatim from gen-battle-script-attackstring-vectors.mjs.
 */
async function loadCanonicalExternalPorts() {
  const canonicalPath = path.join(workspaceRoot, "src", "engine", "factoryBattleScriptFullTurnDecision.ts");
  const source = fs.readFileSync(canonicalPath, "utf8");
  const needle = "function externalPorts(): BattleScriptStatusRulesExternalPorts {";
  const occurrences = source.split(needle).length - 1;
  assert(occurrences === 1, `expected exactly one private externalPorts declaration, found ${occurrences}`);
  const canonicalUrl = pathToFileURL(canonicalPath);
  const exposed = source
    .replace(needle, `export ${needle}`)
    .replace(/from "(\.[^"]+)"/g, (_whole, specifier) => `from ${JSON.stringify(new URL(specifier, canonicalUrl).href)}`);
  const scratchDir = execFileSync(
    "mktemp",
    ["-d", path.join(os.tmpdir(), "battle-script-hit-feedback-vectors-XXXXXX")],
    { encoding: "utf8" },
  ).trim();
  assert(scratchDir.length > 0, "mktemp -d did not return a scratch directory");
  const exposedPath = path.join(scratchDir, "factoryBattleScriptFullTurnDecision.exposed.ts");
  fs.writeFileSync(exposedPath, exposed, "utf8");
  const module = await import(pathToFileURL(exposedPath).href);
  assert(typeof module.externalPorts === "function", "temporary canonical module did not expose externalPorts");
  return module.externalPorts;
}

const externalPorts = await loadCanonicalExternalPorts();
const realPorts = externalPorts();
assert(typeof realPorts.isControllerIdle === "function", "externalPorts did not return isControllerIdle");

const program = programModule.loadBattleScriptProgram();
const hitanimationInstructions = program.instructions.filter((i) => i.opcodeName === HITANIMATION_OPCODE_NAME);
assert(hitanimationInstructions.length === 14, "hitanimation census drifted to " + hitanimationInstructions.length);
const hitanimationTargetSites = hitanimationInstructions.filter((i) => i.operands[0]?.expression === "BS_TARGET");
const hitanimationAttackerSites = hitanimationInstructions.filter((i) => i.operands[0]?.expression === "BS_ATTACKER");
assert(hitanimationTargetSites.length === 12, "hitanimation BS_TARGET census drifted to " + hitanimationTargetSites.length);
assert(hitanimationAttackerSites.length === 2, "hitanimation BS_ATTACKER census drifted to " + hitanimationAttackerSites.length);

const effectivenesssoundInstructions = program.instructions.filter((i) => i.opcodeName === EFFECTIVENESSSOUND_OPCODE_NAME);
assert(effectivenesssoundInstructions.length === 18, "effectivenesssound census drifted to " + effectivenesssoundInstructions.length);

function customInstruction(template, overrides) {
  const operands = template.operands.map((operand, index) =>
    index in overrides ? Object.freeze({ ...operand, expression: overrides[index] }) : operand,
  );
  return Object.freeze({ ...template, operands: freezeArray(operands) });
}
function emptyOperandInstruction(template) {
  return Object.freeze({ ...template, operands: freezeArray([]) });
}

// ---------------------------------------------------------------------
// Rules construction (canonicalBattler/party shape copied from
// gen-battle-script-attackstring-vectors.mjs).
// ---------------------------------------------------------------------

function canonicalBattler(index, overrides = {}) {
  return Object.freeze({
    side: index % 2, ability: 0, hp: 100, maxHP: 100,
    moves: freezeArray([33, 45, 98, 57]), pp: freezeArray([35, 10, 15, 20]),
    status1: 0, status2: overrides.status2 ?? 0, status3: 0, item: 0,
    statStages: freezeArray([6, 6, 6, 6, 6, 6, 6, 6]),
    types: freezeArray(["TYPE_NORMAL", "TYPE_NORMAL"]), species: 1,
    attack: 50, defense: 51, speed: 52, spAttack: 53, spDefense: 54,
    level: 50, friendship: 70, partyIndex: Math.floor(index / 2),
    substituteHP: overrides.substituteHP ?? 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0,
  });
}

function emptyPartyMember() { return Object.freeze({ pp: freezeArray([0, 0, 0, 0]) }); }

function makeRulesContext(overrides) {
  const {
    attacker = 0, target = 1, fainted = null,
    hitMarker = 0, moveResultFlags = 0, battlerOverrides = {},
  } = overrides;
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray([0, 1, 2, 3].map((index) => canonicalBattler(index, battlerOverrides[index] ?? {}))),
    battleTopology: Object.freeze({
      battlersCount: 2, battlerPositions: freezeArray([0, 1, 2, 3]), battleTypeFlags: 0,
    }),
    selectorRoles: Object.freeze({ attacker, target, fainted }),
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: 33, currentMovePosition: 0, moveResultFlags, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte: 0, missType: 0, hitMarker, multiHitCounter: 0,
    party: Object.freeze({
      player: freezeArray([0, 1, 2, 3, 4, 5].map(emptyPartyMember)),
      opponent: freezeArray([0, 1, 2, 3, 4, 5].map(emptyPartyMember)),
    }),
  });
}

function projectRoles(rules) {
  return Object.freeze({
    attacker: rules.selectorRoles.attacker, target: rules.selectorRoles.target, fainted: rules.selectorRoles.fainted,
  });
}
function projectBattlers(rules) {
  return freezeArray(rules.battlers.map((b) => Object.freeze({ status2: b.status2 >>> 0, substituteHP: b.substituteHP })));
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function projectEvent(event) {
  if (event === undefined) return null;
  if (event.kind === "animation") {
    assert(event.animationId === "HIT_ANIMATION", "unexpected animationId " + event.animationId);
    assert(Array.isArray(event.arguments) && event.arguments.length === 0, "expected empty arguments");
    return Object.freeze({ kind: "animation", battler: event.battler });
  }
  if (event.kind === "play-se") {
    return Object.freeze({ kind: "play-se", battler: event.battler, songId: event.songId });
  }
  throw new Error("unexpected event kind " + event.kind);
}

// ---------------------------------------------------------------------
// hitanimation case driving
// ---------------------------------------------------------------------

const hitanimationCases = [];

function driveHitanimation(label, category, instruction, rulesContext, schedulerState) {
  assert(!hitanimationCases.some((c) => c.label === label), "duplicate hitanimation label " + label);
  const machine = machineModule.createBattleScriptMachine(program, program.instructions[0].source.label, rulesContext, 0x1234_5678, schedulerState);
  const state = Object.freeze({ ...machine, programCounter: instruction.programCounter });
  const context = Object.freeze({ program, instruction, state });
  const beforeRoles = projectRoles(rulesContext);
  const beforeBattlers = projectBattlers(rulesContext);
  const beforePending = freezeArray(schedulerState.pendingControllerBattlers);

  let transition;
  let threw = null;
  try {
    transition = hitChainModule.hitanimationOpcodeHandler(context);
  } catch (error) {
    assert(error instanceof Error, label + ": non-Error throw");
    threw = error.message;
  }

  assert(same(projectRoles(rulesContext), beforeRoles), label + ": handler mutated selectorRoles");
  assert(same(projectBattlers(rulesContext), beforeBattlers), label + ": handler mutated battlers");

  let kind = null;
  let haltSourceConstruct = null;
  let haltSourceLine = null;
  let pendingOut = null;
  let event = null;
  if (threw === null) {
    if (transition.control.kind === "halt") {
      kind = "halt";
      assert(transition.control.reason.kind === "unsupported-branch", label + ": expected unsupported-branch halt");
      haltSourceConstruct = transition.control.reason.sourceConstruct;
      haltSourceLine = transition.control.reason.sourceLine;
      assert(same(freezeArray(transition.scheduler.pendingControllerBattlers), beforePending), label + ": halt changed pending");
    } else {
      assert(transition.control.kind === "advance", label + ": expected advance or halt, got " + transition.control.kind);
      kind = "advance";
      pendingOut = freezeArray(transition.scheduler.pendingControllerBattlers);
      assert(transition.events.length <= 1, label + ": at most one event expected");
      event = projectEvent(transition.events[0]);
    }
  } else {
    kind = "throw";
  }

  hitanimationCases.push(Object.freeze({
    label, category,
    operandExpression: instruction.operands[0]?.expression ?? null,
    initialRoles: beforeRoles, initialBattlers: beforeBattlers,
    initialHitMarker: rulesContext.hitMarker >>> 0, initialMoveResultFlags: rulesContext.moveResultFlags >>> 0,
    initialPending: beforePending,
    kind, haltSourceConstruct, haltSourceLine, throwMessage: threw,
    pendingOut, event,
  }));
}

function schedulerWith(pending) {
  return machineModule.createBattleScriptSchedulerState({ pendingControllerBattlers: freezeArray(pending), messageDisplayActive: true });
}

const targetTemplate = hitanimationTargetSites[0];
const attackerTemplate = hitanimationAttackerSites[0];

// Committed-site emit paths.
driveHitanimation("target_committed_site_emits", "committed-emit", targetTemplate, makeRulesContext({}), schedulerWith([]));
driveHitanimation("attacker_committed_site_emits", "committed-emit", attackerTemplate, makeRulesContext({}), schedulerWith([]));

// No-busy-gate pin: pending non-empty still executes (contrast case).
driveHitanimation(
  "no_busy_gate_pending_nonempty_still_executes", "no-busy-gate",
  targetTemplate, makeRulesContext({}), schedulerWith([2]),
);

// NO_EFFECT advance, no event.
driveHitanimation(
  "no_effect_advances_without_event", "no-effect",
  targetTemplate, makeRulesContext({ moveResultFlags: MOVE_RESULT_NO_EFFECT }), schedulerWith([]),
);

// Suppressed-by-substitute (all three conjuncts true) plus each single-conjunct-false variant.
driveHitanimation(
  "substitute_suppressed_all_conjuncts_true", "substitute-suppression",
  targetTemplate,
  makeRulesContext({ hitMarker: HITMARKER_IGNORE_SUBSTITUTE, battlerOverrides: { 1: { status2: STATUS2_SUBSTITUTE, substituteHP: 5 } } }),
  schedulerWith([]),
);
driveHitanimation(
  "substitute_variant_ignore_substitute_clear_still_emits", "substitute-suppression",
  targetTemplate,
  makeRulesContext({ hitMarker: 0, battlerOverrides: { 1: { status2: STATUS2_SUBSTITUTE, substituteHP: 5 } } }),
  schedulerWith([]),
);
driveHitanimation(
  "substitute_variant_no_substitute_bit_still_emits", "substitute-suppression",
  targetTemplate,
  makeRulesContext({ hitMarker: HITMARKER_IGNORE_SUBSTITUTE, battlerOverrides: { 1: { status2: 0, substituteHP: 5 } } }),
  schedulerWith([]),
);
driveHitanimation(
  "substitute_variant_substitute_hp_zero_still_emits", "substitute-suppression",
  targetTemplate,
  makeRulesContext({ hitMarker: HITMARKER_IGNORE_SUBSTITUTE, battlerOverrides: { 1: { status2: STATUS2_SUBSTITUTE, substituteHP: 0 } } }),
  schedulerWith([]),
);

// Battler-already-pending no-duplicate.
driveHitanimation(
  "already_pending_no_duplicate", "no-duplicate",
  targetTemplate, makeRulesContext({}), schedulerWith([1]),
);

// BS_FAINTED custom operand surgery: fainted role set (emits) and missing (verbatim throw).
driveHitanimation(
  "custom_fainted_role_set_emits", "custom-fainted",
  customInstruction(targetTemplate, { 0: "BS_FAINTED" }),
  makeRulesContext({ fainted: 2 }),
  schedulerWith([]),
);
driveHitanimation(
  "custom_fainted_role_missing_throws", "custom-fainted",
  customInstruction(targetTemplate, { 0: "BS_FAINTED" }),
  makeRulesContext({ fainted: null }),
  schedulerWith([]),
);

// Unknown-selector halt + missing-operand halt (verbatim construct strings).
driveHitanimation(
  "custom_unknown_selector_halts", "unsupported-branch",
  customInstruction(targetTemplate, { 0: "BS_SCRIPTING" }),
  makeRulesContext({}),
  schedulerWith([]),
);
driveHitanimation(
  "custom_missing_operand_halts", "unsupported-branch",
  emptyOperandInstruction(targetTemplate),
  makeRulesContext({}),
  schedulerWith([]),
);

// Missing target/attacker role throws (BS_TARGET/BS_ATTACKER sites with the role unset).
driveHitanimation(
  "custom_missing_target_role_throws", "missing-role",
  targetTemplate, makeRulesContext({ target: null }), schedulerWith([]),
);
driveHitanimation(
  "custom_missing_attacker_role_throws", "missing-role",
  attackerTemplate, makeRulesContext({ attacker: null }), schedulerWith([]),
);

const hitanimationCaseCount = hitanimationCases.length;
assert(hitanimationCaseCount >= 13, "hitanimation behavior case count too low: " + hitanimationCaseCount);

// ---------------------------------------------------------------------
// effectivenesssound case driving
// ---------------------------------------------------------------------

const effectivenesssoundCases = [];

const hitFeedbackHandlers = hitChainModule.createBattleScriptHitChainOpcodeHandlers(program, realPorts);
const effectivenesssoundHandler = hitFeedbackHandlers[EFFECTIVENESSSOUND_OPCODE_ID];
assert(typeof effectivenesssoundHandler === "function", "effectivenesssound did not register via createBattleScriptHitChainOpcodeHandlers");

function driveEffectivenesssound(label, category, instruction, rulesContext, schedulerState) {
  assert(!effectivenesssoundCases.some((c) => c.label === label), "duplicate effectivenesssound label " + label);
  const handler = effectivenesssoundHandler;
  const machine = machineModule.createBattleScriptMachine(program, program.instructions[0].source.label, rulesContext, 0x1234_5678, schedulerState);
  const state = Object.freeze({ ...machine, programCounter: instruction.programCounter });
  const context = Object.freeze({ program, instruction, state });
  const beforeRoles = projectRoles(rulesContext);
  const beforePending = freezeArray(schedulerState.pendingControllerBattlers);

  let transition;
  let threw = null;
  try {
    transition = handler(context);
  } catch (error) {
    assert(error instanceof Error, label + ": non-Error throw");
    threw = error.message;
  }
  assert(same(projectRoles(rulesContext), beforeRoles), label + ": handler mutated selectorRoles");

  let kind = null;
  let pendingOut = null;
  let event = null;
  if (threw === null) {
    if (transition.control.kind === "block") {
      kind = "block";
      assert(transition.control.reason.kind === "controller-busy", label + ": expected controller-busy block");
      assert(same(freezeArray(transition.scheduler.pendingControllerBattlers), beforePending), label + ": block changed pending");
    } else {
      assert(transition.control.kind === "advance", label + ": expected advance or block, got " + transition.control.kind);
      kind = "advance";
      pendingOut = freezeArray(transition.scheduler.pendingControllerBattlers);
      assert(transition.events.length <= 1, label + ": at most one event expected");
      event = projectEvent(transition.events[0]);
    }
  } else {
    kind = "throw";
  }

  effectivenesssoundCases.push(Object.freeze({
    label, category,
    initialRoles: beforeRoles, initialMoveResultFlags: rulesContext.moveResultFlags >>> 0,
    initialPending: beforePending,
    kind, throwMessage: threw, pendingOut, event,
  }));
}

const soundTemplate = effectivenesssoundInstructions[0];

driveEffectivenesssound("busy_gate_blocks", "controller-busy", soundTemplate, makeRulesContext({ target: 0 }), schedulerWith([0]));
driveEffectivenesssound("missing_target_role_throws", "missing-role", soundTemplate, makeRulesContext({ target: null }), schedulerWith([]));
driveEffectivenesssound("missed_no_sound", "exact-tier", soundTemplate, makeRulesContext({ target: 0, moveResultFlags: MOVE_RESULT_MISSED | MOVE_RESULT_SUPER_EFFECTIVE }), schedulerWith([]));
driveEffectivenesssound("exact_super_effective", "exact-tier", soundTemplate, makeRulesContext({ target: 0, moveResultFlags: MOVE_RESULT_SUPER_EFFECTIVE }), schedulerWith([]));
driveEffectivenesssound("exact_not_very_effective", "exact-tier", soundTemplate, makeRulesContext({ target: 0, moveResultFlags: MOVE_RESULT_NOT_VERY_EFFECTIVE }), schedulerWith([]));
driveEffectivenesssound("exact_doesnt_affect_foe", "exact-tier", soundTemplate, makeRulesContext({ target: 0, moveResultFlags: MOVE_RESULT_DOESNT_AFFECT_FOE }), schedulerWith([]));
driveEffectivenesssound("exact_failed", "exact-tier", soundTemplate, makeRulesContext({ target: 0, moveResultFlags: MOVE_RESULT_FAILED }), schedulerWith([]));
driveEffectivenesssound("default_bitwise_super", "default-tier", soundTemplate, makeRulesContext({ target: 0, moveResultFlags: MOVE_RESULT_SUPER_EFFECTIVE | (1 << 6) }), schedulerWith([]));
driveEffectivenesssound("default_bitwise_not_very", "default-tier", soundTemplate, makeRulesContext({ target: 0, moveResultFlags: MOVE_RESULT_NOT_VERY_EFFECTIVE | (1 << 6) }), schedulerWith([]));
driveEffectivenesssound("default_bitwise_effective", "default-tier", soundTemplate, makeRulesContext({ target: 0, moveResultFlags: 1 << 6 }), schedulerWith([]));
driveEffectivenesssound("default_bitwise_doesnt_affect_plus_extra_no_sound", "default-tier", soundTemplate, makeRulesContext({ target: 0, moveResultFlags: MOVE_RESULT_DOESNT_AFFECT_FOE | (1 << 6) }), schedulerWith([]));
driveEffectivenesssound("sound_marks_target_pending", "pending", soundTemplate, makeRulesContext({ target: 2, moveResultFlags: MOVE_RESULT_SUPER_EFFECTIVE }), schedulerWith([]));

const effectivenesssoundCaseCount = effectivenesssoundCases.length;
assert(effectivenesssoundCaseCount >= 12, "effectivenesssound behavior case count too low: " + effectivenesssoundCaseCount);

// ---------------------------------------------------------------------
// Registration (both opcodes)
// ---------------------------------------------------------------------

const stubPorts = Object.freeze({
  isControllerIdle: () => { throw new Error("hit-feedback registration unexpectedly consulted isControllerIdle"); },
  prepareMessage: () => { throw new Error("hit-feedback registration unexpectedly consulted prepareMessage"); },
  resolveBattlerForBattleScript: () => { throw new Error("hit-feedback registration unexpectedly consulted resolveBattlerForBattleScript"); },
});

const registrationCases = [];
function addRegistration(label, opcodeName, run) {
  let opcodeId = null;
  let error = null;
  try {
    opcodeId = run();
  } catch (caught) {
    assert(caught instanceof Error, "registration threw non-Error for " + label);
    error = caught.message;
  }
  registrationCases.push(Object.freeze({ label, opcodeName, opcodeId, error }));
}
for (const opcodeName of [HITANIMATION_OPCODE_NAME, EFFECTIVENESSSOUND_OPCODE_NAME]) {
  addRegistration(`${opcodeName}_found`, opcodeName, () => {
    const found = program.instructions.find((i) => i.opcodeName === opcodeName);
    assert(found, "expected at least one " + opcodeName + " site");
    const registered = hitChainModule.createBattleScriptHitChainOpcodeHandlers(program, stubPorts);
    const opcodeId = opcodeName === HITANIMATION_OPCODE_NAME ? HITANIMATION_OPCODE_ID : EFFECTIVENESSSOUND_OPCODE_ID;
    assert(opcodeId in registered, opcodeName + " did not register");
    return found.opcodeId;
  });
  addRegistration(`${opcodeName}_absent_errors_verbatim`, opcodeName, () => {
    const filtered = Object.freeze({
      ...program,
      instructions: freezeArray(program.instructions.filter((i) => i.opcodeName !== opcodeName)),
    });
    hitChainModule.createBattleScriptHitChainOpcodeHandlers(filtered, stubPorts);
    return "unexpectedly-registered";
  });
}

// ---------------------------------------------------------------------
// Source/decomp evidence + census
// ---------------------------------------------------------------------

const scriptSource = fs.readFileSync(path.join(workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s"), "utf8");
const hitanimationSiteCount = (scriptSource.match(/^\thitanimation\s/gm) ?? []).length;
assert(hitanimationSiteCount === 14, "hitanimation script census drifted to " + hitanimationSiteCount);
const effectivenesssoundSiteCount = (scriptSource.match(/^\teffectivenesssound\s*$/gm) ?? []).length;
assert(effectivenesssoundSiteCount === 18, "effectivenesssound script census drifted to " + effectivenesssoundSiteCount);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(value[key], (counts.get(value[key]) ?? 0) + 1);
  return freezeArray([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
const hitanimationCategoryCensus = census(hitanimationCases, "category");
const effectivenesssoundCategoryCensus = census(effectivenesssoundCases, "category");
const domainCensus = freezeArray([
  ["hitanimation-committed-sites", hitanimationInstructions.length],
  ["hitanimation-bs-target-sites", hitanimationTargetSites.length],
  ["hitanimation-bs-attacker-sites", hitanimationAttackerSites.length],
  ["hitanimation-behavior-cases", hitanimationCaseCount],
  ["effectivenesssound-committed-sites", effectivenesssoundInstructions.length],
  ["effectivenesssound-behavior-cases", effectivenesssoundCaseCount],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({ domainCensus, hitanimationCategoryCensus, effectivenesssoundCategoryCensus, hitanimationCases, effectivenesssoundCases, registrationCases });
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

// ---------------------------------------------------------------------
// Rust emission
// ---------------------------------------------------------------------

function rustOptBattler(value) {
  return value === null || value === undefined ? "None" : `Some(BattleScriptHitFeedbackBattler::Battler${value})`;
}
function rustPending(pending) {
  const cells = [0, 1, 2, 3].map((index) => rustOptBattler(pending[index] ?? null));
  return `[${cells.join(", ")}]`;
}
function rustOptStr(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptU32(value) { return value === null || value === undefined ? "None" : hex32(value); }
function rustBattlerState(value) {
  return `HitFeedbackVectorBattlerState { status2: ${hex32(value.status2)}, substitute_hp: ${hex8(value.substituteHP)} }`;
}
function rustBattlers(values) {
  return `[${values.map(rustBattlerState).join(", ")}]`;
}
function rustEvent(value) {
  if (value === null) return "None";
  if (value.kind === "animation") return `Some(HitFeedbackVectorEvent::Animation { battler: ${battlerVariant(value.battler)} })`;
  return `Some(HitFeedbackVectorEvent::PlaySe { battler: ${battlerVariant(value.battler)}, song_id: ${hex8(value.songId)} })`;
}

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-hit-feedback-family-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptHitChainOpcode.ts's");
lines.push("//! hitanimationOpcodeHandler / createEffectivenesssoundOpcodeHandler, the");
lines.push("//! latter driven by the canonical production externalPorts() closure");
lines.push("//! (factoryBattleScriptFullTurnDecision.ts, exposed via a scratch copy) via");
lines.push("//! node --experimental-strip-types.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-hit-feedback-family-vectors.mjs.");
lines.push("");
lines.push("use crate::battle_script_hit_feedback_family::BattleScriptHitFeedbackBattler;");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct HitFeedbackVectorBattlerState { pub status2: u32, pub substitute_hp: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub enum HitFeedbackVectorEvent {");
lines.push("    Animation { battler: BattleScriptHitFeedbackBattler },");
lines.push("    PlaySe { battler: BattleScriptHitFeedbackBattler, song_id: u8 },");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct HitanimationVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str,");
lines.push("    pub operand_expression: Option<&'static str>,");
lines.push("    pub attacker: Option<BattleScriptHitFeedbackBattler>, pub target: Option<BattleScriptHitFeedbackBattler>, pub fainted: Option<BattleScriptHitFeedbackBattler>,");
lines.push("    pub battlers: [HitFeedbackVectorBattlerState; 4],");
lines.push("    pub hit_marker: u32, pub move_result_flags: u32,");
lines.push("    pub initial_pending: [Option<BattleScriptHitFeedbackBattler>; 4],");
lines.push("    pub kind: &'static str,");
lines.push("    pub halt_source_construct: Option<&'static str>, pub halt_source_line: Option<u32>,");
lines.push("    pub throw_message: Option<&'static str>,");
lines.push("    pub pending_out: Option<[Option<BattleScriptHitFeedbackBattler>; 4]>,");
lines.push("    pub event: Option<HitFeedbackVectorEvent>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct EffectivenesssoundVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str,");
lines.push("    pub attacker: Option<BattleScriptHitFeedbackBattler>, pub target: Option<BattleScriptHitFeedbackBattler>, pub fainted: Option<BattleScriptHitFeedbackBattler>,");
lines.push("    pub move_result_flags: u32,");
lines.push("    pub initial_pending: [Option<BattleScriptHitFeedbackBattler>; 4],");
lines.push("    pub kind: &'static str, pub throw_message: Option<&'static str>,");
lines.push("    pub pending_out: Option<[Option<BattleScriptHitFeedbackBattler>; 4]>,");
lines.push("    pub event: Option<HitFeedbackVectorEvent>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct HitFeedbackRegistrationVectorCase { pub label: &'static str, pub opcode_name: &'static str, pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_HIT_FEEDBACK_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_HIT_FEEDBACK_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_HIT_FEEDBACK_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_HITANIMATION_CATEGORY_CENSUS: [(&str, usize); ${hitanimationCategoryCensus.length}] = [${hitanimationCategoryCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_EFFECTIVENESSSOUND_CATEGORY_CENSUS: [(&str, usize); ${effectivenesssoundCategoryCensus.length}] = [${effectivenesssoundCategoryCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_HITANIMATION_CASES: [HitanimationVectorCase; ${hitanimationCases.length}] = [`);
for (const value of hitanimationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    HitanimationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)},`);
  lines.push(`        operand_expression: ${rustOptStr(value.operandExpression)},`);
  lines.push(`        attacker: ${rustOptBattler(value.initialRoles.attacker)}, target: ${rustOptBattler(value.initialRoles.target)}, fainted: ${rustOptBattler(value.initialRoles.fainted)},`);
  lines.push(`        battlers: ${rustBattlers(value.initialBattlers)},`);
  lines.push(`        hit_marker: ${hex32(value.initialHitMarker)}, move_result_flags: ${hex32(value.initialMoveResultFlags)},`);
  lines.push(`        initial_pending: ${rustPending(value.initialPending)},`);
  lines.push(`        kind: ${rustString(value.kind)},`);
  lines.push(`        halt_source_construct: ${rustOptStr(value.haltSourceConstruct)}, halt_source_line: ${value.haltSourceLine === null || value.haltSourceLine === undefined ? "None" : `Some(${value.haltSourceLine})`},`);
  lines.push(`        throw_message: ${rustOptStr(value.throwMessage)},`);
  lines.push(`        pending_out: ${value.pendingOut === null ? "None" : `Some(${rustPending(value.pendingOut)})`},`);
  lines.push(`        event: ${rustEvent(value.event)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_EFFECTIVENESSSOUND_CASES: [EffectivenesssoundVectorCase; ${effectivenesssoundCases.length}] = [`);
for (const value of effectivenesssoundCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    EffectivenesssoundVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)},`);
  lines.push(`        attacker: ${rustOptBattler(value.initialRoles.attacker)}, target: ${rustOptBattler(value.initialRoles.target)}, fainted: ${rustOptBattler(value.initialRoles.fainted)},`);
  lines.push(`        move_result_flags: ${hex32(value.initialMoveResultFlags)},`);
  lines.push(`        initial_pending: ${rustPending(value.initialPending)},`);
  lines.push(`        kind: ${rustString(value.kind)}, throw_message: ${rustOptStr(value.throwMessage)},`);
  lines.push(`        pending_out: ${value.pendingOut === null ? "None" : `Some(${rustPending(value.pendingOut)})`},`);
  lines.push(`        event: ${rustEvent(value.event)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_HIT_FEEDBACK_REGISTRATION_CASES: [HitFeedbackRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    HitFeedbackRegistrationVectorCase { label: ${rustString(value.label)}, opcode_name: ${rustString(value.opcodeName)}, expected_opcode_id: ${value.opcodeId === null ? "None" : `Some(${hex8(value.opcodeId)})`}, expected_error: ${rustOptStr(value.error)} },`);
}
lines.push("];\n");

fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
const rustupCandidates = [
  path.join(process.env.HOME ?? "", ".cargo", "bin", "rustfmt"),
  path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin", "rustfmt"),
  "rustfmt",
];
let formatted = false;
for (const rustfmt of rustupCandidates) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-hit-feedback-family-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`gen-battle-script-hit-feedback-family-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-hit-feedback-family-vectors: ${hitanimationCases.length} hitanimation cases, ${effectivenesssoundCases.length} effectivenesssound cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-hit-feedback-family-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-hit-feedback-family-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-hit-feedback-family-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
