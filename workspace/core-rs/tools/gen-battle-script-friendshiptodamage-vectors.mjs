#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptFriendshipToDamageOpcode.ts.
// Expected controls, outputs, registration errors, and handler errors are
// created only by executing the canonical TypeScript module. This script owns
// bounded runtime-state construction and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-friendshiptodamage-vectors.mjs

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
  "battle_script_friendshiptodamage_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptFriendshipToDamageOpcode.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION";
const OPCODE_ID = 0xb6;
const DISPATCHER = "Cmd_friendshiptodamagecalculation";
const RETURN_ENTRY_LABEL = "BattleScript_EffectReturn";
const FRUSTRATION_ENTRY_LABEL = "BattleScript_EffectFrustration";
const BATTLE_SLOTS = 4;
const U8_MAX = 0xff;
const U16_MAX = 0xffff;
const BATTLE_SCRIPT_EFFECT_RETURN = opcodeModule.BATTLE_SCRIPT_EFFECT_RETURN;
const BATTLE_SCRIPT_EFFECT_FRUSTRATION = opcodeModule.BATTLE_SCRIPT_EFFECT_FRUSTRATION;
const MAX_FRIENDSHIP = opcodeModule.BATTLE_SCRIPT_MAX_FRIENDSHIP;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, ...BATTLER_DOMAIN]);
const ALLOWED_EFFECTS = Object.freeze([
  BATTLE_SCRIPT_EFFECT_RETURN,
  BATTLE_SCRIPT_EFFECT_FRUSTRATION,
]);
const DYNAMIC_BASE_POWER_EDGE_DOMAIN = Object.freeze([
  0, 1, 2, 3, 4, 9, 10, 19, 20, 39, 40, 79, 80, 99, 100, 101, 102, 103, 255, 256,
  U16_MAX - 1, U16_MAX,
]);
const UNREACHABLE_EFFECT_DOMAIN = Object.freeze([0, 1, 120, 122, 124, U8_MAX]);
const SIBLING_FRIENDSHIP_DOMAIN = Object.freeze([0, 1, 127, MAX_FRIENDSHIP]);
const INVALID_FRIENDSHIP_DOMAIN = Object.freeze([
  Object.freeze({ label: "negative_one", value: -1 }),
  Object.freeze({ label: "above_u8", value: 256 }),
  Object.freeze({ label: "fraction_half", value: 0.5 }),
  Object.freeze({ label: "negative_fraction_half", value: -0.5 }),
  Object.freeze({ label: "nan", value: Number.NaN }),
  Object.freeze({ label: "positive_infinity", value: Number.POSITIVE_INFINITY }),
  Object.freeze({ label: "negative_infinity", value: Number.NEGATIVE_INFINITY }),
  Object.freeze({ label: "unsafe_positive", value: Number.MAX_SAFE_INTEGER + 1 }),
  Object.freeze({ label: "unsafe_negative", value: Number.MIN_SAFE_INTEGER - 1 }),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-friendshiptodamage-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U8_MAX, `${label} must be a u8, got ${value}`);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U16_MAX, `${label} must be a u16, got ${value}`);
}

function f64Bits(value) {
  assert(typeof value === "number", `friendship value must be a number, got ${typeof value}`);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  return `0x${view.getBigUint64(0, false).toString(16).padStart(16, "0")}`;
}

function roleLabel(value) {
  return value === null ? "none" : `b${value}`;
}

const SELECTOR_COMBINATIONS = Object.freeze(
  OPTIONAL_BATTLER_DOMAIN.flatMap((target) => OPTIONAL_BATTLER_DOMAIN.flatMap((effectBattler) => (
    OPTIONAL_BATTLER_DOMAIN.map((fainted) => Object.freeze({ target, effectBattler, fainted }))
  ))),
);

