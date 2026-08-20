#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptJumpifnodamageOpcode.ts.
// Expected controls, complete projected outputs, ordered errors, and
// registration observations are created only by executing canonical
// TypeScript. Source/decomp/macro/program-site evidence is separately read
// from the pinned reference tree and emitted as bounded Rust metadata.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifnodamage-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outputPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_jumpifnodamage_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptJumpifnodamageOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_JUMPIFNODAMAGE";
const OPCODE_ID = 0xcf;
const DISPATCHER = "Cmd_jumpifnodamage";
const ENTRY_LABEL = "BattleScript_EffectFocusPunch";
const ENTRY_STATEMENT_LINE = 2262;
const TARGET_LABEL = "BattleScript_HitFromAccCheck";
const MACRO_NAME = "jumpifnodamage";
const BATTLE_SLOTS = 4;
const FOCUS_PUNCH = 264;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, 0, 1, 2, 3]);
const I32_MIN = -0x8000_0000;
const I32_MAX = 0x7fff_ffff;
const I32_EDGE_DOMAIN = Object.freeze([I32_MIN, -1, 0, 1, I32_MAX]);
const GENERATED_FILE_MAX_BYTES = 1_000_000;

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-jumpifnodamage-vectors: " + message);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), label + " must be a battler 0..3, got " + value);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertI32(value, label) {
  assert(
    Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX,
    label + " must be a signed i32, got " + value,
  );
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff,
    label + " must be a u16, got " + value);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff,
    label + " must be a u32, got " + value);
}

function freezeArray(values) {
  return Object.freeze(values.slice());
}

function optionalBattler(salt, offset) {
  const candidate = (salt + offset) % OPTIONAL_BATTLER_DOMAIN.length;
  return candidate === 4 ? null : candidate;
}

function shadowFor(index, salt, offset) {
  return I32_EDGE_DOMAIN[(index + salt + offset) % I32_EDGE_DOMAIN.length];
}

function makeProjection({
  attacker,
  focusBattler,
  protectPhysicalDmg,
  protectSpecialDmg,
  specialStatusPhysicalDmg,
  specialStatusSpecialDmg,
  salt,
}) {
  assertOptionalBattler(attacker, "attacker");
  assertBattler(focusBattler, "focus battler");
  assertI32(protectPhysicalDmg, "protect physical damage");
  assertI32(protectSpecialDmg, "protect special damage");
  assertI32(specialStatusPhysicalDmg, "SpecialStatus physical damage");
  assertI32(specialStatusSpecialDmg, "SpecialStatus special damage");
  assert(Number.isInteger(salt) && salt >= 0, "salt must be nonnegative integer");

  const battlers = ATTACKER_DOMAIN.map((battler) => {
    const focused = battler === focusBattler;
    return Object.freeze({
      protectPhysicalDmg: focused
        ? protectPhysicalDmg
        : shadowFor(battler, salt, 1),
      protectPhysicalBattlerId: (battler + salt + 1) % BATTLE_SLOTS,
      protectSpecialDmg: focused
        ? protectSpecialDmg
        : shadowFor(battler, salt, 2),
      protectSpecialBattlerId: (battler + salt + 2) % BATTLE_SLOTS,
      specialStatusPhysicalDmg: focused
        ? specialStatusPhysicalDmg
        : shadowFor(battler, salt, 3),
      specialStatusSpecialDmg: focused
        ? specialStatusSpecialDmg
        : shadowFor(battler, salt, 4),
      shellBellDmg: shadowFor(battler, salt, 0),
      hp: 1 + ((salt * 37 + battler * 101) % 500),
      status2: ((0x0100_0001 * (battler + 1)) ^ salt) >>> 0,
    });
  });
  const projection = Object.freeze({
    battlers: freezeArray(battlers),
    attacker,
    target: optionalBattler(salt, 1),
    effectBattler: optionalBattler(salt, 2),
    fainted: optionalBattler(salt, 3),
    siblings: Object.freeze({
      currentMove: FOCUS_PUNCH,
      battleMoveDamage: shadowFor(0, salt, 0),
      // `moveResultFlags` is a canonical u8 even though it is retained only
      // as an untouched sibling by this leaf.
      moveResultFlags: (0x80 ^ salt) & 0xff,
      hitMarker: (0x4000_0002 ^ (salt * 17)) >>> 0,
      bideDmg: freezeArray(ATTACKER_DOMAIN.map((battler) => shadowFor(battler, salt, 1))),
      lockedMoves: freezeArray(ATTACKER_DOMAIN.map((battler) => 1 + ((salt + battler * 73) % 354))),
    }),
  });
  return freezeProjection(projection);
}

