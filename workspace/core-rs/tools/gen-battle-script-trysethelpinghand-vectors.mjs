#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrysethelpinghandOpcode.ts.
//
// Expected controls, projected output, ordered errors, registration, and
// repeated applications are produced only by calling the canonical TypeScript
// handler. This generator owns bounded input construction and Rust literal
// emission; it must not independently implement Helping Hand behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysethelpinghand-vectors.mjs

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
  "battle_script_trysethelpinghand_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrysethelpinghandOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETHELPINGHAND";
const OPCODE_ID = 0xd1;
const DISPATCHER = "Cmd_trysethelpinghand";
const ENTRY_LABEL = "BattleScript_EffectHelpingHand";
const FAILURE_POINTER = "BattleScript_ButItFailed";
const UNRESOLVED_POINTER = "BattleScript_RustHelpingHandUnresolved";
const BATTLE_TYPE_DOUBLE = 1;
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLERS = Object.freeze([null, 0, 1, 2, 3]);
const HELPING_HAND_EDGES = Object.freeze([0, 1, 2, 0x7f, 0x80, 0xff]);

const TOPOLOGIES = Object.freeze([
  Object.freeze({
    label: "singles_standard_plain",
    battlersCount: 2,
    battleTypeFlags: 0,
    battlerPositions: Object.freeze([0, 1, 0xfe, 0xff]),
  }),
  Object.freeze({
    label: "singles_standard_unrelated_flags",
    battlersCount: 2,
    battleTypeFlags: 0x8000_0008,
    battlerPositions: Object.freeze([0, 1, 0xfd, 0xfc]),
  }),
  Object.freeze({
    label: "singles_partnered_unrelated_flags",
    battlersCount: 2,
    battleTypeFlags: 0x0008_0008,
    battlerPositions: Object.freeze([0, 2, 0xff, 0xfe]),
  }),
  Object.freeze({
    label: "doubles_standard_plain",
    battlersCount: 4,
    battleTypeFlags: BATTLE_TYPE_DOUBLE,
    battlerPositions: Object.freeze([0, 1, 2, 3]),
  }),
  Object.freeze({
    label: "doubles_standard_unrelated_flags",
    battlersCount: 4,
    battleTypeFlags: (BATTLE_TYPE_DOUBLE | 0x8000_0008) >>> 0,
    battlerPositions: Object.freeze([0, 1, 2, 3]),
  }),
  Object.freeze({
    label: "doubles_permuted_unrelated_flags",
    battlersCount: 4,
    battleTypeFlags: (BATTLE_TYPE_DOUBLE | 0x0008_0008) >>> 0,
    battlerPositions: Object.freeze([1, 3, 0, 2]),
  }),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trysethelpinghand-vectors: ${message}`);
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

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff, `${label} must be u16`);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff, `${label} must be u32`);
}

function freezeTopology(value) {
  assert(value.battlersCount === 2 || value.battlersCount === 4, "topology count must be 2 or 4");
  assertU32(value.battleTypeFlags, "topology flags");
  assert(Array.isArray(value.battlerPositions) && value.battlerPositions.length === 4,
    "topology must contain four positions");
  value.battlerPositions.forEach((position, index) => assertU8(position, `position ${index}`));
  return Object.freeze({
    battlersCount: value.battlersCount,
    battleTypeFlags: value.battleTypeFlags >>> 0,
    battlerPositions: Object.freeze([...value.battlerPositions]),
  });
}

function canonicalPartner(topology, attacker) {
  assertBattler(attacker, "partner attacker");
  const partner = rulesModule.resolveBattleScriptBattlerPartner(topology, attacker);
  assertBattler(partner, "canonical partner");
  return partner;
}

// Canonical rules construction constrains gAbsentBattlerFlags to its four
// battler bits. Pick the next battler bit, which is unrelated to each
// case's computed positional partner while still exercising preserved bits.
function unrelatedAbsentBit(partner) {
  assertBattler(partner, "unrelated-absent partner");
  return 1 << ((partner + 1) & 3);
}

function projectionBattler(index, salt, helpingHand) {
  assertBattler(index, "projection battler");
  assertU8(helpingHand, "helpingHand");
  return Object.freeze({
    helpingHand,
    status3: (0x8000_0001 ^ ((salt * 0x0101 + index * 0x10001) >>> 0)) >>> 0,
    marker: (0x1357_0000 ^ ((salt * 0x1111 + index) >>> 0)) >>> 0,
  });
}

function makeProjection({
  topology,
  attacker,
  absentBattlerFlags,
  attackerHelpingHand,
  partnerHelpingHand,
  target = 1,
  effectBattler = 2,
  fainted = 3,
  salt,
}) {
  const frozenTopology = freezeTopology(topology);
  assertOptionalBattler(attacker, "attacker");
  assertU8(absentBattlerFlags, "absent flags");
  assertU8(attackerHelpingHand, "attacker helpingHand");
  assertU8(partnerHelpingHand, "partner helpingHand");
  assertOptionalBattler(target, "prior target");
  assertOptionalBattler(effectBattler, "effect battler");
  assertOptionalBattler(fainted, "fainted battler");
  const focus = attacker ?? 0;
  const partner = canonicalPartner(frozenTopology, focus);
  const battlers = BATTLERS.map((battler) => projectionBattler(
    battler,
    salt,
    battler === focus ? attackerHelpingHand : battler === partner ? partnerHelpingHand
      : HELPING_HAND_EDGES[(salt + battler) % HELPING_HAND_EDGES.length],
  ));
  return Object.freeze({
    battlers: Object.freeze(battlers),
    topology: frozenTopology,
    absentBattlerFlags,
    attacker,
    target,
    effectBattler,
    fainted,
    context: Object.freeze({
      scriptingBattler: (salt + 1) & 3,
      currentMove: [270, 33, 45, 98][salt & 3],
      hitMarker: (0x9000_0001 ^ ((salt * 0x10101) >>> 0)) >>> 0,
      battleCommunication0: (salt * 17 + 3) & 0xff,
    }),
  });
}

function canonicalBattler(projection, index) {
  const hp = 50 + index * 17;
  return Object.freeze({
    side: index & 1,
    ability: (index * 19 + 3) & 0xff,
    hp,
    maxHP: hp + 20,
    moves: Object.freeze([33 + index, 45 + index, 98 + index, 259 + index]),
    pp: Object.freeze([35, 25, 20, 15]),
    status1: (index * 0x101) >>> 0,
    status2: (0x4000_0000 | index) >>> 0,
    status3: projection.status3,
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
    encoreTimer: 0,
    encoredMove: 0,
    encoredMovePos: 0,
    encoreTimerStartValue: 0,
    item: index,
    statStages: Object.freeze([0, 1, 2, 3, 4, 5, 6, -6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    personality: projection.marker,
    attack: 100 + index,
    defense: 110 + index,
    spAttack: 120 + index,
    spDefense: 130 + index,
    speed: 140 + index,
    level: 50,
    friendship: 70,
    partyIndex: index,
    isFirstTurn: 0,
  });
}

// `createBattleScriptRulesContext` intentionally validates helpingHand as
// 0|1. The opcode itself does not validate its already-built context, so use a
// frozen internal replacement to exercise canonical exact `!== 1` semantics.
function canonicalRulesFromProjection(projection) {
  const base = rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(projection.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.effectBattler,
      fainted: projection.fainted,
    }),
    scriptingBattler: projection.context.scriptingBattler,
    atkCancelerTracker: 7,
    battleOutcome: 2,
    currentMove: projection.context.currentMove,
    currentMovePosition: 1,
    moveResultFlags: 0x80,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: projection.context.hitMarker,
    multiHitCounter: 4,
    battleCommunication0: projection.context.battleCommunication0,
    absentBattlerFlags: projection.absentBattlerFlags,
    battleTopology: projection.topology,
  });
  const battlers = base.battlers.map((battler, index) => Object.freeze({
    ...battler,
    helpingHand: projection.battlers[index].helpingHand,
    // Preserve an opaque JS sibling in a source-shaped field the command does
    // not read; status3 is separately projected below.
  }));
  return Object.freeze({ ...base, battlers: Object.freeze(battlers) });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map((battler, index) => Object.freeze({
      helpingHand: battler.helpingHand,
      status3: battler.status3 >>> 0,
      marker: battler.personality >>> 0,
    }))),
    topology: Object.freeze({
      battlersCount: rules.battleTopology.battlersCount,
      battleTypeFlags: rules.battleTopology.battleTypeFlags >>> 0,
      battlerPositions: Object.freeze([...rules.battleTopology.battlerPositions]),
    }),
    absentBattlerFlags: rules.absentBattlerFlags,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    context: Object.freeze({
      scriptingBattler: rules.scriptingBattler,
      currentMove: rules.currentMove,
      hitMarker: rules.hitMarker >>> 0,
      battleCommunication0: rules.battleCommunication0,
    }),
  });
}

function schedulerForSalt(salt) {
  return machineModule.createBattleScriptSchedulerState({
    messageDisplayActive: (salt & 1) === 0,
    pauseCounterBattle: (salt * 97 + 11) & 0xffff,
    activeBattler: salt % 3 === 0 ? null : (salt + 2) & 3,
    pendingControllerBattlers: salt % 4 === 0 ? [] : salt % 4 === 1 ? [1]
      : salt % 4 === 2 ? [3, 0] : [2, 1, 3],
  });
}

function vectorMachine(state) {
  return Object.freeze({
    scheduler: Object.freeze({
      messageDisplayActive: state.scheduler.messageDisplayActive,
      pauseCounterBattle: state.scheduler.pauseCounterBattle,
      activeBattler: state.scheduler.activeBattler,
      pendingControllerBattlers: Object.freeze([...state.scheduler.pendingControllerBattlers]),
    }),
    rngValue: state.rng.value >>> 0,
    rngCalls: state.rng.calls,
  });
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical Helping Hand singleton drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "canonical opcode drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(canonicalInstruction.source.label === ENTRY_LABEL, "canonical entry drifted");
assert(canonicalInstruction.programCounter === 1641, "canonical program counter drifted");
assert(canonicalInstruction.operands.length === 1, "canonical operand count drifted");
assert(canonicalInstruction.operands[0]?.widthBytes === 4, "canonical pointer width drifted");
assert(canonicalInstruction.operands[0]?.expression === FAILURE_POINTER, "canonical pointer drifted");
assert(programModule.resolveBattleScriptLabel(program, FAILURE_POINTER), "failure label must resolve");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTrysethelpinghandOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical Helping Hand handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  programCounter = 1641,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [4],
  operandExpressions = [FAILURE_POINTER],
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
  });
}

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...canonicalInstruction.operands[0],
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    ...canonicalInstruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(operands),
  });
}

function vectorInstruction(spec) {
  const instruction = instructionFromSpec(spec);
  const operand = instruction.operands[0];
  const resolved = operand === undefined ? undefined
    : programModule.resolveBattleScriptLabel(program, operand.expression);
  return Object.freeze({
    opcodeName: instruction.opcodeName,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher,
    operandWidths: Object.freeze([...spec.operandWidths]),
    operandExpressions: Object.freeze([...spec.operandExpressions]),
    resolvedFailureExpression: resolved === undefined ? null : operand.expression,
    resolvedFailureProgramCounter: resolved === undefined ? null : resolved.programCounter,
  });
}

const CANONICAL_INSTRUCTION = freezeInstructionSpec();

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({
    kind: "jump",
    programCounter: transition.control.programCounter,
  });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function sourceOutcome(initialProjection, instructionSpec, applications, salt) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const before = vectorState(currentRules);
      const state = Object.freeze({
        ...machineModule.createBattleScriptMachine(
          program,
          ENTRY_LABEL,
          currentRules,
          (0x1357_9bdf + salt) >>> 0,
        ),
        scheduler: schedulerForSalt(salt),
      });
      const transition = handler({
        program,
        instruction: instructionFromSpec(instructionSpec),
        state,
      });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
      assert(transition.rng === state.rng, "canonical handler changed RNG");
      assert(transition.events.length === 0, "canonical handler emitted event(s)");
      assert(same(vectorState(currentRules), before), "canonical handler mutated input");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      assert(Object.isFrozen(transition.rulesContext.selectorRoles), "canonical selector roles must be frozen");
      const control = controlFromTransition(transition);
      const attacker = currentRules.selectorRoles.attacker;
      assert(attacker !== null, "successful canonical handler had no attacker");
      const partner = rulesModule.resolveBattleScriptBattlerPartner(
        currentRules.battleTopology,
        attacker,
      );
      assert(transition.rulesContext.selectorRoles.target === partner,
        "canonical handler did not retarget to positional partner");
      if (control.kind === "advance") {
        assert(transition.rulesContext.battlers[partner].helpingHand === 1,
          "canonical success did not set only partner Helping Hand");
      }
      controls.push(control);
      currentRules = transition.rulesContext;
    }
    assert(same(vectorState(initialRules), inputSnapshot), "canonical initial state mutated");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
      machine: vectorMachine(Object.freeze({
        ...machineModule.createBattleScriptMachine(program, ENTRY_LABEL, initialRules, (0x1357_9bdf + salt) >>> 0),
        scheduler: schedulerForSalt(salt),
      })),
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    assert(same(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input");
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      error: error.message,
      machine: vectorMachine(Object.freeze({
        ...machineModule.createBattleScriptMachine(program, ENTRY_LABEL, initialRules, (0x1357_9bdf + salt) >>> 0),
        scheduler: schedulerForSalt(salt),
      })),
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.controls.map((control) => control.kind).join("-then-");
  if (outcome.error.startsWith("invalid B_SCR_OP_TRYSETHELPINGHAND shape")) return "invalid-instruction-shape";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.startsWith("Cmd_trysethelpinghand: unresolved failure target")) return "unresolved-failure-target";
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, projection, instructionSpec = CANONICAL_INSTRUCTION, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be 1 or 2`);
  const outcome = sourceOutcome(projection, instructionSpec, applications, cases.length + 31);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    initial: projection,
    machine: outcome.machine,
    instruction: vectorInstruction(instructionSpec),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

const doubleTopologies = TOPOLOGIES.filter((topology) => topology.battlersCount === 4);
const singlesTopologies = TOPOLOGIES.filter((topology) => topology.battlersCount === 2);
for (const topology of doubleTopologies) {
  for (const attacker of BATTLERS) {
    const partner = canonicalPartner(topology, attacker);
    for (const absentKind of ["present", "partner_absent", "unrelated", "partner_and_unrelated"]) {
      const partnerBit = 1 << partner;
      const unrelatedBit = unrelatedAbsentBit(partner);
      const absentBattlerFlags = absentKind === "present" ? 0
        : absentKind === "partner_absent" ? partnerBit
          : absentKind === "unrelated" ? unrelatedBit
            : partnerBit | unrelatedBit;
      for (const attackerHelpingHand of HELPING_HAND_EDGES) {
        for (const partnerHelpingHand of HELPING_HAND_EDGES) {
          addCase(
            `double_${topology.label}_a${attacker}_p${partner}_${absentKind}_ah${attackerHelpingHand}_ph${partnerHelpingHand}`,
            "double-dense-flags-absence-helpinghand-matrix",
            makeProjection({
              topology,
              attacker,
              absentBattlerFlags,
              attackerHelpingHand,
              partnerHelpingHand,
              target: OPTIONAL_BATTLERS[(attacker + partnerHelpingHand) % OPTIONAL_BATTLERS.length],
              effectBattler: OPTIONAL_BATTLERS[(attacker + attackerHelpingHand + 1) % OPTIONAL_BATTLERS.length],
              fainted: OPTIONAL_BATTLERS[(partner + attackerHelpingHand + partnerHelpingHand) % OPTIONAL_BATTLERS.length],
              salt: cases.length + attacker * 31 + partner,
            }),
          );
        }
      }
    }
  }
}

for (const topology of singlesTopologies) {
  for (const attacker of BATTLERS) {
    const partner = canonicalPartner(topology, attacker);
    for (const absentKind of ["present", "partner_absent", "unrelated", "partner_and_unrelated"]) {
      const partnerBit = 1 << partner;
      const unrelatedBit = unrelatedAbsentBit(partner);
      const absentBattlerFlags = absentKind === "present" ? 0
        : absentKind === "partner_absent" ? partnerBit
          : absentKind === "unrelated" ? unrelatedBit
            : partnerBit | unrelatedBit;
      for (const attackerHelpingHand of [0, 1, 2, 0xff]) {
        for (const partnerHelpingHand of [0, 1, 2, 0xff]) {
          addCase(
            `single_${topology.label}_a${attacker}_p${partner}_${absentKind}_ah${attackerHelpingHand}_ph${partnerHelpingHand}`,
            "singles-dense-flags-absence-helpinghand-matrix",
            makeProjection({
              topology,
              attacker,
              absentBattlerFlags,
              attackerHelpingHand,
              partnerHelpingHand,
              target: OPTIONAL_BATTLERS[(attacker + 2) % OPTIONAL_BATTLERS.length],
              effectBattler: OPTIONAL_BATTLERS[(partner + 3) % OPTIONAL_BATTLERS.length],
              fainted: OPTIONAL_BATTLERS[(attacker + partner) % OPTIONAL_BATTLERS.length],
              salt: cases.length + 1000,
            }),
          );
        }
      }
    }
  }
}

const selectorTopology = doubleTopologies[0];
for (const target of OPTIONAL_BATTLERS) {
  for (const effectBattler of OPTIONAL_BATTLERS) {
    for (const fainted of OPTIONAL_BATTLERS) {
      addCase(
        `selector_siblings_t${target ?? "n"}_e${effectBattler ?? "n"}_f${fainted ?? "n"}`,
        "optional-selector-siblings",
        makeProjection({
          topology: selectorTopology,
          attacker: 1,
          absentBattlerFlags: 0,
          attackerHelpingHand: 0,
          partnerHelpingHand: 0,
          target,
          effectBattler,
          fainted,
          salt: cases.length + 2000,
        }),
      );
    }
  }
}

const directTopology = doubleTopologies[2];
const directSuccess = () => makeProjection({
  topology: directTopology,
  attacker: 0,
  absentBattlerFlags: 0,
  attackerHelpingHand: 0,
  partnerHelpingHand: 0,
  target: 3,
  effectBattler: null,
  fainted: 1,
  salt: cases.length + 3000,
});
const directFailure = () => makeProjection({
  topology: directTopology,
  attacker: 0,
  absentBattlerFlags: 1 << canonicalPartner(directTopology, 0),
  attackerHelpingHand: 0,
  partnerHelpingHand: 0,
  target: null,
  effectBattler: 2,
  fainted: null,
  salt: cases.length + 3100,
});

for (const [label, spec] of [
  ["malformed_opcode_before_attacker", freezeInstructionSpec({ opcodeId: 0xd0 })],
  ["malformed_dispatcher_before_attacker", freezeInstructionSpec({ dispatcher: "Cmd_other" })],
  ["malformed_no_operand_before_attacker", freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })],
  ["malformed_two_operands_before_attacker", freezeInstructionSpec({ operandWidths: [4, 4], operandExpressions: [FAILURE_POINTER, FAILURE_POINTER] })],
  ["malformed_pointer_width_before_attacker", freezeInstructionSpec({ operandWidths: [1] })],
]) {
  addCase(label, "malformed-shape-before-attacker", makeProjection({
    topology: directTopology,
    attacker: null,
    absentBattlerFlags: 0x0f,
    attackerHelpingHand: 0xff,
    partnerHelpingHand: 0xff,
    target: 2,
    effectBattler: 3,
    fainted: 1,
    salt: cases.length + 3200,
  }), spec);
}

