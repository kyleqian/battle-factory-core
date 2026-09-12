#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_HEALTHBARUPDATE (0x0B) opcode.
//
// Expected outcomes come only from executing the canonical TypeScript
// `createHealthbarupdateOpcodeHandler` (src/engine/battleScriptHitChainOpcode.ts,
// module-private -- driven through the registered handler map exactly like
// gen-battle-script-hit-feedback-family-vectors.mjs drives effectivenesssound)
// with the canonical production `externalPorts()` closure
// (src/engine/factoryBattleScriptFullTurnDecision.ts, private -- exposed via
// a scratch copy, never edited in place) for isControllerIdle/prepareMessage.
// This generator owns bounded input construction and Rust literal emission;
// it must not independently implement the busy gate, the NO_EFFECT
// short-circuit, the selector ladder, the substitute conjunction, the clamp,
// or the message payload shape.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-healthbarupdate-vectors.mjs

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
  workspaceRoot, "core-rs", "crates", "factory-core", "src", "battle_script_healthbarupdate_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-healthbarupdate-vectors: " + message);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + (value & 0xff).toString(16).padStart(2, "0"); }
function hex16(value) { return "0x" + (value & 0xffff).toString(16).padStart(4, "0"); }
function hex32(value) { return "0x" + (value >>> 0).toString(16).padStart(8, "0"); }
function battlerVariant(value) { return `BattleScriptHealthbarupdateBattler::Battler${value}`; }
function rustString(value) { return JSON.stringify(value); }

const OPCODE_NAME = "B_SCR_OP_HEALTHBARUPDATE";
const OPCODE_ID = 0x0b;

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
    ["-d", path.join(os.tmpdir(), "battle-script-healthbarupdate-vectors-XXXXXX")],
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
assert(typeof realPorts.prepareMessage === "function", "externalPorts did not return prepareMessage");

const throwingResolveBattler = () => {
  throw new Error("healthbarupdate unexpectedly consulted resolveBattlerForBattleScript");
};

const program = programModule.loadBattleScriptProgram();
const healthbarupdateInstructions = program.instructions.filter((i) => i.opcodeName === OPCODE_NAME);
assert(healthbarupdateInstructions.length === 41, "healthbarupdate census drifted to " + healthbarupdateInstructions.length);
const targetSites = healthbarupdateInstructions.filter((i) => i.operands[0]?.expression === "BS_TARGET");
const attackerSites = healthbarupdateInstructions.filter((i) => i.operands[0]?.expression === "BS_ATTACKER");
const faintedSites = healthbarupdateInstructions.filter((i) => i.operands[0]?.expression === "BS_FAINTED");
assert(attackerSites.length === 22, "healthbarupdate BS_ATTACKER census drifted to " + attackerSites.length);
assert(targetSites.length === 18, "healthbarupdate BS_TARGET census drifted to " + targetSites.length);
assert(faintedSites.length === 1, "healthbarupdate BS_FAINTED census drifted to " + faintedSites.length);
assert(healthbarupdateInstructions[0].opcodeId === OPCODE_ID, "healthbarupdate opcodeId drifted to " + healthbarupdateInstructions[0].opcodeId);

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
// gen-battle-script-hit-feedback-family-vectors.mjs).
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
    hitMarker = 0, moveResultFlags = 0, battleMoveDamage = 0,
    scriptingBattler = 0, currentMove = 33, currentMovePosition = 0,
    battlerOverrides = {},
  } = overrides;
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray([0, 1, 2, 3].map((index) => canonicalBattler(index, battlerOverrides[index] ?? {}))),
    battleTopology: Object.freeze({
      battlersCount: 2, battlerPositions: freezeArray([0, 1, 2, 3]), battleTypeFlags: 0,
    }),
    selectorRoles: Object.freeze({ attacker, target, fainted }),
    scriptingBattler, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove, currentMovePosition, moveResultFlags, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte: 0, missType: 0, hitMarker, multiHitCounter: 0, battleMoveDamage,
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
  if (event.kind === "health-bar-update") {
    return Object.freeze({ kind: "health-bar-update", battler: event.battler, healthValue: event.healthValue });
  }
  if (event.kind === "message") {
    assert(event.messageId === "STRINGID_SUBSTITUTEDAMAGED", "unexpected messageId " + event.messageId);
    assert(
      Array.isArray(event.substitutions) && event.substitutions.length === 0,
      "STRINGID_SUBSTITUTEDAMAGED substitutions must be empty, got " + JSON.stringify(event.substitutions),
    );
    const allowedKeys = new Set(["kind", "messageId", "substitutions", "actionSnapshot", "scriptingBattler"]);
    for (const key of Object.keys(event)) {
      assert(
        allowedKeys.has(key),
        "STRINGID_SUBSTITUTEDAMAGED payload has unexpected field " + key
          + " -- canonical prepareMessage must produce exactly {kind,messageId,substitutions,actionSnapshot?,scriptingBattler}",
      );
    }
    assert(typeof event.scriptingBattler === "number", "STRINGID_SUBSTITUTEDAMAGED payload missing scriptingBattler");
    return Object.freeze({
      kind: "message",
      scriptingBattler: event.scriptingBattler,
      actionSnapshot: event.actionSnapshot
        ? Object.freeze({
          attacker: event.actionSnapshot.attacker,
          currentMove: event.actionSnapshot.currentMove,
          currentMovePosition: event.actionSnapshot.currentMovePosition,
        })
        : null,
    });
  }
  throw new Error("unexpected event kind " + event.kind);
}

