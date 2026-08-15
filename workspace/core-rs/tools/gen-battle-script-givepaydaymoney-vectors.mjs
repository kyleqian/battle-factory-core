#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptGivepaydaymoneyOpcode.ts.
// Expected controls and complete narrow outcomes are created only by executing
// the canonical TypeScript opcode handler. This script owns bounded input
// construction and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-givepaydaymoney-vectors.mjs

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
  "battle_script_givepaydaymoney_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptGivepaydaymoneyOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_GIVEPAYDAYMONEY";
const OPCODE_ID = 0x91;
const DISPATCHER = "Cmd_givepaydaymoney";
const ENTRY_LABEL = "BattleScript_PayDayMoneyAndPickUpItems";
const PAYOUT_LABEL = "BattleScript_PrintPayDayMoneyString";
const BATTLE_TYPE_DOUBLE = 1 << 0;
const BATTLE_TYPE_LINK = 1 << 1;
const BATTLE_TYPE_RECORDED_LINK = 1 << 25;
const SUPPRESS_FLAGS = BATTLE_TYPE_LINK | BATTLE_TYPE_RECORDED_LINK;
const MAX_MONEY = 999_999;
const U16_MAX = 0xffff;
const U32_MAX = 0xffff_ffff;
const U8_MAX = 0xff;
const BATTLE_SLOTS = 4;
const RELEVANT_FLAG_COMBINATIONS = Object.freeze([
  0,
  BATTLE_TYPE_LINK,
  BATTLE_TYPE_RECORDED_LINK,
  SUPPRESS_FLAGS,
]);
const UNRELATED_FLAG_BITS = Object.freeze(
  Array.from({ length: 32 }, (_, bit) => (1 << bit) >>> 0)
    .filter((value) => (value & SUPPRESS_FLAGS) === 0),
);
const UNRELATED_FLAG_MASKS = Object.freeze([0, ...UNRELATED_FLAG_BITS]);
const PLAYER_MONEY_CAP_BOUNDARIES = Object.freeze([
  0,
  1,
  MAX_MONEY - 101,
  MAX_MONEY - 100,
  MAX_MONEY - 99,
  MAX_MONEY - 1,
  MAX_MONEY,
]);
const PRIOR_BUFFER_BOUNDARIES = Object.freeze([null, 0, 1, 0x8000_0000, U32_MAX]);
const PAYDAY_SWEEP_MULTIPLIER = U8_MAX;
const PAYDAY_SWEEP_PLAYER_MONEY = 0;
const PAYDAY_SWEEP_PRIOR_BUFFER = U32_MAX;
const MULTIPLIER_SWEEP_PAYDAY = U16_MAX;
const MULTIPLIER_SWEEP_PLAYER_MONEY = 0;
const MULTIPLIER_SWEEP_PRIOR_BUFFER = null;
const GENERATED_FILE_MAX_BYTES = 5_000_000;

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-givepaydaymoney-vectors: " + message);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U16_MAX, `${label} must be a u16, got ${value}`);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U8_MAX, `${label} must be a u8, got ${value}`);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U32_MAX, `${label} must be a u32, got ${value}`);
}

function assertPlayerMoney(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= MAX_MONEY, `${label} must be capped player money, got ${value}`);
}

function assertOptionalU32(value, label) {
  if (value !== null) assertU32(value, label);
}

function freezeProjection({ battleTypeFlags, paydayMoney, moneyMultiplier, playerMoney, battleTextBuff1PaydayMoney }) {
  assertU32(battleTypeFlags, "battleTypeFlags");
  assertU16(paydayMoney, "paydayMoney");
  assertU8(moneyMultiplier, "moneyMultiplier");
  assertPlayerMoney(playerMoney, "playerMoney");
  assertOptionalU32(battleTextBuff1PaydayMoney, "battleTextBuff1PaydayMoney");
  return Object.freeze({
    battleTypeFlags: battleTypeFlags >>> 0,
    paydayMoney,
    moneyMultiplier,
    playerMoney,
    battleTextBuff1PaydayMoney,
  });
}

