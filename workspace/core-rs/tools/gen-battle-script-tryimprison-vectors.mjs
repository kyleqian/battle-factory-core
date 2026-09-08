#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTryimprisonOpcode.ts.
//
// Expected controls, projected rules/scheduler, events, and ordered errors
// come only from executing the canonical TypeScript handler through the
// real Battle Script machine. This generator owns bounded input
// construction and Rust literal emission; it must not independently
// implement Imprison or PressurePPLoseOnUsingImprison behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-tryimprison-vectors.mjs

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
  "battle_script_tryimprison_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptTryimprisonOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYIMPRISON";
const OPCODE_ID = 0xdb;
const DISPATCHER = "Cmd_tryimprison";
const ENTRY_LABEL = "BattleScript_EffectImprison";
const FAILURE_LABEL = "BattleScript_ButItFailed";
const UNRESOLVED_POINTER = "BattleScript_RustTryimprisonUnresolved";
const MOVE_IMPRISON = 286;
const MOVE_NONE = 0;
const ABILITY_PRESSURE = 46;
const STATUS2_TRANSFORMED = 1 << 21;
const STATUS3_IMPRISONED_OTHERS = 1 << 13;
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const SIDES = Object.freeze([0, 1]);
const PARTY_INDEXES = Object.freeze([0, 1, 2, 3, 4, 5]);
const GENERATED_FILE_MAX_BYTES = 6_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-tryimprison-vectors: ${message}`);
}

function freezeArray(values) {
  return Object.freeze(values.slice());
}
function battler(value) {
  return `BattleScriptTryimprisonBattler::Battler${value}`;
}
function optionBattler(value) {
  return value === null || value === undefined ? "None" : `Some(${battler(value)})`;
}
function side(value) {
  return value === 0 ? "BattleScriptTryimprisonSide::Player" : "BattleScriptTryimprisonSide::Opponent";
}
function battlersCount(value) {
  return value === 2 ? "BattleScriptTryimprisonBattlersCount::Singles" : "BattleScriptTryimprisonBattlersCount::Doubles";
}
function hex8(value) {
  return `0x${(value & 0xff).toString(16).padStart(2, "0")}`;
}
function hex16(value) {
  return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`;
}
function hex32(value) {
  return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
}
function rustString(value) {
  return JSON.stringify(value);
}

// The canonical battler-projection schema this leaf reads/writes: side,
// partyIndex, ability, status2, status3, moves, pp, mimickedMoves.
function projectionBattler(index, salt, sideValue, partyIndex, overrides = {}) {
  return Object.freeze({
    side: sideValue,
    partyIndex,
    ability: overrides.ability ?? 0,
    status2: overrides.status2 ?? 0,
    status3: overrides.status3 ?? 0,
    moves: freezeArray(overrides.moves ?? [12 + index, 13 + index, 14 + index, 15 + index]),
    pp: freezeArray(overrides.pp ?? [10, 10, 10, 10]),
    mimickedMoves: overrides.mimickedMoves ?? 0,
    // Salted noise carried through party pp cells not touched by this command.
    partyNoiseSeed: salt,
  });
}

function defaultBattlerSlot(index, salt) {
  return Object.freeze({ side: (index + salt) & 1, partyIndex: (index * 2 + salt) % 6 });
}

function makeProjection({
  battlersCount: count,
  attacker,
  attackerSide = 0,
  attackerPartyIndex = 0,
  attackerOverrides = {},
  opponents = [],
  pending = [],
  activeBattler = null,
  salt = 0,
}) {
  const battlerList = BATTLERS.map((index) => {
    if (attacker !== null && index === attacker) {
      return projectionBattler(index, salt, attackerSide, attackerPartyIndex, attackerOverrides);
    }
    const opponentOverride = opponents.find((entry) => entry.index === index);
    const fallback = defaultBattlerSlot(index, salt);
    if (opponentOverride) {
      return projectionBattler(index, salt, opponentOverride.side ?? fallback.side, fallback.partyIndex, opponentOverride);
    }
    return projectionBattler(index, salt, fallback.side, fallback.partyIndex, {});
  });
  const party = SIDES.map((sideValue) => PARTY_INDEXES.map((partyIndex) => {
    // Salted noise pp values distinguish "untouched" cells from writes.
    const base = 30 + sideValue * 3 + partyIndex + (salt % 13);
    return Object.freeze({ pp: freezeArray([base, base + 1, base + 2, base + 3].map((value) => value & 0xff)) });
  }));
  return Object.freeze({
    battlersCount: count,
    battlers: freezeArray(battlerList),
    party: freezeArray(party.map(freezeArray)),
    attacker,
    pending: freezeArray(pending),
    activeBattler,
  });
}

