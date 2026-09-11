#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_ACCURACYCHECK (0x1) leaf -- PART 1
// OF 2 (M86): only the no-roll bypass paths (`NO_ACC_CALC_CHECK_LOCK_ON`,
// `NO_ACC_CALC`) plus registration. The three full-formula operand forms
// (`ACC_CURR_MOVE`, `MOVE_FUTURE_SIGHT`, `MOVE_DOOM_DESIRE`) are M87 and
// are deliberately NOT emitted here -- covered only by native unit tests.
//
// `accuracycheckOpcodeHandler` in src/engine/battleScriptHitChainOpcode.ts
// (:1119-1177, doc comment :1119-1130).
//
// Expected control/flag/error values come only from executing the
// canonical TypeScript handler -- reached through the real
// `createBattleScriptHitChainOpcodeHandlers` factory plus the real
// committed program (the 9 committed bypass call sites: 8
// NO_ACC_CALC_CHECK_LOCK_ON, 1 NO_ACC_CALC) -- plus custom instructions
// only for registration edges, missing-label, unknown-operand, and state
// edges not reachable from committed sites. This generator owns bounded
// input construction and Rust literal emission; it must never reimplement
// the ladder order, the checksLockOn asymmetry, or isDefenderProtected.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-accuracycheck-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot, "core-rs", "crates", "factory-core", "src",
  "battle_script_accuracycheck_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");
const GENERATED_FILE_MAX_BYTES = 6_000_000;

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptHitChainOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const ACC_NAME = "B_SCR_OP_ACCURACYCHECK";
const ACC_ID = 0x01;
const ACC_DISPATCHER = "Cmd_accuracycheck";
const ENTRY_LABEL = "BattleScript_EffectHit"; // any valid label; programCounter is overridden.
const FAIL_LABEL = "BattleScript_ButItFailed";

const STATUS3_ALWAYS_HITS = (1 << 3) | (1 << 4);
const STATUS3_ON_AIR = 1 << 6;
const STATUS3_UNDERGROUND = 1 << 7;
const STATUS3_UNDERWATER = 1 << 18;
const MOVE_RESULT_MISSED = 1 << 0;
const B_MSG_PROTECTED = 1;
const MOVE_TACKLE = 33; // FLAG_PROTECT_AFFECTED
const MOVE_SWORDS_DANCE = 14; // no FLAG_PROTECT_AFFECTED
const MOVE_UNKNOWN = 60_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-accuracycheck-vectors: ${message}`);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return `0x${(value & 0xff).toString(16).padStart(2, "0")}`; }
function hex16(value) { return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`; }
function hex32(value) { return `0x${(value >>> 0).toString(16).padStart(8, "0")}`; }
function rustString(value) { return JSON.stringify(value); }

function defaultBattlerSpec(index) {
  return {
    side: index % 2, ability: 0, item: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], species: 1 + index,
    attack: 60, defense: 60, spAttack: 60, spDefense: 60, level: 50, hp: 100, maxHP: 100,
    status1: 0, status2: 0, status3: 0, statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    protected: 0, battlerWithSureHit: 0,
  };
}

function canonicalBattler(spec, index) {
  return Object.freeze({
    side: spec.side, ability: spec.ability, hp: spec.hp, maxHP: spec.maxHP,
    moves: Object.freeze([278, 33, 45, 98]), pp: Object.freeze([10, 20, 15, 25]),
    status1: spec.status1, status2: spec.status2, status3: spec.status3,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0, item: spec.item, statStages: Object.freeze(spec.statStages.slice()),
    types: Object.freeze(spec.types.slice()), species: spec.species,
    attack: spec.attack, defense: spec.defense, spAttack: spec.spAttack, spDefense: spec.spDefense,
    speed: 60, level: spec.level, friendship: 70, partyIndex: index,
    targetNotAffected: 0, endured: 0,
    specialStatus: Object.freeze({ focusBanded: 0 }),
    protected: spec.protected, battlerWithSureHit: spec.battlerWithSureHit,
  });
}