function canonicalBattler(side) {
  return Object.freeze({
    side,
    ability: 0,
    hp: 100,
    maxHP: 100,
    moves: Object.freeze([1, 0, 0, 0]),
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
    species: 0,
    attack: 50,
    defense: 50,
    spAttack: 50,
    spDefense: 50,
    level: 50,
    friendship: 0,
    partyIndex: 0,
    isFirstTurn: 0,
  });
}

function canonicalRulesFromRaw(projection) {
  const doubles = (projection.battleTypeFlags & BATTLE_TYPE_DOUBLE) !== 0;
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(Array.from({ length: BATTLE_SLOTS }, (_, battler) => canonicalBattler(battler % 2))),
    selectorRoles: Object.freeze({ attacker: 0, target: 1, effectBattler: 0, fainted: null }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 1,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: Object.freeze({
      battlersCount: doubles ? 4 : 2,
      battleTypeFlags: projection.battleTypeFlags,
      battlerPositions: Object.freeze(doubles ? [0, 1, 2, 3] : [0, 1, 0xff, 0xff]),
    }),
    paydayMoney: projection.paydayMoney,
    moneyMultiplier: projection.moneyMultiplier,
    playerMoney: projection.playerMoney,
    battleTextBuff1PaydayMoney: projection.battleTextBuff1PaydayMoney,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battleTypeFlags: rules.battleTopology.battleTypeFlags >>> 0,
    paydayMoney: rules.paydayMoney,
    moneyMultiplier: rules.moneyMultiplier,
    playerMoney: rules.playerMoney,
    battleTextBuff1PaydayMoney: rules.battleTextBuff1PaydayMoney,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertConstructorRejects(label, projection, message) {
  let actual = null;
  try {
    canonicalRulesFromRaw(projection);
  } catch (error) {
    assert(error instanceof Error, `${label}: constructor threw non-Error`);
    actual = error.message;
  }
  assert(actual === message, `${label}: expected ${message}, got ${String(actual)}`);
}

const canonicalBase = Object.freeze({
  battleTypeFlags: 0,
  paydayMoney: 1,
  moneyMultiplier: 1,
  playerMoney: 0,
  battleTextBuff1PaydayMoney: null,
});
for (const [label, projection, message] of [
  ["flags", { ...canonicalBase, battleTypeFlags: U32_MAX + 1 }, "battleTopology.battleTypeFlags must be an unsigned integer <= 4294967295, got 4294967296"],
  ["payday", { ...canonicalBase, paydayMoney: U16_MAX + 1 }, "paydayMoney must be an unsigned integer <= 65535, got 65536"],
  ["multiplier", { ...canonicalBase, moneyMultiplier: U8_MAX + 1 }, "moneyMultiplier must be an unsigned integer <= 255, got 256"],
  ["player-money", { ...canonicalBase, playerMoney: MAX_MONEY + 1 }, "playerMoney must be an unsigned integer <= 999999, got 1000000"],
  ["prior-buffer", { ...canonicalBase, battleTextBuff1PaydayMoney: U32_MAX + 1 }, "battleTextBuff1PaydayMoney must be an unsigned integer <= 4294967295, got 4294967296"],
]) {
  assertConstructorRejects(label, projection, message);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === 1, `expected exactly one ${OPCODE_NAME}, got ${instructions.length}`);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, `opcode drifted to ${instruction.opcodeId}`);
assert(instruction.dispatcher === DISPATCHER, `dispatcher drifted to ${instruction.dispatcher}`);
assert(instruction.source.label === ENTRY_LABEL, `source label drifted to ${instruction.source.label}`);
assert(instruction.operands.length === 0, "canonical opcode must have no operands");
assert(BATTLE_TYPE_LINK === 0x0000_0002, "BATTLE_TYPE_LINK drifted");
assert(BATTLE_TYPE_RECORDED_LINK === 0x0200_0000, "BATTLE_TYPE_RECORDED_LINK drifted");
assert(SUPPRESS_FLAGS === 0x0200_0002, "Pay Day suppression mask drifted");
assert(MAX_MONEY === 999_999, "MAX_MONEY drifted");
const handlers = opcodeModule.createBattleScriptGivepaydaymoneyOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical GIVEPAYDAYMONEY handler was not registered");

function executeSource(initialProjection, applications = 1) {
  const initialRules = canonicalRulesFromRaw(initialProjection);
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  const branches = [];
  for (let application = 0; application < applications; application += 1) {
    const before = vectorState(currentRules);
    const state = machineModule.createBattleScriptMachine(
      program,
      ENTRY_LABEL,
      currentRules,
      (0x51ed_0000 + application) >>> 0,
    );
    const transition = handler({ program, instruction, state });
    assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
    assert(transition.rng === state.rng, "canonical handler consumed RNG");
    assert(transition.events.length === 0, "canonical handler emitted events");
    assert(sameState(vectorState(currentRules), before), "canonical handler mutated its input");
    const suppressedByFlags = (currentRules.battleTopology.battleTypeFlags & SUPPRESS_FLAGS) !== 0;
    const suppressedByZero = currentRules.paydayMoney === 0;
    if (suppressedByFlags || suppressedByZero) {
      assert(transition.control.kind === "advance", "suppressed canonical handler did not advance");
      assert(transition.rulesContext === currentRules, "suppressed canonical handler replaced rules");
      controls.push("advance");
      branches.push(suppressedByFlags ? "link-suppressed" : "zero-payday-suppressed");
    } else {
      assert(transition.control.kind === "call", "payout canonical handler did not call message script");
      assert(transition.rulesContext !== currentRules, "payout canonical handler reused rules");
      assert(transition.rulesContext.battleTopology === currentRules.battleTopology, "payout replaced battle topology");
      assert(transition.rulesContext.paydayMoney === currentRules.paydayMoney, "payout changed paydayMoney");
      assert(transition.rulesContext.moneyMultiplier === currentRules.moneyMultiplier, "payout changed moneyMultiplier");
      controls.push("payout-call");
      branches.push("payout-call");
    }
    currentRules = transition.rulesContext;
  }
  assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated initial rules");
  return Object.freeze({
    initial: inputSnapshot,
    expected: vectorState(currentRules),
    controls: Object.freeze(controls),
    branch: branches.join("-then-"),
  });
}

function packExpected(outcome) {
  const value = outcome.expected;
  const buffer = value.battleTextBuff1PaydayMoney ?? 0;
  const hasBuffer = value.battleTextBuff1PaydayMoney === null ? 0n : 1n;
  const payoutCall = outcome.controls[0] === "payout-call" ? 1n : 0n;
  assertPlayerMoney(value.playerMoney, "packed expected playerMoney");
  assertU32(buffer, "packed expected buffer");
  return BigInt(buffer)
    | (BigInt(value.playerMoney) << 32n)
    | (hasBuffer << 52n)
    | (payoutCall << 53n);
}

const cases = [];
function addCase(label, category, projection, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = executeSource(projection, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: outcome.branch,
    applications,
    initial: outcome.initial,
    expected: outcome.expected,
    controls: outcome.controls,
  }));
}

