#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptRemainingHpToPowerOpcode.ts.
// Expected controls, outputs, and errors are created only by executing the
// canonical TypeScript opcode handler; this script owns bounded legal-battle
// input construction and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-remaininghptopower-vectors.mjs

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
  "battle_script_remaininghptopower_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRemainingHpToPowerOpcode.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_REMAININGHPTOPOWER";
const OPCODE_ID = 0xac;
const DISPATCHER = "Cmd_remaininghptopower";
const ENTRY_LABEL = "BattleScript_EffectFlail";
const BATTLE_SLOTS = 4;
const U16_MAX = 0xffff;
const SCALE = 48;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, ...BATTLER_DOMAIN]);
const POWER_TABLE = Object.freeze([
  Object.freeze([1, 200]),
  Object.freeze([4, 150]),
  Object.freeze([9, 100]),
  Object.freeze([16, 80]),
  Object.freeze([32, 40]),
  Object.freeze([48, 20]),
]);
const TRANSITION_THRESHOLDS = Object.freeze(POWER_TABLE.slice(0, -1).map(([threshold]) => threshold));
const MAX_HP_DOMAIN = Object.freeze([1, 2, 3, 47, 48, 49, 100, 999, 32767, U16_MAX]);
const DYNAMIC_BASE_POWER_EDGE_DOMAIN = Object.freeze([
  0, 1, 19, 20, 39, 40, 79, 80, 99, 100, 149, 150, 199, 200, U16_MAX,
]);
const POWER_REPRESENTATIVE_HPS = Object.freeze([0, 2, 5, 10, 17, 33]);
const SIBLING_HP_MAX_PAIRS = Object.freeze([
  Object.freeze([1, 1]),
  Object.freeze([7, 47]),
  Object.freeze([49, 100]),
  Object.freeze([U16_MAX, U16_MAX]),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-remaininghptopower-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U16_MAX, `${label} must be a u16, got ${value}`);
}

function assertLegalHpPair(hp, maxHP, label) {
  assertU16(hp, `${label}.hp`);
  assertU16(maxHP, `${label}.maxHP`);
  assert(maxHP > 0, `${label}.maxHP must be nonzero`);
  assert(hp <= maxHP, `${label}.hp must not exceed maxHP`);
}

function roleLabel(value) {
  return value === null ? "none" : `b${value}`;
}

const SELECTOR_COMBINATIONS = Object.freeze(
  OPTIONAL_BATTLER_DOMAIN.flatMap((target) => OPTIONAL_BATTLER_DOMAIN.flatMap((effectBattler) => (
    OPTIONAL_BATTLER_DOMAIN.map((fainted) => Object.freeze({ target, effectBattler, fainted }))
  ))),
);

function freezeRules({ hp, maxHP, dynamicBasePower, roles }) {
  assert(Array.isArray(hp) && hp.length === BATTLE_SLOTS, "hp must have four cells");
  assert(Array.isArray(maxHP) && maxHP.length === BATTLE_SLOTS, "maxHP must have four cells");
  hp.forEach((value, index) => assertLegalHpPair(value, maxHP[index], `battlers[${index}]`));
  assertU16(dynamicBasePower, "dynamicBasePower");
  assertOptionalBattler(roles.attacker, "attacker role");
  assertOptionalBattler(roles.target, "target role");
  assertOptionalBattler(roles.effectBattler, "effectBattler role");
  assertOptionalBattler(roles.fainted, "fainted role");
  return Object.freeze({
    battlers: Object.freeze(hp.map((value, index) => Object.freeze({ hp: value, maxHP: maxHP[index] }))),
    dynamicBasePower,
    selectorRoles: Object.freeze({
      attacker: roles.attacker,
      target: roles.target,
      effectBattler: roles.effectBattler,
      fainted: roles.fainted,
    }),
  });
}

