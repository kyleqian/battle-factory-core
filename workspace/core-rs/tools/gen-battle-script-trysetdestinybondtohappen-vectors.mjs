#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrysetdestinybondtohappenOpcode.ts.
// Expected complete projected outputs, typed Advance controls, and exact
// attacker-before-target role errors are created only by executing the
// canonical TypeScript opcode handler. This script owns bounded input
// construction and Rust literal emission; it deliberately does not port,
// interpret, or reimplement the canonical helper to create expected values.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysetdestinybondtohappen-vectors.mjs

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
  "battle_script_trysetdestinybondtohappen_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrysetdestinybondtohappenOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSourceConstants.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN";
const OPCODE_ID = 0xab;
const DISPATCHER = "Cmd_trysetdestinybondtohappen";
const ENTRY_LABEL = "BattleScript_EffectOHKO";
const BATTLE_SLOTS = 4;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const TARGET_DOMAIN = ATTACKER_DOMAIN;
const SIDE_DOMAIN = Object.freeze([0, 1]);
const U32_MAX = 0xffff_ffff;
const STATUS2_DESTINY_BOND = sourceConstants.BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND;
const HITMARKER_DESTINYBOND = sourceConstants.BATTLE_SCRIPT_HITMARKER_DESTINYBOND;
const HITMARKER_GRUDGE = sourceConstants.BATTLE_SCRIPT_HITMARKER_GRUDGE;
const GENERATED_FILE_MAX_BYTES = 5_000_000;

// These preserve full u32 storage while staying deliberately compact. The
// predicate matrix below covers its four boolean inputs orthogonally; this
// edge matrix avoids multiplying those dimensions across every role pair.
const STATUS2_EDGE_DOMAIN = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0100_0001,
  0x01ff_ffff,
  0x0200_0000,
  0x0200_0001,
  0xfdff_ffff,
]);
const HIT_MARKER_EDGE_DOMAIN = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0040_0001,
  0x0000_0040,
  0x0100_0000,
  0x0100_0040,
  0xfeff_ffbf,
]);
const UNRELATED_STATUS2_WORDS = Object.freeze([
  0x0000_0001,
  0x8000_0080,
  0x4100_0001,
  0xfdff_ff01,
]);
const UNRELATED_HIT_MARKER_WORDS = Object.freeze([
  0x0000_0001,
  0x8000_0001,
  0x0040_0001,
  0xfeff_ffbf,
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(`gen-battle-script-trysetdestinybondtohappen-vectors: ${message}`);
  }
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertSide(value, label) {
  assert(SIDE_DOMAIN.includes(value), `${label} must be 0 or 1, got ${value}`);
}

function assertU32(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= U32_MAX,
    `${label} must be a u32, got ${value}`,
  );
}

function freezeProjection({ status2, sides, hitMarker, attacker, target }) {
  assert(Array.isArray(status2) && status2.length === BATTLE_SLOTS, "status2 must have four cells");
  assert(Array.isArray(sides) && sides.length === BATTLE_SLOTS, "sides must have four cells");
  status2.forEach((value, index) => assertU32(value, `status2[${index}]`));
  sides.forEach((value, index) => assertSide(value, `sides[${index}]`));
  assertU32(hitMarker, "hitMarker");
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  return Object.freeze({
    status2: Object.freeze(status2.map((value) => value >>> 0)),
    sides: Object.freeze([...sides]),
    hitMarker: hitMarker >>> 0,
    attacker,
    target,
  });
}

function canonicalBattler(side, status2) {
  return Object.freeze({
    side,
    ability: 0,
    hp: 100,
    maxHP: 100,
    moves: Object.freeze([0, 0, 0, 0]),
    pp: Object.freeze([0, 0, 0, 0]),
    status1: 0,
    status2,
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
      projection.sides[battler],
      projection.status2[battler],
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
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: projection.hitMarker,
    multiHitCounter: 0,
    lastUsedAbility: 0,
  });
}

