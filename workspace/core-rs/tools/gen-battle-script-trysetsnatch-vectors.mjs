#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSnatchOpcode.ts.
// Expected controls, outputs, and errors are created only by executing the
// canonical TypeScript opcode handler. This script owns bounded valid input
// construction and Rust literal emission; FailJump deliberately omits the
// canonical machine's resolved absolute jump program counter.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysetsnatch-vectors.mjs

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
  "battle_script_trysetsnatch_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSnatchOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETSNATCH";
const OPCODE_ID = 0xe0;
const DISPATCHER = "Cmd_trysetsnatch";
const ENTRY_LABEL = "BattleScript_EffectSnatch";
const FAILURE_POINTER = "BattleScript_FailedFromAtkString";
const BATTLE_SLOTS = 4;
const U8_MAX = 0xff;
const U32_MAX = 0xffff_ffff;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, ...ATTACKER_DOMAIN]);
const BATTLERS_COUNT_DOMAIN = Object.freeze([2, 4]);
const CURRENT_TURN_ACTION_NUMBER_DOMAIN = Object.freeze(
  Array.from({ length: U8_MAX + 1 }, (_, value) => value),
);
const BATTLE_TYPE_DOUBLE = rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE;
const SINGLES_FLAG_EDGE_DOMAIN = Object.freeze([
  0x0000_0000,
  0x8000_0000,
  0xffff_fffe,
  0x0100_0000,
]);
const DOUBLES_FLAG_EDGE_DOMAIN = Object.freeze([
  0x0000_0001,
  0x8000_0001,
  0xffff_ffff,
  0x0100_0001,
]);
const BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN = Object.freeze([
  ...SINGLES_FLAG_EDGE_DOMAIN,
  ...DOUBLES_FLAG_EDGE_DOMAIN,
]);
const GENERATED_FILE_MAX_BYTES = 5_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trysetsnatch-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertBit(value, label) {
  assert(value === 0 || value === 1, `${label} must be 0 or 1, got ${value}`);
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

function assertBattlersCount(value, label) {
  assert(BATTLERS_COUNT_DOMAIN.includes(value), `${label} must be 2 or 4, got ${value}`);
}

function positionsForTopology(battlersCount) {
  return battlersCount === 2 ? [0, 1, 0xff, 0xff] : [0, 1, 2, 3];
}

function freezeProjection({
  stealMoves,
  ppNotAffectedByPressure,
  battlersCount,
  battleTypeFlags,
  currentTurnActionNumber,
  attacker,
  target,
  effectBattler,
  fainted,
}) {
  assert(Array.isArray(stealMoves) && stealMoves.length === BATTLE_SLOTS, "stealMoves must have four cells");
  assert(
    Array.isArray(ppNotAffectedByPressure) && ppNotAffectedByPressure.length === BATTLE_SLOTS,
    "ppNotAffectedByPressure must have four cells",
  );
  stealMoves.forEach((value, battler) => assertBit(value, `stealMoves[${battler}]`));
  ppNotAffectedByPressure.forEach((value, battler) => assertBit(value, `ppNotAffectedByPressure[${battler}]`));
  assertBattlersCount(battlersCount, "battlersCount");
  assertU32(battleTypeFlags, "battleTypeFlags");
  assert(
    ((battleTypeFlags & BATTLE_TYPE_DOUBLE) !== 0) === (battlersCount === 4),
    "battleTypeFlags BATTLE_TYPE_DOUBLE must agree with battlersCount",
  );
  assertU8(currentTurnActionNumber, "currentTurnActionNumber");
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  assertOptionalBattler(effectBattler, "effectBattler role");
  assertOptionalBattler(fainted, "fainted role");
  return Object.freeze({
    stealMoves: Object.freeze([...stealMoves]),
    ppNotAffectedByPressure: Object.freeze([...ppNotAffectedByPressure]),
    battlersCount,
    battleTypeFlags: battleTypeFlags >>> 0,
    currentTurnActionNumber,
    attacker,
    target,
    effectBattler,
    fainted,
  });
}

function makeProjection({
  stealMoves = [0, 0, 0, 0],
  ppNotAffectedByPressure = [0, 0, 0, 0],
  battlersCount = 2,
  battleTypeFlags = battlersCount === 4 ? BATTLE_TYPE_DOUBLE : 0,
  currentTurnActionNumber = 0,
  attacker = 0,
  target = 1,
  effectBattler = 2,
  fainted = 3,
} = {}) {
  return freezeProjection({
    stealMoves,
    ppNotAffectedByPressure,
    battlersCount,
    battleTypeFlags,
    currentTurnActionNumber,
    attacker,
    target,
    effectBattler,
    fainted,
  });
}

function bitPattern(seed, salt) {
  return ATTACKER_DOMAIN.map((battler) => ((seed * 73 + salt * 29 + battler * 17) >>> battler) & 1);
}

function nibbleBits(value, highNibble) {
  const nibble = highNibble ? value >>> 4 : value & 0x0f;
  return ATTACKER_DOMAIN.map((battler) => (nibble >>> battler) & 1);
}

function canonicalBattler(index, stealMove, ppNotAffectedByPressure) {
  return Object.freeze({
    side: index & 1,
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
    stealMove,
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
      battler,
      projection.stealMoves[battler],
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
    battleTopology: Object.freeze({
      battlersCount: projection.battlersCount,
      battleTypeFlags: projection.battleTypeFlags,
      battlerPositions: Object.freeze(positionsForTopology(projection.battlersCount)),
    }),
    currentTurnActionNumber: projection.currentTurnActionNumber,
  });
}

function vectorBit(value, label) {
  assert(value === 0 || value === 1, `${label} canonical value must be 0 or 1, got ${value}`);
  return value;
}

function vectorState(rules) {
  return Object.freeze({
    stealMoves: Object.freeze(rules.battlers.map((battler, index) => vectorBit(
      battler.stealMove,
      `battlers[${index}].stealMove`,
    ))),
    ppNotAffectedByPressure: Object.freeze(rules.battlers.map((battler, index) => vectorBit(
      battler.ppNotAffectedByPressure,
      `battlers[${index}].ppNotAffectedByPressure`,
    ))),
    battlersCount: rules.battleTopology.battlersCount,
    battleTypeFlags: rules.battleTopology.battleTypeFlags >>> 0,
    currentTurnActionNumber: rules.currentTurnActionNumber,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

assert(BATTLE_TYPE_DOUBLE === 0x0000_0001, `BATTLE_TYPE_DOUBLE drifted to ${BATTLE_TYPE_DOUBLE}`);
for (const flag of BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN) assertU32(flag, "battle type flag edge");
for (const count of BATTLERS_COUNT_DOMAIN) {
  const flags = count === 2 ? SINGLES_FLAG_EDGE_DOMAIN : DOUBLES_FLAG_EDGE_DOMAIN;
  assert(flags.every((value) => ((value & BATTLE_TYPE_DOUBLE) !== 0) === (count === 4)), "flag edge topology mismatch");
}
for (const endpoint of [0, U8_MAX]) {
  const rules = canonicalRulesFromProjection(makeProjection({
    battlersCount: 4,
    battleTypeFlags: U32_MAX,
    currentTurnActionNumber: endpoint,
  }));
  assert(rules.currentTurnActionNumber === endpoint, `canonical constructor lost u8 endpoint ${endpoint}`);
  assert(rules.battleTopology.battleTypeFlags === U32_MAX, "canonical constructor lost u32 max flag word");
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

const handlers = opcodeModule.createBattleScriptSnatchOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical TRYSETSNATCH handler was not registered");

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "fail-jump";
  throw new Error(`canonical handler returned unsupported control ${transition.control.kind}`);
}

function assertCanonicalStep(priorRules, transition) {
  const attacker = priorRules.selectorRoles.attacker;
  assert(attacker !== null, "successful canonical handler had no attacker");
  const actingLast = priorRules.currentTurnActionNumber
    === priorRules.battleTopology.battlersCount - 1;
  const control = controlFromTransition(transition);
  const nextRules = transition.rulesContext;

  assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");
  assert(nextRules !== priorRules, "canonical handler must replace rules on every valid branch");
  assert(
    control === (actingLast ? "fail-jump" : "advance"),
    `canonical control did not match acting-last equality (${actingLast})`,
  );
  assert(nextRules.battleTopology === priorRules.battleTopology, "canonical handler replaced topology");
  assert(
    nextRules.currentTurnActionNumber === priorRules.currentTurnActionNumber,
    "canonical handler changed currentTurnActionNumber",
  );
  assert(
    nextRules.selectorRoles === priorRules.selectorRoles,
    "canonical Snatch handler replaced selector roles",
  );
  assert(nextRules.battlers !== priorRules.battlers, "canonical handler did not replace battler collection");
  for (const battler of ATTACKER_DOMAIN) {
    if (battler === attacker) {
      assert(nextRules.battlers[battler] !== priorRules.battlers[battler], `canonical handler did not replace attacker ${battler}`);
      assert(
        nextRules.battlers[battler].ppNotAffectedByPressure === 1,
        `canonical handler did not exempt attacker ${battler} PP from Pressure`,
      );
      assert(
        nextRules.battlers[battler].stealMove === (actingLast
          ? priorRules.battlers[battler].stealMove
          : 1),
        `canonical handler did not preserve/arm attacker ${battler} stealMove`,
      );
    } else {
      assert(
        nextRules.battlers[battler] === priorRules.battlers[battler],
        `canonical handler replaced sibling battler ${battler}`,
      );
    }
  }
  return control;
}

function sourceOutcome(initialProjection, applications) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
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
        (0x2f1c_98a7 + application) >>> 0,
      );
      const transition = handler({ program, instruction, state });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
      controls.push(assertCanonicalStep(currentRules, transition));
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
function addCase(label, category, initialProjection, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be 1 or 2`);
  const outcome = sourceOutcome(initialProjection, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    initial: initialProjection,
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

for (const battlersCount of BATTLERS_COUNT_DOMAIN) {
  for (let attacker = 0; attacker < battlersCount; attacker += 1) {
    for (let currentTurnActionNumber = 0; currentTurnActionNumber < battlersCount; currentTurnActionNumber += 1) {
      const salt = battlersCount * 17 + attacker * 5 + currentTurnActionNumber;
      addCase(
        `valid_${battlersCount === 2 ? "singles" : "doubles"}_a${attacker}_action${currentTurnActionNumber}`,
        "valid-singles-doubles-attacker-action-boundary-matrix",
        makeProjection({
          stealMoves: bitPattern(salt, 7),
          ppNotAffectedByPressure: bitPattern(salt, 13),
          battlersCount,
          battleTypeFlags: battlersCount === 4 ? BATTLE_TYPE_DOUBLE : 0,
          currentTurnActionNumber,
          attacker,
          target: OPTIONAL_BATTLER_DOMAIN[(salt + 1) % OPTIONAL_BATTLER_DOMAIN.length],
          effectBattler: OPTIONAL_BATTLER_DOMAIN[(salt + 2) % OPTIONAL_BATTLER_DOMAIN.length],
          fainted: OPTIONAL_BATTLER_DOMAIN[(salt + 3) % OPTIONAL_BATTLER_DOMAIN.length],
        }),
      );
    }
  }
}

for (const battlersCount of BATTLERS_COUNT_DOMAIN) {
  for (const currentTurnActionNumber of CURRENT_TURN_ACTION_NUMBER_DOMAIN) {
    const attacker = currentTurnActionNumber % battlersCount;
    const salt = battlersCount * 257 + currentTurnActionNumber;
    addCase(
      `u8_action_domain_count${battlersCount}_value${currentTurnActionNumber}`,
      "current-turn-action-u8-full-domain-by-topology",
      makeProjection({
        stealMoves: bitPattern(salt, 19),
        ppNotAffectedByPressure: bitPattern(salt, 23),
        battlersCount,
        battleTypeFlags: battlersCount === 4 ? BATTLE_TYPE_DOUBLE : 0,
        currentTurnActionNumber,
        attacker,
        target: OPTIONAL_BATTLER_DOMAIN[(salt + 1) % OPTIONAL_BATTLER_DOMAIN.length],
        effectBattler: OPTIONAL_BATTLER_DOMAIN[(salt + 2) % OPTIONAL_BATTLER_DOMAIN.length],
        fainted: OPTIONAL_BATTLER_DOMAIN[(salt + 3) % OPTIONAL_BATTLER_DOMAIN.length],
      }),
    );
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
        addCase(
          `selector_a${attacker}_t${target ?? "n"}_e${effectBattler ?? "n"}_f${fainted ?? "n"}`,
          "complete-attacker-target-effect-fainted-selector-matrix",
          makeProjection({
            stealMoves: bitPattern(salt, 31),
            ppNotAffectedByPressure: bitPattern(salt, 37),
            battlersCount: 4,
            battleTypeFlags: U32_MAX,
            currentTurnActionNumber: attacker === 3 ? 3 : 2,
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

for (let packedBits = 0; packedBits <= U8_MAX; packedBits += 1) {
  const attacker = packedBits % 2;
  addCase(
    `prior_steal_pp_bits_${packedBits}`,
    "complete-per-battler-steal-and-pp-prior-bit-matrix",
    makeProjection({
      stealMoves: nibbleBits(packedBits, false),
      ppNotAffectedByPressure: nibbleBits(packedBits, true),
      battlersCount: 2,
      battleTypeFlags: 0,
      currentTurnActionNumber: packedBits & 1,
      attacker,
      target: OPTIONAL_BATTLER_DOMAIN[packedBits % OPTIONAL_BATTLER_DOMAIN.length],
      effectBattler: OPTIONAL_BATTLER_DOMAIN[(packedBits + 3) % OPTIONAL_BATTLER_DOMAIN.length],
      fainted: OPTIONAL_BATTLER_DOMAIN[(packedBits + 1) % OPTIONAL_BATTLER_DOMAIN.length],
    }),
  );
}

const topologyFlagEdges = Object.freeze([
  ...SINGLES_FLAG_EDGE_DOMAIN.map((battleTypeFlags) => Object.freeze({ battlersCount: 2, battleTypeFlags })),
  ...DOUBLES_FLAG_EDGE_DOMAIN.map((battleTypeFlags) => Object.freeze({ battlersCount: 4, battleTypeFlags })),
]);
for (const [edgeIndex, edge] of topologyFlagEdges.entries()) {
  const actingLast = (edgeIndex & 1) !== 0;
  addCase(
    `u32_battle_type_flags_edge_${edgeIndex}`,
    "battle-type-flags-u32-edge-preservation",
    makeProjection({
      stealMoves: bitPattern(edgeIndex, 59),
      ppNotAffectedByPressure: bitPattern(edgeIndex, 61),
      battlersCount: edge.battlersCount,
      battleTypeFlags: edge.battleTypeFlags,
      currentTurnActionNumber: actingLast ? edge.battlersCount - 1 : 0,
      attacker: edgeIndex % edge.battlersCount,
      target: OPTIONAL_BATTLER_DOMAIN[(edgeIndex + 1) % OPTIONAL_BATTLER_DOMAIN.length],
      effectBattler: OPTIONAL_BATTLER_DOMAIN[(edgeIndex + 2) % OPTIONAL_BATTLER_DOMAIN.length],
      fainted: OPTIONAL_BATTLER_DOMAIN[(edgeIndex + 3) % OPTIONAL_BATTLER_DOMAIN.length],
    }),
  );
}

addCase(
  "missing_attacker_with_all_selector_siblings_present_errors_before_state_reads",
  "ordered-missing-attacker-role-errors",
  makeProjection({
    stealMoves: [1, 0, 1, 0],
    ppNotAffectedByPressure: [0, 1, 0, 1],
    battlersCount: 4,
    battleTypeFlags: U32_MAX,
    currentTurnActionNumber: U8_MAX,
    attacker: null,
    target: 3,
    effectBattler: 2,
    fainted: 1,
  }),
);
addCase(
  "missing_attacker_with_null_target_and_selector_siblings_errors_exactly",
  "ordered-missing-attacker-role-errors",
  makeProjection({
    stealMoves: [0, 1, 1, 0],
    ppNotAffectedByPressure: [1, 0, 0, 1],
    battlersCount: 2,
    battleTypeFlags: 0xffff_fffe,
    currentTurnActionNumber: 1,
    attacker: null,
    target: null,
    effectBattler: null,
    fainted: 3,
  }),
);
addCase(
  "missing_attacker_on_last_double_action_has_no_fail_control_or_mutation",
  "ordered-missing-attacker-role-errors",
  makeProjection({
    stealMoves: [1, 1, 0, 0],
    ppNotAffectedByPressure: [0, 0, 1, 1],
    battlersCount: 4,
    battleTypeFlags: 0x8000_0001,
    currentTurnActionNumber: 3,
    attacker: null,
    target: 0,
    effectBattler: 1,
    fainted: null,
  }),
);

addCase(
  "explicit_all_selector_alias_preserves_roles_and_arms_nonlast",
  "explicit-all-selector-alias-preservation",
  makeProjection({
    stealMoves: [0, 1, 0, 1],
    ppNotAffectedByPressure: [1, 0, 1, 0],
    battlersCount: 4,
    battleTypeFlags: U32_MAX,
    currentTurnActionNumber: 2,
    attacker: 2,
    target: 2,
    effectBattler: 2,
    fainted: 2,
  }),
);
addCase(
  "repeated_nonlast_application_advances_twice_arms_steal_and_is_value_idempotent",
  "repeated-nonlast-application",
  makeProjection({
    stealMoves: [0, 1, 0, 1],
    ppNotAffectedByPressure: [0, 1, 0, 1],
    battlersCount: 4,
    battleTypeFlags: 0x0100_0001,
    currentTurnActionNumber: 2,
    attacker: 2,
    target: null,
    effectBattler: 1,
    fainted: 3,
  }),
  2,
);
addCase(
  "repeated_acting_last_application_fail_jumps_twice_sets_pp_and_preserves_steal",
  "repeated-acting-last-application",
  makeProjection({
    stealMoves: [1, 0, 1, 0],
    ppNotAffectedByPressure: [0, 1, 0, 1],
    battlersCount: 2,
    battleTypeFlags: 0x8000_0000,
    currentTurnActionNumber: 1,
    attacker: 1,
    target: 0,
    effectBattler: null,
    fainted: 3,
  }),
  2,
);

const VALID_REACHABLE_CASE_COUNT = 20;
const FULL_ACTION_DOMAIN_CASE_COUNT = BATTLERS_COUNT_DOMAIN.length * CURRENT_TURN_ACTION_NUMBER_DOMAIN.length;
const SELECTOR_MATRIX_CASE_COUNT = ATTACKER_DOMAIN.length * OPTIONAL_BATTLER_DOMAIN.length ** 3;
const PRIOR_BIT_MATRIX_CASE_COUNT = U8_MAX + 1;
const FLAG_EDGE_CASE_COUNT = BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN.length;
const MISSING_ATTACKER_CASE_COUNT = 3;
const REPEATED_CASE_COUNT = 2;
assert(VALID_REACHABLE_CASE_COUNT === 20, `valid reachable case count drifted to ${VALID_REACHABLE_CASE_COUNT}`);
assert(FULL_ACTION_DOMAIN_CASE_COUNT === 512, `full action domain case count drifted to ${FULL_ACTION_DOMAIN_CASE_COUNT}`);
assert(SELECTOR_MATRIX_CASE_COUNT === 500, `selector matrix case count drifted to ${SELECTOR_MATRIX_CASE_COUNT}`);
assert(PRIOR_BIT_MATRIX_CASE_COUNT === 256, `prior bit matrix case count drifted to ${PRIOR_BIT_MATRIX_CASE_COUNT}`);
assert(FLAG_EDGE_CASE_COUNT === 8, `flag edge case count drifted to ${FLAG_EDGE_CASE_COUNT}`);
assert(
  cases.length === VALID_REACHABLE_CASE_COUNT
    + FULL_ACTION_DOMAIN_CASE_COUNT
    + SELECTOR_MATRIX_CASE_COUNT
    + PRIOR_BIT_MATRIX_CASE_COUNT
    + FLAG_EDGE_CASE_COUNT
    + MISSING_ATTACKER_CASE_COUNT
    + 1
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
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["selector-role-values-including-null", OPTIONAL_BATTLER_DOMAIN.length],
  ["canonical-battlers-count-values", BATTLERS_COUNT_DOMAIN.length],
  ["singles-valid-attacker-values", 2],
  ["doubles-valid-attacker-values", 4],
  ["current-turn-action-number-u8-values", U8_MAX + 1],
  ["current-turn-action-u8-full-domain-probes", FULL_ACTION_DOMAIN_CASE_COUNT],
  ["valid-reachable-topology-attacker-action-cases", VALID_REACHABLE_CASE_COUNT],
  ["complete-selector-matrix-cases", SELECTOR_MATRIX_CASE_COUNT],
  ["per-battler-steal-and-pp-bit-combinations", PRIOR_BIT_MATRIX_CASE_COUNT],
  ["battle-type-flags-u32-edge-values", FLAG_EDGE_CASE_COUNT],
  ["typed-missing-attacker-role-cases", MISSING_ATTACKER_CASE_COUNT],
  ["application-count-values", 2],
  ["selector-roles-written-by-handler", 0],
  ["failure-pointer-fields-in-projection", 0],
  ["absolute-program-counter-fields-in-projection", 0],
  ["abi-exports-added", 0],
  ["unsupported-barriers-added", 0],
  ["generated-file-byte-limit-exclusive", GENERATED_FILE_MAX_BYTES],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  optionalBattlerDomain: OPTIONAL_BATTLER_DOMAIN,
  battlersCountDomain: BATTLERS_COUNT_DOMAIN,
  currentTurnActionNumberDomain: CURRENT_TURN_ACTION_NUMBER_DOMAIN,
  battleTypeFlagsU32EdgeDomain: BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustBattler(value) {
  return `BattleScriptTrysetsnatchBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustU32(value) {
  return `0x${value.toString(16).padStart(8, "0")}`;
}

function rustState(value) {
  return [
    "BattleScriptTrysetsnatchVectorState {",
    `steal_moves: [${value.stealMoves.join(", ")}],`,
    `pp_not_affected_by_pressure: [${value.ppNotAffectedByPressure.join(", ")}],`,
    `battlers_count: ${value.battlersCount},`,
    `battle_type_flags: ${rustU32(value.battleTypeFlags)},`,
    `current_turn_action_number: ${value.currentTurnActionNumber},`,
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
  return "&[" + values.map((value) => (
    value === "advance"
      ? "BattleScriptTrysetsnatchControl::Advance"
      : "BattleScriptTrysetsnatchControl::FailJump"
  )).join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysetsnatch-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSnatchOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysetsnatch::{");
lines.push("    BattleScriptTrysetsnatchBattler, BattleScriptTrysetsnatchControl,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETSNATCH_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSNATCH_ATTACKER_DOMAIN: [u8; ${ATTACKER_DOMAIN.length}] = [${ATTACKER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSNATCH_BATTLERS_COUNT_DOMAIN: [u8; ${BATTLERS_COUNT_DOMAIN.length}] = [${BATTLERS_COUNT_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSNATCH_CURRENT_TURN_ACTION_NUMBER_DOMAIN: [u8; ${CURRENT_TURN_ACTION_NUMBER_DOMAIN.length}] = [${CURRENT_TURN_ACTION_NUMBER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETSNATCH_BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN: [u32; ${BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN.length}] = [${BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN.map(rustU32).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetsnatchVectorState {");
lines.push("    pub steal_moves: [u8; 4],");
lines.push("    pub pp_not_affected_by_pressure: [u8; 4],");
lines.push("    pub battlers_count: u8,");
lines.push("    pub battle_type_flags: u32,");
lines.push("    pub current_turn_action_number: u8,");
lines.push("    pub attacker: Option<BattleScriptTrysetsnatchBattler>,");
lines.push("    pub target: Option<BattleScriptTrysetsnatchBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptTrysetsnatchBattler>,");
lines.push("    pub fainted: Option<BattleScriptTrysetsnatchBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetsnatchVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptTrysetsnatchVectorState,");
lines.push("    pub expected: Option<BattleScriptTrysetsnatchVectorState>,");
lines.push("    pub controls: &'static [BattleScriptTrysetsnatchControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETSNATCH_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETSNATCH_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETSNATCH_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSETSNATCH_CASES: [BattleScriptTrysetsnatchVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetsnatchVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-trysetsnatch-vectors: could not find rustfmt");

const generated = fs.readFileSync(outPath);
assert(
  generated.byteLength < GENERATED_FILE_MAX_BYTES,
  `generated file is ${generated.byteLength} bytes, not below ${GENERATED_FILE_MAX_BYTES}`,
);
const generatedHash = crypto.createHash("sha256").update(generated).digest("hex");
console.log(`gen-battle-script-trysetsnatch-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-trysetsnatch-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-trysetsnatch-vectors: ${generated.byteLength} generated bytes`);
console.log(`gen-battle-script-trysetsnatch-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-trysetsnatch-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-trysetsnatch-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-trysetsnatch-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-trysetsnatch-vectors: generated sha256 ${generatedHash}`);