function makeInitialRules({ attacker, hp, maxHP, dynamicBasePower, roles, salt }) {
  assertOptionalBattler(attacker, "initial attacker");
  assertLegalHpPair(hp, maxHP, "initial attacker");
  assertU16(dynamicBasePower, "initial dynamicBasePower");
  const resolvedRoles = roles ?? SELECTOR_COMBINATIONS[salt % SELECTOR_COMBINATIONS.length];
  const allHp = BATTLER_DOMAIN.map((battler) => (
    battler === attacker ? hp : SIBLING_HP_MAX_PAIRS[(battler + salt) % SIBLING_HP_MAX_PAIRS.length][0]
  ));
  const allMaxHP = BATTLER_DOMAIN.map((battler) => (
    battler === attacker ? maxHP : SIBLING_HP_MAX_PAIRS[(battler + salt) % SIBLING_HP_MAX_PAIRS.length][1]
  ));
  // A missing attacker must still have a full valid battler projection. The
  // focus cell rotates so the canonical requireBattlerRole failure proves it
  // happened before any HP/maxHP or dynamic-power read.
  if (attacker === null) {
    const focus = salt % BATTLE_SLOTS;
    allHp[focus] = hp;
    allMaxHP[focus] = maxHP;
  }
  return freezeRules({
    hp: allHp,
    maxHP: allMaxHP,
    dynamicBasePower,
    roles: { attacker, ...resolvedRoles },
  });
}