function canonicalRulesRaw({
  battlerSpecs, attacker, target, battlersCount = 2,
  currentMove = MOVE_TACKLE, moveResultFlags = 0, missType = 0,
  lastLandedMoves = [1, 2, 3, 4], lastHitByType = [5, 6, 7, 8],
  battleTypeFlags = battlersCount === 4 ? 1 << 0 : 0,
}) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(battlerSpecs.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker, target, effectBattler: target ?? attacker }),
    scriptingBattler: attacker ?? 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove,
    currentMovePosition: 0,
    moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: 0,
    lastUsedItem: 0,
    usedHeldItems: Object.freeze([0, 0, 0, 0]),
    lastLandedMoves: freezeArray(lastLandedMoves),
    lastHitByType: freezeArray(lastHitByType),
    aiObservedAbilityIds: Object.freeze([0, 0, 0, 0]),
    party: Object.freeze({
      player: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
      opponent: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
    }),
    battleTopology: Object.freeze({
      battlersCount, battleTypeFlags,
      battlerPositions: battlersCount === 4 ? Object.freeze([0, 1, 2, 3]) : Object.freeze([0, 1, 0xff, 0xff]),
    }),
    absentBattlerFlags: 0,
    sideStatuses: Object.freeze([0, 0]),
    futureSightCounter: Object.freeze([0, 0, 0, 0]),
    futureSightMove: Object.freeze([0, 0, 0, 0]),
    futureSightAttacker: Object.freeze([0, 0, 0, 0]),
    futureSightDmg: Object.freeze([0, 0, 0, 0]),
    multistringChooser: 0xff,
    dynamicBasePower: 0,
    dynamicMoveType: 0,
    weather: 0,
    enigmaBerryHoldEffects: Object.freeze([0, 0, 0, 0]),
    enigmaBerryHoldEffectParams: Object.freeze([0, 0, 0, 0]),
    battleMoveDamage: 0,
  });
}

// Same "safe placeholder, then splice" trick as the sibling generators:
// `createBattleScriptRulesContext` eagerly resolves `currentMoveEffect`
// from `currentMove` at construction time, which would throw before this
// leaf's own (error-free) unknown-move handling ever runs.
function canonicalRules(spec) {
  const wantedMove = spec.currentMove ?? MOVE_TACKLE;
  try {
    return canonicalRulesRaw(spec);
  } catch {
    const placeholder = canonicalRulesRaw({ ...spec, currentMove: MOVE_TACKLE });
    return Object.freeze({ ...placeholder, currentMove: wantedMove });
  }
}

function baseSpec(overrides = {}) {
  const battlerSpecs = [0, 1, 2, 3].map((index) => defaultBattlerSpec(index));
  return { battlerSpecs, attacker: 0, target: 1, ...overrides };
}
function withBattler(spec, index, changes) {
  const battlerSpecs = spec.battlerSpecs.map((value, i) => (i === index ? { ...value, ...changes } : value));
  return { ...spec, battlerSpecs };
}

function projectBattler(b) {
  return Object.freeze({ status3: b.status3 >>> 0, protected: b.protected, battler_with_sure_hit: b.battlerWithSureHit });
}
function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map(projectBattler)),
    currentMove: rules.currentMove,
    moveResultFlags: rules.moveResultFlags >>> 0,
    missType: rules.missType,
    lastLandedMoves: freezeArray(rules.moveHistory.lastLandedMoves),
    lastHitByType: freezeArray(rules.moveHistory.lastHitByType),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
  });
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

