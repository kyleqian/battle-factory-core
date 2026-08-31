#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrysetperishsongOpcode.ts.
//
// Expected controls, projected output, ordered errors, registration, and
// repeated applications are produced only by calling the canonical TypeScript
// handler. This generator owns bounded input construction and Rust literal
// emission; it must not independently implement Perish Song behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysetperishsong-vectors.mjs

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
  "battle_script_trysetperishsong_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrysetperishsongOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETPERISHSONG";
const OPCODE_ID = 0xb2;
const DISPATCHER = "Cmd_trysetperishsong";
const ENTRY_LABEL = "BattleScript_EffectPerishSong";
const FAILURE_POINTER = "BattleScript_ButItFailed";
const UNRESOLVED_POINTER = "BattleScript_RustPerishSongUnresolved";
const MOVE_PERISH_SONG = 195;
const ABILITY_SOUNDPROOF = 43;
const ABILITY_PRESSURE = 46;
const STATUS3_PERISH_SONG = 1 << 5;
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLERS = Object.freeze([null, 0, 1, 2, 3]);
const PP_VALUES = Object.freeze([0, 1, 2, 5]);

// Per-battler affliction "kind" matrix: an ordinary holder, an already-sung
// holder, a Soundproof holder, a plain Pressure holder, and a Pressure
// holder that is also already sung (Pressure PP loss is independent of
// affliction outcome, so this combination exercises both at once).
const KINDS = Object.freeze(["plain", "already_perished", "soundproof", "pressure", "pressure_perished"]);

function kindToState(kind) {
  switch (kind) {
    case "plain": return { status3: 0, ability: 0 };
    case "already_perished": return { status3: STATUS3_PERISH_SONG, ability: 0 };
    case "soundproof": return { status3: 0, ability: ABILITY_SOUNDPROOF };
    case "pressure": return { status3: 0, ability: ABILITY_PRESSURE };
    case "pressure_perished": return { status3: STATUS3_PERISH_SONG, ability: ABILITY_PRESSURE };
    default: throw new Error(`unknown kind ${kind}`);
  }
}

