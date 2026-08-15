#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrycopyabilityOpcode.ts.
// Expected controls, complete projected outputs, and exact ordered role errors
// are created only by executing the canonical TypeScript opcode handler. This
// script owns bounded input construction and Rust literal emission; its
// FailJump control deliberately omits the canonical machine's absolute PC.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trycopyability-vectors.mjs

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
  "battle_script_trycopyability_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrycopyabilityOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYCOPYABILITY";
const OPCODE_ID = 0xd3;
const DISPATCHER = "Cmd_trycopyability";
const ENTRY_LABEL = "BattleScript_EffectRolePlay";
const ROLE_PLAY = 272;
const BATTLE_SLOTS = 4;
const U8_MAX = 0xff;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const TARGET_DOMAIN = ATTACKER_DOMAIN;
const TARGET_ABILITY_DOMAIN = Object.freeze(Array.from({ length: U8_MAX + 1 }, (_, value) => value));
const ABILITY_NONE = opcodeModule.ROLE_PLAY_ABILITY_NONE;
const ABILITY_WONDER_GUARD = opcodeModule.ROLE_PLAY_ABILITY_WONDER_GUARD;
const FAILURE_ABILITY_DOMAIN = Object.freeze([ABILITY_NONE, ABILITY_WONDER_GUARD]);
const SUCCESS_ABILITY_BOUNDARY_DOMAIN = Object.freeze([1, 24, 26, U8_MAX]);
const LAST_USED_ABILITY_BOUNDARY_DOMAIN = Object.freeze([0, 1, 24, 25, 26, U8_MAX]);
const FULL_DOMAIN_ATTACKER = 0;
const FULL_DOMAIN_TARGET = 1;
const GENERATED_FILE_MAX_BYTES = 5_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trycopyability-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U8_MAX, `${label} must be a u8, got ${value}`);
}

function freezeProjection(abilities, lastUsedAbility, attacker, target) {
  assert(Array.isArray(abilities) && abilities.length === BATTLE_SLOTS, "abilities must have four cells");
  abilities.forEach((ability, battler) => assertU8(ability, `abilities[${battler}]`));
  assertU8(lastUsedAbility, "lastUsedAbility");
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  return Object.freeze({
    abilities: Object.freeze([...abilities]),
    lastUsedAbility,
    attacker,
    target,
  });
}

function canonicalBattler(side, ability) {
  return Object.freeze({
    side,
    ability,
    hp: 100,
    maxHP: 100,
    moves: Object.freeze([ROLE_PLAY, 0, 0, 0]),
    pp: Object.freeze([10, 0, 0, 0]),
    status1: 0,
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
    item: 0,
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 1,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: 0,
    isFirstTurn: 0,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(ATTACKER_DOMAIN.map((battler) => canonicalBattler(
      battler % 2,
      projection.abilities[battler],
    ))),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: 0,
      fainted: null,
    }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: ROLE_PLAY,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: projection.lastUsedAbility,
  });
}

