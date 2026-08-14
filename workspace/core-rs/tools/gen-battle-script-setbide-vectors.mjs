#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSetbideOpcode.ts.
// Expected controls, outputs, and errors are created only by executing the
// canonical TypeScript opcode handler; this script owns bounded input
// construction and Rust literal emission. The emitted Rust control deliberately
// omits the canonical machine's program-counter increment.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-setbide-vectors.mjs

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
  "battle_script_setbide_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSetbideOpcode.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSourceConstants.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETBIDE";
const OPCODE_ID = 0x8b;
const DISPATCHER = "Cmd_setbide";
const ENTRY_LABEL = "BattleScript_EffectBide";
const BATTLE_SLOTS = 4;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const U16_MAX = 0xffff;
const U32_MAX = 0xffff_ffff;
const I32_MIN = -0x8000_0000;
const I32_MAX = 0x7fff_ffff;
const STATUS2_BIDE = sourceConstants.BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE;
const STATUS2_MULTIPLETURNS = sourceConstants.BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS;
const STATUS2_BIDE_TURN_2 = 2 << 8;
const STATUS2_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x0100_0001,
  0xffff_ecff,
  0x0000_0100,
  0x0000_0200,
  0x0000_0300,
  STATUS2_MULTIPLETURNS,
  STATUS2_MULTIPLETURNS | 0x0000_0100,
  STATUS2_MULTIPLETURNS | 0x0000_0200,
  STATUS2_MULTIPLETURNS | 0x0000_0300,
]);
const BIDE_COUNTER_INPUTS = Object.freeze([0, 1, 2, 3]);
const U16_EDGE_VALUES = Object.freeze([0x0000, 0x0001, 0x0075, 0x7fff, 0x8000, U16_MAX]);
const I32_EDGE_VALUES = Object.freeze([I32_MIN, -1, 0, 1, I32_MAX]);
const ROLE_VARIANTS = Object.freeze([
  Object.freeze({ target: null, effectBattler: null, fainted: null }),
  Object.freeze({ target: 0, effectBattler: 1, fainted: 2 }),
  Object.freeze({ target: 1, effectBattler: 2, fainted: 3 }),
  Object.freeze({ target: 2, effectBattler: 3, fainted: 0 }),
  Object.freeze({ target: 3, effectBattler: 0, fainted: 1 }),
]);
const SIBLING_STATUS2 = Object.freeze([0x0123_4567, 0x89ab_cdef, 0x4000_1000, 0x0000_0c01]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-setbide-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU16(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= U16_MAX,
    `${label} must be a u16, got ${value}`,
  );
}

function assertU32(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= U32_MAX,
    `${label} must be a u32, got ${value}`,
  );
}

function assertI32(value, label) {
  assert(
    Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX,
    `${label} must be a signed i32, got ${value}`,
  );
}

function freezeRules({
  status2,
  currentMove,
  lockedMoves,
  bideDmg,
  bideTarget,
  roles,
}) {
  assert(Array.isArray(status2) && status2.length === BATTLE_SLOTS, "status2 must have four cells");
  assert(Array.isArray(lockedMoves) && lockedMoves.length === BATTLE_SLOTS, "lockedMoves must have four cells");
  assert(Array.isArray(bideDmg) && bideDmg.length === BATTLE_SLOTS, "bideDmg must have four cells");
  assert(Array.isArray(bideTarget) && bideTarget.length === BATTLE_SLOTS, "bideTarget must have four cells");
  status2.forEach((value, index) => assertU32(value, `status2[${index}]`));
  assertU16(currentMove, "currentMove");
  lockedMoves.forEach((value, index) => assertU16(value, `lockedMoves[${index}]`));
  bideDmg.forEach((value, index) => assertI32(value, `bideDmg[${index}]`));
  bideTarget.forEach((value, index) => assertBattler(value, `bideTarget[${index}]`));
  assertOptionalBattler(roles.attacker, "attacker role");
  assertOptionalBattler(roles.target, "target role");
  assertOptionalBattler(roles.effectBattler, "effectBattler role");
  assertOptionalBattler(roles.fainted, "fainted role");
  return Object.freeze({
    battlers: Object.freeze(status2.map((value) => Object.freeze({ status2: value >>> 0 }))),
    currentMove,
    lockedMoves: Object.freeze([...lockedMoves]),
    bideDmg: Object.freeze([...bideDmg]),
    bideTarget: Object.freeze([...bideTarget]),
    selectorRoles: Object.freeze({
      attacker: roles.attacker,
      target: roles.target,
      effectBattler: roles.effectBattler,
      fainted: roles.fainted,
    }),
  });
}