function canonicalBattler(value, index) {
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: 100,
    maxHP: 100,
    moves: value.moves,
    pp: value.pp,
    status1: 0,
    status2: value.status2,
    status3: value.status3,
    mimickedMoves: value.mimickedMoves,
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
    species: index + 1,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: value.partyIndex,
  });
}

function canonicalPartyMember(value) {
  return Object.freeze({ species: 1, isEgg: false, hp: 100, pp: value.pp });
}

function canonicalRules(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(projection.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker: projection.attacker, target: 0, effectBattler: 0 }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_IMPRISON,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: Object.freeze({
      player: freezeArray(projection.party[0].map(canonicalPartyMember)),
      opponent: freezeArray(projection.party[1].map(canonicalPartyMember)),
    }),
    battleTopology: Object.freeze({
      battlersCount: projection.battlersCount,
      battleTypeFlags: projection.battlersCount === 2 ? 0x8000_0008 : (1 | 0x0008_0008) >>> 0,
      battlerPositions: projection.battlersCount === 2
        ? Object.freeze([0, 1, 0xfe, 0xff])
        : Object.freeze([0, 1, 2, 3]),
    }),
  });
}

function projectBattlerState(value) {
  return Object.freeze({
    side: value.side,
    partyIndex: value.partyIndex,
    ability: value.ability,
    status2: value.status2 >>> 0,
    status3: value.status3 >>> 0,
    moves: freezeArray(value.moves),
    pp: freezeArray(value.pp),
    mimickedMoves: value.mimickedMoves,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map(projectBattlerState)),
    party: freezeArray([rules.party.player, rules.party.opponent].map((members) =>
      freezeArray(members.map((member) => Object.freeze({ pp: freezeArray(member.pp) }))))),
    attacker: rules.selectorRoles.attacker,
    battlersCount: rules.battleTopology.battlersCount,
  });
}

function schedulerFor(projection) {
  return machineModule.createBattleScriptSchedulerState({
    activeBattler: projection.activeBattler,
    pendingControllerBattlers: freezeArray(projection.pending),
  });
}

function vectorScheduler(scheduler) {
  return Object.freeze({
    activeBattler: scheduler.activeBattler,
    pendingControllerBattlers: freezeArray(scheduler.pendingControllerBattlers),
  });
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((value) => value.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical tryimprison singleton drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "opcode identity drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "dispatcher drifted");
assert(canonicalInstruction.programCounter === 1794, "instruction program counter drifted");
assert(canonicalInstruction.operands[0]?.expression === FAILURE_LABEL, "failure label drifted");
assert(
  programModule.resolveBattleScriptLabel(program, FAILURE_LABEL)?.programCounter === 1434,
  "failure resolution drifted",
);
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTryimprisonOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical tryimprison handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [4],
  operandExpressions = [FAILURE_LABEL],
} = {}) {
  return Object.freeze({
    opcodeName,
    opcodeId,
    dispatcher,
    operandWidths: freezeArray(operandWidths),
    operandExpressions: freezeArray(operandExpressions),
  });
}