function vectorState(rules) {
  return Object.freeze({
    abilities: Object.freeze(rules.battlers.map((battler) => battler.ability)),
    lastUsedAbility: rules.lastUsedAbility,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function makeFullDomainProjection(targetAbility) {
  assertU8(targetAbility, "full-domain target ability");
  const abilities = [
    targetAbility ^ 0xa5,
    targetAbility,
    targetAbility ^ 0x5a,
    targetAbility ^ 0x3c,
  ];
  return freezeProjection(
    abilities,
    LAST_USED_ABILITY_BOUNDARY_DOMAIN[targetAbility % LAST_USED_ABILITY_BOUNDARY_DOMAIN.length],
    FULL_DOMAIN_ATTACKER,
    FULL_DOMAIN_TARGET,
  );
}

function makePairProjection({ attacker, target, targetAbility, lastUsedAbility, salt }) {
  assertOptionalBattler(attacker, "pair attacker");
  assertOptionalBattler(target, "pair target");
  assertU8(targetAbility, "pair target ability");
  assertU8(lastUsedAbility, "pair prior last used ability");
  const abilities = ATTACKER_DOMAIN.map((battler) => (salt * 29 + battler * 71 + 11) & U8_MAX);
  if (target !== null) abilities[target] = targetAbility;
  if (attacker !== null && target !== null && attacker !== target && abilities[attacker] === targetAbility) {
    abilities[attacker] ^= 0x80;
  }
  return freezeProjection(abilities, lastUsedAbility, attacker, target);
}

assert(ABILITY_NONE === 0, `ABILITY_NONE drifted to ${ABILITY_NONE}`);
assert(ABILITY_WONDER_GUARD === 25, `ABILITY_WONDER_GUARD drifted to ${ABILITY_WONDER_GUARD}`);
assert(
  SUCCESS_ABILITY_BOUNDARY_DOMAIN.every((ability) => !FAILURE_ABILITY_DOMAIN.includes(ability)),
  "success ability boundary domain includes a rejected ability",
);
for (const endpoint of [0, U8_MAX]) {
  const projection = freezeProjection([endpoint, endpoint, endpoint, endpoint], endpoint, 0, 1);
  const rules = canonicalRulesFromProjection(projection);
  assert(rules.battlers[0].ability === endpoint, `canonical constructor lost ability endpoint ${endpoint}`);
  assert(rules.lastUsedAbility === endpoint, `canonical constructor lost lastUsedAbility endpoint ${endpoint}`);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(
  instructions.length === 1,
  `expected exactly one ${OPCODE_NAME} instruction, got ${instructions.length}`,
);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, `expected opcode ${OPCODE_ID}, got ${instruction.opcodeId}`);
assert(instruction.dispatcher === DISPATCHER, `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`);
assert(instruction.source.label === ENTRY_LABEL, `expected source label ${ENTRY_LABEL}`);
assert(instruction.operands.length === 1, "canonical opcode must have one failure pointer");
assert(instruction.operands[0]?.widthBytes === 4, "canonical failure pointer must be four bytes");
assert(
  instruction.operands[0]?.expression === "BattleScript_ButItFailed",
  "canonical failure pointer expression drifted",
);

const handlers = opcodeModule.createBattleScriptTrycopyabilityOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical TRYCOPYABILITY handler was not registered");

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "fail-jump";
  throw new Error(`canonical handler returned unsupported control ${transition.control.kind}`);
}

function assertCanonicalStep(priorRules, transition) {
  const attacker = priorRules.selectorRoles.attacker;
  const target = priorRules.selectorRoles.target;
  assert(attacker !== null, "successful canonical handler had no attacker");
  assert(target !== null, "successful canonical handler had no target");
  const ability = priorRules.battlers[target].ability;
  const control = controlFromTransition(transition);
  const nextRules = transition.rulesContext;
  assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");

  if (control === "fail-jump") {
    assert(
      ability === ABILITY_NONE || ability === ABILITY_WONDER_GUARD,
      `canonical fail jump accepted target ability ${ability}`,
    );
    assert(nextRules === priorRules, "canonical failure jump changed complete narrow state");
    return control;
  }

  assert(
    ability !== ABILITY_NONE && ability !== ABILITY_WONDER_GUARD,
    `canonical advance accepted rejected target ability ${ability}`,
  );
  assert(nextRules !== priorRules, "canonical advance reused complete narrow state");
  assert(Object.isFrozen(nextRules.battlers), "canonical output battlers must be frozen");
  assert(
    nextRules.selectorRoles === priorRules.selectorRoles,
    "canonical advance replaced selector role bindings",
  );
  assert(nextRules.battlers !== priorRules.battlers, "canonical advance reused battler array");
  for (const battler of ATTACKER_DOMAIN) {
    if (battler === attacker) {
      assert(
        nextRules.battlers[battler] !== priorRules.battlers[battler],
        `canonical advance did not replace attacker battler ${battler}`,
      );
      assert(
        nextRules.battlers[battler].ability === ability,
        `canonical advance did not copy target ability to attacker ${battler}`,
      );
    } else {
      assert(
        nextRules.battlers[battler] === priorRules.battlers[battler],
        `canonical advance replaced sibling battler ${battler}`,
      );
    }
  }
  assert(nextRules.lastUsedAbility === ability, "canonical advance did not overwrite lastUsedAbility");
  return control;
}

function sourceOutcome(initialProjection, applications) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
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
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(
        sameState(vectorState(currentRules), currentSnapshot),
        "canonical handler mutated current rules",
      );
      controls.push(assertCanonicalStep(currentRules, transition));
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

function branchFor(initial, outcome) {
  if (outcome.error !== null) {
    return initial.attacker === null ? "missing-attacker-role" : "missing-target-role";
  }
  return outcome.controls.join("-then-");
}

const cases = [];
function addCase(label, category, initial, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be one or two`);
  const outcome = sourceOutcome(initial, applications);
  if (initial.attacker === null) {
    assert(
      outcome.error === "Battle Script hit-chain command requires a attacker role",
      `${label}: missing attacker error drifted to ${String(outcome.error)}`,
    );
    assert(outcome.expected === null, `${label}: missing attacker produced output`);
    assert(outcome.controls.length === 0, `${label}: missing attacker produced a control`);
  } else if (initial.target === null) {
    assert(
      outcome.error === "Battle Script hit-chain command requires a target role",
      `${label}: missing target error drifted to ${String(outcome.error)}`,
    );
    assert(outcome.expected === null, `${label}: missing target produced output`);
    assert(outcome.controls.length === 0, `${label}: missing target produced a control`);
  } else {
    assert(outcome.error === null, `${label}: valid roles threw ${String(outcome.error)}`);
    assert(outcome.expected !== null, `${label}: valid roles omitted output`);
    assert(outcome.controls.length === applications, `${label}: application count drifted`);
  }
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(initial, outcome),
    applications,
    initial: vectorState(canonicalRulesFromProjection(initial)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

for (const targetAbility of TARGET_ABILITY_DOMAIN) {
  addCase(
    `non_alias_target_ability_u8_${targetAbility}`,
    "non-alias-target-ability-u8-full-domain",
    makeFullDomainProjection(targetAbility),
  );
}

const pairBranchAbilities = Object.freeze([...FAILURE_ABILITY_DOMAIN, ...SUCCESS_ABILITY_BOUNDARY_DOMAIN]);
const pairAbilityLabels = Object.freeze([
  "none",
  "wonder_guard",
  "one",
  "below_wonder_guard",
  "above_wonder_guard",
  "max",
]);
for (const attacker of ATTACKER_DOMAIN) {
  for (const target of TARGET_DOMAIN) {
    const pairIndex = attacker * TARGET_DOMAIN.length + target;
    for (const [abilityIndex, targetAbility] of pairBranchAbilities.entries()) {
      addCase(
        `pair_a${attacker}_t${target}_${pairAbilityLabels[abilityIndex]}`,
        "attacker-target-pair-failure-success-boundary-matrix",
        makePairProjection({
          attacker,
          target,
          targetAbility,
          lastUsedAbility: LAST_USED_ABILITY_BOUNDARY_DOMAIN[
            (pairIndex + abilityIndex) % LAST_USED_ABILITY_BOUNDARY_DOMAIN.length
          ],
          salt: pairIndex * pairBranchAbilities.length + abilityIndex,
        }),
      );
    }
  }
}

addCase(
  "missing_attacker_and_target_roles_attacker_error_first",
  "ordered-missing-role-errors",
  freezeProjection([17, 255, 1, 25], 26, null, null),
);
addCase(
  "missing_attacker_role_precedes_target_ability_read",
  "ordered-missing-role-errors",
  freezeProjection([17, 255, 1, 25], 24, null, 3),
);
addCase(
  "missing_target_role_after_attacker_resolution",
  "ordered-missing-role-errors",
  freezeProjection([17, 255, 1, 25], 1, 2, null),
);
addCase(
  "success_copy_mutates_only_attacker_and_last_used_ability_preserves_siblings",
  "sibling-preservation",
  freezeProjection([7, 128, 1, 26], 255, 2, 3),
);
addCase(
  "explicit_alias_success_preserves_all_abilities_and_overwrites_last_used_ability",
  "explicit-alias-preservation",
  freezeProjection([7, 128, 1, 26], 0, 3, 3),
);
addCase(
  "repeated_success_copy_advances_twice_and_is_value_idempotent",
  "repeated-success-copy",
  makePairProjection({ attacker: 0, target: 1, targetAbility: 26, lastUsedAbility: 255, salt: 701 }),
  2,
);
addCase(
  "repeated_failure_ability_fail_jumps_twice_and_preserves_complete_state",
  "repeated-failure-preservation",
  makePairProjection({ attacker: 1, target: 2, targetAbility: ABILITY_NONE, lastUsedAbility: 255, salt: 702 }),
  2,
);

const FULL_DOMAIN_CASE_COUNT = TARGET_ABILITY_DOMAIN.length;
const PAIR_BRANCH_MATRIX_CASE_COUNT = ATTACKER_DOMAIN.length * TARGET_DOMAIN.length * pairBranchAbilities.length;
assert(FULL_DOMAIN_CASE_COUNT === 256, `full target-ability domain case count drifted to ${FULL_DOMAIN_CASE_COUNT}`);
assert(PAIR_BRANCH_MATRIX_CASE_COUNT === 96, `pair branch matrix case count drifted to ${PAIR_BRANCH_MATRIX_CASE_COUNT}`);
assert(
  cases.length === FULL_DOMAIN_CASE_COUNT + PAIR_BRANCH_MATRIX_CASE_COUNT + 3 + 1 + 1 + 1 + 1,
  `case count drifted to ${cases.length}`,
);
assert(
  cases.filter((value) => value.category === "non-alias-target-ability-u8-full-domain").length === FULL_DOMAIN_CASE_COUNT,
  "full target ability category count drifted",
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["active-ability-u8-values", U8_MAX + 1],
  ["last-used-ability-u8-values", U8_MAX + 1],
  ["target-ability-full-domain-probes", FULL_DOMAIN_CASE_COUNT],
  ["prior-last-used-ability-boundary-values", LAST_USED_ABILITY_BOUNDARY_DOMAIN.length],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["target-role-values", TARGET_DOMAIN.length],
  ["complete-attacker-target-role-pairs", ATTACKER_DOMAIN.length * TARGET_DOMAIN.length],
  ["failure-ability-values", FAILURE_ABILITY_DOMAIN.length],
  ["success-ability-boundary-values", SUCCESS_ABILITY_BOUNDARY_DOMAIN.length],
  ["attacker-target-pair-branch-matrix-cases", PAIR_BRANCH_MATRIX_CASE_COUNT],
  ["typed-ordered-missing-role-cases", 3],
  ["application-count-values", 2],
  ["party-ability-slot-fields-in-projection", 0],
  ["failure-pointer-fields-in-projection", 0],
  ["absolute-program-counter-fields-in-projection", 0],
  ["abi-exports-added", 0],
  ["unsupported-barriers-added", 0],
  ["generated-file-byte-limit-exclusive", GENERATED_FILE_MAX_BYTES],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  targetDomain: TARGET_DOMAIN,
  targetAbilityDomain: TARGET_ABILITY_DOMAIN,
  failureAbilityDomain: FAILURE_ABILITY_DOMAIN,
  successAbilityBoundaryDomain: SUCCESS_ABILITY_BOUNDARY_DOMAIN,
  lastUsedAbilityBoundaryDomain: LAST_USED_ABILITY_BOUNDARY_DOMAIN,
  fullDomainRolePair: Object.freeze([FULL_DOMAIN_ATTACKER, FULL_DOMAIN_TARGET]),
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
  return `BattleScriptTrycopyabilityBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustState(value) {
  return [
    "BattleScriptTrycopyabilityVectorState {",
    `abilities: [${value.abilities.join(", ")}],`,
    `last_used_ability: ${value.lastUsedAbility},`,
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

function rustControls(values) {
  return "&[" + values.map((value) => (
    value === "advance"
      ? "BattleScriptTrycopyabilityControl::Advance"
      : "BattleScriptTrycopyabilityControl::FailJump"
  )).join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trycopyability-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrycopyabilityOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trycopyability::{");
lines.push("    BattleScriptTrycopyabilityBattler, BattleScriptTrycopyabilityControl,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_ATTACKER_DOMAIN: [u8; ${ATTACKER_DOMAIN.length}] = [${ATTACKER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_TARGET_DOMAIN: [u8; ${TARGET_DOMAIN.length}] = [${TARGET_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_TARGET_ABILITY_DOMAIN: [u8; ${TARGET_ABILITY_DOMAIN.length}] = [${TARGET_ABILITY_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_FAILURE_ABILITY_DOMAIN: [u8; ${FAILURE_ABILITY_DOMAIN.length}] = [${FAILURE_ABILITY_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_SUCCESS_ABILITY_BOUNDARY_DOMAIN: [u8; ${SUCCESS_ABILITY_BOUNDARY_DOMAIN.length}] = [${SUCCESS_ABILITY_BOUNDARY_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_LAST_USED_ABILITY_BOUNDARY_DOMAIN: [u8; ${LAST_USED_ABILITY_BOUNDARY_DOMAIN.length}] = [${LAST_USED_ABILITY_BOUNDARY_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_FULL_DOMAIN_ROLE_PAIR: (u8, u8) = (${FULL_DOMAIN_ATTACKER}, ${FULL_DOMAIN_TARGET});`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrycopyabilityVectorState {");
lines.push("    pub abilities: [u8; 4],");
lines.push("    pub last_used_ability: u8,");
lines.push("    pub attacker: Option<BattleScriptTrycopyabilityBattler>,");
lines.push("    pub target: Option<BattleScriptTrycopyabilityBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrycopyabilityVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptTrycopyabilityVectorState,");
lines.push("    pub expected: Option<BattleScriptTrycopyabilityVectorState>,");
lines.push("    pub controls: &'static [BattleScriptTrycopyabilityControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYCOPYABILITY_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYCOPYABILITY_CASES: [BattleScriptTrycopyabilityVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrycopyabilityVectorCase {");
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
lines.push("];");

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
if (!formatted) throw new Error("gen-battle-script-trycopyability-vectors: could not find rustfmt");

const generated = fs.readFileSync(outPath);
assert(
  generated.byteLength < GENERATED_FILE_MAX_BYTES,
  `generated file is ${generated.byteLength} bytes, not below ${GENERATED_FILE_MAX_BYTES}`,
);
const generatedHash = crypto.createHash("sha256").update(generated).digest("hex");
console.log(`gen-battle-script-trycopyability-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-trycopyability-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-trycopyability-vectors: ${generated.byteLength} generated bytes`);
console.log(`gen-battle-script-trycopyability-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-trycopyability-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-trycopyability-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-trycopyability-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-trycopyability-vectors: generated sha256 ${generatedHash}`);