for (const relevantFlags of RELEVANT_FLAG_COMBINATIONS) {
  for (const unrelatedMask of UNRELATED_FLAG_MASKS) {
    const flags = (relevantFlags | unrelatedMask) >>> 0;
    addCase(
      `flags_r${relevantFlags.toString(16).padStart(8, "0")}_u${unrelatedMask.toString(16).padStart(8, "0")}`,
      "flag-combination-and-unrelated-u32-bit",
      freezeProjection({
        battleTypeFlags: flags,
        paydayMoney: 0x1234,
        moneyMultiplier: 7,
        playerMoney: 321,
        battleTextBuff1PaydayMoney: unrelatedMask === 0 ? null : unrelatedMask,
      }),
    );
  }
}

for (const relevantFlags of RELEVANT_FLAG_COMBINATIONS) {
  addCase(
    `suppression_precedence_r${relevantFlags.toString(16).padStart(8, "0")}`,
    "suppression-precedence",
    freezeProjection({
      battleTypeFlags: relevantFlags,
      paydayMoney: 0,
      moneyMultiplier: U8_MAX,
      playerMoney: MAX_MONEY,
      battleTextBuff1PaydayMoney: U32_MAX,
    }),
  );
}

for (const [index, playerMoney] of PLAYER_MONEY_CAP_BOUNDARIES.entries()) {
  addCase(
    `player_money_cap_boundary_${index}`,
    "player-money-cap-boundary",
    freezeProjection({
      battleTypeFlags: 0,
      paydayMoney: 5,
      moneyMultiplier: 20,
      playerMoney,
      battleTextBuff1PaydayMoney: index % 2 === 0 ? null : U32_MAX,
    }),
  );
}