addCase("missing_attacker_precedes_partner_and_failure_label", "missing-attacker-role", makeProjection({
  topology: directTopology,
  attacker: null,
  absentBattlerFlags: 0x0f,
  attackerHelpingHand: 0xff,
  partnerHelpingHand: 0xff,
  target: 3,
  effectBattler: null,
  fainted: 1,
  salt: cases.length + 3300,
}), freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }));

addCase("success_ignores_unresolved_failure_label", "late-label-resolution", directSuccess(),
  freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }));
addCase("failure_resolves_unresolved_label_after_retarget", "late-label-resolution", directFailure(),
  freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }));
addCase("success_then_partner_already_set_failure", "repeated-application", directSuccess(), CANONICAL_INSTRUCTION, 2);
addCase("partner_already_set_failure_is_idempotent", "repeated-application", makeProjection({
  topology: directTopology,
  attacker: 3,
  absentBattlerFlags: 0,
  attackerHelpingHand: 0,
  partnerHelpingHand: 1,
  target: 0,
  effectBattler: 1,
  fainted: 2,
  salt: cases.length + 3400,
}), CANONICAL_INSTRUCTION, 2);
addCase("singles_failure_retargets_on_every_application", "repeated-application", makeProjection({
  topology: singlesTopologies[1],
  attacker: 0,
  absentBattlerFlags: unrelatedAbsentBit(canonicalPartner(singlesTopologies[1], 0)),
  attackerHelpingHand: 2,
  partnerHelpingHand: 0xff,
  target: 1,
  effectBattler: 3,
  fainted: null,
  salt: cases.length + 3500,
}), CANONICAL_INSTRUCTION, 2);