// ---------------------------------------------------------------------
// Case driving
// ---------------------------------------------------------------------

const cases = [];

function buildHandler(prepareMessage) {
  const ports = Object.freeze({
    isControllerIdle: realPorts.isControllerIdle,
    prepareMessage,
    resolveBattlerForBattleScript: throwingResolveBattler,
  });
  const handlers = hitChainModule.createBattleScriptHitChainOpcodeHandlers(program, ports);
  const handler = handlers[OPCODE_ID];
  assert(typeof handler === "function", "healthbarupdate did not register via createBattleScriptHitChainOpcodeHandlers");
  return handler;
}

const availableHandler = buildHandler(realPorts.prepareMessage);
const nullPortHandler = buildHandler(() => null);

function driveHealthbarupdate(label, category, instruction, rulesContext, schedulerState, handler) {
  assert(!cases.some((c) => c.label === label), "duplicate label " + label);
  const machine = machineModule.createBattleScriptMachine(program, program.instructions[0].source.label, rulesContext, 0x1234_5678, schedulerState);
  const state = Object.freeze({ ...machine, programCounter: instruction.programCounter });
  const context = Object.freeze({ program, instruction, state });
  const beforeRoles = projectRoles(rulesContext);
  const beforeBattlers = projectBattlers(rulesContext);
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
  assert(same(projectBattlers(rulesContext), beforeBattlers), label + ": handler mutated battlers");

  let kind = null;
  let haltSourceConstruct = null;
  let haltSourceLine = null;
  let blockReasonKind = null;
  let pendingOut = null;
  let event = null;
  if (threw === null) {
    if (transition.control.kind === "halt") {
      kind = "halt";
      assert(transition.control.reason.kind === "unsupported-branch", label + ": expected unsupported-branch halt");
      haltSourceConstruct = transition.control.reason.sourceConstruct;
      haltSourceLine = transition.control.reason.sourceLine;
      assert(same(freezeArray(transition.scheduler.pendingControllerBattlers), beforePending), label + ": halt changed pending");
    } else if (transition.control.kind === "block") {
      kind = "block";
      blockReasonKind = transition.control.reason.kind;
      assert(same(freezeArray(transition.scheduler.pendingControllerBattlers), beforePending), label + ": block changed pending");
    } else {
      assert(transition.control.kind === "advance", label + ": expected advance/block/halt, got " + transition.control.kind);
      kind = "advance";
      pendingOut = freezeArray(transition.scheduler.pendingControllerBattlers);
      assert(transition.events.length <= 1, label + ": at most one event expected");
      event = projectEvent(transition.events[0]);
    }
  } else {
    kind = "throw";
  }

  cases.push(Object.freeze({
    label, category,
    operandExpression: instruction.operands[0]?.expression ?? null,
    initialRoles: beforeRoles, initialBattlers: beforeBattlers,
    initialHitMarker: rulesContext.hitMarker >>> 0, initialMoveResultFlags: rulesContext.moveResultFlags >>> 0,
    initialBattleMoveDamage: rulesContext.battleMoveDamage | 0,
    initialScriptingBattler: rulesContext.scriptingBattler, initialCurrentMove: rulesContext.currentMove,
    initialCurrentMovePosition: rulesContext.currentMovePosition,
    initialPending: beforePending,
    kind, haltSourceConstruct, haltSourceLine, blockReasonKind, throwMessage: threw,
    pendingOut, event,
  }));
}