function u16Edge(salt) {
  return U16_EDGE_VALUES[salt % U16_EDGE_VALUES.length];
}

function i32Edge(salt) {
  return I32_EDGE_VALUES[salt % I32_EDGE_VALUES.length];
}

function makeInitialRules({
  attacker,
  focusBattler,
  focusStatus2 = 0x4000_0001,
  currentMove = 0x0075,
  focusLockedMove = 0x1234,
  focusBideDmg = 17,
  focusBideTarget,
  target,
  effectBattler,
  fainted,
  salt,
}) {
  assertOptionalBattler(attacker, "initial attacker");
  assertBattler(focusBattler, "initial focus battler");
  assertU32(focusStatus2, "initial focus status2");
  assertU16(currentMove, "initial currentMove");
  assertU16(focusLockedMove, "initial focus locked move");
  assertI32(focusBideDmg, "initial focus Bide damage");
  const resolvedTarget = target ?? ROLE_VARIANTS[salt % ROLE_VARIANTS.length].target;
  const resolvedEffectBattler = effectBattler
    ?? ROLE_VARIANTS[salt % ROLE_VARIANTS.length].effectBattler;
  const resolvedFainted = fainted ?? ROLE_VARIANTS[salt % ROLE_VARIANTS.length].fainted;
  assertOptionalBattler(resolvedTarget, "initial target role");
  assertOptionalBattler(resolvedEffectBattler, "initial effectBattler role");
  assertOptionalBattler(resolvedFainted, "initial fainted role");
  const status2 = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler
      ? focusStatus2
      : SIBLING_STATUS2[(battler + salt) % SIBLING_STATUS2.length]
  ));
  const lockedMoves = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler ? focusLockedMove : u16Edge(salt + battler + 1)
  ));
  const bideDmg = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler ? focusBideDmg : i32Edge(salt + battler + 1)
  ));
  const bideTarget = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler && focusBideTarget !== undefined
      ? focusBideTarget
      : BATTLER_DOMAIN[(battler + salt + 1) % BATTLER_DOMAIN.length]
  ));
  return freezeRules({
    status2,
    currentMove,
    lockedMoves,
    bideDmg,
    bideTarget,
    roles: {
      attacker,
      target: resolvedTarget,
      effectBattler: resolvedEffectBattler,
      fainted: resolvedFainted,
    },
  });
}