const CANONICAL_SPEC = freezeInstructionSpec();

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...canonicalInstruction.operands[0],
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    ...canonicalInstruction,
    opcodeName: spec.opcodeName,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: freezeArray(operands),
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
    operandWidths: freezeArray(spec.operandWidths),
    operandExpressions: freezeArray(spec.operandExpressions),
    resolvedFailureExpression: resolved === undefined ? null : operand.expression,
    resolvedFailureProgramCounter: resolved === undefined ? null : resolved.programCounter,
  });
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({
    kind: "jump",
    programCounter: transition.control.programCounter,
  });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function sourceOutcome(projection, instructionSpec) {
  const rules = canonicalRules(projection);
  const scheduler = schedulerFor(projection);
  const beforeRules = vectorState(rules);
  const beforeScheduler = vectorScheduler(scheduler);
  const instruction = instructionFromSpec(instructionSpec);
  try {
    const scaffold = machineModule.createBattleScriptMachine(
      program, ENTRY_LABEL, rules, 0x1234_5678, scheduler,
    );
    const state = Object.freeze({ ...scaffold, programCounter: canonicalInstruction.programCounter });
    const transition = handler({ program, instruction, state });
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(same(vectorState(rules), beforeRules), "canonical handler mutated input rules");
    assert(same(vectorScheduler(scheduler), beforeScheduler), "canonical handler mutated input scheduler");
    const control = controlFromTransition(transition);
    const events = transition.events.map((event) => Object.freeze({
      kind: event.kind,
      battler: event.battler,
      movePosition: event.movePosition,
      pp: event.pp,
    }));
    return Object.freeze({
      initialRules: beforeRules,
      initialScheduler: beforeScheduler,
      expectedRules: vectorState(transition.rulesContext),
      expectedScheduler: vectorScheduler(transition.scheduler),
      control,
      events: freezeArray(events),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({
      initialRules: beforeRules,
      initialScheduler: beforeScheduler,
      expectedRules: null,
      expectedScheduler: null,
      control: null,
      events: freezeArray([]),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error.startsWith("invalid B_SCR_OP_TRYIMPRISON shape")) return "invalid-instruction-shape";
  if (outcome.error.startsWith("Cmd_tryimprison unresolved failure target")) return "unresolved-failure-target";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, projection, instructionSpec = CANONICAL_SPEC) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(projection, instructionSpec);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    initial: projection,
    instruction: vectorInstruction(instructionSpec),
    ...outcome,
  }));
}

function withImprison(position, others = [0, 0, 0]) {
  const moves = [0, 0, 0, 0];
  moves[position] = MOVE_IMPRISON;
  let otherIndex = 0;
  for (let index = 0; index < 4; index += 1) {
    if (index !== position) {
      moves[index] = others[otherIndex] ?? 30 + index;
      otherIndex += 1;
    }
  }
  return moves;
}

let salt = 0;
function nextSalt() {
  salt += 1;
  return salt;
}

// --- attacker-identity-matrix: every attacker slot, both topologies, plus
// missing-attacker (with the imprisoned bit ALSO set, proving the role check
// runs before the already-imprisoned short circuit). ---
for (const count of [2, 4]) {
  for (let attacker = 0; attacker < count; attacker += 1) {
    const opponents = [];
    for (let index = 0; index < count; index += 1) {
      if (index !== attacker && (index & 1) !== (attacker & 1)) {
        opponents.push({ index, moves: withImprison(2, [99, 98, 97]).map((value, position) => (position === 1 ? MOVE_IMPRISON : value)) });
      }
    }
    addCase(
      `attacker_${attacker}_of_${count}`,
      "attacker-identity-matrix",
      makeProjection({
        battlersCount: count,
        attacker,
        attackerSide: attacker & 1,
        attackerPartyIndex: attacker,
        attackerOverrides: { moves: withImprison(0, [1, 2, 3]) },
        opponents,
        salt: nextSalt(),
      }),
    );
  }
}
addCase(
  "missing_attacker_precedes_imprisoned_check",
  "attacker-identity-matrix",
  (() => {
    const projection = makeProjection({
      battlersCount: 4,
      attacker: 0,
      attackerOverrides: { status3: STATUS3_IMPRISONED_OTHERS },
      salt: nextSalt(),
    });
    return Object.freeze({ ...projection, attacker: null });
  })(),
);

// --- already-imprisoned-early-jump: proves no PP loss even with an
// opposing Pressure holder present and Imprison in the attacker's moves. ---
for (const count of [2, 4]) {
  addCase(
    `already_imprisoned_${count}`,
    "already-imprisoned-early-jump",
    makeProjection({
      battlersCount: count,
      attacker: 0,
      attackerOverrides: { status3: STATUS3_IMPRISONED_OTHERS, moves: withImprison(0, [1, 2, 3]), pp: [5, 10, 10, 10] },
      opponents: [{ index: 1, ability: ABILITY_PRESSURE, side: 1 }],
      salt: nextSalt(),
    }),
  );
}