const program = programModule.loadBattleScriptProgram();
const accCheckSites = program.instructions.filter((i) => i.opcodeName === ACC_NAME);
assert(accCheckSites.length === 66, `expected 66 accuracycheck sites, got ${accCheckSites.length}`);
function byMoveOperand(sites, expression) {
  return sites.filter((s) => s.operands[1]?.expression === expression);
}
const accCurrMoveSites = byMoveOperand(accCheckSites, "ACC_CURR_MOVE");
const lockOnSites = byMoveOperand(accCheckSites, "NO_ACC_CALC_CHECK_LOCK_ON");
const noAccCalcSites = byMoveOperand(accCheckSites, "NO_ACC_CALC");
const futureSightSites = byMoveOperand(accCheckSites, "MOVE_FUTURE_SIGHT");
const doomDesireSites = byMoveOperand(accCheckSites, "MOVE_DOOM_DESIRE");
assert(accCurrMoveSites.length === 55, `ACC_CURR_MOVE census drifted: ${accCurrMoveSites.length}`);
assert(lockOnSites.length === 8, `NO_ACC_CALC_CHECK_LOCK_ON census drifted: ${lockOnSites.length}`);
assert(noAccCalcSites.length === 1, `NO_ACC_CALC census drifted: ${noAccCalcSites.length}`);
assert(futureSightSites.length === 1, `MOVE_FUTURE_SIGHT census drifted: ${futureSightSites.length}`);
assert(doomDesireSites.length === 1, `MOVE_DOOM_DESIRE census drifted: ${doomDesireSites.length}`);
const bypassSites = [...lockOnSites, ...noAccCalcSites];
assert(bypassSites.length === 9, `bypass census drifted: ${bypassSites.length}`);
for (const site of bypassSites) {
  assert(site.opcodeId === ACC_ID && site.dispatcher === ACC_DISPATCHER, `bypass site drift at pc ${site.programCounter}`);
  assert(site.operands.length === 2 && site.operands[0].widthBytes === 4 && site.operands[1].widthBytes === 2, `bypass operand shape drift at pc ${site.programCounter}`);
  assert(site.operands[0].expression === FAIL_LABEL, `bypass fail label drift at pc ${site.programCounter}`);
}

const resolvedFail = programModule.resolveBattleScriptLabel(program, FAIL_LABEL);
assert(resolvedFail !== undefined, `real committed program has no label ${FAIL_LABEL}`);

const ports = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => {},
  resolveBattlerForBattleScript: () => 0,
});
const handlers = opcodeModule.createBattleScriptHitChainOpcodeHandlers(program, ports);
const accuracycheckHandler = handlers[ACC_ID];
assert(typeof accuracycheckHandler === "function", "accuracycheck handler did not register");

function op(widthBytes, expression) {
  return Object.freeze({ widthBytes, expression });
}
function customInstruction(operands) {
  return Object.freeze({ opcodeName: ACC_NAME, opcodeId: ACC_ID, dispatcher: ACC_DISPATCHER, operands: Object.freeze(operands) });
}

function branchForError(message) {
  if (message.includes("requires a attacker role")) return "missing-attacker-role";
  if (message.includes("requires a target role")) return "missing-target-role";
  if (message.includes("committed program has no label")) return "unresolved-fail-label";
  throw new Error(`unknown canonical error: ${message}`);
}

function sourceOutcome(rulesSpec, instruction, programCounter) {
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  try {
    const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x99aa_ccdd);
    const state = Object.freeze({ ...scaffold, programCounter });
    const transition = accuracycheckHandler({ program, instruction, state });
    assert((transition.events ?? []).length === 0, "accuracycheck must never emit events");
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    const outRules = transition.rulesContext ?? rules;
    if (transition.control.kind === "advance") {
      return { branch: "advance", expected: projectRules(outRules), jumpProgramCounter: null, halt: null, error: null };
    }
    if (transition.control.kind === "jump") {
      return { branch: "jump", expected: projectRules(outRules), jumpProgramCounter: transition.control.programCounter, halt: null, error: null };
    }
    if (transition.control.kind === "halt") {
      assert(transition.control.reason.kind === "unsupported-branch", `unexpected halt reason ${transition.control.reason.kind}`);
      return { branch: "halt", expected: null, jumpProgramCounter: null, halt: transition.control.reason, error: null };
    }
    throw new Error(`unexpected control kind ${transition.control.kind}`);
  } catch (error) {
    assert(error instanceof Error, `non-Error throw ${String(error)}`);
    return { branch: branchForError(error.message), expected: null, jumpProgramCounter: null, halt: null, error: error.message };
  }
}