function vectorState(rules) {
  return Object.freeze({
    status2: Object.freeze(rules.battlers.map((battler) => battler.status2 >>> 0)),
    currentMove: rules.currentMove,
    lockedMoves: Object.freeze([...rules.lockedMoves]),
    bideDmg: Object.freeze([...rules.bideDmg]),
    bideTarget: Object.freeze([...rules.bideTarget]),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
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
assert(STATUS2_BIDE === 0x0000_0300, `STATUS2_BIDE drifted to ${STATUS2_BIDE}`);
assert(STATUS2_MULTIPLETURNS === 0x0000_1000, `STATUS2_MULTIPLETURNS drifted to ${STATUS2_MULTIPLETURNS}`);
assert(STATUS2_BIDE_TURN_2 === 0x0000_0200, `STATUS2_BIDE_TURN(2) drifted to ${STATUS2_BIDE_TURN_2}`);

const handlers = opcodeModule.createBattleScriptSetbideOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETBIDE handler was not registered");

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
      assert(transition.control.kind === "advance", "canonical handler did not advance");
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      assert(transition.rulesContext !== currentRules, "canonical advance reused the complete narrow state");

      const attacker = currentRules.selectorRoles.attacker;
      assert(attacker !== null, "successful canonical handler had no attacker");
      assert(
        transition.rulesContext.selectorRoles === currentRules.selectorRoles,
        "canonical advance replaced selector roles",
      );
      assert(
        transition.rulesContext.bideTarget === currentRules.bideTarget,
        "canonical advance replaced saved Bide targets",
      );
      assert(
        transition.rulesContext.currentMove === currentRules.currentMove,
        "canonical advance changed currentMove",
      );
      assert(Object.isFrozen(transition.rulesContext.battlers), "canonical output battlers must be frozen");
      assert(Object.isFrozen(transition.rulesContext.lockedMoves), "canonical output lockedMoves must be frozen");
      assert(Object.isFrozen(transition.rulesContext.bideDmg), "canonical output bideDmg must be frozen");
      for (const battler of BATTLER_DOMAIN) {
        if (battler === attacker) {
          assert(
            transition.rulesContext.battlers[battler].status2
              === ((currentRules.battlers[battler].status2
                | STATUS2_MULTIPLETURNS
                | STATUS2_BIDE_TURN_2) >>> 0),
            "canonical advance did not OR Bide status bits into attacker",
          );
          assert(
            transition.rulesContext.lockedMoves[battler] === currentRules.currentMove,
            "canonical advance did not overwrite attacker locked move",
          );
          assert(
            transition.rulesContext.bideDmg[battler] === 0,
            "canonical advance did not zero attacker Bide damage",
          );
        } else {
          assert(
            transition.rulesContext.battlers[battler] === currentRules.battlers[battler],
            `canonical advance replaced non-attacker battler ${battler}`,
          );
          assert(
            transition.rulesContext.lockedMoves[battler] === currentRules.lockedMoves[battler],
            `canonical advance changed non-attacker locked move ${battler}`,
          );
          assert(
            transition.rulesContext.bideDmg[battler] === currentRules.bideDmg[battler],
            `canonical advance changed non-attacker Bide damage ${battler}`,
          );
        }
        assert(
          transition.rulesContext.bideTarget[battler] === currentRules.bideTarget[battler],
          `canonical advance changed saved Bide target ${battler}`,
        );
      }
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
  const branch = branchFor(outcome);
  if (initialRules.selectorRoles.attacker === null) {
    assert(branch === "missing-attacker-role", `${label}: missing attacker must throw first`);
    assert(outcome.expected === null, `${label}: missing attacker unexpectedly produced output`);
    assert(outcome.controls.length === 0, `${label}: missing attacker unexpectedly advanced`);
  } else {
    assert(outcome.error === null, `${label}: valid attacker threw ${outcome.error}`);
    assert(outcome.expected !== null, `${label}: valid attacker omitted output`);
    assert(
      outcome.controls.length === applications && outcome.controls.every((control) => control === "advance"),
      `${label}: valid attacker did not advance exactly ${applications} time(s)`,
    );
  }
  cases.push(Object.freeze({
    label,
    category,
    branch,
    applications,
    initial: vectorState(initialRules),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

const status2EdgeLabels = [
  "zero",
  "u32_max",
  "high_bit",
  "unrelated_bits",
  "all_except_bide_multi",
  "bide_turn_1",
  "bide_turn_2",
  "bide_turn_3",
  "multi_only",
  "multi_bide_turn_1",
  "multi_bide_turn_2",
  "multi_bide_turn_3",
];
for (const attacker of BATTLER_DOMAIN) {
  for (const [edgeIndex, status2] of STATUS2_EDGE_VALUES.entries()) {
    addCase(
      `status2_edge_a${attacker}_${status2EdgeLabels[edgeIndex]}`,
      "packed-status2-edge-matrix",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus2: status2,
        currentMove: u16Edge(attacker + edgeIndex),
        focusLockedMove: u16Edge(attacker + edgeIndex + 1),
        focusBideDmg: i32Edge(attacker + edgeIndex),
        salt: attacker * STATUS2_EDGE_VALUES.length + edgeIndex,
      }),
    );
  }
}

for (const attacker of BATTLER_DOMAIN) {
  for (const [currentIndex, currentMove] of U16_EDGE_VALUES.entries()) {
    for (const [lockedIndex, lockedMove] of U16_EDGE_VALUES.entries()) {
      addCase(
        `current_locked_a${attacker}_current_${currentIndex}_locked_${lockedIndex}`,
        "current-locked-u16-overwrite-matrix",
        makeInitialRules({
          attacker,
          focusBattler: attacker,
          focusStatus2: SIBLING_STATUS2[(attacker + currentIndex + lockedIndex) % SIBLING_STATUS2.length],
          currentMove,
          focusLockedMove: lockedMove,
          focusBideDmg: i32Edge(currentIndex + lockedIndex),
          salt: 100 + attacker * U16_EDGE_VALUES.length ** 2 + currentIndex * U16_EDGE_VALUES.length + lockedIndex,
        }),
      );
    }
  }
}

for (const attacker of BATTLER_DOMAIN) {
  for (const [damageIndex, bideDmg] of I32_EDGE_VALUES.entries()) {
    addCase(
      `bide_damage_a${attacker}_${damageIndex}`,
      "bide-damage-signed-i32-edge-matrix",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus2: STATUS2_EDGE_VALUES[(attacker + damageIndex) % STATUS2_EDGE_VALUES.length],
        currentMove: u16Edge(damageIndex + 2),
        focusLockedMove: u16Edge(damageIndex + 3),
        focusBideDmg: bideDmg,
        salt: 500 + attacker * I32_EDGE_VALUES.length + damageIndex,
      }),
    );
  }
}

for (const attacker of BATTLER_DOMAIN) {
  for (const savedTarget of BATTLER_DOMAIN) {
    addCase(
      `saved_target_a${attacker}_value_${savedTarget}`,
      "saved-target-battler-preservation-matrix",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus2: STATUS2_EDGE_VALUES[(attacker + savedTarget) % STATUS2_EDGE_VALUES.length],
        currentMove: u16Edge(savedTarget),
        focusLockedMove: u16Edge(savedTarget + 1),
        focusBideDmg: i32Edge(savedTarget),
        focusBideTarget: savedTarget,
        salt: 700 + attacker * BATTLER_DOMAIN.length + savedTarget,
      }),
    );
  }
}