// --- pressure-count-matrix: 0/1/2 opposing Pressure holders, a same-side
// holder (ignored), an attacker without Imprison, and pp at 0/1/5. ---
const PRESSURE_PP_VALUES = Object.freeze([0, 1, 5]);
for (const opposingCount of [0, 1, 2]) {
  for (const pp of PRESSURE_PP_VALUES) {
    const opponents = [];
    for (let index = 0; index < opposingCount; index += 1) {
      opponents.push({ index: 1 + index * 2, ability: ABILITY_PRESSURE, side: 1 });
    }
    addCase(
      `pressure_opposing${opposingCount}_pp${pp}`,
      "pressure-count-matrix",
      makeProjection({
        battlersCount: 4,
        attacker: 0,
        attackerOverrides: { moves: withImprison(0, [1, 2, 3]), pp: [pp, 10, 10, 10] },
        opponents,
        salt: nextSalt(),
      }),
    );
  }
}
addCase(
  "pressure_same_side_ignored",
  "pressure-count-matrix",
  makeProjection({
    battlersCount: 4,
    attacker: 0,
    attackerSide: 0,
    attackerOverrides: { moves: withImprison(0, [1, 2, 3]), pp: [5, 10, 10, 10] },
    opponents: [{ index: 2, ability: ABILITY_PRESSURE, side: 0 }],
    salt: nextSalt(),
  }),
);
for (const opposingCount of [0, 1]) {
  const opponents = [];
  for (let index = 0; index < opposingCount; index += 1) {
    opponents.push({ index: 1 + index * 2, ability: ABILITY_PRESSURE, side: 1 });
  }
  addCase(
    `pressure_no_imprison_move_opposing${opposingCount}`,
    "pressure-count-matrix",
    makeProjection({
      battlersCount: 4,
      attacker: 0,
      attackerOverrides: { moves: [11, 12, 13, 14], pp: [5, 5, 5, 5] },
      opponents,
      salt: nextSalt(),
    }),
  );
}

// --- permanence-gate-matrix: transformed, mimicked-at-position,
// mimicked-at-other-position (still permanent), both clear. ---
const PERMANENCE_VARIANTS = Object.freeze([
  { label: "transformed_only", status2: STATUS2_TRANSFORMED, mimickedMoves: 0 },
  { label: "mimicked_at_position_only", status2: 0, mimickedMoves: 0b0001 },
  { label: "mimicked_at_other_position", status2: 0, mimickedMoves: 0b0010 },
  { label: "both_clear", status2: 0, mimickedMoves: 0 },
  { label: "both_set", status2: STATUS2_TRANSFORMED, mimickedMoves: 0b0001 },
]);
for (const variant of PERMANENCE_VARIANTS) {
  addCase(
    `permanence_${variant.label}`,
    "permanence-gate-matrix",
    makeProjection({
      battlersCount: 4,
      attacker: 0,
      attackerOverrides: {
        moves: withImprison(0, [1, 2, 3]),
        pp: [5, 10, 10, 10],
        status2: variant.status2,
        mimickedMoves: variant.mimickedMoves,
      },
      opponents: [{ index: 1, ability: ABILITY_PRESSURE, side: 1 }],
      salt: nextSalt(),
    }),
  );
}

// --- overlap-grid: no shared moves, each (attackerMove, defenderMove)
// corner, MOVE_NONE exclusion, and overlap via the second opposing battler
// only. ---
addCase(
  "overlap_none",
  "overlap-grid",
  makeProjection({
    battlersCount: 4,
    attacker: 0,
    attackerOverrides: { moves: [1, 2, 3, 4] },
    opponents: [
      { index: 1, moves: [5, 6, 7, 8], side: 1 },
      { index: 3, moves: [9, 10, 11, 12], side: 1 },
    ],
    salt: nextSalt(),
  }),
);
for (const [attackerMovePos, defenderMovePos] of [[0, 0], [0, 3], [3, 0], [3, 3]]) {
  const attackerMoves = [1, 2, 3, 4];
  const sharedMove = 77;
  attackerMoves[attackerMovePos] = sharedMove;
  const defenderMoves = [5, 6, 7, 8];
  defenderMoves[defenderMovePos] = sharedMove;
  addCase(
    `overlap_corner_a${attackerMovePos}_d${defenderMovePos}`,
    "overlap-grid",
    makeProjection({
      battlersCount: 4,
      attacker: 0,
      attackerOverrides: { moves: attackerMoves },
      opponents: [{ index: 1, moves: defenderMoves, side: 1 }],
      salt: nextSalt(),
    }),
  );
}
addCase(
  "overlap_move_none_excluded",
  "overlap-grid",
  makeProjection({
    battlersCount: 4,
    attacker: 0,
    attackerOverrides: { moves: [MOVE_NONE, 2, 3, 4] },
    opponents: [{ index: 1, moves: [MOVE_NONE, 6, 7, 8], side: 1 }],
    salt: nextSalt(),
  }),
);
addCase(
  "overlap_second_opposing_battler_only",
  "overlap-grid",
  makeProjection({
    battlersCount: 4,
    attacker: 0,
    attackerOverrides: { moves: [1, 2, 3, 44] },
    opponents: [
      { index: 1, moves: [5, 6, 7, 8], side: 1 },
      { index: 3, moves: [9, 10, 44, 12], side: 1 },
    ],
    salt: nextSalt(),
  }),
);