const cases = [];
function addCase(label, category, rulesSpec, instruction, programCounter = 500) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(rulesSpec, instruction, programCounter);
  const moveOperandExpression = instruction.operands[1]?.expression ?? null;
  const failLabelExpression = instruction.operands[0]?.expression ?? null;
  assert(failLabelExpression !== null, `case ${label} is missing its fail-label operand`);
  const failEntry = programModule.resolveBattleScriptLabel(program, failLabelExpression);
  cases.push(Object.freeze({
    label, category, programCounter, branch: outcome.branch,
    moveOperandExpression, failLabelExpression,
    resolvedFailProgramCounter: failEntry ? failEntry.programCounter : null,
    initial: projectRules(canonicalRules(rulesSpec)),
    ...outcome,
  }));
}

const LOCK_ON = customInstruction([op(4, FAIL_LABEL), op(2, "NO_ACC_CALC_CHECK_LOCK_ON")]);
const NO_ACC_CALC = customInstruction([op(4, FAIL_LABEL), op(2, "NO_ACC_CALC")]);

// --- Real committed call sites: neutral state -> plain advance ----------
bypassSites.forEach((site, index) => {
  addCase(
    `call_site_${index}`, "committed-call-sites",
    baseSpec({ currentMove: MOVE_SWORDS_DANCE }), site, site.programCounter,
  );
});

// --- (a) lock-on sure-hit ------------------------------------------------
addCase(
  "lock_on_check_lock_on_advances", "lock-on",
  withBattler(baseSpec(), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 0 }),
  LOCK_ON,
);
addCase(
  "lock_on_wrong_battler_falls_through", "lock-on",
  withBattler(baseSpec(), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 2 }),
  LOCK_ON,
);
addCase(
  "no_acc_calc_ignores_sure_hit_then_semi_invuln", "checks-lock-on-asymmetry",
  withBattler(baseSpec(), 1, {
    status3: STATUS3_ALWAYS_HITS | STATUS3_UNDERWATER, battlerWithSureHit: 0,
  }),
  NO_ACC_CALC,
);
addCase(
  "no_acc_calc_protect_miss", "checks-lock-on-asymmetry",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, {
    status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 0, protected: 1,
  }),
  NO_ACC_CALC,
);
addCase(
  "no_acc_calc_plain_advance", "checks-lock-on-asymmetry",
  baseSpec({ currentMove: MOVE_SWORDS_DANCE }),
  NO_ACC_CALC,
);

// --- (b) semi-invulnerable bare jump --------------------------------------
addCase("semi_invuln_on_air", "semi-invulnerable", withBattler(baseSpec(), 1, { status3: STATUS3_ON_AIR }), LOCK_ON);
addCase("semi_invuln_underground", "semi-invulnerable", withBattler(baseSpec(), 1, { status3: STATUS3_UNDERGROUND }), LOCK_ON);
addCase("semi_invuln_underwater", "semi-invulnerable", withBattler(baseSpec(), 1, { status3: STATUS3_UNDERWATER }), LOCK_ON);
addCase(
  "semi_invuln_multi_bit", "semi-invulnerable",
  withBattler(baseSpec(), 1, { status3: STATUS3_ON_AIR | STATUS3_UNDERGROUND }), LOCK_ON,
);

// --- precedence: (b) beats (c) --------------------------------------------
addCase(
  "precedence_semi_invuln_beats_protect", "precedence",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { status3: STATUS3_UNDERGROUND, protected: 1 }),
  LOCK_ON,
);

// --- (c) protect gate ------------------------------------------------------
addCase(
  "protect_miss_flagged_move", "protect",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { protected: 1 }),
  LOCK_ON,
);
addCase(
  "protect_unflagged_move_falls_through", "protect",
  withBattler(baseSpec({ currentMove: MOVE_SWORDS_DANCE }), 1, { protected: 1 }),
  LOCK_ON,
);
addCase(
  "flagged_move_not_protected_falls_through", "protect",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { protected: 0 }),
  LOCK_ON,
);
addCase(
  "unknown_move_not_protected_falls_through", "protect",
  withBattler(baseSpec({ currentMove: MOVE_UNKNOWN }), 1, { protected: 1 }),
  LOCK_ON,
);

// --- role errors -----------------------------------------------------------
addCase("missing_attacker_role", "role-errors", { ...baseSpec(), attacker: null }, LOCK_ON);
addCase("missing_target_role", "role-errors", { ...baseSpec(), target: null }, LOCK_ON);
addCase("missing_attacker_wins_over_missing_target", "role-errors", { ...baseSpec(), attacker: null, target: null }, LOCK_ON);