for (const [index, prior] of PRIOR_BUFFER_BOUNDARIES.entries()) {
  addCase(
    `prior_buffer_payout_${index}`,
    "prior-buffer-boundary-payout-overwrite",
    freezeProjection({
      battleTypeFlags: 0,
      paydayMoney: 0xffff,
      moneyMultiplier: 3,
      playerMoney: 7,
      battleTextBuff1PaydayMoney: prior,
    }),
  );
  addCase(
    `prior_buffer_suppressed_${index}`,
    "prior-buffer-boundary-suppressed-preservation",
    freezeProjection({
      battleTypeFlags: BATTLE_TYPE_LINK,
      paydayMoney: 0xffff,
      moneyMultiplier: 3,
      playerMoney: 7,
      battleTextBuff1PaydayMoney: prior,
    }),
  );
}

addCase(
  "repeated_payout_adds_again_before_cap",
  "repetition-payout-non-idempotent",
  freezeProjection({
    battleTypeFlags: 0,
    paydayMoney: 3,
    moneyMultiplier: 4,
    playerMoney: 10,
    battleTextBuff1PaydayMoney: null,
  }),
  2,
);
addCase(
  "repeated_payout_stays_capped_but_calls_again",
  "repetition-payout-capped",
  freezeProjection({
    battleTypeFlags: 0,
    paydayMoney: 10,
    moneyMultiplier: 20,
    playerMoney: MAX_MONEY - 100,
    battleTextBuff1PaydayMoney: 1,
  }),
  2,
);
addCase(
  "repeated_link_suppression_is_value_idempotent",
  "repetition-suppressed-idempotent",
  freezeProjection({
    battleTypeFlags: BATTLE_TYPE_LINK,
    paydayMoney: 1,
    moneyMultiplier: 1,
    playerMoney: 12,
    battleTextBuff1PaydayMoney: U32_MAX,
  }),
  2,
);
addCase(
  "repeated_zero_payday_suppression_is_value_idempotent",
  "repetition-zero-payday-idempotent",
  freezeProjection({
    battleTypeFlags: 0,
    paydayMoney: 0,
    moneyMultiplier: U8_MAX,
    playerMoney: 12,
    battleTextBuff1PaydayMoney: null,
  }),
  2,
);

const paydaySweepPacked = [];
for (let paydayMoney = 0; paydayMoney <= U16_MAX; paydayMoney += 1) {
  const outcome = executeSource(freezeProjection({
    battleTypeFlags: 0,
    paydayMoney,
    moneyMultiplier: PAYDAY_SWEEP_MULTIPLIER,
    playerMoney: PAYDAY_SWEEP_PLAYER_MONEY,
    battleTextBuff1PaydayMoney: PAYDAY_SWEEP_PRIOR_BUFFER,
  }));
  paydaySweepPacked.push(packExpected(outcome));
}

const multiplierSweepPacked = [];
for (let moneyMultiplier = 0; moneyMultiplier <= U8_MAX; moneyMultiplier += 1) {
  const outcome = executeSource(freezeProjection({
    battleTypeFlags: 0,
    paydayMoney: MULTIPLIER_SWEEP_PAYDAY,
    moneyMultiplier,
    playerMoney: MULTIPLIER_SWEEP_PLAYER_MONEY,
    battleTextBuff1PaydayMoney: MULTIPLIER_SWEEP_PRIOR_BUFFER,
  }));
  multiplierSweepPacked.push(packExpected(outcome));
}