function schedulerWith(pending) {
  return machineModule.createBattleScriptSchedulerState({ pendingControllerBattlers: freezeArray(pending), messageDisplayActive: true });
}

const targetTemplate = targetSites[0];
const attackerTemplate = attackerSites[0];
const faintedTemplate = faintedSites[0];

// --- Controller-busy gate (preempts everything) ---
driveHealthbarupdate("busy_gate_blocks", "controller-busy", targetTemplate, makeRulesContext({}), schedulerWith([2]), availableHandler);

// --- NO_EFFECT short-circuit, incl. the NO_EFFECT + unsupported-selector ordering pin ---
driveHealthbarupdate(
  "no_effect_advances_without_event", "no-effect",
  targetTemplate, makeRulesContext({ moveResultFlags: MOVE_RESULT_NO_EFFECT }), schedulerWith([]), availableHandler,
);
driveHealthbarupdate(
  "no_effect_beats_unsupported_selector", "no-effect",
  customInstruction(targetTemplate, { 0: "BS_SCRIPTING" }),
  makeRulesContext({ moveResultFlags: MOVE_RESULT_NO_EFFECT }), schedulerWith([]), availableHandler,
);

// --- Health-bar path: committed BS_TARGET/BS_ATTACKER sites, distinct damage values ---
driveHealthbarupdate(
  "target_committed_site_health_bar", "health-bar",
  targetTemplate, makeRulesContext({ battleMoveDamage: 42 }), schedulerWith([]), availableHandler,
);
driveHealthbarupdate(
  "attacker_committed_site_health_bar", "health-bar",
  attackerTemplate, makeRulesContext({ battleMoveDamage: 77 }), schedulerWith([]), availableHandler,
);

// --- Clamp trio + negative pass-through ---
for (const damage of [9_999, 10_000, 10_001]) {
  driveHealthbarupdate(
    `health_bar_clamp_${damage}`, "clamp",
    targetTemplate, makeRulesContext({ battleMoveDamage: damage }), schedulerWith([]), availableHandler,
  );
}
driveHealthbarupdate(
  "health_bar_negative_pass_through", "clamp",
  targetTemplate, makeRulesContext({ battleMoveDamage: -321 }), schedulerWith([]), availableHandler,
);

// --- BS_FAINTED committed site emit + missing-fainted-role throw ---
driveHealthbarupdate(
  "fainted_committed_site_health_bar", "committed-fainted",
  faintedTemplate, makeRulesContext({ fainted: 2, battleMoveDamage: 55 }), schedulerWith([]), availableHandler,
);
driveHealthbarupdate(
  "fainted_committed_site_missing_role_throws", "committed-fainted",
  faintedTemplate, makeRulesContext({ fainted: null }), schedulerWith([]), availableHandler,
);

// --- Missing target/attacker role throws ---
driveHealthbarupdate(
  "missing_target_role_throws", "missing-role",
  targetTemplate, makeRulesContext({ target: null }), schedulerWith([]), availableHandler,
);
driveHealthbarupdate(
  "missing_attacker_role_throws", "missing-role",
  attackerTemplate, makeRulesContext({ attacker: null }), schedulerWith([]), availableHandler,
);