// --- unsupported branch: unrecognized/missing move operand -----------------
addCase(
  "unsupported_branch_unknown_literal", "unsupported-branch",
  baseSpec(), customInstruction([op(4, FAIL_LABEL), op(2, "SOME_UNKNOWN_LITERAL")]),
);
addCase(
  "unsupported_branch_missing_operand", "unsupported-branch",
  baseSpec(), customInstruction([op(4, FAIL_LABEL)]),
);

// --- unresolved fail label, both jump sub-branches --------------------------
const UNRESOLVED_LOCK_ON = customInstruction([op(4, "BattleScript_RustAccuracycheckUnresolved"), op(2, "NO_ACC_CALC_CHECK_LOCK_ON")]);
addCase(
  "missing_label_semi_invuln", "unresolved-label",
  withBattler(baseSpec(), 1, { status3: STATUS3_ON_AIR }), UNRESOLVED_LOCK_ON,
);
addCase(
  "missing_label_protect", "unresolved-label",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { protected: 1 }), UNRESOLVED_LOCK_ON,
);

console.log(`gen-battle-script-accuracycheck-vectors: ${cases.length} behavior cases`);

// === Registration ============================================================
function sourceRegistration(instructions) {
  const customProgram = Object.freeze({ ...program, instructions: freezeArray(instructions) });
  try {
    const registered = opcodeModule.createBattleScriptHitChainOpcodeHandlers(customProgram, ports);
    assert(typeof registered[ACC_ID] === "function", "accuracycheck handler missing after successful registration");
    return Object.freeze({ registeredOpcodeId: ACC_ID, error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ registeredOpcodeId: null, error: error.message });
  }
}
const dedupedInstructions = [];
{
  const seenNames = new Set();
  for (const instruction of program.instructions) {
    if (!seenNames.has(instruction.opcodeName)) {
      seenNames.add(instruction.opcodeName);
      dedupedInstructions.push(instruction);
    }
  }
}
assert(dedupedInstructions.some((value) => value.opcodeName === ACC_NAME), "deduplicated program lost the accuracycheck entry");

const registrationCases = [];
function addRegistration(label, instructions) {
  const outcome = sourceRegistration(instructions);
  registrationCases.push(Object.freeze({
    label,
    instructions: freezeArray(instructions.map((value) => Object.freeze({
      opcodeName: value.opcodeName, opcodeId: value.opcodeId, programCounter: value.programCounter,
    }))),
    expectedOpcodeId: outcome.registeredOpcodeId, expectedError: outcome.error,
  }));
}
addRegistration("full_committed_program_registers", dedupedInstructions);
addRegistration("accuracycheck_missing_from_program", dedupedInstructions.filter((value) => value.opcodeName !== ACC_NAME));
addRegistration(
  "duplicate_later_entry_ignored_find_first",
  [...dedupedInstructions, Object.freeze({
    opcodeName: ACC_NAME, opcodeId: 0xee, programCounter: 999_999,
    dispatcher: ACC_DISPATCHER, operands: [],
  })],
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (value.expectedError === null ? "registered" : "missing-opcode"));
const moveOperandCensus = [
  ["ACC_CURR_MOVE", accCurrMoveSites.length],
  ["MOVE_DOOM_DESIRE", doomDesireSites.length],
  ["MOVE_FUTURE_SIGHT", futureSightSites.length],
  ["NO_ACC_CALC", noAccCalcSites.length],
  ["NO_ACC_CALC_CHECK_LOCK_ON", lockOnSites.length],
];