// Attacker moveset variants: Perish Song in each of the four slots, a
// duplicate-slot case (first occurrence must win), and no Perish Song at all.
const MOVESETS = Object.freeze([
  { label: "slot0", moves: [MOVE_PERISH_SONG, 33, 45, 98], perishSongPos: 0 },
  { label: "slot1", moves: [33, MOVE_PERISH_SONG, 45, 98], perishSongPos: 1 },
  { label: "slot2", moves: [33, 45, MOVE_PERISH_SONG, 98], perishSongPos: 2 },
  { label: "slot3", moves: [33, 45, 98, MOVE_PERISH_SONG], perishSongPos: 3 },
  { label: "duplicate", moves: [33, MOVE_PERISH_SONG, MOVE_PERISH_SONG, 98], perishSongPos: 1 },
  { label: "absent", moves: [33, 45, 98, 261], perishSongPos: null },
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trysetperishsong-vectors: ${message}`);
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
    status1: (index * 0x101 + salt) >>> 0,
    status2: (0x4000_0000 ^ (index + salt * 7)) >>> 0,
    item: (index * 31 + salt) & 0xffff,
    personality: (0x1357_0000 ^ ((salt * 0x1111 + index) >>> 0)) >>> 0,
  });
}

// Builds one full rules projection: `count` battlers, each assigned a kind
// from a rotation of KINDS offset by `patternOffset` so every battler
// position is exercised against every kind across the pattern sweep without
// a full 5^battlerCount cross product. The attacker's moveset/pp are
// overridden by `moveset`/`pp`; non-attacker slots get salted plain moves.
function makeProjection({ topology, attacker, patternOffset, moveset, pp, salt, target = null, effectBattler = null, fainted = null }) {
  const count = topology.battlersCount;
  assertBattler(attacker, "attacker");
  assert(attacker < count, "attacker must be an active battler");
  const battlers = BATTLERS.map((index) => {
    const kind = index < count ? KINDS[(index + patternOffset) % KINDS.length] : "plain";
    const { status3, ability } = kindToState(kind);
    const isAttacker = index === attacker;
    const moves = isAttacker ? moveset.moves : [12 + index, 0, 0, 0];
    const ppValues = isAttacker
      ? moveset.moves.map((_, slot) => (slot === moveset.perishSongPos ? pp : 10))
      : [10, 10, 10, 10];
    return Object.freeze({
      status3,
      ability,
      moves: Object.freeze(moves),
      pp: Object.freeze(ppValues),
      perishSongTimer: 0,
      perishSongTimerStartValue: 0,
      ...projectionBattlerSalt(index, salt),
    });
  });
  return Object.freeze({
    topology,
    attacker,
    battlers: Object.freeze(battlers),
    target,
    effectBattler,
    fainted,
    context: Object.freeze({
      scriptingBattler: (salt + 1) & 3,
      currentMove: MOVE_PERISH_SONG,
      hitMarker: (0x9000_0001 ^ ((salt * 0x10101) >>> 0)) >>> 0,
      battleCommunication0: (salt * 17 + 3) & 0xff,
    }),
  });
}

function canonicalBattler(projection, index) {
  const hp = 60 + index * 13;
  return Object.freeze({
    side: index & 1,
    ability: projection.battlers[index].ability,
    hp,
    maxHP: hp + 20,
    moves: projection.battlers[index].moves,
    pp: projection.battlers[index].pp,
    status1: projection.battlers[index].status1,
    status2: projection.battlers[index].status2,
    status3: projection.battlers[index].status3,
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
    item: projection.battlers[index].item,
    statStages: Object.freeze([0, 1, 2, 3, 4, 5, 6, -6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    personality: projection.battlers[index].personality,
    attack: 100 + index,
    defense: 110 + index,
    spAttack: 120 + index,
    spDefense: 130 + index,
    speed: 140 + index,
    level: 50,
    friendship: 70,
    partyIndex: index,
    isFirstTurn: 0,
    perishSongTimer: projection.battlers[index].perishSongTimer,
    perishSongTimerStartValue: projection.battlers[index].perishSongTimerStartValue,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(BATTLERS.map((index) => canonicalBattler(projection, index))),
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
    absentBattlerFlags: 0,
    battleTopology: projection.topology,
  });
}

function vectorBattlerState(battler) {
  return Object.freeze({
    status3: battler.status3 >>> 0,
    ability: battler.ability,
    moves: Object.freeze([...battler.moves]),
    pp: Object.freeze([...battler.pp]),
    perishSongTimer: battler.perishSongTimer,
    perishSongTimerStartValue: battler.perishSongTimerStartValue,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattlerState)),
    battlersCount: rules.battleTopology.battlersCount,
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
assert(canonicalInstructions.length === 1, "canonical Perish Song singleton drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "canonical opcode drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(canonicalInstruction.source.label === ENTRY_LABEL, "canonical entry drifted");
assert(canonicalInstruction.programCounter === 1057, "canonical program counter drifted");
assert(canonicalInstruction.operands.length === 1, "canonical operand count drifted");
assert(canonicalInstruction.operands[0]?.widthBytes === 4, "canonical pointer width drifted");
assert(canonicalInstruction.operands[0]?.expression === FAILURE_POINTER, "canonical pointer drifted");
const resolvedFailure = programModule.resolveBattleScriptLabel(program, FAILURE_POINTER);
assert(resolvedFailure, "failure label must resolve");
assert(resolvedFailure.programCounter === 1434, "canonical failure target program counter drifted");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTrysetperishsongOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical Perish Song handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  programCounter = 1057,
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
      controls.push(control);
      currentRules = transition.rulesContext;
    }
    assert(same(vectorState(initialRules), inputSnapshot), "canonical initial state mutated");
    return Object.freeze({
      initial: inputSnapshot,
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
      initial: inputSnapshot,
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
  if (outcome.error.startsWith("invalid B_SCR_OP_TRYSETPERISHSONG shape")) return "invalid-instruction-shape";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.startsWith("Cmd_trysetperishsong unresolved failure target")) return "unresolved-failure-target";
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
    initial: outcome.initial,
    machine: outcome.machine,
    instruction: vectorInstruction(instructionSpec),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

// Dense per-battler kind matrix: for each topology and each attacker slot,
// rotate the 5-kind assignment across battler positions (a Latin-square
// sweep instead of a full 5^battlerCount cross product) crossed with every
// attacker moveset and PP value. This covers ordinary holders, Soundproof
// skips, already-perished battlers, and both plain and already-perished
// Pressure holders in every battler position, including the attacker's own
// slot (proving the attacker's own Pressure is excluded from its PP loss).
for (const topology of TOPOLOGIES) {
  for (let attacker = 0; attacker < topology.battlersCount; attacker += 1) {
    for (let patternOffset = 0; patternOffset < KINDS.length; patternOffset += 1) {
      for (const moveset of MOVESETS) {
        for (const pp of PP_VALUES) {
          if (moveset.perishSongPos === null && pp !== PP_VALUES[0]) continue;
          addCase(
            `dense_${topology.label}_a${attacker}_pat${patternOffset}_${moveset.label}_pp${pp}`,
            "dense-kind-moveset-pp-matrix",
            makeProjection({
              topology,
              attacker,
              patternOffset,
              moveset,
              pp,
              salt: cases.length + 17,
            }),
          );
        }
      }
    }
  }
}

// Dedicated all-not-affected failure-path coverage: every active battler is
// either already perished or Soundproof, including a Pressure holder among
// them, to prove Pressure PP loss still runs on the failure branch.
const failureTopology = TOPOLOGIES[1];
for (const moveset of MOVESETS) {
  for (const pp of PP_VALUES) {
    if (moveset.perishSongPos === null && pp !== PP_VALUES[0]) continue;
    addCase(
      `all_not_affected_${moveset.label}_pp${pp}`,
      "all-not-affected-failure-path",
      Object.freeze({
        ...makeProjection({
          topology: failureTopology,
          attacker: 0,
          patternOffset: 0,
          moveset,
          pp,
          salt: cases.length + 5000,
        }),
        battlers: Object.freeze(BATTLERS.map((index) => {
          const kind = index % 2 === 0 ? "already_perished" : "pressure_perished";
          const { status3, ability } = kindToState(kind);
          const isAttacker = index === 0;
          const moves = isAttacker ? moveset.moves : [12 + index, 0, 0, 0];
          const ppValues = isAttacker
            ? moveset.moves.map((_, slot) => (slot === moveset.perishSongPos ? pp : 10))
            : [10, 10, 10, 10];
          return Object.freeze({
            status3,
            ability,
            moves: Object.freeze(moves),
            pp: Object.freeze(ppValues),
            perishSongTimer: 0,
            perishSongTimerStartValue: 0,
            ...projectionBattlerSalt(index, cases.length + 5000),
          });
        })),
      }),
    );
  }
}

// Multi-Pressure floor-at-zero: three Pressure holders besides the attacker
// would each try to decrement the same PP slot; the floor at zero must stop
// further decrements once it hits zero.
for (const pp of PP_VALUES) {
  addCase(
    `multi_pressure_floor_pp${pp}`,
    "multi-pressure-floor-at-zero",
    Object.freeze({
      ...makeProjection({
        topology: failureTopology,
        attacker: 0,
        patternOffset: 0,
        moveset: MOVESETS[0],
        pp,
        salt: cases.length + 6000,
      }),
      battlers: Object.freeze(BATTLERS.map((index) => {
        const kind = index === 0 ? "plain" : "pressure";
        const { status3, ability } = kindToState(kind);
        const isAttacker = index === 0;
        const moves = isAttacker ? MOVESETS[0].moves : [12 + index, 0, 0, 0];
        const ppValues = isAttacker ? [pp, 10, 10, 10] : [10, 10, 10, 10];
        return Object.freeze({
          status3,
          ability,
          moves: Object.freeze(moves),
          pp: Object.freeze(ppValues),
          perishSongTimer: 0,
          perishSongTimerStartValue: 0,
          ...projectionBattlerSalt(index, cases.length + 6000),
        });
      })),
    }),
  );
}

// Optional selector siblings: target/effectBattler/fainted must pass through
// untouched regardless of value, including all-null.
const selectorTopology = TOPOLOGIES[1];
for (const target of OPTIONAL_BATTLERS) {
  for (const effectBattler of OPTIONAL_BATTLERS) {
    for (const fainted of OPTIONAL_BATTLERS) {
      addCase(
        `selector_siblings_t${target ?? "n"}_e${effectBattler ?? "n"}_f${fainted ?? "n"}`,
        "optional-selector-siblings",
        makeProjection({
          topology: selectorTopology,
          attacker: 1,
          patternOffset: 2,
          moveset: MOVESETS[1],
          pp: 5,
          target,
          effectBattler,
          fainted,
          salt: cases.length + 7000,
        }),
      );
    }
  }
}

// Repeated application: after a successful pass every affected battler is
// already perished, so re-running must skip them (and, at all-battlers
// perished, take the failure branch on the second application).
addCase("repeated_application_second_pass_skips_affected", "repeated-application", makeProjection({
  topology: TOPOLOGIES[0],
  attacker: 0,
  patternOffset: 0,
  moveset: MOVESETS[0],
  pp: 2,
  salt: cases.length + 8000,
}), CANONICAL_INSTRUCTION, 2);
addCase("repeated_application_late_label_unresolved_first_pass_succeeds", "late-label-resolution", makeProjection({
  topology: TOPOLOGIES[0],
  attacker: 0,
  patternOffset: 0,
  moveset: MOVESETS[0],
  pp: 2,
  salt: cases.length + 8100,
}), freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }), 1);

for (const [label, spec] of [
  ["malformed_opcode_before_attacker", freezeInstructionSpec({ opcodeId: 0xb0 })],
  ["malformed_dispatcher_before_attacker", freezeInstructionSpec({ dispatcher: "Cmd_other" })],
  ["malformed_no_operand_before_attacker", freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })],
  ["malformed_two_operands_before_attacker", freezeInstructionSpec({ operandWidths: [4, 4], operandExpressions: [FAILURE_POINTER, FAILURE_POINTER] })],
  ["malformed_pointer_width_before_attacker", freezeInstructionSpec({ operandWidths: [1] })],
]) {
  addCase(label, "malformed-shape-before-attacker", makeProjection({
    topology: TOPOLOGIES[1],
    attacker: 0,
    patternOffset: 0,
    moveset: MOVESETS[0],
    pp: 2,
    salt: cases.length + 9000,
  }), spec);
}

addCase("missing_attacker_precedes_failure_label", "missing-attacker-role", Object.freeze({
  ...makeProjection({
    topology: TOPOLOGIES[1],
    attacker: 0,
    patternOffset: 0,
    moveset: MOVESETS[0],
    pp: 2,
    salt: cases.length + 9100,
  }),
  attacker: null,
}), freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }));

addCase("unresolved_failure_target_when_all_not_affected", "unresolved-failure-target", Object.freeze({
  ...makeProjection({
    topology: TOPOLOGIES[1],
    attacker: 0,
    patternOffset: 0,
    moveset: MOVESETS[0],
    pp: 2,
    salt: cases.length + 9200,
  }),
  battlers: Object.freeze(BATTLERS.map((index) => Object.freeze({
    status3: STATUS3_PERISH_SONG,
    ability: 0,
    moves: Object.freeze(index === 0 ? MOVESETS[0].moves : [12 + index, 0, 0, 0]),
    pp: Object.freeze(index === 0 ? [2, 10, 10, 10] : [10, 10, 10, 10]),
    perishSongTimer: 2,
    perishSongTimerStartValue: 2,
    ...projectionBattlerSalt(index, cases.length + 9200),
  }))),
}), freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }));

function sourceRegistration(specs) {
  const instructions = Object.freeze(specs.map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTrysetperishsongOpcodeHandlers(customProgram);
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

const noise = freezeInstructionSpec({ opcodeName: "B_SCR_OP_RUST_NOISE", opcodeId: 0, dispatcher: "Cmd_noise", operandWidths: [], operandExpressions: [] });
addRegistration("canonical_singleton", [CANONICAL_INSTRUCTION]);
addRegistration("canonical_singleton_ignores_noise", [noise, CANONICAL_INSTRUCTION, noise]);
addRegistration("wrong_cardinality_none", [noise]);
addRegistration("wrong_cardinality_two_selected", [CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION]);
addRegistration("wrong_cardinality_three_selected", [CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION]);
addRegistration("invalid_shape_opcode", [freezeInstructionSpec({ opcodeId: 0xb0 })]);
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
  value.expectedError === null ? "registered" : value.expectedError.startsWith("B_SCR_OP_TRYSETPERISHSONG requires")
    ? "wrong-cardinality" : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["topology-variants", TOPOLOGIES.length],
  ["kind-values", KINDS.length],
  ["moveset-variants", MOVESETS.length],
  ["pp-values", PP_VALUES.length],
  ["optional-selector-values", OPTIONAL_BATTLERS.length],
  ["application-count-values", 2],
  ["registration-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  topologyVariants: TOPOLOGIES,
  kinds: KINDS,
  movesets: MOVESETS,
  ppValues: PP_VALUES,
  optionalBattlers: OPTIONAL_BATTLERS,
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
function rustBattler(value) { return `BattleScriptTrysetperishsongBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustBattlersCount(value) {
  return value === 2 ? "BattleScriptTrysetperishsongBattlersCount::Singles"
    : "BattleScriptTrysetperishsongBattlersCount::Doubles";
}
function rustControl(value) {
  return value.kind === "advance" ? "BattleScriptTrysetperishsongControl::Advance"
    : `BattleScriptTrysetperishsongControl::Jump { program_counter: ${value.programCounter} }`;
}
function rustBattlerState(value) {
  return `BattleScriptTrysetperishsongVectorBattlerState { status3: ${rustU32(value.status3)}, ability: ${rustU8(value.ability)}, moves: [${value.moves.map(rustU16).join(", ")}], pp: [${value.pp.map(rustU8).join(", ")}], perish_song_timer: ${rustU8(value.perishSongTimer)}, perish_song_timer_start_value: ${rustU8(value.perishSongTimerStartValue)} }`;
}
function rustContext(value) {
  return `BattleScriptTrysetperishsongVectorContext { scripting_battler: ${rustBattler(value.scriptingBattler)}, current_move: ${rustU16(value.currentMove)}, hit_marker: ${rustU32(value.hitMarker)}, battle_communication0: ${rustU8(value.battleCommunication0)} }`;
}
function rustState(value) {
  return [
    "BattleScriptTrysetperishsongVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `battlers_count: ${rustBattlersCount(value.battlersCount)},`,
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
  return `BattleScriptTrysetperishsongVectorScheduler { message_display_active: ${value.messageDisplayActive}, pause_counter_battle: ${rustU16(value.pauseCounterBattle)}, active_battler: ${rustOptionalBattler(value.activeBattler)}, pending_controller_battlers: [${pending.join(", ")}], pending_count: ${value.pendingControllerBattlers.length} }`;
}
function rustMachine(value) {
  return `BattleScriptTrysetperishsongVectorMachine { scheduler: ${rustScheduler(value.scheduler)}, rng_value: ${rustU32(value.rngValue)}, rng_calls: ${value.rngCalls} }`;
}
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptTrysetperishsongOperand { width_bytes: ${rustU8(width)}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedFailureExpression === null ? "None"
    : `Some(BattleScriptTrysetperishsongResolvedLabel { expression: ${rustString(value.resolvedFailureExpression)}, program_counter: ${value.resolvedFailureProgramCounter} })`;
  return `BattleScriptTrysetperishsongInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${rustU8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_failure_target: ${resolved} }`;
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
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysetperishsong-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrysetperishsongOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysetperishsong::{");
lines.push("    BattleScriptTrysetperishsongBattler, BattleScriptTrysetperishsongBattlersCount,");
lines.push("    BattleScriptTrysetperishsongControl, BattleScriptTrysetperishsongInstruction,");
lines.push("    BattleScriptTrysetperishsongOperand, BattleScriptTrysetperishsongResolvedLabel,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_GENERATOR_BYTES: usize = ${generator.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetperishsongVectorBattlerState { pub status3: u32, pub ability: u8, pub moves: [u16; 4], pub pp: [u8; 4], pub perish_song_timer: u8, pub perish_song_timer_start_value: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetperishsongVectorContext { pub scripting_battler: BattleScriptTrysetperishsongBattler, pub current_move: u16, pub hit_marker: u32, pub battle_communication0: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetperishsongVectorState { pub battlers: [BattleScriptTrysetperishsongVectorBattlerState; 4], pub battlers_count: BattleScriptTrysetperishsongBattlersCount, pub attacker: Option<BattleScriptTrysetperishsongBattler>, pub target: Option<BattleScriptTrysetperishsongBattler>, pub effect_battler: Option<BattleScriptTrysetperishsongBattler>, pub fainted: Option<BattleScriptTrysetperishsongBattler>, pub context: BattleScriptTrysetperishsongVectorContext }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetperishsongVectorScheduler { pub message_display_active: bool, pub pause_counter_battle: u16, pub active_battler: Option<BattleScriptTrysetperishsongBattler>, pub pending_controller_battlers: [Option<BattleScriptTrysetperishsongBattler>; 4], pub pending_count: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetperishsongVectorMachine { pub scheduler: BattleScriptTrysetperishsongVectorScheduler, pub rng_value: u32, pub rng_calls: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetperishsongVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub applications: u8, pub initial: BattleScriptTrysetperishsongVectorState, pub machine: BattleScriptTrysetperishsongVectorMachine, pub instruction: BattleScriptTrysetperishsongInstruction<'static>, pub expected: Option<BattleScriptTrysetperishsongVectorState>, pub controls: &'static [BattleScriptTrysetperishsongControl], pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetperishsongRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptTrysetperishsongInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETPERISHSONG_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETPERISHSONG_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETPERISHSONG_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETPERISHSONG_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSETPERISHSONG_CASES: [BattleScriptTrysetperishsongVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetperishsongVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)}, applications: ${value.applications},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        machine: ${rustMachine(value.machine)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        controls: &[${value.controls.map(rustControl).join(", ")}], expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYSETPERISHSONG_REGISTRATION_CASES: [BattleScriptTrysetperishsongRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetperishsongRegistrationVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-trysetperishsong-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