function freezeProjection(value) {
  assert(Array.isArray(value.battlers) && value.battlers.length === BATTLE_SLOTS,
    "projection must contain four battlers");
  value.battlers.forEach((battler, index) => {
    assertI32(battler.protectPhysicalDmg, "battlers[" + index + "].protectPhysicalDmg");
    assertBattler(battler.protectPhysicalBattlerId,
      "battlers[" + index + "].protectPhysicalBattlerId");
    assertI32(battler.protectSpecialDmg, "battlers[" + index + "].protectSpecialDmg");
    assertBattler(battler.protectSpecialBattlerId,
      "battlers[" + index + "].protectSpecialBattlerId");
    assertI32(battler.specialStatusPhysicalDmg,
      "battlers[" + index + "].specialStatusPhysicalDmg");
    assertI32(battler.specialStatusSpecialDmg,
      "battlers[" + index + "].specialStatusSpecialDmg");
    assertI32(battler.shellBellDmg, "battlers[" + index + "].shellBellDmg");
    assertU16(battler.hp, "battlers[" + index + "].hp");
    assertU32(battler.status2, "battlers[" + index + "].status2");
  });
  assertOptionalBattler(value.attacker, "attacker");
  assertOptionalBattler(value.target, "target");
  assertOptionalBattler(value.effectBattler, "effectBattler");
  assertOptionalBattler(value.fainted, "fainted");
  assertU16(value.siblings.currentMove, "currentMove");
  assertI32(value.siblings.battleMoveDamage, "battleMoveDamage");
  assertU32(value.siblings.moveResultFlags, "moveResultFlags");
  assertU32(value.siblings.hitMarker, "hitMarker");
  assert(Array.isArray(value.siblings.bideDmg) && value.siblings.bideDmg.length === BATTLE_SLOTS,
    "bideDmg must have four cells");
  value.siblings.bideDmg.forEach((damage, index) => assertI32(damage, "bideDmg[" + index + "]"));
  assert(Array.isArray(value.siblings.lockedMoves)
    && value.siblings.lockedMoves.length === BATTLE_SLOTS,
  "lockedMoves must have four cells");
  value.siblings.lockedMoves.forEach((move, index) => assertU16(move, "lockedMoves[" + index + "]"));
  return Object.freeze({
    battlers: freezeArray(value.battlers.map((battler) => Object.freeze({ ...battler }))),
    attacker: value.attacker,
    target: value.target,
    effectBattler: value.effectBattler,
    fainted: value.fainted,
    siblings: Object.freeze({
      currentMove: value.siblings.currentMove,
      battleMoveDamage: value.siblings.battleMoveDamage,
      moveResultFlags: value.siblings.moveResultFlags,
      hitMarker: value.siblings.hitMarker,
      bideDmg: freezeArray(value.siblings.bideDmg),
      lockedMoves: freezeArray(value.siblings.lockedMoves),
    }),
  });
}

function canonicalBattler(side, value) {
  return Object.freeze({
    side,
    ability: 0,
    hp: value.hp,
    maxHP: 500,
    moves: Object.freeze([FOCUS_PUNCH, 0, 0, 0]),
    pp: Object.freeze([10, 0, 0, 0]),
    status1: 0,
    status2: value.status2,
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
    types: Object.freeze(["TYPE_FIGHTING", "TYPE_FIGHTING"]),
    species: 0,
    attack: 50,
    defense: 50,
    spAttack: 50,
    spDefense: 50,
    level: 50,
    friendship: 0,
    partyIndex: 0,
    specialStatus: Object.freeze({
      restoredBattlerSprite: 0,
      focusBanded: 0,
      physicalDmg: value.specialStatusPhysicalDmg,
      specialDmg: value.specialStatusSpecialDmg,
      shellBellDmg: value.shellBellDmg,
    }),
    protectPhysicalDmg: value.protectPhysicalDmg,
    protectPhysicalBattlerId: value.protectPhysicalBattlerId,
    protectSpecialDmg: value.protectSpecialDmg,
    protectSpecialBattlerId: value.protectSpecialBattlerId,
  });
}

function canonicalRulesFromProjection(value) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(value.battlers.map((battler, index) => canonicalBattler(index % 2, battler))),
    selectorRoles: Object.freeze({
      attacker: value.attacker,
      target: value.target,
      effectBattler: value.effectBattler,
      fainted: value.fainted,
    }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: value.siblings.currentMove,
    currentMovePosition: 0,
    moveResultFlags: value.siblings.moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: value.siblings.hitMarker,
    multiHitCounter: 0,
    battleMoveDamage: value.siblings.battleMoveDamage,
    bideDmg: value.siblings.bideDmg,
    lockedMoves: value.siblings.lockedMoves,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map((battler) => Object.freeze({
      protectPhysicalDmg: battler.protectPhysicalDmg,
      protectPhysicalBattlerId: battler.protectPhysicalBattlerId,
      protectSpecialDmg: battler.protectSpecialDmg,
      protectSpecialBattlerId: battler.protectSpecialBattlerId,
      specialStatusPhysicalDmg: battler.specialStatus.physicalDmg,
      specialStatusSpecialDmg: battler.specialStatus.specialDmg,
      shellBellDmg: battler.specialStatus.shellBellDmg,
      hp: battler.hp,
      status2: battler.status2,
    }))),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    siblings: Object.freeze({
      currentMove: rules.currentMove,
      battleMoveDamage: rules.battleMoveDamage,
      moveResultFlags: rules.moveResultFlags,
      hitMarker: rules.hitMarker,
      bideDmg: freezeArray(rules.bideDmg),
      lockedMoves: freezeArray(rules.lockedMoves),
    }),
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === 1, "expected exactly one canonical " + OPCODE_NAME);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, "canonical opcode ID drifted");
assert(instruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(instruction.source.label === ENTRY_LABEL, "canonical source label drifted");
assert(instruction.source.statementLine === ENTRY_STATEMENT_LINE, "canonical source line drifted");
assert(instruction.source.invocationMnemonic === MACRO_NAME, "canonical invocation mnemonic drifted");
assert(instruction.source.invocationMacroLine === 1061, "canonical macro declaration line drifted");
assert(instruction.source.sourceMacro === MACRO_NAME, "canonical opcode macro drifted");
assert(instruction.source.sourceMacroLine === 1062, "canonical opcode macro line drifted");
assert(instruction.operands.length === 1, "canonical command must have one operand");
assert(instruction.operands[0]?.widthBytes === 4, "canonical pointer must be four bytes");
assert(instruction.operands[0]?.expression === TARGET_LABEL, "canonical pointer target drifted");
assert(instruction.operands[0]?.sourceMacro === MACRO_NAME, "canonical pointer macro drifted");
assert(instruction.operands[0]?.sourceMacroLine === 1063, "canonical pointer macro line drifted");
const targetEntry = programModule.resolveBattleScriptLabel(program, TARGET_LABEL);
assert(targetEntry !== undefined, "canonical target does not resolve");

const handlers = opcodeModule.createBattleScriptJumpifnodamageOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical handler was not registered");

function unresolvedTargetProgram() {
  const labels = { ...program.labelEntries };
  delete labels[TARGET_LABEL];
  assert(programModule.resolveBattleScriptLabel(
    Object.freeze({ ...program, labelEntries: Object.freeze(labels) }),
    TARGET_LABEL,
  ) === undefined, "synthetic unresolved target unexpectedly resolves");
  return Object.freeze({ ...program, labelEntries: Object.freeze(labels) });
}

const unresolvedProgram = unresolvedTargetProgram();

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "jump";
  throw new Error("canonical handler returned unsupported control " + transition.control.kind);
}