assert(cases.length === 149, `case count drifted: ${cases.length}`);
assert(paydaySweepPacked.length === U16_MAX + 1, "Pay Day full-domain sweep drifted");
assert(multiplierSweepPacked.length === U8_MAX + 1, "multiplier full-domain sweep drifted");
assert(
  cases.filter((value) => value.category === "flag-combination-and-unrelated-u32-bit").length
    === RELEVANT_FLAG_COMBINATIONS.length * UNRELATED_FLAG_MASKS.length,
  "flag matrix cardinality drifted",
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battle-type-flags-u32-values", U32_MAX + 1],
  ["payday-money-u16-values", U16_MAX + 1],
  ["money-multiplier-u8-values", U8_MAX + 1],
  ["player-money-capped-values", MAX_MONEY + 1],
  ["prior-buffer-nullable-values", U32_MAX + 2],
  ["relevant-flag-combinations", RELEVANT_FLAG_COMBINATIONS.length],
  ["unrelated-battle-type-bits", UNRELATED_FLAG_BITS.length],
  ["full-payday-one-dimensional-probes", paydaySweepPacked.length],
  ["full-multiplier-one-dimensional-probes", multiplierSweepPacked.length],
  ["player-money-cap-boundary-probes", PLAYER_MONEY_CAP_BOUNDARIES.length],
  ["prior-buffer-boundary-probes", PRIOR_BUFFER_BOUNDARIES.length],
  ["canonical-invalid-domain-probes", 5],
  ["control-branch-values", 2],
  ["application-count-values", 2],
  ["machine-program-counter-fields-in-projection", 0],
  ["machine-stack-fields-in-projection", 0],
]);
const corpus = Object.freeze({
  relevantFlagCombinations: RELEVANT_FLAG_COMBINATIONS,
  unrelatedFlagBits: UNRELATED_FLAG_BITS,
  playerMoneyCapBoundaries: PLAYER_MONEY_CAP_BOUNDARIES,
  priorBufferBoundaries: PRIOR_BUFFER_BOUNDARIES,
  paydaySweepMultiplier: PAYDAY_SWEEP_MULTIPLIER,
  paydaySweepPlayerMoney: PAYDAY_SWEEP_PLAYER_MONEY,
  paydaySweepPriorBuffer: PAYDAY_SWEEP_PRIOR_BUFFER,
  multiplierSweepPayday: MULTIPLIER_SWEEP_PAYDAY,
  multiplierSweepPlayerMoney: MULTIPLIER_SWEEP_PLAYER_MONEY,
  multiplierSweepPriorBuffer: MULTIPLIER_SWEEP_PRIOR_BUFFER,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
  paydaySweepPacked: paydaySweepPacked.map((value) => value.toString(16)),
  multiplierSweepPacked: multiplierSweepPacked.map((value) => value.toString(16)),
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU8(value) {
  return `0x${value.toString(16).padStart(2, "0")}`;
}

function rustU16(value) {
  return `0x${value.toString(16).padStart(4, "0")}`;
}

function rustU32(value) {
  return `0x${value.toString(16).padStart(8, "0")}`;
}

function rustU64(value) {
  return `0x${value.toString(16).padStart(16, "0")}`;
}

function rustOptionalU32(value) {
  return value === null ? "None" : `Some(${rustU32(value)})`;
}

function rustState(value) {
  return [
    "BattleScriptGivepaydaymoneyVectorState {",
    `battle_type_flags: ${rustU32(value.battleTypeFlags)},`,
    `payday_money: ${rustU16(value.paydayMoney)},`,
    `money_multiplier: ${rustU8(value.moneyMultiplier)},`,
    `player_money: ${value.playerMoney},`,
    `battle_text_buff1_payday_money: ${rustOptionalU32(value.battleTextBuff1PaydayMoney)},`,
    "}",
  ].join(" ");
}

function rustControls(values) {
  return "&[" + values.map((value) => (
    value === "advance"
      ? "BattleScriptGivepaydaymoneyControl::Advance"
      : "BattleScriptGivepaydaymoneyControl::PayoutCall"
  )).join(", ") + "]";
}

function appendU64Array(lines, name, values) {
  lines.push(`pub static ${name}: [u64; ${values.length}] = [`);
  for (let offset = 0; offset < values.length; offset += 4) {
    lines.push("    " + values.slice(offset, offset + 4).map(rustU64).join(", ") + ",");
  }
  lines.push("];" );
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-givepaydaymoney-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptGivepaydaymoneyOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_givepaydaymoney::BattleScriptGivepaydaymoneyControl;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_RELEVANT_FLAG_COMBINATIONS: [u32; ${RELEVANT_FLAG_COMBINATIONS.length}] = [${RELEVANT_FLAG_COMBINATIONS.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_UNRELATED_FLAG_BITS: [u32; ${UNRELATED_FLAG_BITS.length}] = [${UNRELATED_FLAG_BITS.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_PLAYER_MONEY_CAP_BOUNDARIES: [u32; ${PLAYER_MONEY_CAP_BOUNDARIES.length}] = [${PLAYER_MONEY_CAP_BOUNDARIES.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_PRIOR_BUFFER_BOUNDARIES: [Option<u32>; ${PRIOR_BUFFER_BOUNDARIES.length}] = [${PRIOR_BUFFER_BOUNDARIES.map(rustOptionalU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_PAYDAY_SWEEP_MULTIPLIER: u8 = ${rustU8(PAYDAY_SWEEP_MULTIPLIER)};`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_PAYDAY_SWEEP_PLAYER_MONEY: u32 = ${PAYDAY_SWEEP_PLAYER_MONEY};`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_PAYDAY_SWEEP_PRIOR_BUFFER: Option<u32> = ${rustOptionalU32(PAYDAY_SWEEP_PRIOR_BUFFER)};`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_MULTIPLIER_SWEEP_PAYDAY: u16 = ${rustU16(MULTIPLIER_SWEEP_PAYDAY)};`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_MULTIPLIER_SWEEP_PLAYER_MONEY: u32 = ${MULTIPLIER_SWEEP_PLAYER_MONEY};`);
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_MULTIPLIER_SWEEP_PRIOR_BUFFER: Option<u32> = ${rustOptionalU32(MULTIPLIER_SWEEP_PRIOR_BUFFER)};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptGivepaydaymoneyVectorState {");
lines.push("    pub battle_type_flags: u32,");
lines.push("    pub payday_money: u16,");
lines.push("    pub money_multiplier: u8,");
lines.push("    pub player_money: u32,");
lines.push("    pub battle_text_buff1_payday_money: Option<u32>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptGivepaydaymoneyVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptGivepaydaymoneyVectorState,");
lines.push("    pub expected: BattleScriptGivepaydaymoneyVectorState,");
lines.push("    pub controls: &'static [BattleScriptGivepaydaymoneyControl],");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_GIVEPAYDAYMONEY_CASES: [BattleScriptGivepaydaymoneyVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push("    BattleScriptGivepaydaymoneyVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        applications: ${value.applications},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustState(value.expected)},`);
  lines.push(`        controls: ${rustControls(value.controls)},`);
  lines.push("    },");
}
lines.push("];" );
lines.push("");
appendU64Array(lines, "BATTLE_SCRIPT_GIVEPAYDAYMONEY_PAYDAY_SWEEP_PACKED", paydaySweepPacked);
lines.push("");
appendU64Array(lines, "BATTLE_SCRIPT_GIVEPAYDAYMONEY_MULTIPLIER_SWEEP_PACKED", multiplierSweepPacked);

fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
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
assert(formatted, "could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.byteLength < GENERATED_FILE_MAX_BYTES, `generated Rust is ${generated.byteLength} bytes, limit ${GENERATED_FILE_MAX_BYTES}`);
const generatedHash = crypto.createHash("sha256").update(generated).digest("hex");
console.log(`gen-battle-script-givepaydaymoney-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-givepaydaymoney-vectors: ${cases.length} finite cases, ${paydaySweepPacked.length} Pay Day sweep values, ${multiplierSweepPacked.length} multiplier sweep values`);
console.log(`gen-battle-script-givepaydaymoney-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-givepaydaymoney-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-givepaydaymoney-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-givepaydaymoney-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-givepaydaymoney-vectors: generated sha256 ${generatedHash}`);