// --- late-label-resolution: eager, so an unresolved label errors both on a
// would-be-advance (overlap present) and a would-be-jump (no overlap) path.
const unresolvedSpec = freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] });
addCase(
  "unresolved_label_on_would_be_advance",
  "late-label-resolution",
  makeProjection({
    battlersCount: 4,
    attacker: 0,
    attackerOverrides: { moves: [1, 2, 3, 4] },
    opponents: [{ index: 1, moves: [1, 6, 7, 8], side: 1 }],
    salt: nextSalt(),
  }),
  unresolvedSpec,
);
addCase(
  "unresolved_label_on_would_be_jump",
  "late-label-resolution",
  makeProjection({
    battlersCount: 4,
    attacker: 0,
    attackerOverrides: { moves: [1, 2, 3, 4] },
    opponents: [{ index: 1, moves: [5, 6, 7, 8], side: 1 }],
    salt: nextSalt(),
  }),
  unresolvedSpec,
);

// --- scheduler-pending: empty / already-containing-attacker /
// containing-others, each paired with a permanent-success scenario. ---
for (const [label, pending] of [["empty", []], ["already_attacker", [0]], ["other_battlers", [3, 1]]]) {
  addCase(
    `pending_${label}`,
    "scheduler-pending",
    makeProjection({
      battlersCount: 4,
      attacker: 0,
      attackerOverrides: { moves: withImprison(0, [1, 2, 3]), pp: [5, 10, 10, 10] },
      opponents: [{ index: 1, ability: ABILITY_PRESSURE, side: 1 }],
      pending,
      salt: nextSalt(),
    }),
  );
}

// --- active-battler-gating: prior activeBattler retained when not
// permanent, overwritten when permanent, and set from null when permanent.
addCase(
  "active_battler_retained_when_not_permanent",
  "active-battler-gating",
  makeProjection({
    battlersCount: 4,
    attacker: 0,
    attackerOverrides: {
      moves: withImprison(0, [1, 2, 3]),
      pp: [5, 10, 10, 10],
      status2: STATUS2_TRANSFORMED,
    },
    opponents: [{ index: 1, ability: ABILITY_PRESSURE, side: 1 }],
    activeBattler: 2,
    salt: nextSalt(),
  }),
);
addCase(
  "active_battler_overwritten_when_permanent",
  "active-battler-gating",
  makeProjection({
    battlersCount: 4,
    attacker: 0,
    attackerOverrides: { moves: withImprison(0, [1, 2, 3]), pp: [5, 10, 10, 10] },
    opponents: [{ index: 1, ability: ABILITY_PRESSURE, side: 1 }],
    activeBattler: 2,
    salt: nextSalt(),
  }),
);
addCase(
  "active_battler_set_from_null_when_permanent",
  "active-battler-gating",
  makeProjection({
    battlersCount: 4,
    attacker: 0,
    attackerOverrides: { moves: withImprison(0, [1, 2, 3]), pp: [5, 10, 10, 10] },
    opponents: [{ index: 1, ability: ABILITY_PRESSURE, side: 1 }],
    activeBattler: null,
    salt: nextSalt(),
  }),
);

// --- party-mirror-side-index-matrix: side x sampled party index, permanent
// success, proving the write routes to the correct persistent slot. ---
for (const sideValue of SIDES) {
  for (const partyIndex of [0, 3, 5]) {
    addCase(
      `party_mirror_s${sideValue}_p${partyIndex}`,
      "party-mirror-side-index-matrix",
      makeProjection({
        battlersCount: 4,
        attacker: 0,
        attackerSide: sideValue,
        attackerPartyIndex: partyIndex,
        attackerOverrides: { moves: withImprison(0, [1, 2, 3]), pp: [5, 10, 10, 10] },
        opponents: [{ index: sideValue === 0 ? 1 : 0, ability: ABILITY_PRESSURE, side: sideValue === 0 ? 1 : 0 }],
        salt: nextSalt(),
      }),
    );
  }
}

