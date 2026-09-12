#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_ATTACKSTRING (0x02) opcode.
//
// Expected rules/scheduler/event and registration outcomes come only from
// executing the canonical TypeScript `createAttackstringOpcodeHandler`
// (src/engine/battleScriptHitChainOpcode.ts) driven by the canonical
// production `externalPorts()` closure
// (src/engine/factoryBattleScriptFullTurnDecision.ts, private -- exposed via
// a scratch copy, never edited in place). This generator owns bounded input
// construction and Rust literal emission; it must not independently
// implement the busy gate, the printed short-circuit, or the message
// payload shape.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-attackstring-vectors.mjs

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
  workspaceRoot, "core-rs", "crates", "factory-core", "src", "battle_script_attackstring_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-attackstring-vectors: " + message);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + (value & 0xff).toString(16).padStart(2, "0"); }
function hex16(value) { return "0x" + (value & 0xffff).toString(16).padStart(4, "0"); }
function hex32(value) { return "0x" + (value >>> 0).toString(16).padStart(8, "0"); }
function rustString(value) { return JSON.stringify(value); }

const OPCODE_NAME = "B_SCR_OP_ATTACKSTRING";
const OPCODE_ID = 0x02;
const HITMARKER_NO_ATTACKSTRING = 1 << 9;
const HITMARKER_ATTACKSTRING_PRINTED = 1 << 10;

const [programModule, machineModule, hitChainModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptHitChainOpcode.ts")).href),
]);

