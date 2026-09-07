#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrywishOpcode.ts.
//
// Expected controls, projected output, ordered errors, and registration are
// produced only by calling the canonical TypeScript handler. This generator
// owns bounded input construction and Rust literal emission; it must not
// independently implement Wish behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trywish-vectors.mjs

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
  "battle_script_trywish_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrywishOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYWISH";
const OPCODE_ID = 0xd4;
const DISPATCHER = "Cmd_trywish";
const MODE_USE_WISH = "0";
const MODE_HEAL_EFFECT = "1";
const USE_WISH_ENTRY_LABEL = "BattleScript_EffectWish";
const USE_WISH_FAILURE_POINTER = "BattleScript_ButItFailed";
const HEAL_ENTRY_LABEL = "BattleScript_WishComesTrue";
const HEAL_FAILURE_POINTER = "BattleScript_WishButFullHp";
const UNRESOLVED_POINTER = "BattleScript_RustWishUnresolved";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const WISH_COUNTERS = Object.freeze([0, 1, 2, 255]);
const PARTY_INDEXES = Object.freeze([0, 1, 2, 3, 4, 5]);
const MAX_HP_VALUES = Object.freeze([0, 1, 2, 3, 140, 141, 0xffff]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trywish-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLERS.includes(value), `${label} must be a battler id 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xff, `${label} must be u8`);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff, `${label} must be u32`);
}

const TOPOLOGIES = Object.freeze([
  Object.freeze({
    label: "singles",
    battlersCount: 2,
    battleTypeFlags: 0x8000_0008,
    battlerPositions: Object.freeze([0, 1, 0xfe, 0xff]),
  }),
  Object.freeze({
    label: "doubles",
    battlersCount: 4,
    battleTypeFlags: (1 | 0x0008_0008) >>> 0,
    battlerPositions: Object.freeze([0, 1, 2, 3]),
  }),
]);

function projectionBattlerSalt(index, salt) {
  return Object.freeze({
    ability: (11 + index * 13 + salt) & 0xff,
    item: (index * 31 + salt) & 0xffff,
    status1: (index * 0x101 + salt) >>> 0,
    personality: (0x1357_0000 ^ ((salt * 0x1111 + index) >>> 0)) >>> 0,
  });
}

// Builds one full rules projection: `count` battlers, `focus` gets the given
// hp/maxHP/partyIndex, remaining battlers get salted noise, proving only the
// focus battler's cells are ever read, and only the attacker cell's
// wishCounter/wishMonId or the target's damage/nick are ever written.
function makeProjection({
  topology,
  attacker,
  target,
  focus,
  hp,
  maxHp,
  partyIndex,
  wishCounter,
  wishMonId,
  battleMoveDamage,
  battleTextBuff1MonNick,
  salt,
}) {
  assertOptionalBattler(attacker, "attacker");
  assertOptionalBattler(target, "target");
  assertOptionalBattler(focus, "focus");
  const battlers = BATTLERS.map((index) => {
    const isFocus = index === focus;
    const hpValue = isFocus ? hp : 60 + index * 7;
    const maxHpValue = isFocus ? maxHp : hpValue + 20;
    const partyIndexValue = isFocus ? partyIndex : (index + 2) % 6;
    return Object.freeze({
      hp: hpValue,
      maxHp: maxHpValue,
      partyIndex: partyIndexValue,
      ...projectionBattlerSalt(index, salt),
    });
  });
  return Object.freeze({
    topology,
    attacker,
    target,
    battlers: Object.freeze(battlers),
    wishCounter: Object.freeze([...wishCounter]),
    wishMonId: Object.freeze([...wishMonId]),
    battleMoveDamage,
    battleTextBuff1MonNick,
    context: Object.freeze({
      scriptingBattler: (salt + 1) & 3,
      currentMove: 273,
      hitMarker: (0x9000_0001 ^ ((salt * 0x10101) >>> 0)) >>> 0,
    }),
  });
}

function canonicalBattler(projection, index) {
  const cell = projection.battlers[index];
  return Object.freeze({
    side: index & 1,
    ability: cell.ability,
    hp: cell.hp,
    maxHP: cell.maxHp,
    moves: Object.freeze([33, 0, 0, 0]),
    pp: Object.freeze([10, 0, 0, 0]),
    status1: cell.status1,
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
    item: cell.item,
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    personality: cell.personality,
    attack: 100 + index,
    defense: 110 + index,
    spAttack: 120 + index,
    spDefense: 130 + index,
    speed: 140 + index,
    level: 50,
    friendship: 70,
    partyIndex: cell.partyIndex,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(BATTLERS.map((index) => canonicalBattler(projection, index))),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: null,
      fainted: null,
    }),
    scriptingBattler: projection.context.scriptingBattler,
    atkCancelerTracker: 7,
    battleOutcome: 2,
    currentMove: projection.context.currentMove,
    currentMovePosition: 1,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: projection.context.hitMarker,
    multiHitCounter: 4,
    wishCounter: projection.wishCounter,
    wishMonId: projection.wishMonId,
    battleMoveDamage: projection.battleMoveDamage,
    battleTextBuff1MonNick: projection.battleTextBuff1MonNick,
    party: {
      player: [{}, {}, {}, {}, {}, {}],
      opponent: [{}, {}, {}, {}, {}, {}],
    },
  });
}

function vectorBattlerState(battler) {
  return Object.freeze({
    hp: battler.hp,
    maxHp: battler.maxHP,
    partyIndex: battler.partyIndex,
    ability: battler.ability,
    item: battler.item,
    status1: battler.status1 >>> 0,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattlerState)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    wishCounter: Object.freeze([...rules.wishCounter]),
    wishMonId: Object.freeze([...rules.wishMonId]),
    battleMoveDamage: rules.battleMoveDamage,
    battleTextBuff1MonNick: rules.battleTextBuff1MonNick === null
      ? null
      : Object.freeze({ ...rules.battleTextBuff1MonNick }),
  });
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 2, "canonical Wish pair drifted");
const useWishInstruction = canonicalInstructions.find((instruction) => instruction.source.label === USE_WISH_ENTRY_LABEL);
const healInstruction = canonicalInstructions.find((instruction) => instruction.source.label === HEAL_ENTRY_LABEL);
assert(useWishInstruction, "use-wish call site missing");
assert(healInstruction, "heal call site missing");
for (const instruction of canonicalInstructions) {
  assert(instruction.opcodeId === OPCODE_ID, "canonical opcode drifted");
  assert(instruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
  assert(instruction.operands.length === 2, "canonical operand count drifted");
  assert(instruction.operands[0]?.widthBytes === 1, "canonical selector width drifted");
  assert(instruction.operands[1]?.widthBytes === 4, "canonical pointer width drifted");
}
assert(useWishInstruction.operands[0].expression === MODE_USE_WISH, "use-wish selector drifted");
assert(useWishInstruction.operands[1].expression === USE_WISH_FAILURE_POINTER, "use-wish pointer drifted");
assert(useWishInstruction.programCounter === 1673, "use-wish program counter drifted");
assert(healInstruction.operands[0].expression === MODE_HEAL_EFFECT, "heal selector drifted");
assert(healInstruction.operands[1].expression === HEAL_FAILURE_POINTER, "heal pointer drifted");
assert(healInstruction.programCounter === 2613, "heal program counter drifted");
const resolvedUseWishFailure = programModule.resolveBattleScriptLabel(program, USE_WISH_FAILURE_POINTER);
assert(resolvedUseWishFailure, "use-wish failure label must resolve");
assert(resolvedUseWishFailure.programCounter === 1434, "use-wish failure target program counter drifted");
const resolvedHealFailure = programModule.resolveBattleScriptLabel(program, HEAL_FAILURE_POINTER);
assert(resolvedHealFailure, "heal failure label must resolve");
assert(resolvedHealFailure.programCounter === 2623, "heal failure target program counter drifted");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTrywishOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical Wish handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  programCounter = 1673,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [1, 4],
  operandExpressions = [MODE_USE_WISH, USE_WISH_FAILURE_POINTER],
  baseOperand = useWishInstruction.operands[0],
} = {}) {
  assert(typeof opcodeName === "string", "opcodeName must be a string");
  assertU32(programCounter, "program counter");
  assertU8(opcodeId, "opcode id");
  assert(typeof dispatcher === "string", "dispatcher must be a string");
  assert(Array.isArray(operandWidths) && Array.isArray(operandExpressions), "operands must be arrays");
  assert(operandWidths.length === operandExpressions.length, "operand shapes disagree");
  operandWidths.forEach((width, index) => assertU8(width, `operand width ${index}`));
  operandExpressions.forEach((expression, index) => assert(typeof expression === "string", `operand expression ${index}`));
  return Object.freeze({
    opcodeName,
    programCounter,
    opcodeId,
    dispatcher,
    operandWidths: Object.freeze([...operandWidths]),
    operandExpressions: Object.freeze([...operandExpressions]),
    baseOperand,
  });
}

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...spec.baseOperand,
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    ...useWishInstruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(operands),
  });
}

function vectorInstruction(spec) {
  const instruction = instructionFromSpec(spec);
  const jumpOperand = instruction.operands[1];
  const resolved = jumpOperand === undefined ? undefined
    : programModule.resolveBattleScriptLabel(program, jumpOperand.expression);
  return Object.freeze({
    opcodeName: instruction.opcodeName,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher,
    operandWidths: Object.freeze([...spec.operandWidths]),
    operandExpressions: Object.freeze([...spec.operandExpressions]),
    resolvedJumpExpression: resolved === undefined ? null : jumpOperand.expression,
    resolvedJumpProgramCounter: resolved === undefined ? null : resolved.programCounter,
  });
}

const USE_WISH_SPEC = freezeInstructionSpec({
  programCounter: 1673,
  operandExpressions: [MODE_USE_WISH, USE_WISH_FAILURE_POINTER],
  baseOperand: useWishInstruction.operands[0],
});
const HEAL_SPEC = freezeInstructionSpec({
  programCounter: 2613,
  operandExpressions: [MODE_HEAL_EFFECT, HEAL_FAILURE_POINTER],
  baseOperand: healInstruction.operands[0],
});

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({
    kind: "jump",
    programCounter: transition.control.programCounter,
  });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function sourceOutcome(projection, instructionSpec, salt) {
  const initialRules = canonicalRulesFromProjection(projection);
  const inputSnapshot = vectorState(initialRules);
  try {
    const state = Object.freeze({
      ...machineModule.createBattleScriptMachine(
        program,
        USE_WISH_ENTRY_LABEL,
        initialRules,
        (0x1357_9bdf + salt) >>> 0,
      ),
    });
    const transition = handler({
      program,
      instruction: instructionFromSpec(instructionSpec),
      state,
    });
    assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
    assert(transition.rng === state.rng, "canonical handler changed RNG");
    assert(transition.events.length === 0, "canonical handler emitted event(s)");
    assert(same(vectorState(initialRules), inputSnapshot), "canonical handler mutated input");
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    const control = controlFromTransition(transition);
    return Object.freeze({
      initial: inputSnapshot,
      expected: vectorState(transition.rulesContext),
      control,
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    assert(same(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input");
    return Object.freeze({
      initial: inputSnapshot,
      expected: null,
      control: null,
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error.startsWith("Cmd_trywish requires one selector byte")) return "invalid-operand-shape";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.includes("requires a target role")) return "missing-target-role";
  if (outcome.error.startsWith("Cmd_trywish: unresolved jump target")) return "unresolved-jump-target";
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, projection, instructionSpec) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(projection, instructionSpec, cases.length + 31);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    initial: outcome.initial,
    instruction: vectorInstruction(instructionSpec),
    expected: outcome.expected,
    control: outcome.control,
    expectedError: outcome.error,
  }));
}

function baseProjection(overrides) {
  return makeProjection({
    topology: TOPOLOGIES[1],
    attacker: 0,
    target: 0,
    focus: 0,
    hp: 70,
    maxHp: 140,
    partyIndex: 3,
    wishCounter: [0, 0, 0, 0],
    wishMonId: [0, 0, 0, 0],
    battleMoveDamage: 0x1234,
    battleTextBuff1MonNick: Object.freeze({ battler: 2, partyIndex: 4 }),
    salt: cases.length + 17,
    ...overrides,
  });
}

// Mode 0: every attacker battler slot per topology, wishCounter domain
// {0,1,2,255}, and several partyIndex values -- proving the counter/mon-id
// write targets exactly the attacker's own cell and leaves every sibling
// (including battleMoveDamage/battleTextBuff1MonNick) untouched.
for (const topology of TOPOLOGIES) {
  for (const attacker of BATTLERS.filter((id) => id < topology.battlersCount)) {
    for (const wishCounterValue of WISH_COUNTERS) {
      for (const partyIndex of PARTY_INDEXES) {
        const wishCounter = [9, 9, 9, 9];
        wishCounter[attacker] = wishCounterValue;
        const wishMonId = [5, 5, 5, 5];
        addCase(
          `mode0_${topology.label}_a${attacker}_wc${wishCounterValue}_pi${partyIndex}`,
          "mode0-dense-attacker-sweep",
          makeProjection({
            topology,
            attacker,
            target: null,
            focus: attacker,
            hp: 70,
            maxHp: 140,
            partyIndex,
            wishCounter,
            wishMonId,
            battleMoveDamage: 0x2222,
            battleTextBuff1MonNick: null,
            salt: cases.length + 101,
          }),
          freezeInstructionSpec({
            programCounter: 1673,
            operandExpressions: [MODE_USE_WISH, USE_WISH_FAILURE_POINTER],
            baseOperand: useWishInstruction.operands[0],
          }),
        );
      }
    }
  }
}
// Mode 0 with a missing attacker for at least one topology.
addCase(
  "mode0_missing_attacker",
  "missing-attacker-role",
  baseProjection({ attacker: null, target: null }),
  USE_WISH_SPEC,
);

// Mode 1: every target battler slot per topology, full HP-domain matrix
// (hp==maxHp, hp<maxHp) across every maxHP endpoint, wishMonId[target] in
// 0..5, and prior battleMoveDamage/battleTextBuff1MonNick that must be
// overwritten unconditionally.
for (const topology of TOPOLOGIES) {
  for (const target of BATTLERS.filter((id) => id < topology.battlersCount)) {
    for (const maxHp of MAX_HP_VALUES) {
      for (const wishMonIdValue of PARTY_INDEXES) {
        for (const full of [true, false]) {
          const hp = full ? maxHp : maxHp > 0 ? maxHp - 1 : 0;
          const wishMonId = [5, 5, 5, 5];
          wishMonId[target] = wishMonIdValue;
          addCase(
            `mode1_${topology.label}_t${target}_maxhp${maxHp}_${full ? "full" : "nonfull"}_wmi${wishMonIdValue}`,
            "mode1-dense-target-sweep",
            makeProjection({
              topology,
              attacker: null,
              target,
              focus: target,
              hp,
              maxHp,
              partyIndex: 0,
              wishCounter: [0, 0, 0, 0],
              wishMonId,
              battleMoveDamage: -0x3333,
              battleTextBuff1MonNick: Object.freeze({ battler: (target + 1) % 4, partyIndex: 5 }),
              salt: cases.length + 5000,
            }),
            freezeInstructionSpec({
              programCounter: 2613,
              operandExpressions: [MODE_HEAL_EFFECT, HEAL_FAILURE_POINTER],
              baseOperand: healInstruction.operands[0],
            }),
          );
        }
      }
    }
  }
}
// Mode 1 with a missing target for at least one topology.
addCase(
  "mode1_missing_target",
  "missing-target-role",
  baseProjection({ attacker: null, target: null }),
  HEAL_SPEC,
);

// Unresolved-label cases on both modes, both the jump and non-jump branches.
addCase(
  "mode0_unresolved_pointer_on_jump_branch",
  "unresolved-jump-target",
  baseProjection({ attacker: 0, target: null, wishCounter: [1, 0, 0, 0] }),
  freezeInstructionSpec({
    programCounter: 1673,
    operandExpressions: [MODE_USE_WISH, UNRESOLVED_POINTER],
    baseOperand: useWishInstruction.operands[0],
  }),
);
addCase(
  "mode0_unresolved_pointer_not_reached_on_advance",
  "late-label-resolution",
  baseProjection({ attacker: 0, target: null, wishCounter: [0, 0, 0, 0] }),
  freezeInstructionSpec({
    programCounter: 1673,
    operandExpressions: [MODE_USE_WISH, UNRESOLVED_POINTER],
    baseOperand: useWishInstruction.operands[0],
  }),
);
addCase(
  "mode1_unresolved_pointer_on_jump_branch",
  "unresolved-jump-target",
  baseProjection({ attacker: null, target: 0, hp: 140, maxHp: 140 }),
  freezeInstructionSpec({
    programCounter: 2613,
    operandExpressions: [MODE_HEAL_EFFECT, UNRESOLVED_POINTER],
    baseOperand: healInstruction.operands[0],
  }),
);
addCase(
  "mode1_unresolved_pointer_not_reached_on_advance",
  "late-label-resolution",
  baseProjection({ attacker: null, target: 0, hp: 70, maxHp: 140 }),
  freezeInstructionSpec({
    programCounter: 2613,
    operandExpressions: [MODE_HEAL_EFFECT, UNRESOLVED_POINTER],
    baseOperand: healInstruction.operands[0],
  }),
);

// Malformed operand shapes: wrong count, selector "2", selector width 4,
// pointer width 1. All must fail before either role is read.
for (const [label, spec] of [
  ["malformed_wrong_operand_count", freezeInstructionSpec({
    operandWidths: [1],
    operandExpressions: [MODE_USE_WISH],
    baseOperand: useWishInstruction.operands[0],
  })],
  ["malformed_selector_expression_two", freezeInstructionSpec({
    operandWidths: [1, 4],
    operandExpressions: ["2", USE_WISH_FAILURE_POINTER],
    baseOperand: useWishInstruction.operands[0],
  })],
  ["malformed_selector_width_four", freezeInstructionSpec({
    operandWidths: [4, 4],
    operandExpressions: [MODE_USE_WISH, USE_WISH_FAILURE_POINTER],
    baseOperand: useWishInstruction.operands[0],
  })],
  ["malformed_pointer_width_one", freezeInstructionSpec({
    operandWidths: [1, 1],
    operandExpressions: [MODE_USE_WISH, USE_WISH_FAILURE_POINTER],
    baseOperand: useWishInstruction.operands[0],
  })],
]) {
  addCase(label, "malformed-operand-shape", baseProjection({ attacker: null, target: null }), spec);
}

function sourceRegistration(specs) {
  const instructions = Object.freeze(specs.map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTrywishOpcodeHandlers(customProgram);
    const keys = Object.keys(registered);
    assert(keys.length === 1, "canonical registration emitted more than one key");
    return Object.freeze({ opcodeId: Number(keys[0]), error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ opcodeId: null, error: error.message });
  }
}

const registrationCases = [];
function addRegistration(label, specs) {
  const outcome = sourceRegistration(specs);
  registrationCases.push(Object.freeze({
    label,
    instructions: Object.freeze(specs.map(vectorInstruction)),
    expectedOpcodeId: outcome.opcodeId,
    expectedError: outcome.error,
  }));
}

const noise = freezeInstructionSpec({
  opcodeName: "B_SCR_OP_RUST_NOISE",
  opcodeId: 0,
  dispatcher: "Cmd_noise",
  operandWidths: [],
  operandExpressions: [],
  baseOperand: useWishInstruction.operands[0],
});
addRegistration("canonical_pair", [USE_WISH_SPEC, HEAL_SPEC]);
addRegistration("canonical_pair_ignores_noise", [noise, USE_WISH_SPEC, noise, HEAL_SPEC, noise]);
addRegistration("wrong_cardinality_none", [noise]);
addRegistration("wrong_cardinality_one", [USE_WISH_SPEC]);
addRegistration("wrong_cardinality_three", [USE_WISH_SPEC, HEAL_SPEC, USE_WISH_SPEC]);
addRegistration("mismatched_opcode", [USE_WISH_SPEC, freezeInstructionSpec({
  opcodeId: 0xd0,
  programCounter: 2613,
  operandExpressions: [MODE_HEAL_EFFECT, HEAL_FAILURE_POINTER],
  baseOperand: healInstruction.operands[0],
})]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered" : value.expectedError.startsWith("committed Battle Script program must emit")
    ? "wrong-cardinality" : "mismatched-opcode"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["topology-variants", TOPOLOGIES.length],
  ["wish-counter-values", WISH_COUNTERS.length],
  ["party-index-values", PARTY_INDEXES.length],
  ["max-hp-values", MAX_HP_VALUES.length],
  ["registration-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  topologyVariants: TOPOLOGIES,
  wishCounters: WISH_COUNTERS,
  partyIndexes: PARTY_INDEXES,
  maxHpValues: MAX_HP_VALUES,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
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
function rustI32(value) { return value.toString(); }
function rustBattler(value) { return `BattleScriptTrywishBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustControl(value) {
  return value.kind === "advance" ? "BattleScriptTrywishControl::Advance"
    : `BattleScriptTrywishControl::Jump { program_counter: ${value.programCounter} }`;
}
function rustBattlerState(value) {
  return `BattleScriptTrywishVectorBattlerState { hp: ${rustU16(value.hp)}, max_hp: ${rustU16(value.maxHp)}, party_index: ${rustU8(value.partyIndex)}, ability: ${rustU8(value.ability)}, item: ${rustU16(value.item)}, status1: 0x${value.status1.toString(16).padStart(8, "0")} }`;
}
function rustMonNick(value) {
  return value === null ? "None"
    : `Some(BattleScriptTrywishMonNick { battler: ${rustBattler(value.battler)}, party_index: ${rustU8(value.partyIndex)} })`;
}
function rustState(value) {
  return [
    "BattleScriptTrywishVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `wish_counter: [${value.wishCounter.map(rustU8).join(", ")}],`,
    `wish_mon_id: [${value.wishMonId.map(rustU8).join(", ")}],`,
    `battle_move_damage: ${rustI32(value.battleMoveDamage)},`,
    `battle_text_buff1_mon_nick: ${rustMonNick(value.battleTextBuff1MonNick)},`,
    "}",
  ].join(" ");
}
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptTrywishOperand { width_bytes: ${rustU8(width)}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedJumpExpression === null ? "None"
    : `Some(BattleScriptTrywishResolvedLabel { expression: ${rustString(value.resolvedJumpExpression)}, program_counter: ${value.resolvedJumpProgramCounter} })`;
  return `BattleScriptTrywishInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${rustU8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_jump_target: ${resolved} }`;
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalControl(value) { return value === null ? "None" : `Some(${rustControl(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trywish-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrywishOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trywish::{");
lines.push("    BattleScriptTrywishBattler, BattleScriptTrywishControl,");
lines.push("    BattleScriptTrywishInstruction, BattleScriptTrywishMonNick,");
lines.push("    BattleScriptTrywishOperand, BattleScriptTrywishResolvedLabel,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYWISH_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYWISH_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYWISH_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYWISH_VECTOR_GENERATOR_BYTES: usize = ${generator.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrywishVectorBattlerState { pub hp: u16, pub max_hp: u16, pub party_index: u8, pub ability: u8, pub item: u16, pub status1: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrywishVectorState { pub battlers: [BattleScriptTrywishVectorBattlerState; 4], pub attacker: Option<BattleScriptTrywishBattler>, pub target: Option<BattleScriptTrywishBattler>, pub wish_counter: [u8; 4], pub wish_mon_id: [u8; 4], pub battle_move_damage: i32, pub battle_text_buff1_mon_nick: Option<BattleScriptTrywishMonNick> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrywishVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptTrywishVectorState, pub instruction: BattleScriptTrywishInstruction<'static>, pub expected: Option<BattleScriptTrywishVectorState>, pub control: Option<BattleScriptTrywishControl>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrywishRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptTrywishInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYWISH_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYWISH_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYWISH_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYWISH_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYWISH_CASES: [BattleScriptTrywishVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrywishVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        control: ${rustOptionalControl(value.control)}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYWISH_REGISTRATION_CASES: [BattleScriptTrywishRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrywishRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
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
if (!formatted) throw new Error("gen-battle-script-trywish-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