// --- malformed-shape-precedes-role: shape errors precede eager label
// resolution and the attacker role, mirroring canonical evaluation order.
for (const [label, spec] of [
  ["malformed_opcode", freezeInstructionSpec({ opcodeId: 0xdc })],
  ["malformed_dispatcher", freezeInstructionSpec({ dispatcher: "Cmd_settypetoenvironment" })],
  ["malformed_no_operand", freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })],
  ["malformed_two_operands", freezeInstructionSpec({ operandWidths: [4, 4], operandExpressions: [FAILURE_LABEL, FAILURE_LABEL] })],
  ["malformed_pointer_width", freezeInstructionSpec({ operandWidths: [1] })],
]) {
  addCase(
    label,
    "malformed-shape-precedes-role",
    makeProjection({
      battlersCount: 4,
      attacker: 0,
      attackerOverrides: { moves: withImprison(0, [1, 2, 3]), pp: [5, 10, 10, 10] },
      salt: nextSalt(),
    }),
    spec,
  );
}

function sourceRegistration(specs) {
  const instructions = freezeArray(specs.map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTryimprisonOpcodeHandlers(customProgram);
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
    instructions: freezeArray(specs.map(vectorInstruction)),
    expectedOpcodeId: outcome.opcodeId,
    expectedError: outcome.error,
  }));
}

const noise = freezeInstructionSpec({
  opcodeName: "B_SCR_OP_RUST_NOISE", opcodeId: 0, dispatcher: "Cmd_noise", operandWidths: [], operandExpressions: [],
});
addRegistration("one_start", [CANONICAL_SPEC]);
addRegistration("one_start_ignores_noise", [noise, CANONICAL_SPEC, noise]);
addRegistration("wrong_cardinality_zero", []);
addRegistration("wrong_cardinality_two", [CANONICAL_SPEC, CANONICAL_SPEC]);
addRegistration("malformed_wrong_opcode", [freezeInstructionSpec({ opcodeId: 0xdc })]);
addRegistration("malformed_wrong_dispatcher", [freezeInstructionSpec({ dispatcher: "Cmd_settypetoenvironment" })]);
addRegistration("malformed_zero_operands", [freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })]);
addRegistration("malformed_one_byte_operand", [freezeInstructionSpec({ operandWidths: [1] })]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered"
    : value.expectedError.startsWith("B_SCR_OP_TRYIMPRISON requires") ? "wrong-cardinality"
      : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["battlers-count-variants", 2],
  ["pressure-pp-values", PRESSURE_PP_VALUES.length],
  ["permanence-variants", PERMANENCE_VARIANTS.length],
  ["party-sides", SIDES.length],
  ["party-indexes", PARTY_INDEXES.length],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({ domainCensus, categoryCensus, branchCensus, registrationBranchCensus, cases, registrationCases });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustControl(value) {
  if (value === null) return "None";
  return value.kind === "advance" ? "Some(BattleScriptTryimprisonControl::Advance)"
    : `Some(BattleScriptTryimprisonControl::Jump { program_counter: ${value.programCounter} })`;
}
function rustEvents(values) {
  if (values.length === 0) return "None";
  assert(values.length === 1, "tryimprison never emits more than one event");
  const value = values[0];
  assert(value.kind === "set-battler-pp-data", `unexpected event kind ${value.kind}`);
  return `Some(BattleScriptTryimprisonEvent::SetBattlerPpData { battler: ${battler(value.battler)}, move_position: ${value.movePosition}, pp: ${hex8(value.pp)} })`;
}
function rustBattlerState(value) {
  return `BattleScriptTryimprisonVectorBattlerState { side: ${side(value.side)}, party_index: ${hex8(value.partyIndex)}, ability: ${hex8(value.ability)}, status2: ${hex32(value.status2)}, status3: ${hex32(value.status3)}, moves: [${value.moves.map(hex16).join(", ")}], pp: [${value.pp.map(hex8).join(", ")}], mimicked_moves: ${hex8(value.mimickedMoves)} }`;
}
function rustPartyMember(value) {
  return `BattleScriptTryimprisonVectorPartyMember { pp: [${value.pp.map(hex8).join(", ")}] }`;
}
function rustState(value) {
  return [
    "BattleScriptTryimprisonVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `party: [[${value.party[0].map(rustPartyMember).join(", ")}], [${value.party[1].map(rustPartyMember).join(", ")}]],`,
    `attacker: ${optionBattler(value.attacker)},`,
    `battlers_count: ${battlersCount(value.battlersCount)},`,
    "}",
  ].join(" ");
}
function rustPending(pending) {
  const cells = [0, 1, 2, 3].map((index) => optionBattler(pending[index] ?? null));
  return `[${cells.join(", ")}]`;
}
function rustScheduler(value) {
  return `BattleScriptTryimprisonVectorScheduler { active_battler: ${optionBattler(value.activeBattler)}, pending_controller_battlers: ${rustPending(value.pendingControllerBattlers)}, pending_count: ${value.pendingControllerBattlers.length} }`;
}
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptTryimprisonOperand { width_bytes: ${width}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedFailureExpression === null ? "None"
    : `Some(BattleScriptTryimprisonResolvedLabel { expression: ${rustString(value.resolvedFailureExpression)}, program_counter: ${value.resolvedFailureProgramCounter} })`;
  return `BattleScriptTryimprisonInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${hex8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_failure_target: ${resolved} }`;
}
function rustOptionalState(value) {
  return value === null ? "None" : `Some(${rustState(value)})`;
}
function rustOptionalScheduler(value) {
  return value === null ? "None" : `Some(${rustScheduler(value)})`;
}
function rustOptionalString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}