function sourceOutcome(initialProjection, targetResolves, applications) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
  const inputSnapshot = vectorState(initialRules);
  const activeProgram = targetResolves ? program : unresolvedProgram;
  let currentRules = initialRules;
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const before = vectorState(currentRules);
      const state = machineModule.createBattleScriptMachine(
        activeProgram,
        ENTRY_LABEL,
        currentRules,
        (0x6b14_0000 + application) >>> 0,
      );
      const transition = handler({ program: activeProgram, instruction, state });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(transition.rulesContext === currentRules, "canonical handler replaced no-write rules context");
      assert(sameState(vectorState(currentRules), before), "canonical handler mutated current rules");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      assert(Object.isFrozen(transition.rulesContext.battlers), "canonical output battlers must be frozen");
      controls.push(controlFromTransition(transition));
      currentRules = transition.rulesContext;
    }
    assert(currentRules === initialRules, "canonical no-write leaf replaced initial rules");
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated initial rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: freezeArray(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "canonical handler threw non-Error " + String(error));
    assert(sameState(vectorState(initialRules), inputSnapshot),
      "throwing canonical handler mutated initial rules");
    return Object.freeze({
      expected: null,
      controls: freezeArray(controls),
      error: error.message,
    });
  }
}

function receiptToken(value) {
  if (value === I32_MIN) return "min";
  if (value === -1) return "minus_one";
  if (value === 0) return "zero";
  if (value === 1) return "one";
  if (value === I32_MAX) return "max";
  throw new Error("unrecognized receipt token " + value);
}

function branchFor(outcome) {
  if (outcome.error !== null) {
    if (outcome.error === "Battle Script hit-chain command requires a attacker role") {
      return "missing-attacker-role";
    }
    if (outcome.error.startsWith("Cmd_jumpifnodamage: unresolved jump target ")) {
      return "unresolved-jump-target";
    }
    throw new Error("unknown canonical error " + outcome.error);
  }
  return outcome.controls.join("-then-");
}