for (const attacker of BATTLER_DOMAIN) {
  for (const [variantIndex, roles] of ROLE_VARIANTS.entries()) {
    addCase(
      `selector_roles_a${attacker}_variant_${variantIndex}`,
      "selector-role-preservation-matrix",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus2: STATUS2_EDGE_VALUES[(attacker + variantIndex) % STATUS2_EDGE_VALUES.length],
        currentMove: u16Edge(variantIndex),
        focusLockedMove: u16Edge(variantIndex + 1),
        focusBideDmg: i32Edge(variantIndex),
        target: roles.target,
        effectBattler: roles.effectBattler,
        fainted: roles.fainted,
        salt: 900 + attacker * ROLE_VARIANTS.length + variantIndex,
      }),
    );
  }
}

for (const attacker of BATTLER_DOMAIN) {
  for (const counter of BIDE_COUNTER_INPUTS) {
    addCase(
      `repeated_a${attacker}_preexisting_bide_${counter}`,
      "repetition-state-idempotence",
      makeInitialRules({
        attacker,
        focusBattler: attacker,
        focusStatus2: (counter << 8) | (counter & 1 ? STATUS2_MULTIPLETURNS : 0),
        currentMove: u16Edge(counter + 1),
        focusLockedMove: u16Edge(counter + 2),
        focusBideDmg: i32Edge(counter + 1),
        salt: 1100 + attacker * BIDE_COUNTER_INPUTS.length + counter,
      }),
      2,
    );
  }
}