function freezeRules({ friendships, currentMoveEffect, dynamicBasePower, roles }) {
  assert(Array.isArray(friendships) && friendships.length === BATTLE_SLOTS, "friendships must have four cells");
  friendships.forEach((friendship, index) => {
    assert(typeof friendship === "number", `battlers[${index}].friendship must be a number`);
  });
  assertU8(currentMoveEffect, "currentMoveEffect");
  assertU16(dynamicBasePower, "dynamicBasePower");
  assertOptionalBattler(roles.attacker, "attacker role");
  assertOptionalBattler(roles.target, "target role");
  assertOptionalBattler(roles.effectBattler, "effectBattler role");
  assertOptionalBattler(roles.fainted, "fainted role");
  return Object.freeze({
    battlers: Object.freeze(friendships.map((friendship) => Object.freeze({ friendship }))),
    currentMoveEffect,
    dynamicBasePower,
    selectorRoles: Object.freeze({
      attacker: roles.attacker,
      target: roles.target,
      effectBattler: roles.effectBattler,
      fainted: roles.fainted,
    }),
  });
}

function makeInitialRules({
  attacker,
  friendship,
  currentMoveEffect,
  dynamicBasePower,
  roles,
  salt,
}) {
  assertOptionalBattler(attacker, "initial attacker");
  assert(typeof friendship === "number", "initial attacker friendship must be a number");
  const resolvedRoles = roles ?? SELECTOR_COMBINATIONS[salt % SELECTOR_COMBINATIONS.length];
  const friendships = BATTLER_DOMAIN.map((battler) => (
    SIBLING_FRIENDSHIP_DOMAIN[(battler + salt) % SIBLING_FRIENDSHIP_DOMAIN.length]
  ));
  // The missing-attacker probes still carry a complete four-cell state. The
  // focus cell rotates through every array position so canonical execution
  // proves requireBattlerRole happens before all friendship/effect reads.
  friendships[attacker ?? (salt % BATTLE_SLOTS)] = friendship;
  return freezeRules({
    friendships,
    currentMoveEffect,
    dynamicBasePower,
    roles: { attacker, ...resolvedRoles },
  });
}