const cases = [];
function addCase(label, category, projection, targetResolves = true, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid label " + label);
  assert(!cases.some((entry) => entry.label === label), "duplicate label " + label);
  assert(applications === 1 || applications === 2, label + " applications must be one or two");
  const outcome = sourceOutcome(projection, targetResolves, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    jumpTargetExpression: TARGET_LABEL,
    jumpTargetResolves: targetResolves,
    initial: vectorState(canonicalRulesFromProjection(projection)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

let salt = 1;
for (const attacker of ATTACKER_DOMAIN) {
  for (const protectPhysicalDmg of I32_EDGE_DOMAIN) {
    for (const protectSpecialDmg of I32_EDGE_DOMAIN) {
      addCase(
        "attacker_a" + attacker + "_physical_" + receiptToken(protectPhysicalDmg)
          + "_special_" + receiptToken(protectSpecialDmg),
        "attacker-protect-receipt-i32-matrix",
        makeProjection({
          attacker,
          focusBattler: attacker,
          protectPhysicalDmg,
          protectSpecialDmg,
          specialStatusPhysicalDmg: shadowFor(attacker, salt, 1),
          specialStatusSpecialDmg: shadowFor(attacker, salt, 2),
          salt: salt++,
        }),
      );
    }
  }
}

for (const attacker of ATTACKER_DOMAIN) {
  for (const [index, shadow] of I32_EDGE_DOMAIN.entries()) {
    addCase(
      "attacker_a" + attacker + "_special_status_shadow_" + receiptToken(shadow),
      "special-status-shadow-receipts-ignored",
      makeProjection({
        attacker,
        focusBattler: attacker,
        protectPhysicalDmg: 0,
        protectSpecialDmg: 0,
        specialStatusPhysicalDmg: shadow,
        specialStatusSpecialDmg: I32_EDGE_DOMAIN[(index + 2) % I32_EDGE_DOMAIN.length],
        salt: salt++,
      }),
    );
  }
}

for (const attacker of ATTACKER_DOMAIN) {
  addCase(
    "attacker_a" + attacker + "_prior_and_sibling_state_preserved",
    "prior-and-sibling-state-preservation",
    makeProjection({
      attacker,
      focusBattler: attacker,
      protectPhysicalDmg: attacker % 2 === 0 ? -1 : 0,
      protectSpecialDmg: attacker % 2 === 0 ? 0 : I32_MAX,
      specialStatusPhysicalDmg: I32_MIN,
      specialStatusSpecialDmg: I32_MAX,
      salt: salt++,
    }),
  );
}

addCase(
  "missing_attacker_precedes_unresolved_jump_target",
  "ordered-missing-role-before-label-resolution",
  makeProjection({
    attacker: null,
    focusBattler: 0,
    protectPhysicalDmg: 0,
    protectSpecialDmg: 0,
    specialStatusPhysicalDmg: I32_MAX,
    specialStatusSpecialDmg: I32_MIN,
    salt: salt++,
  }),
  false,
);
addCase(
  "zero_receipts_reach_unresolved_jump_target",
  "ordered-unresolved-label-branch",
  makeProjection({
    attacker: 2,
    focusBattler: 2,
    protectPhysicalDmg: 0,
    protectSpecialDmg: 0,
    specialStatusPhysicalDmg: -1,
    specialStatusSpecialDmg: 1,
    salt: salt++,
  }),
  false,
);
addCase(
  "physical_receipt_skips_unresolved_jump_target",
  "ordered-unresolved-label-branch",
  makeProjection({
    attacker: 1,
    focusBattler: 1,
    protectPhysicalDmg: -1,
    protectSpecialDmg: 0,
    specialStatusPhysicalDmg: 0,
    specialStatusSpecialDmg: 0,
    salt: salt++,
  }),
  false,
);
addCase(
  "special_receipt_skips_unresolved_jump_target",
  "ordered-unresolved-label-branch",
  makeProjection({
    attacker: 3,
    focusBattler: 3,
    protectPhysicalDmg: 0,
    protectSpecialDmg: I32_MAX,
    specialStatusPhysicalDmg: 0,
    specialStatusSpecialDmg: 0,
    salt: salt++,
  }),
  false,
);

addCase(
  "repeat_zero_receipts_jump",
  "repeated-application-idempotence",
  makeProjection({
    attacker: 0,
    focusBattler: 0,
    protectPhysicalDmg: 0,
    protectSpecialDmg: 0,
    specialStatusPhysicalDmg: I32_MAX,
    specialStatusSpecialDmg: I32_MIN,
    salt: salt++,
  }),
  true,
  2,
);
addCase(
  "repeat_physical_receipt_advance",
  "repeated-application-idempotence",
  makeProjection({
    attacker: 1,
    focusBattler: 1,
    protectPhysicalDmg: I32_MIN,
    protectSpecialDmg: 0,
    specialStatusPhysicalDmg: 0,
    specialStatusSpecialDmg: 0,
    salt: salt++,
  }),
  true,
  2,
);
addCase(
  "repeat_special_receipt_advance",
  "repeated-application-idempotence",
  makeProjection({
    attacker: 2,
    focusBattler: 2,
    protectPhysicalDmg: 0,
    protectSpecialDmg: -1,
    specialStatusPhysicalDmg: 0,
    specialStatusSpecialDmg: 0,
    salt: salt++,
  }),
  true,
  2,
);

function freezeInstructionSpec(value = {}) {
  const operands = value.operands ?? [{ widthBytes: 4, expression: TARGET_LABEL }];
  assert(Array.isArray(operands), "registration operands must be array");
  return Object.freeze({
    opcodeName: value.opcodeName ?? OPCODE_NAME,
    programCounter: value.programCounter ?? instruction.programCounter,
    opcodeId: value.opcodeId ?? OPCODE_ID,
    dispatcher: value.dispatcher ?? DISPATCHER,
    sourceLabel: value.sourceLabel ?? ENTRY_LABEL,
    sourceStatementLine: value.sourceStatementLine ?? ENTRY_STATEMENT_LINE,
    operands: freezeArray(operands.map((operand) => Object.freeze({
      widthBytes: operand.widthBytes,
      expression: operand.expression,
    }))),
    jumpTargetResolves: value.jumpTargetResolves ?? true,
  });
}

function registrationProgram(specs) {
  const labels = { ...program.labelEntries };
  if (specs.some((spec) => !spec.jumpTargetResolves)) delete labels[TARGET_LABEL];
  const syntheticInstructions = specs.map((spec) => Object.freeze({
    ...instruction,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    opcodeName: spec.opcodeName,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(spec.operands.map((operand, index) => Object.freeze({
      ...(instruction.operands[index] ?? instruction.operands[0]),
      widthBytes: operand.widthBytes,
      expression: operand.expression,
    }))),
    source: Object.freeze({
      ...instruction.source,
      label: spec.sourceLabel,
      statementLine: spec.sourceStatementLine,
    }),
  }));
  return Object.freeze({
    ...program,
    instructions: Object.freeze(syntheticInstructions),
    labelEntries: Object.freeze(labels),
  });
}

function registrationOutcome(specs) {
  const synthetic = registrationProgram(specs);
  try {
    const registration = opcodeModule.createBattleScriptJumpifnodamageOpcodeHandlers(synthetic);
    return Object.freeze({
      bindings: freezeArray(Object.keys(registration).map(Number).sort((left, right) => left - right)),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "registration threw non-Error " + String(error));
    return Object.freeze({ bindings: freezeArray([]), error: error.message });
  }
}

const registrationCases = [];
function addRegistrationCase(label, specs) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid registration label " + label);
  assert(!registrationCases.some((entry) => entry.label === label),
    "duplicate registration label " + label);
  const normalized = freezeArray(specs.map(freezeInstructionSpec));
  const outcome = registrationOutcome(normalized);
  registrationCases.push(Object.freeze({
    label,
    instructions: normalized,
    expectedBindings: outcome.bindings,
    expectedError: outcome.error,
  }));
}

const canonicalSpec = freezeInstructionSpec();
addRegistrationCase("canonical", [canonicalSpec]);
addRegistrationCase("no_concrete_start", []);
addRegistrationCase("foreign_opcode_name_is_not_a_start", [
  freezeInstructionSpec({ opcodeName: "B_SCR_OP_SETTAUNT" }),
]);
addRegistrationCase("two_concrete_starts", [canonicalSpec, canonicalSpec]);
addRegistrationCase("three_concrete_starts", [canonicalSpec, canonicalSpec, canonicalSpec]);
addRegistrationCase("program_counter_is_not_a_shape_predicate", [
  freezeInstructionSpec({ programCounter: 0xffff }),
]);
addRegistrationCase("wrong_opcode_id", [freezeInstructionSpec({ opcodeId: 0xce })]);
addRegistrationCase("wrong_dispatcher", [freezeInstructionSpec({ dispatcher: "Cmd_settaunt" })]);
addRegistrationCase("wrong_source_label", [freezeInstructionSpec({ sourceLabel: "BattleScript_EffectHit" })]);
addRegistrationCase("wrong_source_statement_line", [freezeInstructionSpec({ sourceStatementLine: 2263 })]);
addRegistrationCase("missing_pointer_operand", [freezeInstructionSpec({ operands: [] })]);
addRegistrationCase("extra_pointer_operand", [freezeInstructionSpec({
  operands: [{ widthBytes: 4, expression: TARGET_LABEL }, { widthBytes: 4, expression: TARGET_LABEL }],
})]);
addRegistrationCase("one_byte_pointer_operand", [freezeInstructionSpec({
  operands: [{ widthBytes: 1, expression: TARGET_LABEL }],
})]);
addRegistrationCase("two_byte_pointer_operand", [freezeInstructionSpec({
  operands: [{ widthBytes: 2, expression: TARGET_LABEL }],
})]);
addRegistrationCase("wrong_target_expression", [freezeInstructionSpec({
  operands: [{ widthBytes: 4, expression: "BattleScript_MoveEnd" }],
})]);
addRegistrationCase("unresolved_target", [freezeInstructionSpec({ jumpTargetResolves: false })]);

function lineAt(source, line) {
  const value = source.split("\n")[line - 1];
  assert(value !== undefined, "missing source line " + line);
  return value;
}

const commandSource = fs.readFileSync(
  path.join(workspaceRoot, "reference", "pokeemerald", "src", "battle_script_commands.c"),
  "utf8",
);
const battleHeader = fs.readFileSync(
  path.join(workspaceRoot, "reference", "pokeemerald", "include", "battle.h"),
  "utf8",
);
const macroSource = fs.readFileSync(
  path.join(workspaceRoot, "reference", "pokeemerald", "asm", "macros", "battle_script.inc"),
  "utf8",
);
const scriptSource = fs.readFileSync(
  path.join(workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s"),
  "utf8",
);
assert(lineAt(commandSource, 538).includes("[B_SCR_OP_JUMPIFNODAMAGE]                  = Cmd_jumpifnodamage"),
  "dispatch evidence drifted");
assert(lineAt(commandSource, 9148) === "static void Cmd_jumpifnodamage(void)",
  "handler declaration drifted");
assert(lineAt(commandSource, 9150).includes("gProtectStructs[gBattlerAttacker].physicalDmg")
  && lineAt(commandSource, 9150).includes("gProtectStructs[gBattlerAttacker].specialDmg"),
"ProtectStruct OR test drifted");
assert(lineAt(commandSource, 9151).includes("gBattlescriptCurrInstr += 5"),
  "advance-width evidence drifted");
assert(lineAt(commandSource, 9153).includes("T1_READ_PTR(gBattlescriptCurrInstr + 1)"),
  "jump-pointer evidence drifted");
assert(lineAt(battleHeader, 126).trim() === "u32 physicalDmg;", "ProtectStruct physical field drifted");
assert(lineAt(battleHeader, 127).trim() === "u32 specialDmg;", "ProtectStruct special field drifted");
assert(lineAt(macroSource, 1061).trim() === ".macro jumpifnodamage ptr:req", "macro declaration drifted");
assert(lineAt(macroSource, 1062).trim() === ".byte B_SCR_OP_JUMPIFNODAMAGE", "macro opcode drifted");
assert(lineAt(macroSource, 1063).trim() === ".4byte \\ptr", "macro pointer drifted");
assert(lineAt(scriptSource, 2260) === "BattleScript_EffectFocusPunch::", "Focus Punch label drifted");
assert(lineAt(scriptSource, 2262).trim() === "jumpifnodamage BattleScript_HitFromAccCheck",
  "Focus Punch call drifted");
assert(scriptSource.match(/^\tjumpifnodamage /gm)?.length === 1, "expected one concrete macro use");

const decompDispatchEvidence = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  dispatchLine: 538,
  handlerLine: 9148,
  receiptTestLine: 9150,
  advanceLine: 9151,
  jumpLine: 9153,
  protectPhysicalFieldLine: 126,
  protectSpecialFieldLine: 127,
});
const macroEvidence = Object.freeze({
  macroName: MACRO_NAME,
  declarationLine: 1061,
  opcodeLine: 1062,
  pointerLine: 1063,
  pointerWidthBytes: 4,
  encodedWidthBytes: 5,
});
const callSiteEvidence = Object.freeze({
  entryLabel: ENTRY_LABEL,
  entryLabelLine: instruction.source.labelLine,
  entryProgramCounter: program.labelEntries[ENTRY_LABEL]?.programCounter,
  statementLine: instruction.source.statementLine,
  invocationMnemonic: instruction.source.invocationMnemonic,
  invocationMacroLine: instruction.source.invocationMacroLine,
  sourceMacro: instruction.source.sourceMacro,
  opcodeMacroLine: instruction.source.sourceMacroLine,
  pointerMacroLine: instruction.operands[0]?.sourceMacroLine,
  targetExpression: instruction.operands[0]?.expression,
  instructionProgramCounter: instruction.programCounter,
  targetProgramCounter: targetEntry.programCounter,
  concreteCallSites: instructions.length,
});
assert(Number.isInteger(callSiteEvidence.entryProgramCounter), "entry program counter missing");
assert(Number.isInteger(callSiteEvidence.pointerMacroLine), "pointer macro line missing");

function censusBy(corpus, property) {
  const counts = new Map();
  for (const entry of corpus) counts.set(entry[property], (counts.get(entry[property]) ?? 0) + 1);
  return freezeArray([...counts.entries()]);
}

function registrationBranch(entry) {
  if (entry.expectedError === null) return "registered";
  if (entry.expectedError.startsWith("B_SCR_OP_JUMPIFNODAMAGE requires exactly")) {
    return "wrong-cardinality";
  }
  if (entry.expectedError.startsWith("invalid B_SCR_OP_JUMPIFNODAMAGE shape")) {
    return "invalid-shape";
  }
  throw new Error("unknown registration error " + entry.expectedError);
}

const domainCensus = freezeArray([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["optional-attacker-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["canonical-protect-receipt-signed-i32-values", I32_EDGE_DOMAIN.length],
  ["protect-physical-special-cross-product", I32_EDGE_DOMAIN.length ** 2],
  ["all-attacker-receipt-combinations", ATTACKER_DOMAIN.length * I32_EDGE_DOMAIN.length ** 2],
  ["special-status-shadow-receipt-values", I32_EDGE_DOMAIN.length],
  ["source-protect-struct-receipt-fields", 2],
  ["concrete-focus-punch-call-sites", instructions.length],
  ["application-count-values", 2],
  ["registration-shape-cases", registrationCases.length],
]);
const categoryCensus = censusBy(cases, "category");
const branchCensus = censusBy(cases, "branch");
const registrationBranchCensus = censusBy(
  registrationCases.map((entry) => Object.freeze({ branch: registrationBranch(entry) })),
  "branch",
);

assert(cases.length > 120 && cases.length < 160, "bounded handler corpus drifted to " + cases.length);
assert(registrationCases.length === 16, "registration corpus must retain sixteen cases");
for (const attacker of ATTACKER_DOMAIN) {
  for (const physical of I32_EDGE_DOMAIN) {
    for (const special of I32_EDGE_DOMAIN) {
      assert(cases.some((entry) => entry.category === "attacker-protect-receipt-i32-matrix"
        && entry.initial.attacker === attacker
        && entry.initial.battlers[attacker].protectPhysicalDmg === physical
        && entry.initial.battlers[attacker].protectSpecialDmg === special),
      "receipt matrix missing attacker " + attacker + " physical " + physical + " special " + special);
    }
  }
}

const corpus = Object.freeze({
  identity: Object.freeze({
    opcodeName: OPCODE_NAME,
    opcodeId: OPCODE_ID,
    dispatcher: DISPATCHER,
    entryLabel: ENTRY_LABEL,
    statementLine: ENTRY_STATEMENT_LINE,
    targetLabel: TARGET_LABEL,
  }),
  i32EdgeDomain: I32_EDGE_DOMAIN,
  decompDispatchEvidence,
  macroEvidence,
  callSiteEvidence,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustI32(value) {
  if (value === I32_MIN) return "i32::MIN";
  if (value === I32_MAX) return "i32::MAX";
  return String(value);
}

function rustU8(value) {
  return "0x" + value.toString(16).padStart(2, "0");
}

function rustU16(value) {
  return "0x" + value.toString(16).padStart(4, "0");
}

function rustU32(value) {
  return "0x" + value.toString(16).padStart(8, "0");
}

function rustBattler(value) {
  return "BattleScriptJumpifnodamageBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustBattlerState(value) {
  return "BattleScriptJumpifnodamageVectorBattlerState { protect_physical_dmg: "
    + rustI32(value.protectPhysicalDmg)
    + ", protect_physical_battler_id: " + rustBattler(value.protectPhysicalBattlerId)
    + ", protect_special_dmg: " + rustI32(value.protectSpecialDmg)
    + ", protect_special_battler_id: " + rustBattler(value.protectSpecialBattlerId)
    + ", special_status_physical_dmg: " + rustI32(value.specialStatusPhysicalDmg)
    + ", special_status_special_dmg: " + rustI32(value.specialStatusSpecialDmg)
    + ", shell_bell_dmg: " + rustI32(value.shellBellDmg)
    + ", hp: " + rustU16(value.hp)
    + ", status2: " + rustU32(value.status2) + " }";
}

function rustSiblings(value) {
  return "BattleScriptJumpifnodamageVectorSiblings { current_move: "
    + rustU16(value.currentMove)
    + ", battle_move_damage: " + rustI32(value.battleMoveDamage)
    + ", move_result_flags: " + rustU32(value.moveResultFlags)
    + ", hit_marker: " + rustU32(value.hitMarker)
    + ", bide_dmg: [" + value.bideDmg.map(rustI32).join(", ") + "]"
    + ", locked_moves: [" + value.lockedMoves.map(rustU16).join(", ") + "] }";
}

function rustState(value) {
  return "BattleScriptJumpifnodamageVectorState { battlers: ["
    + value.battlers.map(rustBattlerState).join(", ")
    + "], attacker: " + rustOptionalBattler(value.attacker)
    + ", target: " + rustOptionalBattler(value.target)
    + ", effect_battler: " + rustOptionalBattler(value.effectBattler)
    + ", fainted: " + rustOptionalBattler(value.fainted)
    + ", siblings: " + rustSiblings(value.siblings) + " }";
}

function rustControls(values) {
  return "&[" + values.map((value) => {
    if (value === "advance") return "BattleScriptJumpifnodamageControl::Advance";
    if (value === "jump") return "BattleScriptJumpifnodamageControl::Jump";
    throw new Error("unknown control " + value);
  }).join(", ") + "]";
}

function rustRegistrationInstruction(value) {
  return "BattleScriptJumpifnodamageVectorRegistrationInstruction { opcode_name: "
    + rustString(value.opcodeName)
    + ", program_counter: " + value.programCounter
    + ", opcode_id: " + rustU8(value.opcodeId)
    + ", dispatcher: " + rustString(value.dispatcher)
    + ", source_label: " + rustString(value.sourceLabel)
    + ", source_statement_line: " + value.sourceStatementLine
    + ", operand_widths: &[" + value.operands.map((operand) => rustU8(operand.widthBytes)).join(", ") + "]"
    + ", operand_expressions: &[" + value.operands.map((operand) => rustString(operand.expression)).join(", ") + "]"
    + ", jump_target_resolves: " + value.jumpTargetResolves + " }";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-jumpifnodamage-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptJumpifnodamageOpcode.ts via node.");
lines.push("// Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_jumpifnodamage::{BattleScriptJumpifnodamageBattler, BattleScriptJumpifnodamageControl};");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_VECTOR_CORPUS_SHA256: &str = " + rustString(corpusSha256) + ";");
lines.push("pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_VECTOR_CORPUS_BYTES: usize = "
  + Buffer.byteLength(corpusText) + ";");
lines.push("");
for (const [name, fields] of [
  ["BattleScriptJumpifnodamageVectorBattlerState", [
    "protect_physical_dmg: i32", "protect_physical_battler_id: BattleScriptJumpifnodamageBattler",
    "protect_special_dmg: i32", "protect_special_battler_id: BattleScriptJumpifnodamageBattler",
    "special_status_physical_dmg: i32", "special_status_special_dmg: i32", "shell_bell_dmg: i32",
    "hp: u16", "status2: u32",
  ]],
  ["BattleScriptJumpifnodamageVectorSiblings", [
    "current_move: u16", "battle_move_damage: i32", "move_result_flags: u32", "hit_marker: u32",
    "bide_dmg: [i32; 4]", "locked_moves: [u16; 4]",
  ]],
]) {
  lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
  lines.push("pub struct " + name + " {");
  for (const field of fields) lines.push("    pub " + field + ",");
  lines.push("}");
  lines.push("");
}
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifnodamageVectorState {");
for (const field of [
  "battlers: [BattleScriptJumpifnodamageVectorBattlerState; 4]",
  "attacker: Option<BattleScriptJumpifnodamageBattler>",
  "target: Option<BattleScriptJumpifnodamageBattler>",
  "effect_battler: Option<BattleScriptJumpifnodamageBattler>",
  "fainted: Option<BattleScriptJumpifnodamageBattler>",
  "siblings: BattleScriptJumpifnodamageVectorSiblings",
]) lines.push("    pub " + field + ",");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifnodamageVectorCase {");
for (const field of [
  "label: &'static str", "category: &'static str", "branch: &'static str", "applications: u8",
  "jump_target_expression: &'static str", "jump_target_resolves: bool",
  "initial: BattleScriptJumpifnodamageVectorState",
  "expected: Option<BattleScriptJumpifnodamageVectorState>",
  "controls: &'static [BattleScriptJumpifnodamageControl]", "expected_error: Option<&'static str>",
]) lines.push("    pub " + field + ",");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifnodamageVectorRegistrationInstruction {");
for (const field of [
  "opcode_name: &'static str", "program_counter: u32", "opcode_id: u8", "dispatcher: &'static str",
  "source_label: &'static str", "source_statement_line: u32", "operand_widths: &'static [u8]",
  "operand_expressions: &'static [&'static str]", "jump_target_resolves: bool",
]) lines.push("    pub " + field + ",");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifnodamageRegistrationCase {");
for (const field of [
  "label: &'static str", "instructions: &'static [BattleScriptJumpifnodamageVectorRegistrationInstruction]",
  "expected_bindings: &'static [u8]", "expected_error: Option<&'static str>",
]) lines.push("    pub " + field + ",");
lines.push("}");
lines.push("");
for (const [name, fields] of [
  ["BattleScriptJumpifnodamageDecompDispatchEvidence", [
    "opcode_name: &'static str", "opcode_id: u8", "dispatcher: &'static str", "dispatch_line: u32",
    "handler_line: u32", "receipt_test_line: u32", "advance_line: u32", "jump_line: u32",
    "protect_physical_field_line: u32", "protect_special_field_line: u32",
  ]],
  ["BattleScriptJumpifnodamageMacroEvidence", [
    "macro_name: &'static str", "declaration_line: u32", "opcode_line: u32", "pointer_line: u32",
    "pointer_width_bytes: u8", "encoded_width_bytes: u8",
  ]],
  ["BattleScriptJumpifnodamageCallSiteEvidence", [
    "entry_label: &'static str", "entry_label_line: u32", "entry_program_counter: u32", "statement_line: u32",
    "invocation_mnemonic: &'static str", "invocation_macro_line: u32", "source_macro: &'static str",
    "opcode_macro_line: u32", "pointer_macro_line: u32", "target_expression: &'static str",
    "instruction_program_counter: u32", "target_program_counter: u32", "concrete_call_sites: usize",
  ]],
]) {
  lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
  lines.push("pub struct " + name + " {");
  for (const field of fields) lines.push("    pub " + field + ",");
  lines.push("}");
  lines.push("");
}
lines.push("pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_CANONICAL_DECOMP_DISPATCH_EVIDENCE: BattleScriptJumpifnodamageDecompDispatchEvidence = BattleScriptJumpifnodamageDecompDispatchEvidence {");
lines.push("    opcode_name: " + rustString(decompDispatchEvidence.opcodeName)
  + ", opcode_id: " + rustU8(decompDispatchEvidence.opcodeId)
  + ", dispatcher: " + rustString(decompDispatchEvidence.dispatcher)
  + ", dispatch_line: " + decompDispatchEvidence.dispatchLine
  + ", handler_line: " + decompDispatchEvidence.handlerLine
  + ", receipt_test_line: " + decompDispatchEvidence.receiptTestLine
  + ", advance_line: " + decompDispatchEvidence.advanceLine
  + ", jump_line: " + decompDispatchEvidence.jumpLine
  + ", protect_physical_field_line: " + decompDispatchEvidence.protectPhysicalFieldLine
  + ", protect_special_field_line: " + decompDispatchEvidence.protectSpecialFieldLine + ",");
lines.push("};");
lines.push("pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_MACRO_EVIDENCE: BattleScriptJumpifnodamageMacroEvidence = BattleScriptJumpifnodamageMacroEvidence {");
lines.push("    macro_name: " + rustString(macroEvidence.macroName)
  + ", declaration_line: " + macroEvidence.declarationLine
  + ", opcode_line: " + macroEvidence.opcodeLine
  + ", pointer_line: " + macroEvidence.pointerLine
  + ", pointer_width_bytes: " + rustU8(macroEvidence.pointerWidthBytes)
  + ", encoded_width_bytes: " + rustU8(macroEvidence.encodedWidthBytes) + ",");
lines.push("};");
lines.push("pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_CALL_SITE_EVIDENCE: BattleScriptJumpifnodamageCallSiteEvidence = BattleScriptJumpifnodamageCallSiteEvidence {");
lines.push("    entry_label: " + rustString(callSiteEvidence.entryLabel)
  + ", entry_label_line: " + callSiteEvidence.entryLabelLine
  + ", entry_program_counter: " + callSiteEvidence.entryProgramCounter
  + ", statement_line: " + callSiteEvidence.statementLine
  + ", invocation_mnemonic: " + rustString(callSiteEvidence.invocationMnemonic)
  + ", invocation_macro_line: " + callSiteEvidence.invocationMacroLine
  + ", source_macro: " + rustString(callSiteEvidence.sourceMacro)
  + ", opcode_macro_line: " + callSiteEvidence.opcodeMacroLine
  + ", pointer_macro_line: " + callSiteEvidence.pointerMacroLine
  + ", target_expression: " + rustString(callSiteEvidence.targetExpression)
  + ", instruction_program_counter: " + callSiteEvidence.instructionProgramCounter
  + ", target_program_counter: " + callSiteEvidence.targetProgramCounter
  + ", concrete_call_sites: " + callSiteEvidence.concreteCallSites + ",");
lines.push("};");
lines.push("");
for (const [constant, values, type, render] of [
  ["BATTLE_SCRIPT_JUMPIFNODAMAGE_DOMAIN_CENSUS", domainCensus, "[(&str, u64);",
    (value) => "(" + rustString(value[0]) + ", " + value[1] + ")"],
  ["BATTLE_SCRIPT_JUMPIFNODAMAGE_CATEGORY_CENSUS", categoryCensus, "[(&str, usize);",
    (value) => "(" + rustString(value[0]) + ", " + value[1] + ")"],
  ["BATTLE_SCRIPT_JUMPIFNODAMAGE_BRANCH_CENSUS", branchCensus, "[(&str, usize);",
    (value) => "(" + rustString(value[0]) + ", " + value[1] + ")"],
  ["BATTLE_SCRIPT_JUMPIFNODAMAGE_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "[(&str, usize);",
    (value) => "(" + rustString(value[0]) + ", " + value[1] + ")"],
]) {
  lines.push("pub const " + constant + ": " + type + " " + values.length + "] = [");
  for (const value of values) lines.push("    " + render(value) + ",");
  lines.push("];\n");
}
lines.push("pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_I32_EDGE_DOMAIN: [i32; " + I32_EDGE_DOMAIN.length
  + "] = [" + I32_EDGE_DOMAIN.map(rustI32).join(", ") + "];");
lines.push("");
lines.push("pub static BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES: [BattleScriptJumpifnodamageVectorCase; "
  + cases.length + "] = [");
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptJumpifnodamageVectorCase {");
  lines.push("        label: " + rustString(value.label) + ", category: " + rustString(value.category)
    + ", branch: " + rustString(value.branch) + ", applications: " + value.applications + ",");
  lines.push("        jump_target_expression: " + rustString(value.jumpTargetExpression)
    + ", jump_target_resolves: " + value.jumpTargetResolves + ",");
  lines.push("        initial: " + rustState(value.initial) + ",");
  lines.push("        expected: " + (value.expected === null ? "None" : "Some(" + rustState(value.expected) + ")") + ",");
  lines.push("        controls: " + rustControls(value.controls) + ", expected_error: "
    + (value.expectedError === null ? "None" : "Some(" + rustString(value.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];\n");
lines.push("pub static BATTLE_SCRIPT_JUMPIFNODAMAGE_REGISTRATION_CASES: [BattleScriptJumpifnodamageRegistrationCase; "
  + registrationCases.length + "] = [");
for (const value of registrationCases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptJumpifnodamageRegistrationCase {");
  lines.push("        label: " + rustString(value.label) + ", instructions: &["
    + value.instructions.map(rustRegistrationInstruction).join(", ") + "],");
  lines.push("        expected_bindings: &[" + value.expectedBindings.map(rustU8).join(", ")
    + "], expected_error: "
    + (value.expectedError === null ? "None" : "Some(" + rustString(value.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf8");
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outputPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("could not find rustfmt");
const generated = fs.readFileSync(outputPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES,
  "generated file is too large: " + generated.length);
const generatedSha256 = crypto.createHash("sha256").update(generated).digest("hex");
const generator = fs.readFileSync(scriptPath);
const generatorSha256 = crypto.createHash("sha256").update(generator).digest("hex");
console.log("gen-battle-script-jumpifnodamage-vectors: wrote " + path.relative(workspaceRoot, outputPath));
console.log("gen-battle-script-jumpifnodamage-vectors: " + cases.length + " complete cases");
console.log("gen-battle-script-jumpifnodamage-vectors: " + registrationCases.length + " registration cases");
console.log("gen-battle-script-jumpifnodamage-vectors: domain census " + JSON.stringify(domainCensus));
console.log("gen-battle-script-jumpifnodamage-vectors: category census " + JSON.stringify(categoryCensus));
console.log("gen-battle-script-jumpifnodamage-vectors: branch census " + JSON.stringify(branchCensus));
console.log("gen-battle-script-jumpifnodamage-vectors: registration branch census "
  + JSON.stringify(registrationBranchCensus));
console.log("gen-battle-script-jumpifnodamage-vectors: corpus sha256 " + corpusSha256
  + " bytes " + Buffer.byteLength(corpusText));
console.log("gen-battle-script-jumpifnodamage-vectors: generated sha256 " + generatedSha256
  + " bytes " + generated.length);
console.log("gen-battle-script-jumpifnodamage-vectors: generator sha256 " + generatorSha256
  + " bytes " + generator.length);