// --- Unsupported-branch halts (verbatim strings) ---
driveHealthbarupdate(
  "unknown_selector_halts", "unsupported-branch",
  customInstruction(targetTemplate, { 0: "BS_SCRIPTING" }), makeRulesContext({}), schedulerWith([]), availableHandler,
);
driveHealthbarupdate(
  "missing_operand_halts", "unsupported-branch",
  emptyOperandInstruction(targetTemplate), makeRulesContext({}), schedulerWith([]), availableHandler,
);

// --- Substitute message path: all three conjuncts, attacker snapshot present/omitted ---
driveHealthbarupdate(
  "substitute_message_attacker_role_set", "substitute-message",
  targetTemplate,
  makeRulesContext({ hitMarker: 0, battlerOverrides: { 1: { status2: STATUS2_SUBSTITUTE, substituteHP: 5 } } }),
  schedulerWith([]), availableHandler,
);
driveHealthbarupdate(
  "substitute_message_attacker_role_null", "substitute-message",
  targetTemplate,
  makeRulesContext({ hitMarker: 0, attacker: null, battlerOverrides: { 1: { status2: STATUS2_SUBSTITUTE, substituteHP: 5 } } }),
  schedulerWith([]), availableHandler,
);

// --- Each single-conjunct-false variant falls through to the health-bar path ---
driveHealthbarupdate(
  "substitute_variant_ignore_substitute_set_falls_through", "substitute-fallthrough",
  targetTemplate,
  makeRulesContext({ hitMarker: HITMARKER_IGNORE_SUBSTITUTE, battleMoveDamage: 10, battlerOverrides: { 1: { status2: STATUS2_SUBSTITUTE, substituteHP: 5 } } }),
  schedulerWith([]), availableHandler,
);
driveHealthbarupdate(
  "substitute_variant_no_substitute_bit_falls_through", "substitute-fallthrough",
  targetTemplate,
  makeRulesContext({ hitMarker: 0, battleMoveDamage: 10, battlerOverrides: { 1: { status2: 0, substituteHP: 5 } } }),
  schedulerWith([]), availableHandler,
);
driveHealthbarupdate(
  "substitute_variant_substitute_hp_zero_falls_through", "substitute-fallthrough",
  targetTemplate,
  makeRulesContext({ hitMarker: 0, battleMoveDamage: 10, battlerOverrides: { 1: { status2: STATUS2_SUBSTITUTE, substituteHP: 0 } } }),
  schedulerWith([]), availableHandler,
);

// --- Null-port block (canonically unreachable; driven via an injected stub) ---
driveHealthbarupdate(
  "substitute_message_null_port_blocks", "null-port",
  targetTemplate,
  makeRulesContext({ hitMarker: 0, battlerOverrides: { 1: { status2: STATUS2_SUBSTITUTE, substituteHP: 5 } } }),
  schedulerWith([]), nullPortHandler,
);

const behaviorCaseCount = cases.length;
assert(behaviorCaseCount >= 20 && behaviorCaseCount <= 26, "behavior case count " + behaviorCaseCount + " outside 20-26 band");

// ---------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------

const stubPorts = Object.freeze({
  isControllerIdle: () => { throw new Error("healthbarupdate registration unexpectedly consulted isControllerIdle"); },
  prepareMessage: () => { throw new Error("healthbarupdate registration unexpectedly consulted prepareMessage"); },
  resolveBattlerForBattleScript: throwingResolveBattler,
});

const registrationCases = [];
function addRegistration(label, run) {
  let opcodeId = null;
  let error = null;
  try {
    opcodeId = run();
  } catch (caught) {
    assert(caught instanceof Error, "registration threw non-Error for " + label);
    error = caught.message;
  }
  registrationCases.push(Object.freeze({ label, opcodeId, error }));
}
addRegistration("found", () => {
  const found = program.instructions.find((i) => i.opcodeName === OPCODE_NAME);
  assert(found, "expected at least one healthbarupdate site");
  const registered = hitChainModule.createBattleScriptHitChainOpcodeHandlers(program, stubPorts);
  assert(OPCODE_ID in registered, "healthbarupdate did not register");
  return found.opcodeId;
});
addRegistration("absent_errors_verbatim", () => {
  const filtered = Object.freeze({
    ...program,
    instructions: freezeArray(program.instructions.filter((i) => i.opcodeName !== OPCODE_NAME)),
  });
  hitChainModule.createBattleScriptHitChainOpcodeHandlers(filtered, stubPorts);
  return "unexpectedly-registered";
});