function vectorState(rules) {
  return Object.freeze({
    friendshipBits: Object.freeze(rules.battlers.map((battler) => f64Bits(battler.friendship))),
    currentMoveEffect: rules.currentMoveEffect,
    dynamicBasePower: rules.dynamicBasePower,
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
assert(BATTLE_SCRIPT_EFFECT_RETURN === 121, `EFFECT_RETURN drifted to ${BATTLE_SCRIPT_EFFECT_RETURN}`);
assert(BATTLE_SCRIPT_EFFECT_FRUSTRATION === 123, `EFFECT_FRUSTRATION drifted to ${BATTLE_SCRIPT_EFFECT_FRUSTRATION}`);
assert(MAX_FRIENDSHIP === U8_MAX, `MAX_FRIENDSHIP drifted to ${MAX_FRIENDSHIP}`);
const returnEntry = programModule.resolveBattleScriptLabel(program, RETURN_ENTRY_LABEL);
const frustrationEntry = programModule.resolveBattleScriptLabel(program, FRUSTRATION_ENTRY_LABEL);
assert(returnEntry, "BattleScript_EffectReturn must resolve");
assert(frustrationEntry, "BattleScript_EffectFrustration must resolve");
assert(returnEntry.programCounter === frustrationEntry.programCounter, "Return and Frustration must share one script entry");
assert(returnEntry.aliases.includes(RETURN_ENTRY_LABEL), "Return alias must stay attached to the shared script entry");
assert(returnEntry.aliases.includes(FRUSTRATION_ENTRY_LABEL), "Frustration alias must stay attached to the shared script entry");
assert(instruction.programCounter > returnEntry.programCounter, "shared friendship opcode must remain inside the aliased effect body");
assert(instruction.source.statementLine === 1661, "friendship opcode must remain at the shared source statement");

const handlers = opcodeModule.createBattleScriptFriendshipToDamageOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical FRIENDSHIPTODAMAGE handler was not registered");

function sourcePower(effect, friendship) {
  if (effect === BATTLE_SCRIPT_EFFECT_RETURN) return Math.trunc((10 * friendship) / 25);
  if (effect === BATTLE_SCRIPT_EFFECT_FRUSTRATION) return Math.trunc((10 * (MAX_FRIENDSHIP - friendship)) / 25);
  return null;
}

function sourceOutcome(initialRules, applications) {
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  const powers = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const currentSnapshot = vectorState(currentRules);
      const entryLabel = currentRules.currentMoveEffect === BATTLE_SCRIPT_EFFECT_FRUSTRATION
        ? FRUSTRATION_ENTRY_LABEL
        : RETURN_ENTRY_LABEL;
      const state = machineModule.createBattleScriptMachine(
        program,
        entryLabel,
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
      assert(transition.rulesContext !== currentRules, "canonical advance reused complete rules state");
      assert(transition.rulesContext.battlers === currentRules.battlers, "canonical advance replaced untouched battlers");
      assert(
        transition.rulesContext.selectorRoles === currentRules.selectorRoles,
        "canonical advance replaced untouched selector roles",
      );
      assert(
        transition.rulesContext.currentMoveEffect === currentRules.currentMoveEffect,
        "canonical advance changed currentMoveEffect",
      );

      const attacker = currentRules.selectorRoles.attacker;
      assert(attacker !== null, "successful canonical handler had no attacker");
      const friendship = currentRules.battlers[attacker].friendship;
      const expectedPower = sourcePower(currentRules.currentMoveEffect, friendship);
      assert(expectedPower !== null, "successful canonical handler used unreachable effect");
      assert(
        transition.rulesContext.dynamicBasePower === expectedPower,
        "canonical handler did not use source integer division",
      );
      controls.push("advance");
      powers.push(expectedPower);
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated initial rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      powers: Object.freeze(powers),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated initial rules");
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      powers: Object.freeze(powers),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return `write-power-${outcome.powers.join("-then-")}-advance`;
  if (outcome.error === "Battle Script hit-chain command requires a attacker role") return "missing-attacker-role";
  if (outcome.error.startsWith("attacker friendship must be a source u8, got ")) return "invalid-friendship";
  if (outcome.error.startsWith(`${OPCODE_NAME} is reachable only for `)) return "unreachable-effect";
  throw new Error(`unexpected canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, initialRules, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be one or two`);
  const outcome = sourceOutcome(initialRules, applications);
  const branch = branchFor(outcome);
  if (initialRules.selectorRoles.attacker === null) {
    assert(branch === "missing-attacker-role", `${label}: missing attacker must fail first`);
    assert(outcome.expected === null, `${label}: missing attacker unexpectedly produced state`);
    assert(outcome.controls.length === 0, `${label}: missing attacker unexpectedly advanced`);
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

// Every source u8 value runs through each legal source effect. The rotating
// attacker/alias state retains all four indexed slots while independently
// proving Return and Frustration's truncating complementary endpoints.
for (const [effectIndex, currentMoveEffect] of ALLOWED_EFFECTS.entries()) {
  for (let friendship = 0; friendship <= U8_MAX; friendship += 1) {
    const attacker = friendship % BATTLE_SLOTS;
    addCase(
      `u8_${effectIndex === 0 ? "return" : "frustration"}_f${friendship}_a${attacker}`,
      "every-source-u8-return-frustration",
      makeInitialRules({
        attacker,
        friendship,
        currentMoveEffect,
        dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (friendship + effectIndex * 11) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
        roles: SELECTOR_COMBINATIONS[(friendship * 2 + effectIndex) % SELECTOR_COMBINATIONS.length],
        salt: friendship + effectIndex * 1000,
      }),
    );
  }
}

// Cross every attacker alias with every nullable target/effectBattler/fainted
// combination that the canonical selector model carries.
for (const attacker of BATTLER_DOMAIN) {
  for (const [rolesIndex, roles] of SELECTOR_COMBINATIONS.entries()) {
    addCase(
      `selectors_a${attacker}_t${roleLabel(roles.target)}_e${roleLabel(roles.effectBattler)}_f${roleLabel(roles.fainted)}`,
      "all-attacker-and-selector-role-combinations",
      makeInitialRules({
        attacker,
        friendship: (rolesIndex * 37 + attacker * 53) & U8_MAX,
        currentMoveEffect: ALLOWED_EFFECTS[(rolesIndex + attacker) % ALLOWED_EFFECTS.length],
        dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (rolesIndex + attacker * 7) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
        roles,
        salt: 3000 + attacker * SELECTOR_COMBINATIONS.length + rolesIndex,
      }),
    );
  }
}

// Every notable incoming u16 dynamic power edge is overwritten for every
// attacker/effect pair, including both source endpoints and u16 extrema.
for (const attacker of BATTLER_DOMAIN) {
  for (const [effectIndex, currentMoveEffect] of ALLOWED_EFFECTS.entries()) {
    for (const [powerIndex, dynamicBasePower] of DYNAMIC_BASE_POWER_EDGE_DOMAIN.entries()) {
      addCase(
        `prior_dynamic_a${attacker}_effect${effectIndex}_v${dynamicBasePower}`,
        "prior-dynamic-base-power-overwrite-matrix",
        makeInitialRules({
          attacker,
          friendship: (attacker * 59 + effectIndex * 83 + powerIndex * 17) & U8_MAX,
          currentMoveEffect,
          dynamicBasePower,
          roles: SELECTOR_COMBINATIONS[
            (attacker * 29 + effectIndex * 13 + powerIndex) % SELECTOR_COMBINATIONS.length
          ],
          salt: 5000 + attacker * 1000 + effectIndex * 100 + powerIndex,
        }),
      );
    }
  }
}

// A second successful invocation receives the same friendship/effect
// projection, advances again, and leaves its completed state unchanged.
for (const attacker of BATTLER_DOMAIN) {
  for (const [effectIndex, currentMoveEffect] of ALLOWED_EFFECTS.entries()) {
    for (const friendship of [0, 1, 2, 3, 252, 253, 254, 255]) {
      addCase(
        `repeat_a${attacker}_effect${effectIndex}_f${friendship}`,
        "repeated-application-idempotence",
        makeInitialRules({
          attacker,
          friendship,
          currentMoveEffect,
          dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[
            (attacker + effectIndex * 5 + friendship) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
          ],
          roles: SELECTOR_COMBINATIONS[
            (attacker * 17 + effectIndex * 11 + friendship) % SELECTOR_COMBINATIONS.length
          ],
          salt: 9000 + attacker * 100 + effectIndex * 20 + friendship,
        }),
        2,
      );
    }
  }
}

// The exported canonical scalar validates runtime friendship before effect
// reachability. Include both legal effects and two otherwise-unreachable
// effects for every malformed number class.
for (const [friendshipIndex, invalid] of INVALID_FRIENDSHIP_DOMAIN.entries()) {
  for (const [effectIndex, currentMoveEffect] of [
    BATTLE_SCRIPT_EFFECT_RETURN,
    BATTLE_SCRIPT_EFFECT_FRUSTRATION,
    0,
    122,
  ].entries()) {
    addCase(
      `invalid_friendship_${invalid.label}_effect${effectIndex}`,
      "invalid-friendship-before-effect-reachability",
      makeInitialRules({
        attacker: friendshipIndex % BATTLE_SLOTS,
        friendship: invalid.value,
        currentMoveEffect,
        dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (friendshipIndex + effectIndex) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
        roles: SELECTOR_COMBINATIONS[
          (friendshipIndex * 7 + effectIndex) % SELECTOR_COMBINATIONS.length
        ],
        salt: 12000 + friendshipIndex * 10 + effectIndex,
      }),
    );
  }
}

// With valid source friendship, every sampled non-Return/non-Frustration
// effect is an invalid interpreter context rather than Frustration fallback.
for (const [effectIndex, currentMoveEffect] of UNREACHABLE_EFFECT_DOMAIN.entries()) {
  for (const attacker of BATTLER_DOMAIN) {
    addCase(
      `unreachable_effect_v${currentMoveEffect}_a${attacker}`,
      "unreachable-effect-with-valid-source-friendship",
      makeInitialRules({
        attacker,
        friendship: [0, 1, 127, 255][attacker],
        currentMoveEffect,
        dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (effectIndex * 5 + attacker) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
        roles: SELECTOR_COMBINATIONS[(effectIndex * 31 + attacker) % SELECTOR_COMBINATIONS.length],
        salt: 13000 + effectIndex * 10 + attacker,
      }),
    );
  }
}

// Missing attacker outranks every attempted friendship and effect lookup. All
// 125 retained selector aliases are covered while the focus data cycles
// through malformed friendship and otherwise-unreachable effects.
for (const [rolesIndex, roles] of SELECTOR_COMBINATIONS.entries()) {
  const invalid = INVALID_FRIENDSHIP_DOMAIN[rolesIndex % INVALID_FRIENDSHIP_DOMAIN.length];
  addCase(
    `missing_attacker_t${roleLabel(roles.target)}_e${roleLabel(roles.effectBattler)}_f${roleLabel(roles.fainted)}`,
    "missing-attacker-before-friendship-and-effect-reads",
    makeInitialRules({
      attacker: null,
      friendship: invalid.value,
      currentMoveEffect: UNREACHABLE_EFFECT_DOMAIN[rolesIndex % UNREACHABLE_EFFECT_DOMAIN.length],
      dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[rolesIndex % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
      roles,
      salt: 14000 + rolesIndex,
    }),
  );
}

assert(cases.length > 1300 && cases.length < 1600, `corpus must stay bounded, got ${cases.length}`);
for (const currentMoveEffect of ALLOWED_EFFECTS) {
  for (let friendship = 0; friendship <= U8_MAX; friendship += 1) {
    assert(
      cases.some((value) => value.category === "every-source-u8-return-frustration"
        && value.initial.currentMoveEffect === currentMoveEffect
        && value.initial.friendshipBits[value.initial.attacker] === f64Bits(friendship)),
      `effect ${currentMoveEffect} friendship ${friendship} is missing`,
    );
  }
}
for (const attacker of BATTLER_DOMAIN) {
  for (const roles of SELECTOR_COMBINATIONS) {
    assert(
      cases.some((value) => value.category === "all-attacker-and-selector-role-combinations"
        && value.initial.attacker === attacker
        && value.initial.target === roles.target
        && value.initial.effectBattler === roles.effectBattler
        && value.initial.fainted === roles.fainted),
      `selector cross product misses attacker ${attacker} / ${JSON.stringify(roles)}`,
    );
  }
}

function instructionSpec(sourceInstruction) {
  return Object.freeze({
    opcodeName: sourceInstruction.opcodeName,
    programCounter: sourceInstruction.programCounter,
    opcodeId: sourceInstruction.opcodeId,
    dispatcher: sourceInstruction.dispatcher,
    operandCount: sourceInstruction.operands.length,
  });
}

function materializeInstruction(spec) {
  const operands = Object.freeze(Array.from({ length: spec.operandCount }, (_unused, index) => Object.freeze({
    widthBytes: 1,
    expression: String(index),
    sourceMacro: "generated-invalid-shape",
    sourceMacroLine: 0,
    wrapperPath: Object.freeze([]),
  })));
  return Object.freeze({
    ...instruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands,
  });
}

function registrationOutcome(specs) {
  const registrationProgram = Object.freeze({
    ...program,
    instructions: Object.freeze(specs.map(materializeInstruction)),
  });
  try {
    const registrationHandlers = opcodeModule.createBattleScriptFriendshipToDamageOpcodeHandlers(registrationProgram);
    const candidates = registrationProgram.instructions.filter((candidate) => candidate.opcodeName === OPCODE_NAME);
    assert(candidates.length === 1, "successful registration must select one concrete start");
    const registered = registrationHandlers[candidates[0].opcodeId];
    assert(typeof registered === "function", "valid registration did not return canonical handler");
    return Object.freeze({ expected: instructionSpec(candidates[0]), error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ expected: null, error: error.message });
  }
}

const CANONICAL_INSTRUCTION = instructionSpec(instruction);
const registrationCases = [];
function addRegistrationCase(label, specs) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid registration label ${label}`);
  const normalizedSpecs = Object.freeze(specs.map(instructionSpec));
  const outcome = registrationOutcome(normalizedSpecs);
  registrationCases.push(Object.freeze({
    label,
    instructions: normalizedSpecs,
    expected: outcome.expected,
    expectedError: outcome.error,
  }));
}

addRegistrationCase("canonical", [instruction]);
addRegistrationCase("no_concrete_start", []);
addRegistrationCase("two_concrete_starts", [instruction, instruction]);
addRegistrationCase("wrong_opcode", [{ ...instruction, opcodeId: 0xb5 }]);
addRegistrationCase("wrong_dispatcher", [{ ...instruction, dispatcher: "Cmd_furycuttercalc" }]);
addRegistrationCase("unexpected_operand", [{ ...instruction, operands: [{}] }]);

assert(registrationCases.length === 6, "registration corpus must retain six canonical shape cases");

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered" : value.expectedError.startsWith(`${OPCODE_NAME} requires`)
    ? "concrete-start-cardinality"
    : "invalid-instruction-shape"
));
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", BATTLER_DOMAIN.length],
  ["optional-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["retained-selector-role-fields", 4],
  ["attacker-selector-cross-product", BATTLER_DOMAIN.length * SELECTOR_COMBINATIONS.length],
  ["friendship-source-u8-values", U8_MAX + 1],
  ["allowed-effect-values", ALLOWED_EFFECTS.length],
  ["unreachable-effect-sample-values", UNREACHABLE_EFFECT_DOMAIN.length],
  ["invalid-friendship-runtime-number-values", INVALID_FRIENDSHIP_DOMAIN.length],
  ["dynamic-base-power-u16-values", U16_MAX + 1],
  ["dynamic-base-power-edge-values", DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
  ["application-count-values", 2],
  ["registration-shape-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  returnEntryProgramCounter: returnEntry.programCounter,
  frustrationEntryProgramCounter: frustrationEntry.programCounter,
  allowedEffects: ALLOWED_EFFECTS,
  friendshipU8Domain: Array.from({ length: U8_MAX + 1 }, (_unused, value) => value),
  dynamicBasePowerEdgeDomain: DYNAMIC_BASE_POWER_EDGE_DOMAIN,
  unreachableEffectDomain: UNREACHABLE_EFFECT_DOMAIN,
  invalidFriendshipDomain: INVALID_FRIENDSHIP_DOMAIN.map((value) => Object.freeze({
    label: value.label,
    bits: f64Bits(value.value),
  })),
  selectorCombinations: SELECTOR_COMBINATIONS,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU16(value) {
  return `0x${value.toString(16).padStart(4, "0")}`;
}

function rustFriendship(bits) {
  return `BattleScriptFriendship::from_bits(${bits}_u64)`;
}

function rustBattler(value) {
  return `BattleScriptFriendshiptodamageBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustState(value) {
  return [
    "BattleScriptFriendshiptodamageVectorState {",
    `friendship: [${value.friendshipBits.map(rustFriendship).join(", ")}],`,
    `current_move_effect: ${value.currentMoveEffect},`,
    `dynamic_base_power: ${rustU16(value.dynamicBasePower)},`,
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
  return `&[${values.map(() => "BattleScriptFriendshiptodamageControl::Advance").join(", ")}]`;
}

function rustInstruction(value) {
  return [
    "BattleScriptFriendshiptodamageVectorInstruction {",
    `opcode_name: ${rustString(value.opcodeName)},`,
    `program_counter: ${value.programCounter},`,
    `opcode_id: 0x${value.opcodeId.toString(16).padStart(2, "0")},`,
    `dispatcher: ${rustString(value.dispatcher)},`,
    `operand_count: ${value.operandCount},`,
    "}",
  ].join(" ");
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-friendshiptodamage-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptFriendshipToDamageOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_friendshiptodamage::{BattleScriptFriendship, BattleScriptFriendshiptodamageBattler, BattleScriptFriendshiptodamageControl};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE: u8 = 0x${OPCODE_ID.toString(16)};`);
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_ALLOWED_EFFECTS: [u8; ${ALLOWED_EFFECTS.length}] = [${ALLOWED_EFFECTS.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPTIONAL_BATTLER_DOMAIN: [Option<u8>; ${OPTIONAL_BATTLER_DOMAIN.length}] = [${OPTIONAL_BATTLER_DOMAIN.map((value) => value === null ? "None" : `Some(${value})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_DYNAMIC_BASE_POWER_EDGE_DOMAIN: [u16; ${DYNAMIC_BASE_POWER_EDGE_DOMAIN.length}] = [${DYNAMIC_BASE_POWER_EDGE_DOMAIN.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_UNREACHABLE_EFFECT_DOMAIN: [u8; ${UNREACHABLE_EFFECT_DOMAIN.length}] = [${UNREACHABLE_EFFECT_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_INVALID_FRIENDSHIP_BITS: [u64; ${INVALID_FRIENDSHIP_DOMAIN.length}] = [${INVALID_FRIENDSHIP_DOMAIN.map((value) => `${f64Bits(value.value)}_u64`).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFriendshiptodamageVectorInstruction {");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub program_counter: u32,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub operand_count: usize,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFriendshiptodamageVectorState {");
lines.push("    pub friendship: [BattleScriptFriendship; 4],");
lines.push("    pub current_move_effect: u8,");
lines.push("    pub dynamic_base_power: u16,");
lines.push("    pub attacker: Option<BattleScriptFriendshiptodamageBattler>,");
lines.push("    pub target: Option<BattleScriptFriendshiptodamageBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptFriendshiptodamageBattler>,");
lines.push("    pub fainted: Option<BattleScriptFriendshiptodamageBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFriendshiptodamageVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptFriendshiptodamageVectorState,");
lines.push("    pub expected: Option<BattleScriptFriendshiptodamageVectorState>,");
lines.push("    pub controls: &'static [BattleScriptFriendshiptodamageControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFriendshiptodamageRegistrationCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub instructions: &'static [BattleScriptFriendshiptodamageVectorInstruction],");
lines.push("    pub expected: Option<BattleScriptFriendshiptodamageVectorInstruction>,");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_REGISTRATION_BRANCH_CENSUS: [(&str, usize); ${registrationBranchCensus.length}] = [`);
for (const [name, count] of registrationBranchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES: [BattleScriptFriendshiptodamageVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptFriendshiptodamageVectorCase {");
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
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_REGISTRATION_CASES: [BattleScriptFriendshiptodamageRegistrationCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptFriendshiptodamageRegistrationCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected: ${value.expected === null ? "None" : `Some(${rustInstruction(value.expected)})`},`);
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
if (!formatted) throw new Error("gen-battle-script-friendshiptodamage-vectors: could not find rustfmt");

const generatedBytes = fs.readFileSync(outPath);
const generatedHash = crypto.createHash("sha256").update(generatedBytes).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");
console.log(`gen-battle-script-friendshiptodamage-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-friendshiptodamage-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-friendshiptodamage-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-friendshiptodamage-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-friendshiptodamage-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-friendshiptodamage-vectors: registration branch census ${JSON.stringify(registrationBranchCensus)}`);
console.log(`gen-battle-script-friendshiptodamage-vectors: corpus sha256 ${corpusHash} bytes ${Buffer.byteLength(corpusJson)}`);
console.log(`gen-battle-script-friendshiptodamage-vectors: generated sha256 ${generatedHash} bytes ${generatedBytes.length}`);
console.log(`gen-battle-script-friendshiptodamage-vectors: generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
