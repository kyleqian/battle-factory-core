#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrysetspikesOpcode.ts.
// Expected complete projected outputs, controls, and exact handler errors are
// created only by executing the canonical TypeScript opcode handler. This
// script owns bounded valid/malformed input construction and Rust literal
// emission; Rust's FailJump deliberately omits the canonical machine's
// absolute program counter.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysetspikes-vectors.mjs

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
  "battle_script_trysetspikes_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrysetspikesOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETSPIKES";
const OPCODE_ID = 0xb0;
const DISPATCHER = "Cmd_trysetspikes";
const ENTRY_LABEL = "BattleScript_EffectSpikes";
const FAILURE_POINTER = "BattleScript_FailedFromAtkString";
const INVALID_FAILURE_POINTER = "BattleScript_UnresolvedTrysetspikesFailure";
const BATTLE_SLOTS = 4;
const SIDE_COUNT = 2;
const U8_MAX = 0xff;
const U32_MAX = 0xffff_ffff;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, ...ATTACKER_DOMAIN]);
const SIDE_DOMAIN = Object.freeze([0, 1]);
const CANONICAL_BATTLER_SIDES = Object.freeze([0, 1, 0, 1]);
const SPIKES_AMOUNT_U8_DOMAIN = Object.freeze(
  Array.from({ length: U8_MAX + 1 }, (_, value) => value),
);
const U8_EDGE_VALUES = Object.freeze([0, 1, 2, 3, 4, 0x7f, 0xfe, 0xff]);
const SUCCESS_U8_EDGE_VALUES = Object.freeze([0, 1, 2, 4, 0x7f, 0xfe, 0xff]);
const SIDE_STATUS_U32_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  0x4000_0000,
  0x0000_0010,
  0xffff_ffef,
  0x0100_0001,
  0x7fff_ffff,
]);
const SPIKES_STATUS = opcodeModule.BATTLE_SCRIPT_SIDE_STATUS_SPIKES;
const GENERATED_FILE_MAX_BYTES = 8_000_000;
const INVALID_OPERAND_ERROR = "Cmd_trysetspikes requires exactly one four-byte failure pointer";
const MISSING_ATTACKER_ERROR = "Battle Script hit-chain command requires a attacker role";

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trysetspikes-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertSide(value, label) {
  assert(SIDE_DOMAIN.includes(value), `${label} must be a side 0 or 1, got ${value}`);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U8_MAX, `${label} must be a u8, got ${value}`);
}

function assertU32(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= U32_MAX,
    `${label} must be a u32, got ${value}`,
  );
}

function freezeSideTimer(value, label) {
  assertU8(value.reflectTimer, `${label}.reflectTimer`);
  assertBattler(value.reflectBattlerId, `${label}.reflectBattlerId`);
  assertU8(value.lightscreenTimer, `${label}.lightscreenTimer`);
  assertBattler(value.lightscreenBattlerId, `${label}.lightscreenBattlerId`);
  assertU8(value.safeguardTimer, `${label}.safeguardTimer`);
  assertBattler(value.safeguardBattlerId, `${label}.safeguardBattlerId`);
  assertBattler(value.mistBattlerId, `${label}.mistBattlerId`);
  assertU8(value.followmeTimer, `${label}.followmeTimer`);
  assertBattler(value.followmeTarget, `${label}.followmeTarget`);
  assertU8(value.spikesAmount, `${label}.spikesAmount`);
  return Object.freeze({
    reflectTimer: value.reflectTimer,
    reflectBattlerId: value.reflectBattlerId,
    lightscreenTimer: value.lightscreenTimer,
    lightscreenBattlerId: value.lightscreenBattlerId,
    safeguardTimer: value.safeguardTimer,
    safeguardBattlerId: value.safeguardBattlerId,
    mistBattlerId: value.mistBattlerId,
    followmeTimer: value.followmeTimer,
    followmeTarget: value.followmeTarget,
    spikesAmount: value.spikesAmount,
  });
}

function freezeProjection({
  battlerSides,
  ppNotAffectedByPressure,
  sideStatuses,
  sideTimers,
  mistTimers,
  attacker,
  target,
  effectBattler,
  fainted,
}) {
  assert(Array.isArray(battlerSides) && battlerSides.length === BATTLE_SLOTS, "battlerSides must have four cells");
  battlerSides.forEach((side, index) => assertSide(side, `battlerSides[${index}]`));
  assert(
    Array.isArray(ppNotAffectedByPressure) && ppNotAffectedByPressure.length === BATTLE_SLOTS,
    "ppNotAffectedByPressure must have four cells",
  );
  ppNotAffectedByPressure.forEach((value, index) => {
    assert(value === 0 || value === 1, `ppNotAffectedByPressure[${index}] must be 0 or 1, got ${value}`);
  });
  assert(Array.isArray(sideStatuses) && sideStatuses.length === SIDE_COUNT, "sideStatuses must have two cells");
  sideStatuses.forEach((value, side) => assertU32(value, `sideStatuses[${side}]`));
  assert(Array.isArray(sideTimers) && sideTimers.length === SIDE_COUNT, "sideTimers must have two records");
  assert(Array.isArray(mistTimers) && mistTimers.length === SIDE_COUNT, "mistTimers must have two cells");
  mistTimers.forEach((value, side) => assertU8(value, `mistTimers[${side}]`));
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  assertOptionalBattler(effectBattler, "effectBattler role");
  assertOptionalBattler(fainted, "fainted role");
  return Object.freeze({
    battlerSides: Object.freeze([...battlerSides]),
    ppNotAffectedByPressure: Object.freeze([...ppNotAffectedByPressure]),
    sideStatuses: Object.freeze(sideStatuses.map((value) => value >>> 0)),
    sideTimers: Object.freeze([
      freezeSideTimer(sideTimers[0], "sideTimers[0]"),
      freezeSideTimer(sideTimers[1], "sideTimers[1]"),
    ]),
    mistTimers: Object.freeze([...mistTimers]),
    attacker,
    target,
    effectBattler,
    fainted,
  });
}

