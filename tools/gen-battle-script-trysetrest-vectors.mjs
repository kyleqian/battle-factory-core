#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrysetrestOpcode.ts.
//
// Expected controls, projected output, ordered errors, and registration are
// produced only by calling the canonical TypeScript handler. This generator
// owns bounded input construction and Rust literal emission; it must not
// independently implement Cmd_trysetrest behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysetrest-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_trysetrest_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrysetrestOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETREST";
const OPCODE_ID = 0x81;
const DISPATCHER = "Cmd_trysetrest";
const ENTRY_LABEL = "BattleScript_EffectRest";
const FAIL_POINTER = "BattleScript_AlreadyAtFullHp";
const UNRESOLVED_POINTER = "BattleScript_RustTrysetrestUnresolved";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
// 0; pure sleep counters 1/2/7 (chooser must stay B_MSG_REST); poison 8,
// burn 16, freeze 32, paralysis 64, toxic 128 (each alone trips
// B_MSG_REST_STATUSED); sleep|poison combos 9 and 15 (sleep counter plus a
// real status, still statused).
const STATUS1_VALUES = Object.freeze([0, 1, 2, 7, 8, 16, 32, 64, 128, 9, 15]);
const MAX_HP_EDGE_VALUES = Object.freeze([1, 140, 141, 65535]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trysetrest-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLERS.includes(value), `${label} must be a battler id 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function partyMemberInput(status1, item) {
  return Object.freeze({ status1, item });
}

function defaultPartyInputs(salt) {
  const player = BATTLERS.map((_, index) => partyMemberInput(0, (index * 17 + salt) & 0xffff));
  while (player.length < 6) player.push(partyMemberInput(0, (player.length * 17 + salt) & 0xffff));
  const opponent = player.map((member, index) => partyMemberInput(0, (member.item + 3 + index) & 0xffff));
  return Object.freeze({ player: Object.freeze(player), opponent: Object.freeze(opponent) });
}

// Builds one full rules projection. `attacker` gets the given hp/maxHP/
// status1; every other battler gets salted noise. `party` overrides let
// individual cases stage a specific mirror cell (prior status1, identity
// no-op) without disturbing the rest of the projection.
function makeProjection({ attacker, target, hp, maxHP, status1, salt, partyOverride }) {
  assertOptionalBattler(attacker, "attacker");
  assertOptionalBattler(target, "target");
  const battlers = BATTLERS.map((index) => {
    if (index === attacker) {
      return Object.freeze({
        side: index & 1,
        hp,
        maxHP,
        status1,
        ability: (11 + index * 13 + salt) & 0xff,
        item: (index * 31 + salt) & 0xffff,
        partyIndex: index,
      });
    }
    const noiseHp = 40 + index * 5;
    return Object.freeze({
      side: index & 1,
      hp: noiseHp,
      maxHP: noiseHp + 20,
      status1: (0x1200 + index * 7 + salt) & 0xff,
      ability: (11 + index * 13 + salt) & 0xff,
      item: (index * 31 + salt) & 0xffff,
      partyIndex: index,
    });
  });
  const party = partyOverride ?? defaultPartyInputs(salt);
  return Object.freeze({
    attacker,
    target,
    battlers: Object.freeze(battlers),
    party,
    context: Object.freeze({ scriptingBattler: (salt + 1) & 3, hitMarker: (0x9000_0001 ^ salt) >>> 0 }),
  });
}

function canonicalBattler(projected) {
  return Object.freeze({
    side: projected.side,
    ability: projected.ability,
    hp: projected.hp,
    maxHP: projected.maxHP,
    moves: Object.freeze([156, 0, 0, 0]),
    pp: Object.freeze([10, 0, 0, 0]),
    status1: projected.status1,
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
    item: projected.item,
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: projected.partyIndex + 1,
    personality: 0,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: projected.partyIndex,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(projection.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.attacker,
      fainted: null,
    }),
    scriptingBattler: projection.context.scriptingBattler,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 156,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: projection.context.hitMarker,
    multiHitCounter: 0,
    party: projection.party,
  });
}

function vectorBattlerState(battler) {
  return Object.freeze({
    hp: battler.hp,
    maxHP: battler.maxHP,
    status1: battler.status1 >>> 0,
    side: battler.side,
    partyIndex: battler.partyIndex,
    ability: battler.ability,
    item: battler.item,
  });
}

function vectorPartyMember(member) {
  return Object.freeze({ status1: member.status1 >>> 0, item: member.item });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattlerState)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    partyPlayer: Object.freeze(rules.party.player.map(vectorPartyMember)),
    partyOpponent: Object.freeze(rules.party.opponent.map(vectorPartyMember)),
    battleMoveDamage: rules.battleMoveDamage,
    multistringChooser: rules.multistringChooser,
  });
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical trysetrest singleton drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "canonical opcode drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(canonicalInstruction.source.label === ENTRY_LABEL, "canonical entry drifted");
assert(canonicalInstruction.operands.length === 1, "canonical operand count drifted");
assert(canonicalInstruction.operands[0]?.widthBytes === 4, "canonical pointer width drifted");
assert(canonicalInstruction.operands[0]?.expression === FAIL_POINTER, "canonical pointer drifted");
const resolvedFail = programModule.resolveBattleScriptLabel(program, FAIL_POINTER);
assert(resolvedFail, "fail label must resolve");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTrysetrestOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical trysetrest handler did not register");

function freezeInstructionSpec({ operandExpression = FAIL_POINTER } = {}) {
  assert(typeof operandExpression === "string", "operand expression must be a string");
  return Object.freeze({ operandExpression });
}

function instructionFromSpec(spec) {
  const operand = Object.freeze({ ...canonicalInstruction.operands[0], expression: spec.operandExpression });
  return Object.freeze({ ...canonicalInstruction, operands: Object.freeze([operand]) });
}

function vectorInstruction(spec) {
  const instruction = instructionFromSpec(spec);
  const operand = instruction.operands[0];
  const resolved = programModule.resolveBattleScriptLabel(program, operand.expression);
  return Object.freeze({
    operandWidth: operand.widthBytes,
    operandExpression: operand.expression,
    resolvedJumpExpression: resolved ? operand.expression : null,
    resolvedJumpProgramCounter: resolved ? resolved.programCounter : null,
  });
}

const CANONICAL_INSTRUCTION = freezeInstructionSpec();
const UNRESOLVED_INSTRUCTION = freezeInstructionSpec({ operandExpression: UNRESOLVED_POINTER });

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({
    kind: "jump",
    programCounter: transition.control.programCounter,
  });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function eventFromTransition(transition) {
  assert(transition.events.length <= 1, "canonical handler emitted more than one event");
  if (transition.events.length === 0) return null;
  const event = transition.events[0];
  assert(event.kind === "set-battler-status-data", `unexpected event kind ${event.kind}`);
  return Object.freeze({ battler: event.battler, status1: event.status1 >>> 0 });
}

function sourceOutcome(projection, instructionSpec, salt) {
  const initialRules = canonicalRulesFromProjection(projection);
  const inputSnapshot = vectorState(initialRules);
  try {
    const state = Object.freeze({
      ...machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        initialRules,
        (0x2468_ace1 + salt) >>> 0,
      ),
    });
    const transition = handler({
      program,
      instruction: instructionFromSpec(instructionSpec),
      state,
    });
    assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
    assert(transition.rng === state.rng, "canonical handler changed RNG");
    assert(same(vectorState(initialRules), inputSnapshot), "canonical handler mutated input");
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(Object.isFrozen(transition.rulesContext.selectorRoles), "canonical selector roles must be frozen");
    const control = controlFromTransition(transition);
    return Object.freeze({
      initial: inputSnapshot,
      expected: vectorState(transition.rulesContext),
      control,
      event: eventFromTransition(transition),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    assert(same(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input");
    return Object.freeze({
      initial: inputSnapshot,
      expected: null,
      control: null,
      event: null,
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error === "Cmd_trysetrest requires an attacker role") return "missing-attacker-role";
  if (outcome.error.startsWith("Cmd_trysetrest: unresolved jump target")) return "unresolved-jump-target";
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, projection, instructionSpec = CANONICAL_INSTRUCTION, salt = cases.length + 41) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(projection, instructionSpec, salt);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    initial: outcome.initial,
    instruction: vectorInstruction(instructionSpec),
    expected: outcome.expected,
    control: outcome.control,
    event: outcome.event,
    expectedError: outcome.error,
  }));
}

// Every attacker battler slot on both branches, dense over the status1
// domain: proves per-slot correctness, the chooser's `& ~STATUS1_SLEEP`
// boundary, and the status-write REPLACE (not OR) semantics.
for (const attacker of BATTLERS) {
  for (const status1 of STATUS1_VALUES) {
    for (const branch of ["fail", "success"]) {
      const hp = branch === "fail" ? 140 : 60;
      addCase(
        `attacker_status_sweep_a${attacker}_s${status1}_${branch}`,
        "attacker-status-sweep",
        makeProjection({
          attacker,
          target: (attacker + 1) % 4,
          hp,
          maxHP: 140,
          status1,
          salt: cases.length + 11,
        }),
      );
    }
  }
}

// maxHP edge values driving `battleMoveDamage = -maxHP`, on both branches.
for (const maxHP of MAX_HP_EDGE_VALUES) {
  for (const branch of ["fail", "success"]) {
    const hp = branch === "fail" ? maxHP : Math.max(0, maxHP - 1);
    addCase(
      `maxhp_edge_${maxHP}_${branch}`,
      "maxhp-edge-sweep",
      makeProjection({ attacker: 0, target: 1, hp, maxHP, status1: 0, salt: cases.length + 2000 }),
    );
  }
}

// Party mirror identity-no-op vs a genuinely different prior status1, on
// both sides (0 and 1), success branch only (the fail branch never writes
// the party mirror at all -- covered separately below).
for (const attacker of [0, 1]) {
  for (const priorStatus1 of [3, 9]) {
    const salt = cases.length + 3000;
    const projection = makeProjection({
      attacker,
      target: (attacker + 1) % 4,
      hp: 60,
      maxHP: 140,
      status1: 0,
      salt,
    });
    const overridePlayer = projection.party.player.map((member, index) =>
      index === attacker ? partyMemberInput(priorStatus1, member.item) : member);
    const overrideOpponent = projection.party.opponent.map((member, index) =>
      index === attacker ? partyMemberInput(priorStatus1, member.item) : member);
    addCase(
      `party_identity_a${attacker}_prior${priorStatus1}`,
      "party-identity-sweep",
      Object.freeze({
        ...projection,
        party: Object.freeze({ player: Object.freeze(overridePlayer), opponent: Object.freeze(overrideOpponent) }),
      }),
      CANONICAL_INSTRUCTION,
      salt,
    );
  }
}

// Stale target role (None / same-as-attacker / a different battler) proves
// the unconditional reassignment on BOTH branches.
for (const targetLabel of ["none", "same", "different"]) {
  for (const branch of ["fail", "success"]) {
    const attacker = 0;
    const target = targetLabel === "none" ? null : targetLabel === "same" ? attacker : 2;
    const hp = branch === "fail" ? 140 : 60;
    addCase(
      `target_role_${targetLabel}_${branch}`,
      "target-role-sweep",
      makeProjection({ attacker, target, hp, maxHP: 140, status1: 0, salt: cases.length + 4000 }),
    );
  }
}

// Lazy label resolution: unresolved pointer only bites on the fail branch.
addCase(
  "unresolved_label_on_fail_branch",
  "unresolved-label",
  makeProjection({ attacker: 0, target: 1, hp: 140, maxHP: 140, status1: 0, salt: cases.length + 5000 }),
  UNRESOLVED_INSTRUCTION,
);
addCase(
  "unresolved_label_not_reached_on_success",
  "unresolved-label",
  makeProjection({ attacker: 0, target: 1, hp: 60, maxHP: 140, status1: 0, salt: cases.length + 5100 }),
  UNRESOLVED_INSTRUCTION,
);

// Missing attacker role precedes every other check.
addCase(
  "missing_attacker_role",
  "missing-attacker-role",
  makeProjection({ attacker: null, target: 1, hp: 60, maxHP: 140, status1: 0, salt: cases.length + 6000 }),
);

function sourceRegistration(includeCanonical, extra) {
  const noise = Object.freeze({ ...canonicalInstruction, opcodeName: "B_SCR_OP_RUST_NOISE", opcodeId: 0 });
  const instructions = Object.freeze([
    ...(extra ?? []),
    noise,
    ...(includeCanonical ? [canonicalInstruction] : []),
  ]);
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTrysetrestOpcodeHandlers(customProgram);
    const keys = Object.keys(registered);
    assert(keys.length === 1, "canonical registration emitted more than one key");
    return Object.freeze({ opcodeId: Number(keys[0]), error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ opcodeId: null, error: error.message });
  }
}

const registrationCases = [];
function addRegistration(label, outcome) {
  registrationCases.push(Object.freeze({ label, expectedOpcodeId: outcome.opcodeId, expectedError: outcome.error }));
}
addRegistration("valid_singleton", sourceRegistration(true));
addRegistration("missing_opcode", sourceRegistration(false));
addRegistration("duplicate_first_wins", sourceRegistration(true, [canonicalInstruction]));

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["status1-values", STATUS1_VALUES.length],
  ["maxhp-edge-values", MAX_HP_EDGE_VALUES.length],
  ["registration-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  statusValues: STATUS1_VALUES,
  maxHpEdgeValues: MAX_HP_EDGE_VALUES,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
  registrationCases,
});
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generator = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generator).digest("hex");

function rustString(value) { return JSON.stringify(value); }
function rustU8(value) { return `0x${value.toString(16).padStart(2, "0")}`; }
function rustU16(value) { return `0x${value.toString(16).padStart(4, "0")}`; }
function rustU32(value) { return `0x${(value >>> 0).toString(16).padStart(8, "0")}`; }
function rustSide(value) { return value === 0 ? "BattleScriptTrysetrestSide::Player" : "BattleScriptTrysetrestSide::Opponent"; }
function rustBattler(value) { return `BattleScriptTrysetrestBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustControl(value) {
  return value.kind === "advance" ? "BattleScriptTrysetrestControl::Advance"
    : `BattleScriptTrysetrestControl::Jump { program_counter: ${value.programCounter} }`;
}
function rustBattlerState(value) {
  return `BattleScriptTrysetrestVectorBattlerState { hp: ${value.hp}, max_hp: ${value.maxHP}, status1: ${rustU32(value.status1)}, side: ${rustSide(value.side)}, party_index: ${value.partyIndex}, ability: ${rustU8(value.ability)}, item: ${rustU16(value.item)} }`;
}
function rustPartyMember(value) {
  return `BattleScriptTrysetrestVectorPartyMember { status1: ${rustU32(value.status1)}, noise: ${rustU32(value.item)} }`;
}
function rustPartyArray(values) {
  return `[${values.map(rustPartyMember).join(", ")}]`;
}
function rustState(value) {
  return [
    "BattleScriptTrysetrestVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `party: [${rustPartyArray(value.partyPlayer)}, ${rustPartyArray(value.partyOpponent)}],`,
    `battle_move_damage: ${value.battleMoveDamage},`,
    `multistring_chooser: ${rustU8(value.multistringChooser)},`,
    "}",
  ].join(" ");
}
function rustInstruction(value) {
  const resolved = value.resolvedJumpExpression === null ? "None"
    : `Some(BattleScriptTrysetrestResolvedLabel { expression: ${rustString(value.resolvedJumpExpression)}, program_counter: ${value.resolvedJumpProgramCounter} })`;
  return `BattleScriptTrysetrestInstruction { opcode_name: ${rustString(OPCODE_NAME)}, program_counter: 0, opcode_id: ${rustU8(OPCODE_ID)}, dispatcher: ${rustString(DISPATCHER)}, operands: &[BattleScriptTrysetrestOperand { width_bytes: ${rustU8(value.operandWidth)}, expression: ${rustString(value.operandExpression)} }], resolved_jump_target: ${resolved} }`;
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalControl(value) { return value === null ? "None" : `Some(${rustControl(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptionalEvent(value) {
  return value === null ? "None"
    : `Some(BattleScriptTrysetrestEvent::SetBattlerStatusData { battler: ${rustBattler(value.battler)}, status1: ${rustU32(value.status1)} })`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysetrest-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrysetrestOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysetrest::{");
lines.push("    BattleScriptTrysetrestBattler, BattleScriptTrysetrestControl, BattleScriptTrysetrestEvent,");
lines.push("    BattleScriptTrysetrestInstruction, BattleScriptTrysetrestOperand,");
lines.push("    BattleScriptTrysetrestResolvedLabel, BattleScriptTrysetrestSide,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETREST_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETREST_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETREST_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETREST_VECTOR_GENERATOR_BYTES: usize = ${generator.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetrestVectorBattlerState { pub hp: u16, pub max_hp: u16, pub status1: u32, pub side: BattleScriptTrysetrestSide, pub party_index: u8, pub ability: u8, pub item: u16 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetrestVectorPartyMember { pub status1: u32, pub noise: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetrestVectorState { pub battlers: [BattleScriptTrysetrestVectorBattlerState; 4], pub attacker: Option<BattleScriptTrysetrestBattler>, pub target: Option<BattleScriptTrysetrestBattler>, pub party: [[BattleScriptTrysetrestVectorPartyMember; 6]; 2], pub battle_move_damage: i32, pub multistring_chooser: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetrestVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptTrysetrestVectorState, pub instruction: BattleScriptTrysetrestInstruction<'static>, pub expected: Option<BattleScriptTrysetrestVectorState>, pub control: Option<BattleScriptTrysetrestControl>, pub event: Option<BattleScriptTrysetrestEvent>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetrestRegistrationVectorCase { pub label: &'static str, pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETREST_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETREST_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETREST_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSETREST_CASES: [BattleScriptTrysetrestVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetrestVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        control: ${rustOptionalControl(value.control)}, event: ${rustOptionalEvent(value.event)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYSETREST_REGISTRATION_CASES: [BattleScriptTrysetrestRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetrestRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        expected_opcode_id: ${value.expectedOpcodeId === null ? "None" : `Some(${rustU8(value.expectedOpcodeId)})`}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
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
if (!formatted) throw new Error("gen-battle-script-trysetrest-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