addCase(
  "overwrite_distinct_locked_move",
  "overwrite-vs-preserve-boundaries",
  makeInitialRules({
    attacker: 0,
    focusBattler: 0,
    focusStatus2: 0x4000_0001,
    currentMove: U16_MAX,
    focusLockedMove: 0,
    focusBideDmg: I32_MIN,
    focusBideTarget: 3,
    salt: 1300,
  }),
);
addCase(
  "overwrite_matching_locked_move_value",
  "overwrite-vs-preserve-boundaries",
  makeInitialRules({
    attacker: 1,
    focusBattler: 1,
    focusStatus2: 0x0000_0300,
    currentMove: U16_MAX,
    focusLockedMove: U16_MAX,
    focusBideDmg: 0,
    focusBideTarget: 2,
    salt: 1301,
  }),
);
addCase(
  "zero_nonzero_bide_damage",
  "overwrite-vs-preserve-boundaries",
  makeInitialRules({
    attacker: 2,
    focusBattler: 2,
    focusStatus2: 0x8000_0100,
    currentMove: 0,
    focusLockedMove: 1,
    focusBideDmg: I32_MAX,
    focusBideTarget: 1,
    salt: 1302,
  }),
);
addCase(
  "preserve_zero_bide_damage",
  "overwrite-vs-preserve-boundaries",
  makeInitialRules({
    attacker: 3,
    focusBattler: 3,
    focusStatus2: STATUS2_MULTIPLETURNS | 0x0000_0200,
    currentMove: 0x0075,
    focusLockedMove: 0x0075,
    focusBideDmg: 0,
    focusBideTarget: 0,
    salt: 1303,
  }),
);

for (const [variantIndex, roles] of ROLE_VARIANTS.entries()) {
  addCase(
    `missing_attacker_variant_${variantIndex}`,
    "missing-attacker-role",
    makeInitialRules({
      attacker: null,
      focusBattler: variantIndex % BATTLE_SLOTS,
      focusStatus2: STATUS2_EDGE_VALUES[variantIndex],
      currentMove: u16Edge(variantIndex),
      focusLockedMove: u16Edge(variantIndex + 1),
      focusBideDmg: i32Edge(variantIndex),
      focusBideTarget: variantIndex % BATTLE_SLOTS,
      target: roles.target,
      effectBattler: roles.effectBattler,
      fainted: roles.fainted,
      salt: 1400 + variantIndex,
    }),
  );
}