function vectorState(rules) {
  return Object.freeze({
    hp: Object.freeze(rules.battlers.map((battler) => battler.hp)),
    maxHP: Object.freeze(rules.battlers.map((battler) => battler.maxHP)),
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

function scaledFraction(hp, maxHP) {
  assertLegalHpPair(hp, maxHP, "scaled fraction");
  let fraction = Math.trunc((hp * SCALE) / maxHP);
  if (fraction === 0 && hp > 0) fraction = 1;
  return fraction;
}

function tablePower(fraction) {
  for (const [threshold, power] of POWER_TABLE) {
    if (fraction <= threshold) return power;
  }
  throw new Error(`scaled fraction ${fraction} escaped legal Flail table`);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === 1, `expected exactly one ${OPCODE_NAME} instruction, got ${instructions.length}`);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, `expected opcode ${OPCODE_ID}, got ${instruction.opcodeId}`);
assert(instruction.dispatcher === DISPATCHER, `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`);
assert(instruction.operands.length === 0, "canonical opcode must have no operands");
assert(SCALE === 48, `source scale drifted to ${SCALE}`);
assert(JSON.stringify(POWER_TABLE) === JSON.stringify([[1, 200], [4, 150], [9, 100], [16, 80], [32, 40], [48, 20]]), "source Flail table drifted");

const handlers = opcodeModule.createBattleScriptRemainingHpToPowerOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical REMAININGHPTOPOWER handler was not registered");

function sourceOutcome(initialRules, applications) {
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  const powers = [];
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
      assert(transition.rulesContext !== currentRules, "canonical advance reused complete rules state");
      assert(
        transition.rulesContext.battlers === currentRules.battlers,
        "canonical advance replaced untouched battlers",
      );
      assert(
        transition.rulesContext.selectorRoles === currentRules.selectorRoles,
        "canonical advance replaced untouched selector roles",
      );

      const attacker = currentRules.selectorRoles.attacker;
      assert(attacker !== null, "successful canonical handler had no attacker");
      const expectedPower = tablePower(scaledFraction(
        currentRules.battlers[attacker].hp,
        currentRules.battlers[attacker].maxHP,
      ));
      assert(
        transition.rulesContext.dynamicBasePower === expectedPower,
        "canonical handler did not overwrite dynamicBasePower from the source table",
      );
      controls.push("advance");
      powers.push(expectedPower);
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      powers: Object.freeze(powers),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input rules");
    return Object.freeze({ expected: null, controls: Object.freeze(controls), powers: Object.freeze(powers), error: error.message });
  }
}

function branchFor(outcome) {
  return outcome.error === null
    ? `write-power-${outcome.powers.join("-then-")}-advance`
    : "missing-attacker-role";
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
  } else {
    assert(outcome.error === null, `${label}: valid legal attacker threw ${outcome.error}`);
    assert(outcome.expected !== null, `${label}: valid legal attacker omitted output`);
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

// All 49 exact scaled fractions at maxHP=48 include zero, living minimum,
// every inclusive table endpoint, every following power band, and full HP.
for (let hp = 0; hp <= SCALE; hp += 1) {
  const attacker = hp % BATTLE_SLOTS;
  addCase(
    `fraction_exact_f${hp}_a${attacker}`,
    "all-scaled-fractions-maxhp-48",
    makeInitialRules({
      attacker,
      hp,
      maxHP: SCALE,
      dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[hp % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
      roles: SELECTOR_COMBINATIONS[hp % SELECTOR_COMBINATIONS.length],
      salt: hp,
    }),
  );
}

// For every varied maxHP, retain both sides of every representable power-band
// transition: floor(T * 48 / maxHP) <= threshold versus the first HP that is
// strictly greater than that threshold. Set semantics remove only duplicate
// HP values, never a named threshold partition.
for (const [maxIndex, maxHP] of MAX_HP_DOMAIN.entries()) {
  for (const threshold of TRANSITION_THRESHOLDS) {
    const firstAfter = Math.ceil(((threshold + 1) * maxHP) / SCALE);
    if (firstAfter > maxHP) continue;
    for (const [side, hp] of [["before", firstAfter - 1], ["after", firstAfter]]) {
      addCase(
        `partition_m${maxHP}_t${threshold}_${side}`,
        "varied-maxhp-threshold-partitions",
        makeInitialRules({
          attacker: (maxIndex + threshold + hp) % BATTLE_SLOTS,
          hp,
          maxHP,
          dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[
            (maxIndex * TRANSITION_THRESHOLDS.length + threshold + hp) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
          ],
          roles: SELECTOR_COMBINATIONS[(maxIndex * 19 + threshold + hp) % SELECTOR_COMBINATIONS.length],
          salt: 100 + maxIndex * 100 + threshold * 2 + hp,
        }),
      );
    }
  }
  for (const [edge, hp] of [["zero", 0], ["living_min", 1], ["full", maxHP]]) {
    addCase(
      `edges_m${maxHP}_${edge}`,
      "hp-zero-living-min-full-varied-maxhp",
      makeInitialRules({
        attacker: (maxIndex + hp) % BATTLE_SLOTS,
        hp,
        maxHP,
        dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[(maxIndex + hp + 7) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
        roles: SELECTOR_COMBINATIONS[(maxIndex + hp + 23) % SELECTOR_COMBINATIONS.length],
        salt: 1000 + maxIndex * 10 + hp,
      }),
    );
  }
}

// Exhaustive source selector surface: every attacker alias crossed with every
// target/effectBattler/fainted nullable binding combination. HP varies across
// all six power bands while full four-cell sibling state is retained.
for (const attacker of BATTLER_DOMAIN) {
  for (const [rolesIndex, roles] of SELECTOR_COMBINATIONS.entries()) {
    const hp = POWER_REPRESENTATIVE_HPS[rolesIndex % POWER_REPRESENTATIVE_HPS.length];
    addCase(
      `selector_a${attacker}_t${roleLabel(roles.target)}_e${roleLabel(roles.effectBattler)}_f${roleLabel(roles.fainted)}`,
      "all-attacker-and-selector-role-combinations",
      makeInitialRules({
        attacker,
        hp,
        maxHP: SCALE,
        dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[(attacker * SELECTOR_COMBINATIONS.length + rolesIndex) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
        roles,
        salt: 2000 + attacker * SELECTOR_COMBINATIONS.length + rolesIndex,
      }),
    );
  }
}

// Every meaningful incoming dynamic-base-power edge is overwritten for every
// attacker alias, including pre-existing Flail values and u16 extrema.
for (const attacker of BATTLER_DOMAIN) {
  for (const [powerIndex, dynamicBasePower] of DYNAMIC_BASE_POWER_EDGE_DOMAIN.entries()) {
    const hp = POWER_REPRESENTATIVE_HPS[(attacker + powerIndex) % POWER_REPRESENTATIVE_HPS.length];
    addCase(
      `prior_dynamic_a${attacker}_v${dynamicBasePower}`,
      "prior-dynamic-base-power-overwrite-matrix",
      makeInitialRules({
        attacker,
        hp,
        maxHP: SCALE,
        dynamicBasePower,
        roles: SELECTOR_COMBINATIONS[(attacker * 17 + powerIndex) % SELECTOR_COMBINATIONS.length],
        salt: 4000 + attacker * DYNAMIC_BASE_POWER_EDGE_DOMAIN.length + powerIndex,
      }),
    );
  }
}

// A second successful application receives the same unmodified HP projection,
// yields Advance again, and leaves its completed value state unchanged.
for (const attacker of BATTLER_DOMAIN) {
  for (const [bandIndex, hp] of POWER_REPRESENTATIVE_HPS.entries()) {
    addCase(
      `repeat_a${attacker}_band${bandIndex}`,
      "repeated-application-idempotence",
      makeInitialRules({
        attacker,
        hp,
        maxHP: SCALE,
        dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[(bandIndex + 3) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
        roles: SELECTOR_COMBINATIONS[(attacker * 13 + bandIndex) % SELECTOR_COMBINATIONS.length],
        salt: 5000 + attacker * POWER_REPRESENTATIVE_HPS.length + bandIndex,
      }),
      2,
    );
  }
}

// Missing-attacker probes cover every nullable combination of the retained
// sibling role fields, proving it takes precedence over otherwise valid HP
// reads and prior dynamic power.
for (const [rolesIndex, roles] of SELECTOR_COMBINATIONS.entries()) {
  addCase(
    `missing_attacker_t${roleLabel(roles.target)}_e${roleLabel(roles.effectBattler)}_f${roleLabel(roles.fainted)}`,
    "missing-attacker-before-hp-and-selector-reads",
    makeInitialRules({
      attacker: null,
      hp: rolesIndex % 2 === 0 ? 1 : U16_MAX,
      maxHP: rolesIndex % 2 === 0 ? U16_MAX : U16_MAX,
      dynamicBasePower: DYNAMIC_BASE_POWER_EDGE_DOMAIN[rolesIndex % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
      roles,
      salt: 6000 + rolesIndex,
    }),
  );
}

assert(cases.length > 700 && cases.length < 1000, `corpus must stay bounded, got ${cases.length}`);
for (let hp = 0; hp <= SCALE; hp += 1) {
  assert(
    cases.some((value) => value.category === "all-scaled-fractions-maxhp-48"
      && value.initial.maxHP[value.initial.attacker] === SCALE
      && value.initial.hp[value.initial.attacker] === hp),
    `exact maxHP=48 scaled fraction ${hp} is missing`,
  );
}
for (const maxHP of MAX_HP_DOMAIN) {
  for (const threshold of TRANSITION_THRESHOLDS) {
    const firstAfter = Math.ceil(((threshold + 1) * maxHP) / SCALE);
    if (firstAfter > maxHP) continue;
    for (const hp of [firstAfter - 1, firstAfter]) {
      assert(
        cases.some((value) => value.category === "varied-maxhp-threshold-partitions"
          && value.initial.maxHP[value.initial.attacker] === maxHP
          && value.initial.hp[value.initial.attacker] === hp),
        `maxHP ${maxHP} threshold ${threshold} side hp ${hp} is missing`,
      );
    }
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
  ["optional-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["retained-selector-role-fields", 4],
  ["attacker-selector-cross-product", BATTLER_DOMAIN.length * SELECTOR_COMBINATIONS.length],
  ["hp-u16-values", U16_MAX + 1],
  ["maxhp-u16-positive-values", U16_MAX],
  ["legal-hp-maxhp-state-space", (U16_MAX * (U16_MAX + 3)) / 2],
  ["scaled-fraction-values-at-maxhp-48", SCALE + 1],
  ["flail-power-bands", POWER_TABLE.length],
  ["power-transition-thresholds", TRANSITION_THRESHOLDS.length],
  ["varied-maxhp-values", MAX_HP_DOMAIN.length],
  ["dynamic-base-power-u16-values", U16_MAX + 1],
  ["dynamic-base-power-edge-values", DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
  ["application-count-values", 2],
  ["missing-attacker-selector-combinations", SELECTOR_COMBINATIONS.length],
]);
const corpus = Object.freeze({
  battlerDomain: BATTLER_DOMAIN,
  optionalBattlerDomain: OPTIONAL_BATTLER_DOMAIN,
  scale: SCALE,
  powerTable: POWER_TABLE,
  transitionThresholds: TRANSITION_THRESHOLDS,
  maxHpDomain: MAX_HP_DOMAIN,
  dynamicBasePowerEdgeDomain: DYNAMIC_BASE_POWER_EDGE_DOMAIN,
  powerRepresentativeHps: POWER_REPRESENTATIVE_HPS,
  selectorCombinations: SELECTOR_COMBINATIONS,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU16(value) {
  return `0x${value.toString(16).padStart(4, "0")}`;
}

function rustBattler(value) {
  return `BattleScriptRemaininghptopowerBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustState(value) {
  return [
    "BattleScriptRemaininghptopowerVectorState {",
    `hp: [${value.hp.map(rustU16).join(", ")}],`,
    `max_hp: [${value.maxHP.map(rustU16).join(", ")}],`,
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
  return `&[${values.map(() => "BattleScriptRemaininghptopowerControl::Advance").join(", ")}]`;
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-remaininghptopower-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptRemainingHpToPowerOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_remaininghptopower::{BattleScriptRemaininghptopowerBattler, BattleScriptRemaininghptopowerControl};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_OPTIONAL_BATTLER_DOMAIN: [Option<u8>; ${OPTIONAL_BATTLER_DOMAIN.length}] = [${OPTIONAL_BATTLER_DOMAIN.map((value) => value === null ? "None" : `Some(${value})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_POWER_TABLE: [(u8, u16); ${POWER_TABLE.length}] = [${POWER_TABLE.map(([threshold, power]) => `(${threshold}, ${power})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_TRANSITION_THRESHOLDS: [u8; ${TRANSITION_THRESHOLDS.length}] = [${TRANSITION_THRESHOLDS.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_MAX_HP_DOMAIN: [u16; ${MAX_HP_DOMAIN.length}] = [${MAX_HP_DOMAIN.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_DYNAMIC_BASE_POWER_EDGE_DOMAIN: [u16; ${DYNAMIC_BASE_POWER_EDGE_DOMAIN.length}] = [${DYNAMIC_BASE_POWER_EDGE_DOMAIN.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_POWER_REPRESENTATIVE_HP_DOMAIN: [u16; ${POWER_REPRESENTATIVE_HPS.length}] = [${POWER_REPRESENTATIVE_HPS.map(rustU16).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRemaininghptopowerVectorState {");
lines.push("    pub hp: [u16; 4],");
lines.push("    pub max_hp: [u16; 4],");
lines.push("    pub dynamic_base_power: u16,");
lines.push("    pub attacker: Option<BattleScriptRemaininghptopowerBattler>,");
lines.push("    pub target: Option<BattleScriptRemaininghptopowerBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptRemaininghptopowerBattler>,");
lines.push("    pub fainted: Option<BattleScriptRemaininghptopowerBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRemaininghptopowerVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptRemaininghptopowerVectorState,");
lines.push("    pub expected: Option<BattleScriptRemaininghptopowerVectorState>,");
lines.push("    pub controls: &'static [BattleScriptRemaininghptopowerControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_REMAININGHPTOPOWER_CASES: [BattleScriptRemaininghptopowerVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptRemaininghptopowerVectorCase {");
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
const rustfmt = execFileSync("rustup", ["which", "rustfmt"], { encoding: "utf8" }).trim();
assert(rustfmt.length > 0, "rustup did not resolve rustfmt");
execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });

const generated = fs.readFileSync(outPath);
const generator = fs.readFileSync(scriptPath);
const generatedHash = crypto.createHash("sha256").update(generated).digest("hex");
const generatorHash = crypto.createHash("sha256").update(generator).digest("hex");
console.log(`gen-battle-script-remaininghptopower-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-remaininghptopower-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-remaininghptopower-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-remaininghptopower-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-remaininghptopower-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-remaininghptopower-vectors: corpus sha256 ${corpusHash} (${Buffer.byteLength(corpusJson)} bytes)`);
console.log(`gen-battle-script-remaininghptopower-vectors: generated sha256 ${generatedHash} (${generated.length} bytes)`);
console.log(`gen-battle-script-remaininghptopower-vectors: generator sha256 ${generatorHash} (${generator.length} bytes)`);