function edgeU8(salt) {
  return U8_EDGE_VALUES[salt % U8_EDGE_VALUES.length];
}

function edgeStatus(salt) {
  return SIDE_STATUS_U32_EDGE_VALUES[salt % SIDE_STATUS_U32_EDGE_VALUES.length];
}

function bitPattern(seed) {
  return ATTACKER_DOMAIN.map((battler) => ((seed * 73 + battler * 17) >>> battler) & 1);
}

function makeSideTimer(salt, spikesAmount) {
  assertU8(spikesAmount, "generated spikesAmount");
  return freezeSideTimer({
    reflectTimer: edgeU8(salt),
    reflectBattlerId: ATTACKER_DOMAIN[(salt + 1) % ATTACKER_DOMAIN.length],
    lightscreenTimer: edgeU8(salt + 2),
    lightscreenBattlerId: ATTACKER_DOMAIN[(salt + 3) % ATTACKER_DOMAIN.length],
    safeguardTimer: edgeU8(salt + 4),
    safeguardBattlerId: ATTACKER_DOMAIN[(salt + 5) % ATTACKER_DOMAIN.length],
    mistBattlerId: ATTACKER_DOMAIN[(salt + 6) % ATTACKER_DOMAIN.length],
    followmeTimer: edgeU8(salt + 7),
    followmeTarget: ATTACKER_DOMAIN[(salt + 8) % ATTACKER_DOMAIN.length],
    spikesAmount,
  }, `generatedSideTimer(${salt})`);
}

function makeProjection({
  salt = 0,
  battlerSides = CANONICAL_BATTLER_SIDES,
  ppNotAffectedByPressure = bitPattern(salt),
  sideStatuses = [edgeStatus(salt), edgeStatus(salt + 3)],
  spikesAmounts = [edgeU8(salt + 5), edgeU8(salt + 9)],
  sideTimers = undefined,
  mistTimers = [edgeU8(salt + 11), edgeU8(salt + 13)],
  attacker = 0,
  target = 1,
  effectBattler = 2,
  fainted = 3,
} = {}) {
  assert(Array.isArray(spikesAmounts) && spikesAmounts.length === SIDE_COUNT, "spikesAmounts must have two cells");
  spikesAmounts.forEach((value, side) => assertU8(value, `spikesAmounts[${side}]`));
  return freezeProjection({
    battlerSides,
    ppNotAffectedByPressure,
    sideStatuses,
    sideTimers: sideTimers ?? [
      makeSideTimer(salt + 17, spikesAmounts[0]),
      makeSideTimer(salt + 31, spikesAmounts[1]),
    ],
    mistTimers,
    attacker,
    target,
    effectBattler,
    fainted,
  });
}

function spikesAmountsForTarget(attackerSide, targetAmount, salt) {
  assertSide(attackerSide, "attacker side");
  assertU8(targetAmount, "target spikesAmount");
  const amounts = [edgeU8(salt + 1), edgeU8(salt + 5)];
  amounts[attackerSide ^ 1] = targetAmount;
  return amounts;
}

function canonicalBattler(side, ppNotAffectedByPressure) {
  return Object.freeze({
    side,
    ability: 0,
    hp: 100,
    maxHP: 100,
    moves: Object.freeze([0, 0, 0, 0]),
    pp: Object.freeze([0, 0, 0, 0]),
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
    ppNotAffectedByPressure,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(ATTACKER_DOMAIN.map((battler) => canonicalBattler(
      projection.battlerSides[battler],
      projection.ppNotAffectedByPressure[battler],
    ))),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.effectBattler,
      fainted: projection.fainted,
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
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: 0,
    sideStatuses: projection.sideStatuses,
    sideTimers: projection.sideTimers,
    mistTimers: projection.mistTimers,
  });
}