assert(cases.length === 273, `case count drifted: ${cases.length}`);
for (const attacker of BATTLER_DOMAIN) {
  for (const status2 of STATUS2_EDGE_VALUES) {
    assert(
      cases.some((value) => value.category === "packed-status2-edge-matrix"
        && value.initial.attacker === attacker
        && value.initial.status2[attacker] === status2),
      `status2 edge matrix omits attacker ${attacker} status2 ${status2}`,
    );
  }
  for (const currentMove of U16_EDGE_VALUES) {
    for (const lockedMove of U16_EDGE_VALUES) {
      assert(
        cases.some((value) => value.category === "current-locked-u16-overwrite-matrix"
          && value.initial.attacker === attacker
          && value.initial.currentMove === currentMove
          && value.initial.lockedMoves[attacker] === lockedMove),
        `u16 overwrite matrix omits attacker ${attacker}, current ${currentMove}, locked ${lockedMove}`,
      );
    }
  }
  for (const bideDmg of I32_EDGE_VALUES) {
    assert(
      cases.some((value) => value.category === "bide-damage-signed-i32-edge-matrix"
        && value.initial.attacker === attacker
        && value.initial.bideDmg[attacker] === bideDmg),
      `signed i32 damage matrix omits attacker ${attacker}, damage ${bideDmg}`,
    );
  }
  for (const savedTarget of BATTLER_DOMAIN) {
    assert(
      cases.some((value) => value.category === "saved-target-battler-preservation-matrix"
        && value.initial.attacker === attacker
        && value.initial.bideTarget[attacker] === savedTarget),
      `saved target matrix omits attacker ${attacker}, target ${savedTarget}`,
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
  ["attacker-role-values", BATTLER_DOMAIN.length],
  ["optional-attacker-role-values", BATTLER_DOMAIN.length + 1],
  ["other-selector-role-values", BATTLER_DOMAIN.length + 1],
  ["selector-role-fields", 4],
  ["status2-u32-values", U32_MAX + 1],
  ["status2-edge-values", STATUS2_EDGE_VALUES.length],
  ["preexisting-bide-counter-inputs", BIDE_COUNTER_INPUTS.length],
  ["current-move-u16-values", U16_MAX + 1],
  ["current-move-edge-values", U16_EDGE_VALUES.length],
  ["locked-move-u16-values", U16_MAX + 1],
  ["locked-move-edge-values", U16_EDGE_VALUES.length],
  ["bide-damage-signed-i32-values", U32_MAX + 1],
  ["bide-damage-edge-values", I32_EDGE_VALUES.length],
  ["saved-target-battler-values", BATTLER_DOMAIN.length],
  ["saved-target-array-cells", BATTLE_SLOTS],
  ["application-count-values", 2],
  ["typed-missing-attacker-combinations", ROLE_VARIANTS.length],
]);
const corpus = Object.freeze({
  battlerDomain: BATTLER_DOMAIN,
  status2EdgeDomain: STATUS2_EDGE_VALUES,
  bideCounterInputDomain: BIDE_COUNTER_INPUTS,
  u16EdgeDomain: U16_EDGE_VALUES,
  bideDamageEdgeDomain: I32_EDGE_VALUES,
  roleVariants: ROLE_VARIANTS,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU16(value) {
  return `0x${value.toString(16).padStart(4, "0")}`;
}

function rustU32(value) {
  return `0x${value.toString(16).padStart(8, "0")}`;
}

function rustI32(value) {
  if (value === I32_MIN) return "i32::MIN";
  if (value === I32_MAX) return "i32::MAX";
  return String(value);
}

function rustBattler(value) {
  return `BattleScriptSetbideBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustState(value) {
  return [
    "BattleScriptSetbideVectorState {",
    `status2: [${value.status2.map(rustU32).join(", ")}],`,
    `current_move: ${rustU16(value.currentMove)},`,
    `locked_moves: [${value.lockedMoves.map(rustU16).join(", ")}],`,
    `bide_dmg: [${value.bideDmg.map(rustI32).join(", ")}],`,
    `bide_targets: [${value.bideTarget.map(rustBattler).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `effect_battler: ${rustOptionalBattler(value.effectBattler)},`,
    `fainted: ${rustOptionalBattler(value.fainted)},`,
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
  return `&[${values.map(() => "BattleScriptSetbideControl::Advance").join(", ")}]`;
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-setbide-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetbideOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_setbide::{BattleScriptSetbideBattler, BattleScriptSetbideControl};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETBIDE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SETBIDE_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETBIDE_STATUS2_EDGE_DOMAIN: [u32; ${STATUS2_EDGE_VALUES.length}] = [${STATUS2_EDGE_VALUES.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETBIDE_BIDE_COUNTER_INPUT_DOMAIN: [u8; ${BIDE_COUNTER_INPUTS.length}] = [${BIDE_COUNTER_INPUTS.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETBIDE_U16_EDGE_DOMAIN: [u16; ${U16_EDGE_VALUES.length}] = [${U16_EDGE_VALUES.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETBIDE_BIDE_DAMAGE_EDGE_DOMAIN: [i32; ${I32_EDGE_VALUES.length}] = [${I32_EDGE_VALUES.map(rustI32).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetbideVectorState {");
lines.push("    pub status2: [u32; 4],");
lines.push("    pub current_move: u16,");
lines.push("    pub locked_moves: [u16; 4],");
lines.push("    pub bide_dmg: [i32; 4],");
lines.push("    pub bide_targets: [BattleScriptSetbideBattler; 4],");
lines.push("    pub attacker: Option<BattleScriptSetbideBattler>,");
lines.push("    pub target: Option<BattleScriptSetbideBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptSetbideBattler>,");
lines.push("    pub fainted: Option<BattleScriptSetbideBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetbideVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSetbideVectorState,");
lines.push("    pub expected: Option<BattleScriptSetbideVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSetbideControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETBIDE_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETBIDE_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETBIDE_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SETBIDE_CASES: [BattleScriptSetbideVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSetbideVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-setbide-vectors: could not find rustfmt");

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-battle-script-setbide-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-setbide-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-setbide-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-setbide-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-setbide-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-setbide-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-setbide-vectors: generated sha256 ${generatedHash}`);