// ---------------------------------------------------------------------
// Source/decomp evidence + census
// ---------------------------------------------------------------------

const scriptSource = fs.readFileSync(path.join(workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s"), "utf8");
const siteCount = (scriptSource.match(/^\thealthbarupdate\s/gm) ?? []).length;
assert(siteCount === 41, "healthbarupdate script census drifted to " + siteCount);
const scriptAttackerCount = (scriptSource.match(/^\thealthbarupdate BS_ATTACKER$/gm) ?? []).length;
const scriptTargetCount = (scriptSource.match(/^\thealthbarupdate BS_TARGET$/gm) ?? []).length;
const scriptFaintedCount = (scriptSource.match(/^\thealthbarupdate BS_FAINTED$/gm) ?? []).length;
assert(scriptAttackerCount === 22, "script BS_ATTACKER census drifted to " + scriptAttackerCount);
assert(scriptTargetCount === 18, "script BS_TARGET census drifted to " + scriptTargetCount);
assert(scriptFaintedCount === 1, "script BS_FAINTED census drifted to " + scriptFaintedCount);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(value[key], (counts.get(value[key]) ?? 0) + 1);
  return freezeArray([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
const categoryCensus = census(cases, "category");
const domainCensus = freezeArray([
  ["committed-sites", healthbarupdateInstructions.length],
  ["bs-attacker-sites", attackerSites.length],
  ["bs-target-sites", targetSites.length],
  ["bs-fainted-sites", faintedSites.length],
  ["behavior-cases", behaviorCaseCount],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({ domainCensus, categoryCensus, cases, registrationCases });
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

// ---------------------------------------------------------------------
// Rust emission
// ---------------------------------------------------------------------

function rustOptBattler(value) {
  return value === null || value === undefined ? "None" : `Some(${battlerVariant(value)})`;
}
function rustPending(pending) {
  const cells = [0, 1, 2, 3].map((index) => rustOptBattler(pending[index] ?? null));
  return `[${cells.join(", ")}]`;
}
function rustOptStr(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustBattlerState(value) {
  return `HealthbarupdateVectorBattlerState { status2: ${hex32(value.status2)}, substitute_hp: ${hex8(value.substituteHP)} }`;
}
function rustBattlers(values) {
  return `[${values.map(rustBattlerState).join(", ")}]`;
}
function rustSnapshot(value) {
  if (value === null) return "None";
  return `Some(HealthbarupdateVectorActionSnapshot { attacker: ${hex8(value.attacker)}, current_move: ${hex16(value.currentMove)}, current_move_position: ${hex8(value.currentMovePosition)} })`;
}
function rustEvent(value) {
  if (value === null) return "None";
  if (value.kind === "health-bar-update") {
    return `Some(HealthbarupdateVectorEvent::HealthBarUpdate { battler: ${battlerVariant(value.battler)}, health_value: ${value.healthValue | 0} })`;
  }
  return `Some(HealthbarupdateVectorEvent::Message { scripting_battler: ${hex8(value.scriptingBattler)}, action_snapshot: ${rustSnapshot(value.actionSnapshot)} })`;
}

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-healthbarupdate-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptHitChainOpcode.ts's");
lines.push("//! createHealthbarupdateOpcodeHandler (module-private, driven through the");
lines.push("//! registered handler map), with the canonical production externalPorts()");
lines.push("//! closure (factoryBattleScriptFullTurnDecision.ts, exposed via a scratch");
lines.push("//! copy) via node --experimental-strip-types.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-healthbarupdate-vectors.mjs.");
lines.push("");
lines.push("use crate::battle_script_healthbarupdate::BattleScriptHealthbarupdateBattler;");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct HealthbarupdateVectorBattlerState { pub status2: u32, pub substitute_hp: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct HealthbarupdateVectorActionSnapshot {");
lines.push("    pub attacker: u8, pub current_move: u16, pub current_move_position: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub enum HealthbarupdateVectorEvent {");
lines.push("    HealthBarUpdate { battler: BattleScriptHealthbarupdateBattler, health_value: i32 },");
lines.push("    Message { scripting_battler: u8, action_snapshot: Option<HealthbarupdateVectorActionSnapshot> },");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct HealthbarupdateVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str,");
lines.push("    pub operand_expression: Option<&'static str>,");
lines.push("    pub attacker: Option<BattleScriptHealthbarupdateBattler>, pub target: Option<BattleScriptHealthbarupdateBattler>, pub fainted: Option<BattleScriptHealthbarupdateBattler>,");
lines.push("    pub battlers: [HealthbarupdateVectorBattlerState; 4],");
lines.push("    pub hit_marker: u32, pub move_result_flags: u32, pub battle_move_damage: i32,");
lines.push("    pub scripting_battler: u8, pub current_move: u16, pub current_move_position: u8,");
lines.push("    pub initial_pending: [Option<BattleScriptHealthbarupdateBattler>; 4],");
lines.push("    pub kind: &'static str,");
lines.push("    pub halt_source_construct: Option<&'static str>, pub halt_source_line: Option<u32>,");
lines.push("    pub block_reason_kind: Option<&'static str>,");
lines.push("    pub throw_message: Option<&'static str>,");
lines.push("    pub pending_out: Option<[Option<BattleScriptHealthbarupdateBattler>; 4]>,");
lines.push("    pub event: Option<HealthbarupdateVectorEvent>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct HealthbarupdateRegistrationVectorCase { pub label: &'static str, pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_HEALTHBARUPDATE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_HEALTHBARUPDATE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_HEALTHBARUPDATE_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_HEALTHBARUPDATE_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_HEALTHBARUPDATE_CASES: [HealthbarupdateVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    HealthbarupdateVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)},`);
  lines.push(`        operand_expression: ${rustOptStr(value.operandExpression)},`);
  lines.push(`        attacker: ${rustOptBattler(value.initialRoles.attacker)}, target: ${rustOptBattler(value.initialRoles.target)}, fainted: ${rustOptBattler(value.initialRoles.fainted)},`);
  lines.push(`        battlers: ${rustBattlers(value.initialBattlers)},`);
  lines.push(`        hit_marker: ${hex32(value.initialHitMarker)}, move_result_flags: ${hex32(value.initialMoveResultFlags)}, battle_move_damage: ${value.initialBattleMoveDamage},`);
  lines.push(`        scripting_battler: ${hex8(value.initialScriptingBattler)}, current_move: ${hex16(value.initialCurrentMove)}, current_move_position: ${hex8(value.initialCurrentMovePosition)},`);
  lines.push(`        initial_pending: ${rustPending(value.initialPending)},`);
  lines.push(`        kind: ${rustString(value.kind)},`);
  lines.push(`        halt_source_construct: ${rustOptStr(value.haltSourceConstruct)}, halt_source_line: ${value.haltSourceLine === null || value.haltSourceLine === undefined ? "None" : `Some(${value.haltSourceLine})`},`);
  lines.push(`        block_reason_kind: ${rustOptStr(value.blockReasonKind)},`);
  lines.push(`        throw_message: ${rustOptStr(value.throwMessage)},`);
  lines.push(`        pending_out: ${value.pendingOut === null ? "None" : `Some(${rustPending(value.pendingOut)})`},`);
  lines.push(`        event: ${rustEvent(value.event)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_HEALTHBARUPDATE_REGISTRATION_CASES: [HealthbarupdateRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    HealthbarupdateRegistrationVectorCase { label: ${rustString(value.label)}, expected_opcode_id: ${value.opcodeId === null ? "None" : `Some(${hex8(value.opcodeId)})`}, expected_error: ${rustOptStr(value.error)} },`);
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
if (!formatted) throw new Error("gen-battle-script-healthbarupdate-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`gen-battle-script-healthbarupdate-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-healthbarupdate-vectors: ${cases.length} behavior cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-healthbarupdate-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-healthbarupdate-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-healthbarupdate-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