function sourceRegistration(specs) {
  const instructions = Object.freeze(specs.map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTrysethelpinghandOpcodeHandlers(customProgram);
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

const noise = freezeInstructionSpec({ opcodeName: "B_SCR_OP_RUST_NOISE", opcodeId: 0, dispatcher: "Cmd_noise", operandWidths: [] , operandExpressions: [] });
addRegistration("canonical_singleton", [CANONICAL_INSTRUCTION]);
addRegistration("canonical_singleton_ignores_noise", [noise, CANONICAL_INSTRUCTION, noise]);
addRegistration("wrong_cardinality_none", [noise]);
addRegistration("wrong_cardinality_two_selected", [CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION]);
addRegistration("wrong_cardinality_three_selected", [CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION]);
addRegistration("invalid_shape_opcode", [freezeInstructionSpec({ opcodeId: 0xd0 })]);
addRegistration("invalid_shape_dispatcher", [freezeInstructionSpec({ dispatcher: "Cmd_wrong" })]);
addRegistration("invalid_shape_no_operands", [freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })]);
addRegistration("invalid_shape_two_operands", [freezeInstructionSpec({ operandWidths: [4, 4], operandExpressions: [FAILURE_POINTER, FAILURE_POINTER] })]);
addRegistration("invalid_shape_pointer_width", [freezeInstructionSpec({ operandWidths: [1] })]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered" : value.expectedError.startsWith("B_SCR_OP_TRYSETHELPINGHAND requires")
    ? "wrong-cardinality" : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["topology-variants", TOPOLOGIES.length],
  ["singles-topology-variants", singlesTopologies.length],
  ["doubles-topology-variants", doubleTopologies.length],
  ["attacker-values", BATTLERS.length],
  ["optional-selector-values", OPTIONAL_BATTLERS.length],
  ["helping-hand-u8-edge-values", HELPING_HAND_EDGES.length],
  ["absent-flag-combinations", 4],
  ["battle-type-unrelated-flag-variants", TOPOLOGIES.filter((topology) => topology.battleTypeFlags & ~BATTLE_TYPE_DOUBLE).length],
  ["application-count-values", 2],
  ["registration-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  topologyVariants: TOPOLOGIES,
  battlers: BATTLERS,
  optionalBattlers: OPTIONAL_BATTLERS,
  helpingHandEdges: HELPING_HAND_EDGES,
  unrelatedAbsentBitRule: "next-battler-bit-modulo-four",
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
function rustU32(value) { return `0x${value.toString(16).padStart(8, "0")}`; }
function rustBattler(value) { return `BattleScriptTrysethelpinghandBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustControl(value) {
  return value.kind === "advance" ? "BattleScriptTrysethelpinghandControl::Advance"
    : `BattleScriptTrysethelpinghandControl::Jump { program_counter: ${value.programCounter} }`;
}
function rustTopology(value) {
  return `BattleScriptTrysethelpinghandVectorTopology { battlers_count: ${value.battlersCount}, battle_type_flags: ${rustU32(value.battleTypeFlags)}, battler_positions: [${value.battlerPositions.map(rustU8).join(", ")}] }`;
}
function rustBattlerState(value) {
  return `BattleScriptTrysethelpinghandVectorBattlerState { helping_hand: ${rustU8(value.helpingHand)}, status3: ${rustU32(value.status3)}, marker: ${rustU32(value.marker)} }`;
}
function rustContext(value) {
  return `BattleScriptTrysethelpinghandVectorContext { scripting_battler: ${rustBattler(value.scriptingBattler)}, current_move: ${rustU16(value.currentMove)}, hit_marker: ${rustU32(value.hitMarker)}, battle_communication0: ${rustU8(value.battleCommunication0)} }`;
}
function rustState(value) {
  return [
    "BattleScriptTrysethelpinghandVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `topology: ${rustTopology(value.topology)},`,
    `absent_battler_flags: ${rustU8(value.absentBattlerFlags)},`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `effect_battler: ${rustOptionalBattler(value.effectBattler)},`,
    `fainted: ${rustOptionalBattler(value.fainted)},`,
    `context: ${rustContext(value.context)},`,
    "}",
  ].join(" ");
}
function rustScheduler(value) {
  const pending = [0, 1, 2, 3].map((index) => rustOptionalBattler(value.pendingControllerBattlers[index] ?? null));
  return `BattleScriptTrysethelpinghandVectorScheduler { message_display_active: ${value.messageDisplayActive}, pause_counter_battle: ${rustU16(value.pauseCounterBattle)}, active_battler: ${rustOptionalBattler(value.activeBattler)}, pending_controller_battlers: [${pending.join(", ")}], pending_count: ${value.pendingControllerBattlers.length} }`;
}
function rustMachine(value) {
  return `BattleScriptTrysethelpinghandVectorMachine { scheduler: ${rustScheduler(value.scheduler)}, rng_value: ${rustU32(value.rngValue)}, rng_calls: ${value.rngCalls} }`;
}
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptTrysethelpinghandOperand { width_bytes: ${rustU8(width)}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedFailureExpression === null ? "None"
    : `Some(BattleScriptTrysethelpinghandResolvedLabel { expression: ${rustString(value.resolvedFailureExpression)}, program_counter: ${value.resolvedFailureProgramCounter} })`;
  return `BattleScriptTrysethelpinghandInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${rustU8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_failure_target: ${resolved} }`;
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysethelpinghand-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrysethelpinghandOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysethelpinghand::{");
lines.push("    BattleScriptTrysethelpinghandBattler, BattleScriptTrysethelpinghandControl,");
lines.push("    BattleScriptTrysethelpinghandInstruction, BattleScriptTrysethelpinghandOperand,");
lines.push("    BattleScriptTrysethelpinghandResolvedLabel,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_GENERATOR_BYTES: usize = ${generator.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysethelpinghandVectorTopology { pub battlers_count: u8, pub battle_type_flags: u32, pub battler_positions: [u8; 4] }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysethelpinghandVectorBattlerState { pub helping_hand: u8, pub status3: u32, pub marker: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysethelpinghandVectorContext { pub scripting_battler: BattleScriptTrysethelpinghandBattler, pub current_move: u16, pub hit_marker: u32, pub battle_communication0: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysethelpinghandVectorState { pub battlers: [BattleScriptTrysethelpinghandVectorBattlerState; 4], pub topology: BattleScriptTrysethelpinghandVectorTopology, pub absent_battler_flags: u8, pub attacker: Option<BattleScriptTrysethelpinghandBattler>, pub target: Option<BattleScriptTrysethelpinghandBattler>, pub effect_battler: Option<BattleScriptTrysethelpinghandBattler>, pub fainted: Option<BattleScriptTrysethelpinghandBattler>, pub context: BattleScriptTrysethelpinghandVectorContext }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysethelpinghandVectorScheduler { pub message_display_active: bool, pub pause_counter_battle: u16, pub active_battler: Option<BattleScriptTrysethelpinghandBattler>, pub pending_controller_battlers: [Option<BattleScriptTrysethelpinghandBattler>; 4], pub pending_count: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysethelpinghandVectorMachine { pub scheduler: BattleScriptTrysethelpinghandVectorScheduler, pub rng_value: u32, pub rng_calls: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysethelpinghandVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub applications: u8, pub initial: BattleScriptTrysethelpinghandVectorState, pub machine: BattleScriptTrysethelpinghandVectorMachine, pub instruction: BattleScriptTrysethelpinghandInstruction<'static>, pub expected: Option<BattleScriptTrysethelpinghandVectorState>, pub controls: &'static [BattleScriptTrysethelpinghandControl], pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysethelpinghandRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptTrysethelpinghandInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETHELPINGHAND_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETHELPINGHAND_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETHELPINGHAND_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETHELPINGHAND_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSETHELPINGHAND_CASES: [BattleScriptTrysethelpinghandVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysethelpinghandVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)}, applications: ${value.applications},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        machine: ${rustMachine(value.machine)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        controls: &[${value.controls.map(rustControl).join(", ")}], expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYSETHELPINGHAND_REGISTRATION_CASES: [BattleScriptTrysethelpinghandRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysethelpinghandRegistrationVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-trysethelpinghand-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