const corpus = Object.freeze({ categoryCensus, branchCensus, registrationBranchCensus, moveOperandCensus, cases, registrationCases });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustArr4u16(values) { return `[${values.map(hex16).join(", ")}]`; }
function rustOptionU8(value) { return value === null || value === undefined ? "None" : `Some(${value}u8)`; }
function rustOptionalU8Hex(value) { return value === null || value === undefined ? "None" : `Some(${hex8(value)})`; }
function rustOptionalU32(value) { return value === null || value === undefined ? "None" : `Some(${value}u32)`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustBattlerState(value) {
  return `BattleScriptAccuracycheckVectorBattlerState { status3: ${hex32(value.status3)}, protected: ${value.protected}u8, battler_with_sure_hit: ${value.battler_with_sure_hit}u8 }`;
}
function rustState(value) {
  return [
    "BattleScriptAccuracycheckVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `current_move: ${hex16(value.currentMove)}, move_result_flags: ${hex32(value.moveResultFlags)},`,
    `miss_type: ${value.missType}u8,`,
    `last_landed_moves: ${rustArr4u16(value.lastLandedMoves)}, last_hit_by_type: ${rustArr4u16(value.lastHitByType)},`,
    `attacker: ${rustOptionU8(value.attacker)}, target: ${rustOptionU8(value.target)},`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustHalt(value) {
  if (value === null || value === undefined) return "None";
  return [
    "Some(BattleScriptAccuracycheckVectorHalt {",
    `opcode_id: ${hex8(value.opcodeId)},`,
    `opcode_name: ${rustString(value.opcodeName)},`,
    `source_construct: ${rustString(value.sourceConstruct)},`,
    `source_file: ${rustString(value.sourceFile)},`,
    `source_line: ${value.sourceLine},`,
    "})",
  ].join(" ");
}
function rustInstruction(value) {
  return `BattleScriptAccuracycheckInstruction { opcode_name: ${rustString(value.opcodeName)}, opcode_id: ${hex8(value.opcodeId)}, program_counter: ${value.programCounter} }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-accuracycheck-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_accuracycheck::BattleScriptAccuracycheckInstruction;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push(`pub const BATTLE_SCRIPT_ACCURACYCHECK_CONCRETE_CALL_SITE_COUNT: usize = ${accCheckSites.length};`);
lines.push(`pub const BATTLE_SCRIPT_ACCURACYCHECK_BYPASS_CALL_SITE_COUNT: usize = ${bypassSites.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAccuracycheckVectorBattlerState { pub status3: u32, pub protected: u8, pub battler_with_sure_hit: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAccuracycheckVectorState { pub battlers: [BattleScriptAccuracycheckVectorBattlerState; 4], pub current_move: u16, pub move_result_flags: u32, pub miss_type: u8, pub last_landed_moves: [u16; 4], pub last_hit_by_type: [u16; 4], pub attacker: Option<u8>, pub target: Option<u8> }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAccuracycheckVectorHalt { pub opcode_id: u8, pub opcode_name: &'static str, pub source_construct: &'static str, pub source_file: &'static str, pub source_line: u32 }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAccuracycheckVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub program_counter: u32, pub move_operand_expression: Option<&'static str>, pub fail_label_expression: &'static str, pub resolved_fail_program_counter: Option<u32>, pub initial: BattleScriptAccuracycheckVectorState, pub expected: Option<BattleScriptAccuracycheckVectorState>, pub jump_program_counter: Option<u32>, pub halt: Option<BattleScriptAccuracycheckVectorHalt>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAccuracycheckRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptAccuracycheckInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ACCURACYCHECK_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ACCURACYCHECK_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ACCURACYCHECK_MOVE_OPERAND_CENSUS", moveOperandCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_ACCURACYCHECK_CASES: [BattleScriptAccuracycheckVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptAccuracycheckVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        program_counter: ${value.programCounter},`);
  lines.push(`        move_operand_expression: ${rustOptionalString(value.moveOperandExpression)},`);
  lines.push(`        fail_label_expression: ${rustString(value.failLabelExpression)},`);
  lines.push(`        resolved_fail_program_counter: ${rustOptionalU32(value.resolvedFailProgramCounter)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        jump_program_counter: ${rustOptionalU32(value.jumpProgramCounter)},`);
  lines.push(`        halt: ${rustHalt(value.halt)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_CASES: [BattleScriptAccuracycheckRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptAccuracycheckRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_opcode_id: ${rustOptionalU8Hex(value.expectedOpcodeId)}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt", path.join(process.env.HOME ?? "", ".cargo", "bin", "rustfmt")]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-accuracycheck-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