function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-tryimprison-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTryimprisonOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_tryimprison::{");
lines.push("    BattleScriptTryimprisonBattler, BattleScriptTryimprisonBattlersCount,");
lines.push("    BattleScriptTryimprisonControl, BattleScriptTryimprisonEvent,");
lines.push("    BattleScriptTryimprisonInstruction, BattleScriptTryimprisonOperand,");
lines.push("    BattleScriptTryimprisonResolvedLabel, BattleScriptTryimprisonSide,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYIMPRISON_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYIMPRISON_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYIMPRISON_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYIMPRISON_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryimprisonVectorBattlerState { pub side: BattleScriptTryimprisonSide, pub party_index: u8, pub ability: u8, pub status2: u32, pub status3: u32, pub moves: [u16; 4], pub pp: [u8; 4], pub mimicked_moves: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryimprisonVectorPartyMember { pub pp: [u8; 4] }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryimprisonVectorState { pub battlers: [BattleScriptTryimprisonVectorBattlerState; 4], pub party: [[BattleScriptTryimprisonVectorPartyMember; 6]; 2], pub attacker: Option<BattleScriptTryimprisonBattler>, pub battlers_count: BattleScriptTryimprisonBattlersCount }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryimprisonVectorScheduler { pub active_battler: Option<BattleScriptTryimprisonBattler>, pub pending_controller_battlers: [Option<BattleScriptTryimprisonBattler>; 4], pub pending_count: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryimprisonVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptTryimprisonVectorState, pub initial_scheduler: BattleScriptTryimprisonVectorScheduler, pub instruction: BattleScriptTryimprisonInstruction<'static>, pub expected: Option<BattleScriptTryimprisonVectorState>, pub expected_scheduler: Option<BattleScriptTryimprisonVectorScheduler>, pub control: Option<BattleScriptTryimprisonControl>, pub event: Option<BattleScriptTryimprisonEvent>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryimprisonRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptTryimprisonInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYIMPRISON_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYIMPRISON_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYIMPRISON_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYIMPRISON_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYIMPRISON_CASES: [BattleScriptTryimprisonVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryimprisonVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initialRules)},`);
  lines.push(`        initial_scheduler: ${rustScheduler(value.initialScheduler)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expectedRules)},`);
  lines.push(`        expected_scheduler: ${rustOptionalScheduler(value.expectedScheduler)},`);
  lines.push(`        control: ${rustControl(value.control)}, event: ${rustEvents(value.events)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYIMPRISON_REGISTRATION_CASES: [BattleScriptTryimprisonRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryimprisonRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_opcode_id: ${value.expectedOpcodeId === null ? "None" : `Some(${hex8(value.expectedOpcodeId)})`}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-tryimprison-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