/**
 * Reads the canonical module, changes only the private `externalPorts`
 * declaration in a freshly allocated scratch copy, and imports that copy.
 * Rewriting relative imports (including JSON import-attribute specifiers) to
 * absolute file URLs lets the copy live outside `src/`; the canonical file
 * is never changed.
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
    ["-d", path.join(os.tmpdir(), "battle-script-attackstring-vectors-XXXXXX")],
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

const throwingPrepareMessage = () => {
  throw new Error("attackstring unexpectedly consulted prepareMessage");
};
const nullPrepareMessage = () => null;

const program = programModule.loadBattleScriptProgram();
const attackstringInstructions = program.instructions.filter((i) => i.opcodeName === OPCODE_NAME);
assert(attackstringInstructions.length === 135, "attackstring census drifted to " + attackstringInstructions.length);
const canonicalInstruction = attackstringInstructions[0];
const entryLabel = canonicalInstruction.source.label;
assert(typeof entryLabel === "string" && entryLabel.length > 0, "expected a source label for the first attackstring site");

// ---------------------------------------------------------------------
// Rules construction (canonicalBattler/party shape copied from
// gen-battle-script-ppreduce-vectors.mjs -- createBattleScriptRulesContext's
// required battler/party projection, unrelated fields left at defaults).
// ---------------------------------------------------------------------

const [rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

function canonicalBattler(index) {
  return Object.freeze({
    side: index % 2, ability: 0, hp: 100, maxHP: 100,
    moves: freezeArray([33, 45, 98, 57]), pp: freezeArray([35, 10, 15, 20]),
    status1: 0, status2: 0, status3: 0, item: 0,
    statStages: freezeArray([6, 6, 6, 6, 6, 6, 6, 6]),
    types: freezeArray(["TYPE_NORMAL", "TYPE_NORMAL"]), species: 1,
    attack: 50, defense: 51, speed: 52, spAttack: 53, spDefense: 54,
    level: 50, friendship: 70, partyIndex: Math.floor(index / 2),
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0,
  });
}

function emptyPartyMember() { return Object.freeze({ pp: freezeArray([0, 0, 0, 0]) }); }

function makeRulesContext(overrides) {
  const {
    attacker = 0, currentMove = 33, currentMovePosition = 0, hitMarker = 0, scriptingBattler = 0,
  } = overrides;
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray([0, 1, 2, 3].map(canonicalBattler)),
    battleTopology: Object.freeze({
      battlersCount: 2, battlerPositions: freezeArray([0, 1, 2, 3]), battleTypeFlags: 0,
    }),
    selectorRoles: Object.freeze({ attacker, target: attacker === 1 ? 0 : 1 }),
    scriptingBattler, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove, currentMovePosition, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte: 0, missType: 0, hitMarker, multiHitCounter: 0,
    party: Object.freeze({
      player: freezeArray([0, 1, 2, 3, 4, 5].map(emptyPartyMember)),
      opponent: freezeArray([0, 1, 2, 3, 4, 5].map(emptyPartyMember)),
    }),
  });
}

function projectRules(rules) {
  return Object.freeze({
    hitMarker: rules.hitMarker >>> 0,
    attacker: rules.selectorRoles.attacker,
    currentMove: rules.currentMove,
    currentMovePosition: rules.currentMovePosition,
    scriptingBattler: rules.scriptingBattler,
  });
}

function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function projectEvent(event) {
  if (event === undefined) return null;
  assert(event.kind === "message", "unexpected event kind " + event.kind);
  assert(event.messageId === "STRINGID_USEDMOVE", "unexpected messageId " + event.messageId);
  assert(
    Array.isArray(event.substitutions) && event.substitutions.length === 0,
    "STRINGID_USEDMOVE substitutions must be empty, got " + JSON.stringify(event.substitutions),
  );
  const allowedKeys = new Set(["kind", "messageId", "substitutions", "actionSnapshot", "scriptingBattler"]);
  for (const key of Object.keys(event)) {
    assert(
      allowedKeys.has(key),
      "STRINGID_USEDMOVE payload has unexpected field " + key
        + " -- canonical prepareMessage must produce exactly {kind,messageId,substitutions,actionSnapshot?,scriptingBattler}",
    );
  }
  assert(typeof event.scriptingBattler === "number", "STRINGID_USEDMOVE payload missing scriptingBattler");
  return Object.freeze({
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

// ---------------------------------------------------------------------
// Case driving
// ---------------------------------------------------------------------

const cases = [];

function driveOnce(label, category, rulesContext, schedulerState, prepareMessagePort) {
  assert(!cases.some((c) => c.label === label), "duplicate label " + label);
  const handler = hitChainModule.createAttackstringOpcodeHandler(prepareMessagePort, realPorts.isControllerIdle);
  const machine = machineModule.createBattleScriptMachine(
    program, entryLabel, rulesContext, 0x1234_5678, schedulerState,
  );
  const state = Object.freeze({ ...machine, programCounter: canonicalInstruction.programCounter });
  const context = Object.freeze({ program, instruction: canonicalInstruction, state });
  const beforeRules = projectRules(rulesContext);
  const beforePending = freezeArray(schedulerState.pendingControllerBattlers);
  const beforeDisplayActive = schedulerState.messageDisplayActive;

  const transition = handler(context);
  assert(same(projectRules(rulesContext), beforeRules), label + ": handler mutated input rules");
  assert(
    same(freezeArray(schedulerState.pendingControllerBattlers), beforePending)
      && schedulerState.messageDisplayActive === beforeDisplayActive,
    label + ": handler mutated input scheduler",
  );

  let kind;
  let blockReasonKind = null;
  let rulesOut = null;
  let displayActiveOut = null;
  let event = null;
  if (transition.control.kind === "block") {
    kind = "block";
    blockReasonKind = transition.control.reason.kind;
    assert(
      same(projectRules(transition.rulesContext), beforeRules),
      label + ": block changed rules",
    );
    assert(
      transition.scheduler.messageDisplayActive === beforeDisplayActive,
      label + ": block changed messageDisplayActive",
    );
  } else {
    assert(transition.control.kind === "advance", label + ": attackstring must advance or block, got " + transition.control.kind);
    kind = "advance";
    rulesOut = projectRules(transition.rulesContext);
    displayActiveOut = transition.scheduler.messageDisplayActive;
    assert(transition.events.length <= 1, label + ": at most one event expected");
    event = projectEvent(transition.events[0]);
  }

  const result = Object.freeze({
    label, category, initialRules: beforeRules, initialPending: beforePending,
    initialDisplayActive: beforeDisplayActive, kind, blockReasonKind, rules: rulesOut,
    displayActiveOut, event,
  });
  cases.push(result);
  return { transition, rulesContext, schedulerState };
}

function schedulerWith(pending, displayActive) {
  return machineModule.createBattleScriptSchedulerState({
    pendingControllerBattlers: freezeArray(pending),
    messageDisplayActive: displayActive,
  });
}

// --- Controller-busy gate (preempts everything; no rules/scheduler/event change) ---
driveOnce("busy_pending_attacker", "controller-busy", makeRulesContext({}), schedulerWith([0], true), throwingPrepareMessage);
driveOnce("busy_pending_other_battler", "controller-busy", makeRulesContext({}), schedulerWith([2], true), throwingPrepareMessage);
driveOnce("busy_pending_two_battlers", "controller-busy", makeRulesContext({}), schedulerWith([0, 3], true), throwingPrepareMessage);

// --- Printed short-circuit: three masks x two messageDisplayActive starting values ---
for (const [maskLabel, mask] of [
  ["no_attackstring", HITMARKER_NO_ATTACKSTRING],
  ["printed", HITMARKER_ATTACKSTRING_PRINTED],
  ["both_bits", HITMARKER_NO_ATTACKSTRING | HITMARKER_ATTACKSTRING_PRINTED],
]) {
  for (const displayActive of [true, false]) {
    driveOnce(
      `printed_${maskLabel}_display_${displayActive}`,
      "printed-short-circuit",
      makeRulesContext({ hitMarker: mask }),
      schedulerWith([], displayActive),
      throwingPrepareMessage, // never consulted: short-circuit precedes the print path
    );
  }
}
// Unrelated hitMarker bits must survive the short-circuit untouched.
driveOnce(
  "printed_preserves_unrelated_hitmarker_bits",
  "printed-short-circuit",
  makeRulesContext({ hitMarker: (HITMARKER_ATTACKSTRING_PRINTED | 0xf000_0000) >>> 0 }),
  schedulerWith([], true),
  throwingPrepareMessage,
);

// --- Print path: distinct triples, attacker-null omission, hitmarker preservation, display-active variants ---
const printTriples = [
  { currentMove: 33, currentMovePosition: 0, scriptingBattler: 0 },
  { currentMove: 89, currentMovePosition: 2, scriptingBattler: 1 },
  { currentMove: 57, currentMovePosition: 3, scriptingBattler: 3 },
  { currentMove: 191, currentMovePosition: 1, scriptingBattler: 2 },
];
for (const [index, triple] of printTriples.entries()) {
  driveOnce(
    `print_path_triple_${index}`,
    "print-path",
    makeRulesContext(triple),
    schedulerWith([], true),
    realPorts.prepareMessage,
  );
}
driveOnce(
  "print_path_attacker_role_null_omits_action_snapshot",
  "print-path",
  makeRulesContext({ attacker: null }),
  schedulerWith([], true),
  realPorts.prepareMessage,
);
driveOnce(
  "print_path_preserves_unrelated_hitmarker_bits",
  "print-path",
  makeRulesContext({ hitMarker: 0x00F0_0000 }),
  schedulerWith([], true),
  realPorts.prepareMessage,
);
driveOnce(
  "print_path_display_active_initially_false_stays_false",
  "print-path",
  makeRulesContext({}),
  schedulerWith([], false),
  realPorts.prepareMessage,
);

// --- print-then-reenter: second application at the resulting rules short-circuits via PRINTED ---
{
  const first = driveOnce(
    "reenter_first_application_prints",
    "print-then-reenter",
    makeRulesContext({ currentMove: 45, currentMovePosition: 1, scriptingBattler: 0 }),
    schedulerWith([], true),
    realPorts.prepareMessage,
  );
  driveOnce(
    "reenter_second_application_short_circuits",
    "print-then-reenter",
    first.transition.rulesContext,
    machineModule.createBattleScriptSchedulerState({
      pendingControllerBattlers: freezeArray(first.transition.scheduler.pendingControllerBattlers),
      messageDisplayActive: true,
    }),
    throwingPrepareMessage, // must not be consulted the second time
  );
}

// --- Null-port block (canonically unreachable; driven via an injected stub) ---
driveOnce(
  "null_port_blocks_with_attacker_role_set",
  "null-port",
  makeRulesContext({}),
  schedulerWith([], true),
  nullPrepareMessage,
);
driveOnce(
  "null_port_blocks_with_attacker_role_null",
  "null-port",
  makeRulesContext({ attacker: null }),
  schedulerWith([], true),
  nullPrepareMessage,
);

const behaviorCaseCount = cases.length;
assert(behaviorCaseCount >= 20 && behaviorCaseCount <= 28, "behavior case count " + behaviorCaseCount + " outside 20-28 band");

// ---------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------

const stubPorts = Object.freeze({
  isControllerIdle: () => { throw new Error("attackstring registration unexpectedly consulted isControllerIdle"); },
  prepareMessage: () => { throw new Error("attackstring registration unexpectedly consulted prepareMessage"); },
  resolveBattlerForBattleScript: () => { throw new Error("attackstring registration unexpectedly consulted resolveBattlerForBattleScript"); },
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
  assert(found, "expected at least one attackstring site");
  const registered = hitChainModule.createBattleScriptHitChainOpcodeHandlers(program, stubPorts);
  assert(OPCODE_ID in registered, "attackstring did not register");
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
const attackstringSiteCount = (scriptSource.match(/^\tattackstring\s*$/gm) ?? []).length;
assert(attackstringSiteCount === 135, "attackstring script census drifted to " + attackstringSiteCount);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(value[key], (counts.get(value[key]) ?? 0) + 1);
  return freezeArray([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
const categoryCensus = census(cases, "category");
const domainCensus = freezeArray([
  ["committed-sites", attackstringInstructions.length],
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
  return value === null || value === undefined ? "None" : `Some(BattleScriptAttackstringBattler::Battler${value})`;
}
function rustPending(pending) {
  const cells = [0, 1, 2, 3].map((index) => rustOptBattler(pending[index] ?? null));
  return `[${cells.join(", ")}]`;
}
function rustBool(value) { return value ? "true" : "false"; }
function rustRules(value) {
  return `AttackstringVectorRules { hit_marker: ${hex32(value.hitMarker)}, attacker: ${rustOptBattler(value.attacker)}, current_move: ${hex16(value.currentMove)}, current_move_position: ${hex8(value.currentMovePosition)}, scripting_battler: ${hex8(value.scriptingBattler)} }`;
}
function rustSnapshot(value) {
  if (value === null) return "None";
  return `Some(AttackstringVectorActionSnapshot { attacker: ${hex8(value.attacker)}, current_move: ${hex16(value.currentMove)}, current_move_position: ${hex8(value.currentMovePosition)} })`;
}
function rustEvent(value) {
  if (value === null) return "None";
  return `Some(AttackstringVectorEvent { scripting_battler: ${hex8(value.scriptingBattler)}, action_snapshot: ${rustSnapshot(value.actionSnapshot)} })`;
}
function rustOptStr(value) { return value === null ? "None" : `Some(${rustString(value)})`; }

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-attackstring-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptHitChainOpcode.ts's");
lines.push("//! createAttackstringOpcodeHandler, driven by the canonical production");
lines.push("//! externalPorts() closure (factoryBattleScriptFullTurnDecision.ts, exposed via");
lines.push("//! a scratch copy) via node --experimental-strip-types.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-attackstring-vectors.mjs.");
lines.push("");
lines.push("use crate::battle_script_attackstring::BattleScriptAttackstringBattler;");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AttackstringVectorRules {");
lines.push("    pub hit_marker: u32, pub attacker: Option<BattleScriptAttackstringBattler>,");
lines.push("    pub current_move: u16, pub current_move_position: u8, pub scripting_battler: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AttackstringVectorActionSnapshot {");
lines.push("    pub attacker: u8, pub current_move: u16, pub current_move_position: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AttackstringVectorEvent {");
lines.push("    pub scripting_battler: u8, pub action_snapshot: Option<AttackstringVectorActionSnapshot>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AttackstringVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str,");
lines.push("    pub initial_rules: AttackstringVectorRules,");
lines.push("    pub initial_pending: [Option<BattleScriptAttackstringBattler>; 4],");
lines.push("    pub initial_display_active: bool,");
lines.push("    pub is_block: bool, pub block_reason_kind: Option<&'static str>,");
lines.push("    pub expected_rules: Option<AttackstringVectorRules>,");
lines.push("    pub expected_display_active: Option<bool>,");
lines.push("    pub event: Option<AttackstringVectorEvent>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AttackstringRegistrationVectorCase { pub label: &'static str, pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_ATTACKSTRING_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_ATTACKSTRING_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_ATTACKSTRING_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ATTACKSTRING_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_ATTACKSTRING_CASES: [AttackstringVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    AttackstringVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)},`);
  lines.push(`        initial_rules: ${rustRules(value.initialRules)},`);
  lines.push(`        initial_pending: ${rustPending(value.initialPending)},`);
  lines.push(`        initial_display_active: ${rustBool(value.initialDisplayActive)},`);
  lines.push(`        is_block: ${rustBool(value.kind === "block")},`);
  lines.push(`        block_reason_kind: ${rustOptStr(value.blockReasonKind)},`);
  lines.push(`        expected_rules: ${value.rules === null ? "None" : `Some(${rustRules(value.rules)})`},`);
  lines.push(`        expected_display_active: ${value.displayActiveOut === null ? "None" : `Some(${rustBool(value.displayActiveOut)})`},`);
  lines.push(`        event: ${rustEvent(value.event)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_ATTACKSTRING_REGISTRATION_CASES: [AttackstringRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    AttackstringRegistrationVectorCase { label: ${rustString(value.label)}, expected_opcode_id: ${value.opcodeId === null ? "None" : `Some(${hex8(value.opcodeId)})`}, expected_error: ${rustOptStr(value.error)} },`);
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
if (!formatted) throw new Error("gen-battle-script-attackstring-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`gen-battle-script-attackstring-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-attackstring-vectors: ${cases.length} behavior cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-attackstring-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-attackstring-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-attackstring-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