function vectorState(rules) {
  return Object.freeze({
    status2: Object.freeze(rules.battlers.map((battler) => battler.status2 >>> 0)),
    sides: Object.freeze(rules.battlers.map((battler) => battler.side)),
    hitMarker: rules.hitMarker >>> 0,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function clearMask(word, mask) {
  return (word & ~mask) >>> 0;
}

function makePairProjection({
  attacker,
  target,
  targetHasDestinyBond,
  oppositeSides,
  grudgeSet,
  priorDestinyBondMarkerSet,
  attackerSide,
  salt,
}) {
  assertBattler(attacker, "pair attacker");
  assertBattler(target, "pair target");
  assert(typeof targetHasDestinyBond === "boolean", "targetHasDestinyBond must be boolean");
  assert(typeof oppositeSides === "boolean", "oppositeSides must be boolean");
  assert(typeof grudgeSet === "boolean", "grudgeSet must be boolean");
  assert(typeof priorDestinyBondMarkerSet === "boolean", "prior marker must be boolean");
  assertSide(attackerSide, "pair attacker side");
  assert(attacker !== target || !oppositeSides, "a battler cannot have opposite sides from itself");

  const status2 = ATTACKER_DOMAIN.map((battler) => (
    UNRELATED_STATUS2_WORDS[(battler + salt) % UNRELATED_STATUS2_WORDS.length]
  ));
  const sides = ATTACKER_DOMAIN.map((battler) => ((battler + salt) & 1));
  sides[attacker] = attackerSide;
  sides[target] = attacker === target
    ? attackerSide
    : (attackerSide ^ (oppositeSides ? 1 : 0));

  const targetBase = clearMask(
    UNRELATED_STATUS2_WORDS[salt % UNRELATED_STATUS2_WORDS.length],
    STATUS2_DESTINY_BOND,
  );
  status2[target] = (targetBase | (targetHasDestinyBond ? STATUS2_DESTINY_BOND : 0)) >>> 0;
  const markerBase = clearMask(
    UNRELATED_HIT_MARKER_WORDS[salt % UNRELATED_HIT_MARKER_WORDS.length],
    HITMARKER_DESTINYBOND | HITMARKER_GRUDGE,
  );
  const hitMarker = (
    markerBase
    | (grudgeSet ? HITMARKER_GRUDGE : 0)
    | (priorDestinyBondMarkerSet ? HITMARKER_DESTINYBOND : 0)
  ) >>> 0;
  return freezeProjection({ status2, sides, hitMarker, attacker, target });
}

function makeEdgeProjection({ attacker, target, targetStatus2, hitMarker, attackerSide, salt }) {
  assertBattler(attacker, "edge attacker");
  assertBattler(target, "edge target");
  assert(attacker !== target, "edge roles must be non-alias");
  assertU32(targetStatus2, "edge target status2");
  assertU32(hitMarker, "edge hitMarker");
  assertSide(attackerSide, "edge attacker side");
  const status2 = ATTACKER_DOMAIN.map((battler) => (
    UNRELATED_STATUS2_WORDS[(battler + salt) % UNRELATED_STATUS2_WORDS.length]
  ));
  const sides = ATTACKER_DOMAIN.map((battler) => ((battler + salt) & 1));
  sides[attacker] = attackerSide;
  sides[target] = attackerSide ^ 1;
  status2[target] = targetStatus2 >>> 0;
  return freezeProjection({ status2, sides, hitMarker, attacker, target });
}

assert(STATUS2_DESTINY_BOND === 0x0200_0000, `STATUS2_DESTINY_BOND drifted to ${STATUS2_DESTINY_BOND}`);
assert(HITMARKER_DESTINYBOND === 0x0000_0040, `HITMARKER_DESTINYBOND drifted to ${HITMARKER_DESTINYBOND}`);
assert(HITMARKER_GRUDGE === 0x0100_0000, `HITMARKER_GRUDGE drifted to ${HITMARKER_GRUDGE}`);
for (const value of [...STATUS2_EDGE_DOMAIN, ...HIT_MARKER_EDGE_DOMAIN]) assertU32(value, "edge domain value");

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === 2, `expected exactly two ${OPCODE_NAME} instructions, got ${instructions.length}`);
assert(
  instructions.map((candidate) => candidate.source.label).join(",")
    === "BattleScript_EffectOHKO,BattleScript_PursuitSwitchDmgLoop",
  "canonical TrySetDestinyBond call-site labels drifted",
);
const instruction = instructions.find((candidate) => candidate.source.label === ENTRY_LABEL);
assert(instruction !== undefined, `missing ${ENTRY_LABEL} ${OPCODE_NAME} instruction`);
assert(instruction.opcodeId === OPCODE_ID, `expected opcode ${OPCODE_ID}, got ${instruction.opcodeId}`);
assert(instruction.dispatcher === DISPATCHER, `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`);
assert(instruction.source.label === ENTRY_LABEL, `expected source label ${ENTRY_LABEL}`);
assert(instruction.operands.length === 0, "canonical opcode must have no operands");

const handlers = opcodeModule.createBattleScriptTrysetdestinybondtohappenOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical TRYSETDESTINYBONDTOHAPPEN handler was not registered");

function assertCanonicalStep(priorRules, transition) {
  const attacker = priorRules.selectorRoles.attacker;
  const target = priorRules.selectorRoles.target;
  assert(attacker !== null, "successful canonical handler had no attacker");
  assert(target !== null, "successful canonical handler had no target");
  assert(transition.control.kind === "advance", "canonical handler did not advance");
  assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
  const targetHasDestinyBond = (
    priorRules.battlers[target].status2 & STATUS2_DESTINY_BOND
  ) !== 0;
  const oppositeSides = priorRules.battlers[attacker].side !== priorRules.battlers[target].side;
  const grudgeSet = (priorRules.hitMarker & HITMARKER_GRUDGE) !== 0;
  const shouldSet = targetHasDestinyBond && oppositeSides && !grudgeSet;
  const expectedHitMarker = shouldSet
    ? ((priorRules.hitMarker | HITMARKER_DESTINYBOND) >>> 0)
    : priorRules.hitMarker;
  assert(
    transition.rulesContext.hitMarker === expectedHitMarker,
    "canonical helper produced an unexpected hitMarker",
  );
  assert(
    transition.rulesContext.selectorRoles === priorRules.selectorRoles,
    "canonical handler replaced selector roles",
  );
  assert(
    transition.rulesContext.battlers === priorRules.battlers,
    "canonical helper replaced a battler collection",
  );
  if (shouldSet) {
    assert(transition.rulesContext !== priorRules, "canonical marker write reused rules state");
  } else {
    assert(transition.rulesContext === priorRules, "canonical no-write branch replaced rules state");
  }
  return "advance";
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
  if (outcome.error === null) return outcome.controls.join("-then-");
  return initial.attacker === null ? "missing-attacker-role" : "missing-target-role";
}

const cases = [];
function addCase(label, category, initial, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be one or two`);
  const outcome = sourceOutcome(initial, applications);
  if (initial.attacker === null) {
    assert(
      outcome.error === "Cmd_trysetdestinybondtohappen requires a attacker role",
      `${label}: missing attacker error drifted to ${String(outcome.error)}`,
    );
    assert(outcome.expected === null, `${label}: missing attacker produced output`);
    assert(outcome.controls.length === 0, `${label}: missing attacker produced control`);
  } else if (initial.target === null) {
    assert(
      outcome.error === "Cmd_trysetdestinybondtohappen requires a target role",
      `${label}: missing target error drifted to ${String(outcome.error)}`,
    );
    assert(outcome.expected === null, `${label}: missing target produced output`);
    assert(outcome.controls.length === 0, `${label}: missing target produced control`);
  } else {
    assert(outcome.error === null, `${label}: valid roles threw ${String(outcome.error)}`);
    assert(outcome.expected !== null, `${label}: valid roles omitted output`);
    assert(outcome.controls.length === applications, `${label}: application count drifted`);
    assert(
      outcome.controls.every((control) => control === "advance"),
      `${label}: valid roles did not always advance`,
    );
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

// One case per role pair. It deliberately rotates non-cartesian predicate
// inputs; the next 16-case matrix covers every predicate combination itself.
for (const attacker of ATTACKER_DOMAIN) {
  for (const target of TARGET_DOMAIN) {
    const pairIndex = attacker * TARGET_DOMAIN.length + target;
    const targetHasDestinyBond = (pairIndex & 1) !== 0;
    const oppositeSides = attacker !== target && (pairIndex & 2) !== 0;
    const grudgeSet = (pairIndex & 4) !== 0;
    const priorDestinyBondMarkerSet = (pairIndex & 8) !== 0;
    addCase(
      `role_pair_a${attacker}_t${target}`,
      "complete-attacker-target-role-pair-matrix",
      makePairProjection({
        attacker,
        target,
        targetHasDestinyBond,
        oppositeSides,
        grudgeSet,
        priorDestinyBondMarkerSet,
        attackerSide: pairIndex & 1,
        salt: pairIndex,
      }),
    );
  }
}

// This is the complete 2^4 predicate matrix on one non-alias role pair. It
// proves the predicate without multiplying it by all 16 role pairs.
for (let combination = 0; combination < 16; combination += 1) {
  const targetHasDestinyBond = (combination & 1) !== 0;
  const oppositeSides = (combination & 2) !== 0;
  const grudgeSet = (combination & 4) !== 0;
  const priorDestinyBondMarkerSet = (combination & 8) !== 0;
  addCase(
    `predicate_combination_${combination.toString(2).padStart(4, "0")}`,
    "target_side_grudge_prior_marker-orthogonal-predicate-matrix",
    makePairProjection({
      attacker: 0,
      target: 1,
      targetHasDestinyBond,
      oppositeSides,
      grudgeSet,
      priorDestinyBondMarkerSet,
      attackerSide: (combination >> 2) & 1,
      salt: 32 + combination,
    }),
  );
}

for (const [edgeIndex, targetStatus2] of STATUS2_EDGE_DOMAIN.entries()) {
  const attacker = (edgeIndex + 1) % BATTLE_SLOTS;
  const target = (edgeIndex + 2) % BATTLE_SLOTS;
  addCase(
    `u32_edges_${edgeIndex}`,
    "status2-and-hit-marker-u32-edge-matrix",
    makeEdgeProjection({
      attacker,
      target,
      targetStatus2,
      hitMarker: HIT_MARKER_EDGE_DOMAIN[edgeIndex],
      attackerSide: edgeIndex & 1,
      salt: 64 + edgeIndex,
    }),
  );
}

addCase(
  "missing_attacker_and_target_roles_attacker_error_first",
  "ordered-missing-role-errors",
  freezeProjection({
    status2: [U32_MAX, 0x0200_0000, 0x8000_0000, 0x0100_0001],
    sides: [0, 1, 0, 1],
    hitMarker: U32_MAX,
    attacker: null,
    target: null,
  }),
);
addCase(
  "missing_attacker_role_precedes_target_status2_and_hit_marker_read",
  "ordered-missing-role-errors",
  freezeProjection({
    status2: [0x0000_0001, U32_MAX, 0x0200_0001, 0x8000_0000],
    sides: [1, 0, 1, 0],
    hitMarker: 0x0100_0040,
    attacker: null,
    target: 3,
  }),
);
addCase(
  "missing_target_role_after_attacker_resolution",
  "ordered-missing-role-errors",
  freezeProjection({
    status2: [0x0200_0001, 0x8000_0000, U32_MAX, 0x0000_0001],
    sides: [0, 1, 0, 1],
    hitMarker: 0x8000_0001,
    attacker: 2,
    target: null,
  }),
);
addCase(
  "eligible_marker_write_preserves_all_siblings_sides_roles_and_unrelated_bits",
  "sibling-preservation",
  freezeProjection({
    status2: [0x8000_0001, 0x4100_0001, 0x0200_0081, U32_MAX],
    sides: [0, 1, 0, 1],
    hitMarker: 0x8040_0001,
    attacker: 3,
    target: 2,
  }),
);
addCase(
  "same_side_target_destiny_bond_never_sets_hit_marker",
  "same-side-preservation",
  freezeProjection({
    status2: [0x0200_0001, 0x8000_0000, 0x4100_0001, U32_MAX],
    sides: [0, 0, 1, 1],
    hitMarker: 0x8000_0001,
    attacker: 0,
    target: 1,
  }),
);
addCase(
  "alias_target_destiny_bond_never_sets_hit_marker",
  "alias-preservation",
  freezeProjection({
    status2: [0x8000_0001, 0x4100_0001, 0x0200_0081, U32_MAX],
    sides: [0, 1, 1, 0],
    hitMarker: 0x0040_0001,
    attacker: 2,
    target: 2,
  }),
);
addCase(
  "repeated_eligible_application_advances_twice_and_marker_is_idempotent",
  "repeated-eligible-idempotence",
  makePairProjection({
    attacker: 0,
    target: 1,
    targetHasDestinyBond: true,
    oppositeSides: true,
    grudgeSet: false,
    priorDestinyBondMarkerSet: false,
    attackerSide: 0,
    salt: 96,
  }),
  2,
);
addCase(
  "repeated_grudge_blocked_application_advances_twice_and_preserves_state",
  "repeated-grudge-blocked-preservation",
  makePairProjection({
    attacker: 1,
    target: 2,
    targetHasDestinyBond: true,
    oppositeSides: true,
    grudgeSet: true,
    priorDestinyBondMarkerSet: false,
    attackerSide: 1,
    salt: 97,
  }),
  2,
);

const ROLE_PAIR_MATRIX_CASE_COUNT = ATTACKER_DOMAIN.length * TARGET_DOMAIN.length;
const PREDICATE_MATRIX_CASE_COUNT = 16;
assert(ROLE_PAIR_MATRIX_CASE_COUNT === 16, `role pair count drifted to ${ROLE_PAIR_MATRIX_CASE_COUNT}`);
assert(PREDICATE_MATRIX_CASE_COUNT === 16, `predicate matrix count drifted to ${PREDICATE_MATRIX_CASE_COUNT}`);
assert(cases.length === 48, `case count drifted to ${cases.length}`);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["source-side-values", SIDE_DOMAIN.length],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["target-role-values", TARGET_DOMAIN.length],
  ["optional-attacker-role-values", ATTACKER_DOMAIN.length + 1],
  ["optional-target-role-values", TARGET_DOMAIN.length + 1],
  ["complete-attacker-target-role-pairs", ROLE_PAIR_MATRIX_CASE_COUNT],
  ["status2-u32-values", U32_MAX + 1],
  ["hit-marker-u32-values", U32_MAX + 1],
  ["target-destiny-bond-clear-set-inputs", 2],
  ["attacker-target-side-relations", 2],
  ["grudge-clear-set-inputs", 2],
  ["prior-destiny-bond-marker-clear-set-inputs", 2],
  ["orthogonal-predicate-combinations", PREDICATE_MATRIX_CASE_COUNT],
  ["status2-u32-edge-values", STATUS2_EDGE_DOMAIN.length],
  ["hit-marker-u32-edge-values", HIT_MARKER_EDGE_DOMAIN.length],
  ["typed-ordered-missing-role-cases", 3],
  ["application-count-values", 2],
  ["instruction-operands-in-projection", 0],
  ["absolute-program-counter-fields-in-projection", 0],
  ["abi-exports-added", 0],
  ["unsupported-barriers-added", 0],
  ["generated-file-byte-limit-exclusive", GENERATED_FILE_MAX_BYTES],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  targetDomain: TARGET_DOMAIN,
  sideDomain: SIDE_DOMAIN,
  status2DestinyBondMask: STATUS2_DESTINY_BOND,
  hitMarkerDestinyBondMask: HITMARKER_DESTINYBOND,
  hitMarkerGrudgeMask: HITMARKER_GRUDGE,
  status2EdgeDomain: STATUS2_EDGE_DOMAIN,
  hitMarkerEdgeDomain: HIT_MARKER_EDGE_DOMAIN,
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
  return `BattleScriptTrysetdestinybondtohappenBattler::Battler${value}`;
}

function rustSide(value) {
  return `BattleScriptTrysetdestinybondtohappenSide::Side${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustControls(values) {
  return `&[${values.map(() => "BattleScriptTrysetdestinybondtohappenControl::Advance").join(", ")}]`;
}

function rustState(value) {
  return [
    "BattleScriptTrysetdestinybondtohappenVectorState {",
    `status2: [${value.status2.map(rustU32).join(", ")}],`,
    `sides: [${value.sides.map(rustSide).join(", ")}],`,
    `hit_marker: ${rustU32(value.hitMarker)},`,
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
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysetdestinybondtohappen-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrysetdestinybondtohappenOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysetdestinybondtohappen::{");
lines.push("    BattleScriptTrysetdestinybondtohappenBattler, BattleScriptTrysetdestinybondtohappenControl,");
lines.push("    BattleScriptTrysetdestinybondtohappenSide,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_ATTACKER_DOMAIN: [u8; ${ATTACKER_DOMAIN.length}] = [${ATTACKER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_TARGET_DOMAIN: [u8; ${TARGET_DOMAIN.length}] = [${TARGET_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_SIDE_DOMAIN: [u8; ${SIDE_DOMAIN.length}] = [${SIDE_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_STATUS2_EDGE_DOMAIN: [u32; ${STATUS2_EDGE_DOMAIN.length}] = [${STATUS2_EDGE_DOMAIN.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_HIT_MARKER_EDGE_DOMAIN: [u32; ${HIT_MARKER_EDGE_DOMAIN.length}] = [${HIT_MARKER_EDGE_DOMAIN.map(rustU32).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetdestinybondtohappenVectorState {");
lines.push("    pub status2: [u32; 4],");
lines.push("    pub sides: [BattleScriptTrysetdestinybondtohappenSide; 4],");
lines.push("    pub hit_marker: u32,");
lines.push("    pub attacker: Option<BattleScriptTrysetdestinybondtohappenBattler>,");
lines.push("    pub target: Option<BattleScriptTrysetdestinybondtohappenBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetdestinybondtohappenVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptTrysetdestinybondtohappenVectorState,");
lines.push("    pub expected: Option<BattleScriptTrysetdestinybondtohappenVectorState>,");
lines.push("    pub controls: &'static [BattleScriptTrysetdestinybondtohappenControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_CASES: [BattleScriptTrysetdestinybondtohappenVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetdestinybondtohappenVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-trysetdestinybondtohappen-vectors: could not find rustfmt");

const generatedBytes = fs.statSync(outPath).size;
assert(
  generatedBytes < GENERATED_FILE_MAX_BYTES,
  `generated Rust is ${generatedBytes} bytes, must stay below ${GENERATED_FILE_MAX_BYTES}`,
);
const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(
  `gen-battle-script-trysetdestinybondtohappen-vectors: wrote ${path.relative(workspaceRoot, outPath)}`,
);
console.log(`gen-battle-script-trysetdestinybondtohappen-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-trysetdestinybondtohappen-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-trysetdestinybondtohappen-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-trysetdestinybondtohappen-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-trysetdestinybondtohappen-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-trysetdestinybondtohappen-vectors: generated bytes ${generatedBytes}`);
console.log(`gen-battle-script-trysetdestinybondtohappen-vectors: generated sha256 ${generatedHash}`);