function vectorTimer(timer) {
  return Object.freeze({
    reflectTimer: timer.reflectTimer,
    reflectBattlerId: timer.reflectBattlerId,
    lightscreenTimer: timer.lightscreenTimer,
    lightscreenBattlerId: timer.lightscreenBattlerId,
    safeguardTimer: timer.safeguardTimer,
    safeguardBattlerId: timer.safeguardBattlerId,
    mistBattlerId: timer.mistBattlerId,
    followmeTimer: timer.followmeTimer,
    followmeTarget: timer.followmeTarget,
    spikesAmount: timer.spikesAmount,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlerSides: Object.freeze(rules.battlers.map((battler) => battler.side)),
    ppNotAffectedByPressure: Object.freeze(rules.battlers.map((battler, index) => {
      const value = battler.ppNotAffectedByPressure;
      assert(value === 0 || value === 1, `battlers[${index}].ppNotAffectedByPressure must be 0 or 1`);
      return value;
    })),
    sideStatuses: Object.freeze(rules.sideStatuses.map((value) => value >>> 0)),
    sideTimers: Object.freeze(rules.sideTimers.map(vectorTimer)),
    mistTimers: Object.freeze([...rules.mistTimers]),
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
assert(instruction.source.label === ENTRY_LABEL, `expected source label ${ENTRY_LABEL}, got ${instruction.source.label}`);
assert(instruction.operands.length === 1, "canonical opcode must have one failure pointer");
assert(instruction.operands[0]?.widthBytes === 4, "canonical failure pointer must be four bytes");
assert(
  instruction.operands[0]?.expression === FAILURE_POINTER,
  `canonical failure pointer drifted to ${instruction.operands[0]?.expression}`,
);
assert(SPIKES_STATUS === 0x0000_0010, `SIDE_STATUS_SPIKES drifted to ${SPIKES_STATUS}`);
assert(programModule.resolveBattleScriptLabel(program, FAILURE_POINTER), "canonical failure pointer must resolve");
assert(!programModule.resolveBattleScriptLabel(program, INVALID_FAILURE_POINTER), "invalid failure pointer unexpectedly resolves");

const handlers = opcodeModule.createBattleScriptTrysetspikesOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical TRYSETSPIKES handler was not registered");

function freezeOperandSpec(operandWidths, operandExpressions) {
  assert(Array.isArray(operandWidths), "operandWidths must be an array");
  assert(Array.isArray(operandExpressions), "operandExpressions must be an array");
  assert(operandWidths.length === operandExpressions.length, "operand width/expression counts must match");
  operandWidths.forEach((width, index) => assertU8(width, `operandWidths[${index}]`));
  operandExpressions.forEach((expression, index) => {
    assert(typeof expression === "string", `operandExpressions[${index}] must be a string`);
  });
  return Object.freeze({
    operandWidths: Object.freeze([...operandWidths]),
    operandExpressions: Object.freeze([...operandExpressions]),
  });
}

const CANONICAL_OPERAND_SPEC = freezeOperandSpec([4], [FAILURE_POINTER]);

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...instruction.operands[0],
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({ ...instruction, operands: Object.freeze(operands) });
}

function vectorInstruction(spec) {
  const sourceInstruction = instructionFromSpec(spec);
  const first = sourceInstruction.operands[0];
  return Object.freeze({
    operandWidths: Object.freeze([...spec.operandWidths]),
    operandExpressions: Object.freeze([...spec.operandExpressions]),
    resolvedFailureTarget: first === undefined
      ? null
      : (programModule.resolveBattleScriptLabel(program, first.expression) ? first.expression : null),
  });
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "fail-jump";
  throw new Error(`canonical handler returned unsupported control ${transition.control.kind}`);
}

function assertCanonicalTransition(currentRules, sourceInstruction, transition) {
  const attacker = currentRules.selectorRoles.attacker;
  assert(attacker !== null, "successful canonical handler had no attacker");
  assert(sourceInstruction.operands.length === 1, "successful handler had malformed operands");
  const operand = sourceInstruction.operands[0];
  assert(operand?.widthBytes === 4, "successful handler had non-four-byte operand");
  const attackerSide = currentRules.battlers[attacker].side;
  const targetSide = attackerSide === 0 ? 1 : 0;
  const amount = currentRules.sideTimers[targetSide].spikesAmount;
  const control = controlFromTransition(transition);
  const next = transition.rulesContext;

  assert(Object.isFrozen(next), "canonical output rules must be frozen");
  assert(next !== currentRules, "canonical valid handler must replace rules context");
  assert(next.selectorRoles === currentRules.selectorRoles, "canonical handler replaced selector roles");
  assert(next.mistTimers === currentRules.mistTimers, "canonical handler replaced mistTimers");

  if (amount === 3) {
    assert(control === "fail-jump", "canonical exact-three branch did not jump");
    assert(next.sideStatuses === currentRules.sideStatuses, "canonical failure changed sideStatuses collection");
    assert(next.sideTimers === currentRules.sideTimers, "canonical failure changed sideTimers collection");
    assert(next.battlers !== currentRules.battlers, "canonical failure did not replace battlers collection");
    for (const battler of ATTACKER_DOMAIN) {
      if (battler === attacker) {
        assert(next.battlers[battler] !== currentRules.battlers[battler], "canonical failure did not replace attacker");
        assert(next.battlers[battler].ppNotAffectedByPressure === 1, "canonical failure did not set attacker Pressure exemption");
      } else {
        assert(next.battlers[battler] === currentRules.battlers[battler], `canonical failure replaced sibling battler ${battler}`);
      }
    }
    return control;
  }

  assert(control === "advance", "canonical non-three branch did not advance");
  assert(next.battlers === currentRules.battlers, "canonical success replaced battlers collection");
  assert(next.sideStatuses !== currentRules.sideStatuses, "canonical success did not replace sideStatuses collection");
  assert(next.sideTimers !== currentRules.sideTimers, "canonical success did not replace sideTimers collection");
  assert(next.sideStatuses[targetSide] === ((currentRules.sideStatuses[targetSide] | SPIKES_STATUS) >>> 0), "canonical success did not OR target-side Spikes bit");
  assert(next.sideStatuses[attackerSide] === currentRules.sideStatuses[attackerSide], "canonical success changed attacker-side status word");
  assert(next.sideTimers[targetSide] !== currentRules.sideTimers[targetSide], "canonical success did not replace target timer");
  assert(next.sideTimers[attackerSide] === currentRules.sideTimers[attackerSide], "canonical success replaced attacker-side timer");
  assert(next.sideTimers[targetSide].spikesAmount === ((amount + 1) & U8_MAX), "canonical success did not wrap target spikes amount");
  for (const field of [
    "reflectTimer",
    "reflectBattlerId",
    "lightscreenTimer",
    "lightscreenBattlerId",
    "safeguardTimer",
    "safeguardBattlerId",
    "mistBattlerId",
    "followmeTimer",
    "followmeTarget",
  ]) {
    assert(
      next.sideTimers[targetSide][field] === currentRules.sideTimers[targetSide][field],
      `canonical success changed target-side timer sibling ${field}`,
    );
  }
  return control;
}

function sourceOutcome(initialProjection, operandSpec, applications) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
  const sourceInstruction = instructionFromSpec(operandSpec);
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
      const transition = handler({ program, instruction: sourceInstruction, state });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
      controls.push(assertCanonicalTransition(currentRules, sourceInstruction, transition));
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated initial rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated initial rules");
    return Object.freeze({ expected: null, controls: Object.freeze(controls), error: error.message });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.controls.join("-then-");
  if (outcome.error === INVALID_OPERAND_ERROR) return "invalid-failure-pointer-operand";
  if (outcome.error === MISSING_ATTACKER_ERROR) return "missing-attacker-role";
  if (outcome.error.startsWith("Cmd_trysetspikes unresolved failure target ")) return "unresolved-failure-target";
  throw new Error(`unexpected canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, initialProjection, applications = 1, operandSpec = CANONICAL_OPERAND_SPEC) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(Number.isInteger(applications) && applications >= 1 && applications <= 4, `${label}: applications must be 1..4`);
  const outcome = sourceOutcome(initialProjection, operandSpec, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    instruction: vectorInstruction(operandSpec),
    initial: vectorState(canonicalRulesFromProjection(initialProjection)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

for (const attackerSide of SIDE_DOMAIN) {
  const attacker = attackerSide;
  for (const amount of SPIKES_AMOUNT_U8_DOMAIN) {
    const salt = attackerSide * 257 + amount;
    addCase(
      `u8_amount_side${attackerSide}_value${amount}`,
      "spikes-amount-u8-full-domain-by-attacker-side",
      makeProjection({
        salt,
        spikesAmounts: spikesAmountsForTarget(attackerSide, amount, salt),
        attacker,
        target: OPTIONAL_BATTLER_DOMAIN[(salt + 1) % OPTIONAL_BATTLER_DOMAIN.length],
        effectBattler: OPTIONAL_BATTLER_DOMAIN[(salt + 2) % OPTIONAL_BATTLER_DOMAIN.length],
        fainted: OPTIONAL_BATTLER_DOMAIN[(salt + 3) % OPTIONAL_BATTLER_DOMAIN.length],
      }),
    );
  }
}

for (const attacker of ATTACKER_DOMAIN) {
  for (const attackerSide of SIDE_DOMAIN) {
    for (const amount of U8_EDGE_VALUES) {
      const salt = attacker * 197 + attackerSide * 31 + amount;
      const battlerSides = [...CANONICAL_BATTLER_SIDES];
      battlerSides[attacker] = attackerSide;
      addCase(
        `attacker_alias_a${attacker}_side${attackerSide}_amount${amount}`,
        "attacker-side-alias-and-boundary-matrix",
        makeProjection({
          salt,
          battlerSides,
          spikesAmounts: spikesAmountsForTarget(attackerSide, amount, salt),
          attacker,
          target: OPTIONAL_BATTLER_DOMAIN[(salt + 1) % OPTIONAL_BATTLER_DOMAIN.length],
          effectBattler: OPTIONAL_BATTLER_DOMAIN[(salt + 2) % OPTIONAL_BATTLER_DOMAIN.length],
          fainted: OPTIONAL_BATTLER_DOMAIN[(salt + 3) % OPTIONAL_BATTLER_DOMAIN.length],
        }),
      );
    }
  }
}

for (const attacker of ATTACKER_DOMAIN) {
  for (const target of OPTIONAL_BATTLER_DOMAIN) {
    for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
      for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
        const salt = attacker * 125
          + (target ?? 4) * 25
          + (effectBattler ?? 4) * 5
          + (fainted ?? 4);
        const attackerSide = CANONICAL_BATTLER_SIDES[attacker];
        addCase(
          `selector_a${attacker}_t${target ?? "n"}_e${effectBattler ?? "n"}_f${fainted ?? "n"}`,
          "complete-attacker-target-effect-fainted-selector-matrix",
          makeProjection({
            salt: 800 + salt,
            spikesAmounts: spikesAmountsForTarget(attackerSide, salt & U8_MAX, salt),
            attacker,
            target,
            effectBattler,
            fainted,
          }),
        );
      }
    }
  }
}

for (const attackerSide of SIDE_DOMAIN) {
  const attacker = attackerSide;
  const targetSide = attackerSide ^ 1;
  for (const [attackerStatusIndex, attackerStatus] of SIDE_STATUS_U32_EDGE_VALUES.entries()) {
    for (const [targetStatusIndex, targetStatus] of SIDE_STATUS_U32_EDGE_VALUES.entries()) {
      const salt = 2_000 + attackerSide * 100 + attackerStatusIndex * 10 + targetStatusIndex;
      const sideStatuses = [0, 0];
      sideStatuses[attackerSide] = attackerStatus;
      sideStatuses[targetSide] = targetStatus;
      addCase(
        `status_edges_side${attackerSide}_own${attackerStatusIndex}_target${targetStatusIndex}`,
        "side-status-u32-edge-pair-matrix",
        makeProjection({
          salt,
          sideStatuses,
          spikesAmounts: spikesAmountsForTarget(
            attackerSide,
            SUCCESS_U8_EDGE_VALUES[(attackerStatusIndex + targetStatusIndex) % SUCCESS_U8_EDGE_VALUES.length],
            salt,
          ),
          attacker,
          target: OPTIONAL_BATTLER_DOMAIN[(salt + 1) % OPTIONAL_BATTLER_DOMAIN.length],
          effectBattler: OPTIONAL_BATTLER_DOMAIN[(salt + 2) % OPTIONAL_BATTLER_DOMAIN.length],
          fainted: OPTIONAL_BATTLER_DOMAIN[(salt + 3) % OPTIONAL_BATTLER_DOMAIN.length],
        }),
      );
    }
  }
}

for (let packedBits = 0; packedBits < 16; packedBits += 1) {
  const attacker = packedBits % BATTLE_SLOTS;
  const attackerSide = CANONICAL_BATTLER_SIDES[attacker];
  const ppNotAffectedByPressure = ATTACKER_DOMAIN.map((battler) => (packedBits >>> battler) & 1);
  addCase(
    `prior_pressure_bits_${packedBits}`,
    "complete-per-battler-pressure-prior-bit-matrix",
    makeProjection({
      salt: 3_000 + packedBits,
      ppNotAffectedByPressure,
      spikesAmounts: spikesAmountsForTarget(attackerSide, packedBits & 7, packedBits),
      attacker,
      target: OPTIONAL_BATTLER_DOMAIN[(packedBits + 1) % OPTIONAL_BATTLER_DOMAIN.length],
      effectBattler: OPTIONAL_BATTLER_DOMAIN[(packedBits + 2) % OPTIONAL_BATTLER_DOMAIN.length],
      fainted: OPTIONAL_BATTLER_DOMAIN[(packedBits + 3) % OPTIONAL_BATTLER_DOMAIN.length],
    }),
  );
}

for (const attackerSide of SIDE_DOMAIN) {
  const attacker = attackerSide === 0 ? 2 : 3;
  for (const [edgeIndex, amount] of U8_EDGE_VALUES.entries()) {
    const salt = 4_000 + attackerSide * 100 + edgeIndex;
    const targetSide = attackerSide ^ 1;
    const sideTimers = [
      makeSideTimer(salt + 1, edgeU8(salt + 1)),
      makeSideTimer(salt + 19, edgeU8(salt + 19)),
    ];
    sideTimers[targetSide] = freezeSideTimer({
      reflectTimer: amount,
      reflectBattlerId: (attacker + 1) % BATTLE_SLOTS,
      lightscreenTimer: U8_EDGE_VALUES[(edgeIndex + 1) % U8_EDGE_VALUES.length],
      lightscreenBattlerId: (attacker + 2) % BATTLE_SLOTS,
      safeguardTimer: U8_EDGE_VALUES[(edgeIndex + 2) % U8_EDGE_VALUES.length],
      safeguardBattlerId: (attacker + 3) % BATTLE_SLOTS,
      mistBattlerId: attacker,
      followmeTimer: U8_EDGE_VALUES[(edgeIndex + 3) % U8_EDGE_VALUES.length],
      followmeTarget: (attacker + 1) % BATTLE_SLOTS,
      spikesAmount: amount,
    }, "side-timer edge target");
    addCase(
      `side_timer_edges_side${attackerSide}_amount${amount}`,
      "side-timer-sibling-u8-edge-preservation",
      makeProjection({
        salt,
        sideTimers,
        spikesAmounts: [sideTimers[0].spikesAmount, sideTimers[1].spikesAmount],
        mistTimers: [U8_EDGE_VALUES[(edgeIndex + 4) % U8_EDGE_VALUES.length], amount],
        attacker,
        target: attacker,
        effectBattler: (attacker + 2) % BATTLE_SLOTS,
        fainted: (attacker + 3) % BATTLE_SLOTS,
      }),
    );
  }
}

for (const battler of ATTACKER_DOMAIN) {
  const other = (battler + 1) % BATTLE_SLOTS;
  const attackerSide = CANONICAL_BATTLER_SIDES[battler];
  const aliasRows = [
    Object.freeze({ target: battler, effectBattler: battler, fainted: battler }),
    Object.freeze({ target: battler, effectBattler: other, fainted: null }),
    Object.freeze({ target: other, effectBattler: other, fainted: other }),
    Object.freeze({ target: other, effectBattler: battler, fainted: battler }),
  ];
  for (const [aliasIndex, aliases] of aliasRows.entries()) {
    const salt = 5_000 + battler * 10 + aliasIndex;
    addCase(
      `selector_alias_b${battler}_variant${aliasIndex}`,
      "explicit-selector-alias-permutations",
      makeProjection({
        salt,
        spikesAmounts: spikesAmountsForTarget(attackerSide, aliasIndex === 1 ? 3 : aliasIndex, salt),
        attacker: battler,
        target: aliases.target,
        effectBattler: aliases.effectBattler,
        fainted: aliases.fainted,
      }),
    );
  }
}

const malformedZero = freezeOperandSpec([], []);
const malformedTwo = freezeOperandSpec([4, 4], [FAILURE_POINTER, FAILURE_POINTER]);
const malformedWidth = freezeOperandSpec([2], [FAILURE_POINTER]);
const unresolved = freezeOperandSpec([4], [INVALID_FAILURE_POINTER]);

addCase(
  "malformed_zero_operands_precedes_missing_attacker_and_failure_lookup",
  "ordered-handler-errors",
  makeProjection({
    salt: 6_000,
    spikesAmounts: [0, 3],
    attacker: null,
    target: 3,
    effectBattler: 2,
    fainted: 1,
  }),
  1,
  malformedZero,
);
addCase(
  "malformed_two_operands_precedes_missing_attacker_and_failure_lookup",
  "ordered-handler-errors",
  makeProjection({
    salt: 6_001,
    spikesAmounts: [0, 3],
    attacker: null,
    target: null,
    effectBattler: 2,
    fainted: 1,
  }),
  1,
  malformedTwo,
);
addCase(
  "malformed_width_precedes_missing_attacker_and_failure_lookup",
  "ordered-handler-errors",
  makeProjection({
    salt: 6_002,
    spikesAmounts: [0, 3],
    attacker: null,
    target: 3,
    effectBattler: null,
    fainted: 1,
  }),
  1,
  malformedWidth,
);
addCase(
  "missing_attacker_precedes_exact_three_unresolved_failure_lookup",
  "ordered-handler-errors",
  makeProjection({
    salt: 6_003,
    spikesAmounts: [0, 3],
    attacker: null,
    target: 3,
    effectBattler: 2,
    fainted: null,
  }),
  1,
  unresolved,
);
addCase(
  "unresolved_failure_target_after_attacker_and_exact_three_check",
  "ordered-handler-errors",
  makeProjection({
    salt: 6_004,
    spikesAmounts: [0, 3],
    attacker: 0,
    target: 3,
    effectBattler: 2,
    fainted: 1,
  }),
  1,
  unresolved,
);
addCase(
  "unresolved_failure_target_not_read_on_nonthree_success",
  "unresolved-label-success-skip",
  makeProjection({
    salt: 6_005,
    spikesAmounts: [0, 2],
    attacker: 0,
    target: 3,
    effectBattler: 2,
    fainted: 1,
  }),
  1,
  unresolved,
);

addCase(
  "repeated_zero_layers_advances_three_times_then_failjumps_with_pressure_only",
  "repeated-application-paths",
  makeProjection({
    salt: 7_000,
    spikesAmounts: [1, 0],
    attacker: 0,
    target: 0,
    effectBattler: 2,
    fainted: 3,
  }),
  4,
);
addCase(
  "repeated_corrupt_255_wraps_and_advances",
  "repeated-application-paths",
  makeProjection({
    salt: 7_001,
    spikesAmounts: [1, U8_MAX],
    attacker: 0,
    target: 1,
    effectBattler: 2,
    fainted: null,
  }),
  3,
);
addCase(
  "repeated_exact_three_failjump_is_pressure_idempotent",
  "repeated-application-paths",
  makeProjection({
    salt: 7_002,
    spikesAmounts: [3, 1],
    attacker: 1,
    target: 1,
    effectBattler: 0,
    fainted: 3,
  }),
  2,
);
addCase(
  "repeated_two_then_three_advances_then_failjumps",
  "repeated-application-paths",
  makeProjection({
    salt: 7_003,
    spikesAmounts: [1, 2],
    attacker: 0,
    target: 2,
    effectBattler: 1,
    fainted: 3,
  }),
  2,
);

const FULL_U8_CASE_COUNT = SIDE_DOMAIN.length * SPIKES_AMOUNT_U8_DOMAIN.length;
const ATTACKER_ALIAS_CASE_COUNT = ATTACKER_DOMAIN.length * SIDE_DOMAIN.length * U8_EDGE_VALUES.length;
const SELECTOR_MATRIX_CASE_COUNT = ATTACKER_DOMAIN.length * OPTIONAL_BATTLER_DOMAIN.length ** 3;
const STATUS_EDGE_PAIR_CASE_COUNT = SIDE_DOMAIN.length * SIDE_STATUS_U32_EDGE_VALUES.length ** 2;
const PRESSURE_BIT_CASE_COUNT = 1 << BATTLE_SLOTS;
const TIMER_EDGE_CASE_COUNT = SIDE_DOMAIN.length * U8_EDGE_VALUES.length;
const SELECTOR_ALIAS_CASE_COUNT = ATTACKER_DOMAIN.length * 4;
const ORDERED_ERROR_CASE_COUNT = 5;
const UNRESOLVED_SUCCESS_CASE_COUNT = 1;
const REPEATED_CASE_COUNT = 4;
assert(FULL_U8_CASE_COUNT === 512, `full u8 case count drifted to ${FULL_U8_CASE_COUNT}`);
assert(ATTACKER_ALIAS_CASE_COUNT === 64, `attacker alias case count drifted to ${ATTACKER_ALIAS_CASE_COUNT}`);
assert(SELECTOR_MATRIX_CASE_COUNT === 500, `selector matrix case count drifted to ${SELECTOR_MATRIX_CASE_COUNT}`);
assert(STATUS_EDGE_PAIR_CASE_COUNT === 128, `status edge pair count drifted to ${STATUS_EDGE_PAIR_CASE_COUNT}`);
assert(PRESSURE_BIT_CASE_COUNT === 16, `Pressure bit case count drifted to ${PRESSURE_BIT_CASE_COUNT}`);
assert(TIMER_EDGE_CASE_COUNT === 16, `timer edge case count drifted to ${TIMER_EDGE_CASE_COUNT}`);
assert(SELECTOR_ALIAS_CASE_COUNT === 16, `selector alias case count drifted to ${SELECTOR_ALIAS_CASE_COUNT}`);
assert(
  cases.length === FULL_U8_CASE_COUNT
    + ATTACKER_ALIAS_CASE_COUNT
    + SELECTOR_MATRIX_CASE_COUNT
    + STATUS_EDGE_PAIR_CASE_COUNT
    + PRESSURE_BIT_CASE_COUNT
    + TIMER_EDGE_CASE_COUNT
    + SELECTOR_ALIAS_CASE_COUNT
    + ORDERED_ERROR_CASE_COUNT
    + UNRESOLVED_SUCCESS_CASE_COUNT
    + REPEATED_CASE_COUNT,
  `case count drifted to ${cases.length}`,
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
  ["side-records", SIDE_COUNT],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["selector-role-values-including-null", OPTIONAL_BATTLER_DOMAIN.length],
  ["side-values", SIDE_DOMAIN.length],
  ["canonical-battler-side-map-cells", CANONICAL_BATTLER_SIDES.length],
  ["spikes-amount-u8-values", U8_MAX + 1],
  ["spikes-amount-full-domain-by-attacker-side-cases", FULL_U8_CASE_COUNT],
  ["attacker-side-alias-boundary-cases", ATTACKER_ALIAS_CASE_COUNT],
  ["complete-selector-matrix-cases", SELECTOR_MATRIX_CASE_COUNT],
  ["side-status-u32-values", U32_MAX + 1],
  ["side-status-u32-edge-values", SIDE_STATUS_U32_EDGE_VALUES.length],
  ["side-status-u32-edge-pair-cases", STATUS_EDGE_PAIR_CASE_COUNT],
  ["side-timer-fields", 10],
  ["side-timer-u8-values", U8_MAX + 1],
  ["mist-timer-u8-values", U8_MAX + 1],
  ["per-battler-pressure-bit-combinations", PRESSURE_BIT_CASE_COUNT],
  ["explicit-selector-alias-cases", SELECTOR_ALIAS_CASE_COUNT],
  ["ordered-handler-error-cases", ORDERED_ERROR_CASE_COUNT],
  ["unresolved-label-success-skip-cases", UNRESOLVED_SUCCESS_CASE_COUNT],
  ["application-count-values", 4],
  ["failure-pointer-width-bytes", 4],
  ["absolute-failure-program-counter-fields-in-projection", 0],
  ["abi-exports-added", 0],
  ["unsupported-barriers-added", 0],
  ["generated-file-byte-limit-exclusive", GENERATED_FILE_MAX_BYTES],
]);
const corpus = Object.freeze({
  opcodeId: OPCODE_ID,
  failurePointer: FAILURE_POINTER,
  attackerDomain: ATTACKER_DOMAIN,
  optionalBattlerDomain: OPTIONAL_BATTLER_DOMAIN,
  sideDomain: SIDE_DOMAIN,
  canonicalBattlerSides: CANONICAL_BATTLER_SIDES,
  spikesAmountU8Domain: SPIKES_AMOUNT_U8_DOMAIN,
  u8EdgeDomain: U8_EDGE_VALUES,
  sideStatusU32EdgeDomain: SIDE_STATUS_U32_EDGE_VALUES,
  sideStatusSpikes: SPIKES_STATUS,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU8(value) {
  return `0x${value.toString(16).padStart(2, "0")}`;
}

function rustU32(value) {
  return `0x${value.toString(16).padStart(8, "0")}`;
}

function rustBattler(value) {
  return `BattleScriptTrysetspikesBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustTimer(value) {
  return [
    "BattleScriptTrysetspikesVectorSideTimer {",
    `reflect_timer: ${rustU8(value.reflectTimer)},`,
    `reflect_battler_id: ${value.reflectBattlerId},`,
    `lightscreen_timer: ${rustU8(value.lightscreenTimer)},`,
    `lightscreen_battler_id: ${value.lightscreenBattlerId},`,
    `safeguard_timer: ${rustU8(value.safeguardTimer)},`,
    `safeguard_battler_id: ${value.safeguardBattlerId},`,
    `mist_battler_id: ${value.mistBattlerId},`,
    `followme_timer: ${rustU8(value.followmeTimer)},`,
    `followme_target: ${value.followmeTarget},`,
    `spikes_amount: ${rustU8(value.spikesAmount)},`,
    "}",
  ].join(" ");
}

function rustState(value) {
  return [
    "BattleScriptTrysetspikesVectorState {",
    `battler_sides: [${value.battlerSides.join(", ")}],`,
    `pp_not_affected_by_pressure: [${value.ppNotAffectedByPressure.join(", ")}],`,
    `side_statuses: [${value.sideStatuses.map(rustU32).join(", ")}],`,
    `side_timers: [${value.sideTimers.map(rustTimer).join(", ")}],`,
    `mist_timers: [${value.mistTimers.map(rustU8).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `effect_battler: ${rustOptionalBattler(value.effectBattler)},`,
    `fainted: ${rustOptionalBattler(value.fainted)},`,
    "}",
  ].join(" ");
}

function rustInstruction(value) {
  return [
    "BattleScriptTrysetspikesVectorInstruction {",
    `operand_widths: &[${value.operandWidths.map(rustU8).join(", ")}],`,
    `operand_expressions: &[${value.operandExpressions.map(rustString).join(", ")}],`,
    `resolved_failure_target: ${value.resolvedFailureTarget === null ? "None" : `Some(${rustString(value.resolvedFailureTarget)})`},`,
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
  return "&[" + values.map((value) => {
    if (value === "advance") return "BattleScriptTrysetspikesControl::Advance";
    if (value === "fail-jump") return "BattleScriptTrysetspikesControl::FailJump";
    throw new Error(`unsupported control ${value}`);
  }).join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysetspikes-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrysetspikesOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysetspikes::{");
lines.push("    BattleScriptTrysetspikesBattler, BattleScriptTrysetspikesControl,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_ATTACKER_DOMAIN: [u8; ${ATTACKER_DOMAIN.length}] = [${ATTACKER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_SIDE_DOMAIN: [u8; ${SIDE_DOMAIN.length}] = [${SIDE_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_CANONICAL_BATTLER_SIDES: [u8; ${CANONICAL_BATTLER_SIDES.length}] = [${CANONICAL_BATTLER_SIDES.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_SPIKES_AMOUNT_U8_DOMAIN: [u8; ${SPIKES_AMOUNT_U8_DOMAIN.length}] = [${SPIKES_AMOUNT_U8_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_U8_EDGE_DOMAIN: [u8; ${U8_EDGE_VALUES.length}] = [${U8_EDGE_VALUES.map(rustU8).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_SIDE_STATUS_U32_EDGE_DOMAIN: [u32; ${SIDE_STATUS_U32_EDGE_VALUES.length}] = [${SIDE_STATUS_U32_EDGE_VALUES.map(rustU32).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetspikesVectorSideTimer {");
lines.push("    pub reflect_timer: u8,");
lines.push("    pub reflect_battler_id: u8,");
lines.push("    pub lightscreen_timer: u8,");
lines.push("    pub lightscreen_battler_id: u8,");
lines.push("    pub safeguard_timer: u8,");
lines.push("    pub safeguard_battler_id: u8,");
lines.push("    pub mist_battler_id: u8,");
lines.push("    pub followme_timer: u8,");
lines.push("    pub followme_target: u8,");
lines.push("    pub spikes_amount: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetspikesVectorState {");
lines.push("    pub battler_sides: [u8; 4],");
lines.push("    pub pp_not_affected_by_pressure: [u8; 4],");
lines.push("    pub side_statuses: [u32; 2],");
lines.push("    pub side_timers: [BattleScriptTrysetspikesVectorSideTimer; 2],");
lines.push("    pub mist_timers: [u8; 2],");
lines.push("    pub attacker: Option<BattleScriptTrysetspikesBattler>,");
lines.push("    pub target: Option<BattleScriptTrysetspikesBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptTrysetspikesBattler>,");
lines.push("    pub fainted: Option<BattleScriptTrysetspikesBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetspikesVectorInstruction {");
lines.push("    pub operand_widths: &'static [u8],");
lines.push("    pub operand_expressions: &'static [&'static str],");
lines.push("    pub resolved_failure_target: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetspikesVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub instruction: BattleScriptTrysetspikesVectorInstruction,");
lines.push("    pub initial: BattleScriptTrysetspikesVectorState,");
lines.push("    pub expected: Option<BattleScriptTrysetspikesVectorState>,");
lines.push("    pub controls: &'static [BattleScriptTrysetspikesControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETSPIKES_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSETSPIKES_CASES: [BattleScriptTrysetspikesVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetspikesVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        applications: ${value.applications},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
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
if (!formatted) throw new Error("gen-battle-script-trysetspikes-vectors: could not find rustfmt");

const generated = fs.readFileSync(outPath);
assert(
  generated.byteLength < GENERATED_FILE_MAX_BYTES,
  `generated file is ${generated.byteLength} bytes, not below ${GENERATED_FILE_MAX_BYTES}`,
);
const generatedHash = crypto.createHash("sha256").update(generated).digest("hex");
console.log(`gen-battle-script-trysetspikes-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-trysetspikes-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-trysetspikes-vectors: ${generated.byteLength} generated bytes`);
console.log(`gen-battle-script-trysetspikes-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-trysetspikes-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-trysetspikes-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-trysetspikes-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-trysetspikes-vectors: generated sha256 ${generatedHash}`);
